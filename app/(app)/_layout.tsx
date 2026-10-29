import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ColorValue, StyleSheet, View } from 'react-native';

import { PERMISSIONS, can } from '../../constants/permissions';
import { colors, font, letterSpacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useWatchAI } from '../../hooks/useWatchAI';

function TabIndicator({ focused, color }: { focused: boolean; color: ColorValue }) {
  return (
    <View
      style={[styles.indicator, { backgroundColor: focused ? color : 'transparent' }]}
    />
  );
}

export default function AppLayout() {
  const { isBootstrapping, isAuthenticated, isLocked, role } = useAuth();
  const { incidents } = useWatchAI();

  if (isBootstrapping) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // Unauthenticated users never reach an app screen.
  if (isLocked) return <Redirect href="/biometric" />;
  if (!isAuthenticated) return <Redirect href="/login" />;

  const canAnalyze = can(role, PERMISSIONS.UPLOAD_VIDEO);
  const openUrgent = incidents.filter(
    (incident) =>
      incident.status === 'DETECTED' && (incident.severity === 'CRITICAL' || incident.severity === 'HIGH'),
  ).length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarBadgeStyle: styles.badge,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Overview',
          tabBarIcon: ({ focused, color }) => <TabIndicator focused={focused} color={color} />,
        }}
      />

      <Tabs.Protected guard={canAnalyze}>
        <Tabs.Screen
          name="videos/index"
          options={{
            title: 'CCTV',
            tabBarIcon: ({ focused, color }) => <TabIndicator focused={focused} color={color} />,
          }}
        />
        <Tabs.Screen name="videos/upload" options={{ href: null, title: 'Analyse Footage' }} />
      </Tabs.Protected>

      <Tabs.Screen
        name="incidents/index"
        options={{
          title: 'Incidents',
          tabBarIcon: ({ focused, color }) => <TabIndicator focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen name="incidents/[id]" options={{ href: null, title: 'Incident' }} />

      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarBadge: openUrgent > 0 ? openUrgent : undefined,
          tabBarIcon: ({ focused, color }) => <TabIndicator focused={focused} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => <TabIndicator focused={focused} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 6,
    height: 66,
  },
  tabItem: {
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wide,
  },
  indicator: {
    width: 20,
    height: 3,
    borderRadius: 2,
  },
  badge: {
    backgroundColor: colors.critical,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
