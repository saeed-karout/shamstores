// frontend/src/pages/ProfilePage.tsx
//
// صفحة الحساب: الاسم والهاتف والصورة.
//
// ما يُعدَّل هنا هو ما يملكه صاحب الحساب فعلاً. البريد والدور وارتباط
// النشاط تُعرَض للقراءة ولا تُعدَّل — وهذا ليس نقصاً في الواجهة بل قرار:
//   • البريد معرّف الدخول ومحلّ التحقّق. تغييره من صفحة الحساب يُنتج
//     حساباً «مُفعَّلاً» ببريد لم يُثبت أحدٌ ملكيّته.
//   • الدور ترقية صلاحية، لا تفضيل شخصي.
// والخادم يرفضهما على أي حال، فعرضهما قابلين للتعديل كان سيَعِد بما لا
// يُنفَّذ — وهو أسوأ من إخفائهما.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoPersonCircleOutline,
  IoCameraOutline,
  IoMailOutline,
  IoShieldCheckmarkOutline,
  IoArrowBack,
  IoSaveOutline
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import Loader from '@/components/common/Loader';

const C = {
  bg: '#082E24',
  card: '#112E23',
  surf: '#0F3D31',
  accent: '#C8E235',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B'
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'مدير المنصة',
  owner: 'صاحب نشاط',
  staff: 'موظف',
  delivery_driver: 'مندوب توصيل',
  user: 'زبون'
};

/** حدّ حجم صورة الحساب — أعلى منه يُبطئ التحميل بلا فائدة مرئية */
const MAX_AVATAR_MB = 4;

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setAuthData } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        // api.get يُرجع الحمولة مفكوكة التغليف — لا تفكّها مجدداً
        const data: any = await api.get('/auth/me');
        setProfile(data);
        setName(data?.name || '');
        setPhone(data?.phone || '');
        setAvatarUrl(data?.avatarUrl || null);
      } catch {
        toast.error('تعذّر تحميل بيانات حسابك');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pickAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // الحقل يُفرَّغ فوراً كي يعمل اختيار الملف نفسه مرة ثانية
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('اختر ملف صورة');
      return;
    }
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      toast.error(`حجم الصورة يجب ألّا يتجاوز ${MAX_AVATAR_MB} ميغابايت`);
      return;
    }

    setUploading(true);
    try {
      const result: any = await api.uploadImage(file, 'avatar');
      const url = result?.imageUrl || result?.url;
      if (!url) throw new Error('no url');
      setAvatarUrl(url);
      // الرفع لا يحفظ: المستخدم قد يتراجع قبل الحفظ
      toast.success('اضغط «حفظ» لتثبيت الصورة');
    } catch {
      toast.error('تعذّر رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  const dirty =
    profile &&
    (name.trim() !== (profile.name || '') ||
      phone.trim() !== (profile.phone || '') ||
      (avatarUrl || null) !== (profile.avatarUrl || null));

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      const data: any = await api.patch('/auth/profile', {
        name: name.trim(),
        phone: phone.trim(),
        avatarUrl: avatarUrl || ''
      });

      setProfile(data);
      toast.success('تم حفظ بياناتك');

      // الشريط الجانبي والقائمة يقرآن المستخدم من الحالة لا من الخادم
      const token = localStorage.getItem('token');
      if (token && setAuthData) {
        const merged = { ...(user || {}), ...data };
        localStorage.setItem('user', JSON.stringify(merged));
        setAuthData(token, merged);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'تعذّر حفظ البيانات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  const initial = (name || profile?.email || 'م')[0];

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            color: C.muted,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 13,
            marginBottom: 16,
            padding: 0
          }}
        >
          <IoArrowBack size={17} /> رجوع
        </button>

        <h1 style={{ color: C.text, fontSize: 23, fontWeight: 800, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 9 }}>
          <IoPersonCircleOutline style={{ color: C.accent }} /> حسابي
        </h1>

        {/* الصورة */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                width={82}
                height={82}
                style={{ width: 82, height: 82, borderRadius: '50%', objectFit: 'cover', background: C.surf }}
              />
            ) : (
              <div
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: '50%',
                  background: 'rgba(200,226,53,0.16)',
                  color: C.accent,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 32,
                  fontWeight: 900
                }}
              >
                {initial}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="تغيير صورة الحساب"
              style={{
                position: 'absolute',
                insetInlineEnd: -4,
                bottom: -4,
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: `2px solid ${C.card}`,
                background: C.accent,
                color: C.bg,
                display: 'grid',
                placeItems: 'center',
                cursor: uploading ? 'wait' : 'pointer'
              }}
            >
              <IoCameraOutline size={16} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={pickAvatar} style={{ display: 'none' }} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 15.5 }}>{profile?.name}</div>
            <div style={{ color: C.muted, fontSize: 12.5, marginTop: 3 }} dir="ltr">
              {profile?.email}
            </div>
            {uploading && <div style={{ color: C.accent, fontSize: 12, marginTop: 5 }}>جارٍ رفع الصورة…</div>}
          </div>
        </div>

        {/* الحقول القابلة للتعديل */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <label htmlFor="profile-name" style={labelStyle}>
            الاسم الكامل
          </label>
          <input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            style={inputStyle}
          />

          <label htmlFor="profile-phone" style={{ ...labelStyle, marginTop: 16 }}>
            رقم الهاتف
          </label>
          <input
            id="profile-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            dir="ltr"
            placeholder="09xxxxxxxx"
            maxLength={20}
            style={{ ...inputStyle, textAlign: 'start' }}
          />
          <div style={{ color: C.muted, fontSize: 11.5, marginTop: 6 }}>
            يظهر للمتجر عند طلبك، ويُستخدم للتواصل بشأن طلباتك.
          </div>
        </div>

        {/* ما لا يُعدَّل من هنا */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <h2 style={{ color: C.text, fontSize: 14.5, fontWeight: 700, margin: '0 0 4px' }}>
            بيانات ثابتة
          </h2>
          <p style={{ color: C.muted, fontSize: 12, margin: '0 0 14px', lineHeight: 1.85 }}>
            تُغيَّر من إدارة المنصة. البريد معرّف دخولك ومحلّ التحقّق، وتغييره
            من هنا يجعل حسابك «مُفعَّلاً» ببريد لم يُثبَت أنه لك.
          </p>

          <ReadOnlyRow icon={<IoMailOutline size={16} />} label="البريد الإلكتروني" value={profile?.email} ltr />
          <ReadOnlyRow
            icon={<IoShieldCheckmarkOutline size={16} />}
            label="نوع الحساب"
            value={ROLE_LABELS[profile?.role] || profile?.role}
          />
        </div>

        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            minHeight: 48,
            borderRadius: 13,
            border: 'none',
            background: dirty && !saving ? C.accent : C.surf,
            color: dirty && !saving ? C.bg : C.muted,
            fontWeight: 800,
            fontSize: 14.5,
            fontFamily: 'inherit',
            cursor: dirty && !saving ? 'pointer' : 'not-allowed'
          }}
        >
          <IoSaveOutline size={18} />
          {saving ? 'جارٍ الحفظ…' : dirty ? 'حفظ التغييرات' : 'لا تغييرات'}
        </button>
      </div>
    </div>
  );
};

const ReadOnlyRow: React.FC<{ icon: React.ReactNode; label: string; value?: string; ltr?: boolean }> = ({
  icon,
  label,
  value,
  ltr
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '11px 13px',
      borderRadius: 11,
      background: C.surf,
      marginBottom: 8
    }}
  >
    <span style={{ color: C.muted, flexShrink: 0 }}>{icon}</span>
    <span style={{ color: C.muted, fontSize: 12.5, flexShrink: 0 }}>{label}</span>
    <span
      style={{
        color: C.text,
        fontSize: 13,
        marginInlineStart: 'auto',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}
      dir={ltr ? 'ltr' : undefined}
    >
      {value || '—'}
    </span>
  </div>
);

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: C.muted,
  fontSize: 12.5,
  fontWeight: 600,
  marginBottom: 6
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  minHeight: 46,
  borderRadius: 11,
  border: `1px solid ${C.border}`,
  background: C.surf,
  color: C.text,
  fontSize: 14,
  fontFamily: 'inherit',
  boxSizing: 'border-box'
};

export default ProfilePage;
