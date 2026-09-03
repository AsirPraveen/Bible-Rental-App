import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, Platform, StatusBar, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { useRoute, useNavigation } from '@react-navigation/native';
import LoadingScreen from '../../components/LoadingScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import YoutubePlayer from "react-native-youtube-iframe";
import { useTheme, ColorsType } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config/api';

const { width } = Dimensions.get('window');
const API_URL = API_BASE_URL;

export default function SongDetailsScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { songId } = route.params;
  const [song, setSong] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<'Tamil' | 'English'>('Tamil');
  const [fontSize, setFontSize] = useState(14);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    const fetchSongDetails = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/api/songs/${songId}`);
        if (res.data.status === 'Ok') {
          const songData = res.data.data;
          setSong(songData);
          if (!songData.lyricsTamil && songData.lyricsEnglish) {
            setLanguage('English');
          }
        }
      } catch (err) {
        console.error('Error fetching song details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSongDetails();
  }, [songId]);

  useEffect(() => {
    const checkIfLiked = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const response = await axios.post(`${API_URL}/api/auth/userdata`, { token });
          if (response.data.status === 'Ok') {
            const data = response.data.data;
            if (data.likedSongs) {
              await AsyncStorage.setItem('@liked_songs', JSON.stringify(data.likedSongs));
              setIsLiked(data.likedSongs.some((s: any) => s._id === songId));
              return;
            }
          }
        }
        
        const savedLikedSongs = await AsyncStorage.getItem('@liked_songs');
        if (savedLikedSongs) {
          const parsed = JSON.parse(savedLikedSongs);
          if (Array.isArray(parsed)) {
            setIsLiked(parsed.some((s: any) => s._id === songId));
          }
        }
      } catch (err) {
        console.error('Error checking liked songs:', err);
      }
    };
    if (song) {
      checkIfLiked();
    }
  }, [songId, song]);

  const toggleLikeSong = async () => {
    if (!song) return;
    try {
      const savedLikedSongs = await AsyncStorage.getItem('@liked_songs');
      let likedList = savedLikedSongs ? JSON.parse(savedLikedSongs) : [];
      if (!Array.isArray(likedList)) {
        likedList = [];
      }

      const exists = likedList.some((s: any) => s._id === song._id);
      if (exists) {
        likedList = likedList.filter((s: any) => s._id !== song._id);
        setIsLiked(false);
      } else {
        likedList.push({
          _id: song._id,
          titleTamil: song.titleTamil,
          titleEnglish: song.titleEnglish,
          author: song.author,
          likedAt: new Date().toISOString()
        });
        setIsLiked(true);
      }
      await AsyncStorage.setItem('@liked_songs', JSON.stringify(likedList));

      const token = await AsyncStorage.getItem('token');
      if (token) {
        await axios.post(
          `${API_URL}/api/users/toggle-liked-song`,
          { songId: song._id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (err) {
      console.error('Error toggling song like:', err);
    }
  };

  const handleZoomIn = () => setFontSize(prev => Math.min(prev + 2, 32));
  const handleZoomOut = () => setFontSize(prev => Math.max(prev - 2, 12));

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (loading) return <LoadingScreen message="Unrolling lyrics..." />;
  if (!song) return (
    <View style={styles.errorContainer}>
      <Text style={{ color: colors.text }}>Song not found</Text>
    </View>
  );

  const videoId = getYoutubeId(song.youtubeLink);

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={colors.linearGradient} style={styles.header}>
        <View style={styles.headerContent}>
          <IconButton
            icon="arrow-left"
            iconColor="#fff"
            size={28}
            onPress={() => navigation.goBack()}
          />
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>{song.titleTamil || song.titleEnglish}</Text>
            {song.author ? (
              <Text style={styles.authorSubtitle}>{song.author}</Text>
            ) : null}
          </View>
          <View style={styles.zoomControls}>
            <View style={styles.zoomGroup}>
              <TouchableOpacity onPress={handleZoomOut} style={styles.zoomGroupButton}>
                <MaterialCommunityIcons name="minus" size={20} color="#F6F1F1" />
              </TouchableOpacity>
              <View style={styles.zoomGroupDivider} />
              <TouchableOpacity onPress={handleZoomIn} style={styles.zoomGroupButton}>
                <MaterialCommunityIcons name="plus" size={20} color="#F6F1F1" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={toggleLikeSong} style={styles.zoomButton}>
              <MaterialCommunityIcons
                name={isLiked ? "heart" : "heart-outline"}
                size={26}
                color={isLiked ? "#ff4757" : "#F6F1F1"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {song.lyricsTamil && song.lyricsEnglish ? (
        <View style={styles.languageToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, language === 'Tamil' && styles.toggleBtnActive]}
            onPress={() => setLanguage('Tamil')}
          >
            <Text style={[styles.toggleText, language === 'Tamil' && styles.toggleTextActive]}>Tamil</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, language === 'English' && styles.toggleBtnActive]}
            onPress={() => setLanguage('English')}
          >
            <Text style={[styles.toggleText, language === 'English' && styles.toggleTextActive]}>English</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.activeTitle}>
          {language === 'Tamil' ? song.titleTamil : (song.titleEnglish || song.titleTamil)}
        </Text>

        <View style={styles.lyricsCard}>
          <Text style={[styles.lyrics, { fontSize }]}>
            {language === 'Tamil' ? (song.lyricsTamil || song.lyricsEnglish) : song.lyricsEnglish}
          </Text>
        </View>

        <View style={styles.metadataSection}>
          {song.topics?.length > 0 && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Topics:</Text>
              <View style={styles.topicsContainer}>
                {song.topics.map((t: string, idx: number) => (
                  <Text key={idx} style={styles.topicTag}>
                    {t}
                  </Text>
                ))}
              </View>
            </View>
          )}
          {song.songbooks?.length > 0 && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Song Books:</Text>
              <View style={styles.topicsContainer}>
                {song.songbooks.map((sb: string, idx: number) => (
                  <Text key={idx} style={styles.topicTag}>
                    {sb}
                  </Text>
                ))}
              </View>
            </View>
          )}
          {song.author && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Author:</Text>
              <Text style={styles.metaValue}>{song.author}</Text>
            </View>
          )}
        </View>
        {videoId && (
          <View style={styles.videoPlayerContainer}>
            <YoutubePlayer
              height={(width - 32) * 0.5625}
              play={false}
              videoId={videoId}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ColorsType) => StyleSheet.create({
  outer_container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  titleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  authorSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    fontStyle: 'italic',
  },
  topicTag: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 8,
  },
  zoomButton: {
    padding: 4,
  },
  zoomGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  zoomGroupButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomGroupDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  languageToggle: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    margin: 16,
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: '#fff',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
  },
  activeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.tint,
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  videoPlayerContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  lyricsCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 20,
  },
  lyrics: {
    lineHeight: 32,
    color: colors.text,
    textAlign: 'center',
  },
  metadataSection: {
    backgroundColor: colors.theme === 'dark' ? colors.inputBg : 'rgba(20, 108, 148, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 40,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.tint,
    width: 80,
  },
  metaValue: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  topicsContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
