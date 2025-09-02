import React from 'react';
import { View, StyleSheet, FlatList, Platform, StatusBar, SafeAreaView } from 'react-native';
import { List } from 'react-native-paper';
import { Stack } from 'expo-router';

export default function SongComponent() {
  const songs = [
    { id: '1', title: 'Amazing Grace', lyrics: 'Amazing grace, how sweet the sound...' },
    { id: '2', title: 'How Great Is Our God', lyrics: 'The splendor of the King...' },
    // Add more songs
  ];

  return (
    <SafeAreaView style={styles.outer_container}>
      <View style={styles.container}>
        <FlatList
          data={songs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <List.Item
              title={item.title}
              onPress={() => {/* Handle song selection */}}
              style={styles.songItem}
              titleStyle={styles.songTitle}
              right={props => <List.Icon {...props} icon="chevron-right" />}
            />
          )}
        />
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
    backgroundColor: '#F6F1F1',
  },
  songItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  songTitle: {
    color: '#146C94',
    fontSize: 16,
  },
});