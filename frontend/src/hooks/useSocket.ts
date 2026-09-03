// src/hooks/useSocket.ts
// اتصال Socket.IO مع السيرفر لاستقبال الإشعارات والتحديثات الفورية

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// نفس الأصل في الإنتاج (النشر بتطبيق واحد)، خادم محلي في التطوير
const resolveSocketUrl = (): string => {
  const configured = import.meta.env.VITE_BASE_URL as string | undefined;
  if (configured && configured.trim()) return configured.trim().replace(/\/+$/, '');

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost');
    if (isLocal) return 'http://localhost:5000';
    return window.location.origin;
  }

  return '';
};

const SOCKET_URL = resolveSocketUrl();

export interface OrderRealtimeEvent {
  event: string;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    isPaid: boolean;
    total: number;
    orderType: string;
    restaurantId?: string | null;
    storeId?: string | null;
  };
  timestamp: string;
}

export interface NotificationEvent {
  type: string;
  event: string;
  title: string;
  message: string;
  orderId: string;
  orderNumber: string;
  status: string;
  timestamp: string;
}

export interface DataChangedEvent {
  event: string;
  entity: string;
  entityId: string;
  action: 'created' | 'updated' | 'deleted';
  timestamp: string;
}

interface UseSocketOptions {
  token: string | null;
  onOrderUpdated?: (data: OrderRealtimeEvent) => void;
  onNotification?: (data: NotificationEvent) => void;
  onDataChanged?: (data: DataChangedEvent) => void;
  enabled?: boolean;
}

export const useSocket = ({
  token,
  onOrderUpdated,
  onNotification,
  onDataChanged,
  enabled = true,
}: UseSocketOptions) => {
  const socketRef = useRef<Socket | null>(null);

  const subscribeToOrder = useCallback((orderId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe:order', orderId);
    }
  }, []);

  const unsubscribeFromOrder = useCallback((orderId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe:order', orderId);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('🔌 Socket connection error:', err.message);
    });

    if (onOrderUpdated) {
      socket.on('order:updated', onOrderUpdated);
    }

    if (onNotification) {
      socket.on('notification:new', onNotification);
    }

    if (onDataChanged) {
      socket.on('data:changed', onDataChanged);
    }

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, enabled]);

  return { subscribeToOrder, unsubscribeFromOrder, socket: socketRef };
};
