import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { colors } from '../../../utils/colors';

const screenWidth = Dimensions.get('window').width;

const BarChartComponent = ({ data }) => {
  const chartData = {
    labels: data.map((book) => book.book_name.slice(0, 5) + '...'),
    datasets: [
      {
        data: data.map((book) => book.rent_count),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <BarChart
        data={chartData}
        width={screenWidth - 60}
        height={220}
        yAxisLabel=""
        chartConfig={{
          backgroundColor: '#fff',
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          decimalPlaces: 0,
          color: (opacity = 1) => colors.bg,
          labelColor: (opacity = 1) => '#333',
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '6',
            strokeWidth: '2',
            stroke: colors.active,
          },
        }}
        style={styles.chart}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  chart: {
    borderRadius: 16,
  },
});

export default BarChartComponent;