// backend/src/controllers/advertisementController.ts
import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';

// ==================== إعلانات عامة للجمهور (بدون مصادقة) ====================



export const getPublicAdvertisements = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const now = new Date();
    
    const advertisements = await prisma.advertisement.findMany({
      where: {
        isActive: true,
        
      },
      orderBy: { position: 'asc' }
    });
    
    res.json({ success: true, data: advertisements });
  } catch (error) {
    console.error('Error fetching public advertisements:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في جلب الإعلانات' 
    });
  }
};

// ==================== دوال السوبر أدمن فقط ====================

export const getAllAdvertisements = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const ads = await prisma.advertisement.findMany({
      orderBy: { position: 'asc' }
    });

    res.json({ success: true, data: ads });
  } catch (error) {
    console.error('Error fetching all advertisements:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الإعلانات' });
  }
};

export const getAdvertisement = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const { id } = req.params;
    const ad = await prisma.advertisement.findUnique({ where: { id } });

    if (!ad) {
      res.status(404).json({ success: false, error: 'الإعلان غير موجود' });
      return;
    }

    res.json({ success: true, data: ad });
  } catch (error) {
    console.error('Error fetching advertisement:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الإعلان' });
  }
};

export const createAdvertisement = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const {
      title, titleEn, description, descriptionEn,
      imageUrl, linkUrl, position, isActive,
      startAt, endAt, price, paid,
      clientName, clientEmail, clientPhone
    } = req.body;

    const ad = await prisma.advertisement.create({
      data: {
        title,
        titleEn: titleEn || null,
        description: description || null,
        descriptionEn: descriptionEn || null,
        imageUrl,
        linkUrl: linkUrl || null,
        position: position || 0,
        isActive: isActive !== undefined ? isActive : true,
        startAt: startAt ? new Date(startAt) : null,
        endAt: endAt ? new Date(endAt) : null,
        price: price || 0,
        paid: paid || false,
        clientName: clientName || null,
        clientEmail: clientEmail || null,
        clientPhone: clientPhone || null
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الإعلان بنجاح',
      data: ad
    });
  } catch (error) {
    console.error('Error creating advertisement:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الإعلان' });
  }
};

export const updateAdvertisement = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const { id } = req.params;
    const {
      title, titleEn, description, descriptionEn,
      imageUrl, linkUrl, position, isActive,
      startAt, endAt, price, paid,
      clientName, clientEmail, clientPhone
    } = req.body;

    const existingAd = await prisma.advertisement.findUnique({ where: { id } });
    if (!existingAd) {
      res.status(404).json({ success: false, error: 'الإعلان غير موجود' });
      return;
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (titleEn !== undefined) updateData.titleEn = titleEn;
    if (description !== undefined) updateData.description = description;
    if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (linkUrl !== undefined) updateData.linkUrl = linkUrl;
    if (position !== undefined) updateData.position = position;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (startAt !== undefined) updateData.startAt = startAt ? new Date(startAt) : null;
    if (endAt !== undefined) updateData.endAt = endAt ? new Date(endAt) : null;
    if (price !== undefined) updateData.price = price;
    if (paid !== undefined) updateData.paid = paid;
    if (clientName !== undefined) updateData.clientName = clientName;
    if (clientEmail !== undefined) updateData.clientEmail = clientEmail;
    if (clientPhone !== undefined) updateData.clientPhone = clientPhone;
    
    // إضافة معلومات الموافقة
    if (Object.keys(updateData).length > 0) {
      updateData.approvedBy = req.user?.id;
      updateData.approvedAt = new Date();
    }

    const updatedAd = await prisma.advertisement.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'تم تحديث الإعلان بنجاح',
      data: updatedAd
    });
  } catch (error) {
    console.error('Error updating advertisement:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الإعلان' });
  }
};

export const deleteAdvertisement = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const { id } = req.params;
    const ad = await prisma.advertisement.findUnique({ where: { id } });

    if (!ad) {
      res.status(404).json({ success: false, error: 'الإعلان غير موجود' });
      return;
    }

    await prisma.advertisement.delete({ where: { id } });

    res.json({
      success: true,
      message: 'تم حذف الإعلان بنجاح'
    });
  } catch (error) {
    console.error('Error deleting advertisement:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الإعلان' });
  }
};

export const toggleAdvertisementStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const { id } = req.params;
    const ad = await prisma.advertisement.findUnique({ where: { id } });

    if (!ad) {
      res.status(404).json({ success: false, error: 'الإعلان غير موجود' });
      return;
    }

    const updatedAd = await prisma.advertisement.update({
      where: { id },
      data: { isActive: !ad.isActive }
    });

    res.json({
      success: true,
      message: updatedAd.isActive ? 'تم تفعيل الإعلان' : 'تم تعطيل الإعلان',
      data: updatedAd
    });
  } catch (error) {
    console.error('Error toggling advertisement:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تغيير حالة الإعلان' });
  }
};

// ==================== إحصائيات الإعلانات ====================

export const getAdvertisementsStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const [total, active, paid, totalRevenue] = await Promise.all([
      prisma.advertisement.count(),
      prisma.advertisement.count({ where: { isActive: true } }),
      prisma.advertisement.count({ where: { paid: true } }),
      prisma.advertisement.aggregate({ 
        where: { paid: true }, 
        _sum: { price: true } 
      })
    ]);

    res.json({
      success: true,
      data: {
        total,
        active,
        inactive: total - active,
        paid,
        unpaid: total - paid,
        totalRevenue: totalRevenue._sum.price || 0
      }
    });
  } catch (error) {
    console.error('Error fetching ads stats:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إحصائيات الإعلانات' });
  }
};