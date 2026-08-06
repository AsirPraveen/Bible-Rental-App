import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../../../context/ThemeContext';

const screenWidth = Dimensions.get('window').width;

interface LineChartComponentProps {
  data: Array<{ book_name: string; rent_count?: number }>;
}

const LineChartComponent = ({ data }: LineChartComponentProps) => {
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

  const topBooks = data.slice(0, 5);

  const chartData = {
    labels: topBooks.map((_, index) => `B${index + 1}`),
    datasets: [
      {
        data: topBooks.map((book) => book.rent_count || 0),
        color: (opacity = 1) => colors.tint,
        strokeWidth: 3,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: colors.cardBg,
    backgroundGradientFrom: colors.cardBg,
    backgroundGradientTo: colors.cardBg,
    backgroundGradientFromOpacity: 1,
    backgroundGradientToOpacity: 1,
    decimalPlaces: 0,
    color: (opacity = 1) => colors.tint,
    labelColor: (opacity = 1) => colors.textSecondary,
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: '3,3',
      stroke: colors.theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(20, 108, 148, 0.08)',
      strokeWidth: 1,
    },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: colors.secondary,
      fill: colors.tint,
    },
    propsForLabels: {
      fontSize: 11,
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
                outputRange: [15, 0],
              }),
            },
          ],
        },
      ]}
    >
      <LineChart
        data={chartData}
        width={screenWidth - 70}
        height={180}
        yAxisLabel=""
        chartConfig={chartConfig}
        style={styles.chart}
        bezier
        fromZero={true}
        withShadow={true}
        withDots={true}
        withInnerLines={true}
        withOuterLines={false}
      />

      {/* Legend / Key Table */}
      <View style={styles.legendContainer}>
        {topBooks.map((book, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={styles.legendLeft}>
              <Text style={styles.legendKey}>B{index + 1}</Text>
              <Text style={styles.legendName} numberOfLines={1}>
                {book.book_name}
              </Text>
            </View>
            <Text style={styles.legendValue}>{book.rent_count || 0} rentals</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  chartContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 10,
  },
  chart: {
    borderRadius: 16,
  },
  legendContainer: {
    width: '100%',
    marginTop: 15,
    paddingHorizontal: 5,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  legendKey: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.tint,
    backgroundColor: colors.theme === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(20, 108, 148, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 12,
    minWidth: 28,
    textAlign: 'center',
    overflow: 'hidden',
  },
  legendName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.tint,
  },
});

export default LineChartComponent;