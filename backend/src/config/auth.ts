import jwt from 'jsonwebtoken';
import { UserPayload } from '../types';
import env from './env';

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  restaurantId?: string | null;
  storeId?: string | null;
}

export const generateToken = (payload: UserPayload): string => {
  // التأكد من أن role له قيمة (fallback للمستخدمين القدامى)
  const safePayload = {
    ...payload,
    role: payload.role || 'user'
  };

  const options: jwt.SignOptions = {
    expiresIn: env.JWT_EXPIRE as jwt.SignOptions['expiresIn'],
    issuer: 'shamstores'
  };
  return jwt.sign(safePayload, env.JWT_SECRET, options);
};

export const verifyToken = (token: string): UserPayload | null => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as UserPayload;

    if (!decoded.role) {
      decoded.role = 'user';
    }

    return decoded;
  } catch {
    // لا نسجّل التوكن ولا تفاصيل الخطأ — قد تسرّب بيانات حساسة في السجلات
    return null;
  }
};
