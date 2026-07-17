import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TextInput, FlatList, TouchableOpacity, Switch, ActivityIndicator, Alert, SafeAreaView, Platform, StatusBar, Modal, RefreshControl } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Globe, UserCheck, Database, Music, ShieldAlert, AlertTriangle, Plus, LogOut, ChevronRight, Building2, Shield, Eye, Menu } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

export default function SuperAdminDashboard({ navigation }: any) {
  const { colors } = useTheme();
  const { logout, user: currentUser } = useAuth();
  const styles = getStyles(colors);

  const [analytics, setAnalytics] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [superAdmins, setSuperAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);

  // Promote Admin State
  const [promoteEmail, setPromoteEmail] = useState('');
  const [promoting, setPromoting] = useState(false);

  // Create Org Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');
  const [newOrgAdminEmails, setNewOrgAdminEmails] = useState('');
  const [creatingOrg, setCreatingOrg] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [analyticsRes, orgsRes, adminsRes] = await Promise.all([
        axios.get(`${API_URL}/api/superadmin/analytics`),
        axios.get(`${API_URL}/api/superadmin/organizations`),
        axios.get(`${API_URL}/api/superadmin/admins`)
      ]);

      if (analyticsRes.data.status === 'Ok') {
        setAnalytics(analyticsRes.data.data);
      }
      if (orgsRes.data.status === 'Ok') {
        setOrganizations(orgsRes.data.data);
      }
      if (adminsRes.data.status === 'Ok') {
        setSuperAdmins(adminsRes.data.data);
      }
    } catch (err) {
      console.log('Error fetching superadmin dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDemoteUser = (email: string) => {
    if (email.toLowerCase().trim() === currentUser?.email?.toLowerCase().trim()) {
      Alert.alert('Error', 'You cannot demote yourself from SuperAdmin');
      return;
    }
    Alert.alert(
      'Confirm Demotion',
      `Are you sure you want to remove SuperAdmin privileges from ${email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Demote',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await axios.post(`${API_URL}/api/superadmin/demote`, { email });
              if (res.data.status === 'Ok') {
                Alert.alert('Success', `${email} has been demoted successfully`);
                await fetchDashboardData();
              }
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to demote user');
            }
          }
        }
      ]
    );
  };

  const handleOpenGuestSettings = () => {
    navigation.navigate('Guest Settings');
  };

  const handleToggleOrgStatus = async (orgId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'suspend' : 'activate';
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${action} this organization?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: currentStatus ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setActioning(orgId);
              const res = await axios.post(`${API_URL}/api/superadmin/organizations/toggle-status`, { orgId });
              if (res.data.status === 'Ok') {
                await fetchDashboardData();
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to toggle organization status');
            } finally {
              setActioning(null);
            }
          }
        }
      ]
    );
  };

  const handlePromoteUser = async () => {
    if (!promoteEmail.trim()) {
      Alert.alert('Error', 'Please enter a valid user email');
      return;
    }

    try {
      setPromoting(true);
      const res = await axios.post(`${API_URL}/api/superadmin/promote`, { email: promoteEmail.trim() });
      if (res.data.status === 'Ok') {
        Alert.alert('Success', `${promoteEmail} has been promoted to SuperAdmin`);
        setPromoteEmail('');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to promote user');
    } finally {
      setPromoting(false);
    }
  };

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) {
      Alert.alert('Error', 'Please enter an organization name');
      return;
    }

    try {
      setCreatingOrg(true);
      const res = await axios.post(`${API_URL}/api/superadmin/organizations/create`, {
        name: newOrgName.trim(),
        description: newOrgDescription.trim(),
        adminEmails: newOrgAdminEmails.trim()
      });
      if (res.data.status === 'Ok') {
        Alert.alert(
          'Success',
          `Organization created successfully!\n\nInvites sent to: ${newOrgAdminEmails || 'None'}`
        );
        setNewOrgName('');
        setNewOrgDescription('');
        setNewOrgAdminEmails('');
        setShowCreateModal(false);
        await fetchDashboardData();
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create organization');
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      ]
    );
  };

  const renderOrgCard = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.orgCard, !item.isActive && styles.suspendedCard]}
      onPress={() => navigation.navigate('SuperAdminOrgDetail', { orgId: item._id, orgName: item.name })}
      activeOpacity={0.7}
    >
      <View style={styles.orgCardBody}>
        <View style={styles.orgCardLeft}>
          <View style={[styles.orgIconBox, !item.isActive && { opacity: 0.5 }]}>
            <Building2 color={colors.tint} size={22} />
          </View>
          <View style={styles.orgCardInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.orgName} numberOfLines={1}>{item.name}</Text>
              {!item.isActive && (
                <AlertTriangle color="#FF6B6B" size={14} />
              )}
            </View>
            <Text style={styles.orgSlug}>/{item.slug}  ·  {item.plan?.toUpperCase()}</Text>
            <View style={styles.orgStatsRow}>
              <Text style={styles.orgStatText}>
                {item.memberCount || 0} members  ·  {item.bookCount || 0} books  ·  {item.songCount || 0} songs
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.orgCardRight}>
          <Switch
            value={item.isActive}
            onValueChange={() => handleToggleOrgStatus(item._id, item.isActive)}
            trackColor={{ false: '#FF6B6B40', true: colors.tint + '50' }}
            thumbColor={item.isActive ? colors.tint : '#FF6B6B'}
            disabled={actioning === item._id}
          />
          <ChevronRight color={colors.textSecondary} size={18} style={{ marginTop: 8 }} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.outerContainer}>
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        <View style={styles.container}>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
                <Menu color={colors.text} size={24} />
              </TouchableOpacity>
              <View>
                <Text style={styles.title}>Platform Admin</Text>
                <Text style={styles.subtitle}>Youth Room · SuperAdmin Console</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut color="#FF6B6B" size={20} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={styles.loaderText}>Loading platform data...</Text>
            </View>
          ) : (
            <FlatList
              data={organizations}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => fetchDashboardData(true)}
                  tintColor={colors.tint}
                />
              }
              ListHeaderComponent={
                <View>
                  {/* System Health Stats */}
                  <Text style={styles.sectionLabel}>System Health</Text>
                  <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { borderLeftColor: '#6C5CE7' }]}>
                      <Globe color="#6C5CE7" size={20} />
                      <Text style={styles.statVal}>{analytics?.totalOrganizations || 0}</Text>
                      <Text style={styles.statLabel}>Organizations</Text>
                    </View>
                    <View style={[styles.statCard, { borderLeftColor: '#00B894', paddingHorizontal: 6 }]}>
                      <UserCheck color="#00B894" size={20} />
                      <Text style={styles.statVal}>{analytics?.totalUsers || 0}</Text>
                      <Text style={[styles.statLabel, { fontSize: 9, letterSpacing: -0.2, textTransform: 'none' }]} numberOfLines={1}>
                        Users:{analytics?.regularUserCount || 0} • Admins:{analytics?.adminCount || 0} • Supers:{analytics?.superAdminCount || 0}
                      </Text>
                    </View>
                    <View style={[styles.statCard, { borderLeftColor: '#FDCB6E' }]}>
                      <Database color="#FDCB6E" size={20} />
                      <Text style={styles.statVal}>{analytics?.totalBooks || 0}</Text>
                      <Text style={styles.statLabel}>Books</Text>
                    </View>
                    <View style={[styles.statCard, { borderLeftColor: '#E17055' }]}>
                      <Music color="#E17055" size={20} />
                      <Text style={styles.statVal}>{analytics?.totalSongs || 0}</Text>
                      <Text style={styles.statLabel}>Songs</Text>
                    </View>
                  </View>

                  {/* Quick Actions */}
                  <View style={styles.quickActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.tint, flex: 1 }]}
                      onPress={() => setShowCreateModal(true)}
                      activeOpacity={0.8}
                    >
                      <Plus color="#fff" size={16} />
                      <Text style={styles.actionBtnText}>Create Org</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#146C94', flex: 1 }]}
                      onPress={() => navigation.navigate('Manage Maps')}
                      activeOpacity={0.8}
                    >
                      <Globe color="#fff" size={16} />
                      <Text style={styles.actionBtnText}>Manage Maps</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.quickActions, { marginTop: -6 }]}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#10B981', flex: 1 }]}
                      onPress={() => navigation.navigate('SuperAdminSongs')}
                      activeOpacity={0.8}
                    >
                      <Music color="#fff" size={16} />
                      <Text style={styles.actionBtnText}>Manage Songs</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#4A5568', flex: 1 }]}
                      onPress={handleOpenGuestSettings}
                      activeOpacity={0.8}
                    >
                      <Eye color="#fff" size={16} />
                      <Text style={styles.actionBtnText}>Guest Settings</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Promote User */}
                  <View style={styles.promoteBox}>
                    <Text style={styles.promoteLabel}>
                      <ShieldAlert color={colors.tint} size={14} /> Promote User to SuperAdmin
                    </Text>
                    <View style={styles.promoteRow}>
                      <TextInput
                        style={styles.promoteInput}
                        value={promoteEmail}
                        onChangeText={setPromoteEmail}
                        placeholder="user@email.com"
                        placeholderTextColor={colors.textSecondary + '80'}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                      <TouchableOpacity
                        style={styles.promoteBtn}
                        onPress={handlePromoteUser}
                        disabled={promoting}
                      >
                        {promoting ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.promoteBtnText}>Grant</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Platform SuperAdmins List */}
                  <View style={styles.adminsSection}>
                    <Text style={styles.promoteLabel}>
                      <Shield color={colors.tint} size={14} style={{ marginRight: 6 }} /> Platform SuperAdmins ({superAdmins.length})
                    </Text>
                    {superAdmins.map((admin) => {
                      const isSelf = admin.email.toLowerCase().trim() === currentUser?.email?.toLowerCase().trim();
                      return (
                        <View key={admin.email} style={styles.adminRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.adminName}>{admin.name || 'Platform Admin'}</Text>
                            <Text style={styles.adminEmail}>{admin.email}</Text>
                          </View>
                          {!isSelf && (
                            <TouchableOpacity
                              style={styles.demoteRowBtn}
                              onPress={() => handleDemoteUser(admin.email)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.demoteRowBtnText}>Revoke</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  <Text style={[styles.sectionLabel, { marginTop: 8 }]}>
                    Tenant Organizations ({organizations.length})
                  </Text>
                </View>
              }
              renderItem={renderOrgCard}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Building2 color={colors.textSecondary + '60'} size={48} />
                  <Text style={styles.emptyText}>No organizations yet. Create one to get started!</Text>
                </View>
              }
            />
          )}

        </View>
      </LinearGradient>

      {/* Create Organization Modal */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCreateModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Create New Organization</Text>
            <Text style={styles.modalDescription}>
              Set up a brand new tenant workspace on the platform.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Organization Name *</Text>
              <TextInput
                style={styles.textInput}
                value={newOrgName}
                onChangeText={setNewOrgName}
                placeholder="e.g. Grace Youth Fellowship"
                placeholderTextColor={colors.textSecondary + '80'}
              />
            </View>

            <View style={[styles.inputGroup, { marginTop: 4 }]}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, { height: 70, textAlignVertical: 'top', paddingTop: 12 }]}
                value={newOrgDescription}
                onChangeText={setNewOrgDescription}
                placeholder="Short description..."
                placeholderTextColor={colors.textSecondary + '80'}
                multiline={true}
              />
            </View>

            <View style={[styles.inputGroup, { marginTop: 4 }]}>
              <Text style={styles.inputLabel}>Initial Admin Emails (Comma separated)</Text>
              <TextInput
                style={styles.textInput}
                value={newOrgAdminEmails}
                onChangeText={setNewOrgAdminEmails}
                placeholder="e.g. admin1@email.com, admin2@email.com"
                placeholderTextColor={colors.textSecondary + '80'}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewOrgName('');
                  setNewOrgDescription('');
                  setNewOrgAdminEmails('');
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.tint }, creatingOrg && { opacity: 0.7 }]}
                onPress={handleCreateOrg}
                disabled={creatingOrg}
              >
                {creatingOrg ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logoutBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FF6B6B15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B6B30',
  },
  menuBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  sectionLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.tint,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statVal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  promoteBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  promoteLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  promoteRow: {
    flexDirection: 'row',
    gap: 10,
  },
  promoteInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    height: 42,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 14,
  },
  promoteBtn: {
    backgroundColor: colors.tint,
    borderRadius: 10,
    paddingHorizontal: 18,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoteBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  orgCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  suspendedCard: {
    borderColor: '#FF6B6B50',
    backgroundColor: colors.surface + '90',
  },
  orgCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orgCardLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 10,
  },
  orgIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.tint + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orgCardInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    flexShrink: 1,
  },
  orgSlug: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  orgStatsRow: {
    marginTop: 6,
  },
  orgStatText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  orgCardRight: {
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  modalDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  adminsSection: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '20',
  },
  adminName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  adminEmail: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  demoteRowBtn: {
    backgroundColor: '#FF6B6B20',
    borderColor: '#FF6B6B55',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  demoteRowBtnText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
