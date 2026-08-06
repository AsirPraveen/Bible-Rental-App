import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, useDrawerStatus } from '@react-navigation/drawer';
import { Platform, View, TouchableOpacity, Text, StyleSheet, StatusBar } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

import SuperAdminDashboard from '../screens/SuperAdminDashboard/SuperAdminDashboard';
import SuperAdminSongsTab from '../screens/SuperAdminDashboard/SuperAdminSongsTab';
import GuestSettingsTab from '../screens/AdminScreen/GuestSettingsTab';
import ManageMapsTab from '../screens/AdminScreen/ManageMapsTab';

const SuperAdminDrawer = createDrawerNavigator();

const SuperAdminCustomDrawerContent = (props: any) => {
  const { colors, theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const drawerStatus = useDrawerStatus();

  return (
    <View style={{ flex: 1 }}>
      {drawerStatus === 'open' && (
        <StatusBar barStyle="light-content" backgroundColor={colors.linearGradient?.[0] || colors.primary} />
      )}
      <DrawerContentScrollView {...props}>
        {/* Header section with admin credentials */}
        <View style={styles.drawerHeader}>
          <Icon name="shield-account" size={40} color={colors.tint} />
          <Text style={[styles.adminName, { color: colors.text }]}>
            {user?.name || 'Platform Admin'}
          </Text>
          <Text style={[styles.adminEmail, { color: colors.textSecondary }]}>
            {user?.email}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {/* Theme Toggle Footer */}
      <View style={[styles.drawerFooter, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={toggleTheme}
          activeOpacity={0.7}
          style={[styles.themeBtn, { backgroundColor: colors.theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
        >
          <Ionicons
            name={theme === 'dark' ? 'moon' : 'sunny'}
            size={24}
            color={colors.tint}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const SuperAdminDrawerNavigator = () => {
  const { colors } = useTheme();

  return (
    <SuperAdminDrawer.Navigator
      drawerContent={props => <SuperAdminCustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerActiveBackgroundColor: 'transparent',
        drawerInactiveBackgroundColor: 'transparent',
        drawerActiveTintColor: colors.tint,
        drawerInactiveTintColor: colors.textSecondary,
        drawerHideStatusBarOnOpen: Platform.OS === 'ios',
        overlayColor: 'transparent',
        drawerStyle: {
          backgroundColor: colors.linearGradient?.[0] || colors.primary,
          width: '75%',
        },
        sceneStyle: {
          backgroundColor: colors.linearGradient?.[0] || colors.primary,
        },
      }}
    >
      <SuperAdminDrawer.Screen
        name="Dashboard"
        component={SuperAdminDashboard}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon
              name="view-dashboard-outline"
              size={size}
              color={focused ? colors.tint : colors.textSecondary}
            />
          ),
        }}
      />
      <SuperAdminDrawer.Screen
        name="Manage Songs"
        component={SuperAdminSongsTab}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon
              name="music"
              size={size}
              color={focused ? colors.tint : colors.textSecondary}
            />
          ),
        }}
      />
      <SuperAdminDrawer.Screen
        name="Guest Settings"
        component={GuestSettingsTab}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon
              name="account-cog-outline"
              size={size}
              color={focused ? colors.tint : colors.textSecondary}
            />
          ),
        }}
      />
      <SuperAdminDrawer.Screen
        name="Manage Maps"
        component={ManageMapsTab}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon
              name="map-outline"
              size={size}
              color={focused ? colors.tint : colors.textSecondary}
            />
          ),
        }}
      />
    </SuperAdminDrawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerHeader: {
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  adminName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  adminEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 10,
    marginHorizontal: 20,
  },
  drawerFooter: {
    padding: 20,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  themeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SuperAdminDrawerNavigator;
