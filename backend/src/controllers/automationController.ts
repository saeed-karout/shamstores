// backend/src/controllers/automationController.ts
//
// إعدادات الرسائل التلقائية، والتقاط السلال المتروكة.

import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import automation, { BusinessType, RuleKey } from '../services/automation.service';
import { subjectKeyOf } from '../services/customerReach.service';

/** يستخرج النشاط من الرمز — نفس ما تفعله بقيّة وحدات التاجر */
const businessOf = (req: AuthRequest): { id: string; type: BusinessType } | null => {
  if (req.user?.storeId) return { id: req.user.storeId, type: 'store' };
  if (req.user?.restaurantId) return { id: req.user.restaurantId, type: 'restaurant' };
  return null;
};

export const getAutomations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = businessOf(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط التجاري غير موجود' });
      return;
    }

    const settings = await automation.getSettings(business.id, business.type);

    // الأرقام تُقرأ من سجلّ الإرسال لا تُقدَّر: التاجر يحتاج أن يرى أن
    // القاعدة تعمل فعلاً، وإلا ظنّها معطّلة وأطفأها
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sends = await prisma.automationSend.groupBy({
      by: ['rule'],
      where: { businessId: business.id, ok: true, sentAt: { gte: since } },
      _count: { _all: true }
    });

    const pendingCarts = await prisma.abandonedCart.count({
      where: { businessId: business.id, businessType: business.type, recoveredAt: null, notifiedAt: null }
    });

    const reachable = await prisma.customerSubscription.count({
      where: {
        businessId: business.id,
        businessType: business.type,
        marketingOptIn: true,
        unsubscribedAt: null
      }
    });

    res.json({
      success: true,
      data: {
        settings,
        stats: {
          last30Days: sends.reduce<Record<string, number>>((acc, row) => {
            acc[row.rule] = row._count._all;
            return acc;
          }, {}),
          pendingCarts,
          reachable
        }
      }
    });
  } catch (error) {
    console.error('getAutomations failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب الإعدادات' });
  }
};

export const updateAutomations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = businessOf(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط التجاري غير موجود' });
      return;
    }

    const settings = await automation.saveSettings(business.id, business.type, req.body?.settings ?? req.body);
    res.json({ success: true, message: 'حُفظت الإعدادات', data: { settings } });
  } catch (error) {
    console.error('updateAutomations failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر حفظ الإعدادات' });
  }
};

/**
 * تشغيل قاعدةٍ يدوياً — للتجربة.
 *
 * موجودٌ لأن قاعدةً تعمل ليلاً لا يستطيع التاجر التأكّد منها إلا بالانتظار
 * إلى الغد. وهذا يجعله يظنّها معطّلة فيطفئها.
 */
export const runNow = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = businessOf(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط التجاري غير موجود' });
      return;
    }

    const rule = req.params.rule as RuleKey;
    if (rule !== 'lapsed' && rule !== 'abandonedCart') {
      res.status(400).json({ success: false, error: 'قاعدة غير معروفة' });
      return;
    }

    const settings = await automation.getSettings(business.id, business.type);
    if (!settings[rule].enabled) {
      res.status(400).json({ success: false, error: 'القاعدة متوقّفة — فعّلها أوّلاً' });
      return;
    }

    // الفرعان منفصلان لا مُوحَّدان في تعبيرٍ واحد: اتّحاد نوعَي Prisma
    // ليس قابلاً للاستدعاء، والتحايل عليه بـ`as any` يُسكت المدقّق عن
    // أخطاءٍ حقيقية في نفس السطر
    const row =
      business.type === 'restaurant'
        ? await prisma.restaurant.findUnique({
            where: { id: business.id },
            select: { name: true, slug: true }
          })
        : await prisma.store.findUnique({
            where: { id: business.id },
            select: { name: true, slug: true }
          });

    const result =
      rule === 'lapsed'
        ? await automation.runLapsedRule(business.id, business.type, settings.lapsed, row?.name || 'متجرنا', row?.slug ?? null)
        : await automation.runAbandonedCartRule(business.id, business.type, settings.abandonedCart, row?.name || 'متجرنا', row?.slug ?? null);

    res.json({
      success: true,
      message: result.sent > 0 ? `أُرسلت ${result.sent} رسالة` : 'لا أحد ينطبق عليه الشرط الآن',
      data: result
    });
  } catch (error) {
    console.error('runNow failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر تشغيل القاعدة' });
  }
};

// ==================== التقاط السلّة (عامّ) ====================

interface SnapshotItem {
  name: string;
  quantity: number;
}

/** لا نحفظ السلّة كما أرسلها المتصفّح: أسماءٌ وكمّيات فقط، بلا معرّفات ولا أسعار مرسَلة */
const sanitizeItems = (raw: unknown): SnapshotItem[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 40)
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const name = String((row as any).name ?? '').trim().slice(0, 120);
      const quantity = Number((row as any).quantity);
      if (!name) return null;
      return { name, quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1 };
    })
    .filter((v): v is SnapshotItem => v !== null);
};

/**
 * يلتقط سلّةً بلغت صفحة الدفع ولم تُرسَل.
 *
 * **عامّ بلا مصادقة** لأن الضيوف هم من نستهدفهم. وحمايته من العبث ثلاثة
 * أشياء لا رمزٌ واحد: هويةٌ من المتصفّح، وتحقّقٌ من وجود النشاط، وتنظيفٌ
 * لكل حقلٍ قبل الحفظ. أسوأ ما يستطيعه مخرّب هو ملء جدولٍ بسلالٍ وهمية لن
 * تصل رسائلها إلى أحد — لأن الإرسال يشترط اشتراكاً بإذن.
 */
export const snapshotCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { businessId, businessType, visitorId, phone, total } = req.body || {};
    const items = sanitizeItems(req.body?.items);

    if (!businessId || (businessType !== 'restaurant' && businessType !== 'store')) {
      res.status(400).json({ success: false, error: 'النشاط غير محدَّد' });
      return;
    }

    const subjectKey = subjectKeyOf({
      userId: req.user?.id || null,
      visitorId: typeof visitorId === 'string' ? visitorId.trim().slice(0, 64) : ''
    });
    if (!subjectKey) {
      res.status(400).json({ success: false, error: 'تعذّر تحديد الهوية' });
      return;
    }

    // سلّةٌ فارغة تعني «أفرغها» لا «احفظها»: الزبون الذي حذف كل شيء لا
    // يُذكَّر بسلّةٍ لا وجود لها
    if (items.length === 0) {
      await prisma.abandonedCart
        .deleteMany({ where: { subjectKey, businessId } })
        .catch(() => undefined);
      res.json({ success: true, data: { cleared: true } });
      return;
    }

    const amount = Number(total);
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

    await prisma.abandonedCart.upsert({
      where: { subjectKey_businessId: { subjectKey, businessId } },
      update: {
        items: items as any,
        total: Number.isFinite(amount) && amount > 0 ? amount : 0,
        itemCount,
        phone: typeof phone === 'string' && phone.trim() ? phone.trim().slice(0, 32) : undefined,
        userId: req.user?.id ?? undefined,
        lastActiveAt: new Date(),
        // تعديل السلّة يعيدها إلى الطابور: من أضاف صنفاً بعد التذكير
        // سلّةٌ حيّة جديدة لا سلّةٌ عولجت
        notifiedAt: null,
        recoveredAt: null
      },
      create: {
        subjectKey,
        businessId,
        businessType,
        userId: req.user?.id ?? null,
        visitorId: typeof visitorId === 'string' ? visitorId.trim().slice(0, 64) : null,
        phone: typeof phone === 'string' && phone.trim() ? phone.trim().slice(0, 32) : null,
        items: items as any,
        total: Number.isFinite(amount) && amount > 0 ? amount : 0,
        itemCount
      }
    });

    res.json({ success: true, data: { saved: true } });
  } catch (error) {
    console.error('snapshotCart failed:', error);
    // الفشل صامتٌ للواجهة: التقاط السلّة تحسينٌ تسويقيّ، وإظهار خطئه
    // للزبون أثناء الدفع يُخيفه من إتمام الطلب
    res.json({ success: true, data: { saved: false } });
  }
};

export default { getAutomations, updateAutomations, runNow, snapshotCart };
