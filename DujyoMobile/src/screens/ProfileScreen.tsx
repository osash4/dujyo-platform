/**
 * Profile Screen - User profile, settings, wallet
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserIcon as User, SettingsIcon as Settings, WalletIcon as Wallet, LogOutIcon as LogOut } from '../utils/icons';

const ProfileScreen: React.FC = () => {
  // TODO: Get user data from auth context
  const user = {
    username: 'user123',
    email: 'user@example.com',
    wallet_address: '0x1234...5678',
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <User size={48} color="#8B5CF6" />
          </View>
          <Text style={styles.username}>{user.username}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.wallet}>{user.wallet_address}</Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.menuItem}>
            <Wallet size={20} color="#8B5CF6" />
            <Text style={styles.menuText}>Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Settings size={20} color="#8B5CF6" />
            <Text style={styles.menuText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <LogOut size={20} color="#EF4444" />
            <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 32,
    paddingBottom: 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  wallet: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  section: {
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  logoutText: {
    color: '#EF4444',
  },
});

export default ProfileScreen;

