// frontend/src/components/storefront/ItemOptionsSheet.tsx
// لوح اختيار الحجم والإضافات والكمية والملاحظة، مع سعر حيّ.

import React, { useEffect, useMemo, useState } from 'react';
import { IoCheckmark, IoBagAddOutline } from 'react-icons/io5';
import BottomSheet from './BottomSheet';
import QuantityStepper from './QuantityStepper';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';
import { formatPrice } from '@/utils/currency';
import type { CurrencyInput } from '@/utils/currency';
import { getImageUrl } from '@/utils/imageHelpers';
import type { StorefrontMenuItem } from './MenuItemListCard';
import { useT } from '@/i18n/storefront';

export interface SelectedOptions {
  size?: { name: string; price: number };
  addons: Array<{ name: string; price: number }>;
  quantity: number;
  notes: string;
  /** سعر الوحدة بعد الحجم والإضافات */
  unitPrice: number;
}

export interface ItemOptionsSheetProps {
  item: StorefrontMenuItem | null;
  open: boolean;
  currency?: CurrencyInput;
  onClose: () => void;
  onConfirm: (item: StorefrontMenuItem, options: SelectedOptions) => void;
}

const ItemOptionsSheet: React.FC<ItemOptionsSheetProps> = ({
  item,
  open,
  currency = 'SYP',
  onClose,
  onConfirm
}) => {
  const { t } = useT();
  const [sizeIndex, setSizeIndex] = useState<number | null>(null);
  const [addonNames, setAddonNames] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  // إعادة الضبط عند تغيير الصنف — وإلا تسرّبت خيارات الصنف السابق
  useEffect(() => {
    if (!open) return;
    setSizeIndex(item?.sizes?.length ? 0 : null);
    setAddonNames(new Set());
    setQuantity(1);
    setNotes('');
  }, [open, item?.id, item?.sizes?.length]);

  const basePrice = useMemo(() => {
    if (!item) return 0;
    return item.discountedPrice && item.discountedPrice > 0 ? item.discountedPrice : item.price;
  }, [item]);

  const selectedSize = useMemo(() => {
    if (!item?.sizes?.length || sizeIndex === null) return undefined;
    return item.sizes[sizeIndex];
  }, [item, sizeIndex]);

  const selectedAddons = useMemo(
    () => (item?.addons || []).filter((a) => addonNames.has(a.name)),
    [item, addonNames]
  );

  // سعر الحجم يستبدل السعر الأساسي عند وجوده، والإضافات تُضاف فوقه
  const unitPrice = useMemo(() => {
    const sizePrice = selectedSize ? Number(selectedSize.price) || 0 : 0;
    const base = selectedSize && sizePrice > 0 ? sizePrice : basePrice;
    const addonsTotal = selectedAddons.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
    return base + addonsTotal;
  }, [selectedSize, basePrice, selectedAddons]);

  const total = unitPrice * quantity;

  const toggleAddon = (name: string) => {
    setAddonNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleConfirm = () => {
    if (!item) return;
    onConfirm(item, {
      size: selectedSize,
      addons: selectedAddons,
      quantity,
      notes: notes.trim(),
      unitPrice
    });
  };

  if (!item) return null;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      labelledBy="sf-item-options-title"
      title={<span id="sf-item-options-title">{item.name}</span>}
      footer={
        <button
          type="button"
          onClick={handleConfirm}
          style={{
            width: '100%',
            minHeight: 54,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '0 18px',
            borderRadius: sd.rButton,
            border: 'none',
            background: sf.accent,
            color: sf.onAccent,
            fontSize: 15,
            fontWeight: 800,
            fontFamily: 'inherit',
            cursor: 'pointer'
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <IoBagAddOutline size={19} />{t('إضافة إلى السلة')}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatPrice(total, currency)}</span>
        </button>
      }
    >
      {/* رأس الصنف */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        {item.image && (
          <img
            src={getImageUrl(item.image)}
            alt=""
            loading="lazy"
            decoding="async"
            width={82}
            height={82}
            style={{ width: 82, height: 82, borderRadius: sd.rImage, objectFit: 'cover', flexShrink: 0 }}
          />
        )}
        <div style={{ minWidth: 0 }}>
          {item.description && (
            <p style={{ margin: 0, fontSize: 12.5, color: sf.muted, lineHeight: 1.7 }}>{item.description}</p>
          )}
          <div style={{ marginTop: 8, fontSize: 14, fontWeight: 800, color: sf.accent }}>
            {formatPrice(basePrice, currency)}
          </div>
        </div>
      </div>

      {/* الأحجام */}
      {!!item.sizes?.length && (
        <section style={{ marginBottom: 20 }}>
          <h4 style={sectionTitle}>{t('الحجم')}<span style={requiredTag}>{t('مطلوب')}</span>
          </h4>
          <div style={{ display: 'grid', gap: 8 }}>
            {item.sizes.map((size, index) => {
              const active = sizeIndex === index;
              return (
                <button
                  key={`${size.name}-${index}`}
                  type="button"
                  onClick={() => setSizeIndex(index)}
                  aria-pressed={active}
                  style={{ ...optionRow, borderColor: active ? sf.accent : sf.border }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: `2px solid ${active ? sf.accent : sf.muted}`,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0
                      }}
                    >
                      {active && (
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: sf.accent }} />
                      )}
                    </span>
                    {size.name}
                  </span>
                  <span style={{ color: sf.accent, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                    {formatPrice(Number(size.price) || basePrice, currency)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* الإضافات */}
      {!!item.addons?.length && (
        <section style={{ marginBottom: 20 }}>
          <h4 style={sectionTitle}>{t('الإضافات')}<span style={{ ...requiredTag, background: 'transparent', color: sf.muted }}>{t('اختياري')}</span>
          </h4>
          <div style={{ display: 'grid', gap: 8 }}>
            {item.addons.map((addon, index) => {
              const active = addonNames.has(addon.name);
              return (
                <button
                  key={`${addon.name}-${index}`}
                  type="button"
                  onClick={() => toggleAddon(addon.name)}
                  aria-pressed={active}
                  style={{ ...optionRow, borderColor: active ? sf.accent : sf.border }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: sd.rImage,
                        border: `2px solid ${active ? sf.accent : sf.muted}`,
                        background: active ? sf.accent : 'transparent',
                        color: sf.onAccent,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0
                      }}
                    >
                      {active && <IoCheckmark size={14} />}
                    </span>
                    {addon.name}
                  </span>
                  <span style={{ color: sf.accent, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                    + {formatPrice(Number(addon.price) || 0, currency)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* الكمية */}
      <section style={{ marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ ...sectionTitle, marginBottom: 0 }}>{t('الكمية')}</h4>
        <QuantityStepper value={quantity} onChange={setQuantity} min={1} max={50} />
      </section>

      {/* ملاحظات */}
      <section>
        <h4 style={sectionTitle}>{t('ملاحظات')}</h4>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 300))}
          placeholder={t('مثال: بدون بصل، حار قليلاً...')}
          rows={3}
          style={{
            width: '100%',
            background: sf.surface,
            border: `1px solid ${sf.border}`,
            borderRadius: sd.rCard,
            padding: '11px 13px',
            color: sf.text,
            fontSize: 13.5,
            fontFamily: 'inherit',
            resize: 'vertical',
            outline: 'none'
          }}
        />
        <div style={{ textAlign: 'end', fontSize: 11, color: sf.muted, marginTop: 4 }}>{notes.length}/300</div>
      </section>
    </BottomSheet>
  );
};

const sectionTitle: React.CSSProperties = {
  margin: '0 0 10px',
  fontSize: 13.5,
  fontWeight: 800,
  color: sf.text,
  display: 'flex',
  alignItems: 'center',
  gap: 8
};

const requiredTag: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  background: sf.accentSoft,
  color: sf.accent,
  borderRadius: sd.rChip,
  padding: '2px 8px'
};

const optionRow: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  minHeight: 50,
  padding: '0 14px',
  borderRadius: sd.rButton,
  border: `1.5px solid ${sf.border}`,
  background: sf.surface,
  color: sf.text,
  fontSize: 13.5,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  textAlign: 'start'
};

export default ItemOptionsSheet;
