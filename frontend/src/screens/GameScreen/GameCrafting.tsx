import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform, StatusBar, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { useTheme, ColorsType } from '../../context/ThemeContext';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const GameCrafting = ({ navigation }: any) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [inventory, setInventory] = useState<any[]>([]);
  const [talents, setTalents] = useState(0);
  const [email, setEmail] = useState('');
  const [activeDeckIds, setActiveDeckIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [baseCard, setBaseCard] = useState<any>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [manna, setManna] = useState(0);
  const [activeTab, setActiveTab] = useState<'refine' | 'ascend'>('refine');

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
          // Filter out Event cards (we probably don't want to refine Plagues/Miracles)
          const charCards = resGame.data.data.cardInventory.filter((c:any) => !c.isEventCard);
          setInventory(charCards);
          setTalents(resGame.data.data.talents || 0);
          setManna(resGame.data.data.manna || 0);

          // Track which instance IDs are in the active deck
          const deckIds = resGame.data.data.activeDeck.map((item: any) => item.uniqueInstanceId);
          setActiveDeckIds(deckIds);
          
          // Clear selections if they no longer exist
          setBaseCard(null);
          setSelectedMaterials([]);
      }
    } catch (e) {
      console.log('Error fetching user for crafting', e);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch(rarity) {
      case 'Legendary': return '#F59E0B';
      case 'Rare': return '#3B82F6';
      case 'Uncommon': return '#A7F3D0';
      default: return '#9CA3AF';
    }
  };

  const handleSelectCard = (card: any) => {
    const instanceId = card.uniqueInstanceId || card._id;
    
    // First tap selects Base
    if (!baseCard) {
       setBaseCard(card);
       setSelectedMaterials([]);
       return;
    }
    
    // Tap base again to deselect everything
    if (baseCard.uniqueInstanceId === instanceId || baseCard._id === instanceId) {
       setBaseCard(null);
       setSelectedMaterials([]);
       return;
    }
    
    // Verify it's the exact same card type
    // In flattened inventory, ._id is the base card's ID
    if (baseCard._id !== card._id && baseCard.name !== card.name) {
       Alert.alert("Invalid Material", "You can only sacrifice duplicate copies of the precise same card in the Refiner's Fire.");
       return;
    }
    
    // Preventive: Don't allow selecting equipped cards as materials
    const isEquipped = activeDeckIds.includes(instanceId);
    if (isEquipped) {
       Alert.alert("Card In Use", "This card is currently in your Active Deck. Unequip it in the Deck Builder first before sacrificing it.");
       return;
    }
    
    // Toggle material selection
    if (selectedMaterials.includes(instanceId)) {
        setSelectedMaterials(prev => prev.filter(id => id !== instanceId));
    } else {
        setSelectedMaterials(prev => [...prev, instanceId]);
    }
  };

  const handleAscend = async () => {
    if (!baseCard) return;
    
    const cost = 50; 
    if (manna < cost) {
       Alert.alert("Insufficient Manna", `You need ${cost} Manna for this divine transformation.`);
       return;
    }

    Alert.alert(
      "Divine Ascension",
      `Are you sure you want to ascend ${baseCard.name} into ${baseCard.ascendsTo}? This costs ${cost} Manna and will reset refinement level for the new powerful form.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Ascend", 
          onPress: async () => {
            setLoading(true);
            try {
              const res = await axios.post(`${API_URL}/api/game/ascend-card`, {
                email,
                instanceId: baseCard.uniqueInstanceId || baseCard._id
              });
              
              if (res.data.status === 'ok') {
                 Alert.alert("Ascension Complete!", res.data.message);
                 fetchUserData();
              }
            } catch (e: any) {
              Alert.alert("Ascension Failed", e.response?.data?.error || "Could not complete the process.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRefine = async () => {
    if (!baseCard || selectedMaterials.length === 0) return;
    
    const cost = 50 * selectedMaterials.length;
    if (talents < cost) {
       Alert.alert("Insufficient Talents", `You need ${cost} Talents to stoke the Refiner's Fire for these cards.`);
       return;
    }

    Alert.alert(
      "Refiner's Fire",
      `Are you sure you want to sacrifice ${selectedMaterials.length} duplicate(s) to augment ${baseCard.name}? This costs ${cost} Talents and irreversibly consumes the materials.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Ignite", 
          onPress: async () => {
            setLoading(true);
            try {
              const baseId = baseCard.uniqueInstanceId || baseCard._id;
              const res = await axios.post(`${API_URL}/api/game/refine`, {
                email,
                baseInstanceId: baseId,
                materialInstanceIds: selectedMaterials
              });
              
              if (res.data.status === 'ok') {
                 Alert.alert("Refined Successfully!", res.data.data.message);
                 fetchUserData(); // Reloads inventory and clears selection
              } else {
                 Alert.alert("Error", res.data.data);
              }
            } catch (e: any) {
              const errorMsg = e.response?.data?.data || e.response?.data?.error || "Could not complete the process.";
              Alert.alert("Refining Failed", errorMsg);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const cost = selectedMaterials.length * 50;

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={colors.linearGradient} style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
             <MaterialCommunityIcons name="arrow-left" size={28} color="#FECACA" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Refiner's Fire</Text>
          <View style={styles.talentBox}>
             <MaterialCommunityIcons name="star-circle" size={16} color="#FDE047" />
             <Text style={styles.talentText}>{talents}</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
           <Text style={styles.infoText}>
              {activeTab === 'refine' 
                ? "The Refiner's Fire burns away the dross. Sacrifice duplicates to permanently increase base stats by 10% per level!" 
                : "Divine Ascension transforms a fully refined card into its legendary biblical form. Requires Refinement Lvl 5 and 50 Manna."}
           </Text>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'refine' && styles.activeTab]} 
            onPress={() => { setActiveTab('refine'); setBaseCard(null); setSelectedMaterials([]); }}
          >
            <Text style={[styles.tabText, activeTab === 'refine' && styles.activeTabText]}>Refiner's Fire</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'ascend' && styles.activeTab]} 
            onPress={() => { setActiveTab('ascend'); setBaseCard(null); setSelectedMaterials([]); }}
          >
            <Text style={[styles.tabText, activeTab === 'ascend' && styles.activeTabText]}>Ascension</Text>
          </TouchableOpacity>
        </View>
        
        {/* Crafting Altar */}
        <View style={styles.altarBox}>
           <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20}}>
              
              {/* Target Slot */}
              <View style={styles.altarSlotContainer}>
                 <Text style={{color: '#FFF', fontWeight: 'bold', marginBottom: 8}}>BASE CARD</Text>
                 <View style={[styles.altarSlot, baseCard && { borderColor: '#FDE047', borderWidth: 2 }]}>
                    {baseCard ? (
                       <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(0,0,0,0.6)']} style={styles.slotFill}>
                          <Text style={{color: '#FFF', fontSize: 13, fontWeight: 'bold', textAlign: 'center'}}>{baseCard.name}</Text>
                          <Text style={{color: '#FDE047', fontSize: 16, marginTop: 4}}>+{baseCard.refinementLevel || 0}</Text>
                       </LinearGradient>
                    ) : (
                       <MaterialCommunityIcons name="card-plus-outline" size={40} color="rgba(255,255,255,0.2)" />
                    )}
                 </View>
              </View>

              <MaterialCommunityIcons name="arrow-left-thick" size={40} color="#DC2626" />

               {/* Material Slot / Result Slot */}
               <View style={styles.altarSlotContainer}>
                  <Text style={{color: '#FFF', fontWeight: 'bold', marginBottom: 8}}>{activeTab === 'refine' ? 'SACRIFICE' : 'DESTINY'}</Text>
                  <View style={[styles.altarSlot, (selectedMaterials.length > 0 || (activeTab === 'ascend' && baseCard?.ascendsTo)) && { borderColor: activeTab === 'refine' ? '#DC2626' : '#60A5FA', borderWidth: 2 }]}>
                     {activeTab === 'refine' ? (
                        selectedMaterials.length > 0 ? (
                           <LinearGradient colors={['rgba(220, 38, 38,0.2)', 'rgba(0,0,0,0.6)']} style={styles.slotFill}>
                              <MaterialCommunityIcons name="fire" size={30} color="#DC2626" />
                              <Text style={{color: '#FFF', fontWeight: 'bold', marginTop: 8}}>{selectedMaterials.length} Cards</Text>
                           </LinearGradient>
                        ) : (
                           <MaterialCommunityIcons name="cards" size={40} color="rgba(255,255,255,0.2)" />
                        )
                     ) : (
                        baseCard?.ascendsTo ? (
                           <LinearGradient colors={['rgba(96, 165, 250, 0.2)', 'rgba(0,0,0,0.6)']} style={styles.slotFill}>
                              <MaterialCommunityIcons name="star-shooting" size={30} color="#60A5FA" />
                              <Text style={{color: '#FFF', textAlign: 'center', fontWeight: 'bold', marginTop: 8}}>{baseCard.ascendsTo}</Text>
                           </LinearGradient>
                        ) : (
                           <MaterialCommunityIcons name="auto-fix" size={40} color="rgba(255,255,255,0.2)" />
                        )
                     )}
                  </View>
               </View>

           </View>

            {/* Cost & Affirm Button */}
            <View style={styles.actionRow}>
               <View>
                  <Text style={{color: '#9CA3AF'}}>Cost:</Text>
                  {activeTab === 'refine' ? (
                     <Text style={{color: talents >= cost ? '#FDE047' : '#EF4444', fontWeight: 'bold', fontSize: 18}}>{cost} Talents</Text>
                  ) : (
                     <Text style={{color: manna >= 50 ? '#60A5FA' : '#EF4444', fontWeight: 'bold', fontSize: 18}}>50 Manna</Text>
                  )}
               </View>
               <TouchableOpacity 
                  style={[
                    styles.refineBtn, 
                    activeTab === 'ascend' && { backgroundColor: '#2563EB' },
                    ((activeTab === 'refine' && (!baseCard || selectedMaterials.length === 0 || talents < cost)) ||
                     (activeTab === 'ascend' && (!baseCard || !baseCard.ascendsTo || manna < 50 || (baseCard.refinementLevel || 0) < 5))) 
                    && styles.btnDisabled
                  ]}
                  disabled={loading || (activeTab === 'refine' ? (!baseCard || selectedMaterials.length === 0 || talents < cost) : (!baseCard || !baseCard.ascendsTo || manna < 50 || (baseCard.refinementLevel || 0) < 5))}
                  onPress={activeTab === 'refine' ? handleRefine : handleAscend}
               >
                  <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 18}}>
                    {loading ? "PROCESSING..." : activeTab === 'refine' ? "REFINE" : "ASCEND"}
                  </Text>
               </TouchableOpacity>
            </View>
        </View>

        <View style={styles.divider} />

        <View style={{flex: 1}}>
           <Text style={styles.sectionTitle}>
              {activeTab === 'refine' 
                ? (baseCard ? 'Select duplicates to sacrifice:' : 'Select a Base Card to refine:')
                : 'Select a highly-refined card to ascend:'
              }
           </Text>
           <ScrollView contentContainerStyle={styles.scrollContent}>
               {inventory.map((card: any) => {
                  const instanceId = card.uniqueInstanceId || card._id;
                  const isBase = baseCard && (baseCard.uniqueInstanceId === instanceId || baseCard._id === instanceId);
                  const isMaterial = selectedMaterials.includes(instanceId);
                  const isInDeck = activeDeckIds.includes(instanceId);
                  
                   // If base is selected, grey out non-duplicates
                   const isInvalid = activeTab === 'refine' 
                    ? (baseCard && !isBase && (card.cardId !== baseCard.cardId && card.name !== baseCard.name))
                    : (!card.ascendsTo);

                   return (
                      <TouchableOpacity 
                         key={instanceId}
                         style={[
                            styles.cardItem,
                            { borderLeftColor: getRarityColor(card.rarity) },
                            isBase && styles.cardItemBase,
                            isMaterial && styles.cardItemMaterial,
                            (activeTab === 'ascend' && isBase) && styles.cardItemAscend,
                            isInvalid && styles.cardItemDisabled
                         ]}
                         disabled={isInvalid}
                         onPress={() => handleSelectCard(card)}
                      >
                        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                           <View>
                              <Text style={styles.cardName}>{card.name} <Text style={{color: '#FDE047'}}>+{card.refinementLevel || 0}</Text></Text>
                              <Text style={{color: '#9CA3AF', fontSize: 12}}>{card.characterClass || card.class}</Text>
                           </View>
                           {isBase && <MaterialCommunityIcons name="star-shooting" size={24} color="#FDE047" />}
                           {isMaterial && <MaterialCommunityIcons name="fire" size={24} color="#DC2626" />}
                           {isInDeck && (
                              <View style={{ backgroundColor: 'rgba(59, 130, 246, 0.3)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                 <Text style={{ color: '#93C5FD', fontSize: 10, fontWeight: 'bold' }}>IN DECK</Text>
                              </View>
                           )}
                        </View>
                        <View style={styles.statsRow}>
                           <Text style={styles.statText}><FontAwesome5 name="heart" size={10} color="#EF4444" /> {card.hp}</Text>
                           <Text style={styles.statText}><MaterialCommunityIcons name="sword" size={12} color="#F59E0B" /> {card.attack}</Text>
                           <Text style={styles.statText}><MaterialCommunityIcons name="shield" size={12} color="#3B82F6" /> {card.defense}</Text>
                        </View>
                        
                        {/* Display equipped armor so users don't accidentally burn equipped cards */}
                        {card.equippedArmor && card.equippedArmor.length > 0 && (
                          <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
                             <MaterialCommunityIcons name="shield-star" size={12} color="#FDE68A" />
                             <Text style={{ color: '#FDE68A', fontSize: 10 }}>Armor Equipped! Cannot Sacrifice</Text>
                          </View>
                        )}
                     </TouchableOpacity>
                  )
               })}
           </ScrollView>
        </View>

      </LinearGradient>
    </SafeAreaView>
  );
};

const getStyles = (colors: ColorsType) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.theme === 'dark' ? '#450a0a' : colors.primary, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 10,
  },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
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
  
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 4
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6
  },
  activeTab: {
    backgroundColor: '#DC2626'
  },
  tabText: {
    color: '#9CA3AF',
    fontWeight: 'bold'
  },
  activeTabText: {
    color: '#FFF'
  },
  
  infoBox: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: { color: '#D1FAE5', fontSize: 13, fontStyle: 'italic', textAlign: 'center' },
  
  altarBox: {
     marginHorizontal: 16,
     backgroundColor: colors.cardBg,
     padding: 20,
     borderRadius: 16,
     borderWidth: 1,
     borderColor: colors.border
  },
  altarSlotContainer: {
     alignItems: 'center'
  },
  altarSlot: {
     width: 100,
     height: 140,
     backgroundColor: colors.inputBg,
     borderRadius: 8,
     justifyContent: 'center',
     alignItems: 'center',
     borderWidth: 1,
     borderColor: colors.border,
     overflow: 'hidden'
  },
  slotFill: {
     ...StyleSheet.absoluteFillObject,
     justifyContent: 'center',
     alignItems: 'center',
     padding: 8
  },
  actionRow: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     marginTop: 20,
  },
  refineBtn: {
     backgroundColor: '#DC2626',
     paddingHorizontal: 24,
     paddingVertical: 12,
     borderRadius: 8,
  },
  btnDisabled: {
     backgroundColor: '#475569',
     opacity: 0.5
  },
  
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  sectionTitle: { color: colors.theme === 'dark' ? '#FECACA' : colors.primary, fontSize: 16, fontWeight: 'bold', marginLeft: 16, marginBottom: 12 },
  
  scrollContent: {
     paddingHorizontal: 16,
     gap: 12,
     paddingBottom: 40,
  },
  cardItem: {
     backgroundColor: colors.cardBg,
     padding: 16,
     borderRadius: 12,
     borderLeftWidth: 4,
     borderWidth: 1,
     borderColor: colors.border
  },
  cardItemBase: {
     backgroundColor: 'rgba(253, 224, 71, 0.2)',
     borderColor: '#FDE047',
     borderWidth: 1,
     borderLeftWidth: 4,
  },
  cardItemMaterial: {
     backgroundColor: 'rgba(220, 38, 38, 0.2)',
     borderColor: '#DC2626',
     borderWidth: 1,
     borderLeftWidth: 4,
  },
  cardItemAscend: {
     backgroundColor: 'rgba(37, 99, 235, 0.2)',
     borderColor: '#2563EB',
     borderWidth: 1,
     borderLeftWidth: 4,
  },
  cardItemDisabled: {
     opacity: 0.3
  },
  cardName: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  statsRow: {
     flexDirection: 'row',
     gap: 16,
     marginTop: 10
  },
  statText: { color: colors.text, fontSize: 13, fontWeight: 'bold' }
});

export default GameCrafting;
