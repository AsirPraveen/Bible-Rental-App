import React, { useState, useEffect, useCallback } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, useDrawerStatus } from '@react-navigation/drawer';
import { Platform, View, TouchableOpacity, Text, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AdminTabsNavigation from './AdminTabsNavigation';
import AppSettingsTab from '../screens/AdminScreen/components/AppSettingsTab';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useOrg } from '../context/OrganizationContext';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const AdminDrawer = createDrawerNavigator();

const AdminCustomDrawerContent = (props: any) => {
  const { colors, theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { activeOrg } = useOrg();
  const navigation = useNavigation<any>();
  const [fellowships, setFellowships] = useState<any[]>([]);
  const [loadingFellowships, setLoadingFellowships] = useState(false);

  const fetchFellowships = useCallback(async (silent = false) => {
    if (!user) return;
    try {
      if (!silent) setLoadingFellowships(true);
      const res = await axios.get(`${API_URL}/api/fellowships`);
      if (res.data.status === 'Ok') {
        setFellowships(res.data.data);
      }
    } catch (err) {
      console.log('Error fetching admin fellowships:', err);
    } finally {
      if (!silent) setLoadingFellowships(false);
    }
  }, [user, activeOrg]);

  useFocusEffect(
    useCallback(() => {
      fetchFellowships(true); // silent refresh
    }, [fetchFellowships])
  );

  const drawerStatus = useDrawerStatus();
  useEffect(() => {
    if (drawerStatus === 'open') {
      fetchFellowships(true); // silent refresh on drawer open
    }
  }, [drawerStatus, fetchFellowships]);

  useEffect(() => {
    fetchFellowships(false); // show loader on initial mount
  }, [fetchFellowships]);

  return (
    <View style={{ flex: 1 }}>
      {drawerStatus === 'open' && (
        <StatusBar barStyle="light-content" backgroundColor={colors.linearGradient?.[0] || colors.primary} />
      )}
      <DrawerContentScrollView {...props}>
        <DrawerItemList {...props} />

        {/* ─── THE UPPER ROOM SECTION ─── */}
        <View style={adminDrawerStyles.upperRoomSection}>
          <View style={[adminDrawerStyles.divider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />

          <View style={adminDrawerStyles.sectionHeader}>
            <View style={adminDrawerStyles.sectionTitleRow}>
              <Icon name="book-open-variant" size={18} color={colors.secondary} />
              <Text style={[adminDrawerStyles.sectionTitle, { color: colors.secondary }]}>
                The Upper Room
              </Text>
            </View>
            <TouchableOpacity
              style={[adminDrawerStyles.addBtn, { backgroundColor: colors.secondary + '30' }]}
              onPress={() => navigation.navigate('CreateFellowship')}
            >
              <Icon name="plus" size={16} color={colors.secondary} />
            </TouchableOpacity>
          </View>

          {loadingFellowships ? (
            <ActivityIndicator size="small" color={colors.secondary} style={{ paddingVertical: 12 }} />
          ) : fellowships.length === 0 ? (
            <Text style={[adminDrawerStyles.emptyText, { color: colors.textLight }]}>
              No fellowships yet — tap + to create
            </Text>
          ) : (
            fellowships.map((fellowship: any) => (
              <TouchableOpacity
                key={fellowship._id}
                style={adminDrawerStyles.fellowshipItem}
                onPress={() => navigation.navigate('ChatScreen', {
                  fellowshipId: fellowship._id,
                  fellowshipName: fellowship.name,
                  fellowshipType: fellowship.type,
                  fellowshipIcon: fellowship.icon
                })}
              >
                <Text style={adminDrawerStyles.fellowshipIcon}>{fellowship.icon || '📖'}</Text>
                <View style={adminDrawerStyles.fellowshipInfo}>
                  <Text
                    style={[adminDrawerStyles.fellowshipName, { color: colors.textLight }]}
                    numberOfLines={1}
                  >
                    {fellowship.name}
                  </Text>
                  {fellowship.lastMessage?.text ? (
                    <Text
                      style={[adminDrawerStyles.lastMessage, { color: 'rgba(255,255,255,0.4)' }]}
                      numberOfLines={1}
                    >
                      {fellowship.lastMessage.senderName}: {fellowship.lastMessage.text}
                    </Text>
                  ) : null}
                </View>
                {fellowship.unreadCount > 0 && (
                  <View style={[adminDrawerStyles.unreadBadge, { backgroundColor: colors.secondary }]}>
                    <Text style={adminDrawerStyles.unreadText}>
                      {fellowship.unreadCount > 99 ? '99+' : fellowship.unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      </DrawerContentScrollView>

      {/* Theme Toggle */}
      <View style={{
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
      }}>
        <TouchableOpacity
          onPress={toggleTheme}
          activeOpacity={0.7}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(255, 255, 255, 0.18)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons
            name={theme === 'dark' ? 'moon' : 'sunny'}
            size={24}
            color={colors.textLight}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const AdminDrawerNavigator = () => {
  const { colors } = useTheme();

  return (
    <AdminDrawer.Navigator
      drawerContent={props => <AdminCustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerActiveBackgroundColor: 'transparent',
        drawerInactiveBackgroundColor: 'transparent',
        drawerActiveTintColor: colors.secondary,
        drawerInactiveTintColor: colors.textLight,
        drawerHideStatusBarOnOpen: Platform.OS === 'ios',
        overlayColor: 'transparent',
        drawerStyle: {
          backgroundColor: colors.linearGradient?.[0] || colors.primary,
          width: '70%',
        },
        sceneStyle: {
          backgroundColor: colors.linearGradient?.[0] || colors.primary,
        },
      }}
    >
      <AdminDrawer.Screen
        name="Dashboard"
        component={AdminTabsNavigation}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon
              name="home-outline"
              size={size}
              color={focused ? colors.secondary : colors.textLight}
            />
          ),
        }}
      />
      <AdminDrawer.Screen
        name="AppSettings"
        component={AppSettingsTab}
        options={{
          title: "App Configuration",
          drawerIcon: ({ focused, size }) => (
            <Icon
              name="cog-outline"
              size={size}
              color={focused ? colors.secondary : colors.textLight}
            />
          ),
        }}
      />
    </AdminDrawer.Navigator>
  );
};

const adminDrawerStyles = StyleSheet.create({
  upperRoomSection: {
    marginTop: 4,
    paddingHorizontal: 6,
  },
  divider: {
    height: 1,
    marginVertical: 10,
    marginHorizontal: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontStyle: 'italic',
  },
  fellowshipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 4,
    marginVertical: 1,
  },
  fellowshipIcon: {
    fontSize: 20,
    width: 28,
  },
  fellowshipInfo: {
    flex: 1,
    marginLeft: 6,
  },
  fellowshipName: {
    fontSize: 13,
    fontWeight: '600',
  },
  lastMessage: {
    fontSize: 11,
    marginTop: 1,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default AdminDrawerNavigator;
