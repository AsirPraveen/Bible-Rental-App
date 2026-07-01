import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Check, X, User, Calendar, BookOpen } from 'lucide-react-native';

type Request = {
  book_id: number;
  book_name: string;
  userEmail: string;
  userName: string;
  requested_at: string;
};

type RequestCardProps = {
  request: Request;
  onApprove: (userEmail: string, book_id: number) => Promise<any> | any;
  onReject: (userEmail: string, book_id: number) => Promise<any> | any;
};

const RequestCard: React.FC<RequestCardProps> = ({ request, onApprove, onReject }) => {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleApprove = async () => {
    if (isApproving || isRejecting) return;
    setIsApproving(true);
    try {
      await onApprove(request.userEmail, request.book_id);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (isApproving || isRejecting) return;
    setIsRejecting(true);
    try {
      await onReject(request.userEmail, request.book_id);
    } finally {
      setIsRejecting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.details}>
          <View style={styles.titleRow}>
            <BookOpen size={16} color="#146C94" style={styles.iconMargin} />
            <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
              {request.book_name}
            </Text>
          </View>
          
          <View style={styles.metaRow}>
            <User size={14} color="#64748B" style={styles.iconMargin} />
            <Text style={styles.detail} numberOfLines={1} ellipsizeMode="tail">
              Requested by: <Text style={styles.highlightText}>{request.userName}</Text>
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Calendar size={14} color="#64748B" style={styles.iconMargin} />
            <Text style={styles.detail}>
              Date: <Text style={styles.highlightText}>{formatDate(request.requested_at)}</Text>
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable 
          onPress={handleApprove} 
          disabled={isApproving || isRejecting}
          style={({ pressed }) => [
            styles.actionButton, 
            styles.approveButton,
            (pressed || isApproving) && styles.buttonPressed,
            isRejecting && styles.buttonDisabled
          ]}
        >
          {isApproving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Check size={20} color="#fff" strokeWidth={3} />
          )}
        </Pressable>
        
        <Pressable 
          onPress={handleReject} 
          disabled={isApproving || isRejecting}
          style={({ pressed }) => [
            styles.actionButton, 
            styles.rejectButton,
            (pressed || isRejecting) && styles.buttonPressed,
            isApproving && styles.buttonDisabled
          ]}
        >
          {isRejecting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <X size={20} color="#fff" strokeWidth={3} />
          )}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  content: {
    flex: 1,
    paddingRight: 12,
  },
  details: {
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detail: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
  },
  highlightText: {
    fontWeight: '600',
    color: '#334155',
  },
  iconMargin: {
    marginRight: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  actionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default RequestCard;