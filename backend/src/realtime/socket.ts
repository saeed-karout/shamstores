import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../config/auth';
import { UserPayload } from '../types';

const SOCKET_EVENTS = {
  notification: 'notification:new',
  orderUpdated: 'order:updated',
  dataChanged: 'data:changed'
} as const;

type RealtimeSocket = Socket & { data: { user?: UserPayload } };

export interface RealtimeOrderPayload {
  id: string;
  orderNumber: string;
  status: string;
  isPaid: boolean;
  total: number;
  orderType: string;
  restaurantId?: string | null;
  storeId?: string | null;
  createdBy?: string | null;
  assignedDriverId?: string | null;
}

export interface OrderRealtimeEventParams {
  event: string;
  title: string;
  message: string;
  order: RealtimeOrderPayload;
  actorId?: string | null;
  extraData?: Record<string, unknown>;
}

export interface RealtimeScope {
  restaurantId?: string | null;
  storeId?: string | null;
  userId?: string | null;
  createdBy?: string | null;
  driverId?: string | null;
  assignedDriverId?: string | null;
  orderId?: string | null;
}

export type RealtimeEntityAction = 'created' | 'updated' | 'deleted';

export interface RealtimeEntityEventParams {
  entity: string;
  entityId: string;
  action: RealtimeEntityAction;
  scope: RealtimeScope;
  actorId?: string | null;
  changedFields?: string[];
  extraData?: Record<string, unknown>;
}

let io: Server | null = null;

export const getRestaurantRoom = (restaurantId: string): string => `restaurant:${restaurantId}`;
export const getStoreRoom = (storeId: string): string => `store:${storeId}`;
export const getUserRoom = (userId: string): string => `user:${userId}`;
export const getDriverRoom = (driverId: string): string => `driver:${driverId}`;
export const getOrderRoom = (orderId: string): string => `order:${orderId}`;

const extractToken = (socket: Socket): string | null => {
  const authToken = typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : undefined;
  const headerToken = typeof socket.handshake.headers?.authorization === 'string'
    ? socket.handshake.headers.authorization
    : undefined;
  const queryToken = typeof socket.handshake.query?.token === 'string'
    ? socket.handshake.query.token
    : undefined;

  const rawToken = authToken || headerToken || queryToken;
  if (!rawToken) return null;

  return rawToken.startsWith('Bearer ') ? rawToken.replace('Bearer ', '') : rawToken;
};

const getSocketCorsOrigin = (): string | string[] => {
  const allowedOrigins = process.env.SOCKET_CORS_ORIGIN || process.env.CLIENT_URL;

  if (!allowedOrigins) {
    return '*';
  }

  const normalized = allowedOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    return '*';
  }

  return normalized.length === 1 ? normalized[0] : normalized;
};

const addRoomIfValid = (
  rooms: Set<string>,
  identifier: string | null | undefined,
  getRoom: (id: string) => string
): void => {
  if (typeof identifier !== 'string') {
    return;
  }

  const trimmed = identifier.trim();
  if (!trimmed) {
    return;
  }

  rooms.add(getRoom(trimmed));
};

const collectScopedRooms = (scope: RealtimeScope): string[] => {
  const rooms = new Set<string>();

  addRoomIfValid(rooms, scope.restaurantId, getRestaurantRoom);
  addRoomIfValid(rooms, scope.storeId, getStoreRoom);
  addRoomIfValid(rooms, scope.userId, getUserRoom);
  addRoomIfValid(rooms, scope.createdBy, getUserRoom);
  addRoomIfValid(rooms, scope.driverId, getDriverRoom);
  addRoomIfValid(rooms, scope.assignedDriverId, getDriverRoom);
  addRoomIfValid(rooms, scope.orderId, getOrderRoom);

  return Array.from(rooms);
};

const collectTargetRooms = (order: RealtimeOrderPayload): string[] => {
  return collectScopedRooms({
    restaurantId: order.restaurantId,
    storeId: order.storeId,
    createdBy: order.createdBy,
    assignedDriverId: order.assignedDriverId,
    orderId: order.id
  });
};

const safeAcknowledge = (
  acknowledge: ((response: { success: boolean; message?: string; error?: string }) => void) | undefined,
  response: { success: boolean; message?: string; error?: string }
): void => {
  if (typeof acknowledge === 'function') {
    acknowledge(response);
  }
};

const bindConnectionHandlers = (socket: RealtimeSocket): void => {
  const user = socket.data.user;
  if (!user) {
    socket.disconnect(true);
    return;
  }

  socket.join(getUserRoom(user.id));

  if (user.restaurantId) {
    socket.join(getRestaurantRoom(user.restaurantId));
  }

  if (user.storeId) {
    socket.join(getStoreRoom(user.storeId));
  }

  if (user.role === 'delivery_driver') {
    socket.join(getDriverRoom(user.id));
  }

  socket.on('subscribe:order', (orderId: unknown, acknowledge?: (response: { success: boolean; message?: string; error?: string }) => void) => {
    if (typeof orderId !== 'string' || orderId.trim().length === 0) {
      safeAcknowledge(acknowledge, { success: false, error: 'معرف الطلب غير صالح' });
      return;
    }

    socket.join(getOrderRoom(orderId));
    safeAcknowledge(acknowledge, { success: true, message: 'تم الاشتراك في الطلب' });
  });

  socket.on('unsubscribe:order', (orderId: unknown, acknowledge?: (response: { success: boolean; message?: string; error?: string }) => void) => {
    if (typeof orderId !== 'string' || orderId.trim().length === 0) {
      safeAcknowledge(acknowledge, { success: false, error: 'معرف الطلب غير صالح' });
      return;
    }

    socket.leave(getOrderRoom(orderId));
    safeAcknowledge(acknowledge, { success: true, message: 'تم إلغاء الاشتراك من الطلب' });
  });
};

export const initializeSocket = (httpServer: HttpServer): Server => {
  if (io) {
    return io;
  }

  const corsOrigin = getSocketCorsOrigin();

  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST', 'PATCH'],
      credentials: corsOrigin !== '*'
    }
  });

  io.use((socket, next) => {
    const token = extractToken(socket);
    if (!token) {
      next(new Error('Unauthorized'));
      return;
    }

    const user = verifyToken(token);
    if (!user) {
      next(new Error('Unauthorized'));
      return;
    }

    (socket as RealtimeSocket).data.user = user;
    next();
  });

  io.on('connection', (socket) => {
    bindConnectionHandlers(socket as RealtimeSocket);
  });

  return io;
};

export const emitOrderRealtimeEvent = (params: OrderRealtimeEventParams): void => {
  if (!io) {
    return;
  }

  const timestamp = new Date().toISOString();
  const targetRooms = collectTargetRooms(params.order);

  if (targetRooms.length === 0) {
    return;
  }

  const orderEventPayload = {
    event: params.event,
    order: params.order,
    actorId: params.actorId || null,
    timestamp,
    ...params.extraData
  };

  io.to(targetRooms).emit(SOCKET_EVENTS.orderUpdated, orderEventPayload);
  io.to(targetRooms).emit(SOCKET_EVENTS.notification, {
    type: 'order',
    event: params.event,
    title: params.title,
    message: params.message,
    orderId: params.order.id,
    orderNumber: params.order.orderNumber,
    status: params.order.status,
    timestamp,
    ...params.extraData
  });
};

export const emitEntityRealtimeEvent = (params: RealtimeEntityEventParams): void => {
  if (!io) {
    return;
  }

  const targetRooms = collectScopedRooms(params.scope);
  if (targetRooms.length === 0) {
    return;
  }

  const timestamp = new Date().toISOString();
  io.to(targetRooms).emit(SOCKET_EVENTS.dataChanged, {
    event: `${params.entity}.${params.action}`,
    entity: params.entity,
    entityId: params.entityId,
    action: params.action,
    scope: params.scope,
    actorId: params.actorId || null,
    changedFields: params.changedFields || [],
    timestamp,
    ...params.extraData
  });
};

