// backend/src/controllers/authController.ts

import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { generateToken } from '../config/auth';
import slugify from '../utils/slugify';
import { LoginRequest, RegisterRequest, ApiResponse, AuthRequest } from '../types';
import bcrypt from 'bcrypt';
import settingsService from '../services/settingsService';
import prisma from '../services/prisma';
import { validateRegistration, validatePassword, isValidEmail, normalizeEmail, sanitizeText } from '../utils/validation';

const getEmailVerificationRequirement = async () => {
  const requireEmailVerification = await settingsService.getBoolean('require_email_verification', false);
  const [smtpUser, smtpPassword] = await Promise.all([
    settingsService.getString('smtp_user', ''),
    settingsService.getString('smtp_password', ''),
  ]);
  const smtpConfigured = (!!smtpUser && !!smtpPassword) || (!!process.env.SMTP_USER && !!process.env.SMTP_PASSWORD);

  // «مضبوط» لا يعني «يعمل». كان الشرط `requireEmailVerification || smtpConfigured`،
  // فمجرد وجود متغيرات SMTP يفرض التفعيل — ولو كان الخادم يرفض الاعتماد.
  // النتيجة أن عطلاً في البريد يتحوّل إلى حبس كامل: كل حساب جديد ينتظر رمزاً
  // لا يصل، بلا مخرج إلا التعديل اليدوي على قاعدة البيانات.
  //
  // الآن: الفرض الضمني (لأن SMTP موجود) يشترط نجاح المصادقة فعلياً. أما إن
  // طلبه المشرف صراحةً فنحترم قراره ونفشل مغلقين، مع تحذير صريح في السجل.
  let smtpOperational = false;
  if (smtpConfigured) {
    const emailService = require('../services/emailService').default;
    await emailService.initializeTransporter();
    smtpOperational = emailService.isOperational();
  }

  if (requireEmailVerification && !smtpOperational) {
    console.error(
      '⚠️ تفعيل البريد مطلوب صراحةً في الإعدادات لكن SMTP لا يعمل — لن يتمكّن أي مستخدم جديد من إكمال التسجيل.'
    );
  }

  const shouldRequireEmailVerification = requireEmailVerification || smtpOperational;

  return {
    requireEmailVerification,
    smtpConfigured,
    shouldRequireEmailVerification
  };
};

// ==================== تسجيل مطعم جديد ====================

export const register = async (
  req: Request<{}, {}, RegisterRequest>,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const allowRegistration = await settingsService.getBoolean('allow_registration', true);
    
    if (!allowRegistration) {
      res.status(403).json({ 
        success: false,
        error: 'التسجيل مغلق حالياً. يرجى المحاولة لاحقاً' 
      });
      return;
    }

    const validation = validateRegistration(req.body);
    if (!validation.valid) {
      res.status(400).json({ success: false, error: validation.error });
      return;
    }

    const name = sanitizeText(req.body.name, 100);
    const email = normalizeEmail(req.body.email);
    const password = req.body.password as string;
    const phone = req.body.phone ? sanitizeText(req.body.phone, 20) : null;
    const restaurantName = sanitizeText(req.body.restaurantName, 100);

    const existingUser = await UserService.findByEmail(email);
    if (existingUser) {
      res.status(400).json({ 
        success: false,
        error: 'البريد الإلكتروني موجود بالفعل' 
      });
      return;
    }

    const { requireEmailVerification, smtpConfigured, shouldRequireEmailVerification } = await getEmailVerificationRequirement();

    let user;
    let token: string | null = null;

    if (restaurantName && restaurantName.trim() !== '') {
      // ملاحظة: كان المطعم يُنشأ قبل المستخدم ويشير إلى user.id غير الموجود بعد
      // ما كان يُسقط تسجيل كل مطعم جديد. الترتيب الصحيح: المستخدم أولاً.
      const baseSlug = slugify(restaurantName);
      let uniqueSlug = baseSlug;
      let counter = 1;
      while (
        (await prisma.restaurant.findUnique({ where: { slug: uniqueSlug } })) ||
        (await prisma.store.findUnique({ where: { slug: uniqueSlug } }))
      ) {
        uniqueSlug = `${baseSlug}-${counter++}`;
      }

      user = await UserService.create({
        name,
        email,
        password,
        phone: phone || null,
        role: 'owner',
      });

      const restaurant = await prisma.restaurant.create({
        data: {
          name: restaurantName,
          slug: uniqueSlug,
          subdomain: uniqueSlug,
          email: email,
          phone: phone || null,
          planId: '11111111-1111-1111-1111-111111111111',
          userId: user.id,
          isActive: true
        }
      });

      user = await UserService.update(user.id, { restaurantId: restaurant.id });
    } else {
      user = await UserService.create({
        name,
        email,
        password,
        phone: phone || null,
        role: 'user',
      });
    }

    // Generate and send verification code if email verification is required
    let verificationCode = null;
    let emailDelivered = true;
    if (shouldRequireEmailVerification) {
      const emailService = require('../services/emailService').default;
      await emailService.initializeTransporter();
      verificationCode = await emailService.generateVerificationCode(email);
      emailDelivered = await emailService.sendVerificationEmail(email, verificationCode);
      if (!emailDelivered) {
        console.error(`❌ تعذّر إرسال رمز التحقق إلى ${email} — الحساب أُنشئ لكن لا يمكن تفعيله`);
      }
    }

    if (!shouldRequireEmailVerification) {
      token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId || undefined,
        storeId: user.storeId || undefined
      });
    }

    const registerData: any = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
        storeId: user.storeId,
        isEmailVerified: user.isEmailVerified
      },
      requiresEmailVerification: shouldRequireEmailVerification,
      // تُخبر الواجهة أن الرمز لم يصل فعلاً، بدل أن تطلب من المستخدم تفقّد
      // بريد لن يأتي. حقل مضاف — لا يكسر أي مستهلك حالي.
      emailDelivered
    };
    if (!shouldRequireEmailVerification) {
      registerData.token = token;
    }

    res.status(201).json({
      success: true,
      data: registerData
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
    const allowRegistration = await settingsService.getBoolean('allow_registration', true);
    
    if (!allowRegistration) {
      res.status(403).json({ 
        success: false,
        error: 'التسجيل مغلق حالياً. يرجى المحاولة لاحقاً' 
      });
      return;
    }

    const validation = validateRegistration(req.body);
    if (!validation.valid) {
      res.status(400).json({ success: false, error: validation.error });
      return;
    }

    const name = sanitizeText(req.body.name, 100);
    const email = normalizeEmail(req.body.email);
    const password = req.body.password as string;
    const phone = req.body.phone ? sanitizeText(req.body.phone, 20) : null;
    const storeName = sanitizeText(req.body.storeName, 100);

    console.log('📝 Registering store with data:', { name, email, phone, storeName });

    const existingUser = await UserService.findByEmail(email);
    if (existingUser) {
      res.status(400).json({ 
        success: false,
        error: 'البريد الإلكتروني موجود بالفعل' 
      });
      return;
    }

    if (!storeName || storeName.trim() === '') {
      res.status(400).json({ 
        success: false,
        error: 'يرجى إدخال اسم المتجر' 
      });
      return;
    }

    const slug = slugify(storeName);
    let uniqueSlug = slug;
    let counter = 1;
    
    while (await prisma.store.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter++}`;
    }

    const { requireEmailVerification, smtpConfigured, shouldRequireEmailVerification } = await getEmailVerificationRequirement();

    // إنشاء المستخدم أولاً
    const user = await UserService.create({
      name,
      email,
      password,
      phone: phone || null,
      role: 'owner',
    });

    // إنشاء المتجر
    const store = await prisma.store.create({
      data: {
        name: storeName,
        slug: uniqueSlug,
        subdomain: uniqueSlug,
        email: email,
        phone: phone || null,
        userId: user.id,
        planId: '11111111-1111-1111-1111-111111111111',
        isActive: true
      }
    });

    // تحديث المستخدم
    const updatedUser = await UserService.update(user.id, { storeId: store.id });

    let emailDelivered = true;
    if (shouldRequireEmailVerification) {
      const emailService = require('../services/emailService').default;
      await emailService.initializeTransporter();
      const verificationCode = await emailService.generateVerificationCode(email);
      emailDelivered = await emailService.sendVerificationEmail(email, verificationCode);
      if (!emailDelivered) {
        console.error(`❌ تعذّر إرسال رمز التحقق إلى ${email} — الحساب أُنشئ لكن لا يمكن تفعيله`);
      }
    }

    let token: string | null = null;
    if (!shouldRequireEmailVerification) {
      token = generateToken({
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        restaurantId: undefined,
        storeId: store.id
      });
    }

    const registerStoreData: any = {
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        storeId: store.id,
        isEmailVerified: updatedUser.isEmailVerified
      },
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug
      },
      requiresEmailVerification: shouldRequireEmailVerification,
      // تُخبر الواجهة أن الرمز لم يصل فعلاً، بدل أن تطلب من المستخدم تفقّد
      // بريد لن يأتي. حقل مضاف — لا يكسر أي مستهلك حالي.
      emailDelivered
    };
    if (!shouldRequireEmailVerification) {
      registerStoreData.token = token;
    }

    res.status(201).json({
      success: true,
      data: registerStoreData,
      message: 'تم إنشاء المتجر بنجاح'
    });
  } catch (error) {
    console.error('❌ خطأ في تسجيل المتجر:', error);
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
    
    const maxLoginAttempts = await settingsService.getNumber('max_login_attempts', 5);

    const user = await UserService.findByEmail(email);
    
    if (!user) {
      res.status(401).json({ 
        success: false,
        error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
      });
      return;
    }

    // التحقق من عدد محاولات الدخول
    if (user.loginAttempts && user.loginAttempts >= maxLoginAttempts && user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
      res.status(401).json({ 
        success: false,
        error: `الحساب مقفل. يرجى المحاولة بعد ${remainingMinutes} دقيقة` 
      });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      await UserService.incrementLoginAttempts(user.id);
      
      res.status(401).json({ 
        success: false,
        error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
      });
      return;
    }

    await UserService.resetLoginAttempts(user.id);

    if (!user.isActive) {
      res.status(401).json({ 
        success: false,
        error: 'الحساب غير مفعل' 
      });
      return;
    }

    const { requireEmailVerification, smtpConfigured, shouldRequireEmailVerification } = await getEmailVerificationRequirement();
    if (shouldRequireEmailVerification && !user.isEmailVerified) {
      let emailSent = false;
      if (smtpConfigured) {
        const emailService = require('../services/emailService').default;
        await emailService.initializeTransporter();
        const verificationCode = await emailService.generateVerificationCode(user.email);
        emailSent = await emailService.sendVerificationEmail(user.email, verificationCode);
      } else {
        console.warn('⚠️ SMTP credentials not configured. Email sending disabled.');
      }

      res.status(401).json({ 
        success: false,
        error: 'يرجى تفعيل حسابك عبر البريد الإلكتروني أولاً',
        requiresEmailVerification: true,
        emailSent
      });
      return;
    }

    await UserService.updateLastLogin(user.id);

    // جلب المطعم أو المتجر المرتبط
    let restaurant = null;
    let store = null;
    
    if (user.restaurantId) {
      restaurant = await prisma.restaurant.findUnique({ 
        where: { id: user.restaurantId }
      });
    }
    
    if (user.storeId) {
      store = await prisma.store.findUnique({ 
        where: { id: user.storeId }
      });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId || undefined,
      storeId: user.storeId || undefined
    });

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
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

    const user = await UserService.findById(req.user.id);

    if (!user) {
      res.status(404).json({ 
        success: false,
        error: 'المستخدم غير موجود' 
      });
      return;
    }

    // ✅ استخدام القيم الصحيحة من الـ enum
    const isDeliveryDriver = user.role === 'delivery_driver';

    let additionalData = {};
    if (isDeliveryDriver) {
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

    // إزالة كلمة المرور من الاستجابة
    const { password, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        ...userWithoutPassword,
        ...additionalData
      }
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
    
    // ✅ استخدام القيم الصحيحة من الـ enum
    const isSuperAdmin = req.user?.role === 'super_admin';
    
    if (!restaurantId && !isSuperAdmin) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const existingUser = await UserService.findByEmail(email);
    if (existingUser) {
      res.status(400).json({ 
        success: false,
        error: 'البريد الإلكتروني مستخدم بالفعل' 
      });
      return;
    }

    const targetRestaurantId = isSuperAdmin 
      ? req.body.restaurantId || restaurantId
      : restaurantId;
      
    const restaurant = await prisma.restaurant.findUnique({ 
      where: { id: targetRestaurantId! }
    });
    if (!restaurant) {
      res.status(404).json({ 
        success: false,
        error: 'المطعم غير موجود' 
      });
      return;
    }

    const driver = await UserService.create({
      name,
      email,
      password,
      phone: phone || null,
      role: 'delivery_driver',
      restaurantId: targetRestaurantId,
    });

    console.log('✅ Delivery driver created:', { 
      id: driver.id, 
      email: driver.email, 
      restaurantId: driver.restaurantId 
    });

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

/**
 * POST /api/auth/forgot-password
 *
 * يرسل كود تحقق إلى البريد. يُرجع نفس الرد دائماً حتى لا يكشف
 * أي عناوين بريد مسجّلة (user enumeration).
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const genericResponse = {
    success: true,
    message: 'إذا كان البريد مسجلاً لدينا فسيصلك كود إعادة التعيين خلال دقائق'
  };

  try {
    if (!isValidEmail(req.body?.email)) {
      res.status(400).json({ success: false, error: 'البريد الإلكتروني غير صالح' });
      return;
    }

    const email = normalizeEmail(req.body.email);
    const user = await UserService.findByEmail(email);

    if (user && user.isActive !== false) {
      const emailService = require('../services/emailService').default;
      await emailService.initializeTransporter();
      const code = await emailService.generateVerificationCode(email, 15);
      await emailService.sendVerificationEmail(email, code);
    }

    res.json(genericResponse);
  } catch (error) {
    console.error('Error in forgotPassword:', error instanceof Error ? error.message : error);
    // نُرجع نفس الرد حتى في حالة الفشل حتى لا نكشف شيئاً
    res.json(genericResponse);
  }
};

/**
 * POST /api/auth/reset-password
 *
 * ⚠️ كان هذا المسار عاماً ويعيد تعيين كلمة مرور أي حساب بمجرد معرفة بريده
 * (استيلاء كامل على أي حساب بما فيها حسابات الإدارة). صار يتطلب الآن
 * كود تحقق مُرسلاً إلى البريد نفسه.
 */
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email: rawEmail, code, newPassword } = req.body || {};

    if (!isValidEmail(rawEmail)) {
      res.status(400).json({ success: false, error: 'البريد الإلكتروني غير صالح' });
      return;
    }

    if (!code || typeof code !== 'string') {
      res.status(400).json({ success: false, error: 'كود التحقق مطلوب' });
      return;
    }

    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.valid) {
      res.status(400).json({ success: false, error: passwordCheck.error });
      return;
    }

    const email = normalizeEmail(rawEmail);

    const emailService = require('../services/emailService').default;
    const codeValid = await emailService.verifyCode(email, code.trim());

    if (!codeValid) {
      res.status(400).json({ success: false, error: 'كود التحقق غير صحيح أو منتهي الصلاحية' });
      return;
    }

    const user = await UserService.findByEmail(email);
    if (!user) {
      // الكود صحيح لكن لا يوجد مستخدم — لا نكشف شيئاً
      res.status(400).json({ success: false, error: 'كود التحقق غير صحيح أو منتهي الصلاحية' });
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await UserService.update(user.id, { password: hashedPassword });
    await UserService.resetLoginAttempts(user.id);

    res.json({
      success: true,
      message: 'تم إعادة تعيين كلمة المرور بنجاح'
    });
  } catch (error) {
    console.error('Error resetting password:', error instanceof Error ? error.message : error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إعادة تعيين كلمة المرور' });
  }
};

// ==================== التحقق من البريد الإلكتروني ====================

export const verifyEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({
        success: false,
        error: 'البريد الإلكتروني والكود مطلوبان'
      });
      return;
    }

    console.log('🔎 Email verification attempt:', { email });
    const emailService = require('../services/emailService').default;
    const verified = await emailService.verifyCode(email, code);

    if (!verified) {
      res.status(400).json({
        success: false,
        error: 'الكود غير صحيح أو انتهت صلاحيته'
      });
      return;
    }

    // Mark user email as verified
    const user = await UserService.findByEmail(email);
    if (user) {
      await UserService.update(user.id, { isEmailVerified: true });
    }
    console.log('✅ Email verified:', { email });

    res.json({
      success: true,
      message: 'تم تفعيل البريد الإلكتروني بنجاح'
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تفعيل البريد' });
  }
};

// ==================== إعادة إرسال كود التحقق ====================

export const resendVerificationEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: 'البريد الإلكتروني مطلوب'
      });
      return;
    }

    console.log('🔁 Resend verification requested:', { email });
    const user = await UserService.findByEmail(email);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود'
      });
      return;
    }

    if (user.isEmailVerified) {
      res.status(400).json({
        success: false,
        error: 'البريد الإلكتروني مفعل بالفعل'
      });
      return;
    }

    const emailService = require('../services/emailService').default;
    const code = await emailService.resendVerificationCode(email);

    if (!code) {
      res.status(500).json({
        success: false,
        error: 'فشل في إرسال البريد الإلكتروني'
      });
      return;
    }

    console.log(`📧 Verification code resent to: ${email}`);

    res.json({
      success: true,
      message: 'تم إرسال كود التحقق إلى بريدك الإلكتروني'
    });
  } catch (error) {
    console.error('Error resending verification email:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إعادة إرسال التحقق' });
  }
};

// ==================== Firebase Sign-In ====================

export const firebaseSignIn = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      res.status(400).json({
        success: false,
        error: 'Firebase ID token مطلوب'
      });
      return;
    }

    const firebaseService = require('../services/firebaseService').default;
    const decodedToken = await firebaseService.verifyIdToken(idToken);

    if (!decodedToken) {
      res.status(401).json({
        success: false,
        error: 'Invalid Firebase token'
      });
      return;
    }

    const { uid, email, name, picture } = decodedToken;

    // Check if user exists with this email
    let user = await UserService.findByEmail(email!);

    if (!user) {
      // Create new user from Firebase data
      user = await UserService.create({
        name: name || 'User',
        email: email!,
        password: `firebase_${uid}`, // placeholder password
        phone: null,
        role: 'user',
      });

      console.log('✅ New user created from Firebase:', user.id);
    }

    // Create or update Firebase user link
    const firebaseUser = await prisma.firebaseUser.upsert({
      where: { userId: user.id },
      update: {
        firebaseUid: uid,
        displayName: name,
        photoUrl: picture,
      },
      create: {
        userId: user.id,
        firebaseUid: uid,
        displayName: name,
        photoUrl: picture,
        authProvider: 'google',
      },
    });

    // Mark email as verified (Firebase has already verified it)
    if (!user.isEmailVerified) {
      await UserService.update(user.id, { isEmailVerified: true });
      user.isEmailVerified = true;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId || undefined,
      storeId: user.storeId || undefined
    });

    await UserService.updateLastLogin(user.id);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          restaurantId: user.restaurantId,
          storeId: user.storeId,
          isEmailVerified: user.isEmailVerified,
          photoUrl: picture
        }
      }
    });
  } catch (error) {
    console.error('Error in Firebase sign-in:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في تسجيل الدخول عبر Firebase'
    });
  }
};

// ==================== Link Firebase Account ====================

export const linkFirebaseAccount = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: 'غير مصرح'
      });
      return;
    }

    const { idToken } = req.body;

    if (!idToken) {
      res.status(400).json({
        success: false,
        error: 'Firebase ID token مطلوب'
      });
      return;
    }

    const firebaseService = require('../services/firebaseService').default;
    const decodedToken = await firebaseService.verifyIdToken(idToken);

    if (!decodedToken) {
      res.status(401).json({
        success: false,
        error: 'Invalid Firebase token'
      });
      return;
    }

    const { uid, name, picture } = decodedToken;
    const user = await UserService.findById(req.user.id);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود'
      });
      return;
    }

    // Link Firebase account
    await prisma.firebaseUser.upsert({
      where: { userId: user.id },
      update: {
        firebaseUid: uid,
        displayName: name,
        photoUrl: picture,
      },
      create: {
        userId: user.id,
        firebaseUid: uid,
        displayName: name,
        photoUrl: picture,
        authProvider: 'google',
      },
    });

    console.log(`✅ Firebase account linked for user: ${user.id}`);

    res.json({
      success: true,
      message: 'تم ربط حساب Firebase بنجاح',
      data: {
        firebaseUid: uid,
        displayName: name,
        photoUrl: picture
      }
    });
  } catch (error) {
    console.error('Error linking Firebase account:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في ربط حساب Firebase'
    });
  }
};
