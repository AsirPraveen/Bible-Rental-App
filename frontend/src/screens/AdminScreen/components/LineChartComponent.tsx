import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';

const screenWidth = Dimensions.get('window').width;

const Colors = {
  primary: '#146C94',
  secondary: '#AFD3E2',
  background: '#F6F1F1',
  white: '#FFFFFF',
  glow: '#00d2ff',
  accent: '#667eea',
};

const LineChartComponent = ({ data }) => {
  const [animatedValue] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const chartData = {
    labels: data.map((book) => book.book_name.slice(0, 6) + '...'),
    datasets: [
      {
        data: data.map((book) => book.rent_count || 0),
        color: (opacity = 1) => Colors.primary,
        strokeWidth: 3,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: Colors.white,
    backgroundGradientFrom: Colors.white,
    backgroundGradientTo: Colors.background,
    backgroundGradientFromOpacity: 1,
    backgroundGradientToOpacity: 0.8,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(20, 108, 148, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: '3,3',
      stroke: 'rgba(20, 108, 148, 0.1)',
      strokeWidth: 1,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '3',
      stroke: Colors.secondary,
      fill: Colors.primary,
    },
    propsForLabels: {
      fontSize: 12,
      fontWeight: '600',
    },
  };

  return (
    <Animated.View 
      style={[
        styles.chartContainer,
        {
          opacity: animatedValue,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.chartGlow} />
      <LineChart
        data={chartData}
        width={screenWidth - 80}
        height={220}
        yAxisLabel=""
        chartConfig={chartConfig}
        style={styles.chart}
        bezier
        fromZero={true}
        withShadow={false}
        withDots={true}
        withInnerLines={true}
        withOuterLines={false}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    position: 'relative',
    alignItems: 'center',
    marginVertical: 10,
  },
  chart: {
    borderRadius: 16,
  },
  chartGlow: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: 20,
    backgroundColor: 'transparent',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
});

export default LineChartComponent;