import React from 'react';
import "@expo/metro-runtime";
import { createStackNavigator } from "@react-navigation/stack";
import OnboardingComponent from "../screens/InitialScreen/index";
import HomeTabsNavigation from "../navigation/TabNavigator";
import LoginPage from "../screens/Login&Register/Login";
import RegisterPage from "../screens/Login&Register/Register";
import DrawerNavigator from "./DrawerNavigator";
import BookDetails from '../screens/BookDetails/BookDetails';
import AuthorBooks from '../screens/AuthorBooks/AuthorBooks';
import Bible from '../screens/Bible/Bible';
import SongComponent from '../screens/Songs/Songs';
import BookPdfComponent from '../screens/BookPdf/BookPdf';
import BibleComponent from '../screens/Bible/Bible';
import MessageNotesComponent from '../screens/MessageNotes/MessageNotes';
import AllBooks from '../screens/AllBooks/AllBooks';
import AdminTabsNavigation from './AdminTabsNavigation'; // Import the new AdminTabsNavigation
import PendingRequestsTab from '../screens/AdminScreen/PendingRequestsTab';
import RequestHistoryTab from '../screens/AdminScreen/RequestHistoryTab';

const Stack = createStackNavigator();

const StackNavigation = () => {
  return (
    <Stack.Navigator initialRouteName="Onboarding">
      <Stack.Screen
        name="Onboarding"
        component={OnboardingComponent}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginPage}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterPage}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Home"
        component={DrawerNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminScreen"
        component={AdminTabsNavigation} // Replace AdminScreen with AdminTabsNavigation
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AllBooks"
        component={AllBooks}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BookDetails"
        component={BookDetails}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AuthorBooks"
        component={AuthorBooks}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Bible"
        component={BibleComponent}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Songs"
        component={SongComponent}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BookPdf"
        component={BookPdfComponent}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MessageNotes"
        component={MessageNotesComponent}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Pending Requests"
        component={PendingRequestsTab}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Request History"
        component={RequestHistoryTab}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default StackNavigation;