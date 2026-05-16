// backend/src/controllers/authController.ts

import { Request, Response } from 'express';
import User from '../models/User';
import Restaurant from '../models/Restaurant';
import { generateToken } from '../config/auth';
import slugify from '../utils/slugify';
import { LoginRequest, RegisterRequest, ApiResponse, AuthRequest } from '../types';
import bcrypt from 'bcrypt';
import { Store } from '../models';
import settingsService from '../services/settingsService';

// ==================== تسجيل مطعم جديد ====================

export const register = async (
  req: Request<{}, {}, RegisterRequest>,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    // ✅ التحقق من تفعيل التسجيل من الإعدادات
    const allowRegistration = await settingsService.getBoolean('allow_registration', true);
    
    if (!allowRegistration) {
      res.status(403).json({ 
        success: false,
        error: 'التسجيل مغلق حالياً. يرجى المحاولة لاحقاً' 
      });
      return;
    }

    const { name, email, password, phone, restaurantName } = req.body;

    // التحقق من البريد الإلكتروني
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ 
        success: false,
        error: 'البريد الإلكتروني موجود بالفعل' 
      });
      return;
    }

    // ✅ التحقق من تفعيل التحقق من البريد الإلكتروني
    const requireEmailVerification = await settingsService.getBoolean('require_email_verification', false);

    let user;
    let token;

    if (restaurantName && restaurantName.trim() !== '') {
      const slug = slugify(restaurantName);

      const restaurant = await Restaurant.create({
        name: restaurantName,
        slug: slug,
        subdomain: slug,
        email: email,
        phone: phone,
        planId: '11111111-1111-1111-1111-111111111111'
      } as any);

      user = await User.create({
        name,
        email,
        password,
        phone,
        role: 'owner',
        restaurantId: restaurant.id,
        isEmailVerified: !requireEmailVerification,
        loginAttempts: 0,
        lockedUntil: null
      } as any);
    } else {
      user = await User.create({
        name,
        email,
        password,
        phone,
        role: 'user',
        restaurantId: null,
        isEmailVerified: !requireEmailVerification,
        loginAttempts: 0,
        lockedUntil: null
      } as any);
    }

    console.log('✅ User created with role:', user.role);
    console.log('📧 Email verified:', user.isEmailVerified);

    token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId
    });

    // ✅ إذا كان التحقق من البريد مطلوباً، أرسل إيميل للتحقق (يمكن تفعيله لاحقاً)
    if (requireEmailVerification && !user.isEmailVerified) {
      console.log(`📧 Verification email would be sent to: ${email}`);
      // TODO: إرسال إيميل التحقق
    }

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          restaurantId: user.restaurantId,
          isEmailVerified: user.isEmailVerified
        }
      }
    });
  } catch (error) {
    console.error('❌ خطأ في التسجيل:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في إنشاء الحساب' 
    });
  }
};

// ==================== تسجيل متجر جديد ====================

export const registerStore = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // ✅ التحقق من تفعيل التسجيل من الإعدادات
    const allowRegistration = await settingsService.getBoolean('allow_registration', true);
    
    if (!allowRegistration) {
      res.status(403).json({ 
        success: false,
        error: 'التسجيل مغلق حالياً. يرجى المحاولة لاحقاً' 
      });
      return;
    }

    const { name, email, password, phone, storeName } = req.body;

    console.log('📝 Registering store with data:', { name, email, phone, storeName });

    // 1. التحقق من وجود المستخدم
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ 
        success: false,
        error: 'البريد الإلكتروني موجود بالفعل' 
      });
      return;
    }

    // 2. التحقق من اسم المتجر
    if (!storeName || storeName.trim() === '') {
      res.status(400).json({ 
        success: false,
        error: 'يرجى إدخال اسم المتجر' 
      });
      return;
    }

    // 3. إنشاء slug فريد للمتجر
    const slug = slugify(storeName);
    let uniqueSlug = slug;
    let counter = 1;
    
    while (await Store.findOne({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter++}`;
    }

    console.log('✅ Unique slug generated:', uniqueSlug);

    // ✅ التحقق من تفعيل التحقق من البريد الإلكتروني
    const requireEmailVerification = await settingsService.getBoolean('require_email_verification', false);

    // 4. إنشاء المستخدم أولاً (بدون ربط المتجر)
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: 'owner',
      storeId: null,
      isEmailVerified: !requireEmailVerification,
      loginAttempts: 0,
      lockedUntil: null
    } as any);

    console.log('✅ User created:', { userId: user.id });

    // 5. إنشاء المتجر مع ربط userId مباشرة
    const store = await Store.create({
      name: storeName,
      slug: uniqueSlug,
      subdomain: uniqueSlug,
      email: email,
      phone: phone,
      userId: user.id,
      planId: '11111111-1111-1111-1111-111111111111',
      isActive: true
    } as any);

    console.log('✅ Store created:', { storeId: store.id, userId: store.userId });

    // 6. تحديث المستخدم بمعرف المتجر
    await user.update({ storeId: store.id });

    console.log('✅ User updated with storeId:', { userId: user.id, storeId: store.id });

    // 7. إنشاء التوكن مع storeId
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      restaurantId: undefined,
      storeId: store.id
    });

    // 8. إرسال الرد
    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          storeId: store.id,
          isEmailVerified: user.isEmailVerified
        },
        store: {
          id: store.id,
          name: store.name,
          slug: store.slug
        }
      },
      message: 'تم إنشاء المتجر بنجاح'
    });
  } catch (error) {
    console.error('❌ خطأ في تسجيل المتجر:', error);
    
    const err = error as { name?: string; errors?: Array<{ message?: string }> };

    if (err.name === 'SequelizeValidationError') {
      const messages = (err.errors ?? []).map((e) => e.message ?? 'خطأ غير معروف');
      res.status(400).json({ 
        success: false,
        error: `بيانات غير صحيحة: ${messages.join(', ')}` 
      });
      return;
    }
    
    if (err.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ 
        success: false,
        error: 'البريد الإلكتروني أو اسم المتجر مستخدم بالفعل' 
      });
      return;
    }
    
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في إنشاء المتجر' 
    });
  }
};

// ==================== تسجيل الدخول ====================

export const login = async (
  req: Request<{}, {}, LoginRequest>,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    // ✅ جلب الحد الأقصى لمحاولات الدخول
    const maxLoginAttempts = await settingsService.getNumber('max_login_attempts', 5);
    const sessionTimeout = await settingsService.getNumber('session_timeout_minutes', 720);

    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      res.status(401).json({ 
        success: false,
        error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
      });
      return;
    }

    // ✅ التحقق من عدد محاولات الدخول
    if (user.loginAttempts >= maxLoginAttempts && user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      res.status(401).json({ 
        success: false,
        error: `الحساب مقفل. يرجى المحاولة بعد ${remainingMinutes} دقيقة` 
      });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      // ✅ زيادة عدد المحاولات
      await user.increment('loginAttempts');
      
      // ✅ قفل الحساب إذا تجاوز الحد الأقصى
      if (user.loginAttempts + 1 >= maxLoginAttempts) {
        const lockDuration = 15 * 60 * 1000; // 15 دقيقة
        await user.update({ lockedUntil: new Date(Date.now() + lockDuration) });
      }
      
      res.status(401).json({ 
        success: false,
        error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
      });
      return;
    }

    // ✅ إعادة تعيين محاولات الدخول
    await user.update({ loginAttempts: 0, lockedUntil: null });

    if (!user.isActive) {
      res.status(401).json({ 
        success: false,
        error: 'الحساب غير مفعل' 
      });
      return;
    }

    // ✅ التحقق من التحقق من البريد الإلكتروني
    const requireEmailVerification = await settingsService.getBoolean('require_email_verification', false);
    if (requireEmailVerification && !user.isEmailVerified) {
      res.status(401).json({ 
        success: false,
        error: 'يرجى تفعيل حسابك عبر البريد الإلكتروني أولاً' 
      });
      return;
    }

    await user.update({ lastLogin: new Date() });

    // جلب المطعم أو المتجر المرتبط
    let restaurant = null;
    let store = null;
    
    if (user.restaurantId) {
      restaurant = await Restaurant.findByPk(user.restaurantId);
    }
    
    if (user.storeId) {
      store = await Store.findByPk(user.storeId);
    }

    const userRole = user.role || 'user';

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: userRole,
      restaurantId: user.restaurantId,
      storeId: user.storeId
    });

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: userRole,
      restaurantId: user.restaurantId,
      storeId: user.storeId,
      phone: user.phone,
      isOnline: user.isOnline,
      isEmailVerified: user.isEmailVerified,
      restaurant: restaurant,
      store: store
    };

    res.json({
      success: true,
      data: {
        token,
        user: userResponse
      }
    });
  } catch (error) {
    console.error('❌ خطأ في تسجيل الدخول:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في تسجيل الدخول' 
    });
  }
};

// ==================== جلب بيانات المستخدم الحالي ====================

export const getMe = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ 
        success: false,
        error: 'غير مصرح' 
      });
      return;
    }

    const user = await User.findByPk(req.user.id, {
      include: [{ model: Restaurant, as: 'restaurant' }],
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      res.status(404).json({ 
        success: false,
        error: 'المستخدم غير موجود' 
      });
      return;
    }

    console.log('🔍 getMe user from DB:', { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      isEmailVerified: user.isEmailVerified
    });

    if (!user.role) {
      console.log('⚠️ Role is empty, setting to "user"');
      user.role = 'user';
      await user.save();
    }

    let additionalData = {};
    if (user.role === 'delivery_driver') {
      additionalData = {
        isDriver: true,
        isOnline: user.isOnline,
        lastLocation: user.lastLocationLat && user.lastLocationLng ? {
          lat: user.lastLocationLat,
          lng: user.lastLocationLng,
          lastUpdate: user.lastLocationUpdate
        } : null
      };
    }

    const userResponse = {
      ...user.toJSON(),
      ...additionalData
    };

    res.json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('خطأ في جلب بيانات المستخدم:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب البيانات' 
    });
  }
};

// ==================== تسجيل الخروج ====================

export const logout = (
  req: Request,
  res: Response<ApiResponse>
): void => {
  res.json({ 
    success: true, 
    message: 'تم تسجيل الخروج بنجاح' 
  });
};

// ==================== تسجيل مندوب توصيل ====================

export const registerDriver = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;
    
    console.log('📝 Registering driver with data:', { name, email, phone });
    
    const restaurantId = req.user?.restaurantId;
    
    if (!restaurantId && req.user?.role !== 'super_admin') {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ 
        success: false,
        error: 'البريد الإلكتروني مستخدم بالفعل' 
      });
      return;
    }

    const targetRestaurantId = req.user?.role === 'super_admin' 
      ? req.body.restaurantId || restaurantId
      : restaurantId;
      
    const restaurant = await Restaurant.findByPk(targetRestaurantId);
    if (!restaurant) {
      res.status(404).json({ 
        success: false,
        error: 'المطعم غير موجود' 
      });
      return;
    }

    const driver = await User.create({
      name,
      email,
      password,
      phone: phone || '',
      role: 'delivery_driver',
      restaurantId: targetRestaurantId,
      isActive: true,
      isOnline: false,
      isEmailVerified: true,
      loginAttempts: 0,
      lockedUntil: null
    } as any);

    console.log('✅ Delivery driver created:', { 
      id: driver.id, 
      email: driver.email, 
      restaurantId: driver.restaurantId 
    });
    
    const verifyPassword = await bcrypt.compare(password, driver.password);
    console.log('🔐 Password verification after creation:', verifyPassword ? '✅ SUCCESS' : '❌ FAILED');

    const driverResponse = {
      id: driver.id,
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      role: driver.role,
      restaurantId: driver.restaurantId,
      isActive: driver.isActive,
      isOnline: driver.isOnline,
      isEmailVerified: driver.isEmailVerified,
      createdAt: driver.createdAt,
      updatedAt: driver.updatedAt
    };

    res.status(201).json({
      success: true,
      message: 'تم إنشاء حساب مندوب التوصيل بنجاح',
      data: driverResponse
    });
  } catch (error) {
    console.error('Error registering driver:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في إنشاء حساب مندوب التوصيل' 
    });
  }
};

// ==================== إعادة تعيين كلمة المرور ====================

export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, newPassword } = req.body;
    
    console.log('🔐 Resetting password for:', email);
    
    const user = await User.findOne({ where: { email } });
    if (!user) {
      res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
      return;
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    await user.update({ 
      password: hashedPassword,
      loginAttempts: 0,
      lockedUntil: null
    });
    
    const testCompare = await bcrypt.compare(newPassword, hashedPassword);
    console.log('🔐 Password reset verification:', testCompare ? '✅ SUCCESS' : '❌ FAILED');
    
    res.json({ 
      success: true, 
      message: 'تم إعادة تعيين كلمة المرور بنجاح',
      verification: testCompare
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إعادة تعيين كلمة المرور' });
  }
};

// ==================== التحقق من البريد الإلكتروني ====================

export const verifyEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token } = req.params;
    
    // TODO: تنفيذ منطق التحقق من البريد الإلكتروني
    // يمكن تخزين token مؤقت في قاعدة البيانات أو Redis
    
    res.json({
      success: true,
      message: 'تم تفعيل البريد الإلكتروني بنجاح'
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تفعيل البريد' });
  }
};

// ==================== إعادة إرسال رابط التحقق ====================

export const resendVerificationEmail = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }
    
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
      return;
    }
    
    if (user.isEmailVerified) {
      res.status(400).json({ success: false, error: 'البريد الإلكتروني مفعل بالفعل' });
      return;
    }
    
    // TODO: إرسال إيميل تحقق جديد
    console.log(`📧 Resending verification email to: ${user.email}`);
    
    res.json({
      success: true,
      message: 'تم إرسال رابط التحقق إلى بريدك الإلكتروني'
    });
  } catch (error) {
    console.error('Error resending verification email:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إعادة إرسال التحقق' });
  }
};