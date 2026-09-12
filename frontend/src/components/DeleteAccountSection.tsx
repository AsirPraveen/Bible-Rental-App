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
  featureEnabled: boolean;
  canDelete: boolean;
  blockers: string[];
  confirmationEmail: string;
  gracePeriodDays: number;
  /** Non-null while a deletion request is outstanding. */
  deletionRequestedAt: string | null;
  deletionScheduledFor: string | null;
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
// No onDeleted callback: requesting deletion no longer signs anyone out. The
// account stays usable through the grace period precisely so it can be kept.
export default function DeleteAccountSection() {
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
  const [isCancelling, setIsCancelling] = useState(false);

  // Visibility comes from the SAME endpoint that enforces deletion, not from
  // /api/app-settings. That route resolves only the ACTIVE organization, so a
  // member of two orgs where just one has deletion switched off would have
  // seen the button and then been refused with a 403.
  useEffect(() => {
    let cancelled = false;
    apiClient
      .get('/api/users/account-deletion-status')
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.status === 'Ok' ? res.data.data : null;
        setIsEnabled(!!data && data.featureEnabled !== false);
        // Reuse it when the modal opens, so tapping is instant.
        if (data) setStatus(data);
      })
      // On a network failure, stay hidden rather than offering a control that
      // would fail at the point of use.
      .catch(() => { if (!cancelled) setIsEnabled(false); });
    return () => { cancelled = true; };
  }, []);

  const open = async () => {
    setIsOpen(true);
    setConfirmEmail('');
    setError(null);
    // Only show the spinner when there is nothing cached to show meanwhile.
    setIsChecking(!status);
    try {
      const res = await apiClient.get('/api/users/account-deletion-status');
      if (res.data.status === 'Ok') {
        const fresh = res.data.data;
        setStatus(fresh);
        // Switched off while the screen sat open: hide it again rather than
        // offering a button the server would now refuse.
        if (fresh.featureEnabled === false) {
          setIsEnabled(false);
          setIsOpen(false);
        }
      } else {
        setError('Could not check your account. Please try again.');
      }
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

  const pending = !!status?.deletionScheduledFor;
  const dueDate = status?.deletionScheduledFor
    ? new Date(status.deletionScheduledFor).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '';
  const graceDays = status?.gracePeriodDays ?? 7;

  /** Keeping the account asks nothing and checks nothing. */
  const keepAccount = async () => {
    if (isCancelling) return;
    setIsCancelling(true);
    setError(null);
    try {
      const res = await apiClient.post('/api/users/me/cancel-deletion');
      if (res.data.status === 'Ok') {
        setStatus(status ? { ...status, deletionRequestedAt: null, deletionScheduledFor: null } : null);
        setIsOpen(false);
      } else {
        setError('Could not cancel the deletion. Please try again.');
      }
    } catch {
      setError('Could not cancel the deletion. Please try again.');
    } finally {
      setIsCancelling(false);
    }
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
        // Nothing is erased yet, so the member stays signed in and can still
        // take it back. Reflect the pending state instead of signing them out.
        setStatus(status ? {
          ...status,
          deletionRequestedAt: new Date().toISOString(),
          deletionScheduledFor: res.data.scheduledFor ?? null,
        } : null);
        setConfirmEmail('');
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

        {pending ? (
          <>
            <View style={styles.pendingBox}>
              <Ionicons name="time-outline" size={18} color={DANGER} />
              <Text style={styles.pendingText}>
                Your account is scheduled for deletion on {dueDate}.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.keepButton}
              onPress={keepAccount}
              disabled={isCancelling}
              activeOpacity={0.85}
            >
              {isCancelling
                ? <ActivityIndicator size="small" color={colors.textLight} />
                : <Text style={styles.keepText}>Keep my account</Text>}
            </TouchableOpacity>
            <Text style={styles.sectionHint}>
              Nothing has been removed yet. Keep your account any time before that date
              and the request is forgotten.
            </Text>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.dangerButton} onPress={open} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={18} color={DANGER} style={{ marginRight: 10 }} />
              <Text style={styles.dangerButtonText}>Delete my account</Text>
            </TouchableOpacity>
            <Text style={styles.sectionHint}>
              Your account is kept for {graceDays} days first, so you can change your mind.
              After that it is removed permanently.
            </Text>
          </>
        )}
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
            ) : pending ? (
              <View>
                <Text style={styles.body}>Deletion scheduled</Text>
                <Text style={styles.bullet}>
                  Your account and personal data will be removed on {dueDate}. Until
                  then nothing has changed and you can keep your account.
                </Text>
                <TouchableOpacity
                  style={styles.keepButton}
                  onPress={keepAccount}
                  disabled={isCancelling}
                >
                  {isCancelling
                    ? <ActivityIndicator size="small" color={colors.textLight} />
                    : <Text style={styles.keepText}>Keep my account</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={close}>
                  <Text style={styles.cancelText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.body}>
                  Your account is kept for {graceDays} days, then deleted. This removes:
                </Text>
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
                    <Text style={styles.confirmButtonText}>Schedule deletion</Text>
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
    pendingBox: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      backgroundColor: 'rgba(229, 57, 53, 0.10)',
    },
    pendingText: {
      flex: 1,
      marginLeft: 9,
      fontSize: 13,
      lineHeight: 18,
      color: colors.text,
    },
    keepButton: {
      marginTop: 12,
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: colors.primary,
    },
    keepText: { color: colors.textLight, fontSize: 15, fontWeight: '700' },
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
