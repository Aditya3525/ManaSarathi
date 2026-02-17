import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';
import { API_BASE_URL } from '../constants/config';
import { TokenManager } from '../utils/storage';

export interface MediaPickerResult {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  fileSize?: number;
  base64?: string;
}

export interface MediaPickerOptions {
  mediaTypes?: ImagePicker.MediaTypeOptions;
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  allowsMultipleSelection?: boolean;
  base64?: boolean;
  maxFileSize?: number; // in bytes
}

class MediaPickerService {
  /**
   * Request camera permissions
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to take photos. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  }

  /**
   * Request media library permissions
   */
  async requestMediaLibraryPermission(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Photo library permission is required to select photos. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting media library permission:', error);
      return false;
    }
  }

  /**
   * Take a photo with camera
   */
  async takePhoto(options: MediaPickerOptions = {}): Promise<MediaPickerResult | null> {
    const hasPermission = await this.requestCameraPermission();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: options.mediaTypes || ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing !== false,
        aspect: options.aspect || [1, 1],
        quality: options.quality || 0.8,
        base64: options.base64 || false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];

      // Check file size if maxFileSize is specified
      if (options.maxFileSize && asset.fileSize && asset.fileSize > options.maxFileSize) {
        Alert.alert(
          'File Too Large',
          `The photo is too large. Maximum size is ${(options.maxFileSize / 1024 / 1024).toFixed(1)}MB.`
        );
        return null;
      }

      return {
        uri: asset.uri,
        type: 'image',
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
        base64: asset.base64 ?? undefined,
      };
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      return null;
    }
  }

  /**
   * Pick image(s) from library
   */
  async pickImage(options: MediaPickerOptions = {}): Promise<MediaPickerResult | MediaPickerResult[] | null> {
    const hasPermission = await this.requestMediaLibraryPermission();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: options.mediaTypes || ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing !== false,
        aspect: options.aspect || [1, 1],
        quality: options.quality || 0.8,
        allowsMultipleSelection: options.allowsMultipleSelection || false,
        base64: options.base64 || false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const processedAssets = result.assets
        .filter(asset => {
          if (options.maxFileSize && asset.fileSize && asset.fileSize > options.maxFileSize) {
            return false;
          }
          return true;
        })
        .map(asset => ({
          uri: asset.uri,
          type: 'image' as const,
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize,
          base64: asset.base64 ?? undefined,
        }));

      if (processedAssets.length === 0) {
        Alert.alert(
          'Files Too Large',
          `All selected files exceed the maximum size of ${(options.maxFileSize! / 1024 / 1024).toFixed(1)}MB.`
        );
        return null;
      }

      return options.allowsMultipleSelection ? processedAssets : processedAssets[0];
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      return null;
    }
  }

  /**
   * Show action sheet to choose between camera and library
   */
  async selectImage(options: MediaPickerOptions = {}): Promise<MediaPickerResult | null> {
    return new Promise((resolve) => {
      Alert.alert(
        'Select Photo',
        'Choose how you want to add a photo',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              const result = await this.takePhoto(options);
              resolve(result);
            },
          },
          {
            text: 'Choose from Library',
            onPress: async () => {
              const result = await this.pickImage(options);
              resolve(Array.isArray(result) ? result[0] : result);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(null),
          },
        ]
      );
    });
  }

  /**
   * Get image dimensions
   */
  async getImageDimensions(uri: string): Promise<{ width: number; height: number } | null> {
    try {
      return new Promise((resolve) => {
        if (Platform.OS === 'web') {
          const img = new Image();
          img.onload = () => {
            resolve({ width: img.width, height: img.height });
          };
          img.onerror = () => resolve(null);
          img.src = uri;
        } else {
          // For native platforms, dimensions are already provided by ImagePicker
          resolve(null);
        }
      });
    } catch (error) {
      console.error('Error getting image dimensions:', error);
      return null;
    }
  }
  /**
   * Upload avatar image to backend
   */
  async uploadAvatar(uri: string): Promise<{ url: string } | null> {
    try {
      const authHeaders = await TokenManager.getAuthHeaders();
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'avatar.jpg';
      const match = /\.([\w]+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('avatar', {
        uri,
        name: filename,
        type,
      } as any);

      const response = await fetch(`${API_BASE_URL}/auth/profile/avatar`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.success) {
        return { url: data.data?.url || data.data?.profilePhoto || '' };
      }
      return null;
    } catch (error) {
      console.error('Avatar upload error:', error);
      return null;
    }
  }
}

export const mediaPickerService = new MediaPickerService();
