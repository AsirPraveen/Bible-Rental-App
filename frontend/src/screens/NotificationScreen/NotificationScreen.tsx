import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar,
  SafeAreaView,
  TouchableWithoutFeedback,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import LoadingScreen from "../../components/LoadingScreen";

interface Post {
  _id: string;
  title: string;
  description: string;
  date: string;
  time?: string;
  imageUrl?: string;
  likes?: number;
  likedBy?: string[];
  createdAt: string; // Add createdAt to the interface
}

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? "";

const NotificationScreen = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const lastTap = useRef<{ [key: string]: number }>({});

  useEffect(() => {
    const fetchPostsAndUser = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem("token");
        let email = null;

        if (token) {
          const userRes = await axios.post(`${API_URL}/api/auth/userdata`, {
            token,
          });
          email = userRes.data.data.email;
          setUserEmail(email);
        }

        const response = await axios.get(`${API_URL}/api/posts`, {
          params: { userEmail: email },
        });
        if (response.data.status === "Ok") {
          setPosts(response.data.data);
        } else {
          setPosts([]);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching posts or user:", error);
        setPosts([]);
        setLoading(false);
      }
    };

    fetchPostsAndUser();
  }, []);

  const toggleLike = async (postId: string, forceLike = false) => {
    if (!userEmail) return;

    const currentPost = posts.find((post) => post._id === postId);
    if (!currentPost) return;

    const isLiked = currentPost.likedBy?.includes(userEmail) ?? false;

    // If forceLike is true, only proceed if not already liked
    if (forceLike && isLiked) return;

    const newIsLiked = forceLike ? true : !isLiked;
    const newLikedBy = newIsLiked
      ? [...(currentPost.likedBy ?? []), userEmail]
      : currentPost.likedBy?.filter((email) => email !== userEmail) ?? [];
    const newLikes = newIsLiked
      ? (currentPost.likes ?? 0) + 1
      : (currentPost.likes ?? 0) - 1;

    setPosts(
      posts.map((post) =>
        post._id === postId
          ? { ...post, likes: newLikes, likedBy: newLikedBy }
          : post
      )
    );

    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.put(`${API_URL}/api/posts/${postId}/likes`, {
        userEmail,
        token,
      });
      if (response.data.status !== "Ok") {
        throw new Error("Failed to toggle like");
      }
      const updatedPost = response.data.data;
      setPosts(
        posts.map((post) => (post._id === postId ? updatedPost : post))
      );
    } catch (error) {
      console.error("Error toggling like:", error);
      setPosts(
        posts.map((post) =>
          post._id === postId
            ? {
                ...post,
                likes: currentPost.likes,
                likedBy: currentPost.likedBy,
              }
            : post
        )
      );
    }
  };

  const handleDoubleTap = (postId: string) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (lastTap.current[postId] && now - lastTap.current[postId] < DOUBLE_PRESS_DELAY) {
      toggleLike(postId, true);
    } else {
      lastTap.current[postId] = now;
    }
  };

  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  const parseEventDateParts = (dateStr: string | null, timeStr: string | null) => {
    if (!dateStr) return null;
    try {
      let d = new Date(dateStr);
      
      // If native parsing fails (NaN), try manual regex-based parsing
      if (isNaN(d.getTime())) {
        const months: { [key: string]: number } = {
          january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
          july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
          jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
        };

        // Match "Month Day, Year" or "Month Day Year" formats (e.g., "April 08, 2026")
        const match = dateStr.match(/([a-zA-Z]+)\s+(\d+),?\s+(\d+)/i);
        if (match) {
          const m = match[1].toLowerCase();
          const day = parseInt(match[2]);
          const year = parseInt(match[3]);
          if (months[m] !== undefined && !isNaN(day) && !isNaN(year)) {
            d = new Date(year, months[m], day);
          }
        }
      }

      // If still invalid, return raw date in the first box
      if (isNaN(d.getTime())) {
        return {
          dateBox: dateStr,
          weekdayBox: "---",
          timeBox: timeStr || "TBA",
        };
      }

      const dayOfMonthNum = d.getDate();
      const monthLiteral = d.toLocaleString("default", { month: "long" });
      const weekdayLiteral = d.toLocaleString("default", { weekday: "short" });

      return {
        dateBox: `${dayOfMonthNum}${getOrdinalSuffix(dayOfMonthNum)} ${monthLiteral}`,
        weekdayBox: weekdayLiteral,
        timeBox: timeStr || "TBA",
      };
    } catch (e) {
      return {
        dateBox: dateStr, // Safe fallback
        weekdayBox: "---",
        timeBox: timeStr || "TBA",
      };
    }
  };


  const formatSentTimestamp = (createdAt: string) => {
    return new Date(createdAt).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderPost = ({ item }: { item: Post }) => {
    const isLiked = item.likedBy?.includes(userEmail ?? "") ?? false;
    const eventParts = parseEventDateParts(item.date, item.time ?? null);

    return (
      <View style={styles.postCard}>
        <LinearGradient
          colors={["#146C94", "#19A7CE"]}
          style={styles.cardBorder}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableWithoutFeedback onPress={() => handleDoubleTap(item._id)}>
            <View style={styles.cardInner}>
              <Text style={styles.postTitle}>{item.title}</Text>
              <Text style={styles.postDescription}>{item.description}</Text>

              {eventParts && (
                <View style={styles.eventBoxesRow}>
                  <View style={styles.eventBox}>
                    <Text style={styles.eventBoxLabel}>{eventParts.dateBox}</Text>
                  </View>
                  <View style={styles.eventBox}>
                    <Text style={styles.eventBoxLabel}>{eventParts.weekdayBox}</Text>
                  </View>
                  <View style={styles.eventBox}>
                    <Text style={styles.eventBoxLabel}>{eventParts.timeBox}</Text>
                  </View>
                </View>
              )}

              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.postImage}
                  resizeMode="contain"
                />
              ) : null}

              <View style={styles.footerRow}>
                <TouchableOpacity
                  onPress={() => toggleLike(item._id)}
                  style={styles.unifiedLikeButton}
                >
                  <Ionicons
                    name={isLiked ? "heart" : "heart-outline"}
                    size={22}
                    color={isLiked ? "#FF4D4F" : "#666"}
                  />
                  <Text style={[styles.likeCount, isLiked && styles.activeLikeText]}>
                    {item.likes || 0}
                  </Text>
                </TouchableOpacity>

                <View style={styles.sentTimeContainer}>
                  <Text style={styles.sentTimeText}>
                    Sent {formatSentTimestamp(item.createdAt)}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </LinearGradient>
      </View>
    );
  };




  if (loading) {
    return <LoadingScreen message="Loading notifications..." />;
  }

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={["#146C94", "#19A7CE"]} style={styles.gradient}>
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
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    backgroundColor: "#fff",
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
    fontWeight: "bold",
    color: "#F6F1F1",
    textAlign: "center",
    marginBottom: 24,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  listContainer: {
    paddingBottom: 16,
  },
  postCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  cardBorder: {
    borderRadius: 16,
    padding: 2,
  },
  cardInner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  postTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#146C94",
    marginBottom: 12,
  },
  postDescription: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
    marginBottom: 16,
  },
  postImage: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  unifiedLikeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  likeCount: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
    fontWeight: "bold",
  },
  activeLikeText: {
    color: "#FF4D4F",
  },
  eventBoxesRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  eventBox: {
    backgroundColor: "#E6F0FA",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(20, 108, 148, 0.1)",
  },
  eventBoxLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#146C94",
  },
  sentTimeContainer: {
    alignItems: "flex-end",
  },
  sentTimeText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#999",
    fontStyle: "italic",
  },
  noPostsText: {
    fontSize: 16,
    color: "#F6F1F1",
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
  },
});

export default NotificationScreen;

