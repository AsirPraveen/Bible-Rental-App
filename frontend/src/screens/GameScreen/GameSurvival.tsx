import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, StatusBar, Animated, Modal, TextInput, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

// Some base random enemies
const ENEMY_TEMPLATES = [
  { name: 'Amalekite Raider', sinWeakness: 'Courage', type: 'Fear', hp: 80, attack: 15, defense: 5, ability: 'Ambush', imageUrl: 'https://images.unsplash.com/photo-1599727713385-d678393526ae?q=80&w=2000' },
  { name: 'Philistine Giant', sinWeakness: 'Faith', type: 'Pride', hp: 150, attack: 25, defense: 15, ability: 'Crush', imageUrl: 'https://images.unsplash.com/photo-1502691876148-a84978e59af8?q=80&w=2000' },
  { name: 'False Prophet', sinWeakness: 'Truth', type: 'Deception', hp: 100, attack: 20, defense: 10, ability: 'Lies', imageUrl: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?q=80&w=2000' },
  { name: 'Roaring Lion', sinWeakness: 'Peace', type: 'Wrath', hp: 120, attack: 30, defense: 5, ability: 'Pounce', imageUrl: 'https://images.unsplash.com/photo-1534125860297-f5da1129b0df?q=80&w=2000' },
  { name: 'Baal Worshipper', sinWeakness: 'Humility', type: 'Pride', hp: 90, attack: 18, defense: 10, ability: 'Swarm', imageUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=2000' }
];

const SURVIVAL_THEMES = [
  ['#312E81', '#1E1B4B'], // Deep purple
  ['#7F1D1D', '#450A0A'], // Deep red
  ['#065F46', '#064E3B'], // Deep green
  ['#B45309', '#78350F'], // Deep orange
  ['#1E3A8A', '#172554'], // Deep blue
  ['#3F3F46', '#18181B'], // Dark grey
];

const GameSurvival = ({ navigation }: any) => {

  const [playerDeck, setPlayerDeck] = useState<any[]>([]);
  const [activeEventCard, setActiveEventCard] = useState<any>(null);
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);
  
  const [wave, setWave] = useState(1);
  const [theme, setTheme] = useState<readonly [string, string, ...string[]]>(SURVIVAL_THEMES[0] as any);
  const [enemy, setEnemy] = useState<any>(null);
  
  // Animation Values
  const playerAnim = React.useRef(new Animated.Value(0)).current;
  const enemyAnim = React.useRef(new Animated.Value(0)).current;
  
  const [turn, setTurn] = useState<'player'|'enemy'>('player');
  const [combatLog, setCombatLog] = useState<string[]>(['Welcome to Survival Mode!']);
  
  const [showQTE, setShowQTE] = useState(false);
  const [qteAnswer, setQteAnswer] = useState('');
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  
  const [endGameState, setEndGameState] = useState<'none' | 'defeat'>('none');
  const [email, setEmail] = useState('');
  
  useEffect(() => {
    fetchBattleData();
    spawnNextEnemy(1);
  }, []);

  const spawnNextEnemy = (waveNum: number) => {
     const template = ENEMY_TEMPLATES[Math.floor(Math.random() * ENEMY_TEMPLATES.length)];
     const newTheme = SURVIVAL_THEMES[Math.floor(Math.random() * SURVIVAL_THEMES.length)];
     setTheme(newTheme as any);
     
     // Increase stats by 15% per wave
     const multiplier = 1 + (waveNum * 0.15);
     const newHp = Math.floor(template.hp * multiplier);
     setEnemy({
         ...template,
         hp: newHp,
         maxHp: newHp,
         attack: Math.floor(template.attack * multiplier),
         defense: Math.floor(template.defense * multiplier),
         name: `${template.name} (Lv.${waveNum})`
     });
     setTurn('player');
  };

  const fetchBattleData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if(!token) return;
      const resUser = await axios.post(`${API_URL}/api/auth/userdata`, { token });
      const userEmail = resUser.data.data.email;
      setEmail(userEmail);
      
      const resGame = await axios.get(`${API_URL}/api/game/data?email=${userEmail}`);
      
      const activeDbDeck = resGame.data.data.activeDeck;
      if(activeDbDeck && activeDbDeck.length > 0) {
        
        const factionCounts: {[key: string]: number} = {};
        activeDbDeck.forEach((c: any) => {
           if (c.faction) factionCounts[c.faction] = (factionCounts[c.faction] || 0) + 1;
        });

        const battleReadyDeck = activeDbDeck.map((c: any) => {
           let bonusHp = 0; let bonusAtk = 0; let bonusDef = 0;
           if (c.equippedArmor && c.equippedArmor.length > 0) {
              c.equippedArmor.forEach((armor: string) => {
                 if (armor === 'Shield of Faith') bonusDef += 20;
                 if (armor === 'Sword of the Spirit') bonusAtk += 15;
                 if (armor === 'Breastplate of Righteousness') { bonusHp += 30; bonusDef += 10; }
                 if (armor === 'Helmet of Salvation') { bonusHp += 20; bonusDef += 15; }
                 if (armor === 'Belt of Truth') bonusDef += 5;
                 if (armor === 'Shoes of Peace') bonusHp += 10;
              });
           }
           if (factionCounts['Patriarchs'] >= 2) { bonusHp += 25; bonusDef += 10; }
           if (factionCounts['Judges'] >= 2) { bonusAtk += 20; }
           if (factionCounts['Kings'] >= 2) { bonusAtk += 10; bonusDef += 10; }
           if (factionCounts['Apostles'] >= 2) { bonusHp += 50; }

           return {
             ...c,
             hp: c.hp + bonusHp,
             maxHp: c.hp + bonusHp,
             attack: c.attack + bonusAtk,
             defense: c.defense + bonusDef,
             verseHidden: c.verseText || "..."
           };
        });
        setPlayerDeck(battleReadyDeck);
        if (resGame.data.data.activeEventCard) setActiveEventCard(resGame.data.data.activeEventCard);
        
        addLog(`Wave 1 begins! How long can you survive?`);
      } else {
        setCombatLog(['WARNING: No cards equipped! Go to the Deck Builder!']);
      }
    } catch (e) {
      console.log("Error loading survival deck", e);
    }
  };

  const activePlayer = playerDeck[activePlayerIdx];

  const addLog = (msg: string) => setCombatLog(prev => [msg, ...prev].slice(0, 5));

  const triggerAnim = (animValue: Animated.Value, isAttack: boolean) => {
     Animated.sequence([
        Animated.timing(animValue, { toValue: isAttack ? 50 : 10, duration: isAttack ? 150 : 50, useNativeDriver: true }),
        Animated.timing(animValue, { toValue: isAttack ? -10 : -10, duration: isAttack ? 100 : 50, useNativeDriver: true }),
        Animated.timing(animValue, { toValue: isAttack ? 0 : 10, duration: isAttack ? 150 : 50, useNativeDriver: true }),
        ...(isAttack ? [] : [Animated.timing(animValue, { toValue: 0, duration: 50, useNativeDriver: true })])
     ]).start();
  };

  const handleAttack = () => {
    if (turn !== 'player' || !enemy) return;
    
    let damage = activePlayer.attack - (enemy.defense / 2);
    let multiplier = 1;
    if (activePlayer.type === enemy.sinWeakness) {
      multiplier = 2;
    }
    const finalDamage = Math.max(1, Math.floor(damage * multiplier));
    
    triggerAnim(playerAnim, true);
    triggerAnim(enemyAnim, false);
    
    setTimeout(() => {
      setEnemy((prev: any) => ({ ...prev, hp: Math.max(0, prev.hp - finalDamage) }));
      addLog(`${activePlayer.name} attacks for ${finalDamage} damage!`);
      
      if (enemy.hp - finalDamage <= 0) {
        handleEnemyDefeat();
      } else {
        endPlayerTurn();
      }
    }, 400); 
  };
  
  const handleEnemyDefeat = () => {
     addLog(`Wave ${wave} cleared! Enemy defeated!`);
     
     // Minor heal between waves
     setPlayerDeck(currentDeck => {
        return currentDeck.map(c => {
           if (c.hp > 0) return { ...c, hp: Math.min(c.maxHp, c.hp + Math.floor(c.maxHp * 0.15)) };
           return c;
        });
     });
     
     setTimeout(() => {
        setWave(w => w + 1);
        spawnNextEnemy(wave + 1);
        addLog(`Wave ${wave + 1} approaches...`);
     }, 1500);
  };

  const startAbilityQTE = () => {
    if (turn !== 'player') return;
    setQteAnswer('');
    setShowQTE(true);
  };

  const handleQteSubmit = () => {
    setShowQTE(false);
    const expectedWord = activePlayer.missingWord ? activePlayer.missingWord.toLowerCase() : "lord";
    const isCorrect = qteAnswer.trim().toLowerCase() === expectedWord;

    if (isCorrect) {
      const criticalDamage = activePlayer.attack * 2.5;
      triggerAnim(playerAnim, true);
      triggerAnim(enemyAnim, false);
      
      setTimeout(() => {
         setEnemy((prev: any) => ({ ...prev, hp: Math.max(0, prev.hp - criticalDamage) }));
         addLog(`CRITICAL HIT! ${activePlayer.name} deals ${criticalDamage} damage!`);
         if (enemy.hp - criticalDamage <= 0) {
           handleEnemyDefeat();
         } else {
           endPlayerTurn();
         }
      }, 400);
    } else {
      addLog('The verse was forgotten... the ability failed.');
      endPlayerTurn();
    }
  };

  const handleSelah = () => {
    if (turn !== 'player') return;
    const heal = Math.floor(activePlayer.maxHp * 0.3);
    const updatedDeck = [...playerDeck];
    updatedDeck[activePlayerIdx].hp = Math.min(activePlayer.maxHp, activePlayer.hp + heal);
    setPlayerDeck(updatedDeck);
    addLog(`${activePlayer.name} takes a Selah and heals for ${heal} HP.`);
    endPlayerTurn();
  };

  const handleCastSpell = () => {
    if (turn !== 'player' || !activeEventCard) return;
    const effect = activeEventCard.eventEffect;
    if (effect === 'heal50') {
       const updatedDeck = [...playerDeck];
       updatedDeck.forEach(c => { if(c.hp > 0) c.hp = Math.min(c.maxHp, c.hp + Math.floor(c.maxHp * 0.5)); });
       setPlayerDeck(updatedDeck);
       addLog(`Cast ${activeEventCard.name}! Party healed 50% HP!`);
    } else if (effect === 'damageAll20') {
       const damage = 40; // Buffed for survival
       setEnemy((prev:any) => ({ ...prev, hp: Math.max(0, prev.hp - damage) }));
       addLog(`Cast ${activeEventCard.name}! Dealt ${damage} damage!`);
       triggerAnim(enemyAnim, false);
       if (enemy.hp - damage <= 0) {
           handleEnemyDefeat();
           setActiveEventCard(null);
           return;
       }
    } else if (effect === 'revive') {
       const updatedDeck = [...playerDeck];
       updatedDeck.forEach(c => { if(c.hp <= 0) c.hp = Math.floor(c.maxHp * 0.25); });
       setPlayerDeck(updatedDeck);
       addLog(`Cast ${activeEventCard.name}! Allies revived.`);
    } else if (effect === 'shieldTurn') {
       const updatedDeck = [...playerDeck];
       updatedDeck[activePlayerIdx].hp = Math.min(activePlayer.maxHp, activePlayer.hp + 50);
       setPlayerDeck(updatedDeck);
       addLog(`Cast ${activeEventCard.name}! Gained shield!`);
    }
    setActiveEventCard(null);
    endPlayerTurn();
  };

  const endPlayerTurn = () => {
    setTurn('enemy');
    setTimeout(enemyTurn, 1500);
  };

  const enemyTurn = () => {
    if (!enemy || enemy.hp <= 0) return;
    
    // Reverse logic for enemy attack animation (negative translate)
    Animated.sequence([
      Animated.timing(enemyAnim, { toValue: -50, duration: 150, useNativeDriver: true }),
      Animated.timing(enemyAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(enemyAnim, { toValue: 0, duration: 150, useNativeDriver: true })
    ]).start();
    triggerAnim(playerAnim, false);
    
    setTimeout(() => {
      setPlayerDeck(currentDeck => {
          const updatedDeck = [...currentDeck];
          const currentActive = updatedDeck[activePlayerIdx];
          
          if (currentActive) {
            const damage = Math.max(1, Math.floor(enemy.attack - (currentActive.defense / 2)));
            updatedDeck[activePlayerIdx].hp = Math.max(0, currentActive.hp - damage);
            addLog(`💥 ${enemy.name} used ${enemy.ability}! Dealt ${damage} damage.`);
            
            if (updatedDeck[activePlayerIdx].hp <= 0) {
              addLog(`💀 ${currentActive.name} fainted!`);
              const nextAliveIdx = updatedDeck.findIndex((c, idx) => idx !== activePlayerIdx && c.hp > 0);
              if (nextAliveIdx !== -1) {
                  setActivePlayerIdx(nextAliveIdx);
                  addLog(`🔄 ${updatedDeck[nextAliveIdx].name} takes the field!`);
              } else {
                  addLog(`DEFEAT! Survived ${wave - 1} waves.`);
                  setTimeout(() => setEndGameState('defeat'), 1000);
              }
            }
          }
          return updatedDeck;
      });
      setTurn('player');
    }, 400);
  };

  const performSwitch = (newIdx: number) => {
    setShowSwitchModal(false);
    if (newIdx !== activePlayerIdx && playerDeck[newIdx].hp > 0) {
        setActivePlayerIdx(newIdx);
        addLog(`Switched to ${playerDeck[newIdx].name}!`);
        endPlayerTurn();
    }
  };

  // If loading or error
  if (!enemy || !activePlayer) {
      return (
         <SafeAreaView style={styles.safeArea}>
            <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
               <Text style={{color:'#FFF'}}>Preparing the Arena...</Text>
            </View>
         </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme[1] }]}>
      <LinearGradient colors={theme} style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#C7D2FE" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Survival (Wave {wave})</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Battlefield Area */}
        <View style={styles.battlefield}>
          {/* Enemy Side */}
          <View style={[styles.enemySide, { opacity: enemy.hp <= 0 ? 0.3 : 1 }]}>
            <View style={styles.statBox}>
              <Text style={styles.nameText}>{enemy.name}</Text>
              <Text style={styles.typeText}>Sin: {enemy.type}</Text>
              <View style={styles.healthBarContainer}>
                <View style={[styles.healthBar, { width: `${(Math.max(0, enemy.hp) / enemy.maxHp) * 100}%`, backgroundColor: '#DC2626' }]} />
              </View>
              <Text style={styles.hpText}>{Math.max(0, Math.floor(enemy.hp))} / {enemy.maxHp}</Text>
            </View>
            <Animated.View style={[styles.spritePlaceholderEnemy, { transform: [{ translateX: enemyAnim }] }]}>
               <Image 
                 source={{ uri: enemy.imageUrl || 'https://via.placeholder.com/200' }} 
                 style={styles.spriteImage} 
               />
            </Animated.View>
          </View>

          {/* Combat Log */}
          <View style={styles.logBox}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{justifyContent: 'flex-end', flexGrow: 1}}>
                {combatLog.slice().reverse().map((log, i) => (
                  <Text key={i} style={[styles.logText, i===combatLog.length-1 ? styles.logTextLatest : {}]}>{log}</Text>
                ))}
            </ScrollView>
          </View>

          {/* Player Side */}
          <View style={styles.playerSide}>
             <Animated.View style={[styles.spritePlaceholderPlayer, { transform: [{ translateX: playerAnim }] }]}>
               <Image 
                 source={{ uri: activePlayer.imageUrl || 'https://via.placeholder.com/200' }} 
                 style={styles.spriteImage} 
               />
            </Animated.View>
            <View style={styles.statBox}>
              <Text style={styles.nameText}>{activePlayer.name}</Text>
              <Text style={styles.typeText}>Role: {activePlayer.characterClass || activePlayer.class}</Text>
              <View style={styles.healthBarContainer}>
                <View style={[styles.healthBar, { width: `${(Math.max(0, activePlayer.hp) / activePlayer.maxHp) * 100}%`, backgroundColor: '#4ADE80' }]} />
              </View>
              <Text style={styles.hpText}>{Math.max(0, Math.floor(activePlayer.hp))} / {activePlayer.maxHp}</Text>
            </View>
          </View>
        </View>

        {/* Controls UI */}
        <View style={styles.controlPanel}>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleAttack} disabled={turn !== 'player'}>
               <MaterialCommunityIcons name="sword" size={24} color="#FFF" />
               <Text style={styles.btnText}>ATTACK</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4F46E5' }]} onPress={startAbilityQTE} disabled={turn !== 'player'}>
               <MaterialCommunityIcons name="flash" size={24} color="#FFF" />
               <Text style={styles.btnText}>ABILITY</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#059669' }]} onPress={handleSelah} disabled={turn !== 'player'}>
               <MaterialCommunityIcons name="meditation" size={24} color="#FFF" />
               <Text style={styles.btnText}>SELAH</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#D97706' }]} onPress={() => {if(turn==='player') setShowSwitchModal(true);}} disabled={turn !== 'player'}>
               <MaterialCommunityIcons name="swap-horizontal" size={24} color="#FFF" />
               <Text style={styles.btnText}>SWITCH</Text>
            </TouchableOpacity>
          </View>
          {activeEventCard && (
             <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#A855F7', padding: 12 }]} onPress={handleCastSpell} disabled={turn !== 'player'}>
                   <Text style={[styles.btnText, {fontSize: 14}]}>CAST {activeEventCard.name.toUpperCase()}</Text>
                </TouchableOpacity>
             </View>
          )}
        </View>

        {/* Modals omitted for brevity, keeping only defeat */}
        <Modal visible={endGameState === 'defeat'} transparent animationType="fade">
           <View style={styles.modalBg}>
              <View style={[styles.modalContent, { borderColor: '#DC2626' }]}>
                 <Text style={styles.modalTitle}>OVERWHELMED</Text>
                 <Text style={styles.modalDesc}>You survived {wave - 1} waves.</Text>
                 <TouchableOpacity style={[styles.submitBtn, {marginTop: 20}]} onPress={() => navigation.goBack()}>
                    <Text style={styles.btnText}>RETURN</Text>
                 </TouchableOpacity>
              </View>
           </View>
        </Modal>

        {/* Switch Modal */}
        <Modal visible={showSwitchModal} transparent animationType="fade">
           <View style={styles.modalBg}>
              <View style={[styles.modalContent, { borderColor: '#F59E0B' }]}>
                 <Text style={styles.modalTitle}>Switch Character</Text>
                 <View style={{ width: '100%', gap: 10, marginVertical: 15 }}>
                    {playerDeck.map((char, index) => (
                        <TouchableOpacity key={index} style={[styles.switchCardBtn, char.hp <= 0 && {opacity: 0.5}]}
                           disabled={char.hp <= 0 || index === activePlayerIdx} onPress={() => performSwitch(index)}>
                           <View>
                             <Text style={{color:'#FFF', fontWeight:'bold'}}>{char.name}</Text>
                             <Text style={{color:'#FFF'}}>HP: {Math.max(0, Math.floor(char.hp))}/{char.maxHp}</Text>
                           </View>
                        </TouchableOpacity>
                    ))}
                 </View>
                 <TouchableOpacity style={[styles.submitBtn, {backgroundColor: '#4B5563'}]} onPress={() => setShowSwitchModal(false)}>
                    <Text style={styles.btnText}>CANCEL</Text>
                 </TouchableOpacity>
              </View>
           </View>
        </Modal>
        
        {/* QTE Modal (Simplified) */}
        <Modal visible={showQTE} transparent animationType="fade">
          <View style={styles.modalBg}>
             <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Complete Verse!</Text>
                <Text style={{color:'#A7F3D0', fontStyle:'italic', marginBottom:20}}>"{activePlayer.verseHidden}"</Text>
                <TextInput style={{backgroundColor:'#FFF', width:'100%', padding:12, borderRadius:8, marginBottom:20}} placeholder="Missing word" value={qteAnswer} onChangeText={setQteAnswer} autoFocus />
                <TouchableOpacity style={styles.submitBtn} onPress={handleQteSubmit}>
                  <Text style={styles.btnText}>UNLEASH ATTACK</Text>
                </TouchableOpacity>
             </View>
          </View>
        </Modal>

      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  battlefield: { flex: 1, padding: 16, justifyContent: 'space-between' },
  enemySide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 16 },
  playerSide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16 },
  statBox: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 8, borderWidth: 2, borderColor: '#4338CA', minWidth: 200 },
  nameText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  typeText: { color: '#D1FAE5', fontSize: 12, marginBottom: 8 },
  healthBarContainer: { height: 10, backgroundColor: '#374151', borderRadius: 5, overflow: 'hidden', width: '100%' },
  healthBar: { height: '100%' },
  hpText: { color: '#FFF', fontSize: 12, textAlign: 'right', marginTop: 4 },
  spritePlaceholderEnemy: { 
    width: 120, 
    height: 120, 
    backgroundColor: 'rgba(239, 68, 68, 0.2)', 
    borderRadius: 60, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#7f1d1d',
    overflow: 'hidden',
    elevation: 8,
  },
  spritePlaceholderPlayer: { 
    width: 120, 
    height: 120, 
    backgroundColor: 'rgba(59, 130, 246, 0.2)', 
    borderRadius: 60, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1e3a8a',
    overflow: 'hidden',
    elevation: 8,
  },
  spriteImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logBox: { backgroundColor: 'rgba(0,0,0,0.7)', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#374151', flex: 1, marginVertical: 16 },
  logText: { color: '#9CA3AF', fontSize: 13, marginVertical: 4 },
  logTextLatest: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  controlPanel: { backgroundColor: '#1F2937', padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  actionBtn: { flex: 1, backgroundColor: '#1D4ED8', padding: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1E3A8A', width: '100%', borderRadius: 16, padding: 24, borderWidth: 2, borderColor: '#60A5FA', alignItems: 'center' },
  modalTitle: { color: '#FBBF24', fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  modalDesc: { color: '#FFF', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  submitBtn: { backgroundColor: '#059669', width: '100%', padding: 16, borderRadius: 8, alignItems: 'center' },
  switchCardBtn: { backgroundColor: '#1E293B', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#334155' }
});

export default GameSurvival;
