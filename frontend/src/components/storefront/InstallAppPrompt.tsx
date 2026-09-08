// frontend/src/components/storefront/InstallAppPrompt.tsx
//
// دعوة الزبون إلى تثبيت المتجر على شاشته الرئيسية.
//
// **لماذا هذا ليس تزييناً:** على iPhone لا توجد إشعارات ويبٍ إطلاقاً قبل
// التثبيت — قيدٌ من Apple لا حيلة فيه. فالزبون الذي لا يُعرض عليه التثبيت
// هو زبونٌ لن تصله حملةٌ ولا تحديثُ طلب، مهما كان الخادم مضبوطاً.
//
// وعلى أندرويد التثبيت اختياريّ لكنه يحوّل المتجر من عنوانٍ يُكتب إلى
// أيقونةٍ تُنقر — والفرق بينهما هو الفرق بين زبونٍ يعود وزبونٍ ينسى.

import React, { useCallback, useEffect, useState } from 'react';
import { IoClose, IoShareOutline, IoAddCircleOutline, IoDownloadOutline } from 'react-icons/io5';
import { isInstalled, isIosDevice } from '../../services/webPush';

/** حدث كروم غير القياسي — ليس في مكتبة أنواع DOM */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

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
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
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

interface Props {
  /** اسم المتجر — الدعوة باسمه لا باسم المنصّة: الزبون يثبّت متجره لا منصّتنا */
  businessName?: string;
  /** لونٌ أساسي من هوية المتجر، إن وُجد */
  accentColor?: string;
}

const InstallAppPrompt: React.FC<Props> = ({ businessName, accentColor = '#C8E235' }) => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosSheet, setShowIosSheet] = useState(false);
  const [visible, setVisible] = useState(false);

  const ios = isIosDevice();

  useEffect(() => {
    if (isInstalled() || wasDismissedRecently()) return;

    // أندرويد/كروم: المتصفّح يُعلمنا حين يصير التثبيت ممكناً. نحتجز الحدث
    // لنعرضه في لحظةٍ نختارها بدل شريط المتصفّح الذي يُتجاهَل.
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // iOS لا يطلق ذلك الحدث أبداً — لا توجد واجهة تثبيت برمجية عليه، فلا
    // مفرّ من شرح الخطوات يدوياً. التأخير يترك الزبون يرى المتجر أوّلاً.
    let timer: number | undefined;
    if (ios) {
      timer = window.setTimeout(() => setVisible(true), 6000);
    }

    const onInstalled = () => setVisible(false);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      if (timer) window.clearTimeout(timer);
    };
  }, [ios]);

  const dismiss = useCallback(() => {
    rememberDismissal();
    setVisible(false);
    setShowIosSheet(false);
  }, []);

  const install = useCallback(async () => {
    if (ios) {
      setShowIosSheet(true);
      return;
    }
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      // الرفض يُسجَّل تأجيلاً: من رفض نافذة النظام لا يُسأل غداً
      if (choice.outcome === 'dismissed') rememberDismissal();
      setVisible(false);
      setDeferred(null);
    } catch (error) {
      console.warn('install prompt failed:', error);
      setVisible(false);
    }
  }, [deferred, ios]);

  if (!visible) return null;

  const label = businessName ? `ثبّت ${businessName}` : 'ثبّت المتجر';

  return (
    <>
      <div style={styles.bar} role="region" aria-label="تثبيت التطبيق">
        <div style={{ ...styles.iconWrap, background: `${accentColor}22` }}>
          <IoDownloadOutline size={20} color={accentColor} />
        </div>
        <div style={styles.text}>
          <div style={styles.title}>{label} على هاتفك</div>
          <div style={styles.sub}>
            {ios
              ? 'خطوتان فقط — ولتصلك إشعارات طلبك'
              : 'يفتح بضغطة، وتصلك إشعارات طلبك'}
          </div>
        </div>
        <button
          type="button"
          onClick={install}
          style={{ ...styles.cta, background: accentColor }}
        >
          تثبيت
        </button>
        <button
          type="button"
          onClick={dismiss}
          style={styles.close}
          aria-label="إغلاق"
        >
          <IoClose size={18} />
        </button>
      </div>

      {showIosSheet && (
        <div style={styles.overlay} onClick={dismiss} role="dialog" aria-modal="true">
          <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.sheetTitle}>التثبيت على iPhone</div>
            <p style={styles.sheetHint}>
              نظام iPhone لا يسمح بالتثبيت التلقائي، ولا تصلك الإشعارات قبله.
              والخطوتان تُنجزان مرّةً واحدة:
            </p>

            <Step
              n={1}
              icon={<IoShareOutline size={19} color={accentColor} />}
              text="اضغط زرّ المشاركة في شريط سفاري بالأسفل"
            />
            <Step
              n={2}
              icon={<IoAddCircleOutline size={19} color={accentColor} />}
              text="اختر «إضافة إلى الشاشة الرئيسية» ثم «إضافة»"
            />

            <p style={styles.sheetFoot}>
              بعدها افتح المتجر من الأيقونة الجديدة، وفعّل الإشعارات من داخله.
            </p>

            <button type="button" onClick={dismiss} style={{ ...styles.cta, background: accentColor, width: '100%', marginTop: 6 }}>
              فهمت
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const Step: React.FC<{ n: number; icon: React.ReactNode; text: string }> = ({ n, icon, text }) => (
  <div style={styles.step}>
    <div style={styles.stepNum}>{n}</div>
    <div style={styles.stepIcon}>{icon}</div>
    <div style={styles.stepText}>{text}</div>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
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
    background: 'rgba(8, 46, 36, 0.97)',
    border: '1px solid rgba(200, 226, 53, 0.28)',
    boxShadow: '0 8px 28px rgba(0,0,0,0.34)',
    backdropFilter: 'blur(8px)',
  },
  iconWrap: {
    width: 38, height: 38, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  text: { flex: 1, minWidth: 0 },
  title: { color: '#E8F5E9', fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  sub: { color: '#9DC4AC', fontSize: 11.5, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  cta: {
    border: 'none', borderRadius: 11, padding: '9px 16px',
    color: '#0A2018', fontSize: 13, fontWeight: 800, cursor: 'pointer', flexShrink: 0,
  },
  close: {
    background: 'transparent', border: 'none', color: '#9DC4AC',
    cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0,
  },
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1500,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  sheet: {
    width: '100%', maxWidth: 460,
    background: '#112E23',
    borderRadius: '20px 20px 0 0',
    padding: '20px 18px calc(env(safe-area-inset-bottom, 0px) + 20px)',
    border: '1px solid rgba(200, 226, 53, 0.2)',
  },
  sheetTitle: { color: '#E8F5E9', fontSize: 16, fontWeight: 800, marginBottom: 8 },
  sheetHint: { color: '#9DC4AC', fontSize: 13, lineHeight: 1.8, margin: '0 0 14px' },
  sheetFoot: { color: '#9DC4AC', fontSize: 12.5, lineHeight: 1.8, margin: '12px 0 0' },
  step: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0' },
  stepNum: {
    width: 22, height: 22, borderRadius: '50%', background: 'rgba(200,226,53,0.16)',
    color: '#C8E235', fontSize: 12, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepIcon: { display: 'flex', flexShrink: 0 },
  stepText: { color: '#E8F5E9', fontSize: 13.5, lineHeight: 1.6 },
};

export default InstallAppPrompt;
