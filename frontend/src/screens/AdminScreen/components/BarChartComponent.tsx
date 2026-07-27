import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { useTheme } from '../../../context/ThemeContext';

const screenWidth = Dimensions.get('window').width;

interface BarChartComponentProps {
  data: Array<{ book_name: string; rent_count?: number }>;
}

// Enhanced Bar Chart Component
const BarChartComponent = ({ data }: BarChartComponentProps) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [animatedValue] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();
  }, []);

  const chartData = {
    labels: data.map((book) => book.book_name.slice(0, 6) + '...'),
    datasets: [
      {
        data: data.map((book) => book.rent_count || 0),
      },
    ],
  };

  const chartConfig = {
    backgroundColor: colors.cardBg,
    backgroundGradientFrom: colors.cardBg,
    backgroundGradientTo: colors.background,
    backgroundGradientFromOpacity: 1,
    backgroundGradientToOpacity: 0.8,
    decimalPlaces: 0,
    color: (opacity = 1) => colors.theme === 'dark' ? `rgba(56, 189, 248, ${opacity})` : `rgba(20, 108, 148, ${opacity})`,
    labelColor: (opacity = 1) => colors.text,
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(20, 108, 148, 0.1)',
      strokeWidth: 1,
    },
    propsForLabels: {
      fontSize: 12,
      fontWeight: '600',
    },
    fillShadowGradient: colors.secondary,
    fillShadowGradientOpacity: 0.8,
  };

  return (
    <Animated.View 
      style={[
        styles.chartContainer,
        {
          opacity: animatedValue,
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.chartGlow} />
      <BarChart
        data={chartData}
        width={screenWidth - 80}
        height={220}
        yAxisLabel=""
        yAxisSuffix=""
        chartConfig={chartConfig}
        style={styles.chart}
        showValuesOnTopOfBars={true}
        fromZero={true}
      />
    </Animated.View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
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
    shadowColor: colors.border,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
});

export default BarChartComponent;