import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import axios from 'axios';
import Constants from 'expo-constants';
import { MaterialIcons } from '@expo/vector-icons';
import LoadingScreen from '../../../components/LoadingScreen';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

interface EmailTemplateModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const EmailTemplateModal: React.FC<EmailTemplateModalProps> = ({ isVisible, onClose }) => {
  const [templateType, setTemplateType] = useState<'book_approval' | 'book_rejection'>('book_approval');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTemplate = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/email-template/${templateType}`);
      if (res.data.status === 'Ok') {
        setSubject(res.data.data.subject);
        setBody(res.data.data.body);
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      Alert.alert('Error', 'Failed to fetch email template');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      fetchTemplate();
    }
  }, [isVisible, templateType]);

  const handleSave = async () => {
    if (!subject.trim() || !body.trim()) {
      Alert.alert('Warning', 'Subject and Body cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/email-template/update`, {
        templateId: templateType,
        subject,
        body,
      });
      if (res.data.status === 'Ok') {
        Alert.alert('Success', 'Email template updated successfully');
        onClose();
      }
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', 'Failed to update email template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={isVisible} animationType="fade" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Edit Email Templates</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, templateType === 'book_approval' && styles.activeTab]}
              onPress={() => setTemplateType('book_approval')}
            >
              <Text style={[styles.tabText, templateType === 'book_approval' && styles.activeTabText]}>Approval</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, templateType === 'book_rejection' && styles.activeTab]}
              onPress={() => setTemplateType('book_rejection')}
            >
              <Text style={[styles.tabText, templateType === 'book_rejection' && styles.activeTabText]}>Rejection</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <LoadingScreen message="Loading template..." />
          ) : (
            <ScrollView style={styles.form}>
              <Text style={styles.label}>Email Subject</Text>
              <TextInput
                style={styles.input}
                value={subject}
                onChangeText={setSubject}
                placeholder="Enter email subject"
              />

              <Text style={styles.label}>Email Body (Content)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={body}
                onChangeText={setBody}
                placeholder="Enter email body"
                multiline
                numberOfLines={10}
                textAlignVertical="top"
              />

              <View style={styles.guideBox}>
                <Text style={styles.guideTitle}>Available Placeholders:</Text>
                <Text style={styles.guideText}>• {"{{userName}}"}: User's full name</Text>
                <Text style={styles.guideText}>• {"{{bookName}}"}: Name of the approved book</Text>
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Template</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#146C94',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    padding: 5,
    margin: 15,
    borderRadius: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#146C94',
    fontWeight: 'bold',
  },
  form: {
    padding: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 150,
  },
  guideBox: {
    backgroundColor: '#e7f3f7',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#146C94',
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#146C94',
    marginBottom: 5,
  },
  guideText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: '#146C94',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default EmailTemplateModal;
