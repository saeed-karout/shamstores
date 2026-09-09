// backend/src/controllers/menuController.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import crypto from 'crypto';

// دالة مساعدة للحصول على restaurantId
const getRestaurantId = async (req: AuthRequest): Promise<string | null> => {
  const targetRestaurantId = req.query.restaurantId as string || req.body.restaurantId;

  if (req.user?.role === 'super_admin') {
    if (targetRestaurantId) return targetRestaurantId;
    const restaurants = await prisma.restaurant.findMany({ take: 1 });
    return restaurants.length > 0 ? restaurants[0].id : null;
  }

  if (req.user?.role === 'owner' && req.user?.id && targetRestaurantId) {
    const ownedRestaurant = await prisma.restaurant.findFirst({
      where: { id: targetRestaurantId, userId: req.user.id },
      select: { id: true }
    });
    if (ownedRestaurant) return ownedRestaurant.id;
  }

  return req.user?.restaurantId || null;
};

// ==================== الفئات ====================

export const getCategories = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const categories = await prisma.category.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { position: 'asc' }
    });

    // جلب عناصر القائمة لكل فئة بشكل منفصل
    const categoriesWithItems = await Promise.all(categories.map(async (category) => {
      const menuItems = await prisma.menuItem.findMany({
        where: { categoryId: category.id, restaurantId, isAvailable: true },
        orderBy: { position: 'asc' }
      });
      return { ...category, menuItems };
    }));

    res.json({ success: true, data: categoriesWithItems });
  } catch (error) {
    console.error('خطأ في جلب الفئات:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

export const createCategory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const { name, description, position } = req.body;

    const category = await prisma.category.create({
      data: {
        restaurantId,
        name,
        description: description || null,
        position: position || 0,
        isActive: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الفئة بنجاح',
      data: category
    });
  } catch (error) {
    console.error('خطأ في إنشاء الفئة:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الفئة' });
  }
};

export const updateCategory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const { id } = req.params;
    const { name, description, position, isActive } = req.body;

    const category = await prisma.category.findFirst({
      where: { id, restaurantId }
    });

    if (!category) {
      res.status(404).json({ success: false, error: 'الفئة غير موجودة' });
      return;
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name: name || category.name,
        description: description !== undefined ? description : category.description,
        position: position !== undefined ? position : category.position,
        isActive: isActive !== undefined ? isActive : category.isActive
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث الفئة بنجاح',
      data: updatedCategory
    });
  } catch (error) {
    console.error('خطأ في تحديث الفئة:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الفئة' });
  }
};

export const deleteCategory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const { id } = req.params;

    const category = await prisma.category.findFirst({
      where: { id, restaurantId }
    });

    if (!category) {
      res.status(404).json({ success: false, error: 'الفئة غير موجودة' });
      return;
    }

    const itemsCount = await prisma.menuItem.count({ where: { categoryId: id } });
    if (itemsCount > 0) {
      res.status(400).json({ success: false, error: 'لا يمكن حذف فئة تحتوي على عناصر' });
      return;
    }

    await prisma.category.delete({ where: { id } });

    res.json({ success: true, message: 'تم حذف الفئة بنجاح' });
  } catch (error) {
    console.error('خطأ في حذف الفئة:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الفئة' });
  }
};

// ==================== عناصر القائمة ====================

export const getMenuItems = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const items = await prisma.menuItem.findMany({
      where: { restaurantId },
      orderBy: { position: 'asc' }
    });

    // جلب أسماء الفئات بشكل منفصل
    const itemsWithCategory = await Promise.all(items.map(async (item) => {
      let category = null;
      if (item.categoryId) {
        category = await prisma.category.findUnique({
          where: { id: item.categoryId },
          select: { id: true, name: true }
        });
      }
      return { ...item, category };
    }));

    res.json({ success: true, data: itemsWithCategory });
  } catch (error) {
    console.error('خطأ في جلب عناصر القائمة:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

/**
 * يُطبّع رمز الصنف (SKU) ويتحقّق أنه غير مستعمل داخل المطعم نفسه.
 *
 * **الفراغ يعني «بلا رمز» لا نصّاً فارغاً:** حقلٌ نصّي فارغ في نموذج الويب
 * يصل `''` لا `undefined`. ولو خُزّن كما هو لصار لعشرات الأصناف «رمزٌ»
 * واحد هو الفراغ، فيرجع مسحُ الباركود أوّلَ صنفٍ صادفه.
 *
 * **التفرّد داخل المطعم لا عبر المنصّة:** مطعمان يبيعان نفس عبوة المشروب
 * لها باركود مطبوع واحد — وذلك ليس تعارضاً. (بخلاف `Product.sku` في المتاجر
 * وهو فريدٌ عالمياً في المخطّط، وهو قيدٌ أضيق ممّا يلزم.)
 *
 * @returns النصّ المطبّع، أو `null` للفراغ، أو رسالة خطأ عند التعارض.
 */
const normalizeMenuItemSku = async (
  raw: unknown,
  restaurantId: string,
  excludeItemId?: string
): Promise<{ value: string | null } | { error: string }> => {
  if (raw === undefined || raw === null) return { value: null };

  const sku = String(raw).trim();
  if (!sku) return { value: null };

  if (sku.length > 64) {
    return { error: 'رمز الصنف أطول من ٦٤ محرفاً' };
  }

  const clash = await prisma.menuItem.findFirst({
    where: {
      restaurantId,
      sku,
      ...(excludeItemId ? { id: { not: excludeItemId } } : {})
    },
    select: { name: true }
  });

  if (clash) {
    return { error: `الرمز «${sku}» مستعمل للصنف «${clash.name}»` };
  }

  return { value: sku };
};

/**
 * يطبّع حقول المخزون.
 *
 * **إطفاء التتبّع يمحو الرصيد إلى `null` لا يتركه صفراً.** الصفر يعني
 * «نفد» فيُخفي الصنف عن الزبائن؛ والـ`null` يعني «لا يُتتبَّع» وهو المقصود.
 * وترك الصفر عند الإطفاء كان سيُخفي كل صنفٍ أُلغي تتبّعه.
 */
const normalizeStock = (
  trackStock: unknown,
  stock: unknown,
  minStockLevel: unknown
): { trackStock: boolean; stock: number | null; minStockLevel: number | null } => {
  const tracked = trackStock === true || trackStock === 'true';
  if (!tracked) return { trackStock: false, stock: null, minStockLevel: null };

  const qty = Number(stock);
  const min = Number(minStockLevel);
  return {
    trackStock: true,
    stock: Number.isFinite(qty) ? Math.max(0, Math.round(qty)) : 0,
    minStockLevel: Number.isFinite(min) && min > 0 ? Math.round(min) : 5
  };
};

export const createMenuItem = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const { categoryId, name, description, price, originalPrice, image, position, sku, trackStock, stock, minStockLevel } = req.body;

    // التحقق من وجود الفئة
    const category = await prisma.category.findFirst({
      where: { id: categoryId, restaurantId }
    });

    if (!category) {
      res.status(404).json({ success: false, error: 'الفئة غير موجودة' });
      return;
    }

    const skuResult = await normalizeMenuItemSku(sku, restaurantId);
    if ('error' in skuResult) {
      res.status(400).json({ success: false, error: skuResult.error });
      return;
    }

    const item = await prisma.menuItem.create({
      data: {
        restaurantId,
        categoryId,
        name,
        description: description || null,
        price,
        originalPrice: originalPrice || null,
        image: image || null,
        position: position || 0,
        sku: skuResult.value,
        ...normalizeStock(trackStock, stock, minStockLevel),
        isAvailable: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء العنصر بنجاح',
      data: item
    });
  } catch (error) {
    console.error('خطأ في إنشاء العنصر:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء العنصر' });
  }
};

export const getMenuItem = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const item = await prisma.menuItem.findFirst({
      where: { id, restaurantId }
    });

    if (!item) {
      res.status(404).json({ success: false, error: 'العنصر غير موجود' });
      return;
    }

    // جلب الفئة بشكل منفصل
    let category = null;
    if (item.categoryId) {
      category = await prisma.category.findUnique({
        where: { id: item.categoryId },
        select: { id: true, name: true }
      });
    }

    res.json({ success: true, data: { ...item, category } });
  } catch (error) {
    console.error('خطأ في جلب العنصر:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

export const updateMenuItem = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const { categoryId, name, description, price, originalPrice, image, position, isAvailable, sku, trackStock, stock, minStockLevel } = req.body;

    const item = await prisma.menuItem.findFirst({
      where: { id, restaurantId }
    });

    if (!item) {
      res.status(404).json({ success: false, error: 'العنصر غير موجود' });
      return;
    }

    // إذا تم تغيير الفئة، تحقق من وجودها
    if (categoryId && categoryId !== item.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, restaurantId }
      });
      if (!category) {
        res.status(404).json({ success: false, error: 'الفئة الجديدة غير موجودة' });
        return;
      }
    }

    // `sku` غير المُرسَل يترك القديم؛ والمُرسَل فارغاً يمسحه عمداً — وهما
    // حالتان مختلفتان لا يجوز خلطهما، وإلا تعذّر مسح رمزٍ خاطئ أبداً.
    let nextSku = item.sku;
    if (sku !== undefined) {
      const skuResult = await normalizeMenuItemSku(sku, restaurantId, id);
      if ('error' in skuResult) {
        res.status(400).json({ success: false, error: skuResult.error });
        return;
      }
      nextSku = skuResult.value;
    }

    const updatedItem = await prisma.menuItem.update({
      where: { id },
      data: {
        sku: nextSku,
        ...(trackStock !== undefined || stock !== undefined || minStockLevel !== undefined
          ? normalizeStock(
              trackStock !== undefined ? trackStock : item.trackStock,
              stock !== undefined ? stock : item.stock,
              minStockLevel !== undefined ? minStockLevel : item.minStockLevel
            )
          : {}),
        categoryId: categoryId !== undefined ? categoryId : item.categoryId,
        name: name || item.name,
        description: description !== undefined ? description : item.description,
        price: price || item.price,
        originalPrice: originalPrice !== undefined ? originalPrice : item.originalPrice,
        image: image !== undefined ? image : item.image,
        position: position !== undefined ? position : item.position,
        isAvailable: isAvailable !== undefined ? isAvailable : item.isAvailable
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث العنصر بنجاح',
      data: updatedItem
    });
  } catch (error) {
    console.error('خطأ في تحديث العنصر:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث العنصر' });
  }
};

export const deleteMenuItem = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const item = await prisma.menuItem.findFirst({
      where: { id, restaurantId }
    });

    if (!item) {
      res.status(404).json({ success: false, error: 'العنصر غير موجود' });
      return;
    }

    await prisma.menuItem.delete({ where: { id } });

    res.json({ success: true, message: 'تم حذف العنصر بنجاح' });
  } catch (error) {
    console.error('خطأ في حذف العنصر:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف العنصر' });
  }
};

export const toggleAvailability = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const item = await prisma.menuItem.findFirst({
      where: { id, restaurantId }
    });

    if (!item) {
      res.status(404).json({ success: false, error: 'العنصر غير موجود' });
      return;
    }

    const updatedItem = await prisma.menuItem.update({
      where: { id },
      data: { isAvailable: !item.isAvailable }
    });

    res.json({
      success: true,
      message: updatedItem.isAvailable ? 'العنصر متاح الآن' : 'العنصر غير متاح الآن',
      data: { isAvailable: updatedItem.isAvailable }
    });
  } catch (error) {
    console.error('خطأ في تغيير حالة العنصر:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تغيير حالة العنصر' });
  }
};

// ==================== العناصر العامة ====================

export const getPublicMenu = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { slug } = req.params;

    const restaurant = await prisma.restaurant.findFirst({
      where: { slug, isActive: true }
    });

    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }

    const categories = await prisma.category.findMany({
      where: { restaurantId: restaurant.id, isActive: true },
      orderBy: { position: 'asc' }
    });

    const menuItems = await prisma.menuItem.findMany({
      where: { restaurantId: restaurant.id, isAvailable: true },
      orderBy: { position: 'asc' }
    });

    // تجميع العناصر حسب الفئة
    const categoriesWithItems = categories.map(category => ({
      ...category,
      menuItems: menuItems.filter(item => item.categoryId === category.id)
    }));

    res.json({
      success: true,
      data: {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          logo: restaurant.logo,
          coverImage: restaurant.coverImage,
          description: restaurant.description,
          phone: restaurant.phone,
          whatsapp: restaurant.whatsapp,
          primaryColor: restaurant.primaryColor,
          secondaryColor: restaurant.secondaryColor
        },
        categories: categoriesWithItems
      }
    });
  } catch (error) {
    console.error('خطأ في جلب القائمة العامة:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

export const getMenuItemByShare = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token } = req.params;
    
    const item = await prisma.menuItem.findFirst({
      where: { id: token, isAvailable: true }
    });

    if (!item) {
      res.status(404).json({ success: false, error: 'العنصر غير موجود' });
      return;
    }

    // جلب بيانات المطعم والفئة بشكل منفصل
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: item.restaurantId },
      select: { id: true, name: true, slug: true, logo: true }
    });

    let category = null;
    if (item.categoryId) {
      category = await prisma.category.findUnique({
        where: { id: item.categoryId },
        select: { id: true, name: true }
      });
    }

    // زيادة عدد المشاهدات
    await prisma.menuItem.update({
      where: { id: item.id },
      data: { ordersCount: (item.ordersCount || 0) + 1 }
    });

    res.json({ success: true, data: { ...item, restaurant, category } });
  } catch (error) {
    console.error('❌ Error in getMenuItemByShare:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

export const getMenuItemById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const item = await prisma.menuItem.findFirst({
      where: { id, restaurantId }
    });

    if (!item) {
      res.status(404).json({ success: false, error: 'العنصر غير موجود' });
      return;
    }

    // جلب الفئة بشكل منفصل
    let category = null;
    if (item.categoryId) {
      category = await prisma.category.findUnique({
        where: { id: item.categoryId },
        select: { id: true, name: true }
      });
    }

    res.json({ success: true, data: { ...item, category } });
  } catch (error) {
    console.error('خطأ في جلب العنصر:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

// إصلاح share tokens (مبسط)
export const fixMissingShareTokens = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    res.json({
      success: true,
      message: 'الرموز تعمل بشكل طبيعي',
      data: { fixedCount: 0 }
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ' });
  }
};