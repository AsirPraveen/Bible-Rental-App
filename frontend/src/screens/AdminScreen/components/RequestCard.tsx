import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { colors } from '../../../utils/colors';

const RequestCard = ({ request, onApprove, onReject }) => {
  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.indicator} />
        <View style={styles.details}>
          <Text style={styles.title}>{request.book_name}</Text>
          <Text style={styles.detail}>Requested by: {request.userEmail}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable onPress={() => onApprove(request.userEmail, request.book_id)} style={[styles.actionButton, styles.approveButton]}>
          <Check size={20} color={colors.inactive} />
        </Pressable>
        <Pressable onPress={() => onReject(request.userEmail, request.book_id)} style={[styles.actionButton, styles.rejectButton]}>
          <X size={20} color={colors.inactive} />
        </Pressable>
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
    borderLeftColor: colors.active,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.active,
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
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 100,
  },
  actionButton: {
    borderRadius: 5,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButton: {
    backgroundColor: '#28A745',
  },
  rejectButton: {
    backgroundColor: '#FF6B6B',
  },
});

export default RequestCard;