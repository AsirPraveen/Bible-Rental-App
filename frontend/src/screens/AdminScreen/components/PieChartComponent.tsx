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

const PieChartComponent = ({ data }) => {
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
    color: index % 4 === 0 ? Colors.primary : 
           index % 4 === 1 ? Colors.secondary :
           index % 4 === 2 ? Colors.glow :
           Colors.accent,
    legendFontColor: '#333',
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
          color: (opacity = 1) => Colors.primary,
          labelColor: (opacity = 1) => '#333',
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

export default PieChartComponent;