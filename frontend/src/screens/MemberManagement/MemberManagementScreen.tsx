import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Platform, StatusBar, TextInput, Animated, Easing } from 'react-native';
import { useOrg } from '../../context/OrganizationContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, UserMinus, Shield, ShieldAlert, Check, X, Users, Mail, Copy, Plus, RotateCw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

export default function MemberManagementScreen({ navigation }: any) {
  const { activeOrg } = useOrg();
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = getStyles(colors);

  const [members, setMembers] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  
  // Workspace invitation states
  const [activeTab, setActiveTab] = useState<'members' | 'invite'>('members');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'User' | 'Admin'>('User');
  const [inviting, setInviting] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const getOnlineStatus = (lastActiveAtStr: string) => {
    if (!lastActiveAtStr) return { active: false, text: 'Last seen: Offline' };
    const lastActive = new Date(lastActiveAtStr);
    const now = new Date();
    const diffMs = now.getTime() - lastActive.getTime();
    
    // Consider active if active within the last 2 minutes
    if (diffMs < 2 * 60 * 1000) {
      return { active: true, text: 'Active' };
    }
    
    const isToday = lastActive.toDateString() === now.toDateString();
    
    if (isToday) {
      return { 
        active: false, 
        text: `Last seen today at ${lastActive.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
      };
    } else {
      return { 
        active: false, 
        text: `Last seen on ${lastActive.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${lastActive.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
      };
    }
  };

  const spinAnim = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);

  const startRotation = () => {
    spinAnim.setValue(0);
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopRotation = () => {
    spinAnim.stopAnimation();
    spinAnim.setValue(0);
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    fetchMembers();
  }, [activeOrg]);

  const fetchMembers = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        startRotation();
        setRefreshing(true);
      }
      const res = await axios.get(`${API_URL}/api/organizations/members`);
      if (res.data.status === 'Ok') {
        setMembers(res.data.data.members || []);
        setPendingRequests(res.data.data.pendingRequests || []);
      }
    } catch (err) {
      console.log('Error fetching members:', err);
    } finally {
      if (!silent) {
        setLoading(false);
      } else {
        stopRotation();
        setRefreshing(false);
      }
    }
  };

  const handleApproveJoin = async (userId: string, approve: boolean) => {
    try {
      setActioning(userId);
      const res = await axios.post(`${API_URL}/api/organizations/members/approve`, {
        userId,
        approve
      });
      if (res.data.status === 'Ok') {
        Alert.alert('Success', approve ? 'Request approved!' : 'Request rejected.');
        await fetchMembers();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to process request');
    } finally {
      setActioning(null);
    }
  };

  const handleUpdateRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'Admin' ? 'User' : 'Admin';
    Alert.alert(
      'Change Role',
      `Are you sure you want to change this member's role to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            try {
              setActioning(userId);
              const res = await axios.post(`${API_URL}/api/organizations/members/update`, {
                userId,
                role: newRole
              });
              if (res.data.status === 'Ok') {
                await fetchMembers();
              }
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to update role');
            } finally {
              setActioning(null);
            }
          }
        }
      ]
    );
  };

  const handleRemoveMember = async (userId: string) => {
    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member from the organization? They will lose access to all books, forum, and org content.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              setActioning(userId);
              const res = await axios.post(`${API_URL}/api/organizations/members/update`, {
                userId,
                remove: true
              });
              if (res.data.status === 'Ok') {
                await fetchMembers();
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to remove member');
            } finally {
              setActioning(null);
            }
          }
        }
      ]
    );
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    try {
      setInviting(true);
      const res = await axios.post(`${API_URL}/api/organizations/members/invite`, {
        email: inviteEmail.trim(),
        role: inviteRole
      });
      if (res.data.status === 'Ok') {
        setGeneratedCode(res.data.data.code);
        Alert.alert('Success', 'Invitation email sent successfully!');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send invitation.');
    } finally {
      setInviting(false);
    }
  };

  const handleCopyCode = async () => {
    if (generatedCode) {
      await Clipboard.setStringAsync(generatedCode);
      Alert.alert('Copied', 'Invite code copied to clipboard!');
    }
  };

  return (
    <SafeAreaView style={styles.outerContainer}>
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        <View style={styles.container}>
          
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft color={colors.text} size={24} />
            </TouchableOpacity>
            <Text style={styles.title}>Member Management</Text>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabHeader}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'members' && styles.tabButtonActive]}
              onPress={() => setActiveTab('members')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'members' && styles.tabButtonTextActive]}>
                Active Members
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'invite' && styles.tabButtonActive]}
              onPress={() => setActiveTab('invite')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'invite' && styles.tabButtonTextActive]}>
                Invite Member
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={colors.tint} style={{ flex: 1 }} />
          ) : (
            <View style={{ flex: 1 }}>
              {activeTab === 'members' ? (
                <View style={{ flex: 1 }}>
                  {pendingRequests.length > 0 && (
                    <View style={styles.pendingSection}>
                      <Text style={styles.sectionLabel}>Pending Join Requests</Text>
                      <FlatList
                        data={pendingRequests}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => (
                          <View style={styles.requestCard}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.memberName}>{item.name || 'Anonymous'}</Text>
                              <Text style={styles.memberEmail}>{item.email}</Text>
                            </View>
                            <View style={styles.requestActions}>
                              <TouchableOpacity 
                                style={[styles.actionBtn, styles.approveBtn]}
                                onPress={() => handleApproveJoin(item._id, true)}
                                disabled={actioning === item._id}
                              >
                                <Check color="#fff" size={16} />
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={[styles.actionBtn, styles.rejectBtn]}
                                onPress={() => handleApproveJoin(item._id, false)}
                                disabled={actioning === item._id}
                              >
                                <X color="#fff" size={16} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      />
                    </View>
                  )}

                  <View style={styles.membersSection}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>Active Members ({members.length})</Text>
                      <TouchableOpacity 
                        style={styles.refreshBtnInline} 
                        onPress={() => fetchMembers(true)}
                        disabled={loading || refreshing}
                        activeOpacity={0.7}
                      >
                        <Animated.View style={{ transform: [{ rotate: spin }] }}>
                          <RotateCw color={colors.tint} size={18} />
                        </Animated.View>
                      </TouchableOpacity>
                    </View>
                    <FlatList
                      data={members}
                      keyExtractor={(item) => item._id}
                      showsVerticalScrollIndicator={false}
                      renderItem={({ item }) => {
                        const isAdmin = item.role === 'Admin';
                        const isMe = item.email.toLowerCase() === user?.email?.toLowerCase();
                        return (
                          <View style={styles.memberCard}>
                            <View style={{ flex: 1 }}>
                              <View style={styles.memberHeaderRow}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.memberName}>{item.name || 'Anonymous'}</Text>
                                  <Text style={styles.memberEmail}>{item.email}</Text>
                                </View>
                                {isMe && (
                                  <View style={styles.meBadge}>
                                    <Text style={styles.meBadgeText}>You</Text>
                                  </View>
                                )}
                              </View>
                              <View style={styles.roleRow}>
                                <Text style={styles.roleLabel}>Role: </Text>
                                <Text style={[styles.roleText, isAdmin && { color: '#FFD700', fontWeight: 'bold' }]}>
                                  {item.role}
                                </Text>
                              </View>

                              {/* Online Status / Last Seen */}
                              {(() => {
                                const status = getOnlineStatus(item.lastActiveAt);
                                return (
                                  <View style={styles.statusRow}>
                                    <View style={[styles.statusDot, status.active ? styles.statusDotActive : styles.statusDotOffline]} />
                                    <Text style={styles.statusText}>{status.text}</Text>
                                  </View>
                                );
                              })()}
                            </View>
                            <View style={styles.memberActions}>
                              {!isMe && (
                                <TouchableOpacity 
                                  style={styles.memberActionBtn}
                                  onPress={() => handleRemoveMember(item._id)}
                                  disabled={actioning === item._id}
                                >
                                  <UserMinus color="#FF6B6B" size={20} />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      }}
                      ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                          <Users color={colors.textSecondary} size={32} />
                          <Text style={styles.emptyText}>No members found</Text>
                        </View>
                      }
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.inviteContainer}>
                  <Text style={styles.inviteTitle}>Invite a New Member</Text>
                  <Text style={styles.inviteDescription}>
                    Send a single-use invite code. The recipient can join this organization once they sign in using the designated email address.
                  </Text>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Email Address</Text>
                    <TextInput
                      style={styles.textInput}
                      value={inviteEmail}
                      onChangeText={setInviteEmail}
                      placeholder="Enter member's email address"
                      placeholderTextColor={colors.textSecondary + '80'}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Role Scoped to Workspace</Text>
                    <View style={styles.rolePickerRow}>
                      <TouchableOpacity
                        style={[styles.rolePickerBtn, inviteRole === 'User' && styles.rolePickerBtnActive]}
                        onPress={() => setInviteRole('User')}
                      >
                        <Text style={[styles.rolePickerText, inviteRole === 'User' && styles.rolePickerTextActive]}>
                          Standard User
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.rolePickerBtn, inviteRole === 'Admin' && styles.rolePickerBtnActive]}
                        onPress={() => setInviteRole('Admin')}
                      >
                        <Text style={[styles.rolePickerText, inviteRole === 'Admin' && styles.rolePickerTextActive]}>
                          Workspace Admin
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.submitButton, inviting && { opacity: 0.7 }]}
                    onPress={handleSendInvite}
                    disabled={inviting}
                  >
                    {inviting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Plus color="#fff" size={18} style={{ marginRight: 6 }} />
                        <Text style={styles.submitButtonText}>Send Invitation</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {generatedCode && (
                    <View style={styles.codeSuccessBox}>
                      <Text style={styles.codeSuccessTitle}>Invitation Generated!</Text>
                      <Text style={styles.codeSuccessSubtitle}>
                        An email containing this code has been queued for delivery. You can also share the code manually:
                      </Text>

                      <View style={styles.codeBadge}>
                        <Text style={styles.codeText}>{generatedCode}</Text>
                        <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode}>
                          <Copy color={colors.primary} size={20} />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity 
                        style={styles.resetBtn} 
                        onPress={() => {
                          setGeneratedCode(null);
                          setInviteEmail('');
                        }}
                      >
                        <Text style={styles.resetBtnText}>Invite Another Member</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.tint,
    marginBottom: 12,
  },
  pendingSection: {
    maxHeight: 220,
    marginBottom: 20,
  },
  membersSection: {
    flex: 1,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  memberName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  memberEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtn: {
    backgroundColor: '#4CAF50',
  },
  rejectBtn: {
    backgroundColor: '#F44336',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  roleRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  roleLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  roleText: {
    fontSize: 12,
    color: colors.text,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 12,
  },
  memberActionBtn: {
    padding: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  tabHeader: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: colors.tint,
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.tint,
  },
  inviteContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  inviteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  inviteDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  submitButton: {
    height: 48,
    backgroundColor: colors.tint,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  codeSuccessBox: {
    marginTop: 30,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  codeSuccessTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 6,
  },
  codeSuccessSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 16,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  codeText: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
    color: colors.tint,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyBtn: {
    padding: 6,
  },
  resetBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.tint,
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rolePickerBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  rolePickerBtnActive: {
    borderColor: colors.tint,
    backgroundColor: colors.tint + '10',
  },
  rolePickerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  rolePickerTextActive: {
    color: colors.tint,
  },
  memberHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  meBadge: {
    backgroundColor: colors.tint + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.tint + '30',
  },
  meBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.tint,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusDotActive: {
    backgroundColor: '#4CAF50',
  },
  statusDotOffline: {
    backgroundColor: colors.textSecondary + '60',
  },
  statusText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  refreshBtnInline: {
    padding: 6,
  },
});
