// frontend/src/hooks/useCartSnapshot.ts
//
// يلتقط السلّة التي بلغت صفحة الدفع ولم تُرسَل.
//
// **متى تُلتقط:** حين يفتح الزبون سلّته وفيها أصناف — لا مع كل إضافةٍ إلى
// السلّة. الفرق مهمّ: نصف من يضيف صنفاً يتصفّح ولا ينوي الشراء، والتقاط
// كل تصفّحٍ يملأ الجدول بعرباتٍ لا معنى لها ثمّ يطارد أصحابها برسائل.
//
// **وما لا تفعله:** لا ترسل شيئاً بنفسها. تحفظ لقطةً فقط، والمجدول على
// الخادم يقرّر لاحقاً — بعد المدّة التي ضبطها التاجر — هل صارت متروكة.

import { useEffect, useRef } from 'react';
import api from '@/services/api';
import { getVisitorId } from '@/utils/visitor';

interface SnapshotItem {
  name: string;
  quantity: number;
}

interface Params {
  businessId?: string | null;
  businessType: 'restaurant' | 'store';
  /** يُفعَّل حين تكون السلّة مفتوحةً أمام الزبون */
  active: boolean;
  items: SnapshotItem[];
  total: number;
  phone?: string;
}

/** تأخيرٌ قبل الإرسال — الزبون يعدّل الكمّيات، ولا داعي لطلبٍ لكل ضغطة */
const DEBOUNCE_MS = 2500;

export const useCartSnapshot = ({
  businessId,
  businessType,
  active,
  items,
  total,
  phone
}: Params): void => {
  const timer = useRef<number | undefined>(undefined);
  // آخر ما أُرسل — يمنع إعادة إرسال نفس اللقطة عند كل إعادة رسم
  const lastSent = useRef<string>('');

  useEffect(() => {
    if (!businessId || !active) return;

    const payload = {
      businessId,
      businessType,
      visitorId: getVisitorId(),
      phone: phone?.trim() || undefined,
      total,
      items: items.slice(0, 40).map((i) => ({ name: i.name, quantity: i.quantity }))
    };

    const fingerprint = JSON.stringify([payload.items, payload.total, payload.phone]);
    if (fingerprint === lastSent.current) return;

    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      lastSent.current = fingerprint;
      // الفشل يُبتلع عمداً: هذا تحسينٌ تسويقيّ، وإظهار خطئه لزبونٍ يهمّ
      // بالدفع يُخيفه من إتمام الطلب
      api.post('/automations/cart-snapshot', payload).catch(() => undefined);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer.current);
  }, [businessId, businessType, active, items, total, phone]);
};

export default useCartSnapshot;
