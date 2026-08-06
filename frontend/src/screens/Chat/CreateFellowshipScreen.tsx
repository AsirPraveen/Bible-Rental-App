import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  SafeAreaView, Platform, ActivityIndicator, StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Check, Search, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import LoadingScreen from '../../components/LoadingScreen';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const ICONS = ['📖', '🙏', '📢', '⛪', '🕊️', '✝️', '🔥', '💡', '🎵', '👑', '🌿', '💪'];

type OrgMember = {
  _id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
};

export default function CreateFellowshipScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('📖');
  const [type, setType] = useState<'normal' | 'announcement'>('normal');
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/fellowships/org-members`);
        if (res.data.status === 'Ok') {
          // Filter out the current user from the selectable list
          const others = res.data.data.filter((m: OrgMember) => m._id !== user?._id);
          setOrgMembers(others);
        }
      } catch (err) {
        console.error('Error fetching org members:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  const toggleMember = (id: string) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const filteredMembers = orgMembers.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please give your fellowship a name.');
      return;
    }

    setCreating(true);
    try {
      const res = await axios.post(`${API_URL}/api/fellowships`, {
        name: name.trim(),
        description: description.trim(),
        icon: selectedIcon,
        type,
        memberIds: selectedMembers
      });

      if (res.data.status === 'Ok') {
        Alert.alert('✨ Fellowship Gathered!', `"${name}" has been created.`, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create fellowship.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <LinearGradient
        colors={[colors.secondary, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#fff" size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gather a Fellowship</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Name */}
        <View style={[styles.section, { backgroundColor: colors.theme === 'dark' ? colors.surface : '#fff' }]}>
          <Text style={[styles.label, { color: colors.text }]}>Fellowship Name *</Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#F5F7FA',
              color: colors.text,
              borderColor: colors.theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#E0E0E0'
            }]}
            placeholder="e.g., Youth Bible Study"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            maxLength={50}
          />

          <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea, {
              backgroundColor: colors.theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#F5F7FA',
              color: colors.text,
              borderColor: colors.theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#E0E0E0'
            }]}
            placeholder="What is this fellowship about?"
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
        </View>

        {/* Icon Picker */}
        <View style={[styles.section, { backgroundColor: colors.theme === 'dark' ? colors.surface : '#fff' }]}>
          <Text style={[styles.label, { color: colors.text }]}>Choose an Icon</Text>
          <View style={styles.iconGrid}>
            {ICONS.map((icon) => (
              <TouchableOpacity
                key={icon}
                style={[
                  styles.iconOption,
                  selectedIcon === icon && { backgroundColor: colors.secondary + '30', borderColor: colors.secondary }
                ]}
                onPress={() => setSelectedIcon(icon)}
              >
                <Text style={styles.iconText}>{icon}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Type Toggle */}
        <View style={[styles.section, { backgroundColor: colors.theme === 'dark' ? colors.surface : '#fff' }]}>
          <Text style={[styles.label, { color: colors.text }]}>Fellowship Type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[
                styles.typeOption,
                type === 'normal' && { backgroundColor: colors.secondary + '20', borderColor: colors.secondary }
              ]}
              onPress={() => setType('normal')}
            >
              <Text style={styles.typeIcon}>💬</Text>
              <Text style={[styles.typeLabel, { color: type === 'normal' ? colors.secondary : colors.text }]}>
                Open Chat
              </Text>
              <Text style={[styles.typeDesc, { color: colors.textSecondary }]}>Everyone can post</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeOption,
                type === 'announcement' && { backgroundColor: '#FFD700' + '20', borderColor: '#DAA520' }
              ]}
              onPress={() => setType('announcement')}
            >
              <Text style={styles.typeIcon}>📢</Text>
              <Text style={[styles.typeLabel, { color: type === 'announcement' ? '#DAA520' : colors.text }]}>
                Announcement
              </Text>
              <Text style={[styles.typeDesc, { color: colors.textSecondary }]}>Shepherds only</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Member Selection */}
        <View style={[styles.section, { backgroundColor: colors.theme === 'dark' ? colors.surface : '#fff' }]}>
          <Text style={[styles.label, { color: colors.text }]}>
            Add Members ({selectedMembers.length} selected)
          </Text>

          {/* Search */}
          <View style={[styles.searchBar, {
            backgroundColor: colors.theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#F5F7FA',
            borderColor: colors.theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#E0E0E0'
          }]}>
            <Search color={colors.textSecondary} size={16} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search members..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X color={colors.textSecondary} size={16} />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <LoadingScreen variant="transparent" message="Loading members..." />
          ) : (
            <View style={styles.memberList}>
              {filteredMembers.map((member) => {
                const isSelected = selectedMembers.includes(member._id);
                return (
                  <TouchableOpacity
                    key={member._id}
                    style={[
                      styles.memberRow,
                      isSelected && { backgroundColor: colors.secondary + '10' }
                    ]}
                    onPress={() => toggleMember(member._id)}
                  >
                    <View style={[styles.avatarPlaceholder, { backgroundColor: isSelected ? colors.secondary : colors.primary }]}>
                      <Text style={styles.avatarText}>{member.name?.[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, { color: colors.text }]}>{member.name}</Text>
                      <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>{member.email}</Text>
                    </View>
                    <View style={[
                      styles.checkbox,
                      isSelected && { backgroundColor: colors.secondary, borderColor: colors.secondary }
                    ]}>
                      {isSelected && <Check color="#fff" size={14} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
              {filteredMembers.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.textLight }]}>
                  {searchQuery ? 'No members match your search' : 'No other members in this organization'}
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleCreate}
          disabled={creating || !name.trim()}
          style={{ opacity: creating || !name.trim() ? 0.5 : 1 }}
        >
          <LinearGradient
            colors={[colors.secondary, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createBtn}
          >
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createBtnText}>✨ Gather Fellowship</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 14,
  },
  backBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  content: { padding: 16, paddingBottom: 100 },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconOption: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconText: { fontSize: 26 },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeIcon: { fontSize: 28, marginBottom: 6 },
  typeLabel: { fontSize: 13, fontWeight: '700' },
  typeDesc: { fontSize: 11, marginTop: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  memberList: { gap: 2 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberName: { fontSize: 14, fontWeight: '600' },
  memberEmail: { fontSize: 11, marginTop: 1 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { textAlign: 'center', paddingVertical: 20, fontSize: 13 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  createBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
