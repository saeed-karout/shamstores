// frontend/src/components/storefront/DeliveryAddressFields.tsx
//
// حقول العنوان السوريّ في السلّة: المحافظة ← المنطقة، أقرب نقطة دالّة،
// البناء والطابق، ودبّوسٌ اختياريّ على الخريطة.
//
// **ترتيب الحقول ترتيبُ سؤال المندوب على الهاتف:** «وين بالضبط؟ شو أقرب شي
// عليك؟ أيّ بناية؟». النقطة الدالّة إلزامية لأنها ما يوصل فعلاً؛ الخريطة
// اختيارية لأن كثيراً من الزبائن لا يعرف موقعه عليها.
//
// الحالة في hooks/useDeliveryAddress.ts — هنا العرض وحده.

import React from 'react';
import LocationPickerMap from './LocationPickerMap';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';
import { formatPrice } from '@/utils/currency';
import type { CurrencyInput } from '@/utils/currency';
import { useT } from '@/i18n/storefront';
import type { DeliveryAddressState } from '@/hooks/useDeliveryAddress';

interface Props {
  state: DeliveryAddressState;
  currency?: CurrencyInput;
  /** مركز الخريطة قبل أي اختيار — موقع النشاط */
  businessLocation?: { lat: number; lng: number };
}

const REQUIRED = <span style={{ color: '#FF6B6B' }}>*</span>;

const DeliveryAddressFields: React.FC<Props> = ({ state, currency = 'SYP', businessLocation }) => {
  const { t, lang } = useT();
  const { zones, zone, areas, area, value, patch, fee } = state;
  const money = (n: number) => formatPrice(n, currency);

  const threshold = zone ? (area ? area.freeOverAmount ?? zone.freeOverAmount : zone.freeOverAmount) : null;
  const eta = area?.etaText || (zone?.estimatedDays ? `${t('خلال')} ${zone.estimatedDays} ${t('يوم')}` : '');

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={areas.length > 0 ? twoCols : undefined}>
        <div>
          <label style={fieldLabel} htmlFor="sf-addr-governorate">
            {t('المحافظة')} {REQUIRED}
          </label>
          <select
            id="sf-addr-governorate"
            value={value.governorate}
            onChange={(e) => patch({ governorate: e.target.value })}
            style={inputStyle}
          >
            <option value="">{t('اختر المحافظة…')}</option>
            {zones.map((z) => (
              <option key={z.governorate} value={z.governorate}>
                {lang === 'en' && z.nameEn ? z.nameEn : z.name}
              </option>
            ))}
          </select>
        </div>

        {areas.length > 0 && (
          <div>
            <label style={fieldLabel} htmlFor="sf-addr-area">
              {t('المنطقة')} {REQUIRED}
            </label>
            <select
              id="sf-addr-area"
              value={value.areaId}
              onChange={(e) => patch({ areaId: e.target.value })}
              style={inputStyle}
            >
              <option value="">{t('اختر المنطقة…')}</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {/* الأجرة في الخيار نفسه: الزبون يقارن قبل أن يختار */}
                  {a.name} — {a.fee > 0 ? money(a.fee) : t('مجاني')}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* الأجرة والمدّة فور الاختيار: زبونٌ يكتشف الأجرة في آخر سطر يتراجع */}
      {zone && (areas.length === 0 || area) && (
        <p style={hint}>
          {zone.deliveryMode === 'shipping' ? t('شحن') : t('توصيل')}
          {' · '}
          {fee > 0 ? money(fee) : t('مجاني')}
          {eta ? ` · ${eta}` : ''}
          {threshold && fee > 0 ? ` · ${t('مجاني فوق')} ${money(threshold)}` : ''}
        </p>
      )}

      <div>
        <label style={fieldLabel} htmlFor="sf-addr-landmark">
          {t('أقرب نقطة دالّة')} {REQUIRED}
        </label>
        <input
          id="sf-addr-landmark"
          type="text"
          value={value.landmark}
          maxLength={200}
          onChange={(e) => patch({ landmark: e.target.value })}
          placeholder={t('مثال: جانب صيدلية الشفاء، مقابل الجامع')}
          autoComplete="off"
          style={inputStyle}
        />
      </div>

      <div style={twoCols}>
        <div>
          <label style={fieldLabel} htmlFor="sf-addr-building">{t('البناء')}</label>
          <input
            id="sf-addr-building"
            type="text"
            value={value.building}
            maxLength={60}
            onChange={(e) => patch({ building: e.target.value })}
            placeholder={t('اسم أو رقم البناء')}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={fieldLabel} htmlFor="sf-addr-floor">{t('الطابق')}</label>
          <input
            id="sf-addr-floor"
            type="text"
            value={value.floor}
            maxLength={20}
            onChange={(e) => patch({ floor: e.target.value })}
            placeholder={t('مثال: الثالث')}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <span style={{ ...fieldLabel, marginBottom: 4 }}>{t('الموقع على الخريطة (اختياري)')}</span>
        <LocationPickerMap
          value={value.location}
          onChange={(location) => patch({ location })}
          fallbackCenter={businessLocation}
        />
      </div>
    </div>
  );
};

const twoCols: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
  gap: 10
};

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 11.5,
  color: sf.muted,
  fontWeight: 600,
  marginBottom: 6
};

const hint: React.CSSProperties = { color: sf.muted, fontSize: 12, margin: 0, lineHeight: 1.8 };

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 46,
  background: sf.surface,
  border: `1px solid ${sf.border}`,
  borderRadius: sd.rButton,
  padding: '11px 13px',
  color: sf.text,
  fontSize: 13.5,
  fontFamily: 'inherit',
  outline: 'none'
};

export default DeliveryAddressFields;
