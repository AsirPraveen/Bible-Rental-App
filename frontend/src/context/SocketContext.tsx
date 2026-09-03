import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

type SocketContextType = {
  socket: Socket | null;
  connected: boolean;
};

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false });

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;
    let socketInstance: Socket | null = null;

    const connectSocket = async () => {
      if (!user) {
        if (socketInstance) {
          socketInstance.disconnect();
        }
        if (active) {
          setSocket(null);
          setConnected(false);
        }
        return;
      }

      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      socketInstance = io(API_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      socketInstance.on('connect', () => {
        console.log('🔌 Socket connected');
        if (active) setConnected(true);
      });

      socketInstance.on('disconnect', () => {
        console.log('🔌 Socket disconnected');
        if (active) setConnected(false);
      });

      socketInstance.on('connect_error', (err) => {
        console.log('🔌 Socket connection error:', err.message);
      });

      if (active) {
        setSocket(socketInstance);
      }
    };

    connectSocket();

    return () => {
      active = false;
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};
