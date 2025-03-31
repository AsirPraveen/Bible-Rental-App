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
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, Search, Filter, SortAsc, SortDesc, X, Star } from 'lucide-react-native';
import axios from "axios";

const AllBooks = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [books, setBooks] = useState(route.params?.books || []);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortOption, setSortOption] = useState("none");
  const [activeFilters, setActiveFilters] = useState({
    year: null,
    rating: null,
    pages: null
  });
  
  const ITEMS_PER_PAGE = 6;

  // Fetch books if they weren't passed through route params
  useEffect(() => {
    if (!books || books.length === 0) {
      fetchBooks();
    }
  }, []);

  // Apply filters and search whenever books, searchQuery, or activeFilters change
  useEffect(() => {
    applyFiltersAndSearch();
  }, [books, searchQuery, activeFilters, sortOption]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://192.168.29.46:5001/api/books');
      setBooks(res.data.data);
      setFilteredBooks(res.data.data);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSearch = () => {
    let result = [...books];
    
    // Apply search filter
    if (searchQuery) {
      result = result.filter(book => 
        book.book_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply year filter
    if (activeFilters.year) {
      result = result.filter(book => {
        const year = parseInt(book.year_of_publication);
        return year >= activeFilters.year[0] && year <= activeFilters.year[1];
      });
    }
    
    // Apply rating filter
    if (activeFilters.rating) {
      result = result.filter(book => {
        const rating = book.rating || 0;
        return rating >= activeFilters.rating;
      });
    }
    
    // Apply page filter
    if (activeFilters.pages) {
      result = result.filter(book => {
        const pages = book.pages || 0;
        return pages >= activeFilters.pages[0] && pages <= activeFilters.pages[1];
      });
    }
    
    // Apply sorting
    if (sortOption === "titleAsc") {
      result.sort((a, b) => a.book_name.localeCompare(b.book_name));
    } else if (sortOption === "titleDesc") {
      result.sort((a, b) => b.book_name.localeCompare(a.book_name));
    } else if (sortOption === "yearAsc") {
      result.sort((a, b) => (a.year_of_publication || 0) - (b.year_of_publication || 0));
    } else if (sortOption === "yearDesc") {
      result.sort((a, b) => (b.year_of_publication || 0) - (a.year_of_publication || 0));
    } else if (sortOption === "ratingDesc") {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    
    setFilteredBooks(result);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const navigateToBookDetails = (book) => {
    navigation.navigate('BookDetails', { book: book });
  };

  const getPaginatedData = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredBooks.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredBooks.length / ITEMS_PER_PAGE);

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
              {/* Sort Options */}
              <Text style={styles.sectionTitle}>Sort By</Text>
              <View style={styles.optionsContainer}>
                <Pressable 
                  style={[styles.optionButton, sortOption === "titleAsc" && styles.activeOption]}
                  onPress={() => setSortOption("titleAsc")}
                >
                  <Text style={styles.optionText}>Title (A-Z)</Text>
                </Pressable>
                <Pressable 
                  style={[styles.optionButton, sortOption === "titleDesc" && styles.activeOption]}
                  onPress={() => setSortOption("titleDesc")}
                >
                  <Text style={styles.optionText}>Title (Z-A)</Text>
                </Pressable>
                <Pressable 
                  style={[styles.optionButton, sortOption === "yearAsc" && styles.activeOption]}
                  onPress={() => setSortOption("yearAsc")}
                >
                  <Text style={styles.optionText}>Year (Oldest)</Text>
                </Pressable>
                <Pressable 
                  style={[styles.optionButton, sortOption === "yearDesc" && styles.activeOption]}
                  onPress={() => setSortOption("yearDesc")}
                >
                  <Text style={styles.optionText}>Year (Newest)</Text>
                </Pressable>
                <Pressable 
                  style={[styles.optionButton, sortOption === "ratingDesc" && styles.activeOption]}
                  onPress={() => setSortOption("ratingDesc")}
                >
                  <Text style={styles.optionText}>Rating (High to Low)</Text>
                </Pressable>
              </View>
              
              {/* Rating Filter */}
              <Text style={styles.sectionTitle}>Rating</Text>
              <View style={styles.ratingOptions}>
                {[5, 4, 3, 2, 1].map(rating => (
                  <Pressable 
                    key={rating}
                    style={[
                      styles.ratingButton, 
                      activeFilters.rating === rating && styles.activeRatingButton
                    ]}
                    onPress={() => setActiveFilters(prev => ({
                      ...prev, 
                      rating: prev.rating === rating ? null : rating
                    }))}
                  >
                    <Text style={styles.ratingButtonText}>
                      {rating}+ <Star size={12} color={activeFilters.rating === rating ? "#fff" : "#146C94"} />
                    </Text>
                  </Pressable>
                ))}
              </View>
              
              {/* Year Filter */}
              <Text style={styles.sectionTitle}>Published Year</Text>
              <View style={styles.optionsContainer}>
                <Pressable 
                  style={[styles.optionButton, activeFilters.year && activeFilters.year[0] === 2000 && styles.activeOption]}
                  onPress={() => setActiveFilters(prev => ({
                    ...prev, 
                    year: prev.year && prev.year[0] === 2000 ? null : [2000, 2025]
                  }))}
                >
                  <Text style={styles.optionText}>2000 - 2025</Text>
                </Pressable>
                <Pressable 
                  style={[styles.optionButton, activeFilters.year && activeFilters.year[0] === 1980 && styles.activeOption]}
                  onPress={() => setActiveFilters(prev => ({
                    ...prev, 
                    year: prev.year && prev.year[0] === 1980 ? null : [1980, 1999]
                  }))}
                >
                  <Text style={styles.optionText}>1980 - 1999</Text>
                </Pressable>
                <Pressable 
                  style={[styles.optionButton, activeFilters.year && activeFilters.year[0] === 1900 && styles.activeOption]}
                  onPress={() => setActiveFilters(prev => ({
                    ...prev, 
                    year: prev.year && prev.year[0] === 1900 ? null : [1900, 1979]
                  }))}
                >
                  <Text style={styles.optionText}>Before 1980</Text>
                </Pressable>
              </View>
              
              {/* Pages Filter */}
              <Text style={styles.sectionTitle}>Number of Pages</Text>
              <View style={styles.optionsContainer}>
                <Pressable 
                  style={[styles.optionButton, activeFilters.pages && activeFilters.pages[0] === 0 && styles.activeOption]}
                  onPress={() => setActiveFilters(prev => ({
                    ...prev, 
                    pages: prev.pages && prev.pages[0] === 0 ? null : [0, 200]
                  }))}
                >
                  <Text style={styles.optionText}>Less than 200</Text>
                </Pressable>
                <Pressable 
                  style={[styles.optionButton, activeFilters.pages && activeFilters.pages[0] === 200 && styles.activeOption]}
                  onPress={() => setActiveFilters(prev => ({
                    ...prev, 
                    pages: prev.pages && prev.pages[0] === 200 ? null : [200, 400]
                  }))}
                >
                  <Text style={styles.optionText}>200 - 400</Text>
                </Pressable>
                <Pressable 
                  style={[styles.optionButton, activeFilters.pages && activeFilters.pages[0] === 400 && styles.activeOption]}
                  onPress={() => setActiveFilters(prev => ({
                    ...prev, 
                    pages: prev.pages && prev.pages[0] === 400 ? null : [400, 10000]
                  }))}
                >
                  <Text style={styles.optionText}>More than 400</Text>
                </Pressable>
              </View>
              
              {/* Reset Button */}
              <Pressable 
                style={styles.resetButton}
                onPress={() => {
                  setActiveFilters({
                    year: null,
                    rating: null,
                    pages: null
                  });
                  setSortOption("none");
                }}
              >
                <Text style={styles.resetButtonText}>Reset All Filters</Text>
              </Pressable>
            </ScrollView>
            
            
          </View>
          <Pressable 
              style={styles.applyButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </Pressable>
        </View>
      </Modal>
    );
  };

  const renderBookCard = ({ item }) => {
    // Get random rating between 3.5 and 5 for demo purposes
    const rating = item.rating || (Math.random() * 1.5 + 3.5).toFixed(1);
    // Get random pages between 100 and 500 for demo purposes
    const pages = item.pages || Math.floor(Math.random() * 400 + 100);
    
    return (
      <Pressable 
        style={styles.bookCard}
        onPress={() => navigateToBookDetails(item)}
      >
        <Image
          source={{ uri: item.cover_image || 'https://images.unsplash.com/photo-1599179416084-91afc57e96f2?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }}
          style={styles.bookCover}
        />
        <View style={styles.bookInfo}>
          <Text numberOfLines={1} style={styles.bookTitle}>{item.book_name}</Text>
          <Text numberOfLines={1} style={styles.bookAuthor}>{item.author_name}</Text>
          <View style={styles.detailsRow}>
            <Text style={styles.detailText}>{item.year_of_publication || 'Unknown'}</Text>
            <Text style={styles.detailText}>{pages} pages</Text>
          </View>
          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>★ {rating}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#146C94" />
        </Pressable>
        <Text style={styles.headerTitle}>All Books</Text>
        <Pressable style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
          <Filter size={24} color="#146C94" />
        </Pressable>
      </View>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#146C94" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search books or authors..."
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#146C94" />
        </View>
      ) : (
        <>
          {/* Active Filters */}
          {(activeFilters.year || activeFilters.rating || activeFilters.pages || sortOption !== "none") && (
            <View style={styles.activeFiltersContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {sortOption !== "none" && (
                  <View style={styles.filterPill}>
                    <Text style={styles.filterPillText}>
                      {sortOption === "titleAsc" ? "Title (A-Z)" :
                       sortOption === "titleDesc" ? "Title (Z-A)" :
                       sortOption === "yearAsc" ? "Year (Oldest)" :
                       sortOption === "yearDesc" ? "Year (Newest)" :
                       sortOption === "ratingDesc" ? "Rating (High-Low)" : ""}
                    </Text>
                    <Pressable onPress={() => setSortOption("none")}>
                      <X size={16} color="#fff" />
                    </Pressable>
                  </View>
                )}
                
                {activeFilters.rating && (
                  <View style={styles.filterPill}>
                    <Text style={styles.filterPillText}>{activeFilters.rating}+ Stars</Text>
                    <Pressable onPress={() => setActiveFilters(prev => ({ ...prev, rating: null }))}>
                      <X size={16} color="#fff" />
                    </Pressable>
                  </View>
                )}
                
                {activeFilters.year && (
                  <View style={styles.filterPill}>
                    <Text style={styles.filterPillText}>
                      {activeFilters.year[0] === 2000 ? '2000-2025' : 
                       activeFilters.year[0] === 1980 ? '1980-1999' : 'Before 1980'}
                    </Text>
                    <Pressable onPress={() => setActiveFilters(prev => ({ ...prev, year: null }))}>
                      <X size={16} color="#fff" />
                    </Pressable>
                  </View>
                )}
                
                {activeFilters.pages && (
                  <View style={styles.filterPill}>
                    <Text style={styles.filterPillText}>
                      {activeFilters.pages[0] === 0 ? 'Under 200 pages' : 
                       activeFilters.pages[0] === 200 ? '200-400 pages' : 'Over 400 pages'}
                    </Text>
                    <Pressable onPress={() => setActiveFilters(prev => ({ ...prev, pages: null }))}>
                      <X size={16} color="#fff" />
                    </Pressable>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
          
          <Text style={styles.resultsCount}>
            {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'} found
          </Text>
          
          <FlatList
            data={getPaginatedData()}
            renderItem={renderBookCard}
            keyExtractor={(item) => item.book_id.toString()}
            contentContainerStyle={styles.booksList}
            numColumns={2}
            columnWrapperStyle={styles.bookRow}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No books found</Text>
                <Pressable 
                  style={styles.resetButton}
                  onPress={() => {
                    setSearchQuery("");
                    setActiveFilters({
                      year: null,
                      rating: null,
                      pages: null
                    });
                    setSortOption("none");
                  }}
                >
                  <Text style={styles.resetButtonText}>Reset Filters</Text>
                </Pressable>
              </View>
            }
          />
          
          {filteredBooks.length > 0 && renderPagination()}
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
  bookCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  bookCover: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  bookInfo: {
    padding: 12,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#146C94',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#19A7CE',
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  ratingContainer: {
    backgroundColor: '#19A7CE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  rating: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
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
  activeOption: {
    backgroundColor: '#19A7CE',
    borderColor: '#19A7CE',
  },
  activeOptionText: {
    color: '#FFFFFF',
  },
  ratingOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  ratingButton: {
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingButtonText: {
    fontSize: 14,
    color: '#146C94',
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeRatingButton: {
    backgroundColor: '#19A7CE',
    borderColor: '#19A7CE',
  },
  activeRatingButtonText: {
    color: '#FFFFFF',
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

export default AllBooks;