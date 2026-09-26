// frontend/src/components/ai/AiDescribeButton.tsx
//
// «اكتب الوصف بالذكاء الاصطناعي» في نموذج المنتج أو الصنف.
//
// التاجر يعرف منتجه ولا يعرف كيف يصفه — وأغلب المنتجات في المتاجر الصغيرة
// بلا وصفٍ أصلاً، فيُعامَل المنتج كصورةٍ وسعر ويضيع في بحث جوجل. المساعد يكتب
// من الاسم والفئة والصورة فقط، والنتيجة تُملأ في الحقول ليعدّلها قبل الحفظ.

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { IoSparklesOutline } from 'react-icons/io5';
import { useAiStatus, describeProduct, invalidateAiStatus, aiErrorMessage, type ProductCopy } from '@/services/ai';
import { loadBitmapFromUrl, toSizedDataUrl } from '@/utils/imageTools';
import { getImageUrl } from '@/utils/imageHelpers';

interface Props {
  name: string;
  price?: number | string | null;
  category?: string | null;
  /** الوصف الحالي — يُرسَل ملاحظاتٍ فيُبنى عليه لا يُتجاهَل */
  notes?: string | null;
  imageUrl?: string | null;
  /** هل في الحقول نصٌّ سيُستبدل؟ — يُسأل التاجر قبل الكتابة فوقه */
  hasExisting?: boolean;
  onApply: (copy: ProductCopy) => void;
  /** صفحة الخطط لهذا النوع من النشاط */
  plansHref: string;
  colors: { text: string; muted: string; accent: string; border: string };
}

const AiDescribeButton: React.FC<Props> = ({
  name,
  price,
  category,
  notes,
  imageUrl,
  hasExisting,
  onApply,
  plansHref,
  colors
}) => {
  const { status, refresh } = useAiStatus();
  const [busy, setBusy] = useState(false);

  if (!status?.configured) return null;

  const quota = status.describe;
  const planBlocked = !quota.allowed && quota.reason === 'plan';

  const run = async () => {
    if (!name.trim()) {
      toast.error('اكتب اسم المنتج أوّلاً');
      return;
    }
    if (hasExisting && !window.confirm('سيُستبدل الوصف الحالي بنصٍّ جديد. متابعة؟')) return;
    setBusy(true);
    try {
      // صورةٌ صغيرة تكفي لقراءة اللون والشكل؛ وإن منعها CORS نكتب بلاها
      let image: string | null = null;
      if (imageUrl) {
        try {
          const bitmap = await loadBitmapFromUrl(getImageUrl(imageUrl));
          image = toSizedDataUrl(bitmap, 640, 250 * 1024);
        } catch {
          image = null;
        }
      }
      const numericPrice = Number(price);
      const copy = await describeProduct({
        name: name.trim(),
        price: Number.isFinite(numericPrice) && numericPrice > 0 ? numericPrice : null,
        category: category || null,
        notes: notes || null,
        image
      });
      onApply(copy);
      toast.success('كُتب الوصف — راجعه قبل الحفظ');
      invalidateAiStatus();
      refresh();
    } catch (error: any) {
      toast.error(aiErrorMessage(error, 'تعذّرت كتابة الوصف'));
      if (error?.response?.status === 403 || error?.response?.status === 429) refresh();
    } finally {
      setBusy(false);
    }
  };

  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    padding: '0 11px',
    borderRadius: 9,
    border: `1px solid ${colors.accent}`,
    background: 'transparent',
    color: colors.accent,
    fontSize: 12.5,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer'
  };

  if (planBlocked) {
    return (
      <a
        href={plansHref}
        style={{ ...style, borderColor: colors.border, color: colors.muted, textDecoration: 'none' }}
        title="كتابة الوصف بالذكاء الاصطناعي ضمن الخطط المدفوعة"
      >
        <IoSparklesOutline size={15} />
        اكتب الوصف بالذكاء الاصطناعي — ضمن الخطط المدفوعة
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy || !quota.allowed}
      title={quota.allowed ? `بقي ${quota.remaining} اليوم` : 'بلغت حدّ اليوم — يتجدّد غداً'}
      style={{ ...style, opacity: busy || !quota.allowed ? 0.6 : 1 }}
    >
      <IoSparklesOutline size={15} />
      {busy ? 'يكتب…' : quota.allowed ? 'اكتب الوصف بالذكاء الاصطناعي' : 'بلغت حدّ اليوم'}
    </button>
  );
};

export default AiDescribeButton;
