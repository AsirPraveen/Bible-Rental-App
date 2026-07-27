import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Plus, BookOpen } from 'lucide-react-native';
import axios from 'axios';
import Constants from 'expo-constants';
import { useTheme } from '../../../context/ThemeContext';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const { width } = Dimensions.get('window');

interface AddBookFormProps {
  visible: boolean;
  onToggle: () => void;
  newBook: any;
  setNewBook: (book: any) => void;
  onAddBook: () => void;
}

const AddBookForm = ({ visible, onToggle, newBook, setNewBook, onAddBook }: AddBookFormProps) => {
  const { colors, theme } = useTheme();
  const styles = getStyles(colors, theme);
  const [expandAnim] = useState(new Animated.Value(0));
  const [rotateAnim] = useState(new Animated.Value(0));
  const [formOpacity] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(expandAnim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: false,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 500,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(expandAnim, {
          toValue: 0,
          tension: 80,
          friction: 8,
          useNativeDriver: false,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(formOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const [authorsList, setAuthorsList] = useState<any[]>([]);
  const [showAuthorSelectModal, setShowAuthorSelectModal] = useState(false);
  const [authorSearchText, setAuthorSearchText] = useState('');
  const [showAddAuthorModal, setShowAddAuthorModal] = useState(false);
  const [newAuthorName, setNewAuthorName] = useState('');
  const [newAuthorBio, setNewAuthorBio] = useState('');
  const [newAuthorMinistry, setNewAuthorMinistry] = useState('');
  const [savingAuthor, setSavingAuthor] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchAuthors();
    }
  }, [visible]);

  const fetchAuthors = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/authors`);
      if (res.data.status === 'Ok') {
        setAuthorsList(res.data.data || []);
      }
    } catch (error) {
      console.log('Error fetching authors inside AddBookForm:', error);
    }
  };

  const handleCreateAuthor = async () => {
    if (!newAuthorName.trim()) {
      Alert.alert('Error', 'Please enter author name.');
      return;
    }
    setSavingAuthor(true);
    try {
      const res = await axios.post(`${API_URL}/api/authors`, {
        name: newAuthorName.trim(),
        bio: newAuthorBio.trim(),
        ministry: newAuthorMinistry.trim(),
      });
      if (res.data.status === 'Ok' && res.data.data) {
        const newlyCreated = res.data.data;
        setAuthorsList(prev => [...prev, newlyCreated]);
        setNewBook({
          ...newBook,
          author_id: newlyCreated.author_id.toString(),
          author_name: newlyCreated.name
        });

        // Reset states and close modals
        setNewAuthorName('');
        setNewAuthorBio('');
        setNewAuthorMinistry('');
        setShowAddAuthorModal(false);
        setShowAuthorSelectModal(false);

        Alert.alert('Success', 'Author created successfully!');
      } else {
        Alert.alert('Error', 'Failed to create author.');
      }
    } catch (error) {
      console.log('Error creating author inside AddBookForm:', error);
      Alert.alert('Error', 'Failed to create author. Please try again.');
    } finally {
      setSavingAuthor(false);
    }
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const inputFields = [
    { key: 'book_name', placeholder: 'Book Name', icon: '📚' },
    { key: 'pages', placeholder: 'Pages', icon: '📄', numeric: true },
    { key: 'preface', placeholder: 'Preface', icon: '📝' },
    { key: 'year_of_publication', placeholder: 'Year of Publication', icon: '📅', numeric: true },
  ];

  return (
    <View style={styles.container}>
      <Pressable onPress={onToggle} style={styles.addButton}>
        <LinearGradient
          colors={[colors.tint, colors.secondary || colors.tint]}
          style={styles.buttonGradient}
        >
          <Animated.View
            style={[
              styles.iconContainer,
              { transform: [{ rotate: rotation }] },
            ]}
          >
            <Plus size={24} color="#fff" />
          </Animated.View>
          <Text style={styles.addButtonText}>Add New Book</Text>
          <View style={styles.buttonGlow} />
        </LinearGradient>
      </Pressable>

      <Animated.View
        style={[
          styles.formWrapper,
          {
            height: expandAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 560],
            }),
            opacity: expandAnim,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.formContainer,
            { opacity: formOpacity },
          ]}
        >
          <BlurView intensity={10} style={styles.formBlur}>
            <View style={styles.formHeader}>
              <BookOpen size={24} color={colors.tint} />
              <Text style={styles.formTitle}>Add New Book</Text>
            </View>

            <View style={styles.inputsContainer}>
              {inputFields.map((field, index) => (
                <Animated.View
                  key={field.key}
                  style={[
                    styles.inputWrapper,
                    {
                      opacity: formOpacity,
                      transform: [
                        {
                          translateY: formOpacity.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputIcon}>{field.icon}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={field.placeholder}
                      placeholderTextColor={colors.textSecondary}
                      keyboardType={field.numeric ? "numeric" : "default"}
                      value={newBook[field.key]}
                      onChangeText={(text) => setNewBook({ ...newBook, [field.key]: text })}
                    />
                  </View>
                </Animated.View>
              ))}

              {/* Author select button wrapper */}
              <Animated.View style={[styles.inputWrapper, { opacity: formOpacity }]}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>✍️</Text>
                  <TouchableOpacity
                    style={[styles.input, { justifyContent: 'center' }]}
                    onPress={() => setShowAuthorSelectModal(true)}
                  >
                    <Text style={{ color: newBook.author_name ? colors.text : colors.textSecondary, fontSize: 16 }}>
                      {newBook.author_name ? `${newBook.author_name} (ID: ${newBook.author_id})` : 'Select Author *'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>

              {/* Book ID field wrapper */}
              <Animated.View style={[styles.inputWrapper, { opacity: formOpacity }]}>
                <View style={[styles.inputContainer, { backgroundColor: colors.theme === 'dark' ? colors.border : '#E0E0E0' }]}>
                  <Text style={styles.inputIcon}>🏷️</Text>
                  <TextInput
                    style={[styles.input, { color: colors.textSecondary }]}
                    value="Book ID: Auto-generated by system"
                    editable={false}
                  />
                </View>
              </Animated.View>
            </View>

            <Pressable onPress={onAddBook} style={styles.submitButton}>
              <LinearGradient
                colors={[colors.tint, colors.secondary || colors.tint]}
                style={styles.submitGradient}
              >
                <Text style={styles.submitButtonText}>✨ Add Book</Text>
              </LinearGradient>
            </Pressable>
          </BlurView>
        </Animated.View>
      </Animated.View>

      {/* Author Select Modal */}
      <Modal
        visible={showAuthorSelectModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAuthorSelectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Author</Text>
              <TouchableOpacity onPress={() => setShowAuthorSelectModal(false)} style={styles.closeModalBtn}>
                <Text style={styles.closeModalBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchContainer}>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search authors..."
                placeholderTextColor="#999"
                value={authorSearchText}
                onChangeText={setAuthorSearchText}
              />
            </View>

            <TouchableOpacity
              style={styles.addAuthorItem}
              onPress={() => setShowAddAuthorModal(true)}
            >
              <Text style={styles.addAuthorItemText}>➕ Add New Author...</Text>
            </TouchableOpacity>

            <FlatList
              data={authorsList.filter(a => a.name.toLowerCase().includes(authorSearchText.toLowerCase()))}
              keyExtractor={(item) => item.author_id.toString()}
              style={styles.authorsFlatList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.authorItem}
                  onPress={() => {
                    setNewBook({
                      ...newBook,
                      author_id: item.author_id.toString(),
                      author_name: item.name
                    });
                    setShowAuthorSelectModal(false);
                  }}
                >
                  <Text style={styles.authorItemName}>{item.name}</Text>
                  <Text style={styles.authorItemDetail}>ID: {item.author_id} • {item.ministry || 'Unknown'}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyListContainer}>
                  <Text style={styles.emptyListText}>No authors found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Add Author Modal */}
      <Modal
        visible={showAddAuthorModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAddAuthorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.addAuthorModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Author</Text>
              <TouchableOpacity onPress={() => setShowAddAuthorModal(false)} style={styles.closeModalBtn}>
                <Text style={styles.closeModalBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.addAuthorForm}>
              <Text style={styles.modalLabel}>Author Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter author name"
                placeholderTextColor="#999"
                value={newAuthorName}
                onChangeText={setNewAuthorName}
              />

              <Text style={styles.modalLabel}>Ministry / Fellowship (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Billy Graham Ministries"
                placeholderTextColor="#999"
                value={newAuthorMinistry}
                onChangeText={setNewAuthorMinistry}
              />

              <Text style={styles.modalLabel}>Biography (Optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalBioInput]}
                placeholder="Write a short biography..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                value={newAuthorBio}
                onChangeText={setNewAuthorBio}
              />

              <TouchableOpacity
                style={styles.saveAuthorButton}
                onPress={handleCreateAuthor}
                disabled={savingAuthor}
              >
                {savingAuthor ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveAuthorButtonText}>Save Author</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors: any, theme: string) => StyleSheet.create({
  container: {
    marginTop: 20,
  },
  addButton: {
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: colors.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    position: 'relative',
  },
  iconContainer: {
    marginRight: 10,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00d2ff',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  formWrapper: {
    overflow: 'hidden',
    marginTop: 15,
  },
  formContainer: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.tint,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  formBlur: {
    flex: 1,
    backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255,255,255,0.95)',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.tint,
    marginLeft: 10,
  },
  inputsContainer: {
    padding: 20,
  },
  inputWrapper: {
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: colors.tint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: colors.text,
  },
  submitButton: {
    margin: 20,
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  addAuthorModalContent: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.tint,
  },
  closeModalBtn: {
    padding: 4,
  },
  closeModalBtnText: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  modalSearchContainer: {
    marginBottom: 10,
    width: '100%',
  },
  modalSearchInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addAuthorItem: {
    backgroundColor: theme === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(20, 108, 148, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  addAuthorItemText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.tint,
  },
  authorsFlatList: {
    marginTop: 8,
  },
  authorItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  authorItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  authorItemDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyListContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyListText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  addAuthorForm: {
    marginTop: 10,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.tint,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: colors.text,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  modalBioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveAuthorButton: {
    backgroundColor: colors.tint,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  saveAuthorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddBookForm;