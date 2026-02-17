/**
 * Utility function for conditional class names
 * Simplified version of clsx/cn for React Native + NativeWind
 */

type ClassValue = string | number | boolean | undefined | null | ClassValue[];

export function cn(...classes: ClassValue[]): string {
  return classes
    .flat()
    .filter((x): x is string | number => {
      if (typeof x === 'string') return x.length > 0;
      if (typeof x === 'number') return true;
      return false;
    })
    .join(' ')
    .trim();
}
