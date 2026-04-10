import React, { createContext, useContext, ReactNode } from 'react';

type MockSocket = {
  emit: (event: string, ...args: any[]) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
};

interface SocketContextType {
  socket: MockSocket;
  isConnected: boolean;
}

const mockSocket: MockSocket = {
  emit: () => {},
  on: () => {},
  off: () => {}
};

const SocketContext = createContext<SocketContextType>({
  socket: mockSocket,
  isConnected: true
});

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  return (
    <SocketContext.Provider value={{ socket: mockSocket, isConnected: true }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
