import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, Switch, ActivityIndicator, SafeAreaView, Platform, StatusBar, Alert } from 'react-native';
import { useOrg } from '../../context/OrganizationContext';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeft, Building2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

export default function CreateOrgScreen({ navigation }: any) {
  const { refreshOrgs, switchOrg } = useOrg();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Organization name is required');
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post(`${API_URL}/api/organizations/create`, {
        name: name.trim(),
        description: description.trim(),
        isPublic,
        requiresApproval
      });

      if (res.data.status === 'Ok') {
        const orgId = res.data.data._id;
        await refreshOrgs();
        const switched = await switchOrg(orgId);
        if (switched) {
          Alert.alert('Success', 'Organization created successfully!', [
            { text: 'Enter', onPress: () => navigation.replace('MainApp') }
          ]);
        }
      }
    } catch (err: any) {
      console.error('Error creating org:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to create organization');
    } finally {
      setSubmitting(false);
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
            <Text style={styles.title}>Create Organization</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Organization Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Grace Fellowship Youth"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Brief description of the youth room or church group"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Public Directory</Text>
                <Text style={styles.toggleSub}>Allow others to find and request to join this group</Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: colors.border, true: colors.tint }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Requires Admin Approval</Text>
                <Text style={styles.toggleSub}>Review and approve new member join requests</Text>
              </View>
              <Switch
                value={requiresApproval}
                onValueChange={setRequiresApproval}
                trackColor={{ false: colors.border, true: colors.tint }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              />
            </View>
          </View>

          <TouchableOpacity 
            style={styles.submitBtn}
            onPress={handleCreate}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Building2 color="#fff" size={20} style={styles.btnIcon} />
                <Text style={styles.submitBtnText}>Create Organization</Text>
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
    marginBottom: 30,
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
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
  },
  toggleInfo: {
    flex: 0.85,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  toggleSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  submitBtn: {
    backgroundColor: colors.tint,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 10,
  },
  btnIcon: {
    marginRight: 10,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
