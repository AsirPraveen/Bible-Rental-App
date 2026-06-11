import React, { useState, useEffect } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Platform } from 'react-native';
import HomeTabsNavigation from './TabNavigator';
import History from '../screens/History/History';
import Wishlist from '../screens/WishList/WishList';
import GeneratedImages from '../screens/Bible/GeneratedImages';
import NotificationSettings from '../screens/Settings/NotificationSettings';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const Drawer = createDrawerNavigator();

// Define Colors at the top
const Colors = {
  bg: '#146C94',
  active: '#AFD3E2',
  inactive: '#F6F1F1',
  transparent: 'transparent',
};

const DrawerNavigator = () => {
  const { isGuest } = useAuth();
  const [isImageGenEnabled, setIsImageGenEnabled] = useState(true);
  const [hasGeneratedImages, setHasGeneratedImages] = useState(false);

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
        color={focused ? Colors.active : Colors.inactive}
      />
    );
  };

  const showGeneratedImagesTab = isImageGenEnabled || hasGeneratedImages;

  return (
    <Drawer.Navigator
      drawerType="slide"
      screenOptions={{
        headerShown: false,
        drawerActiveBackgroundColor: Colors.transparent,
        drawerInactiveBackgroundColor: Colors.transparent,
        drawerActiveTintColor: Colors.active,
        drawerInactiveTintColor: Colors.inactive,
        drawerHideStatusBarOnOpen: Platform.OS === 'ios' ? true : false,
        overlayColor: Colors.transparent,
        drawerStyle: {
          backgroundColor: Colors.bg,
          width: '60%',
        },
        sceneContainerStyle: {
          backgroundColor: Colors.bg,
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
          <Drawer.Screen
            name="Notifications"
            component={NotificationSettings}
            options={{
              drawerIcon: options => drawerIcon(options, 'bell-outline'),
            }}
          />
        </>
      )}
    </Drawer.Navigator>
  );
};

export default DrawerNavigator;
