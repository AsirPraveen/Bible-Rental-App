import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft, Send } from 'lucide-react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

export default function QuestionDetailsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  
  // Initial state from navigation route, then we update it from server when an answer is added
  const [question, setQuestion] = useState(route.params.question);
  const currentUserId = route.params.currentUserId;
  const [answerText, setAnswerText] = useState('');
  const [loading, setLoading] = useState(false);
  
  const isQuestionMine = question.user?._id && question.user?._id === currentUserId;

  const handlePostAnswer = async () => {
    if (!answerText.trim()) return;

    try {
      setLoading(true);
      const userIdToUse = currentUserId || await AsyncStorage.getItem('userId') || '67c13da8f8d68d19dcaec1a4';

      const res = await axios.post(`${BASE_URL}/api/forum/questions/${question._id}/answers`, {
        user: userIdToUse,
        answerText
      });

      if (res.data.status === 'Success') {
        setQuestion(res.data.data); // Update question with new populated answers
        setAnswerText('');
      }
    } catch (error) {
      console.error('Error posting answer', error);
      alert('Failed to post reply.');
    } finally {
      setLoading(false);
    }
  };

  const renderAnswer = ({ item }: { item: any }) => {
    const isMineAnswer = item.user?._id && item.user?._id === currentUserId;
    return (
      <View style={[styles.answerCard, isMineAnswer && styles.myAnswerCard]}>
        <View style={styles.answerHeader}>
          <Text style={[styles.answerAuthor, isMineAnswer && styles.myAuthorText]}>
            {isMineAnswer ? `${item.user?.name} (You)` : item.user?.name || 'Unknown'}
          </Text>
          <Text style={styles.answerDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <Text style={styles.answerText}>{item.answerText}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={['#146C94', '#19A7CE']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color="#F6F1F1" size={24} />
          </TouchableOpacity>
          <View style={styles.headerTextWrapper}>
            <Text style={styles.headerText}>Discussion</Text>
            <Text style={styles.subtitleText}>View and reply to question</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardAvoidingView 
          style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={question.answers || []}
          keyExtractor={(item, index) => item._id || index.toString()}
          renderItem={renderAnswer}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              <View style={[styles.questionCard, isQuestionMine && styles.myQuestionCard]}>
                <View style={styles.qHeaderRow}>
                  <Text style={[styles.qAuthor, isQuestionMine && styles.myAuthorText]}>
                    {isQuestionMine ? `${question.user?.name} (You)` : question.user?.name || 'Unknown'}
                  </Text>
                  <Text style={styles.qDate}>{new Date(question.createdAt).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.qText}>{question.questionText}</Text>
              </View>
              
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>COMMUNITY REPLIES</Text>
                <View style={styles.sectionDivider} />
              </View>
            </View>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No answers yet. Be the first to reply!</Text>}
        />

        {/* Input area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your answer..."
            value={answerText}
            onChangeText={setAnswerText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !answerText.trim() && styles.sendBtnDisabled]} 
            onPress={handlePostAnswer}
            disabled={!answerText.trim() || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Send color="#fff" size={20} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  gradient: { flex: 1 },
  headerContainer: { padding: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn: { padding: 4 },
  headerTextWrapper: { flex: 1, alignItems: 'center' },
  headerText: { fontSize: 24, fontWeight: 'bold', color: '#F6F1F1', textAlign: 'center', marginBottom: 4 },
  subtitleText: { fontSize: 14, color: '#F6F1F1', textAlign: 'center', opacity: 0.9 },
  container: { flex: 1, backgroundColor: '#F6F1F1', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  list: { padding: 16, paddingBottom: 24 },
  
  questionCard: { 
    backgroundColor: '#fff', 
    padding: 22, 
    borderRadius: 16, 
    marginBottom: 8, 
    elevation: 4,
    shadowColor: '#146C94',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderLeftWidth: 5,
    borderLeftColor: '#146C94'
  },
  myQuestionCard: { 
    backgroundColor: '#F0F8FA', 
    borderLeftColor: '#19A7CE', 
    elevation: 5 
  },
  qHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  qAuthor: { fontWeight: 'bold', fontSize: 16, color: '#146C94' },
  myAuthorText: { color: '#0F5272' }, 
  qDate: { color: '#888', fontSize: 12 },
  qText: { fontSize: 19, color: '#222', lineHeight: 28, fontWeight: '500' },
  
  sectionHeader: {
    marginTop: 24,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#888',
    letterSpacing: 1.2,
  },
  sectionDivider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  
  answerCard: { backgroundColor: '#FAFAFA', padding: 16, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  myAnswerCard: { backgroundColor: '#F0F8FA', borderColor: '#19A7CE' },
  answerHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  answerAuthor: { fontWeight: '600', color: '#555' },
  answerDate: { color: '#aaa', fontSize: 12 },
  answerText: { fontSize: 15, color: '#444', lineHeight: 22 },
  
  emptyText: { textAlign: 'center', color: '#888', marginTop: 20, fontStyle: 'italic' },
  
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#F6F1F1', borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 16, maxHeight: 100, minHeight: 45 },
  sendBtn: { backgroundColor: '#146C94', width: 45, height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginLeft: 10, alignSelf: 'center' },
  sendBtnDisabled: { backgroundColor: '#AFD3E2' }
});
