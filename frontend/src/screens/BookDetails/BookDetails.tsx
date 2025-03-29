
import { View, Text, Image, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft, Star } from 'lucide-react-native';

const BOOKS = [
  {
    id: '1',
    title: 'Pulang',
    cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500',
    author: 'Tere Liye',
    description: 'A compelling story about finding one\'s way back home.',
    rating: 4.8,
    publishedYear: 2022,
    pages: 320,
  },
  {
    id: '2',
    title: 'Heart',
    cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500',
    author: 'Alyssa Dafina',
    description: 'An emotional journey through love and loss.',
    rating: 4.6,
    publishedYear: 2021,
    pages: 280,
  },
  {
    id: '3',
    title: 'Di Bawah Bumi',
    cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=500',
    author: 'J. Pratama',
    description: 'Explore the mysteries that lie beneath the earth.',
    rating: 4.7,
    publishedYear: 2023,
    pages: 400,
  },
];

export default function BookDetails() {
    const navigation = useNavigation();
    const route = useRoute();
    const { id } = route.params;
    
    const book = BOOKS.find(b => b.id === id);
  
    if (!book) {
      return (
        <View style={styles.container}>
          <Text>Book not found</Text>
        </View>
      );
    }
  
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color="#146C94" />
          </Pressable>
        </View>

      <View style={styles.coverContainer}>
        <Image source={{ uri: book.cover }} style={styles.cover} />
      </View>

      <View style={styles.detailsContainer}>
        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.author}>{book.author}</Text>
        
        <View style={styles.ratingContainer}>
          <Star size={20} color="#FFB800" fill="#FFB800" />
          <Text style={styles.rating}>{book.rating}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Year</Text>
            <Text style={styles.statValue}>{book.publishedYear}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Pages</Text>
            <Text style={styles.statValue}>{book.pages}</Text>
          </View>
        </View>

        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>About the Book</Text>
          <Text style={styles.description}>{book.description}</Text>
        </View>

        <Pressable style={styles.rentButton}>
          <Text style={styles.rentButtonText}>Rent Now</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F1F1',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
  coverContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  cover: {
    width: 200,
    height: 300,
    borderRadius: 12,
  },
  detailsContainer: {
    padding: 24,
    backgroundColor: '#AFD3E2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#146C94',
    marginBottom: 8,
  },
  author: {
    fontSize: 16,
    color: '#19A7CE',
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  rating: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#146C94',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    backgroundColor: '#F6F1F1',
    borderRadius: 12,
    padding: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#19A7CE',
  },
  statLabel: {
    fontSize: 12,
    color: '#19A7CE',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#146C94',
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#146C94',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 24,
    color: '#146C94',
  },
  rentButton: {
    backgroundColor: '#146C94',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  rentButtonText: {
    color: '#F6F1F1',
    fontSize: 16,
    fontWeight: '600',
  },
});