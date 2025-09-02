import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image, Platform, StatusBar, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BellElectric,FileStack } from 'lucide-react-native';

export default function PendingScreen() {
  const navigation = useNavigation<any>();

  const cards = [
    {
      title: 'Pending Requests',
      icon: <BellElectric color="#146C94" size={32} />,
      bgColor: '#AFD3E2',
    },
    {
      title: 'Request History',
      icon: <FileStack color="#146C94" size={32} />,
      bgColor: '#AFD3E2',
    }
  ];

  return (
    <SafeAreaView style={styles.outer_container}>
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
    aspectRatio: 0.25,
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