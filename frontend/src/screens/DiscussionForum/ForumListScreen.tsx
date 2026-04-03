import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Modal, TextInput, Switch, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle, Users } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import LoadingScreen from '../../components/LoadingScreen';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

export default function ForumListScreen() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const navigation = useNavigation<any>();

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/forum/questions`);
      if (res.data.status === 'Success') {
        setQuestions(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching questions', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserId = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const res = await axios.post(`${BASE_URL}/api/auth/userdata`, { token });
        if (res.data.status === 'Ok' && res.data.data) {
          setCurrentUserId(res.data.data._id);
        }
      }
    } catch (error) {
      console.error('Error fetching user data for forum', error);
    }
  };

  useEffect(() => {
    fetchUserId();
    fetchQuestions();
  }, []);

  const handleAskQuestion = async () => {
    if (!newQuestion.trim()) return;
    try {
      setSubmitLoading(true);
      const userIdToUse = currentUserId || await AsyncStorage.getItem('userId') || '67c13da8f8d68d19dcaec1a4';
      
      const res = await axios.post(`${BASE_URL}/api/forum/questions`, {
        user: userIdToUse,
        questionText: newQuestion,
        isAnonymous
      });

      if (res.data.status === 'Success') {
        setNewQuestion('');
        setIsAnonymous(false);
        setModalVisible(false);
        fetchQuestions();
      }
    } catch (error) {
      console.error('Error asking question', error);
      alert('Failed to post question.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isMine = item.user?._id && item.user?._id === currentUserId;
    
    return (
      <TouchableOpacity 
        style={[styles.card, isMine && styles.myCard]}
        onPress={() => navigation.navigate('QuestionDetails', { question: item, currentUserId })}
      >
        <View style={styles.header}>
           <Users size={16} color={isMine ? "#19A7CE" : "#888"} />
           <Text style={[styles.author, isMine && styles.myAuthorText]}>
             {isMine ? `${item.user?.name} (You)` : item.user?.name || 'Unknown'}
           </Text>
           <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
      <Text style={styles.questionText} numberOfLines={3}>{item.questionText}</Text>
      <View style={styles.footer}>
         <MessageCircle size={14} color="#146C94" />
         <Text style={styles.answerCount}>{item.answers?.length || 0} answers</Text>
      </View>
    </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={['#146C94', '#19A7CE']} style={styles.gradient}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>Discussion Forum</Text>
          <Text style={styles.subtitleText}>Ask questions and share knowledge</Text>
        </View>

        <View style={styles.container}>
          {loading ? (
            <LoadingScreen message="Loading discussions..." />
          ) : (
            <>
              <FlatList
                data={questions}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <MessageCircle color="#F6F1F1" size={80} />
                    <Text style={styles.emptyStateText}>No Discussions Yet</Text>
                    <Text style={styles.emptyStateSubtext}>Be the first to ask a question!</Text>
                  </View>
                }
              />
              <TouchableOpacity style={styles.newPlanButton} onPress={() => setModalVisible(true)}>
                <MessageCircle color="#F6F1F1" size={24} />
                <Text style={styles.newPlanButtonText}>Ask Question</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ask the Community</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Type your question here..."
              multiline
              numberOfLines={4}
              value={newQuestion}
              onChangeText={setNewQuestion}
            />

            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>Ask Anonymously</Text>
              <Switch
                value={isAnonymous}
                onValueChange={setIsAnonymous}
                trackColor={{ false: '#ccc', true: '#19A7CE' }}
                thumbColor={isAnonymous ? '#146C94' : '#f4f3f4'}
              />
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.submitBtn, !newQuestion.trim() && styles.disabledBtn]} 
                onPress={handleAskQuestion}
                disabled={!newQuestion.trim() || submitLoading}
              >
                {submitLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Post</Text>}
              </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  headerContainer: {
    padding: 20,
    paddingTop: 16,
  },
  headerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F6F1F1',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#F6F1F1',
    textAlign: 'center',
    opacity: 0.9,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  newPlanButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F6F1F1',
    borderStyle: 'dashed',
    marginVertical: 16,
  },
  newPlanButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F6F1F1',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F6F1F1',
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#F6F1F1',
    opacity: 0.8,
    marginTop: 8,
    textAlign: 'center',
  },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingVertical: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 1 },
  myCard: { backgroundColor: '#F0F8FA', borderColor: '#19A7CE', borderWidth: 1, elevation: 2, shadowColor: '#19A7CE', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  author: { fontWeight: 'bold', color: '#555', flex: 1 },
  myAuthorText: { color: '#146C94' },
  date: { color: '#888', fontSize: 12 },
  questionText: { fontSize: 16, color: '#222', lineHeight: 22, marginBottom: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 },
  answerCount: { color: '#146C94', fontWeight: 'bold', fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#888' },
  
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: '#fff', padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#333', textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, minHeight: 100, textAlignVertical: 'top', fontSize: 16, backgroundColor: '#fafafa', marginBottom: 16 },
  toggleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  toggleLabel: { fontSize: 16, color: '#555' },
  btnRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, alignItems: 'center' },
  cancelText: { color: '#666', fontWeight: 'bold' },
  submitBtn: { flex: 1, padding: 12, backgroundColor: '#146C94', borderRadius: 8, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: 'bold' },
  disabledBtn: { backgroundColor: '#999' }
});
