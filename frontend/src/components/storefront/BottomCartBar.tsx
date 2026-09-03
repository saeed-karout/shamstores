// frontend/src/components/storefront/BottomCartBar.tsx
// شريط سلة ثابت أسفل الشاشة: عدد الأصناف + الإجمالي + زر كبير آمن للإبهام.

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IoBagHandleOutline, IoChevronBack } from 'react-icons/io5';
import { sf } from '@/utils/storefrontTheme';
import { formatPrice } from '@/utils/currency';

export interface BottomCartBarProps {
  itemCount: number;
  total: number;
  currency?: string;
  onOpen: () => void;
  label?: string;
  /** إخفاء الشريط مؤقتاً (مثلاً عند فتح لوح سفلي) */
  hidden?: boolean;
}

const BottomCartBar: React.FC<BottomCartBarProps> = ({
  itemCount,
  total,
  currency = 'SYP',
  onOpen,
  label = 'عرض السلة',
  hidden = false
}) => {
  const visible = itemCount > 0 && !hidden;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          style={{
            position: 'fixed',
            insetInline: 0,
            bottom: 0,
            zIndex: 60,
            display: 'flex',
            justifyContent: 'center',
            padding: '10px 14px',
            paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
            background: `linear-gradient(to top, ${sf.bg} 55%, transparent)`,
            pointerEvents: 'none',
            fontFamily: sf.font
          }}
        >
          <button
            type="button"
            onClick={onOpen}
            style={{
              pointerEvents: 'auto',
              width: '100%',
              maxWidth: 612,
              minHeight: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '0 8px 0 18px',
              borderRadius: 16,
              border: 'none',
              background: sf.accent,
              color: sf.onAccent,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: `0 10px 30px ${sf.shadow}`
            }}
          >
            {/* عدد الأصناف */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(0,0,0,0.14)',
                borderRadius: 12,
                padding: '8px 12px',
                fontSize: 14,
                fontWeight: 800,
                flexShrink: 0
              }}
            >
              <IoBagHandleOutline size={18} />
              {itemCount}
            </span>

            <span style={{ fontSize: 15, fontWeight: 800, flex: 1, textAlign: 'center' }}>{label}</span>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 15,
                fontWeight: 800,
                flexShrink: 0,
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {formatPrice(total, currency)}
              <IoChevronBack size={17} />
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BottomCartBar;
