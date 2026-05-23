// backend/src/controllers/planController.ts
import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';

// دالة مساعدة للحصول على businessId (مطعم أو متجر)
const getBusinessId = async (req: AuthRequest): Promise<{ type: 'restaurant' | 'store', id: string } | null> => {
  if (req.user?.role === 'super_admin') {
    const targetRestaurantId = req.query.restaurantId as string;
    if (targetRestaurantId) return { type: 'restaurant', id: targetRestaurantId };
    
    const targetStoreId = req.query.storeId as string;
    if (targetStoreId) return { type: 'store', id: targetStoreId };
    
    const restaurants = await prisma.restaurant.findMany({ take: 1 });
    if (restaurants.length > 0) return { type: 'restaurant', id: restaurants[0].id };
    
    const stores = await prisma.store.findMany({ take: 1 });
    if (stores.length > 0) return { type: 'store', id: stores[0].id };
    
    return null;
  }
  
  if (req.user?.restaurantId) return { type: 'restaurant', id: req.user.restaurantId };
  if (req.user?.storeId) return { type: 'store', id: req.user.storeId };
  
  return null;
};

// ==================== جلب جميع الخطط ====================

export const getPlans = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });

    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('خطأ في جلب الخطط:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

// ==================== جلب خطة محددة ====================

export const getPlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const plan = await prisma.plan.findUnique({ where: { id } });

    if (!plan) {
      res.status(404).json({ success: false, error: 'الخطة غير موجودة' });
      return;
    }

    res.json({ success: true, data: plan });
  } catch (error) {
    console.error('خطأ في جلب الخطة:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

// ==================== إنشاء خطة جديدة (سوبر أدمن فقط) ====================

export const createPlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح بإنشاء خطط' });
      return;
    }

    const {
      name,
      price,
      description,
      maxItems,
      maxTables,
      maxStaff,
      maxProducts,
      maxOrders,
      maxUsers,
      maxRestaurants,
      maxStores,
      position,
      isActive,
      isPopular,
      hasWhatsapp,
      hasOnlineOrders,
      hasCustomDomain,
      hasAnalytics,
      hasTableQr,
      hasMultiLanguage,
      hasPromotions,
      hasCoupons
    } = req.body;

    // توليد slug من الاسم
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    // التحقق من عدم وجود خطة بنفس الاسم
    const existingPlan = await prisma.plan.findFirst({
      where: { name }
    });

    if (existingPlan) {
      res.status(400).json({ success: false, error: 'خطة بنفس الاسم موجودة بالفعل' });
      return;
    }

    const plan = await prisma.plan.create({
      data: {
        name,
        slug,
        price: price || 0,
        description: description || null,
        maxRestaurants: maxRestaurants || 1,
        maxStores: maxStores || 1,
        maxUsers: maxUsers || 5,
        maxMenuItems: maxItems || 20,
        maxProducts: maxProducts || 50,
        maxOrders: maxOrders || 100,
        isActive: isActive !== false,
        position: position || 0,
        isPopular: isPopular || false,
        hasWhatsapp: hasWhatsapp || false,
        hasOnlineOrders: hasOnlineOrders || false,
        hasCustomDomain: hasCustomDomain || false,
        hasAnalytics: hasAnalytics || false,
        hasTableQr: hasTableQr || false,
        hasMultiLanguage: hasMultiLanguage || false,
        hasPromotions: hasPromotions || false,
        hasCoupons: hasCoupons || false
      }
    });

    res.status(201).json({ success: true, message: 'تم إنشاء الخطة بنجاح', data: plan });
  } catch (error) {
    console.error('خطأ في إنشاء الخطة:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الخطة' });
  }
};

// ==================== تحديث خطة (سوبر أدمن فقط) ====================

export const updatePlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح بتحديث الخطط' });
      return;
    }

    const { id } = req.params;
    
    // التحقق من وجود الخطة
    const existingPlan = await prisma.plan.findUnique({ where: { id } });

    if (!existingPlan) {
      res.status(404).json({ success: false, error: 'الخطة غير موجودة' });
      return;
    }

    // استخراج الحقول المسموح بتحديثها
    const {
      name,
      price,
      description,
      maxItems,
      maxTables,
      maxStaff,
      maxProducts,
      maxOrders,
      maxUsers,
      maxRestaurants,
      maxStores,
      isActive,
      position,
      isPopular,
      hasWhatsapp,
      hasOnlineOrders,
      hasCustomDomain,
      hasAnalytics,
      hasTableQr,
      hasMultiLanguage,
      hasPromotions,
      hasCoupons
    } = req.body;

    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }
    if (price !== undefined) updateData.price = price;
    if (description !== undefined) updateData.description = description;
    if (maxItems !== undefined) updateData.maxMenuItems = maxItems;
    if (maxTables !== undefined) updateData.maxTables = maxTables;
    if (maxStaff !== undefined) updateData.maxStaff = maxStaff;
    if (maxProducts !== undefined) updateData.maxProducts = maxProducts;
    if (maxOrders !== undefined) updateData.maxOrders = maxOrders;
    if (maxUsers !== undefined) updateData.maxUsers = maxUsers;
    if (maxRestaurants !== undefined) updateData.maxRestaurants = maxRestaurants;
    if (maxStores !== undefined) updateData.maxStores = maxStores;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (position !== undefined) updateData.position = position;
    if (isPopular !== undefined) updateData.isPopular = isPopular;
    
    // حقول الميزات
    if (hasWhatsapp !== undefined) updateData.hasWhatsapp = hasWhatsapp;
    if (hasOnlineOrders !== undefined) updateData.hasOnlineOrders = hasOnlineOrders;
    if (hasCustomDomain !== undefined) updateData.hasCustomDomain = hasCustomDomain;
    if (hasAnalytics !== undefined) updateData.hasAnalytics = hasAnalytics;
    if (hasTableQr !== undefined) updateData.hasTableQr = hasTableQr;
    if (hasMultiLanguage !== undefined) updateData.hasMultiLanguage = hasMultiLanguage;
    if (hasPromotions !== undefined) updateData.hasPromotions = hasPromotions;
    if (hasCoupons !== undefined) updateData.hasCoupons = hasCoupons;

    const updatedPlan = await prisma.plan.update({
      where: { id },
      data: updateData
    });

    res.json({ success: true, message: 'تم تحديث الخطة بنجاح', data: updatedPlan });
  } catch (error) {
    console.error('خطأ في تحديث الخطة:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الخطة' });
  }
};

// ==================== حذف خطة (سوبر أدمن فقط) ====================

export const deletePlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح بحذف الخطط' });
      return;
    }

    const { id } = req.params;
    const plan = await prisma.plan.findUnique({ where: { id } });

    if (!plan) {
      res.status(404).json({ success: false, error: 'الخطة غير موجودة' });
      return;
    }

    // التحقق من عدم وجود مطاعم أو متاجر مرتبطة بهذه الخطة
    const restaurantsCount = await prisma.restaurant.count({ where: { planId: id } });
    const storesCount = await prisma.store.count({ where: { planId: id } });
    
    if (restaurantsCount > 0 || storesCount > 0) {
      res.status(400).json({ 
        success: false, 
        error: `لا يمكن حذف الخطة لأنها مستخدمة من قبل ${restaurantsCount} مطعم و ${storesCount} متجر` 
      });
      return;
    }

    await prisma.plan.delete({ where: { id } });

    res.json({ success: true, message: 'تم حذف الخطة بنجاح' });
  } catch (error) {
    console.error('خطأ في حذف الخطة:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الخطة' });
  }
};

// ==================== جلب الخطة الحالية للمستخدم ====================

export const getCurrentPlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessId(req);
    
    if (!business) {
      const freePlan = await prisma.plan.findFirst({ where: { name: 'free', isActive: true } });
      res.json({ success: true, data: freePlan });
      return;
    }

    let plan = null;

    if (business.type === 'restaurant') {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: business.id }
      });
      if (restaurant) {
        plan = await prisma.plan.findUnique({ where: { id: restaurant.planId } });
      }
    } else {
      const store = await prisma.store.findUnique({
        where: { id: business.id }
      });
      if (store) {
        plan = await prisma.plan.findUnique({ where: { id: store.planId } });
      }
    }

    if (!plan) {
      plan = await prisma.plan.findFirst({ where: { name: 'free', isActive: true } });
    }

    res.json({ success: true, data: plan });
  } catch (error) {
    console.error('خطأ في جلب الخطة الحالية:', error);
    const freePlan = await prisma.plan.findFirst({ where: { name: 'free', isActive: true } });
    res.json({ success: true, data: freePlan });
  }
};

// ==================== جلب الخطة الحالية (بدون مصادقة) ====================

export const getCurrentPlanMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const freePlan = await prisma.plan.findFirst({ where: { name: 'free', isActive: true } });
    res.json({ success: true, data: freePlan });
  } catch (error) {
    console.error('خطأ في جلب الخطة:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

// ==================== إنشاء طلب ترقية ====================

export const createUpgradeRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { planId, entityType, entityId, notes } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const requestedPlan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!requestedPlan) {
      res.status(404).json({ success: false, error: 'الخطة غير موجودة' });
      return;
    }

    const existingRequest = await prisma.upgradeRequest.findFirst({
      where: { userId, status: 'pending' }
    });

    if (existingRequest) {
      res.status(400).json({ success: false, error: 'لديك طلب ترقية معلق بالفعل' });
      return;
    }

    let currentPlanId: string;
    let restaurantId: string | undefined = undefined;
    let storeId: string | undefined = undefined;

    if (entityType === 'restaurant') {
      const restaurant = await prisma.restaurant.findUnique({ where: { id: entityId } });
      if (!restaurant) {
        res.status(404).json({ success: false, error: 'المطعم غير موجود' });
        return;
      }
      currentPlanId = restaurant.planId;
      restaurantId = entityId;
    } else if (entityType === 'store') {
      const store = await prisma.store.findUnique({ where: { id: entityId } });
      if (!store) {
        res.status(404).json({ success: false, error: 'المتجر غير موجود' });
        return;
      }
      currentPlanId = store.planId;
      storeId = entityId;
    } else {
      res.status(400).json({ success: false, error: 'نوع الكيان غير صالح' });
      return;
    }

    const upgradeRequest = await prisma.upgradeRequest.create({
      data: {
        userId,
        restaurantId: restaurantId || null,
        storeId: storeId || null,
        currentPlanId,
        requestedPlanId: planId,
        reason: notes || null,
        status: 'pending',
        requestedAt: new Date()
      }
    });

    res.json({ success: true, message: 'تم إرسال طلب الترقية بنجاح', data: upgradeRequest });
  } catch (error) {
    console.error('Error creating upgrade request:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إرسال الطلب' });
  }
};

// ==================== جلب طلبات الترقية للمستخدم الحالي ====================

export const getUserUpgradeRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const requests = await prisma.upgradeRequest.findMany({
      where: { userId },
      orderBy: { requestedAt: 'desc' }
    });

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Error fetching user upgrade requests:', error);
    res.json({ success: true, data: [] });
  }
};

// ==================== جلب جميع طلبات الترقية (للسوبر أدمن) ====================

export const getAllUpgradeRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const requests = await prisma.upgradeRequest.findMany({
      orderBy: { requestedAt: 'desc' }
    });

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Error fetching all upgrade requests:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الطلبات' });
  }
};

// ==================== الموافقة على طلب ترقية ====================

export const approveUpgradeRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const { requestId } = req.params;

    const upgradeRequest = await prisma.upgradeRequest.findUnique({ where: { id: requestId } });

    if (!upgradeRequest) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }

    if (upgradeRequest.status !== 'pending') {
      res.status(400).json({ success: false, error: 'تم معالجة هذا الطلب بالفعل' });
      return;
    }

    if (upgradeRequest.restaurantId) {
      await prisma.restaurant.update({
        where: { id: upgradeRequest.restaurantId },
        data: { planId: upgradeRequest.requestedPlanId }
      });
    } else if (upgradeRequest.storeId) {
      await prisma.store.update({
        where: { id: upgradeRequest.storeId },
        data: { planId: upgradeRequest.requestedPlanId }
      });
    }

    const updatedRequest = await prisma.upgradeRequest.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: req.user?.id
      }
    });

    res.json({ success: true, message: 'تمت الموافقة على طلب الترقية بنجاح', data: updatedRequest });
  } catch (error) {
    console.error('Error approving upgrade request:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في الموافقة على الطلب' });
  }
};

// ==================== رفض طلب ترقية ====================

export const rejectUpgradeRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const { requestId } = req.params;
    const { reason } = req.body;

    const upgradeRequest = await prisma.upgradeRequest.findUnique({ where: { id: requestId } });

    if (!upgradeRequest) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }

    if (upgradeRequest.status !== 'pending') {
      res.status(400).json({ success: false, error: 'تم معالجة هذا الطلب بالفعل' });
      return;
    }

    const updatedRequest = await prisma.upgradeRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: req.user?.id,
        reason: reason || null
      }
    });

    res.json({ success: true, message: 'تم رفض طلب الترقية', data: updatedRequest });
  } catch (error) {
    console.error('Error rejecting upgrade request:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في رفض الطلب' });
  }
};