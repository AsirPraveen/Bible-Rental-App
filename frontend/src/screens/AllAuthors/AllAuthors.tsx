import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  Pressable, 
  FlatList, 
  ActivityIndicator, 
  TextInput,
  Modal,
  ScrollView
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, NavigationProp } from "@react-navigation/native";
import { ArrowLeft, Search, Filter, SortAsc, SortDesc, X } from 'lucide-react-native';
import axios from "axios";
import Constants from 'expo-constants';
import LoadingScreen from '../../components/LoadingScreen';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? '';
type RootStackParamList = {
  AllAuthors: { authors?: any[] };
  AuthorBooks: { id: any };
  // Add other routes if needed
};

const AllAuthors = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<{
    key: string;
    name: string;
    params?: { authors?: any[] };
  }>();
  const [authors, setAuthors] = useState(route.params?.authors || []);
  const [filteredAuthors, setFilteredAuthors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortOption, setSortOption] = useState("none");

  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    if (!authors || authors.length === 0) {
      fetchAuthors();
    }
  }, []);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [authors, searchQuery, sortOption]);

  const fetchAuthors = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/authors`);
      if (res.data.status === 'Ok') {
        setAuthors(res.data.data);
        setFilteredAuthors(res.data.data);
      } else {
        console.error('Error fetching authors:', res.data.data);
      }
    } catch (error) {
      console.error('Error fetching authors:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSearch = () => {
    let result = [...authors];

    // Apply search filter
    if (searchQuery) {
      result = result.filter(author => 
        author.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    if (sortOption === "nameAsc") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "nameDesc") {
      result.sort((a, b) => b.name.localeCompare(a.name));
    }

    setFilteredAuthors(result);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const navigateToAuthorBooks = (authorId: any) => {
    navigation.navigate('AuthorBooks', { id: authorId });
  };

  const getPaginatedData = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredAuthors.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredAuthors.length / ITEMS_PER_PAGE);

  const renderPagination = () => {
    return (
      <View style={styles.paginationContainer}>
        <Pressable 
          style={[styles.pageButton, currentPage === 1 && styles.disabledButton]}
          onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          <Text style={styles.pageButtonText}>Previous</Text>
        </Pressable>
        
        <Text style={styles.pageIndicator}>
          {currentPage} / {totalPages}
        </Text>
        
        <Pressable 
          style={[styles.pageButton, currentPage === totalPages && styles.disabledButton]}
          onPress={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          <Text style={styles.pageButtonText}>Next</Text>
        </Pressable>
      </View>
    );
  };

  const renderFilterModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter & Sort</Text>
              <Pressable onPress={() => setFilterModalVisible(false)}>
                <X size={24} color="#146C94" />
              </Pressable>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.sectionTitle}>Sort By</Text>
              <View style={styles.optionsContainer}>
                <Pressable 
                  style={[styles.optionButton, sortOption === "nameAsc" && styles.activeOption]}
                  onPress={() => setSortOption("nameAsc")}
                >
                  <Text style={styles.optionText}>Name (A-Z)</Text>
                </Pressable>
                <Pressable 
                  style={[styles.optionButton, sortOption === "nameDesc" && styles.activeOption]}
                  onPress={() => setSortOption("nameDesc")}
                >
                  <Text style={styles.optionText}>Name (Z-A)</Text>
                </Pressable>
              </View>
            </ScrollView>
            
            <Pressable 
              style={styles.applyButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  };

  const renderAuthorCard = ({ item }: any) => {
    return (
      <Pressable 
        style={styles.authorCard}
        onPress={() => navigateToAuthorBooks(item.author_id)}
      >
        <Image
          source={{ uri: item.photo || 'https://plus.unsplash.com/premium_photo-1770559520599-881a099cc6e9?q=80&w=1976&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }}
          style={styles.authorPhoto}
        />
        <Text style={styles.authorName}>{item.name}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#146C94" />
        </Pressable>
        <Text style={styles.headerTitle}>All Authors</Text>
        <Pressable style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
          <Filter size={24} color="#146C94" />
        </Pressable>
      </View>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#146C94" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search authors..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#97CADB"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery("")}>
              <X size={20} color="#146C94" />
            </Pressable>
          ) : null}
        </View>
      </View>
      
      {loading ? (
        <LoadingScreen message="Loading authors..." />
      ) : (
        <>
          {sortOption !== "none" && (
            <View style={styles.activeFiltersContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterPill}>
                  <Text style={styles.filterPillText}>
                    {sortOption === "nameAsc" ? "Name (A-Z)" : "Name (Z-A)"}
                  </Text>
                  <Pressable onPress={() => setSortOption("none")}>
                    <X size={16} color="#fff" />
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          )}
          
          <Text style={styles.resultsCount}>
            {filteredAuthors.length} {filteredAuthors.length === 1 ? 'author' : 'authors'} found
          </Text>
          
          <FlatList
            data={getPaginatedData()}
            renderItem={renderAuthorCard}
            keyExtractor={(item) => item.author_id.toString()}
            contentContainerStyle={styles.booksList}
            numColumns={2}
            columnWrapperStyle={styles.bookRow}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No authors found</Text>
                <Pressable 
                  style={styles.resetButton}
                  onPress={() => {
                    setSearchQuery("");
                    setSortOption("none");
                  }}
                >
                  <Text style={styles.resetButtonText}>Reset Filters</Text>
                </Pressable>
              </View>
            }
          />
          
          {filteredAuthors.length > 0 && renderPagination()}
        </>
      )}
      
      {renderFilterModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F8FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#146C94',
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#146C94',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeFiltersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#19A7CE',
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
  resultsCount: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#146C94',
    fontSize: 14,
    fontWeight: '500',
  },
  booksList: {
    padding: 16,
  },
  bookRow: {
    justifyContent: 'space-between',
  },
  authorCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    alignItems: 'center',
    padding: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  authorPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  authorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#146C94',
    textAlign: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  pageButton: {
    backgroundColor: '#19A7CE',
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
    backgroundColor: '#97CADB',
  },
  pageIndicator: {
    fontSize: 14,
    fontWeight: '500',
    color: '#146C94',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#146C94',
  },
  modalBody: {
    padding: 16,
    maxHeight: '90%',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#146C94',
    marginTop: 16,
    marginBottom: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  optionButton: {
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  optionText: {
    fontSize: 14,
    color: '#146C94',
  },
  resetButton: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  resetButtonText: {
    color: '#146C94',
    fontWeight: '500',
  },
  activeOption: {
    backgroundColor: '#19A7CE',
    borderColor: '#19A7CE',
  },
  applyButton: {
    backgroundColor: '#146C94',
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#146C94',
    marginBottom: 16,
  },
});

export default AllAuthors;