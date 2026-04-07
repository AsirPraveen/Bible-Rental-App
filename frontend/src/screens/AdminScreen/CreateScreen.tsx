import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image, Platform, StatusBar, SafeAreaView, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SquarePen, BookPlus, BarChart3, ShieldAlert, Map, Music } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function CreateScreen() {
  const navigation = useNavigation<any>();

  const cards = [
    {
      title: 'Create Post',
      icon: <SquarePen color="#146C94" size={32} />,
      bgColor: '#AFD3E2',
    },
    {
      title: 'Add Book',
      icon: <BookPlus color="#146C94" size={32} />,
      bgColor: '#AFD3E2',
    },
    {
      title: 'Manage Maps',
      icon: <Map color="#146C94" size={32} />,
      bgColor: '#AFD3E2',
    },
    {
      title: 'Manage Songs',
      icon: <Music color="#146C94" size={32} />,
      bgColor: '#AFD3E2',
    },
    {
      title: 'App Analytics',
      icon: <BarChart3 color="#146C94" size={32} />,
      bgColor: '#AFD3E2',
    },
    {
      title: 'Moderation',
      icon: <ShieldAlert color="#146C94" size={32} />,
      bgColor: '#AFD3E2',
    }
  ];

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={['#146C94', '#19A7CE']} style={styles.gradient}>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {cards.map((card, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.card, { backgroundColor: card.bgColor }]}
                onPress={() => navigation.navigate(card.title)}>
                <View style={styles.cardContent}>
                  {card.icon}
                  <Text style={styles.cardTitle}>{card.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#fff',
    // justifyContent: 'center',
    // alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  gradient: {
    flex: 1,
  },
  card: {
    width: '47.5%',
    aspectRatio: 0.760,
    borderRadius: 16,
    padding: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#146C94',
    textAlign: 'center',
  },
});