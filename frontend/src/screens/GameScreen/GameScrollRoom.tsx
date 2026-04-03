import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const GameScrollRoom = ({ navigation }: any) => {
  const [unlockedLore, setUnlockedLore] = useState<string[]>([]);
  const [claimedRewards, setClaimedRewards] = useState<string[]>([]);
  const [allCards, setAllCards] = useState<any[]>([]);
  const [talents, setTalents] = useState(0);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const resUser = await axios.post(`${API_URL}/api/auth/userdata`, { token });
      const userEmail = resUser.data.data.email;
      setEmail(userEmail);
      
      const resGame = await axios.get(`${API_URL}/api/game/data?email=${userEmail}`);
      const resCards = await axios.get(`${API_URL}/api/game/cards`);
      
      if (resGame.data.data) {
        setUnlockedLore(resGame.data.data.unlockedLore || []);
        setClaimedRewards(resGame.data.data.claimedLoreRewards || []);
        setTalents(resGame.data.data.talents || 0);
      }
      
      if (resCards.data.status === 'ok') {
        setAllCards(resCards.data.data.filter((c: any) => !c.isEventCard));
      }
    } catch (e) {
      console.log('Error fetching lore data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async (cardName: string) => {
    setClaiming(cardName);
    try {
      const res = await axios.post(`${API_URL}/api/game/claim-lore-reward`, {
        email,
        cardName
      });

      if (res.data.status === 'ok') {
        setClaimedRewards(prev => [...prev, cardName]);
        setTalents(res.data.data.talents);
        Alert.alert("Reward Claimed!", res.data.message);
      }
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.error || "Could not claim reward.");
    } finally {
      setClaiming(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#DDD6FE" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#2E1065', '#1e1b4b']} style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
             <MaterialCommunityIcons name="arrow-left" size={28} color="#DDD6FE" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>The Scroll Room</Text>
          <View style={styles.talentBox}>
             <MaterialCommunityIcons name="star-circle" size={16} color="#FDE047" />
             <Text style={styles.talentText}>{talents}</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
           <Text style={styles.infoText}>"Write the vision and make it plain on tablets." Study the stories of the saints you've fought alongside and receive the inheritance of the faithful.</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {allCards.map((card) => {
            const isUnlocked = unlockedLore.includes(card.name);
            const isClaimed = claimedRewards.includes(card.name);
            const isClaiming = claiming === card.name;

            return (
              <View key={card._id} style={[styles.scrollCard, !isUnlocked && styles.scrollCardLocked]}>
                <View style={styles.scrollHeader}>
                  <View style={styles.scrollTitleBox}>
                    <MaterialCommunityIcons 
                        name={isUnlocked ? "script-text" : "script-text-outline"} 
                        size={24} 
                        color={isUnlocked ? "#FDE047" : "#4B5563"} 
                    />
                    <Text style={[styles.scrollName, !isUnlocked && { color: '#6B7280' }]}>{card.name}</Text>
                  </View>
                  {isUnlocked && (
                    <View style={[styles.badge, isClaimed ? styles.badgeClaimed : styles.badgeNew]}>
                      <Text style={styles.badgeText}>{isClaimed ? "STUDIED" : "NEW"}</Text>
                    </View>
                  )}
                </View>

                {isUnlocked ? (
                  <>
                    <Text style={styles.loreText} numberOfLines={selectedCard === card._id ? undefined : 2}>
                      {card.loreContext || "No lore recorded for this character yet."}
                    </Text>
                    
                    <View style={styles.actionRow}>
                        <TouchableOpacity onPress={() => setSelectedCard(selectedCard === card._id ? null : card._id)}>
                            <Text style={styles.readMore}>{selectedCard === card._id ? "Collapse" : "Read Full Scroll"}</Text>
                        </TouchableOpacity>

                        {!isClaimed && (
                            <TouchableOpacity 
                                style={styles.claimBtn}
                                onPress={() => handleClaimReward(card.name)}
                                disabled={isClaiming}
                            >
                                {isClaiming ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <MaterialCommunityIcons name="star-circle" size={14} color="#FDE047" />
                                        <Text style={styles.claimBtnText}>Claim 10</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                  </>
                ) : (
                  <Text style={styles.lockedText}>Win a battle with this card in your deck to unlock its story.</Text>
                )}
              </View>
            );
          })}
        </ScrollView>

      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#2E1065', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  talentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6
  },
  talentText: { color: '#FDE047', fontWeight: 'bold', fontSize: 16 },
  
  infoBox: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: { color: '#DDD6FE', fontSize: 13, fontStyle: 'italic', textAlign: 'center' },
  
  scrollContent: { padding: 16, gap: 16, paddingBottom: 40 },
  scrollCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  scrollCardLocked: {
    opacity: 0.6,
    backgroundColor: 'rgba(0,0,0,0.2)'
  },
  scrollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  scrollTitleBox: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scrollName: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  badgeNew: { backgroundColor: '#7C3AED' },
  badgeClaimed: { backgroundColor: '#10B981' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  
  loreText: { color: '#DDD6FE', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  lockedText: { color: '#6B7280', fontSize: 12, fontStyle: 'italic' },
  
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  readMore: { color: '#A78BFA', fontWeight: 'bold' },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4
  },
  claimBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' }
});

export default GameScrollRoom;
