import { View, Text, Image, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';

const AUTHORS = [
  {
    id: '1',
    name: 'J. Patterson',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    books: 45,
    followers: '2.3M',
    bio: 'James Patterson is one of the world\'s most prolific and popular authors.',
  },
  {
    id: '2',
    name: 'J.K Rowling',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    books: 12,
    followers: '15M',
    bio: 'British author best known for creating the magical world of Harry Potter.',
  },
  {
    id: '3',
    name: 'Marchella FP',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    books: 8,
    followers: '980K',
    bio: 'Indonesian author known for her contemporary fiction and poetry.',
  },
  {
    id: '4',
    name: 'Raditya Dika',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    books: 15,
    followers: '4.2M',
    bio: 'Indonesian author, comedian, and filmmaker known for his humorous writing style.',
  },
];

const AUTHOR_BOOKS = {
  '1': [
    {
      id: 'p1',
      title: 'Along Came a Spider',
      cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500',
      year: 2020,
      rating: 4.5,
    },
    {
      id: 'p2',
      title: 'Kiss the Girls',
      cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500',
      year: 2021,
      rating: 4.7,
    },
  ],
  '2': [
    {
      id: 'r1',
      title: 'Harry Potter',
      cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=500',
      year: 2019,
      rating: 4.9,
    },
  ],
  '3': [
    {
      id: 'm1',
      title: 'NKCTHI',
      cover: 'https://images.unsplash.com/photo-1589998059171-988d887df646?w=500',
      year: 2018,
      rating: 4.8,
    },
  ],
  '4': [
    {
      id: 'd1',
      title: 'Marmut Merah Jambu',
      cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500',
      year: 2022,
      rating: 4.6,
    },
  ],
};

export default function AuthorBooks() {
    const navigation = useNavigation();
    const route = useRoute();
    const { id } = route.params;
  
    const author = AUTHORS.find(a => a.id === id);
    const authorBooks = AUTHOR_BOOKS[id as keyof typeof AUTHOR_BOOKS] || [];
  
    if (!author) {
      return (
        <View style={styles.container}>
          <Text>Author not found</Text>
        </View>
      );
    }
  
    const navigateToBookDetails = (bookId) => {
      navigation.navigate('BookDetails', { id: bookId });
    };
  
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color="#146C94" />
          </Pressable>
        </View>

      <View style={styles.profileContainer}>
        <Image source={{ uri: author.photo }} style={styles.profilePhoto} />
        <Text style={styles.name}>{author.name}</Text>
        <Text style={styles.bio}>{author.bio}</Text>

        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{author.books}</Text>
            <Text style={styles.statLabel}>Books</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{author.followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
        </View>
      </View>

      <View style={styles.booksContainer}>
        <Text style={styles.sectionTitle}>Books by {author.name}</Text>
        <View style={styles.booksGrid}>
          {authorBooks.map((book) => (
            <Pressable
              key={book.id}
              style={styles.bookCard}
              onPress={() => navigateToBookDetails(book.id)}
            >
              <Image source={{ uri: book.cover }} style={styles.bookCover} />
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle}>{book.title}</Text>
                <Text style={styles.bookYear}>{book.year}</Text>
                <Text style={styles.bookRating}>★ {book.rating}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { //hello
    flex: 1,
    backgroundColor: '#F6F1F1',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#AFD3E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileContainer: {
    alignItems: 'center',
    padding: 24,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#146C94',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: '#19A7CE',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#AFD3E2',
    borderRadius: 12,
    padding: 16,
    width: '80%',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#19A7CE',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#146C94',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#19A7CE',
  },
  booksContainer: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#146C94',
    marginBottom: 16,
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bookCard: {
    width: '48%',
    backgroundColor: '#AFD3E2',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  bookCover: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
  bookInfo: {
    padding: 12,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#146C94',
    marginBottom: 4,
  },
  bookYear: {
    fontSize: 12,
    color: '#19A7CE',
    marginBottom: 4,
  },
  bookRating: {
    fontSize: 12,
    fontWeight: '600',
    color: '#146C94',
  },
});