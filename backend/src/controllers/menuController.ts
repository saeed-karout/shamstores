import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import Category from '../models/Category';
import MenuItem from '../models/MenuItem';
import Restaurant from '../models/Restaurant';
import { Op } from 'sequelize';
import crypto from 'crypto';
import { QueryTypes } from 'sequelize';
import sequelize from '../config/database';

// دالة مساعدة للحصول على restaurantId
const getRestaurantId = async (req: AuthRequest): Promise<string | null> => {
  // إذا كان سوبر ادمن
  if (req.user?.role === 'super_admin') {
    // يمكنه تحديد restaurantId من query أو body
    const targetRestaurantId = req.query.restaurantId as string || req.body.restaurantId;
    
    if (targetRestaurantId) {
      return targetRestaurantId;
    }
    
    // إذا لم يحدد، جلب أول مطعم في قاعدة البيانات
    const restaurants = await Restaurant.findAll({ limit: 1 });
    if (restaurants.length > 0) {
      return restaurants[0].id;
    }
    
    return null;
  }
  
  // للمالك والموظفين
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
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const categories = await Category.findAll({
      where: { restaurantId },
      order: [['sortOrder', 'ASC']],
      include: [{ model: MenuItem, as: 'menuItems' }]
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('خطأ في جلب الفئات:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب البيانات' 
    });
  }
};

export const createCategory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const { name, nameEn, description, descriptionEn, image, sortOrder } = req.body;

    console.log('📝 Creating category with data:', {
      restaurantId,
      name,
      nameEn,
      description,
      descriptionEn,
      image,
      sortOrder
    });

    const category = await Category.create({
      restaurantId,
      name,
      nameEn,
      description,
      descriptionEn,
      image,
      sortOrder: sortOrder || 0
    } as any);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الفئة بنجاح',
      data: category
    });
  } catch (error) {
    console.error('خطأ في إنشاء الفئة:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في إنشاء الفئة' 
    });
  }
};

export const updateCategory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const { id } = req.params;
    const { name, nameEn, description, descriptionEn, image, sortOrder, isActive } = req.body;

    const category = await Category.findOne({
      where: { 
        id,
        restaurantId 
      }
    });

    if (!category) {
      res.status(404).json({ 
        success: false,
        error: 'الفئة غير موجودة' 
      });
      return;
    }

    await category.update({
      name: name || category.name,
      nameEn: nameEn !== undefined ? nameEn : category.nameEn,
      description: description !== undefined ? description : category.description,
      descriptionEn: descriptionEn !== undefined ? descriptionEn : category.descriptionEn,
      image: image !== undefined ? image : category.image,
      sortOrder: sortOrder !== undefined ? sortOrder : category.sortOrder,
      isActive: isActive !== undefined ? isActive : category.isActive
    });

    res.json({
      success: true,
      message: 'تم تحديث الفئة بنجاح',
      data: category
    });
  } catch (error) {
    console.error('خطأ في تحديث الفئة:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في تحديث الفئة' 
    });
  }
};

export const deleteCategory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const { id } = req.params;

    const category = await Category.findOne({
      where: { 
        id,
        restaurantId 
      }
    });

    if (!category) {
      res.status(404).json({ 
        success: false,
        error: 'الفئة غير موجودة' 
      });
      return;
    }

    // التحقق من وجود عناصر تابعة
    const itemsCount = await MenuItem.count({ where: { categoryId: id } });
    if (itemsCount > 0) {
      res.status(400).json({ 
        success: false,
        error: 'لا يمكن حذف فئة تحتوي على عناصر' 
      });
      return;
    }

    await category.destroy();

    res.json({
      success: true,
      message: 'تم حذف الفئة بنجاح'
    });
  } catch (error) {
    console.error('خطأ في حذف الفئة:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في حذف الفئة' 
    });
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
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const items = await MenuItem.findAll({
      where: { restaurantId },
      include: [{ model: Category, as: 'category' }],
      order: [
        ['category', 'sortOrder', 'ASC'],
        ['sortOrder', 'ASC']
      ]
    });

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error('خطأ في جلب عناصر القائمة:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب البيانات' 
    });
  }
};

export const createMenuItem = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const {
      categoryId, name, nameEn, description, descriptionEn,
      price, discountedPrice, image, preparationTime, calories,
      hasSizes, hasAddons, sizes, addons
    } = req.body;

    // التحقق من وجود الفئة
    const category = await Category.findOne({
      where: { 
        id: categoryId,
        restaurantId
      }
    });

    if (!category) {
      res.status(404).json({ 
        success: false,
        error: 'الفئة غير موجودة' 
      });
      return;
    }

    // إنشاء رمز مشاركة فريد
    let shareToken;
    let isUnique = false;
    
    while (!isUnique) {
      shareToken = 'item-' + crypto.randomBytes(16).toString('hex');
      const existing = await MenuItem.findOne({ where: { shareToken } });
      isUnique = !existing;
    }

    console.log('🔑 Generated shareToken:', shareToken);

    const item = await MenuItem.create({
      restaurantId,
      categoryId,
      name,
      nameEn,
      description,
      descriptionEn,
      price,
      discountedPrice: discountedPrice || null,
      image,
      preparationTime: preparationTime || null,
      calories: calories || null,
      hasSizes: hasSizes || false,
      hasAddons: hasAddons || false,
      sizes: sizes || null,
      addons: addons || null,
      shareToken
    } as any);

    console.log('✅ Item created with ID:', item.id);
    console.log('✅ Item shareToken:', item.shareToken);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء العنصر بنجاح',
      data: item
    });
  } catch (error) {
    console.error('خطأ في إنشاء العنصر:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في إنشاء العنصر' 
    });
  }
};

export const fixMissingShareTokens = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    // جلب العناصر التي share_token فارغ
    const items = await sequelize.query(
      `SELECT id, name FROM menu_items 
       WHERE restaurant_id = ? 
       AND (share_token IS NULL OR share_token = '')`,
      {
        replacements: [restaurantId],
        type: QueryTypes.SELECT
      }
    );

    console.log(`🔍 Found ${items.length} items with missing share tokens`);

    if (items.length === 0) {
      res.json({
        success: true,
        message: 'لا توجد عناصر تحتاج إلى تحديث',
        data: { fixedCount: 0 }
      });
      return;
    }

    let fixedCount = 0;
    const fixedItems = [];

    for (const item of items as any[]) {
      // إنشاء token فريد
      let shareToken;
      let isUnique = false;
      let attempts = 0;
      
      while (!isUnique && attempts < 10) {
        shareToken = 'item-' + crypto.randomBytes(16).toString('hex');
        const existing = await MenuItem.findOne({ where: { shareToken } });
        isUnique = !existing;
        attempts++;
      }
      
      if (isUnique) {
        await MenuItem.update(
          { shareToken },
          { where: { id: item.id }, individualHooks: true }
        );
        fixedCount++;
        fixedItems.push({
          id: item.id,
          name: item.name,
          shareToken
        });
      }
    }

    console.log(`✅ Fixed ${fixedCount} items`);

    res.json({
      success: true,
      message: `تم تحديث ${fixedCount} عنصر بنجاح`,
      data: { 
        fixedCount,
        items: fixedItems 
      }
    });
  } catch (error) {
    console.error('❌ Error fixing share tokens:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في تحديث الرموز' 
    });
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
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const item = await MenuItem.findOne({
      where: { 
        id,
        restaurantId
      },
      include: [{ model: Category, as: 'category' }]
    });

    if (!item) {
      res.status(404).json({ 
        success: false,
        error: 'العنصر غير موجود' 
      });
      return;
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('خطأ في جلب العنصر:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب البيانات' 
    });
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
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const {
      categoryId, name, nameEn, description, descriptionEn,
      price, discountedPrice, image, isAvailable, isFeatured,
      sortOrder, preparationTime, calories, hasSizes, hasAddons,
      sizes, addons
    } = req.body;

    const item = await MenuItem.findOne({
      where: { 
        id,
        restaurantId
      }
    });

    if (!item) {
      res.status(404).json({ 
        success: false,
        error: 'العنصر غير موجود' 
      });
      return;
    }

    await item.update({
      categoryId: categoryId || item.categoryId,
      name: name || item.name,
      nameEn: nameEn !== undefined ? nameEn : item.nameEn,
      description: description !== undefined ? description : item.description,
      descriptionEn: descriptionEn !== undefined ? descriptionEn : item.descriptionEn,
      price: price || item.price,
      discountedPrice: discountedPrice !== undefined ? discountedPrice : item.discountedPrice,
      image: image !== undefined ? image : item.image,
      isAvailable: isAvailable !== undefined ? isAvailable : item.isAvailable,
      isFeatured: isFeatured !== undefined ? isFeatured : item.isFeatured,
      sortOrder: sortOrder !== undefined ? sortOrder : item.sortOrder,
      preparationTime: preparationTime !== undefined ? preparationTime : item.preparationTime,
      calories: calories !== undefined ? calories : item.calories,
      hasSizes: hasSizes !== undefined ? hasSizes : item.hasSizes,
      hasAddons: hasAddons !== undefined ? hasAddons : item.hasAddons,
      sizes: sizes !== undefined ? sizes : item.sizes,
      addons: addons !== undefined ? addons : item.addons
    });

    res.json({
      success: true,
      message: 'تم تحديث العنصر بنجاح',
      data: item
    });
  } catch (error) {
    console.error('خطأ في تحديث العنصر:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في تحديث العنصر' 
    });
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
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const item = await MenuItem.findOne({
      where: { 
        id,
        restaurantId
      }
    });

    if (!item) {
      res.status(404).json({ 
        success: false,
        error: 'العنصر غير موجود' 
      });
      return;
    }

    await item.destroy();

    res.json({
      success: true,
      message: 'تم حذف العنصر بنجاح'
    });
  } catch (error) {
    console.error('خطأ في حذف العنصر:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في حذف العنصر' 
    });
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
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const item = await MenuItem.findOne({
      where: { 
        id,
        restaurantId
      }
    });

    if (!item) {
      res.status(404).json({ 
        success: false,
        error: 'العنصر غير موجود' 
      });
      return;
    }

    await item.update({ isAvailable: !item.isAvailable });

    res.json({
      success: true,
      message: item.isAvailable ? 'العنصر متاح الآن' : 'العنصر غير متاح الآن',
      data: { isAvailable: item.isAvailable }
    });
  } catch (error) {
    console.error('خطأ في تغيير حالة العنصر:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في تغيير حالة العنصر' 
    });
  }
};

// ==================== العناصر العامة ====================

export const getPublicMenu = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { slug } = req.params;

    const restaurant = await Restaurant.findOne({
      where: { slug, isActive: true }
    });

    if (!restaurant) {
      res.status(404).json({ 
        success: false,
        error: 'المطعم غير موجود' 
      });
      return;
    }

    const categories = await Category.findAll({
      where: { 
        restaurantId: restaurant.id,
        isActive: true 
      },
      order: [['sortOrder', 'ASC']],
      include: [{
        model: MenuItem,
        as: 'menuItems',
        where: { isAvailable: true },
        required: false,
        order: [['sortOrder', 'ASC']]
      }]
    });

    res.json({
      success: true,
      data: {
        restaurant: {
          name: restaurant.name,
          logo: restaurant.logo,
          coverImage: restaurant.coverImage,
          description: restaurant.description,
          phone: restaurant.phone,
          whatsapp: restaurant.whatsapp,
          primaryColor: restaurant.primaryColor,
          secondaryColor: restaurant.secondaryColor,
          backgroundColor: restaurant.backgroundColor,
          textColor: restaurant.textColor,
          fontFamily: restaurant.fontFamily
        },
        categories
      }
    });
  } catch (error) {
    console.error('خطأ في جلب القائمة العامة:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب البيانات' 
    });
  }
};

export const getMenuItemByShare = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token } = req.params;
    
    const item = await MenuItem.findOne({
      where: { shareToken: token },
      include: [
        { model: Restaurant, as: 'restaurant' },
        { model: Category, as: 'category' }
      ]
    });

    if (!item) {
      res.status(404).json({ 
        success: false,
        error: 'العنصر غير موجود' 
      });
      return;
    }

    // زيادة عدد المشاهدات
    await item.increment('viewsCount');

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('❌ Error in getMenuItemByShare:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب البيانات' 
    });
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
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const item = await MenuItem.findOne({
      where: { 
        id,
        restaurantId
      }
    });

    if (!item) {
      res.status(404).json({ 
        success: false,
        error: 'العنصر غير موجود' 
      });
      return;
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('خطأ في جلب العنصر:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب البيانات' 
    });
  }
};
