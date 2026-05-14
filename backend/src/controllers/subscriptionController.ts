import { Response } from 'express';
import { AuthRequest } from '../types';
import Subscription from '../models/Subscription';
import Restaurant from '../models/Restaurant';
import { Op } from 'sequelize';
import { sendWhatsAppReminder } from '../utils/whatsapp';

export const createSubscription = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      planId, planName, months, price, discount,
      paymentMethod, paymentReference, notes
    } = req.body;

    if (!req.user?.restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    // حساب الخصم حسب عدد الشهور
    let finalDiscount = discount;
    if (!discount && months >= 12) {
      finalDiscount = 15; // خصم 15% للسنة كاملة
    } else if (!discount && months >= 6) {
      finalDiscount = 10; // خصم 10% لـ 6 شهور
    } else if (!discount && months >= 3) {
      finalDiscount = 5; // خصم 5% لـ 3 شهور
    }

    const monthlyPrice = price;
    const totalBeforeDiscount = monthlyPrice * months;
    const discountAmount = (totalBeforeDiscount * (finalDiscount || 0)) / 100;
    const totalPaid = totalBeforeDiscount - discountAmount;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);

    const subscription = await Subscription.create({
      restaurantId: req.user.restaurantId,
      planId,
      planName,
      months,
      price: monthlyPrice,
      discount: finalDiscount || 0,
      totalPaid,
      startDate,
      endDate,
      paymentMethod,
      paymentReference,
      notes,
      reminderSent: false
    } as any);

    // تحديث خطة المطعم
    await Restaurant.update(
      { 
        planId,
        subscriptionStart: startDate,
        subscriptionEnd: endDate 
      },
      { where: { id: req.user.restaurantId }, individualHooks: true }
    );

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الاشتراك بنجاح',
      data: subscription
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في إنشاء الاشتراك' 
    });
  }
};

export const getSubscriptions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const subscriptions = await Subscription.findAll({
      where: { restaurantId: req.user?.restaurantId },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب الاشتراكات' 
    });
  }
};

export const getExpiringSubscriptions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // الاشتراكات التي ستنتهي خلال 3 أيام
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiringSubscriptions = await Subscription.findAll({
      where: {
        status: 'active',
        endDate: {
          [Op.lte]: threeDaysFromNow,
          [Op.gt]: new Date()
        }
      },
      include: [{ model: Restaurant, as: 'restaurant' }]
    });

    res.json({
      success: true,
      data: expiringSubscriptions
    });
  } catch (error) {
    console.error('Error fetching expiring subscriptions:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب الاشتراكات المنتهية' 
    });
  }
};

export const sendRenewalReminders = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // فقط السوبر أدمن يمكنه تشغيل هذه الدالة
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ 
        success: false,
        error: 'غير مصرح' 
      });
      return;
    }

    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    const subscriptionsToRemind = await Subscription.findAll({
      where: {
        status: 'active',
        reminderSent: false,
        endDate: {
          [Op.lte]: twoDaysFromNow,
          [Op.gt]: new Date()
        }
      },
      include: [{ model: Restaurant, as: 'restaurant' }]
    });

    let sentCount = 0;
    for (const sub of subscriptionsToRemind) {
      const restaurant = (sub as any).restaurant;
      if (restaurant?.whatsapp) {
        // إرسال تذكير عبر واتساب
        const message = `مرحباً، نود تذكيرك بأن اشتراكك في خطة ${sub.planName} سينتهي في ${new Date(sub.endDate).toLocaleDateString('ar-SA')}. يرجى التواصل معنا لتجديد الاشتراك.`;
        
        // await sendWhatsAppReminder(restaurant.whatsapp, message);
        
        await sub.update({
          reminderSent: true,
          reminderSentAt: new Date()
        });
        sentCount++;
      }
    }

    res.json({
      success: true,
      message: `تم إرسال ${sentCount} تذكير`,
      data: { sentCount }
    });
  } catch (error) {
    console.error('Error sending reminders:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في إرسال التذكيرات' 
    });
  }
};

export const checkExpiredSubscriptions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // فقط السوبر أدمن يمكنه تشغيل هذه الدالة
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ 
        success: false,
        error: 'غير مصرح' 
      });
      return;
    }

    const now = new Date();

    // الاشتراكات المنتهية
    const expiredSubscriptions = await Subscription.findAll({
      where: {
        status: 'active',
        endDate: { [Op.lt]: now }
      }
    });

    let expiredCount = 0;
    for (const sub of expiredSubscriptions) {
      await sub.update({ status: 'expired' });
      
      // تحديث خطة المطعم إلى المجانية
      await Restaurant.update(
        { planId: '11111111-1111-1111-1111-111111111111' }, // الخطة المجانية
        { where: { id: sub.restaurantId }, individualHooks: true }
      );
      
      expiredCount++;
    }

    res.json({
      success: true,
      message: `تم إنهاء ${expiredCount} اشتراك منتهي`,
      data: { expiredCount }
    });
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في التحقق من الاشتراكات' 
    });
  }
};
