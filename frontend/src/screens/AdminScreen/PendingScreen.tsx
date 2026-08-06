import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, StatusBar, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BellElectric, FileStack } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, ColorsType } from '../../context/ThemeContext';

export default function PendingScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const cardBg = colors.theme === 'dark' ? colors.surface : '#AFD3E2';
  const iconColor = colors.tint;

  const cards = [
    {
      title: 'Pending Requests',
      icon: <BellElectric color={iconColor} size={32} />,
      bgColor: cardBg,
    },
    {
      title: 'Request History',
      icon: <FileStack color={iconColor} size={32} />,
      bgColor: cardBg,
    }
  ];

  return (
    <SafeAreaView style={styles.outer_container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.linearGradient[0]} />
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        <View style={styles.container}>
          <View style={styles.grid}>
            {cards.map((card, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.card, { backgroundColor: card.bgColor }]}
                onPress={() => navigation.navigate(card.title)}
              >
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

const getStyles = (colors: ColorsType) => StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: colors.linearGradient[0],
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
    borderWidth: 1.5,
    borderColor: colors.secondary,
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
    color: colors.tint,
    textAlign: 'center',
  },
});