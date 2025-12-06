/**
 * Main Navigation for Dujyo Mobile App
 * Bottom Tab Navigator with 4 main screens
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { setNavigationRef, setupDeepLinking } from '../services/DeepLinkingService';
import { 
  HomeIcon,
  SearchIcon,
  CoinsIcon,
  UserIcon,
} from '../utils/icons';
import { MiniPlayer } from '../components/MiniPlayer';

// Screens (we'll create these)
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import S2EScreen from '../screens/S2EScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PlayerFullScreen from '../screens/PlayerFullScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Main Tab Navigator
function MainTabs() {
  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#8B5CF6',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            backgroundColor: '#1A1A1A',
            borderTopColor: '#2D2D2D',
            borderTopWidth: 1,
            paddingBottom: 8,
            paddingTop: 8,
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <HomeIcon size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Search"
          component={SearchScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <SearchIcon size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="S2E"
          component={S2EScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <CoinsIcon size={size} color={color} />
            ),
            tabBarBadge: undefined, // Can add badge for new earnings
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <UserIcon size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
      <MiniPlayer />
    </View>
  );
}

// Root Stack Navigator (includes Player Full Screen)
export default function AppNavigator() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    // Set navigation ref for deep linking
    if (navigationRef.current) {
      setNavigationRef(navigationRef.current);
    }

    // Setup deep linking
    const cleanup = setupDeepLinking();
    return cleanup;
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          presentation: 'modal',
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen 
          name="PlayerFullScreen" 
          component={PlayerFullScreen}
          options={{
            presentation: 'fullScreenModal',
            gestureEnabled: true,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

