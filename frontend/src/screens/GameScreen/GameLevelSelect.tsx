import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

const GameLevelSelect = ({ navigation }: any) => {

  const levels = [
    { id: 1, name: "The Garden of Eden", boss: { name: "The Serpent", hp: 150, maxHp: 150, attack: 30, defense: 10, type: "Deception", sinWeakness: "Truth", ability: "Twist the Word" }, trait: "Deception", theme: ['#065F46', '#064E3B'] },
    { id: 2, name: "The Exodus", boss: { name: "The Pharaoh", hp: 200, maxHp: 200, attack: 35, defense: 15, type: "Pride", sinWeakness: "Humility", ability: "Hardened Heart" }, trait: "Pride", theme: ['#B45309', '#78350F'] },
    { id: 3, name: "Valley of Elah", boss: { name: "Goliath", hp: 300, maxHp: 300, attack: 40, defense: 25, type: "Pride", sinWeakness: "Courage", ability: "Intimidate" }, trait: "Pride", theme: ['#4D7C0F', '#14532D'] },
    { id: 4, name: "The Lion's Den", boss: { name: "Starving Lion", hp: 250, maxHp: 250, attack: 50, defense: 10, type: "Wrath", sinWeakness: "Peace", ability: "Savage Bite" }, trait: "Anger", theme: ['#3F3F46', '#18181B'] },
    { id: 5, name: "Mount Carmel", boss: { name: "Prophets of Baal", hp: 350, maxHp: 350, attack: 45, defense: 20, type: "Deception", sinWeakness: "Truth", ability: "False Fire" }, trait: "Idolatry", theme: ['#9A3412', '#450A0A'] },
    { id: 6, name: "The Wilderness (NT)", boss: { name: "The Tempter", hp: 400, maxHp: 400, attack: 50, defense: 30, type: "Deception", sinWeakness: "Truth", ability: "Twist Scripture" }, trait: "Temptation", theme: ['#A16207', '#422006'] },
    { id: 7, name: "The Sanhedrin", boss: { name: "The Pharisees", hp: 450, maxHp: 450, attack: 55, defense: 40, type: "Pride", sinWeakness: "Humility", ability: "Legalize" }, trait: "Hypocrisy", theme: ['#1E3A8A', '#172554'] },
    { id: 8, name: "Island of Patmos", boss: { name: "The Dragon", hp: 800, maxHp: 800, attack: 75, defense: 50, type: "Wrath", sinWeakness: "Faith", ability: "Fiery Breath" }, trait: "Deception", theme: ['#4C1D95', '#2E1065'] },
  ];

  const [completedLevels, setCompletedLevels] = useState<number[]>([]);

  useFocusEffect(
    useCallback(() => {
      const fetchProgression = async () => {
        try {
          const token = await AsyncStorage.getItem('token');
          if(!token) return;
          const resUser = await axios.post(`${API_URL}/api/auth/userdata`, { token });
          const resGame = await axios.get(`${API_URL}/api/game/data?email=${resUser.data.data.email}`);
          
          if (resGame.data.data.completedLevels) {
             setCompletedLevels(resGame.data.data.completedLevels);
          }
        } catch (e) {
          console.log("Error loading map progression:", e);
        }
      };
      
      fetchProgression();
    }, [])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#78350F', '#451A03']} style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FDE68A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>The Journey</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.mapText}>Follow the ancient paths and defeat spiritual strongholds.</Text>
          
          <View style={styles.mapPath}>
            {levels.map((level, index) => {
              const isCompleted = completedLevels.includes(level.id);
              // A level is locked if it's not Level 1, AND the previous level hasn't been completed.
              const isLocked = level.id !== 1 && !completedLevels.includes(level.id - 1);

              return (
              <View key={level.id} style={styles.levelNode}>
                
                {/* Connecting Line */}
                {index !== 0 && <View style={[styles.pathLine, isLocked && styles.pathLineLocked]} />}
                
                <TouchableOpacity 
                  style={[
                    styles.nodeButton, 
                    isCompleted ? styles.nodeCompleted : isLocked ? styles.nodeLocked : styles.nodeActive
                  ]}
                  disabled={isLocked}
                  onPress={() => navigation.navigate('GameBattle', { levelData: level })}
                >
                  {isCompleted && <MaterialCommunityIcons name="check-bold" size={30} color="#064E3B" />}
                  {isLocked && <MaterialCommunityIcons name="lock" size={24} color="#9CA3AF" />}
                  {!isCompleted && !isLocked && <MaterialCommunityIcons name="sword-cross" size={30} color="#FFF" />}
                </TouchableOpacity>

                <View style={styles.nodeInfo}>
                  <Text style={[styles.nodeTitle, isLocked && {color:'#9CA3AF'}]}>{level.id}. {level.name}</Text>
                  <Text style={styles.nodeBoss}>Boss: {level.boss.name} ({level.trait})</Text>
                </View>

              </View>
              );
            })}
          </View>

        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#451A03', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  mapText: { color: '#FDE68A', fontStyle: 'italic', fontSize: 16, textAlign: 'center', marginBottom: 30 },
  
  mapPath: {
    alignItems: 'center',
  },
  levelNode: {
    alignItems: 'center',
    marginBottom: 0,
  },
  pathLine: {
    width: 6,
    height: 80,
    backgroundColor: '#F59E0B',
  },
  pathLineLocked: {
    backgroundColor: '#374151',
  },
  nodeButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 4 },
  },
  nodeCompleted: { backgroundColor: '#34D399', borderColor: '#065F46' },
  nodeActive: { backgroundColor: '#DC2626', borderColor: '#FCA5A5' },
  nodeLocked: { backgroundColor: '#1F2937', borderColor: '#4B5563', elevation: 0 },
  
  nodeInfo: {
    marginTop: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  nodeTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  nodeBoss: { color: '#FCA5A5', fontSize: 14 }
});

export default GameLevelSelect;
