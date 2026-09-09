import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import StackNavigation from "../navigation/StackNavigation";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

import { registerForPushNotificationsAsync } from '../utils/notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // SDK 54 split shouldShowAlert into banner and list.
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

import { AuthProvider } from '../context/AuthContext';
import { OrganizationProvider } from '../context/OrganizationContext';
import { SocketProvider } from '../context/SocketContext';
import { ThemeProvider } from '../context/ThemeContext';
import { CustomAlert, initializeGlobalAlerts } from '../components/CustomAlert';

// Initialize the global alert interceptor
initializeGlobalAlerts();

// Defined in its own module to avoid a require cycle with AuthContext.
// Re-exported here so existing `from '../app/index'` imports keep working.
export { navigationRef } from '../navigation/navigationRef';
import { navigationRef } from '../navigation/navigationRef';
/**
 * Boot default for the status bar.
 *
 * Each screen sets both system bars for itself on focus via useSystemBars,
 * deriving the icon colour from the colour it actually paints. This only covers
 * the moment before the first screen gains focus.
 *
 * This replaces a hand-maintained list of route names. That could not work:
 * under edge-to-edge the bars are transparent and show the screen's own pixels,
 * so the colour behind them is a per-screen fact and any screen missing from the
 * list silently inherited the wrong icons.
 */
function BootStatusBar() {
  return <StatusBar style="light" translucent backgroundColor="transparent" />;
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
                  <BootStatusBar />
                  <NavigationContainer
                    ref={navigationRef}
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