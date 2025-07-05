const {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} = require('react-native');
import { useNavigation } from '@react-navigation/native';
import styles from './style';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useEffect, useState } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl;
console.log('API_URL:', API_URL);
function LoginPage({ props }) {
  const navigation = useNavigation();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // New state for password visibility
  const [loading, setLoading] = useState(false);
  const [emailOrPhoneError, setEmailOrPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateEmail = (value) => /^[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(value);
  const validatePhone = (value) => /^[6-9][0-9]{9}$/.test(value); // Exactly 10 digits
  const validateEmailOrPhone = (value) => validateEmail(value) || validatePhone(value);
  const validatePassword = (password) => password.length >= 6;

  const handleSubmit = () => {
    setEmailOrPhoneError('');
    setPasswordError('');

    if (!emailOrPhone) {
      setEmailOrPhoneError('Email or phone is required');
      return;
    }
    if (!validateEmailOrPhone(emailOrPhone)) {
      setEmailOrPhoneError('Please enter a valid email or 10-digit phone number starting with 6-9');
      return;
    }
    if (!password) {
      setPasswordError('Password is required');
      return;
    }
    if (!validatePassword(password)) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const userData = { emailOrPhone, password };
    console.log('LoginPage - userData:', userData, 'API_URL:', API_URL);
    axios
      .post(`${API_URL}/api/auth/login-user`, userData)
      .then(res => {
        if (res.data.status === 'ok') {
          Alert.alert('Success', 'Logged in successfully!');
          AsyncStorage.setItem('token', res.data.data);
          AsyncStorage.setItem('isLoggedIn', JSON.stringify(true));
          AsyncStorage.setItem('userType', res.data.userType);
          if (res.data.userType === 'Admin') {
            navigation.navigate('AdminScreen');
          } else {
            navigation.navigate('Home');
          }
        } else {
          Alert.alert('Error', res.data.error || 'Invalid credentials!!!');
        }
      })
      .catch(error => {
        console.error('Login error:', error);
        Alert.alert('Error', 'An error occurred during login');
      })
      .finally(() => setLoading(false));
  };

  async function getData() {
    const data = await AsyncStorage.getItem('isLoggedIn');
    console.log('LoginPage - isLoggedIn:', data);
  }

  useEffect(() => {
    getData();
  }, []);

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps={'always'}>
      <View style={styles.mainContainer}>
        <View style={styles.logoContainer}>
          <Image
            style={styles.logo}
            source={require('../../assets/giver.jpg')}
          />
        </View>
        <View style={styles.loginContainer}>
          <Text style={styles.text_header}>Login !!!</Text>
          <View style={styles.action}>
            <FontAwesome name="user-o" color="#3f83f3" style={styles.smallIcon} />
            <TextInput
              placeholder="Mobile or Email"
              style={styles.textInput}
              value={emailOrPhone}
              onChangeText={setEmailOrPhone}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          {emailOrPhoneError ? <Text style={styles.errorText}>{emailOrPhoneError}</Text> : null}
          <View style={styles.action}>
            <FontAwesome name="lock" color="#3f83f3" style={styles.smallIcon} />
            <TextInput
              placeholder="Password"
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Feather
                name={showPassword ? 'eye' : 'eye-off'}
                style={{ marginRight: -10 }}
                color={passwordError ? 'red' : '#3f83f3'}
                size={23}
              />
            </TouchableOpacity>
          </View>
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          <View
            style={{
              justifyContent: 'flex-end',
              alignItems: 'flex-end',
              marginTop: 8,
              marginRight: 10,
            }}>
            <Text
              style={{ color: '#3f83f3', fontWeight: '700' }}
              onPress={() => navigation.navigate('Forgot Password')}>
              Forgot Password
            </Text>
          </View>
        </View>
        <View style={styles.button}>
          <TouchableOpacity
            style={styles.inBut}
            onPress={handleSubmit}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#F6F1F1" />
            ) : (
              <Text style={styles.textSign}>Log in</Text>
            )}
          </TouchableOpacity>

          <View style={{ padding: 15 }}>
            <Text style={styles.text_footer}>----Or Continue as----</Text>
          </View>
          <View style={styles.bottomButton}>
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <TouchableOpacity style={styles.inBut2} onPress={() => alert('Guest login coming soon')}>
                <FontAwesome name="user-circle-o" color="white" style={styles.smallIcon2} />
              </TouchableOpacity>
              <Text style={styles.bottomText}>Guest</Text>
            </View>
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <TouchableOpacity style={styles.inBut2} onPress={() => navigation.navigate('Register')}>
                <FontAwesome name="user-plus" color="white" style={[styles.smallIcon2, { fontSize: 30 }]} />
              </TouchableOpacity>
              <Text style={styles.bottomText}>Sign Up</Text>
            </View>
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <TouchableOpacity style={styles.inBut2} onPress={() => alert('Google login coming soon')}>
                <FontAwesome name="google" color="white" style={[styles.smallIcon2, { fontSize: 30 }]} />
              </TouchableOpacity>
              <Text style={styles.bottomText}>Google</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

export default LoginPage;