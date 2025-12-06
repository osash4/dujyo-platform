/**
 * Dujyo Mobile App - Main Entry Point
 * Initializes all services and providers
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { S2EProvider } from './src/contexts/S2EContext';
import { PlayerProvider } from './src/contexts/PlayerContext';
import AppNavigator from './src/navigation/AppNavigator';
import { setupPlayer } from './src/services/audio/TrackPlayerService';
import { PushNotificationService } from './src/services/PushNotificationService';

function App(): React.JSX.Element {
  useEffect(() => {
    // Initialize services
    const initServices = async () => {
      try {
        console.log('🚀 Initializing Dujyo Mobile services...');

        // Setup audio player
        await setupPlayer();
        console.log('✅ TrackPlayer initialized');

        // Setup push notifications (complete initialization)
        await PushNotificationService.initialize();
        console.log('✅ Push notifications initialized');
      } catch (error) {
        console.error('❌ Error initializing services:', error);
      }
    };

    initServices();

    // Cleanup on unmount
    return () => {
      // Cleanup if needed
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <AuthProvider>
        <AuthS2EWrapper>
          <AppNavigator />
        </AuthS2EWrapper>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// Wrapper to pass userAddress to S2EProvider
const AuthS2EWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  return (
    <S2EProvider userAddress={user?.wallet_address || null}>
      <PlayerProvider>
        {children}
      </PlayerProvider>
    </S2EProvider>
  );
}

export default App;

