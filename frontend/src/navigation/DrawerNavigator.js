import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {Platform} from 'react-native';
import HomeTabsNavigation from './TabNavigator';
import History from '../screens/History/History';

const Drawer = createDrawerNavigator();

const DrawerNavigator = () => {
  const drawerIcon = ({focused, size}, name) => {
    return (
      <Icon
        name={name}
        size={size}
        color={focused ? Colors.active : Colors.inactive}
      />
    );
  };
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
      <Drawer.Screen
        name="Wishlist"
        component={HomeTabsNavigation}
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
    </Drawer.Navigator>
  );
};

export default DrawerNavigator;

const Colors = {
  bg: '#146C94',
  active: '#AFD3E2',
  inactive: '#F6F1F1',
  transparent: 'transparent',
};