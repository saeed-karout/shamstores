// backend/src/controllers/itemCommentController.ts
//
// التعليقات على المنتجات (المتجر) والوجبات (المطعم).
//
// **ليست تقييمات.** التقييم في `productReviewController` إشارةٌ لا تُقبل إلا
// من مشترٍ، لأن قيمتها في أنها مُثبَتة. التعليق سؤالٌ أو رأيٌ مفتوح — وأكثره
// يأتي **قبل** الشراء («هل القماش يتمدّد؟»، «هل فيها مكسّرات؟»). حصرُه
// بالمشترين يُسكت بالضبط الزبون الذي يحتاج الجواب ليشتري.
//
// **ولأنه مفتوح، فهو هدفٌ للإغراق.** ثلاث طبقات تحرسه:
//   1. حدٌّ لكل عنوان IP في المسار (`itemCommentRoutes.ts`).
//   2. تنقيةٌ هنا: لا HTML، لا محارف تحكّم، طولٌ محدود، وروابط قليلة —
//      تعليقٌ بخمسة روابط إعلانٌ لا سؤال.
//   3. رفض التكرار الحرفيّ على الصنف نفسه خلال دقائق — نقرتان على «نشر»
//      أو سكربتٌ يعيد النصّ نفسه.
// وما يفلت من ذلك يُخفيه التاجر بضغطة من لوحته.
//
// **لا يُسرَّب في الواجهة العامّة إلا ما يُعرض:** الاسم المكتوب والنصّ
// والتاريخ. لا `userId` ولا بريد — التعليق العامّ لا يجوز أن يصير دليلاً
// لحسابات الزبائن.

import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import { getBusinessId } from '../middleware/auth';
import { notifyUser } from '../services/notification.service';

// ==================== الحدود ====================

const BODY_MIN = 2;
const BODY_MAX = 1000;
const NAME_MIN = 2;
const NAME_MAX = 60;
/** أكثر من رابطين في تعليقٍ واحد = إعلانٌ غالباً */
const MAX_LINKS = 2;
/** النافذة التي يُرفض فيها النصّ نفسه على الصنف نفسه */
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

const PUBLIC_PAGE_DEFAULT = 10;
const PUBLIC_PAGE_MAX = 30;
const MANAGE_PAGE_DEFAULT = 20;
const MANAGE_PAGE_MAX = 50;

type ItemKind = 'product' | 'menuItem';

// ==================== التنقية ====================

/**
 * ينقّي نصّاً قادماً من زائر.
 *
 * الواجهة تعرض النصّ عبر React (مُهرَّباً) فلا خطر حقنٍ هناك — لكن النصّ
 * نفسه يصل إلى إشعار التاجر وتيليجرام وربما بريدٍ لاحقاً، وأيٌّ منها قد لا
 * يهرّب. فنُسقط الوسوم هنا مرّةً واحدة بدل الثقة بكل مستهلك.
 * ونُبقي سطرين فارغين على الأكثر: عشرون سطراً فارغاً تدفع الصفحة كلّها.
 */
const sanitize = (raw: unknown, max: number): string => {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/<[^>]*>/g, '')
    // محارف التحكّم عدا السطر الجديد والجدولة — ومنها محارف الاتجاه
    // المخفيّة التي تقلب النصّ لتخفي رابطاً
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
    .slice(0, max);
};

const countLinks = (text: string): number =>
  (text.match(/(https?:\/\/|www\.)\S+/gi) || []).length;

const toInt = (value: unknown, fallback: number, max: number): number => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), max);
};

// ==================== الأشكال المعروضة ====================

interface CommentRow {
  id: string;
  authorName: string;
  body: string;
  createdAt: Date;
  isMerchantReply: boolean;
}

/** ما يُعرض للعامّة — بلا معرّف الحساب ولا ما يدلّ عليه */
const toPublic = (row: CommentRow) => ({
  id: row.id,
  authorName: row.authorName,
  body: row.body,
  createdAt: row.createdAt,
  isMerchantReply: row.isMerchantReply
});

const PUBLIC_SELECT = {
  id: true,
  authorName: true,
  body: true,
  createdAt: true,
  isMerchantReply: true
} as const;

// ==================== الصنف المستهدف ====================

interface Target {
  productId: string | null;
  menuItemId: string | null;
  storeId: string | null;
  restaurantId: string | null;
  itemName: string;
  businessName: string;
  ownerUserId: string | null;
}

/**
 * الصنف الذي يُعلَّق عليه — متاحٌ ونشاطه فعّال، وإلا فلا.
 *
 * التعليق على صنفٍ أخفاه التاجر أو في نشاطٍ موقوف كتابةٌ في صفحةٍ لا يراها
 * أحد، وبابٌ لملء الجدول بمعرّفاتٍ قديمة.
 */
const resolveTarget = async (kind: ItemKind, id: string): Promise<Target | null> => {
  if (kind === 'product') {
    const product = await prisma.product.findFirst({
      where: { id, isAvailable: true, store: { isActive: true } },
      select: { id: true, name: true, storeId: true, store: { select: { name: true, userId: true } } }
    });
    if (!product) return null;
    return {
      productId: product.id,
      menuItemId: null,
      storeId: product.storeId,
      restaurantId: null,
      itemName: product.name,
      businessName: product.store.name,
      ownerUserId: product.store.userId
    };
  }

  const item = await prisma.menuItem.findFirst({
    where: { id, isAvailable: true, restaurant: { isActive: true } },
    select: { id: true, name: true, restaurantId: true, restaurant: { select: { name: true, userId: true } } }
  });
  if (!item) return null;
  return {
    productId: null,
    menuItemId: item.id,
    storeId: null,
    restaurantId: item.restaurantId,
    itemName: item.name,
    businessName: item.restaurant.name,
    ownerUserId: item.restaurant.userId
  };
};

const itemFilter = (kind: ItemKind, id: string) =>
  kind === 'product' ? { productId: id } : { menuItemId: id };

// ==================== عامّ: القراءة ====================

/**
 * تعليقات صنفٍ — الظاهرة وحدها، الأحدث أولاً، وتحت كلٍّ ردودُه الظاهرة.
 *
 * صفحاتٌ لا مؤشّر (`page`): العدد الكلّي يُعرض في العنوان («التعليقات ١٢»)
 * فنحسبه على أيّ حال، والإزاحة على عشرات الصفوف رخيصة.
 */
const listForItem = (kind: ItemKind) => async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.productId || req.params.menuItemId || '');
    const page = toInt(req.query.page, 1, 10_000);
    const limit = toInt(req.query.limit, PUBLIC_PAGE_DEFAULT, PUBLIC_PAGE_MAX);

    const where = { ...itemFilter(kind, id), parentId: null, isHidden: false };

    const [rows, total] = await Promise.all([
      prisma.itemComment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          ...PUBLIC_SELECT,
          // الردّ يُقرأ بعد سؤاله، فترتيبه تصاعديّ عكس القائمة
          replies: { where: { isHidden: false }, orderBy: { createdAt: 'asc' }, select: PUBLIC_SELECT }
        }
      }),
      prisma.itemComment.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        comments: rows.map((row) => ({ ...toPublic(row), replies: row.replies.map(toPublic) })),
        total,
        page,
        limit,
        hasMore: page * limit < total
      }
    });
  } catch (error) {
    console.error('listItemComments failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب التعليقات' });
  }
};

export const getProductComments = listForItem('product');
export const getMenuItemComments = listForItem('menuItem');

// ==================== عامّ: الكتابة ====================

/**
 * تعليقٌ جديد — من ضيفٍ باسمٍ يكتبه، أو من زبونٍ مسجَّل باسم حسابه.
 *
 * **اسم الحساب يغلب ما يُكتب:** المسجَّل لا يحتاج أن يكتب اسمه، ولو سُمح له
 * بتغييره لصار الحساب قناعاً يعلّق خلفه بأسماء غيره.
 */
const createForItem = (kind: ItemKind) => async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.productId || req.params.menuItemId || '');
    const body = sanitize(req.body?.body, BODY_MAX + 1);

    if (body.length < BODY_MIN) {
      res.status(400).json({ success: false, error: 'اكتب تعليقك أولاً' });
      return;
    }
    if (body.length > BODY_MAX) {
      res.status(400).json({ success: false, error: `التعليق أطول من ${BODY_MAX} حرف` });
      return;
    }
    if (countLinks(body) > MAX_LINKS) {
      res.status(400).json({ success: false, error: 'التعليق يحوي روابط كثيرة' });
      return;
    }

    // الاسم: من الحساب إن وُجد، وإلا ممّا كتبه الضيف
    let userId: string | null = null;
    let authorName = '';
    if (req.user?.id) {
      const account = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, name: true } });
      if (account) {
        userId = account.id;
        authorName = sanitize(account.name, NAME_MAX);
      }
    }
    if (!authorName) authorName = sanitize(req.body?.authorName, NAME_MAX);

    if (authorName.length < NAME_MIN) {
      res.status(400).json({ success: false, error: 'اكتب اسمك ليظهر مع تعليقك' });
      return;
    }
    if (countLinks(authorName) > 0) {
      res.status(400).json({ success: false, error: 'الاسم لا يقبل روابط' });
      return;
    }

    const target = await resolveTarget(kind, id);
    if (!target) {
      res.status(404).json({ success: false, error: 'الصنف غير متاح للتعليق' });
      return;
    }

    // النصّ نفسه على الصنف نفسه قبل دقائق: نقرةٌ مزدوجة أو سكربت —
    // وفي الحالتين لا يستحقّ صفّاً ثانياً
    const duplicate = await prisma.itemComment.findFirst({
      where: {
        ...itemFilter(kind, id),
        body,
        createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) }
      },
      select: { id: true }
    });
    if (duplicate) {
      res.status(409).json({ success: false, error: 'نُشر هذا التعليق للتوّ' });
      return;
    }

    const created = await prisma.itemComment.create({
      data: {
        productId: target.productId,
        menuItemId: target.menuItemId,
        storeId: target.storeId,
        restaurantId: target.restaurantId,
        userId,
        authorName,
        body
      },
      select: PUBLIC_SELECT
    });

    // إشعار التاجر بلا انتظار: سؤالٌ بلا جواب يُضيّع بيعاً، لكن بطء
    // الإشعار لا يجوز أن يؤخّر ظهور التعليق لكاتبه
    void notifyUser(target.ownerUserId, {
      type: 'comment',
      event: 'comment.created',
      title: `تعليقٌ جديد على «${target.itemName}»`,
      message: `${authorName}: ${body.slice(0, 160)}`,
      link: target.storeId ? '/store/comments' : '/restaurant/comments',
      entityId: created.id
    });

    res.status(201).json({ success: true, data: { ...toPublic(created), replies: [] } });
  } catch (error) {
    console.error('createItemComment failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر نشر التعليق' });
  }
};

export const createProductComment = createForItem('product');
export const createMenuItemComment = createForItem('menuItem');

// ==================== التاجر ====================

/**
 * نطاق النشاط من الرمز — لا من المسار ولا من الجسم.
 *
 * كلّ استعلامٍ للتاجر يمرّ بهذا الشرط: بدونه يُخفي تاجرٌ تعليقات منافسه أو
 * يردّ عليها باسم متجره.
 */
const businessScope = (req: AuthRequest) => {
  const business = getBusinessId(req);
  if (!business.id || !business.type) return null;
  return {
    type: business.type,
    id: business.id,
    where: business.type === 'store' ? { storeId: business.id } : { restaurantId: business.id }
  };
};

const noBusiness = (res: Response) =>
  res.status(400).json({ success: false, error: 'لا يوجد مطعم أو متجر مرتبط بحسابك' });

/**
 * كلّ تعليقات النشاط للإشراف: العلويّة وحدها، وتحت كلٍّ ردود التاجر.
 *
 * الأعداد لكل تبويب تُحسب مع البحث نفسه: تبويبٌ يقول «مخفيّة ٣» ثم يُظهر
 * صفراً لأن البحث ضيّقها يبدو عطلاً.
 */
export const getManageComments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scope = businessScope(req);
    if (!scope) { noBusiness(res); return; }

    const status = String(req.query.status || 'all');
    const q = sanitize(req.query.q, 100);
    const page = toInt(req.query.page, 1, 10_000);
    const limit = toInt(req.query.limit, MANAGE_PAGE_DEFAULT, MANAGE_PAGE_MAX);

    const base: Record<string, unknown> = { ...scope.where, parentId: null };
    if (q) {
      base.OR = [
        { body: { contains: q } },
        { authorName: { contains: q } },
        { product: { name: { contains: q } } },
        { menuItem: { name: { contains: q } } }
      ];
    }

    const where =
      status === 'visible' ? { ...base, isHidden: false }
        : status === 'hidden' ? { ...base, isHidden: true }
          : base;

    const [rows, total, visible, hidden] = await Promise.all([
      prisma.itemComment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          authorName: true,
          body: true,
          createdAt: true,
          isHidden: true,
          isMerchantReply: true,
          userId: true,
          product: { select: { id: true, name: true, imageUrl: true } },
          menuItem: { select: { id: true, name: true, image: true } },
          replies: {
            orderBy: { createdAt: 'asc' },
            select: { id: true, authorName: true, body: true, createdAt: true, isHidden: true, isMerchantReply: true }
          }
        }
      }),
      prisma.itemComment.count({ where }),
      prisma.itemComment.count({ where: { ...base, isHidden: false } }),
      prisma.itemComment.count({ where: { ...base, isHidden: true } })
    ]);

    res.json({
      success: true,
      data: {
        comments: rows.map((row) => ({
          id: row.id,
          authorName: row.authorName,
          body: row.body,
          createdAt: row.createdAt,
          isHidden: row.isHidden,
          isMerchantReply: row.isMerchantReply,
          // التاجر يرى إن كان الكاتب ضيفاً — بلا هويّة الحساب نفسها
          isGuest: !row.userId,
          item: row.product
            ? { kind: 'product', id: row.product.id, name: row.product.name, image: row.product.imageUrl }
            : row.menuItem
              ? { kind: 'menuItem', id: row.menuItem.id, name: row.menuItem.name, image: row.menuItem.image }
              : null,
          replies: row.replies
        })),
        total,
        page,
        limit,
        hasMore: page * limit < total,
        counts: { all: visible + hidden, visible, hidden }
      }
    });
  } catch (error) {
    console.error('getManageComments failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب التعليقات' });
  }
};

/** يجد تعليقاً داخل نشاط الطالب — وإلا فكأنه غير موجود */
const findOwned = (req: AuthRequest, scope: NonNullable<ReturnType<typeof businessScope>>) =>
  prisma.itemComment.findFirst({
    where: { id: req.params.id, ...scope.where },
    select: { id: true, parentId: true, isHidden: true, productId: true, menuItemId: true }
  });

/**
 * ردّ التاجر — باسم النشاط لا باسم الموظّف.
 *
 * الزبون سأل المتجر لا «أحمد»؛ والاسم المعروض يبقى صحيحاً لو غادر الموظّف.
 * والردّ على تعليقٍ علويّ وحده: الردّ على ردٍّ يبني شجرةً لا تعرضها الواجهة.
 */
export const replyToComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scope = businessScope(req);
    if (!scope) { noBusiness(res); return; }

    const body = sanitize(req.body?.body, BODY_MAX + 1);
    if (body.length < BODY_MIN) {
      res.status(400).json({ success: false, error: 'اكتب الردّ أولاً' });
      return;
    }
    if (body.length > BODY_MAX) {
      res.status(400).json({ success: false, error: `الردّ أطول من ${BODY_MAX} حرف` });
      return;
    }

    const parent = await findOwned(req, scope);
    if (!parent) {
      res.status(404).json({ success: false, error: 'التعليق غير موجود' });
      return;
    }
    if (parent.parentId) {
      res.status(400).json({ success: false, error: 'يُردّ على التعليق الأصليّ لا على ردٍّ' });
      return;
    }

    const business = scope.type === 'store'
      ? await prisma.store.findUnique({ where: { id: scope.id }, select: { name: true } })
      : await prisma.restaurant.findUnique({ where: { id: scope.id }, select: { name: true } });

    const reply = await prisma.itemComment.create({
      data: {
        productId: parent.productId,
        menuItemId: parent.menuItemId,
        ...scope.where,
        userId: req.user?.id || null,
        authorName: sanitize(business?.name, 80) || (scope.type === 'store' ? 'المتجر' : 'المطعم'),
        body,
        parentId: parent.id,
        isMerchantReply: true
      },
      select: { id: true, authorName: true, body: true, createdAt: true, isHidden: true, isMerchantReply: true }
    });

    res.status(201).json({ success: true, data: reply, message: 'نُشر الردّ' });
  } catch (error) {
    console.error('replyToComment failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر نشر الردّ' });
  }
};

/**
 * إخفاء تعليقٍ أو إظهاره.
 *
 * يقبل `isHidden` صريحاً، وبدونه يقلب الحالة — الصريح يجعل النقرتين
 * المتتاليتين من شاشتين مفتوحتين تنتهيان بما قصده صاحبهما لا بعكسه.
 */
export const setCommentVisibility = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scope = businessScope(req);
    if (!scope) { noBusiness(res); return; }

    const comment = await findOwned(req, scope);
    if (!comment) {
      res.status(404).json({ success: false, error: 'التعليق غير موجود' });
      return;
    }

    const isHidden = typeof req.body?.isHidden === 'boolean' ? req.body.isHidden : !comment.isHidden;
    await prisma.itemComment.update({ where: { id: comment.id }, data: { isHidden } });

    res.json({
      success: true,
      data: { id: comment.id, isHidden },
      message: isHidden ? 'أُخفي التعليق' : 'أُظهر التعليق'
    });
  } catch (error) {
    console.error('setCommentVisibility failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر تحديث التعليق' });
  }
};

/**
 * حذفٌ نهائيّ — ومعه ردوده (القيد في القاعدة).
 *
 * الإخفاء هو المقترَح في الواجهة؛ الحذف لما لا يستحقّ حتى البقاء دليلاً
 * (رقم هاتفٍ منشور بالخطأ، إعلانٌ صريح).
 */
export const deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scope = businessScope(req);
    if (!scope) { noBusiness(res); return; }

    const comment = await findOwned(req, scope);
    if (!comment) {
      res.status(404).json({ success: false, error: 'التعليق غير موجود' });
      return;
    }

    await prisma.itemComment.delete({ where: { id: comment.id } });
    res.json({ success: true, data: { id: comment.id }, message: 'حُذف التعليق' });
  } catch (error) {
    console.error('deleteComment failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر حذف التعليق' });
  }
};

export default {
  getProductComments,
  getMenuItemComments,
  createProductComment,
  createMenuItemComment,
  getManageComments,
  replyToComment,
  setCommentVisibility,
  deleteComment
};
