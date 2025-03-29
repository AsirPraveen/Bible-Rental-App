import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Card, Paragraph } from 'react-native-paper';
import { Stack } from 'expo-router';

export default function MessageNotesComponent() {
  const messages = [
    {
      id: '1',
      date: '2024-02-10',
      preacher: 'Rev. John Smith',
      meetingName: 'Sunday Service',
      timing: '10:00 AM - 11:30 AM',
      notes: 'Key points discussed: Faith, Hope, and Love...',
    },
    // Add more messages
  ];

  return (
    <>
      <View style={styles.container}>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Card.Title title={item.meetingName} subtitle={item.date} />
              <Card.Content>
                <Paragraph style={styles.detail}>Preacher: {item.preacher}</Paragraph>
                <Paragraph style={styles.detail}>Time: {item.timing}</Paragraph>
                <Paragraph style={styles.notes}>{item.notes}</Paragraph>
              </Card.Content>
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
  detail: {
    color: '#146C94',
    marginBottom: 4,
  },
  notes: {
    marginTop: 8,
    color: '#333',
  },
});