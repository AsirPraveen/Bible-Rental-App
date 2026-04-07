import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, StatusBar, SafeAreaView, Text, FlatList, TouchableOpacity } from 'react-native';
import { Chip, Searchbar } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import LoadingScreen from '../../components/LoadingScreen';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

export default function SongComponent() {
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const navigation = useNavigation<any>();

  const fetchMetadata = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/songs-metadata`);
      if (res.data.status === 'Ok') {
        setTopics(res.data.data.topics || []);
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  };

  const fetchSongs = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const params: any = { search: searchQuery };
      if (selectedTopic) params.topic = selectedTopic;

      const res = await axios.get(`${API_URL}/api/songs`, { params });
      if (res.data.status === 'Ok') {
        setSongs(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching songs:', err);
    } finally {
      if (isRefresh) setIsRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSongs();
    }, 400); // Debounce search
    return () => clearTimeout(timer);
  }, [searchQuery, selectedTopic]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchSongs(true);
  };

  const renderSongItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => navigation.navigate('SongDetails', { songId: item._id })}
    >
      <LinearGradient
        colors={['#ffffff', '#f8fdfd']}
        style={styles.songCard}
      >
        <View style={styles.songCardInner}>
          <View style={styles.songIconContainer}>
            <MaterialCommunityIcons name="music-clef-treble" size={24} color="#146C94" />
          </View>
          <View style={styles.songInfo}>
            <Text style={styles.songTitle} numberOfLines={2}>
              {item.titleTamil}{item.titleEnglish ? ` (${item.titleEnglish})` : ''}
            </Text>
            <View style={styles.songMetaRow}>
              {item.author ? (
                <Text style={styles.topicTag} numberOfLines={1}>{item.author}</Text>
              ) : null}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#19A7CE" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={['#146C94', '#19A7CE']} style={styles.headerBackground}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Songs</Text>
          <Searchbar
            placeholder="Search lyrics or titles..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            iconColor="#146C94"
            placeholderTextColor="#888"
          />
        </View>
      </LinearGradient>

      <View style={styles.filterSection}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['All', ...topics]}
          keyExtractor={(item) => `topic-${item}`}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <Chip
              selected={selectedTopic === item || (item === 'All' && !selectedTopic)}
              onPress={() => setSelectedTopic(item === 'All' ? null : item)}
              style={[
                styles.chip,
                (selectedTopic === item || (item === 'All' && !selectedTopic)) && styles.chipSelected
              ]}
              textStyle={[
                styles.chipText,
                (selectedTopic === item || (item === 'All' && !selectedTopic)) && styles.chipTextSelected
              ]}
              mode="flat"
            >
              {item}
            </Chip>
          )}
        />
      </View>

      <View style={styles.container}>
        {loading && !isRefreshing ? (
          <LoadingScreen message="Searching library..." />
        ) : (
          <FlatList
            data={songs}
            keyExtractor={(item) => `song-${item._id}`}
            renderItem={renderSongItem}
            contentContainerStyle={styles.listContent}
            onRefresh={onRefresh}
            refreshing={isRefreshing}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="musical-notes-outline" size={80} color="#ccc" />
                <Text style={styles.emptyText}>No songs found</Text>
                <Text style={styles.emptySubtext}>Try a different search or filter</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#F6F1F1',
  },
  headerBackground: {
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  searchBar: {
    elevation: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    height: 50,
  },
  searchInput: {
    fontSize: 16,
    color: '#333',
  },
  filterSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 34,
  },
  chipSelected: {
    backgroundColor: '#146C94',
    borderColor: '#146C94',
  },
  chipText: {
    fontSize: 12,
    color: '#666',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  songCard: {
    borderRadius: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  songCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8F1F5',
    borderRadius: 16,
  },
  songIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E6F0FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#146C94',
    marginBottom: 2,
  },
  songMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topicTag: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#19A7CE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  songSubtitle: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#146C94',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#888',
    marginTop: 8,
  },
});