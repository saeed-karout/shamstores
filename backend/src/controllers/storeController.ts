// controllers/storeController.ts

import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import Store from '../models/Store';
import User from '../models/User';
import Plan from '../models/Plan';
import Product from '../models/Product';
import Order from '../models/Order';
import OrderItem from '../models/OrderItem';
import MenuItem from '../models/MenuItem';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';

import Coupon from '../models/Coupon';

import { ProductCategory, sequelize } from '../models';
import cloudflareImagesService from '../services/cloudflareImagesService';
import fs from 'fs';
import path from 'path';

const deleteLegacyLocalImage = (imagePath?: string): void => {
  if (!imagePath || /^https?:\/\//i.test(imagePath)) {
    return;
  }

  const cleanPath = imagePath.replace(/^\/+|\/+$/g, '').replace(/^uploads[\\\/]/, '');
  const fullPath = path.join(process.cwd(), 'uploads', cleanPath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

// ==================== رفع الصور ====================

export const uploadStoreLogo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    // ✅ التحقق من وجود الملف
    if (!req.file) {
      res.status(400).json({ success: false, error: 'لم يتم رفع أي ملف. يرجى اختيار صورة' });
      return;
    }
    
    console.log('📸 Uploading logo for store:', storeId);
    console.log('📁 File info:', {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
    
    const store = await Store.findByPk(storeId);
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    if (store.logo) {
      try {
        await cloudflareImagesService.deleteImageByUrl(store.logo);
      } catch (deleteError) {
        console.error('Failed to delete old store logo from Cloudflare:', deleteError);
        deleteLegacyLocalImage(store.logo);
      }
    }
    
    const uploadedImage = await cloudflareImagesService.uploadImage(req.file, {
      type: 'stores',
      id: storeId,
      subType: 'logo',
      uploaderId: req.user?.id
    });

    await store.update({ logo: uploadedImage.url });
    
    res.json({
      success: true,
      message: 'تم رفع الشعار بنجاح',
      data: { logoUrl: uploadedImage.url }
    });
  } catch (error) {
    console.error('Error uploading store logo:', error);

    res.status(500).json({ success: false, error: 'حدث خطأ في رفع الشعار' });
  }
};

export const uploadStoreCover = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    if (!req.file) {
      res.status(400).json({ success: false, error: 'لم يتم رفع أي ملف. يرجى اختيار صورة' });
      return;
    }
    
    console.log('📸 Uploading cover for store:', storeId);
    console.log('📁 File info:', {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
    
    const store = await Store.findByPk(storeId);
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    if (store.coverImage) {
      try {
        await cloudflareImagesService.deleteImageByUrl(store.coverImage);
      } catch (deleteError) {
        console.error('Failed to delete old store cover from Cloudflare:', deleteError);
        deleteLegacyLocalImage(store.coverImage);
      }
    }
    
    const uploadedImage = await cloudflareImagesService.uploadImage(req.file, {
      type: 'stores',
      id: storeId,
      subType: 'cover',
      uploaderId: req.user?.id
    });

    await store.update({ coverImage: uploadedImage.url });
    
    res.json({
      success: true,
      message: 'تم رفع صورة الغلاف بنجاح',
      data: { coverUrl: uploadedImage.url }
    });
  } catch (error) {
    console.error('Error uploading store cover:', error);

    res.status(500).json({ success: false, error: 'حدث خطأ في رفع صورة الغلاف' });
  }
};

// ==================== دوال الكوبونات ====================

export const getStoreCoupons = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const coupons = await Coupon.findAll({
      where: { storeId },
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ success: true, data: coupons });
  } catch (error) {
    console.error('Error getting store coupons:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الكوبونات' });
  }
};


export const createStoreCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const {
      code, description, discountType, discountValue,
      minOrder, usageLimit, startDate, endDate, isStoreOnly
    } = req.body;
    
    // التحقق من وجود الكود
    const existingCoupon = await Coupon.findOne({
      where: { code: code.toUpperCase(), storeId }
    });
    
    if (existingCoupon) {
      res.status(400).json({ success: false, error: 'هذا الكود موجود بالفعل' });
      return;
    }
    
    const coupon = await Coupon.create({
      storeId,
      code: code.toUpperCase(),
      description: description || null,
      discountType: discountType || 'percentage',
      discountValue: discountValue || 0,
      minOrder: minOrder || 0,
      usageLimit: usageLimit || 1,
      usedCount: 0,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: true,
      isRestaurantOnly: false,           // ✅ للمتاجر دائماً false
      isStoreOnly: isStoreOnly || false  // ✅ استخدام الحقل الجديد
    } as any);
    
    res.status(201).json({ success: true, message: 'تم إنشاء الكوبون بنجاح', data: coupon });
  } catch (error) {
    console.error('Error creating store coupon:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الكوبون' });
  }
};

export const updateStoreCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const coupon = await Coupon.findOne({
      where: { id, storeId }
    });
    
    if (!coupon) {
      res.status(404).json({ success: false, error: 'الكوبون غير موجود' });
      return;
    }
    
    const {
      code, description, discountType, discountValue,
      minOrder, usageLimit, startDate, endDate, isStoreOnly, isActive
    } = req.body;
    
    await coupon.update({
      code: code ? code.toUpperCase() : coupon.code,
      description: description !== undefined ? description : coupon.description,
      discountType: discountType || coupon.discountType,
      discountValue: discountValue || coupon.discountValue,
      minOrder: minOrder !== undefined ? minOrder : coupon.minOrder,
      usageLimit: usageLimit || coupon.usageLimit,
      startDate: startDate ? new Date(startDate) : coupon.startDate,
      endDate: endDate ? new Date(endDate) : coupon.endDate,
      isActive: isActive !== undefined ? isActive : coupon.isActive,
      isStoreOnly: isStoreOnly !== undefined ? isStoreOnly : coupon.isStoreOnly
    });
    
    res.json({ success: true, message: 'تم تحديث الكوبون بنجاح', data: coupon });
  } catch (error) {
    console.error('Error updating store coupon:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الكوبون' });
  }
};


export const toggleProductAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    const { isAvailable } = req.body;
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const product = await Product.findOne({ 
      where: { id, storeId } 
    });
    
    if (!product) {
      res.status(404).json({ success: false, error: 'المنتج غير موجود' });
      return;
    }
    
    await product.update({ isAvailable: isAvailable !== undefined ? isAvailable : !product.isAvailable });
    
    res.json({ 
      success: true, 
      message: product.isAvailable ? 'تم تفعيل المنتج' : 'تم تعطيل المنتج',
      data: { isAvailable: product.isAvailable }
    });
  } catch (error) {
    console.error('Error toggling product availability:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تغيير حالة المنتج' });
  }
};


export const deleteStoreCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const coupon = await Coupon.findOne({
      where: { id, storeId }
    });
    
    if (!coupon) {
      res.status(404).json({ success: false, error: 'الكوبون غير موجود' });
      return;
    }
    
    await coupon.destroy();
    
    res.json({ success: true, message: 'تم حذف الكوبون بنجاح' });
  } catch (error) {
    console.error('Error deleting store coupon:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الكوبون' });
  }
};

// ==================== المنتجات الأكثر مبيعاً ====================

export const getTopProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { limit = 5, period = 'week' } = req.query;
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    // تحديد الفترة الزمنية
    let startDate: Date;
    const now = new Date();
    
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
        startDate.setDate(startDate.getDate() - 7);
    }
    
    // جلب عناصر الطلبات للمتجر
    const orderItems = await OrderItem.findAll({
      where: {
        createdAt: { [Op.gte]: startDate }
      },
      include: [
        {
          model: Order,
          as: 'order',
          where: { storeId, status: 'delivered' },
          required: true,
          attributes: []
        },
        {
          model: Product,
          as: 'product',
          where: { storeId },
          required: true,
          attributes: ['id', 'name', 'nameEn', 'price']
        }
      ],
      attributes: [
        'productId',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
        [sequelize.fn('SUM', sequelize.literal('quantity * price')), 'totalRevenue']
      ],
      group: ['productId', 'product.id'],
      order: [[sequelize.literal('totalQuantity'), 'DESC']],
      limit: Number(limit)
    });
    
    // تنسيق النتائج
    const topProducts = orderItems.map(item => {
      const product = (item as any).product;
      return {
        id: item.productId,
        name: product?.name || 'غير معروف',
        nameEn: product?.nameEn || '',
        count: parseInt((item as any).dataValues.totalQuantity) || 0,
        total: parseFloat((item as any).dataValues.totalRevenue) || 0
      };
    });
    
    res.json({ success: true, data: topProducts });
  } catch (error) {
    console.error('Error getting top products:', error);
    // إذا فشل الاستعلام المعقد، نعيد مصفوفة فارغة
    res.json({ success: true, data: [] });
  }
};




// ==================== ملف المتجر ====================

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const store = await Store.findByPk(storeId, {
      include: [{ model: Plan, as: 'plan' }]
    });
    
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    res.json({ success: true, data: store });
  } catch (error) {
    console.error('Error getting store profile:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب بيانات المتجر' });
  }
};


export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const store = await Store.findByPk(storeId);
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    const { 
      name, email, phone, address, description, 
      logo, coverImage, primaryColor, secondaryColor, 
      isActive, settings 
    } = req.body;
    
    // ❌ لا نسمح بتعديل slug من هنا
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (description !== undefined) updateData.description = description;
    if (logo !== undefined) updateData.logo = logo;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (settings !== undefined) updateData.settings = settings;
    
    // ❌ slug لا يتم تحديثه هنا أبداً
    
    await store.update(updateData);
    
    const updatedStore = await Store.findByPk(store.id, {
      include: [{ model: Plan, as: 'plan' }]
    });
    
    res.json({ 
      success: true, 
      message: 'تم تحديث المتجر بنجاح', 
      data: updatedStore 
    });
  } catch (error) {
    console.error('Error updating store profile:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث المتجر' });
  }
};

// ==================== المنتجات ====================

export const getProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const products = await Product.findAll({
      where: { storeId },
      order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']]
    });
    
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المنتجات' });
  }
};

export const getProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const product = await Product.findOne({ 
      where: { id, storeId } 
    });
    
    if (!product) {
      res.status(404).json({ success: false, error: 'المنتج غير موجود' });
      return;
    }
    
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المنتج' });
  }
};


export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const { 
      name, nameEn, description, descriptionEn, 
      price, discountedPrice, imageUrl, stock, sku,  // ✅ imageUrl
      categoryId, isAvailable, sortOrder 
    } = req.body;
    
    if (!name) {
      res.status(400).json({ success: false, error: 'اسم المنتج مطلوب' });
      return;
    }
    
    if (!price || price <= 0) {
      res.status(400).json({ success: false, error: 'سعر المنتج مطلوب ويجب أن يكون أكبر من 0' });
      return;
    }
    
    const product = await Product.create({
      storeId,
      name,
      nameEn: nameEn || null,
      description: description || null,
      descriptionEn: descriptionEn || null,
      price,
      discountedPrice: discountedPrice || null,
      imageUrl: imageUrl || null,  // ✅ imageUrl
      stock: stock || 0,
      sku: sku || null,
      categoryId: categoryId || null,
      isAvailable: isAvailable !== false,
      sortOrder: sortOrder || 0
    } as any);
    
    res.status(201).json({ 
      success: true, 
      message: 'تم إنشاء المنتج بنجاح', 
      data: product 
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء المنتج' });
  }
};


export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const product = await Product.findOne({ 
      where: { id, storeId } 
    });
    
    if (!product) {
      res.status(404).json({ success: false, error: 'المنتج غير موجود' });
      return;
    }
    
    const { 
      name, nameEn, description, descriptionEn, 
      price, discountedPrice, imageUrl, stock, sku, 
      categoryId, isAvailable, sortOrder 
    } = req.body;
    
    // تحديث فقط الحقول المرسلة (لـ PATCH)
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (nameEn !== undefined) updateData.nameEn = nameEn;
    if (description !== undefined) updateData.description = description;
    if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn;
    if (price !== undefined) updateData.price = price;
    if (discountedPrice !== undefined) updateData.discountedPrice = discountedPrice;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (stock !== undefined) updateData.stock = stock;
    if (sku !== undefined) updateData.sku = sku;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    
    await product.update(updateData);
    
    res.json({ 
      success: true, 
      message: 'تم تحديث المنتج بنجاح', 
      data: product 
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث المنتج' });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const product = await Product.findOne({ 
      where: { id, storeId } 
    });
    
    if (!product) {
      res.status(404).json({ success: false, error: 'المنتج غير موجود' });
      return;
    }
    
    await product.destroy();
    
    res.json({ 
      success: true, 
      message: 'تم حذف المنتج بنجاح' 
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف المنتج' });
  }
};

// ==================== المخزون ====================

export const getInventoryStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const products = await Product.findAll({ 
      where: { storeId } 
    });
    
    const lowStockThreshold = 10;
    const lowStock = products.filter(p => p.stock <= lowStockThreshold && p.stock > 0).length;
    const outOfStock = products.filter(p => p.stock === 0).length;
    const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const totalValue = products.reduce((sum, p) => sum + ((Number(p.price) || 0) * (p.stock || 0)), 0);
    
    res.json({
      success: true,
      data: {
        totalProducts: products.length,
        lowStock,
        outOfStock,
        totalStock,
        totalValue,
        lowStockThreshold
      }
    });
  } catch (error) {
    console.error('Error getting inventory stats:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إحصائيات المخزون' });
  }
};

export const updateInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { productId } = req.params;
    const { quantity, type = 'set' } = req.body;
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    if (quantity === undefined || quantity < 0) {
      res.status(400).json({ success: false, error: 'الكمية مطلوبة ويجب أن تكون أكبر من أو تساوي 0' });
      return;
    }
    
    const product = await Product.findOne({ 
      where: { id: productId, storeId } 
    });
    
    if (!product) {
      res.status(404).json({ success: false, error: 'المنتج غير موجود' });
      return;
    }
    
    let newStock = product.stock;
    let oldStock = product.stock;
    
    switch (type) {
      case 'add':
        newStock = product.stock + quantity;
        break;
      case 'subtract':
        newStock = Math.max(0, product.stock - quantity);
        break;
      case 'set':
        newStock = quantity;
        break;
      default:
        newStock = quantity;
    }
    
    await product.update({ stock: newStock });
    
    res.json({ 
      success: true, 
      message: 'تم تحديث المخزون بنجاح', 
      data: { 
        productId: product.id,
        productName: product.name,
        oldStock,
        newStock,
        change: newStock - oldStock
      } 
    });
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث المخزون' });
  }
};

// ==================== طلبات المتجر ====================


export const getStoreOrders = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const { status, limit = 50, page = 1 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const where: any = { storeId };
    if (status && status !== 'all') where.status = status;
    
    const { count, rows: orders } = await Order.findAndCountAll({
      where,
      include: [
        { 
          model: OrderItem, 
          as: 'orderItems',
          include: [
            { model: Product, as: 'product' }
          ]
        },
        { 
          model: User, 
          as: 'creator', 
          attributes: ['id', 'name', 'email', 'phone'] 
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset
    });
    
    res.json({ 
      success: true, 
      data: orders
    });
  } catch (error) {
    console.error('Error getting store orders:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الطلبات' });
  }
};
export const getStoreOrderStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalOrders = await Order.count({ where: { storeId } });
    const todayOrders = await Order.count({ where: { storeId, createdAt: { [Op.gte]: today } } });
    const pendingOrders = await Order.count({ where: { storeId, status: 'pending' } });
    const totalSales = await Order.sum('total', { where: { storeId, status: 'delivered' } });
    const todaySales = await Order.sum('total', { where: { storeId, createdAt: { [Op.gte]: today }, status: 'delivered' } });
    
    res.json({
      success: true,
      data: {
        totalOrders: totalOrders || 0,
        todayOrders: todayOrders || 0,
        pendingOrders: pendingOrders || 0,
        totalSales: totalSales || 0,
        todaySales: todaySales || 0
      }
    });
  } catch (error) {
    console.error('Error getting store order stats:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إحصائيات الطلبات' });
  }
};

// ==================== سائقين المتجر ====================

export const getStoreDrivers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const drivers = await User.findAll({
      where: { storeId, role: 'delivery_driver' },
      attributes: { exclude: ['password'] },
      order: [['name', 'ASC']]
    });
    
    res.json({ success: true, data: drivers });
  } catch (error) {
    console.error('Error getting store drivers:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب السائقين' });
  }
};

export const createStoreDriver = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const { name, email, password, phone } = req.body;
    
    if (!name || !email || !password) {
      res.status(400).json({ success: false, error: 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة' });
      return;
    }
    
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ success: false, error: 'البريد الإلكتروني موجود بالفعل' });
      return;
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const driver = await User.create({
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
      role: 'delivery_driver',
      storeId,
      isActive: true
    } as any);
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء السائق بنجاح',
      data: { 
        id: driver.id, 
        name: driver.name, 
        email: driver.email, 
        phone: driver.phone,
        role: driver.role,
        isActive: driver.isActive
      }
    });
  } catch (error) {
    console.error('Error creating store driver:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء السائق' });
  }
};



// controllers/storeController.ts - أضف هذه الدوال في نهاية الملف

// ==================== إدارة الفئات ====================

export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const categories = await ProductCategory.findAll({
      where: { storeId, isActive: true },
      order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']]
    });
    
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الفئات' });
  }
};

export const getCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const category = await ProductCategory.findOne({
      where: { id, storeId }
    });
    
    if (!category) {
      res.status(404).json({ success: false, error: 'الفئة غير موجودة' });
      return;
    }
    
    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Error getting category:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الفئة' });
  }
};

export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const { name, nameEn, description, descriptionEn, image, sortOrder } = req.body;
    
    if (!name) {
      res.status(400).json({ success: false, error: 'اسم الفئة مطلوب' });
      return;
    }
    
    const category = await ProductCategory.create({
      storeId,
      name,
      nameEn: nameEn || null,
      description: description || null,
      descriptionEn: descriptionEn || null,
      image: image || null,
      sortOrder: sortOrder || 0,
      isActive: true
    } as any);
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء الفئة بنجاح',
      data: category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الفئة' });
  }
};

export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const category = await ProductCategory.findOne({
      where: { id, storeId }
    });
    
    if (!category) {
      res.status(404).json({ success: false, error: 'الفئة غير موجودة' });
      return;
    }
    
    const { name, nameEn, description, descriptionEn, image, sortOrder, isActive } = req.body;
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (nameEn !== undefined) updateData.nameEn = nameEn;
    if (description !== undefined) updateData.description = description;
    if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn;
    if (image !== undefined) updateData.image = image;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    await category.update(updateData);
    
    res.json({
      success: true,
      message: 'تم تحديث الفئة بنجاح',
      data: category
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الفئة' });
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const category = await ProductCategory.findOne({
      where: { id, storeId }
    });
    
    if (!category) {
      res.status(404).json({ success: false, error: 'الفئة غير موجودة' });
      return;
    }
    
    // التحقق من وجود منتجات في هذه الفئة
    const productsCount = await Product.count({ where: { categoryId: id, storeId } });
    if (productsCount > 0) {
      res.status(400).json({ 
        success: false, 
        error: `لا يمكن حذف الفئة لأنها تحتوي على ${productsCount} منتج. قم بنقل المنتجات أولاً.` 
      });
      return;
    }
    
    await category.destroy();
    
    res.json({
      success: true,
      message: 'تم حذف الفئة بنجاح'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الفئة' });
  }
};

// ==================== إدارة موظفي المتجر ====================

export const getStoreStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const staff = await User.findAll({
      where: { storeId, role: 'staff' },
      attributes: { exclude: ['password'] },
      order: [['name', 'ASC']]
    });
    
    res.json({ success: true, data: staff });
  } catch (error) {
    console.error('Error getting store staff:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الموظفين' });
  }
};

export const getStoreStaffDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { staffId } = req.params;
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const staff = await User.findOne({
      where: { id: staffId, storeId, role: 'staff' },
      attributes: { exclude: ['password'] }
    });
    
    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }
    
    res.json({ success: true, data: staff });
  } catch (error) {
    console.error('Error getting staff details:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب بيانات الموظف' });
  }
};

export const updateStoreStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { staffId } = req.params;
    const { name, email, phone, password } = req.body;
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const staff = await User.findOne({
      where: { id: staffId, storeId, role: 'staff' }
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
    
    res.json({
      success: true,
      message: 'تم تحديث بيانات الموظف بنجاح',
      data: { id: staff.id, name: staff.name, email: staff.email, phone: staff.phone }
    });
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث بيانات الموظف' });
  }
};

export const toggleStoreStaffStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { staffId } = req.params;
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const staff = await User.findOne({
      where: { id: staffId, storeId, role: 'staff' }
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

export const deleteStoreStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { staffId } = req.params;
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const staff = await User.findOne({
      where: { id: staffId, storeId, role: 'staff' }
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

export const updateStoreStaffPermissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { staffId } = req.params;
    const { permissions } = req.body;
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const staff = await User.findOne({
      where: { id: staffId, storeId, role: 'staff' }
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


// ==================== إعدادات المتجر ====================

// backend/src/controllers/storeController.ts

// دالة مساعدة محدثة للحصول على storeId (تدعم من URL أو من المستخدم)
const getStoreId = async (req: AuthRequest): Promise<string | null> => {
  try {
    // ✅ أولاً: جلب من params إذا وجد
    const storeIdFromParams = req.params.storeId;
    if (storeIdFromParams) {
      // إذا كان المستخدم سوبر أدمن، يسمح بالوصول لأي متجر
      if (req.user?.role === 'super_admin') {
        return storeIdFromParams;
      }
      // إذا كان مالك المتجر، تأكد أن المتجر يخصه
      if (req.user?.storeId === storeIdFromParams) {
        return storeIdFromParams;
      }
      // إذا كان موظف، تأكد أن المتجر يخص مؤسسته
      if (req.user?.role === 'staff' && req.user?.storeId === storeIdFromParams) {
        return storeIdFromParams;
      }
    }
    
    // ✅ ثانياً: من query أو body (للسوبر أدمن)
    if (req.user?.role === 'super_admin') {
      const targetStoreId = req.query.storeId as string || req.body.storeId;
      if (targetStoreId) return targetStoreId;
      const stores = await Store.findAll({ limit: 1 });
      return stores.length > 0 ? stores[0].id : null;
    }
    
    // ✅ ثالثاً: من المستخدم الحالي
    return req.user?.storeId || null;
  } catch (error) {
    console.error('Error in getStoreId:', error);
    return null;
  }
};
// backend/src/controllers/storeController.ts

// backend/src/controllers/storeController.ts

// ==================== جلب طلب محدد للمتجر ====================

export const getStoreOrderById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const order = await Order.findOne({
      where: { 
        id,
        storeId 
      },
      include: [
        { 
          model: OrderItem, 
          as: 'orderItems',
          include: [
            { model: Product, as: 'product' }
          ]
        },
        { 
          model: User, 
          as: 'creator', 
          attributes: ['id', 'name', 'email', 'phone'] 
        }
      ]
    });
    
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }
    
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error getting store order by id:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الطلب' });
  }
};

// ==================== تحديث حالة طلب المتجر ====================

export const updateStoreOrderStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    const { status } = req.body;
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const order = await Order.findOne({
      where: { 
        id,
        storeId 
      }
    });
    
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }
    
    // التحقق من صحة الحالة
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, error: 'حالة غير صالحة' });
      return;
    }
    
    await order.update({ status });
    
    res.json({
      success: true,
      message: 'تم تحديث حالة الطلب بنجاح',
      data: { status: order.status }
    });
  } catch (error) {
    console.error('Error updating store order status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث حالة الطلب' });
  }
};
export const getStoreSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const store = await Store.findByPk(storeId);
    
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    console.log('📖 Retrieved store settings:', {
      timezone: (store as any).timezone,
      currency: (store as any).currency,
      language: (store as any).language
    });
    
    // ✅ إضافة headers لمنع التخزين المؤقت
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const settings = {
      general: {
        name: store.name,
        email: store.email,
        phone: store.phone,
        whatsapp: (store as any).whatsapp || '',
        address: store.address,
        description: store.description,
        latitude: store.latitude ? store.latitude.toString() : '',
        longitude: store.longitude ? store.longitude.toString() : '',
        timezone: (store as any).timezone || 'Asia/Riyadh',  // ✅ استخدام القيمة المحفوظة
        currency: (store as any).currency || 'SAR',          // ✅ استخدام القيمة المحفوظة
        language: (store as any).language || 'ar'            // ✅ استخدام القيمة المحفوظة
      },
      design: {
        primaryColor: store.primaryColor,
        secondaryColor: store.secondaryColor,
        backgroundColor: (store as any).backgroundColor || '#FFFFFF',
        textColor: (store as any).textColor || '#000000',
        fontFamily: (store as any).fontFamily || 'Cairo',
        buttonStyle: (store as any).buttonStyle || 'rounded',
        cardStyle: (store as any).cardStyle || 'shadow'
      },
      delivery: {
        enableDelivery: (store as any).deliveryEnabled !== undefined ? (store as any).deliveryEnabled : true,
        baseFee: (store as any).deliveryBaseFee || 5,
        feePerKm: (store as any).deliveryFeePerKm || 2,
        minDistance: (store as any).deliveryMinDistance || 1,
        maxDistance: (store as any).deliveryMaxDistance || 20,
        freeDeliveryAbove: (store as any).deliveryFreeAbove || 100,
        estimatedTime: (store as any).deliveryEstimatedTime || 45,
        cashOnDelivery: (store as any).cashOnDelivery !== undefined ? (store as any).cashOnDelivery : true,
        onlinePayment: (store as any).onlinePayment !== undefined ? (store as any).onlinePayment : false
      },
      social: {
        instagram: (store as any).instagram || '',
        facebook: (store as any).facebook || '',
        tiktok: (store as any).tiktok || '',
        twitter: (store as any).twitter || '',
        youtube: (store as any).youtube || '',
        linkedin: (store as any).linkedin || '',
        snapchat: (store as any).snapchat || ''
      },
      payment: {
        enableCashOnDelivery: (store as any).cashOnDelivery !== undefined ? (store as any).cashOnDelivery : true,
        enableOnlinePayment: (store as any).onlinePayment !== undefined ? (store as any).onlinePayment : false,
        enableCardPayment: (store as any).cardPayment !== undefined ? (store as any).cardPayment : false,
        stripePublishableKey: (store as any).stripePublishableKey || '',
        stripeSecretKey: (store as any).stripeSecretKey || '',
        paypalClientId: (store as any).paypalClientId || '',
        paypalSecret: (store as any).paypalSecret || ''
      },
      notifications: {
        emailNotifications: (store as any).emailNotifications !== undefined ? (store as any).emailNotifications : true,
        smsNotifications: (store as any).smsNotifications !== undefined ? (store as any).smsNotifications : false,
        whatsappNotifications: (store as any).whatsappNotifications !== undefined ? (store as any).whatsappNotifications : true,
        newOrderEmail: (store as any).newOrderEmail || store.email,
        newOrderPhone: (store as any).newOrderPhone || store.phone,
        lowStockAlert: (store as any).lowStockAlert !== undefined ? (store as any).lowStockAlert : true,
        lowStockThreshold: (store as any).lowStockThreshold || 5
      },
      domain: {
        customDomain: (store as any).customDomain || '',
        customDomainVerified: (store as any).customDomainVerified || false,
        customDomainVerifiedAt: (store as any).customDomainVerifiedAt || null,
        customDomainVerificationCode: (store as any).customDomainVerificationCode || '',
        subdomain: store.subdomain || '',
        sslEnabled: (store as any).sslEnabled || false
      }
    };
    
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error getting store settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الإعدادات' });
  }
};

export const updateGeneralSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const store = await Store.findByPk(storeId);
    
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    const { 
      name, email, phone, whatsapp, address, description,
      latitude, longitude, timezone, currency, language
    } = req.body;
    
    console.log('📝 Updating general settings:', {
      name, email, phone, whatsapp, address, description,
      latitude, longitude, timezone, currency, language
    });
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
    if (address !== undefined) updateData.address = address;
    if (description !== undefined) updateData.description = description;
    if (latitude !== undefined) updateData.latitude = latitude ? parseFloat(latitude) : null;
    if (longitude !== undefined) updateData.longitude = longitude ? parseFloat(longitude) : null;
    
    // ✅ إضافة الحقول المفقودة
    if (timezone !== undefined) updateData.timezone = timezone;
    if (currency !== undefined) updateData.currency = currency;
    if (language !== undefined) updateData.language = language;
    
    await store.update(updateData);
    
    // ✅ التحقق من الحفظ
    const updatedStore = await Store.findByPk(storeId);
    console.log('✅ Updated store:', {
      timezone: (updatedStore as any).timezone,
      currency: (updatedStore as any).currency,
      language: (updatedStore as any).language
    });
    
    res.json({ 
      success: true, 
      message: 'تم تحديث الإعدادات العامة بنجاح',
      data: {
        timezone: (updatedStore as any).timezone,
        currency: (updatedStore as any).currency,
        language: (updatedStore as any).language
      }
    });
  } catch (error) {
    console.error('Error updating general settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الإعدادات' });
  }
};

// تحديث إعدادات التصميم
export const updateDesignSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const store = await Store.findByPk(storeId);
    
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    const {
      primaryColor, secondaryColor, backgroundColor, textColor,
      fontFamily, buttonStyle, cardStyle
    } = req.body;
    
    const updateData: any = {};
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (backgroundColor !== undefined) updateData.backgroundColor = backgroundColor;
    if (textColor !== undefined) updateData.textColor = textColor;
    if (fontFamily !== undefined) updateData.fontFamily = fontFamily;
    if (buttonStyle !== undefined) updateData.buttonStyle = buttonStyle;
    if (cardStyle !== undefined) updateData.cardStyle = cardStyle;
    
    await store.update(updateData);
    
    res.json({
      success: true,
      message: 'تم تحديث إعدادات التصميم بنجاح'
    });
  } catch (error) {
    console.error('Error updating design settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث إعدادات التصميم' });
  }
};

// تحديث إعدادات التوصيل
export const updateDeliverySettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const store = await Store.findByPk(storeId);
    
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    const {
      enableDelivery, baseFee, feePerKm, minDistance, maxDistance,
      freeDeliveryAbove, estimatedTime, cashOnDelivery, onlinePayment
    } = req.body;
    
    const updateData: any = {};
    if (enableDelivery !== undefined) updateData.deliveryEnabled = enableDelivery;
    if (baseFee !== undefined) updateData.deliveryBaseFee = baseFee;
    if (feePerKm !== undefined) updateData.deliveryFeePerKm = feePerKm;
    if (minDistance !== undefined) updateData.deliveryMinDistance = minDistance;
    if (maxDistance !== undefined) updateData.deliveryMaxDistance = maxDistance;
    if (freeDeliveryAbove !== undefined) updateData.deliveryFreeAbove = freeDeliveryAbove;
    if (estimatedTime !== undefined) updateData.deliveryEstimatedTime = estimatedTime;
    if (cashOnDelivery !== undefined) updateData.cashOnDelivery = cashOnDelivery;
    if (onlinePayment !== undefined) updateData.onlinePayment = onlinePayment;
    
    await store.update(updateData);
    
    res.json({
      success: true,
      message: 'تم تحديث إعدادات التوصيل بنجاح'
    });
  } catch (error) {
    console.error('Error updating delivery settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث إعدادات التوصيل' });
  }
};

// تحديث إعدادات التواصل الاجتماعي
export const updateSocialSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const store = await Store.findByPk(storeId);
    
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    const { instagram, facebook, tiktok, twitter, youtube, linkedin, snapchat } = req.body;
    
    const updateData: any = {};
    if (instagram !== undefined) updateData.instagram = instagram;
    if (facebook !== undefined) updateData.facebook = facebook;
    if (tiktok !== undefined) updateData.tiktok = tiktok;
    if (twitter !== undefined) updateData.twitter = twitter;
    if (youtube !== undefined) updateData.youtube = youtube;
    if (linkedin !== undefined) updateData.linkedin = linkedin;
    if (snapchat !== undefined) updateData.snapchat = snapchat;
    
    await store.update(updateData);
    
    res.json({
      success: true,
      message: 'تم تحديث إعدادات التواصل الاجتماعي بنجاح'
    });
  } catch (error) {
    console.error('Error updating social settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث إعدادات التواصل' });
  }
};

// تحديث إعدادات الدفع
export const updatePaymentSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const store = await Store.findByPk(storeId);
    
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    const {
      enableCashOnDelivery, enableOnlinePayment, enableCardPayment,
      stripePublishableKey, stripeSecretKey, paypalClientId, paypalSecret
    } = req.body;
    
    const updateData: any = {};
    if (enableCashOnDelivery !== undefined) updateData.cashOnDelivery = enableCashOnDelivery;
    if (enableOnlinePayment !== undefined) updateData.onlinePayment = enableOnlinePayment;
    if (enableCardPayment !== undefined) updateData.cardPayment = enableCardPayment;
    if (stripePublishableKey !== undefined) updateData.stripePublishableKey = stripePublishableKey;
    if (stripeSecretKey !== undefined) updateData.stripeSecretKey = stripeSecretKey;
    if (paypalClientId !== undefined) updateData.paypalClientId = paypalClientId;
    if (paypalSecret !== undefined) updateData.paypalSecret = paypalSecret;
    
    await store.update(updateData);
    
    res.json({
      success: true,
      message: 'تم تحديث إعدادات الدفع بنجاح'
    });
  } catch (error) {
    console.error('Error updating payment settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث إعدادات الدفع' });
  }
};

// تحديث إعدادات الإشعارات
export const updateNotificationSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const store = await Store.findByPk(storeId);
    
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    const {
      emailNotifications, smsNotifications, whatsappNotifications,
      newOrderEmail, newOrderPhone, lowStockAlert, lowStockThreshold
    } = req.body;
    
    const updateData: any = {};
    if (emailNotifications !== undefined) updateData.emailNotifications = emailNotifications;
    if (smsNotifications !== undefined) updateData.smsNotifications = smsNotifications;
    if (whatsappNotifications !== undefined) updateData.whatsappNotifications = whatsappNotifications;
    if (newOrderEmail !== undefined) updateData.newOrderEmail = newOrderEmail;
    if (newOrderPhone !== undefined) updateData.newOrderPhone = newOrderPhone;
    if (lowStockAlert !== undefined) updateData.lowStockAlert = lowStockAlert;
    if (lowStockThreshold !== undefined) updateData.lowStockThreshold = lowStockThreshold;
    
    await store.update(updateData);
    
    res.json({
      success: true,
      message: 'تم تحديث إعدادات الإشعارات بنجاح'
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث إعدادات الإشعارات' });
  }
};

// جلب إعدادات DNS للدومين المخصص
export const getDnsSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const store = await Store.findByPk(storeId);
    
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    const verificationCode = (store as any).customDomainVerificationCode || 
      `verify-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
    
    // حفظ رمز التحقق إذا لم يكن موجوداً
    if (!(store as any).customDomainVerificationCode) {
      await store.update({ customDomainVerificationCode: verificationCode });
    }
    
    res.json({
      success: true,
      data: {
        targetDomain: `${store.subdomain || store.slug}.yourdomain.com`,
        verificationCode: verificationCode,
        instructions: {
          cname: {
            name: 'www',
            value: `${store.subdomain || store.slug}.yourdomain.com`,
            ttl: 3600
          },
          txt: {
            name: '@',
            value: `verification=${verificationCode}`,
            ttl: 3600
          }
        }
      }
    });
  } catch (error) {
    console.error('Error getting DNS settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إعدادات DNS' });
  }
};

// التحقق من الدومين المخصص
export const verifyCustomDomain = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { customDomain } = req.body;
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    if (!customDomain) {
      res.status(400).json({ success: false, error: 'الرجاء إدخال الدومين' });
      return;
    }
    
    const store = await Store.findByPk(storeId);
    
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    // التحقق من أن الدومين غير مستخدم
    const existingStore = await Store.findOne({ where: { customDomain } });
    if (existingStore && existingStore.id !== store.id) {
      res.status(400).json({ success: false, error: 'هذا الدومين مستخدم بالفعل' });
      return;
    }
    
    // هنا يمكن إضافة التحقق الفعلي من DNS
    // للتطوير، نفترض أن التحقق ناجح
    
    await store.update({
      customDomain: customDomain,
      customDomainVerified: true,
      customDomainVerifiedAt: new Date()
    });
    
    res.json({
      success: true,
      verified: true,
      message: 'تم التحقق من الدومين وتفعيله بنجاح'
    });
  } catch (error) {
    console.error('Error verifying custom domain:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في التحقق من الدومين' });
  }
};

// إزالة الدومين المخصص
export const removeCustomDomain = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const store = await Store.findByPk(storeId);
    
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    // ✅ التصحيح: استخدم undefined بدلاً من null
    await store.update({
      customDomain: undefined as any,
      customDomainVerified: false,
      customDomainVerifiedAt: undefined as any
    });
    
    res.json({
      success: true,
      message: 'تم إزالة الدومين المخصص بنجاح'
    });
  } catch (error) {
    console.error('Error removing custom domain:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إزالة الدومين' });
  }
};




// ==================== الدوال العامة (Public Routes) ====================

export const getPublicStore = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const store = await Store.findOne({
      where: { 
        [Op.or]: [
          { slug: slug },
          { subdomain: slug }
        ],
        isActive: true 
      },
      attributes: ['id', 'name', 'slug', 'subdomain', 'logo', 'coverImage', 'description', 'phone', 'whatsapp', 'address', 'primaryColor', 'secondaryColor', 'settings']
    });
    
    if (!store) {
      return res.status(404).json({ success: false, error: 'المتجر غير موجود' });
    }
    
    res.json({ success: true, data: store });
  } catch (error) {
    console.error('Error getting public store:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب بيانات المتجر' });
  }
};

export const getPublicProduct = async (req: Request, res: Response) => {
  try {
    const { slug, productId } = req.params;
    
    const store = await Store.findOne({
      where: { 
        [Op.or]: [
          { slug: slug },
          { subdomain: slug }
        ],
        isActive: true 
      }
    });
    
    if (!store) {
      return res.status(404).json({ success: false, error: 'المتجر غير موجود' });
    }
    
    const product = await Product.findOne({
      where: { 
        id: productId,
        storeId: store.id,
        isAvailable: true 
      }
    });
    
    if (!product) {
      return res.status(404).json({ success: false, error: 'المنتج غير موجود' });
    }
    
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Error getting public product:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب بيانات المنتج' });
  }
};

export const getPublicProducts = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { categoryId, limit = 20, page = 1 } = req.query;
    
    const store = await Store.findOne({
      where: { 
        [Op.or]: [
          { slug: slug },
          { subdomain: slug }
        ],
        isActive: true 
      }
    });
    
    if (!store) {
      return res.status(404).json({ success: false, error: 'المتجر غير موجود' });
    }
    
    const whereClause: any = { storeId: store.id, isAvailable: true };
    if (categoryId) whereClause.categoryId = categoryId;
    
    const products = await Product.findAll({
      where: whereClause,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error getting public products:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المنتجات' });
  }
};

export const getPublicCategories = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const store = await Store.findOne({
      where: { 
        [Op.or]: [
          { slug: slug },
          { subdomain: slug }
        ],
        isActive: true 
      }
    });
    
    if (!store) {
      return res.status(404).json({ success: false, error: 'المتجر غير موجود' });
    }
    
    const categories = await ProductCategory.findAll({
      where: { storeId: store.id },
      attributes: ['id', 'name', 'nameEn', 'sortOrder']
    });
    
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error getting public categories:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب التصنيفات' });
  }
};

export const getPublicRelatedProducts = async (req: Request, res: Response) => {
  try {
    const { slug, productId } = req.params;
    const { limit = 4 } = req.query;
    
    const store = await Store.findOne({
      where: { 
        [Op.or]: [
          { slug: slug },
          { subdomain: slug }
        ],
        isActive: true 
      }
    });
    
    if (!store) {
      return res.status(404).json({ success: false, error: 'المتجر غير موجود' });
    }
    
    const product = await Product.findOne({
      where: { id: productId, storeId: store.id }
    });
    
    if (!product) {
      return res.status(404).json({ success: false, error: 'المنتج غير موجود' });
    }
    
    // جلب منتجات ذات صلة من نفس التصنيف أو منتجات عشوائية
    const relatedProducts = await Product.findAll({
      where: {
        storeId: store.id,
        id: { [Op.ne]: productId },
        isAvailable: true
      },
      limit: Number(limit),
      order: product.categoryId 
        ? [['categoryId', 'ASC'], ['createdAt', 'DESC']]
        : [['createdAt', 'DESC']]
    });
    
    res.json({ success: true, data: relatedProducts });
  } catch (error) {
    console.error('Error getting related products:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المنتجات المشابهة' });
  }
};


// backend/src/controllers/storeController.ts - في نهاية الملف

export default {
  // دوال عامة
  getPublicStore,
  getPublicProduct,
  getPublicProducts,
  getPublicCategories,
  getPublicRelatedProducts,
  // دوال الملف الشخصي
  getProfile,
  updateProfile,
  uploadStoreLogo,
  uploadStoreCover,
  // دوال المنتجات
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductAvailability,
  // دوال المخزون
  getInventoryStats,
  updateInventory,
  // دوال الطلبات
  getStoreOrders,
  getStoreOrderStats,
  getStoreOrderById,
  updateStoreOrderStatus,
  getTopProducts,
  // دوال الكوبونات
  getStoreCoupons,
  createStoreCoupon,
  updateStoreCoupon,
  deleteStoreCoupon,
  // دوال السائقين
  getStoreDrivers,
  createStoreDriver,
  // دوال الفئات
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  // دوال الموظفين
  getStoreStaff,
  getStoreStaffDetails,
  updateStoreStaff,
  toggleStoreStaffStatus,
  deleteStoreStaff,
  updateStoreStaffPermissions,
  // دوال الإعدادات
  getStoreSettings,
  updateGeneralSettings,
  updateDesignSettings,
  updateDeliverySettings,
  updateSocialSettings,
  updatePaymentSettings,
  updateNotificationSettings,
  getDnsSettings,
  verifyCustomDomain,
  removeCustomDomain
};