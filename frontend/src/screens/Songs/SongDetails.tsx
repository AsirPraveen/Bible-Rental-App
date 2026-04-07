import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Text, SafeAreaView, Platform, StatusBar, Linking, TouchableOpacity, Dimensions } from 'react-native';
import { IconButton } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import Constants from 'expo-constants';
import { useRoute, useNavigation } from '@react-navigation/native';
import LoadingScreen from '../../components/LoadingScreen';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import YoutubePlayer from "react-native-youtube-iframe";

const { width } = Dimensions.get('window');
const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

export default function SongDetailsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { songId } = route.params;
  const [song, setSong] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<'Tamil' | 'English'>('Tamil');
  const [fontSize, setFontSize] = useState(14);

  useEffect(() => {
    const fetchSongDetails = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/api/songs/${songId}`);
        if (res.data.status === 'Ok') {
          setSong(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching song details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSongDetails();
  }, [songId]);

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
      <Text>Song not found</Text>
    </View>
  );

  const videoId = getYoutubeId(song.youtubeLink);

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={['#146C94', '#19A7CE']} style={styles.header}>
        <View style={styles.headerContent}>
          <IconButton 
            icon="arrow-left" 
            iconColor="#fff" 
            size={28} 
            onPress={() => navigation.goBack()} 
          />
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>{song.titleTamil}</Text>
            {song.author ? (
              <Text style={styles.authorSubtitle}>{song.author}</Text>
            ) : null}
          </View>
          <View style={styles.zoomControls}>
            <TouchableOpacity onPress={handleZoomOut} style={styles.zoomButton}>
              <MaterialCommunityIcons name="minus-circle-outline" size={26} color="#F6F1F1" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleZoomIn} style={styles.zoomButton}>
              <MaterialCommunityIcons name="plus-circle-outline" size={26} color="#F6F1F1" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.activeTitle}>
          {language === 'Tamil' ? song.titleTamil : (song.titleEnglish || song.titleTamil)}
        </Text>

        <View style={styles.lyricsCard}>
          <Text style={[styles.lyrics, { fontSize }]}>
            {language === 'Tamil' ? song.lyricsTamil : song.lyricsEnglish}
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

const styles = StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#F6F1F1',
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
    backgroundColor: '#19A7CE',
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
  languageToggle: {
    flexDirection: 'row',
    backgroundColor: '#fff',
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
    backgroundColor: '#146C94',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
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
    color: '#146C94',
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
    backgroundColor: '#fff',
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
    color: '#333',
    textAlign: 'center',
  },
  metadataSection: {
    backgroundColor: 'rgba(20, 108, 148, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(20, 108, 148, 0.1)',
    marginBottom: 40,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#146C94',
    width: 80,
  },
  metaValue: {
    flex: 1,
    fontSize: 13,
    color: '#666',
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
  },
});
