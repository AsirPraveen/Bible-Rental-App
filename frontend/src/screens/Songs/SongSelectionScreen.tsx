import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ScrollView, Platform, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Searchbar, Checkbox, Button, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';
import { API_BASE_URL } from '../../config/api';

const BASE_URL = API_BASE_URL;

const SongSelectionScreen = ({ route }: any) => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { initialSelectedSongs } = route?.params || {};

  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Scoped tabs and pagination
  const [activeTab, setActiveTab] = useState<'global' | 'org'>('global');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 20;

  // Selection
  const [selectedSongs, setSelectedSongs] = useState<any[]>([]);

  useEffect(() => {
    if (initialSelectedSongs) {
      setSelectedSongs(initialSelectedSongs);
    }
  }, [initialSelectedSongs]);

  // Layout parameters
  const [sheetTitle, setSheetTitle] = useState('துதிப்பாடல்கள்');
  const [columnCount, setColumnCount] = useState<number>(3);
  const [footerText, setFooterText] = useState('Contact : 9876543210');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');

  const fetchSongs = async (isAppend = false, pageNum = currentPage) => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/songs`, {
        params: {
          search: searchQuery,
          page: pageNum,
          limit: ITEMS_PER_PAGE,
          scope: activeTab
        }
      });
      if (res.data.status === 'Ok') {
        const fetchedList = res.data.data.songs || res.data.data || [];
        const totalP = res.data.data.totalPages || 1;
        const totalC = res.data.data.totalCount || 0;

        if (isAppend) {
          setSongs(prev => [...prev, ...fetchedList]);
        } else {
          setSongs(fetchedList);
        }
        setTotalPages(totalP);
        setTotalCount(totalC);
      }
    } catch (error) {
      console.error('Error fetching songs:', error);
      Alert.alert('Error', 'Failed to fetch songs list');
    } finally {
      setLoading(false);
    }
  };

  // Reset page and overwrite list when search or tab changes
  useEffect(() => {
    setCurrentPage(1);
    fetchSongs(false, 1);
  }, [searchQuery, activeTab]);

  // Load next pages when currentPage increases (append)
  useEffect(() => {
    if (currentPage > 1) {
      fetchSongs(true, currentPage);
    }
  }, [currentPage]);

  const toggleSongSelection = (song: any) => {
    const isSelected = selectedSongs.some(s => s._id === song._id);
    if (isSelected) {
      setSelectedSongs(selectedSongs.filter(s => s._id !== song._id));
    } else {
      setSelectedSongs([...selectedSongs, song]);
    }
  };

  const moveSongOrder = (index: number, direction: 'up' | 'down') => {
    const list = [...selectedSongs];
    if (direction === 'up' && index > 0) {
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
    } else if (direction === 'down' && index < list.length - 1) {
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
    }
    setSelectedSongs(list);
  };

  const handleNextStep = () => {
    if (selectedSongs.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one song first');
      return;
    }
    navigation.navigate('SongPdfGenerator', {
      selectedSongs,
      sheetTitle,
      footerText,
      columnCount,
      orientation
    });
  };

  const loadMoreSongs = () => {
    if (!loading && currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  return (
    <SafeAreaView style={[styles.outerContainer, { backgroundColor: colors.linearGradient?.[0] || '#146C94' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Design PDF Sheet</Text>
      </View>

      <View style={[styles.bodyContainer, { backgroundColor: colors.background }]}>
        <Searchbar
          placeholder="Search songs to add..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: colors.cardBg }]}
          inputStyle={{ color: colors.text }}
          iconColor={colors.textSecondary}
          placeholderTextColor={colors.textSecondary}
          elevation={1}
        />

        {/* Scoped Tabs */}
        <View style={[styles.songsTabContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.songTabBtn, activeTab === 'global' && styles.songTabBtnActive]}
            onPress={() => setActiveTab('global')}
          >
            <Text style={[styles.songTabBtnText, activeTab === 'global' && styles.songTabBtnTextActive, activeTab !== 'global' && { color: colors.textSecondary }]}>Global Songs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.songTabBtn, activeTab === 'org' && styles.songTabBtnActive]}
            onPress={() => setActiveTab('org')}
          >
            <Text style={[styles.songTabBtnText, activeTab === 'org' && styles.songTabBtnTextActive, activeTab !== 'org' && { color: colors.textSecondary }]}>Org Songs</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={songs}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            const isSelected = selectedSongs.some(s => s._id === item._id);
            return (
              <Card 
                style={[
                  styles.songCard, 
                  { backgroundColor: colors.cardBg, borderColor: colors.border },
                  isSelected && styles.songCardSelected
                ]} 
                onPress={() => toggleSongSelection(item)}
              >
                <Card.Content style={styles.cardContent}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.songTitleTamil, { color: isSelected ? '#146C94' : colors.text }]}>{item.titleTamil}</Text>
                    {item.titleEnglish ? <Text style={[styles.songTitleEnglish, { color: colors.textSecondary }]}>{item.titleEnglish}</Text> : null}
                  </View>
                  <Checkbox
                    status={isSelected ? 'checked' : 'unchecked'}
                    onPress={() => toggleSongSelection(item)}
                    color="#146C94"
                    uncheckedColor={colors.textSecondary}
                  />
                </Card.Content>
              </Card>
            );
          }}
          contentContainerStyle={[styles.listContent, selectedSongs.length > 0 && { paddingBottom: 430 }]}
          ListEmptyComponent={
            loading ? (
              <View style={{ marginTop: 60, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#146C94" />
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No songs matching search query.</Text>
            )
          }
          onEndReached={loadMoreSongs}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loading && currentPage > 1 ? (
              <ActivityIndicator size="small" color="#146C94" style={{ paddingVertical: 16 }} />
            ) : null
          }
        />

        {/* Configuration Section at Bottom */}
        {selectedSongs.length > 0 && (
          <View style={[styles.configPanel, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
            <View style={styles.orderRow}>
              <Text style={[styles.orderLabel, { color: colors.text }]}>Arrangement Order ({selectedSongs.length} selected):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.orderScroll}>
                {selectedSongs.map((song, index) => {
                  return (
                    <View key={song._id} style={[styles.orderItem, { backgroundColor: colors.theme === 'dark' ? '#2c2c2c' : '#E6F0FA' }]}>
                      <Text style={[styles.orderItemText, { color: colors.theme === 'dark' ? '#56bdf8' : '#146C94' }]} numberOfLines={1}>
                        {song.titleEnglish || song.titleTamil}
                      </Text>
                      <View style={styles.orderArrows}>
                        <TouchableOpacity onPress={() => moveSongOrder(index, 'up')}>
                          <Ionicons name="caret-back" size={16} color={colors.theme === 'dark' ? '#56bdf8' : '#146C94'} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => moveSongOrder(index, 'down')}>
                          <Ionicons name="caret-forward" size={16} color={colors.theme === 'dark' ? '#56bdf8' : '#146C94'} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            {/* Layout styling inputs */}
            <View style={styles.layoutInputs}>
              <View style={styles.inputRow}>
                <Text style={[styles.layoutLabel, { color: colors.textSecondary }]}>Title:</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.background, color: colors.text }]}
                  value={sheetTitle}
                  onChangeText={setSheetTitle}
                />
              </View>
              <View style={styles.inputRow}>
                <Text style={[styles.layoutLabel, { color: colors.textSecondary }]}>Footer:</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.background, color: colors.text }]}
                  value={footerText}
                  onChangeText={setFooterText}
                />
              </View>
              <View style={styles.inputRow}>
                <Text style={[styles.layoutLabel, { color: colors.textSecondary }]}>Columns:</Text>
                <View style={styles.columnsButtons}>
                  {[1, 2, 3].map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.colBtn, { backgroundColor: colors.background }, columnCount === c && styles.colBtnActive]}
                      onPress={() => setColumnCount(c)}
                    >
                      <Text style={[styles.colBtnText, { color: colors.textSecondary }, columnCount === c && styles.colBtnTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Button
              mode="contained"
              style={styles.generateBtn}
              textColor="#fff"
              onPress={handleNextStep}
            >
              Generate Canvas Design
            </Button>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  bodyContainer: {
    flex: 1,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchBar: {
    margin: 16,
    borderRadius: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  songCard: {
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  songCardSelected: {
    borderColor: '#146C94',
    borderWidth: 1.5,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  songTitleTamil: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  songTitleEnglish: {
    fontSize: 13,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
  configPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 16,
    borderTopWidth: 1,
  },
  orderRow: {
    marginBottom: 12,
  },
  orderLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  orderScroll: {
    flexDirection: 'row',
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    gap: 6,
    maxWidth: 160,
  },
  orderItemText: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  orderArrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  layoutInputs: {
    gap: 8,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  layoutLabel: {
    width: 70,
    fontSize: 13,
    fontWeight: '600',
  },
  textInput: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    fontSize: 14,
  },
  columnsButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  colBtn: {
    width: 44,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  colBtnActive: {
    backgroundColor: '#146C94',
  },
  colBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  colBtnTextActive: {
    color: '#fff',
  },
  generateBtn: {
    backgroundColor: '#146C94',
    borderRadius: 12,
  },
  songsTabContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  songTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  songTabBtnActive: {
    backgroundColor: '#146C94',
  },
  songTabBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  songTabBtnTextActive: {
    color: '#fff',
  }
});

export default SongSelectionScreen;
