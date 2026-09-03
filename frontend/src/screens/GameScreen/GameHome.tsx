import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useTheme, ColorsType } from '../../context/ThemeContext';
import { API_BASE_URL } from '../../config/api';

const API_URL = API_BASE_URL;

const GameHome = ({ navigation }: any) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchGameData();
    }, [])
  );

  const fetchGameData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      // Step 1: get user email from token
      const resUser = await axios.post(`${API_URL}/api/auth/userdata`, { token });
      const email = resUser.data.data.email;
      
      // Step 2: GET game data
      const resGame = await axios.get(`${API_URL}/api/game/data?email=${email}`);
      setUserData(resGame.data.data);
    } catch (e) {
      console.log('Error fetching game data', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={colors.linearGradient} style={styles.container}>
        {/* Header Options */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>The Arena of Faith</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Currency Bar */}
        <View style={styles.currencyContainer}>
          <View style={styles.currencyPill}>
            <FontAwesome5 name="coins" size={16} color="#FBBF24" />
            <Text style={styles.currencyText}>{userData?.talents || 0} Talents</Text>
          </View>
          <View style={[styles.currencyPill, { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#3B82F6' }]}>
            <FontAwesome5 name="gem" size={16} color="#60A5FA" />
            <Text style={[styles.currencyText, { color: '#EFF6FF' }]}>{userData?.manna || 0} Manna</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* Main Action Buttons */}
          <View style={styles.actionGrid}>
             {/* The Campaign */}
             <TouchableOpacity style={styles.largeCard} onPress={() => navigation.navigate('GameLevelSelect')}>
                <LinearGradient colors={['#991B1B', '#7F1D1D']} style={styles.cardGradient}>
                   <MaterialCommunityIcons name="sword-cross" size={48} color="#FECACA" style={styles.cardIcon} />
                   <View style={styles.cardTextContainer}>
                      <Text style={styles.cardTitle}>The Journey</Text>
                      <Text style={styles.cardDesc}>Enter the campaign to battle spiritual strongholds.</Text>
                   </View>
                </LinearGradient>
             </TouchableOpacity>

             {/* Survival Mode */}
             <TouchableOpacity style={styles.largeCard} onPress={() => navigation.navigate('GameSurvival')}>
                <LinearGradient colors={['#4338CA', '#312E81']} style={styles.cardGradient}>
                   <MaterialCommunityIcons name="shield-sun" size={48} color="#C7D2FE" style={styles.cardIcon} />
                   <View style={styles.cardTextContainer}>
                      <Text style={styles.cardTitle}>Survival Arena</Text>
                      <Text style={styles.cardDesc}>Endless waves. No resting. How long can you survive?</Text>
                   </View>
                </LinearGradient>
             </TouchableOpacity>

             <View style={styles.rowCards}>
                {/* Deck Builder */}
                <TouchableOpacity style={styles.mediumCard} onPress={() => navigation.navigate('GameDeck')}>
                  <LinearGradient colors={['#1E40AF', '#1E3A8A']} style={styles.cardGradient}>
                      <MaterialCommunityIcons name="cards-playing" size={32} color="#BFDBFE" />
                      <Text style={styles.cardTitleSmall}>My Deck</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* The Shop */}
                <TouchableOpacity style={styles.mediumCard} onPress={() => navigation.navigate('GameShop')}>
                  <LinearGradient colors={['#065F46', '#064E3B']} style={styles.cardGradient}>
                      <FontAwesome5 name="store" size={30} color="#A7F3D0" />
                      <Text style={styles.cardTitleSmall}>Merchant Tent</Text>
                  </LinearGradient>
                </TouchableOpacity>
             </View>

             <View style={styles.rowCards}>
                {/* Card Library */}
                <TouchableOpacity style={styles.mediumCard} onPress={() => navigation.navigate('GameCardLibrary')}>
                  <LinearGradient colors={['#1E3A8A', '#1e1b4b']} style={styles.cardGradient}>
                      <MaterialCommunityIcons name="cards" size={32} color="#BFDBFE" />
                      <Text style={styles.cardTitleSmall}>Cards</Text>
                  </LinearGradient>
                </TouchableOpacity>
             </View>

              {/* Study Area & Fruits */}
             <View style={styles.rowCards}>
                <TouchableOpacity style={styles.mediumCard} onPress={() => navigation.navigate('GameStudyArea')}>
                  <LinearGradient colors={['#5B21B6', '#4C1D95']} style={styles.cardGradient}>
                      <MaterialCommunityIcons name="book-open-page-variant" size={32} color="#DDD6FE" />
                      <Text style={styles.cardTitleSmall}>Study Area</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mediumCard} onPress={() => navigation.navigate('GameFruitsTree')}>
                  <LinearGradient colors={['#B45309', '#92400E']} style={styles.cardGradient}>
                      <MaterialCommunityIcons name="tree" size={32} color="#FDE68A" />
                      <Text style={styles.cardTitleSmall}>Fruits Tree</Text>
                  </LinearGradient>
                </TouchableOpacity>
             </View>

             <View style={styles.rowCards}>
                <TouchableOpacity style={styles.mediumCard} onPress={() => navigation.navigate('GameCrafting')}>
                  <LinearGradient colors={['#7f1d1d', '#450a0a']} style={styles.cardGradient}>
                      <MaterialCommunityIcons name="fire" size={32} color="#DC2626" />
                      <Text style={styles.cardTitleSmall}>Refiner's Fire</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mediumCard} onPress={() => navigation.navigate('GameScrollRoom')}>
                  <LinearGradient colors={['#2E1065', '#1e1b4b']} style={styles.cardGradient}>
                      <MaterialCommunityIcons name="script-text" size={32} color="#DDD6FE" />
                      <Text style={styles.cardTitleSmall}>Scroll Room</Text>
                  </LinearGradient>
                </TouchableOpacity>
             </View>

          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const getStyles = (colors: ColorsType) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.theme === 'dark' ? '#111827' : colors.primary,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 10,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  currencyContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 20,
  },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F59E0B',
    gap: 8,
  },
  currencyText: {
    color: '#FDE68A',
    fontWeight: 'bold',
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  actionGrid: {
    gap: 16,
  },
  largeCard: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  rowCards: {
    flexDirection: 'row',
    gap: 16,
  },
  mediumCard: {
    flex: 1,
    height: 130,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  cardGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    opacity: 0.3,
  },
  cardTextContainer: {
    alignItems: 'flex-start',
    width: '100%',
    zIndex: 2,
  },
  cardTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  cardDesc: {
    color: '#FECACA',
    fontSize: 14,
  },
  cardTitleSmall: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  }
});

export default GameHome;
