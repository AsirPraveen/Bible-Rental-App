import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { BookOpen, Users, Calendar, TrendingUp } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const Colors = {
  primary: '#146C94',
  secondary: '#AFD3E2',
  background: '#F6F1F1',
  white: '#FFFFFF',
  glow: '#00d2ff',
  success: '#4CAF50',
  warning: '#FF9800',
};

const PopularBookCard = ({ book, totalRented, index = 0 }:any) => {
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [slideAnim] = useState(new Animated.Value(50));
  const [glowAnim] = useState(new Animated.Value(0));
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const delay = index * 150;
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    // Continuous glow animation
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    glowAnimation.start();

    return () => glowAnimation.stop();
  }, [index]);

  const handlePress = () => {
    setPressed(true);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => setPressed(false));
  };

  const getRentCountColor = (count:any) => {
    if (count > 50) return Colors.success;
    if (count > 20) return Colors.warning;
    return Colors.primary;
  };

  // Fixed: Use index (rank position) instead of rent count for ranking
  const getRankIcon = (rankPosition: number) => {
    if (rankPosition === 0) return '🏆'; // 1st place
    if (rankPosition === 1) return '🥈'; // 2nd place
    if (rankPosition === 2) return '🥉'; // 3rd place
    return '📖'; // 4th place and beyond
  };

  // Calculate popularity percentage based on total books
  const getPopularityPercentage = () => {
    if (!totalRented || totalRented === 0) return 0;
    
    // Calculate percentage based on rent count relative to total books
    // This gives a more realistic popularity metric
    const rentCount = book.rent_count || 0;
    
    // You can adjust this formula based on your needs
    // Option 1: Simple percentage of total books
    const simplePercentage = Math.min((rentCount / totalRented) * 100, 100);
    
    // Option 2: More dynamic calculation (assuming max rentals could be higher)
    // const maxExpectedRentals = Math.max(totalRented * 0.5, 50); // 50% of total books or minimum 50
    // const dynamicPercentage = Math.min((rentCount / maxExpectedRentals) * 100, 100);
    
    return Math.round(simplePercentage);
  };

  const popularityPercentage = getPopularityPercentage();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { scale: scaleAnim },
            { translateX: slideAnim },
          ],
        },
      ]}
    >
      <Pressable onPress={handlePress} style={styles.pressable}>
        <LinearGradient
          colors={[Colors.white, Colors.background]}
          style={styles.gradient}
        >
          {/* Animated glow effect */}
          <Animated.View
            style={[
              styles.glowOverlay,
              {
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.1, 0.3],
                }),
              },
            ]}
          />

          <View style={styles.content}>
            {/* Header with rank */}
            <View style={styles.header}>
              <View style={styles.rankContainer}>
                <Text style={styles.rankIcon}>{getRankIcon(index)}</Text>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getRentCountColor(book.rent_count) }]}>
                <TrendingUp size={12} color={Colors.white} />
                <Text style={styles.statusText}>Trending</Text>
              </View>
            </View>

            {/* Book info */}
            <View style={styles.bookInfo}>
              <View style={styles.titleSection}>
                <BookOpen size={20} color={Colors.primary} />
                <Text style={styles.bookTitle} numberOfLines={2}>
                  {book.book_name || 'Unknown Title'}
                </Text>
              </View>
              
              <Text style={styles.author}>
                by {book.author_name || 'Unknown Author'}
              </Text>
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Users size={16} color={Colors.primary} />
                <Text style={styles.statValue}>{book.rent_count || 0}</Text>
                <Text style={styles.statLabel}>Rentals</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Calendar size={16} color={Colors.primary} />
                <Text style={styles.statValue}>{book.year_of_publication || 'N/A'}</Text>
                <Text style={styles.statLabel}>Year</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Text style={styles.pageIcon}>📄</Text>
                <Text style={styles.statValue}>{book.pages || 'N/A'}</Text>
                <Text style={styles.statLabel}>Pages</Text>
              </View>
            </View>

            {/* Progress bar - Fixed with proper calculation */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Popularity</Text>
                <Text style={styles.progressText}>{popularityPercentage}%</Text>
              </View>
              <View style={styles.progressBar}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: `${popularityPercentage}%`,
                      backgroundColor: getRentCountColor(book.rent_count),
                    },
                  ]}
                />
              </View>
              <Text style={styles.popularityDetail}>
                {book.rent_count || 0} rentals out of {totalRented || 0} total rentals
              </Text>
            </View>
          </View>

          {/* Decorative elements */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
    borderRadius: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  pressable: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    padding: 20,
    position: 'relative',
    minHeight: 180,
  },
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.glow,
    borderRadius: 20,
  },
  content: {
    flex: 1,
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  bookInfo: {
    marginBottom: 15,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 22,
  },
  author: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 28,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 10,
    backgroundColor: 'rgba(20, 108, 148, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 15,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(20, 108, 148, 0.2)',
    marginHorizontal: 10,
  },
  pageIcon: {
    fontSize: 16,
  },
  progressSection: {
    marginTop: 5,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(20, 108, 148, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  popularityDetail: {
    fontSize: 9,
    color: '#888',
    textAlign: 'center',
    marginTop: 2,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.secondary,
    opacity: 0.2,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -15,
    left: -15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    opacity: 0.1,
  },
});

export default PopularBookCard;