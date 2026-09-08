// backend/src/controllers/productReviewController.ts
//
// تقييم المنتجات.
//
// **الفرق عن `Order.rating`:** ذاك يقول «كانت التجربة جيدة»، ولا يقول أي
// صنفٍ استحقّها. والزبون الذي يفكّر بالشراء يسأل عن المنتج لا عن الطلب —
// فتقييمٌ لا ينزل إلى مستوى المنتج لا يُعرض له، ويضيع أثره على قرار الشراء.
//
// **ولا يُقبل تقييم إلا من مشترٍ.** التقييم إشارة، وإشارةٌ يستطيع أي زائر
// كتابتها لا تساوي شيئاً — لا للزبون الذي يقرؤها ولا للتاجر الذي يُحاسَب
// عليها.

import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';

/** الحالات التي تُعدّ شراءً مكتملاً — لا يُقيَّم ما لم يُستلم */
const DELIVERED = ['delivered', 'served'] as const;

/**
 * يعيد حساب متوسّط المنتج بعد كل تغيير.
 *
 * المتوسّط محفوظ لا محسوب عند القراءة: صفحة فيها مئة منتج كانت ستُطلق مئة
 * استعلام تجميع في كل زيارة. والمخفيّ لا يُحتسب — إخفاء تقييمٍ مسيء يجب أن
 * يرفع المتوسّط فعلاً لا أن يُخفيه عن العين وحدها.
 */
const recomputeProductRating = async (productId: string): Promise<void> => {
  const stats = await prisma.productReview.aggregate({
    where: { productId, isHidden: false },
    _avg: { rating: true },
    _count: { _all: true }
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      ratingAvg: Math.round((stats._avg.rating || 0) * 100) / 100,
      ratingCount: stats._count._all
    }
  });
};

/**
 * ما يحقّ للزبون تقييمه الآن.
 *
 * تُنادى من نافذة تتبّع الطلب بعد التسليم: يُعرض عليه ما اشتراه ولم يقيّمه
 * بعد. سؤالُه «قيّم منتجاتنا» بلا قائمة يعني أن أحداً لن يقيّم.
 */
export const getReviewableItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { orderId } = req.params;

    const order = await prisma.order.findFirst({
      where: { id: orderId, createdBy: userId, status: { in: [...DELIVERED] } },
      select: {
        id: true,
        items: {
          where: { productId: { not: null } },
          select: { productId: true, product: { select: { name: true, imageUrl: true } } }
        }
      }
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود أو لم يُسلَّم بعد' });
      return;
    }

    const already = await prisma.productReview.findMany({
      where: { orderId: order.id },
      select: { productId: true, rating: true }
    });
    const ratedIds = new Map(already.map((r) => [r.productId, r.rating]));

    // منتجات مكرّرة في الطلب تُعرض مرّةً واحدة
    const seen = new Set<string>();
    const items = order.items
      .filter((item) => item.productId && !seen.has(item.productId) && seen.add(item.productId))
      .map((item) => ({
        productId: item.productId as string,
        name: item.product?.name || 'منتج',
        imageUrl: item.product?.imageUrl || null,
        myRating: ratedIds.get(item.productId as string) ?? null
      }));

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('getReviewableItems failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب المنتجات القابلة للتقييم' });
  }
};

/** الزبون يقيّم منتجاً اشتراه في طلبٍ مسلَّم */
export const submitReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { orderId, productId } = req.params;
    const rating = Number(req.body?.rating);
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim().slice(0, 1000) : null;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ success: false, error: 'التقييم يجب أن يكون بين 1 و 5' });
      return;
    }

    // إثبات الشراء: الطلب له، ومُسلَّم، ويحوي هذا المنتج
    const purchased = await prisma.order.findFirst({
      where: {
        id: orderId,
        createdBy: userId,
        status: { in: [...DELIVERED] },
        items: { some: { productId } }
      },
      select: { id: true }
    });

    if (!purchased) {
      res.status(403).json({ success: false, error: 'لا يمكن تقييم منتج لم تشترِه' });
      return;
    }

    // `upsert` لا `create`: الزبون قد يريد تعديل تقييمه، والقيد المركّب
    // يجعل المحاولة الثانية ترتدّ بخطأ قاعدة بيانات غامض
    await prisma.productReview.upsert({
      where: { orderId_productId: { orderId, productId } },
      update: { rating, comment },
      create: { orderId, productId, userId: userId!, rating, comment }
    });

    await recomputeProductRating(productId);

    res.json({ success: true, message: 'شكراً لتقييمك' });
  } catch (error) {
    console.error('submitReview failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر حفظ التقييم' });
  }
};

/** تقييمات منتجٍ — عامّة، تُعرض لمن يفكّر بالشراء */
export const getProductReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const [reviews, product, breakdown] = await Promise.all([
      prisma.productReview.findMany({
        where: { productId, isHidden: false },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          user: { select: { name: true, avatarUrl: true } }
        }
      }),
      prisma.product.findUnique({
        where: { id: productId },
        select: { ratingAvg: true, ratingCount: true }
      }),
      prisma.productReview.groupBy({
        by: ['rating'],
        where: { productId, isHidden: false },
        _count: { _all: true }
      })
    ]);

    // خمس خانات دائماً: توزيعٌ ينقصه النجمتان يُقرأ وكأن أحداً لم يعطهما
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    breakdown.forEach((row) => { distribution[row.rating] = row._count._all; });

    res.json({
      success: true,
      data: {
        average: product?.ratingAvg ?? 0,
        count: product?.ratingCount ?? 0,
        distribution,
        reviews: reviews.map((review) => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt,
          // الاسم الأول وحده: مراجعةٌ عامّة لا تنشر اسم الزبون كاملاً
          author: (review.user?.name || 'زبون').split(' ')[0],
          avatarUrl: review.user?.avatarUrl || null
        }))
      }
    });
  } catch (error) {
    console.error('getProductReviews failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب التقييمات' });
  }
};

/**
 * إخفاء تقييم أو إظهاره — للتاجر.
 *
 * إخفاءٌ لا حذف: الحذف يُخفي الإساءة ويُخفي معها الدليل، ويترك التاجر بلا
 * ما يحتجّ به إن شكا الزبون. والمخفيّ لا يُحتسب في المتوسّط.
 */
export const setReviewVisibility = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.user?.storeId;
    const { reviewId } = req.params;
    const isHidden = req.body?.isHidden === true;

    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }

    // الشرط على المتجر ليس زائداً: بدونه يُخفي تاجرٌ تقييمات منافسه
    const review = await prisma.productReview.findFirst({
      where: { id: reviewId, product: { storeId } },
      select: { id: true, productId: true }
    });

    if (!review) {
      res.status(404).json({ success: false, error: 'التقييم غير موجود' });
      return;
    }

    await prisma.productReview.update({ where: { id: review.id }, data: { isHidden } });
    await recomputeProductRating(review.productId);

    res.json({ success: true, message: isHidden ? 'أُخفي التقييم' : 'أُظهر التقييم' });
  } catch (error) {
    console.error('setReviewVisibility failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر تحديث التقييم' });
  }
};

/** كل تقييمات المتجر — لوحة الإشراف */
export const getStoreReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }

    const reviews = await prisma.productReview.findMany({
      where: { product: { storeId } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        rating: true,
        comment: true,
        isHidden: true,
        createdAt: true,
        product: { select: { id: true, name: true, imageUrl: true } },
        user: { select: { name: true } }
      }
    });

    res.json({ success: true, data: reviews });
  } catch (error) {
    console.error('getStoreReviews failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب التقييمات' });
  }
};

export default {
  getReviewableItems,
  submitReview,
  getProductReviews,
  setReviewVisibility,
  getStoreReviews
};
