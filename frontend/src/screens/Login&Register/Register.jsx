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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Fontisto from 'react-native-vector-icons/Fontisto';
import Error from 'react-native-vector-icons/MaterialIcons';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { RadioButton } from 'react-native-paper';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';
const SECRET_TEXT = Constants.expoConfig.extra.secretText;
console.log('secretText:', SECRET_TEXT);

function RegisterPage({ props }) {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState('User');
  const [secretText, setSecretText] = useState('');
  const [showSecretText, setShowSecretText] = useState(false); // New state for secret text visibility
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [secretError, setSecretError] = useState('');

  const validateName = (name) => name.length > 1;
  const validateEmail = (email) => /^[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(email);
  const validateMobile = (mobile) => /[6-9][0-9]{9}/.test(mobile);
  const validatePassword = (password) => /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/.test(password);
  const validateSecret = (secretText) => (userType === 'Admin' && SECRET_TEXT) ? secretText === SECRET_TEXT : true;

  useEffect(() => {
    // Reset or set secret error based on userType and SECRET_TEXT availability
    if (!SECRET_TEXT) {
      setSecretError('Secret text configuration is missing in app config');
    } else if (userType !== 'Admin') {
      setSecretError('');
    } else if (!secretText) {
      setSecretError('Secret text is required for Admin');
    } else if (!validateSecret(secretText)) {
      setSecretError('Secret text is invalid');
    } else {
      setSecretError('');
    }
  }, [userType, secretText, SECRET_TEXT]);

  const handleSubmit = () => {
    setNameError('');
    setEmailError('');
    setMobileError('');
    setPasswordError('');
    setSecretError('');

    if (!name) setNameError('Name is required');
    else if (!validateName(name)) setNameError('Name must be more than 1 character');
    if (!email) setEmailError('Email is required');
    else if (!validateEmail(email)) setEmailError('Please enter a valid email address');
    if (!mobile) setMobileError('Mobile is required');
    else if (!validateMobile(mobile)) setMobileError('Mobile must start with 6-9 and be 10 digits');
    if (!password) setPasswordError('Password is required');
    else if (!validatePassword(password)) setPasswordError('Password must include uppercase, lowercase, number, and be at least 6 characters');
    if (userType === 'Admin' && !secretText) setSecretError('Secret text is required for Admin');
    else if (userType === 'Admin' && SECRET_TEXT && !validateSecret(secretText)) setSecretError('Secret text is invalid');

    if (!name || !email || !mobile || !password || (userType === 'Admin' && !secretText) || nameError || emailError || mobileError || passwordError || secretError) {
      Toast.show({
        type: 'error',
        text1: 'Error!!',
        text2: 'Please fill all required fields and fix errors',
        visibilityTime: 5000,
      });
      return;
    }

    setLoading(true);
    const userData = { name, email, mobile, password, userType, secretText };
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
        console.error('Registration error:', error);
        Alert.alert('Error', 'An error occurred during registration');
      })
      .finally(() => setLoading(false));
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps={'always'}
      style={{ backgroundColor: 'white' }}>
      <View>
        <View style={styles.logoContainer}>
          <Image
            style={styles.logo}
            source={require('../../assets/bible-shower.jpg')}
          />
        </View>
        <View style={styles.loginContainer}>
          <Text style={styles.text_header}>Register !!!</Text>

          <View style={styles.radioButton_div}>
            <Text style={styles.radioButton_title}>Register as</Text>
            <View style={styles.radioButton_inner_div}>
              <Text style={styles.radioButton_text}>User</Text>
              <RadioButton
                value="User"
                status={userType === 'User' ? 'checked' : 'unchecked'}
                onPress={() => setUserType('User')}
              />
            </View>
            <View style={styles.radioButton_inner_div}>
              <Text style={styles.radioButton_text}>Admin</Text>
              <RadioButton
                value="Admin"
                status={userType === 'Admin' ? 'checked' : 'unchecked'}
                onPress={() => setUserType('Admin')}
              />
            </View>
          </View>

          {userType === 'Admin' && (
            <View style={styles.action}>
              <FontAwesome name="user-secret" color="#146C94" style={styles.smallIcon} />
              <TextInput
                placeholder="Secret Text"
                style={styles.textInput}
                value={secretText}
                onChangeText={(text) => {
                  setSecretText(text);
                  if (userType === 'Admin' && SECRET_TEXT && !validateSecret(text)) {
                    setSecretError('Secret text is invalid');
                  } else {
                    setSecretError('');
                  }
                }}
                secureTextEntry={!showSecretText}
              />
              <TouchableOpacity onPress={() => setShowSecretText(!showSecretText)}>
                <Feather
                  name={showSecretText ? 'eye' : 'eye-off'}
                  style={{ marginRight: -10 }}
                  color={secretError ? 'red' : '#146C94'}
                  size={23}
                />
              </TouchableOpacity>
            </View>
          )}
          {secretError ? <Text style={styles.errorText}>{secretError}</Text> : null}

          <View style={styles.action}>
            <FontAwesome name="user-o" color="#146C94" style={styles.smallIcon} />
            <TextInput
              placeholder="Name"
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
            <Fontisto name="email" color="#146C94" size={24} style={{ marginLeft: 0, paddingRight: 5 }} />
            <TextInput
              placeholder="Email"
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
            <FontAwesome name="mobile" color="#146C94" size={35} style={{ paddingRight: 10, marginTop: -7, marginLeft: 5 }} />
            <TextInput
              placeholder="Mobile"
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
            <FontAwesome name="lock" color="#146C94" style={styles.smallIcon} />
            <TextInput
              placeholder="Password"
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
                color={passwordError ? 'red' : '#146C94'}
                size={23}
              />
            </TouchableOpacity>
          </View>
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        </View>
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
    </ScrollView>
  );
}

export default RegisterPage;