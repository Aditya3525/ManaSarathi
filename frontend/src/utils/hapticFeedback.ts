/**
 * Haptic Feedback Utilities
 * Provides vibration feedback for mobile devices
 */

export type HapticPattern = 
  | 'light'        // 10ms
  | 'medium'       // 20ms
  | 'heavy'        // 30ms
  | 'success'      // [10, 50, 10]
  | 'warning'      // [30, 100, 30]
  | 'error'        // [50, 100, 50, 100, 50]
  | 'notification' // [200, 100, 200]
  | 'selection'    // 5ms
  | 'impact';      // 40ms

const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 10],
  warning: [30, 100, 30],
  error: [50, 100, 50, 100, 50],
  notification: [200, 100, 200],
  selection: 5,
  impact: 40,
};

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return 'vibrate' in navigator;
}

/**
 * Trigger haptic feedback
 * @param pattern - Predefined pattern or custom vibration sequence
 * @returns Promise<boolean> - true if vibration was triggered
 */
export async function triggerHaptic(
  pattern: HapticPattern | number | number[]
): Promise<boolean> {
  if (!isHapticSupported()) {
    return false;
  }

  // Check if user has disabled haptics
  const hapticEnabled = getHapticPreference();
  if (!hapticEnabled) {
    return false;
  }

  try {
    let vibrationPattern: number | number[];

    if (typeof pattern === 'string') {
      vibrationPattern = HAPTIC_PATTERNS[pattern];
    } else {
      vibrationPattern = pattern;
    }

    const success = navigator.vibrate(vibrationPattern);
    return success;
  } catch (error) {
    console.error('[Haptic] Error triggering vibration:', error);
    return false;
  }
}

/**
 * Stop any ongoing vibration
 */
export function stopHaptic(): void {
  if (isHapticSupported()) {
    navigator.vibrate(0);
  }
}

/**
 * Get user's haptic preference from localStorage
 */
export function getHapticPreference(): boolean {
  try {
    const preference = localStorage.getItem('haptic-feedback-enabled');
    return preference !== 'false'; // Default to true
  } catch {
    return true;
  }
}

/**
 * Set user's haptic preference
 */
export function setHapticPreference(enabled: boolean): void {
  try {
    localStorage.setItem('haptic-feedback-enabled', String(enabled));
  } catch (error) {
    console.error('[Haptic] Error saving preference:', error);
  }
}

/**
 * Haptic feedback for button clicks
 */
export function hapticButtonClick(): Promise<boolean> {
  return triggerHaptic('light');
}

/**
 * Haptic feedback for successful actions
 */
export function hapticSuccess(): Promise<boolean> {
  return triggerHaptic('success');
}

/**
 * Haptic feedback for errors
 */
export function hapticError(): Promise<boolean> {
  return triggerHaptic('error');
}

/**
 * Haptic feedback for warnings
 */
export function hapticWarning(): Promise<boolean> {
  return triggerHaptic('warning');
}

/**
 * Haptic feedback for notifications
 */
export function hapticNotification(): Promise<boolean> {
  return triggerHaptic('notification');
}

/**
 * Haptic feedback for item selection
 */
export function hapticSelection(): Promise<boolean> {
  return triggerHaptic('selection');
}

/**
 * Haptic feedback for impact/emphasis
 */
export function hapticImpact(): Promise<boolean> {
  return triggerHaptic('impact');
}

/**
 * React Hook for haptic feedback
 */
export function useHaptic() {
  return {
    isSupported: isHapticSupported(),
    trigger: triggerHaptic,
    stop: stopHaptic,
    buttonClick: hapticButtonClick,
    success: hapticSuccess,
    error: hapticError,
    warning: hapticWarning,
    notification: hapticNotification,
    selection: hapticSelection,
    impact: hapticImpact,
    getPreference: getHapticPreference,
    setPreference: setHapticPreference,
  };
}

/**
 * Utility function to add haptic feedback to click handlers
 */
export function withHapticFeedback(
  onClick: (() => void) | undefined,
  hapticPattern: HapticPattern = 'light'
): (() => void) | undefined {
  if (!onClick) return undefined;
  
  return () => {
    triggerHaptic(hapticPattern);
    onClick();
  };
}
