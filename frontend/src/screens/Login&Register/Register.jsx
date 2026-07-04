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
import { getStyles } from './style';
import { useTheme } from '../../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Fontisto from 'react-native-vector-icons/Fontisto';
import Error from 'react-native-vector-icons/MaterialIcons';
import { useState } from 'react';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';
function RegisterPage() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateName = (name) => name.length > 1;
  const validateEmail = (email) => /^[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(email);
  const validateMobile = (mobile) => /[6-9][0-9]{9}/.test(mobile);
  const validatePassword = (password) => /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/.test(password);

  const handleSubmit = () => {
    setNameError('');
    setEmailError('');
    setMobileError('');
    setPasswordError('');

    if (!name) setNameError('Name is required');
    else if (!validateName(name)) setNameError('Name must be more than 1 character');
    if (!email) setEmailError('Email is required');
    else if (!validateEmail(email)) setEmailError('Please enter a valid email address');
    if (!mobile) setMobileError('Mobile is required');
    else if (!validateMobile(mobile)) setMobileError('Mobile must start with 6-9 and be 10 digits');
    if (!password) setPasswordError('Password is required');
    else if (!validatePassword(password)) setPasswordError('Password must include uppercase, lowercase, number, and be at least 6 characters');

    if (!name || !email || !mobile || !password || nameError || emailError || mobileError || passwordError) {
      Toast.show({
        type: 'error',
        text1: 'Error!!',
        text2: 'Please fill all required fields and fix errors',
        visibilityTime: 5000,
      });
      return;
    }

    setLoading(true);
    const userData = { name, email, mobile, password };
    axios
      .post(`${API_URL}/api/auth/register`, userData)
      .then(res => {
        if (res.data.status === 'ok') {
          Alert.alert('Success', 'Registered successfully!');
          navigation.navigate('Login');
        } else {
          Alert.alert('Error', res.data.data || 'Registration failed');
        }
      })
      .catch(error => {
        if (error.response && (error.response.status === 409 || error.response.status === 400)) {
          console.log('Registration failed (validation/conflict):', error.response.data?.data || error.response.statusText);
        } else {
          console.error('Registration error:', error);
        }
        const errorMsg = error.response?.data?.data || error.response?.data?.message || 'An error occurred during registration';
        Alert.alert('Error', errorMsg);
      })
      .finally(() => setLoading(false));
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps={'always'}
      style={{ backgroundColor: colors.background }}>
      <View style={styles.mainContainer}>
        <View style={styles.logoContainer}>
          <Image
            style={styles.logo}
            source={require('../../assets/bible-shower.jpg')}
          />
        </View>
        <View style={styles.loginContainer}>
          <Text style={styles.text_header}>Register !!!</Text>



          <View style={styles.action}>
            <FontAwesome name="user-o" color={colors.tint} style={styles.smallIcon} />
            <TextInput
              placeholder="Name"
              placeholderTextColor={colors.textSecondary}
              style={styles.textInput}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (!validateName(text)) setNameError('Name must be more than 1 character');
                else setNameError('');
              }}
            />
          </View>
          {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

          <View style={styles.action}>
            <Fontisto name="email" color={colors.tint} size={24} style={{ marginLeft: 0, paddingRight: 5 }} />
            <TextInput
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              style={styles.textInput}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (!validateEmail(text)) setEmailError('Please enter a valid email address');
                else setEmailError('');
              }}
              autoCapitalize="none"
            />
          </View>
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

          <View style={styles.action}>
            <FontAwesome name="mobile" color={colors.tint} size={35} style={{ paddingRight: 10, marginLeft: 5 }} />
            <TextInput
              placeholder="Mobile"
              placeholderTextColor={colors.textSecondary}
              style={styles.textInput}
              value={mobile}
              onChangeText={(text) => {
                setMobile(text);
                if (!validateMobile(text)) setMobileError('Mobile must start with 6-9 and be 10 digits');
                else setMobileError('');
              }}
              maxLength={10}
              keyboardType="phone-pad"
            />
          </View>
          {mobileError ? <Text style={styles.errorText}>{mobileError}</Text> : null}

          <View style={styles.action}>
            <FontAwesome name="lock" color={colors.tint} style={styles.smallIcon} />
            <TextInput
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              style={styles.textInput}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (!validatePassword(text)) setPasswordError('Password must include uppercase, lowercase, number, and be at least 6 characters');
                else setPasswordError('');
              }}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Feather
                name={showPassword ? 'eye' : 'eye-off'}
                style={{ marginRight: -10 }}
                color={passwordError ? 'red' : colors.tint}
                size={23}
              />
            </TouchableOpacity>
          </View>
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

          <View style={styles.button}>
            <TouchableOpacity
              style={styles.inBut}
              onPress={handleSubmit}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#F6F1F1" />
              ) : (
                <Text style={styles.textSign}>Register</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

export default RegisterPage;