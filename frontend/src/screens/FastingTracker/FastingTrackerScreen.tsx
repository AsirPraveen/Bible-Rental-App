import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, Platform, StatusBar } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { Plus, Clock, Info, PlusCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useTheme, ColorsType } from '../../context/ThemeContext';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? '';
import AddFastingModal from './AddFastingModal';
import LoadingScreen from '../../components/LoadingScreen';
import { useAuth } from '../../context/AuthContext';

export default function FastingTrackerScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { isGuest } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem('userId') || '67c13da8f8d68d19dcaec1a4';
      const res = await axios.get(`${BASE_URL}/api/fasting/user/${userId}`);
      if (res.data.status === 'Success') {
        setPlans(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching fasting plans', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setCurrentTime(new Date());
      fetchPlans();
    }, [])
  );

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await axios.put(`${BASE_URL}/api/fasting/${id}/status`, { status });
      if (res.data.status === 'Success') {
        fetchPlans(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating status', error);
    }
  };

  const getStatusColor = (status: string): readonly [string, string, ...string[]] => {
    switch (status) {
      case 'Active': return ['#19A7CE', '#146C94'];
      case 'Completed': return ['#4CAF50', '#2E7D32'];
      case 'Broken': return ['#EF5350', '#C62828'];
      default: return ['#9E9E9E', '#616161'];
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isEditingAllowed = item.status === 'Active';
    const statusGradient = getStatusColor(item.status);

    return (
      <View style={styles.cardWrapper}>
        <LinearGradient colors={colors.theme === 'dark' ? [colors.cardBg, colors.cardBg] : ['#ffffff', '#f8fdfd']} style={styles.card}>
          <View style={styles.header}>
            <View style={styles.typeContainer}>
              <Text style={styles.type}>{item.type}</Text>
              {item.type === 'Others' && item.customType ? (
                <Text style={styles.customType}>({item.customType})</Text>
              ) : null}
            </View>
            <LinearGradient colors={statusGradient} style={styles.statusBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
            </LinearGradient>
          </View>

          <View style={styles.datesRow}>
            <View style={styles.dateCol}>
              <View style={styles.dateLabelRow}>
                <Clock color={colors.tint} size={14} />
                <Text style={styles.dateLabel}>STARTED</Text>
              </View>
              <Text style={styles.dateVal}>{new Date(item.startDate).toLocaleDateString()}</Text>
              <Text style={styles.timeVal}>{new Date(item.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            <View style={styles.dateDivider} />
            <View style={styles.dateCol}>
              <View style={styles.dateLabelRow}>
                <Clock color={colors.secondary} size={14} />
                <Text style={styles.dateLabel}>ENDS</Text>
              </View>
              <Text style={styles.dateVal}>{new Date(item.endDate).toLocaleDateString()}</Text>
              <Text style={styles.timeVal}>{new Date(item.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          </View>

          {item.notes ? (
            <View style={styles.notesContainer}>
              <Info color={colors.textSecondary} size={16} />
              <Text style={styles.notes}>{item.notes}</Text>
            </View>
          ) : null}

          {isEditingAllowed && (
            <View style={styles.actions}>
              {currentTime >= new Date(item.endDate) && (
                <TouchableOpacity style={styles.actionBtnWrapper} onPress={() => updateStatus(item._id, 'Completed')}>
                  <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.actionBtn}>
                    <Text style={styles.actionText}>Complete Fast</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.actionBtnWrapper} onPress={() => updateStatus(item._id, 'Broken')}>
                <LinearGradient colors={colors.theme === 'dark' ? [colors.inputBg, colors.inputBg] : ['#fff', '#fff']} style={[styles.actionBtn, styles.breakBtnOutline]}>
                  <Text style={styles.actionTextOutline}>End Early</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        <View style={styles.headerContainer}>
          <View style={styles.headerTop}>
            <Text style={styles.headerText}>Fasting Tracker</Text>
            <TouchableOpacity 
              style={styles.headerIconBtn}
              onPress={() => {
                if (isGuest) {
                  Alert.alert('Login Required', 'Please login to track your fasting.', [
                    { text: 'Cancel', style: 'cancel' }
                  ]);
                  return;
                }
                setModalVisible(true);
              }}
            >
              <PlusCircle color="#F6F1F1" size={28} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitleText}>Dedicate and track your fasting</Text>
        </View>

        <View style={styles.container}>
          {loading ? (
            <LoadingScreen variant="transparent" message="Loading fasts..." />
          ) : (
            <>
              <FlatList
                data={plans}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Clock color={colors.secondary} size={80} />
                    <Text style={styles.emptyStateText}>No Active Fasts</Text>
                    <Text style={styles.emptyStateSubtext}>You haven't tracked any fasts yet.</Text>
                  </View>
                }
              />
            </>
          )}
        </View>

        <AddFastingModal 
          visible={modalVisible} 
          onClose={() => setModalVisible(false)} 
          onSuccess={fetchPlans} 
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const getStyles = (colors: ColorsType) => StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  headerContainer: {
    padding: 20,
    paddingTop: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerIconBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 12,
  },
  headerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F6F1F1',
  },
  subtitleText: {
    fontSize: 16,
    color: '#F6F1F1',
    opacity: 0.9,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: colors.textSecondary,
    opacity: 0.8,
    marginTop: 8,
    textAlign: 'center',
  },
  list: {
    paddingVertical: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  typeContainer: {
    flex: 1,
    paddingRight: 10,
  },
  type: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.tint,
    letterSpacing: -0.5,
  },
  customType: {
    fontSize: 14,
    color: colors.secondary,
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.theme === 'dark' ? colors.inputBg : '#FAFDFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  dateCol: {
    flex: 1,
  },
  dateDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  dateLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  dateLabel: {
    fontSize: 11,
    color: colors.tint,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  dateVal: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 2,
  },
  timeVal: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.theme === 'dark' ? colors.border : '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  notes: {
    color: colors.textSecondary,
    fontStyle: 'italic',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  actionBtnWrapper: {
    flex: 1,
  },
  actionBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  breakBtnOutline: {
    borderWidth: 1,
    borderColor: '#EF5350',
    elevation: 0,
    shadowOpacity: 0,
  },
  actionText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  actionTextOutline: {
    color: '#EF5350',
    fontWeight: '800',
    fontSize: 15,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 60,
    color: colors.textSecondary,
    fontSize: 16,
  },
});
