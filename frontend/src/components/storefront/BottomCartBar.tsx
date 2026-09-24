// frontend/src/components/storefront/BottomCartBar.tsx
//
// كبسولة السلّة العائمة — عدد الأصناف والإجمالي وزرٌّ يفتح السلّة.
//
// **كبسولةٌ في الوسط لا شريطٌ بعرض الشاشة.** كان زرّاً بعرض الجوال كاملاً
// وارتفاع ستة وخمسين بكسلاً، ملتصقاً بأسفل الشاشة فوق تدرّجٍ يُعتم ما تحته:
// يغطّي آخر صفٍّ من المنتجات في كل تمرير، ويبدو كأنه جزءٌ من الصفحة لا
// اختصار. الكبسولة بعرض محتواها تترك الحافّتين للمحتوى، وتُقرأ كزرٍّ طافٍ.
//
// وتبقى كبيرةً بما يكفي للإبهام (٥٢ بكسلاً)، وتعلو شارة المنصّة حين تظهر
// كي لا تغطّيها في الزاوية.

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IoBagHandleOutline, IoChevronBack } from 'react-icons/io5';
import { sf } from '@/utils/storefrontTheme';
import { formatPrice } from '@/utils/currency';
import type { CurrencyInput } from '@/utils/currency';
import { useT } from '@/i18n/storefront';

export interface BottomCartBarProps {
  itemCount: number;
  total: number;
  currency?: CurrencyInput;
  onOpen: () => void;
  label?: string;
  /** إخفاء الشريط مؤقتاً (مثلاً عند فتح لوح سفلي) */
  hidden?: boolean;
  /** شارة المنصّة ظاهرة في الزاوية — ترتفع الكبسولة فوقها */
  aboveBadge?: boolean;
}

const BottomCartBar: React.FC<BottomCartBarProps> = ({
  itemCount,
  total,
  currency = 'SYP',
  onOpen,
  label = 'عرض السلة',
  hidden = false,
  aboveBadge = false
}) => {
  const { t } = useT();
  const visible = itemCount > 0 && !hidden;

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={onOpen}
          aria-label={`${t(label)} — ${itemCount} · ${formatPrice(total, currency)}`}
          initial={{ y: 90, opacity: 0, x: '-50%' }}
          animate={{ y: 0, opacity: 1, x: '-50%' }}
          exit={{ y: 90, opacity: 0, x: '-50%' }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          style={{
            position: 'fixed',
            left: '50%',
            bottom: `calc(${aboveBadge ? 66 : 16}px + env(safe-area-inset-bottom, 0px))`,
            zIndex: 60,
            width: 'max-content',
            maxWidth: 'calc(100vw - 32px)',
            minHeight: 52,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '6px 16px 6px 6px',
            paddingInlineStart: 6,
            paddingInlineEnd: 14,
            borderRadius: 999,
            border: 'none',
            background: sf.accent,
            color: sf.onAccent,
            cursor: 'pointer',
            fontFamily: sf.font,
            boxShadow: `0 14px 34px ${sf.shadow}, 0 2px 6px rgba(0,0,0,0.12)`
          }}
        >
          {/* الحقيبة بعدّادها — دائرةٌ داكنة داخل الكبسولة */}
          <span
            style={{
              position: 'relative',
              width: 40,
              height: 40,
              borderRadius: 999,
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(0,0,0,0.16)',
              flexShrink: 0
            }}
          >
            <IoBagHandleOutline size={19} />
            <motion.span
              key={itemCount}
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 14, stiffness: 400 }}
              style={{
                position: 'absolute',
                top: -3,
                insetInlineEnd: -3,
                minWidth: 19,
                height: 19,
                padding: '0 5px',
                borderRadius: 999,
                background: sf.bg,
                color: sf.accent,
                fontSize: 10.5,
                fontWeight: 900,
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
              }}
            >
              {itemCount > 99 ? '99+' : itemCount}
            </motion.span>
          </span>

          <span style={{ display: 'grid', textAlign: 'start', lineHeight: 1.25, minWidth: 0 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, opacity: 0.85, whiteSpace: 'nowrap' }}>{t(label)}</span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 900,
                whiteSpace: 'nowrap',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {formatPrice(total, currency)}
            </span>
          </span>

          <IoChevronBack size={18} style={{ flexShrink: 0, marginInlineStart: 4 }} />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default BottomCartBar;
