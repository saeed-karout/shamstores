// controllers/adminController.ts

import { Response } from 'express';
import { AuthRequest, OrderStatus } from '../types';
import User from '../models/User';
import Restaurant from '../models/Restaurant';
import Plan from '../models/Plan';
import Store from '../models/Store';
import Order from '../models/Order';
import OrderItem from '../models/OrderItem';
import MenuItem from '../models/MenuItem';
import PlatformSetting from '../models/PlatformSettings';
import { sequelize, Table } from '../models';
import { Op } from 'sequelize';
import Product from '../models/Product';
import UpgradeRequest from '../models/UpgradeRequest';
import bcrypt from 'bcrypt';



const generateUniqueStoreSubdomain = async (baseSubdomain: string, excludeId?: string): Promise<string> => {
  let subdomain = baseSubdomain;
  let counter = 1;
  
  subdomain = subdomain
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  while (true) {
    const where: any = { subdomain };
    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }
    
    const existing = await Store.findOne({ where });
    if (!existing) {
      break;
    }
    
    subdomain = `${baseSubdomain}-${counter}`;
    counter++;
  }
  
  return subdomain;
};

export const getAllPlatformStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 20, status, type, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const where: any = { role: 'staff' };
    
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    
    // تصفية حسب النوع (مطعم أو متجر)
    if (type === 'restaurant') {
      where.restaurantId = { [Op.ne]: null };
    } else if (type === 'store') {
      where.storeId = { [Op.ne]: null };
    }
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [
        { 
          model: Store, 
          as: 'store',
          attributes: ['id', 'name', 'slug'],
          required: false
        },
        { 
          model: Restaurant, 
          as: 'restaurant',
          attributes: ['id', 'name', 'slug'],
          required: false
        }
      ],
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    console.log(`✅ Found ${count} staff members across platform`);

    res.json({
      success: true,
      data: {
        staff: rows,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(count / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting platform staff:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الموظفين' });
  }
};

export const getPlatformStaffDetails = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { staffId } = req.params;

    const staff = await User.findOne({
      where: { 
        id: staffId,
        role: 'staff'
      },
      attributes: { exclude: ['password'] },
      include: [
        { 
          model: Store, 
          as: 'store',
          attributes: ['id', 'name', 'slug', 'email', 'phone'],
          required: false
        },
        { 
          model: Restaurant, 
          as: 'restaurant',
          attributes: ['id', 'name', 'slug', 'email', 'phone'],
          required: false
        }
      ]
    });

    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }

    res.json({
      success: true,
      data: staff
    });
  } catch (error) {
    console.error('Error getting staff details:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب بيانات الموظف' });
  }
};

export const updatePlatformStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { staffId } = req.params;
    const { name, email, phone, password, permissions } = req.body;

    const staff = await User.findOne({
      where: { 
        id: staffId,
        role: 'staff'
      }
    });

    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (permissions !== undefined) updateData.permissions = permissions;
    
    if (password && password.length > 0) {
      if (password.length < 6) {
        res.status(400).json({ success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
        return;
      }
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    await staff.update(updateData);

    const updatedStaff = await User.findByPk(staffId, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Store, as: 'store', attributes: ['id', 'name'] },
        { model: Restaurant, as: 'restaurant', attributes: ['id', 'name'] }
      ]
    });

    res.json({
      success: true,
      message: 'تم تحديث بيانات الموظف بنجاح',
      data: updatedStaff
    });
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث بيانات الموظف' });
  }
};

export const togglePlatformStaffStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { staffId } = req.params;

    const staff = await User.findOne({
      where: { 
        id: staffId,
        role: 'staff'
      }
    });

    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }

    await staff.update({ isActive: !staff.isActive });

    res.json({
      success: true,
      message: staff.isActive ? 'تم تفعيل الموظف' : 'تم تعطيل الموظف',
      data: { isActive: staff.isActive }
    });
  } catch (error) {
    console.error('Error toggling staff status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تغيير حالة الموظف' });
  }
};

export const deletePlatformStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { staffId } = req.params;

    const staff = await User.findOne({
      where: { 
        id: staffId,
        role: 'staff'
      }
    });

    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }

    await staff.destroy();

    res.json({
      success: true,
      message: 'تم حذف الموظف بنجاح'
    });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الموظف' });
  }
};


// ==================== إدارة موظفي المتجر (للسوبر أدمن) ====================

export const getStoreStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { storeId } = req.params;
    const { status, search } = req.query;

    // التحقق من وجود المتجر
    const store = await Store.findByPk(storeId);
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }

    const where: any = { 
      storeId,
      role: 'staff'
    };
    
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }

    const staff = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    console.log(`✅ Found ${staff.length} staff members for store ${storeId}`);

    res.json({
      success: true,
      data: staff
    });
  } catch (error) {
    console.error('Error getting store staff:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الموظفين' });
  }
};

export const getStoreStaffDetails = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { storeId, staffId } = req.params;

    const staff = await User.findOne({
      where: { 
        id: staffId,
        storeId,
        role: 'staff'
      },
      attributes: { exclude: ['password'] }
    });

    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }

    res.json({
      success: true,
      data: staff
    });
  } catch (error) {
    console.error('Error getting staff details:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب بيانات الموظف' });
  }
};

export const createStoreStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { storeId } = req.params;
    const { name, email, password, phone } = req.body;

    // التحقق من وجود المتجر
    const store = await Store.findByPk(storeId);
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }

    // التحقق من وجود البريد الإلكتروني
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ success: false, error: 'البريد الإلكتروني موجود بالفعل' });
      return;
    }

    if (!password || password.length < 6) {
      res.status(400).json({ success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const staff = await User.create({
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
      role: 'staff',
      storeId,
      isActive: true,
      permissions: {
        viewOrders: true,
        updateOrderStatus: false,
        viewProducts: true,
        updateProducts: false,
        viewInventory: true,
        updateInventory: false
      }
    } as any);

    const staffData = {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      storeId: staff.storeId,
      isActive: staff.isActive,
      permissions: staff.permissions,
      createdAt: staff.createdAt
    };

    console.log(`✅ Staff member created for store ${storeId}:`, staff.id);

    res.status(201).json({
      success: true,
      message: 'تم إضافة الموظف بنجاح',
      data: staffData
    });
  } catch (error) {
    console.error('Error creating store staff:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إضافة الموظف' });
  }
};

export const updateStoreStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { storeId, staffId } = req.params;
    const { name, email, phone, password } = req.body;

    const staff = await User.findOne({
      where: { 
        id: staffId,
        storeId,
        role: 'staff'
      }
    });

    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    
    if (password && password.length > 0) {
      if (password.length < 6) {
        res.status(400).json({ success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
        return;
      }
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    await staff.update(updateData);

    const updatedStaff = await User.findByPk(staffId, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      message: 'تم تحديث بيانات الموظف بنجاح',
      data: updatedStaff
    });
  } catch (error) {
    console.error('Error updating store staff:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث بيانات الموظف' });
  }
};

export const deleteStoreStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { storeId, staffId } = req.params;

    const staff = await User.findOne({
      where: { 
        id: staffId,
        storeId,
        role: 'staff'
      }
    });

    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }

    await staff.destroy();

    res.json({
      success: true,
      message: 'تم حذف الموظف بنجاح'
    });
  } catch (error) {
    console.error('Error deleting store staff:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الموظف' });
  }
};

export const toggleStoreStaffStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { storeId, staffId } = req.params;

    const staff = await User.findOne({
      where: { 
        id: staffId,
        storeId,
        role: 'staff'
      }
    });

    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }

    await staff.update({ isActive: !staff.isActive });

    res.json({
      success: true,
      message: staff.isActive ? 'تم تفعيل الموظف' : 'تم تعطيل الموظف',
      data: { isActive: staff.isActive }
    });
  } catch (error) {
    console.error('Error toggling staff status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تغيير حالة الموظف' });
  }
};

export const updateStoreStaffPermissions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { storeId, staffId } = req.params;
    const { permissions } = req.body;

    const staff = await User.findOne({
      where: { 
        id: staffId,
        storeId,
        role: 'staff'
      }
    });

    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }

    await staff.update({ permissions });

    res.json({
      success: true,
      message: 'تم تحديث صلاحيات الموظف بنجاح',
      data: { permissions }
    });
  } catch (error) {
    console.error('Error updating staff permissions:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الصلاحيات' });
  }
};


// ==================== إحصائيات عامة ====================

export const getPlatformStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const [
      restaurantsCount,
      storesCount,
      usersCount,
      driversCount,
      ordersCount,
      totalRevenue,
      pendingOrders,
      deliveringOrders,
      completedOrders
    ] = await Promise.all([
      Restaurant.count(),
      Store.count(),
      User.count({ where: { role: { [Op.ne]: 'super_admin' } } }),
      User.count({ where: { role: 'delivery_driver' } }),
      Order.count(),
      Order.sum('total'),
      Order.count({ where: { status: 'pending' } }),
      Order.count({ where: { status: 'delivering' } }),
      Order.count({ where: { status: 'delivered' } })
    ]);

    // الطلبات آخر 7 أيام
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    
    const weeklyOrders = await Order.findAll({
      where: {
        createdAt: { [Op.gte]: last7Days }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      raw: true
    });

    res.json({
      success: true,
      data: {
        overview: {
          restaurants: restaurantsCount,
          stores: storesCount,
          users: usersCount,
          drivers: driversCount,
          orders: ordersCount,
          revenue: totalRevenue || 0
        },
        orders: {
          total: ordersCount,
          pending: pendingOrders,
          delivering: deliveringOrders,
          completed: completedOrders
        },
        weeklyOrders: weeklyOrders.map(item => ({
          date: (item as any).date,
          count: parseInt((item as any).count)
        })),
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Error getting platform stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب الإحصائيات' 
    });
  }
};

// ==================== إدارة المطاعم ====================


export const getAllRestaurants = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const where: any = {};
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const { count, rows } = await Restaurant.findAndCountAll({
      where,
      include: [
        { 
          model: User, 
          as: 'users', 
          attributes: ['id', 'name', 'email'],
          required: false,
          where: { role: 'owner' },
          limit: 1
        },
        { model: Plan, as: 'plan', attributes: ['id', 'name', 'price'] }
      ],
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
      distinct: true
    });
    
    // جلب إحصائيات لكل مطعم
    const restaurantsWithStats = await Promise.all(rows.map(async (restaurant) => {
      const productsCount = await MenuItem.count({ where: { restaurantId: restaurant.id } });
      const ordersCount = await Order.count({ where: { restaurantId: restaurant.id } });
      
      return {
        ...restaurant.toJSON(),
        productsCount,
        ordersCount
      };
    }));
    
    res.json({
      success: true,
      data: {
        restaurants: restaurantsWithStats,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(count / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting restaurants:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المطاعم' });
  }
};


export const getRestaurantDetails = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    console.log('🔍 Fetching restaurant details for ID:', id);
    
    // التحقق من صحة الـ UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير صالح' });
      return;
    }
    
    const restaurant = await Restaurant.findByPk(id, {
      include: [
        { 
          model: User, 
          as: 'users', 
          attributes: ['id', 'name', 'email', 'phone', 'isActive'],
          required: false,
          where: { role: 'owner' },
          limit: 1
        },
        { model: Plan, as: 'plan', attributes: ['id', 'name', 'price', 'maxItems', 'maxTables', 'maxStaff'] },
        { model: Order, as: 'orders', limit: 5, order: [['createdAt', 'DESC']], required: false },
        { model: Table, as: 'tables', limit: 10, required: false }
      ]
    });
    
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }
    
    // جلب إحصائيات إضافية
    const [productsCount, tablesCount, ordersCount, totalSales] = await Promise.all([
      MenuItem.count({ where: { restaurantId: restaurant.id } }),
      Table.count({ where: { restaurantId: restaurant.id } }),
      Order.count({ where: { restaurantId: restaurant.id } }),
      Order.sum('total', { where: { restaurantId: restaurant.id, status: 'delivered' } })
    ]);
    
    const restaurantData = restaurant.toJSON();
    
    res.json({
      success: true,
      data: {
        ...restaurantData,
        stats: {
          productsCount: productsCount || 0,
          tablesCount: tablesCount || 0,
          ordersCount: ordersCount || 0,
          totalSales: totalSales || 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting restaurant details:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في جلب تفاصيل المطعم' 
    });
  }
};
export const toggleRestaurantStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findByPk(id);
    
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }

    await restaurant.update({ isActive: !restaurant.isActive });

    res.json({
      success: true,
      message: restaurant.isActive ? 'تم تفعيل المطعم' : 'تم تعطيل المطعم',
      data: { isActive: restaurant.isActive }
    });
  } catch (error) {
    console.error('Error toggling restaurant:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تغيير حالة المطعم' });
  }
};

export const deleteRestaurant = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findByPk(id);
    
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }

    await restaurant.destroy();

    res.json({
      success: true,
      message: 'تم حذف المطعم بنجاح'
    });
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف المطعم' });
  }
};






// ==================== إدارة المستخدمين ====================

export const getAllUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    // استبعاد السوبر أدمن من القائمة إذا لم يكن مطلوباً
    if (!role || role !== 'super_admin') {
      where.role = { [Op.ne]: 'super_admin' };
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [
        { model: Restaurant, as: 'restaurant', attributes: ['id', 'name'] },
        { model: Store, as: 'store', attributes: ['id', 'name'] }
      ],
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        users: rows,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(count / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المستخدمين' });
  }
};

export const getUserDetails = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Restaurant, as: 'restaurant' },
        { model: Store, as: 'store' },
        { model: Order, as: 'createdOrders', limit: 10, order: [['createdAt', 'DESC']] }
      ]
    });
    
    if (!user) {
      res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
      return;
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error getting user details:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تفاصيل المستخدم' });
  }
};

export const updateUserRole = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    const allowedRoles = ['user', 'owner', 'staff', 'delivery_driver'];
    if (!allowedRoles.includes(role)) {
      res.status(400).json({ success: false, error: 'دور غير صالح' });
      return;
    }

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
      return;
    }

    if (user.role === 'super_admin') {
      res.status(403).json({ success: false, error: 'لا يمكن تغيير دور السوبر أدمن' });
      return;
    }

    await user.update({ role });

    res.json({
      success: true,
      message: 'تم تحديث دور المستخدم بنجاح',
      data: { role: user.role }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث دور المستخدم' });
  }
};

export const toggleUserStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    
    if (!user) {
      res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
      return;
    }

    if (user.role === 'super_admin') {
      res.status(403).json({ success: false, error: 'لا يمكن تعطيل السوبر أدمن' });
      return;
    }

    await user.update({ isActive: !user.isActive });

    res.json({
      success: true,
      message: user.isActive ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم',
      data: { isActive: user.isActive }
    });
  } catch (error) {
    console.error('Error toggling user:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تغيير حالة المستخدم' });
  }
};

export const deleteUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    
    if (!user) {
      res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
      return;
    }

    if (user.role === 'super_admin') {
      res.status(403).json({ success: false, error: 'لا يمكن حذف السوبر أدمن' });
      return;
    }

    await user.destroy();

    res.json({
      success: true,
      message: 'تم حذف المستخدم بنجاح'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف المستخدم' });
  }
};

// ==================== إدارة الطلبات ====================


export const getAllOrders = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 20, status, source, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const where: any = {};
    if (status) where.status = status;
    if (source) where.orderSource = source;
    if (search) {
      where[Op.or] = [
        { orderNumber: { [Op.like]: `%${search}%` } },
        { customerName: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        { model: Restaurant, as: 'restaurant', attributes: ['id', 'name', 'phone'] },
        { model: Store, as: 'store', attributes: ['id', 'name', 'phone'] },
        { model: User, as: 'assignedDriver', attributes: ['id', 'name', 'phone'] }
      ],
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
      distinct: true
    });

    res.json({
      success: true,
      data: {
        orders: rows,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(count / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الطلبات' });
  }
};

export const getOrderDetails = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id, {
      include: [
        { model: Restaurant, as: 'restaurant' },
        { model: Store, as: 'store' },
        { model: User, as: 'assignedDriver' },
        { model: OrderItem, as: 'orderItems', include: [{ model: MenuItem, as: 'menuItem' }] }
      ]
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error getting order details:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تفاصيل الطلب' });
  }
};

export const updateOrderStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const order = await Order.findByPk(id);
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }
    
    await order.update({ status });
    
    res.json({
      success: true,
      message: 'تم تحديث حالة الطلب بنجاح',
      data: { status: order.status }
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث حالة الطلب' });
  }
};

// ==================== إدارة السائقين ====================

export const getAllDrivers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const where: any = { role: 'delivery_driver' };
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [
        { model: Restaurant, as: 'restaurant', attributes: ['id', 'name'] },
        { model: Store, as: 'store', attributes: ['id', 'name'] }
      ],
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        drivers: rows,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(count / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting drivers:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب السائقين' });
  }
};

export const getDriverDetails = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const driver = await User.findOne({
      where: { id, role: 'delivery_driver' },
      attributes: { exclude: ['password'] },
      include: [
        { model: Restaurant, as: 'restaurant' },
        { model: Store, as: 'store' },
        { model: Order, as: 'assignedDeliveries', limit: 10, order: [['createdAt', 'DESC']] }
      ]
    });
    
    if (!driver) {
      res.status(404).json({ success: false, error: 'السائق غير موجود' });
      return;
    }
    
    res.json({
      success: true,
      data: driver
    });
  } catch (error) {
    console.error('Error getting driver details:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تفاصيل السائق' });
  }
};

export const toggleDriverStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const driver = await User.findOne({ where: { id, role: 'delivery_driver' } });
    
    if (!driver) {
      res.status(404).json({ success: false, error: 'السائق غير موجود' });
      return;
    }

    await driver.update({ isActive: !driver.isActive });

    res.json({
      success: true,
      message: driver.isActive ? 'تم تفعيل السائق' : 'تم تعطيل السائق',
      data: { isActive: driver.isActive }
    });
  } catch (error) {
    console.error('Error toggling driver:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تغيير حالة السائق' });
  }
};

export const deleteDriver = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const driver = await User.findOne({ where: { id, role: 'delivery_driver' } });
    
    if (!driver) {
      res.status(404).json({ success: false, error: 'السائق غير موجود' });
      return;
    }
    
    await driver.destroy();
    
    res.json({
      success: true,
      message: 'تم حذف السائق بنجاح'
    });
  } catch (error) {
    console.error('Error deleting driver:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف السائق' });
  }
};

// ==================== إدارة الخطط ====================

export const getAllPlans = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const plans = await Plan.findAll({
      order: [['price', 'ASC']]
    });
    
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الخطط' });
  }
};

export const createPlan = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const plan = await Plan.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء الخطة بنجاح',
      data: plan
    });
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الخطة' });
  }
};

export const updatePlan = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const plan = await Plan.findByPk(id);
    
    if (!plan) {
      res.status(404).json({ success: false, error: 'الخطة غير موجودة' });
      return;
    }
    
    await plan.update(req.body);
    
    res.json({
      success: true,
      message: 'تم تحديث الخطة بنجاح',
      data: plan
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الخطة' });
  }
};

export const deletePlan = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const plan = await Plan.findByPk(id);
    
    if (!plan) {
      res.status(404).json({ success: false, error: 'الخطة غير موجودة' });
      return;
    }
    
    await plan.destroy();
    
    res.json({
      success: true,
      message: 'تم حذف الخطة بنجاح'
    });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الخطة' });
  }
};

// ==================== إعدادات المنصة ====================

export const getPlatformSettings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const settings = await PlatformSetting.findAll({
      order: [['group', 'ASC'], ['key', 'ASC']]
    });

    const groupedSettings = settings.reduce((acc, setting) => {
      const group = setting.group;
      if (!acc[group]) acc[group] = [];
      acc[group].push(setting);
      return acc;
    }, {} as Record<string, any[]>);

    res.json({
      success: true,
      data: groupedSettings
    });
  } catch (error) {
    console.error('Error getting platform settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إعدادات المنصة' });
  }
};

export const updatePlatformSettings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { settings } = req.body;

    for (const [key, value] of Object.entries(settings)) {
      await PlatformSetting.update(
        { value: String(value) },
        { where: { key }, individualHooks: true }
      );
    }

    res.json({
      success: true,
      message: 'تم تحديث إعدادات المنصة بنجاح'
    });
  } catch (error) {
    console.error('Error updating platform settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الإعدادات' });
  }
};

// ==================== إحصائيات إضافية ====================

export const getRevenueStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const [todayRevenue, monthRevenue, totalRevenue] = await Promise.all([
      Order.sum('total', { where: { createdAt: { [Op.gte]: today } } }),
      Order.sum('total', { where: { createdAt: { [Op.gte]: thisMonth } } }),
      Order.sum('total')
    ]);
    
    res.json({
      success: true,
      data: {
        today: todayRevenue || 0,
        month: monthRevenue || 0,
        total: totalRevenue || 0
      }
    });
  } catch (error) {
    console.error('Error getting revenue stats:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إحصائيات الإيرادات' });
  }
};

export const getOrderStatsByPeriod = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { period } = req.params;
    let startDate: Date;
    
    switch (period) {
      case 'today':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
    }
    
    const orders = await Order.findAll({
      where: {
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('total')), 'revenue']
      ],
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']]
    });
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error getting order stats:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إحصائيات الطلبات' });
  }
};

// ==================== طلبات ترقية الخطط ====================






export const approveUpgrade = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const transaction = await sequelize.transaction();
  
  try {
    const { requestId } = req.params;
    const adminId = req.user?.id;

    const upgradeRequest = await UpgradeRequest.findByPk(requestId, { transaction });
    
    if (!upgradeRequest) {
      await transaction.rollback();
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }

    if (upgradeRequest.status !== 'pending') {
      await transaction.rollback();
      res.status(400).json({ success: false, error: 'تم معالجة هذا الطلب مسبقاً' });
      return;
    }

    // تحديث خطة المطعم أو المتجر
    if (upgradeRequest.restaurantId) {
      await Restaurant.update(
        { planId: upgradeRequest.requestedPlanId },
        { where: { id: upgradeRequest.restaurantId }, transaction, individualHooks: true }
      );
    } else if (upgradeRequest.storeId) {
      await Store.update(
        { planId: upgradeRequest.requestedPlanId },
        { where: { id: upgradeRequest.storeId }, transaction, individualHooks: true }
      );
    } else {
      const user = await User.findByPk(upgradeRequest.userId, { transaction });
      if (user?.restaurantId) {
        await Restaurant.update(
          { planId: upgradeRequest.requestedPlanId },
          { where: { id: user.restaurantId }, transaction, individualHooks: true }
        );
      } else if (user?.storeId) {
        await Store.update(
          { planId: upgradeRequest.requestedPlanId },
          { where: { id: user.storeId }, transaction, individualHooks: true }
        );
      } else {
        await transaction.rollback();
        res.status(400).json({ success: false, error: 'لم نتمكن من تحديد المطعم أو المتجر للتحديث' });
        return;
      }
    }

    // تحديث حالة الطلب
    await upgradeRequest.update({
      status: 'approved',
      reviewedBy: adminId,
      reviewedAt: new Date()
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'تمت الموافقة على الترقية بنجاح',
      data: upgradeRequest
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error approving upgrade:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في الموافقة على الطلب' });
  }
};

// ✅ رفض طلب الترقية
export const rejectUpgrade = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.id;

    const upgradeRequest = await UpgradeRequest.findByPk(requestId);
    
    if (!upgradeRequest) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }

    if (upgradeRequest.status !== 'pending') {
      res.status(400).json({ success: false, error: 'تم معالجة هذا الطلب مسبقاً' });
      return;
    }

    await upgradeRequest.update({
      status: 'rejected',
      notes: reason || null,
      reviewedBy: adminId,
      reviewedAt: new Date()
    });

    res.json({
      success: true,
      message: 'تم رفض طلب الترقية',
      data: upgradeRequest
    });
  } catch (error) {
    console.error('Error rejecting upgrade:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في رفض الطلب' });
  }
};


export const getUpgradeRequests = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // استورد نموذج UpgradeRequest
    const UpgradeRequest = (await import('../models/UpgradeRequest')).default;
    
    const requests = await UpgradeRequest.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Restaurant, as: 'restaurant', attributes: ['id', 'name'] },
        { model: Store, as: 'store', attributes: ['id', 'name'] },
        { model: Plan, as: 'currentPlan', attributes: ['id', 'name', 'price'] },
        { model: Plan, as: 'requestedPlan', attributes: ['id', 'name', 'price'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // تحويل البيانات إلى الشكل المطلوب في الواجهة
    const formattedRequests = requests.map(req => ({
      id: req.id,
      userId: req.userId,
      userName: (req as any).user?.name || '',
      userEmail: (req as any).user?.email || '',
      userPhone: (req as any).user?.phone || '',
      userWhatsapp: (req as any).user?.phone || '',
      planId: req.requestedPlanId,
      planName: (req as any).requestedPlan?.name || '',
      price: (req as any).requestedPlan?.price || 0,
      status: req.status,
      reason: req.notes,
      createdAt: req.createdAt,
      approvedAt: req.reviewedAt
    }));

    res.json({
      success: true,
      data: formattedRequests
    });
  } catch (error) {
    console.error('Error fetching upgrade requests:', error);
    // إذا كان الجدول غير موجود، نرجع مصفوفة فارغة
    res.json({ success: true, data: [] });
  }
};

export const getUserUpgradeRequests = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const UpgradeRequest = (await import('../models/UpgradeRequest')).default;
    
    const requests = await UpgradeRequest.findAll({
      where: { userId: req.user?.id },
      include: [
        { model: Plan, as: 'currentPlan', attributes: ['id', 'name', 'price'] },
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
      reason: req.notes,
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

// controllers/adminController.ts - أصلح دالة createUpgradeRequest

export const createUpgradeRequest = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { planId, entityType = 'restaurant', entityId, notes } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }

    // استيراد النماذج
    const UpgradeRequest = (await import('../models/UpgradeRequest')).default;
    const Plan = (await import('../models/Plan')).default;

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



// backend/src/controllers/adminController.ts

export const updateRestaurant = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      slug,           // ✅ أضف slug
      email,
      phone,
      whatsapp,
      address,
      description,
      logo,
      coverImage,
      primaryColor,
      secondaryColor,
      backgroundColor,
      textColor,
      fontFamily,
      isActive,
      planId,
      deliverySettings,
      metaTitle,
      metaDescription
    } = req.body;
    
    console.log('📝 Updating restaurant:', { id, slug, name });
    
    const restaurant = await Restaurant.findByPk(id);
    
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }
    
    const updateData: any = {};
    
    // ✅ تحديث slug إذا تم إرساله
    if (slug !== undefined && slug !== restaurant.slug) {
      // التحقق من أن slug الجديد غير مستخدم من قبل مطعم آخر
      const existingRestaurant = await Restaurant.findOne({ 
        where: { 
          slug: slug,
          id: { [Op.ne]: id } 
        } 
      });
      
      if (existingRestaurant) {
        res.status(400).json({ 
          success: false, 
          error: 'الرابط مستخدم بالفعل، يرجى اختيار رابط آخر' 
        });
        return;
      }
      updateData.slug = slug;
    }
    
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
    if (address !== undefined) updateData.address = address;
    if (description !== undefined) updateData.description = description;
    if (logo !== undefined) updateData.logo = logo;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (backgroundColor !== undefined) updateData.backgroundColor = backgroundColor;
    if (textColor !== undefined) updateData.textColor = textColor;
    if (fontFamily !== undefined) updateData.fontFamily = fontFamily;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (planId !== undefined) updateData.planId = planId;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
    
    // معالجة deliverySettings
    if (deliverySettings !== undefined) {
      if (typeof deliverySettings === 'object' && deliverySettings !== null) {
        updateData.deliverySettings = JSON.stringify(deliverySettings);
      } else if (typeof deliverySettings === 'string') {
        updateData.deliverySettings = deliverySettings;
      }
    }
    
    console.log('📝 Update data:', updateData);
    
    await restaurant.update(updateData);
    
    const updatedRestaurant = await Restaurant.findByPk(id, {
      include: [{ model: Plan, as: 'plan' }]
    });
    
    res.json({
      success: true,
      message: 'تم تحديث المطعم بنجاح',
      data: updatedRestaurant
    });
  } catch (error) {
    console.error('Error updating restaurant:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث المطعم' });
  }
};







// backend/src/controllers/adminController.ts

export const checkSlugAvailability = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { slug, type, id } = req.query;
    
    if (!slug || typeof slug !== 'string') {
      res.status(400).json({ success: false, error: 'الرابط مطلوب' });
      return;
    }

    let where: any = { slug };
    
    // استبعاد العنصر الحالي إذا كان موجوداً
    if (id && typeof id === 'string') {
      where.id = { [Op.ne]: id };
    }

    let exists = false;
    
    if (type === 'restaurant') {
      const restaurant = await Restaurant.findOne({ where });
      exists = !!restaurant;
    } else if (type === 'store') {
      const store = await Store.findOne({ where });
      exists = !!store;
    } else {
      // إذا لم يحدد النوع، نتحقق من كليهما
      const restaurantExists = await Restaurant.findOne({ where });
      const storeExists = await Store.findOne({ where });
      exists = !!(restaurantExists || storeExists);
    }

    res.json({
      success: true,
      available: !exists,
      slug: slug
    });
  } catch (error) {
    console.error('Error checking slug:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في التحقق من الرابط' });
  }
};


// controllers/adminController.ts - أصلح هذه الدوال

// ==================== إعادة تعيين كلمة مرور المستخدم ====================

export const resetUserPassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      res.status(400).json({ 
        success: false, 
        error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' 
      });
      return;
    }

    const user = await User.findByPk(id);
    
    if (!user) {
      res.status(404).json({ 
        success: false, 
        error: 'المستخدم غير موجود' 
      });
      return;
    }

    // لا يمكن تغيير كلمة مرور السوبر أدمن
    if (user.role === 'super_admin') {
      res.status(403).json({ 
        success: false, 
        error: 'لا يمكن تغيير كلمة مرور المدير الأساسي' 
      });
      return;
    }

    // تحديث كلمة المرور (سيتم تشفيرها تلقائياً عبر hook beforeUpdate)
    await user.update({ password });

    res.json({
      success: true,
      message: 'تم إعادة تعيين كلمة المرور بنجاح'
    });
  } catch (error) {
    console.error('Error resetting user password:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في إعادة تعيين كلمة المرور' 
    });
  }
};

// ==================== إعادة تعيين كلمة مرور المطعم ====================

export const resetRestaurantPassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      res.status(400).json({ 
        success: false, 
        error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' 
      });
      return;
    }

    // التحقق من وجود المطعم
    const restaurant = await Restaurant.findByPk(id);
    
    if (!restaurant) {
      res.status(404).json({ 
        success: false, 
        error: 'المطعم غير موجود' 
      });
      return;
    }

    // البحث عن مالك المطعم (owner)
    const owner = await User.findOne({
      where: { 
        restaurantId: id, 
        role: 'owner' 
      }
    });

    if (!owner) {
      res.status(404).json({ 
        success: false, 
        error: 'مالك المطعم غير موجود' 
      });
      return;
    }

    // تحديث كلمة المرور
    await owner.update({ password });

    res.json({
      success: true,
      message: 'تم إعادة تعيين كلمة مرور المطعم بنجاح'
    });
  } catch (error) {
    console.error('Error resetting restaurant password:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في إعادة تعيين كلمة المرور' 
    });
  }
};

// ==================== إعادة تعيين كلمة مرور المتجر ====================

export const resetStorePassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      res.status(400).json({ 
        success: false, 
        error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' 
      });
      return;
    }

    // التحقق من وجود المتجر
    const store = await Store.findByPk(id);
    
    if (!store) {
      res.status(404).json({ 
        success: false, 
        error: 'المتجر غير موجود' 
      });
      return;
    }

    // البحث عن مالك المتجر (owner)
    const owner = await User.findOne({
      where: { 
        storeId: id, 
        role: 'owner' 
      }
    });

    if (!owner) {
      res.status(404).json({ 
        success: false, 
        error: 'مالك المتجر غير موجود' 
      });
      return;
    }

    // تحديث كلمة المرور
    await owner.update({ password });

    res.json({
      success: true,
      message: 'تم إعادة تعيين كلمة مرور المتجر بنجاح'
    });
  } catch (error) {
    console.error('Error resetting store password:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في إعادة تعيين كلمة المرور' 
    });
  }
};




// ==================== إدارة المتاجر (تفاصيل وتحديث) ====================

// ==================== إدارة المتاجر ====================

// backend/src/controllers/adminController.ts

// ==================== إدارة المتاجر ====================

export const getStoreDetails = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    console.log('🔍 Fetching store details for ID:', id);
    
    // التحقق من صحة الـ UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير صالح' });
      return;
    }
    
    const store = await Store.findByPk(id, {
      include: [
        { 
          model: User, 
          as: 'storeOwner', 
          attributes: ['id', 'name', 'email', 'phone', 'isActive', 'createdAt'] 
        },
        { 
          model: Plan, 
          as: 'plan', 
          attributes: ['id', 'name', 'price', 'maxProducts', 'maxOrdersPerMonth'] 
        }
      ]
    });
    
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    // جلب إحصائيات إضافية
    const [productsCount, ordersCount, totalSales] = await Promise.all([
      Product.count({ where: { storeId: store.id } }),
      Order.count({ where: { storeId: store.id } }),
      Order.sum('total', { where: { storeId: store.id, status: 'delivered' } })
    ]);
    
    const storeData = store.toJSON();
    
    res.json({
      success: true,
      data: {
        ...storeData,
        stats: {
          productsCount: productsCount || 0,
          ordersCount: ordersCount || 0,
          totalSales: totalSales || 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting store details:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في جلب تفاصيل المتجر' 
    });
  }
};

export const getAllStores = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const where: any = {};
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const { count, rows } = await Store.findAndCountAll({
      where,
      include: [
        { 
          model: User, 
          as: 'storeOwner', 
          attributes: ['id', 'name', 'email', 'phone'] 
        },
        { 
          model: Plan, 
          as: 'plan', 
          attributes: ['id', 'name', 'price'] 
        }
      ],
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
      distinct: true
    });
    
    // جلب إحصائيات لكل متجر
    const storesWithStats = await Promise.all(rows.map(async (store) => {
      const productsCount = await Product.count({ where: { storeId: store.id } });
      const ordersCount = await Order.count({ where: { storeId: store.id } });
      
      return {
        ...store.toJSON(),
        productsCount,
        ordersCount
      };
    }));
    
    res.json({
      success: true,
      data: {
        stores: storesWithStats,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(count / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting stores:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المتاجر' });
  }
};


export const updateStore = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      subdomain,  // ✅ أضف subdomain
      email,
      phone,
      whatsapp,
      address,
      description,
      latitude,
      longitude,
      primaryColor,
      secondaryColor,
      isActive,
      planId,
      settings
    } = req.body;
    
    console.log('📝 Updating store (Admin):', { id, slug, name, subdomain });
    
    const store = await Store.findByPk(id);
    
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    const updateData: any = {};
    
    // ✅ تحديث subdomain إذا تم إرساله
    if (subdomain !== undefined && subdomain !== store.subdomain) {
      const uniqueSubdomain = await generateUniqueStoreSubdomain(subdomain, id);
      updateData.subdomain = uniqueSubdomain;
    }
    
    // ✅ تحديث slug إذا تم إرساله
    if (slug !== undefined && slug !== store.slug) {
      const existingStore = await Store.findOne({ 
        where: { 
          slug: slug,
          id: { [Op.ne]: id } 
        } 
      });
      
      if (existingStore) {
        res.status(400).json({ 
          success: false, 
          error: 'الرابط مستخدم بالفعل، يرجى اختيار رابط آخر' 
        });
        return;
      }
      updateData.slug = slug;
    }
    
    // باقي الحقول
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
    if (address !== undefined) updateData.address = address;
    if (description !== undefined) updateData.description = description;
    if (latitude !== undefined) updateData.latitude = latitude ? parseFloat(latitude) : null;
    if (longitude !== undefined) updateData.longitude = longitude ? parseFloat(longitude) : null;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (planId !== undefined) updateData.planId = planId;
    if (settings !== undefined) updateData.settings = settings;
    
    await store.update(updateData);
    
    const updatedStore = await Store.findByPk(id, {
      include: [
        { model: User, as: 'storeOwner', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Plan, as: 'plan' }
      ]
    });
    
    res.json({
      success: true,
      message: 'تم تحديث المتجر بنجاح',
      data: updatedStore
    });
  } catch (error) {
    console.error('Error updating store:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث المتجر' });
  }
};

export const toggleStoreStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const store = await Store.findByPk(id);
    
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    await store.update({ isActive: !store.isActive });
    
    res.json({
      success: true,
      message: store.isActive ? 'تم تفعيل المتجر' : 'تم تعطيل المتجر',
      data: { isActive: store.isActive }
    });
  } catch (error) {
    console.error('Error toggling store status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تغيير حالة المتجر' });
  }
};

export const deleteStore = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const store = await Store.findByPk(id);
    
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    // حذف المالك أولاً
    await User.destroy({ where: { storeId: id }, individualHooks: true });
    // ثم حذف المتجر
    await store.destroy();
    
    res.json({
      success: true,
      message: 'تم حذف المتجر بنجاح'
    });
  } catch (error) {
    console.error('Error deleting store:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف المتجر' });
  }
};




