import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient } from '@/config/queryClient';

/**
 * Offline cache configuration
 */
const CACHE_CONFIG = {
  VERSION: '1.0.0',
  EXPIRY_DURATION: 1000 * 60 * 60 * 24 * 7, // 7 days
  MAX_CACHE_SIZE: 50, // Maximum number of items per cache type
};

export interface CachedData<T> {
  data: T;
  timestamp: number;
  version: string;
  expiresAt: number;
}

/**
 * Offline cache service for storing API responses
 */
class OfflineCacheService {
  private readonly prefix = '@offline_cache:';

  /**
   * Generate cache key
   */
  private getCacheKey(namespace: string, key: string): string {
    return `${this.prefix}${namespace}:${key}`;
  }

  /**
   * Set data in cache (with size limit enforcement)
   */
  async set<T>(namespace: string, key: string, data: T, expiryMs?: number): Promise<void> {
    try {
      // Enforce MAX_CACHE_SIZE per namespace
      await this.enforceMaxCacheSize(namespace);

      const cacheKey = this.getCacheKey(namespace, key);
      const cachedData: CachedData<T> = {
        data,
        timestamp: Date.now(),
        version: CACHE_CONFIG.VERSION,
        expiresAt: Date.now() + (expiryMs || CACHE_CONFIG.EXPIRY_DURATION),
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedData));
      console.log(`Cached data: ${cacheKey}`);
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  /**
   * Get data from cache
   */
  async get<T>(namespace: string, key: string): Promise<T | null> {
    try {
      const cacheKey = this.getCacheKey(namespace, key);
      const cached = await AsyncStorage.getItem(cacheKey);

      if (!cached) {
        return null;
      }

      const cachedData: CachedData<T> = JSON.parse(cached);

      // Check version compatibility
      if (cachedData.version !== CACHE_CONFIG.VERSION) {
        console.log(`Cache version mismatch for ${cacheKey}, clearing...`);
        await this.remove(namespace, key);
        return null;
      }

      // Check expiry
      if (Date.now() > cachedData.expiresAt) {
        console.log(`Cache expired for ${cacheKey}, clearing...`);
        await this.remove(namespace, key);
        return null;
      }

      console.log(`Cache hit: ${cacheKey}`);
      return cachedData.data;
    } catch (error) {
      console.error('Error retrieving cached data:', error);
      return null;
    }
  }

  /**
   * Remove data from cache
   */
  async remove(namespace: string, key: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(namespace, key);
      await AsyncStorage.removeItem(cacheKey);
      console.log(`Removed cache: ${cacheKey}`);
    } catch (error) {
      console.error('Error removing cached data:', error);
    }
  }

  /**
   * Clear all cache for a namespace
   */
  async clearNamespace(namespace: string): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const namespaceKeys = allKeys.filter(key =>
        key.startsWith(`${this.prefix}${namespace}:`)
      );

      if (namespaceKeys.length > 0) {
        await AsyncStorage.multiRemove(namespaceKeys);
        console.log(`Cleared namespace: ${namespace} (${namespaceKeys.length} items)`);
      }
    } catch (error) {
      console.error('Error clearing namespace:', error);
    }
  }

  /**
   * Clear all offline cache
   */
  async clearAll(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.prefix));

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`Cleared all cache (${cacheKeys.length} items)`);
      }
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalItems: number;
    totalSize: number;
    namespaces: Record<string, number>;
  }> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.prefix));

      const namespaces: Record<string, number> = {};
      let totalSize = 0;

      for (const key of cacheKeys) {
        // Key format: @offline_cache:namespace:key — extract namespace (index 1 after splitting by prefix)
        const withoutPrefix = key.slice(this.prefix.length); // 'namespace:key'
        const namespace = withoutPrefix.split(':')[0];
        namespaces[namespace] = (namespaces[namespace] || 0) + 1;

        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalSize += data.length;
        }
      }

      return {
        totalItems: cacheKeys.length,
        totalSize,
        namespaces,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { totalItems: 0, totalSize: 0, namespaces: {} };
    }
  }

  /**
   * Cache query data from React Query
   */
  async cacheQueryData(queryKey: readonly unknown[], data: any): Promise<void> {
    const namespace = 'query';
    const key = JSON.stringify(queryKey);
    await this.set(namespace, key, data);
  }

  /**
   * Get cached query data
   */
  async getCachedQueryData(queryKey: readonly unknown[]): Promise<any> {
    const namespace = 'query';
    const key = JSON.stringify(queryKey);
    return await this.get(namespace, key);
  }

  /**
   * Enforce max cache size per namespace — evict oldest entries if over limit
   */
  private async enforceMaxCacheSize(namespace: string): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const nsPrefix = `${this.prefix}${namespace}:`;
      const namespaceKeys = allKeys.filter(key => key.startsWith(nsPrefix));

      if (namespaceKeys.length >= CACHE_CONFIG.MAX_CACHE_SIZE) {
        // Read timestamps of all entries and evict oldest
        const entries: { key: string; timestamp: number }[] = [];
        for (const key of namespaceKeys) {
          try {
            const raw = await AsyncStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              entries.push({ key, timestamp: parsed.timestamp || 0 });
            }
          } catch {
            entries.push({ key, timestamp: 0 });
          }
        }
        entries.sort((a, b) => a.timestamp - b.timestamp);
        // Remove oldest entries to make room
        const toRemove = entries.slice(0, entries.length - CACHE_CONFIG.MAX_CACHE_SIZE + 1);
        if (toRemove.length > 0) {
          await AsyncStorage.multiRemove(toRemove.map(e => e.key));
        }
      }
    } catch (error) {
      console.error('Error enforcing cache size:', error);
    }
  }

  /**
   * Sync offline changes when coming back online
   */
  async syncOfflineChanges(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const pendingKeys = allKeys.filter(key => key.startsWith(`${this.prefix}pending_mutations:`));

      if (pendingKeys.length === 0) {
        console.log('No offline changes to sync');
        return;
      }

      console.log(`Syncing ${pendingKeys.length} offline changes...`);

      // Process pending mutations and remove on success
      for (const key of pendingKeys) {
        try {
          const raw = await AsyncStorage.getItem(key);
          if (raw) {
            const mutation = JSON.parse(raw);
            // Re-fire the mutation via fetch
            try {
              await fetch(mutation.url, mutation.config);
              await AsyncStorage.removeItem(key);
            } catch (fetchError) {
              console.warn(`Failed to replay mutation: ${key}`, fetchError);
            }
            await AsyncStorage.removeItem(key);
          }
        } catch (error) {
          console.warn(`Failed to sync offline change: ${key}`, error);
          // Leave the mutation for next sync attempt
        }
      }
    } catch (error) {
      console.error('Error syncing offline changes:', error);
    }
  }
}

export const offlineCacheService = new OfflineCacheService();

/**
 * Hook into React Query to cache data offline
 */
export const setupOfflineCache = () => {
  // Cache successful queries
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'updated' && event.query.state.status === 'success') {
      const queryKey = event.query.queryKey;
      const data = event.query.state.data;
      offlineCacheService.cacheQueryData(queryKey, data);
    }
  });
};
