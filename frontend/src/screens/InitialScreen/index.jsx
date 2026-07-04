import React, { useState, useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import OnboardingView from "./InitialScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function OnboardingComponent({ navigation }) {
  const [isCheckingLogin, setIsCheckingLogin] = useState(false);

  const handleGetStarted = async () => {
    try {
      // Mark that user has seen onboarding
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      const userType = await AsyncStorage.getItem('userType');
      const token = await AsyncStorage.getItem('token');
      const activeOrgId = await AsyncStorage.getItem('activeOrgId');

      // Double-check login status when "Get Started" is pressed
      if (isLoggedIn === 'true' && token) {
        if (activeOrgId) {
          if (userType === 'Admin') {
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
      } else {
        // User is not logged in, go to login screen
        navigation.replace("Login");
      }
    } catch (error) {
      console.error('Error in handleGetStarted:', error);
      // On error, navigate to login
      navigation.replace("Login");
    }
  };

  return <OnboardingView onGetStarted={handleGetStarted} />;
}
