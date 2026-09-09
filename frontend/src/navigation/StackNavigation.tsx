// src/navigation/StackNavigation.tsx
import React from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import { useTheme } from '../context/ThemeContext';
import { OnboardingScreen as OnboardingComponent } from '@/screens/Onboarding';
import HomeTabsNavigation from "../navigation/TabNavigator";
import { LoginScreen as LoginPage } from '@/screens/Auth';
import { RegisterScreen as RegisterPage } from '@/screens/Auth';
import DrawerNavigator from "./DrawerNavigator";
import { BookDetailsScreen as BookDetails } from '@/screens/BookDetails';
import { AuthorBooksScreen as AuthorBooks } from '@/screens/AuthorBooks';
import { SongsScreen as SongComponent } from '@/screens/Songs';
import { SongDetailsScreen } from '@/screens/Songs';
import { BookPdfScreen as BookPdfComponent } from '@/screens/BookPdf';
import { BibleScreen as BibleComponent } from '@/screens/Bible';
import { MessageNotesScreen } from '@/screens/MessageNotes';
import { NoteDetailScreen } from '@/screens/MessageNotes';
import { NoteFormScreen } from '@/screens/MessageNotes';
import { AllBooksScreen as AllBooks } from '@/screens/AllBooks';
import AdminTabsNavigation from './AdminTabsNavigation';
import AdminDrawerNavigator from './AdminDrawerNavigator';
import { ChatScreen } from '@/screens/Chat';
import { FellowshipDetailsScreen } from '@/screens/Chat';
import { CreateFellowshipScreen } from '@/screens/Chat';
import { AddFellowshipMembersScreen } from '@/screens/Chat';
import { PendingRequestsTab } from '@/screens/Admin';
import { RequestHistoryTab } from '@/screens/Admin';
import { ForgotPasswordScreen as ForgotPassword } from '@/screens/Auth';
import { GoogleSetPasswordScreen as GoogleSetPassword } from '@/screens/Auth';
import { AllAuthorsScreen as AllAuthors } from '@/screens/AllAuthors';
import { CreatePostTab } from '@/screens/Admin';
import { CreateBookTab } from '@/screens/Admin';
import { ReadingPlannerScreen as ReadingPlannerComponent } from '@/screens/PlannerTracker';
import { ReadingTrackerScreen as ReadingTrackerComponent } from '@/screens/PlannerTracker';
import { PrayerRequestsScreen } from '@/screens/PrayerRequests';
import { FastingTrackerScreen } from '@/screens/FastingTracker';
import { HistoricalMapsScreen } from '@/screens/HistoricalMaps';
import { ForumListScreen } from '@/screens/DiscussionForum';
import { MapViewerScreen } from '@/screens/HistoricalMaps';
import { QuestionDetailsScreen } from '@/screens/DiscussionForum';
import { AppAnalyticsTab } from '@/screens/Admin';
import { ModerationTab } from '@/screens/Admin';
import { ManageMapsTab } from '@/screens/Admin';
import { GameHomeScreen as GameHome } from '@/screens/Game';
import { GameShopScreen as GameShop } from '@/screens/Game';
import { GameDeckScreen as GameDeck } from '@/screens/Game';
import { GameBattleScreen as GameBattle } from '@/screens/Game';
import { GameLevelSelectScreen as GameLevelSelect } from '@/screens/Game';
import { GameStudyAreaScreen as GameStudyArea } from '@/screens/Game';
import { GameFruitsTreeScreen as GameFruitsTree } from '@/screens/Game';
import { GameCraftingScreen as GameCrafting } from '@/screens/Game';
import { GameSurvivalScreen as GameSurvival } from '@/screens/Game';
import { GameScrollRoomScreen as GameScrollRoom } from '@/screens/Game';
import { GameCardLibraryScreen as GameCardLibrary } from '@/screens/Game';
import AppSettingsTab from '../screens/Admin/components/AppSettingsTab';
import { ManageSongsTab } from '@/screens/Admin';
import { GuestSettingsTab } from '@/screens/Admin';
import { OrgSelectionScreen } from '@/screens/OrgSelection';
import { OrgSettingsScreen } from '@/screens/OrgSettings';
import { MemberManagementScreen } from '@/screens/MemberManagement';
import SuperAdminDrawerNavigator from './SuperAdminDrawerNavigator';
import { SuperAdminDashboardScreen as SuperAdminDashboard } from '@/screens/SuperAdminDashboard';
import { SuperAdminOrgDetailScreen as SuperAdminOrgDetail } from '@/screens/SuperAdminDashboard';
import { SuperAdminSongsTab } from '@/screens/SuperAdminDashboard';
import { SongPdfGeneratorScreen as SongPdfGenerator } from '@/screens/Songs';
import { GeneratedPdfsScreen } from '@/screens/Songs';
import { SongSelectionScreen } from '@/screens/Songs';
import { BiblicalArtifactsScreen } from '@/screens/BiblicalArtifacts';
import { ArtifactViewerScreen } from '@/screens/BiblicalArtifacts';

const Stack = createStackNavigator();

const StackNavigation = () => {
  const { colors } = useTheme();
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
        name="MainApp"
        component={DrawerNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OrgSelection"
        component={OrgSelectionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OrgSettings"
        component={OrgSettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MemberManagement"
        component={MemberManagementScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SuperAdmin"
        component={SuperAdminDrawerNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SuperAdminOrgDetail"
        component={SuperAdminOrgDetail}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SuperAdminSongs"
        component={SuperAdminSongsTab}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SongSelectionScreen"
        component={SongSelectionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SongPdfGenerator"
        component={SongPdfGenerator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GeneratedPdfs"
        component={GeneratedPdfsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminScreen"
        component={AdminDrawerNavigator}
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
        name="SongDetails"
        component={SongDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BookPdf"
        component={BookPdfComponent}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MessageNotes"
        component={MessageNotesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NoteDetail"
        component={NoteDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NoteForm"
        component={NoteFormScreen}
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
        name="GoogleSetPassword"
        component={GoogleSetPassword}
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
        name="BiblicalArtifacts"
        component={BiblicalArtifactsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ArtifactViewer"
        component={ArtifactViewerScreen}
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
      <Stack.Screen
        name="GameHome"
        component={GameHome}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GameShop"
        component={GameShop}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GameDeck"
        component={GameDeck}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GameBattle"
        component={GameBattle}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GameLevelSelect"
        component={GameLevelSelect}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GameStudyArea"
        component={GameStudyArea}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GameFruitsTree"
        component={GameFruitsTree}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GameCrafting"
        component={GameCrafting}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GameSurvival"
        component={GameSurvival}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GameScrollRoom"
        component={GameScrollRoom}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GameCardLibrary"
        component={GameCardLibrary}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Manage Songs"
        component={ManageSongsTab}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AppSettings"
        component={AppSettingsTab}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Guest Settings"
        component={GuestSettingsTab}
        options={{
          headerShown: true,
          title: 'Guest Access Settings',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.textLight
        }}
      />
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FellowshipDetails"
        component={FellowshipDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateFellowship"
        component={CreateFellowshipScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddFellowshipMembers"
        component={AddFellowshipMembersScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default StackNavigation;
