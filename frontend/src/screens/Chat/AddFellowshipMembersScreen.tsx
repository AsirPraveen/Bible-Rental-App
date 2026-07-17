import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  SafeAreaView, Platform, ActivityIndicator, StatusBar
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Check, Search, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

type OrgMember = {
  _id: string;
  name: string;
  email: string;
  image?: string;
};

export default function AddFellowshipMembersScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { fellowshipId } = route.params || {};

  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [existingMemberIds, setExistingMemberIds] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [membersRes, fellowshipRes] = await Promise.all([
          axios.get(`${API_URL}/api/fellowships/org-members`),
          axios.get(`${API_URL}/api/fellowships/${fellowshipId}`)
        ]);

        if (membersRes.data.status === 'Ok') {
          setOrgMembers(membersRes.data.data);
        }
        if (fellowshipRes.data.status === 'Ok') {
          const existing = fellowshipRes.data.data.members.map((m: any) => m.user._id);
          setExistingMemberIds(existing);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fellowshipId]);

  const availableMembers = orgMembers.filter(m => !existingMemberIds.includes(m._id));
  const filteredMembers = availableMembers.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleMember = (id: string) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleAdd = async () => {
    if (selectedMembers.length === 0) {
      Alert.alert('Select Members', 'Please select at least one member to add.');
      return;
    }

    setAdding(true);
    try {
      await axios.post(`${API_URL}/api/fellowships/${fellowshipId}/members`, {
        userIds: selectedMembers
      });
      Alert.alert('Success', `${selectedMembers.length} member(s) added to the fellowship.`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to add members.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.secondary, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#fff" size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Members</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <View style={styles.content}>
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

        {selectedMembers.length > 0 && (
          <Text style={[styles.selectedCount, { color: colors.secondary }]}>
            {selectedMembers.length} selected
          </Text>
        )}

        {loading ? (
          <ActivityIndicator style={{ paddingVertical: 40 }} color={colors.secondary} />
        ) : (
          <ScrollView style={styles.memberList} keyboardShouldPersistTaps="handled">
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
                  <View style={[styles.avatar, { backgroundColor: isSelected ? colors.secondary : colors.primary }]}>
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
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? 'No matches' : 'All org members are already in this fellowship'}
              </Text>
            )}
          </ScrollView>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleAdd} disabled={adding || selectedMembers.length === 0}
          style={{ opacity: adding || selectedMembers.length === 0 ? 0.5 : 1 }}>
          <LinearGradient
            colors={[colors.secondary, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addBtn}
          >
            {adding ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.addBtnText}>Add {selectedMembers.length} Member(s)</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
  content: { flex: 1, padding: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  selectedCount: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  memberList: { flex: 1 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 2,
  },
  avatar: {
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
  emptyText: { textAlign: 'center', paddingVertical: 30, fontSize: 13 },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  addBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
