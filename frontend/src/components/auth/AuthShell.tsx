// frontend/src/components/auth/AuthShell.tsx
//
// هيكل صفحات الدخول والتسجيل كلّها — نموذجٌ ولوحة هوية.
//
// كانت خمس صفحات تكرّر لوحة الألوان والحقول والأزرار والمؤشّر كلٌّ بنسخته،
// فاختلفت فيما بينها (حقلٌ بأيقونة يمين وآخر يسار، زرٌّ بـ١٠ استدارة وآخر
// بـ١٢). هنا مرّةً واحدة.
//
// **على نطاق التاجر** (`brand`) تحمل اللوحة والزرّ لونه وشعاره: الزبون جاء
// من متجرٍ يثق به، ورؤية هويةٍ غريبة لحظة كتابة رقمه تجعله يتردّد.

import React from 'react';
import { Link } from 'react-router-dom';
import { IoArrowForward, IoCheckmarkCircle } from 'react-icons/io5';
import '@/styles/brand.css';
import '@/styles/auth.css';
import { BrandLogo, BrandMark } from '@/components/marketing/Brand';
import { PhoneFrame } from '@/components/marketing/Devices';
import { RestaurantScreen, StoreScreen } from '@/components/marketing/MockScreens';
import type { HostBrand } from '@/hooks/useHostBrand';
import { getImageUrl, sizedImage } from '@/utils/imageHelpers';
import { isLightColor, readableOn } from '@/utils/storefrontTheme';

interface AuthShellProps {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  /** هوية التاجر حين تُفتح الصفحة من نطاقه */
  brand?: HostBrand | null;
  /** عنوان اللوحة ونقاطها — للمنصّة؛ على نطاق التاجر تُشتقّ من اسمه */
  panelHeadline?: string;
  panelPoints?: string[];
  /** رابط الرجوع أعلى الصفحة */
  backTo?: string;
  backLabel?: string;
}

const PLATFORM_POINTS = ['متجر أو قائمة رقمية خلال دقائق', 'طلبات لحظية بتنبيه صوتي وتيليغرام', 'أسعار بالليرة ودفع عبر شام كاش'];

/** ألوان الفعل على نطاق التاجر — والنصّ على أبيض يحتاج لوناً داكناً كفاية */
const brandVars = (brand?: HostBrand | null): React.CSSProperties => {
  if (!brand) return {};
  const accent = brand.accentColor || brand.primaryColor;
  const link = isLightColor(accent) ? brand.primaryColor || '#084835' : accent;
  return {
    ['--auth-accent' as any]: accent,
    ['--auth-on-accent' as any]: readableOn(accent),
    ['--auth-link' as any]: isLightColor(link) ? '#084835' : link
  };
};

const panelBackground = (brand?: HostBrand | null): string => {
  const base = brand?.primaryColor || '#084835';
  const glow = brand?.secondaryColor || '#C07CDF';
  return (
    `radial-gradient(70% 55% at 15% 105%, color-mix(in srgb, ${glow} 50%, transparent), transparent 65%), ` +
    `radial-gradient(60% 50% at 90% 0%, rgba(205,239,124,${brand ? 0.12 : 0.22}), transparent 60%), ` +
    `linear-gradient(160deg, color-mix(in srgb, ${base} 92%, #fff), color-mix(in srgb, ${base} 70%, #000))`
  );
};

const BrandIdentity: React.FC<{ brand?: HostBrand | null; size?: 'md' | 'lg'; tone?: 'light' | 'dark' }> = ({
  brand,
  size = 'md',
  tone = 'light'
}) => {
  if (!brand) return <BrandLogo tone={tone} size={size} />;
  const dim = size === 'lg' ? 52 : 42;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, color: tone === 'light' ? '#fff' : 'var(--ss-ink)' }}>
      {brand.logo ? (
        <img
          src={getImageUrl(sizedImage(brand.logo, 'sm'))}
          alt=""
          width={dim}
          height={dim}
          style={{ width: dim, height: dim, borderRadius: 14, objectFit: 'cover', boxShadow: '0 0 0 2px rgba(255,255,255,0.7)' }}
        />
      ) : (
        <span
          style={{
            width: dim,
            height: dim,
            borderRadius: 14,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(255,255,255,0.18)',
            fontWeight: 900,
            fontSize: dim * 0.45
          }}
        >
          {brand.name.trim().charAt(0)}
        </span>
      )}
      <span style={{ fontSize: size === 'lg' ? 22 : 18, fontWeight: 900 }}>{brand.name}</span>
    </span>
  );
};

const AuthShell: React.FC<AuthShellProps> = ({
  title,
  subtitle,
  children,
  brand,
  panelHeadline,
  panelPoints,
  backTo = '/',
  backLabel = 'الرئيسية'
}) => {
  const headline = panelHeadline || (brand ? `أهلاً بك في ${brand.name}` : 'أفضل إدارة لمطعمك أو متجرك');
  const points = panelPoints || (brand ? ['تابع طلبك لحظة بلحظة حتى يصلك', 'كلّ طلباتك السابقة في مكانٍ واحد', 'قيّم ما اشتريت وساعد غيرك يختار'] : PLATFORM_POINTS);
  const background = panelBackground(brand);

  return (
    <div className="ss ss-auth" dir="rtl" style={brandVars(brand)}>
      {/* `div` لا `main`: التطبيق يلفّ كلّ صفحة بـ<main id="main-content"> */}
      <div className="ss-auth-main">
        {/* ===== شريط الهوية — جوال ===== */}
        <div className="ss-auth-band" style={{ background }}>
          {!brand && <BrandMark color="rgba(205,239,124,0.1)" size={220} style={{ position: 'absolute', insetInlineStart: -50, top: -40, zIndex: -1 }} />}
          <div className="ss-auth-band-top">
            <Link to="/" aria-label="الرئيسية" style={{ textDecoration: 'none' }}>
              <BrandIdentity brand={brand} />
            </Link>
            <Link
              to={backTo}
              style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13.5, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <IoArrowForward /> {backLabel}
            </Link>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.35, maxWidth: 320 }}>{headline}</div>
        </div>

        {/* ===== ورقة النموذج ===== */}
        <div className="ss-auth-sheet">
          <div className="ss-auth-desktop-logo">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Link to="/" aria-label="الرئيسية" style={{ textDecoration: 'none' }}>
                {brand ? <BrandIdentity brand={brand} tone="dark" /> : <BrandLogo tone="dark" />}
              </Link>
              <Link to={backTo} className="ss-auth-link" style={{ fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <IoArrowForward /> {backLabel}
              </Link>
            </div>
          </div>

          <h1 className="ss-auth-title">{title}</h1>
          {subtitle && <p className="ss-auth-sub">{subtitle}</p>}
          {children}
        </div>
      </div>

      {/* ===== لوحة الهوية — حاسوب ===== */}
      <aside className="ss-auth-panel" style={{ background }} aria-hidden="true">
        {!brand && (
          <BrandMark color="rgba(205,239,124,0.07)" size={560} style={{ position: 'absolute', insetInlineEnd: -140, bottom: -120, zIndex: -1 }} />
        )}
        <BrandIdentity brand={brand} size="lg" />
        <h2 className="ss-auth-panel-headline">{headline}</h2>
        <ul className="ss-auth-panel-points">
          {points.map((p) => (
            <li key={p}>
              <IoCheckmarkCircle size={20} style={{ color: '#CDEF7C', flexShrink: 0 }} />
              {p}
            </li>
          ))}
        </ul>
        {!brand && (
          <div className="ss-auth-panel-art">
            <PhoneFrame width={230} style={{ transform: 'translateY(60px) rotate(-4deg)' }}>
              <RestaurantScreen compact />
            </PhoneFrame>
            <PhoneFrame width={250} style={{ transform: 'translateY(30px) rotate(3deg)' }}>
              <StoreScreen layout="classic" />
            </PhoneFrame>
          </div>
        )}
      </aside>
    </div>
  );
};

export default AuthShell;
