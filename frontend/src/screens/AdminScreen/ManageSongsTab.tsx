import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ScrollView, Modal, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Searchbar, FAB, Chip, IconButton, Button, Card, Divider } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import { useOrg } from '../../context/OrganizationContext';
import { useTheme } from '../../context/ThemeContext';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const PREDEFINED_TOPICS = ['Prayercell', 'Chorus', 'Worship', 'Skit Night'];

const ManageSongsTab = () => {
  const { colors, theme } = useTheme();
  const styles = getStyles(colors, theme);
  const { activeOrg } = useOrg();
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'org' | 'global'>('org');

  // Form State
  const [formData, setFormData] = useState({
    titleTamil: '',
    titleEnglish: '',
    lyricsTamil: '',
    lyricsEnglish: '',
    topics: [] as string[],
    songbooks: [] as string[],
    author: '',
    youtubeLink: ''
  });

  const [newTopic, setNewTopic] = useState('');
  const [newSongbook, setNewSongbook] = useState('');
  const [existingMetadata, setExistingMetadata] = useState<{
    topics: string[];
    songbooks: string[];
    authors: string[];
  }>({ topics: [], songbooks: [], authors: [] });

  const fetchMetadata = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/songs-metadata`);
      if (res.data.status === 'Ok') {
        setExistingMetadata(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  };

  const fetchSongs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/songs`, {
        params: {
          search: searchQuery,
          scope: activeTab,
          page: 1,
          limit: 100
        }
      });
      if (res.data.status === 'Ok') {
        if (res.data.data && res.data.data.songs) {
          setSongs(res.data.data.songs);
        } else {
          setSongs(res.data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching songs:', error);
      Alert.alert('Error', 'Failed to fetch songs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSongs();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  const handleAddTopic = () => {
    if (newTopic.trim()) {
      if (!formData.topics.includes(newTopic.trim())) {
        setFormData({ ...formData, topics: [...formData.topics, newTopic.trim()] });
      }
      setNewTopic('');
    }
  };

  const toggleTopic = (topic: string) => {
    if (formData.topics.includes(topic)) {
      setFormData({ ...formData, topics: formData.topics.filter(t => t !== topic) });
    } else {
      setFormData({ ...formData, topics: [...formData.topics, topic] });
    }
  };

  const handleAddSongbook = () => {
    if (newSongbook.trim()) {
      if (!formData.songbooks.includes(newSongbook.trim())) {
        setFormData({ ...formData, songbooks: [...formData.songbooks, newSongbook.trim()] });
      }
      setNewSongbook('');
    }
  };

  const toggleSongbook = (sb: string) => {
    if (formData.songbooks.includes(sb)) {
      setFormData({ ...formData, songbooks: formData.songbooks.filter(s => s !== sb) });
    } else {
      setFormData({ ...formData, songbooks: [...formData.songbooks, sb] });
    }
  };

  const openAddModal = () => {
    setEditingSongId(null);
    setFormData({
      titleTamil: '',
      titleEnglish: '',
      lyricsTamil: '',
      lyricsEnglish: '',
      topics: [],
      songbooks: [],
      author: '',
      youtubeLink: ''
    });
    setModalVisible(true);
  };

  const openEditModal = (song: any) => {
    setEditingSongId(song._id);
    setFormData({
      titleTamil: song.titleTamil,
      titleEnglish: song.titleEnglish || '',
      lyricsTamil: song.lyricsTamil,
      lyricsEnglish: song.lyricsEnglish,
      topics: song.topics || [],
      songbooks: song.songbooks || [],
      author: song.author || '',
      youtubeLink: song.youtubeLink || ''
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.titleTamil || !formData.lyricsTamil || formData.topics.length === 0) {
      Alert.alert('Error', 'Please fill in basic Tamil info and at least one topic');
      return;
    }

    try {
      if (editingSongId) {
        await axios.put(`${BASE_URL}/api/songs/${editingSongId}`, formData);
        Alert.alert('Success', 'Song updated');
      } else {
        await axios.post(`${BASE_URL}/api/songs`, formData);
        Alert.alert('Success', 'Song added');
      }
      setModalVisible(false);
      fetchSongs();
      fetchMetadata();
    } catch (error) {
      console.error('Error saving song:', error);
      Alert.alert('Error', 'Failed to save song');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Song',
      'Are you sure you want to delete this song?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${BASE_URL}/api/songs/${id}`);
              fetchSongs();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete song');
            }
          }
        }
      ]
    );
  };

  const toggleOrgAssociation = async (songId: string) => {
    try {
      const res = await axios.post(`${BASE_URL}/api/songs/${songId}/toggle-org`);
      if (res.data.status === 'Ok') {
        Alert.alert('Success', 'Organization association updated');
        fetchSongs();
      }
    } catch (error) {
      console.error('Error toggling organization association:', error);
      Alert.alert('Error', 'Failed to toggle association');
    }
  };

  const renderSongItem = ({ item }: { item: any }) => {
    const isAddedToOrg = item.organizations && activeOrg && item.organizations.includes(activeOrg._id);

    return (
      <Card style={styles.songCard}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Text style={styles.cardTitle}>{item.titleTamil}</Text>
              {item.titleEnglish ? <Text style={styles.cardSubTitle}>{item.titleEnglish}</Text> : null}
            </View>
            <View style={styles.cardActions}>
              {item.isGlobal ? (
                <Button
                  mode={isAddedToOrg ? "contained" : "outlined"}
                  compact
                  onPress={() => toggleOrgAssociation(item._id)}
                  style={styles.associationBtn}
                  labelStyle={styles.associationBtnLabel}
                  buttonColor={isAddedToOrg ? "#E64848" : undefined}
                  textColor={isAddedToOrg ? "#fff" : colors.tint}
                >
                  {isAddedToOrg ? "Remove" : "Add to Org"}
                </Button>
              ) : (
                <>
                  <IconButton icon="pencil" size={20} iconColor={colors.tint} onPress={() => openEditModal(item)} />
                  <IconButton icon="delete" size={20} iconColor="#FF6B6B" onPress={() => handleDelete(item._id)} />
                </>
              )}
            </View>
          </View>
          <View style={styles.cardMeta}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.cardMetaText}>Author: {item.author || 'Unknown'}</Text>
              {item.isGlobal && (
                <Chip compact style={styles.globalChip} textStyle={styles.globalChipText}>Global</Chip>
              )}
            </View>
            <View style={styles.cardTopics}>
              {item.topics.map((t: string, i: number) => (
                <Text key={i} style={styles.miniTopicTag}>{t}</Text>
              ))}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Songs</Text>
        <Searchbar
          placeholder="Search songs..."
          placeholderTextColor={colors.textSecondary}
          iconColor={colors.textSecondary}
          inputStyle={{ color: colors.text }}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          elevation={0}
        />
      </View>

      {/* Tabs Selector */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'org' && styles.tabButtonActive]}
          onPress={() => setActiveTab('org')}
        >
          <Text style={[styles.tabText, activeTab === 'org' && styles.tabTextActive]}>
            {activeOrg ? `${activeOrg.name} Songs` : 'Org Songs'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'global' && styles.tabButtonActive]}
          onPress={() => setActiveTab('global')}
        >
          <Text style={[styles.tabText, activeTab === 'global' && styles.tabTextActive]}>
            Global Songs
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={songs}
        keyExtractor={(item) => item._id}
        renderItem={renderSongItem}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchSongs}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {activeTab === 'org'
              ? 'No organization-specific songs found. Add one or associate global songs!'
              : 'No global songs found.'}
          </Text>
        }
      />

      {/* FAB to add a new song is only shown for the 'org' tab */}
      {activeTab === 'org' && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={openAddModal}
          color="#fff"
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingSongId ? 'Edit Song' : 'Add New Song'}</Text>
            <IconButton icon="close" iconColor={colors.text} onPress={() => setModalVisible(false)} />
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
            <Text style={styles.inputLabel}>Tamil Title *</Text>
            <TextInput
              style={styles.input}
              value={formData.titleTamil}
              onChangeText={(text) => setFormData({ ...formData, titleTamil: text })}
              placeholder="e.g. போற்றித் துதிப்போம்"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.inputLabel}>English Title</Text>
            <TextInput
              style={styles.input}
              value={formData.titleEnglish}
              onChangeText={(text) => setFormData({ ...formData, titleEnglish: text })}
              placeholder="e.g. Potri Thuthipom"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.inputLabel}>Topics * (Select from list or add new)</Text>
            <View style={styles.topicsWrapper}>
              {Array.from(new Set([...PREDEFINED_TOPICS, ...(existingMetadata.topics || []).map(t => t?.trim()).filter(Boolean)])).map(topic => (
                <Chip
                  key={topic}
                  selected={formData.topics.includes(topic)}
                  onPress={() => toggleTopic(topic)}
                  style={styles.formChip}
                  selectedColor={colors.tint}
                >
                  {topic}
                </Chip>
              ))}
              {formData.topics.filter(t => !PREDEFINED_TOPICS.includes(t) && !(existingMetadata.topics || []).includes(t)).map(topic => (
                <Chip
                  key={topic}
                  selected={true}
                  onPress={() => toggleTopic(topic)}
                  style={styles.formChipCustom}
                  selectedColor="#fff"
                >
                  {topic}
                </Chip>
              ))}
            </View>
            <View style={styles.addTopicContainer}>
              <TextInput
                style={styles.miniInput}
                value={newTopic}
                onChangeText={setNewTopic}
                placeholder="Type new topic..."
                placeholderTextColor={colors.textSecondary}
              />
              <Button mode="contained" onPress={handleAddTopic} style={styles.addBtn}>Add</Button>
            </View>

            <Text style={styles.inputLabel}>Songbooks (Select from list or add new)</Text>
            <View style={styles.topicsWrapper}>
              {(existingMetadata.songbooks || []).map(sb => (
                <Chip
                  key={sb}
                  selected={formData.songbooks.includes(sb)}
                  onPress={() => toggleSongbook(sb)}
                  style={styles.formChip}
                  selectedColor={colors.tint}
                >
                  {sb}
                </Chip>
              ))}
              {formData.songbooks.filter(sb => !(existingMetadata.songbooks || []).includes(sb)).map(sb => (
                <Chip
                  key={sb}
                  selected={true}
                  onPress={() => toggleSongbook(sb)}
                  style={styles.formChipCustom}
                  selectedColor="#fff"
                >
                  {sb}
                </Chip>
              ))}
            </View>
            <View style={styles.addTopicContainer}>
              <TextInput
                style={styles.miniInput}
                value={newSongbook}
                onChangeText={setNewSongbook}
                placeholder="Type new songbook..."
                placeholderTextColor={colors.textSecondary}
              />
              <Button mode="contained" onPress={handleAddSongbook} style={styles.addBtn}>Add</Button>
            </View>

            <Text style={styles.inputLabel}>Author</Text>
            {existingMetadata.authors && existingMetadata.authors.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={styles.subLabel}>Or select from existing authors:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                  {existingMetadata.authors.map(authorName => {
                    const isSelected = formData.author === authorName;
                    return (
                      <Chip
                        key={authorName}
                        selected={isSelected}
                        onPress={() => setFormData({ ...formData, author: isSelected ? '' : authorName })}
                        style={styles.formChip}
                        selectedColor={colors.tint}
                      >
                        {authorName}
                      </Chip>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            <TextInput
              style={styles.input}
              value={formData.author}
              onChangeText={(text) => setFormData({ ...formData, author: text })}
              placeholder="e.g. S. J. Berchmans"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.inputLabel}>Tamil Lyrics *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.lyricsTamil}
              onChangeText={(text) => setFormData({ ...formData, lyricsTamil: text })}
              multiline
              numberOfLines={6}
              placeholder="Paste Tamil lyrics here..."
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.inputLabel}>English Lyrics *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.lyricsEnglish}
              onChangeText={(text) => setFormData({ ...formData, lyricsEnglish: text })}
              multiline
              numberOfLines={6}
              placeholder="Paste English transliteration here..."
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.inputLabel}>YouTube Link</Text>
            <TextInput
              style={styles.input}
              value={formData.youtubeLink}
              onChangeText={(text) => setFormData({ ...formData, youtubeLink: text })}
              placeholder="https://youtu.be/..."
              placeholderTextColor={colors.textSecondary}
            />

            <Button
              mode="contained"
              onPress={handleSubmit}
              style={styles.submitBtn}
              contentStyle={styles.submitBtnContent}
            >
              {editingSongId ? 'Update Song' : 'Create Song'}
            </Button>
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const getStyles = (colors: any, theme: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 16,
    paddingTop: 8,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  searchBar: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    height: 44,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme === 'dark' ? colors.surface : '#E6F0FA',
    margin: 16,
    marginBottom: 4,
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: colors.tint,
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  songCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: colors.surface,
    borderWidth: theme === 'dark' ? 1 : 0,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.tint,
  },
  cardSubTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  associationBtn: {
    borderRadius: 8,
  },
  associationBtnLabel: {
    fontSize: 11,
    marginHorizontal: 8,
  },
  globalChip: {
    backgroundColor: theme === 'dark' ? colors.border : '#E6F0FA',
    height: 24,
    justifyContent: 'center',
  },
  globalChipText: {
    fontSize: 10,
    color: colors.tint,
    fontWeight: 'bold',
  },
  cardMeta: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  cardMetaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardTopics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 6,
  },
  miniTopicTag: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: colors.secondary || '#19A7CE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: colors.tint,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.tint,
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.tint,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  topicsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  formChip: {
    backgroundColor: theme === 'dark' ? colors.border : '#E6F0FA',
  },
  formChipCustom: {
    backgroundColor: colors.tint,
  },
  addTopicContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  miniInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  addBtn: {
    height: 40,
    justifyContent: 'center',
    backgroundColor: colors.tint,
  },
  submitBtn: {
    marginTop: 24,
    backgroundColor: colors.tint,
    borderRadius: 12,
  },
  submitBtnContent: {
    paddingVertical: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 100,
    color: colors.textSecondary,
    fontSize: 16,
  },
  subLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  horizontalScroll: {
    flexDirection: 'row',
  }
});

export default ManageSongsTab;
