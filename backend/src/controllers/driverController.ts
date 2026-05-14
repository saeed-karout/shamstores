// controllers/driverController.ts

import { Response } from 'express';
import { AuthRequest } from '../types';
import User from '../models/User';
import Restaurant from '../models/Restaurant';
import bcrypt from 'bcrypt';  // ✅ تغيير من bcryptjs إلى bcrypt

// ==================== دوال إدارة السائقين ====================

/**
 * جلب قائمة السائقين للمطعم
 */
export const getDrivers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    
    console.log('🔍 Fetching drivers - User:', {
      userId: req.user?.id,
      role: req.user?.role,
      restaurantId: restaurantId
    });
    
    let where: any = { role: 'delivery_driver' };
    
    if (req.user?.role !== 'super_admin') {
      if (!restaurantId) {
        res.status(400).json({ 
          success: false,
          error: 'معرف المطعم غير موجود' 
        });
        return;
      }
      where.restaurantId = restaurantId;
    } else if (req.query.restaurantId) {
      where.restaurantId = req.query.restaurantId as string;
    }

    console.log('🔍 Where clause:', where);

    const drivers = await User.findAll({
      where,
      attributes: [
        'id', 'name', 'email', 'phone', 'isActive', 'role',
        'lastLogin', 'lastLocationLat', 'lastLocationLng', 'lastLocationUpdate',
        'restaurantId', 'createdAt'
      ],
      order: [['name', 'ASC']]
    });

    console.log(`✅ Found ${drivers.length} drivers`);

    res.json({
      success: true,
      data: drivers
    });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب السائقين' 
    });
  }
};

/**
 * إنشاء سائق جديد
 */
export const createDriver = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    
    console.log('🔍 Creating driver with user:', {
      userId: req.user?.id,
      userRole: req.user?.role,
      userRestaurantId: restaurantId,
      bodyRestaurantId: req.body.restaurantId
    });
    
    if (!restaurantId && req.user?.role !== 'super_admin') {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const { name, email, password, phone } = req.body;

    // التحقق من وجود البريد الإلكتروني
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ 
        success: false,
        error: 'البريد الإلكتروني مستخدم بالفعل' 
      });
      return;
    }

    // تحديد restaurantId
    let targetRestaurantId = restaurantId;
    
    if (req.user?.role === 'super_admin' && req.body.restaurantId) {
      targetRestaurantId = req.body.restaurantId;
    }
    
    if (req.user?.role === 'super_admin' && !targetRestaurantId) {
      const restaurants = await Restaurant.findAll({ limit: 1 });
      if (restaurants.length > 0) {
        targetRestaurantId = restaurants[0].id;
      }
    }

    console.log('🎯 Target Restaurant ID:', targetRestaurantId);

    if (!targetRestaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'لم يتم تحديد المطعم للسائق' 
      });
      return;
    }

    // التحقق من وجود المطعم
    const restaurant = await Restaurant.findByPk(targetRestaurantId);
    if (!restaurant) {
      res.status(404).json({ 
        success: false,
        error: 'المطعم غير موجود' 
      });
      return;
    }

    // الـ beforeCreate hook سيقوم بتشفير كلمة المرور
    const driver = await User.create({
      name,
      email,
      password,
      phone,
      role: 'delivery_driver',
      restaurantId: targetRestaurantId,
      isActive: true
    } as any);

    console.log('✅ Driver created with restaurantId:', driver.restaurantId);

    // التحقق من كلمة المرور
    const verifyPassword = await bcrypt.compare(password, driver.password);
    console.log('🔐 Password verification:', verifyPassword ? '✅ SUCCESS' : '❌ FAILED');

    const driverData = {
      id: driver.id,
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      role: driver.role,
      restaurantId: driver.restaurantId,
      isActive: driver.isActive,
      createdAt: driver.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'تم إنشاء السائق بنجاح',
      data: driverData
    });
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في إنشاء السائق' 
    });
  }
};

/**
 * تحديث حالة السائق
 */
export const updateDriverStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { driverId } = req.params;
    const { isActive } = req.body;
    const restaurantId = req.user?.restaurantId;

    const where: any = { 
      id: driverId,
      role: 'delivery_driver'
    };
    
    if (req.user?.role !== 'super_admin') {
      where.restaurantId = restaurantId;
    }

    const driver = await User.findOne({ where });

    if (!driver) {
      res.status(404).json({ 
        success: false,
        error: 'السائق غير موجود' 
      });
      return;
    }

    await driver.update({ isActive });

    res.json({
      success: true,
      message: isActive ? 'تم تفعيل السائق' : 'تم تعطيل السائق',
      data: { isActive: driver.isActive }
    });
  } catch (error) {
    console.error('Error updating driver status:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في تحديث حالة السائق' 
    });
  }
};

/**
 * حذف سائق
 */
export const deleteDriver = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { driverId } = req.params;
    const restaurantId = req.user?.restaurantId;

    const where: any = { 
      id: driverId,
      role: 'delivery_driver'
    };
    
    if (req.user?.role !== 'super_admin') {
      where.restaurantId = restaurantId;
    }

    const driver = await User.findOne({ where });

    if (!driver) {
      res.status(404).json({ 
        success: false,
        error: 'السائق غير موجود' 
      });
      return;
    }

    await driver.destroy();

    res.json({
      success: true,
      message: 'تم حذف السائق بنجاح'
    });
  } catch (error) {
    console.error('Error deleting driver:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في حذف السائق' 
    });
  }
};

/**
 * إعادة تعيين كلمة مرور السائق
 */
export const resetDriverPassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { driverId } = req.params;
    const { newPassword } = req.body;
    
    const driver = await User.findOne({
      where: { id: driverId, role: 'delivery_driver' }
    });
    
    if (!driver) {
      res.status(404).json({ success: false, error: 'السائق غير موجود' });
      return;
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    await driver.update({ password: hashedPassword });
    
    const verify = await bcrypt.compare(newPassword, hashedPassword);
    console.log('🔐 Password reset:', verify ? '✅ SUCCESS' : '❌ FAILED');
    
    res.json({
      success: true,
      message: 'تم تحديث كلمة المرور بنجاح'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث كلمة المرور' });
  }
};