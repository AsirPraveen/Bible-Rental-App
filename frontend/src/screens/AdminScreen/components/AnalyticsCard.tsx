import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../utils/colors';

const AnalyticsCard = ({ title, value }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.bg,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
});

export default AnalyticsCard;