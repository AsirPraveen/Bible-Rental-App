import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, SafeAreaView, Platform, StatusBar, Alert } from 'react-native';
import { useOrg, Organization } from '../../context/OrganizationContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeft, Search, Check, AlertCircle, Building2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

export default function JoinOrgScreen({ navigation }: any) {
  const { refreshOrgs, switchOrg } = useOrg();
  const { isGuest } = useAuth();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [inviteCode, setInviteCode] = useState('');
  const [publicOrgs, setPublicOrgs] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [joining, setJoining] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPublicOrgs();
  }, []);

  const fetchPublicOrgs = async () => {
    try {
      setLoadingOrgs(true);
      const res = await axios.get(`${API_URL}/api/organizations/public-directory`);
      if (res.data.status === 'Ok') {
        setPublicOrgs(res.data.data);
      }
    } catch (err) {
      console.log('Error fetching public directory:', err);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const handleJoinInvite = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter a valid invite code');
      return;
    }

    try {
      setJoining(true);
      const res = await axios.post(`${API_URL}/api/organizations/join-invite`, {
        inviteCode: inviteCode.trim()
      });

      if (res.data.status === 'Ok') {
        const org = res.data.data;
        await refreshOrgs();
        const success = await switchOrg(org._id);
        if (success) {
          Alert.alert('Success', `Successfully joined ${org.name}!`, [
            { text: 'Enter', onPress: () => navigation.replace('MainApp') }
          ]);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Invalid invite code');
    } finally {
      setJoining(false);
    }
  };

  const handlePublicJoin = async (org: Organization) => {
    if (isGuest) {
      // Guests just switch locally
      const success = await switchOrg(org._id);
      if (success) {
        navigation.replace('MainApp');
      }
      return;
    }

    try {
      setJoining(true);
      const res = await axios.post(`${API_URL}/api/organizations/join-request`, {
        orgId: org._id
      });

      if (res.data.status === 'Ok') {
        Alert.alert('Request Sent', res.data.message);
        await refreshOrgs();
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit join request');
    } finally {
      setJoining(false);
    }
  };

  const filteredOrgs = publicOrgs.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (org.description && org.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
            <Text style={styles.title}>
              {isGuest ? "Select Public Organization" : "Join Organization"}
            </Text>
          </View>

          {!isGuest && (
            <View style={styles.sectionInvite}>
              <Text style={styles.sectionLabel}>Have an Invite Code?</Text>
              <View style={styles.inviteInputRow}>
                <TextInput
                  style={[styles.input, styles.inviteInput]}
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  placeholder="e.g. GRACE-2024"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                />
                <TouchableOpacity 
                  style={styles.joinBtn} 
                  onPress={handleJoinInvite}
                  disabled={joining}
                >
                  {joining ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.joinBtnText}>Join</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.sectionDirectory}>
            <Text style={styles.sectionLabel}>Public Organizations</Text>
            
            <View style={styles.searchRow}>
              <Search color={colors.textSecondary} size={20} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search organizations..."
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {loadingOrgs ? (
              <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={filteredOrgs}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <View style={styles.orgCard}>
                    <View style={styles.orgCardInfo}>
                      <Building2 color={colors.tint} size={24} style={styles.orgCardIcon} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.orgCardName}>{item.name}</Text>
                        {item.description ? (
                          <Text style={styles.orgCardDesc} numberOfLines={2}>{item.description}</Text>
                        ) : null}
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.cardActionBtn}
                      onPress={() => handlePublicJoin(item)}
                    >
                      <Text style={styles.cardActionBtnText}>
                        {isGuest ? "Select" : "Join"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <AlertCircle color={colors.textSecondary} size={32} />
                    <Text style={styles.emptyText}>No public organizations found</Text>
                  </View>
                }
              />
            )}
          </View>

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
    marginBottom: 24,
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
  sectionInvite: {
    marginBottom: 30,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  inviteInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 15,
  },
  inviteInput: {
    flex: 1,
  },
  joinBtn: {
    backgroundColor: colors.tint,
    borderRadius: 12,
    width: 80,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  sectionDirectory: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 20,
  },
  orgCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  orgCardInfo: {
    flex: 0.75,
    flexDirection: 'row',
    alignItems: 'center',
  },
  orgCardIcon: {
    marginRight: 12,
  },
  orgCardName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  orgCardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  cardActionBtn: {
    backgroundColor: colors.tint + '15',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cardActionBtnText: {
    color: colors.tint,
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
