import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useTheme } from '../../../context/ThemeContext';

const screenWidth = Dimensions.get('window').width;

interface PieChartComponentProps {
  data: Array<{ book_name: string; rent_count?: number }>;
}

const PieChartComponent = ({ data }: PieChartComponentProps) => {
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

  const totalRentals = data.reduce((sum, item) => sum + (item.rent_count || 0), 0);
  const topBooks = data.slice(0, 5);

  const chartColors = [
    colors.primary,
    colors.secondary,
    colors.tint,
    '#38BDF8',
    '#F472B6',
    '#FB7185',
  ];

  const chartData = topBooks.map((book, index) => ({
    name: book.book_name,
    population: book.rent_count || 0,
    color: chartColors[index % chartColors.length],
    legendFontColor: colors.text,
    legendFontSize: 12,
  }));

  // Calculate the centered padding left offset dynamically
  const paddingLeftOffset = String((screenWidth - 70) / 4);

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
                outputRange: [0.9, 1],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.chartWrapper}>
        <PieChart
          data={chartData}
          width={screenWidth - 70}
          height={200}
          chartConfig={{
            color: (opacity = 1) => colors.tint,
            labelColor: (opacity = 1) => colors.text,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft={paddingLeftOffset}
          absolute
          hasLegend={false}
        />
      </View>

      {/* Premium Custom Legend Table */}
      <View style={styles.legendContainer}>
        {chartData.map((item, index) => {
          const pct = totalRentals > 0 ? Math.round((item.population / totalRentals) * 100) : 0;
          return (
            <View key={index} style={styles.legendItem}>
              <View style={styles.legendLeft}>
                <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendText} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
              <Text style={styles.legendValue}>
                {item.population} ({pct}%)
              </Text>
            </View>
          );
        })}
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
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
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
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  legendText: {
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

export default PieChartComponent;