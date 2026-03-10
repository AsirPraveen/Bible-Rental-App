// src/navigation/StackNavigation.tsx
import React from 'react';
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
import AdminTabsNavigation from './AdminTabsNavigation';
import PendingRequestsTab from '../screens/AdminScreen/PendingRequestsTab';
import RequestHistoryTab from '../screens/AdminScreen/RequestHistoryTab';
import ForgotPassword from '../screens/Login&Register/ForgotPassword';
import AllAuthors from '../screens/AllAuthors/AllAuthors';
import CreatePostTab from '../screens/AdminScreen/CreatePostTab';
import CreateBookTab from '../screens/AdminScreen/CreateBookTab';
import ReadingPlannerComponent from '../screens/PlannerTracker/ReadingPlannerComponent';
import ReadingTrackerComponent from '../screens/PlannerTracker/ReadingTrackerComponent';
import PrayerRequestsScreen from '../screens/PrayerRequests/PrayerRequestsScreen';
import FastingTrackerScreen from '../screens/FastingTracker/FastingTrackerScreen';
import HistoricalMapsScreen from '../screens/HistoricalMaps/HistoricalMapsScreen';
import ForumListScreen from '../screens/DiscussionForum/ForumListScreen';
import MapViewerScreen from '../screens/HistoricalMaps/MapViewerScreen';
import QuestionDetailsScreen from '../screens/DiscussionForum/QuestionDetailsScreen';
import AppAnalyticsTab from '../screens/AdminScreen/AppAnalyticsTab';
import ModerationTab from '../screens/AdminScreen/ModerationTab';
import ManageMapsTab from '../screens/AdminScreen/ManageMapsTab';

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
        component={AdminTabsNavigation}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AllBooks"
        component={AllBooks}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AllAuthors"
        component={AllAuthors}
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
        name="ReadingPlanner"
        component={ReadingPlannerComponent}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ReadingTracker"
        component={ReadingTrackerComponent}
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
      <Stack.Screen
        name="Create Post"
        component={CreatePostTab}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Add Book"
        component={CreateBookTab}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Forgot Password"
        component={ForgotPassword}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PrayerRequests"
        component={PrayerRequestsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FastingTracker"
        component={FastingTrackerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HistoricalMaps"
        component={HistoricalMapsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MapViewer"
        component={MapViewerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DiscussionForum"
        component={ForumListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="QuestionDetails"
        component={QuestionDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="App Analytics"
        component={AppAnalyticsTab}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Moderation"
        component={ModerationTab}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Manage Maps"
        component={ManageMapsTab}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default StackNavigation;
