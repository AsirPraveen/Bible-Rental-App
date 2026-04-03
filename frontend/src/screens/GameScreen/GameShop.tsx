import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform, StatusBar, Alert, Modal, Image, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const GameShop = ({ navigation }: any) => {
  const [talents, setTalents] = useState(0);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [pulledCards, setPulledCards] = useState<any[]>([]);
  const [revealIndex, setRevealIndex] = useState(-1);
  const [revealAnim] = useState(new Animated.Value(0));

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
      setTalents(resGame.data.data.talents);
    } catch (e) {
      console.log('Error fetching user for shop', e);
    }
  };

  const buyPack = async (packType: string, cost: number) => {
    if (talents < cost) {
      Alert.alert("Not enough Talents!", "Keep reading and returning books to earn more.");
      return;
    }

    Alert.alert(
      "Purchase Pack",
      `Spend ${cost} Talents to open ${packType}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Open", 
          onPress: async () => {
            setLoading(true);
            try {
              const res = await axios.post(`${API_URL}/api/game/shop/buy-pack`, {
                email,
                packType
              });
                if(res.data.status === 'ok') {
                  setTalents(res.data.data.talents);
                  // Start the reveal sequence
                  setPulledCards(res.data.data.pulledCards);
                  setRevealIndex(0);
                  Animated.timing(revealAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
                } else {
                  Alert.alert("Error", res.data.data);
                }
              } catch (e: any) {
                Alert.alert("Error", e.response?.data?.data || e.response?.data?.error || "Could not purchase pack.");
              } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const buyArmor = async () => {
    if (talents < 250) {
      Alert.alert("Not enough Talents!", "Keep reading and returning books to earn more.");
      return;
    }

    Alert.alert(
      "Purchase Armor Box",
      `Spend 250 Talents for a random piece of the Armor of God?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Open Box", 
          onPress: async () => {
            setLoading(true);
            try {
              const res = await axios.post(`${API_URL}/api/game/shop/buy-armor`, { email });
              if(res.data.status === 'ok') {
                setTalents(res.data.data.talents);
                Alert.alert("Armor Pulled!", `You obtained: \n\n🛡️ ${res.data.data.armorPulled}\n\nEquip this in the Deck Builder!`);
              } else {
                Alert.alert("Error", res.data.data);
              }
            } catch (e: any) {
              Alert.alert("Error", e.response?.data?.data || "Could not purchase armor.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const nextReveal = () => {
    if (revealIndex < pulledCards.length - 1) {
      revealAnim.setValue(0);
      setRevealIndex(revealIndex + 1);
      Animated.spring(revealAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }).start();
    } else {
      setRevealIndex(-1);
      setPulledCards([]);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#064E3B', '#022C22']} style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#D1FAE5" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>The Merchant's Tent</Text>
          <View style={styles.currencyPill}>
            <FontAwesome5 name="coins" size={14} color="#FCD34D" />
            <Text style={styles.currencyText}>{talents}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.welcomeText}>"Welcome, traveler. Trade your Talents for the wisdom of the ancients."</Text>
          
          <View style={styles.packContainer}>
            
            {/* The Pilgrim's Pack */}
            <View style={styles.packCard}>
              <LinearGradient colors={['#A16207', '#713F12']} style={styles.packGradient}>
                <FontAwesome5 name="box-open" size={40} color="#FEF08A" />
                <View style={styles.packInfo}>
                  <Text style={styles.packTitle}>The Pilgrim's Pack</Text>
                  <Text style={styles.packDesc}>Contains 3 Common cards.</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.buyButton, talents < 100 && styles.buyButtonDisabled]} 
                  onPress={() => buyPack('Pilgrim', 100)}
                  disabled={loading}
                >
                  <Text style={styles.buyText}>100</Text>
                  <FontAwesome5 name="coins" size={12} color="#FFF" />
                </TouchableOpacity>
              </LinearGradient>
            </View>

            {/* The Prophet's Scroll */}
            <View style={styles.packCard}>
              <LinearGradient colors={['#4338CA', '#312E81']} style={styles.packGradient}>
                <FontAwesome5 name="scroll" size={40} color="#C7D2FE" />
                <View style={styles.packInfo}>
                  <Text style={styles.packTitle}>The Prophet's Scroll</Text>
                  <Text style={styles.packDesc}>4 cards. Guaranteed 1 Uncommon.</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.buyButton, { backgroundColor: '#4F46E5' }, talents < 500 && styles.buyButtonDisabled]} 
                  onPress={() => buyPack('Prophet', 500)}
                  disabled={loading}
                >
                  <Text style={styles.buyText}>500</Text>
                  <FontAwesome5 name="coins" size={12} color="#FFF" />
                </TouchableOpacity>
              </LinearGradient>
            </View>

            {/* The King's Treasury */}
            <View style={styles.packCard}>
              <LinearGradient colors={['#B91C1C', '#7F1D1D']} style={styles.packGradient}>
                <FontAwesome5 name="crown" size={40} color="#FECACA" />
                <View style={styles.packInfo}>
                  <Text style={styles.packTitle}>The King's Treasury</Text>
                  <Text style={styles.packDesc}>5 cards. Guaranteed Rare or Legendary.</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.buyButton, { backgroundColor: '#DC2626' }, talents < 1500 && styles.buyButtonDisabled]} 
                  onPress={() => buyPack('King', 1500)}
                  disabled={loading}
                >
                  <Text style={styles.buyText}>1500</Text>
                  <FontAwesome5 name="coins" size={12} color="#FFF" />
                </TouchableOpacity>
              </LinearGradient>
            </View>

            {/* The Armor Box */}
            <View style={styles.packCard}>
              <LinearGradient colors={['#0F766E', '#065F46']} style={styles.packGradient}>
                <FontAwesome5 name="shield-alt" size={40} color="#99F6E4" />
                <View style={styles.packInfo}>
                  <Text style={styles.packTitle}>Armor of God Box</Text>
                  <Text style={styles.packDesc}>1 random piece of Equipment.</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.buyButton, { backgroundColor: '#0D9488' }, talents < 250 && styles.buyButtonDisabled]} 
                  onPress={buyArmor}
                  disabled={loading}
                >
                  <Text style={styles.buyText}>250</Text>
                  <FontAwesome5 name="coins" size={12} color="#FFF" />
                </TouchableOpacity>
              </LinearGradient>
            </View>

          </View>

        </ScrollView>

        {/* Reveal Modal */}
        <Modal visible={revealIndex !== -1} transparent animationType="fade">
          <View style={styles.modalBg}>
            {pulledCards[revealIndex] && (
              <Animated.View style={[styles.revealCard, { 
                opacity: revealAnim,
                transform: [{ scale: revealAnim.interpolate({ inputRange:[0,1], outputRange:[0.8, 1] }) }] 
              }]}>
                <Image 
                  source={{ uri: pulledCards[revealIndex].imageUrl || 'https://via.placeholder.com/400' }} 
                  style={styles.revealedImage} 
                />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.revealOverlay}>
                  <Text style={styles.revealRarity}>{pulledCards[revealIndex].rarity}</Text>
                  <Text style={styles.revealName}>{pulledCards[revealIndex].name}</Text>
                  <Text style={styles.revealLore} numberOfLines={2}>{pulledCards[revealIndex].loreContext}</Text>
                </LinearGradient>
                
                <TouchableOpacity style={styles.tapToContinue} onPress={nextReveal}>
                  <Text style={styles.tapText}>Tap to Continue ({revealIndex + 1}/{pulledCards[revealIndex].total || pulledCards.length})</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </Modal>

      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#022C22', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Palatino' : 'serif' },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  currencyText: { color: '#FCD34D', fontWeight: 'bold', fontSize: 16 },
  scrollContent: { padding: 16 },
  welcomeText: { color: '#A7F3D0', fontStyle: 'italic', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  packContainer: { gap: 16 },
  packCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
  },
  packGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  packInfo: { flex: 1 },
  packTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  packDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CA8A04',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  buyButtonDisabled: { opacity: 0.5 },
  buyText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  
  // Reveal Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  revealCard: { 
    width: '85%', 
    height: '70%', 
    borderRadius: 24, 
    overflow: 'hidden', 
    borderWidth: 4, 
    borderColor: '#FCD34D',
    backgroundColor: '#000',
    elevation: 20,
    shadowColor: '#FCD34D',
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  revealedImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  revealOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingTop: 60 },
  revealRarity: { color: '#FCD34D', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  revealName: { color: '#FFF', fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  revealLore: { color: '#D1FAE5', fontSize: 14, fontStyle: 'italic', opacity: 0.8 },
  tapToContinue: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  tapText: { position: 'absolute', bottom: -50, alignSelf: 'center', color: '#FFF', fontSize: 16, fontWeight: 'bold', opacity: 0.7 },
});

export default GameShop;
