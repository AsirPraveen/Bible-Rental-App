import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Card, IconButton } from 'react-native-paper';
import { Stack } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as WebBrowser from 'expo-web-browser';

export default function BookPdfComponent() {
  const books = [
    { id: '1', title: 'Christian Living', author: 'John Doe', pdfUrl: 'https://example.com/book1.pdf' },
    { id: '2', title: 'Prayer Guide', author: 'Jane Smith', pdfUrl: 'https://example.com/book2.pdf' },
    // Add more books
  ];

  const handleDownload = async (pdfUrl: string) => {
    try {
      const result = await WebBrowser.openBrowserAsync(pdfUrl);
      console.log(result);
    } catch (error) {
      console.error('Error opening PDF:', error);
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Books',
          headerStyle: { backgroundColor: '#19A7CE' },
          headerTintColor: '#F6F1F1',
        }} 
      />
      <View style={styles.container}>
        <FlatList
          data={books}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Card.Title
                title={item.title}
                subtitle={item.author}
                right={(props) => (
                  <IconButton
                    {...props}
                    icon="download"
                    onPress={() => handleDownload(item.pdfUrl)}
                  />
                )}
              />
            </Card>
          )}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F1F1',
    padding: 16,
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
});