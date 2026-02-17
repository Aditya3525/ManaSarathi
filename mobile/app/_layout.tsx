import 'react-native-gesture-handler';
import '../global.css';
import { useEffect, useState, useRef } from 'react';
import { View, useColorScheme as useSystemColorScheme, LogBox } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { I18nextProvider } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';

// Suppress known non-critical warnings (in-app UI)
LogBox.ignoreLogs([
  // expo-notifications push token limitation in Expo Go (SDK 53+)
  'expo-notifications: Android Push notifications',
  // SafeAreaView deprecation — already using react-native-safe-area-context where needed
  'SafeAreaView has been deprecated',
  // expo-av deprecation notice (will migrate to expo-audio/expo-video)
  'expo-av',
  // expo-notifications Expo Go limitation
  'expo-notifications` functionality is not fully supported',
]);

// Import i18n config
import i18n from '../i18n/config';

// Import store initialization
import { initializeNetworkListener, useAppStore } from '../stores/appStore';
import { useAuthStore } from '../stores/authStore';
import { TokenManager, UserStorage } from '../utils/storage';
import { authApi } from '../services/api';
import { deepLinkService } from '../services/deepLink';
import { setupOfflineCache } from '../services/offlineCache';

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
    },
  },
});

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    // Add custom fonts here if needed
  });

  const { setUser } = useAuthStore();
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Initialize network listener and offline cache (safe before nav mounts)
  useEffect(() => {
    const unsubscribe = initializeNetworkListener();
    setupOfflineCache();
    return () => {
      unsubscribe();
    };
  }, []);

  // Hydrate auth state from stored token on app launch
  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    (async () => {
      try {
        const hasToken = await TokenManager.hasToken();
        console.log('[Auth] Hydration started, hasToken:', hasToken);
        if (hasToken && !cancelled) {
          // Step 1: Immediately restore cached user from SecureStore (offline-first)
          const cachedUser = await UserStorage.getUser();
          if (cachedUser && !cancelled) {
            console.log('[Auth] Restored cached user:', cachedUser.email);
            setUser(cachedUser);
          }

          // Step 2: Validate token with server in background (non-blocking)
          const authCheckPromise = authApi.getCurrentUser();
          const startupTimeout = new Promise<{ success: false; status?: number }>((resolve) => {
            timeoutId = setTimeout(() => {
              console.warn('[Auth] Startup auth check timed out after 10s, keeping cached session');
              resolve({ success: false });
            }, 10000);
          });
          const response = await Promise.race([authCheckPromise, startupTimeout]) as any;
          // Clear timeout once the race is settled
          if (timeoutId) clearTimeout(timeoutId);

          if (response.success && response.data?.user && !cancelled) {
            // Server confirmed token is valid — update with fresh user data
            console.log('[Auth] Server validated user:', response.data.user.email);
            setUser(response.data.user);
            await UserStorage.setUser(response.data.user);
          } else if (response.status === 401 || response.status === 403) {
            // Token explicitly rejected by server (expired/invalid) — clear session
            console.log('[Auth] Token rejected by server (401/403), clearing session');
            await TokenManager.removeToken();
            await UserStorage.clearUser();
            setUser(null);
          } else {
            // Network error, timeout, or server down — keep cached session
            console.log('[Auth] Server unreachable or timed out, keeping cached session');
            // No token removal — user stays logged in with cached data
          }
        }
      } catch (err: any) {
        // Only clear on explicit auth rejection, not on network errors
        if (err?.status === 401 || err?.status === 403) {
          console.warn('[Auth] Auth rejected during hydration, clearing token');
          await TokenManager.removeToken().catch(() => {});
          await UserStorage.clearUser().catch(() => {});
          setUser(null);
        } else {
          console.warn('[Auth] Hydration network error, keeping cached session:', err?.message || err);
          // Keep whatever cached user we already set above
        }
      } finally {
        if (!cancelled) setIsAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Don't render anything until fonts and auth are ready — splash screen stays visible
  if (!loaded || !isAuthReady) {
    return null;
  }

  return <RootLayoutNav />;
}

/**
 * Auth-aware navigator. By the time this renders, isAuthReady is true,
 * so useAuthStore already has the hydrated user (or null).
 * The useEffect redirect only runs AFTER the Stack has mounted.
 */
function RootLayoutNav() {
  const theme = useAppStore((s) => s.theme);
  const systemScheme = useSystemColorScheme();
  const effectiveScheme = theme === 'system' ? (systemScheme || 'light') : theme;

  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated } = useAuthStore();
  const isNavigating = useRef(false);

  // Initialize deep links only after navigation is mounted
  useEffect(() => {
    const timer = setTimeout(() => {
      deepLinkService.initialize();
    }, 0);

    return () => {
      clearTimeout(timer);
      deepLinkService.cleanup();
    };
  }, []);

  useEffect(() => {
    // Prevent multiple rapid navigations during transitions
    if (isNavigating.current) return;

    // This effect runs after the component (and its Stack) has mounted,
    // so the navigation context is guaranteed to exist.
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    const { user } = useAuthStore.getState();

    let target: string | null = null;
    const inTabsGroup = segments[0] === '(tabs)';
    // Root index (app/index.tsx) has segments[0] === undefined
    const isRootIndex = !segments[0] || (segments[0] as string) === 'index';

    if (!isAuthenticated && !inAuthGroup) {
      target = '/(auth)/landing';
    } else if (isAuthenticated && inAuthGroup) {
      if (user && !user.isOnboarded) {
        target = '/(onboarding)';
      } else {
        target = '/(tabs)';
      }
    } else if (isAuthenticated && !inOnboarding && user && !user.isOnboarded) {
      target = '/(onboarding)';
    } else if (isAuthenticated && isRootIndex) {
      // Authenticated user on root loading screen → send to tabs
      target = '/(tabs)';
    }

    if (target) {
      isNavigating.current = true;
      // Use setTimeout to ensure navigation happens after the current render cycle
      setTimeout(() => {
        router.replace(target as any);
        // Reset the lock after a brief delay to allow the navigation to complete
        setTimeout(() => {
          isNavigating.current = false;
        }, 100);
      }, 0);
    }
  }, [isAuthenticated, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <View style={{ flex: 1 }} className={effectiveScheme === 'dark' ? 'dark' : ''}>
            <StatusBar style={effectiveScheme === 'dark' ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerShown: false }} />
            <Toast />
          </View>
        </I18nextProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
