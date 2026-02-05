import { useCallback } from 'react';

export interface AnalyticsEvent {
  event: string;
  category: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
}

export function useAnalytics() {
  const trackEvent = useCallback((eventData: AnalyticsEvent) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics Event:', eventData);
    }

    // Send to analytics service (Google Analytics, Mixpanel, etc.)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventData.event, {
        event_category: eventData.category,
        event_label: eventData.label,
        value: eventData.value,
        ...eventData.metadata,
      });
    }

    // Add more analytics providers as needed
    // Example: Mixpanel
    // if (typeof window !== 'undefined' && (window as any).mixpanel) {
    //   (window as any).mixpanel.track(eventData.event, eventData.metadata);
    // }
  }, []);

  const trackPageView = useCallback((page: string, title?: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📄 Page View:', { page, title });
    }

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', 'GA_MEASUREMENT_ID', {
        page_path: page,
        page_title: title,
      });
    }
  }, []);

  const trackButtonClick = useCallback((buttonName: string, location: string) => {
    trackEvent({
      event: 'button_click',
      category: 'engagement',
      label: buttonName,
      metadata: { location },
    });
  }, [trackEvent]);

  const trackFormSubmit = useCallback((formName: string, success: boolean) => {
    trackEvent({
      event: 'form_submit',
      category: 'conversion',
      label: formName,
      value: success ? 1 : 0,
      metadata: { success },
    });
  }, [trackEvent]);

  const trackScrollDepth = useCallback((depth: number) => {
    trackEvent({
      event: 'scroll_depth',
      category: 'engagement',
      label: `${depth}%`,
      value: depth,
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackPageView,
    trackButtonClick,
    trackFormSubmit,
    trackScrollDepth,
  };
}
