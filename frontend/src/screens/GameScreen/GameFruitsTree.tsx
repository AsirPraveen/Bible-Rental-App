import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, StatusBar, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import LoadingScreen from '../../components/LoadingScreen';
import { useTheme, ColorsType } from '../../context/ThemeContext';
import { API_BASE_URL } from '../../config/api';

const API_URL = API_BASE_URL;

const FRUITS_CONFIG = [
  { id: 'love', name: 'Love', icon: 'heart', color: '#EF4444', desc: '+2% Healing potency' },
  { id: 'joy', name: 'Joy', icon: 'emoticon-happy', color: '#FDE047', desc: 'HP reward after victory' },
  { id: 'peace', name: 'Peace', icon: 'feather', color: '#60A5FA', desc: '+2 Defense to all cards' },
  { id: 'patience', name: 'Patience', icon: 'clock-outline', color: '#A7F3D0', desc: '+10 Max HP to all cards' },
  { id: 'kindness', name: 'Kindness', icon: 'hand-heart', color: '#F472B6', desc: '1% Shop discount' },
  { id: 'goodness', name: 'Goodness', icon: 'star', color: '#FBBF24', desc: '+1% Critical hit chance' },
  { id: 'faithfulness', name: 'Faithfulness', icon: 'shield-check', color: '#34D399', desc: '+5% Status Resistance' },
  { id: 'gentleness', name: 'Gentleness', icon: 'feather', color: '#D1FAE5', desc: '-3% Debuff damage' },
  { id: 'selfControl', name: 'Self-Control', icon: 'brain', color: '#818CF8', desc: 'Resist Blindness/Confusion' },
];

const GameFruitsTree = ({ navigation }: any) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [userFruits, setUserFruits] = useState<any>({});
  const [talents, setTalents] = useState(0);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

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
      if (resGame.data.data) {
        setUserFruits(resGame.data.data.fruitsTree || {});
        setTalents(resGame.data.data.talents || 0);
      }
    } catch (e) {
      console.log('Error fetching fruit tree data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (fruitId: string) => {
    const currentLevel = userFruits[fruitId]?.level || 0;
    const cost = (currentLevel + 1) * 20;

    if (talents < cost) {
      Alert.alert("Insufficient Talents", `You need ${cost} Talents to cultivate the Fruit of ${fruitId.charAt(0).toUpperCase() + fruitId.slice(1)}.`);
      return;
    }

    setUpgrading(fruitId);
    try {
      const res = await axios.post(`${API_URL}/api/game/upgrade-fruit`, {
        email,
        fruitName: fruitId
      });

      if (res.data.status === 'ok') {
        setUserFruits(res.data.data.fruitsTree);
        setTalents(res.data.data.talents);
        Alert.alert("Cultivation Successful!", res.data.message);
      }
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.error || "Could not upgrade fruit.");
    } finally {
      setUpgrading(null);
    }
  };

  if (loading) {
    return <LoadingScreen message="Growing fruits..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={colors.linearGradient} style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
             <MaterialCommunityIcons name="arrow-left" size={28} color="#FDE68A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tree of Fruits</Text>
          <View style={styles.talentBox}>
             <MaterialCommunityIcons name="star-circle" size={16} color="#FDE047" />
             <Text style={styles.talentText}>{talents}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.treeHeader}>
            <MaterialCommunityIcons name="tree" size={80} color="#4ADE80" />
            <Text style={styles.treeDesc}>Cultivate the Fruits of the Spirit to unlock permanent passive blessings for your entire deck.</Text>
          </View>

          <View style={styles.grid}>
            {FRUITS_CONFIG.map((fruit) => {
              const level = userFruits[fruit.id]?.level || 0;
              const cost = (level + 1) * 20;
              const isUpgrading = upgrading === fruit.id;

              return (
                <View key={fruit.id} style={styles.fruitCard}>
                  <View style={[styles.iconCircle, { backgroundColor: fruit.color + '33', borderColor: fruit.color }]}>
                    <MaterialCommunityIcons name={fruit.icon as any} size={32} color={fruit.color} />
                  </View>
                  
                  <Text style={styles.fruitName}>{fruit.name}</Text>
                  <Text style={styles.fruitLevel}>Level {level}</Text>
                  <Text style={styles.fruitEffect}>{fruit.desc}</Text>

                  <TouchableOpacity 
                    style={[styles.upgradeBtn, talents < cost && styles.btnDisabled]}
                    disabled={isUpgrading || talents < cost}
                    onPress={() => handleUpgrade(fruit.id)}
                  >
                    {isUpgrading ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="star-circle" size={14} color="#FDE047" />
                        <Text style={styles.upgradeBtnText}>{cost}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </ScrollView>

      </LinearGradient>
    </SafeAreaView>
  );
};

const getStyles = (colors: ColorsType) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.theme === 'dark' ? '#451a03' : colors.primary },
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
  
  scrollContent: { padding: 16, paddingBottom: 40 },
  treeHeader: { alignItems: 'center', marginBottom: 30 },
  treeDesc: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 10, paddingHorizontal: 20, lineHeight: 20 },
  
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16
  },
  fruitCard: {
    width: '47%',
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 10
  },
  fruitName: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  fruitLevel: { color: colors.theme === 'dark' ? '#FDE047' : colors.tint, fontSize: 14, marginTop: 2 },
  fruitEffect: { color: colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 8, height: 32 },
  
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#92400E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
    width: '100%',
    justifyContent: 'center'
  },
  upgradeBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  btnDisabled: {
    backgroundColor: '#4B2512',
    opacity: 0.6
  }
});

export default GameFruitsTree;
