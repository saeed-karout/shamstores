// backend/src/controllers/pricingController.ts
//
// إعداد «سعّر بالدولار، بِع بالليرة» للتاجر — الحساب كلّه في
// services/usdPricing.service.ts، وهنا الصلاحيات والردود فقط.

import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import { getBusinessId } from '../middleware/auth';
import {
  PricingKind,
  getPricingConfig,
  buildUpdatedConfig,
  planReprice,
  savePricingConfig,
  serializeConfig,
  usdToSyp,
  countSypOnlyItems
} from '../services/usdPricing.service';

/**
 * النشاط المقصود. المالك ذو الفروع يمرّر `storeId`/`restaurantId` لفرعٍ
 * بعينه — ويُتحقَّق من ملكيته، وإلا عدّل تاجرٌ أسعار غيره بتبديل معرّف.
 */
const resolveBusiness = async (req: AuthRequest): Promise<{ kind: PricingKind; id: string } | null> => {
  const own = getBusinessId(req);
  const q = { ...(req.query || {}), ...(req.body || {}) } as Record<string, any>;
  const wantedStore = typeof q.storeId === 'string' ? q.storeId : null;
  const wantedRestaurant = typeof q.restaurantId === 'string' ? q.restaurantId : null;
  const isAdmin = req.user?.role === 'super_admin';

  if (wantedStore && wantedStore !== own.id) {
    if (isAdmin) return { kind: 'store', id: wantedStore };
    const owned = await prisma.store.findFirst({ where: { id: wantedStore, userId: req.user?.id }, select: { id: true } });
    if (owned) return { kind: 'store', id: owned.id };
  }
  if (wantedRestaurant && wantedRestaurant !== own.id) {
    if (isAdmin) return { kind: 'restaurant', id: wantedRestaurant };
    const owned = await prisma.restaurant.findFirst({ where: { id: wantedRestaurant, userId: req.user?.id }, select: { id: true } });
    if (owned) return { kind: 'restaurant', id: owned.id };
  }
  if (own.type && own.id) return { kind: own.type, id: own.id };
  return null;
};

/** «سعرٌ واحد، سعران، 3 أسعار، 11 سعراً» */
const countPrices = (n: number) =>
  n === 1 ? 'سعرٌ واحد' : n === 2 ? 'سعران' : n <= 10 ? `${n} أسعار` : `${n} سعراً`;

export const getPricing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await resolveBusiness(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'لا يوجد نشاط مرتبط بحسابك' });
      return;
    }
    const cfg = await getPricingConfig(business.kind, business.id);
    if (!cfg) {
      res.status(404).json({ success: false, error: 'النشاط غير موجود' });
      return;
    }
    const [plan, sypOnlyItems] = await Promise.all([planReprice(cfg), countSypOnlyItems(cfg.kind, cfg.businessId)]);
    res.json({
      success: true,
      data: { ...serializeConfig(cfg), usdPricedItems: plan.total, outOfSyncItems: plan.changed, sypOnlyItems }
    });
  } catch (error) {
    console.error('getPricing failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب إعداد التسعير' });
  }
};

/**
 * معاينة بلا حفظ: كم سعراً سيتغيّر، مع أمثلة. التاجر يرى أثر السعر الجديد
 * قبل أن يلمس واجهة زبائنه.
 */
export const previewPricing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await resolveBusiness(req);
    const current = business && (await getPricingConfig(business.kind, business.id));
    if (!current) {
      res.status(400).json({ success: false, error: 'لا يوجد نشاط مرتبط بحسابك' });
      return;
    }
    const built = buildUpdatedConfig(current, req.body || {});
    if (!built.ok || !built.cfg) {
      res.status(400).json({ success: false, error: built.error });
      return;
    }
    const plan = await planReprice(built.cfg);
    res.json({
      success: true,
      data: {
        config: serializeConfig(built.cfg),
        total: plan.total,
        changed: plan.changed,
        samples: plan.samples
      }
    });
  } catch (error) {
    console.error('previewPricing failed:', error);
    res.status(500).json({ success: false, error: 'تعذّرت المعاينة' });
  }
};

export const updatePricing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await resolveBusiness(req);
    const current = business && (await getPricingConfig(business.kind, business.id));
    if (!current) {
      res.status(400).json({ success: false, error: 'لا يوجد نشاط مرتبط بحسابك' });
      return;
    }
    const built = buildUpdatedConfig(current, req.body || {});
    if (!built.ok || !built.cfg) {
      res.status(400).json({ success: false, error: built.error });
      return;
    }
    const applied = await savePricingConfig(built.cfg, { seedFromSyp: req.body?.seedFromSyp === true });
    const fresh = await getPricingConfig(current.kind, current.businessId);
    const sypOnlyItems = await countSypOnlyItems(current.kind, current.businessId);
    res.json({
      success: true,
      message: applied.changed > 0
        ? `تم الحفظ — حُدِّث بالليرة: ${countPrices(applied.changed)}`
        : 'تم الحفظ — لا أسعار تحتاج تحديثاً',
      data: {
        ...serializeConfig(fresh || built.cfg),
        changed: applied.changed,
        seeded: applied.seeded,
        usdPricedItems: applied.total,
        outOfSyncItems: 0,
        sypOnlyItems
      }
    });
  } catch (error) {
    console.error('updatePricing failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر حفظ إعداد التسعير' });
  }
};

/** تحويلٌ واحد للمعاينة الحيّة في نموذج الصنف — بنفس دالة الخادم حرفياً */
export const quotePrice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await resolveBusiness(req);
    const cfg = business && (await getPricingConfig(business.kind, business.id));
    const usd = Number(req.query.usd);
    if (!cfg || !cfg.effectiveRate || !Number.isFinite(usd) || usd <= 0) {
      res.json({ success: true, data: { syp: null } });
      return;
    }
    res.json({ success: true, data: { syp: usdToSyp(usd, cfg.effectiveRate, cfg.roundingStep), rate: cfg.effectiveRate } });
  } catch (error) {
    console.error('quotePrice failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر الحساب' });
  }
};
