// frontend/src/components/storefront/InstallAppPrompt.tsx
//
// دعوة الزبون إلى تثبيت **متجر التاجر** على شاشته الرئيسية.
//
// **لماذا هذا ليس تزييناً:** على iPhone لا توجد إشعارات ويبٍ إطلاقاً قبل
// التثبيت — قيدٌ من Apple لا حيلة فيه. فالزبون الذي لا يُعرض عليه التثبيت
// هو زبونٌ لن تصله حملةٌ ولا تحديثُ طلب، مهما كان الخادم مضبوطاً.
//
// **ولا يظهر إلا لمتجرٍ اشترى الميزة:** البيان نفسه يرتدّ ٤٠٤ لغيره، فلا
// فائدة من زرٍّ يفتح نافذةً لا تجد ما تثبّته.

import React, { useCallback, useEffect, useState } from 'react';
import { IoClose, IoShareOutline, IoAddCircleOutline, IoDownloadOutline, IoEllipsisVertical } from 'react-icons/io5';
import { isInstalled, isIosDevice } from '../../services/webPush';
import { canPromptInstall, onInstallStateChange, promptInstall } from '../../utils/installPrompt';

const DISMISS_KEY = 'sham_install_prompt_dismissed_at';

/**
 * التأجيل لا الإخفاء الأبديّ.
 *
 * من أغلق الدعوة اليوم قد يثبّت بعد أسبوع حين يكون قد طلب مرّتين. لكن
 * إعادتها في الزيارة التالية مباشرةً إزعاجٌ يُغلق الموقع لا يفتحه.
 */
const DISMISS_DAYS = 14;

const wasDismissedRecently = (): boolean => {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    // وضع التصفّح الخاص يرمي عند القراءة — والدعوة تُعرض، وهو الخطأ الأرحم
    return false;
  }
};

const rememberDismissal = () => {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* لا شيء يُفعل — الإغلاق يعمل لهذه الجلسة على الأقلّ */
  }
};

type Sheet = null | 'ios' | 'manual';

export interface PromptTheme {
  primary: string;
  background: string;
  accent: string;
  text: string;
  card: string;
  muted: string;
}

/** ألوان المنصّة — تُستعمل فقط حين لا هوية للمتجر بعد */
const FALLBACK: PromptTheme = {
  primary: '#0D4A3A',
  background: '#082E24',
  accent: '#C8E235',
  text: '#E8F5E9',
  card: '#112E23',
  muted: '#9DC4AC'
};

interface Props {
  /** اسم المتجر — الدعوة باسمه لا باسم المنصّة: الزبون يثبّت متجره */
  businessName?: string;
  /** لا تُعرض الدعوة قبل تأكيد أن المتجر اشترى الميزة */
  enabled?: boolean;
  /**
   * هوية المتجر.
   *
   * **النافذة التي تدعو إلى تثبيت متجرٍ يجب أن تبدو منه.** ألوانٌ ثابتة
   * تخصّ المنصّة تجعل الدعوة تبدو إعلاناً من طرفٍ ثالث اقتحم الصفحة —
   * وذلك يُغلَق لا يُنقَر.
   */
  theme?: PromptTheme | null;
}

const InstallAppPrompt: React.FC<Props> = ({ businessName, enabled = false, theme }) => {
  const t = theme ?? FALLBACK;
  const [, setReady] = useState(canPromptInstall());
  const [sheet, setSheet] = useState<Sheet>(null);
  const [visible, setVisible] = useState(false);

  const ios = isIosDevice();

  useEffect(() => {
    if (!enabled) { setVisible(false); return; }

    // مَخرجٌ للتجربة والمعاينة: `?install=1` يتخطّى التأجيل المحفوظ.
    // بدونه كان التاجر الذي أغلق الدعوة مرّةً لا يراها أسبوعين، فيظنّها
    // معطّلة — وهو أوّل من يحتاج رؤيتها ليقرّر شراء الميزة.
    const forced = new URLSearchParams(window.location.search).get('install') === '1';
    if (forced) {
      try { localStorage.removeItem(DISMISS_KEY); } catch { /* تصفّح خاصّ */ }
    }

    if (isInstalled()) return;
    if (!forced && wasDismissedRecently()) return;

    // الحدث قد يكون وصل **قبل** تركيب هذا المكوّن — يُلتقط في
    // `utils/installPrompt` عند إقلاع التطبيق، ويُقرأ من هناك لا يُنتظر
    const sync = () => {
      const can = canPromptInstall();
      setReady(can);
      if (can) setVisible(true);
    };
    sync();
    const unsubscribe = onInstallStateChange(sync);

    // **تُعرض بعد مهلةٍ حتى لو لم يصل الحدث.**
    //
    // كان الشريط لا يظهر إلا بحدث كروم، وiOS لا يطلقه أبداً، وكروم نفسه
    // قد لا يطلقه (تطبيقٌ مثبَّت في ملفٍّ شخصيّ آخر، أو تقييمٌ داخليّ).
    // فكانت النتيجة «لا يظهر أبداً» بلا أن يُعرف السبب. الآن يظهر، والنقرة
    // تُعطي النافذة إن توفّرت والشرحَ اليدويّ إن لم تتوفّر.
    const delay = ios ? 6000 : 8000;
    const timer = window.setTimeout(() => setVisible(true), delay);

    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, [enabled, ios]);

  const dismiss = useCallback(() => {
    rememberDismissal();
    setVisible(false);
    setSheet(null);
  }, []);

  /**
   * **النقرة لا تصمت أبداً.**
   *
   * الصمت كان العطل الأصلي: نقرةٌ على «تثبيت» تصادف حالةً لا نافذة فيها
   * فترتدّ بلا شيء — لا نافذة ولا رسالة. الآن لكل حالةٍ مخرجٌ مرئيّ.
   */
  const install = useCallback(async () => {
    if (ios) { setSheet('ios'); return; }

    const outcome = await promptInstall();
    if (outcome === 'accepted') { setVisible(false); return; }
    if (outcome === 'dismissed') { rememberDismissal(); setVisible(false); return; }

    // لا نافذة متاحة: متصفّحٌ لا يدعمها، أو حدثٌ استُهلك. الشرح اليدويّ
    // أنفع من زرٍّ لا يفعل شيئاً
    setSheet('manual');
  }, [ios]);

  if (!enabled || !visible) return null;

  const styles = makeStyles(t);
  const label = businessName ? `ثبّت ${businessName}` : 'ثبّت المتجر';

  return (
    <>
      <div style={styles.bar} role="region" aria-label="تثبيت التطبيق">
        <div style={styles.iconWrap}>
          <IoDownloadOutline size={20} color={t.accent} />
        </div>
        <div style={styles.text}>
          <div style={styles.title}>{label} على هاتفك</div>
          <div style={styles.sub}>
            {ios ? 'خطوتان فقط — ولتصلك إشعارات طلبك' : 'يفتح بضغطة، وتصلك إشعارات طلبك'}
          </div>
        </div>
        <button type="button" onClick={install} style={styles.cta}>
          تثبيت
        </button>
        <button type="button" onClick={dismiss} style={styles.close} aria-label="إغلاق">
          <IoClose size={18} />
        </button>
      </div>

      {sheet !== null && (
        <div style={styles.overlay} onClick={dismiss} role="dialog" aria-modal="true">
          <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
            {sheet === 'ios' ? (
              <>
                <div style={styles.sheetTitle}>التثبيت على iPhone</div>
                <p style={styles.sheetHint}>
                  نظام iPhone لا يسمح بالتثبيت التلقائي، ولا تصلك الإشعارات قبله.
                  والخطوتان تُنجزان مرّةً واحدة:
                </p>
                <Step n={1} icon={<IoShareOutline size={19} color={t.accent} />}
                  text="اضغط زرّ المشاركة في شريط سفاري بالأسفل" s={styles} />
                <Step n={2} icon={<IoAddCircleOutline size={19} color={t.accent} />}
                  text="اختر «إضافة إلى الشاشة الرئيسية» ثم «إضافة»" s={styles} />
                <p style={styles.sheetFoot}>
                  بعدها افتح المتجر من الأيقونة الجديدة، وفعّل الإشعارات من داخله.
                </p>
              </>
            ) : (
              <>
                <div style={styles.sheetTitle}>التثبيت من المتصفّح</div>
                <p style={styles.sheetHint}>
                  متصفّحك لم يتح نافذة التثبيت التلقائية الآن. تستطيع تثبيته يدوياً:
                </p>
                <Step n={1} icon={<IoEllipsisVertical size={19} color={t.accent} />}
                  text="افتح قائمة المتصفّح (⋮) في الأعلى" s={styles} />
                <Step n={2} icon={<IoAddCircleOutline size={19} color={t.accent} />}
                  text="اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»" s={styles} />
                <p style={styles.sheetFoot}>
                  إن لم تجد الخيار، جرّب فتح المتجر في متصفّح Chrome.
                </p>
              </>
            )}

            <button type="button" onClick={dismiss}
              style={{ ...styles.cta, width: '100%', marginTop: 6 }}>
              فهمت
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const Step: React.FC<{
  n: number;
  icon: React.ReactNode;
  text: string;
  s: Record<string, React.CSSProperties>;
}> = ({ n, icon, text, s }) => (
  <div style={s.step}>
    <div style={s.stepNum}>{n}</div>
    <div style={s.stepIcon}>{icon}</div>
    <div style={s.stepText}>{text}</div>
  </div>
);

/**
 * الأنماط دالّةٌ لا ثابت.
 *
 * ألوان المتجر تصل وقت التصيير، ولوحُ ألوانٍ ثابت كان يجعل نافذة تثبيت
 * متجرٍ أحمرَ الهوية تظهر بأخضر المنصّة — فتبدو إعلاناً من طرفٍ ثالث.
 */
const makeStyles = (t: PromptTheme): Record<string, React.CSSProperties> => ({
  bar: {
    position: 'fixed',
    // فوق شريط التنقّل السفلي في واجهة المتجر لا تحته
    bottom: 'calc(env(safe-area-inset-bottom, 0px) + 74px)',
    insetInlineStart: 12,
    insetInlineEnd: 12,
    zIndex: 1400,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 16,
    background: t.background,
    border: `1px solid ${t.accent}47`,
    boxShadow: '0 8px 28px rgba(0,0,0,0.34)'
  },
  iconWrap: { width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: `${t.accent}22` },
  text: { flex: 1, minWidth: 0 },
  title: { color: t.text, fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  sub: { color: t.muted, fontSize: 11.5, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  cta: {
    border: 'none', borderRadius: 11, padding: '9px 16px',
    background: t.accent,
    // النصّ يُقرأ على أي لون: لونٌ ثابت على خلفيةٍ يختارها التاجر قد
    // يصير أبيضَ على أصفر
    color: readableOn(t.accent),
    fontSize: 13, fontWeight: 800, cursor: 'pointer', flexShrink: 0
  },
  close: { background: 'transparent', border: 'none', color: t.muted, cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 },
  overlay: { position: 'fixed', inset: 0, zIndex: 1500, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: {
    width: '100%', maxWidth: 460, background: t.card,
    borderRadius: '20px 20px 0 0',
    padding: '20px 18px calc(env(safe-area-inset-bottom, 0px) + 20px)',
    border: `1px solid ${t.accent}33`
  },
  sheetTitle: { color: t.text, fontSize: 16, fontWeight: 800, marginBottom: 8 },
  sheetHint: { color: t.muted, fontSize: 13, lineHeight: 1.8, margin: '0 0 14px' },
  sheetFoot: { color: t.muted, fontSize: 12.5, lineHeight: 1.8, margin: '12px 0 0' },
  step: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0' },
  stepNum: {
    width: 22, height: 22, borderRadius: '50%', background: `${t.accent}29`,
    color: t.accent, fontSize: 12, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
  },
  stepIcon: { display: 'flex', flexShrink: 0 },
  stepText: { color: t.text, fontSize: 13.5, lineHeight: 1.6 }
});

/**
 * أسودُ أم أبيض فوق هذا اللون؟
 *
 * صيغة السطوع المُدرَك (ITU-R BT.601): الأخضر يُرى أسطع من الأزرق بنفس
 * القيمة. ولونٌ ثابت للنصّ كان يجعل زرّ متجرٍ أصفرَ الهوية غير مقروء.
 */
const readableOn = (hex: string): string => {
  const value = hex.replace('#', '');
  if (value.length !== 6) return '#0A2018';
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? '#101010' : '#FFFFFF';
};

export default InstallAppPrompt;
