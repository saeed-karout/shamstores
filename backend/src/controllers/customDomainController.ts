// backend/src/controllers/customDomainController.ts
// إدارة النطاقات المخصصة للمطاعم والمتاجر — بتحقق DNS حقيقي

import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../types';
import env from '../config/env';
import {
  validateCustomDomain,
  verifyDomainDns,
  buildDnsInstructions,
  generateVerificationCode,
  invalidateDomainCache,
  normalizeDomain,
  stripWww,
  BusinessType
} from '../services/domain.service';
import cloudflare, { CustomHostnameState, buildCnameRecord } from '../services/cloudflareSaas.service';

interface OwnedBusiness {
  type: BusinessType;
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  customDomain: string | null;
  customDomainVerified: boolean | null;
  customDomainVerifiedAt: Date | null;
  customDomainVerificationCode: string | null;
  customDomainHostnameId: string | null;
  customDomainStatus: string | null;
  customDomainSslStatus: string | null;
  customDomainCheckedAt: Date | null;
  customDomainError: string | null;
}

const BUSINESS_SELECT = {
  id: true,
  name: true,
  slug: true,
  subdomain: true,
  customDomain: true,
  customDomainVerified: true,
  customDomainVerifiedAt: true,
  customDomainVerificationCode: true,
  customDomainHostnameId: true,
  customDomainStatus: true,
  customDomainSslStatus: true,
  customDomainCheckedAt: true,
  customDomainError: true
} as const;

/**
 * يحدد النشاط التجاري الذي يملكه المستخدم فعلياً.
 * لا يُقبل أي معرّف من العميل — المصدر الوحيد هو ارتباط المستخدم في قاعدة البيانات.
 */
export const getOwnedBusiness = async (req: AuthRequest): Promise<OwnedBusiness | null> => {
  const userId = req.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { restaurantId: true, storeId: true, role: true }
  });
  if (!user) return null;

  if (user.restaurantId) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
      select: BUSINESS_SELECT
    });
    if (restaurant) return { type: 'restaurant', ...restaurant };
  }

  if (user.storeId) {
    const store = await prisma.store.findUnique({
      where: { id: user.storeId },
      select: BUSINESS_SELECT
    });
    if (store) return { type: 'store', ...store };
  }

  // مالك بلا ارتباط مباشر: نبحث عن نشاط يملكه
  const ownedRestaurant = await prisma.restaurant.findFirst({
    where: { userId },
    select: BUSINESS_SELECT
  });
  if (ownedRestaurant) return { type: 'restaurant', ...ownedRestaurant };

  const ownedStore = await prisma.store.findFirst({
    where: { userId },
    select: BUSINESS_SELECT
  });
  if (ownedStore) return { type: 'store', ...ownedStore };

  return null;
};

const updateBusiness = async (type: BusinessType, id: string, data: any) => {
  if (type === 'restaurant') {
    return prisma.restaurant.update({ where: { id }, data, select: BUSINESS_SELECT });
  }
  return prisma.store.update({ where: { id }, data, select: BUSINESS_SELECT });
};

/** يضمن وجود رمز تحقق ثابت للنشاط التجاري */
const ensureVerificationCode = async (business: OwnedBusiness): Promise<string> => {
  if (business.customDomainVerificationCode) return business.customDomainVerificationCode;
  const code = generateVerificationCode();
  await updateBusiness(business.type, business.id, { customDomainVerificationCode: code });
  return code;
};

// ==================== GET /dns-settings ====================

export const getDnsSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getOwnedBusiness(req);
    if (!business) {
      res.status(404).json({ success: false, error: 'لا يوجد مطعم أو متجر مرتبط بحسابك' });
      return;
    }

    const verificationCode = await ensureVerificationCode(business);
    const instructions = buildDnsInstructions(
      business.subdomain || business.slug,
      verificationCode,
      business.customDomain
    );

    res.json({
      success: true,
      data: {
        ...instructions,
        appDomain: env.APP_DOMAIN,
        businessType: business.type,
        currentDomain: business.customDomain,
        verified: business.customDomainVerified === true
      }
    });
  } catch (error) {
    console.error('Error getting DNS settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إعدادات DNS' });
  }
};


// ==================== المزامنة مع Cloudflare ====================

/**
 * يقرأ حالة النطاق من Cloudflare ويكتبها عندنا.
 *
 * `customDomainVerified` هو ما يقرّر أن يُخدَم النطاق (راجع
 * resolveBusinessByCustomDomain)، ولا يصحّ أن يُرفع إلا حين تصبح الشهادة
 * صادرة فعلاً: نطاق مفعّل بلا شهادة يعطي الزائر تحذير أمان لا صفحة.
 */
const syncDomainState = async (business: OwnedBusiness): Promise<CustomHostnameState | null> => {
  if (!business.customDomain || !cloudflare.isConfigured()) return null;

  let state: CustomHostnameState | null = null;
  try {
    if (business.customDomainHostnameId) {
      state = await cloudflare.getCustomHostname(business.customDomainHostnameId);
    }
    // التسجيل قد يكون موجوداً عندهم بلا معرّف عندنا (أُضيف يدوياً سابقاً)
    if (!state) state = await cloudflare.findCustomHostname(business.customDomain);
  } catch (error) {
    console.error('تعذّرت مزامنة النطاق مع Cloudflare:', error);
    return null;
  }

  if (!state) return null;

  const wasVerified = business.customDomainVerified === true;

  await updateBusiness(business.type, business.id, {
    customDomainHostnameId: state.id,
    customDomainStatus: state.status,
    customDomainSslStatus: state.sslStatus,
    customDomainCheckedAt: new Date(),
    customDomainError: state.errors.length ? state.errors.join(' | ').slice(0, 1000) : null,
    customDomainVerified: state.ready,
    ...(state.ready && !business.customDomainVerifiedAt ? { customDomainVerifiedAt: new Date() } : {})
  });

  if (state.ready !== wasVerified) invalidateDomainCache(business.customDomain);

  return state;
};

/** يمنع حجز نطاق يملكه نشاط آخر */
const isDomainTaken = async (domain: string, business: OwnedBusiness): Promise<boolean> => {
  const candidates = Array.from(new Set([domain, stripWww(domain), `www.${stripWww(domain)}`]));
  const [takenByRestaurant, takenByStore] = await Promise.all([
    prisma.restaurant.findFirst({
      where: {
        customDomain: { in: candidates },
        NOT: business.type === 'restaurant' ? { id: business.id } : undefined
      },
      select: { id: true }
    }),
    prisma.store.findFirst({
      where: {
        customDomain: { in: candidates },
        NOT: business.type === 'store' ? { id: business.id } : undefined
      },
      select: { id: true }
    })
  ]);
  return Boolean(takenByRestaurant || takenByStore);
};

const stateResponse = (domain: string, state: CustomHostnameState | null, business: OwnedBusiness) => ({
  customDomain: domain,
  customDomainUrl: `https://${domain}`,
  automatic: cloudflare.isConfigured(),
  fallbackOrigin: cloudflare.fallbackOrigin(),
  status: state?.status || business.customDomainStatus || 'pending',
  sslStatus: state?.sslStatus || business.customDomainSslStatus || 'initializing',
  ready: state ? state.ready : business.customDomainVerified === true,
  // تعذّر الاتصال بـ Cloudflare لا يجوز أن يترك التاجر أمام شاشة انتظار
  // بلا سجلّ يضيفه — قيمة CNAME ثابتة عندنا ولا تحتاجهم
  records: state?.records?.length ? state.records : [buildCnameRecord(domain)],
  errors: state?.errors || (business.customDomainError ? [business.customDomainError] : []),
  checkedAt: new Date()
});

// ==================== POST /connect ====================

/**
 * يربط نطاق التاجر: يسجّله في Cloudflare ويعيد السجلّ الذي عليه إضافته.
 *
 * لا ينتظر اكتمال التحقّق — انتشار DNS يستغرق دقائق إلى ساعات، وإبقاء
 * الطلب معلّقاً طوال ذلك يعني مهلة اتصال لا نتيجة. التاجر يضيف السجلّ
 * والواجهة تسأل عن الحالة دورياً.
 */
export const connectCustomDomain = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getOwnedBusiness(req);
    if (!business) {
      res.status(404).json({ success: false, error: 'لا يوجد مطعم أو متجر مرتبط بحسابك' });
      return;
    }

    const validation = validateCustomDomain(req.body?.customDomain);
    if (!validation.valid) {
      res.status(400).json({ success: false, error: validation.error });
      return;
    }

    const domain = validation.domain;

    if (await isDomainTaken(domain, business)) {
      res.status(409).json({ success: false, error: 'هذا الدومين مستخدم بالفعل' });
      return;
    }

    // بلا ربط آلي: نرجع إلى المسار اليدوي بسجلَّي TXT و CNAME
    if (!cloudflare.isConfigured()) {
      const verificationCode = await ensureVerificationCode(business);
      const instructions = buildDnsInstructions(business.subdomain || business.slug, verificationCode, domain);
      res.status(200).json({
        success: true,
        data: {
          customDomain: domain,
          automatic: false,
          manualInstructions: instructions,
          message: 'الربط الآلي غير مُفعّل على الخادم — أضف السجلّين ثم اضغط «تحقّق».'
        }
      });
      return;
    }

    // نطاق مختلف عن المربوط سابقاً: نُنهي التسجيل القديم قبل الجديد
    if (business.customDomainHostnameId && business.customDomain !== domain) {
      await cloudflare.deleteCustomHostname(business.customDomainHostnameId);
      invalidateDomainCache(business.customDomain || undefined);
    }

    let state: CustomHostnameState;
    try {
      state = await cloudflare.ensureCustomHostname(domain);
    } catch (error: any) {
      console.error('فشل تسجيل النطاق في Cloudflare:', error);
      res.status(502).json({
        success: false,
        error: `تعذّر تسجيل النطاق: ${error?.message || 'خطأ من Cloudflare'}`
      });
      return;
    }

    await updateBusiness(business.type, business.id, {
      customDomain: domain,
      customDomainHostnameId: state.id,
      customDomainStatus: state.status,
      customDomainSslStatus: state.sslStatus,
      customDomainCheckedAt: new Date(),
      customDomainError: state.errors.length ? state.errors.join(' | ').slice(0, 1000) : null,
      // لا يُخدَم النطاق قبل صدور الشهادة
      customDomainVerified: state.ready,
      ...(state.ready ? { customDomainVerifiedAt: new Date() } : {})
    });

    invalidateDomainCache(domain);
    if (business.customDomain) invalidateDomainCache(business.customDomain);

    res.json({ success: true, data: stateResponse(domain, state, business) });
  } catch (error) {
    console.error('Error connecting custom domain:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في ربط الدومين' });
  }
};

// ==================== POST /refresh ====================

/** يسأل Cloudflare عن الحالة الآن — يستدعيه زرّ «تحديث» ودورة الواجهة */
export const refreshCustomDomain = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getOwnedBusiness(req);
    if (!business) {
      res.status(404).json({ success: false, error: 'لا يوجد مطعم أو متجر مرتبط بحسابك' });
      return;
    }
    if (!business.customDomain) {
      res.status(400).json({ success: false, error: 'لا يوجد دومين مربوط' });
      return;
    }

    const state = await syncDomainState(business);
    res.json({ success: true, data: stateResponse(business.customDomain, state, business) });
  } catch (error) {
    console.error('Error refreshing custom domain:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث حالة الدومين' });
  }
};

// ==================== POST /verify-domain (المسار اليدوي) ====================

export const verifyCustomDomain = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getOwnedBusiness(req);
    if (!business) {
      res.status(404).json({ success: false, error: 'لا يوجد مطعم أو متجر مرتبط بحسابك' });
      return;
    }

    const validation = validateCustomDomain(req.body?.customDomain);
    if (!validation.valid) {
      res.status(400).json({ success: false, error: validation.error });
      return;
    }

    const domain = validation.domain;
    const candidates = Array.from(new Set([domain, stripWww(domain), `www.${stripWww(domain)}`]));

    // الدومين محجوز من نشاط آخر؟
    const [takenByRestaurant, takenByStore] = await Promise.all([
      prisma.restaurant.findFirst({
        where: {
          customDomain: { in: candidates },
          NOT: business.type === 'restaurant' ? { id: business.id } : undefined
        },
        select: { id: true }
      }),
      prisma.store.findFirst({
        where: {
          customDomain: { in: candidates },
          NOT: business.type === 'store' ? { id: business.id } : undefined
        },
        select: { id: true }
      })
    ]);

    if (takenByRestaurant || takenByStore) {
      res.status(409).json({ success: false, error: 'هذا الدومين مستخدم بالفعل' });
      return;
    }

    const verificationCode = await ensureVerificationCode(business);
    const subdomain = business.subdomain || business.slug;

    // ✅ تحقق DNS حقيقي — لا نثق أبداً بادعاء العميل
    const dnsResult = await verifyDomainDns(domain, verificationCode, subdomain);
    const routingOk = dnsResult.cnameVerified || dnsResult.aVerified;

    if (!dnsResult.txtVerified || !routingOk) {
      const instructions = buildDnsInstructions(subdomain, verificationCode, domain);
      res.status(200).json({
        success: false,
        verified: false,
        error: !dnsResult.txtVerified
          ? 'لم يتم العثور على سجل TXT لإثبات ملكية الدومين. تأكد من إضافته وانتظر انتشار الـ DNS (قد يستغرق حتى 24 ساعة).'
          : 'سجل TXT صحيح، لكن الدومين لا يشير إلى المنصة بعد. أضف سجل CNAME المطلوب.',
        data: {
          txtVerified: dnsResult.txtVerified,
          cnameVerified: dnsResult.cnameVerified,
          aVerified: dnsResult.aVerified,
          ...instructions
        }
      });
      return;
    }

    const updated = await updateBusiness(business.type, business.id, {
      customDomain: domain,
      customDomainVerified: true,
      customDomainVerifiedAt: new Date()
    });

    invalidateDomainCache(domain);
    if (business.customDomain) invalidateDomainCache(business.customDomain);

    res.json({
      success: true,
      verified: true,
      message: 'تم التحقق من الدومين وتفعيله بنجاح',
      data: {
        customDomain: updated.customDomain,
        customDomainVerified: updated.customDomainVerified,
        customDomainVerifiedAt: updated.customDomainVerifiedAt
      }
    });
  } catch (error) {
    console.error('Error verifying custom domain:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في التحقق من الدومين' });
  }
};

// ==================== DELETE /remove-domain ====================

export const removeCustomDomain = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getOwnedBusiness(req);
    if (!business) {
      res.status(404).json({ success: false, error: 'لا يوجد مطعم أو متجر مرتبط بحسابك' });
      return;
    }

    const previous = business.customDomain;

    // بلا حذفه عندهم يبقى النطاق مسجّلاً في المنطقة إلى الأبد، ويمنع تاجراً
    // آخر من ربطه، ويُحتسب في حصّة النطاقات المخصّصة.
    if (business.customDomainHostnameId && cloudflare.isConfigured()) {
      await cloudflare.deleteCustomHostname(business.customDomainHostnameId);
    }

    await updateBusiness(business.type, business.id, {
      customDomain: null,
      customDomainVerified: false,
      customDomainVerifiedAt: null,
      customDomainHostnameId: null,
      customDomainStatus: null,
      customDomainSslStatus: null,
      customDomainCheckedAt: null,
      customDomainError: null
    });

    if (previous) invalidateDomainCache(previous);

    res.json({ success: true, message: 'تم إزالة الدومين المخصص بنجاح' });
  } catch (error) {
    console.error('Error removing custom domain:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إزالة الدومين' });
  }
};

// ==================== GET /status ====================

export const getCustomDomainStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getOwnedBusiness(req);
    if (!business) {
      res.status(404).json({ success: false, error: 'لا يوجد مطعم أو متجر مرتبط بحسابك' });
      return;
    }

    // مزامنة صامتة ما دام النطاق لم يكتمل: التاجر يفتح الصفحة لأنه ينتظر
    // نتيجة، فتحديثها عند الفتح أصدق من قيمة محفوظة قبل ساعة.
    let state: CustomHostnameState | null = null;
    if (business.customDomain && business.customDomainVerified !== true) {
      state = await syncDomainState(business);
    }

    res.json({
      success: true,
      data: {
        businessType: business.type,
        subdomain: business.subdomain,
        subdomainUrl: business.subdomain ? `https://${business.subdomain}.${env.APP_DOMAIN}` : null,
        slugUrl: `https://${env.APP_DOMAIN}/${business.slug}`,
        customDomain: business.customDomain,
        customDomainUrl: business.customDomain ? `https://${business.customDomain}` : null,
        customDomainVerified: state ? state.ready : business.customDomainVerified === true,
        customDomainVerifiedAt: business.customDomainVerifiedAt,
        verificationCode: business.customDomainVerificationCode,
        // ما تحتاجه الواجهة لتعرض «قيد التفعيل» بدل «غير موثّق»
        automatic: cloudflare.isConfigured(),
        fallbackOrigin: cloudflare.fallbackOrigin(),
        status: state?.status || business.customDomainStatus || null,
        sslStatus: state?.sslStatus || business.customDomainSslStatus || null,
        records: state?.records?.length
          ? state.records
          : business.customDomain
          ? [buildCnameRecord(business.customDomain)]
          : [],
        errors: state?.errors || (business.customDomainError ? [business.customDomainError] : []),
        checkedAt: business.customDomainCheckedAt
      }
    });
  } catch (error) {
    console.error('Error getting custom domain status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب حالة الدومين' });
  }
};

// ==================== PUT /subdomain ====================

const SUBDOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/;

export const updateSubdomain = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getOwnedBusiness(req);
    if (!business) {
      res.status(404).json({ success: false, error: 'لا يوجد مطعم أو متجر مرتبط بحسابك' });
      return;
    }

    const raw = String(req.body?.subdomain || '').trim().toLowerCase();

    if (!SUBDOMAIN_REGEX.test(raw) || raw.length < 3 || raw.length > 63) {
      res.status(400).json({
        success: false,
        error: 'الـ subdomain يجب أن يكون بين 3 و63 حرفاً، أحرف إنجليزية وأرقام وشرطات فقط'
      });
      return;
    }

    const { isReservedSubdomain } = await import('../services/domain.service');
    if (isReservedSubdomain(raw)) {
      res.status(400).json({ success: false, error: 'هذا الاسم محجوز، اختر اسماً آخر' });
      return;
    }

    const [takenByRestaurant, takenByStore] = await Promise.all([
      prisma.restaurant.findFirst({
        where: {
          OR: [{ subdomain: raw }, { slug: raw }],
          NOT: business.type === 'restaurant' ? { id: business.id } : undefined
        },
        select: { id: true }
      }),
      prisma.store.findFirst({
        where: {
          OR: [{ subdomain: raw }, { slug: raw }],
          NOT: business.type === 'store' ? { id: business.id } : undefined
        },
        select: { id: true }
      })
    ]);

    if (takenByRestaurant || takenByStore) {
      res.status(409).json({ success: false, error: 'هذا الـ subdomain مستخدم بالفعل' });
      return;
    }

    const updated = await updateBusiness(business.type, business.id, { subdomain: raw });
    invalidateDomainCache();

    res.json({
      success: true,
      message: 'تم حفظ الـ subdomain بنجاح',
      data: {
        subdomain: updated.subdomain,
        url: `https://${updated.subdomain}.${env.APP_DOMAIN}`
      }
    });
  } catch (error) {
    console.error('Error updating subdomain:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حفظ الـ subdomain' });
  }
};

/** فحص توفر الـ subdomain — يُستخدم أثناء الكتابة في الواجهة */
export const checkSubdomainAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const raw = String(req.query?.subdomain || '').trim().toLowerCase();

    if (!SUBDOMAIN_REGEX.test(raw) || raw.length < 3 || raw.length > 63) {
      res.json({ success: true, data: { available: false, reason: 'صيغة غير صالحة' } });
      return;
    }

    const { isReservedSubdomain } = await import('../services/domain.service');
    if (isReservedSubdomain(raw)) {
      res.json({ success: true, data: { available: false, reason: 'اسم محجوز' } });
      return;
    }

    const business = await getOwnedBusiness(req);

    const [restaurant, store] = await Promise.all([
      prisma.restaurant.findFirst({
        where: {
          OR: [{ subdomain: raw }, { slug: raw }],
          NOT: business?.type === 'restaurant' ? { id: business.id } : undefined
        },
        select: { id: true }
      }),
      prisma.store.findFirst({
        where: {
          OR: [{ subdomain: raw }, { slug: raw }],
          NOT: business?.type === 'store' ? { id: business.id } : undefined
        },
        select: { id: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        available: !restaurant && !store,
        reason: restaurant || store ? 'مستخدم بالفعل' : undefined,
        url: `https://${raw}.${env.APP_DOMAIN}`
      }
    });
  } catch (error) {
    console.error('Error checking subdomain availability:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في فحص التوفر' });
  }
};

export { normalizeDomain };
