import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CriticalAlert } from '../components/CriticalAlert';
import { NotificationTapHandler } from '../components/NotificationTapHandler';
import { colors } from '../constants/theme';
import { AuthProvider } from '../context/AuthContext';
import { WatchAIProvider } from '../context/WatchAIContext';
import { configureNotificationHandler, setupChannels } from '../services/notificationService';

// Foreground notification presentation has to be registered before any notification arrives.
configureNotificationHandler();

export default function RootLayout() {
  useEffect(() => {
    void setupChannels();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <WatchAIProvider>
          <View style={styles.root}>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'fade',
                contentStyle: { backgroundColor: colors.bg },
              }}
            />
            <NotificationTapHandler />
            <CriticalAlert />
          </View>
        </WatchAIProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
