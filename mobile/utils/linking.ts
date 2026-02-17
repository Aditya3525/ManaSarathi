import * as Linking from 'expo-linking';
import { Alert, Platform, Share } from 'react-native';

/**
 * Open a URL in the device's default browser or app
 */
export const openURL = async (url: string): Promise<void> => {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open this URL');
    }
  } catch (error) {
    console.error('Error opening URL:', error);
    Alert.alert('Error', 'Failed to open URL');
  }
};

/**
 * Make a phone call
 */
export const makePhoneCall = async (phoneNumber: string): Promise<void> => {
  const url = `tel:${phoneNumber}`;
  await openURL(url);
};

/**
 * Send an SMS
 */
export const sendSMS = async (phoneNumber: string, body?: string): Promise<void> => {
  const url = Platform.OS === 'ios' 
    ? `sms:${phoneNumber}${body ? `&body=${encodeURIComponent(body)}` : ''}`
    : `sms:${phoneNumber}${body ? `?body=${encodeURIComponent(body)}` : ''}`;
  await openURL(url);
};

/**
 * Send an email
 */
export const sendEmail = async (email: string, subject?: string, body?: string): Promise<void> => {
  let url = `mailto:${email}`;
  const params: string[] = [];
  
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }
  
  await openURL(url);
};

/**
 * Open app settings
 */
export const openSettings = async (): Promise<void> => {
  await Linking.openSettings();
};

/**
 * Share via system share sheet
 */
export const share = async (url: string, title?: string): Promise<void> => {
  try {
    await Share.share(
      Platform.OS === 'ios'
        ? { url, title }
        : { message: title ? `${title}\n${url}` : url, title }
    );
  } catch (error) {
    // User cancelled or share failed — silently ignore
  }
};
