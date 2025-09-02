import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import StackNavigation from "../navigation/StackNavigation";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {  Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <StatusBar 
        style="dark"
        translucent={true}
        backgroundColor="transparent"
      />
      <NavigationContainer>
        <StackNavigation/>
      </NavigationContainer>
    </SafeAreaProvider>
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