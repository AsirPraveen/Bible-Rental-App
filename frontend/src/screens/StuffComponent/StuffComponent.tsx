import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image } from 'react-native';
import { useNavigation } from 'expo-router';
import { Book, Music, FileText, MessageSquare } from 'lucide-react-native';

export default function StuffComponent() {
  const navigation = useNavigation();

  const cards = [
    {
      title: 'Bible',
      icon: <Book color="#146C94" size={32} />,
      bgColor: '#AFD3E2',
    },
    {
      title: 'Songs',
      icon: <Music color="#146C94" size={32} />,
      bgColor: '#AFD3E2',
    },
    {
      title: 'BookPdf',
      icon: <FileText color="#146C94" size={32} />,
      bgColor: '#AFD3E2',
    },
    {
      title: 'MessageNotes',
      icon: <MessageSquare color="#146C94" size={32} />,
      bgColor: '#AFD3E2',
    },
  ];

  return (
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#19A7CE',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  card: {
    width: '47.5%',
    aspectRatio: 0.5,
    borderRadius: 16,
    padding: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#146C94',
  },
});