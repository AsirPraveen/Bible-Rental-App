import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { colors } from '../../../utils/colors';

const AddBookForm = ({ visible, onToggle, newBook, setNewBook, onAddBook }) => {
  return (
    <View style={styles.container}>
      <Pressable onPress={onToggle} style={styles.addButton}>
        <Plus size={20} color={colors.inactive} />
        <Text style={styles.addButtonText}>Add New Book</Text>
      </Pressable>
      {visible && (
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Book Name"
            placeholderTextColor="#999"
            value={newBook.book_name}
            onChangeText={(text) => setNewBook({ ...newBook, book_name: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Author Name"
            placeholderTextColor="#999"
            value={newBook.author_name}
            onChangeText={(text) => setNewBook({ ...newBook, author_name: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Pages"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={newBook.pages}
            onChangeText={(text) => setNewBook({ ...newBook, pages: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Preface"
            placeholderTextColor="#999"
            value={newBook.preface}
            onChangeText={(text) => setNewBook({ ...newBook, preface: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Year of Publication"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={newBook.year_of_publication}
            onChangeText={(text) => setNewBook({ ...newBook, year_of_publication: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Author ID"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={newBook.author_id}
            onChangeText={(text) => setNewBook({ ...newBook, author_id: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Book ID"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={newBook.book_id}
            onChangeText={(text) => setNewBook({ ...newBook, book_id: text })}
          />
          <Pressable onPress={onAddBook} style={styles.submitButton}>
            <Text style={styles.submitButtonText}>Add Book</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: 10,
    justifyContent: 'center',
  },
  addButtonText: {
    color: colors.inactive,
    fontSize: 16,
    marginLeft: 5,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  input: {
    backgroundColor: colors.inactive,
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#19A7CE',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  submitButtonText: {
    color: colors.inactive,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddBookForm;