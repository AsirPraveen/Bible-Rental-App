import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar, TouchableOpacity, ScrollView, Image, ActivityIndicator, Dimensions, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import LoadingScreen from '../../components/LoadingScreen';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const CARD_WIDTH = (width - 48) / COLUMN_COUNT;

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const GameCardLibrary = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState<'heroes' | 'villains'>('heroes');
  const [allCards, setAllCards] = useState<any[]>([]);
  const [ownedBaseCardIds, setOwnedBaseCardIds] = useState<string[]>([]);
  const [unlockedLoreNames, setUnlockedLoreNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const resUser = await axios.post(`${API_URL}/api/auth/userdata`, { token });
      const email = resUser.data.data.email;
      const unlockedLore = resUser.data.data.unlockedLore || [];
      setUnlockedLoreNames(unlockedLore);
      
      const resCards = await axios.get(`${API_URL}/api/game/cards`);
      const resGame = await axios.get(`${API_URL}/api/game/data?email=${email}`);
      
      if (resCards.data.status === 'ok') {
        setAllCards(resCards.data.data);
      }
      
      if (resGame.data.data.cardInventory) {
        // Collect all base card IDs the user owns
        // In flattened response, the base card ID is in ._id
        const owned = resGame.data.data.cardInventory.map((item: any) => item._id?.toString());
        setOwnedBaseCardIds(owned);
      }
    } catch (e) {
      console.log('Error fetching library data', e);
    } finally {
      setLoading(false);
    }
  };

  const heroes = allCards.filter(c => c.faction !== 'Enemy' && !c.isEventCard);
  const villains = allCards.filter(c => c.faction === 'Enemy');
  const displayCards = activeTab === 'heroes' ? heroes : villains;

  const getRarityColor = (rarity: string) => {
    switch(rarity) {
      case 'Legendary': return '#F59E0B';
      case 'Rare': return '#3B82F6';
      case 'Uncommon': return '#10B981';
      default: return '#9CA3AF';
    }
  };

  const renderCard = (card: any) => {
    // Heroes are "unlocked" if they are in the inventory
    // Villains are "unlocked" if they have been defeated (their lore is unlocked)
    const isOwned = ownedBaseCardIds.includes(card._id?.toString());
    const isLoreUnlocked = unlockedLoreNames.includes(card.name);
    
    // Final visibility check
    const isUnlocked = card.faction === 'Enemy' ? isLoreUnlocked : isOwned;
    
    return (
      <TouchableOpacity 
        key={card._id} 
        style={styles.cardWrapper}
        onPress={() => setSelectedCard(card)}
      >
        <View style={[styles.cardContainer, !isUnlocked && styles.cardLocked]}>
          <Image 
            source={{ uri: card.imageUrl || 'https://via.placeholder.com/200' }} 
            style={[styles.cardImage, !isUnlocked && styles.grayscale]} 
          />
          <LinearGradient 
            colors={['transparent', 'rgba(0,0,0,0.8)']} 
            style={styles.cardOverlay}
          >
            <Text style={styles.cardName} numberOfLines={1}>{isUnlocked ? card.name : '???'}</Text>
            <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(card.rarity) }]}>
               <Text style={styles.rarityText}>{card.rarity}</Text>
            </View>
          </LinearGradient>
          
          {!isUnlocked && (
            <View style={styles.lockOverlay}>
               <MaterialCommunityIcons name="lock" size={24} color="rgba(255,255,255,0.5)" />
            </View>
          )}

          {isUnlocked && (
            <View style={styles.ownedBadge}>
               <MaterialCommunityIcons name="check-circle" size={16} color="#4ADE80" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <LoadingScreen message="Loading cards..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#1e1b4b', '#0f172a']} style={styles.mainContainer}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>The Great Library</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'heroes' && styles.activeTab]} 
            onPress={() => setActiveTab('heroes')}
          >
            <MaterialCommunityIcons name="shield-cross" size={20} color={activeTab === 'heroes' ? '#FFF' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'heroes' && styles.activeTabText]}>Heroes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'villains' && styles.activeTab]} 
            onPress={() => setActiveTab('villains')}
          >
            <MaterialCommunityIcons name="skull" size={20} color={activeTab === 'villains' ? '#FFF' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'villains' && styles.activeTabText]}>Villains</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.grid}>
            {displayCards.map(renderCard)}
          </View>
        </ScrollView>

        {/* Detailed View Modal */}
        <Modal
          visible={!!selectedCard}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedCard(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {selectedCard && (
                <>
                  <Image source={{ uri: selectedCard.imageUrl }} style={styles.modalImage} />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.modalImageOverlay} />
                  
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedCard(null)}>
                     <MaterialCommunityIcons name="close" size={24} color="#FFF" />
                  </TouchableOpacity>

                  <View style={styles.modalBody}>
                    <Text style={styles.modalName}>{selectedCard.name}</Text>
                    <View style={styles.modalMeta}>
                       <Text style={[styles.modalRarity, { color: getRarityColor(selectedCard.rarity) }]}>{selectedCard.rarity}</Text>
                       <Text style={styles.modalClass}>{selectedCard.characterClass || selectedCard.class}</Text>
                    </View>

                    <View style={styles.statsRow}>
                       <View style={styles.statBox}>
                          <FontAwesome5 name="heart" size={14} color="#EF4444" />
                          <Text style={styles.statVal}>{selectedCard.hp}</Text>
                       </View>
                       <View style={styles.statBox}>
                          <MaterialCommunityIcons name="sword" size={16} color="#F59E0B" />
                          <Text style={styles.statVal}>{selectedCard.attack}</Text>
                       </View>
                       <View style={styles.statBox}>
                          <MaterialCommunityIcons name="shield" size={16} color="#3B82F6" />
                          <Text style={styles.statVal}>{selectedCard.defense}</Text>
                       </View>
                    </View>

                    <Text style={styles.modalLoreTitle}>Biblical Context</Text>
                    <Text style={styles.modalLoreText}>{selectedCard.loreContext}</Text>

                    <Text style={styles.modalVerseTitle}>Scripture Focus</Text>
                    <View style={styles.verseCard}>
                       <Text style={styles.verseText}>{selectedCard.verseText.replace('____', selectedCard.missingWord)}</Text>
                       <Text style={styles.verseRef}>{selectedCard.mainVerse}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1e1b4b', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  mainContainer: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 4
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8
  },
  activeTab: { backgroundColor: '#4338CA' },
  tabText: { color: '#94a3b8', fontWeight: 'bold' },
  activeTabText: { color: '#FFF' },
  
  scrollContent: { padding: 16, paddingBottom: 40 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardContainer: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  cardLocked: {
    opacity: 0.8,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  grayscale: {
    // Note: Grayscale is hard in RN without libraries, using low opacity + dark overlay
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    paddingTop: 20
  },
  cardName: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  rarityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4
  },
  rarityText: { color: '#FFF', fontSize: 8, fontWeight: 'bold' },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  ownedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 2
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    width: '100%',
    maxHeight: '85%',
    overflow: 'hidden'
  },
  modalImage: { width: '100%', height: 250 },
  modalImageOverlay: { ...StyleSheet.absoluteFillObject, height: 250 },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 4
  },
  modalBody: { padding: 20 },
  modalName: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  modalMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  modalRarity: { fontWeight: 'bold', fontSize: 14 },
  modalClass: { color: '#94a3b8', fontSize: 14 },
  
  statsRow: { flexDirection: 'row', gap: 20, marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 12 },
  statBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statVal: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  
  modalLoreTitle: { color: '#93C5FD', fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
  modalLoreText: { color: '#CBD5E1', fontSize: 14, lineHeight: 20, marginBottom: 20 },
  
  modalVerseTitle: { color: '#A78BFA', fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
  verseCard: { backgroundColor: 'rgba(167, 139, 250, 0.1)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)' },
  verseText: { color: '#FFF', fontSize: 14, fontStyle: 'italic', lineHeight: 22, marginBottom: 8 },
  verseRef: { color: '#A78BFA', fontSize: 12, fontWeight: 'bold', textAlign: 'right' }
});

export default GameCardLibrary;
