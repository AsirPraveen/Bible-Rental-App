import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Plus, BookOpen } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const Colors = {
  primary: '#146C94',
  secondary: '#AFD3E2',
  background: '#F6F1F1',
  white: '#FFFFFF',
  glow: '#00d2ff',
};

interface AddBookFormProps {
  visible: boolean;
  onToggle: () => void;
  newBook: any;
  setNewBook: (book: any) => void;
  onAddBook: () => void;
}

const AddBookForm = ({ visible, onToggle, newBook, setNewBook, onAddBook }: AddBookFormProps) => {
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

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const inputFields = [
    { key: 'book_name', placeholder: 'Book Name', icon: '📚' },
    { key: 'author_name', placeholder: 'Author Name', icon: '✍️' },
    { key: 'pages', placeholder: 'Pages', icon: '📄', numeric: true },
    { key: 'preface', placeholder: 'Preface', icon: '📝' },
    { key: 'year_of_publication', placeholder: 'Year of Publication', icon: '📅', numeric: true },
    { key: 'author_id', placeholder: 'Author ID', icon: '🆔', numeric: true },
    { key: 'book_id', placeholder: 'Book ID', icon: '🏷️', numeric: true },
  ];

  return (
    <View style={styles.container}>
      <Pressable onPress={onToggle} style={styles.addButton}>
        <LinearGradient
          colors={[Colors.primary, Colors.secondary]}
          style={styles.buttonGradient}
        >
          <Animated.View
            style={[
              styles.iconContainer,
              { transform: [{ rotate: rotation }] },
            ]}
          >
            <Plus size={24} color={Colors.white} />
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
              outputRange: [0, 520],
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
              <BookOpen size={24} color={Colors.primary} />
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
                      placeholderTextColor="#999"
                      keyboardType={field.numeric ? "numeric" : "default"}
                      value={newBook[field.key]}
                      onChangeText={(text) => setNewBook({ ...newBook, [field.key]: text })}
                    />
                  </View>
                </Animated.View>
              ))}
            </View>

            <Pressable onPress={onAddBook} style={styles.submitButton}>
              <LinearGradient
                colors={[Colors.primary, '#0e5a7a']}
                style={styles.submitGradient}
              >
                <Text style={styles.submitButtonText}>✨ Add Book</Text>
              </LinearGradient>
            </Pressable>
          </BlurView>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  addButton: {
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: Colors.primary,
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
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.glow,
    shadowColor: Colors.glow,
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
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  formBlur: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(20, 108, 148, 0.1)',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
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
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 2,
    borderColor: 'rgba(20, 108, 148, 0.1)',
    shadowColor: Colors.primary,
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
    color: '#333',
  },
  submitButton: {
    margin: 20,
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.primary,
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
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddBookForm;