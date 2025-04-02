import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../utils/colors';

const HistoryCard = ({ history }) => {
  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.indicator} />
        <View style={styles.details}>
          <Text style={styles.title}>{history.book_name}</Text>
          <Text style={styles.detail}>User: {history.userEmail}</Text>
          <Text style={styles.detail}>Processed on: {new Date(history.processed_at).toLocaleString()}</Text>
          <Text
            style={[
              styles.statusText,
              history.status === 'approved' && styles.statusApproved,
              history.status === 'rejected' && styles.statusRejected,
            ]}
          >
            {history.status === 'approved' ? 'Approved' : 'Rejected'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    borderLeftWidth: 5,
    borderLeftColor: colors.bg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.bg,
    marginRight: 15,
  },
  details: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.bg,
  },
  detail: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 5,
  },
  statusApproved: {
    color: '#28A745',
  },
  statusRejected: {
    color: '#FF6B6B',
  },
});

export default HistoryCard;