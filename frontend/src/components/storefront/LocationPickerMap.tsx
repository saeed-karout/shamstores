// frontend/src/components/storefront/LocationPickerMap.tsx
//
// تحديد موقع التوصيل: بالـ GPS أو بوضع دبّوس على خريطة حقيقية.
//
// يستبدل components/LocationPicker.tsx الذي كان يحمّل خرائط Google بمفتاح
// `YOUR_GOOGLE_MAPS_API_KEY` الحرفي — أي أن خريطته لم تعمل يوماً. هنا
// OpenStreetMap عبر Leaflet: بلا مفتاح، وبلا حساب، وبلا فاتورة.
//
// Leaflet يُحمَّل كسولاً عند فتح الخريطة أول مرة، فلا يدخل الحزمة الأولى ولا
// يبطئ أول رسم لزائر لا ينوي الطلب أصلاً.

import { useCallback, useEffect, useRef, useState } from 'react';
import { IoLocateOutline, IoMapOutline, IoCheckmarkCircle, IoWarningOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { useT } from '@/i18n/storefront';

export interface PickedLocation {
  lat: number;
  lng: number;
  address: string;
}

interface LocationPickerMapProps {
  value?: PickedLocation | null;
  onChange: (location: PickedLocation) => void;
  /** مركز الخريطة قبل أي اختيار — يُفضَّل موقع النشاط التجاري */
  fallbackCenter?: { lat: number; lng: number };
}

/** دمشق مركزاً افتراضياً حين لا موقع للنشاط ولا إذن للـ GPS */
const DEFAULT_CENTER = { lat: 33.5138, lng: 36.2765 };

const round6 = (value: number): number => Math.round(value * 1e6) / 1e6;

/**
 * تحويل الإحداثيات إلى عنوان مقروء عبر Nominatim.
 *
 * الفشل هنا ليس فشلاً للعملية: الإحداثيات هي ما يحتاجه السائق فعلاً، والعنوان
 * النصّي راحة إضافية. لذا نُرجع الإحداثيات نصاً بدل أن نُسقط الاختيار.
 */
const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`,
      { headers: { Accept: 'application/json' } }
    );
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    return typeof data?.display_name === 'string' && data.display_name.trim()
      ? data.display_name
      : `${round6(lat)}, ${round6(lng)}`;
  } catch {
    return `${round6(lat)}, ${round6(lng)}`;
  }
};

const LocationPickerMap: React.FC<LocationPickerMapProps> = ({ value, onChange, fallbackCenter }) => {
  const { t } = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [mapOpen, setMapOpen] = useState(false);
  const [loadingMap, setLoadingMap] = useState(false);
  const [locating, setLocating] = useState(false);

  const center = value ?? fallbackCenter ?? DEFAULT_CENTER;

  const commit = useCallback(
    async (lat: number, lng: number) => {
      const address = await reverseGeocode(lat, lng);
      onChange({ lat: round6(lat), lng: round6(lng), address });
    },
    [onChange]
  );

  // ===== GPS =====
  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error(t('متصفحك لا يدعم تحديد الموقع. اختر من الخريطة.'));
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await commit(latitude, longitude);
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 17);
        }
        setLocating(false);
        toast.success(t('تم تحديد موقعك'));
      },
      (error) => {
        setLocating(false);
        // رسالة لكل سبب: «فشل تحديد الموقع» وحدها لا تخبر المستخدم بما يفعل
        const messages: Record<number, string> = {
          1: t('رفضتَ إذن الموقع. فعّله من إعدادات المتصفح أو ضع الدبّوس يدوياً.'),
          2: t('تعذّر تحديد الموقع — الإشارة ضعيفة. جرّب الخريطة.'),
          3: t('انتهت مهلة تحديد الموقع. جرّب مجدداً أو استخدم الخريطة.')
        };
        toast.error(messages[error.code] || t('تعذّر تحديد الموقع. استخدم الخريطة.'));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, [commit]);

  // ===== الخريطة =====
  useEffect(() => {
    if (!mapOpen || mapRef.current || !containerRef.current) return;

    let cancelled = false;
    setLoadingMap(true);

    (async () => {
      const L = (await import('leaflet')).default;
      // ورقة أنماط Leaflet تُحمَّل معه كسولاً لا في الحزمة الأولى
      await import('leaflet/dist/leaflet.css');
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [center.lat, center.lng],
        zoom: value ? 17 : 13,
        attributionControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(map);

      // أيقونة الدبّوس الافتراضية تعتمد على مسارات صور نسبية تنكسر بعد البناء،
      // فنرسم دبّوساً بـ CSS بدل ملاحقة ملفات الصور.
      const pinIcon = L.divIcon({
        className: '',
        html:
          '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;' +
          'background:var(--sf-accent,#C8E235);border:2px solid #fff;' +
          'transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 22]
      });

      const marker = L.marker([center.lat, center.lng], { draggable: true, icon: pinIcon }).addTo(map);

      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng();
        void commit(lat, lng);
      });

      map.on('click', (event: any) => {
        marker.setLatLng(event.latlng);
        void commit(event.latlng.lat, event.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
      setLoadingMap(false);

      // الخريطة تُركَّب داخل عنصر كان مخفياً، فتقيس حجمها صفراً وتظهر رمادية
      // ما لم نُجبرها على إعادة القياس بعد أن يستقر التخطيط.
      window.setTimeout(() => map.invalidateSize(), 120);
    })();

    return () => {
      cancelled = true;
    };
  }, [mapOpen, center.lat, center.lng, value, commit]);

  // مزامنة الدبّوس مع اختيار جاء من الـ GPS بينما الخريطة مفتوحة
  useEffect(() => {
    if (value && markerRef.current) {
      markerRef.current.setLatLng([value.lat, value.lng]);
    }
  }, [value]);

  useEffect(() => () => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  }, []);

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          style={{ ...actionButton, background: 'var(--sf-accent)', color: 'var(--sf-on-accent)' }}
        >
          <IoLocateOutline size={17} />
          {locating ? t('جارٍ تحديد موقعك…') : t('موقعي الحالي')}
        </button>

        <button
          type="button"
          onClick={() => setMapOpen((open) => !open)}
          aria-expanded={mapOpen}
          style={{ ...actionButton, background: 'var(--sf-surface)', color: 'var(--sf-text)' }}
        >
          <IoMapOutline size={17} />
          {mapOpen ? t('إخفاء الخريطة') : t('اختر من الخريطة')}
        </button>
      </div>

      {mapOpen && (
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--sf-border)' }}>
          <div ref={containerRef} style={{ height: 240, width: '100%', background: 'var(--sf-surface)' }} />
          {loadingMap && (
            <div style={{ ...mapOverlay, color: 'var(--sf-muted)' }}>{t('جارٍ تحميل الخريطة…')}</div>
          )}
          <div
            style={{
              padding: '7px 10px',
              fontSize: 11.5,
              color: 'var(--sf-muted)',
              background: 'var(--sf-surface)',
              borderTop: '1px solid var(--sf-border)'
            }}
          >{t('اضغط على الخريطة أو اسحب الدبّوس لضبط الموقع بدقة')}</div>
        </div>
      )}

      {value ? (
        <div style={{ ...statusBox, borderColor: 'var(--sf-accent)' }}>
          <IoCheckmarkCircle size={17} style={{ color: 'var(--sf-accent)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sf-text)', marginBottom: 2 }}>{t('الموقع محدَّد')}</div>
            <div style={{ fontSize: 11.5, color: 'var(--sf-muted)', lineHeight: 1.7 }}>{value.address}</div>
          </div>
        </div>
      ) : (
        <div style={{ ...statusBox, borderColor: 'var(--sf-border)' }}>
          <IoWarningOutline size={17} style={{ color: 'var(--sf-muted)', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 11.5, color: 'var(--sf-muted)', lineHeight: 1.7 }}>{t('حدّد موقعك ليصل السائق إليك بدقة. العنوان المكتوب وحده قد لا يكفي.')}</div>
        </div>
      )}
    </div>
  );
};

const actionButton: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '11px 12px',
  minHeight: 44,
  borderRadius: 12,
  border: 'none',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit'
};

const mapOverlay: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12.5,
  background: 'var(--sf-surface)'
};

const statusBox: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'flex-start',
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid',
  background: 'var(--sf-surface)'
};

export default LocationPickerMap;
