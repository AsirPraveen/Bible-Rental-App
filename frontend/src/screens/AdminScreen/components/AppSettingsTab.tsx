import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import axios from 'axios';
import Constants from 'expo-constants';
import { Settings, Gamepad2, Save, Image as LucideImage } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, ColorsType } from '../../../context/ThemeContext';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const AppSettingsTab = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  
  const [isGameEnabled, setIsGameEnabled] = useState(true);
  const [isImageGenEnabled, setIsImageGenEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/app-settings`);
      if (res.data.status === 'Success') {
        setIsGameEnabled(res.data.data.isGameEnabled);
        setIsImageGenEnabled(res.data.data.isImageGenEnabled !== false);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      Alert.alert('Error', 'Failed to load app settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await axios.put(`${API_URL}/api/app-settings`, { isGameEnabled, isImageGenEnabled });
      if (res.data.status === 'Success') {
        Alert.alert('Success', 'App settings updated successfully!');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Error', 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Settings color={colors.primary} size={24} />
        <Text style={styles.title}>Global App Configuration</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <View style={styles.row}>
              <Gamepad2 color={colors.primary} size={20} />
              <Text style={styles.settingLabel}>Bible Card Game</Text>
            </View>
            <Text style={styles.settingDescription}>
              Show or hide the game controller icon on the main Home Screen for all users.
            </Text>
          </View>
          <Switch
            value={isGameEnabled}
            onValueChange={setIsGameEnabled}
            trackColor={{ false: colors.border, true: colors.secondary }}
            thumbColor={isGameEnabled ? colors.primary : colors.background}
          />
        </View>

        <View style={[styles.settingItem, { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.divider }]}>
          <View style={styles.settingTextContainer}>
            <View style={styles.row}>
              <LucideImage color={colors.primary} size={20} />
              <Text style={styles.settingLabel}>AI Image Generation</Text>
            </View>
            <Text style={styles.settingDescription}>
              Enable or disable AI image generation for Bible verses and the generated images tab.
            </Text>
          </View>
          <Switch
            value={isImageGenEnabled}
            onValueChange={setIsImageGenEnabled}
            trackColor={{ false: colors.border, true: colors.secondary }}
            thumbColor={isImageGenEnabled ? colors.primary : colors.background}
          />
        </View>
      </View>

      <TouchableOpacity 
        style={styles.saveButton} 
        onPress={handleSave}
        disabled={saving}
      >
        <LinearGradient
          colors={colors.linearGradient}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {saving ? (
            <ActivityIndicator color={colors.textLight} />
          ) : (
            <View style={styles.btnContent}>
              <Save color={colors.textLight} size={20} />
              <Text style={styles.saveText}>Save Configuration</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
};

const getStyles = (colors: ColorsType) => StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTextContainer: { flex: 1, paddingRight: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  settingLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  settingDescription: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
  gradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  saveText: { color: colors.textLight, fontSize: 16, fontWeight: 'bold' },
});

export default AppSettingsTab;
