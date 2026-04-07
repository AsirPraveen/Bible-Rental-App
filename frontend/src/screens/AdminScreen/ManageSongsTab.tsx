import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ScrollView, Modal, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Searchbar, FAB, Chip, IconButton, Button, Card, Divider } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const PREDEFINED_TOPICS = ['Prayercell', 'Chorus', 'Worship', 'Skit Night'];

const ManageSongsTab = () => {
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    titleTamil: '',
    titleEnglish: '',
    lyricsTamil: '',
    lyricsEnglish: '',
    topics: [] as string[],
    author: '',
    youtubeLink: ''
  });
  
  const [newTopic, setNewTopic] = useState('');

  const fetchSongs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/songs`, {
          params: { search: searchQuery, limit: 100 }
      });
      if (res.data.status === 'Ok') {
        setSongs(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching songs:', error);
      Alert.alert('Error', 'Failed to fetch songs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
        fetchSongs();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const openAddModal = () => {
    setEditingSongId(null);
    setFormData({
      titleTamil: '',
      titleEnglish: '',
      lyricsTamil: '',
      lyricsEnglish: '',
      topics: [],
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
            <Text style={styles.cardMetaText}>Author: {item.author || 'Unknown'}</Text>
            <View style={styles.cardTopics}>
                {item.topics.map((t: string, i: number) => (
                    <Text key={i} style={styles.miniTopicTag}>{t}</Text>
                ))}
            </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Songs</Text>
        <Searchbar
          placeholder="Search songs..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          elevation={0}
        />
      </View>

      <FlatList
        data={songs}
        keyExtractor={(item) => item._id}
        renderItem={renderSongItem}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchSongs}
        ListEmptyComponent={
            <Text style={styles.emptyText}>No songs found. Add your first song!</Text>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={openAddModal}
        color="#fff"
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingSongId ? 'Edit Song' : 'Add New Song'}</Text>
            <IconButton icon="close" onPress={() => setModalVisible(false)} />
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
            <Text style={styles.inputLabel}>Tamil Title *</Text>
            <TextInput
              style={styles.input}
              value={formData.titleTamil}
              onChangeText={(text) => setFormData({ ...formData, titleTamil: text })}
              placeholder="e.g. போற்றித் துதிப்போம்"
            />

            <Text style={styles.inputLabel}>English Title</Text>
            <TextInput
              style={styles.input}
              value={formData.titleEnglish}
              onChangeText={(text) => setFormData({ ...formData, titleEnglish: text })}
              placeholder="e.g. Potri Thuthipom"
            />

            <Text style={styles.inputLabel}>Topics * (Select from list or add new)</Text>
            <View style={styles.topicsWrapper}>
                {PREDEFINED_TOPICS.map(topic => (
                    <Chip
                      key={topic}
                      selected={formData.topics.includes(topic)}
                      onPress={() => toggleTopic(topic)}
                      style={styles.formChip}
                      selectedColor="#146C94"
                    >
                      {topic}
                    </Chip>
                ))}
                {formData.topics.filter(t => !PREDEFINED_TOPICS.includes(t)).map(topic => (
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
                />
                <Button mode="contained" onPress={handleAddTopic} style={styles.addBtn}>Add</Button>
            </View>

            <Text style={styles.inputLabel}>Author</Text>
            <TextInput
              style={styles.input}
              value={formData.author}
              onChangeText={(text) => setFormData({ ...formData, author: text })}
              placeholder="e.g. S. J. Berchmans"
            />

            <Text style={styles.inputLabel}>Tamil Lyrics *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.lyricsTamil}
              onChangeText={(text) => setFormData({ ...formData, lyricsTamil: text })}
              multiline
              numberOfLines={6}
              placeholder="Paste Tamil lyrics here..."
            />

            <Text style={styles.inputLabel}>English Lyrics *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.lyricsEnglish}
              onChangeText={(text) => setFormData({ ...formData, lyricsEnglish: text })}
              multiline
              numberOfLines={6}
              placeholder="Paste English transliteration here..."
            />

            <Text style={styles.inputLabel}>YouTube Link</Text>
            <TextInput
              style={styles.input}
              value={formData.youtubeLink}
              onChangeText={(text) => setFormData({ ...formData, youtubeLink: text })}
              placeholder="https://youtu.be/..."
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F1F1',
  },
  header: {
    backgroundColor: '#146C94',
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
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#146C94',
  },
  cardSubTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
  },
  cardMeta: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  cardMetaText: {
    fontSize: 12,
    color: '#888',
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
    backgroundColor: '#19A7CE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#146C94',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#146C94',
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
    color: '#146C94',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F6F1F1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
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
    backgroundColor: '#E6F0FA',
  },
  formChipCustom: {
    backgroundColor: '#19A7CE',
  },
  addTopicContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  miniInput: {
    flex: 1,
    backgroundColor: '#F6F1F1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  addBtn: {
    height: 40,
    justifyContent: 'center',
    backgroundColor: '#146C94',
  },
  submitBtn: {
    marginTop: 24,
    backgroundColor: '#146C94',
    borderRadius: 12,
  },
  submitBtnContent: {
    paddingVertical: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 100,
    color: '#999',
    fontSize: 16,
  }
});

export default ManageSongsTab;
