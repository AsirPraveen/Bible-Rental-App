import React, { useState, useEffect } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Platform, View, TouchableOpacity } from 'react-native';
import HomeTabsNavigation from './TabNavigator';
import History from '../screens/History/History';
import Wishlist from '../screens/WishList/WishList';
import GeneratedImages from '../screens/Bible/GeneratedImages';
import NotificationSettings from '../screens/Settings/NotificationSettings';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const Drawer = createDrawerNavigator();

const CustomDrawerContent = (props) => {
  const { colors, theme, toggleTheme } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView {...props}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
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
        color={focused ? colors.secondary : colors.textLight}
      />
    );
  };

  const showGeneratedImagesTab = isImageGenEnabled || hasGeneratedImages;

  return (
    <Drawer.Navigator
      drawerType="slide"
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerActiveBackgroundColor: 'transparent',
        drawerInactiveBackgroundColor: 'transparent',
        drawerActiveTintColor: colors.secondary,
        drawerInactiveTintColor: colors.textLight,
        drawerHideStatusBarOnOpen: Platform.OS === 'ios' ? true : false,
        overlayColor: 'transparent',
        drawerStyle: {
          backgroundColor: colors.primary,
          width: '60%',
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
