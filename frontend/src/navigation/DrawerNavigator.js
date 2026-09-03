import React, { useState, useEffect, useCallback } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, useDrawerStatus } from '@react-navigation/drawer';
import { Platform, View, TouchableOpacity, Text, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import HomeTabsNavigation from './TabNavigator';
import History from '../screens/History/History';
import Wishlist from '../screens/WishList/WishList';
import GeneratedImages from '../screens/Bible/GeneratedImages';
import GeneratedPdfsScreen from '../screens/Songs/GeneratedPdfsScreen';
import NotificationSettings from '../screens/Settings/NotificationSettings';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useOrg } from '../context/OrganizationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

const Drawer = createDrawerNavigator();

const CustomDrawerContent = (props) => {
  const { colors, theme, toggleTheme } = useTheme();
  const { user, isGuest } = useAuth();
  const { orgRole, activeOrg } = useOrg();
  const navigation = useNavigation();
  const [fellowships, setFellowships] = useState([]);
  const [loadingFellowships, setLoadingFellowships] = useState(false);

  const isAdmin = orgRole === 'Admin';

  const fetchFellowships = useCallback(async (silent = false) => {
    if (isGuest || !user) return;
    try {
      if (!silent) setLoadingFellowships(true);
      const res = await axios.get(`${API_URL}/api/fellowships`);
      if (res.data.status === 'Ok') {
        setFellowships(res.data.data);
      }
    } catch (err) {
      console.log('Error fetching fellowships for drawer:', err);
    } finally {
      if (!silent) setLoadingFellowships(false);
    }
  }, [isGuest, user, activeOrg]);

  // Refresh fellowships when drawer is focused/opened
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
      <DrawerContentScrollView {...props}>
        <DrawerItemList {...props} />

        {/* ─── THE UPPER ROOM SECTION ─── */}
        {/* The server also enforces this via requireFeature('upperRoom'); this
            keeps the drawer honest so the toggle visibly does something. */}
        {!isGuest && activeOrg?.features?.upperRoom !== false && (
          <View style={drawerStyles.upperRoomSection}>
            {/* Divider */}
            <View style={[drawerStyles.divider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />

            {/* Section Header */}
            <View style={drawerStyles.sectionHeader}>
              <View style={drawerStyles.sectionTitleRow}>
                <Icon name="book-open-variant" size={18} color={colors.secondary} />
                <Text style={[drawerStyles.sectionTitle, { color: colors.secondary }]}>
                  The Upper Room
                </Text>
              </View>
              {isAdmin && (
                <TouchableOpacity
                  style={[drawerStyles.addBtn, { backgroundColor: colors.secondary + '30' }]}
                  onPress={() => navigation.navigate('CreateFellowship')}
                >
                  <Icon name="plus" size={16} color={colors.secondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Fellowship List */}
            {loadingFellowships ? (
              <ActivityIndicator
                size="small"
                color={colors.secondary}
                style={{ paddingVertical: 12 }}
              />
            ) : fellowships.length === 0 ? (
              <Text style={[drawerStyles.emptyText, { color: colors.textLight }]}>
                No fellowships yet
              </Text>
            ) : (
              fellowships.map((fellowship) => (
                <TouchableOpacity
                  key={fellowship._id}
                  style={drawerStyles.fellowshipItem}
                  onPress={() => navigation.navigate('ChatScreen', {
                    fellowshipId: fellowship._id,
                    fellowshipName: fellowship.name,
                    fellowshipType: fellowship.type,
                    fellowshipIcon: fellowship.icon
                  })}
                >
                  <Text style={drawerStyles.fellowshipIcon}>{fellowship.icon || '📖'}</Text>
                  <View style={drawerStyles.fellowshipInfo}>
                    <Text
                      style={[drawerStyles.fellowshipName, { color: colors.textLight }]}
                      numberOfLines={1}
                    >
                      {fellowship.name}
                    </Text>
                    {fellowship.lastMessage?.text ? (
                      <Text
                        style={[drawerStyles.lastMessage, { color: 'rgba(255,255,255,0.4)' }]}
                        numberOfLines={1}
                      >
                        {fellowship.lastMessage.senderName}: {fellowship.lastMessage.text}
                      </Text>
                    ) : null}
                  </View>
                  {fellowship.unreadCount > 0 && (
                    <View style={[drawerStyles.unreadBadge, { backgroundColor: colors.secondary }]}>
                      <Text style={drawerStyles.unreadText}>
                        {fellowship.unreadCount > 99 ? '99+' : fellowship.unreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </DrawerContentScrollView>

      {/* Theme Toggle Footer */}
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

const DrawerNavigator = () => {
  const { isGuest } = useAuth();
  const { colors } = useTheme();
  const [isImageGenEnabled, setIsImageGenEnabled] = useState(true);
  const [hasGeneratedImages, setHasGeneratedImages] = useState(false);
  const [features, setFeatures] = useState({});

  useEffect(() => {
    let active = true;

    const checkImagesAndSettings = async () => {
      try {
        // 1. Check if user has generated any local images
        const savedGenImages = await AsyncStorage.getItem('@bible_generated_images');
        if (savedGenImages) {
          const parsed = JSON.parse(savedGenImages);
          if (active) {
            setHasGeneratedImages(Array.isArray(parsed) && parsed.length > 0);
          }
        } else {
          if (active) {
            setHasGeneratedImages(false);
          }
        }

        // 2. Fetch app settings
        const settingsRes = await axios.get(`${API_URL}/api/app-settings`);
        if (settingsRes.data.status === 'Success' && active) {
          setIsImageGenEnabled(settingsRes.data.data.isImageGenEnabled !== false);
          if (settingsRes.data.data.features) {
            setFeatures(settingsRes.data.data.features);
          }
        }
      } catch (error) {
        console.log('Error checking drawer images and settings:', error);
      }
    };

    checkImagesAndSettings();

    // Check local storage and setting every 2 seconds
    const interval = setInterval(checkImagesAndSettings, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const drawerIcon = ({ focused, size }, name) => {
    return (
      <Icon
        name={name}
        size={size}
        color={focused ? colors.secondary : colors.textLight}
      />
    );
  };

  const showGeneratedImagesTab = isImageGenEnabled || hasGeneratedImages;

  return (
    <Drawer.Navigator
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerActiveBackgroundColor: 'transparent',
        drawerInactiveBackgroundColor: 'transparent',
        drawerActiveTintColor: colors.secondary,
        drawerInactiveTintColor: colors.textLight,
        drawerHideStatusBarOnOpen: Platform.OS === 'ios' ? true : false,
        overlayColor: 'transparent',
        drawerStyle: {
          backgroundColor: colors.primary,
          width: '75%',
        },
        sceneContainerStyle: {
          backgroundColor: colors.primary,
        },
      }}>
      <Drawer.Screen
        name="Dashboard"
        component={HomeTabsNavigation}
        options={{
          drawerIcon: options => drawerIcon(options, 'home-outline'),
        }}
      />
      {/* These drawer items require a user account — hidden for guests */}
      {!isGuest && (
        <>
          <Drawer.Screen
            name="Wishlist"
            component={Wishlist}
            options={{
              drawerIcon: options => drawerIcon(options, 'heart-outline'),
            }}
          />
          <Drawer.Screen
            name="History"
            component={History}
            options={{
              title: 'Rent History',
              drawerIcon: options => drawerIcon(options, 'history'),
            }}
          />
          {showGeneratedImagesTab && (
            <Drawer.Screen
              name="Generated Images"
              component={GeneratedImages}
              options={{
                drawerIcon: options => drawerIcon(options, 'image-multiple-outline'),
              }}
            />
          )}
          {features.SongPdf !== false && (
            <Drawer.Screen
              name="Generated PDFs"
              component={GeneratedPdfsScreen}
              options={{
                title: 'Saved Song Sheets',
                drawerIcon: options => drawerIcon(options, 'file-pdf-box'),
              }}
            />
          )}
          <Drawer.Screen
            name="Settings"
            component={NotificationSettings}
            options={{
              drawerIcon: options => drawerIcon(options, 'cog-outline'),
            }}
          />
        </>
      )}
    </Drawer.Navigator>
  );
};

const drawerStyles = StyleSheet.create({
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

export default DrawerNavigator;
