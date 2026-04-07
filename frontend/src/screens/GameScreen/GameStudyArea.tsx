import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const GameStudyArea = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#4C1D95', '#2E1065']} style={styles.container}>
        <View style={styles.content}>
          <MaterialCommunityIcons name="book-open-page-variant" size={80} color="#DDD6FE" />
          <Text style={styles.title}>The Study Area</Text>
          <Text style={styles.desc}>Cards placed here will passively gain XP when you read books in the main app.</Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#2E1065', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginTop: 20 },
  desc: { color: '#DDD6FE', fontSize: 16, textAlign: 'center', marginTop: 10 }
});

export default GameStudyArea;
