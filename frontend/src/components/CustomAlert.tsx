import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated,
  Alert as RNAlert,
  AlertButton,
  AlertOptions,
  Platform,
  BackHandler,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, ColorsType } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Global manager to store a reference to the mounted CustomAlert component
type CustomAlertRef = {
  show: (
    title: string,
    message: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ) => void;
  hide: () => void;
};

let activeAlertRef: CustomAlertRef | null = null;
const originalAlert = RNAlert.alert;

export const CustomAlertManager = {
  setRef: (ref: CustomAlertRef | null) => {
    console.log('CustomAlertManager: setRef called with', ref ? 'non-null ref' : 'null ref');
    activeAlertRef = ref;
  },
  show: (
    title: string,
    message: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ) => {
    console.log('CustomAlertManager: show called. Title:', title, '| Ref present:', !!activeAlertRef);
    if (activeAlertRef) {
      activeAlertRef.show(title, message, buttons, options);
    } else {
      console.log('CustomAlertManager: falling back to native originalAlert');
      originalAlert(title, message, buttons, options);
    }
  },
  hide: () => {
    console.log('CustomAlertManager: hide called. Ref present:', !!activeAlertRef);
    if (activeAlertRef) {
      activeAlertRef.hide();
    }
  },
};

// Initialize global monkey-patching of Alert.alert and global.alert
export const initializeGlobalAlerts = () => {
  RNAlert.alert = (
    title: string,
    messageOrButtons?: string | AlertButton[],
    buttonsOrOptions?: AlertButton[] | AlertOptions,
    options?: AlertOptions
  ) => {
    let displayTitle = title || '';
    let displayMessage = '';
    let displayButtons: AlertButton[] = [];
    let displayOptions: AlertOptions = {};

    if (typeof messageOrButtons === 'string') {
      displayMessage = messageOrButtons;
      if (Array.isArray(buttonsOrOptions)) {
        displayButtons = buttonsOrOptions;
        if (options) displayOptions = options;
      } else if (buttonsOrOptions) {
        displayOptions = buttonsOrOptions as AlertOptions;
      }
    } else if (Array.isArray(messageOrButtons)) {
      displayButtons = messageOrButtons;
      if (buttonsOrOptions) {
        displayOptions = buttonsOrOptions as AlertOptions;
      }
    } else if (messageOrButtons) {
      displayOptions = messageOrButtons as AlertOptions;
    }

    CustomAlertManager.show(displayTitle, displayMessage, displayButtons, displayOptions);
  };

  // Override standard global alert
  (global as any).alert = (message: any) => {
    CustomAlertManager.show('', String(message));
  };
};

export const CustomAlert: React.FC = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [buttons, setButtons] = useState<AlertButton[]>([]);
  const [options, setOptions] = useState<AlertOptions>({});

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation on the message text (sync with LoadingScreen styling)
  useEffect(() => {
    let pulse: Animated.CompositeAnimation | null = null;
    if (visible) {
      pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1200,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: false,
          }),
        ])
      );
      pulse.start();
    }
    return () => {
      if (pulse) pulse.stop();
    };
  }, [visible, pulseAnim]);

  // Entrance spring animation for the card scale
  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.9);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: false,
      }).start();
    }
  }, [visible, scaleAnim]);

  // Intercept hardware back button on Android when the alert is visible
  useEffect(() => {
    if (!visible) return;

    const handleBackButton = () => {
      console.log('CustomAlert: Hardware back button pressed, hiding alert.');
      CustomAlertManager.hide();
      if (options.onDismiss) {
        options.onDismiss();
      }
      return true; // Intercept and block default back action
    };

    BackHandler.addEventListener('hardwareBackPress', handleBackButton);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, [visible, options]);

  // Register with Manager on mount
  useEffect(() => {
    console.log('CustomAlert: Component mounted, setting manager ref');
    CustomAlertManager.setRef({
      show: (t, m, b = [], o = {}) => {
        console.log('CustomAlert: Ref.show called inside component state update. Title:', t);
        setTitle(t);
        setMessage(m);
        setButtons(b);
        setOptions(o);
        setVisible(true);
      },
      hide: () => {
        console.log('CustomAlert: Ref.hide called inside component state update.');
        setVisible(false);
      },
    });

    return () => {
      console.log('CustomAlert: Component unmounted, clearing manager ref');
      CustomAlertManager.setRef(null);
    };
  }, []);

  if (!visible) return null;

  // Choose the best Lottie source depending on text analysis
  const getLottieSource = () => {
    const combinedText = `${title} ${message}`.toLowerCase();

    // User or profile related
    if (
      combinedText.includes('login') ||
      combinedText.includes('sign in') ||
      combinedText.includes('profile') ||
      combinedText.includes('user') ||
      combinedText.includes('guest') ||
      combinedText.includes('permission')
    ) {
      return require('../assets/lottie_icon/user.icon.json');
    }

    // Bible, tracking, reading related
    if (
      combinedText.includes('bible') ||
      combinedText.includes('genesis') ||
      combinedText.includes('reading') ||
      combinedText.includes('chapter') ||
      combinedText.includes('progress') ||
      combinedText.includes('treasure') ||
      combinedText.includes('plan') ||
      combinedText.includes('journey')
    ) {
      return require('../assets/lottie_icon/bible.icon.json');
    }

    // Warning, error, fail, or destructive operations
    if (
      combinedText.includes('delete') ||
      combinedText.includes('reset') ||
      combinedText.includes('clear') ||
      combinedText.includes('error') ||
      combinedText.includes('fail') ||
      combinedText.includes('denied') ||
      combinedText.includes('remove') ||
      combinedText.includes('warning') ||
      combinedText.includes('undo') ||
      combinedText.includes('playback')
    ) {
      return require('../assets/lottie_icon/pending-requests.icon.json');
    }

    // Success, updates, setting changes, notification alerts
    if (
      combinedText.includes('success') ||
      combinedText.includes('saved') ||
      combinedText.includes('updated') ||
      combinedText.includes('done') ||
      combinedText.includes('reminder') ||
      combinedText.includes('settings') ||
      combinedText.includes('notification') ||
      combinedText.includes('✓') ||
      combinedText.includes('added')
    ) {
      return require('../assets/lottie_icon/notification.icon.json');
    }

    // Fallback/General notification icon
    return require('../assets/lottie_icon/notification.icon.json');
  };

  const handleButtonPress = (btn: AlertButton) => {
    CustomAlertManager.hide();
    if (btn.onPress) {
      btn.onPress();
    }
  };

  const handleBackdropPress = () => {
    if (options.cancelable) {
      CustomAlertManager.hide();
      if (options.onDismiss) {
        options.onDismiss();
      }
    }
  };

  // Render button elements
  const renderButtons = () => {
    const alertButtons = buttons.length > 0 ? buttons : [{ text: 'OK' }];

    if (alertButtons.length === 2) {
      // Side-by-side buttons
      return (
        <View style={styles.rowButtonsContainer}>
          {alertButtons.map((btn, index) => {
            const isCancel = btn.style === 'cancel' || btn.text?.toLowerCase() === 'cancel' || btn.text?.toLowerCase() === 'not now';
            const isDestructive = btn.style === 'destructive';

            if (isCancel) {
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => handleButtonPress(btn)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.buttonText, styles.cancelButtonText]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            }

            if (isDestructive) {
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.button, styles.destructiveButton]}
                  onPress={() => handleButtonPress(btn)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.buttonText, styles.destructiveButtonText]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            }

            // Primary
            return (
              <TouchableOpacity
                key={index}
                style={styles.gradientButtonWrapper}
                onPress={() => handleButtonPress(btn)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={colors.linearGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={[styles.buttonText, styles.primaryButtonText]}>
                    {btn.text}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    // Stacked buttons (1 button or 3+ buttons)
    return (
      <View style={styles.verticalButtonsContainer}>
        {alertButtons.map((btn, index) => {
          const isCancel = btn.style === 'cancel' || btn.text?.toLowerCase() === 'cancel' || btn.text?.toLowerCase() === 'not now';
          const isDestructive = btn.style === 'destructive';

          if (isCancel) {
            return (
              <TouchableOpacity
                key={index}
                style={[styles.verticalButton, styles.cancelButton, { marginTop: index > 0 ? 8 : 0 }]}
                onPress={() => handleButtonPress(btn)}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>
                  {btn.text}
                </Text>
              </TouchableOpacity>
            );
          }

          if (isDestructive) {
            return (
              <TouchableOpacity
                key={index}
                style={[styles.verticalButton, styles.destructiveButton, { marginTop: index > 0 ? 8 : 0 }]}
                onPress={() => handleButtonPress(btn)}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, styles.destructiveButtonText]}>
                  {btn.text}
                </Text>
              </TouchableOpacity>
            );
          }

          // Primary/Default
          return (
            <TouchableOpacity
              key={index}
              style={[styles.verticalGradientButtonWrapper, { marginTop: index > 0 ? 8 : 0 }]}
              onPress={() => handleButtonPress(btn)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={colors.linearGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={[styles.buttonText, styles.primaryButtonText]}>
                  {btn.text}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={StyleSheet.absoluteFillObject}
        activeOpacity={1}
        onPress={handleBackdropPress}
      />
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Top colored accent line */}
        <LinearGradient
          colors={colors.linearGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.accentBar}
        />

        <View style={styles.contentContainer}>
          <View style={styles.lottieWrapper}>
            <LottieView
              source={getLottieSource()}
              autoPlay
              loop
              style={styles.lottie}
            />
          </View>

          {title ? (
            <Text style={styles.title}>{title}</Text>
          ) : null}

          {message ? (
            <Animated.View
              style={{
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.05],
                  outputRange: [0.9, 1],
                }),
              }}
            >
              <Text style={styles.message}>{message}</Text>
            </Animated.View>
          ) : null}

          {renderButtons()}
        </View>
      </Animated.View>
    </View>
  );
};

const getStyles = (colors: ColorsType) =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 99999,
      backgroundColor: colors.theme === 'dark' ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      width: SCREEN_WIDTH > 450 ? 400 : SCREEN_WIDTH - 48,
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.25,
          shadowRadius: 15,
        },
        android: {
          elevation: 10,
        },
      }),
    },
    accentBar: {
      height: 6,
      width: '100%',
    },
    contentContainer: {
      padding: 24,
      alignItems: 'center',
    },
    lottieWrapper: {
      width: 110,
      height: 110,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    lottie: {
      width: 110,
      height: 110,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 10,
      letterSpacing: 0.3,
    },
    message: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
      paddingHorizontal: 6,
    },
    rowButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
    },
    verticalButtonsContainer: {
      flexDirection: 'column',
      width: '100%',
      alignItems: 'center',
    },
    button: {
      flex: 1,
      height: 46,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 6,
    },
    verticalButton: {
      width: '100%',
      height: 46,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    gradientButtonWrapper: {
      flex: 1,
      height: 46,
      marginHorizontal: 6,
    },
    verticalGradientButtonWrapper: {
      width: '100%',
      height: 46,
    },
    gradientButton: {
      width: '100%',
      height: '100%',
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    destructiveButton: {
      backgroundColor: '#EF4444',
    },
    buttonText: {
      fontSize: 15,
      fontWeight: '600',
    },
    primaryButtonText: {
      color: '#FFFFFF',
    },
    cancelButtonText: {
      color: colors.textSecondary,
    },
    destructiveButtonText: {
      color: '#FFFFFF',
    },
  });
