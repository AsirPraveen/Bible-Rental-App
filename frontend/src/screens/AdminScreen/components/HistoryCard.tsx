import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { User, Calendar, BookOpen, Clock } from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';

const HistoryCard = ({ history }: any) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

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

  const isApproved = history.status === 'approved';

  return (
    <View style={[styles.card, isApproved ? styles.cardApproved : styles.cardRejected]}>
      <View style={styles.content}>
        <View style={styles.details}>
          <View style={styles.titleRow}>
            <BookOpen size={16} color={colors.tint} style={styles.iconMargin} />
            <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
              {history.book_name}
            </Text>
            
            <View style={[styles.statusBadge, isApproved ? styles.badgeApproved : styles.badgeRejected]}>
              <Text style={[styles.statusText, isApproved ? styles.statusApproved : styles.statusRejected]}>
                {isApproved ? 'Approved' : 'Rejected'}
              </Text>
            </View>
          </View>
          
          <View style={styles.metaRow}>
            <User size={14} color={colors.textSecondary} style={styles.iconMargin} />
            <Text style={styles.detail} numberOfLines={1} ellipsizeMode="tail">
              User: <Text style={styles.highlightText}>{history.userName}</Text>
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Calendar size={14} color={colors.textSecondary} style={styles.iconMargin} />
            <Text style={styles.detail}>
              Requested: <Text style={styles.highlightText}>{formatDate(history.requested_at)}</Text>
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Clock size={14} color={colors.textSecondary} style={styles.iconMargin} />
            <Text style={styles.detail}>
              Processed: <Text style={styles.highlightText}>{formatDate(history.processed_at)}</Text>
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderLeftWidth: 6,
    borderColor: colors.border,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardApproved: {
    borderLeftColor: '#10B981',
  },
  cardRejected: {
    borderLeftColor: '#EF4444',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  details: {
    flex: 1,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detail: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  highlightText: {
    fontWeight: '600',
    color: colors.text,
  },
  iconMargin: {
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeApproved: {
    backgroundColor: colors.theme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
  },
  badgeRejected: {
    backgroundColor: colors.theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusApproved: {
    color: '#10B981',
  },
  statusRejected: {
    color: '#EF4444',
  },
});
export default HistoryCard;