import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../auth/AuthContext';

// Socket connection URL (Default to backend port)
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5001';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
});

export const SocketProvider = ({ children }: { children: ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        // Only connect the socket if the user is authenticated
        if (!isAuthenticated) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        // Pass the JWT token for authentication on socket handshake
        const token = localStorage.getItem('floe_token');

        const newSocket = io(SOCKET_URL, {
            auth: {
                token,
            },
            transports: ['websocket'],
        });

        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to WebSocket server');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
            setIsConnected(false);
        });

        // Cleanup on unmount
        return () => {
            newSocket.disconnect();
        };
    }, [isAuthenticated, SOCKET_URL]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (context === undefined) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};
