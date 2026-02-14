import { createContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUser } from './UserContext';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

export const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    // Disconnect existing socket first
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
    }

    if (!user) {
      return;
    }

    // Use same origin when API_BASE is empty (Vite proxy); otherwise use API_BASE
    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
    const socketUrl = API_BASE || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');
    const token = localStorage.getItem('token');

    if (!token) {
      return;
    }

    // Create socket connection with authentication
    const newSocket = io(socketUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnected(false);
    });

    setSocket(newSocket);

    // Cleanup on unmount or user change
    return () => {
      newSocket.close();
      setSocket(null);
      setConnected(false);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}
