import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator, TouchableOpacity, Platform, StatusBar, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

interface Post {
  _id: string;
  title: string;
  description: string;
  date: string;
  time?: string;
  imageUrl?: string;
  likes?: number;
  likedBy?: string[]; // Add likedBy to the interface
}

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const NotificationScreen = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null); // Store user's email

  // Load posts and user data when the screen mounts
  useEffect(() => {
    const fetchPostsAndUser = async () => {
      try {
        // Fetch user email from token
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const userRes = await axios.post(`${API_URL}/api/auth/userdata`, { token });
          setUserEmail(userRes.data.data.email);
        }

        // Fetch posts
        const response = await axios.get(`${API_URL}/api/posts`);
        console.log('API Response:', response.data);
        if (response.data.status === "Ok") {
          setPosts(response.data.data);
        } else {
          console.error('Unexpected response status:', response.data.status);
          setPosts([]);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching posts or user:', error);
        setPosts([]);
        setLoading(false);
      }
    };

    fetchPostsAndUser();
  }, []);

  // Handle like/unlike action
  const toggleLike = async (postId: string) => {
    if (!userEmail) return; // Exit if user email is not available

    const currentPost = posts.find(post => post._id === postId);
    if (!currentPost) return;

    const isLiked = currentPost.likedBy?.includes(userEmail) ?? false;
    const newLikedBy = isLiked 
      ? currentPost.likedBy?.filter(email => email !== userEmail) ?? []
      : [...(currentPost.likedBy ?? []), userEmail];
    const newLikes = isLiked ? (currentPost.likes ?? 0) - 1 : (currentPost.likes ?? 0) + 1;

    // Optimistically update the state
    setPosts(posts.map(post =>
      post._id === postId ? { ...post, likes: newLikes, likedBy: newLikedBy } : post
    ));

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.put(`${API_URL}/api/posts/${postId}/likes`, { userEmail, token });
      if (response.data.status !== "Ok") {
        throw new Error('Failed to toggle like');
      }
      // Use the full updated post from the response to ensure accuracy
      const updatedPost = response.data.data;
      setPosts(posts.map(post => post._id === postId ? updatedPost : post));
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert to original state if the request fails
      setPosts(posts.map(post =>
        post._id === postId ? { ...post, likes: currentPost.likes, likedBy: currentPost.likedBy } : post
      ));
    }
  };

  // Render each post as a card
  const renderPost = ({ item }: { item: Post }) => {
    const isLiked = item.likedBy?.includes(userEmail ?? '') ?? false;
    return (
      <View style={styles.postCard}>
        <LinearGradient
          colors={['#146C94', '#19A7CE']}
          style={styles.cardBorder}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardInner}>
            <Text style={styles.postTitle}>{item.title}</Text>
            <View style={styles.dateTimeContainer}>
              <Text style={styles.postDate}>
                {item.date} {item.time ? `at ${item.time}` : ''}
              </Text>
            </View>
            <Text style={styles.postDescription}>{item.description}</Text>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.postImage} resizeMode="contain" />
            ) : null}
            <View style={styles.likeContainer}>
              <TouchableOpacity onPress={() => toggleLike(item._id)} style={styles.likeButton}>
                <Ionicons
                  name={isLiked ? "heart" : "heart-outline"}
                  size={24}
                  color={isLiked ? "#FF4D4F" : "#666"}
                />
              </TouchableOpacity>
              <View style={styles.likeCountContainer}>
                <Ionicons name="heart" size={16} color="#FF4D4F" />
                <Text style={styles.likeCount}>{item.likes || 0}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#146C94" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={['#146C94', '#19A7CE']} style={styles.gradient}>
        <View style={styles.container}>
          <Text style={styles.headerText}>Notifications</Text>
          {posts.length === 0 ? (
            <Text style={styles.noPostsText}>No notifications available.</Text>
          ) : (
            <FlatList
              data={posts}
              renderItem={renderPost}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#fff',
  },
  gradient: {
    flex: 1,
  },
  container: { 
    flex: 1,
    padding: 12,
  },
  headerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F6F1F1',
    textAlign: 'center',
    marginBottom: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  listContainer: {
    paddingBottom: 16,
  },
  postCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardBorder: {
    borderRadius: 16,
    padding: 2,
  },
  cardInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  postTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#146C94',
    marginBottom: 12,
  },
  dateTimeContainer: {
    backgroundColor: '#E6F0FA',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  postDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#146C94',
  },
  postDescription: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 16,
  },
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  likeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  likeButton: {
    padding: 8,
  },
  likeCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  likeCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  noPostsText: {
    fontSize: 16,
    color: '#F6F1F1',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F1F1',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#146C94',
    fontWeight: '500',
  },
});

export default NotificationScreen;