import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../utils/colors';

const PopularBookCard = ({ book }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{book.book_name}</Text>
      <Text style={styles.detail}>Rented: {book.rent_count} times</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.bg,
  },
  detail: {
    fontSize: 14,
    color: '#666',
  },
});

export default PopularBookCard;