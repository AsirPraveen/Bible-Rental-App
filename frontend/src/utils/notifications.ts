import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    // Get the token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.expoConfig?.updates?.url?.split('project/')[1]?.split('/')[0];
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    // console.log('Expo Push Token:', token);
  } else {
    // console.log('Must use physical device for Push Notifications');
  }

  if (token) {
    await AsyncStorage.setItem('expoPushToken', token);
    await syncPushTokenWithBackend(token);
  }

  return token;
}

export async function syncPushTokenWithBackend(token: string) {
  try {
    const userToken = await AsyncStorage.getItem('token');
    if (userToken && token) {
      await axios.post(`${API_URL}/api/auth/update-push-token`, {
        token: userToken,
        expoPushToken: token,
      });
      // console.log('Push token synced with backend');
    }
  } catch (error) {
    // console.error('Error syncing push token:', error);
  }
}
