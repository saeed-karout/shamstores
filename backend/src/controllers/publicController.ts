// backend/src/controllers/publicController.ts

import { Response } from 'express';
import { SubdomainRequest } from '../middleware/subdomain';
import Restaurant from '../models/Restaurant';
import Store from '../models/Store';
import MenuItem from '../models/MenuItem';
import Product from '../models/Product';
import Category from '../models/Category';
import Table from '../models/Table';
import { getPublicMarketingData } from './marketingController';

// ==================== الصفحة الرئيسية للمطعم/المتجر ====================

export const getBusinessBySubdomain = async (
  req: SubdomainRequest,
  res: Response
): Promise<void> => {
  try {
    console.log('🔍 getBusinessBySubdomain - req.business:', req.business?.type, req.business?.id);
    
    if (!req.business) {
      res.status(404).json({ 
        success: false, 
        error: 'المطعم أو المتجر غير موجود' 
      });
      return;
    }
    
    const { type, data } = req.business;
    console.log(`📦 Business type: ${type}, ID: ${data.id}, Name: ${data.name}`);
    const marketing = await getPublicMarketingData(type, data.id);
    
    if (type === 'restaurant') {
      // جلب الفئات وعناصر القائمة للمطعم
      const categories = await Category.findAll({
        where: { restaurantId: data.id, isActive: true },
        include: [{
          model: MenuItem,
          as: 'menuItems',
          where: { isAvailable: true },
          required: false
        }],
        order: [['sortOrder', 'ASC']]
      });
      
      res.json({
        success: true,
        data: {
          business: {
            id: data.id,
            name: data.name,
            slug: data.slug,
            subdomain: data.subdomain,
            logo: data.logo,
            coverImage: data.coverImage,
            description: data.description,
            phone: data.phone,
            whatsapp: data.whatsapp,
            primaryColor: data.primaryColor,
            secondaryColor: data.secondaryColor,
            type: 'restaurant',
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            deliverySettings: data.deliverySettings || {
              enableDelivery: true,
              baseFee: 5,
              feePerKm: 2,
              minDistance: 1,
              maxDistance: 20,
              freeDeliveryAbove: 100,
              estimatedTime: 45
            }
          },
          categories,
          marketing
        }
      });
    } else {
      // للمتاجر
      const categories = await Category.findAll({
        where: { storeId: data.id, isActive: true },
        order: [['sortOrder', 'ASC']]
      });
      
      const products = await Product.findAll({
        where: { storeId: data.id, isAvailable: true },
        order: [['sortOrder', 'ASC']]
      });
      
      console.log(`📦 Found ${categories.length} categories and ${products.length} products for store`);
      
      res.json({
        success: true,
        data: {
          business: {
            id: data.id,
            name: data.name,
            slug: data.slug,
            subdomain: data.subdomain,
            logo: data.logo,
            coverImage: data.coverImage,
            description: data.description,
            phone: data.phone,
            whatsapp: data.whatsapp,
            primaryColor: data.primaryColor,
            secondaryColor: data.secondaryColor,
            type: 'store',
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            timezone: data.timezone,
            currency: data.currency,
            deliverySettings: data.deliverySettings || {
              enableDelivery: true,
              baseFee: 5,
              feePerKm: 2,
              minDistance: 1,
              maxDistance: 20,
              freeDeliveryAbove: 100,
              estimatedTime: 45
            }
          },
          categories,
          marketing,
          products: products.map(p => ({
            id: p.id,
            storeId: p.storeId,
            name: p.name,
            nameEn: p.nameEn,
            description: p.description,
            descriptionEn: p.descriptionEn,
            price: parseFloat(p.price as any),
            discountedPrice: p.discountedPrice ? parseFloat(p.discountedPrice as any) : null,
            imageUrl: p.imageUrl,
            stock: p.stock,
            sku: p.sku,
            categoryId: p.categoryId,
            isAvailable: p.isAvailable,
            sortOrder: p.sortOrder,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt
          }))
        }
      });
    }
  } catch (error) {
    console.error('Error getting business by subdomain:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

// ==================== جلب الفئات فقط ====================

export const getCategories = async (
  req: SubdomainRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.business) {
      res.status(404).json({ success: false, error: 'المطعم أو المتجر غير موجود' });
      return;
    }
    
    const { type, data } = req.business;
    let categories = [];
    
    if (type === 'restaurant') {
      categories = await Category.findAll({
        where: { restaurantId: data.id, isActive: true },
        order: [['sortOrder', 'ASC']]
      });
    } else {
      categories = await Category.findAll({
        where: { storeId: data.id, isActive: true },
        order: [['sortOrder', 'ASC']]
      });
    }
    
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الفئات' });
  }
};

// ==================== جلب عناصر القائمة (للمطاعم) ====================

export const getMenuItems = async (
  req: SubdomainRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.business || req.business.type !== 'restaurant') {
      res.status(404).json({ success: false, error: 'عناصر القائمة غير موجودة' });
      return;
    }
    
    const menuItems = await MenuItem.findAll({
      where: { restaurantId: req.business.id, isAvailable: true },
      order: [['sortOrder', 'ASC']]
    });
    
    res.json({ success: true, data: menuItems });
  } catch (error) {
    console.error('Error getting menu items:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب عناصر القائمة' });
  }
};

// ==================== جلب المنتجات (للمتاجر) ====================

export const getProducts = async (
  req: SubdomainRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.business || req.business.type !== 'store') {
      res.status(404).json({ success: false, error: 'المنتجات غير موجودة' });
      return;
    }
    
    const products = await Product.findAll({
      where: { storeId: req.business.id, isAvailable: true },
      order: [['sortOrder', 'ASC']]
    });
    
    const formattedProducts = products.map(p => ({
      id: p.id,
      storeId: p.storeId,
      name: p.name,
      nameEn: p.nameEn,
      description: p.description,
      descriptionEn: p.descriptionEn,
      price: parseFloat(p.price as any),
      discountedPrice: p.discountedPrice ? parseFloat(p.discountedPrice as any) : null,
      imageUrl: p.imageUrl,
      stock: p.stock,
      sku: p.sku,
      categoryId: p.categoryId,
      isAvailable: p.isAvailable,
      sortOrder: p.sortOrder,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));
    
    res.json({ success: true, data: formattedProducts });
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المنتجات' });
  }
};

// ==================== صفحة الطاولة (للمطاعم) ====================

export const getTableBySubdomain = async (
  req: SubdomainRequest,
  res: Response
): Promise<void> => {
  try {
    const { tableId } = req.params;
    
    if (!req.business || req.business.type !== 'restaurant') {
      res.status(404).json({ success: false, error: 'الطاولة غير موجودة' });
      return;
    }
    
    const table = await Table.findOne({
      where: { 
        id: tableId,
        restaurantId: req.business.id
      }
    });
    
    if (!table) {
      res.status(404).json({ success: false, error: 'الطاولة غير موجودة' });
      return;
    }
    
    const categories = await Category.findAll({
      where: { restaurantId: req.business.id, isActive: true },
      order: [['sortOrder', 'ASC']]
    });
    
    res.json({
      success: true,
      data: {
        business: req.business.data,
        table,
        categories
      }
    });
  } catch (error) {
    console.error('Error getting table by subdomain:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

// ==================== صفحة المنتج (للمتاجر) ====================

export const getProductBySubdomain = async (
  req: SubdomainRequest,
  res: Response
): Promise<void> => {
  try {
    const { productId } = req.params;
    
    if (!req.business || req.business.type !== 'store') {
      res.status(404).json({ success: false, error: 'المنتج غير موجود' });
      return;
    }
    
    const product = await Product.findOne({
      where: { 
        id: productId,
        storeId: req.business.id,
        isAvailable: true
      }
    });
    
    if (!product) {
      res.status(404).json({ success: false, error: 'المنتج غير موجود' });
      return;
    }
    
    res.json({
      success: true,
      data: {
        business: req.business.data,
        product: {
          id: product.id,
          storeId: product.storeId,
          name: product.name,
          nameEn: product.nameEn,
          description: product.description,
          descriptionEn: product.descriptionEn,
          price: parseFloat(product.price as any),
          discountedPrice: product.discountedPrice ? parseFloat(product.discountedPrice as any) : null,
          imageUrl: product.imageUrl,
          stock: product.stock,
          sku: product.sku,
          categoryId: product.categoryId,
          isAvailable: product.isAvailable
        }
      }
    });
  } catch (error) {
    console.error('Error getting product by subdomain:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};
