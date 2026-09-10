// backend/src/controllers/customerCsvController.ts
//
// استيراد قائمة الزبائن من ملفّ CSV.
//
// **ما يحلّه بصدق، وما لا يحلّه:**
//
// التاجر القادم من منصّةٍ أخرى — أو من دفترٍ ورقيّ — يملك أسماء زبائنه
// وهواتفهم. وقبل هذا كان كتاب زبائنه في المنصّة يبدأ من صفر: الشاشة
// تُشتقّ من الطلبات، فمن لم يطلب هنا لا وجود له.
//
// **ولا يجعلهم جمهوراً للحملات.** الحملات تصل عبر تيليجرام أو بريدٍ أو
// جهازٍ مسجَّل، وزبونٌ باسمٍ وهاتفٍ لا قناة له — وSMS لا تُسلَّم إلى سوريا.
// فمن استُورد ببريدٍ يصير قابلاً للوصول بالبريد إن أكّد التاجر موافقته،
// ومن استُورد بهاتفٍ وحده يظهر في الكتاب ولا يُراسَل. وقولُ غير ذلك
// وعدٌ بما لا يقع.
//
// **والاندماج بالهاتف هو ما يجعلها مفيدة:** الشاشة تُميّز الضيوف بـ
// `guest:<هاتف>`، فالمستورد يحمل نفس المفتاح — يظهر بصفرِ طلبات، وحين
// يطلب تلتحم طلباته بصفّه بدل أن يظهر مرّتين.

import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import { toCsv, sendCsv, parseCsv, rowsToObjects } from '../services/csv.service';

const ALIASES: Record<string, string[]> = {
  name: ['الاسم', 'اسم الزبون', 'name', 'customer name', 'full name'],
  phone: ['الهاتف', 'رقم الهاتف', 'الجوال', 'phone', 'mobile', 'phone number'],
  email: ['البريد', 'البريد الإلكتروني', 'email', 'e-mail'],
  note: ['ملاحظات', 'ملاحظة', 'note', 'notes']
};

const COLUMNS = ['الاسم', 'الهاتف', 'البريد', 'ملاحظات'];

type Scope = { businessId: string; businessType: 'store' | 'restaurant' };

const scopeOf = (req: AuthRequest): Scope | null => {
  if (req.user?.storeId) return { businessId: req.user.storeId, businessType: 'store' };
  if (req.user?.restaurantId) return { businessId: req.user.restaurantId, businessType: 'restaurant' };
  return null;
};

/**
 * يطبّع الهاتف للمطابقة.
 *
 * الأرقام السورية تُكتب بأشكال: `0982…` و`+963982…` و`00963982…`
 * و`963982…`، وبفواصل وشُرَط. وبلا تطبيع يظهر الزبون الواحد أربع مرّات
 * ولا يندمج بطلباته أبداً.
 *
 * يُحفظ **الشكل المحلّي** (بصفرٍ بادئ) لأنه ما تكتبه شاشة الدفع، وعليه
 * تقوم المطابقة في بقيّة المشروع.
 */
export const normalizePhone = (raw: string): string | null => {
  const digits = raw
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\D/g, '');
  if (!digits) return null;

  let local = digits;
  if (local.startsWith('00963')) local = local.slice(5);
  else if (local.startsWith('963')) local = local.slice(3);
  if (!local.startsWith('0')) local = `0${local}`;

  // أقصر من ثمانية أرقام ليس هاتفاً — والأطول من خمسة عشر يتجاوز E.164
  if (local.length < 8 || local.length > 16) return null;
  return local;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface RowError {
  row: number;
  name: string;
  message: string;
}

const buildPlan = async (scope: Scope, csvText: string) => {
  const rows = parseCsv(csvText);
  if (rows.length === 0) throw new Error('الملفّ فارغ');
  if (rows.length === 1) throw new Error('الملفّ يحوي الرؤوس بلا صفوف');

  const { records, unknownHeaders } = rowsToObjects(rows, ALIASES);
  const header = rows[0];

  if (!records.some((r) => 'phone' in r)) {
    throw new Error(`لا عمود للهاتف. الرؤوس المقروءة: ${header.filter(Boolean).join(' · ')}`);
  }

  const existing = await prisma.customerContact.findMany({
    where: { businessId: scope.businessId, businessType: scope.businessType },
    select: { id: true, phone: true }
  });
  const byPhone = new Map(existing.map((c) => [c.phone, c.id]));

  const errors: RowError[] = [];
  const creates: { phone: string; name: string; email: string | null; note: string | null }[] = [];
  const updates: { id: string; data: Record<string, unknown> }[] = [];
  const seen = new Set<string>();

  records.forEach((record, index) => {
    const line = index + 2;
    const name = (record.name || '').trim();
    const rawPhone = (record.phone || '').trim();
    const phone = normalizePhone(rawPhone);

    if (!phone) {
      errors.push({
        row: line,
        name,
        message: rawPhone ? `الهاتف «${rawPhone}» غير صالح` : 'الهاتف فارغ — وهو ما يُميّز الزبون'
      });
      return;
    }
    if (seen.has(phone)) {
      errors.push({ row: line, name, message: `الهاتف ${phone} مكرّر في الملفّ نفسه` });
      return;
    }
    seen.add(phone);

    if (!name) {
      errors.push({ row: line, name: phone, message: 'الاسم فارغ' });
      return;
    }

    const email = (record.email || '').trim();
    if (email && !EMAIL_RE.test(email)) {
      errors.push({ row: line, name, message: `البريد «${email}» غير صالح` });
      return;
    }

    const note = (record.note || '').trim();
    const id = byPhone.get(phone);

    if (id) {
      const data: Record<string, unknown> = { name };
      if ('email' in record) data.email = email || null;
      if ('note' in record) data.note = note || null;
      updates.push({ id, data });
    } else {
      creates.push({ phone, name, email: email || null, note: note || null });
    }
  });

  const withEmail = [...creates.filter((c) => c.email)].length;

  return {
    unknownHeaders,
    creates,
    updates,
    errors,
    summary: {
      rows: records.length,
      willCreate: creates.length,
      willUpdate: updates.length,
      willSkip: errors.length,
      /** كم منهم يمكن أن يصله بريدٌ — البقيّة يظهرون ولا يُراسَلون */
      reachableByEmail: withEmail
    }
  };
};

const readCsvBody = (req: AuthRequest): string => {
  if (typeof req.body === 'string') return req.body;
  const csv = (req.body as any)?.csv;
  return typeof csv === 'string' ? csv : '';
};

export const importCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scope = scopeOf(req);
    if (!scope) {
      res.status(400).json({ success: false, error: 'معرف النشاط غير موجود' });
      return;
    }

    const csvText = readCsvBody(req);
    if (!csvText.trim()) {
      res.status(400).json({ success: false, error: 'لم يصل محتوى الملفّ' });
      return;
    }
    if (csvText.length > 5_000_000) {
      res.status(413).json({ success: false, error: 'الملفّ أكبر من خمسة ميغابايت' });
      return;
    }

    const plan = await buildPlan(scope, csvText);
    const dryRun = String(req.query.dryRun ?? '') === '1';

    if (dryRun) {
      res.json({
        success: true,
        data: {
          dryRun: true,
          ...plan.summary,
          unknownHeaders: plan.unknownHeaders,
          errors: plan.errors.slice(0, 10),
          errorsTotal: plan.errors.length
        }
      });
      return;
    }

    /**
     * الموافقة التسويقية يؤكّدها التاجر صريحاً.
     *
     * قائمةٌ مستوردة ليست جمهوراً موافقاً، والافتراض `false`. ومن أكّد
     * الموافقة ولديه بريدٌ يصير قابلاً للوصول بالبريد — لا بغيره، لأن
     * الهاتف وحده لا قناة له في سوريا.
     */
    const optIn = String(req.query.optIn ?? '') === '1';

    let created = 0;
    let updated = 0;
    const chunk = 100;

    for (let i = 0; i < plan.creates.length; i += chunk) {
      const slice = plan.creates.slice(i, i + chunk);
      await prisma.$transaction(
        slice.map((row) =>
          prisma.customerContact.create({
            data: { ...row, ...scope, source: 'import', marketingOptIn: optIn }
          })
        )
      );
      created += slice.length;
    }

    for (let i = 0; i < plan.updates.length; i += chunk) {
      const slice = plan.updates.slice(i, i + chunk);
      await prisma.$transaction(
        slice.map(({ id, data }) =>
          prisma.customerContact.update({
            where: { id },
            data: optIn ? { ...data, marketingOptIn: true } : data
          })
        )
      );
      updated += slice.length;
    }

    /**
     * اشتراك البريد لمن أكّد التاجر موافقتهم.
     *
     * **البريد وحده:** تيليجرام يحتاج ربطاً يفعله الزبون بنفسه، والإشعار
     * يحتاج جهازاً مسجَّلاً — ولا سبيل لأن يُنشئهما التاجر عنه. وSMS لا
     * تُسلَّم إلى سوريا. فادّعاء أن الاستيراد يفتح كل القنوات كذب.
     *
     * و`subjectKey` بنفس صيغة الضيوف (`guest:<هاتف>`) فيندمج الاشتراك
     * بسلوك صاحبه في الشرائح.
     */
    let subscribed = 0;
    if (optIn) {
      const withEmail = plan.creates.filter((c) => c.email);
      for (const contact of withEmail) {
        const subjectKey = `guest:${contact.phone}`;
        const found = await prisma.customerSubscription.findFirst({
          where: { ...scope.businessType === 'store'
            ? { businessId: scope.businessId, businessType: 'store' }
            : { businessId: scope.businessId, businessType: 'restaurant' },
            subjectKey,
            channel: 'email' }
        });
        if (found) {
          await prisma.customerSubscription.update({
            where: { id: found.id },
            data: { marketingOptIn: true, unsubscribedAt: null }
          });
        } else {
          await prisma.customerSubscription.create({
            data: {
              subjectKey,
              phone: contact.phone,
              businessId: scope.businessId,
              businessType: scope.businessType,
              channel: 'email',
              marketingOptIn: true
            }
          });
        }
        subscribed += 1;
      }
    }

    res.json({
      success: true,
      message: `أُضيف ${created} وحُدّث ${updated}`,
      data: {
        dryRun: false,
        created,
        updated,
        skipped: plan.errors.length,
        subscribed,
        errors: plan.errors.slice(0, 10),
        errorsTotal: plan.errors.length
      }
    });
  } catch (error: any) {
    console.error('importCustomers failed:', error);
    res.status(400).json({ success: false, error: error?.message || 'تعذّر استيراد الملفّ' });
  }
};

/** قالبٌ بصفٍّ نموذجيّ — نفس رؤوس التصدير فتدور الرحلة */
export const customerTemplate = (_req: AuthRequest, res: Response): void => {
  sendCsv(
    res,
    'customers-template.csv',
    toCsv(COLUMNS, [['أحمد خالد', '0912345678', 'ahmad@example.com', 'زبون من المحلّ']])
  );
};

export default { importCustomers, customerTemplate };
