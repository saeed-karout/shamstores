// backend/src/controllers/supportController.ts
//
// الدعم البشري المحلي: رقم واتساب الدعم، ومقاطع الشرح، وقائمة البداية.
//
// **لماذا واتساب لا نظام تذاكر:** التاجر السوري يدير متجره من هاتفه، وواتساب
// هو التطبيق المفتوح عنده طوال اليوم. تذكرةٌ يُنتظر ردّها بالبريد لا تُرسل
// أصلاً — ورسالة واتساب تُرسل في عشر ثوانٍ.
//
// **الإعدادات في `ExtendedPlatformSetting` عبر SettingService** لا جدولاً
// جديداً: رقمٌ وقائمةٌ صغيرة يعدّلهما المشرف، وهذا بالضبط ما صُمّم له.
// وهي غير عامّة (`isPublic: false`): الرقم للتجّار في لوحتهم لا لكل زائر.

import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import SettingService from '../services/setting.service';

const KEY_WHATSAPP = 'support_whatsapp';
const KEY_VIDEOS = 'support_tutorial_videos';
const MAX_VIDEOS = 30;

export interface TutorialVideo {
  title: string;
  url: string;
  duration?: string;
  youtubeId: string;
}

/**
 * معرّف يوتيوب من أي صيغة رابط شائعة (watch، youtu.be، shorts، embed).
 *
 * نقبل يوتيوب وحده: التضمين في لوحة التاجر يعني iframe من مصدرٍ نثق به،
 * ورابطٌ حرّ من أي موقع هو صفحةٌ غريبة داخل لوحة فيها بيانات الزبائن.
 */
export const youtubeIdFrom = (raw: string): string | null => {
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.replace(/^www\.|^m\./, '');
    let id: string | null = null;
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      else {
        const m = /^\/(?:shorts|embed|live)\/([^/?#]+)/.exec(u.pathname);
        id = m ? m[1] : null;
      }
    }
    return id && /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
};

/** أرقام فقط بصيغة wa.me — الدولية بلا + ولا أصفار بادئة */
const normalizeWhatsapp = (raw: unknown): string => {
  let digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  // رقم سوري محلي 09xxxxxxxx → 9639xxxxxxxx
  if (/^09\d{8}$/.test(digits)) digits = `963${digits.slice(1)}`;
  return digits;
};

const sanitizeVideos = (raw: unknown): { videos: TutorialVideo[]; error?: string } => {
  if (!Array.isArray(raw)) return { videos: [], error: 'قائمة المقاطع غير صالحة' };
  const videos: TutorialVideo[] = [];
  for (const [i, v] of raw.slice(0, MAX_VIDEOS).entries()) {
    const title = String(v?.title ?? '').trim().slice(0, 120);
    const url = String(v?.url ?? '').trim().slice(0, 300);
    const duration = String(v?.duration ?? '').trim().slice(0, 12);
    if (!title && !url) continue;
    const youtubeId = youtubeIdFrom(url);
    if (!title || !youtubeId) {
      return { videos: [], error: `المقطع ${i + 1}: اكتب عنواناً ورابط يوتيوب صحيحاً` };
    }
    videos.push({ title, url, duration: duration || undefined, youtubeId });
  }
  return { videos };
};

const readConfig = async () => {
  const [whatsapp, videos] = await Promise.all([
    SettingService.getString(KEY_WHATSAPP, ''),
    SettingService.getJSON(KEY_VIDEOS, [])
  ]);
  return {
    whatsapp: normalizeWhatsapp(whatsapp),
    // ما خُزّن قديماً أو يدوياً يمرّ بالتنقية نفسها قبل أن يصل إلى iframe
    videos: sanitizeVideos(Array.isArray(videos) ? videos : []).videos
  };
};

// ==================== التاجر ====================

/** GET /api/support/config */
export const getSupportConfig = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({ success: true, data: await readConfig() });
  } catch (error) {
    console.error('Error reading support config:', error);
    res.json({ success: true, data: { whatsapp: '', videos: [] } });
  }
};

/**
 * GET /api/support/checklist — خطوات البداية محسوبةً من البيانات الفعلية.
 *
 * لا أعلام «أنهيتُ هذه الخطوة» يضغطها التاجر: قائمةٌ تُعلَّم يدوياً تكذب
 * بعد أسبوع (حذف منتجاته، أزال شعاره). الحساب من الجداول نفسها لا يكذب.
 */
export const getOnboardingChecklist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isRestaurant = !!req.user?.restaurantId;
    const businessId = req.user?.restaurantId || req.user?.storeId;
    if (!businessId) {
      res.status(403).json({ success: false, error: 'لا يوجد نشاط تجاري مرتبط بحسابك' });
      return;
    }
    const businessType = isRestaurant ? 'restaurant' : 'store';

    const business: any = isRestaurant
      ? await prisma.restaurant.findUnique({
          where: { id: businessId },
          select: { logo: true, customDomainVerified: true, verifiedAt: true, deliverySettings: true }
        })
      : await prisma.store.findUnique({
          where: { id: businessId },
          select: { logo: true, customDomainVerified: true, verifiedAt: true, deliverySettings: true }
        });

    if (!business) {
      res.status(404).json({ success: false, error: 'النشاط التجاري غير موجود' });
      return;
    }

    // عدّادات متتالية لا متوازية: سقف اتصالات قاعدة الإنتاج عشرة، وأربعة
    // استعلامات متوازية لكل فتحة صفحة تزاحم الطلبات الحقيقية بلا داعٍ
    const itemCount = isRestaurant
      ? await prisma.menuItem.count({ where: { restaurantId: businessId } })
      : await prisma.product.count({ where: { storeId: businessId } });
    const zoneCount = await prisma.shippingZone.count({ where: { businessId, businessType } });
    const orderCount = await prisma.order.count({
      where: isRestaurant ? { restaurantId: businessId } : { storeId: businessId }
    });
    const pendingVerification = business.verifiedAt
      ? 0
      : await prisma.verificationRequest.count({ where: { businessType, businessId, status: 'pending' } });

    // المطعم قد يعتمد التوصيل بالمسافة من «الإعدادات ← التوصيل» بدل المناطق
    const restaurantDeliverySaved = isRestaurant && business.deliverySettings && typeof business.deliverySettings === 'object';

    const p = (restaurant: string, store: string) => (isRestaurant ? restaurant : store);
    const items = [
      {
        key: 'logo',
        title: 'أضف شعارك',
        hint: 'الشعار أوّل ما يراه الزبون في واجهتك وفي تبويب المتصفّح.',
        done: !!business.logo,
        link: p('/settings', '/store/settings')
      },
      {
        key: 'products',
        title: p('أضف 5 أصناف على الأقل', 'أضف 5 منتجات على الأقل'),
        hint: `لديك الآن ${itemCount}. الواجهة الممتلئة تبيع أكثر من واجهة فيها صنفان.`,
        done: itemCount >= 5,
        progress: { current: Math.min(itemCount, 5), target: 5 },
        link: p('/menu', '/store/products')
      },
      {
        key: 'delivery',
        title: 'حدّد مناطق التوصيل ورسومها',
        hint: 'ليعرف الزبون قبل الطلب هل تصله وبكم.',
        done: zoneCount > 0 || !!restaurantDeliverySaved,
        link: p('/restaurant/shipping', '/store/shipping')
      },
      {
        key: 'first_order',
        title: 'استقبل أوّل طلب',
        hint: 'شارك رابط واجهتك على واتساب وإنستغرام — أو جرّب طلباً بنفسك.',
        done: orderCount > 0,
        link: '/dashboard'
      },
      {
        key: 'verified',
        title: 'وثّق نشاطك',
        hint: pendingVerification
          ? 'طلبك قيد المراجعة — نُعلمك فور البتّ فيه.'
          : 'شارة «تاجر موثّق» الزرقاء تطمئن الزبون — مجاناً على كل الخطط.',
        done: !!business.verifiedAt,
        pending: pendingVerification > 0,
        link: '/verification'
      },
      {
        key: 'custom_domain',
        title: 'اربط نطاقك الخاص',
        hint: 'مثل mystore.com بدل الرابط الفرعي.',
        done: !!business.customDomainVerified,
        optional: true,
        link: p('/settings', '/store/settings')
      }
    ];

    const required = items.filter((i) => !i.optional);
    res.json({
      success: true,
      data: {
        businessType,
        items,
        completed: required.filter((i) => i.done).length,
        total: required.length
      }
    });
  } catch (error) {
    console.error('Error computing onboarding checklist:', error);
    res.status(500).json({ success: false, error: 'تعذّر حساب قائمة البداية' });
  }
};

// ==================== المشرف ====================

/** GET /api/support/admin/settings */
export const getSupportSettings = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({ success: true, data: await readConfig() });
  } catch (error) {
    console.error('Error reading support settings:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب إعدادات الدعم' });
  }
};

/** PUT /api/support/admin/settings { whatsapp, videos } */
export const updateSupportSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const whatsapp = normalizeWhatsapp(req.body?.whatsapp);
    if (whatsapp && (whatsapp.length < 9 || whatsapp.length > 15)) {
      res.status(400).json({ success: false, error: 'رقم واتساب غير صالح — اكتبه بالصيغة الدولية مثل 963912345678' });
      return;
    }

    const { videos, error } = sanitizeVideos(req.body?.videos ?? []);
    if (error) {
      res.status(400).json({ success: false, error });
      return;
    }

    // `setSetting` ينشئ بـ isPublic الافتراضي (false) — وهو المطلوب
    await SettingService.setSetting(KEY_WHATSAPP, whatsapp, 'string', 'general');
    await SettingService.setSetting(
      KEY_VIDEOS,
      JSON.stringify(videos.map(({ title, url, duration }) => ({ title, url, duration }))),
      'json',
      'general'
    );

    res.json({ success: true, message: 'حُفظت إعدادات الدعم', data: { whatsapp, videos } });
  } catch (error) {
    console.error('Error updating support settings:', error);
    res.status(500).json({ success: false, error: 'تعذّر حفظ إعدادات الدعم' });
  }
};
