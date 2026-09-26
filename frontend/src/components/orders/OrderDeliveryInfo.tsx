// frontend/src/components/orders/OrderDeliveryInfo.tsx
//
// عنوان التوصيل المنظَّم في تفاصيل الطلب، وتسجيل ما حصّله المندوب.
//
// **النقطة الدالّة بخطٍّ أوضح من غيرها:** هي ما يقرؤه من يجهّز الطلب للمندوب
// على الهاتف — «جانب فرن الأمير» — لا اسم المحافظة الذي يعرفه سلفاً.
//
// **وتسجيل التحصيل هنا لا في شاشةٍ منفصلة فقط:** المندوب الخاص (بلا تطبيق)
// يعود بالمال والطلب مفتوحٌ أمام التاجر، فيسجّله في اللحظة نفسها. شاشة
// «تسوية التحصيل» تجمع ما سُجّل.

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { IoLocation, IoMapOutline, IoNavigateOutline, IoCashOutline, IoCheckmarkCircle } from 'react-icons/io5';
import api from '@/services/api';
import { formatPrice } from '@/utils/currency';

export interface DeliveryDetails {
  governorate?: string | null;
  governorateName?: string | null;
  areaId?: string | null;
  areaName?: string | null;
  landmark?: string | null;
  building?: string | null;
  floor?: string | null;
  lat?: number | null;
  lng?: number | null;
  fee?: number | null;
  etaText?: string | null;
}

interface OrderLike {
  id: string;
  orderType?: string | null;
  status?: string;
  paymentMethod?: string | null;
  total?: number | string;
  deliveryAddress?: string | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  deliveryDetails?: DeliveryDetails | string | null;
  driver?: { name?: string | null } | null;
  assignedDriverId?: string | null;
}

const C = {
  accent: '#084835',
  text: '#10231B',
  muted: '#5F736A',
  surf: '#F1F5F2',
  border: 'rgba(8,72,53,0.15)'
};

/** الحقل JSON — وقد يصل نصّاً من مسارٍ يسلسله */
export const parseDeliveryDetails = (raw: OrderLike['deliveryDetails']): DeliveryDetails | null => {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
};

export const mapLinks = (lat?: number | null, lng?: number | null) =>
  lat && lng
    ? {
        osm: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`,
        // رابطٌ عاديّ لا واجهة برمجية: يفتح تطبيق الخرائط على هاتف المندوب
        google: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      }
    : null;

/** العنوان المنظَّم — يُعرض بدل سطر العنوان النصّي حين يتوفّر */
export const DeliveryAddressView: React.FC<{ order: OrderLike }> = ({ order }) => {
  const d = parseDeliveryDetails(order.deliveryDetails);
  const links = mapLinks(d?.lat ?? order.deliveryLat, d?.lng ?? order.deliveryLng);
  if (!d) return null;

  const place = [d.governorateName, d.areaName].filter(Boolean).join(' — ');
  const building = [d.building ? `بناء ${d.building}` : null, d.floor ? `طابق ${d.floor}` : null]
    .filter(Boolean)
    .join('، ');

  return (
    <div style={{ marginTop: 10, display: 'flex', gap: 7, lineHeight: 1.8, fontSize: 12.5, color: C.muted }}>
      <IoLocation size={15} color={C.accent} style={{ flexShrink: 0, marginTop: 3 }} />
      <div style={{ minWidth: 0 }}>
        {place && <div style={{ color: C.text, fontWeight: 700 }}>{place}</div>}
        {d.landmark && (
          <div style={{ color: C.text, fontSize: 13.5, fontWeight: 800 }}>أقرب نقطة: {d.landmark}</div>
        )}
        {building && <div>{building}</div>}
        {d.etaText && <div>المدّة المعلنة للزبون: {d.etaText}</div>}
        {links && (
          <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
            <a href={links.google} target="_blank" rel="noopener noreferrer" style={linkStyle}>
              <IoNavigateOutline size={14} /> افتح في الخرائط
            </a>
            <a href={links.osm} target="_blank" rel="noopener noreferrer" style={linkStyle}>
              <IoMapOutline size={14} /> OpenStreetMap
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

const linkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  color: C.accent,
  fontWeight: 700,
  textDecoration: 'none'
};

/**
 * بطاقة التحصيل: ما سُجّل، أو نموذجٌ لتسجيله.
 *
 * تظهر لطلبات النقد عند الاستلام التي خرجت للتوصيل وحدها. وتختفي بصمت إن
 * كانت الخطة لا تشمل التسوية أو لم يملك الموظّف الصلاحية — سطرُ ترقيةٍ في
 * كل طلب إزعاجٌ لا يبيع.
 */
export const CodCollectionCard: React.FC<{ order: OrderLike; currency?: string }> = ({ order, currency }) => {
  const eligible =
    order.paymentMethod === 'cash' &&
    (order.orderType === 'delivery' || order.orderType === 'shipping') &&
    (order.status === 'delivering' || order.status === 'delivered');

  const [state, setState] = useState<'loading' | 'hidden' | 'ready'>('loading');
  const [record, setRecord] = useState<any>(null);
  const [couriers, setCouriers] = useState<string[]>([]);
  const [courierName, setCourierName] = useState('');
  const [amount, setAmount] = useState<string>(String(Number(order.total) || ''));
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!eligible) return;
    let cancelled = false;
    (async () => {
      try {
        const [row, names]: any = await Promise.all([
          api.get(`/cod/orders/${order.id}/collection`),
          api.get('/cod/couriers').catch(() => [])
        ]);
        if (cancelled) return;
        setRecord(row || null);
        setCouriers(Array.isArray(names) ? names : []);
        setState('ready');
      } catch {
        if (!cancelled) setState('hidden');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eligible, order.id]);

  if (!eligible || state !== 'ready') return null;

  const money = (n: number) => formatPrice(n, (currency as any) || 'SYP');

  const save = async () => {
    setSaving(true);
    try {
      const row = await api.post(`/cod/orders/${order.id}/collection`, {
        courierName: courierName.trim() || undefined,
        amount: amount === '' ? undefined : Number(amount)
      });
      setRecord(row);
      setEditing(false);
      toast.success('سُجّل المبلغ المحصَّل');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'تعذّر التسجيل');
    } finally {
      setSaving(false);
    }
  };

  const box: React.CSSProperties = {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: C.surf,
    border: `1px solid ${C.border}`,
    fontSize: 12.5,
    color: C.muted,
    lineHeight: 1.8
  };

  if (record && !editing) {
    const diff = record.expectedAmount != null ? Number(record.amount) - Number(record.expectedAmount) : 0;
    return (
      <div style={box}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.accent, fontWeight: 800 }}>
          <IoCheckmarkCircle size={16} /> حصّل {record.courierName} {money(Number(record.amount))}
        </div>
        {Math.abs(diff) >= 1 && (
          <div style={{ color: '#B45309' }}>
            {diff < 0 ? `أقلّ من إجمالي الطلب بـ ${money(-diff)}` : `أكثر من إجمالي الطلب بـ ${money(diff)}`}
          </div>
        )}
        {record.note && <div>ملاحظة: {record.note}</div>}
        <button type="button" onClick={() => setEditing(true)} style={textBtn}>
          تصحيح
        </button>
      </div>
    );
  }

  const listId = `cod-couriers-${order.id}`;
  return (
    <div style={box}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.text, fontWeight: 800, marginBottom: 6 }}>
        <IoCashOutline size={16} /> تسجيل المبلغ المحصَّل
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          list={listId}
          value={courierName}
          onChange={(e) => setCourierName(e.target.value)}
          placeholder={order.driver?.name ? `السائق: ${order.driver.name}` : 'اسم المندوب'}
          maxLength={100}
          style={{ ...input, flex: '2 1 150px' }}
        />
        <datalist id={listId}>
          {couriers.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="المبلغ المحصَّل"
          style={{ ...input, flex: '1 1 110px' }}
        />
        <button type="button" onClick={save} disabled={saving} style={primaryBtn}>
          {saving ? '…' : 'تسجيل'}
        </button>
      </div>
      <div style={{ fontSize: 11.5, marginTop: 5 }}>
        {order.assignedDriverId
          ? 'اتركه فارغاً لينسب للسائق المُسنَد، أو اكتب اسم مندوبك الخاص.'
          : 'اكتب اسم من وصّل الطلب وقبض ثمنه — يظهر في «تسوية التحصيل».'}
      </div>
    </div>
  );
};

const input: React.CSSProperties = {
  background: '#FFFFFF',
  border: `1px solid ${C.border}`,
  borderRadius: 9,
  padding: '8px 10px',
  fontSize: 13,
  fontFamily: 'inherit',
  color: C.text,
  minWidth: 0
};

const primaryBtn: React.CSSProperties = {
  background: C.accent,
  color: '#FFFFFF',
  border: 'none',
  borderRadius: 9,
  padding: '8px 16px',
  fontWeight: 800,
  fontFamily: 'inherit',
  cursor: 'pointer'
};

const textBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: C.accent,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
  fontSize: 12
};
