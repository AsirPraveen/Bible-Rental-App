import React, { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import OnboardingView from "./OnboardingView";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { API_BASE_URL } from '@/config/api';
import { apiClient } from '@/services';
import type { Membership } from '@/context/OrganizationContext';
/** Only the navigation methods this screen actually calls, rather than
 *  pulling in a full navigator param list it does not otherwise need. */
type OnboardingNavigation = {
  reset: (state: { index: number; routes: { name: string }[] }) => void;
  replace: (name: string, params?: object) => void;
};

export default function OnboardingComponent({ navigation }: { navigation: OnboardingNavigation }) {
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
        const res = await apiClient.post(`/api/auth/userdata`, { token });
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
              (m: Membership) => m.organization?._id === userData.activeOrganizationId || (m.organization as unknown) === userData.activeOrganizationId
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
