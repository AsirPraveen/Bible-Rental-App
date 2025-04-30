import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons'; // For icons

const API_URL = Constants.expoConfig.extra.apiUrl;

const NotificationScreen = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<string[]>([]); // Track liked posts by _id

  // Load posts from MongoDB via API when the screen mounts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
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
        console.error('Error fetching posts:', error);
        setPosts([]);
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // Handle like/unlike action
  const toggleLike = async (postId: string) => {
    const isLiked = likedPosts.includes(postId);
    try {
      const response = await axios.put(`${API_URL}/api/posts/${postId}/likes`, { increment: !isLiked });
      if (response.data.status === "Ok") {
        // Update posts state with new likes count
        setPosts(posts.map(post =>
          post._id === postId ? { ...post, likes: response.data.data.likes } : post
        ));
        // Update likedPosts state
        if (isLiked) {
          setLikedPosts(likedPosts.filter(id => id !== postId));
        } else {
          setLikedPosts([...likedPosts, postId]);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Render each post as a card
  const renderPost = ({ item }: any) => {
    const isLiked = likedPosts.includes(item._id);
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
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
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
    overflow: 'hidden', // Ensures the gradient border clips correctly
  },
  cardBorder: {
    borderRadius: 16,
    padding: 2, // Creates the gradient border effect
  },
  cardInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14, // Slightly smaller to fit within the gradient border
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