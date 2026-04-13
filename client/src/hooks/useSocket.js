import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

let socketInstance = null; // singleton — one connection per app

export function useSocket() {
  const socketRef = useRef(null);

  const connect = useCallback((token, guestId) => {
    if (socketInstance?.connected) {
      socketRef.current = socketInstance;
      return socketInstance;
    }

    socketInstance = io(SOCKET_URL, {
      auth: { token: token || null, guestId: guestId || null },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('✓ Socket connected:', socketInstance.id);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('✗ Socket disconnected:', reason);
    });

    socketInstance.on('error', ({ message }) => {
      console.error('Socket error:', message);
    });

    socketRef.current = socketInstance;
    return socketInstance;
  }, []);

  const disconnect = useCallback(() => {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
  }, []);

  const emit = useCallback((event, payload) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, payload);
    }
  }, []);

  const on = useCallback((event, handler) => {
    if (!socketRef.current) {
      console.warn(`useSocket: on('${event}') called before connect()`);
      return () => {};
    }
    socketRef.current.on(event, handler);
    return () => socketRef.current?.off(event, handler); // returns cleanup fn
  }, []);

  const joinLobby = useCallback((game, mode) => {
    if (!mode) return;
    emit('room:join-lobby', { game: game || null, mode });
  }, [emit]);

  const leaveLobby = useCallback(() => {
    emit('room:leave-lobby');
  }, [emit]);

  const joinRoom = useCallback((roomId) => {
    emit('room:join', { roomId });
  }, [emit]);

  const leaveRoom = useCallback((roomId) => {
    emit('room:leave', { roomId });
  }, [emit]);

  const sendMessage = useCallback((roomId, text, attachmentIds = []) => {
    emit('chat:message', { roomId, text, attachmentIds });
  }, [emit]);

  return {
    socket: socketRef.current,
    connect,
    disconnect,
    emit,
    on,
    joinLobby,
    leaveLobby,
    joinRoom,
    leaveRoom,
    sendMessage
  };
}
