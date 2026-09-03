import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ScrollView, Modal, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Searchbar, FAB, Chip, IconButton, Button, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';
import { API_BASE_URL } from '../../config/api';

const BASE_URL = API_BASE_URL;
const PREDEFINED_TOPICS = ['Prayercell', 'Chorus', 'Worship', 'Skit Night'];

const SuperAdminSongsTab = ({ navigation }: any) => {
  const { colors, theme } = useTheme();
  const styles = getStyles(colors, theme);
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);

  // New tab and filters management state
  const [activeTab, setActiveTab] = useState<'songs' | 'categories' | 'songbooks' | 'authors'>('songs');
  const [topicsList, setTopicsList] = useState<any[]>([]);
  const [songbooksList, setSongbooksList] = useState<any[]>([]);
  const [authorsList, setAuthorsList] = useState<any[]>([]);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [filterSearchQuery, setFilterSearchQuery] = useState('');

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

  const fetchDetailedMetadata = async () => {
    try {
      setMetadataLoading(true);
      const res = await axios.get(`${BASE_URL}/api/superadmin/songs-filters-metadata`);
      if (res.data.status === 'Ok') {
        setTopicsList(res.data.data.topics || []);
        setSongbooksList(res.data.data.songbooks || []);
        setAuthorsList(res.data.data.authors || []);
      }
    } catch (err) {
      console.error('Error fetching detailed metadata:', err);
    } finally {
      setMetadataLoading(false);
    }
  };

  const toggleSongAllow = async (id: string) => {
    try {
      const res = await axios.post(`${BASE_URL}/api/superadmin/songs/${id}/toggle-allow`);
      if (res.data.status === 'Ok') {
        setSongs(prevSongs => prevSongs.map(s => s._id === id ? { ...s, allowed: res.data.data.allowed } : s));
      }
    } catch (error) {
      console.error('Error toggling song allow status:', error);
      Alert.alert('Error', 'Failed to toggle song allow status');
    }
  };

  const toggleFilterAllow = async (type: 'topic' | 'songbook' | 'author', id: string) => {
    try {
      const res = await axios.post(`${BASE_URL}/api/superadmin/songs-filters-metadata/toggle-allow`, { type, id });
      if (res.data.status === 'Ok') {
        if (type === 'topic') {
          setTopicsList(prev => prev.map(item => item._id === id ? { ...item, allowed: res.data.data.allowed } : item));
        } else if (type === 'songbook') {
          setSongbooksList(prev => prev.map(item => item._id === id ? { ...item, allowed: res.data.data.allowed } : item));
        } else if (type === 'author') {
          setAuthorsList(prev => prev.map(item => item._id === id ? { ...item, allowed: res.data.data.allowed } : item));
        }
      }
    } catch (error) {
      console.error('Error toggling filter allow status:', error);
      Alert.alert('Error', 'Failed to toggle status');
    }
  };

  const fetchGlobalSongs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/superadmin/songs`, {
        params: { search: searchQuery }
      });
      if (res.data.status === 'Ok') {
        if (res.data.data && res.data.data.songs) {
          setSongs(res.data.data.songs);
        } else {
          setSongs(res.data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching global songs:', error);
      Alert.alert('Error', 'Failed to fetch global songs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
    fetchDetailedMetadata();
  }, []);

  useEffect(() => {
    if (activeTab === 'songs') {
      const timer = setTimeout(() => {
        fetchGlobalSongs();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, activeTab]);

  useEffect(() => {
    if (activeTab !== 'songs') {
      fetchDetailedMetadata();
    }
  }, [activeTab]);

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
        await axios.put(`${BASE_URL}/api/superadmin/songs/${editingSongId}`, formData);
        Alert.alert('Success', 'Global song updated');
      } else {
        await axios.post(`${BASE_URL}/api/superadmin/songs`, formData);
        Alert.alert('Success', 'Global song created');
      }
      setModalVisible(false);
      fetchGlobalSongs();
      fetchMetadata();
    } catch (error) {
      console.error('Error saving global song:', error);
      Alert.alert('Error', 'Failed to save global song');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Global Song',
      'Are you sure you want to delete this global song? This will remove it from all associated organizations.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${BASE_URL}/api/superadmin/songs/${id}`);
              fetchGlobalSongs();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete global song');
            }
          }
        }
      ]
    );
  };

  const filteredTopicsList = topicsList.filter(item =>
    item.name && item.name.toLowerCase().includes(filterSearchQuery.toLowerCase())
  );
  const filteredSongbooksList = songbooksList.filter(item =>
    item.name && item.name.toLowerCase().includes(filterSearchQuery.toLowerCase())
  );
  const filteredAuthorsList = authorsList.filter(item =>
    item.name && item.name.toLowerCase().includes(filterSearchQuery.toLowerCase())
  );

  const renderSongItem = ({ item }: { item: any }) => (
    <Card style={styles.songCard}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>{item.titleTamil}</Text>
            {item.titleEnglish ? <Text style={styles.cardSubTitle}>{item.titleEnglish}</Text> : null}
          </View>
          <View style={styles.cardActions}>
            <IconButton icon="pencil" size={20} onPress={() => openEditModal(item)} />
            <IconButton icon="delete" size={20} iconColor="#FF6B6B" onPress={() => handleDelete(item._id)} />
          </View>
        </View>
        <View style={styles.cardMeta}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={styles.cardMetaText}>Author: {item.author || 'Unknown'}</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.allowToggleBtn,
                item.allowed !== false ? styles.allowToggleBtnActive : styles.allowToggleBtnBlocked
              ]}
              onPress={() => toggleSongAllow(item._id)}
            >
              <Text
                style={[
                  styles.allowToggleBtnText,
                  { color: item.allowed !== false ? '#059669' : '#DC2626' }
                ]}
              >
                {item.allowed !== false ? 'Allowed' : 'Blocked'}
              </Text>
            </TouchableOpacity>
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

  const renderMetadataItem = (item: any, type: 'topic' | 'songbook' | 'author') => (
    <Card style={styles.songCard}>
      <Card.Content>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.allowToggleBtn,
              item.allowed !== false ? styles.allowToggleBtnActive : styles.allowToggleBtnBlocked
            ]}
            onPress={() => toggleFilterAllow(type, item._id)}
          >
            <Text
              style={[
                styles.allowToggleBtnText,
                { color: item.allowed !== false ? '#059669' : '#DC2626' }
              ]}
            >
              {item.allowed !== false ? 'Allowed' : 'Blocked'}
            </Text>
          </TouchableOpacity>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Global Songs</Text>
        </View>
        <Searchbar
          placeholder={
            activeTab === 'songs' ? "Search global songs..." :
              activeTab === 'categories' ? "Search categories..." :
                activeTab === 'songbooks' ? "Search song books..." : "Search authors..."
          }
          placeholderTextColor={colors.textSecondary}
          iconColor={colors.textSecondary}
          inputStyle={{ color: colors.text }}
          onChangeText={(text) => {
            if (activeTab === 'songs') {
              setSearchQuery(text);
            } else {
              setFilterSearchQuery(text);
            }
          }}
          value={activeTab === 'songs' ? searchQuery : filterSearchQuery}
          style={styles.searchBar}
          elevation={0}
        />

        {/* Tab Switcher */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabScrollContent}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.tabButton, activeTab === 'songs' && styles.tabButtonActive]}
            onPress={() => { setActiveTab('songs'); setFilterSearchQuery(''); }}
          >
            <Text style={[styles.tabButtonText, activeTab === 'songs' && styles.tabButtonTextActive]}>Songs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.tabButton, activeTab === 'categories' && styles.tabButtonActive]}
            onPress={() => { setActiveTab('categories'); setFilterSearchQuery(''); }}
          >
            <Text style={[styles.tabButtonText, activeTab === 'categories' && styles.tabButtonTextActive]}>Categories</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.tabButton, activeTab === 'songbooks' && styles.tabButtonActive]}
            onPress={() => { setActiveTab('songbooks'); setFilterSearchQuery(''); }}
          >
            <Text style={[styles.tabButtonText, activeTab === 'songbooks' && styles.tabButtonTextActive]}>Song Books</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.tabButton, activeTab === 'authors' && styles.tabButtonActive]}
            onPress={() => { setActiveTab('authors'); setFilterSearchQuery(''); }}
          >
            <Text style={[styles.tabButtonText, activeTab === 'authors' && styles.tabButtonTextActive]}>Authors</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {activeTab === 'songs' ? (
        <FlatList
          data={songs}
          keyExtractor={(item) => item._id}
          renderItem={renderSongItem}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={fetchGlobalSongs}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No global songs found. Add the first one!</Text>
          }
        />
      ) : activeTab === 'categories' ? (
        <FlatList
          data={filteredTopicsList}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => renderMetadataItem(item, 'topic')}
          contentContainerStyle={styles.listContent}
          refreshing={metadataLoading}
          onRefresh={fetchDetailedMetadata}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No categories found.</Text>
          }
        />
      ) : activeTab === 'songbooks' ? (
        <FlatList
          data={filteredSongbooksList}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => renderMetadataItem(item, 'songbook')}
          contentContainerStyle={styles.listContent}
          refreshing={metadataLoading}
          onRefresh={fetchDetailedMetadata}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No song books found.</Text>
          }
        />
      ) : (
        <FlatList
          data={filteredAuthorsList}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => renderMetadataItem(item, 'author')}
          contentContainerStyle={styles.listContent}
          refreshing={metadataLoading}
          onRefresh={fetchDetailedMetadata}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No authors found.</Text>
          }
        />
      )}

      {activeTab === 'songs' && (
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
            <Text style={styles.modalTitle}>{editingSongId ? 'Edit Global Song' : 'Add New Global Song'}</Text>
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
              {editingSongId ? 'Update Global Song' : 'Create Global Song'}
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchBar: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    height: 44,
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
    alignItems: 'flex-start',
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
    backgroundColor: colors.tint,
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
    backgroundColor: theme === 'dark' ? colors.border : '#E2F7F0',
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
  },
  tabScroll: {
    marginTop: 12,
    flexDirection: 'row',
  },
  tabScrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  tabButtonActive: {
    backgroundColor: '#fff',
  },
  tabButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tabButtonTextActive: {
    color: colors.primary,
  },
  allowToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  allowToggleBtnActive: {
    backgroundColor: '#E2F7F0',
  },
  allowToggleBtnBlocked: {
    backgroundColor: '#FFEBEB',
  },
  allowToggleBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  }
});

export default SuperAdminSongsTab;
