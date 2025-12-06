/**
 * Deep Linking Service - Handles app deep links
 * Supports: dujyo://song/123, dujyo://artist/456, dujyo://s2e, dujyo://profile
 */

import { Linking } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';

let navigationRef: NavigationContainerRef<any> | null = null;

export const setNavigationRef = (ref: NavigationContainerRef<any>) => {
  navigationRef = ref;
};

export const setupDeepLinking = () => {
  // Handle links when app is opened from closed state
  const handleInitialURL = async () => {
    try {
      const url = await Linking.getInitialURL();
      if (url) {
        handleDeepLink(url);
      }
    } catch (error) {
      console.error('Error getting initial URL:', error);
    }
  };

  // Handle links while app is running
  const handleURL = (event: { url: string }) => {
    handleDeepLink(event.url);
  };

  const subscription = Linking.addEventListener('url', handleURL);
  handleInitialURL();

  return () => {
    subscription.remove();
  };
};

const handleDeepLink = (url: string) => {
  if (!navigationRef) {
    console.warn('Navigation ref not set, cannot handle deep link:', url);
    return;
  }

  try {
    // Parse URL
    // dujyo://song/123
    // dujyo://artist/456
    // dujyo://s2e/earnings
    // dujyo://profile

    const route = url.replace(/.*?:\/\//g, '');
    const parts = route.split('/').filter(Boolean);
    const [screen, ...params] = parts;

    console.log('🔗 Handling deep link:', { screen, params, url });

    switch (screen) {
      case 'song':
      case 'track':
        if (params[0]) {
          navigationRef.navigate('PlayerFullScreen', { 
            songId: params[0],
            trackId: params[0],
          });
        }
        break;

      case 'artist':
        if (params[0]) {
          // TODO: Create ArtistProfile screen
          navigationRef.navigate('Search', { 
            initialQuery: params[0],
            filter: 'artist',
          });
        }
        break;

      case 's2e':
        navigationRef.navigate('S2E', { 
          tab: params[0] || 'earnings',
        });
        break;

      case 'profile':
        navigationRef.navigate('Profile');
        break;

      case 'content':
        if (params[0]) {
          navigationRef.navigate('PlayerFullScreen', { 
            contentId: params[0],
          });
        }
        break;

      default:
        console.log('⚠️ Unknown deep link:', url);
    }
  } catch (error) {
    console.error('❌ Error handling deep link:', error);
  }
};

/**
 * Generate deep link URL
 */
export const generateDeepLink = (
  type: 'song' | 'track' | 'artist' | 's2e' | 'profile' | 'content',
  id?: string
): string => {
  const baseUrl = 'dujyo://';
  if (id) {
    return `${baseUrl}${type}/${id}`;
  }
  return `${baseUrl}${type}`;
};

/**
 * Share deep link
 */
export const shareDeepLink = async (
  type: 'song' | 'track' | 'artist' | 's2e' | 'profile' | 'content',
  id?: string
) => {
  const link = generateDeepLink(type, id);
  // TODO: Implement Share API
  console.log('Share link:', link);
  return link;
};

