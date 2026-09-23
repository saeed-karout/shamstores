// frontend/src/components/marketing/MockScreens.tsx
//
// شاشات توضيحية للموقع التسويقي — تُرسم بالمقاس الحقيقي داخل `PhoneFrame`
// و`LaptopFrame`. كلّ ما فيها يعكس ميزةً موجودة فعلاً: قائمة المطعم،
// قوالب المتجر الأربعة (كلاسيكي، بوتيك، معرض، صفحة أقسام)، ولوحة التاجر.
// الأرقام داخل الشاشات أمثلة عرضٍ لا إحصاءات عن المنصّة.

import React from 'react';
import {
  IoSearch, IoBagHandle, IoHeartOutline, IoHome, IoGridOutline, IoPersonOutline,
  IoAdd, IoTime, IoLocationOutline, IoFastFood, IoPizza, IoCafe, IoIceCream,
  IoShirt, IoWatch, IoHeadset, IoLaptop, IoBag, IoFootsteps,
  IoGlasses, IoDiamond, IoPhonePortrait, IoCamera, IoLeaf, IoFlower, IoReceiptOutline,
  IoStatsChartOutline, IoCubeOutline, IoPeopleOutline, IoSettingsOutline, IoPricetagOutline,
  IoNotificationsOutline, IoRestaurant, IoBicycle, IoCheckmarkCircle, IoChevronBack
} from 'react-icons/io5';
import type { IconType } from 'react-icons';

export interface MockTheme {
  name: string;
  primary: string;
  onPrimary: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  hero: [string, string];
}

// ثيمات جاهزة — تماماً كما يختار التاجر ألوان واجهته من الإعدادات
export const THEMES: Record<string, MockTheme> = {
  forest: {
    name: 'أخضر شام', primary: '#084835', onPrimary: '#ffffff', bg: '#f5f8f4', surface: '#ffffff',
    text: '#10231b', muted: '#6b7d75', accent: '#cdef7c', hero: ['#0c5c44', '#042a1e']
  },
  noir: {
    name: 'داكن', primary: '#d4a64a', onPrimary: '#16120a', bg: '#0f0f10', surface: '#1b1b1d',
    text: '#f4efe6', muted: '#a09a90', accent: '#d4a64a', hero: ['#2a2622', '#0b0b0c']
  },
  citrus: {
    name: 'عصري', primary: '#f26b1d', onPrimary: '#ffffff', bg: '#fff8f2', surface: '#ffffff',
    text: '#2a1a10', muted: '#8a7466', accent: '#ffd8bd', hero: ['#ff8a3d', '#e2521a']
  },
  mono: {
    name: 'مينيمال', primary: '#111111', onPrimary: '#ffffff', bg: '#faf8f4', surface: '#ffffff',
    text: '#111111', muted: '#7a7670', accent: '#ece7de', hero: ['#3a3733', '#141312']
  },
  ocean: {
    name: 'بحري', primary: '#0f5fa8', onPrimary: '#ffffff', bg: '#f1f7fc', surface: '#ffffff',
    text: '#0b2033', muted: '#61788c', accent: '#bfe0ff', hero: ['#2b8fe0', '#0b4a86']
  },
  royal: {
    name: 'بنفسجي', primary: '#8a45b8', onPrimary: '#ffffff', bg: '#faf6fd', surface: '#ffffff',
    text: '#24122f', muted: '#806d8c', accent: '#e9d5f6', hero: ['#c07cdf', '#6c2e96']
  },
  rose: {
    name: 'وردي', primary: '#d6457a', onPrimary: '#ffffff', bg: '#fff5f8', surface: '#ffffff',
    text: '#33101d', muted: '#8f6a78', accent: '#ffd3e2', hero: ['#f07aa4', '#b62a5d']
  },
  tech: {
    name: 'أزرق', primary: '#1d4ed8', onPrimary: '#ffffff', bg: '#f3f6fd', surface: '#ffffff',
    text: '#0d1a3a', muted: '#63708f', accent: '#c9d8ff', hero: ['#1e3a8a', '#0b1a4a']
  }
};

const syp = (n: number) => `${n.toLocaleString('en-US')} ل.س`;

// ===== عناصر صغيرة =====

const StatusBar: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <div
    className="latin"
    style={{
      height: 50,
      padding: '18px 26px 0',
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 15,
      fontWeight: 700,
      color: dark ? '#fff' : '#111',
      direction: 'ltr'
    }}
  >
    <span>9:41</span>
    <span style={{ letterSpacing: 2 }}>●●● ▮</span>
  </div>
);

interface GlyphProps {
  icon: IconType;
  from: string;
  to: string;
  size?: number;
  radius?: number;
  iconSize?: number;
  style?: React.CSSProperties;
}

/** صورة المنتج في العرض: تدرّج لونيّ وأيقونة — بلا صور مخزونٍ مستعارة. */
export const Glyph: React.FC<GlyphProps> = ({ icon: Icon, from, to, size, radius = 16, iconSize, style }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: radius,
      background: `radial-gradient(120% 90% at 30% 20%, rgba(255,255,255,0.35), transparent 55%), linear-gradient(145deg, ${from}, ${to})`,
      display: 'grid',
      placeItems: 'center',
      color: 'rgba(255,255,255,0.95)',
      flexShrink: 0,
      boxShadow: 'inset 0 -12px 24px rgba(0,0,0,0.12)',
      ...style
    }}
  >
    {/* بلا `filter: drop-shadow` — عشرات الأيقونات المصغّرة بمرشّحٍ لكلٍّ منها تُثقل الرسم */}
    <Icon size={iconSize || (size ? size * 0.44 : 40)} style={{ opacity: 0.95 }} />
  </div>
);

const BottomNav: React.FC<{ theme: MockTheme; active?: number }> = ({ theme, active = 0 }) => {
  const items = [IoHome, IoGridOutline, IoBagHandle, IoHeartOutline, IoPersonOutline];
  return (
    <div
      style={{
        position: 'absolute',
        insetInline: 0,
        bottom: 0,
        height: 78,
        paddingBottom: 14,
        background: theme.surface,
        borderTop: `1px solid ${theme.text}12`,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center'
      }}
    >
      {items.map((Icon, i) => (
        <span
          key={i}
          style={{
            width: 46,
            height: 46,
            borderRadius: 16,
            display: 'grid',
            placeItems: 'center',
            color: i === active ? theme.onPrimary : theme.muted,
            background: i === active ? theme.primary : 'transparent'
          }}
        >
          <Icon size={22} />
        </span>
      ))}
    </div>
  );
};

// ===== واجهة المطعم (القائمة الرقمية) =====

const DISHES: Array<{ name: string; desc: string; price: number; icon: IconType; c: [string, string] }> = [
  { name: 'مشاوي مشكّلة', desc: 'كباب، شيش طاووق، لحم', price: 95000, icon: IoRestaurant, c: ['#c9772f', '#7a3510'] },
  { name: 'شاورما دجاج', desc: 'خبز صاج، ثوم، مخلل', price: 25000, icon: IoFastFood, c: ['#e2a34a', '#a2561b'] },
  { name: 'فتّوش', desc: 'خضار طازجة ودبس رمّان', price: 18000, icon: IoLeaf, c: ['#79b851', '#2f6f2a'] },
  { name: 'كنافة بالجبن', desc: 'قطر وفستق حلبي', price: 30000, icon: IoIceCream, c: ['#f0b24c', '#b8651c'] }
];

const CATS: Array<{ label: string; icon: IconType }> = [
  { label: 'المشاوي', icon: IoRestaurant },
  { label: 'السندويش', icon: IoFastFood },
  { label: 'البيتزا', icon: IoPizza },
  { label: 'المشروبات', icon: IoCafe },
  { label: 'الحلويات', icon: IoIceCream }
];

export const RestaurantScreen: React.FC<{ theme?: MockTheme; name?: string; compact?: boolean }> = ({
  theme = THEMES.forest,
  name = 'مطعم الشام',
  compact
}) => (
  <div style={{ width: '100%', height: '100%', background: theme.bg, color: theme.text, position: 'relative', fontFamily: 'Cairo, sans-serif' }}>
    {/* الغلاف */}
    <div
      style={{
        height: 270,
        position: 'relative',
        background: `radial-gradient(90% 70% at 70% 30%, rgba(255,255,255,0.18), transparent 60%), linear-gradient(160deg, ${theme.hero[0]}, ${theme.hero[1]})`,
        color: '#fff',
        overflow: 'hidden'
      }}
    >
      <StatusBar dark />
      <div style={{ position: 'absolute', insetInlineEnd: -30, bottom: -40, opacity: 0.9 }}>
        <Glyph icon={IoRestaurant} from="#e79b45" to="#8c3c12" size={190} radius={95} />
      </div>
      <div style={{ position: 'absolute', insetInlineEnd: 140, bottom: 40 }}>
        <Glyph icon={IoPizza} from="#f2c14e" to="#c2561c" size={86} radius={43} />
      </div>
      <div style={{ position: 'absolute', insetInlineStart: 22, top: 80, maxWidth: 190 }}>
        <div style={{ width: 54, height: 54, borderRadius: 18, background: 'rgba(255,255,255,0.18)', display: 'grid', placeItems: 'center', marginBottom: 12, backdropFilter: 'blur(6px)' }}>
          <IoRestaurant size={28} />
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.2 }}>{name}</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, display: 'flex', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IoTime /> مفتوح الآن</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IoLocationOutline /> دمشق</span>
        </div>
      </div>
    </div>

    {/* التصنيفات */}
    <div style={{ display: 'flex', gap: 10, padding: '18px 18px 6px', overflow: 'hidden' }}>
      {CATS.map((c, i) => (
        <div key={c.label} style={{ display: 'grid', justifyItems: 'center', gap: 6, flexShrink: 0, width: 64 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 20,
              display: 'grid',
              placeItems: 'center',
              background: i === 0 ? theme.primary : theme.surface,
              color: i === 0 ? theme.onPrimary : theme.primary,
              boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
            }}
          >
            <c.icon size={26} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? theme.text : theme.muted }}>{c.label}</span>
        </div>
      ))}
    </div>

    <div style={{ padding: '12px 18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 18, fontWeight: 900 }}>الأكثر طلباً</span>
      <span style={{ fontSize: 13, color: theme.primary, fontWeight: 700 }}>عرض الكل</span>
    </div>

    <div style={{ display: 'grid', gap: 12, padding: '12px 18px' }}>
      {DISHES.slice(0, compact ? 3 : 4).map((d) => (
        <div
          key={d.name}
          style={{ display: 'flex', gap: 14, alignItems: 'center', background: theme.surface, borderRadius: 22, padding: 10, boxShadow: '0 6px 18px rgba(0,0,0,0.05)' }}
        >
          <Glyph icon={d.icon} from={d.c[0]} to={d.c[1]} size={78} radius={18} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{d.name}</div>
            <div style={{ fontSize: 12.5, color: theme.muted, margin: '2px 0 6px' }}>{d.desc}</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: theme.primary }}>{syp(d.price)}</div>
          </div>
          <span style={{ width: 38, height: 38, borderRadius: 13, display: 'grid', placeItems: 'center', background: theme.primary, color: theme.onPrimary }}>
            <IoAdd size={22} />
          </span>
        </div>
      ))}
    </div>

    {/* شريط السلة السفليّ */}
    <div
      style={{
        position: 'absolute',
        insetInline: 16,
        bottom: 22,
        height: 60,
        borderRadius: 20,
        background: theme.primary,
        color: theme.onPrimary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 18px',
        fontWeight: 800,
        fontSize: 15,
        boxShadow: '0 14px 30px rgba(0,0,0,0.25)'
      }}
    >
      <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
        <span style={{ width: 28, height: 28, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'grid', placeItems: 'center', fontSize: 13 }}>2</span>
        عرض السلة
      </span>
      <span>{syp(120000)}</span>
    </div>
  </div>
);

// ===== واجهة المتجر — القوالب الأربعة =====

const PRODUCTS: Array<{ name: string; price: number; old?: number; icon: IconType; c: [string, string] }> = [
  { name: 'قميص قطن', price: 145000, old: 190000, icon: IoShirt, c: ['#6f8d7b', '#2f4a3b'] },
  { name: 'ساعة ذكية', price: 210000, icon: IoWatch, c: ['#4a5568', '#1a202c'] },
  { name: 'سمّاعات لاسلكية', price: 175000, old: 220000, icon: IoHeadset, c: ['#8f7bd6', '#4b3796'] },
  { name: 'حذاء رياضي', price: 260000, icon: IoFootsteps, c: ['#e28a5b', '#a4461f'] },
  { name: 'حقيبة جلد', price: 320000, icon: IoBag, c: ['#b0835a', '#6b4526'] },
  { name: 'نظّارة شمسية', price: 95000, icon: IoGlasses, c: ['#5b8fb0', '#23506e'] }
];

const StoreHeader: React.FC<{ theme: MockTheme; name: string; dark?: boolean }> = ({ theme, name, dark }) => (
  <div style={{ padding: '4px 18px 12px', display: 'grid', gap: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 900, fontSize: 18, color: dark ? '#fff' : theme.text }}>
        <span style={{ width: 34, height: 34, borderRadius: 11, background: theme.primary, color: theme.onPrimary, display: 'grid', placeItems: 'center' }}>
          <IoBagHandle size={18} />
        </span>
        {name}
      </span>
      <span style={{ position: 'relative', color: dark ? '#fff' : theme.text }}>
        <IoBagHandle size={24} />
        <span style={{ position: 'absolute', top: -6, insetInlineEnd: -8, width: 18, height: 18, borderRadius: 9, background: theme.primary, color: theme.onPrimary, fontSize: 10, display: 'grid', placeItems: 'center', fontWeight: 800 }}>3</span>
      </span>
    </div>
    <div
      style={{
        height: 44,
        borderRadius: 14,
        background: dark ? 'rgba(255,255,255,0.08)' : theme.surface,
        border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : theme.text + '10'}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 14px',
        color: dark ? 'rgba(255,255,255,0.6)' : theme.muted,
        fontSize: 13.5
      }}
    >
      <IoSearch size={18} /> ابحث عن منتج...
    </div>
  </div>
);

const ProductCard: React.FC<{ p: (typeof PRODUCTS)[number]; theme: MockTheme; dark?: boolean; tall?: boolean }> = ({ p, theme, dark, tall }) => (
  <div style={{ background: dark ? 'rgba(255,255,255,0.06)' : theme.surface, borderRadius: 20, padding: 8, boxShadow: dark ? 'none' : '0 6px 18px rgba(0,0,0,0.05)' }}>
    <div style={{ position: 'relative' }}>
      <Glyph icon={p.icon} from={p.c[0]} to={p.c[1]} radius={15} style={{ width: '100%', height: tall ? 190 : 130 }} iconSize={tall ? 70 : 52} />
      {p.old && (
        <span style={{ position: 'absolute', top: 8, insetInlineStart: 8, background: '#e24a4a', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 8 }}>
          -{Math.round(100 - (p.price / p.old) * 100)}%
        </span>
      )}
      <span style={{ position: 'absolute', top: 8, insetInlineEnd: 8, width: 30, height: 30, borderRadius: 15, background: 'rgba(255,255,255,0.9)', color: '#333', display: 'grid', placeItems: 'center' }}>
        <IoHeartOutline size={16} />
      </span>
    </div>
    <div style={{ padding: '10px 4px 4px' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: dark ? '#fff' : theme.text }}>{p.name}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <span style={{ fontSize: 13.5, fontWeight: 900, color: dark ? theme.accent : theme.primary }}>{syp(p.price)}</span>
        <span style={{ width: 30, height: 30, borderRadius: 10, background: theme.primary, color: theme.onPrimary, display: 'grid', placeItems: 'center' }}>
          <IoAdd size={18} />
        </span>
      </div>
    </div>
  </div>
);

export type StoreLayout = 'classic' | 'boutique' | 'showcase' | 'landing';

export const StoreScreen: React.FC<{ theme?: MockTheme; layout?: StoreLayout; name?: string }> = ({
  theme = THEMES.forest,
  layout = 'classic',
  name = 'متجر الشام'
}) => {
  const dark = layout === 'showcase';
  const bg = dark ? '#0d0f0e' : theme.bg;
  return (
    <div style={{ width: '100%', height: '100%', background: bg, color: theme.text, position: 'relative', overflow: 'hidden', fontFamily: 'Cairo, sans-serif' }}>
      <StatusBar dark={dark} />
      <StoreHeader theme={theme} name={name} dark={dark} />

      {layout === 'classic' && (
        <>
          <div
            style={{
              margin: '0 18px',
              height: 170,
              borderRadius: 24,
              padding: 20,
              position: 'relative',
              overflow: 'hidden',
              color: '#fff',
              background: `radial-gradient(80% 90% at 20% 20%, rgba(255,255,255,0.22), transparent 60%), linear-gradient(145deg, ${theme.hero[0]}, ${theme.hero[1]})`
            }}
          >
            <div style={{ fontSize: 12.5, opacity: 0.85 }}>عروض الموسم</div>
            <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.25, marginTop: 4 }}>تخفيضات<br />حتى 50%</div>
            <span style={{ display: 'inline-block', marginTop: 12, background: '#fff', color: theme.primary, padding: '7px 16px', borderRadius: 999, fontSize: 12.5, fontWeight: 800 }}>تسوّق الآن</span>
            <div style={{ position: 'absolute', insetInlineEnd: -10, bottom: -20 }}>
              <Glyph icon={IoShirt} from="rgba(255,255,255,0.35)" to="rgba(255,255,255,0.08)" size={150} radius={75} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, padding: '18px 18px 8px' }}>
            {[IoShirt, IoWatch, IoHeadset, IoFootsteps, IoGlasses].map((Icon, i) => (
              <div key={i} style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
                <span style={{ width: 54, height: 54, borderRadius: 27, background: i === 0 ? theme.primary : theme.surface, color: i === 0 ? theme.onPrimary : theme.primary, display: 'grid', placeItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                  <Icon size={24} />
                </span>
                <span style={{ fontSize: 11.5, color: theme.muted, fontWeight: 700 }}>{['ملابس', 'ساعات', 'صوتيات', 'أحذية', 'نظّارات'][i]}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '8px 18px' }}>
            {PRODUCTS.slice(0, 4).map((p) => <ProductCard key={p.name} p={p} theme={theme} />)}
          </div>
        </>
      )}

      {layout === 'boutique' && (
        <>
          <div style={{ margin: '0 18px', height: 330, borderRadius: 28, overflow: 'hidden', position: 'relative', background: `linear-gradient(170deg, ${theme.hero[0]}, ${theme.hero[1]})`, color: '#fff' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity: 0.9 }}>
              <IoDiamond size={150} style={{ opacity: 0.35 }} />
            </div>
            <div style={{ position: 'absolute', insetInline: 22, bottom: 24 }}>
              <div className="latin" style={{ fontSize: 13, letterSpacing: '0.3em', opacity: 0.8 }}>NEW COLLECTION</div>
              <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.2, margin: '6px 0 12px' }}>مجموعة الخريف</div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: '#111', padding: '9px 18px', borderRadius: 999, fontSize: 13, fontWeight: 800 }}>
                اكتشفي المجموعة <IoChevronBack />
              </span>
            </div>
          </div>
          <div style={{ padding: '18px 18px 8px', fontSize: 17, fontWeight: 900 }}>وصل حديثاً</div>
          <div style={{ display: 'flex', gap: 12, padding: '0 18px' }}>
            {PRODUCTS.slice(3, 6).map((p) => (
              <div key={p.name} style={{ width: 150, flexShrink: 0 }}>
                <ProductCard p={p} theme={theme} />
              </div>
            ))}
          </div>
        </>
      )}

      {layout === 'showcase' && (
        <>
          <div style={{ padding: '0 18px 10px', color: '#fff' }}>
            <div style={{ fontSize: 13, color: theme.accent, fontWeight: 800 }}>أحدث الأجهزة</div>
            <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.3 }}>تقنية تستحقّها<br />بأسعار بالليرة</div>
          </div>
          <div style={{ margin: '4px 18px 14px', height: 150, borderRadius: 24, background: `linear-gradient(145deg, ${theme.hero[0]}, ${theme.hero[1]})`, display: 'flex', alignItems: 'center', justifyContent: 'space-around', color: '#fff' }}>
            <IoLaptop size={86} style={{ opacity: 0.9 }} />
            <IoPhonePortrait size={60} style={{ opacity: 0.8 }} />
            <IoCamera size={52} style={{ opacity: 0.7 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 18px' }}>
            {[PRODUCTS[1], PRODUCTS[2], { ...PRODUCTS[0], name: 'لابتوب', icon: IoLaptop, c: ['#3b4a6b', '#141c30'] as [string, string] }, { ...PRODUCTS[5], name: 'كاميرا', icon: IoCamera, c: ['#555', '#1d1d1d'] as [string, string] }].map((p) => (
              <ProductCard key={p.name} p={p} theme={theme} dark />
            ))}
          </div>
        </>
      )}

      {layout === 'landing' && (
        <>
          {[
            { title: 'أزياء', icon: IoShirt, c: ['#7a9a86', '#2f4a3b'] as [string, string] },
            { title: 'منزل وديكور', icon: IoFlower, c: ['#d9a36b', '#8f5424'] as [string, string] },
            { title: 'إلكترونيات', icon: IoHeadset, c: ['#7f8fd9', '#35408f'] as [string, string] }
          ].map((s) => (
            <div key={s.title} style={{ margin: '0 18px 12px', height: 128, borderRadius: 24, overflow: 'hidden', position: 'relative', background: `linear-gradient(145deg, ${s.c[0]}, ${s.c[1]})`, color: '#fff' }}>
              <s.icon size={110} style={{ position: 'absolute', insetInlineEnd: 12, bottom: -14, opacity: 0.35 }} />
              <div style={{ position: 'absolute', insetInlineStart: 20, top: 26 }}>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{s.title}</div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 12.5, fontWeight: 800, background: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: 999 }}>
                  تصفّح القسم <IoChevronBack />
                </span>
              </div>
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 18px' }}>
            {PRODUCTS.slice(0, 2).map((p) => <ProductCard key={p.name} p={p} theme={theme} />)}
          </div>
        </>
      )}

      <BottomNav theme={theme} />
    </div>
  );
};

// ===== تتبّع الطلب =====

export const TrackingScreen: React.FC<{ theme?: MockTheme }> = ({ theme = THEMES.forest }) => {
  const steps = ['تم الاستلام', 'قيد التحضير', 'في الطريق', 'تم التسليم'];
  return (
    <div style={{ width: '100%', height: '100%', background: theme.bg, color: theme.text, position: 'relative', fontFamily: 'Cairo, sans-serif' }}>
      <StatusBar />
      <div style={{ padding: '6px 20px', fontSize: 19, fontWeight: 900 }}>تتبّع طلبك</div>
      <div style={{ margin: '10px 20px', padding: 18, borderRadius: 24, background: theme.surface, boxShadow: '0 6px 18px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: theme.muted }}>
          <span>طلب رقم <bdi className="latin" style={{ color: theme.text, fontWeight: 800 }}>#1256</bdi></span>
          <span>الوقت المتوقّع 25 دقيقة</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0 10px' }}>
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <span style={{ width: 30, height: 30, borderRadius: 15, display: 'grid', placeItems: 'center', background: i <= 2 ? theme.primary : theme.text + '14', color: i <= 2 ? theme.onPrimary : theme.muted, flexShrink: 0 }}>
                {i < 2 ? <IoCheckmarkCircle size={18} /> : i === 2 ? <IoBicycle size={16} /> : <span style={{ width: 8, height: 8, borderRadius: 4, background: 'currentColor' }} />}
              </span>
              {i < steps.length - 1 && <span style={{ flex: 1, height: 4, borderRadius: 2, background: i < 2 ? theme.primary : theme.text + '14' }} />}
            </React.Fragment>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: theme.muted, fontWeight: 700 }}>
          {steps.map((s) => <span key={s}>{s}</span>)}
        </div>
      </div>
      {/* خريطة مبسّطة */}
      <div style={{ margin: '6px 20px', height: 300, borderRadius: 24, overflow: 'hidden', position: 'relative', background: '#e8efe9' }}>
        <svg viewBox="0 0 335 300" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <g stroke="#fff" strokeWidth="14" fill="none" strokeLinecap="round">
            <path d="M-10 70 L345 110" />
            <path d="M60 -10 L110 310" />
            <path d="M-10 220 L345 190" />
            <path d="M240 -10 L220 310" />
          </g>
          <path d="M80 250 C 120 200, 160 190, 180 150 S 230 90, 250 70" stroke={theme.primary} strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray="2 12" />
          <circle cx="80" cy="250" r="10" fill={theme.primary} />
          <circle cx="250" cy="70" r="14" fill={theme.primary} opacity="0.2" />
          <circle cx="250" cy="70" r="8" fill={theme.primary} />
        </svg>
        <span style={{ position: 'absolute', top: 120, insetInlineStart: 130, width: 44, height: 44, borderRadius: 22, background: theme.surface, color: theme.primary, display: 'grid', placeItems: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.18)' }}>
          <IoBicycle size={22} />
        </span>
      </div>
      <div style={{ margin: '12px 20px', padding: 16, borderRadius: 22, background: theme.primary, color: theme.onPrimary, display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
        <span>الإجمالي</span>
        <span>{syp(185000)}</span>
      </div>
    </div>
  );
};

// ===== لوحة التاجر (سطح المكتب) =====

const KPI: Array<{ label: string; value: string; icon: IconType; tone: string }> = [
  { label: 'مبيعات اليوم', value: '1,250,000 ل.س', icon: IoStatsChartOutline, tone: '#084835' },
  { label: 'طلبات جديدة', value: '32', icon: IoReceiptOutline, tone: '#a95fcb' },
  { label: 'زبائن عائدون', value: '64%', icon: IoPeopleOutline, tone: '#117257' },
  { label: 'منتجات منخفضة', value: '5', icon: IoCubeOutline, tone: '#e0822f' }
];

const ORDERS = [
  { id: '#1256', name: 'أحمد', type: 'توصيل', total: 185000, status: 'قيد التحضير', c: '#e0822f' },
  { id: '#1255', name: 'سارة', type: 'استلام', total: 72000, status: 'جاهز', c: '#117257' },
  { id: '#1254', name: 'طاولة 7', type: 'في المطعم', total: 140000, status: 'تم التقديم', c: '#6b7d75' },
  { id: '#1253', name: 'محمد', type: 'شحن', total: 260000, status: 'في الطريق', c: '#a95fcb' }
];

export const DashboardScreen: React.FC = () => {
  const nav = [
    { l: 'الرئيسية', i: IoHome },
    { l: 'الطلبات', i: IoReceiptOutline },
    { l: 'المنتجات', i: IoCubeOutline },
    { l: 'الزبائن', i: IoPeopleOutline },
    { l: 'الكوبونات', i: IoPricetagOutline },
    { l: 'التحليلات', i: IoStatsChartOutline },
    { l: 'الإعدادات', i: IoSettingsOutline }
  ];
  const line = 'M0 150 C 60 140, 90 90, 150 100 S 240 150, 300 90 S 400 40, 460 70 S 560 20, 620 30';
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#f4f7f3', color: '#10231b', fontFamily: 'Cairo, sans-serif' }}>
      <aside style={{ width: 230, background: 'linear-gradient(180deg,#084835,#042a1e)', color: '#e6f3ea', padding: '26px 16px', display: 'grid', alignContent: 'start', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px 22px', fontWeight: 900, fontSize: 19 }}>
          <span style={{ width: 36, height: 36, borderRadius: 12, background: '#cdef7c', color: '#084835', display: 'grid', placeItems: 'center' }}><IoBagHandle size={20} /></span>
          شام ستورز
        </div>
        {nav.map((n, i) => (
          <div key={n.l} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, fontSize: 15, fontWeight: 700, background: i === 0 ? 'rgba(205,239,124,0.14)' : 'transparent', color: i === 0 ? '#cdef7c' : 'rgba(230,243,234,0.7)' }}>
            <n.i size={19} /> {n.l}
          </div>
        ))}
      </aside>
      <div style={{ flex: 1, padding: '24px 30px', display: 'grid', gap: 20, alignContent: 'start' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>صباح الخير، متجر الشام 👋</div>
            <div style={{ fontSize: 14, color: '#6b7d75' }}>هذا ملخّص نشاطك اليوم</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ width: 300, height: 44, borderRadius: 14, background: '#fff', border: '1px solid rgba(8,72,53,0.1)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', color: '#6b7d75', fontSize: 14 }}><IoSearch /> بحث...</span>
            <span style={{ width: 44, height: 44, borderRadius: 14, background: '#fff', display: 'grid', placeItems: 'center', border: '1px solid rgba(8,72,53,0.1)' }}><IoNotificationsOutline size={20} /></span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {KPI.map((k) => (
            <div key={k.label} style={{ background: '#fff', borderRadius: 20, padding: 18, border: '1px solid rgba(8,72,53,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13.5, color: '#6b7d75' }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>{k.value}</div>
              </div>
              <span style={{ width: 46, height: 46, borderRadius: 15, background: k.tone + '18', color: k.tone, display: 'grid', placeItems: 'center' }}><k.icon size={22} /></span>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid rgba(8,72,53,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16 }}>
              <span>المبيعات — آخر ٣٠ يوماً</span>
              <span style={{ color: '#117257', fontSize: 14 }}>▲ 18%</span>
            </div>
            <svg viewBox="0 0 620 170" width="100%" height="170" style={{ marginTop: 10 }}>
              <defs>
                <linearGradient id="ssArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#117257" stopOpacity="0.28" />
                  <stop offset="1" stopColor="#117257" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${line} L620 170 L0 170 Z`} fill="url(#ssArea)" />
              <path d={line} fill="none" stroke="#084835" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid rgba(8,72,53,0.08)' }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>الطلبات حسب النوع</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 150 }}>
              {[70, 110, 45, 90, 130, 60].map((h, i) => (
                <div key={i} style={{ flex: 1, height: h, borderRadius: 10, background: i === 4 ? '#c07cdf' : i % 2 ? '#084835' : '#cdef7c' }} />
              ))}
            </div>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid rgba(8,72,53,0.08)' }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>أحدث الطلبات</div>
          {ORDERS.map((o) => (
            <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr 120px', alignItems: 'center', padding: '11px 0', borderTop: '1px solid rgba(8,72,53,0.07)', fontSize: 14 }}>
              <bdi className="latin" style={{ fontWeight: 800 }}>{o.id}</bdi>
              <span>{o.name}</span>
              <span style={{ color: '#6b7d75' }}>{o.type}</span>
              <b>{syp(o.total)}</b>
              <span style={{ justifySelf: 'start', padding: '4px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 800, background: o.c + '18', color: o.c }}>{o.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/** بطاقة واجهة متجرٍ على سطح المكتب — لقسم «متجرك على كلّ شاشة». */
export const StoreDesktopScreen: React.FC<{ theme?: MockTheme }> = ({ theme = THEMES.forest }) => (
  <div style={{ width: '100%', height: '100%', background: theme.bg, color: theme.text, fontFamily: 'Cairo, sans-serif' }}>
    <header style={{ height: 76, padding: '0 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: theme.surface, borderBottom: `1px solid ${theme.text}10` }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 900 }}>
        <span style={{ width: 40, height: 40, borderRadius: 13, background: theme.primary, color: theme.onPrimary, display: 'grid', placeItems: 'center' }}><IoBagHandle size={22} /></span>
        متجر الشام
      </span>
      <nav style={{ display: 'flex', gap: 30, fontSize: 16, fontWeight: 700, color: theme.muted }}>
        <span style={{ color: theme.text }}>الرئيسية</span><span>الأقسام</span><span>العروض</span><span>تواصل معنا</span>
      </nav>
      <span style={{ display: 'flex', gap: 16, color: theme.text }}><IoSearch size={22} /><IoHeartOutline size={22} /><IoBagHandle size={22} /></span>
    </header>
    <section style={{ margin: '28px 48px', height: 320, borderRadius: 32, overflow: 'hidden', position: 'relative', color: '#fff', background: `radial-gradient(60% 90% at 25% 30%, rgba(255,255,255,0.2), transparent 60%), linear-gradient(135deg, ${theme.hero[0]}, ${theme.hero[1]})` }}>
      <div style={{ position: 'absolute', insetInlineStart: 60, top: 70, maxWidth: 480 }}>
        <div style={{ fontSize: 16, opacity: 0.85 }}>مجموعة الخريف</div>
        <div style={{ fontSize: 48, fontWeight: 900, lineHeight: 1.2, margin: '6px 0 18px' }}>أزياء عصرية<br />بأسعار بالليرة</div>
        <span style={{ display: 'inline-block', background: '#fff', color: theme.primary, padding: '12px 28px', borderRadius: 999, fontWeight: 800, fontSize: 16 }}>تسوّق الآن</span>
      </div>
      <IoShirt size={260} style={{ position: 'absolute', insetInlineEnd: 90, bottom: -30, opacity: 0.3 }} />
    </section>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 18, padding: '0 48px' }}>
      {PRODUCTS.map((p) => <ProductCard key={p.name} p={p} theme={theme} />)}
    </div>
  </div>
);

