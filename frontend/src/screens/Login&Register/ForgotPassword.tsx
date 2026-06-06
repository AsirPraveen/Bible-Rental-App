import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const ForgotPassword = () => {
  const navigation = useNavigation<any>();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Resend OTP cooldown
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const otpInputRefs = useRef<Array<TextInput | null>>([]);

  const startCooldown = () => {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const validateEmail = (value: string) => /^[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(value);
  const validatePassword = (value: string) => value.length >= 6;

  const sendOtp = async () => {
    setEmailError('');
    if (!email) { setEmailError('Email is required'); return; }
    if (!validateEmail(email)) { setEmailError('Please enter a valid email address'); return; }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
      console.log('Send OTP response:', res.data);
      if (res.data.status === 'ok') {
        Alert.alert('✅ OTP Sent', res.data.message || 'OTP sent to your email!');
        setStep(2);
        startCooldown();
      } else {
        const errMsg = res.data.error || 'Failed to send OTP. Please try again.';
        setEmailError(errMsg);
        Alert.alert('Error', errMsg);
      }
    } catch (error: any) {
      const serverErr = error.response?.data?.error || error.message || 'Network error. Check your connection.';
      console.error('OTP error:', serverErr);
      setEmailError(serverErr);
      Alert.alert('Error', serverErr);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
      if (res.data.status === 'ok') {
        Alert.alert('✅ OTP Resent', 'A new OTP has been sent to your email.');
        setOtp(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
        startCooldown();
      } else {
        Alert.alert('Error', res.data.error || 'Failed to resend OTP.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError('');
    const otpValue = otp.join('');
    if (otpValue.length !== 6) { setOtpError('Please enter all 6 digits'); return; }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/verify-otp`, { email, otp: otpValue });
      console.log('Verify OTP response:', res.data);
      if (res.data.status === 'ok') {
        Alert.alert('✅ Verified', 'OTP verified successfully!');
        setStep(3);
      } else {
        const errMsg = res.data.error || 'Invalid OTP. Please try again.';
        setOtpError(errMsg);
        Alert.alert('Error', errMsg);
      }
    } catch (error: any) {
      const serverErr = error.response?.data?.error || 'Network error. Please try again.';
      setOtpError(serverErr);
      Alert.alert('Error', serverErr);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setPasswordError('');
    setConfirmError('');
    if (!newPassword) { setPasswordError('New password is required'); return; }
    if (!validatePassword(newPassword)) { setPasswordError('Password must be at least 6 characters'); return; }
    if (!confirmPassword) { setConfirmError('Please confirm your password'); return; }
    if (newPassword !== confirmPassword) { setConfirmError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/reset-password`, { email, newPassword });
      console.log('Reset Password response:', res.data);
      if (res.data.status === 'ok') {
        Alert.alert('✅ Success', 'Password reset successfully! Please login with your new password.', [
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]);
      } else {
        Alert.alert('Error', res.data.error || 'Failed to reset password.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    // Handle paste of full OTP
    if (text.length > 1) {
      const digits = text.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => { if (i < 6) newOtp[i] = d; });
      setOtp(newOtp);
      const nextIndex = Math.min(digits.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = text.replace(/\D/g, '');
    setOtp(newOtp);

    if (text && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const stepLabels = ['Email', 'OTP', 'Reset'];

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="always">
      <View style={localStyles.mainContainer}>
        <View style={localStyles.logoContainer}>
          <Image style={localStyles.logo} source={require('../../assets/giver.jpg')} />
        </View>

        <View style={localStyles.loginContainer}>
          <Text style={localStyles.text_header}>Forgot Password</Text>

          {/* Step Indicator */}
          <View style={localStyles.stepperRow}>
            {stepLabels.map((label, idx) => {
              const s = idx + 1;
              const isDone = step > s;
              const isActive = step === s;
              return (
                <React.Fragment key={s}>
                  <View style={localStyles.stepItem}>
                    <View style={[
                      localStyles.stepCircle,
                      isActive && localStyles.stepCircleActive,
                      isDone && localStyles.stepCircleDone,
                    ]}>
                      {isDone
                        ? <FontAwesome name="check" size={13} color="#fff" />
                        : <Text style={localStyles.stepText}>{s}</Text>
                      }
                    </View>
                    <Text style={[localStyles.stepLabel, (isActive || isDone) && { color: '#146C94', fontWeight: '700' }]}>
                      {label}
                    </Text>
                  </View>
                  {idx < 2 && (
                    <View style={[localStyles.stepLine, step > s && localStyles.stepLineDone]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {/* Step 1: Email */}
          {step === 1 && (
            <>
              <Text style={localStyles.subText}>Enter your registered email to receive an OTP.</Text>
              <View style={localStyles.action}>
                <FontAwesome name="envelope-o" color="#146C94" style={localStyles.smallIcon} />
                <TextInput
                  placeholder="Email address"
                  style={localStyles.textInput}
                  value={email}
                  onChangeText={v => { setEmail(v); setEmailError(''); }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>
              {emailError ? <Text style={localStyles.errorText}>⚠ {emailError}</Text> : null}
              <View style={localStyles.button}>
                <TouchableOpacity style={localStyles.inBut} onPress={sendOtp} disabled={loading}>
                  {loading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={localStyles.textSign}>Send OTP</Text>
                  }
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <>
              <Text style={localStyles.subText}>Enter the 6-digit OTP sent to <Text style={{ fontWeight: '700', color: '#146C94' }}>{email}</Text></Text>
              <View style={localStyles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={ref => { otpInputRefs.current[index] = ref; }}
                    style={[localStyles.otpBox, digit ? localStyles.otpBoxFilled : null]}
                    value={digit}
                    onChangeText={text => handleOtpChange(text, index)}
                    onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
                    maxLength={6}
                    keyboardType="numeric"
                    autoFocus={index === 0}
                    selectTextOnFocus
                  />
                ))}
              </View>
              {otpError ? <Text style={localStyles.errorText}>⚠ {otpError}</Text> : null}

              {/* Resend OTP */}
              <TouchableOpacity
                onPress={handleResendOtp}
                disabled={resendCooldown > 0 || loading}
                style={localStyles.resendRow}
              >
                <Text style={[localStyles.resendText, resendCooldown > 0 && { color: '#aaa' }]}>
                  {resendCooldown > 0
                    ? `Resend OTP in ${resendCooldown}s`
                    : "Didn't receive OTP? Resend"
                  }
                </Text>
              </TouchableOpacity>

              <View style={localStyles.button}>
                <TouchableOpacity style={localStyles.inBut} onPress={handleVerifyOtp} disabled={loading}>
                  {loading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={localStyles.textSign}>Verify OTP</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStep(1)} style={{ marginTop: 12 }}>
                  <Text style={{ color: '#146C94', textAlign: 'center', fontWeight: '600' }}>← Change Email</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <>
              <Text style={localStyles.subText}>Create a new password for your account.</Text>
              <View style={localStyles.action}>
                <FontAwesome name="lock" color="#146C94" style={localStyles.smallIcon} />
                <TextInput
                  placeholder="New Password (min 6 characters)"
                  style={localStyles.textInput}
                  value={newPassword}
                  onChangeText={v => { setNewPassword(v); setPasswordError(''); }}
                  secureTextEntry={!showNewPassword}
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                  <Feather name={showNewPassword ? 'eye' : 'eye-off'} size={20} color="#146C94" />
                </TouchableOpacity>
              </View>
              {passwordError ? <Text style={localStyles.errorText}>⚠ {passwordError}</Text> : null}

              <View style={localStyles.action}>
                <FontAwesome name="lock" color="#146C94" style={localStyles.smallIcon} />
                <TextInput
                  placeholder="Confirm New Password"
                  style={localStyles.textInput}
                  value={confirmPassword}
                  onChangeText={v => { setConfirmPassword(v); setConfirmError(''); }}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Feather name={showConfirmPassword ? 'eye' : 'eye-off'} size={20} color="#146C94" />
                </TouchableOpacity>
              </View>
              {confirmError ? <Text style={localStyles.errorText}>⚠ {confirmError}</Text> : null}

              <View style={localStyles.button}>
                <TouchableOpacity style={localStyles.inBut} onPress={handleResetPassword} disabled={loading}>
                  {loading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={localStyles.textSign}>Reset Password</Text>
                  }
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const localStyles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: 'white',
    paddingBottom: 30,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  logo: {
    height: 200,
    width: 200,
    borderRadius: 20,
  },
  loginContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 30,
    marginTop: 20,
  },
  text_header: {
    color: '#146C94',
    fontWeight: 'bold',
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 20,
  },
  subText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },

  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: '#146C94',
  },
  stepCircleDone: {
    backgroundColor: '#22c55e',
  },
  stepText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 6,
    marginBottom: 16,
  },
  stepLineDone: {
    backgroundColor: '#22c55e',
  },

  action: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1.5,
    borderColor: '#146C94',
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 6,
  },
  textInput: {
    flex: 1,
    color: '#05375a',
    fontSize: 15,
    paddingVertical: 2,
  },
  button: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  inBut: {
    width: '70%',
    backgroundColor: '#146C94',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 50,
  },
  textSign: {
    fontSize: 17,
    fontWeight: 'bold',
    color: 'white',
  },
  smallIcon: {
    marginRight: 10,
    fontSize: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginLeft: 8,
    marginTop: 2,
    marginBottom: 6,
    lineHeight: 16,
  },

  // OTP
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 52,
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#146C94',
    backgroundColor: '#f8fafc',
  },
  otpBoxFilled: {
    borderColor: '#146C94',
    backgroundColor: '#e0f2fe',
  },

  resendRow: {
    alignItems: 'center',
    marginBottom: 6,
    paddingVertical: 4,
  },
  resendText: {
    color: '#146C94',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  iconButton: {
    padding: 4,
  },
});

export default ForgotPassword;