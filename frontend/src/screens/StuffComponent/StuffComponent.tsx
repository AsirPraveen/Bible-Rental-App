import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Book, Music, FileText, MessageSquare, Target, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function StuffComponent() {
  const navigation = useNavigation<any>();

  const cards = [
    {
      title: 'Bible',
      icon: <Book color="#146C94" size={32} />,
      bgColor: '#AFD3E2',
      isNew: false,
    },
    {
      title: 'Songs',
      icon: <Music color="#146C94" size={32} />,
      bgColor: '#AFD3E2',
      isNew: false,
    },
    {
      title: 'ReadingPlanner',
      icon: <Target color="#146C94" size={32} />,
      bgColor: '#AFD3E2',
      isNew: true,
    },
    {
      title: 'ReadingTracker',
      icon: <Calendar color="#146C94" size={32} />,
      bgColor: '#AFD3E2',
      isNew: true,
    },
    {
      title: 'BookPdf',
      icon: <FileText color="#146C94" size={32} />,
      bgColor: '#AFD3E2',
      isNew: false,
    },
    {
      title: 'MessageNotes',
      icon: <MessageSquare color="#146C94" size={32} />,
      bgColor: '#AFD3E2',
      isNew: false,
    },
  ];

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={['#146C94', '#19A7CE']} style={styles.gradient}>
        <View style={styles.container}>
          <View style={styles.grid}>
            {cards.map((card, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.card, { backgroundColor: card.bgColor }]}
                onPress={() => navigation.navigate(card.title)}>
                {card.isNew && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                )}
                <View style={styles.cardContent}>
                  {card.icon}
                  <Text style={styles.cardTitle}>{card.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#fff',
  },
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  card: {
    width: '47.5%',
    aspectRatio: 0.765,
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
  newBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 12,
    zIndex: 1,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});