import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform, StatusBar, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Search, Box, BookOpen, Layers } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import LoadingScreen from '../../components/LoadingScreen';
import { useTheme, ColorsType } from '../../context/ThemeContext';
import { API_BASE_URL } from '../../config/api';

const apiUrl = API_BASE_URL;

export default function BiblicalArtifactsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    const fetchArtifacts = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/artifacts`);
        if (res.data && res.data.data) {
          setArtifacts(res.data.data);
        }
      } catch (error) {
        console.error('Error fetching Biblical artifacts:', error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchArtifacts();
  }, []);

  // Filter and Search logic
  const filteredArtifacts = useMemo(() => {
    return artifacts.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [artifacts, searchQuery, selectedCategory]);

  // Extract unique categories
  const categories = useMemo(() => {
    const unique = new Set(artifacts.map(item => item.category));
    return ['All', ...Array.from(unique)];
  }, [artifacts]);

  const renderArtifactItem = ({ item }: { item: any }) => {
    // Custom category colors for premium aesthetic
    const categoryColors: Record<string, string> = {
      'Tabernacle': '#D4AF37',
      'Genesis': '#2E7D32',
      'Temple': '#C62828',
      'Exodus': '#92400E',
      'Gospels': '#0E7490',
      'Passion': '#7B1E3A',
      'Apostles': '#4C1D95',
      // Category names used by the original seed, kept so older data still
      // renders with its own colour rather than falling back to gold.
      'Israel': '#92400E',
      'Gospel': '#0E7490',
      'Acts': '#4C1D95',
      'General': '#1565C0',
    };
    const color = categoryColors[item.category] || '#D4AF37';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('ArtifactViewer', { artifactId: item.id })}
      >
        <LinearGradient
          colors={colors.theme === 'dark' ? ['#1e293b', '#0f172a'] : ['#ffffff', '#f8fafc']}
          style={styles.cardGradient}
        >
          {/* Card Icon & Accent Header */}
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: colors.theme === 'dark' ? 'rgba(212, 175, 55, 0.12)' : '#FEF3C7' }]}>
              <Box color={color} size={28} />
            </View>
            <View style={[styles.categoryBadge, { backgroundColor: color }]}>
              <Text style={styles.categoryBadgeText}>{item.category}</Text>
            </View>
          </View>

          {/* Details */}
          <View style={styles.cardBody}>
            <Text style={styles.cardName}>{item.name}</Text>
            <View style={styles.referenceContainer}>
              <BookOpen size={14} color="#EA1E63" style={{ marginRight: 4 }} />
              <Text style={styles.cardReference}>{item.reference}</Text>
            </View>
            <Text style={styles.cardDesc} numberOfLines={3}>
              {item.description}
            </Text>
          </View>

          {/* Footer badge details */}
          <View style={styles.cardFooter}>
            <View style={styles.specLabel}>
              <Layers size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.specText} numberOfLines={1}>
                {(item.materials || []).slice(0, 2).join(', ') || 'Replica'}
              </Text>
            </View>
            <Text style={styles.exploreText}>
              {item.hotspots?.length ? `Explore ${item.hotspots.length} details →` : 'View 3D Replica →'}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.outerContainer}>
      <StatusBar barStyle="light-content" backgroundColor={colors.linearGradient[0]} />
      <LinearGradient colors={colors.linearGradient} style={styles.gradientHeader}>
        {/* Header toolbar */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextWrapper}>
            <Text style={styles.headerTitle}>3D Biblical Museum</Text>
            <Text style={styles.subtitleText}>
              {artifacts.length > 0
                ? `${artifacts.length} artifacts across ${Math.max(categories.length - 1, 1)} collections`
                : 'Explore physical replicas of biblical history'}
            </Text>
          </View>
        </View>

        {/* Content container */}
        <View style={styles.mainContainer}>
          {loading ? (
            <LoadingScreen message="Loading museum artifacts..." />
          ) : (
            <View style={{ flex: 1 }}>
              {/* Search Bar */}
              <View style={styles.searchSection}>
                <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search artifacts or scriptures..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  clearButtonMode="while-editing"
                />
              </View>

              {/* Horizontal Category Filters */}
              {categories.length > 1 && (
                <View style={styles.categoriesContainer}>
                  <FlatList
                    horizontal
                    data={categories}
                    keyExtractor={(item) => item}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesList}
                    renderItem={({ item }) => {
                      const isSelected = selectedCategory === item;
                      return (
                        <TouchableOpacity
                          style={[
                            styles.categoryButton,
                            isSelected && styles.categoryButtonActive
                          ]}
                          onPress={() => setSelectedCategory(item)}
                        >
                          <Text style={[
                            styles.categoryButtonText,
                            isSelected && styles.categoryButtonTextActive
                          ]}>
                            {item}
                          </Text>
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
              )}

              {/* Artifacts List */}
              <FlatList
                data={filteredArtifacts}
                keyExtractor={(item) => item.id}
                renderItem={renderArtifactItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Box size={48} color={colors.textSecondary} style={{ marginBottom: 12, opacity: 0.5 }} />
                    <Text style={styles.emptyTitle}>
                      {loadError ? 'Could Not Load the Museum' : artifacts.length === 0 ? 'The Museum Is Empty' : 'No Artifacts Found'}
                    </Text>
                    <Text style={styles.emptyText}>
                      {loadError
                        ? 'Check your connection and open this screen again.'
                        : artifacts.length === 0
                          ? 'No artifacts have been added yet. Ask your administrator to set up the collection.'
                          : 'Try searching for a different keyword or scripture.'}
                    </Text>
                  </View>
                }
              />
            </View>
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const getStyles = (colors: ColorsType) => StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: colors.linearGradient[0],
  },
  gradientHeader: {
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
    marginRight: 38, // Balance the back button offset
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 13,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: colors.text,
    fontSize: 15,
  },
  categoriesContainer: {
    marginTop: 12,
    marginBottom: 4,
  },
  categoriesList: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.inputBg,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryButtonActive: {
    backgroundColor: colors.tint,
    borderColor: colors.tint,
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  cardBody: {
    marginBottom: 12,
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  referenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardReference: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EA1E63',
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  specLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  specText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  exploreText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.tint,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
