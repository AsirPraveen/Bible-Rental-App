import React from 'react';
import { Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...' }) => {
  return (
    <LinearGradient colors={['#146C94', '#19A7CE']} style={styles.container}>
      <LottieView
        source={require('../assets/lottie_icon/Sandy Loading.json')}
        autoPlay
        loop
        style={styles.lottie}
      />
      {message ? <Text style={styles.text}>{message}</Text> : null}
    </LinearGradient>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: 200,
    height: 200,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#F6F1F1',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default LoadingScreen;
