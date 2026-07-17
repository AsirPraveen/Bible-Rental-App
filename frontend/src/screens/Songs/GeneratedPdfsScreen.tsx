import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Pressable, Platform, StatusBar as RNStatusBar, SafeAreaView, Modal } from 'react-native';
import { Card, IconButton, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import Constants from 'expo-constants';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const preprocessHtml = (html: string) => {
  if (!html) return '';
  if (html.includes('tempPool.children.length === 0')) {
    return html;
  }
  const searchStr = 'function paginate() {';
  const replaceStr = `function paginate() {
            const tempContainer = document.getElementById('pages-container');
            const tempPool = document.getElementById('raw-content-pool');
            if (tempPool && tempContainer && tempPool.children.length === 0) {
              const items = [];
              const headers = Array.from(tempContainer.querySelectorAll('.song-header-block'));
              headers.forEach(header => {
                items.push(header);
                const songId = header.getAttribute('data-song-id');
                const verses = Array.from(tempContainer.querySelectorAll('.song-verse[data-song-id="' + songId + '"]'));
                verses.forEach(v => items.push(v));
              });
              items.forEach(item => {
                tempPool.appendChild(item);
              });
            }`;
  return html.replace(searchStr, replaceStr);
};
const cleanHtmlForPreview = (html: string) => {
  if (!html) return '';
  let processed = preprocessHtml(html);
  const styleOverride = `
    <style>
      .editor-toolbar, .song-ctrls {
        display: none !important;
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        line-height: 0 !important;
      }
      #pages-container {
        margin-top: 0 !important;
      }
      [contenteditable="true"] {
        outline: none !important;
      }
    </style>
  `;
  processed = processed.replace('</head>', `${styleOverride}</head>`);
  processed = processed.replace(/contenteditable="true"/g, 'contenteditable="false"');
  processed = processed.replace(/contenteditable/g, 'contenteditable="false"');
  return processed;
};
const GeneratedPdfsScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  const fetchPdfs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/generated-pdfs`);
      if (res.data.status === 'Ok') {
        setPdfs(res.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching generated PDFs:', error);
      Alert.alert('Error', 'Failed to fetch saved song sheets');
    } finally {
      setLoading(false);
    }
  };

  // Refetch when screen is focused (focused again after saving)
  useFocusEffect(
    React.useCallback(() => {
      fetchPdfs();
    }, [])
  );

  const handlePrintPdf = async (item: any) => {
    try {
      const isLandscape = item.html ? item.html.includes('landscape-layout') : false;
      const { uri } = await Print.printToFileAsync({
        html: item.html,
        width: isLandscape ? 842 : 595,
        height: isLandscape ? 595 : 842,
      });
      const sanitizedTitle = item.title.replace(/[^a-zA-Z0-9\u0B80-\u0BFF\s_-]/g, '').trim() || 'Song Sheet';
      const newUri = FileSystem.cacheDirectory + `${sanitizedTitle}.pdf`;
      await FileSystem.copyAsync({
        from: uri,
        to: newUri
      });
      await Sharing.shareAsync(newUri, { mimeType: 'application/pdf', dialogTitle: item.title });
    } catch (error) {
      console.error('Error printing saved PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };
  const handleViewPdf = (item: any) => {
    if (!item.html) {
      Alert.alert('Error', 'No preview available for this song sheet');
      return;
    }
    setPreviewTitle(item.title);
    setPreviewHtml(cleanHtmlForPreview(item.html));
  };
  const handleDeletePdf = (id: string) => {
    Alert.alert(
      'Delete Song Sheet',
      'Are you sure you want to permanently delete this saved song sheet layout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${BASE_URL}/api/generated-pdfs/${id}`);
              fetchPdfs();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete song sheet');
            }
          }
        }
      ]
    );
  };

  const renderPdfItem = ({ item }: { item: any }) => (
    <Card style={styles.pdfCard}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => handleViewPdf(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.pdfTitle}>{item.title}</Text>
            <Text style={styles.pdfMeta}>
              Songs: {item.songs?.length || 0}  ·  Saved: {new Date(item.updatedAt).toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          <IconButton
            icon="delete-outline"
            iconColor="#FF6B6B"
            size={22}
            onPress={() => handleDeletePdf(item._id)}
          />
        </View>
        <View style={styles.cardActions}>
          <Button
            mode="outlined"
            compact
            onPress={() => navigation.navigate('SongPdfGenerator', { pdfId: item._id })}
            style={styles.actionBtn}
            textColor="#146C94"
          >
            Edit Layout
          </Button>
          <Button
            mode="contained"
            compact
            onPress={() => handleViewPdf(item)}
            style={[styles.actionBtn, { backgroundColor: '#19A7CE', marginHorizontal: 4 }]}
            textColor="#fff"
          >
            View PDF
          </Button>
          <Button
            mode="contained"
            compact
            onPress={() => handlePrintPdf(item)}
            style={[styles.actionBtn, { backgroundColor: '#146C94' }]}
            textColor="#fff"
          >
            Print PDF
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={22} color="#F6F1F1" />
          </Pressable>
          <View style={styles.headerTextWrapper}>
            <Text style={styles.headerTitle}>Saved Song Sheets</Text>
            <Text style={styles.subtitleText}>
              {pdfs.length} saved song {pdfs.length === 1 ? 'sheet' : 'sheets'}
            </Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.container}>
          {loading && pdfs.length === 0 ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#146C94" />
            </View>
          ) : (
            <FlatList
              data={pdfs}
              keyExtractor={(item) => item._id}
              renderItem={renderPdfItem}
              contentContainerStyle={styles.listContent}
              onRefresh={fetchPdfs}
              refreshing={loading}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="document-text-outline" size={80} color="#ccc" />
                  <Text style={styles.emptyText}>No saved song sheets yet.</Text>
                  <Text style={styles.emptySubtext}>
                    Go to the Songs screen and tap the design icon in the header to create one!
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </LinearGradient>

      {/* Full-screen WebView PDF Preview Modal */}
      <Modal
        visible={previewHtml !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setPreviewHtml(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.primary }}>
          <RNStatusBar barStyle="light-content" backgroundColor={colors.primary} />
          {/* Header */}
          <View style={{
            height: 56,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            backgroundColor: colors.primary
          }}>
            <TouchableOpacity onPress={() => setPreviewHtml(null)} style={{ padding: 4 }}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', flex: 1, textAlign: 'center', marginHorizontal: 12 }} numberOfLines={1}>
              {previewTitle}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (previewHtml) {
                  handlePrintPdf({ html: previewHtml, title: previewTitle });
                }
              }}
              style={{ padding: 4 }}
            >
              <Ionicons name="print-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* WebView Container */}
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            {previewHtml && (
              <WebView
                originWhitelist={['*']}
                source={{ html: previewHtml }}
                style={{ flex: 1 }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                scalesPageToFit={true}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  headerContainer: {
    padding: 20,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F6F1F1',
    textAlign: 'center',
    marginBottom: 2,
  },
  subtitleText: {
    fontSize: 13,
    color: '#F6F1F1',
    textAlign: 'center',
    opacity: 0.85,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  pdfCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pdfTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  pdfMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  }
});

export default GeneratedPdfsScreen;
