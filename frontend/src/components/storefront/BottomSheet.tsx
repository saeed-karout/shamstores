// frontend/src/components/storefront/BottomSheet.tsx
// لوح سفلي عام: بوابة DOM، خلفية معتمة، إغلاق بـ Escape، قفل تمرير الصفحة.
//
// ملاحظة تصميمية: دورة الظهور/الاختفاء تُدار هنا بحالة محلية ومؤقّت صريح،
// لا عبر AnimatePresence. المحاولة الأولى استخدمتها فبقي الغلاف الشفاف
// (position: fixed; inset: 0) مثبّتاً فوق الصفحة بعد الإغلاق ويبتلع كل
// النقرات، لأن حركة الخروج النابضة على قيمة نسبية لا تُبلّغ عن اكتمالها.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { IoClose } from 'react-icons/io5';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** يُعرض أسفل اللوح ويبقى ثابتاً فوق منطقة التمرير */
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** إخفاء زر الإغلاق (عندما يوفّر المحتوى إجراءً بديلاً) */
  hideCloseButton?: boolean;
  maxHeight?: string;
  labelledBy?: string;
}

const EXIT_MS = 220;

let openSheetCount = 0;

const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  title,
  footer,
  children,
  hideCloseButton = false,
  maxHeight = '92dvh',
  labelledBy
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // mounted: هل العنصر في الـ DOM أصلاً | visible: هل هو في وضع الظهور
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      // بلا requestAnimationFrame عن قصد: لا يعمل في تبويب مخفي، فيبقى اللوح
      // شفافاً حتى يعود التركيز. حركة الدخول يوفّرها framer-motion للوح نفسه.
      setMounted(true);
      setVisible(true);
      return;
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  // قفل تمرير الصفحة خلف اللوح — بعدّاد حتى لا يفكّ لوحٌ قفلَ لوح آخر
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement;
    openSheetCount += 1;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      openSheetCount = Math.max(0, openSheetCount - 1);
      if (openSheetCount === 0) {
        document.body.style.overflow = previousOverflow;
      }
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  // نقل التركيز إلى اللوح عند فتحه
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => panelRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [open]);

  if (typeof document === 'undefined' || !mounted) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        fontFamily: sf.font,
        opacity: visible ? 1 : 0,
        // لا يستقبل نقرات أثناء الخروج
        pointerEvents: visible ? 'auto' : 'none',
        transition: `opacity ${EXIT_MS}ms ease`
      }}
    >
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
        aria-hidden="true"
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        initial={{ y: '100%' }}
        animate={{ y: visible ? 0 : '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.35 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 110 || info.velocity.y > 650) onClose();
        }}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 640,
          maxHeight,
          display: 'flex',
          flexDirection: 'column',
          background: sf.card,
          color: sf.text,
          // استدارة اللوح من رمزها: القالب «الجريء» يجعل حافّته منحنيةً
          // بوضوح و«البسيط» شبه مستقيمة
          borderTopLeftRadius: sd.rSheet,
          borderTopRightRadius: sd.rSheet,
          border: `${sd.borderW} solid ${sf.border}`,
          borderBottom: 'none',
          boxShadow: `0 -18px 48px ${sf.shadow}`,
          outline: 'none',
          overflow: 'hidden'
        }}
      >
        {/* مقبض السحب */}
        <div style={{ padding: '10px 0 2px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 44, height: 4, borderRadius: 999, background: sf.muted, opacity: 0.35 }} />
        </div>

        {(title || !hideCloseButton) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '8px 18px 14px',
              borderBottom: `1px solid ${sf.border}`,
              flexShrink: 0
            }}
          >
            <div id={labelledBy} style={{ fontSize: 16, fontWeight: 800, color: sf.text, minWidth: 0 }}>
              {title}
            </div>
            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                style={{
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: sd.rButton,
                  border: `${sd.borderW} solid ${sf.border}`,
                  background: sf.surface,
                  color: sf.muted,
                  cursor: 'pointer'
                }}
              >
                <IoClose size={19} />
              </button>
            )}
          </div>
        )}

        <div
          style={{
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            flex: 1,
            padding: '16px 18px',
            overscrollBehavior: 'contain'
          }}
        >
          {children}
        </div>

        {footer && (
          <div
            style={{
              flexShrink: 0,
              padding: '14px 18px',
              paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
              borderTop: `1px solid ${sf.border}`,
              background: sf.card
            }}
          >
            {footer}
          </div>
        )}
      </motion.div>
    </div>,
    document.body
  );
};

export default BottomSheet;
