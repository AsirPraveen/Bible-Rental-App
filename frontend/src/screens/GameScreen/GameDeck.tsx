import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform, StatusBar, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const GameDeck = ({ navigation }: any) => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [activeDeck, setActiveDeck] = useState<string[]>([]); // Storing uniqueInstanceIds
  const [activeEvent, setActiveEvent] = useState<string | null>(null); // Storing the Event Card uniqueInstanceId
  const [armorInventory, setArmorInventory] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [showArmorModal, setShowArmorModal] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const resUser = await axios.post(`${API_URL}/api/auth/userdata`, { token });
      const userEmail = resUser.data.data.email;
      setEmail(userEmail);
      
      const resGame = await axios.get(`${API_URL}/api/game/data?email=${userEmail}`);
      
      if (resGame.data.data.cardInventory) {
          setInventory(resGame.data.data.cardInventory);
      }
      if (resGame.data.data.armorInventory) {
          setArmorInventory(resGame.data.data.armorInventory);
      }
      if (resGame.data.data.activeDeck) {
          // Store the uniqueInstanceId of equipped cards if available, or just _id
          setActiveDeck(resGame.data.data.activeDeck.map((c: any) => c.uniqueInstanceId || c._id));
      }
      if (resGame.data.data.activeEventCard) {
          const eCard = resGame.data.data.activeEventCard;
          setActiveEvent(eCard.uniqueInstanceId || eCard._id);
      }
    } catch (e) {
      console.log('Error fetching user for deck', e);
    }
  };

  const saveDeck = async () => {
    if (activeDeck.length === 0) {
      Alert.alert("Invalid Deck", "You must have at least 1 card in your deck.");
      return;
    }
    
    setLoading(true);
    try {
      const payload: any = { email, deckIds: activeDeck };
      if (activeEvent) payload.eventId = activeEvent;
      
      const res = await axios.post(`${API_URL}/api/game/deck/equip`, payload);
      if (res.data.status === 'error') {
         Alert.alert("Error", res.data.data || "Could not save deck (server error).");
      } else {
         Alert.alert("Success", "Deck saved successfully!");
      }
    } catch (e: any) {
      console.log('Error saving deck', e.response?.data || e);
      Alert.alert("Error", "Could not save deck. Ensure you own these cards.");
    } finally {
      setLoading(false);
    }
  };

  const handleEquipArmor = async (armorName: string) => {
    if(!selectedCard) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/game/deck/equip-armor`, {
        email,
        uniqueInstanceId: selectedCard.uniqueInstanceId, // The subdocument ID
        armorName
      });
      
      if(res.data.status === 'ok') {
         Alert.alert("Armor Equipped!", res.data.data.message);
         setShowArmorModal(false);
         fetchUserData(); // Refresh to see updated armor
      } else {
         Alert.alert("Error", res.data.data);
      }
    } catch(e: any) {
      Alert.alert("Error", e.response?.data?.data || "Could not equip armor.");
    } finally {
      setLoading(false);
    }
  };

  const toggleCardInDeck = (instanceId: string, isEvent: boolean = false) => {
    if (isEvent) {
       if (activeEvent === instanceId) {
          setActiveEvent(null);
       } else {
          setActiveEvent(instanceId);
       }
       return;
    }

    if (activeDeck.includes(instanceId)) {
      // Remove from deck
      setActiveDeck(prev => prev.filter(id => id !== instanceId));
    } else {
      // Add to deck (Max 3)
      if (activeDeck.length >= 3) {
        Alert.alert("Deck Full", "You can only equip 3 character cards for battle. Un-equip a character card first.");
        return;
      }
      setActiveDeck(prev => [...prev, instanceId]);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch(rarity) {
      case 'Legendary': return '#F59E0B'; // Gold
      case 'Rare': return '#3B82F6'; // Blue
      case 'Uncommon': return '#A7F3D0'; // Silver-ish green
      default: return '#9CA3AF'; // Bronze/Gray
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#1E3A8A', '#0F172A']} style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#BFDBFE" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Deck Builder</Text>
          <TouchableOpacity onPress={saveDeck}>
            <MaterialCommunityIcons name="content-save" size={28} color="#4ADE80" />
          </TouchableOpacity>
        </View>

        {/* Active Deck Top Display */}
        <View style={styles.activeDeckContainer}>
          <Text style={styles.sectionTitle}>Active Party ({activeDeck.length}/3)</Text>
          <View style={styles.deckSlotsRow}>
            {[0, 1, 2].map((slotIndex) => {
              const instanceId = activeDeck[slotIndex];
              const cardData = inventory.find(c => 
                (c.uniqueInstanceId && instanceId && c.uniqueInstanceId.toString() === instanceId.toString()) || 
                (c._id && instanceId && c._id.toString() === instanceId.toString())
              );
              
              if (cardData) {
                // Render equipped card
                return (
                  <TouchableOpacity key={`slot-${slotIndex}`} style={[styles.deckSlot, { borderColor: getRarityColor(cardData.rarity) }]} onPress={() => toggleCardInDeck(cardData.uniqueInstanceId || cardData._id)}>
                    <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(0,0,0,0.6)']} style={styles.slotGradient}>
                      <Text style={styles.slotName} numberOfLines={1}>{cardData.name}</Text>
                      <Text style={styles.slotClass}>{cardData.characterClass}</Text>
                      <View style={styles.equippedBadge}>
                        <MaterialCommunityIcons name="check" size={14} color="#FFF" />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              } else {
                // Render empty slot
                return (
                  <View key={`slot-${slotIndex}`} style={[styles.deckSlot, styles.emptySlot]}>
                    <MaterialCommunityIcons name="plus-circle-outline" size={32} color="rgba(255,255,255,0.3)" />
                  </View>
                );
              }
            })}
          </View>
          
          <Text style={[styles.sectionTitle, { marginTop: 15 }]}>Active Spell ({activeEvent ? 1 : 0}/1)</Text>
          <View style={{ alignItems: 'center' }}>
             {(() => {
                const eventCard = inventory.find(c => 
                  (c.uniqueInstanceId && activeEvent && c.uniqueInstanceId.toString() === activeEvent.toString()) || 
                  (c._id && activeEvent && c._id.toString() === activeEvent.toString())
                );
                if (eventCard) {
                   return (
                      <TouchableOpacity style={[styles.deckSlot, { borderColor: '#A855F7', width: '50%', height: 60 }]} onPress={() => toggleCardInDeck(eventCard.uniqueInstanceId || eventCard._id, true)}>
                         <LinearGradient colors={['rgba(168, 85, 247, 0.2)', 'rgba(0,0,0,0.8)']} style={[styles.slotGradient, { padding: 4, justifyContent: 'center', alignItems: 'center' }]}>
                             <Text style={[styles.slotName, {color: '#D8B4FE'}]} numberOfLines={1}>{eventCard.name}</Text>
                             <Text style={{color: '#9CA3AF', fontSize: 10}}>{eventCard.type}</Text>
                             <View style={styles.equippedBadge}>
                               <MaterialCommunityIcons name="check" size={12} color="#FFF" />
                             </View>
                         </LinearGradient>
                      </TouchableOpacity>
                   )
                } else {
                   return (
                      <View style={[styles.deckSlot, styles.emptySlot, { width: '50%', height: 60 }]}>
                        <MaterialCommunityIcons name="auto-fix" size={24} color="rgba(168, 85, 247, 0.3)" />
                        <Text style={{color: "rgba(168, 85, 247, 0.3)", fontSize: 10}}>Equip a Spell</Text>
                      </View>
                   )
                }
             })()}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Scrollable Inventory list */}
        <View style={styles.inventorySection}>
          <Text style={styles.sectionTitle}>Your Collection</Text>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {inventory.map((card: any) => {
              const instanceId = card.uniqueInstanceId || card._id;
              
              if (card.isEventCard) {
                 const isEquippedEvent = activeEvent === instanceId;
                 return (
                    <View key={instanceId} style={styles.cardItemWrapper}>
                      <TouchableOpacity 
                        style={[styles.cardItem, isEquippedEvent && styles.cardItemEquipped, { borderLeftColor: '#A855F7' }]}
                        onPress={() => toggleCardInDeck(instanceId, true)}
                      >
                         <View style={styles.cardHeader}>
                           <View style={{flexDirection: 'row', alignItems: 'center'}}>
                              <MaterialCommunityIcons name="auto-fix" size={18} color="#D8B4FE" style={{marginRight: 8}} />
                              <Text style={[styles.cardName, {color: '#D8B4FE'}]}>{card.name}</Text>
                           </View>
                           <View style={styles.rarityBadge}>
                             <Text style={[styles.rarityText, { color: getRarityColor(card.rarity) }]}>{card.rarity}</Text>
                           </View>
                         </View>
                         <Text style={{color: '#E9D5FF', fontSize: 12, marginBottom: 8}}>{card.mainVerse}</Text>
                         <Text style={{color: '#FFF', fontSize: 13, backgroundColor: 'rgba(168, 85, 247, 0.2)', padding: 8, borderRadius: 8}}>{card.loreContext}</Text>
                         
                         {isEquippedEvent && (
                           <View style={styles.equippedOverlay}>
                              <Text style={styles.equippedOverlayText}>EQUIPPED</Text>
                           </View>
                         )}
                      </TouchableOpacity>
                    </View>
                 )
              }

              const isEquipped = activeDeck.includes(instanceId);
              
              return (
                <View key={instanceId} style={styles.cardItemWrapper}>
                  <TouchableOpacity 
                    style={[styles.cardItem, isEquipped && styles.cardItemEquipped, { borderLeftColor: getRarityColor(card.rarity) }]}
                    onPress={() => toggleCardInDeck(instanceId)}
                  >
                  <View style={styles.cardHeader}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                       <Text style={styles.cardName}>{card.name}</Text>
                    </View>
                    <View style={styles.rarityBadge}>
                      <Text style={[styles.rarityText, { color: getRarityColor(card.rarity) }]}>{card.rarity}</Text>
                    </View>
                  </View>

                  <Text style={styles.cardAttributes}>Trait: <Text style={{color:'#D1FAE5'}}>{card.type}</Text> | Role: <Text style={{color:'#D1FAE5'}}>{card.characterClass || card.class}</Text></Text>
                  
                  <View style={styles.statsRow}>
                    <Text style={styles.statText}><FontAwesome5 name="heart" size={10} color="#EF4444" /> {card.hp}</Text>
                    <Text style={styles.statText}><MaterialCommunityIcons name="sword" size={12} color="#F59E0B" /> {card.attack}</Text>
                    <Text style={styles.statText}><MaterialCommunityIcons name="shield" size={12} color="#3B82F6" /> {card.defense}</Text>
                  </View>
                  
                  {/* Equipped Armor Display */}
                  {card.equippedArmor && card.equippedArmor.length > 0 && (
                     <View style={{flexDirection: 'row', gap: 6, marginTop: 10}}>
                       {card.equippedArmor.map((armor: string, i: number) => (
                          <View key={i} style={styles.armorPillSmall}>
                             <FontAwesome5 name="shield-alt" size={10} color="#FDE68A" />
                             <Text style={{color: '#FDE68A', fontSize: 10}}>{armor}</Text>
                          </View>
                       ))}
                     </View>
                  )}

                  {isEquipped && (
                    <View style={styles.equippedOverlay}>
                       <Text style={styles.equippedOverlayText}>EQUIPPED</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Armor Button */}
                <TouchableOpacity 
                   style={styles.equipArmorBtn}
                   onPress={() => {
                      setSelectedCard(card);
                      setShowArmorModal(true);
                   }}
                >
                   <MaterialCommunityIcons name="shield-plus" size={20} color="#FFF" />
                   <Text style={{color: '#FFF', fontSize: 12, fontWeight: 'bold'}}>ARMOR</Text>
                </TouchableOpacity>
              </View>
              )
            })}
            <View style={{height: 40}} />
          </ScrollView>
        </View>

        {/* Armor Equip Modal */}
        {selectedCard && (
        <React.Fragment>
          {showArmorModal && (
          <View style={styles.modalBg}>
             <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Equip Armor</Text>
                <Text style={{color: '#D1FAE5', marginBottom: 15}}>Select armor for {selectedCard.name}</Text>
                
                {armorInventory.length === 0 ? (
                   <Text style={{color: '#9CA3AF', marginVertical: 20, textAlign: 'center'}}>You don't own any unequipped Armor. Buy Armor Boxes from the Merchant Tent!</Text>
                ) : (
                   <ScrollView style={{width: '100%', maxHeight: 300, marginBottom: 20}}>
                      {armorInventory.map((armor, idx) => (
                         <TouchableOpacity 
                           key={idx} 
                           style={styles.armorOptionBtn}
                           onPress={() => handleEquipArmor(armor)}
                         >
                            <FontAwesome5 name="shield-alt" size={16} color="#FDE68A" />
                            <Text style={{color: '#FFF', fontWeight: 'bold'}}>{armor}</Text>
                         </TouchableOpacity>
                      ))}
                   </ScrollView>
                )}

                <TouchableOpacity style={[styles.armorOptionBtn, {backgroundColor: '#EF4444', justifyContent: 'center'}]} onPress={() => setShowArmorModal(false)}>
                   <Text style={{color: '#FFF', fontWeight: 'bold'}}>CANCEL</Text>
                </TouchableOpacity>
             </View>
          </View>
          )}
        </React.Fragment>
        )}

      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 10,
  },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  sectionTitle: { color: '#93C5FD', fontSize: 16, fontWeight: 'bold', marginLeft: 16, marginBottom: 12 },
  
  activeDeckContainer: {
    paddingVertical: 10,
  },
  deckSlotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 10,
  },
  deckSlot: {
    width: 100,
    height: 140,
    borderRadius: 8,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
  },
  emptySlot: {
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  slotGradient: {
    flex: 1,
    padding: 8,
    justifyContent: 'flex-end',
  },
  slotName: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  slotClass: { color: '#9CA3AF', fontSize: 10 },
  equippedBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#059669',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  divider: { height: 1, backgroundColor: '#334155', marginVertical: 16, marginHorizontal: 16 },
  
  inventorySection: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  cardItemWrapper: {
    marginBottom: 8,
  },
  cardItem: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    overflow: 'hidden', // for the "EQUIPPED" overlay
  },
  cardItemEquipped: {
    opacity: 0.8,
    borderColor: '#059669',
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardName: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  rarityBadge: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  rarityText: { fontSize: 11, fontWeight: 'bold' },
  cardAttributes: { color: '#9CA3AF', fontSize: 13, marginBottom: 12 },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  
  equippedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  equippedOverlayText: {
    color: 'rgba(5, 150, 105, 0.5)',
    fontWeight: '900',
    fontSize: 24,
    transform: [{ rotate: '-15deg' }],
    letterSpacing: 4,
  },
  armorPillSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(253, 230, 138, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  equipArmorBtn: {
    flexDirection: 'row',
    backgroundColor: '#0EA5E9',
    padding: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  modalBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    width: '85%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#38BDF8',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  armorOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    gap: 10,
  }
});

export default GameDeck;
