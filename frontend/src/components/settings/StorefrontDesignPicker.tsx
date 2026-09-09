// frontend/src/components/settings/StorefrontDesignPicker.tsx
//
// اختيار شكل واجهة المتجر — القالب والنماذج والاستدارات.
//
// **المعاينة ليست زينة.** التاجر لا يعرف الفرق بين «استدارة ١٦» و«استدارة
// ٢٤» من الرقم، ولا بين «بطاقة بغطاء» و«بطاقة قياسية» من الاسم. وبلا
// معاينةٍ كان سيحفظ ويفتح متجره ويعود ويحفظ ثانية — عشر مرّات.
//
// والمعاينة تُرسم **بألوان متجره هو**، لا بألوان اللوحة: نفس الاستدارة
// تبدو مختلفة تماماً على خلفيةٍ فاتحة وأخرى داكنة، ومعاينةٌ بألواننا كانت
// ستكذب عليه.
//
// **مشترَكٌ بين المتجر والمطعم عمداً:** الشاشتان منفصلتان في هذا المشروع
// وكل ميزةٍ تُكتب مرّتين تتفرّق نسختاها بعد شهر.

import React, { useMemo } from 'react';
import {
  IoSparklesOutline,
  IoGridOutline,
  IoDocumentTextOutline,
  IoMenuOutline,
  IoRefreshOutline,
  IoResizeOutline,
  IoImageOutline,
  IoLayersOutline
} from 'react-icons/io5';
import {
  PRESETS,
  LABELS,
  applyPreset,
  designVars,
  resolveDesign,
  type StorefrontDesign,
  type DesignPreset,
  type ShellVariant,
  type CardVariant,
  type ProductVariant,
  type NavVariant,
  type ShadowLevel,
  type Density,
  type Radii
} from '@/utils/storefrontDesign';
import { resolveTokens, type StorefrontBusiness } from '@/utils/storefrontTheme';

interface Props {
  value: unknown;
  onChange: (next: StorefrontDesign) => void;
  /** ألوان التاجر — تُرسم بها المعاينة */
  colors: StorefrontBusiness;
  kind: 'store' | 'restaurant';
  disabled?: boolean;
}

/** ألوان لوحة التاجر — ثابتة، فهذه شاشة إدارة لا واجهة متجر */
const C = {
  text: '#E8F5E9',
  muted: '#9DC4AC',
  card: '#112E23',
  surf: '#0F3D31',
  border: 'rgba(200,226,53,0.16)',
  accent: '#C8E235',
  bg: '#0A2018'
};

const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ icon, title, hint, children }) => (
  <div style={{ marginBottom: 26 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <span style={{ color: C.accent, display: 'grid', placeItems: 'center' }}>{icon}</span>
      <h3 style={{ color: C.text, fontSize: 14.5, fontWeight: 700, margin: 0 }}>{title}</h3>
    </div>
    {hint && <p style={{ color: C.muted, fontSize: 12.5, margin: '0 0 12px', lineHeight: 1.8 }}>{hint}</p>}
    {children}
  </div>
);

/** صفّ خياراتٍ متبادلة — يلتفّ على الجوال ولا يفيض */
const Choices = <T extends string>({
  options,
  labels,
  value,
  onPick,
  disabled
}: {
  options: T[];
  labels: Record<T, string>;
  value: T;
  onPick: (next: T) => void;
  disabled?: boolean;
}) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
    {options.map((option) => {
      const active = option === value;
      return (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => onPick(option)}
          aria-pressed={active}
          style={{
            flex: '1 1 110px',
            minWidth: 110,
            padding: '10px 12px',
            borderRadius: 12,
            border: `1px solid ${active ? C.accent : C.border}`,
            background: active ? C.accent : C.surf,
            color: active ? C.bg : C.text,
            fontWeight: active ? 800 : 600,
            fontSize: 13,
            fontFamily: 'inherit',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1
          }}
        >
          {labels[option]}
        </button>
      );
    })}
  </div>
);

const RADIUS_ORDER: Array<keyof Radii> = ['card', 'image', 'button', 'input', 'sheet', 'chip'];

const StorefrontDesignPicker: React.FC<Props> = ({ value, onChange, colors, kind, disabled }) => {
  const design = useMemo(() => resolveDesign(value), [value]);
  const tokens = useMemo(() => resolveTokens(colors, kind), [colors, kind]);

  const set = (patch: Partial<StorefrontDesign>) => onChange({ ...design, ...patch });
  const setRadius = (key: keyof Radii, next: number) =>
    onChange({ ...design, radii: { ...design.radii, [key]: next } });

  // متغيّرات المعاينة: نفس رموز الواجهة، لكن على عنصرٍ واحد لا على الجذر
  const previewStyle = {
    ...(designVars(design) as React.CSSProperties),
    ['--sf-accent' as any]: tokens.accent,
    background: tokens.bg,
    color: tokens.text
  } as React.CSSProperties;

  const presetDiffers =
    JSON.stringify({ ...PRESETS[design.preset] }) !==
    JSON.stringify({
      radii: design.radii,
      shadow: design.shadow,
      density: design.density,
      borderWidth: design.borderWidth
    });

  return (
    <div>
      {/* الهيكل أوّلاً: هو ما يغيّر الصفحة كلّها، والباقي يضبطه داخلها.
          **وللمتجر وحده اليوم:** واجهة المطعم مكوّنٌ مستقلّ (غلاف وبطاقة
          هوية وقائمة صفوف) لا تمرّ بهياكل المتجر. وعرضُ الخيار هناك كان
          سيَعِد بما لا يقع — وهو أسوأ من غيابه. */}
      {kind === 'store' && (
      <Section
        icon={<IoLayersOutline size={17} />}
        title="قالب الواجهة"
        hint="أكبر اختيار هنا — يغيّر بنية صفحة متجرك كلّها، لا شكل عناصرها فقط."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          {(['classic', 'boutique', 'showcase', 'landing'] as ShellVariant[]).map((option) => {
            const active = design.shell === option;
            return (
              <button
                key={option}
                type="button"
                disabled={disabled}
                onClick={() => set({ shell: option })}
                aria-pressed={active}
                style={{
                  padding: 10,
                  borderRadius: 14,
                  border: `1.5px solid ${active ? C.accent : C.border}`,
                  background: active ? 'rgba(200,226,53,0.09)' : C.surf,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'start',
                  opacity: disabled ? 0.6 : 1
                }}
              >
                <ShellThumb variant={option} tokens={tokens} />
                <div style={{ color: active ? C.accent : C.text, fontSize: 13.5, fontWeight: 800, marginTop: 9 }}>
                  {LABELS.shell[option]}
                </div>
                <div style={{ color: C.muted, fontSize: 11.5, lineHeight: 1.75, marginTop: 4 }}>
                  {LABELS.shellHint[option]}
                </div>
              </button>
            );
          })}
        </div>
      </Section>
      )}

      <Section
        icon={<IoSparklesOutline size={17} />}
        title="القالب"
        hint="يضبط الاستدارات والظلال والفراغات دفعةً واحدة. اختر واحداً ثمّ عدّل ما تشاء تحته."
      >
        <Choices
          options={['modern', 'minimal', 'bold'] as DesignPreset[]}
          labels={LABELS.preset}
          value={design.preset}
          onPick={(preset) => onChange(applyPreset(design, preset))}
          disabled={disabled}
        />
        {presetDiffers && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(applyPreset(design, design.preset))}
            style={{
              marginTop: 10,
              background: 'transparent',
              border: `1px solid ${C.border}`,
              color: C.muted,
              borderRadius: 10,
              padding: '7px 12px',
              fontSize: 12,
              fontFamily: 'inherit',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <IoRefreshOutline size={13} /> أعِد قيم قالب «{LABELS.preset[design.preset]}»
          </button>
        )}
      </Section>

      {/* المعاينة أعلى التفاصيل لا أسفلها: من يعدّل الاستدارة يريد أن
          يراها وهو يعدّلها، لا أن ينزل بحثاً عنها */}
      <div
        style={{
          ...previewStyle,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 16,
          marginBottom: 26,
          overflow: 'hidden'
        }}
      >
        <div style={{ color: tokens.muted, fontSize: 11.5, marginBottom: 12, fontWeight: 700 }}>
          معاينة — بألوان {kind === 'store' ? 'متجرك' : 'مطعمك'}
        </div>

        <PreviewShell design={kind === 'store' ? design : { ...design, shell: 'classic' }} tokens={tokens} kind={kind} />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: `var(--sf-gap)`,
            marginTop: 'var(--sf-gap)'
          }}
        >
          <PreviewCard design={design} tokens={tokens} title="منتج نموذجي" price="45,000" />
          <PreviewCard design={design} tokens={tokens} title="منتج آخر" price="12,500" />
        </div>
      </div>

      <Section
        icon={<IoGridOutline size={17} />}
        title="شكل بطاقة المنتج"
        hint="«صورة بغطاء» تضع الاسم والسعر فوق الصورة — أجمل للصور القوية. و«مضغوطة» تُظهر منتجاتٍ أكثر في الشاشة."
      >
        <Choices
          options={['standard', 'overlay', 'compact'] as CardVariant[]}
          labels={LABELS.card}
          value={design.card}
          onPick={(card) => set({ card })}
          disabled={disabled}
        />
      </Section>

      <Section
        icon={<IoDocumentTextOutline size={17} />}
        title="شكل صفحة المنتج"
        hint="«منقسمة» تضع الصورة والتفاصيل جنباً إلى جنب على الشاشات الكبيرة. و«غامرة» تبدأ بصورةٍ بعرض الشاشة."
      >
        <Choices
          options={['classic', 'split', 'immersive'] as ProductVariant[]}
          labels={LABELS.product}
          value={design.product}
          onPick={(product) => set({ product })}
          disabled={disabled}
        />
      </Section>

      {/* لا يُعرض إلا مع «كلاسيكي»: القالبان الآخران بلا شريطٍ يُنمَّط،
          وعرضُ خيارٍ لا أثر له يجعل التاجر يظنّ الميزة معطّلة */}
      {(kind === 'restaurant' || design.shell === 'classic') && (
        <Section
          icon={<IoMenuOutline size={17} />}
          title="شكل الشريط العلوي"
          hint="«عائم» يفصل الشريط عن حافّة الشاشة بظلّ. و«بسيط» يزيل خلفيته فيندمج مع الصفحة."
        >
          <Choices
            options={['solid', 'floating', 'minimal'] as NavVariant[]}
            labels={LABELS.nav}
            value={design.nav}
            onPick={(nav) => set({ nav })}
            disabled={disabled}
          />
        </Section>
      )}

      <Section
        icon={<IoResizeOutline size={17} />}
        title="الاستدارات"
        hint="بالبكسل. الصفر زوايا حادّة تماماً، والقيمة الكبيرة تجعل العنصر كبسولة."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
          {RADIUS_ORDER.map((key) => (
            <div key={key}>
              <label
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: C.muted,
                  fontSize: 12.5,
                  marginBottom: 6
                }}
              >
                <span>{LABELS.radii[key]}</span>
                <span style={{ color: C.accent, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {design.radii[key]}
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={40}
                step={1}
                disabled={disabled}
                // الشريط يقف عند ٤٠ والقيمة قد تكون ٩٩٩ («كبسولة») —
                // فتُعرض عند طرفه بدل أن تختفي
                value={Math.min(design.radii[key], 40)}
                onChange={(e) => setRadius(key, Number(e.target.value))}
                style={{ width: '100%', accentColor: C.accent, cursor: disabled ? 'not-allowed' : 'pointer' }}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section icon={<IoImageOutline size={17} />} title="الظلّ والكثافة">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ color: C.muted, fontSize: 12.5, marginBottom: 8 }}>الظلّ</div>
            <Choices
              options={['none', 'soft', 'strong'] as ShadowLevel[]}
              labels={LABELS.shadow}
              value={design.shadow}
              onPick={(shadow) => set({ shadow })}
              disabled={disabled}
            />
          </div>
          <div>
            <div style={{ color: C.muted, fontSize: 12.5, marginBottom: 8 }}>الكثافة</div>
            <Choices
              options={['compact', 'cozy', 'roomy'] as Density[]}
              labels={LABELS.density}
              value={design.density}
              onPick={(density) => set({ density })}
              disabled={disabled}
            />
          </div>
        </div>
      </Section>
    </div>
  );
};

type Tokens = ReturnType<typeof resolveTokens>;

/**
 * رسمةٌ مصغَّرة لكل قالبِ واجهة.
 *
 * **مجرّدة عمداً — لا لقطةُ شاشة.** اللقطة تحتاج توليداً وتخزيناً وتقادم مع
 * كل تعديل. وهذه مستطيلاتٌ بألوان التاجر تقول ما يحتاج أن يُقال: أين
 * الشريط، وأين الهوية، وكم تأخذ الصورة.
 */
const ShellThumb: React.FC<{ variant: ShellVariant; tokens: Tokens }> = ({ variant, tokens }) => {
  const box: React.CSSProperties = {
    background: tokens.bg,
    border: `1px solid ${tokens.border}`,
    borderRadius: 9,
    height: 92,
    padding: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    overflow: 'hidden'
  };
  const bar = (h: number, bg: string, extra?: React.CSSProperties) => (
    <div style={{ height: h, background: bg, borderRadius: 3, flexShrink: 0, ...extra }} />
  );
  const grid = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, flex: 1 }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ background: tokens.card, borderRadius: 3 }} />
      ))}
    </div>
  );

  if (variant === 'boutique') {
    return (
      <div style={{ ...box, alignItems: 'center' }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: tokens.accent, marginTop: 2, flexShrink: 0 }} />
        {bar(3, tokens.muted, { width: 34, marginTop: 1 })}
        {bar(2, tokens.border, { width: 52 })}
        {bar(7, tokens.surface, { width: '100%', borderRadius: 999, marginTop: 2 })}
        <div style={{ display: 'flex', gap: 3, width: '100%' }}>
          {[0, 1, 2].map((i) => bar(5, i === 0 ? tokens.accent : tokens.card, { flex: 1, borderRadius: 999 }))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, width: '100%', flex: 1 }}>
          {[0, 1].map((i) => (
            <div key={i} style={{ background: tokens.card, borderRadius: 3 }} />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'landing') {
    return (
      <div style={box}>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: tokens.accent }} />
          <div style={{ flex: 1 }} />
          <span style={{ width: 7, height: 7, borderRadius: 2, background: tokens.surface }} />
          <span style={{ width: 7, height: 7, borderRadius: 2, background: tokens.accent }} />
        </div>
        {/* صفّ الفئات */}
        <div style={{ display: 'flex', gap: 3, flexShrink: 0, marginTop: 1 }}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} style={{ width: 14, height: 14, borderRadius: 4, background: i === 0 ? tokens.accent : tokens.card }} />
          ))}
        </div>
        {/* صفّان معنونان */}
        {[0, 1].map((row) => (
          <div key={row} style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ display: 'block', width: 20, height: 2.5, background: tokens.text, borderRadius: 2 }} />
              <span style={{ display: 'block', width: 11, height: 2.5, background: tokens.accent, borderRadius: 2 }} />
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ flex: 1, height: 15, borderRadius: 3, background: tokens.card }} />
              ))}
              <span style={{ width: 5, height: 15, borderRadius: 3, background: tokens.card, opacity: 0.5 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'showcase') {
    return (
      <div style={{ ...box, padding: 0, gap: 0 }}>
        <div
          style={{
            height: 42,
            background: `linear-gradient(160deg, ${tokens.primary}, ${tokens.accent})`,
            position: 'relative',
            flexShrink: 0
          }}
        >
          <div style={{ position: 'absolute', top: 4, insetInlineEnd: 4, display: 'flex', gap: 2 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.75)' }} />
            ))}
          </div>
          <div style={{ position: 'absolute', bottom: 4, insetInlineStart: 5, width: 26, height: 3, background: '#fff', borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', gap: 3, padding: '4px 6px', flexShrink: 0 }}>
          {[0, 1].map((i) => bar(11, tokens.card, { flex: 1, borderRadius: 3 }))}
        </div>
        <div style={{ padding: '0 6px 6px', flex: 1, display: 'flex' }}>{grid}</div>
      </div>
    );
  }

  // كلاسيكي
  return (
    <div style={box}>
      <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: tokens.accent }} />
        {bar(6, tokens.surface, { flex: 1, borderRadius: 999 })}
        <span style={{ width: 8, height: 8, borderRadius: 2, background: tokens.surface }} />
      </div>
      {bar(20, `linear-gradient(120deg, ${tokens.primary}, ${tokens.accent})`, { marginTop: 1 })}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} style={{ width: 11, height: 11, borderRadius: 4, background: i === 0 ? tokens.accent : tokens.card }} />
        ))}
      </div>
      {grid}
    </div>
  );
};

/** رأسٌ مصغَّر في المعاينة — يتبع الهيكل المختار لا شكل الشريط وحده */
const PreviewShell: React.FC<{
  design: StorefrontDesign;
  tokens: Tokens;
  kind: 'store' | 'restaurant';
}> = ({ design, tokens, kind }) => {
  if (design.shell === 'boutique') {
    return (
      <div style={{ textAlign: 'center', paddingBottom: 4 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: tokens.accent,
            margin: '0 auto'
          }}
        />
        <div style={{ color: tokens.text, fontSize: 13, fontWeight: 800, marginTop: 7 }}>
          {kind === 'store' ? 'اسم المتجر' : 'اسم المطعم'}
        </div>
        <div style={{ color: tokens.muted, fontSize: 10.5, marginTop: 3 }}>سطرٌ يعرّف بنشاطك</div>
        <div
          style={{
            marginTop: 9,
            height: 30,
            borderRadius: 'var(--sf-r-chip)',
            background: tokens.surface,
            border: `var(--sf-border-w) solid ${tokens.border}`
          }}
        />
      </div>
    );
  }

  if (design.shell === 'landing') {
    return (
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingBottom: 9,
            borderBottom: `var(--sf-border-w) solid ${tokens.border}`
          }}
        >
          <span style={{ width: 22, height: 22, borderRadius: 'var(--sf-r-image)', background: tokens.accent }} />
          <span style={{ flex: 1, color: tokens.text, fontSize: 12.5, fontWeight: 800 }}>
            {kind === 'store' ? 'اسم المتجر' : 'اسم المطعم'}
          </span>
          <span
            style={{
              background: tokens.accent,
              color: tokens.onAccent,
              borderRadius: 'var(--sf-r-button)',
              padding: '3px 9px',
              fontSize: 10,
              fontWeight: 800
            }}
          >
            السلّة
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 11 }}>
          <span style={{ color: tokens.text, fontSize: 12.5, fontWeight: 800 }}>الجديد</span>
          <span style={{ color: tokens.accent, fontSize: 10.5, fontWeight: 700 }}>عرض الكل ‹</span>
        </div>
      </div>
    );
  }

  if (design.shell === 'showcase') {
    return (
      <div
        style={{
          height: 74,
          borderRadius: 'var(--sf-r-card)',
          background: `linear-gradient(150deg, ${tokens.primary}, ${tokens.accent})`,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', top: 7, insetInlineEnd: 7, display: 'flex', gap: 5 }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 15,
                height: 15,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.34)',
                border: '1px solid rgba(255,255,255,0.3)'
              }}
            />
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: 8, insetInlineStart: 10, color: '#fff', fontSize: 13, fontWeight: 900 }}>
          {kind === 'store' ? 'اسم المتجر' : 'اسم المطعم'}
        </div>
      </div>
    );
  }

  return <PreviewNav design={design} tokens={tokens} />;
};

/** شريطٌ مصغَّر يعكس النموذج المختار */
const PreviewNav: React.FC<{ design: StorefrontDesign; tokens: Tokens }> = ({
  design,
  tokens
}) => {
  const floating = design.nav === 'floating';
  const minimal = design.nav === 'minimal';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '9px 11px',
        background: minimal ? 'transparent' : tokens.card,
        border: minimal ? 'none' : `var(--sf-border-w) solid ${tokens.border}`,
        borderRadius: floating ? 'var(--sf-r-card)' : minimal ? 0 : 'calc(var(--sf-r-card) / 2)',
        boxShadow: floating ? 'var(--sf-shadow-pop)' : 'none',
        margin: floating ? '0 4px' : 0
      }}
    >
      <div style={{ width: 26, height: 26, borderRadius: 'var(--sf-r-image)', background: tokens.accent }} />
      <div style={{ color: tokens.text, fontSize: 12.5, fontWeight: 700, flex: 1 }}>اسم المتجر</div>
      <div
        style={{
          background: tokens.surface,
          borderRadius: 'var(--sf-r-chip)',
          padding: '4px 12px',
          fontSize: 10.5,
          color: tokens.muted
        }}
      >
        السلّة
      </div>
    </div>
  );
};

/** بطاقةٌ مصغَّرة تعكس نموذج البطاقة والاستدارات والظلّ */
const PreviewCard: React.FC<{
  design: StorefrontDesign;
  tokens: Tokens;
  title: string;
  price: string;
}> = ({ design, tokens, title, price }) => {
  const overlay = design.card === 'overlay';
  const compact = design.card === 'compact';

  const body = (
    <>
      <div
        style={{
          color: overlay ? '#fff' : tokens.text,
          fontSize: 12,
          fontWeight: 700,
          marginBottom: 3,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ color: overlay ? '#fff' : tokens.accent, fontSize: 12, fontWeight: 800 }}>{price}</span>
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: 'var(--sf-r-button)',
            background: tokens.accent,
            color: tokens.onAccent,
            display: 'grid',
            placeItems: 'center',
            fontSize: 15,
            fontWeight: 800,
            lineHeight: 1
          }}
        >
          +
        </span>
      </div>
    </>
  );

  return (
    <div
      style={{
        background: overlay ? tokens.surface : tokens.card,
        border: `var(--sf-border-w) solid ${tokens.border}`,
        borderRadius: 'var(--sf-r-card)',
        boxShadow: 'var(--sf-shadow-card)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <div
        style={{
          width: '100%',
          paddingTop: overlay ? '112%' : compact ? '66%' : '86%',
          background: `linear-gradient(135deg, ${tokens.surface}, ${tokens.card})`,
          position: 'relative'
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 6,
            insetInlineStart: 6,
            background: tokens.accent,
            color: tokens.onAccent,
            borderRadius: 'var(--sf-r-chip)',
            padding: '1px 7px',
            fontSize: 9,
            fontWeight: 800
          }}
        >
          خصم
        </span>
        {overlay && (
          <div
            style={{
              position: 'absolute',
              insetInline: 0,
              bottom: 0,
              padding: 'var(--sf-pad-card)',
              paddingTop: 22,
              background: 'linear-gradient(to top, rgba(0,0,0,0.86), transparent)'
            }}
          >
            {body}
          </div>
        )}
      </div>
      {!overlay && <div style={{ padding: 'var(--sf-pad-card)' }}>{body}</div>}
    </div>
  );
};

export default StorefrontDesignPicker;
