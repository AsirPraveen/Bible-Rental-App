import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, FlatList, ActivityIndicator, SafeAreaView, Platform, StatusBar, TextInput, Modal, Alert } from 'react-native';
import { useOrg, Membership } from '../../context/OrganizationContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LogOut, Plus, Building2, Shield, User, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

export default function OrgSelectionScreen({ navigation }: any) {
  const { memberships, loading, switchOrg, refreshOrgs } = useOrg();
  const { logout, isGuest, user } = useAuth();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // SuperAdmin guard — redirect to their dedicated dashboard
  React.useEffect(() => {
    if (user?.globalRole === 'SuperAdmin') {
      navigation.replace('SuperAdmin');
    }
  }, [user]);

  const handleSelectOrg = async (orgId: string) => {
    const success = await switchOrg(orgId);
    if (success) {
      const membership = memberships.find(m => m.organization._id === orgId);
      const isAdmin = membership?.role === 'Admin';
      if (isAdmin) {
        navigation.replace('AdminScreen');
      } else {
        navigation.replace('MainApp');
      }
    }
  };

  const handleJoinByCode = async (codeToUse: string) => {
    const code = codeToUse.trim();
    if (!code) {
      Alert.alert('Error', 'Please enter a valid invite code.');
      return;
    }
    try {
      setJoining(true);
      const res = await axios.post(`${API_URL}/api/organizations/join-invite`, { inviteCode: code });
      if (res.data.status === 'Ok') {
        Alert.alert('Success', 'Successfully joined organization!');
        setInviteCode('');
        setShowJoinModal(false);
        
        // Refresh context memberships
        await refreshOrgs();
        
        // Switch active org and redirect to MainApp (new members join with standard User role)
        const orgId = res.data.data._id;
        const success = await switchOrg(orgId);
        if (success) {
          navigation.replace('MainApp');
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to join organization. Please verify the code.');
    } finally {
      setJoining(false);
    }
  };

  const renderMembershipCard = ({ item }: { item: Membership }) => {
    const org = item.organization;
    const isAdmin = item.role === 'Admin';

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => handleSelectOrg(org._id)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.orgIconContainer}>
            <Building2 color={colors.tint} size={28} />
          </View>
          <View style={styles.orgInfo}>
            <Text style={styles.orgName}>{org.name}</Text>
            <Text style={styles.orgSlug}>/{org.slug}</Text>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <View style={styles.roleBadge}>
            {isAdmin ? (
              <Shield color="#FFD700" size={14} style={styles.roleIcon} />
            ) : (
              <User color={colors.textSecondary} size={14} style={styles.roleIcon} />
            )}
            <Text style={[styles.roleText, isAdmin && { color: '#FFD700' }]}>
              {item.role}
            </Text>
          </View>
          <ArrowRight color={colors.tint} size={20} />
        </View>
      </TouchableOpacity>
    );
  };

  const hasWorkspaces = memberships.length > 0;

  // If SuperAdmin, show nothing while redirecting
  if (user?.globalRole === 'SuperAdmin') {
    return (
      <SafeAreaView style={styles.outerContainer}>
        <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.outerContainer}>
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        <View style={styles.container}>
          
          <View style={styles.header}>
            <Text style={styles.title}>
              {hasWorkspaces ? "Select Workspace" : "Welcome to Youth Room"}
            </Text>
            <Text style={styles.subtitle}>
              {hasWorkspaces 
                ? "Choose a workspace organization to enter"
                : "Enter the invite code sent by your organization admin to join a workspace."
              }
            </Text>
          </View>

          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={styles.loaderText}>Loading workspaces...</Text>
            </View>
          ) : !hasWorkspaces ? (
            /* Onboarding Invite Form for new users */
            <View style={styles.onboardingContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Invite Code</Text>
                <TextInput
                  style={styles.textInput}
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  placeholder="Enter code (e.g. MKP-2026-X8Y9)"
                  placeholderTextColor={colors.textSecondary + '80'}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, joining && { opacity: 0.7 }]}
                onPress={() => handleJoinByCode(inviteCode)}
                disabled={joining}
              >
                {joining ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnTextPrimary}>Join Workspace</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.btn, styles.btnDanger, { marginTop: 12 }]}
                onPress={async () => {
                  await logout();
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                  });
                }}
              >
                <LogOut color="#FF6B6B" size={20} style={styles.btnIcon} />
                <Text style={styles.btnTextDanger}>Logout</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Workspaces List for returning users */
            <View style={{ flex: 1 }}>
              <FlatList
                data={memberships}
                renderItem={renderMembershipCard}
                keyExtractor={(item) => item.organization._id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />

              <View style={styles.actionSection}>
                <TouchableOpacity 
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={() => setShowJoinModal(true)}
                >
                  <Plus color="#fff" size={20} style={styles.btnIcon} />
                  <Text style={styles.btnTextPrimary}>Join Another Workspace</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.btn, styles.btnDanger]}
                  onPress={async () => {
                    await logout();
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Login' }],
                    });
                  }}
                >
                  <LogOut color="#FF6B6B" size={20} style={styles.btnIcon} />
                  <Text style={styles.btnTextDanger}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Join Another Workspace Modal */}
          <Modal
            visible={showJoinModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowJoinModal(false)}
          >
            <TouchableOpacity 
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowJoinModal(false)}
            >
              <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                <Text style={styles.modalTitle}>Join a Workspace</Text>
                <Text style={styles.modalDescription}>
                  Enter the invite code generated by your organization admin to join.
                </Text>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={inviteCode}
                    onChangeText={setInviteCode}
                    placeholder="Enter code (e.g. MKP-2026-X8Y9)"
                    placeholderTextColor={colors.textSecondary + '80'}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.btn, styles.btnSecondary, { flex: 1, marginRight: 8 }]}
                    onPress={() => {
                      setShowJoinModal(false);
                      setInviteCode('');
                    }}
                  >
                    <Text style={styles.btnTextSecondary}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.btn, styles.btnPrimary, { flex: 1, marginLeft: 8 }, joining && { opacity: 0.7 }]}
                    onPress={() => handleJoinByCode(inviteCode)}
                    disabled={joining}
                  >
                    {joining ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.btnTextPrimary}>Join</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>

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
    marginTop: 20,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 22,
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
  listContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orgIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.tint + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  orgSlug: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.border + '30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleIcon: {
    marginRight: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actionSection: {
    marginTop: 'auto',
    gap: 12,
    paddingVertical: 10,
  },
  btn: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  btnPrimary: {
    backgroundColor: colors.primary || colors.tint,
    borderColor: colors.primary || colors.tint,
  },
  btnSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  btnDanger: {
    backgroundColor: 'transparent',
    borderColor: '#FF6B6B30',
  },
  btnIcon: {
    marginRight: 10,
  },
  btnTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  btnTextSecondary: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  btnTextDanger: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
  onboardingContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
  },
  inputContainer: {
    marginBottom: 20,
    width: '100%',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
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
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
});
