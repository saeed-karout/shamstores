// backend/src/controllers/verificationController.ts
//
// «تاجر موثّق» — التاجر يرسل هويته، والمشرف يراجع، والزبون يرى شارة.
//
// **لماذا مجاني على كل الخطط:** الثقة أوّل عائقٍ أمام الشراء أونلاين في
// سوريا، والشارة تخدم المنصّة كلّها لا التاجر وحده: كل متجرٍ موثّق يجعل
// الزبون أجرأ على الشراء من المتجر التالي. حجبها خلف خطة يُبقي المتاجر
// الصغيرة — وهي الأكثر حاجةً للثقة — بلا شارة.
//
// **الشارة تعني شيئاً واحداً:** تحقّقنا أن وراء هذا النشاط شخصاً أو شركة
// حقيقية بهذا الاسم. لا تعني ضماناً لجودة المنتجات ولا لسلوك التاجر — والنصّ
// الذي يراه الزبون يقول ذلك صراحةً.

import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import { notifyUser, notifyAdmins } from '../services/notification.service';
import {
  savePrivateDoc,
  readPrivateDoc,
  deletePrivateDoc,
  sniffMatches,
  PRIVATE_DOC_TYPES
} from '../services/privateDocs.service';

type BizType = 'restaurant' | 'store';

const currentBusiness = (req: AuthRequest): { type: BizType; id: string } | null => {
  if (req.user?.restaurantId) return { type: 'restaurant', id: req.user.restaurantId };
  if (req.user?.storeId) return { type: 'store', id: req.user.storeId };
  return null;
};

const clip = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** ما يراه التاجر عن طلبه — بلا مفاتيح الملفات */
const toMerchantView = (r: any) =>
  r && {
    id: r.id,
    status: r.status,
    legalName: r.legalName,
    tradeName: r.tradeName,
    phone: r.phone,
    address: r.address,
    documentName: r.documentName,
    hasShopPhoto: !!r.shopPhotoKey,
    reason: r.reason,
    createdAt: r.createdAt,
    reviewedAt: r.reviewedAt
  };

const setBusinessVerified = (type: BizType, id: string, verifiedAt: Date | null) =>
  type === 'restaurant'
    ? prisma.restaurant.update({ where: { id }, data: { verifiedAt } })
    : prisma.store.update({ where: { id }, data: { verifiedAt } });

const findBusiness = (type: BizType, id: string) =>
  type === 'restaurant'
    ? prisma.restaurant.findUnique({ where: { id }, select: { id: true, name: true, slug: true, verifiedAt: true, userId: true } })
    : prisma.store.findUnique({ where: { id }, select: { id: true, name: true, slug: true, verifiedAt: true, userId: true } });

/** مسار التوثيق في لوحة التاجر — يفتحه الإشعار */
const MERCHANT_LINK = '/verification';

// ==================== التاجر ====================

/** GET /api/verification/me — حالة التوثيق وآخر طلب */
export const getMyVerification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const biz = currentBusiness(req);
    if (!biz) {
      res.status(403).json({ success: false, error: 'لا يوجد نشاط تجاري مرتبط بحسابك' });
      return;
    }

    const [business, latest] = await Promise.all([
      findBusiness(biz.type, biz.id),
      prisma.verificationRequest.findFirst({
        where: { businessType: biz.type, businessId: biz.id },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    res.json({
      success: true,
      data: {
        verified: !!business?.verifiedAt,
        verifiedAt: business?.verifiedAt || null,
        businessType: biz.type,
        request: toMerchantView(latest)
      }
    });
  } catch (error) {
    console.error('Error reading verification status:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب حالة التوثيق' });
  }
};

/** POST /api/verification — multipart: document (إلزامي)، shopPhoto (اختياري) */
export const submitVerification = async (req: AuthRequest, res: Response): Promise<void> => {
  const savedKeys: string[] = [];
  try {
    const biz = currentBusiness(req);
    if (!biz || req.user?.role !== 'owner') {
      // الموظّف لا يوثّق نشاطاً باسم مالكه
      res.status(403).json({ success: false, error: 'طلب التوثيق لمالك النشاط وحده' });
      return;
    }

    const legalName = clip(req.body?.legalName, 160);
    const tradeName = clip(req.body?.tradeName, 160);
    const phone = clip(req.body?.phone, 30);
    const address = clip(req.body?.address, 500);

    if (legalName.length < 3) {
      res.status(400).json({ success: false, error: 'اكتب الاسم القانوني كما في الوثيقة' });
      return;
    }
    // أرقام سورية وعربية: نقبل + والمسافات والشرطات، ونشترط ٩ أرقام على الأقل
    if (phone.replace(/\D/g, '').length < 9) {
      res.status(400).json({ success: false, error: 'رقم الهاتف غير صالح' });
      return;
    }

    const files = (req.files || {}) as Record<string, Express.Multer.File[]>;
    const document = files.document?.[0];
    const shopPhoto = files.shopPhoto?.[0];

    if (!document) {
      res.status(400).json({ success: false, error: 'ارفع صورة الهوية أو السجلّ التجاري' });
      return;
    }

    for (const f of [document, shopPhoto]) {
      if (f && !sniffMatches(f.buffer, f.mimetype)) {
        res.status(400).json({ success: false, error: 'الملف تالف أو نوعه لا يطابق امتداده' });
        return;
      }
    }
    if (shopPhoto && shopPhoto.mimetype === 'application/pdf') {
      res.status(400).json({ success: false, error: 'صورة المحلّ يجب أن تكون صورة لا PDF' });
      return;
    }

    const [business, pending] = await Promise.all([
      findBusiness(biz.type, biz.id),
      prisma.verificationRequest.findFirst({
        where: { businessType: biz.type, businessId: biz.id, status: 'pending' },
        select: { id: true }
      })
    ]);

    if (!business) {
      res.status(404).json({ success: false, error: 'النشاط التجاري غير موجود' });
      return;
    }
    if (business.verifiedAt) {
      res.status(400).json({ success: false, error: 'نشاطك موثّق بالفعل' });
      return;
    }
    if (pending) {
      res.status(400).json({ success: false, error: 'لديك طلب قيد المراجعة — سنُعلمك فور البتّ فيه' });
      return;
    }

    const folder = `verification-${biz.type}-${biz.id}`;
    const documentKey = await savePrivateDoc({ buffer: document.buffer, mime: document.mimetype, folder });
    savedKeys.push(documentKey);
    const shopPhotoKey = shopPhoto
      ? await savePrivateDoc({ buffer: shopPhoto.buffer, mime: shopPhoto.mimetype, folder })
      : null;
    if (shopPhotoKey) savedKeys.push(shopPhotoKey);

    const created = await prisma.verificationRequest.create({
      data: {
        userId: req.user!.id,
        businessType: biz.type,
        businessId: biz.id,
        legalName,
        tradeName: tradeName || null,
        phone,
        address: address || null,
        documentKey,
        documentMime: document.mimetype,
        documentName: clip(document.originalname, 180) || null,
        shopPhotoKey,
        shopPhotoMime: shopPhoto?.mimetype || null
      }
    });

    await notifyAdmins({
      type: 'verification',
      event: 'verification.created',
      title: 'طلب توثيق جديد',
      message: `${business.name} — ${legalName}`,
      link: '/admin/verifications',
      entityId: created.id
    });

    res.status(201).json({
      success: true,
      message: 'وصلنا طلبك — نراجعه عادةً خلال يومي عمل',
      data: toMerchantView(created)
    });
  } catch (error) {
    // لا نترك وثيقة هوية يتيمة بلا طلبٍ يشير إليها
    await Promise.all(savedKeys.map((k) => deletePrivateDoc(k)));
    console.error('Error submitting verification:', error);
    res.status(500).json({ success: false, error: 'تعذّر إرسال طلب التوثيق. حاول مرة أخرى.' });
  }
};

// ==================== المشرف ====================

/** GET /api/verification/admin/requests?status=pending */
export const listVerificationRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = String(req.query.status || 'pending');
    const where = ['pending', 'approved', 'rejected', 'revoked'].includes(status) ? { status } : {};

    const requests = await prisma.verificationRequest.findMany({
      where,
      orderBy: { createdAt: status === 'pending' ? 'asc' : 'desc' },
      take: 200
    });

    // الأسماء دفعةً واحدة لكل نوع — لا استعلام لكل صفّ
    const ids = (type: BizType) => requests.filter((r) => r.businessType === type).map((r) => r.businessId);
    const userIds = Array.from(new Set(requests.map((r) => r.userId)));
    const [restaurants, stores, users, counts] = await Promise.all([
      prisma.restaurant.findMany({ where: { id: { in: ids('restaurant') } }, select: { id: true, name: true, slug: true, verifiedAt: true } }),
      prisma.store.findMany({ where: { id: { in: ids('store') } }, select: { id: true, name: true, slug: true, verifiedAt: true } }),
      prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true, phone: true } }),
      prisma.verificationRequest.groupBy({ by: ['status'], _count: { _all: true } })
    ]);
    const bizMap = new Map<string, any>([...restaurants, ...stores].map((b) => [b.id, b]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    res.json({
      success: true,
      data: {
        requests: requests.map((r) => ({
          ...toMerchantView(r),
          businessType: r.businessType,
          businessId: r.businessId,
          documentMime: r.documentMime,
          shopPhotoMime: r.shopPhotoMime,
          business: bizMap.get(r.businessId) || null,
          user: userMap.get(r.userId) || null
        })),
        counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all]))
      }
    });
  } catch (error) {
    console.error('Error listing verification requests:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب طلبات التوثيق' });
  }
};

/**
 * GET /api/verification/admin/requests/:id/file/:which — which = document | shopPhoto
 *
 * يمرّ الملف عبر الخادم ولا يُعاد رابط: الرابط يُنسخ ويُرسل ويبقى صالحاً،
 * أمّا هذا المسار فيطلب رمز مشرفٍ في كل مرّة.
 */
export const streamVerificationFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const which = req.params.which === 'shopPhoto' ? 'shopPhoto' : 'document';
    const request = await prisma.verificationRequest.findUnique({ where: { id: req.params.id } });
    const key = which === 'shopPhoto' ? request?.shopPhotoKey : request?.documentKey;
    const mime = which === 'shopPhoto' ? request?.shopPhotoMime : request?.documentMime;

    if (!request || !key || !mime || !PRIVATE_DOC_TYPES[mime]) {
      res.status(404).json({ success: false, error: 'الملف غير موجود' });
      return;
    }

    const buffer = await readPrivateDoc(key);
    if (!buffer) {
      res.status(404).json({ success: false, error: 'تعذّر قراءة الملف' });
      return;
    }

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename="verification-${request.id}${PRIVATE_DOC_TYPES[mime]}"`);
    res.end(buffer);
  } catch (error) {
    console.error('Error streaming verification file:', error);
    res.status(500).json({ success: false, error: 'تعذّر عرض الملف' });
  }
};

/** POST /api/verification/admin/requests/:id/approve */
export const approveVerification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const request = await prisma.verificationRequest.findUnique({ where: { id: req.params.id } });
    if (!request) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }
    if (request.status !== 'pending') {
      res.status(400).json({ success: false, error: 'تمت معالجة هذا الطلب مسبقاً' });
      return;
    }

    const type = request.businessType as BizType;
    const now = new Date();
    const [updated] = await prisma.$transaction([
      prisma.verificationRequest.update({
        where: { id: request.id },
        data: { status: 'approved', reviewedAt: now, reviewedBy: req.user?.id, reason: null }
      }),
      setBusinessVerified(type, request.businessId, now)
    ]);

    await notifyUser(request.userId, {
      type: 'verification',
      event: 'verification.approved',
      title: 'أصبح نشاطك موثّقاً ✓',
      message: 'تظهر الآن شارة «تاجر موثّق» الزرقاء بجانب اسمك في واجهتك.',
      link: MERCHANT_LINK,
      entityId: request.id
    });

    res.json({ success: true, message: 'تم توثيق النشاط', data: toMerchantView(updated) });
  } catch (error) {
    console.error('Error approving verification:', error);
    res.status(500).json({ success: false, error: 'تعذّر اعتماد الطلب' });
  }
};

/** POST /api/verification/admin/requests/:id/reject { reason } */
export const rejectVerification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reason = clip(req.body?.reason, 500);
    // الرفض بلا سبب يترك التاجر بلا خطوة تالية — فالسبب إلزاميّ
    if (reason.length < 3) {
      res.status(400).json({ success: false, error: 'اكتب سبب الرفض ليعرف التاجر ما يصحّحه' });
      return;
    }

    const request = await prisma.verificationRequest.findUnique({ where: { id: req.params.id } });
    if (!request) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }
    if (request.status !== 'pending') {
      res.status(400).json({ success: false, error: 'تمت معالجة هذا الطلب مسبقاً' });
      return;
    }

    const updated = await prisma.verificationRequest.update({
      where: { id: request.id },
      data: { status: 'rejected', reviewedAt: new Date(), reviewedBy: req.user?.id, reason }
    });

    await notifyUser(request.userId, {
      type: 'verification',
      event: 'verification.rejected',
      title: 'لم يُقبل طلب التوثيق',
      message: `السبب: ${reason} — يمكنك تصحيحه وإرسال طلب جديد.`,
      link: MERCHANT_LINK,
      entityId: request.id
    });

    res.json({ success: true, message: 'تم رفض الطلب', data: toMerchantView(updated) });
  } catch (error) {
    console.error('Error rejecting verification:', error);
    res.status(500).json({ success: false, error: 'تعذّر رفض الطلب' });
  }
};

/**
 * POST /api/verification/admin/requests/:id/revoke { reason }
 *
 * سحب التوثيق — لنشاطٍ بيع لغير صاحبه أو ثبت احتياله. الشارة وعدٌ للزبون،
 * وبقاؤها بعد سقوط سببها أسوأ من غيابها.
 */
export const revokeVerification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reason = clip(req.body?.reason, 500);
    if (reason.length < 3) {
      res.status(400).json({ success: false, error: 'اكتب سبب سحب التوثيق' });
      return;
    }

    const request = await prisma.verificationRequest.findUnique({ where: { id: req.params.id } });
    if (!request || request.status !== 'approved') {
      res.status(400).json({ success: false, error: 'لا يُسحب إلا توثيقٌ معتمد' });
      return;
    }

    const [updated] = await prisma.$transaction([
      prisma.verificationRequest.update({
        where: { id: request.id },
        data: { status: 'revoked', reviewedAt: new Date(), reviewedBy: req.user?.id, reason }
      }),
      setBusinessVerified(request.businessType as BizType, request.businessId, null)
    ]);

    await notifyUser(request.userId, {
      type: 'verification',
      event: 'verification.revoked',
      title: 'سُحبت شارة التوثيق',
      message: `السبب: ${reason}`,
      link: MERCHANT_LINK,
      entityId: request.id
    });

    res.json({ success: true, message: 'تم سحب التوثيق', data: toMerchantView(updated) });
  } catch (error) {
    console.error('Error revoking verification:', error);
    res.status(500).json({ success: false, error: 'تعذّر سحب التوثيق' });
  }
};
