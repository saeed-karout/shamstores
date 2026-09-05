// backend/src/controllers/featureRequestController.ts
//
// شراء ميزة مفردة: التاجر يطلب، والسوبر أدمن يوافق فتُسند.
//
// لا دفع إلكتروني على المنصة — التحويل يتم عبر شام كاش أو تواصل مباشر.
// فالطلب هو ما يفتح المحادثة، والموافقة هي ما يفتح الميزة. نفس مسار طلبات
// الترقية، وعمداً: مساران مختلفان لنفس الفعل يتباعدان بعد شهر.

import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import { getFeatureCatalog } from '../services/featureCatalog.service';
import { buildPlanPrice } from '../services/planPricing.service';
import { getUsdRate } from '../services/currency.service';
import { notifyUser, notifyAdmins } from '../services/notification.service';
import { BusinessType } from '../services/entitlement.service';

/** النشاط الذي يديره صاحب الطلب */
const resolveBusiness = (req: AuthRequest): { id: string; type: BusinessType } | null => {
  if (req.user?.restaurantId) return { id: req.user.restaurantId, type: 'restaurant' };
  if (req.user?.storeId) return { id: req.user.storeId, type: 'store' };
  return null;
};

// ==================== التاجر ====================

export const getMyFeatureCatalog = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = resolveBusiness(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'لا نشاط مرتبط بحسابك' });
      return;
    }

    res.json({ success: true, data: await getFeatureCatalog(business.id, business.type) });
  } catch (error) {
    console.error('Error building feature catalog:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الميزات' });
  }
};

export const createFeatureRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = resolveBusiness(req);
    if (!business || !req.user?.id) {
      res.status(400).json({ success: false, error: 'لا نشاط مرتبط بحسابك' });
      return;
    }

    const featureCode = String(req.body?.featureCode || '').trim();
    if (!featureCode) {
      res.status(400).json({ success: false, error: 'رمز الميزة مطلوب' });
      return;
    }

    // الكتالوج هو الحَكَم: يعرف الخطة والإسناد والطلبات المعلّقة معاً.
    // فحص كل واحدة على حدة هنا كان سيتباعد عن الشاشة التي يراها التاجر.
    const catalog = await getFeatureCatalog(business.id, business.type);
    const feature = catalog.find((f) => f.code === featureCode);

    if (!feature) {
      res.status(404).json({ success: false, error: 'الميزة غير متاحة' });
      return;
    }
    if (feature.active) {
      res.status(400).json({ success: false, error: 'الميزة مفعّلة لديك بالفعل' });
      return;
    }
    if (feature.pendingRequest) {
      res.status(400).json({ success: false, error: 'لديك طلب معلّق لهذه الميزة' });
      return;
    }

    const request = await prisma.featureRequest.create({
      data: {
        userId: req.user.id,
        businessId: business.id,
        businessType: business.type,
        featureCode,
        status: 'pending',
        note: typeof req.body?.note === 'string' ? req.body.note.slice(0, 500) : null
      }
    });

    await notifyAdmins({
      type: 'feature_request',
      event: 'feature_request.created',
      title: 'طلب شراء ميزة',
      message: `طلب تفعيل «${feature.name}» — ${feature.pricing.amountSyp ? `${feature.pricing.amountSyp.toLocaleString('en-US')} ل.س` : `$${feature.price}`} شهرياً.`,
      link: '/admin/features',
      entityId: request.id
    });

    res.status(201).json({ success: true, message: 'أُرسل طلبك — سنتواصل معك لإتمام الدفع', data: request });
  } catch (error) {
    console.error('Error creating feature request:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إرسال الطلب' });
  }
};

export const getMyFeatureRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = resolveBusiness(req);
    if (!business) {
      res.json({ success: true, data: [] });
      return;
    }

    const requests = await prisma.featureRequest.findMany({
      where: { businessId: business.id, businessType: business.type },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Error fetching feature requests:', error);
    res.json({ success: true, data: [] });
  }
};

// ==================== السوبر أدمن ====================

/**
 * يُلحق بالطلبات أسماءَ من تخصّهم.
 *
 * النموذج بلا علاقات، والردّ الخام يعطي السوبر أدمن معرّفات لا يعرف
 * أصحابها — فيقبل أو يرفض على العمياء.
 */
const enrich = async (requests: any[]) => {
  if (requests.length === 0) return [];

  const uniq = (list: any[]) => Array.from(new Set(list.filter(Boolean)));

  const [users, features, restaurants, stores, usdRate] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: uniq(requests.map((r) => r.userId)) } },
      select: { id: true, name: true, email: true, phone: true }
    }),
    prisma.feature.findMany({
      where: { code: { in: uniq(requests.map((r) => r.featureCode)) } },
      select: { code: true, name: true, price: true }
    }),
    prisma.restaurant.findMany({
      where: { id: { in: uniq(requests.filter((r) => r.businessType === 'restaurant').map((r) => r.businessId)) } },
      select: { id: true, name: true, phone: true, whatsapp: true }
    }),
    prisma.store.findMany({
      where: { id: { in: uniq(requests.filter((r) => r.businessType === 'store').map((r) => r.businessId)) } },
      select: { id: true, name: true, phone: true, whatsapp: true }
    }),
    getUsdRate()
  ]);

  const userById = new Map(users.map((u) => [u.id, u]));
  const featureByCode = new Map(features.map((f) => [f.code, f]));
  const businessById = new Map([...restaurants, ...stores].map((b) => [b.id, b]));

  return requests.map((request) => {
    const user = userById.get(request.userId) || null;
    const business = businessById.get(request.businessId) || null;
    const feature = featureByCode.get(request.featureCode) || null;

    return {
      ...request,
      userName: user?.name || null,
      userEmail: user?.email || null,
      whatsapp: business?.whatsapp || business?.phone || user?.phone || null,
      businessName: business?.name || null,
      featureName: feature?.name || request.featureCode,
      priceUsd: feature?.price ?? null,
      priceSyp: feature ? buildPlanPrice(feature.price, usdRate).amountSyp : null
    };
  });
};

export const getAllFeatureRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const requests = await prisma.featureRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200
    });

    res.json({ success: true, data: await enrich(requests) });
  } catch (error) {
    console.error('Error fetching feature requests:', error);
    res.json({ success: true, data: [] });
  }
};

export const approveFeatureRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const request = await prisma.featureRequest.findUnique({ where: { id: req.params.id } });
    if (!request) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }
    if (request.status !== 'pending') {
      res.status(400).json({ success: false, error: `الطلب ${request.status === 'approved' ? 'مقبول مسبقاً' : 'مرفوض مسبقاً'}` });
      return;
    }

    const feature = await prisma.feature.findUnique({ where: { code: request.featureCode } });

    // مدة الإسناد: شهر للميزات المتكررة، وبلا انتهاء لمرة واحدة
    const expiresAt = feature?.isOneTime
      ? null
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.businessFeature.upsert({
        where: {
          businessId_businessType_featureCode: {
            businessId: request.businessId,
            businessType: request.businessType,
            featureCode: request.featureCode
          }
        },
        update: { isEnabled: true, expiresAt, assignedBy: req.user?.id, assignedAt: new Date() },
        create: {
          businessId: request.businessId,
          businessType: request.businessType,
          featureCode: request.featureCode,
          isEnabled: true,
          expiresAt,
          assignedBy: req.user?.id,
          assignedAt: new Date()
        }
      }),
      prisma.featureRequest.update({
        where: { id: request.id },
        data: { status: 'approved', reviewedBy: req.user?.id, reviewedAt: new Date() }
      })
    ]);

    // خارج المعاملة: فشل الإشعار لا يتراجع عن تفعيل تمّ
    await notifyUser(request.userId, {
      type: 'feature_request',
      event: 'feature_request.approved',
      title: 'فُعِّلت الميزة',
      message: `«${feature?.name || request.featureCode}» صارت متاحة في نشاطك.`,
      link: '/features',
      entityId: request.id
    });

    res.json({ success: true, message: 'فُعِّلت الميزة وأُبلغ التاجر' });
  } catch (error) {
    console.error('Error approving feature request:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في قبول الطلب' });
  }
};

export const rejectFeatureRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (reason.length < 3) {
      res.status(400).json({ success: false, error: 'اكتب سبب الرفض — التاجر يقرأه في إشعاره' });
      return;
    }

    const request = await prisma.featureRequest.findUnique({ where: { id: req.params.id } });
    if (!request) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }
    if (request.status !== 'pending') {
      res.status(400).json({ success: false, error: 'الطلب معالَج مسبقاً' });
      return;
    }

    await prisma.featureRequest.update({
      where: { id: request.id },
      data: {
        status: 'rejected',
        rejectReason: reason.slice(0, 500),
        reviewedBy: req.user?.id,
        reviewedAt: new Date()
      }
    });

    const feature = await prisma.feature.findUnique({ where: { code: request.featureCode } });

    await notifyUser(request.userId, {
      type: 'feature_request',
      event: 'feature_request.rejected',
      title: 'رُفض طلب الميزة',
      message: `«${feature?.name || request.featureCode}»: ${reason}`,
      link: '/features',
      entityId: request.id
    });

    res.json({ success: true, message: 'رُفض الطلب وأُبلغ التاجر' });
  } catch (error) {
    console.error('Error rejecting feature request:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في رفض الطلب' });
  }
};
