// frontend/src/pages/Store/PosPage.tsx
//
// شاشة الكاشير.
//
// **تُستعمل بيدٍ واحدة وزبونٌ ينتظر.** فكل قرار هنا يخدم السرعة: أهداف لمس
// كبيرة، وسلّة ثابتة لا تُمرَّر بعيداً، وحساب الباقي ظاهرٌ بلا ضغطة إضافية،
// وأزرار مبالغ جاهزة لأن الكاشير يستلم أوراقاً مدوّرة لا مبالغ دقيقة.
//
// **وتخدم النشاطين**: المتجر يبيع `Product` بمخزونٍ يُخصم، والمطعم يبيع
// `MenuItem` بلا مخزون — والواجهة لا تعرف الفرق لأن الخادم يوحّد الشكل.
// الاختلاف الوحيد الظاهر أن المطعم لا يُعرض له رصيد.
//
// **والمرتجع من نفس الشاشة** (زرّ «مرتجع» في الرأس): رقم البيعة من الإيصال،
// ثم الأصناف والكمّيات، ثم السبب وطريقة الردّ — وإيصال مرتجعٍ يُطبع كإيصال
// البيع. والنوبة تعرض الصافي (المبيعات − المرتجعات) لأنه ما في الصندوق فعلاً.
//
// **والباركود بمحرّكين**: `BarcodeDetector` الأصيلة حيث توجد، وZXing
// المحمَّلة عند الحاجة على Safari/iPhone — راجع utils/barcodeScanner.ts.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IoSearch, IoBarcode, IoTrash, IoAdd, IoRemove, IoCart,
  IoCheckmarkCircle, IoClose, IoReceiptOutline, IoStatsChart,
  IoLockClosed, IoSparkles, IoArrowUndo
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { formatPrice, DEFAULT_CURRENCY } from '@/utils/currency';
import { detectEngine, startScan, ScanHandle } from '@/utils/barcodeScanner';
import { SkeletonScope, SkeletonLine, SkeletonBlock, BusyDots } from '@/components/common/Skeleton';

const C = {
  bg: '#F4F7F4',
  card: '#FFFFFF',
  surf: '#F1F5F2',
  accent: '#084835',
  text: '#10231B',
  muted: '#5F736A',
  border: 'rgba(8,72,53,0.15)',
  red: '#D64545',
  green: '#15803D'
};

interface Product {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  /** `null` للمطعم: لا مخزون يُتتبَّع — والوجبة تُطبخ عند الطلب */
  stock: number | null;
  unit: string;
  imageUrl: string | null;
}

/** المطعم بلا مخزون: كل صنفٍ متاح ما دام مفعّلاً */
const isTracked = (p: Product): boolean => typeof p.stock === 'number';
const available = (p: Product): number => (isTracked(p) ? (p.stock as number) : Infinity);

interface Line extends Product {
  quantity: number;
}

interface Receipt {
  orderNumber: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  items: { name: string; quantity: number; price: number; lineTotal: number }[];
}

const PAYMENTS = [
  { key: 'cash', label: 'نقداً' },
  { key: 'card', label: 'بطاقة' },
  { key: 'sham_cash', label: 'شام كاش' }
];

/** أوراق يستلمها الكاشير فعلاً — تُختصر بها ضغطات لوحة الأرقام */
const QUICK_CASH = [5000, 10000, 25000, 50000];

const money = (n: number) => formatPrice(n, DEFAULT_CURRENCY);

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'نقداً',
  card: 'بطاقة',
  sham_cash: 'شام كاش',
  online: 'إلكتروني'
};

/** ملخّص النوبة كما يعيده `/pos/shift` — حقول المرتجع اختيارية لخادمٍ أقدم */
interface Shift {
  count: number;
  total: number;
  byMethod: Record<string, number>;
  recent: { orderNumber: string; total: number; paymentMethod: string; createdAt: string }[];
  refundsCount: number;
  refundsTotal: number;
  refundsByMethod: Record<string, number>;
  net: number;
  netByMethod: Record<string, number>;
  recentReturns: { returnNumber: string; orderNumber: string; amount: number; refundMethod: string; createdAt: string }[];
}

// ---------- المرتجع ----------

interface SaleLineForReturn {
  orderItemId: string;
  name: string;
  quantity: number;
  returnedQuantity: number;
  returnableQuantity: number;
  price: number;
  unitRefund: number;
}

interface SaleForReturn {
  id: string;
  orderNumber: string;
  createdAt: string;
  total: number;
  discountAmount: number;
  paymentMethod: string;
  refundedTotal: number;
  manualReturn: boolean;
  returnable: boolean;
  items: SaleLineForReturn[];
  returns: { returnNumber: string; amount: number; createdAt: string }[];
}

interface ReturnReceipt {
  returnNumber: string;
  orderNumber: string;
  amount: number;
  refundMethod: string;
  reason: string | null;
  createdAt: string;
  items: { name: string; quantity: number; unitPrice: number; refund: number; restocked: boolean }[];
}

/** أسباب جاهزة — الكاشير يختار بإصبع ولا يكتب والزبون واقف */
const RETURN_REASONS = ['عيب في المنتج', 'لم يناسب الزبون', 'مقاس أو لون خاطئ', 'خطأ في البيع'];

const PosPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [term, setTerm] = useState('');
  const [cart, setCart] = useState<Line[]>([]);
  const [payment, setPayment] = useState('cash');
  const [received, setReceived] = useState('');
  const [discount, setDiscount] = useState('');
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReceipt, setReturnReceipt] = useState<ReturnReceipt | null>(null);
  const [scanning, setScanning] = useState(false);
  /**
   * الميزة مقفلة.
   *
   * **كانت الصفحة تُفرغ بصمت** ومعها فقاعة خطأ تختفي بعد ثوانٍ: التاجر يرى
   * شاشة كاشيرٍ بلا أصناف ويظنّها معطّلة أو متجره فارغاً. القفل حالةٌ
   * مشروعة تُشرح، لا عطلٌ يُخفى.
   */
  const [locked, setLocked] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handleRef = useRef<ScanHandle | null>(null);
  // يمنع نداءين للخادم من إطارين متتاليين يقرآن نفس الرمز
  const lastCode = useRef<string>('');

  const engine = detectEngine();
  const scannerSupported = engine !== 'none';

  const load = useCallback(async (q: string) => {
    try {
      const data: any = await api.get(`/pos/products${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      setProducts(Array.isArray(data) ? data : []);
      setLocked(false);
    } catch (e: any) {
      if (e?.response?.status === 403) setLocked(true);
      else toast.error('تعذّر جلب الأصناف');
    }
  }, []);

  const loadShift = useCallback(async () => {
    try {
      const data: any = await api.get('/pos/shift');
      const total = data?.total ?? 0;
      const refundsTotal = data?.refundsTotal ?? 0;
      setShift({
        count: data?.count ?? 0,
        total,
        byMethod: data?.byMethod || {},
        recent: data?.recent || [],
        refundsCount: data?.refundsCount ?? 0,
        refundsTotal,
        refundsByMethod: data?.refundsByMethod || {},
        net: data?.net ?? total - refundsTotal,
        netByMethod: data?.netByMethod || data?.byMethod || {},
        recentReturns: data?.recentReturns || []
      });
    } catch {
      // ملخّص النوبة ثانويّ — غيابه لا يمنع البيع، والقفل يُكتشف من
      // نداء الأصناف فلا داعي لفقاعتَي خطأ لسببٍ واحد
    }
  }, []);

  useEffect(() => { load(''); loadShift(); }, [load, loadShift]);

  // البحث مؤجَّل: نداءٌ لكل حرف يُغرق شبكةً بطيئة ويُبطئ الكتابة نفسها
  useEffect(() => {
    const t = window.setTimeout(() => load(term), 300);
    return () => window.clearTimeout(t);
  }, [term, load]);

  const addProduct = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.id === product.id);
      if (existing) {
        if (existing.quantity >= available(product)) {
          toast.error(`المتاح ${product.stock} فقط من «${product.name}»`);
          return prev;
        }
        return prev.map((l) => (l.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      if (available(product) < 1) {
        toast.error(`«${product.name}» غير متوفّر`);
        return prev;
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  // ---------- الباركود ----------
  const stopScan = useCallback(() => {
    handleRef.current?.stop();
    handleRef.current = null;
    lastCode.current = '';
    setScanning(false);
  }, []);

  // الكاميرا لا تُترك مفتوحة بعد مغادرة الشاشة: ضوء العدسة المضاء يُقرأ
  // تجسّساً، والبطارية تُستنزف بلا سبب
  useEffect(() => stopScan, [stopScan]);

  const startScanning = async () => {
    setScanning(true);
    // بعد الرسم: عنصر الفيديو غير موجود قبل أن تتحوّل الحالة
    window.setTimeout(async () => {
      if (!videoRef.current) return;
      try {
        handleRef.current = await startScan({
          video: videoRef.current,
          onResult: async (value) => {
            if (value === lastCode.current) return;
            lastCode.current = value;
            try {
              const item: any = await api.get(`/pos/sku/${encodeURIComponent(value)}`);
              stopScan();
              addProduct(item);
              toast.success(item.name);
            } catch (e: any) {
              toast.error(e?.response?.data?.error || `رمز غير معروف: ${value}`);
              // يُسمح بإعادة قراءة نفس الرمز بعد ثانيتين — قد يكون المستخدم
              // أضاف الصنف للتوّ ويعيد المحاولة
              window.setTimeout(() => { lastCode.current = ''; }, 2000);
            }
          }
        });
      } catch (error: any) {
        toast.error(error?.message || 'تعذّر فتح الكاميرا', { duration: 6000 });
        setScanning(false);
      }
    }, 60);
  };

  // ---------- الحساب ----------
  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.price * l.quantity, 0), [cart]);
  const discountValue = Math.min(Math.max(0, Number(discount) || 0), subtotal);
  const total = subtotal - discountValue;
  const change = Number(received) > 0 ? Number(received) - total : 0;

  const complete = async () => {
    if (cart.length === 0) return;
    setSaving(true);
    try {
      const data: any = await api.post('/pos/sale', {
        items: cart.map((l) => ({ productId: l.id, quantity: l.quantity })),
        paymentMethod: payment,
        discountAmount: discountValue
      });
      setReceipt(data);
      setCart([]);
      setReceived('');
      setDiscount('');
      load(term);
      loadShift();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'تعذّر إتمام البيعة', { duration: 6000 });
    } finally {
      setSaving(false);
    }
  };

  if (locked) {
    return (
      <div style={{
        background: C.bg, minHeight: '100vh', color: C.text,
        display: 'grid', placeItems: 'center', padding: 24
      }} dir="rtl">
        <div style={{
          maxWidth: '30rem', textAlign: 'center',
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: '32px 26px'
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18, margin: '0 auto 16px',
            background: `${C.accent}1A`, display: 'grid', placeItems: 'center'
          }}>
            <IoLockClosed size={26} color={C.accent} />
          </div>

          <h1 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 900 }}>الكاشير إضافة مدفوعة</h1>

          <p style={{ margin: '0 0 18px', fontSize: 13.5, color: C.muted, lineHeight: 1.9 }}>
            بِع داخل محلّك من هاتفك: امسح الباركود بالكاميرا أو ابحث بالاسم،
            وأتمم البيعة واحسب الباقي. المخزون ينقص تلقائياً، وتدخل البيعة
            تقاريرك وقسمك المالي مع الطلبات الإلكترونية.
          </p>

          <Link
            to="/features"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              minHeight: 46, padding: '0 22px', borderRadius: 13,
              background: C.accent, color: '#FFFFFF', textDecoration: 'none',
              fontWeight: 900, fontSize: 14
            }}
          >
            <IoSparkles size={16} />
            اطلب تفعيلها من الميزات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }} dir="rtl">
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '16px 14px 24px' }}>

        <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 900, flex: 1 }}>الكاشير</h1>
          {shift && (
            <button
              type="button"
              onClick={() => setShiftOpen(true)}
              title="ملخّص النوبة"
              style={{
                display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: C.muted,
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: '6px 13px',
                cursor: 'pointer', fontFamily: 'inherit'
              }}
            >
              <IoStatsChart size={13} color={C.accent} />
              اليوم: <b style={{ color: C.text }}>{shift.count}</b> بيعة ·
              <b style={{ color: C.accent }}>{money(shift.net)}</b>
              {shift.refundsTotal > 0 && (
                <span style={{ color: C.red, fontVariantNumeric: 'tabular-nums' }}>
                  (مرتجع − {money(shift.refundsTotal)})
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setReturnOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 36,
              padding: '0 14px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
              background: C.card, border: `1px solid ${C.border}`, color: C.text,
              fontSize: 12.5, fontWeight: 800
            }}
          >
            <IoArrowUndo size={14} color={C.red} />
            مرتجع
          </button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 14 }}
             className="pos-grid">

          {/* ============ المنتجات ============ */}
          <section>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <IoSearch size={16} color={C.muted}
                  style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="ابحث بالاسم أو الرمز…"
                  style={{
                    width: '100%', padding: '13px 38px 13px 12px', borderRadius: 13,
                    background: C.card, border: `1px solid ${C.border}`, color: C.text,
                    fontSize: 14, fontFamily: 'inherit'
                  }}
                />
              </div>

              {scannerSupported && (
                <button
                  onClick={scanning ? stopScan : startScanning}
                  style={{
                    minWidth: 52, borderRadius: 13, cursor: 'pointer',
                    background: scanning ? C.red : C.accent,
                    color: scanning ? '#fff' : '#FFFFFF', border: 'none',
                    display: 'grid', placeItems: 'center'
                  }}
                  title={scanning ? 'إيقاف المسح' : 'مسح باركود'}
                >
                  {scanning ? <IoClose size={20} /> : <IoBarcode size={20} />}
                </button>
              )}
            </div>

            {scanning && (
              <div style={{
                position: 'relative', marginBottom: 12, borderRadius: 14,
                overflow: 'hidden', border: `1px solid ${C.accent}`, background: '#000'
              }}>
                <video ref={videoRef} muted playsInline
                       style={{ width: '100%', maxHeight: 230, objectFit: 'cover', display: 'block' }} />
                <div style={{
                  position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none'
                }}>
                  <div style={{ width: '68%', height: 76, border: `2px solid ${C.accent}`, borderRadius: 10 }} />
                </div>
                {engine === 'zxing' && (
                  <span style={{
                    position: 'absolute', insetInlineStart: 8, top: 8, fontSize: 10.5,
                    background: 'rgba(0,0,0,.55)', color: C.muted, padding: '3px 8px', borderRadius: 6
                  }}>
                    قارئ احتياطي — قد يستغرق لحظة
                  </span>
                )}
              </div>
            )}

            <div style={{
              display: 'grid', gap: 9,
              gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))'
            }}>
              {products.map((product) => {
                const out = available(product) < 1;
                return (
                  <button
                    key={product.id}
                    onClick={() => !out && addProduct(product)}
                    disabled={out}
                    style={{
                      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
                      padding: 10, textAlign: 'start', cursor: out ? 'not-allowed' : 'pointer',
                      color: C.text, fontFamily: 'inherit', opacity: out ? 0.45 : 1,
                      display: 'grid', gap: 5, minHeight: 108
                    }}
                  >
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt="" loading="lazy"
                           style={{ width: '100%', height: 58, objectFit: 'cover', borderRadius: 9 }} />
                    ) : (
                      <div style={{
                        height: 58, borderRadius: 9, background: C.surf,
                        display: 'grid', placeItems: 'center', color: C.muted, fontSize: 20
                      }}>◦</div>
                    )}
                    <span style={{
                      fontSize: 12.5, fontWeight: 700, lineHeight: 1.4,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                    }}>
                      {product.name}
                    </span>
                    <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                      <b style={{ fontSize: 12.5, color: C.accent }}>{money(product.price)}</b>
                      <span style={{ fontSize: 10.5, color: out ? C.red : C.muted }}>
                        {out ? 'نفد' : isTracked(product) ? `${product.stock}` : ''}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {products.length === 0 && (
              <p style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
                {term ? 'لا صنف يطابق البحث.' : 'لا أصناف في هذا النشاط بعد.'}
              </p>
            )}
          </section>

          {/* ============ السلّة ============ */}
          <aside style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 18,
            padding: 15, alignSelf: 'start', position: 'sticky', top: 14,
            display: 'grid', gap: 12
          }} className="pos-cart">

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoCart size={17} color={C.accent} />
              <b style={{ fontSize: 14, flex: 1 }}>السلّة</b>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', padding: 4 }}
                  title="إفراغ"
                >
                  <IoTrash size={15} />
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <p style={{ color: C.muted, fontSize: 12.5, margin: 0, padding: '18px 0', textAlign: 'center' }}>
                اضغط منتجاً لإضافته
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 8, maxHeight: '38vh', overflowY: 'auto' }}>
                {cart.map((line) => (
                  <div key={line.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: C.surf, borderRadius: 11, padding: '8px 10px'
                  }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>
                      <span style={{ display: 'block', fontWeight: 700 }}>{line.name}</span>
                      <span style={{ color: C.muted, fontSize: 11 }}>{money(line.price)}</span>
                    </span>

                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      <Step icon={IoRemove} onClick={() =>
                        setCart((prev) => prev.flatMap((l) =>
                          l.id !== line.id ? [l] : l.quantity > 1 ? [{ ...l, quantity: l.quantity - 1 }] : []
                        ))
                      } />
                      <b style={{ minWidth: 22, textAlign: 'center', fontSize: 13.5, fontVariantNumeric: 'tabular-nums' }}>
                        {line.quantity}
                      </b>
                      <Step icon={IoAdd} onClick={() => addProduct(line)} />
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ height: 1, background: C.border }} />

            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ fontSize: 11.5, color: C.muted }}>خصم (اختياري)</span>
              <input
                type="number" inputMode="numeric" value={discount}
                onChange={(e) => setDiscount(e.target.value)} placeholder="0"
                style={{
                  padding: '10px 12px', borderRadius: 11, background: C.surf,
                  border: `1px solid ${C.border}`, color: C.text, fontSize: 13.5, fontFamily: 'inherit'
                }}
              />
            </label>

            <div style={{ display: 'flex', gap: 6 }}>
              {PAYMENTS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setPayment(option.key)}
                  style={{
                    flex: 1, minHeight: 38, borderRadius: 11, fontSize: 12.5, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                    background: payment === option.key ? C.accent : C.surf,
                    color: payment === option.key ? '#FFFFFF' : C.muted,
                    border: `1px solid ${payment === option.key ? C.accent : 'transparent'}`
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {payment === 'cash' && cart.length > 0 && (
              <div style={{ display: 'grid', gap: 7 }}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {QUICK_CASH.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setReceived(String(amount))}
                      style={{
                        flex: '1 1 62px', minHeight: 34, borderRadius: 9, cursor: 'pointer',
                        background: C.surf, border: `1px solid ${C.border}`, color: C.muted,
                        fontSize: 11.5, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      {amount.toLocaleString('en-US')}
                    </button>
                  ))}
                </div>
                <input
                  type="number" inputMode="numeric" value={received}
                  onChange={(e) => setReceived(e.target.value)} placeholder="المبلغ المستلَم"
                  style={{
                    padding: '10px 12px', borderRadius: 11, background: C.surf,
                    border: `1px solid ${C.border}`, color: C.text, fontSize: 13.5, fontFamily: 'inherit'
                  }}
                />
                {Number(received) > 0 && (
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: 13.5, fontWeight: 800,
                    color: change >= 0 ? C.green : C.red
                  }}>
                    <span>{change >= 0 ? 'الباقي' : 'ناقص'}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{money(Math.abs(change))}</span>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gap: 4, fontSize: 12.5, color: C.muted }}>
              <Row label="المجموع" value={money(subtotal)} />
              {discountValue > 0 && <Row label="الخصم" value={`− ${money(discountValue)}`} />}
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              fontSize: 20, fontWeight: 900
            }}>
              <span>الإجمالي</span>
              <span style={{ color: C.accent, fontVariantNumeric: 'tabular-nums' }}>{money(total)}</span>
            </div>

            <button
              onClick={complete}
              disabled={cart.length === 0 || saving}
              style={{
                minHeight: 50, borderRadius: 14, border: 'none', fontFamily: 'inherit',
                background: cart.length === 0 ? C.surf : C.accent,
                color: cart.length === 0 ? C.muted : '#FFFFFF',
                fontWeight: 900, fontSize: 15,
                cursor: cart.length === 0 || saving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              <IoCheckmarkCircle size={18} />
              {saving ? 'جارٍ الحفظ…' : 'إتمام البيعة'}
            </button>
          </aside>
        </div>
      </div>

      {/* ============ الإيصال ============ */}
      {receipt && (
        <div
          onClick={() => setReceipt(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.62)', zIndex: 999,
            display: 'grid', placeItems: 'center', padding: 18
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="pos-receipt"
            style={{
              background: '#fff', color: '#111', borderRadius: 14, padding: 20,
              width: 'min(100%, 22rem)', maxHeight: '86vh', overflowY: 'auto',
              fontFamily: 'monospace, monospace'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <IoReceiptOutline size={26} />
              <div style={{ fontWeight: 800, marginTop: 6 }}>{receipt.orderNumber}</div>
              <div style={{ fontSize: 11, color: '#666' }}>
                {new Date().toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' })}
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #bbb', borderBottom: '1px dashed #bbb', padding: '10px 0' }}>
              {receipt.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5, gap: 8 }}>
                  <span style={{ flex: 1 }}>{item.name} ×{item.quantity}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{money(item.lineTotal)}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: '10px 0', fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>المجموع</span><span>{money(receipt.subtotal)}</span>
              </div>
              {receipt.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>الخصم</span><span>− {money(receipt.discountAmount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, marginTop: 6 }}>
                <span>الإجمالي</span><span>{money(receipt.total)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 10 }} className="pos-receipt-actions">
              <button
                onClick={() => window.print()}
                style={{
                  flex: 1, minHeight: 42, borderRadius: 10, border: '1px solid #ccc',
                  background: '#fff', cursor: 'pointer', fontSize: 13.5, fontFamily: 'inherit'
                }}
              >
                طباعة
              </button>
              <button
                onClick={() => setReceipt(null)}
                style={{
                  flex: 1, minHeight: 42, borderRadius: 10, border: 'none',
                  background: '#E8EFEA', color: '#fff', cursor: 'pointer',
                  fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit'
                }}
              >
                بيعة جديدة
              </button>
            </div>
          </div>
        </div>
      )}

      {returnOpen && (
        <ReturnSheet
          recent={shift?.recent || []}
          onClose={() => setReturnOpen(false)}
          onDone={(r) => {
            setReturnOpen(false);
            setReturnReceipt(r);
            loadShift();
            // الرصيد عاد إلى الرفّ — والشبكة تعرضه
            load(term);
          }}
        />
      )}

      {returnReceipt && <ReturnReceiptView receipt={returnReceipt} onClose={() => setReturnReceipt(null)} />}

      {shiftOpen && shift && <ShiftSheet shift={shift} onClose={() => setShiftOpen(false)} />}

      <style>{`
        @media (max-width: 900px) {
          .pos-grid { grid-template-columns: 1fr !important; }
          .pos-cart { position: static !important; }
        }
        /* على الجوال تصعد نافذة المرتجع من الأسفل حيث تصلها الإبهام */
        @media (max-width: 600px) {
          .pos-sheet-backdrop { place-items: end center !important; padding: 0 !important; }
          .pos-sheet { width: 100% !important; border-radius: 20px 20px 0 0 !important; max-height: 92vh !important; }
        }
        @media print {
          body * { visibility: hidden; }
          .pos-receipt, .pos-receipt * { visibility: visible; }
          .pos-receipt { position: absolute; inset: 0; margin: 0; box-shadow: none; }
          .pos-receipt-actions { display: none !important; }
        }
      `}</style>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <span>{label}</span>
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
  </div>
);

const Step: React.FC<{ icon: React.ComponentType<{ size?: number }>; onClick: () => void }> = ({
  icon: Icon, onClick
}) => (
  <button
    onClick={onClick}
    style={{
      width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
      background: C.card, border: `1px solid ${C.border}`, color: C.text,
      display: 'grid', placeItems: 'center'
    }}
  >
    <Icon size={13} />
  </button>
);

// ==================== المرتجع ====================

/** غطاءٌ بنافذة — على الجوال لوحةٌ من الأسفل تصلها الإبهام، وعلى المكتب نافذة وسطى */
const Sheet: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }> = ({
  title, onClose, children, footer
}) => (
  <div
    onClick={onClose}
    className="pos-sheet-backdrop"
    style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 998,
      display: 'grid', placeItems: 'center', padding: 14
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="pos-sheet"
      dir="rtl"
      style={{
        background: C.card, color: C.text, borderRadius: 20, width: 'min(100%, 34rem)',
        maxHeight: '90vh', display: 'grid', gridTemplateRows: 'auto minmax(0,1fr) auto', overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
        <b style={{ flex: 1, fontSize: 15.5 }}>{title}</b>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          style={{
            width: 36, height: 36, borderRadius: 10, border: 'none', background: C.surf,
            color: C.muted, cursor: 'pointer', display: 'grid', placeItems: 'center'
          }}
        >
          <IoClose size={18} />
        </button>
      </div>
      <div style={{ overflowY: 'auto', padding: 16, display: 'grid', gap: 14, alignContent: 'start' }}>{children}</div>
      {footer && <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}` }}>{footer}</div>}
    </div>
  </div>
);

/**
 * شاشة المرتجع: رقم البيعة ← الأصناف والكمّيات ← السبب وطريقة الردّ.
 *
 * **المبلغ يُعرض قبل التأكيد** بحصّة الخصم مطروحة، لأنه ما سيُخرجه الكاشير
 * من الدرج — ومفاجأته بمبلغٍ آخر بعد الضغط تُربك الزبون الواقف أمامه.
 * والخادم يعيد الحساب بنفسه على أيّ حال؛ الرقم هنا للعرض.
 */
const ReturnSheet: React.FC<{
  recent: Shift['recent'];
  onClose: () => void;
  onDone: (receipt: ReturnReceipt) => void;
}> = ({ recent, onClose, onDone }) => {
  const [ref, setRef] = useState('');
  const [finding, setFinding] = useState(false);
  const [sale, setSale] = useState<SaleForReturn | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [method, setMethod] = useState('cash');
  const [saving, setSaving] = useState(false);

  const find = async (value = ref) => {
    const clean = value.trim();
    if (!clean) return;
    setFinding(true);
    setSale(null);
    try {
      const data: any = await api.get(`/pos/sales/${encodeURIComponent(clean)}`);
      setSale(data);
      setQty({});
      setMethod(PAYMENTS.some((p) => p.key === data?.paymentMethod) ? data.paymentMethod : 'cash');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'تعذّر العثور على البيعة');
    } finally {
      setFinding(false);
    }
  };

  const lines = sale?.items || [];
  const selected = lines.filter((l) => (qty[l.orderItemId] || 0) > 0);
  const refund = selected.reduce((sum, l) => sum + l.unitRefund * (qty[l.orderItemId] || 0), 0);
  const nothingLeft = lines.length > 0 && lines.every((l) => l.returnableQuantity === 0);
  const fullReason = [reason, note.trim()].filter(Boolean).join(' — ');

  const setLine = (line: SaleLineForReturn, next: number) =>
    setQty((prev) => ({ ...prev, [line.orderItemId]: Math.max(0, Math.min(next, line.returnableQuantity)) }));

  const returnAll = () =>
    setQty(Object.fromEntries(lines.map((l) => [l.orderItemId, l.returnableQuantity])));

  const submit = async () => {
    if (!sale || selected.length === 0) return;
    setSaving(true);
    try {
      const data: any = await api.post('/pos/returns', {
        orderId: sale.id,
        items: selected.map((l) => ({ orderItemId: l.orderItemId, quantity: qty[l.orderItemId] })),
        reason: fullReason || undefined,
        refundMethod: method
      });
      toast.success(`تمّ المرتجع — رُدّ ${money(data.amount)}`);
      onDone(data);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'تعذّر تسجيل المرتجع', { duration: 6000 });
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: '12px 12px', borderRadius: 12, background: C.surf,
    border: `1px solid ${C.border}`, color: C.text, fontSize: 14, fontFamily: 'inherit', width: '100%'
  };

  return (
    <Sheet
      title="مرتجع"
      onClose={onClose}
      footer={sale && sale.returnable && !nothingLeft ? (
        <button
          type="button"
          onClick={submit}
          disabled={selected.length === 0 || saving}
          style={{
            width: '100%', minHeight: 50, borderRadius: 14, border: 'none', fontFamily: 'inherit',
            background: selected.length === 0 ? C.surf : C.red,
            color: selected.length === 0 ? C.muted : '#FFFFFF',
            fontWeight: 900, fontSize: 15,
            cursor: selected.length === 0 || saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}
        >
          {saving ? <BusyDots /> : <IoArrowUndo size={18} />}
          {selected.length === 0 ? 'اختر ما يُرجَع' : `تأكيد المرتجع وردّ ${money(refund)}`}
        </button>
      ) : undefined}
    >
      <form
        onSubmit={(e) => { e.preventDefault(); find(); }}
        style={{ display: 'flex', gap: 8 }}
      >
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="رقم البيعة من الإيصال (POS-…)"
          autoFocus
          dir="ltr"
          style={{ ...inputStyle, flex: 1, textAlign: 'right' }}
        />
        <button
          type="submit"
          disabled={!ref.trim() || finding}
          style={{
            minWidth: 52, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: C.accent, color: '#fff', display: 'grid', placeItems: 'center'
          }}
          aria-label="بحث"
        >
          <IoSearch size={19} />
        </button>
      </form>

      {/* بيعات اليوم ضغطةً واحدة — أغلب المرتجعات لبيعةٍ قريبة والإيصال في يد الزبون */}
      {!sale && !finding && recent.length > 0 && (
        <div style={{ display: 'grid', gap: 7 }}>
          <span style={{ fontSize: 12, color: C.muted }}>بيعات اليوم</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {recent.map((r) => (
              <button
                key={r.orderNumber}
                type="button"
                onClick={() => { setRef(r.orderNumber); find(r.orderNumber); }}
                style={{
                  display: 'grid', gap: 1, textAlign: 'start', padding: '7px 11px', borderRadius: 11,
                  background: C.surf, border: `1px solid ${C.border}`, cursor: 'pointer', fontFamily: 'inherit',
                  color: C.text
                }}
              >
                <b style={{ fontSize: 12, direction: 'ltr' }}>{r.orderNumber}</b>
                <span style={{ fontSize: 11, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
                  {money(Number(r.total))} · {new Date(r.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {finding && (
        <SkeletonScope label="جارٍ جلب البيعة…" style={{ display: 'grid', gap: 10 }}>
          <SkeletonLine w="45%" h={14} />
          <SkeletonBlock h={58} />
          <SkeletonBlock h={58} />
          <SkeletonLine w="60%" />
        </SkeletonScope>
      )}

      {sale && (
        <>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '4px 12px', alignItems: 'baseline',
            fontSize: 12.5, color: C.muted
          }}>
            <b style={{ color: C.text, fontSize: 14, direction: 'ltr' }}>{sale.orderNumber}</b>
            <span>{new Date(sale.createdAt).toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' })}</span>
            <span>{PAYMENT_LABEL[sale.paymentMethod] || sale.paymentMethod}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>الإجمالي {money(sale.total)}</span>
            {sale.refundedTotal > 0 && (
              <span style={{ color: C.red }}>أُرجع سابقاً {money(sale.refundedTotal)}</span>
            )}
          </div>

          {!sale.returnable ? (
            <Notice tone="red">
              {sale.manualReturn
                ? 'سُجّل لهذه البيعة مرتجعٌ يدويّ من القسم المالي — ألغِه هناك أولاً لتُرجع الأصناف من هنا.'
                : 'هذا الطلب لم يُسلَّم بعد — يُلغى من شاشة الطلبات ولا يُرجَع.'}
            </Notice>
          ) : nothingLeft ? (
            <Notice tone="muted">أُرجعت كل أصناف هذه البيعة من قبل.</Notice>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 800 }}>ما الذي عاد؟</span>
                <button
                  type="button"
                  onClick={returnAll}
                  style={{
                    background: 'transparent', border: 'none', color: C.accent, fontWeight: 800,
                    fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', padding: 4
                  }}
                >
                  إرجاع الكل
                </button>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                {lines.map((line) => {
                  const n = qty[line.orderItemId] || 0;
                  const done = line.returnableQuantity === 0;
                  return (
                    <div key={line.orderItemId} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12,
                      background: n > 0 ? `${C.red}0F` : C.surf,
                      border: `1px solid ${n > 0 ? `${C.red}55` : 'transparent'}`,
                      opacity: done ? 0.55 : 1
                    }}>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>
                        <span style={{ display: 'block', fontWeight: 700 }}>{line.name}</span>
                        <span style={{ color: C.muted, fontSize: 11 }}>
                          بيع {line.quantity}
                          {line.returnedQuantity > 0 ? ` · أُرجع ${line.returnedQuantity}` : ''}
                          {' · '}يُردّ {money(line.unitRefund)} للقطعة
                        </span>
                      </span>
                      {done ? (
                        <span style={{ fontSize: 11.5, color: C.muted }}>أُرجع كاملاً</span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                          <Step icon={IoRemove} onClick={() => setLine(line, n - 1)} />
                          <b style={{ minWidth: 30, textAlign: 'center', fontSize: 13.5, fontVariantNumeric: 'tabular-nums' }}>
                            {n}/{line.returnableQuantity}
                          </b>
                          <Step icon={IoAdd} onClick={() => setLine(line, n + 1)} />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'grid', gap: 7 }}>
                <span style={{ fontSize: 12.5, fontWeight: 800 }}>السبب</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {RETURN_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(reason === r ? '' : r)}
                      style={{
                        minHeight: 36, padding: '0 12px', borderRadius: 999, cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
                        background: reason === r ? C.accent : C.card,
                        color: reason === r ? '#fff' : C.text,
                        border: `1px solid ${reason === r ? C.accent : C.border}`
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ملاحظة (اختياري)"
                  maxLength={300}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gap: 7 }}>
                <span style={{ fontSize: 12.5, fontWeight: 800 }}>ردّ المبلغ</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {PAYMENTS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setMethod(option.key)}
                      style={{
                        flex: 1, minHeight: 40, borderRadius: 11, fontSize: 12.5, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                        background: method === option.key ? C.accent : C.surf,
                        color: method === option.key ? '#FFFFFF' : C.muted,
                        border: `1px solid ${method === option.key ? C.accent : 'transparent'}`
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {method !== sale.paymentMethod && (
                  <span style={{ fontSize: 11.5, color: C.muted }}>
                    البيعة دُفعت {PAYMENT_LABEL[sale.paymentMethod] || sale.paymentMethod} — والردّ بطريقة أخرى يظهر في مطابقة النوبة كما هو.
                  </span>
                )}
              </div>

              {sale.discountAmount > 0 && (
                <span style={{ fontSize: 11.5, color: C.muted }}>
                  خصم البيعة ({money(sale.discountAmount)}) موزَّع على أصنافها — فيُردّ عن كل قطعة ما دُفع فيها فعلاً.
                </span>
              )}
            </>
          )}
        </>
      )}
    </Sheet>
  );
};

const Notice: React.FC<{ tone: 'red' | 'muted'; children: React.ReactNode }> = ({ tone, children }) => (
  <div style={{
    fontSize: 12.5, lineHeight: 1.8, borderRadius: 12, padding: '10px 12px',
    background: tone === 'red' ? `${C.red}12` : C.surf,
    color: tone === 'red' ? C.red : C.muted
  }}>
    {children}
  </div>
);

/** إيصال المرتجع — نفس هيئة إيصال البيع ونفس قواعد الطباعة (`.pos-receipt`) */
const ReturnReceiptView: React.FC<{ receipt: ReturnReceipt; onClose: () => void }> = ({ receipt, onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.62)', zIndex: 999,
      display: 'grid', placeItems: 'center', padding: 18
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="pos-receipt"
      style={{
        background: '#fff', color: '#111', borderRadius: 14, padding: 20,
        width: 'min(100%, 22rem)', maxHeight: '86vh', overflowY: 'auto',
        fontFamily: 'monospace, monospace'
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <IoArrowUndo size={24} />
        <div style={{ fontWeight: 800, marginTop: 6 }}>إيصال مرتجع</div>
        <div style={{ fontWeight: 800 }}>{receipt.returnNumber}</div>
        <div style={{ fontSize: 11.5, color: '#444' }}>عن البيعة {receipt.orderNumber}</div>
        <div style={{ fontSize: 11, color: '#666' }}>
          {new Date(receipt.createdAt).toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' })}
        </div>
      </div>

      <div style={{ borderTop: '1px dashed #bbb', borderBottom: '1px dashed #bbb', padding: '10px 0' }}>
        {receipt.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5, gap: 8 }}>
            <span style={{ flex: 1 }}>{item.name} ×{item.quantity}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>− {money(item.refund)}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '10px 0', fontSize: 13 }}>
        {receipt.reason && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
            <span>السبب</span><span style={{ textAlign: 'end' }}>{receipt.reason}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>طريقة الردّ</span><span>{PAYMENT_LABEL[receipt.refundMethod] || receipt.refundMethod}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, marginTop: 6 }}>
          <span>المبلغ المُعاد</span><span>{money(receipt.amount)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }} className="pos-receipt-actions">
        <button
          onClick={() => window.print()}
          style={{
            flex: 1, minHeight: 42, borderRadius: 10, border: '1px solid #ccc',
            background: '#fff', cursor: 'pointer', fontSize: 13.5, fontFamily: 'inherit'
          }}
        >
          طباعة
        </button>
        <button
          onClick={onClose}
          style={{
            flex: 1, minHeight: 42, borderRadius: 10, border: 'none',
            background: C.accent, color: '#fff', cursor: 'pointer',
            fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit'
          }}
        >
          تمّ
        </button>
      </div>
    </div>
  </div>
);

/**
 * ملخّص النوبة — ما يطابقه الكاشير مع الدرج عند الإغلاق.
 *
 * الصافي لكل طريقة دفع لا مجموعٌ واحد: النقد في الدرج = مبيعات النقد −
 * ما رُدّ نقداً، والبطاقة تُطابَق مع كشف الجهاز لا مع الدرج.
 */
const ShiftSheet: React.FC<{ shift: Shift; onClose: () => void }> = ({ shift, onClose }) => {
  const methods = Array.from(new Set([...Object.keys(shift.byMethod), ...Object.keys(shift.refundsByMethod)]));
  return (
    <Sheet title="ملخّص نوبة اليوم" onClose={onClose}>
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <Tile label={`مبيعات (${shift.count})`} value={money(shift.total)} />
        <Tile label={`مرتجعات (${shift.refundsCount})`} value={shift.refundsTotal > 0 ? `− ${money(shift.refundsTotal)}` : money(0)} color={shift.refundsTotal > 0 ? C.red : undefined} />
        <Tile label="الصافي" value={money(shift.net)} color={C.accent} />
      </div>

      {methods.length > 0 && (
        <div style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800 }}>حسب طريقة الدفع</span>
          {methods.map((m) => (
            <div key={m} style={{
              display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12.5,
              padding: '8px 11px', background: C.surf, borderRadius: 10, fontVariantNumeric: 'tabular-nums'
            }}>
              <b style={{ flex: 1 }}>{PAYMENT_LABEL[m] || m}</b>
              <span style={{ color: C.muted }}>{money(shift.byMethod[m] || 0)}</span>
              {(shift.refundsByMethod[m] || 0) > 0 && (
                <span style={{ color: C.red }}>− {money(shift.refundsByMethod[m])}</span>
              )}
              <b style={{ color: C.accent }}>= {money(shift.netByMethod[m] ?? 0)}</b>
            </div>
          ))}
        </div>
      )}

      {shift.recentReturns.length > 0 && (
        <div style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800 }}>مرتجعات اليوم</span>
          {shift.recentReturns.map((r) => (
            <div key={r.returnNumber} style={{
              display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12, color: C.muted, flexWrap: 'wrap'
            }}>
              <b style={{ color: C.text, direction: 'ltr' }}>{r.returnNumber}</b>
              <span style={{ direction: 'ltr' }}>← {r.orderNumber}</span>
              <span>{PAYMENT_LABEL[r.refundMethod] || r.refundMethod}</span>
              <span style={{ flex: 1 }} />
              <b style={{ color: C.red, fontVariantNumeric: 'tabular-nums' }}>− {money(r.amount)}</b>
            </div>
          ))}
        </div>
      )}

      {shift.count === 0 && shift.refundsCount === 0 && (
        <Notice tone="muted">لا بيع ولا مرتجع اليوم بعد.</Notice>
      )}
    </Sheet>
  );
};

const Tile: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div style={{ background: C.surf, borderRadius: 12, padding: '10px 11px', minWidth: 0 }}>
    <div style={{ fontSize: 11, color: C.muted }}>{label}</div>
    <div style={{
      fontSize: 14.5, fontWeight: 900, marginTop: 3, color: color || C.text,
      fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere'
    }}>
      {value}
    </div>
  </div>
);

export default PosPage;
