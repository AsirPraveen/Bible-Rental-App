import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, HandHeart, PlusCircle } from 'lucide-react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? '';
import AddPrayerRequestModal from './AddPrayerRequestModal';
import LoadingScreen from '../../components/LoadingScreen';

export default function PrayerRequestsScreen() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchUserAndRequests = async () => {
    try {
      setLoading(true);
      
      // Fetch current user ID
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const userRes = await axios.post(`${BASE_URL}/api/auth/userdata`, { token });
        if (userRes.data?.status === 'Ok') {
          setCurrentUserId(userRes.data.data._id);
        }
      }

      // Fetch requests
      const reqRes = await axios.get(`${BASE_URL}/api/prayer-requests`);
      if (reqRes.data.status === 'Success') {
        setRequests(reqRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAndRequests();
  }, []);

  const handlePray = async (id: string) => {
    if (!currentUserId) return;
    try {
      const res = await axios.put(`${BASE_URL}/api/prayer-requests/${id}/pray`, { userId: currentUserId });
      if (res.data.status === 'Success') {
        setRequests((prev: any) => 
          prev.map((req: any) => {
            if (req._id === id) {
              const hasPrayed = req.prayedBy?.includes(currentUserId);
              return { 
                ...req, 
                prayedBy: hasPrayed 
                  ? req.prayedBy.filter((uid: string) => uid !== currentUserId)
                  : [...(req.prayedBy || []), currentUserId]
              };
            }
            return req;
          })
        );
      }
    } catch (error) {
      console.error('Error incrementing pray count', error);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isOwnRequest = item.user?._id === currentUserId || item.user === currentUserId;
    const hasPrayed = item.prayedBy?.includes(currentUserId);
    const prayCount = item.prayedBy?.length || 0;

    return (
      <View style={[styles.card, isOwnRequest && styles.ownCard]}>
        <View style={styles.header}>
          <View style={styles.authorRow}>
            <Text style={styles.author}>{item.user?.name || 'Unknown'}</Text>
            {isOwnRequest && <View style={styles.ownBadge}><Text style={styles.ownBadgeText}>You</Text></View>}
          </View>
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <Text style={styles.content}>{item.requestText}</Text>
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.prayButton, hasPrayed ? styles.prayButtonActive : styles.prayButtonInactive]} 
            onPress={() => handlePray(item._id)}
          >
            <Heart color={hasPrayed ? "#fff" : "#146C94"} size={16} fill={hasPrayed ? "#fff" : "transparent"} />
            <Text style={[styles.prayText, hasPrayed ? styles.prayTextActive : styles.prayTextInactive]}>
              {hasPrayed ? 'Praying' : 'Pray'} ({prayCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={['#146C94', '#19A7CE']} style={styles.gradient}>
        <View style={styles.headerContainer}>
          <View style={styles.headerTop}>
            <Text style={styles.headerText}>Prayer Requests</Text>
            <TouchableOpacity 
              style={styles.headerIconBtn}
              onPress={() => setModalVisible(true)}
            >
              <PlusCircle color="#F6F1F1" size={28} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitleText}>Join others in prayer</Text>
        </View>

        <View style={styles.container}>
          {loading ? (
            <LoadingScreen variant="transparent" message="Loading prayers..." />
          ) : (
            <>
              <FlatList
                data={requests}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <HandHeart color="#F6F1F1" size={80} />
                    <Text style={styles.emptyStateText}>No Prayer Requests</Text>
                    <Text style={styles.emptyStateSubtext}>Be the first to share a request.</Text>
                  </View>
                }
              />
            </>
          )}
        </View>

        <AddPrayerRequestModal 
          visible={modalVisible} 
          onClose={() => setModalVisible(false)} 
          onSuccess={fetchUserAndRequests} 
          currentUserId={currentUserId}
        />
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
  headerContainer: {
    padding: 20,
    paddingTop: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerIconBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 12,
  },
  headerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F6F1F1',
  },
  subtitleText: {
    fontSize: 16,
    color: '#F6F1F1',
    opacity: 0.9,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#F6F1F1',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F6F1F1',
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#F6F1F1',
    opacity: 0.8,
    marginTop: 8,
    textAlign: 'center',
  },
  list: {
    paddingVertical: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  ownCard: {
    borderLeftColor: '#19A7CE',
    backgroundColor: '#FAFDFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ownBadge: {
    backgroundColor: '#19A7CE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ownBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  author: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 15,
  },
  date: {
    color: '#888',
    fontSize: 12,
  },
  content: {
    fontSize: 16,
    color: '#444',
    marginBottom: 16,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  prayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
  },
  prayButtonInactive: {
    backgroundColor: '#fff',
    borderColor: '#146C94',
  },
  prayButtonActive: {
    backgroundColor: '#146C94',
    borderColor: '#146C94',
  },
  prayText: {},
  prayTextActive: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  prayTextInactive: {
    color: '#146C94',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#888',
  },
});
