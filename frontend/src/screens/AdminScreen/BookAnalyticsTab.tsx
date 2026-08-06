import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import axios from 'axios';
import AnalyticsCard from './components/AnalyticsCard';
import PopularBookCard from './components/PopularBookCard';
import BarChartComponent from './components/BarChartComponent';
import PieChartComponent from './components/PieChartComponent';
import LineChartComponent from './components/LineChartComponent';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import LoadingScreen from '../../components/LoadingScreen';

type RootStackParamList = {
  Onboarding: undefined;
};

const { width, height } = Dimensions.get('window');

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? '';
import { useTheme } from '../../context/ThemeContext';

const BookAnalyticsTab = () => {
  const { colors, theme } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [analytics, setAnalytics] = useState<{ totalBooks: number; totalRented: number; popularBooks: any[] }>({ totalBooks: 0, totalRented: 0, popularBooks: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [currentChartIndex, setCurrentChartIndex] = useState(0);
  const chartCarouselRef = useRef<FlatList>(null);

  const [userData, setUserData] = useState<any>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          Alert.alert('Error', 'No Admin token found. Please log in again.');
          return;
        }

        const response = await axios.post(`${BASE_URL}/api/auth/userdata`, { token });
        if (response.data.status === 'Ok') {
          const data = response.data.data;
          setUserData(data);
          setName(data.name || '');
          setImage(data.image || null);
        } else {
          Alert.alert('Error', 'Failed to fetch admin data.');
        }
      } catch (error) {
        console.error('Error fetching admin data:', error);
        Alert.alert('Error', 'An error occurred while fetching admin data.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Chart data configuration
  const chartData = [
    {
      id: 'line',
      title: 'Rental Trends',
      icon: '📈',
      component: LineChartComponent,
    },
    {
      id: 'bar',
      title: 'Book Popularity',
      icon: '📊',
      component: BarChartComponent,
    },
    {
      id: 'pie',
      title: 'Distribution Analysis',
      icon: '🥧',
      component: PieChartComponent,
    },
  ];

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/book-analytics`);
      const data = res.data.data || { totalBooks: 0, totalRented: 0, popularBooks: [] };
      setAnalytics({
        totalBooks: data.totalBooks || 0,
        totalRented: data.totalRented || 0,
        popularBooks: Array.isArray(data.popularBooks) ? data.popularBooks : [],
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalytics({ totalBooks: 0, totalRented: 0, popularBooks: [] });
    } finally {
      setIsLoading(false);
      // Animate content in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchAnalytics, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['token', 'isLoggedIn', 'userType']);
              navigation.reset({
                index: 0,
                routes: [{ name: 'Onboarding' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'An error occurred during logout.');
            }
          },
        },
      ]
    );
  };

  const renderChartItem = ({ item, index }: any) => {
    const ChartComponent = item.component;
    return (
      <View style={[styles.chartContainer, { width: width - 40, marginHorizontal: 5 }]}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartIcon}>{item.icon}</Text>
          <Text style={styles.chartTitle}>{item.title}</Text>
        </View>
        <ChartComponent data={analytics.popularBooks} />
      </View>
    );
  };

  const onChartScroll = (event: any) => {
    const slideSize = width - 30;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    if (index !== currentChartIndex && index >= 0 && index < chartData.length) {
      setCurrentChartIndex(index);
    }
  };

  const scrollToChart = (index: any) => {
    if (chartCarouselRef.current) {
      chartCarouselRef.current.scrollToIndex({ index, animated: true });
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Initializing Dashboard..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        <StatusBar barStyle="light-content" backgroundColor={colors.linearGradient[0]} />

        {/* Header with gradient */}
        <LinearGradient
          colors={colors.linearGradient}
          style={styles.header}
        >
          <BlurView intensity={20} style={styles.headerBlur}>
            <View style={styles.headerContent}>
              <View style={styles.spacer} />
              <View style={styles.titleContainer}>
                <Text style={styles.headerTitle}>Admin Dashboard</Text>
                <Text style={styles.headerSubtitle}>YOUTH ROOM</Text>
              </View>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={24} color="#F6F1F1" />
              </TouchableOpacity>
            </View>
          </BlurView>
        </LinearGradient>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Analytics Cards */}
            <View style={styles.section}>
              <Text style={styles.greeting}>Welcome {name} !!!</Text>
              <Text style={styles.sectionTitle}>
                <Text style={styles.titleIcon}>📊 </Text>
                Analytics Overview
              </Text>
              <View style={styles.analyticsContainer}>
                <AnalyticsCard title="Total Books" value={analytics.totalBooks} />
                <AnalyticsCard title="Total Rented" value={analytics.totalRented} />
              </View>
            </View>

            {/* Charts Carousel Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Text style={styles.titleIcon}>📈 </Text>
                Data Visualization
              </Text>

              {/* Chart Carousel */}
              <FlatList
                ref={chartCarouselRef}
                data={chartData}
                renderItem={renderChartItem}
                horizontal
                pagingEnabled={false}
                showsHorizontalScrollIndicator={false}
                onScroll={onChartScroll}
                scrollEventThrottle={16}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.chartCarouselContainer}
                snapToInterval={width - 30}
                decelerationRate="fast"
                snapToAlignment="center"
                disableIntervalMomentum={true}
                getItemLayout={(data, index) => ({
                  length: width - 30,
                  offset: (width - 30) * index,
                  index,
                })}
              />

              {/* Chart Indicators */}
              <View style={styles.indicatorContainer}>
                {chartData.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => scrollToChart(index)}
                    style={[
                      styles.indicator,
                      {
                        backgroundColor: currentChartIndex === index
                          ? colors.textLight
                          : 'rgba(255,255,255,0.3)'
                      }
                    ]}
                  />
                ))}
              </View>

              {/* Chart Navigation */}
              {/* <View style={styles.chartNavigation}>
              {chartData.map((chart, index) => (
                <TouchableOpacity
                  key={chart.id}
                  onPress={() => scrollToChart(index)}
                  style={[
                    styles.navButton,
                    {
                      backgroundColor: currentChartIndex === index 
                        ? Colors.white 
                        : 'rgba(255,255,255,0.2)'
                    }
                  ]}
                >
                  <Text style={[
                    styles.navButtonIcon,
                    { opacity: currentChartIndex === index ? 1 : 0.6 }
                  ]}>
                    {chart.icon}
                  </Text>
                  <Text style={[
                    styles.navButtonText,
                    { 
                      color: currentChartIndex === index ? Colors.primary : Colors.white,
                      opacity: currentChartIndex === index ? 1 : 0.8
                    }
                  ]}>
                    {chart.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View> */}
            </View>

            {/* Popular Books */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Text style={styles.titleIcon}>🔥 </Text>
                Trending Books
              </Text>
              {analytics.popularBooks?.length > 0 ? (
                analytics.popularBooks.map((book, index) => (
                  <Animated.View
                    key={book.book_id}
                    style={[
                      styles.bookItem,
                      {
                        opacity: fadeAnim,
                        transform: [
                          {
                            translateX: slideAnim.interpolate({
                              inputRange: [0, 50],
                              outputRange: [0, index % 2 === 0 ? -50 : 50],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    {/* 👇 Pass index */}
                    <PopularBookCard book={book} totalRented={analytics.totalRented} index={index} />
                  </Animated.View>
                ))
              ) : (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>No trending books available</Text>
                  <Text style={styles.noDataSubtext}>Add some books to see trends</Text>
                </View>
              )}
            </View>
          </ScrollView>

        </Animated.View>

        {/* Floating background elements */}
        <View style={styles.floatingElements}>
          <View style={[styles.floatingCircle, styles.circle1]} />
          <View style={[styles.floatingCircle, styles.circle2]} />
          <View style={[styles.floatingCircle, styles.circle3]} />
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.linearGradient[0],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 18,
    color: colors.textLight,
    fontWeight: '600',
  },
  cardBorder: {
    borderRadius: 16,
    padding: 2,
  },
  loadingBar: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginTop: 20,
    overflow: 'hidden',
  },
  loadingProgress: {
    width: '70%',
    height: '100%',
    backgroundColor: colors.textLight,
    borderRadius: 2,
  },
  header: {
    height: 120,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    // borderBottomLeftRadius: 25,
    // borderBottomRightRadius: 25,
  },
  headerBlur: {
    flex: 1,
    position: 'relative',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    width: 40,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textLight,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 5,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'left',
    marginTop: 5,
  },
  headerGlow: {
    position: 'absolute',
    bottom: -20,
    width: 100,
    height: 4,
    backgroundColor: '#00d2ff',
    borderRadius: 2,
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  content: {
    flex: 1,
    marginTop: -15,
  },
  scrollView: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  section: {
    margin: 15,
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textLight,
    marginBottom: 15,
    textAlign: 'left',
    marginTop: 10,
  },
  titleIcon: {
    fontSize: 20,
  },
  analyticsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartCarouselContainer: {
    paddingHorizontal: 0,
  },
  chartContainer: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 20,
    shadowColor: colors.border,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  chartIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  chartNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderRadius: 12,
    minHeight: 60,
    justifyContent: 'center',
  },
  navButtonIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  navButtonText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  bookItem: {
    marginBottom: 10,
  },
  noDataContainer: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: colors.border,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  noDataText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 5,
  },
  floatingElements: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: -1,
  },
  floatingCircle: {
    position: 'absolute',
    borderRadius: 50,
    opacity: 0.1,
  },
  circle1: {
    width: 100,
    height: 100,
    backgroundColor: colors.primary,
    top: 100,
    right: -50,
  },
  circle2: {
    width: 150,
    height: 150,
    backgroundColor: colors.secondary,
    bottom: 200,
    left: -75,
  },
  circle3: {
    width: 80,
    height: 80,
    backgroundColor: '#00d2ff',
    top: 300,
    left: 50,
  },
});

export default BookAnalyticsTab;