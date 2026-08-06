import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, StatusBar, SafeAreaView, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SquarePen, BookPlus, BarChart3, ShieldAlert, Music, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, ColorsType } from '../../context/ThemeContext';

export default function CreateScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const cardBg = colors.theme === 'dark' ? colors.surface : '#AFD3E2';
  const iconColor = colors.tint;

  const cards = [
    {
      title: 'Create Post',
      icon: <SquarePen color={iconColor} size={32} />,
      bgColor: cardBg,
    },
    {
      title: 'Add Book',
      icon: <BookPlus color={iconColor} size={32} />,
      bgColor: cardBg,
    },
    {
      title: 'Manage Songs',
      icon: <Music color={iconColor} size={32} />,
      bgColor: cardBg,
    },
    {
      title: 'Manage Members',
      icon: <Users color={iconColor} size={32} />,
      bgColor: cardBg,
      route: 'MemberManagement',
    },
    {
      title: 'App Analytics',
      icon: <BarChart3 color={iconColor} size={32} />,
      bgColor: cardBg,
    },
    {
      title: 'Moderation',
      icon: <ShieldAlert color={iconColor} size={32} />,
      bgColor: cardBg,
    }
  ];

  return (
    <SafeAreaView style={styles.outer_container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.linearGradient[0]} />
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {cards.map((card, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.card, { backgroundColor: card.bgColor }]}
                onPress={() => navigation.navigate(card.route || card.title)}
              >
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

const getStyles = (colors: ColorsType) => StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: colors.linearGradient[0],
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