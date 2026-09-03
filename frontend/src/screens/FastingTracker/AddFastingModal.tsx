import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, Alert } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import * as Notifications from 'expo-notifications';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, ColorsType } from '../../context/ThemeContext';
import { API_BASE_URL } from '../../config/api';

const BASE_URL = API_BASE_URL;

export default function AddFastingModal({ visible, onClose, onSuccess }: any) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [loading, setLoading] = useState(false);
  
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isStartDatePickerVisible, setStartDatePickerVisibility] = useState(false);
  const [isEndDatePickerVisible, setEndDatePickerVisibility] = useState(false);

  const [notes, setNotes] = useState('');
  const [customType, setCustomType] = useState('');

  // Dropdown states for Type
  const [openType, setOpenType] = useState(false);
  const [type, setType] = useState('Others');
  const [typeItems, setTypeItems] = useState([
    { label: 'Daniel Fast', value: 'Daniel Fast' },
    { label: 'Others', value: 'Others' }
  ]);

  // Dropdown states for Notifications
  const [openNotify, setOpenNotify] = useState(false);
  const [notifyInterval, setNotifyInterval] = useState(0);
  const [notifyItems, setNotifyItems] = useState([
    { label: 'None', value: 0 },
    { label: 'Every 1 Hour', value: 1 },
    { label: 'Every 2 Hours', value: 2 },
    { label: 'Every 3 Hours', value: 3 }
  ]);

  const scheduleNotifications = async (start: Date, end: Date, interval: number, fastName: string) => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;

      const now = Date.now();

      // Start notification
      const startMs = start.getTime();
      if (startMs > now) {
        // If starting in the future, schedule it
        await Notifications.scheduleNotificationAsync({
          content: { title: "Fasting Started 🕊️", body: `Your ${fastName} fast has started. May God strengthen you!` },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: start },
        });
      }

      // End notification
      const endMs = end.getTime();
      if (endMs > now) {
        await Notifications.scheduleNotificationAsync({
          content: { title: "Fasting Completed 🎉", body: `Your ${fastName} fast has successfully completed! (Please manually mark this as Completed)` },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: end },
        });
      }

      // Interval notifications
      if (interval > 0) {
        let currentMs = Math.max(start.getTime(), now);
        const msInterval = interval * 60 * 60 * 1000;
        
        while (currentMs + msInterval < end.getTime()) {
          currentMs += msInterval;
          if (currentMs > now) {
            await Notifications.scheduleNotificationAsync({
              content: { title: "Fasting Reminder ⏳", body: `Stay strong! You are currently on your ${fastName} fast.` },
              trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(currentMs) },
            });
          }
        }
      }
    } catch (e) {
      console.log('Error scheduling notifications:', e);
    }
  };

  const handleSubmit = async () => {
    if (!startDate || !endDate) {
      Alert.alert("Error", "Please select both a start and end date.");
      return;
    }
    
    const now = new Date();
    const nowMs = now.getTime();
    
    // Strict Future Validation
    if (startDate.getTime() <= nowMs) {
      Alert.alert("Error", "Start time MUST be strictly in the future. Please modify it.");
      return;
    }
    
    if (endDate.getTime() <= startDate.getTime()) {
      Alert.alert("Error", "End time must be strictly after the start time.");
      return;
    }
    if (type === 'Others' && !customType.trim()) {
      Alert.alert("Error", "Please enter your custom fasting type.");
      return;
    }

    try {
      setLoading(true);
      
      const res = await axios.post(`${BASE_URL}/api/fasting`, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        type,
        customType: type === 'Others' ? customType : undefined,
        notes,
        notifyInterval
      });

      if (res.data.status === 'Success') {
        const fastName = type === 'Others' ? customType : type;
        await scheduleNotifications(startDate, endDate, notifyInterval, fastName);

        setStartDate(null);
        setEndDate(null);
        setNotes('');
        setCustomType('');
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error adding fast', error);
      Alert.alert('Error', 'Failed to save the fast. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} statusBarTranslucent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Start a Fast</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Fast Type</Text>
            <View style={{ zIndex: 1000 }}>
               <DropDownPicker
                  open={openType}
                  value={type}
                  items={typeItems}
                  setOpen={setOpenType}
                  setValue={setType}
                  setItems={setTypeItems}
                  style={[styles.dropdown, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                  textStyle={{ color: colors.text }}
                  dropDownContainerStyle={{ backgroundColor: colors.cardBg, borderColor: colors.border }}
                  placeholderStyle={{ color: colors.textSecondary }}
                  zIndex={1000}
                  zIndexInverse={3000}
                  listMode="SCROLLVIEW"
               />
            </View>

            {type === 'Others' && (
              <View>
                <Text style={styles.label}>Custom Fasting Type</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. type your fasting name"
                  placeholderTextColor={colors.textSecondary}
                  value={customType}
                  onChangeText={setCustomType}
                />
              </View>
            )}

            <Text style={styles.label}>Start Time</Text>
            <TouchableOpacity style={styles.dateInput} onPress={() => setStartDatePickerVisibility(true)}>
              <Text style={styles.dateText}>
                {startDate ? startDate.toLocaleString() : 'Select Start Date & Time'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.label}>End Time</Text>
            <TouchableOpacity style={styles.dateInput} onPress={() => setEndDatePickerVisibility(true)}>
              <Text style={styles.dateText}>
                {endDate ? endDate.toLocaleString() : 'Select End Date & Time'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.label}>Alert Me</Text>
            <View style={{ zIndex: 900 }}>
               <DropDownPicker
                  open={openNotify}
                  value={notifyInterval}
                  items={notifyItems}
                  setOpen={setOpenNotify}
                  setValue={setNotifyInterval}
                  setItems={setNotifyItems}
                  style={[styles.dropdown, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                  textStyle={{ color: colors.text }}
                  dropDownContainerStyle={{ backgroundColor: colors.cardBg, borderColor: colors.border }}
                  placeholderStyle={{ color: colors.textSecondary }}
                  zIndex={900}
                  zIndexInverse={2000}
                  listMode="SCROLLVIEW"
               />
            </View>

            <Text style={styles.label}>Notes / Purpose</Text>
            <TextInput
               style={[styles.input, styles.textArea]}
               placeholder="Praying for..."
               placeholderTextColor={colors.textSecondary}
               multiline
               numberOfLines={3}
               value={notes}
               onChangeText={setNotes}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={loading}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Start Fast</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Date Time Pickers */}
          <DateTimePickerModal
            isVisible={isStartDatePickerVisible}
            mode="datetime"
            minimumDate={new Date()}
            date={startDate || new Date()}
            onConfirm={(date) => { 
                date.setSeconds(0, 0);
                setStartDate(date); 
                setStartDatePickerVisibility(false); 
            }}
            onCancel={() => setStartDatePickerVisibility(false)}
          />
          <DateTimePickerModal
            isVisible={isEndDatePickerVisible}
            mode="datetime"
            minimumDate={startDate || new Date()}
            date={endDate || startDate || new Date()}
            onConfirm={(date) => { 
                date.setSeconds(0, 0);
                setEndDate(date); 
                setEndDatePickerVisibility(false); 
            }}
            onCancel={() => setEndDatePickerVisibility(false)}
          />

        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: ColorsType) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 24,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  dropdown: {
    borderColor: colors.border,
    marginBottom: 16,
    backgroundColor: colors.inputBg,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: colors.inputBg,
    color: colors.text,
    marginBottom: 16,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    backgroundColor: colors.inputBg,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
