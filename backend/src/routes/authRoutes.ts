import { Router } from 'express';
import { register, login, getMe, logout, registerDriver, resetPassword, registerStore, resendVerificationEmail, verifyEmail } from '../controllers/authController';
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

router.post('/reset-password', resetPassword);


router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', authenticate, resendVerificationEmail);

export default router;