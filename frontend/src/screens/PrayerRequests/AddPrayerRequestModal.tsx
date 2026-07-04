import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useTheme, ColorsType } from '../../context/ThemeContext';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

export default function AddPrayerRequestModal({ visible, onClose, onSuccess, currentUserId }: any) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [requestText, setRequestText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [visibility, setVisibility] = useState<'org' | 'public'>('org');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!requestText.trim()) return;

    try {
      setLoading(true);
      const userId = currentUserId || '67c13da8f8d68d19dcaec1a4';
      
      const res = await axios.post(`${BASE_URL}/api/prayer-requests`, {
        user: userId,
        requestText,
        isAnonymous,
        visibility
      });

      if (res.data.status === 'Success') {
        setRequestText('');
        setIsAnonymous(false);
        setVisibility('org');
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error adding prayer request', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Share a Prayer Request</Text>

          <TextInput
            style={styles.input}
            placeholder="What would you like prayer for?"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={5}
            value={requestText}
            onChangeText={setRequestText}
            textAlignVertical="top"
          />

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Post Anonymously</Text>
            <Switch
              value={isAnonymous}
              onValueChange={setIsAnonymous}
              trackColor={{ false: colors.border, true: colors.secondary }}
              thumbColor={isAnonymous ? colors.tint : colors.textSecondary}
            />
          </View>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Make Request Public</Text>
            <Switch
              value={visibility === 'public'}
              onValueChange={(val) => setVisibility(val ? 'public' : 'org')}
              trackColor={{ false: colors.border, true: colors.secondary }}
              thumbColor={visibility === 'public' ? colors.tint : colors.textSecondary}
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading || !requestText.trim()}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Share</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: ColorsType) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.inputBg,
    color: colors.text,
    minHeight: 120,
    marginBottom: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  toggleLabel: {
    fontSize: 16,
    color: colors.text,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
