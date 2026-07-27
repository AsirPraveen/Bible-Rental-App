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
      duration: 1500,
      useNativeDriver: true,
    }).start();
  }, []);

  const chartData = data.map((book, index) => ({
    name: book.book_name.length > 10 ? book.book_name.slice(0, 10) + '...' : book.book_name,
    population: book.rent_count || 0,
    color: index % 4 === 0 ? colors.primary : 
           index % 4 === 1 ? colors.secondary :
           index % 4 === 2 ? colors.tint :
           '#667eea',
    legendFontColor: colors.text,
    legendFontSize: 12,
  }));

  return (
    <Animated.View 
      style={[
        styles.chartContainer,
        {
          opacity: animatedValue,
          transform: [
            {
              rotate: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['-10deg', '0deg'],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.chartGlow} />
      <PieChart
        data={chartData}
        width={screenWidth - 80}
        height={220}
        chartConfig={{
          color: (opacity = 1) => colors.tint,
          labelColor: (opacity = 1) => colors.text,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
        hasLegend={true}
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

export default PieChartComponent;