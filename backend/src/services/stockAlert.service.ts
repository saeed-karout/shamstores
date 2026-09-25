// backend/src/services/stockAlert.service.ts
//
// «أعلمني حين يتوفّر» — تسجيل الطلبات وإشعار أصحابها حين يعود المنتج.
//
// **متى يُعدّ المنتج «عاد»:** مخزونٌ فوق الصفر، وليس «قريباً»، ومتاحٌ للبيع.
// الثلاثة معاً: منتجٌ وصلته كميّة لكنه ما زال «قريباً» لم يُطلق بعد.
//
// **كيف يصل الإشعار:**
//   • صاحب حسابٍ → إشعار داخل المنصّة (ويُدفع إلى جهازه إن فعّل الإشعارات).
//   • بريدٌ → رسالة بريد إن كان البريد مضبوطاً على الخادم.
//   • هاتفٌ وحده → لا قناة لدينا بعد (لا SMS)؛ يبقى الطلب ظاهراً للتاجر في
//     لوحته برقمه، فيتّصل هو أو يراسله واتساب. لا يُعلَّم «أُبلغ» كذباً.
//
// **ومن مسارين:** نداءٌ فوريّ من مسارات تعديل المخزون الرئيسية، ومسحٌ دوريّ
// يلتقط ما عداها (الاستيراد، المرتجعات، إلغاء طلبٍ أعاد كميّة). فلا يُعتمد
// على أن يتذكّر كاتب كل مسارٍ جديد أن ينادي هذه الوحدة.

import prisma from './prisma';
import { notifyUser } from './notification.service';
import emailService from './emailService';

const APP_DOMAIN = process.env.APP_DOMAIN || 'shamstores.com';

const isBackInStock = (p: { stock: number; comingSoon: boolean; isAvailable: boolean }) =>
  p.isAvailable && !p.comingSoon && p.stock > 0;

const esc = (value: unknown) =>
  String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/**
 * يُبلغ من ينتظرون منتجاً إن عاد — ويُرجع عدد من أُبلغوا.
 * آمنٌ للنداء بعد أيّ تعديل: لا يفعل شيئاً إن لم يعد المنتج أو لا أحد ينتظر.
 */
export const releaseStockAlerts = async (productId: string): Promise<number> => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        stock: true,
        comingSoon: true,
        isAvailable: true,
        store: { select: { name: true, slug: true, subdomain: true, customDomain: true, customDomainVerified: true } }
      }
    });
    if (!product || !isBackInStock(product)) return 0;

    const pending = await prisma.stockAlert.findMany({
      where: { productId, notifiedAt: null },
      take: 500
    });
    if (pending.length === 0) return 0;

    const store = product.store;
    const origin =
      store.customDomain && store.customDomainVerified
        ? `https://${store.customDomain}`
        : `https://${store.subdomain || store.slug}.${APP_DOMAIN}`;
    const link = `${origin}/product/${product.id}`;

    let delivered = 0;
    for (const alert of pending) {
      let reached = false;
      if (alert.userId) {
        reached =
          (await notifyUser(alert.userId, {
            type: 'stock_alert',
            event: 'stock_alert.available',
            title: `«${product.name}» متوفّر الآن`,
            message: `عاد إلى ${store.name} — اطلبه قبل أن ينفد مجدّداً`,
            link,
            entityId: product.id
          })) || reached;
      }
      if (alert.email) {
        const sent = await emailService
          .sendEmail({
            to: alert.email,
            subject: `«${product.name}» متوفّر الآن في ${store.name}`,
            html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.9">
              <p>مرحباً${alert.name ? ` ${esc(alert.name)}` : ''}،</p>
              <p>طلبتَ أن نُعلمك حين يعود <b>${esc(product.name)}</b> — وقد عاد الآن إلى <b>${esc(store.name)}</b>.</p>
              <p><a href="${esc(link)}" style="background:#084835;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">اطلبه الآن</a></p>
            </div>`,
            text: `«${product.name}» متوفّر الآن في ${store.name}: ${link}`
          })
          .catch(() => false);
        reached = reached || !!sent;
      }
      // الهاتف وحده لا قناة له — يبقى معلّقاً في لوحة التاجر ليتواصل بنفسه
      if (reached) {
        await prisma.stockAlert.update({ where: { id: alert.id }, data: { notifiedAt: new Date() } });
        delivered += 1;
      }
    }
    return delivered;
  } catch (error) {
    console.error('تعذّر إبلاغ المنتظرين:', error);
    return 0;
  }
};

/** المسح الدوريّ — المنتجات التي عادت ولها منتظرون لم يُبلَّغوا */
export const sweepStockAlerts = async (): Promise<number> => {
  const waiting = await prisma.stockAlert.findMany({
    where: {
      notifiedAt: null,
      // من ترك هاتفه وحده لا قناة له — لا يُعاد فحصه في كل دورة بلا فائدة
      OR: [{ userId: { not: null } }, { email: { not: null } }],
      product: { stock: { gt: 0 }, comingSoon: false, isAvailable: true }
    },
    select: { productId: true },
    distinct: ['productId'],
    take: 200
  });
  let total = 0;
  for (const { productId } of waiting) total += await releaseStockAlerts(productId);
  return total;
};

export default { releaseStockAlerts, sweepStockAlerts };
