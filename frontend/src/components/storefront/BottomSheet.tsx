// frontend/src/components/storefront/BottomSheet.tsx
// لوح سفلي عام: بوابة DOM، خلفية معتمة، إغلاق بـ Escape، قفل تمرير الصفحة.

import React, { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { IoClose } from 'react-icons/io5';
import { sf } from '@/utils/storefrontTheme';

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

  // قفل تمرير الصفحة خلف اللوح — مع عدّاد حتى لا يفكّ لوحٌ قفلَ لوح آخر
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
    if (open) {
      const id = window.setTimeout(() => panelRef.current?.focus(), 40);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            fontFamily: sf.font
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
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
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
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
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              border: `1px solid ${sf.border}`,
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
                      borderRadius: 12,
                      border: `1px solid ${sf.border}`,
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
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default BottomSheet;
