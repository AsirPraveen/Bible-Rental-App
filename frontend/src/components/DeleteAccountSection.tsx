import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { apiClient } from '@/services';

const DANGER = '#E53935';

type Status = {
  canDelete: boolean;
  blockers: string[];
  confirmationEmail: string;
};

type Props = {
  /** Called once the account is gone, so the screen can sign out and navigate. */
  onDeleted: () => void;
};

/**
 * "Delete my account", as required by Google Play for any app offering
 * account creation.
 *
 * The flow deliberately has friction. Deletion is irreversible and there is no
 * undo, so it asks the server what will happen first, spells out what is
 * removed and what is kept, and only enables the button once the member has
 * retyped their own email address. A mistyped confirmation costs seconds; a
 * mis-tapped one costs the account.
 */
export default function DeleteAccountSection({ onDeleted }: Props) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  // Whether the feature is switched on for this member at all, resolved by the
  // server from the platform switch AND their organizations'. Null while
  // unknown, so nothing flashes on screen before the answer arrives.
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get('/api/app-settings')
      .then((res) => {
        const settings = res.data?.data ?? res.data;
        if (!cancelled) setIsEnabled(settings?.isAccountDeletionEnabled !== false);
      })
      // On a network failure, stay hidden rather than showing a control that
      // would fail at the point of use.
      .catch(() => { if (!cancelled) setIsEnabled(false); });
    return () => { cancelled = true; };
  }, []);

  const open = async () => {
    setIsOpen(true);
    setStatus(null);
    setConfirmEmail('');
    setError(null);
    setIsChecking(true);
    try {
      const res = await apiClient.get('/api/users/account-deletion-status');
      if (res.data.status === 'Ok') setStatus(res.data.data);
      else setError('Could not check your account. Please try again.');
    } catch {
      setError('Could not check your account. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const close = () => {
    if (isDeleting) return; // Never leave a delete half-finished on screen.
    setIsOpen(false);
  };

  const matches =
    !!status &&
    confirmEmail.trim().toLowerCase() === status.confirmationEmail.trim().toLowerCase();

  const confirmDelete = async () => {
    if (!matches || isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      const res = await apiClient.delete('/api/users/me', {
        data: { confirmEmail: confirmEmail.trim() },
      });
      if (res.data.status === 'Ok') {
        setIsOpen(false);
        onDeleted();
      } else {
        setError(res.data.message || 'Could not delete the account.');
      }
    } catch (err: any) {
      // The server refuses with a specific reason (sole admin, for example);
      // showing that is far more useful than a generic failure.
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Could not delete the account. Nothing was removed.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isEnabled) return null;

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danger zone</Text>
        <TouchableOpacity style={styles.dangerButton} onPress={open} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={18} color={DANGER} style={{ marginRight: 10 }} />
          <Text style={styles.dangerButtonText}>Delete my account</Text>
        </TouchableOpacity>
        <Text style={styles.sectionHint}>
          Permanently removes your account and personal data. This cannot be undone.
        </Text>
      </View>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={close}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="warning-outline" size={22} color={DANGER} />
              <Text style={styles.cardTitle}>Delete your account</Text>
            </View>

            {isChecking ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.tint} />
              </View>
            ) : status && !status.canDelete ? (
              <View>
                <Text style={styles.body}>Your account cannot be deleted yet:</Text>
                {status.blockers.map((blocker) => (
                  <View key={blocker} style={styles.blockerRow}>
                    <Text style={styles.blockerBullet}>•</Text>
                    <Text style={styles.blockerText}>{blocker}</Text>
                  </View>
                ))}
                <TouchableOpacity style={styles.cancelButton} onPress={close}>
                  <Text style={styles.cancelText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.body}>This permanently deletes:</Text>
                <Text style={styles.bullet}>• Your name, email and profile photo</Text>
                <Text style={styles.bullet}>• Your notes, reading progress and reminders</Text>
                <Text style={styles.bullet}>• Your saved verses and songs</Text>

                <Text style={[styles.body, { marginTop: 12 }]}>What stays:</Text>
                <Text style={styles.bullet}>
                  • Messages, prayers and posts you shared stay in your fellowship so other
                  members&apos; conversations still make sense — but they are shown as
                  &quot;Deleted member&quot; and can no longer be traced to you.
                </Text>

                <Text style={styles.confirmLabel}>
                  Type <Text style={styles.confirmEmail}>{status?.confirmationEmail}</Text> to
                  confirm
                </Text>
                <TextInput
                  style={styles.input}
                  value={confirmEmail}
                  onChangeText={setConfirmEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="your email address"
                  placeholderTextColor={colors.textSecondary}
                  editable={!isDeleting}
                />

                {error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity
                  style={[styles.confirmButton, !matches && styles.confirmButtonDisabled]}
                  onPress={confirmDelete}
                  disabled={!matches || isDeleting}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !matches || isDeleting }}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Delete permanently</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={close}
                  disabled={isDeleting}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    section: {
      marginTop: 24,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    dangerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: DANGER,
      backgroundColor: 'transparent',
    },
    dangerButtonText: { color: DANGER, fontSize: 15, fontWeight: '600' },
    sectionHint: {
      marginTop: 8,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    overlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    card: {
      width: '100%',
      maxHeight: '85%',
      borderRadius: 18,
      padding: 20,
      backgroundColor: colors.cardBg,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    cardTitle: {
      marginLeft: 8,
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    centered: { paddingVertical: 34, alignItems: 'center' },
    body: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
    bullet: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
      marginBottom: 3,
    },
    blockerRow: { flexDirection: 'row', marginTop: 8 },
    blockerBullet: { color: DANGER, marginRight: 6, fontSize: 13 },
    blockerText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
    confirmLabel: {
      marginTop: 18,
      marginBottom: 8,
      fontSize: 13,
      color: colors.text,
    },
    confirmEmail: { fontWeight: '700', color: DANGER },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.inputBg || colors.background,
    },
    errorText: { marginTop: 10, fontSize: 13, color: DANGER },
    confirmButton: {
      marginTop: 16,
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: DANGER,
    },
    confirmButtonDisabled: { opacity: 0.4 },
    confirmButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    cancelButton: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
    cancelText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  });
