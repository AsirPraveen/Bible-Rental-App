import React, { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import OnboardingView from "./InitialScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

export default function OnboardingComponent({ navigation }) {
  const [isCheckingLogin, setIsCheckingLogin] = useState(false);

  const handleGetStarted = async () => {
    try {
      // Mark that user has seen onboarding
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      
      const token = await AsyncStorage.getItem('token');
      const isGuest = await AsyncStorage.getItem('isGuest');

      if (isGuest === 'true') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp' }],
        });
        return;
      }

      if (token) {
        setIsCheckingLogin(true);
        // Call backend to get fresh user data and routing info
        const res = await axios.post(`${API_URL}/api/auth/userdata`, { token });
        if (res.data.status === 'Ok' && res.data.data) {
          const userData = res.data.data;
          
          if (userData.globalRole === 'SuperAdmin') {
            navigation.reset({
              index: 0,
              routes: [{ name: 'SuperAdmin' }],
            });
          } else if (userData.activeOrganizationId) {
            // Find active membership
            const activeMembership = userData.memberships?.find(
              m => m.organization?._id === userData.activeOrganizationId || m.organization === userData.activeOrganizationId
            );
            
            if (activeMembership && activeMembership.role === 'Admin') {
              navigation.reset({
                index: 0,
                routes: [{ name: 'AdminScreen' }],
              });
            } else {
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainApp' }],
              });
            }
          } else {
            navigation.reset({
              index: 0,
              routes: [{ name: 'OrgSelection' }],
            });
          }
          return;
        }
      }
      
      // Fallback: go to login
      navigation.replace("Login");
    } catch (error) {
      console.error('Error in handleGetStarted:', error);
      navigation.replace("Login");
    } finally {
      setIsCheckingLogin(false);
    }
  };

  return <OnboardingView onGetStarted={handleGetStarted} loading={isCheckingLogin} />;
}
