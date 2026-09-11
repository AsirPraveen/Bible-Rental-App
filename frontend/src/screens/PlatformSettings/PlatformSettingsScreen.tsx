import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useSystemBars } from '@/hooks/useSystemBars';
import { apiClient } from '@/services';

/**
 * Platform-wide switches, SuperAdmin only.
 *
 * These are master switches, not defaults: turning one off here overrides
 * every organization. The per-organization toggle for the same feature is
 * shown locked while this is off, so an org admin can see why theirs has no
 * effect rather than flipping a switch that silently does nothing.
 */
export default function PlatformSettingsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  useSystemBars({ top: colors.linearGradient[0], bottom: colors.background });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [accountDeletion, setAccountDeletion] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get('/api/app-settings')
      .then((res) => {
        const settings = res.data?.data ?? res.data;
        if (!cancelled) {
          setAccountDeletion(settings?.isAccountDeletionEnabledGlobal !== false);
        }
      })
      .catch(() => {
        if (!cancelled) Alert.alert('Error', 'Could not load platform settings.');
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const save = async () => {
    try {
      setIsSaving(true);
      const res = await apiClient.put('/api/app-settings/global', {
        isAccountDeletionEnabled: accountDeletion,
      });
      if (res.data.status === 'Success' || res.data.status === 'Ok') {
        Alert.alert('Saved', 'Platform settings updated.');
      } else {
        Alert.alert('Error', 'Could not save platform settings.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not save platform settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={colors.textLight} />
          </TouchableOpacity>
          <Text style={styles.headerText}>Platform Settings</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Account &amp; Privacy</Text>

              <View style={styles.toggleRow}>
                <View style={styles.toggleTextWrap}>
                  <Text style={styles.toggleLabel}>Allow Account Deletion</Text>
                  <Text style={styles.toggleSub}>
                    Lets members delete their own account from the profile screen.
                    Turning this off overrides every organization.
                  </Text>
                </View>
                <Switch
                  value={accountDeletion}
                  onValueChange={setAccountDeletion}
                  trackColor={{ false: colors.border, true: colors.tint }}
                />
              </View>

              {!accountDeletion && (
                <View style={styles.warning}>
                  <Ionicons name="warning-outline" size={16} color="#E53935" />
                  <Text style={styles.warningText}>
                    Google Play requires apps that offer account creation to provide an
                    in-app way to delete that account. Leaving this off may put a Play
                    Store release at risk.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.saveButton}
                onPress={save}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                {isSaving
                  ? <ActivityIndicator size="small" color={colors.textLight} />
                  : <Text style={styles.saveText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.linearGradient[0] },
    gradient: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    headerText: { fontSize: 18, fontWeight: '700', color: colors.textLight },
    scroll: { padding: 16, paddingBottom: 32 },
    card: {
      backgroundColor: colors.cardBg,
      borderRadius: 16,
      padding: 18,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: colors.textSecondary,
      marginBottom: 14,
    },
    toggleRow: { flexDirection: 'row', alignItems: 'center' },
    toggleTextWrap: { flex: 1, paddingRight: 12 },
    toggleLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
    toggleSub: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    warning: {
      flexDirection: 'row',
      marginTop: 14,
      padding: 12,
      borderRadius: 10,
      backgroundColor: 'rgba(229, 57, 53, 0.10)',
    },
    warningText: {
      flex: 1,
      marginLeft: 8,
      fontSize: 12,
      lineHeight: 17,
      color: colors.text,
    },
    saveButton: {
      marginTop: 20,
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: colors.primary,
    },
    saveText: { color: colors.textLight, fontSize: 15, fontWeight: '700' },
  });
