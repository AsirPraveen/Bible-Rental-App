import { StyleSheet, Dimensions, Platform } from "react-native";
const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#19A7CE',
  },
  container: {
    flex: 1,
    backgroundColor: '#19A7CE',
  },
  stickyHeader: {
    backgroundColor: '#19A7CE',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#19A7CE',
  },
  logo: {
    fontSize: 24,
    fontWeight: '900',
    color: '#F6F1F1',
  },
  searchWrapper: {
    backgroundColor: '#19A7CE',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#AFD3E2',
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#146C94',
  },
  searchResults: {
    position: 'absolute',
    top: 45,
    left: 16,
    right: 16,
    backgroundColor: '#F6F1F1',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#AFD3E2',
  },
  searchResultImage: {
    width: 40,
    height: 60,
    borderRadius: 4,
  },
  searchResultText: {
    marginLeft: 12,
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#146C94',
  },
  searchResultAuthor: {
    fontSize: 12,
    color: '#19A7CE',
  },
    clearButton: {
      padding: 8,
    },
    
    clearIconContainer: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#e0e0e0',
      justifyContent: 'center',
      alignItems: 'center',
    },
    
    clearIcon: {
      fontSize: 12,
      color: '#146C94',
      fontWeight: 'bold',
    },
    
    resultsList: {
      width: '100%',
    },
    
    noResultsContainer: {
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    noResultsText: {
      color: '#146C94',
      fontSize: 16,
      fontWeight: '500',
    },
  categoriesContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
    marginTop: 4,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    color: '#146C94',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  viewAllButton: {
    backgroundColor: '#AFD3E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewAllText: {
    color: '#F6F1F1',
    fontSize: 14,
    fontWeight: '500',
  },
  bookCard: {
    height: 275,
    width: 160,
    marginRight: 16,
    backgroundColor: '#AFD3E2',
    borderRadius: 8,
    padding: 8,
  },
  bookCover: {
    width: 144,
    height: 156,
    borderRadius: 8,
    marginBottom: 8,
  },
  bookTitle: {
    fontSize: 18,
    paddingBottom: 4,
    fontWeight: '500',
    marginBottom: 4,
    color: '#146C94',
  },
  bookAuthor: {
    fontSize: 14,
    color: '#19A7CE',
  },
  authorCard: {
    width: 140,
    height: 140,
    alignItems: 'center',
    marginRight: 20,
    backgroundColor: '#AFD3E2',
    padding: 8,
    borderRadius: 12,
  },
  authorPhoto: {
    width: 85,
    height: 85,
    borderRadius: 45,
    marginBottom: 8,
  },
  authorName: {
    fontSize: 15,
    textAlign: 'center',
    width: 100,
    color: '#146C94',
  },
  topBookCard: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#AFD3E2',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topBookCover: {
    width: 60,
    height: 90,
    borderRadius: 6,
  },
  topBookInfo: {
    flex: 1,
    marginLeft: 12,
  },
  topBookTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#146C94',
  },
  topBookMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  topBookMetaText: {
    fontSize: 12,
    color: '#146C94',
    marginRight: 12,
  },
  topBookDetail: {
    fontSize: 12,
    color: '#19A7CE',
  },
  ratingContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#146C94',
  },
});

export default styles;