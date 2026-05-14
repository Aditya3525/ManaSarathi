import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from './button';
import { Card, CardContent } from './card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWA Install Prompt Component
 * Shows a prompt to install the app when available
 */
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      return;
    }

    // Check if user previously dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Handle beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Show prompt after 30 seconds
      setTimeout(() => {
        setShowPrompt(true);
      }, 30000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show manual instructions after 30 seconds
    if (iOS) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 30000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      void choiceResult;

      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Error showing install prompt:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-in slide-in-from-bottom-5 duration-500">
      <Card className="border-primary/20 bg-card/95 backdrop-blur-lg shadow-2xl">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Download className="h-5 w-5 text-primary" />
            </div>
            
            <div className="flex-1 space-y-2">
              <div>
                <h3 className="font-semibold text-sm">Install ManaSarathi</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {isIOS 
                    ? 'Tap the share button and select "Add to Home Screen" for quick access'
                    : 'Add to your home screen for faster access and offline support'
                  }
                </p>
              </div>

              <div className="flex gap-2">
                {!isIOS && deferredPrompt && (
                  <Button
                    size="sm"
                    onClick={handleInstallClick}
                    className="flex-1 h-8 text-xs"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Install Now
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="h-8 text-xs"
                >
                  {isIOS ? 'Got it' : 'Maybe Later'}
                </Button>
              </div>
            </div>

            <Button
              size="icon"
              variant="ghost"
              onClick={handleDismiss}
              className="h-6 w-6 -mt-1 -mr-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Hook to check if app is installed as PWA
 */
export function useIsInstalled() {
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const checkInstalled = () => {
      // Check if running in standalone mode
      const standalone = window.matchMedia('(display-mode: standalone)').matches;
      
      // Check if running in PWA mode on iOS
      const iOS = (window.navigator as any).standalone === true;
      
      setIsInstalled(standalone || iOS);
    };

    checkInstalled();

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return isInstalled;
}
