import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'light' | 'dark';

export type ColorsType = {
  theme: ThemeType;
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textLight: string;
  textSecondary: string;
  border: string;
  cardBg: string;
  tint: string;
  inputBg: string;
  loader: string;
  divider: string;
  linearGradient: [string, string, ...string[]];
  downGradient: string;
  upGradient: string;
};

export const colorsConfig: Record<ThemeType, ColorsType> = {
  light: {
    theme: 'light',
    primary: '#146C94',
    secondary: '#19A7CE',
    background: '#F6F1F1',
    surface: '#FFFFFF',
    text: '#333333',
    textLight: '#F6F1F1',
    textSecondary: '#666666',
    border: '#E0E0E0',
    cardBg: '#FFFFFF',
    tint: '#146C94',
    inputBg: '#F6F1F1',
    loader: '#146C94',
    divider: '#EEEEEE',
    linearGradient: ['#146C94', '#19A7CE'],
    downGradient: '#19A7CE',
    upGradient: '#146C94',
  },
  dark: {
    theme: 'dark',
    primary: '#1A2E40',       // Deep navy/dark slate primary
    secondary: '#2E8BC0',     // Premium accent blue
    background: '#12161A',    // Very dark blue-gray background
    surface: '#1A2229',       // Slate surface for cards
    text: '#E2E8F0',          // Slate white text
    textLight: '#E2E8F0',     // Light text
    textSecondary: '#94A3B8', // Slate gray text
    border: '#2A3644',        // Darker slate border
    cardBg: '#1A2229',        // Slate card background
    tint: '#38BDF8',          // Accent sky blue tint
    inputBg: '#232E3A',       // Darker text input background
    loader: '#38BDF8',        // Loader tint
    divider: '#2A3644',       // Dark divider
    linearGradient: ['#121820', '#1F2937'], // Very premium deep dark gradients
    downGradient: '#1F2937',
    upGradient: '#121820',
  },
};

type ThemeContextType = {
  theme: ThemeType;
  colors: ColorsType;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<ThemeType>('light');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@app_theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setTheme(savedTheme);
        }
      } catch (e) {
        console.error('Failed to load theme preference', e);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const nextTheme: ThemeType = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    try {
      await AsyncStorage.setItem('@app_theme', nextTheme);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const colors = colorsConfig[theme];

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
