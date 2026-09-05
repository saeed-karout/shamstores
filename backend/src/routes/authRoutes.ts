import { Router } from 'express';
import { register, login, getMe, updateMyProfile, logout, registerDriver, resetPassword, forgotPassword, registerStore, resendVerificationEmail, verifyEmail, firebaseSignIn, linkFirebaseAccount } from '../controllers/authController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    تسجيل حساب جديد (مستخدم عادي أو مالك مطعم)
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    تسجيل الدخول (لجميع أنواع المستخدمين)
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   GET /api/auth/me
 * @desc    الحصول على بيانات المستخدم الحالي
 * @access  Private
 */
router.get('/me', authenticate, getMe);

/**
 * @route   PATCH /api/auth/profile
 * @desc    تعديل الاسم والهاتف وصورة الحساب — لا البريد ولا الدور
 */
router.patch('/profile', authenticate, updateMyProfile);

/**
 * @route   POST /api/auth/logout
 * @desc    تسجيل الخروج
 * @access  Private
 */
router.post('/logout', authenticate, logout);

/**
 * @route   POST /api/auth/register-driver
 * @desc    تسجيل مندوب توصيل جديد (للمالك أو السوبر أدمن فقط)
 * @access  Private (Owner/Super Admin only)
 */
router.post('/register-driver', authenticate, authorize(['owner', 'super_admin']), registerDriver);

router.post('/register-store', registerStore);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    طلب كود إعادة تعيين كلمة المرور
 * @access  Public
 */
router.post('/forgot-password', forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    إعادة تعيين كلمة المرور بكود التحقق
 * @access  Public
 */
router.post('/reset-password', resetPassword);

/**
 * @route   POST /api/auth/verify-email
 * @desc    التحقق من البريد الإلكتروني باستخدام الكود
 * @access  Public
 */
router.post('/verify-email', verifyEmail);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    إعادة إرسال كود التحقق
 * @access  Public
 */
router.post('/resend-verification', resendVerificationEmail);

/**
 * @route   POST /api/auth/firebase-signin
 * @desc    تسجيل الدخول عبر Google Firebase
 * @access  Public
 */
router.post('/firebase-signin', firebaseSignIn);

/**
 * @route   POST /api/auth/link-firebase
 * @desc    ربط حساب Firebase بحساب موجود
 * @access  Private
 */
router.post('/link-firebase', authenticate, linkFirebaseAccount);

export default router;