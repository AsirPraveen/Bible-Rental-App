import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  StyleSheet,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const ForgotPassword = () => {
  const navigation = useNavigation();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']); // Array for 6 OTP digits
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateEmail = (value:any) => /^[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(value);
  const validatePassword = (value:any) => value.length >= 6;

  // Animated value for stepper
  const progress = new Animated.Value(0);

  React.useEffect(() => {
    Animated.timing(progress, {
      toValue: step,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [step]);

  const handleSendOtp = () => {
    setEmailError('');
    if (!email) {
      setEmailError('Email is required');
      return;
    }
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    axios
      .post(`${API_URL}/api/auth/forgot-password`, { email })
      .then(res => {
        console.log('Send OTP response:', res.data);
        if (res.data.status === 'ok') {
          Alert.alert('Success', res.data.message || 'OTP sent to your email!');
          setStep(2);
        } else {
          Alert.alert('Error', res.data.error || 'Failed to send OTP');
        }
      })
      .catch(error => {
        console.error('OTP error:', error.response?.data || error.message);
        Alert.alert('Error', 'An error occurred while sending OTP');
      })
      .finally(() => setLoading(false));
  };

  const handleVerifyOtp = () => {
    setOtpError('');
    const otpValue = otp.join('');
    if (!otpValue || otpValue.length !== 6) {
      setOtpError('Please enter a 6-digit OTP');
      return;
    }
    setOtpError(''); // Clear error if all digits are present
    setLoading(true);
    axios
      .post(`${API_URL}/api/auth/verify-otp`, { email, otp: otpValue })
      .then(res => {
        console.log('Verify OTP response:', res.data);
        if (res.data.status === 'ok') {
          Alert.alert('Success', res.data.message || 'OTP verified!');
          setStep(3);
        } else {
          setOtpError(res.data.error || 'Invalid OTP');
          Alert.alert('Error', res.data.error || 'Invalid OTP');
        }
      })
      .catch(error => {
        console.error('Verify OTP error:', error.response?.data || error.message);
        setOtpError('An error occurred while verifying OTP');
        Alert.alert('Error', 'An error occurred while verifying OTP');
      })
      .finally(() => setLoading(false));
  };

  const handleResetPassword = () => {
    setPasswordError('');
    setConfirmError('');
    if (!newPassword) {
      setPasswordError('New password is required');
      return;
    }
    if (!validatePassword(newPassword)) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    if (!confirmPassword) {
      setConfirmError('Confirm password is required');
      return;
    }
    if (newPassword !== confirmPassword) {
      setConfirmError('Passwords entered should match');
      return;
    }

    setLoading(true);
    axios
      .post(`${API_URL}/api/auth/reset-password`, { email, newPassword })
      .then(res => {
        console.log('Reset Password response:', res.data);
        if (res.data.status === 'ok') {
          Alert.alert('Success', res.data.message || 'Password reset successfully!');
          navigation.navigate("Login");
        } else {
          Alert.alert('Error', res.data.error || 'Failed to reset password');
        }
      })
      .catch(error => {
        console.error('Reset password error:', error.response?.data || error.message);
        Alert.alert('Error', 'An error occurred while resetting password');
      })
      .finally(() => setLoading(false));
  };

  // Handle OTP input and auto-focus/next
  const handleOtpChange = (text:any, index:any) => {
    const newOtp = [...otp];
    newOtp[index] = text[0] || ''; // Only take the first character
    setOtp(newOtp);

    // Auto-focus to next box if filled, or previous if cleared
    if (text && index < 5) {
      otpInputs[index + 1].focus();
    } else if (!text && index > 0) {
      otpInputs[index - 1].focus();
    }

    // Do not auto-submit; rely on button press
  };

  // Handle paste for autofill
  const handleOtpPaste = (text:any, index:any) => {
    const pastedOtp = text.slice(0, 6).split('');
    const newOtp = [...otp];
    for (let i = 0; i < 6 && i < pastedOtp.length; i++) {
      newOtp[i] = pastedOtp[i];
    }
    setOtp(newOtp);
    // Do not auto-submit; rely on button press
  };

  let otpInputs:any[] = [];

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps={'always'}>
      <View style={localStyles.mainContainer}>
        <View style={localStyles.logoContainer}>
          <Image style={localStyles.logo} source={require('../../assets/giver.jpg')} />
        </View>
        <View style={localStyles.loginContainer}>
          <Text style={localStyles.text_header}>Forgot Password</Text>
          <View style={localStyles.stepperContainer}>
            {[1, 2, 3].map((s, index) => (
              <Animated.View
                key={s}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: progress.interpolate({
                    inputRange: [1, 2, 3],
                    outputRange: [
                      s <= step ? '#3f83f3' : '#ccc',
                      s <= step ? '#3f83f3' : '#ccc',
                      s <= step ? '#3f83f3' : '#ccc',
                    ],
                  }),
                  marginHorizontal: 5,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={localStyles.stepText}>{s}</Text>
              </Animated.View>
            ))}
          </View>
          {step === 1 && (
            <>
              <View style={localStyles.action}>
                <FontAwesome name="envelope-o" color="#3f83f3" style={localStyles.smallIcon} />
                <TextInput
                  placeholder="Email"
                  style={localStyles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              {emailError ? <Text style={localStyles.errorText}>{emailError}</Text> : null}
              <View style={localStyles.button}>
                <TouchableOpacity
                  style={localStyles.inBut}
                  onPress={handleSendOtp}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#F6F1F1" />
                  ) : (
                    <Text style={localStyles.textSign}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
          {step === 2 && (
            <>
              <View style={localStyles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={ref => (otpInputs[index] = ref)}
                    style={localStyles.otpBox}
                    value={digit}
                    onChangeText={text => handleOtpChange(text, index)}
                    onPaste={(e: any) => handleOtpPaste(e.nativeEvent.clipboardData?.getData('text'), index)}
                    maxLength={1}
                    keyboardType="numeric"
                    autoFocus={index === 0}
                  />
                ))}
              </View>
              {otpError ? <Text style={localStyles.errorText}>{otpError}</Text> : null}
              <View style={localStyles.button}>
                <TouchableOpacity
                  style={localStyles.inBut}
                  onPress={handleVerifyOtp}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#F6F1F1" />
                  ) : (
                    <Text style={localStyles.textSign}>Verify OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
          {step === 3 && (
            <>
              <View style={localStyles.action}>
                <FontAwesome name="lock" color="#3f83f3" style={localStyles.smallIcon} />
                <TextInput
                  placeholder="New Password"
                  style={localStyles.textInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                />
                <TouchableOpacity
                  style={localStyles.iconButton}
                  onPress={() => setShowNewPassword(!showNewPassword)}>
                  <Feather
                    name={showNewPassword ? 'eye' : 'eye-off'}
                    size={20}
                    color="#3f83f3"
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? <Text style={localStyles.errorText}>{passwordError}</Text> : null}
              <View style={localStyles.action}>
                <FontAwesome name="lock" color="#3f83f3" style={localStyles.smallIcon} />
                <TextInput
                  placeholder="Confirm Password"
                  style={localStyles.textInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  style={localStyles.iconButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Feather
                    name={showConfirmPassword ? 'eye' : 'eye-off'}
                    size={20}
                    color="#3f83f3"
                  />
                </TouchableOpacity>
              </View>
              {confirmError ? <Text style={localStyles.errorText}>{confirmError}</Text> : null}
              <View style={localStyles.button}>
                <TouchableOpacity
                  style={localStyles.inBut}
                  onPress={handleResetPassword}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#F6F1F1" />
                  ) : (
                    <Text style={localStyles.textSign}>Confirm</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

// Local styles to avoid affecting Login.jsx and Register.jsx
const localStyles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: 'white',
    paddingBottom: 20,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  logo: {
    height: 260,
    width: 260,
    borderRadius: 30,
  },
  loginContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 30,
    marginTop: 20,
  },
  text_header: {
    color: '#3f83f3',
    fontWeight: 'bold',
    fontSize: 30,
    textAlign: 'center',
    marginBottom: 10,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  action: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 10,
    marginBottom: 10, // Reduced to minimize gap
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#3f83f3',
    borderRadius: 50,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    marginTop: -5,
    color: '#05375a',
    paddingVertical: 5,
  },
  button: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  inBut: {
    width: '70%',
    backgroundColor: '#3f83f3',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 50,
    marginTop: 10,
  },
  textSign: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  smallIcon: {
    marginRight: 10,
    fontSize: 24,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginLeft: 20,
    marginTop: 2, // Reduced to minimize gap with field
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10, // Reduced to minimize gap
  },
  otpBox: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: '#3f83f3',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 18,
    color: '#05375a',
  },
  iconButton: {
    padding: 5,
  },
});

export default ForgotPassword;