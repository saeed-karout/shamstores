// backend/src/services/user.service.ts

import prisma from './prisma';
import { getLoginPolicy } from './securityPolicy.service';
import bcrypt from 'bcrypt';

export type UserRoleType = 'super_admin' | 'owner' | 'staff' | 'user' | 'delivery_driver';

export class UserService {
  static async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email }
    });
  }

  static async findById(id: string) {
    return prisma.user.findUnique({
      where: { id }
    });
  }

  static async create(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role: UserRoleType;
    restaurantId?: string;
    storeId?: string;
  }) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    return prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        isEmailVerified: false,
        loginAttempts: 0,
      }
    });
  }

  static async update(id: string, data: any) {
    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(data.password, salt);
    }

    return prisma.user.update({
      where: { id },
      data,
    });
  }

  static async comparePassword(userId: string, candidatePassword: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;
    return bcrypt.compare(candidatePassword, user.password);
  }

  static async updateDriverRating(userId: string, newRating: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const currentTotal = (user.driverRating || 0) * (user.driverRatingCount || 0);
    const newCount = (user.driverRatingCount || 0) + 1;
    const newAverage = (currentTotal + newRating) / newCount;

    return prisma.user.update({
      where: { id: userId },
      data: {
        driverRating: Math.round(newAverage * 10) / 10,
        driverRatingCount: newCount,
      }
    });
  }

  static async updateFcmToken(userId: string, token: string | null) {
    return prisma.user.update({
      where: { id: userId },
      data: { fcmToken: token }
    });
  }

  static async updateLastLogin(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() }
    });
  }

  static async updateLocation(userId: string, lat: number, lng: number) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        lastLocationLat: lat,
        lastLocationLng: lng,
        lastLocationUpdate: new Date(),
      }
    });
  }

  static async setOnlineStatus(userId: string, isOnline: boolean) {
    return prisma.user.update({
      where: { id: userId },
      data: { isOnline }
    });
  }

  /**
   * يزيد عدّاد المحاولات ويقفل الحساب عند بلوغ الحدّ.
   *
   * العتبة والمدّة تأتيان من سياسة الأمان لا من أرقام مكتوبة هنا: كانت
   * `>= 4` و15 دقيقة ثابتتين بينما الفحص عند الدخول يقرأ إعداد المشرف،
   * فرفع الحدّ فوق خمسة كان يُعطّل القفل كلياً.
   */
  static async incrementLoginAttempts(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const { maxAttempts, lockoutMinutes } = await getLoginPolicy();
    const attempts = (user.loginAttempts || 0) + 1;

    return prisma.user.update({
      where: { id: userId },
      data: {
        loginAttempts: attempts,
        lockedUntil:
          attempts >= maxAttempts ? new Date(Date.now() + lockoutMinutes * 60 * 1000) : undefined
      }
    });
  }

  static async resetLoginAttempts(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        loginAttempts: 0,
        lockedUntil: null
      }
    });
  }

  static async delete(id: string) {
    return prisma.user.delete({ where: { id } });
  }

  static async findMany(filter?: any) {
    return prisma.user.findMany({
      where: filter,
    });
  }
}

export default UserService;