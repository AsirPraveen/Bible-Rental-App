import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Pressable, Modal, Alert, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, ColorsType } from '../../context/ThemeContext';

interface GenImage {
  id: string;
  citation: string;
  text?: string;
  localUri: string;
  date: string;
  language: string;
  bookNumber: number;
  chapterNumber: number;
  verseNumber: number;
}

const GeneratedImages = ({ navigation }: any) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [images, setImages] = useState<GenImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GenImage | null>(null);

  useEffect(() => {
    navigation.addListener('focus', () => {
      loadImages();
    });
    loadImages();
  }, [navigation]);

  const loadImages = async () => {
    try {
      const dataStr = await AsyncStorage.getItem('@bible_generated_images');
      if (dataStr) {
        setImages(JSON.parse(dataStr));
      } else {
        setImages([]);
      }
    } catch (e) {
      console.error('Failed to load generated images', e);
    }
  };

  const deleteImage = async (item: GenImage) => {
    Alert.alert('Delete Image', 'Are you sure you want to delete this generated image?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            // Remove file
            await FileSystem.deleteAsync(item.localUri, { idempotent: true });
            
            // Remove from state and storage
            const updatedImages = images.filter(img => img.id !== item.id);
            setImages(updatedImages);
            await AsyncStorage.setItem('@bible_generated_images', JSON.stringify(updatedImages));
          } catch (e) {
            console.error('Failed to delete image', e);
            Alert.alert('Error', 'Could not delete image.');
          }
        }
      }
    ]);
  };

  const handleShare = async () => {
    if (!selectedImage) return;
    try {
      await Sharing.shareAsync(selectedImage.localUri, { 
        mimeType: 'image/png', 
        dialogTitle: 'Share Generated Verse Image' 
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share image.');
    }
  };

  const renderItem = ({ item }: { item: GenImage }) => (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => setSelectedImage(item)} activeOpacity={0.8}>
        <Image source={{ uri: item.localUri }} style={styles.thumbnail} />
      </TouchableOpacity>
      <View style={styles.infoRow}>
        <Text style={styles.citationText} numberOfLines={1}>{item.citation}</Text>
        <TouchableOpacity onPress={() => deleteImage(item)} style={styles.deleteIcon}>
          <Icon name="delete" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.textLight} />
          </Pressable>
          <Text style={styles.headerTitle}>Generated Images</Text>
        </View>

        {images.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="image-off-outline" size={60} color={colors.textLight} />
            <Text style={styles.emptyText}>No generated images found.</Text>
          </View>
        ) : (
          <FlatList
            data={images}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            numColumns={2}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </LinearGradient>

      {/* Full-Screen Image Modal */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedImage(null)}
          >
            <Icon name="close" size={28} color="#000" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage.localUri }} style={styles.fullScreenImage} resizeMode="contain" />
          )}
          <TouchableOpacity
            onPress={handleShare}
            style={styles.shareButton}
          >
            <Icon name="share-variant" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.shareButtonText}>Share Image</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const getStyles = (colors: ColorsType) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: 8,
    backgroundColor: colors.secondary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textLight,
    marginLeft: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textLight,
    marginTop: 10,
  },
  listContainer: {
    padding: 10,
  },
  card: {
    flex: 1,
    margin: 8,
    backgroundColor: colors.cardBg,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    maxWidth: '46%',
  },
  thumbnail: {
    width: '100%',
    height: 150,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  citationText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.tint,
    flex: 1,
    marginRight: 5,
  },
  deleteIcon: {
    padding: 2,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '75%',
    resizeMode: 'contain',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    zIndex: 10,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default GeneratedImages;
