import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Trash2, Plus, MapPin, Navigation } from 'lucide-react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { API_BASE_URL } from '../../config/api';

const apiUrl = API_BASE_URL;

export default function ManageMapsTab() {
  const { colors, theme } = useTheme();
  const styles = getStyles(colors, theme);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${apiUrl}/api/maps/locations`);
      
      if (res.data && res.data.data) {
        setLocations(res.data.data);
      }
    } catch (error) {
      console.error(`Error fetching locations:`, error);
      Alert.alert('Error', 'Could not load map locations.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: any) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this historical location?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await axios.delete(`${apiUrl}/api/maps/locations/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              setLocations(locations.filter(loc => loc._id !== id));
              Alert.alert('Success', 'Location deleted successfully.');
            } catch (error) {
              console.error('Error deleting location:', error);
              Alert.alert('Error', 'Failed to delete location.');
            }
          }
        }
      ]
    );
  };

  const handleCreateLocation = async () => {
    if (!name || !periodStart || !periodEnd || !latitude || !longitude || !description) {
      Alert.alert('Missing Fields', 'Please fill in all the details for the historical location.');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await AsyncStorage.getItem('token');
      
      const payload = {
        name,
        periodStart: parseInt(periodStart, 10),
        periodEnd: parseInt(periodEnd, 10),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        description
      };

      const res = await axios.post(`${apiUrl}/api/maps/locations`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data && res.data.data) {
        setLocations([...locations, res.data.data]);
        Alert.alert('Success', 'Location added successfully.');
        
        // Clear form
        setName('');
        setPeriodStart('');
        setPeriodEnd('');
        setLatitude('');
        setLongitude('');
        setDescription('');
      }
    } catch (error) {
      console.error('Error adding location:', error);
      Alert.alert('Error', 'Failed to add the location.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.outer_container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.linearGradient[0]} />
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.container}>
              <Text style={styles.headerText}>Manage Maps</Text>
              
              {/* Form Section */}
              <View style={styles.formCard}>
                <View style={styles.formHeader}>
                  <Navigation color={colors.tint} size={24} />
                  <Text style={styles.formTitle}>Add New Location</Text>
                </View>
                
                <Text style={styles.label}>Location Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Jerusalem"
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                />
                
                <View style={styles.row}>
                  <View style={styles.halfInputContainer}>
                    <Text style={styles.label}>Start Year *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="-1000 for BC"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      value={periodStart}
                      onChangeText={setPeriodStart}
                    />
                  </View>
                  <View style={styles.halfInputContainer}>
                    <Text style={styles.label}>End Year *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="70 for AD"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      value={periodEnd}
                      onChangeText={setPeriodEnd}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.halfInputContainer}>
                    <Text style={styles.label}>Latitude *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., 31.7683"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      value={latitude}
                      onChangeText={setLatitude}
                    />
                  </View>
                  <View style={styles.halfInputContainer}>
                    <Text style={styles.label}>Longitude *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., 35.2137"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      value={longitude}
                      onChangeText={setLongitude}
                    />
                  </View>
                </View>

                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Description of the historical significance..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  value={description}
                  onChangeText={setDescription}
                />

                <TouchableOpacity 
                  style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                  onPress={handleCreateLocation}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Plus color="#FFF" size={20} style={{ marginRight: 8 }} />
                      <Text style={styles.submitButtonText}>Add Location to Map</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* List Section */}
              <Text style={styles.listTitle}>Existing Locations</Text>
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#146C94" />
                </View>
              ) : locations.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No locations found. Add one above.</Text>
                </View>
              ) : (
                locations.map(loc => (
                  <View key={loc._id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardInfo}>
                        <MapPin color="#19A7CE" size={20} />
                        <Text style={styles.locationName}>{loc.name}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.deleteButton}
                        onPress={() => handleDelete(loc._id)}
                      >
                        <Trash2 color="#E74C3C" size={20} />
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.periodText}>
                      Period: {Math.abs(loc.periodStart)}{loc.periodStart < 0 ? ' BC' : ' AD'} 
                      {' - '} 
                      {Math.abs(loc.periodEnd)}{loc.periodEnd < 0 ? ' BC' : ' AD'}
                    </Text>
                    
                    <Text style={styles.coordText}>
                      Coordinates: {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                    </Text>
                    
                    <Text style={styles.descText} numberOfLines={2}>
                      {loc.description}
                    </Text>
                  </View>
                ))
              )}

              <View style={{ height: 40 }} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, theme: string) => StyleSheet.create({
  outer_container: {
    flex: 1,
    backgroundColor: colors.linearGradient[0],
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  keyboardView: {
    flex: 1,
  },
  headerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F6F1F1',
    textAlign: 'center',
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 24,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.tint,
    marginLeft: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.tint,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  halfInputContainer: {
    width: '48%',
  },
  halfInput: {
    width: '100%',
    marginBottom: 0,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.tint,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: theme === 'dark' ? colors.border : '#A0C4C9',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 8,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
    borderRadius: 20,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.tint,
    marginBottom: 4,
  },
  coordText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  descText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  }
});
