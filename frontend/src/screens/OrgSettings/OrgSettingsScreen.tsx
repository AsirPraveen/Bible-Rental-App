import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, Switch, ScrollView, ActivityIndicator, Platform, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOrg } from '../../context/OrganizationContext';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeft, Copy, RefreshCw, Save, Shield } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

const API_URL = API_BASE_URL;

export default function OrgSettingsScreen({ navigation }: any) {
  const { activeOrg, refreshOrgs } = useOrg();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  
  // Feature Toggles
  const [bookRental, setBookRental] = useState(true);
  const [forum, setForum] = useState(true);
  const [prayerWall, setPrayerWall] = useState(true);
  const [songs, setSongs] = useState(true);
  const [game, setGame] = useState(true);
  const [imageGeneration, setImageGeneration] = useState(true);
  


  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (activeOrg) {
      setName(activeOrg.name);
      setDescription(activeOrg.description || '');
      setIsPublic(activeOrg.isPublic);
      setRequiresApproval(activeOrg.requiresApproval);
      setInviteCode(activeOrg.inviteCode || '');
      
      // Features
      setBookRental(activeOrg.features?.bookRental ?? true);
      setForum(activeOrg.features?.forum ?? true);
      setPrayerWall(activeOrg.features?.prayerWall ?? true);
      setSongs(activeOrg.features?.songs ?? true);
      setGame(activeOrg.features?.game ?? true);
      setImageGeneration(activeOrg.features?.imageGeneration ?? true);


    }
  }, [activeOrg]);

  const handleCopyInvite = async () => {
    if (inviteCode) {
      await Clipboard.setStringAsync(inviteCode);
      Alert.alert('Copied', 'Invite code copied to clipboard!');
    }
  };

  const handleRegenerateInvite = async () => {
    try {
      setRegenerating(true);
      const res = await axios.post(`${API_URL}/api/organizations/invite/regenerate`);
      if (res.data.status === 'Ok') {
        setInviteCode(res.data.data);
        await refreshOrgs();
        Alert.alert('Code Updated', 'A new invite code has been generated');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to generate new invite code');
    } finally {
      setRegenerating(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Organization name is required');
      return;
    }

    try {
      setSaving(true);
      const res = await axios.put(`${API_URL}/api/organizations/update`, {
        name: name.trim(),
        description: description.trim(),
        isPublic,
        requiresApproval,
        features: {
          bookRental,
          forum,
          prayerWall,
          songs,
          game,
          imageGeneration
        }
      });

      if (res.data.status === 'Ok') {
        await refreshOrgs();
        Alert.alert('Success', 'Organization settings saved successfully!');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.outerContainer}>
      <StatusBar barStyle="light-content" backgroundColor={colors.linearGradient[0]} />
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        <View style={styles.container}>
          
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft color={colors.text} size={24} />
            </TouchableOpacity>
            <Text style={styles.title}>Organization Settings</Text>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>General Details</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Organization Name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Organization Description"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Onboarding & Invites</Text>



              <View style={styles.toggleRow}>
                <View style={styles.toggleText}>
                  <Text style={styles.toggleLabel}>Public Group</Text>
                  <Text style={styles.toggleSub}>Listing in the public organization directory</Text>
                </View>
                <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ false: colors.border, true: colors.tint }} />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleText}>
                  <Text style={styles.toggleLabel}>Admin Verification</Text>
                  <Text style={styles.toggleSub}>New members require approval to join</Text>
                </View>
                <Switch value={requiresApproval} onValueChange={setRequiresApproval} trackColor={{ false: colors.border, true: colors.tint }} />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Feature Flags</Text>
              
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Book Rentals</Text>
                <Switch value={bookRental} onValueChange={setBookRental} trackColor={{ false: colors.border, true: colors.tint }} />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Discussion Forum</Text>
                <Switch value={forum} onValueChange={setForum} trackColor={{ false: colors.border, true: colors.tint }} />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Prayer Requests Wall</Text>
                <Switch value={prayerWall} onValueChange={setPrayerWall} trackColor={{ false: colors.border, true: colors.tint }} />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Song Lyrics Library</Text>
                <Switch value={songs} onValueChange={setSongs} trackColor={{ false: colors.border, true: colors.tint }} />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Bible Card Game</Text>
                <Switch value={game} onValueChange={setGame} trackColor={{ false: colors.border, true: colors.tint }} />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>AI Verse Image Generator</Text>
                <Switch value={imageGeneration} onValueChange={setImageGeneration} trackColor={{ false: colors.border, true: colors.tint }} />
              </View>
            </View>



            <View style={{ height: 40 }} />
          </ScrollView>

          <TouchableOpacity 
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Save color="#fff" size={20} style={styles.btnIcon} />
                <Text style={styles.saveBtnText}>Save Settings</Text>
              </>
            )}
          </TouchableOpacity>

        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: colors.linearGradient[0],
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
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.tint,
    marginBottom: 16,
  },
  inputContainer: {
    gap: 8,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    height: 46,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 14,
  },
  textArea: {
    height: 70,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  inviteBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  inviteLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  inviteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inviteCodeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 0.5,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  inviteActionBtn: {
    padding: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  toggleText: {
    flex: 0.8,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  toggleSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 14,
  },
  saveBtn: {
    backgroundColor: colors.tint,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  btnIcon: {
    marginRight: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
