import { Bell, X, MessageCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { chatApi } from '../../../services/api';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';

interface ProactiveCheckInNotificationProps {
  user: { id: string } | null;
  onStartChat?: () => void;
}

export function ProactiveCheckInNotification({ user, onStartChat }: ProactiveCheckInNotificationProps) {
  const [checkIn, setCheckIn] = useState<{
    shouldCheckIn: boolean;
    message: string;
    priority: 'high' | 'medium' | 'low';
  } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const checkForProactiveCheckIn = async () => {
      if (!user || isDismissed) return;

      try {
        const response = await chatApi.getProactiveCheckIn();
        if (response.success && response.data?.shouldCheckIn) {
          setCheckIn(response.data);
          setIsVisible(true);
        }
      } catch (error) {
        console.error('Failed to check for proactive check-in:', error);
      }
    };

    // Check immediately
    checkForProactiveCheckIn();

    // Check periodically (every 30 minutes)
    const interval = setInterval(checkForProactiveCheckIn, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
  };

  const handleAccept = () => {
    setIsVisible(false);
    if (onStartChat) {
      onStartChat();
    }
  };

  if (!isVisible || !checkIn) return null;

  const getPriorityColor = () => {
    switch (checkIn.priority) {
      case 'high':
        return 'border-red-300 bg-red-50';
      case 'medium':
        return 'border-orange-300 bg-orange-50';
      default:
        return 'border-blue-300 bg-blue-50';
    }
  };

  const getPriorityIcon = () => {
    switch (checkIn.priority) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      default:
        return '🔵';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-5">
      <Card className={`${getPriorityColor()} border-2 shadow-lg`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <Bell className="h-5 w-5 text-gray-700" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">{getPriorityIcon()}</span>
                <h4 className="font-semibold text-gray-900">Check-in Time</h4>
              </div>
              <p className="text-sm text-gray-700 mb-4">{checkIn.message}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAccept}
                  className="flex-1 gap-1"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Let&apos;s Talk
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDismiss}
                  className="flex gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  Later
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
