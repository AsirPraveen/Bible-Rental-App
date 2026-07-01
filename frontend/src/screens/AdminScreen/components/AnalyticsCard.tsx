import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const Colors = {
  primary: '#146C94',
  secondary: '#AFD3E2',
  background: '#F6F1F1',
  white: '#FFFFFF',
  glow: '#00d2ff',
};

interface AnalyticsCardProps {
  title: string;
  value: number;
  delay?: number;
}

const AnalyticsCard = ({ title, value, delay = 0 }: AnalyticsCardProps) => {
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
        colors={[Colors.white, Colors.background]}
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

const styles = StyleSheet.create({
  container: {
    width: (width - 45) / 2,
    height: 140,
    borderRadius: 20,
    shadowColor: Colors.primary,
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
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
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
    backgroundColor: Colors.secondary,
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
    color: Colors.primary,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
  progressBar: {
    width: '80%',
    height: 3,
    backgroundColor: '#E0E0E0',
    borderRadius: 1.5,
    marginTop: 8,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 1.5,
  },
  cornerDecoration: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    opacity: 0.3,
  },
});

export default AnalyticsCard;