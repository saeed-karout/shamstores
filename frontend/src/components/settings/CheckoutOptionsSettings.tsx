// frontend/src/components/settings/CheckoutOptionsSettings.tsx
//
// خيارات إتمام الطلب للتاجر — تحت تبويب «الدفع» في إعدادات المتجر والمطعم:
//
//   - خطوة واتساب بعد الطلب: بلا زرّ / زرٌّ ثانويّ / الخطوة الأخيرة البارزة.
//   - «معاينة قبل الدفع» عند الاستلام.
//   - «اشترِ لأهلك» لطلبات المغتربين، مع تعليمات الدفع الحرّة.
//   - تعليمات دفع العربون (العربون نفسه يُضبط في كلّ منتج).
//
// **يحفظ نفسه بنفسه** كإعداد شام كاش أعلاه: `PUT /api/checkout/settings`.
// المدفوع منها يُحفظ ولو لم تشمله الخطة — لكنه لا يظهر للزبائن قبل الترقية.

import React, { useEffect, useState } from 'react';
import { IoLogoWhatsapp, IoEyeOutline, IoGiftOutline, IoWalletOutline, IoSave, IoLockClosedOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '@/services/api';

type Step = 'off' | 'optional' | 'prominent';

interface Settings {
  whatsappStep: Step;
  inspection: boolean;
  giftEnabled: boolean;
  giftPaymentInstructions: string;
  depositInstructions: string;
}

interface Palette {
  card: string; surf: string; accent: string; text: string; muted: string; border: string;
}

const DEFAULTS: Settings = {
  whatsappStep: 'optional',
  inspection: false,
  giftEnabled: false,
  giftPaymentInstructions: '',
  depositInstructions: ''
};

const STEPS: Array<{ value: Step; label: string; hint: string }> = [
  { value: 'off', label: 'بلا زرّ', hint: 'تتابع الطلبات من اللوحة وحدها' },
  { value: 'optional', label: 'زرّ اختياري', hint: '«أرسل نسخةً للتاجر» تحت رقم الطلب' },
  { value: 'prominent', label: 'خطوة أخيرة بارزة', hint: 'لمن يدير طلباته من واتساب — الطلب مسجَّل قبلها على كل حال' }
];

const CheckoutOptionsSettings: React.FC<{ colors: Palette; canEdit?: boolean }> = ({ colors: C, canEdit = true }) => {
  const [form, setForm] = useState<Settings>(DEFAULTS);
  const [ent, setEnt] = useState<{ gift: boolean; deposits: boolean }>({ gift: false, deposits: false });
  const [kind, setKind] = useState<'store' | 'restaurant'>('store');
  const [hasWhatsapp, setHasWhatsapp] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get('/checkout/settings')
      .then((res: any) => {
        if (!alive) return;
        const d = res?.data || res;
        setForm({ ...DEFAULTS, ...(d?.settings || {}) });
        setEnt(d?.entitlements || { gift: false, deposits: false });
        setKind(d?.businessType === 'restaurant' ? 'restaurant' : 'store');
        setHasWhatsapp(d?.hasWhatsapp !== false);
      })
      .catch(() => alive && setLoadError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const update = (patch: Partial<Settings>) => {
    setDirty(true);
    setForm((f) => ({ ...f, ...patch }));
  };

  const giftError =
    form.giftEnabled && form.giftPaymentInstructions.trim().length < 10
      ? 'اكتب تعليمات الدفع للمغترب — كيف يحوّل إليك ولمن. بدونها يطلب ولا يعرف كيف يدفع.'
      : '';

  const save = async () => {
    if (!canEdit || giftError) return;
    setSaving(true);
    try {
      await api.put('/checkout/settings', { settings: form });
      toast.success('تم حفظ خيارات إتمام الطلب');
      setDirty(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'تعذّر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const card: React.CSSProperties = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 };
  const title: React.CSSProperties = { color: C.text, fontWeight: 700, fontSize: 14.5 };
  const hint: React.CSSProperties = { color: C.muted, fontSize: 12.5, lineHeight: 1.8, marginTop: 4 };
  const textarea: React.CSSProperties = {
    width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surf,
    color: C.text, fontSize: 14, fontFamily: 'inherit', minHeight: 90, resize: 'vertical'
  };
  const lock = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, color: C.muted, background: C.surf, border: `1px solid ${C.border}`, borderRadius: 999, padding: '2px 9px' }}>
      <IoLockClosedOutline size={12} /> النموّ فما فوق
    </span>
  );

  if (loading) return <div style={{ ...card, color: C.muted, fontSize: 13 }}>جارٍ تحميل خيارات إتمام الطلب…</div>;
  if (loadError) {
    return (
      <div style={{ ...card, color: C.muted, fontSize: 13 }}>
        تعذّر تحميل خيارات إتمام الطلب. أعد تحميل الصفحة بعد قليل.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 640, marginTop: 16 }}>
      <h3 style={{ margin: '8px 0 0', color: C.text, fontSize: 16, fontWeight: 800 }}>خيارات إتمام الطلب</h3>

      {/* واتساب */}
      <div style={card}>
        <div style={{ display: 'flex', gap: 12 }}>
          <IoLogoWhatsapp size={22} style={{ color: '#25D366', flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={title}>خطوة واتساب بعد الطلب</div>
            <div style={hint}>
              بعد أن يسجَّل الطلب يرى الزبون زرّاً يرسل لك تفاصيله على واتساب برسالة جاهزة. روابط واتساب
              عادية — بلا اشتراك ولا رسوم.
            </div>
            {!hasWhatsapp && (
              <div style={{ ...hint, color: '#B45309' }}>أضف رقم واتساب في «عام» — بدونه لا يظهر الزرّ للزبون.</div>
            )}
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              {STEPS.map((s) => (
                <label key={s.value} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: canEdit ? 'pointer' : 'default' }}>
                  <input
                    type="radio"
                    name="wa-step"
                    checked={form.whatsappStep === s.value}
                    disabled={!canEdit}
                    onChange={() => update({ whatsappStep: s.value })}
                    style={{ marginTop: 4, accentColor: C.accent }}
                  />
                  <span>
                    <span style={{ color: C.text, fontWeight: 700, fontSize: 13.5 }}>{s.label}</span>
                    <span style={{ display: 'block', color: C.muted, fontSize: 12 }}>{s.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* المعاينة */}
      <div style={card}>
        <label style={{ display: 'flex', gap: 12, cursor: canEdit ? 'pointer' : 'default' }}>
          <IoEyeOutline size={22} style={{ color: C.accent, flexShrink: 0, marginTop: 2 }} />
          <span style={{ flex: 1 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                checked={form.inspection}
                disabled={!canEdit}
                onChange={(e) => update({ inspection: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: C.accent }}
              />
              <span style={title}>«معاينة قبل الدفع» عند الاستلام</span>
            </span>
            <span style={{ ...hint, display: 'block' }}>
              شارة على صفحات منتجاتك وملاحظة في السلّة: الزبون يفحص طلبه ويدفع فقط إن كان كما طلب. تُحفظ
              على كل طلب ويراها السائق — فيعرف أنه ينتظر المعاينة.
            </span>
          </span>
        </label>
      </div>

      {/* هدايا المغتربين */}
      <div style={card}>
        <div style={{ display: 'flex', gap: 12 }}>
          <IoGiftOutline size={22} style={{ color: C.accent, flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', cursor: canEdit ? 'pointer' : 'default' }}>
              <input
                type="checkbox"
                checked={form.giftEnabled}
                disabled={!canEdit}
                onChange={(e) => update({ giftEnabled: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: C.accent }}
              />
              <span style={title}>«اشترِ لأهلك» — طلبات المغتربين</span>
              {!ent.gift && lock}
            </label>
            <div style={hint}>
              يطلب المغترب من الخارج ويدفع هو، وتوصل أنت للمستلم في سوريا. الطلب يصلك «بانتظار التحويل» ولا
              يُجهَّز حتى تضغط «تم استلام الدفعة». لافتة «اشترِ لأهلك في سوريا» تظهر في واجهتك.
            </div>
            {!ent.gift && form.giftEnabled && (
              <div style={{ ...hint, color: '#B45309' }}>محفوظ، لكنه لا يظهر لزبائنك قبل الترقية إلى «النموّ» أو أعلى.</div>
            )}
            {form.giftEnabled && (
              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', color: C.muted, fontSize: 12.5, fontWeight: 600, marginBottom: 6 }} htmlFor="gift-instr">
                  تعليمات الدفع للمغترب *
                </label>
                <textarea
                  id="gift-instr"
                  value={form.giftPaymentInstructions}
                  disabled={!canEdit}
                  onChange={(e) => update({ giftPaymentInstructions: e.target.value.slice(0, 1000) })}
                  placeholder={'مثال: حوّل المبلغ عبر ويسترن يونيون باسم …، أو إلى محفظة شام كاش رقم …\nثم أرسل صورة الإيصال مع رقم الطلب على واتساب.'}
                  style={textarea}
                />
                {giftError && <div style={{ color: '#B42318', fontSize: 12, marginTop: 6 }}>{giftError}</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* العربون — للمتجر */}
      {kind === 'store' && (
        <div style={card}>
          <div style={{ display: 'flex', gap: 12 }}>
            <IoWalletOutline size={22} style={{ color: C.accent, flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={title}>العربون والأقساط</span>
                {!ent.deposits && lock}
              </div>
              <div style={hint}>
                حدّد العربون في نموذج كل منتج (نسبة أو مبلغ). يرى الزبون المطلوب الآن والباقي عند الاستلام، وتعلّم
                أنت «استُلم العربون» من تفاصيل الطلب. ومن هناك تضع جدول أقساط للطلب يراه الزبون في صفحة التتبّع.
              </div>
              <label style={{ display: 'block', color: C.muted, fontSize: 12.5, fontWeight: 600, margin: '12px 0 6px' }} htmlFor="dep-instr">
                تعليمات دفع العربون (اختياري)
              </label>
              <textarea
                id="dep-instr"
                value={form.depositInstructions}
                disabled={!canEdit}
                onChange={(e) => update({ depositInstructions: e.target.value.slice(0, 1000) })}
                placeholder="مثال: حوّل العربون إلى شام كاش، أو ادفعه في المحل. محفظة شام كاش المفعّلة أعلاه تظهر تلقائياً."
                style={{ ...textarea, minHeight: 70 }}
              />
            </div>
          </div>
        </div>
      )}

      {canEdit && (
        <button
          type="button"
          onClick={save}
          disabled={saving || !!giftError || !dirty}
          style={{
            justifySelf: 'start',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            minHeight: 44,
            padding: '0 20px',
            borderRadius: 10,
            border: 'none',
            background: C.accent,
            color: '#fff',
            fontWeight: 800,
            fontSize: 14,
            fontFamily: 'inherit',
            cursor: saving || giftError || !dirty ? 'not-allowed' : 'pointer',
            opacity: saving || giftError || !dirty ? 0.6 : 1
          }}
        >
          <IoSave size={16} /> {saving ? 'جارٍ الحفظ…' : 'حفظ خيارات إتمام الطلب'}
        </button>
      )}
    </div>
  );
};

export default CheckoutOptionsSettings;
