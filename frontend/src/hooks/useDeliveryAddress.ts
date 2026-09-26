// frontend/src/hooks/useDeliveryAddress.ts
//
// حالة العنوان السوريّ المنظَّم في السلّة: المحافظة ← المنطقة (بأجرتها)،
// وأقرب نقطة دالّة، والبناء والطابق، ودبّوسٌ اختياريّ على الخريطة.
//
// **منفصلةٌ عن صفحتي المتجر والمطعم:** كلتاهما تحتاج الحقول نفسها والحمولة
// نفسها، ونسخُ الحالة في الصفحتين يعني أن تصلح إحداهما وتنسى الأخرى.
//
// **الأجرة هنا للعرض فقط.** الخادم يعيد حسابها من المحافظة والمنطقة ولا يقبل
// رقماً من المتصفّح (services/deliveryArea.service.ts في الخادم).

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/services/api';
import type { PickedLocation } from '@/components/storefront/LocationPickerMap';

export interface DeliveryAreaOption {
  id: string;
  name: string;
  fee: number;
  freeOverAmount: number | null;
  etaText: string | null;
}

export interface DeliveryZoneOption {
  governorate: string;
  name: string;
  nameEn?: string;
  fee: number;
  freeOverAmount: number | null;
  estimatedDays: number | null;
  deliveryMode: 'driver' | 'shipping';
  areas?: DeliveryAreaOption[];
}

export interface DeliveryAddressValue {
  governorate: string;
  areaId: string;
  landmark: string;
  building: string;
  floor: string;
  location: PickedLocation | null;
}

const EMPTY: DeliveryAddressValue = {
  governorate: '',
  areaId: '',
  landmark: '',
  building: '',
  floor: '',
  location: null
};

const storageKey = (slug: string) => `sf-address:${slug}`;

/** العنوان المحفوظ من طلبٍ سابق — الزبون الذي يعود لا يكتب عنوانه ثانيةً */
const loadSaved = (slug: string): DeliveryAddressValue => {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return { ...EMPTY, ...parsed, location: parsed?.location ?? null };
  } catch {
    return EMPTY;
  }
};

interface Options {
  /** معرّف الواجهة — لجلب المناطق ولحفظ العنوان في هذا المتصفّح */
  slug?: string | null;
  /** مناطق جلبتها الصفحة سلفاً — تُغني عن طلبٍ ثانٍ */
  zones?: DeliveryZoneOption[];
  /** مجموع الأصناف بعد الخصم — أساس «مجاني فوق» كما في الخادم */
  subtotal: number;
}

export const useDeliveryAddress = ({ slug, zones: providedZones, subtotal }: Options) => {
  const [fetchedZones, setFetchedZones] = useState<DeliveryZoneOption[]>([]);
  const [value, setValue] = useState<DeliveryAddressValue>(() => (slug ? loadSaved(slug) : EMPTY));

  useEffect(() => {
    if (providedZones !== undefined || !slug) return;
    let cancelled = false;
    (async () => {
      try {
        const data: any = await api.get(`/shipping/public/${encodeURIComponent(slug)}`);
        if (!cancelled) setFetchedZones(Array.isArray(data) ? data : []);
      } catch {
        // بلا مناطق يبقى حقل العنوان القديم — الطلب لا يتعطّل
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, providedZones]);

  // العنوان المحفوظ يُقرأ حين يصل الـslug متأخّراً (الصفحة تحمّل المتجر أوّلاً)
  useEffect(() => {
    if (!slug) return;
    setValue((prev) => (prev === EMPTY ? loadSaved(slug) : prev));
  }, [slug]);

  const zones = providedZones ?? fetchedZones;
  const enabled = zones.length > 0;
  const zone = zones.find((z) => z.governorate === value.governorate) || null;
  const areas = zone?.areas || [];
  const area = areas.find((a) => a.id === value.areaId) || null;

  // محافظةٌ أو منطقةٌ أُطفئت منذ آخر طلب — تُفرَّغ بدل إرسال ما يرفضه الخادم
  useEffect(() => {
    if (!enabled) return;
    if (value.governorate && !zone) setValue((p) => ({ ...p, governorate: '', areaId: '' }));
    else if (value.areaId && zone && !area) setValue((p) => ({ ...p, areaId: '' }));
  }, [enabled, zone, area, value.governorate, value.areaId]);

  const patch = useCallback((changes: Partial<DeliveryAddressValue>) => {
    setValue((prev) => {
      const next = { ...prev, ...changes };
      // تغيير المحافظة يُسقط المنطقة: حيّ المزة لا يبقى مختاراً في حلب
      if (changes.governorate !== undefined && changes.governorate !== prev.governorate) next.areaId = '';
      return next;
    });
  }, []);

  /** الأجرة كما سيحسبها الخادم: المنطقة أوّلاً، وحدّها المجانيّ أو حدّ المحافظة */
  const fee = useMemo(() => {
    if (!zone) return 0;
    const threshold = area ? area.freeOverAmount ?? zone.freeOverAmount : zone.freeOverAmount;
    if (threshold && subtotal >= Number(threshold)) return 0;
    return Math.round(Number(area ? area.fee : zone.fee) || 0);
  }, [zone, area, subtotal]);

  const missing: string[] = [];
  if (enabled) {
    if (!value.governorate) missing.push('المحافظة');
    if (zone && areas.length > 0 && !value.areaId) missing.push('المنطقة');
    if (!value.landmark.trim()) missing.push('أقرب نقطة دالّة');
  }

  /** ما يُضاف إلى جسم الطلب */
  const payload = useMemo(
    () => ({
      governorate: value.governorate || null,
      deliveryAreaId: value.areaId || undefined,
      deliveryLandmark: value.landmark.trim(),
      deliveryBuilding: value.building.trim() || undefined,
      deliveryFloor: value.floor.trim() || undefined,
      deliveryLat: value.location?.lat,
      deliveryLng: value.location?.lng,
      // عنوان الخريطة المقروء يُرفق نصّاً — الخادم يركّب منه ومن الحقول العنوانَ الكامل
      deliveryAddress: value.location?.address || undefined,
      deliveryFee: fee
    }),
    [value, fee]
  );

  /** يُستدعى بعد نجاح الطلب — يحفظ العنوان لزيارةٍ قادمة */
  const remember = useCallback(() => {
    if (!slug) return;
    try {
      localStorage.setItem(storageKey(slug), JSON.stringify(value));
    } catch {
      /* التصفّح الخاص يمنع التخزين — لا بأس */
    }
  }, [slug, value]);

  return { enabled, zones, zone, areas, area, value, patch, fee, missing, payload, remember };
};

export type DeliveryAddressState = ReturnType<typeof useDeliveryAddress>;

export default useDeliveryAddress;
