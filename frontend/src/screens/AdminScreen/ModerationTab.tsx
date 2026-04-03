import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trash2, AlertTriangle, MessageSquare, HandHeart } from 'lucide-react-native';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingScreen from '../../components/LoadingScreen';

const apiUrl = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.1.13:5001';

export default function ModerationTab() {
  const [activeTab, setActiveTab] = useState('prayers'); // 'prayers' or 'forum'
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModerationData();
  }, [activeTab]);

  const fetchModerationData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const endpoint = activeTab === 'prayers' 
        ? `${apiUrl}/api/admin/moderation/prayers` 
        : `${apiUrl}/api/admin/moderation/forum`;

      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data && res.data.data) {
        setItems(res.data.data);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error(`Error fetching ${activeTab} for moderation:`, error);
      Alert.alert('Error', `Could not load ${activeTab} data.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: any) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to permanently delete this content? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const endpoint = activeTab === 'prayers' 
                ? `${apiUrl}/api/admin/moderation/prayers/${id}` 
                : `${apiUrl}/api/admin/moderation/forum/${id}`;
                
              await axios.delete(endpoint, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              // Remove item from UI
              setItems(items.filter(item => item._id !== id));
              Alert.alert('Success', 'Content deleted successfully.');
            } catch (error) {
              console.error('Error deleting content:', error);
              Alert.alert('Error', 'Failed to delete content.');
            }
          }
        }
      ]
    );
  };

  const renderPrayerItem = (item: any) => (
    <View key={item._id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <HandHeart color="#FF5252" size={22} />
          <View style={styles.headerInfo}>
            <Text style={styles.userNameText}>{item.userName || 'Unknown User'}</Text>
            <Text style={styles.contentDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDelete(item._id)}
        >
          <Trash2 color="#E74C3C" size={20} />
        </TouchableOpacity>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.contentText}>{item.requestText}</Text>
        <View style={styles.itemFooter}>
          <Text style={styles.metaText}>{item.prayedCount || 0} Prayers Received</Text>
        </View>
      </View>
    </View>
  );

  const renderForumItem = (item: any) => (
    <View key={item._id} style={[styles.card, styles.forumCard]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <MessageSquare color="#FF9800" size={22} />
          <View style={styles.headerInfo}>
            <Text style={styles.userNameText}>{item.userName || 'Unknown User'}</Text>
            <Text style={styles.contentDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDelete(item._id)}
        >
          <Trash2 color="#E74C3C" size={20} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.questionContainer}>
        <Text style={styles.questionLabel}>QUESTION</Text>
        <Text style={styles.contentQuestionText}>{item.questionText}</Text>
        
        <View style={styles.itemFooter}>
          <Text style={styles.metaText}>{item.answerCount || 0} Answers</Text>
        </View>
      </View>
      
      {item.answers && item.answers.length > 0 && (
        <View style={styles.answersSection}>
          <View style={styles.answersHeaderRow}>
            <Text style={styles.answersHeading}>Replies ({item.answers.length})</Text>
          </View>
          {item.answers.map((answer: any, index: number) => (
            <View key={answer._id || index} style={styles.answerCard}>
              <View style={styles.answerValueRow}>
                <Text style={styles.answerText}>{answer.answerText}</Text>
              </View>
              <View style={styles.answerMeta}>
                <Text style={styles.answerAuthor}>{answer.userName}</Text>
                <Text style={styles.answerDate}>{new Date(answer.createdAt).toLocaleDateString()}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={['#146C94', '#19A7CE']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <Text style={styles.headerText}>Content Moderation</Text>

            <View style={styles.formCard}>
              {/* Tab Toggle */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'prayers' && styles.tabButtonActive]}
            onPress={() => setActiveTab('prayers')}
          >
            <HandHeart color={activeTab === 'prayers' ? '#146C94' : '#888'} size={20} />
            <Text style={[styles.tabText, activeTab === 'prayers' && styles.tabTextActive]}>
              Prayer Requests
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'forum' && styles.tabButtonActive]}
            onPress={() => setActiveTab('forum')}
          >
            <MessageSquare color={activeTab === 'forum' ? '#146C94' : '#888'} size={20} />
            <Text style={[styles.tabText, activeTab === 'forum' && styles.tabTextActive]}>
              Forum Questions
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content List */}
        <View style={styles.listContainer}>
          {loading ? (
            <LoadingScreen message="Loading moderation queue..." />
          ) : items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No content found.</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {items.map(item => 
                activeTab === 'prayers' ? renderPrayerItem(item) : renderForumItem(item)
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#fff',
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  headerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F6F1F1',
    textAlign: 'center',
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 400, // Ensure form area takes reasonable space
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#E8F1F5',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  tabTextActive: {
    color: '#146C94',
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
    marginTop: 8,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  infoBannerText: {
    color: '#92400E',
    fontSize: 13,
    flex: 1,
    flexWrap: 'wrap',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerInfo: {
    marginLeft: 12,
  },
  userNameText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#146C94',
  },
  contentDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  cardBody: {
    padding: 16,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  contentQuestionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
    fontWeight: '500',
  },
  contentText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 12,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#19A7CE',
    fontWeight: '600',
    backgroundColor: '#E8F1F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  answersSection: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FAFBFC',
  },
  answersHeading: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  answerCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#19A7CE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  answerText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 18,
    marginBottom: 8,
  },
  answerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    paddingTop: 8,
  },
  answerDate: {
    fontSize: 10,
    color: '#999',
  },
  answerAuthor: {
    fontSize: 11,
    fontWeight: '700',
    color: '#146C94',
  },
  forumCard: {
    padding: 0,
    overflow: 'hidden',
  },
  questionContainer: {
    padding: 16,
  },
  questionLabel: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1,
  },
  answersHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  answerValueRow: {
    marginBottom: 6,
  },
});
