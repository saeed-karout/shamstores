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
// **والباركود بمحرّكين**: `BarcodeDetector` الأصيلة حيث توجد، وZXing
// المحمَّلة عند الحاجة على Safari/iPhone — راجع utils/barcodeScanner.ts.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IoSearch, IoBarcode, IoTrash, IoAdd, IoRemove, IoCart,
  IoCheckmarkCircle, IoClose, IoReceiptOutline, IoStatsChart
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { formatPrice, DEFAULT_CURRENCY } from '@/utils/currency';
import { detectEngine, startScan, ScanHandle } from '@/utils/barcodeScanner';

const C = {
  bg: '#082E24',
  card: '#112E23',
  surf: '#0F3D31',
  accent: '#C8E235',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B',
  green: '#4ADE80'
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

const PosPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [term, setTerm] = useState('');
  const [cart, setCart] = useState<Line[]>([]);
  const [payment, setPayment] = useState('cash');
  const [received, setReceived] = useState('');
  const [discount, setDiscount] = useState('');
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [shift, setShift] = useState<{ count: number; total: number } | null>(null);
  const [scanning, setScanning] = useState(false);

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
    } catch (e: any) {
      if (e?.response?.status === 403) {
        toast.error('الكاشير إضافة مدفوعة — فعّلها من صفحة الميزات', { duration: 7000 });
      }
    }
  }, []);

  const loadShift = useCallback(async () => {
    try {
      const data: any = await api.get('/pos/shift');
      setShift({ count: data?.count ?? 0, total: data?.total ?? 0 });
    } catch {
      // ملخّص النوبة ثانويّ — غيابه لا يمنع البيع
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

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }} dir="rtl">
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '16px 14px 24px' }}>

        <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 900, flex: 1 }}>الكاشير</h1>
          {shift && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: C.muted,
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: '6px 13px'
            }}>
              <IoStatsChart size={13} color={C.accent} />
              اليوم: <b style={{ color: C.text }}>{shift.count}</b> بيعة ·
              <b style={{ color: C.accent }}>{money(shift.total)}</b>
            </div>
          )}
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
                    color: scanning ? '#fff' : '#0A2018', border: 'none',
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
                    color: payment === option.key ? '#0A2018' : C.muted,
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
                color: cart.length === 0 ? C.muted : '#0A2018',
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
                  background: '#0D4A3A', color: '#fff', cursor: 'pointer',
                  fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit'
                }}
              >
                بيعة جديدة
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .pos-grid { grid-template-columns: 1fr !important; }
          .pos-cart { position: static !important; }
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

export default PosPage;
