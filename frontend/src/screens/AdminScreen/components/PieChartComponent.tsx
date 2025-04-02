import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { colors } from '../../../utils/colors';

const screenWidth = Dimensions.get('window').width;

const PieChartComponent = ({ data }) => {
  const chartData = data.map((book, index) => ({
    name: book.book_name,
    population: book.rent_count,
    color: `hsl(${index * 60}, 70%, 50%)`,
    legendFontColor: '#333',
    legendFontSize: 12,
  }));

  return (
    <View style={styles.container}>
      <PieChart
        data={chartData}
        width={screenWidth - 60}
        height={220}
        chartConfig={{
          color: (opacity = 1) => colors.bg,
          labelColor: (opacity = 1) => '#333',
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
});

export default PieChartComponent;