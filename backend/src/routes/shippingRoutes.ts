// backend/src/routes/shippingRoutes.ts
//
// مناطق الشحن: ضبطها للتاجر، وقراءتها للزبون.

import { Router, Request, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import prisma from '../services/prisma';
import shipping, { BusinessType } from '../services/shipping.service';
import { GOVERNORATES, isGovernorate } from '../config/syria';
import deliveryAreas from '../services/deliveryArea.service';

const router = Router();

const businessOf = (req: AuthRequest): { id: string; type: BusinessType } | null => {
  if (req.user?.storeId) return { id: req.user.storeId, type: 'store' };
  if (req.user?.restaurantId) return { id: req.user.restaurantId, type: 'restaurant' };
  return null;
};

// ==================== عامّ ====================

/** قائمة المحافظات — مصدرُ الحقيقة الوحيد، فلا تنسخها الواجهة */
router.get('/governorates', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.json({ success: true, data: GOVERNORATES });
});

/**
 * مناطق متجرٍ بعينه — يقرؤها الزبون عند الدفع.
 *
 * المفعّلة وحدها: عرضُ محافظةٍ لا يخدمها التاجر يعني زبوناً يملأ الطلب ثمّ
 * يُرفَض عند الإرسال.
 */
router.get('/public/:slug', async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug || '').trim();
    const select = { id: true } as const;

    const restaurant = await prisma.restaurant.findUnique({ where: { slug }, select });
    const store = restaurant ? null : await prisma.store.findUnique({ where: { slug }, select });
    const business = restaurant || store;

    if (!business) {
      res.status(404).json({ success: false, error: 'النشاط غير موجود' });
      return;
    }

    const businessType = restaurant ? 'restaurant' : 'store';
    const zones = await shipping.listActiveZones(business.id, businessType);

    // أحياء كل محافظة معها — طلبٌ واحد بدل أربعة عشر عند فتح السلّة
    const areas = await deliveryAreas.activeAreasByGovernorate(business.id, businessType);
    const withAreas = zones.map((z) => ({ ...z, areas: areas.get(z.governorate) || [] }));

    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json({ success: true, data: withAreas });
  } catch (error) {
    console.error('public shipping zones failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب مناطق التوصيل' });
  }
});

// ==================== التاجر ====================

router.use(authenticate);
router.use(authorize(['owner', 'staff', 'super_admin']));

router.get('/zones', async (req: AuthRequest, res: Response) => {
  try {
    const business = businessOf(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط التجاري غير موجود' });
      return;
    }
    res.json({ success: true, data: await shipping.listZones(business.id, business.type) });
  } catch (error) {
    console.error('listZones failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب المناطق' });
  }
});

router.put('/zones', async (req: AuthRequest, res: Response) => {
  try {
    const business = businessOf(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط التجاري غير موجود' });
      return;
    }
    const zones = await shipping.saveZones(business.id, business.type, req.body?.zones ?? req.body);
    res.json({ success: true, message: 'حُفظت مناطق التوصيل', data: zones });
  } catch (error) {
    console.error('saveZones failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر حفظ المناطق' });
  }
});

// ==================== أحياء المحافظة ====================

router.get('/zones/:governorate/areas', async (req: AuthRequest, res: Response) => {
  try {
    const business = businessOf(req);
    const governorate = String(req.params.governorate || '');
    if (!business || !isGovernorate(governorate)) {
      res.status(400).json({ success: false, error: 'طلب غير صالح' });
      return;
    }
    res.json({
      success: true,
      data: {
        areas: await deliveryAreas.listAreas(business.id, business.type, governorate),
        presets: deliveryAreas.AREA_PRESETS[governorate] || []
      }
    });
  } catch (error) {
    console.error('listAreas failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب المناطق' });
  }
});

router.put('/zones/:governorate/areas', async (req: AuthRequest, res: Response) => {
  try {
    const business = businessOf(req);
    const governorate = String(req.params.governorate || '');
    if (!business || !isGovernorate(governorate)) {
      res.status(400).json({ success: false, error: 'طلب غير صالح' });
      return;
    }
    const data = await deliveryAreas.saveAreas(
      business.id,
      business.type,
      governorate,
      req.body?.areas ?? req.body
    );
    res.json({ success: true, message: 'حُفظت المناطق', data });
  } catch (error) {
    console.error('saveAreas failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر حفظ المناطق' });
  }
});

export default router;
