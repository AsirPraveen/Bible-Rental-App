import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, StatusBar, SafeAreaView, Text, FlatList, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Chip, Searchbar } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Filter, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import Constants from 'expo-constants';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import LoadingScreen from '../../components/LoadingScreen';
import { useTheme, ColorsType } from '../../context/ThemeContext';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

import { useOrg } from '../../context/OrganizationContext';

export default function SongComponent() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { activeOrg } = useOrg();

  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering states
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const [songbooks, setSongbooks] = useState<string[]>([]);
  const [selectedSongbook, setSelectedSongbook] = useState<string | null>(null);

  const [authors, setAuthors] = useState<string[]>([]);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);

  const [onlyOrgSongs, setOnlyOrgSongs] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Server-side pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 20;

  // Topic search modal states
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<'categories' | 'songbooks' | 'authors'>('categories');
  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  const [songbookSearchQuery, setSongbookSearchQuery] = useState('');
  const [authorSearchQuery, setAuthorSearchQuery] = useState('');

  const [isSongPdfEnabled, setIsSongPdfEnabled] = useState(false);

  const navigation = useNavigation<any>();

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/app-settings`);
      if (res.data.status === 'Success') {
        setIsSongPdfEnabled(res.data.data.features?.SongPdf !== false);
      }
    } catch (err) {
      console.log('Error fetching app settings inside Songs component:', err);
    }
  };

  const fetchMetadata = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/songs-metadata`);
      if (res.data.status === 'Ok') {
        setTopics(res.data.data.topics || []);
        setSongbooks(res.data.data.songbooks || []);
        setAuthors(res.data.data.authors || []);
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  };

  const fetchSongs = async (isRefresh = false, pageNum = currentPage) => {
    try {
      if (!isRefresh) setLoading(true);
      const params: any = {
        search: searchQuery,
        page: pageNum,
        limit: ITEMS_PER_PAGE,
        scope: onlyOrgSongs ? 'org' : 'all'
      };
      if (selectedTopic) params.topic = selectedTopic;
      if (selectedSongbook) params.songbook = selectedSongbook;
      if (selectedAuthor) params.author = selectedAuthor;

      const res = await axios.get(`${API_URL}/api/songs`, { params });
      if (res.data.status === 'Ok') {
        if (res.data.data && res.data.data.songs) {
          setSongs(res.data.data.songs);
          setTotalPages(res.data.data.totalPages || 1);
          setTotalCount(res.data.data.totalCount || 0);
        } else {
          setSongs(res.data.data || []);
          setTotalPages(Math.ceil((res.data.data || []).length / ITEMS_PER_PAGE) || 1);
          setTotalCount((res.data.data || []).length);
        }
      }
    } catch (err) {
      console.error('Error fetching songs:', err);
    } finally {
      setLoading(false);
      if (isRefresh) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
    fetchSettings();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchSettings();
    }, [])
  );

  // Reset currentPage to 1 when filters, search query, or org filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTopic, selectedSongbook, selectedAuthor, onlyOrgSongs]);

  // Fetch songs whenever page, search query, or filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSongs(false, currentPage);
    }, 200); // Debounce search/filter fetch
    return () => clearTimeout(timer);
  }, [currentPage, searchQuery, selectedTopic, selectedSongbook, selectedAuthor, onlyOrgSongs]);

  const onRefresh = () => {
    setIsRefreshing(true);
    setCurrentPage(1);
    fetchSongs(true, 1);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.pageButton, currentPage === 1 && styles.disabledButton]}
          onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          <Text style={styles.pageButtonText}>Previous</Text>
        </TouchableOpacity>

        <Text style={styles.pageIndicator}>
          {currentPage} / {totalPages}
        </Text>

        <TouchableOpacity
          style={[styles.pageButton, currentPage === totalPages && styles.disabledButton]}
          onPress={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          <Text style={styles.pageButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSongItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => navigation.navigate('SongDetails', { songId: item._id })}
    >
      <LinearGradient
        colors={colors.theme === 'dark' ? [colors.cardBg, colors.cardBg] : ['#ffffff', '#f8fdfd']}
        style={styles.songCard}
      >
        <View style={styles.songCardInner}>
          <View style={styles.songIconContainer}>
            <MaterialCommunityIcons name="music-clef-treble" size={24} color={colors.tint} />
          </View>
          <View style={styles.songInfo}>
            <Text style={styles.songTitle} numberOfLines={2}>
              {item.titleTamil ? (item.titleTamil + (item.titleEnglish ? ` (${item.titleEnglish})` : '')) : item.titleEnglish}
            </Text>
            <View style={styles.songMetaRow}>
              {item.author ? (
                <Text style={styles.topicTag} numberOfLines={1}>{item.author}</Text>
              ) : null}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.secondary} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const filteredTopics = topics.filter(t =>
    t.toLowerCase().includes(topicSearchQuery.toLowerCase())
  );

  const filteredSongbooks = songbooks.filter(sb =>
    sb.toLowerCase().includes(songbookSearchQuery.toLowerCase())
  );

  const filteredAuthors = authors.filter(a =>
    a.toLowerCase().includes(authorSearchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.outer_container}>
      {/* Restored Original Header UI */}
      <LinearGradient colors={colors.linearGradient} style={styles.headerBackground}>
        <View style={styles.headerContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 40 }} />
            <Text style={[styles.headerTitle, { marginBottom: 0 }]}>Songs</Text>
            {isSongPdfEnabled ? (
              <TouchableOpacity 
                onPress={() => navigation.navigate('SongSelectionScreen')}
                style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}
              >
                <MaterialCommunityIcons name="file-plus-outline" size={26} color="#fff" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>
          <Searchbar
            placeholder="Search lyrics or titles..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={[styles.searchBar, { backgroundColor: colors.theme === 'dark' ? colors.inputBg : '#fff' }]}
            inputStyle={[styles.searchInput, { color: colors.text }]}
            iconColor={colors.tint}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </LinearGradient>

      {/* Active Filter Pills (Category, Song Book, and/or Author) */}
      {(selectedTopic || selectedSongbook || selectedAuthor) && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedTopic && (
              <View style={styles.filterPill}>
                <Text style={styles.filterPillText}>Category: {selectedTopic}</Text>
                <TouchableOpacity onPress={() => setSelectedTopic(null)}>
                  <X size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            {selectedSongbook && (
              <View style={styles.filterPill}>
                <Text style={styles.filterPillText}>Song Book: {selectedSongbook}</Text>
                <TouchableOpacity onPress={() => setSelectedSongbook(null)}>
                  <X size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            {selectedAuthor && (
              <View style={styles.filterPill}>
                <Text style={styles.filterPillText}>Author: {selectedAuthor}</Text>
                <TouchableOpacity onPress={() => setSelectedAuthor(null)}>
                  <X size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Search count and Org toggle info */}
      <View style={styles.resultsInfoRow}>
        <Text style={styles.resultsCount}>
          {totalCount} {totalCount === 1 ? 'song' : 'songs'} found
        </Text>
        {activeOrg && (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.orgTogglePill, onlyOrgSongs && styles.orgTogglePillActive]}
            onPress={() => setOnlyOrgSongs(!onlyOrgSongs)}
          >
            <MaterialCommunityIcons
              name={onlyOrgSongs ? "checkbox-marked" : "checkbox-blank-outline"}
              size={15}
              color={onlyOrgSongs ? "#fff" : colors.textSecondary}
            />
            <Text style={[styles.orgTogglePillText, onlyOrgSongs && styles.orgTogglePillTextActive]}>
              {activeOrg.name} Songs
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.container}>
        {loading && !isRefreshing ? (
          <LoadingScreen message="Searching library..." />
        ) : (
          <>
            <FlatList
              data={songs}
              keyExtractor={(item) => `song-${item._id}`}
              renderItem={renderSongItem}
              contentContainerStyle={styles.listContent}
              onRefresh={onRefresh}
              refreshing={isRefreshing}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="musical-notes-outline" size={80} color={colors.border} />
                  <Text style={styles.emptyText}>No songs found</Text>
                  <Text style={styles.emptySubtext}>Try a different search or filter</Text>
                </View>
              }
            />
            {songs.length > 0 && renderPagination()}
          </>
        )}
      </View>

      {/* Floating Filter FAB overlay trigger */}
      <TouchableOpacity
        style={styles.floatingFilterButton}
        activeOpacity={0.8}
        onPress={() => setIsFilterModalVisible(true)}
      >
        <Filter size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Premium styled Modal for category & author searches */}
      <Modal
        visible={isFilterModalVisible}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => {
          setTopicSearchQuery('');
          setSongbookSearchQuery('');
          setAuthorSearchQuery('');
          setIsFilterModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Library</Text>
              <TouchableOpacity
                onPress={() => {
                  setTopicSearchQuery('');
                  setSongbookSearchQuery('');
                  setAuthorSearchQuery('');
                  setIsFilterModalVisible(false);
                }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Premium segmented Tab Layout */}
            <View style={styles.modalTabsContainer}>
              <TouchableOpacity
                style={[styles.modalTab, activeFilterTab === 'categories' && styles.modalTabActive]}
                onPress={() => setActiveFilterTab('categories')}
              >
                <Text style={[styles.modalTabText, activeFilterTab === 'categories' && styles.modalTabTextActive]}>Categories</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalTab, activeFilterTab === 'songbooks' && styles.modalTabActive]}
                onPress={() => setActiveFilterTab('songbooks')}
              >
                <Text style={[styles.modalTabText, activeFilterTab === 'songbooks' && styles.modalTabTextActive]}>Song Books</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalTab, activeFilterTab === 'authors' && styles.modalTabActive]}
                onPress={() => setActiveFilterTab('authors')}
              >
                <Text style={[styles.modalTabText, activeFilterTab === 'authors' && styles.modalTabTextActive]}>Authors</Text>
              </TouchableOpacity>
            </View>

            {activeFilterTab === 'categories' && (
              <>
                <Searchbar
                  placeholder="Search categories..."
                  onChangeText={setTopicSearchQuery}
                  value={topicSearchQuery}
                  style={[styles.modalSearchBar, { backgroundColor: colors.theme === 'dark' ? colors.inputBg : '#f0f0f0' }]}
                  inputStyle={{ color: colors.text }}
                  iconColor={colors.tint}
                  placeholderTextColor={colors.textSecondary}
                />

                <ScrollView
                  style={styles.modalScroll}
                  contentContainerStyle={styles.modalChipsGrid}
                  showsVerticalScrollIndicator={false}
                >
                  {filteredTopics.map((topic) => {
                    const isSelected = selectedTopic === topic;
                    return (
                      <TouchableOpacity
                        key={topic}
                        activeOpacity={0.7}
                        style={[
                          styles.modalChip,
                          isSelected && styles.modalChipSelected
                        ]}
                        onPress={() => {
                          setSelectedTopic(topic);
                          setIsFilterModalVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.modalChipText,
                            isSelected && styles.modalChipTextSelected
                          ]}
                          numberOfLines={1}
                        >
                          {topic}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {filteredTopics.length === 0 && (
                    <View style={styles.emptyModalSearch}>
                      <Text style={{ color: colors.textSecondary }}>No categories match your search</Text>
                    </View>
                  )}
                </ScrollView>
              </>
            )}

            {activeFilterTab === 'songbooks' && (
              <>
                <Searchbar
                  placeholder="Search song books..."
                  onChangeText={setSongbookSearchQuery}
                  value={songbookSearchQuery}
                  style={[styles.modalSearchBar, { backgroundColor: colors.theme === 'dark' ? colors.inputBg : '#f0f0f0' }]}
                  inputStyle={{ color: colors.text }}
                  iconColor={colors.tint}
                  placeholderTextColor={colors.textSecondary}
                />

                <ScrollView
                  style={styles.modalScroll}
                  contentContainerStyle={styles.modalChipsGrid}
                  showsVerticalScrollIndicator={false}
                >
                  {filteredSongbooks.map((sb) => {
                    const isSelected = selectedSongbook === sb;
                    return (
                      <TouchableOpacity
                        key={sb}
                        activeOpacity={0.7}
                        style={[
                          styles.modalChip,
                          isSelected && styles.modalChipSelected
                        ]}
                        onPress={() => {
                          setSelectedSongbook(sb);
                          setIsFilterModalVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.modalChipText,
                            isSelected && styles.modalChipTextSelected
                          ]}
                          numberOfLines={1}
                        >
                          {sb}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {filteredSongbooks.length === 0 && (
                    <View style={styles.emptyModalSearch}>
                      <Text style={{ color: colors.textSecondary }}>No song books match your search</Text>
                    </View>
                  )}
                </ScrollView>
              </>
            )}

            {activeFilterTab === 'authors' && (
              <>
                <Searchbar
                  placeholder="Search authors..."
                  onChangeText={setAuthorSearchQuery}
                  value={authorSearchQuery}
                  style={[styles.modalSearchBar, { backgroundColor: colors.theme === 'dark' ? colors.inputBg : '#f0f0f0' }]}
                  inputStyle={{ color: colors.text }}
                  iconColor={colors.tint}
                  placeholderTextColor={colors.textSecondary}
                />

                <ScrollView
                  style={styles.modalScroll}
                  contentContainerStyle={styles.modalChipsGrid}
                  showsVerticalScrollIndicator={false}
                >
                  {filteredAuthors.map((auth) => {
                    const isSelected = selectedAuthor === auth;
                    return (
                      <TouchableOpacity
                        key={auth}
                        activeOpacity={0.7}
                        style={[
                          styles.modalChip,
                          isSelected && styles.modalChipSelected
                        ]}
                        onPress={() => {
                          setSelectedAuthor(auth);
                          setIsFilterModalVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.modalChipText,
                            isSelected && styles.modalChipTextSelected
                          ]}
                          numberOfLines={1}
                        >
                          {auth}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {filteredAuthors.length === 0 && (
                    <View style={styles.emptyModalSearch}>
                      <Text style={{ color: colors.textSecondary }}>No authors match your search</Text>
                    </View>
                  )}
                </ScrollView>
              </>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.modalResetButton}
              onPress={() => {
                setSelectedTopic(null);
                setSelectedSongbook(null);
                setSelectedAuthor(null);
                setTopicSearchQuery('');
                setSongbookSearchQuery('');
                setAuthorSearchQuery('');
                setIsFilterModalVisible(false);
              }}
            >
              <Text style={styles.modalResetButtonText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: ColorsType) => StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: colors.background,
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
    borderRadius: 12,
    height: 50,
  },
  searchInput: {
    fontSize: 16,
  },
  activeFiltersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.background,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  filterPillText: {
    color: '#FFFFFF',
    marginRight: 6,
    fontSize: 14,
  },
  resultsInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsCount: {
    color: colors.tint,
    fontSize: 14,
    fontWeight: '500',
  },
  orgTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  orgTogglePillActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  orgTogglePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  orgTogglePillTextActive: {
    color: '#fff',
  },
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 90, // Room for floating filter button
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
    borderColor: colors.border,
    borderRadius: 16,
  },
  songIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.theme === 'dark' ? colors.inputBg : '#E6F0FA',
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
    color: colors.tint,
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
    backgroundColor: colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
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
    color: colors.tint,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
  },
  pageButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pageButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: colors.theme === 'dark' ? colors.border : '#97CADB',
    opacity: 0.6,
  },
  pageIndicator: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.tint,
  },
  floatingFilterButton: {
    position: 'absolute',
    right: 20,
    bottom: 80, // Anchored nicely above the pagination controls bar
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '75%',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 24,
  },
  modalScroll: {
    flex: 1,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.tint,
  },
  modalTabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.theme === 'dark' ? colors.inputBg : '#f0f0f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  modalTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  modalTabActive: {
    backgroundColor: colors.secondary,
  },
  modalTabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  modalTabTextActive: {
    color: '#fff',
  },
  modalSearchBar: {
    borderRadius: 12,
    height: 48,
    marginBottom: 16,
    elevation: 0,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 8,
  },
  modalChip: {
    backgroundColor: colors.theme === 'dark' ? colors.inputBg : '#f4f4f4',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '28%',
  },
  modalChipSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  modalChipText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  modalChipTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalResetButton: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  modalResetButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyModalSearch: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    width: '100%',
  },
});