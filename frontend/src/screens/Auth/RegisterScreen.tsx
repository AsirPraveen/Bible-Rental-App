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
import { getStyles } from './styles';
import { useTheme } from '@/context/ThemeContext';
import { Feather } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import { Fontisto } from '@expo/vector-icons';
import { MaterialIcons as Error } from '@expo/vector-icons';
import { useState } from 'react';
import { apiClient } from '@/services';
import Toast from 'react-native-toast-message';
import { API_BASE_URL } from '@/config/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';

/** Routes these auth screens navigate to. Declared locally, matching the
 *  pattern the rest of the codebase already uses; a single shared param list
 *  is listed as debt in ARCHITECTURE.md. */
type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  GoogleSetPassword: {
    name?: string;
    email?: string;
    image?: string;
    signupTicket?: string;
  };
  SuperAdmin: undefined;
  AdminScreen: undefined;
  MainApp: undefined;
  OrgSelection: undefined;
  'Forgot Password': { email?: string };
};

function RegisterPage() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const keyboardInset = useKeyboardInset();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const validateName = (name: string) => name.length > 1;
  const validateEmail = (email: string) => /^[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(email);
  const validateMobile = (mobile: string) => /[6-9][0-9]{9}/.test(mobile);
  const validatePassword = (password: string) => /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/.test(password);

  const handleSubmit = () => {
    let localNameError = '';
    let localEmailError = '';
    let localMobileError = '';
    let localPasswordError = '';
    let localConfirmPasswordError = '';

    if (!name) localNameError = 'Name is required';
    else if (!validateName(name)) localNameError = 'Name must be more than 1 character';

    if (!email) localEmailError = 'Email is required';
    else if (!validateEmail(email)) localEmailError = 'Please enter a valid email address';

    if (!mobile) localMobileError = 'Mobile is required';
    else if (!validateMobile(mobile)) localMobileError = 'Mobile must start with 6-9 and be 10 digits';

    if (!password) localPasswordError = 'Password is required';
    else if (!validatePassword(password)) localPasswordError = 'Password must include uppercase, lowercase, number, and be at least 8 characters';

    if (!confirmPassword) localConfirmPasswordError = 'Confirm password is required';
    else if (confirmPassword !== password) localConfirmPasswordError = 'Passwords do not match';

    setNameError(localNameError);
    setEmailError(localEmailError);
    setMobileError(localMobileError);
    setPasswordError(localPasswordError);
    setConfirmPasswordError(localConfirmPasswordError);

    if (localNameError || localEmailError || localMobileError || localPasswordError || localConfirmPasswordError) {
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
    apiClient.post(`/api/auth/register`, userData)
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
      contentContainerStyle={[{ flexGrow: 1 }, { paddingBottom: keyboardInset }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps={'always'}
      style={{ backgroundColor: colors.background }}>
      <View style={styles.mainContainer}>
        <View style={styles.logoContainer}>
          <Image
            style={styles.logo}
            source={require('@/assets/bible-shower.jpg')}
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
              onChangeText={(text: string) => {
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
              onChangeText={(text: string) => {
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
              onChangeText={(text: string) => {
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
              onChangeText={(text: string) => {
                setPassword(text);
                if (!validatePassword(text)) setPasswordError('Password must include uppercase, lowercase, number, and be at least 8 characters');
                else setPasswordError('');

                if (confirmPassword && text !== confirmPassword) {
                  setConfirmPasswordError('Passwords do not match');
                } else {
                  setConfirmPasswordError('');
                }
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

          <View style={styles.action}>
            <FontAwesome name="lock" color={colors.tint} style={styles.smallIcon} />
            <TextInput
              placeholder="Re-enter Password"
              placeholderTextColor={colors.textSecondary}
              style={styles.textInput}
              value={confirmPassword}
              onChangeText={(text: string) => {
                setConfirmPassword(text);
                if (text !== password) setConfirmPasswordError('Passwords do not match');
                else setConfirmPasswordError('');
              }}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Feather
                name={showPassword ? 'eye' : 'eye-off'}
                style={{ marginRight: -10 }}
                color={confirmPasswordError ? 'red' : colors.tint}
                size={23}
              />
            </TouchableOpacity>
          </View>
          {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}

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