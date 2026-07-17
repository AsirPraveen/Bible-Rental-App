import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import StackNavigation from "../navigation/StackNavigation";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

import { registerForPushNotificationsAsync } from '../utils/notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

import { AuthProvider } from '../context/AuthContext';
import { OrganizationProvider } from '../context/OrganizationContext';
import { SocketProvider } from '../context/SocketContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { CustomAlert, initializeGlobalAlerts } from '../components/CustomAlert';

// Initialize the global alert interceptor
initializeGlobalAlerts();

export const navigationRef = createNavigationContainerRef<any>();
const routeListeners = new Set<() => void>();

const notifyRouteListeners = () => {
  routeListeners.forEach(listener => listener());
};

const ALWAYS_LIGHT_SCREENS = [
  'Onboarding',
  'Login',
  'Register',
  'Forgot Password',
  'GoogleSetPassword',
  'Home',
  'Dashboard',
  'GameHome',
  'GameCardLibrary',
  'GameDeck',
  'GameLevelSelect',
  'GameShop',
  'GameStudyArea',
  'GameSurvival',
  'GameScrollRoom',
  'GameCrafting',
  'GameFruitsTree',
  'GameBattle',
];

const BLUE_STATUS_BAR_SCREENS = [
  'Home',
  'Dashboard',
  'Wishlist',
  'History',
  'Notifications',
  'Settings',
  'Stuff',
  'UserProfile',
  'Bible',
  'Songs',
  'HistoricalMaps',
  'ReadingPlanner',
  'ReadingTracker',
  'DiscussionForum',
  'FastingTracker',
  'PrayerRequests',
  'AppSettings',
  'Guest Settings',
  'QuestionDetails',
  'SongDetails',
  'OrgSelection',
  'OrgSettings',
  'MemberManagement',
  'SuperAdmin',
  'Generated PDFs',
  'SongSelectionScreen',
  'SongPdfGenerator',
];

function ThemedStatusBar() {
  const { theme, colors } = useTheme();
  const [currentRoute, setCurrentRoute] = React.useState<string>('Onboarding');

  React.useEffect(() => {
    const updateRoute = () => {
      const route = navigationRef.getCurrentRoute();
      if (route) {
        setCurrentRoute(route.name);
      }
    };

    routeListeners.add(updateRoute);
    if (navigationRef.isReady()) {
      updateRoute();
    }

    return () => {
      routeListeners.delete(updateRoute);
    };
  }, []);

  const isDarkTheme = theme === 'dark';
  const isAlwaysLight = ALWAYS_LIGHT_SCREENS.includes(currentRoute);
  const isBlueStatusBar = BLUE_STATUS_BAR_SCREENS.includes(currentRoute);

  let barStyle: 'light' | 'dark' = 'dark';
  let backgroundColor = 'transparent';

  if (isDarkTheme) {
    barStyle = 'light';
    backgroundColor = 'transparent';
  } else {
    // Light Mode
    if (isAlwaysLight || isBlueStatusBar) {
      barStyle = 'light';
      backgroundColor = isBlueStatusBar ? colors.primary : 'transparent';
    } else {
      barStyle = 'dark';
      backgroundColor = 'transparent';
    }
  }

  return (
    <StatusBar
      style={barStyle}
      translucent={true}
      backgroundColor={backgroundColor}
    />
  );
}

import { Provider as PaperProvider } from 'react-native-paper';

export default function App() {
  React.useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider>
        <AuthProvider>
          <SocketProvider>
            <OrganizationProvider>
              <ThemeProvider>
                <SafeAreaProvider style={{ flex: 1 }}>
                  <ThemedStatusBar />
                  <NavigationContainer
                    ref={navigationRef}
                    onReady={notifyRouteListeners}
                    onStateChange={notifyRouteListeners}
                  >
                    <StackNavigation />
                  </NavigationContainer>
                  <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                    <CustomAlert />
                  </View>
                </SafeAreaProvider>
              </ThemeProvider>
            </OrganizationProvider>
          </SocketProvider>
        </AuthProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

// import StackNavigation from "../navigation/StackNavigation";
// import { GestureHandlerRootView } from 'react-native-gesture-handler';
// export default function App() {
//   return (
//     <GestureHandlerRootView style={{ flex: 1 }}>
//       <StackNavigation/>
//     </GestureHandlerRootView>
//   );
// }