import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Platform, StatusBar, Switch, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeft, Users, BookOpen, Music, MessageSquare, Heart, Shield, User, Calendar, AlertTriangle, CheckCircle, Eye } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

export default function SuperAdminOrgDetail({ route, navigation }: any) {
  const { orgId, orgName } = route.params;
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [loading, setLoading] = useState(true);
  const [orgData, setOrgData] = useState<any>(null);
  const [actioning, setActioning] = useState(false);

  useEffect(() => {
    fetchOrgDetail();
  }, []);

  const fetchOrgDetail = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/superadmin/organizations/${orgId}`);
      if (res.data.status === 'Ok') {
        setOrgData(res.data.data);
      }
    } catch (err) {
      console.log('Error fetching org detail:', err);
      Alert.alert('Error', 'Failed to load organization details');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    const currentStatus = orgData?.organization?.isActive;
    const action = currentStatus ? 'suspend' : 'activate';
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${action} "${orgName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: currentStatus ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setActioning(true);
              const res = await axios.post(`${API_URL}/api/superadmin/organizations/toggle-status`, { orgId });
              if (res.data.status === 'Ok') {
                await fetchOrgDetail();
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to toggle organization status');
            } finally {
              setActioning(false);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.outerContainer}>
        <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={styles.loaderText}>Loading details...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const org = orgData?.organization;
  const stats = orgData?.stats;
  const members = orgData?.members || [];

  const statCards = [
    { icon: Users, label: 'Members', value: stats?.memberCount || 0, color: '#6C5CE7' },
    { icon: BookOpen, label: 'Books', value: stats?.bookCount || 0, color: '#FDCB6E' },
    { icon: Music, label: 'Songs', value: stats?.songCount || 0, color: '#E17055' },
    { icon: MessageSquare, label: 'Forum Posts', value: stats?.forumCount || 0, color: '#00B894' },
    { icon: Heart, label: 'Prayer Requests', value: stats?.prayerCount || 0, color: '#E84393' },
  ];

  const stuffFeatures = [
    'Bible',
    'Songs',
    'HistoricalMaps',
    'ReadingTracker',
    'ReadingPlanner',
    'DiscussionForum',
    'FastingTracker',
    'PrayerRequests',
    'MessageNotes',
    'BookPdf'
  ];

  const enabledFeatures = org?.features
    ? stuffFeatures.filter(key => org.features[key] !== false)
    : stuffFeatures;

  return (
    <SafeAreaView style={styles.outerContainer}>
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        <View style={styles.container}>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <ArrowLeft color={colors.text} size={22} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>{org?.name || orgName}</Text>
              <Text style={styles.subtitle}>/{org?.slug}  ·  {org?.plan?.toUpperCase()}</Text>
            </View>
          </View>

          <FlatList
            data={members}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View>
                {/* Status Banner */}
                <View style={[styles.statusBanner, !org?.isActive && styles.statusBannerSuspended]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {org?.isActive ? (
                      <CheckCircle color="#00B894" size={18} />
                    ) : (
                      <AlertTriangle color="#FF6B6B" size={18} />
                    )}
                    <Text style={[styles.statusText, !org?.isActive && { color: '#FF6B6B' }]}>
                      {org?.isActive ? 'Active' : 'Suspended'}
                    </Text>
                  </View>
                  <Switch
                    value={org?.isActive}
                    onValueChange={handleToggleStatus}
                    trackColor={{ false: '#FF6B6B40', true: colors.tint + '50' }}
                    thumbColor={org?.isActive ? colors.tint : '#FF6B6B'}
                    disabled={actioning}
                  />
                </View>


                {/* Org Info */}
                {org?.description ? (
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Description</Text>
                    <Text style={styles.infoValue}>{org.description}</Text>
                  </View>
                ) : null}

                <View style={styles.infoRow}>
                  <View style={[styles.infoCard, { flex: 1 }]}>
                    <Text style={styles.infoLabel}>Created</Text>
                    <Text style={styles.infoValue}>{formatDate(org?.createdAt)}</Text>
                  </View>
                </View>

                {/* Stats Cards */}
                <Text style={styles.sectionLabel}>Content Statistics</Text>
                <View style={styles.statsGrid}>
                  {statCards.map((s, i) => (
                    <View key={i} style={[styles.statCard, { borderLeftColor: s.color }]}>
                      <s.icon color={s.color} size={18} />
                      <Text style={styles.statVal}>{s.value}</Text>
                      <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Features */}
                {enabledFeatures.length > 0 && (
                  <View style={styles.featuresSection}>
                    <Text style={styles.sectionLabel}>Enabled Features</Text>
                    <View style={styles.featureTags}>
                      {enabledFeatures.map((f, i) => (
                        <View key={i} style={styles.featureTag}>
                          <Text style={styles.featureTagText}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Members List Header */}
                <Text style={[styles.sectionLabel, { marginTop: 10 }]}>
                  Members ({members.length})
                </Text>
                <Text style={styles.readOnlyNote}>Read-only view — members cannot be managed from here</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.memberCard}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {(item.name || item.email || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName} numberOfLines={1}>{item.name || 'Unknown'}</Text>
                  <Text style={styles.memberEmail} numberOfLines={1}>{item.email}</Text>
                </View>
                <View style={styles.memberRoleBadge}>
                  {item.role === 'Admin' ? (
                    <Shield color="#FFD700" size={12} />
                  ) : (
                    <User color={colors.textSecondary} size={12} />
                  )}
                  <Text style={[styles.memberRoleText, item.role === 'Admin' && { color: '#FFD700' }]}>
                    {item.role}
                  </Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Users color={colors.textSecondary + '60'} size={36} />
                <Text style={styles.emptyText}>No members in this organization</Text>
              </View>
            }
          />

        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  outerContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#00B89410',
    borderColor: '#00B89430',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  statusBannerSuspended: {
    backgroundColor: '#FF6B6B10',
    borderColor: '#FF6B6B30',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00B894',
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.tint,
    marginBottom: 10,
    marginTop: 6,
    letterSpacing: 0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    minWidth: '30%',
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 2,
  },
  statVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  featuresSection: {
    marginBottom: 6,
  },
  featureTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  featureTag: {
    backgroundColor: colors.tint + '15',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  featureTagText: {
    fontSize: 11,
    color: colors.tint,
    fontWeight: '500',
  },
  readOnlyNote: {
    fontSize: 11,
    color: colors.textSecondary + '80',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: colors.tint + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  memberAvatarText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.tint,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  memberEmail: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  memberRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.border + '30',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  memberRoleText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
