/**
 * Push Notification Service - Handles FCM and local notifications
 * Integrates with S2E for earnings notifications
 */

import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidCategory, EventType } from '@notifee/react-native';
import apiClient from './api';

export class PushNotificationService {
  private static tokenSent = false;

  /**
   * Initialize all notification services
   */
  static async initialize(): Promise<void> {
    await this.requestPermissions();
    await this.getAndRegisterToken();
    this.setupBackgroundHandler();
    this.setupForegroundHandler();
    await this.setupNotificationActions();
  }

  /**
   * Get and register FCM token with backend
   */
  static async getAndRegisterToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      console.log('📱 FCM Token:', token);

      if (!this.tokenSent && token) {
        try {
          // Register token in backend for S2E notifications
          await apiClient.registerNotificationToken({
            token,
            platform: Platform.OS,
            device_id: await this.getDeviceId(),
          });
          this.tokenSent = true;
          console.log('✅ Token registered with backend');
        } catch (error) {
          console.error('Error registering token:', error);
        }
      }

      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Get device ID (placeholder - implement with react-native-device-info)
   */
  private static async getDeviceId(): Promise<string> {
    // TODO: Implement with react-native-device-info
    return `device-${Platform.OS}-${Date.now()}`;
  }

  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        return (
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL
        );
      }

      // Android - permissions are requested automatically
      await notifee.requestPermission();
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Setup notification actions and channels
   */
  static async setupNotificationActions(): Promise<void> {
    // Create Android channels
    await notifee.createChannel({
      id: 's2e_earnings',
      name: 'S2E Earnings',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
      category: AndroidCategory.MUSIC,
    });

    await notifee.createChannel({
      id: 'limits',
      name: 'Daily Limits',
      importance: AndroidImportance.HIGH,
      sound: 'warning',
    });

    // Listen to notification events
    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('📬 Notification pressed:', detail.notification);
        // TODO: Navigate to relevant screen
      }
      if (type === EventType.ACTION_PRESS) {
        console.log('📬 Notification action pressed:', detail.pressAction?.id);
        // TODO: Handle action (e.g., open S2E screen, withdraw)
      }
    });
  }

  /**
   * Setup background message handler
   */
  static setupBackgroundHandler(): void {
    // Handle messages when app is in background/quit
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('📬 Message handled in background:', remoteMessage);

      // Display local notification
      await this.displayNotification({
        title: remoteMessage.notification?.title || 'Dujyo',
        body: remoteMessage.notification?.body || '',
        data: remoteMessage.data,
      });
    });
  }

  /**
   * Setup foreground message handler
   */
  static setupForegroundHandler(): void {
    // Handle messages when app is in foreground
    messaging().onMessage(async (remoteMessage) => {
      console.log('📬 Message received in foreground:', remoteMessage);

      // Display local notification
      await this.displayNotification({
        title: remoteMessage.notification?.title || 'Dujyo',
        body: remoteMessage.notification?.body || '',
        data: remoteMessage.data,
      });
    });
  }

  /**
   * Display local notification
   */
  static async displayNotification(notification: {
    title: string;
    body: string;
    data?: any;
  }): Promise<void> {
    try {
      await notifee.requestPermission();

      // Create Android channel
      const channelId = await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
        category: AndroidCategory.MUSIC,
      });

      await notifee.displayNotification({
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        android: {
          channelId,
          smallIcon: 'ic_notification',
          color: '#8B5CF6',
          pressAction: {
            id: 'default',
          },
          category: AndroidCategory.MUSIC,
        },
        ios: {
          sound: 'default',
          categoryId: 'MUSIC',
        },
      });
    } catch (error) {
      console.error('Error displaying notification:', error);
    }
  }

  /**
   * Send S2E earnings notification with actions
   */
  static async sendS2EEarningNotification(amount: number, trackName: string): Promise<void> {
    await notifee.displayNotification({
      title: '🎧 DYO Earned!',
      body: `+${amount.toFixed(2)} DYO from "${trackName}"`,
      data: {
        type: 's2e_earning',
        amount: amount.toString(),
        trackName,
        screen: 'S2E',
      },
      android: {
        channelId: 's2e_earnings',
        smallIcon: 'ic_notification',
        color: '#8B5CF6',
        pressAction: {
          id: 'open_s2e',
          launchActivity: 'default',
        },
        actions: [
          {
            title: 'View Details',
            pressAction: {
              id: 'view_details',
            },
          },
          {
            title: 'Withdraw',
            pressAction: {
              id: 'withdraw',
            },
          },
        ],
      },
      ios: {
        sound: 'default',
        categoryId: 's2e_earnings',
      },
    });
  }

  /**
   * Schedule S2E earnings notification (alias for compatibility)
   */
  static async scheduleS2ENotification(amount: number, trackName: string): Promise<void> {
    await this.sendS2EEarningNotification(amount, trackName);
  }

  /**
   * Send daily limit notification
   */
  static async sendLimitNotification(
    percentage: number,
    type: 'warning' | 'critical'
  ): Promise<void> {
    const config = {
      warning: {
        title: '⚠️ Daily Limit Warning',
        body: `You've used ${percentage}% of your daily listening limit`,
        sound: 'warning',
      },
      critical: {
        title: '🚨 Daily Limit Critical',
        body: `You've used ${percentage}% of your daily listening limit. Consider taking a break.`,
        sound: 'alarm',
      },
    };

    await notifee.displayNotification({
      ...config[type],
      data: {
        type: 'limit_notification',
        notification_type: type,
        percentage: percentage.toString(),
        screen: 'S2E',
      },
      android: {
        channelId: 'limits',
        smallIcon: 'ic_notification',
        color: type === 'warning' ? '#F59E0B' : '#EF4444',
        pressAction: {
          id: 'open_s2e',
          launchActivity: 'default',
        },
      },
      ios: {
        sound: type === 'warning' ? 'warning.aiff' : 'alarm.caf',
        categoryId: 'limits',
      },
    });
  }

  /**
   * Schedule daily limit notification (alias for compatibility)
   */
  static async scheduleLimitNotification(
    percentage: number,
    type: 'warning' | 'critical'
  ): Promise<void> {
    await this.sendLimitNotification(percentage, type);
  }

  /**
   * Schedule new content notification
   */
  static async scheduleNewContentNotification(artistName: string, trackName: string): Promise<void> {
    await this.displayNotification({
      title: '🎉 New Content Available',
      body: `${artistName} just released "${trackName}"`,
      data: {
        type: 'new_content',
        artistName,
        trackName,
      },
    });
  }

  /**
   * Cancel all notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await notifee.cancelAllNotifications();
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }
}

