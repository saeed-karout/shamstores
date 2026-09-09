// frontend/src/components/storefront/ProductOptionsSheet.tsx
//
// اختيار خيارات المنتج قبل الإضافة إلى السلة: لون، مقاس، إضافات…
//
// بلا هذه الخطوة يطلب الزبون قميصاً بلا مقاس ولا لون، فيتصل به التاجر
// ليسأل — وهو ما تُفترض المنصة أن تُغنيه عنه. والاتصال يُلغي نصف الطلبات.
//
// السعر المعروض هنا **تقدير للزبون**؛ الخادم يعيد حسابه من خياراته
// المخزَّنة. فرق سعر مكتوب في المتصفح قابل للتزوير.

import { useEffect, useMemo, useState } from 'react';
import { IoCheckmark } from 'react-icons/io5';
import BottomSheet from './BottomSheet';
import QuantityStepper from './QuantityStepper';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';
import { formatPrice } from '@/utils/currency';
import type { CurrencyInput } from '@/utils/currency';
import { useT } from '@/i18n/storefront';

export interface OptionValue {
  label: string;
  priceDelta: number;
  /** صورة القيمة — تُعرض بدل الاسم المجرّد حين تتوفّر */
  image?: string | null;
}

export interface OptionGroup {
  name: string;
  type: 'single' | 'multi';
  required: boolean;
  values: OptionValue[];
}

export type OptionSelection = Record<string, string | string[]>;

export interface OptionsResult {
  selection: OptionSelection;
  quantity: number;
  /** تقدير سعر الوحدة بعد الخيارات — للعرض في السلة */
  unitPrice: number;
}

interface Props {
  open: boolean;
  name: string;
  basePrice: number;
  options: OptionGroup[];
  currency?: CurrencyInput;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (result: OptionsResult) => void;
  /** تُستدعى حين يختار الزبون قيمة لها صورة — لتتبعها الصورة المعروضة */
  onPreviewImage?: (image: string) => void;
}

/** يقرأ الخيارات بأي شكل وصلت به — مصفوفة أو نص JSON */
export const parseProductOptions = (raw: unknown): OptionGroup[] => {
  let value = raw;
  if (typeof value === 'string' && value.trim()) {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.filter(
    (group: any) => group && typeof group.name === 'string' && Array.isArray(group.values) && group.values.length > 0
  );
};

export const hasOptions = (raw: unknown): boolean => parseProductOptions(raw).length > 0;

const ProductOptionsSheet: React.FC<Props> = ({
  open,
  name,
  basePrice,
  options,
  currency = 'SYP',
  submitting,
  onClose,
  onConfirm,
  onPreviewImage
}) => {
  const { t } = useT();
  const [selection, setSelection] = useState<OptionSelection>({});
  const [quantity, setQuantity] = useState(1);

  // فتح جديد = اختيار جديد. الإبقاء على اختيار منتج سابق يُنتج طلباً خاطئاً
  useEffect(() => {
    if (!open) return;
    const initial: OptionSelection = {};
    options.forEach((group) => {
      // المجموعة المفردة المطلوبة تبدأ بأول قيمة: لا معنى لإجبار الزبون
      // على اختيار «المقاس الوحيد المتاح»
      if (group.type === 'single' && group.required && group.values.length > 0) {
        initial[group.name] = group.values[0].label;
      }
    });
    setSelection(initial);
    setQuantity(1);
  }, [open, options]);

  const priceDelta = useMemo(() => {
    let delta = 0;
    options.forEach((group) => {
      const picked = selection[group.name];
      const labels = Array.isArray(picked) ? picked : picked ? [picked] : [];
      labels.forEach((label) => {
        const value = group.values.find((v) => v.label === label);
        if (value) delta += value.priceDelta || 0;
      });
    });
    return delta;
  }, [selection, options]);

  const missing = options.find((group) => {
    if (!group.required) return false;
    const picked = selection[group.name];
    return Array.isArray(picked) ? picked.length === 0 : !picked;
  });

  const unitPrice = basePrice + priceDelta;

  const toggle = (group: OptionGroup, label: string) => {
    // الصورة تتبع الاختيار فوراً: زبون يضغط «أزرق» ويرى الأحمر أمامه
    // يفقد الثقة بالصفحة كلها
    const value = group.values.find((v) => v.label === label);
    if (value?.image) onPreviewImage?.(value.image);

    setSelection((prev) => {
      if (group.type === 'single') {
        // إعادة اختيار نفس القيمة في مجموعة اختيارية تعني إلغاءها
        if (prev[group.name] === label && !group.required) {
          const next = { ...prev };
          delete next[group.name];
          return next;
        }
        return { ...prev, [group.name]: label };
      }

      const current = Array.isArray(prev[group.name]) ? (prev[group.name] as string[]) : [];
      const next = current.includes(label)
        ? current.filter((value) => value !== label)
        : [...current, label];
      return { ...prev, [group.name]: next };
    });
  };

  const isPicked = (group: OptionGroup, label: string): boolean => {
    const picked = selection[group.name];
    return Array.isArray(picked) ? picked.includes(label) : picked === label;
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={name}>
      <div style={{ paddingBottom: 12 }}>
        {options.map((group) => (
          <section key={group.name} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 9 }}>
              <h3 style={{ color: sf.text, fontSize: 14, fontWeight: 800, margin: 0 }}>{group.name}</h3>
              <span style={{ color: group.required ? '#FF6B6B' : sf.muted, fontSize: 11.5 }}>
                {group.required ? 'مطلوب' : 'اختياري'}
                {group.type === 'multi' ? ' · يمكن اختيار أكثر من واحد' : ''}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {group.values.map((value) => {
                const picked = isPicked(group, value.label);

                // قيمة لها صورة تُعرض عيّنةً مصوّرة: «أزرق» كلمة، والأزرق
                // درجات — والاسم وحده يُنتج طلباً يُرجَع
                if (value.image) {
                  return (
                    <button
                      key={value.label}
                      type="button"
                      onClick={() => toggle(group, value.label)}
                      aria-pressed={picked}
                      title={value.label}
                      style={{
                        width: 72,
                        padding: 0,
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      <span
                        style={{
                          position: 'relative',
                          width: 64,
                          height: 64,
                          borderRadius: sd.rButton,
                          overflow: 'hidden',
                          border: `2px solid ${picked ? sf.accent : sf.border}`,
                          background: sf.surface,
                          display: 'block'
                        }}
                      >
                        <img
                          src={value.image}
                          alt=""
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        {picked && (
                          <span
                            style={{
                              position: 'absolute',
                              insetInlineEnd: 3,
                              bottom: 3,
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: sf.accent,
                              color: sf.onAccent,
                              display: 'grid',
                              placeItems: 'center'
                            }}
                          >
                            <IoCheckmark size={13} />
                          </span>
                        )}
                      </span>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: picked ? 800 : 600,
                          color: picked ? sf.accent : sf.muted,
                          textAlign: 'center',
                          lineHeight: 1.4
                        }}
                      >
                        {value.label}
                        {value.priceDelta > 0 && (
                          <span style={{ display: 'block', color: sf.muted, fontSize: 10.5, fontWeight: 600 }}>
                            +{formatPrice(value.priceDelta, currency)}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                }

                return (
                  <button
                    key={value.label}
                    type="button"
                    onClick={() => toggle(group, value.label)}
                    aria-pressed={picked}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '9px 14px',
                      minHeight: 42,
                      borderRadius: sd.rCard,
                      border: `2px solid ${picked ? sf.accent : sf.border}`,
                      background: picked ? 'rgba(200,226,53,0.12)' : sf.card,
                      color: picked ? sf.accent : sf.text,
                      fontSize: 13,
                      fontWeight: picked ? 800 : 600,
                      fontFamily: 'inherit',
                      cursor: 'pointer'
                    }}
                  >
                    {picked && <IoCheckmark size={15} />}
                    {value.label}
                    {value.priceDelta > 0 && (
                      <span style={{ color: sf.muted, fontSize: 11.5, fontWeight: 600 }}>
                        +{formatPrice(value.priceDelta, currency)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            paddingTop: 14,
            borderTop: `1px solid ${sf.border}`
          }}
        >
          <span style={{ color: sf.muted, fontSize: 13, fontWeight: 700 }}>{t('الكمية')}</span>
          <QuantityStepper value={quantity} onChange={setQuantity} min={1} max={99} ariaLabel="الكمية" />
        </div>

        <button
          type="button"
          onClick={() => onConfirm({ selection, quantity, unitPrice })}
          disabled={!!missing || submitting}
          style={{
            width: '100%',
            marginTop: 14,
            minHeight: 50,
            borderRadius: sd.rButton,
            border: 'none',
            background: missing ? sf.surface : sf.accent,
            color: missing ? sf.muted : sf.onAccent,
            fontWeight: 800,
            fontSize: 14.5,
            fontFamily: 'inherit',
            cursor: missing ? 'not-allowed' : 'pointer'
          }}
        >
          {missing
            ? `اختر «${missing.name}»`
            : `أضف إلى السلة — ${formatPrice(unitPrice * quantity, currency)}`}
        </button>
      </div>
    </BottomSheet>
  );
};

export default ProductOptionsSheet;
