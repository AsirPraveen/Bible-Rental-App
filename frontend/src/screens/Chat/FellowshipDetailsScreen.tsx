import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  SafeAreaView, Platform, ActivityIndicator, Switch, StatusBar
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Shield, User, UserMinus, LogOut, Megaphone, MessageSquare, Settings, UserPlus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useOrg } from '../../context/OrganizationContext';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

type MemberType = {
  user: { _id: string; name: string; email: string; image?: string };
  role: 'shepherd' | 'member';
  joinedAt: string;
};

type FellowshipType = {
  _id: string;
  name: string;
  description: string;
  icon: string;
  type: 'normal' | 'announcement';
  members: MemberType[];
  createdBy: { _id: string; name: string };
};

export default function FellowshipDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { fellowshipId } = route.params || {};

  const [fellowship, setFellowship] = useState<FellowshipType | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/fellowships/${fellowshipId}`);
      if (res.data.status === 'Ok') {
        setFellowship(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching fellowship details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [fellowshipId]);

  const { orgRole } = useOrg();

  const isShepherd = orgRole === 'Admin' || fellowship?.members.some((m) => {
    const memberUserId = (m.user?._id || m.user)?.toString();
    const currentUserId = (user?._id || (user as any)?.id)?.toString();
    const isIdMatch = !!(memberUserId && currentUserId && memberUserId === currentUserId);

    const memberEmail = m.user?.email?.toLowerCase();
    const currentEmail = user?.email?.toLowerCase();
    const isEmailMatch = !!(memberEmail && currentEmail && memberEmail === currentEmail);

    return (isIdMatch || isEmailMatch) && m.role === 'shepherd';
  });

  const handleToggleType = async () => {
    if (!fellowship || !isShepherd) return;
    const newType = fellowship.type === 'normal' ? 'announcement' : 'normal';
    try {
      await axios.put(`${API_URL}/api/fellowships/${fellowshipId}`, { type: newType });
      setFellowship(prev => prev ? { ...prev, type: newType } : null);
    } catch (err) {
      Alert.alert('Error', 'Failed to update fellowship type.');
    }
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert(
      'Remove Member',
      `Remove ${memberName} from this fellowship?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive', onPress: async () => {
            try {
              await axios.delete(`${API_URL}/api/fellowships/${fellowshipId}/members/${memberId}`);
              fetchDetails();
            } catch (err) {
              Alert.alert('Error', 'Failed to remove member.');
            }
          }
        }
      ]
    );
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave Fellowship',
      'Are you sure you want to leave this fellowship?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave', style: 'destructive', onPress: async () => {
            try {
              await axios.delete(`${API_URL}/api/fellowships/${fellowshipId}/members/${user?._id}`);
              navigation.goBack();
              navigation.goBack(); // Go back past the chat screen too
            } catch (err) {
              Alert.alert('Error', 'Failed to leave fellowship.');
            }
          }
        }
      ]
    );
  };

  const handleArchive = () => {
    Alert.alert(
      'Archive Fellowship',
      'This will hide the fellowship for all members. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive', style: 'destructive', onPress: async () => {
            try {
              await axios.patch(`${API_URL}/api/fellowships/${fellowshipId}/archive`);
              navigation.goBack();
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', 'Failed to archive fellowship.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!fellowship) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, textAlign: 'center', marginTop: 40 }}>Fellowship not found.</Text>
      </SafeAreaView>
    );
  }

  const shepherds = fellowship.members.filter(m => m.role === 'shepherd');
  const members = fellowship.members.filter(m => m.role === 'member');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.secondary, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#fff" size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fellowship Details</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Fellowship Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.theme === 'dark' ? colors.surface : '#fff' }]}>
          <Text style={styles.fellowshipIcon}>{fellowship.icon}</Text>
          <Text style={[styles.fellowshipName, { color: colors.text }]}>{fellowship.name}</Text>
          {fellowship.description ? (
            <Text style={[styles.fellowshipDesc, { color: colors.textSecondary }]}>
              {fellowship.description}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <View style={[styles.metaBadge, { backgroundColor: colors.secondary + '20' }]}>
              <User color={colors.secondary} size={12} />
              <Text style={[styles.metaText, { color: colors.secondary }]}>
                {fellowship.members.length} members
              </Text>
            </View>
            <View style={[styles.metaBadge, { backgroundColor: fellowship.type === 'announcement' ? '#FFD700' + '30' : colors.secondary + '20' }]}>
              {fellowship.type === 'announcement'
                ? <Megaphone color="#DAA520" size={12} />
                : <MessageSquare color={colors.secondary} size={12} />
              }
              <Text style={[styles.metaText, { color: fellowship.type === 'announcement' ? '#DAA520' : colors.secondary }]}>
                {fellowship.type === 'announcement' ? 'Announcement' : 'Open Chat'}
              </Text>
            </View>
          </View>
        </View>

        {/* Shepherd Controls */}
        {isShepherd && (
          <View style={[styles.section, { backgroundColor: colors.theme === 'dark' ? colors.surface : '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <Settings color={colors.secondary} size={16} /> Shepherd Controls
            </Text>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Megaphone color={colors.textSecondary} size={16} />
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Announcement Only</Text>
              </View>
              <Switch
                value={fellowship.type === 'announcement'}
                onValueChange={handleToggleType}
                trackColor={{ false: '#ccc', true: colors.secondary + '80' }}
                thumbColor={fellowship.type === 'announcement' ? colors.secondary : '#f4f3f4'}
              />
            </View>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.secondary + '15' }]}
              onPress={() => navigation.navigate('AddFellowshipMembers', { fellowshipId })}
            >
              <UserPlus color={colors.secondary} size={16} />
              <Text style={[styles.actionBtnText, { color: colors.secondary }]}>Add Members</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Shepherds */}
        <View style={[styles.section, { backgroundColor: colors.theme === 'dark' ? colors.surface : '#fff' }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Shepherds ({shepherds.length})
          </Text>
          {shepherds.map((m) => (
            <View key={m.user._id} style={styles.memberRow}>
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.secondary }]}>
                <Text style={styles.avatarText}>{m.user.name?.[0]?.toUpperCase()}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: colors.text }]}>
                  {m.user.name} {m.user._id === user?._id ? '(You)' : ''}
                </Text>
                <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>{m.user.email}</Text>
              </View>
              <Shield color="#FFD700" size={16} />
            </View>
          ))}
        </View>

        {/* Members */}
        <View style={[styles.section, { backgroundColor: colors.theme === 'dark' ? colors.surface : '#fff' }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Members ({members.length})
          </Text>
          {members.map((m) => (
            <View key={m.user._id} style={styles.memberRow}>
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{m.user.name?.[0]?.toUpperCase()}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: colors.text }]}>
                  {m.user.name} {m.user._id === user?._id ? '(You)' : ''}
                </Text>
                <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>{m.user.email}</Text>
              </View>
              {isShepherd && m.user._id !== user?._id && (
                <TouchableOpacity onPress={() => handleRemoveMember(m.user._id, m.user.name)}>
                  <UserMinus color="#E74C3C" size={16} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {members.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No regular members yet
            </Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {!isShepherd && (
            <TouchableOpacity style={styles.dangerBtn} onPress={handleLeave}>
              <LogOut color="#E74C3C" size={16} />
              <Text style={styles.dangerBtnText}>Leave Fellowship</Text>
            </TouchableOpacity>
          )}
          {isShepherd && (
            <TouchableOpacity style={styles.dangerBtn} onPress={handleArchive}>
              <LogOut color="#E74C3C" size={16} />
              <Text style={styles.dangerBtnText}>Archive Fellowship</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 14,
  },
  backBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  content: { padding: 16, paddingBottom: 40 },
  infoCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  fellowshipIcon: { fontSize: 48, marginBottom: 12 },
  fellowshipName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  fellowshipDesc: { fontSize: 14, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  metaRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  metaText: { fontSize: 12, fontWeight: '600' },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleLabel: { fontSize: 14, fontWeight: '500' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
    gap: 8,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberName: { fontSize: 14, fontWeight: '600' },
  memberEmail: { fontSize: 12, marginTop: 1 },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  actionsContainer: { marginTop: 8 },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(231,76,60,0.1)',
    gap: 8,
  },
  dangerBtnText: { color: '#E74C3C', fontSize: 15, fontWeight: '600' },
});
