// frontend/src/pages/auth/Register.tsx — تسجيل تاجرٍ جديد (مطعم أو متجر)

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  IoRestaurantOutline,
  IoStorefrontOutline,
  IoMailOutline,
  IoLockClosedOutline,
  IoPersonOutline,
  IoCallOutline,
  IoCheckmarkCircle,
  IoRocketOutline
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useSettingsContext } from '../../hooks/SettingsContext';
import apiClient from '../../services/api/client';
import AuthShell from '@/components/auth/AuthShell';
import { AuthAlert, AuthField, PasswordField, SubmitButton, isPasswordValid } from '@/components/auth/AuthKit';

type AccountType = 'restaurant' | 'store';

const TYPES: Array<{ key: AccountType; label: string; hint: string; icon: React.ReactNode }> = [
  { key: 'restaurant', label: 'مطعم', hint: 'قائمة رقمية وطاولات وتوصيل', icon: <IoRestaurantOutline size={24} /> },
  { key: 'store', label: 'متجر', hint: 'منتجات ومخزون وشحن', icon: <IoStorefrontOutline size={24} /> }
];

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  const { isRegistrationAllowed, requireEmailVerification, isMaintenanceMode } = useSettingsContext();

  const [accountType, setAccountType] = useState<AccountType>('restaurant');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    businessName: ''
  });
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState(false);

  const isRestaurant = accountType === 'restaurant';
  const kindLabel = isRestaurant ? 'المطعم' : 'المتجر';

  if (isMaintenanceMode || !isRegistrationAllowed) {
    return (
      <AuthShell
        title={isMaintenanceMode ? 'المنصّة تحت الصيانة' : 'التسجيل مغلق مؤقتاً'}
        subtitle={isMaintenanceMode ? 'نعمل على تحسينٍ سريع — عُد بعد قليل.' : 'لا نستقبل حسابات جديدة حالياً. راسلنا وسنخبرك حين يُفتح.'}
      >
        <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
          <Link to="/login" className="ss-auth-submit" style={{ textDecoration: 'none' }}>
            لديّ حساب — تسجيل الدخول
          </Link>
          <Link to="/contact" className="ss-auth-secondary">
            تواصل معنا
          </Link>
        </div>
      </AuthShell>
    );
  }

  const set = (key: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
    setError('');
  };

  const mismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.businessName.trim()) {
      setError(`يرجى إدخال اسم ${kindLabel}`);
      return;
    }
    if (!isPasswordValid(formData.password)) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي حرفاً ورقماً');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setRegistering(true);
    setError('');

    try {
      if (isRestaurant) {
        const response = await register({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          phone: formData.phone.trim(),
          restaurantName: formData.businessName.trim()
        });

        const requiresVerification = response?.requiresEmailVerification ?? requireEmailVerification;
        if (requiresVerification) {
          toast.success('تم إنشاء الحساب. أدخل الرمز المرسل إلى بريدك');
          navigate('/auth/email-verification', { state: { email: formData.email.trim(), accountType: 'owner' } });
        } else {
          toast.success('تم إنشاء حساب المطعم بنجاح');
          navigate('/dashboard');
        }
      } else {
        const response = await apiClient.post('/auth/register-store', {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          phone: formData.phone.trim(),
          storeName: formData.businessName.trim()
        });

        if (response.success) {
          const responseData = response.data;
          const requiresVerification = responseData?.requiresEmailVerification ?? requireEmailVerification;

          if (responseData?.token && !requiresVerification) {
            localStorage.setItem('token', responseData.token);
            localStorage.setItem('user', JSON.stringify(responseData.user));
          }

          if (requiresVerification) {
            toast.success('تم إنشاء الحساب. أدخل الرمز المرسل إلى بريدك');
            navigate('/auth/email-verification', { state: { email: formData.email.trim(), accountType: 'owner' } });
          } else {
            toast.success('تم إنشاء حساب المتجر بنجاح');
            navigate('/dashboard');
          }
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'حدث خطأ في إنشاء الحساب');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <AuthShell
      title="أنشئ حسابك مجاناً"
      subtitle="خطة مجانية بلا بطاقة ائتمان — ورابطٌ باسمك فور التسجيل."
      panelHeadline="ابدأ متجرك أو قائمتك الرقمية اليوم"
    >
      <form className="ss-auth-form" onSubmit={handleSubmit}>
        <div className="ss-field">
          <span className="ss-field-label">نوع النشاط</span>
          <div className="ss-choices" role="radiogroup" aria-label="نوع النشاط">
            {TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                role="radio"
                aria-checked={accountType === t.key}
                className="ss-choice"
                onClick={() => setAccountType(t.key)}
              >
                <IoCheckmarkCircle size={20} className="ss-choice-check" />
                <span className="ss-choice-icon">{t.icon}</span>
                <strong>{t.label}</strong>
                <small>{t.hint}</small>
              </button>
            ))}
          </div>
        </div>

        {error && <AuthAlert>{error}</AuthAlert>}

        <AuthField
          label={`اسم ${kindLabel}`}
          required
          value={formData.businessName}
          onChange={set('businessName')}
          placeholder={isRestaurant ? 'مثال: مطعم الشام' : 'مثال: متجر الياسمين'}
          icon={isRestaurant ? <IoRestaurantOutline size={19} /> : <IoStorefrontOutline size={19} />}
          hint="يظهر لزبائنك، وتستطيع تغييره لاحقاً."
        />
        <AuthField
          label="اسمك الكامل"
          required
          autoComplete="name"
          value={formData.name}
          onChange={set('name')}
          placeholder="محمد أحمد"
          icon={<IoPersonOutline size={19} />}
        />
        <AuthField
          label="البريد الإلكتروني"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          ltr
          value={formData.email}
          onChange={set('email')}
          placeholder="name@example.com"
          icon={<IoMailOutline size={19} />}
          hint={requireEmailVerification ? 'سنرسل إليه رمز تفعيل من 6 أرقام.' : undefined}
        />
        <AuthField
          label="رقم الهاتف"
          type="tel"
          required
          autoComplete="tel"
          inputMode="tel"
          ltr
          value={formData.phone}
          onChange={set('phone')}
          placeholder="09xxxxxxxx"
          icon={<IoCallOutline size={19} />}
        />
        <PasswordField
          label="كلمة المرور"
          required
          autoComplete="new-password"
          value={formData.password}
          onChange={set('password')}
          placeholder="••••••••"
          icon={<IoLockClosedOutline size={19} />}
          showRules
        />
        <PasswordField
          label="تأكيد كلمة المرور"
          required
          autoComplete="new-password"
          value={formData.confirmPassword}
          onChange={set('confirmPassword')}
          placeholder="••••••••"
          icon={<IoLockClosedOutline size={19} />}
          aria-invalid={mismatch}
          hint={mismatch ? <span style={{ color: '#c9383d', fontWeight: 600 }}>كلمتا المرور غير متطابقتين</span> : undefined}
        />

        <SubmitButton loading={registering || loading} loadingText="جارٍ إنشاء الحساب…" style={{ marginTop: 6 }}>
          <IoRocketOutline size={20} /> إنشاء حساب {isRestaurant ? 'المطعم' : 'المتجر'}
        </SubmitButton>

        <p className="ss-field-hint" style={{ textAlign: 'center', margin: 0 }}>
          بإنشاء الحساب توافق على{' '}
          <Link to="/terms" className="ss-auth-link">
            شروط الاستخدام
          </Link>{' '}
          و
          <Link to="/privacy" className="ss-auth-link">
            سياسة الخصوصية
          </Link>
          .
        </p>
      </form>

      <p className="ss-auth-foot">
        لديك حساب؟{' '}
        <Link to="/login" className="ss-auth-link">
          سجّل الدخول
        </Link>
      </p>
    </AuthShell>
  );
};

export default Register;
