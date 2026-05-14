// backend/src/controllers/planController.ts

import { Response } from 'express';
import { AuthRequest } from '../types';
import Plan from '../models/Plan';
import Restaurant from '../models/Restaurant';
import Store from '../models/Store';
import UpgradeRequest from '../models/UpgradeRequest';
import { Op } from 'sequelize';

// دالة مساعدة للحصول على businessId (مطعم أو متجر)
const getBusinessId = async (req: AuthRequest): Promise<{ type: 'restaurant' | 'store', id: string } | null> => {
  // إذا كان سوبر ادمن
  if (req.user?.role === 'super_admin') {
    const targetRestaurantId = req.query.restaurantId as string;
    if (targetRestaurantId) return { type: 'restaurant', id: targetRestaurantId };
    
    const targetStoreId = req.query.storeId as string;
    if (targetStoreId) return { type: 'store', id: targetStoreId };
    
    // جلب أول مطعم
    const restaurants = await Restaurant.findAll({ limit: 1 });
    if (restaurants.length > 0) return { type: 'restaurant', id: restaurants[0].id };
    
    // جلب أول متجر
    const stores = await Store.findAll({ limit: 1 });
    if (stores.length > 0) return { type: 'store', id: stores[0].id };
    
    return null;
  }
  
  // للمالك
  if (req.user?.restaurantId) return { type: 'restaurant', id: req.user.restaurantId };
  if (req.user?.storeId) return { type: 'store', id: req.user.storeId };
  
  return null;
};

export const getPlans = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const plans = await Plan.findAll({
      where: { isActive: true },
      order: [['price', 'ASC']]
    });

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('خطأ في جلب الخطط:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب البيانات' 
    });
  }
};

export const getPlan = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const plan = await Plan.findByPk(id);

    if (!plan) {
      res.status(404).json({ 
        success: false,
        error: 'الخطة غير موجودة' 
      });
      return;
    }

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('خطأ في جلب الخطة:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب البيانات' 
    });
  }
};

export const createPlan = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ 
        success: false,
        error: 'غير مصرح بإنشاء خطط' 
      });
      return;
    }

    const {
      name, price, maxItems, maxTables, maxStaff,
      maxProducts, maxOrdersPerMonth, maxStorage,
      hasWhatsapp, hasOnlineOrders, hasCustomDomain,
      hasAnalytics, hasTableQr, hasMultiLanguage,
      hasPromotions, hasCoupons, hasInventory,
      hasReturns, hasReviews, hasWishlist, hasCompare,
      hasSeo, hasEmailMarketing, hasAbandonedCart,
      hasBulkImport, hasApiAccess, hasPrioritySupport,
      description
    } = req.body;

    const plan = await Plan.create({
      name,
      price,
      maxItems: maxItems || 20,
      maxTables: maxTables || 1,
      maxStaff: maxStaff || 0,
      maxProducts: maxProducts || 50,
      maxOrdersPerMonth: maxOrdersPerMonth || 100,
      maxStorage: maxStorage || 100,
      hasWhatsapp: hasWhatsapp || false,
      hasOnlineOrders: hasOnlineOrders || false,
      hasCustomDomain: hasCustomDomain || false,
      hasAnalytics: hasAnalytics || false,
      hasTableQr: hasTableQr || false,
      hasMultiLanguage: hasMultiLanguage || false,
      hasPromotions: hasPromotions || false,
      hasCoupons: hasCoupons || false,
      hasInventory: hasInventory || false,
      hasReturns: hasReturns || false,
      hasReviews: hasReviews || false,
      hasWishlist: hasWishlist || false,
      hasCompare: hasCompare || false,
      hasSeo: hasSeo || false,
      hasEmailMarketing: hasEmailMarketing || false,
      hasAbandonedCart: hasAbandonedCart || false,
      hasBulkImport: hasBulkImport || false,
      hasApiAccess: hasApiAccess || false,
      hasPrioritySupport: hasPrioritySupport || false,
      description,
      isActive: true
    } as any);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الخطة بنجاح',
      data: plan
    });
  } catch (error) {
    console.error('خطأ في إنشاء الخطة:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في إنشاء الخطة' 
    });
  }
};

export const updatePlan = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ 
        success: false,
        error: 'غير مصرح بتحديث الخطط' 
      });
      return;
    }

    const { id } = req.params;
    const updateData = req.body;

    const plan = await Plan.findByPk(id);

    if (!plan) {
      res.status(404).json({ 
        success: false,
        error: 'الخطة غير موجودة' 
      });
      return;
    }

    await plan.update(updateData);

    res.json({
      success: true,
      message: 'تم تحديث الخطة بنجاح',
      data: plan
    });
  } catch (error) {
    console.error('خطأ في تحديث الخطة:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في تحديث الخطة' 
    });
  }
};

export const deletePlan = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ 
        success: false,
        error: 'غير مصرح بحذف الخطط' 
      });
      return;
    }

    const { id } = req.params;

    const plan = await Plan.findByPk(id);

    if (!plan) {
      res.status(404).json({ 
        success: false,
        error: 'الخطة غير موجودة' 
      });
      return;
    }

    const restaurantsCount = await Restaurant.count({ where: { planId: id } });
    const storesCount = await Store.count({ where: { planId: id } });
    
    if (restaurantsCount > 0 || storesCount > 0) {
      res.status(400).json({ 
        success: false,
        error: 'لا يمكن حذف خطة مستخدمة من قبل مطاعم أو متاجر' 
      });
      return;
    }

    await plan.destroy();

    res.json({
      success: true,
      message: 'تم حذف الخطة بنجاح'
    });
  } catch (error) {
    console.error('خطأ في حذف الخطة:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في حذف الخطة' 
    });
  }
};

// ✅ جلب الخطة الحالية
export const getCurrentPlan = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const business = await getBusinessId(req);
    
    if (!business) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم أو المتجر غير موجود' 
      });
      return;
    }

    console.log('🔍 getCurrentPlan - Business:', business);

    let plan = null;

    if (business.type === 'restaurant') {
      const restaurant = await Restaurant.findByPk(business.id, {
        include: [{ model: Plan, as: 'plan' }]
      });
      plan = (restaurant as any)?.plan;
    } else {
      const store = await Store.findByPk(business.id, {
        include: [{ model: Plan, as: 'plan' }]
      });
      plan = (store as any)?.plan;
    }

    if (!plan) {
      res.status(404).json({ 
        success: false,
        error: 'الخطة غير موجودة' 
      });
      return;
    }

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('خطأ في جلب الخطة الحالية:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب البيانات' 
    });
  }
};

// ✅ إنشاء طلب ترقية (للمالك)
export const createUpgradeRequest = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { planId, entityType, entityId, notes } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const requestedPlan = await Plan.findByPk(planId);
    if (!requestedPlan) {
      res.status(404).json({ success: false, error: 'الخطة غير موجودة' });
      return;
    }

    // التحقق من وجود طلب سابق معلق
    const existingRequest = await UpgradeRequest.findOne({
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
      const restaurant = await Restaurant.findByPk(entityId);
      if (!restaurant) {
        res.status(404).json({ success: false, error: 'المطعم غير موجود' });
        return;
      }
      currentPlanId = restaurant.planId;
      restaurantId = entityId;
    } else if (entityType === 'store') {
      const store = await Store.findByPk(entityId);
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

    const upgradeRequest = await UpgradeRequest.create({
      userId,
      restaurantId: restaurantId || null,
      storeId: storeId || null,
      currentPlanId,
      requestedPlanId: planId,
      notes: notes || null,
      status: 'pending'
    });

    res.json({
      success: true,
      message: 'تم إرسال طلب الترقية بنجاح',
      data: upgradeRequest
    });
  } catch (error) {
    console.error('Error creating upgrade request:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إرسال الطلب' });
  }
};

// ✅ طلبات الترقية للمستخدم الحالي
export const getUserUpgradeRequests = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const requests = await UpgradeRequest.findAll({
      where: { userId: req.user?.id },
      include: [
        { model: Plan, as: 'requestedPlan', attributes: ['id', 'name', 'price'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const formattedRequests = requests.map(req => ({
      id: req.id,
      planId: req.requestedPlanId,
      planName: (req as any).requestedPlan?.name || '',
      price: (req as any).requestedPlan?.price || 0,
      status: req.status,
      notes: req.notes,
      createdAt: req.createdAt,
      approvedAt: req.reviewedAt
    }));

    res.json({
      success: true,
      data: formattedRequests
    });
  } catch (error) {
    console.error('Error fetching user upgrade requests:', error);
    res.json({ success: true, data: [] });
  }
};

