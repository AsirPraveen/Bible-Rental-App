import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../context/ThemeContext';

const { width } = Dimensions.get('window');

interface AnalyticsCardProps {
  title: string;
  value: number;
  delay?: number;
}

const AnalyticsCard = ({ title, value, delay = 0 }: AnalyticsCardProps) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Initial animation
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    // Continuous pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { scale: pulseAnim },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={[colors.cardBg, colors.background]}
        style={styles.gradient}
      >
        <View style={styles.glowEffect} />
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{title.includes('Total') ? '📚' : '📊'}</Text>
          </View>
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.label}>{title}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progress, { width: `${Math.min(value * 10, 100)}%` }]} />
          </View>
        </View>
        <View style={styles.cornerDecoration} />
      </LinearGradient>
    </Animated.View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    width: (width - 45) / 2,
    height: 140,
    borderRadius: 20,
    shadowColor: colors.border,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.tint,
    shadowColor: colors.tint,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  content: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: colors.theme === 'dark' ? colors.inputBg : '#AFD3E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 18,
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.tint,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  progressBar: {
    width: '80%',
    height: 3,
    backgroundColor: colors.theme === 'dark' ? colors.border : '#E0E0E0',
    borderRadius: 1.5,
    marginTop: 8,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: colors.tint,
    borderRadius: 1.5,
  },
  cornerDecoration: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.theme === 'dark' ? colors.border : '#AFD3E2',
    opacity: 0.3,
  },
});

export default AnalyticsCard;