import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ProgressBarAndroid, Platform, SafeAreaView, StatusBar, Animated, Modal, TextInput, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const MOCK_BOSS = {
  id: 99, name: 'Goliath', sinWeakness: 'Courage', type: 'Pride', hp: 250, maxHp: 250, attack: 30, defense: 15, ability: 'Intimidate'
};

const GameBattle = ({ route, navigation }: any) => {
  const { levelData } = route.params || {};
  const currentTheme = (levelData?.theme || ['#7F1D1D', '#450A0A']) as readonly [string, string, ...string[]];

  const [playerDeck, setPlayerDeck] = useState<any[]>([]);
  const [activeEventCard, setActiveEventCard] = useState<any>(null);
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);
  const [enemy, setEnemy] = useState(levelData?.boss || MOCK_BOSS);
  
  // Animation Values
  const playerAnim = React.useRef(new Animated.Value(0)).current;
  const enemyAnim = React.useRef(new Animated.Value(0)).current;
  
  const [turn, setTurn] = useState<'player'|'enemy'>('player');
  const [combatLog, setCombatLog] = useState<string[]>(['Loading Battle...']);
  
  // QTE State
  const [showQTE, setShowQTE] = useState(false);
  const [qteAnswer, setQteAnswer] = useState('');
  
  // Switch State
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  // Endgame State
  const [endGameState, setEndGameState] = useState<'none' | 'victory' | 'defeat'>('none');
  
  useEffect(() => {
    const fetchBattleData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if(!token) return;
        const resUser = await axios.post(`${API_URL}/api/auth/userdata`, { token });
        const resGame = await axios.get(`${API_URL}/api/game/data?email=${resUser.data.data.email}`);
        
        const activeDbDeck = resGame.data.data.activeDeck;
        if(activeDbDeck && activeDbDeck.length > 0) {
          // Identify Faction Synergies
          const factionCounts: {[key: string]: number} = {};
          activeDbDeck.forEach((c: any) => {
             if (c.faction) {
                factionCounts[c.faction] = (factionCounts[c.faction] || 0) + 1;
             }
          });

           // Map DB cards to Battle format (adding maxHp, applying Armor buffs, and Synergy buffs)
           const battleReadyDeck = activeDbDeck.map((c: any) => {
              let bonusHp = 0;
              let bonusAtk = 0;
              let bonusDef = 0;
              
              // 1. Armor Buffs & Set Bonus
              const armorSet = new Set(c.equippedArmor || []);
              if (c.equippedArmor && c.equippedArmor.length > 0) {
                 c.equippedArmor.forEach((armor: string) => {
                    if (armor === 'Shield of Faith') bonusDef += 20;
                    if (armor === 'Sword of the Spirit') bonusAtk += 15;
                    if (armor === 'Breastplate of Righteousness') { bonusHp += 30; bonusDef += 10; }
                    if (armor === 'Helmet of Salvation') { bonusHp += 20; bonusDef += 15; }
                    if (armor === 'Belt of Truth') bonusDef += 5;
                    if (armor === 'Shoes of Peace') bonusHp += 10;
                 });
                 
                 // Aura of God Checklist (Full Set)
                 const required = ['Helmet of Salvation', 'Breastplate of Righteousness', 'Belt of Truth', 'Shoes of Peace', 'Shield of Faith', 'Sword of the Spirit'];
                 const hasFullSet = required.every(a => armorSet.has(a));
                 if (hasFullSet) {
                    bonusHp += 100;
                    bonusAtk += 20;
                    bonusDef += 30;
                    // Note: We could add a status effect 'Aura of God' here too
                 }
              }

              // 2. Faction Synergy Buffs
              if (factionCounts['Patriarchs'] >= 2) { bonusHp += 25; bonusDef += 10; }
              if (factionCounts['Judges'] >= 2) { bonusAtk += 20; }
              if (factionCounts['Kings'] >= 2) { bonusAtk += 10; bonusDef += 10; }
              if (factionCounts['Apostles'] >= 2) { bonusHp += 50; }

              // 3. Covenant Bonds (Combo Moves)
              // David & Jonathan
              const hasDavid = activeDbDeck.find((cd: any) => cd.name.includes("David"));
              const hasJonathan = activeDbDeck.find((cd: any) => cd.name === "Jonathan");
              if (hasDavid && hasJonathan) {
                 bonusAtk += 15;
                 bonusDef += 15;
              }

              return {
                ...c,
                hp: c.hp + bonusHp,
                maxHp: c.hp + bonusHp,
                attack: c.attack + bonusAtk,
                defense: c.defense + bonusDef,
                statusEffects: [] as { type: string, duration: number }[],
                verseHidden: c.verseText || "..."
              };
           });
          setPlayerDeck(battleReadyDeck);
          
          setEnemy((prev: any) => ({
            ...prev,
            statusEffects: []
          }));
          
          if (resGame.data.data.activeEventCard) {
             setActiveEventCard(resGame.data.data.activeEventCard);
          }
          
          const activeSynergies = Object.keys(factionCounts).filter(f => factionCounts[f] >= 2);
          const synergyMsg = activeSynergies.length > 0 ? `Synergies active: ${activeSynergies.join(', ')}!` : 'No Team Synergies.';
          
          setCombatLog([`A wild ${enemy.name} appears!`, synergyMsg]);
        } else {
          setCombatLog(['WARNING: No cards equipped! Go to the Deck Builder!']);
        }
      } catch (e) {
        console.log("Error loading battle deck", e);
      }
    };
    fetchBattleData();
  }, []);

  const saveLevelCompletion = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if(!token) return;
      const resUser = await axios.post(`${API_URL}/api/auth/userdata`, { token });
      
      await axios.post(`${API_URL}/api/game/level/complete`, {
        email: resUser.data.data.email,
        levelId: levelData.id,
        bossName: enemy.name
      });
      console.log(`Saved completion for level ${levelData.id}`);
    } catch(e) {
      console.log("Error saving level completion:", e);
    }
  };

  const activePlayer = playerDeck[activePlayerIdx];

  const addLog = (msg: string) => setCombatLog(prev => [msg, ...prev].slice(0, 4));

  const applyStatusEffect = (target: 'player' | 'enemy', effectType: string, duration: number) => {
    if (target === 'enemy') {
       setEnemy((prev: any) => ({
          ...prev,
          statusEffects: [...(prev.statusEffects || []), { type: effectType, duration }]
       }));
       addLog(`✨ ${enemy.name} is now affected by ${effectType}!`);
    } else {
       setPlayerDeck(prev => {
          const newDeck = [...prev];
          newDeck[activePlayerIdx].statusEffects = [
             ...(newDeck[activePlayerIdx].statusEffects || []),
             { type: effectType, duration }
          ];
          return newDeck;
       });
       addLog(`✨ ${activePlayer.name} is now affected by ${effectType}!`);
    }
  };

  const processStatusEffects = (target: 'player' | 'enemy') => {
     if (target === 'enemy') {
        setEnemy((prev: any) => {
           let hp = prev.hp;
           const remainingEffects = (prev.statusEffects || []).map((eff: any) => {
              if (eff.type === 'Regen') {
                 hp = Math.min(prev.maxHp, hp + (prev.maxHp * 0.05));
                 addLog(`💚 Regen: ${enemy.name} healed a bit.`);
              }
              return { ...eff, duration: eff.duration - 1 };
           }).filter((eff: any) => eff.duration > 0);
           return { ...prev, hp, statusEffects: remainingEffects };
        });
     } else {
        setPlayerDeck(prev => {
           const newDeck = [...prev];
           const char = newDeck[activePlayerIdx];
           if (!char) return prev;
           
           let hp = char.hp;
           const remainingEffects = (char.statusEffects || []).map((eff: any) => {
              if (eff.type === 'Regen') {
                 hp = Math.min(char.maxHp, hp + (char.maxHp * 0.05));
                 addLog(`💚 Regen: ${char.name} healed a bit.`);
              }
              return { ...eff, duration: eff.duration - 1 };
           }).filter((eff: any) => eff.duration > 0);
           
           newDeck[activePlayerIdx] = { ...char, hp, statusEffects: remainingEffects };
           return newDeck;
        });
     }
  };

  const triggerPlayerAttackAnim = () => {
    Animated.sequence([
      Animated.timing(playerAnim, { toValue: 50, duration: 150, useNativeDriver: true }),
      Animated.timing(playerAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(playerAnim, { toValue: 0, duration: 150, useNativeDriver: true })
    ]).start();
    triggerEnemyHitAnim();
  };

  const triggerEnemyHitAnim = () => {
    Animated.sequence([
      Animated.timing(enemyAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(enemyAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(enemyAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(enemyAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };
  
  const triggerEnemyAttackAnim = () => {
    Animated.sequence([
      Animated.timing(enemyAnim, { toValue: -50, duration: 150, useNativeDriver: true }),
      Animated.timing(enemyAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(enemyAnim, { toValue: 0, duration: 150, useNativeDriver: true })
    ]).start();
    triggerPlayerHitAnim();
  };

  const triggerPlayerHitAnim = () => {
    Animated.sequence([
      Animated.timing(playerAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(playerAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(playerAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(playerAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  const handleAttack = () => {
    if (turn !== 'player') return;

    // Check Blindness
    const isBlind = (activePlayer.statusEffects || []).some((e: any) => e.type === 'Blindness');
    if (isBlind && Math.random() < 0.4) {
       addLog(`💨 ${activePlayer.name} is blinded and MISSED!`);
       endPlayerTurn();
       return;
    }
    
    // Type Advantage logic
    let damage = activePlayer.attack - (enemy.defense / 2);
    let multiplier = 1;

    if (activePlayer.type === enemy.sinWeakness) {
      multiplier = 2; // Courage beats Pride
      addLog(`It's super effective! (${activePlayer.type} vs ${enemy.type})`);
    }

    // Conviction check (Enemy takes 1.5x damage)
    const hasConviction = (enemy.statusEffects || []).some((e: any) => e.type === 'Conviction');
    if (hasConviction) {
       multiplier *= 1.5;
       addLog(`⚖️ Conviction makes the enemy vulnerable!`);
    }

    const finalDamage = Math.max(1, Math.floor(damage * multiplier));
    
    triggerPlayerAttackAnim();
    
    setTimeout(() => {
      setEnemy((prev: any) => ({ ...prev, hp: Math.max(0, prev.hp - finalDamage) }));
      addLog(`${activePlayer.name} attacks for ${finalDamage} damage!`);
      
      if (enemy.hp - finalDamage <= 0) {
        addLog('Victory! The enemy is defeated!');
        saveLevelCompletion();
        setTimeout(() => setEndGameState('victory'), 1000);
      } else {
        endPlayerTurn();
      }
    }, 400); // Wait for animation
  };

  const startAbilityQTE = () => {
    if (turn !== 'player') return;
    setQteAnswer('');
    setShowQTE(true);
  };

  const handleQteSubmit = () => {
    setShowQTE(false);
    
    // Validate against the exact missingWord saved from DB
    const expectedWord = activePlayer.missingWord ? activePlayer.missingWord.toLowerCase() : "lord";
    const isCorrect = qteAnswer.trim().toLowerCase() === expectedWord;

    if (isCorrect) {
      addLog('⚔️ CRITICAL HIT! Verse memorized perfectly!');
      
      const criticalDamage = activePlayer.attack * 2.5;
      triggerPlayerAttackAnim();
      setTimeout(() => {
         setEnemy((prev: any) => ({ ...prev, hp: Math.max(0, prev.hp - criticalDamage) }));
         addLog(`${activePlayer.name} uses ${activePlayer.ability} for ${criticalDamage} damage!`);
         
         if (enemy.hp - criticalDamage <= 0) {
           addLog('Victory! The enemy is defeated!');
           saveLevelCompletion();
           setTimeout(() => setEndGameState('victory'), 1000);
         }
      }, 400);
    } else {
      addLog('The verse was forgotten... the ability failed.');
    }
    endPlayerTurn();
  };

  const handleSelah = () => {
    if (turn !== 'player') return;
    const heal = Math.floor(activePlayer.maxHp * 0.3);
    
    const updatedDeck = [...playerDeck];
    updatedDeck[activePlayerIdx].hp = Math.min(activePlayer.maxHp, activePlayer.hp + heal);
    setPlayerDeck(updatedDeck);
    
    addLog(`${activePlayer.name} takes a Selah (Rest) and heals for ${heal} HP.`);
    endPlayerTurn();
  };

  const handleCastSpell = () => {
    if (turn !== 'player' || !activeEventCard) return;
    
    // Determine the effect based on the eventEffect string
    const effect = activeEventCard.eventEffect;
    
    if (effect === 'heal50') {
       const updatedDeck = [...playerDeck];
       updatedDeck.forEach(c => {
          if(c.hp > 0) {
             c.hp = Math.min(c.maxHp, c.hp + Math.floor(c.maxHp * 0.5));
             // Also add Regen
             c.statusEffects = [...(c.statusEffects || []), { type: 'Regen', duration: 3 }];
          }
       });
       setPlayerDeck(updatedDeck);
       addLog(`✨ Cast ${activeEventCard.name}! Party healed & gained Regen (3 turns)!`);
    } else if (effect === 'damageAll20' || activeEventCard.name.includes("Plagues")) {
       const damage = 20;
       setEnemy((prev: any) => ({ 
          ...prev, 
          hp: Math.max(0, prev.hp - damage),
          statusEffects: [...(prev.statusEffects || []), { type: 'Blindness', duration: 2 }]
       }));
       addLog(`🔥 Cast ${activeEventCard.name}! Dealt ${damage} damage & Blinded enemy!`);
       triggerEnemyHitAnim();
    } else if (effect === 'revive') {
       const updatedDeck = [...playerDeck];
       let revived = false;
       updatedDeck.forEach(c => {
          if(c.hp <= 0) {
             c.hp = Math.floor(c.maxHp * 0.25); // Revive with 25% HP
             revived = true;
          }
       });
       setPlayerDeck(updatedDeck);
       if(revived) {
          addLog(`👼 Cast ${activeEventCard.name}! Fallen allies were revived with 25% HP!`);
       } else {
          addLog(`👼 Cast ${activeEventCard.name}, but no allies needed reviving.`);
       }
    } else if (effect === 'shieldTurn') {
       // A more complete implementation would set a status effect flag.
       // For now, we'll just heal the active player a lot to simulate surviving a huge blow.
       const updatedDeck = [...playerDeck];
       updatedDeck[activePlayerIdx].hp = Math.min(activePlayer.maxHp, activePlayer.hp + 50);
       setPlayerDeck(updatedDeck);
       addLog(`🛡️ Cast ${activeEventCard.name}! Gained a massive shield (+50 HP)!`);
    } else {
       addLog(`Cast ${activeEventCard.name}, but nothing happened...`);
    }
    
    // Spells are single-use per battle. Remove it.
    setActiveEventCard(null);
    endPlayerTurn();
  };

  const endPlayerTurn = () => {
    setTurn('enemy');
    processStatusEffects('enemy'); // Process enemy start of turn
    setTimeout(enemyTurn, 1500);
  };

  const enemyTurn = () => {
    if (enemy.hp <= 0) return;

    // Check Blindness
    const isBlind = (enemy.statusEffects || []).some((e: any) => e.type === 'Blindness');
    if (isBlind && Math.random() < 0.4) {
       addLog(`💨 ${enemy.name} is blinded and MISSED!`);
       setTurn('player');
       processStatusEffects('player');
       return;
    }
    
    triggerEnemyAttackAnim();
    
    setTimeout(() => {
      // Re-evaluate active player because a switch might have happened BEFORE setTurn('enemy') executed
      // React state is asynchronous, but we can capture the true current activePlayer from state
      // However the safest way is updating the specific index
      setPlayerDeck(currentDeck => {
          const updatedDeck = [...currentDeck];
          const currentActive = updatedDeck[activePlayerIdx];
          
          if (currentActive) {
            const damage = Math.max(1, Math.floor(enemy.attack - (currentActive.defense / 2)));
            updatedDeck[activePlayerIdx].hp = Math.max(0, currentActive.hp - damage);
            addLog(`💥 ${enemy.name} used ${enemy.ability}! Dealt ${damage} damage to ${currentActive.name}.`);
            
            // Randomly apply debuff
            if (Math.random() < 0.3) {
               const debuff = Math.random() < 0.5 ? 'Conviction' : 'Blindness';
               updatedDeck[activePlayerIdx].statusEffects = [
                  ...(updatedDeck[activePlayerIdx].statusEffects || []),
                  { type: debuff, duration: 2 }
               ];
               addLog(`⚠️ ${currentActive.name} fell under ${debuff}!`);
            }

            if (updatedDeck[activePlayerIdx].hp <= 0) {
              addLog(`💀 ${currentActive.name} fainted!`);
              
              const nextAliveIdx = updatedDeck.findIndex((c, idx) => idx !== activePlayerIdx && c.hp > 0);
              if (nextAliveIdx !== -1) {
                  setActivePlayerIdx(nextAliveIdx);
                  addLog(`🔄 ${updatedDeck[nextAliveIdx].name} takes the field!`);
              } else {
                  addLog(`DEFEAT! All your characters have fallen.`);
                  setTimeout(() => setEndGameState('defeat'), 1000);
              }
            }
          }
          return updatedDeck;
      });
      
      setTurn('player');
      processStatusEffects('player'); // Process player start of turn
    }, 400);
  };

  const handleSwitch = () => {
    if (turn !== 'player') return;
    setShowSwitchModal(true);
  };
  
  const performSwitch = (newIdx: number) => {
    setShowSwitchModal(false);
    if (newIdx !== activePlayerIdx && playerDeck[newIdx].hp > 0) {
        setActivePlayerIdx(newIdx);
        addLog(`🔄 Switched out to ${playerDeck[newIdx].name}!`);
        endPlayerTurn(); // Switching costs a turn
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currentTheme[1] }]}>
      <LinearGradient colors={currentTheme} style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FECACA" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Battle Arena</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Battlefield Area */}
        <View style={styles.battlefield}>
          {/* Enemy Side */}
          <View style={styles.enemySide}>
            <View style={styles.statBox}>
              <Text style={styles.nameText}>{enemy.name}</Text>
              <Text style={styles.typeText}>Sin: {enemy.type}</Text>
              <View style={styles.healthBarContainer}>
                <View style={[styles.healthBar, { width: `${(Math.max(0, enemy.hp) / enemy.maxHp) * 100}%`, backgroundColor: '#DC2626' }]} />
              </View>
              <Text style={styles.hpText}>{Math.max(0, Math.floor(enemy.hp))} / {enemy.maxHp}</Text>
              
              {/* Status Effects UI */}
              <View style={styles.statusRow}>
                {(enemy.statusEffects || []).map((eff: any, i: number) => (
                  <View key={i} style={styles.statusIcon}>
                    <MaterialCommunityIcons 
                      name={eff.type === 'Regen' ? 'heart-plus' : eff.type === 'Blindness' ? 'eye-off' : 'scale-balance'} 
                      size={14} 
                      color={eff.type === 'Regen' ? '#4ADE80' : eff.type === 'Blindness' ? '#9CA3AF' : '#FBBF24'} 
                    />
                    <Text style={styles.statusText}>{eff.duration}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Animated.View style={[styles.spritePlaceholderEnemy, { transform: [{ translateX: enemyAnim }] }]}>
               <Image 
                 source={{ uri: enemy.imageUrl || 'https://via.placeholder.com/200' }} 
                 style={styles.spriteImage} 
               />
            </Animated.View>
          </View>

          {/* Combat Log Middle */}
          <View style={styles.logBox}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{justifyContent: 'flex-end', flexGrow: 1}}>
                {combatLog.slice().reverse().map((log, i) => (
                  <Text key={i} style={[styles.logText, i===combatLog.length-1 ? styles.logTextLatest : {}]}>
                    {log}
                  </Text>
                ))}
            </ScrollView>
          </View>

          {/* Player Side */}
          {activePlayer ? (
            <View style={styles.playerSide}>
               <Animated.View style={[styles.spritePlaceholderPlayer, { transform: [{ translateX: playerAnim }] }]}>
                 <Image 
                   source={{ uri: activePlayer.imageUrl || 'https://via.placeholder.com/200' }} 
                   style={styles.spriteImage} 
                 />
              </Animated.View>
              <View style={styles.statBox}>
                <Text style={styles.nameText}>{activePlayer.name}</Text>
                {activePlayer.equippedArmor && activePlayer.equippedArmor.length > 0 && (
                   <View style={{flexDirection: 'row', gap: 4, marginVertical: 4}}>
                     {activePlayer.equippedArmor.map((a:string, i:number) => (
                        <MaterialCommunityIcons key={i} name="shield-star" size={14} color="#FDE68A" />
                     ))}
                   </View>
                )}
                <Text style={styles.typeText}>Role: {activePlayer.characterClass || activePlayer.class} | Trait: {activePlayer.type}</Text>
                <View style={styles.healthBarContainer}>
                  <View style={[styles.healthBar, { width: `${(Math.max(0, activePlayer.hp) / activePlayer.maxHp) * 100}%`, backgroundColor: '#4ADE80' }]} />
                </View>
                <Text style={styles.hpText}>{Math.max(0, Math.floor(activePlayer.hp))} / {activePlayer.maxHp}</Text>

                {/* Status Effects UI */}
                <View style={styles.statusRow}>
                  {(activePlayer.statusEffects || []).map((eff: any, i: number) => (
                    <View key={i} style={styles.statusIcon}>
                      <MaterialCommunityIcons 
                        name={eff.type === 'Regen' ? 'heart-plus' : eff.type === 'Blindness' ? 'eye-off' : 'scale-balance'} 
                        size={14} 
                        color={eff.type === 'Regen' ? '#4ADE80' : eff.type === 'Blindness' ? '#9CA3AF' : '#FBBF24'} 
                      />
                      <Text style={styles.statusText}>{eff.duration}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.playerSide, { justifyContent: 'center'}]}>
              <Text style={{color: '#FFF'}}>No Cards Equipped</Text>
            </View>
          )}
        </View>

        {/* Controls UI */}
        <View style={styles.controlPanel}>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleAttack} disabled={turn !== 'player' || !activePlayer}>
               <MaterialCommunityIcons name="sword" size={24} color="#FFF" style={{marginBottom: 4}} />
               <Text style={styles.btnText}>ATTACK</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4F46E5' }]} onPress={startAbilityQTE} disabled={turn !== 'player' || !activePlayer}>
               <MaterialCommunityIcons name="flash" size={24} color="#FFF" style={{marginBottom: 4}} />
               <Text style={styles.btnText}>ABILITY</Text>
               <Text style={styles.btnSubText}>(Verse QTE)</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#059669' }]} onPress={handleSelah} disabled={turn !== 'player' || !activePlayer}>
               <MaterialCommunityIcons name="meditation" size={24} color="#FFF" style={{marginBottom: 4}} />
               <Text style={styles.btnText}>SELAH</Text>
               <Text style={styles.btnSubText}>(Rest & Heal)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#D97706' }]} onPress={handleSwitch} disabled={turn !== 'player' || !activePlayer}>
               <MaterialCommunityIcons name="swap-horizontal" size={24} color="#FFF" style={{marginBottom: 4}} />
               <Text style={styles.btnText}>SWITCH</Text>
            </TouchableOpacity>
          </View>
          
          {/* Third Row: Spells */}
          <View style={styles.actionRow}>
            {activeEventCard ? (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#A855F7', padding: 12 }]} onPress={handleCastSpell} disabled={turn !== 'player'}>
                   <MaterialCommunityIcons name="auto-fix" size={20} color="#FFF" style={{marginBottom: 2}} />
                   <Text style={[styles.btnText, {fontSize: 14}]}>CAST {activeEventCard.name.toUpperCase()}</Text>
                </TouchableOpacity>
            ) : (
                <View style={[styles.actionBtn, { backgroundColor: '#374151', padding: 12, opacity: 0.5 }]}>
                   <MaterialCommunityIcons name="auto-fix" size={20} color="#9CA3AF" style={{marginBottom: 2}} />
                   <Text style={[styles.btnText, {fontSize: 14, color: '#9CA3AF'}]}>NO SPELL EQUIPPED / USED</Text>
                </View>
            )}
          </View>
        </View>

        {/* QTE Modal */}
        {activePlayer && (
        <Modal visible={showQTE} transparent animationType="slide">
          <View style={styles.modalBg}>
             <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Critical Hit QTE!</Text>
                <Text style={styles.modalDesc}>Complete the verse to unleash {activePlayer.ability}:</Text>
                <Text style={styles.verseHint}>"{activePlayer.verseHidden}"</Text>
                
                <TextInput 
                  style={styles.modalInput}
                  placeholder="Type the missing word..."
                  value={qteAnswer}
                  onChangeText={setQteAnswer}
                  autoFocus
                />
                <TouchableOpacity style={styles.submitBtn} onPress={handleQteSubmit}>
                  <Text style={styles.btnText}>UNLEASH ATTACK</Text>
                </TouchableOpacity>
             </View>
          </View>
        </Modal>
        )}

        {/* Switch Character Modal */}
        <Modal visible={showSwitchModal} transparent animationType="fade">
           <View style={styles.modalBg}>
              <View style={[styles.modalContent, { borderColor: '#F59E0B' }]}>
                 <Text style={styles.modalTitle}>Switch Character</Text>
                 <Text style={styles.modalDesc}>Select a conscious character to swap into battle. (Costs 1 Turn!)</Text>
                 
                 <View style={{ width: '100%', gap: 10, marginVertical: 15 }}>
                    {playerDeck.map((char, index) => (
                        <TouchableOpacity 
                           key={index} 
                           style={[
                             styles.switchCardBtn, 
                             index === activePlayerIdx && styles.switchCardActive,
                             char.hp <= 0 && styles.switchCardDead
                           ]}
                           disabled={char.hp <= 0 || index === activePlayerIdx}
                           onPress={() => performSwitch(index)}
                        >
                           <View>
                             <Text style={styles.switchName}>{char.name} {index === activePlayerIdx ? '(Active)' : ''}</Text>
                             <Text style={styles.switchClass}>{char.characterClass || char.class} | {char.type}</Text>
                           </View>
                           <View style={{alignItems: 'flex-end'}}>
                             <Text style={[styles.switchHp, char.hp <= 0 && {color:'#EF4444'}]}>HP: {Math.max(0, Math.floor(char.hp))}/{char.maxHp}</Text>
                             {char.hp <= 0 && <Text style={{color:'#EF4444', fontSize: 10}}>FAINTED</Text>}
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

        {/* End Game Modal */}
        <Modal visible={endGameState !== 'none'} transparent animationType="fade">
           <View style={styles.modalBg}>
              <View style={[styles.modalContent, { borderColor: endGameState === 'victory' ? '#F59E0B' : '#DC2626' }]}>
                 <Text style={styles.modalTitle}>{endGameState === 'victory' ? 'VICTORY!' : 'DEFEAT'}</Text>
                 <Text style={styles.modalDesc}>
                   {endGameState === 'victory' 
                     ? `You have conquered ${enemy.name}! You earned Talents and spiritual growth.`
                     : `Your party has fallen to ${enemy.name}. Return to the Deck Builder to train and try again.`}
                 </Text>
                 
                 <TouchableOpacity style={[styles.submitBtn, {marginTop: 20}]} onPress={() => navigation.goBack()}>
                    <Text style={styles.btnText}>RETURN TO MAP</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  battlefield: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between'
  },
  enemySide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 16
  },
  playerSide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16
  },
  statBox: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#7F1D1D',
    minWidth: 200,
  },
  nameText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  typeText: { color: '#D1FAE5', fontSize: 12, marginBottom: 8 },
  healthBarContainer: {
    height: 10,
    backgroundColor: '#374151',
    borderRadius: 5,
    overflow: 'hidden',
    width: '100%',
  },
  healthBar: {
    height: '100%',
  },
  hpText: { color: '#FFF', fontSize: 12, textAlign: 'right', marginTop: 4 },
  statusRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  statusIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  statusText: { color: '#FFF', fontSize: 10, marginLeft: 2, fontWeight: 'bold' },
  spritePlaceholderEnemy: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#7F1D1D',
    overflow: 'hidden',
    elevation: 10,
  },
  spritePlaceholderPlayer: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1E40AF',
    overflow: 'hidden',
    elevation: 10,
  },
  spriteImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logBox: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    flex: 1,
    marginVertical: 16,
  },
  logText: { color: '#9CA3AF', fontSize: 13, marginVertical: 4, fontStyle: 'italic' },
  logTextLatest: { color: '#FFF', fontSize: 16, fontWeight: 'bold', fontStyle: 'normal' },
  controlPanel: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1D4ED8',
    padding: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  btnSubText: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 4 },
  
  // QTE UI
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#1E3A8A',
    width: '100%',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#60A5FA',
    alignItems: 'center'
  },
  modalTitle: { color: '#FBBF24', fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  modalDesc: { color: '#FFF', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  verseHint: { color: '#A7F3D0', fontSize: 20, fontStyle: 'italic', marginBottom: 20, textAlign: 'center' },
  modalInput: {
    backgroundColor: '#FFF',
    width: '100%',
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: '#059669',
    width: '100%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  
  // Switch Modal
  switchCardBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155'
  },
  switchCardActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  switchCardDead: {
    opacity: 0.5,
    backgroundColor: '#450a0a',
    borderColor: '#7f1d1d'
  },
  switchName: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  switchClass: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
  switchHp: { color: '#FFF', fontWeight: 'bold' }
});

export default GameBattle;
