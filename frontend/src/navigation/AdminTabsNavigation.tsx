import React, { useEffect, useReducer, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Animated, { useAnimatedStyle, withTiming, useDerivedValue } from 'react-native-reanimated';
import Lottie from 'lottie-react-native';
import BookAnalyticsTab from '../screens/AdminScreen/BookAnalyticsTab';
import PendingRequestsTab from '../screens/AdminScreen/PendingRequestsTab';
import RequestHistoryTab from '../screens/AdminScreen/RequestHistoryTab';
import AboutAdminTab from '../screens/AdminScreen/AboutAdminTab';
import PendingScreen from '../screens/AdminScreen/PendingScreen';
import Post from '../screens/AdminScreen/Post';

const Tab = createBottomTabNavigator();
const AnimatedSvg = Animated.createAnimatedComponent(Svg);

const AdminTabsNavigation = () => {
  return (
    <Tab.Navigator tabBar={(props) => <AnimatedTabBar {...props} />}>
      <Tab.Screen
        name="Book Analytics"
        component={BookAnalyticsTab}
        options={{
          tabBarIcon: ({ ref }:any) => (
            <Lottie
              ref={ref}
              loop={false}
              source={require('../assets/lottie_icon/book-analytics.icon.json')} // Replace with your Lottie file
              style={styles.icon}
            />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Pending Screen"
        component={PendingScreen}
        options={{
          tabBarIcon: ({ ref }:any) => (
            <Lottie
              ref={ref}
              loop={false}
              source={require('../assets/lottie_icon/pending-requests.icon.json')} // Replace with your Lottie file
              style={styles.icon}
            />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Posts"
        component={Post}
        options={{
          tabBarIcon: ({ ref }:any) => (
            <Lottie
              ref={ref}
              loop={false}
              source={require('../assets/lottie_icon/history.icon.json')} // Replace with your Lottie file
              style={styles.icon}
            />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="About Admin"
        component={AboutAdminTab}
        options={{
          tabBarIcon: ({ ref }:any) => (
            <Lottie
              ref={ref}
              loop={false}
              source={require('../assets/lottie_icon/user.icon.json')} // Replace with your Lottie file
              style={styles.icon}
            />
          ),
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
};

const AnimatedTabBar = ({ state: { index: activeIndex, routes }, navigation, descriptors }: BottomTabBarProps) => {
  const { bottom } = useSafeAreaInsets();
  const reducer = (state, action) => [...state, { x: action.x, index: action.index }];
  const [layout, dispatch] = useReducer(reducer, []);

  const handleLayout = (event, index) => {
    dispatch({ x: event.nativeEvent.layout.x, index });
  };

  const xOffset = useDerivedValue(() => {
    if (layout.length !== routes.length) return 0;
    return [...layout].find(({ index }) => index === activeIndex)?.x - 25;
  }, [activeIndex, layout]);

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(xOffset.value, { duration: 250 }) }],
  }));

  return (
    <View style={[styles.tabBar, { paddingBottom: bottom }]}>
      <AnimatedSvg width={110} height={60} viewBox="0 0 110 60" style={[styles.activeBackground, animatedStyles]}>
        <Path fill="#19A7CE" d="M20 0H0c11.046 0 20 8.953 20 20v5c0 19.33 15.67 35 35 35s35-15.67 35-35v-5c0-11.045 8.954-20 20-20H20z" />
      </AnimatedSvg>
      <View style={styles.tabBarContainer}>
        {routes.map((route, index) => {
          const active = index === activeIndex;
          const { options } = descriptors[route.key];
          return (
            <TabBarComponent
              key={route.key}
              active={active}
              options={options}
              onLayout={(e:any) => handleLayout(e, index)}
              onPress={() => navigation.navigate(route.name)}
            />
          );
        })}
      </View>
    </View>
  );
};

const TabBarComponent = ({ active, options, onLayout, onPress }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (active && ref?.current) {
      ref.current.play();
    }
  }, [active]);

  const animatedComponentCircleStyles = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(active ? 1 : 0, { duration: 250 }) }],
  }));

  const animatedIconContainerStyles = useAnimatedStyle(() => ({
    opacity: withTiming(active ? 1 : 0.5, { duration: 250 }),
  }));

  return (
    <Pressable onPress={onPress} onLayout={onLayout} style={styles.component}>
      <Animated.View style={[styles.componentCircle, animatedComponentCircleStyles]} />
      <Animated.View style={[styles.iconContainer, animatedIconContainerStyles]}>
        {options.tabBarIcon ? options.tabBarIcon({ ref }) : <Text>?</Text>}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  tabBar: { backgroundColor: 'white' },
  activeBackground: { position: 'absolute' },
  tabBarContainer: { flexDirection: 'row', justifyContent: 'space-evenly' },
  component: { height: 60, width: 60, marginTop: -5 },
  componentCircle: { flex: 1, borderRadius: 30, backgroundColor: 'white' },
  iconContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  icon: { height: 56, width: 56 },
});

export default AdminTabsNavigation;