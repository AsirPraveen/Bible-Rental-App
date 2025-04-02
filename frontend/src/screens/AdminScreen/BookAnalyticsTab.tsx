import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import axios from 'axios';
import AnalyticsCard from './components/AnalyticsCard';
import PopularBookCard from './components/PopularBookCard';
import BarChartComponent from './components/BarChartComponent';
import PieChartComponent from './components/PieChartComponent';
import LineChartComponent from './components/LineChartComponent';
import AddBookForm from './components/AddBookForm';

const BASE_URL = 'http://192.168.29.46:5001';
const Colors = {
  bg: '#146C94',
  active: '#AFD3E2',
  inactive: '#F6F1F1',
  transparent: 'transparent',
};

const BookAnalyticsTab = () => {
  const [analytics, setAnalytics] = useState({ totalBooks: 0, totalRented: 0, popularBooks: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [showAddBookForm, setShowAddBookForm] = useState(false);
  const [newBook, setNewBook] = useState({
    book_name: '',
    author_name: '',
    pages: '',
    preface: '',
    year_of_publication: '',
    author_id: '',
    book_id: '',
  });

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/book-analytics`);
      const data = res.data.data || { totalBooks: 0, totalRented: 0, popularBooks: [] };
      setAnalytics({
        totalBooks: data.totalBooks || 0,
        totalRented: data.totalRented || 0,
        popularBooks: Array.isArray(data.popularBooks) ? data.popularBooks : [],
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalytics({ totalBooks: 0, totalRented: 0, popularBooks: [] });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchAnalytics, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAddBook = async () => {
    try {
      const res = await axios.post(`${BASE_URL}/api/add-book`, newBook);
      if (res.data.status === 'Ok') {
        alert('Book added successfully');
        setNewBook({
          book_name: '',
          author_name: '',
          pages: '',
          preface: '',
          year_of_publication: '',
          author_id: '',
          book_id: '',
        });
        setShowAddBookForm(false);
        await fetchAnalytics();
      } else {
        alert(res.data.data);
      }
    } catch (error) {
      alert('Failed to add book');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.bg} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Book Analytics</Text>
        <View style={styles.analyticsContainer}>
          <AnalyticsCard title="Total Books" value={analytics.totalBooks} />
          <AnalyticsCard title="Total Rented" value={analytics.totalRented} />
        </View>

        {/* Charts and Graphs */}
        <Text style={styles.subSectionTitle}>Rental Trends (Line Chart)</Text>
        <LineChartComponent data={analytics.popularBooks} />

        <Text style={styles.subSectionTitle}>Book Popularity (Bar Chart)</Text>
        <BarChartComponent data={analytics.popularBooks} />

        <Text style={styles.subSectionTitle}>Rental Distribution (Pie Chart)</Text>
        <PieChartComponent data={analytics.popularBooks} />

        <Text style={styles.subSectionTitle}>Popular Books</Text>
        {analytics.popularBooks?.length > 0 ? (
          analytics.popularBooks.map((book: any) => (
            <PopularBookCard key={book.book_id} book={book} />
          ))
        ) : (
          <Text style={styles.noDataText}>No popular books available</Text>
        )}

        <AddBookForm
          visible={showAddBookForm}
          onToggle={() => setShowAddBookForm(!showAddBookForm)}
          newBook={newBook}
          setNewBook={setNewBook}
          onAddBook={handleAddBook}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.inactive,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.bg,
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.bg,
    marginBottom: 10,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.bg,
    marginTop: 10,
    marginBottom: 5,
  },
  analyticsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default BookAnalyticsTab;