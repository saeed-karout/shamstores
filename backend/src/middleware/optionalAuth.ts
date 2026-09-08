// backend/src/middleware/optionalAuth.ts
//
// مصادقةٌ اختيارية: تملأ `req.user` إن وُجد رمزٌ صالح، وتمرّ بلا اعتراض إن
// لم يوجد.
//
// **لماذا نحتاجها:** مسارات الزبون في واجهة المتجر يستعملها الطرفان —
// زبونٌ مسجّل وضيفٌ بلا حساب. و`authenticate` ترتدّ بـ401 على الضيف، فكانت
// كل ميزةٍ خلفها (الاشتراك في التنبيهات، حفظ السلّة) حكراً على المسجّلين —
// وهم أقلّية ضئيلة من زبائن المتاجر.
//
// **ولماذا لا نكتفي بـ`try/catch` حول `authenticate`:** تلك تكتب الاستجابة
// بنفسها (`res.status(401)`) قبل أن يصل التحكّم إلى أي معالج، فلا سبيل
// لتجاهل رفضها بعد وقوعه.

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyToken } from '../config/auth';
import prisma from './../services/prisma';

export const optionalAuthenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    if (!token) return next();

    const decoded = verifyToken(token);
    if (!decoded) return next();

    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        role: true,
        isActive: true,
        permissions: true,
        restaurantId: true,
        storeId: true
      }
    });

    // حسابٌ محذوف أو معطّل يُعامَل **ضيفاً** لا مرفوضاً: الغرض من هذه
    // الوسيطة ألّا يُمنع أحد، والرمز القديم في متصفّح زبونٍ لا يجوز أن
    // يمنعه من الشراء
    if (!dbUser || dbUser.isActive === false) return next();

    req.user = {
      ...decoded,
      id: dbUser.id,
      role: dbUser.role || decoded.role,
      restaurantId: dbUser.restaurantId ?? undefined,
      storeId: dbUser.storeId ?? undefined,
      permissions: (dbUser.permissions as any) || decoded.permissions
    };

    next();
  } catch (error) {
    // الفشل يعني «ضيف» لا «خطأ»: رمزٌ تالف أو قاعدةٌ بطيئة لا يجوز أن
    // يمنعا زائراً من تصفّح متجر
    console.warn('optionalAuthenticate ignored a bad token:', error instanceof Error ? error.message : error);
    next();
  }
};

export default optionalAuthenticate;
