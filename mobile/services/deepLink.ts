import * as Linking from 'expo-linking';
import { Share } from 'react-native';
import { router } from 'expo-router';
import { TokenManager } from '../utils/storage';

/**
 * Deep linking configuration
 */
export const DEEP_LINK_CONFIG = {
  prefixes: [
    'maansarathi://',
    'https://maansarathi.app',
    'https://*.maansarathi.app',
  ],
  config: {
    screens: {
      '(auth)': {
        screens: {
          landing: 'welcome',
          login: 'login',
          register: 'register',
          'forgot-password': 'forgot-password',
          'oauth-callback': 'auth/callback',
        },
      },
      '(onboarding)': {
        screens: {
          index: 'onboarding',
        },
      },
      '(tabs)': {
        screens: {
          index: 'home',
          chat: 'chat',
          mood: 'mood',
          content: 'content',
          profile: 'profile',
        },
      },
      assessments: {
        screens: {
          index: 'assessments',
          '[id]': 'assessments/:id',
          result: 'assessments/result',
        },
      },
      content: {
        screens: {
          'article/[id]': 'content/article/:id',
          'video/[id]': 'content/video/:id',
          'practice/[id]': 'content/practice/:id',
        },
      },
      profile: {
        screens: {
          edit: 'profile/edit',
          'change-password': 'profile/change-password',
          language: 'profile/language',
          theme: 'profile/theme',
        },
      },
    },
  },
};

/**
 * Deep linking service
 */
class DeepLinkService {
  private listener: { remove(): void } | null = null;

  /**
   * Initialize deep linking
   */
  initialize() {
    // Handle initial URL if app was opened via deep link
    this.handleInitialUrl();

    // Listen for deep link changes while app is running
    this.listener = Linking.addEventListener('url', this.handleDeepLink);
  }

  /**
   * Clean up listeners
   */
  cleanup() {
    if (this.listener) {
      this.listener.remove();
    }
  }

  /**
   * Handle initial URL
   */
  private async handleInitialUrl() {
    try {
      const url = await Linking.getInitialURL();
      if (url) {
        console.log('App opened with URL:', url);
        this.processDeepLink(url);
      }
    } catch (error) {
      console.error('Error handling initial URL:', error);
    }
  }

  /**
   * Handle deep link event
   */
  private handleDeepLink = (event: { url: string }) => {
    console.log('Deep link received:', event.url);
    this.processDeepLink(event.url);
  };

  /**
   * Process deep link URL
   */
  private processDeepLink(url: string) {
    try {
      const parsed = Linking.parse(url);
      console.log('Parsed deep link:', parsed);

      // Extract path and query params
      const { hostname, path, queryParams } = parsed;

      // Route based on path
      if (path) {
        this.routeToPath(path, queryParams ?? undefined);
      }
    } catch (error) {
      console.error('Error processing deep link:', error);
    }
  }

  /**
   * Route to specific path (with auth guard)
   */
  private async routeToPath(path: string, params?: Record<string, any>) {
    // Remove leading slash
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;

    console.log('Routing to:', cleanPath, params);

    // Auth guard — only allow unauthenticated deep links to auth screens
    const isAuthRoute = cleanPath.startsWith('login') || cleanPath.startsWith('register') || cleanPath.startsWith('forgot-password') || cleanPath.startsWith('welcome') || cleanPath.startsWith('auth/');
    if (!isAuthRoute) {
      const hasToken = await TokenManager.hasToken();
      if (!hasToken) {
        console.log('Deep link blocked — user not authenticated');
        router.replace('/(auth)/landing' as any);
        return;
      }
    }

    // Handle specific routes
    if (cleanPath.startsWith('content/article/')) {
      const id = cleanPath.split('/')[2];
      router.push(`/content/article/${id}` as any);
    } else if (cleanPath.startsWith('content/video/')) {
      const id = cleanPath.split('/')[2];
      router.push(`/content/video/${id}` as any);
    } else if (cleanPath.startsWith('content/practice/')) {
      const id = cleanPath.split('/')[2];
      router.push(`/content/practice/${id}` as any);
    } else if (cleanPath.startsWith('assessments/')) {
      const id = cleanPath.split('/')[1];
      if (id === 'result') {
        router.push('/assessments/result' as any);
      } else {
        router.push(`/assessments/${id}` as any);
      }
    } else if (cleanPath === 'chat') {
      router.push('/(tabs)/chat' as any);
    } else if (cleanPath === 'mood') {
      router.push('/(tabs)/mood' as any);
    } else if (cleanPath === 'profile') {
      router.push('/(tabs)/profile' as any);
    } else if (cleanPath === 'home' || cleanPath === '') {
      router.push('/(tabs)/' as any);
    }
  }

  /**
   * Create shareable deep link
   */
  createLink(path: string, params?: Record<string, any>): string {
    const url = Linking.createURL(path, { queryParams: params });
    console.log('Created deep link:', url);
    return url;
  }

  /**
   * Create web URL for sharing
   */
  createWebUrl(path: string, params?: Record<string, any>): string {
    const baseUrl = 'https://maansarathi.app';
    const queryString = params
      ? '?' + new URLSearchParams(params as any).toString()
      : '';
    return `${baseUrl}/${path}${queryString}`;
  }

  /**
   * Share content via deep link
   */
  async shareContent(contentType: 'article' | 'video' | 'practice', contentId: string) {
    const path = `content/${contentType}/${contentId}`;
    const webUrl = this.createWebUrl(path);
    
    try {
      await Share.share({
        message: `Check this out on MaanSarathi: ${webUrl}`,
        url: webUrl,
        title: 'MaanSarathi',
      });
    } catch {
      // User cancelled share
    }
    return webUrl;
  }
}

export const deepLinkService = new DeepLinkService();
