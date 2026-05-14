import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { UserPayload } from '../types';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '30d';

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
    role: payload.role || 'user' // إذا كان role فارغاً، استخدم 'user'
  };
  
  console.log('🎫 Generating token with payload:', safePayload);

  const options: jwt.SignOptions = { 
    expiresIn: JWT_EXPIRE as jwt.SignOptions['expiresIn'] 
  };
  return jwt.sign(safePayload, JWT_SECRET, options);
};

export const verifyToken = (token: string): UserPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    
    // التأكد من أن role موجود في التوكن المفكوك
    if (!decoded.role) {
      console.warn('⚠️ Token has no role, adding default');
      decoded.role = 'user';
    }
    
    return decoded;
  } catch (error) {
    console.error('❌ Token verification failed:', error);
    return null;
  }
};