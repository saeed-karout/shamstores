// backend/src/utils/logger.ts
// السجلات المطوّلة في الإنتاج كانت تطبع حمولات التوكن وبيانات المستخدمين.
// هنا نُسكت console.log/debug/info في الإنتاج مع إبقاء التحذيرات والأخطاء.

import { isProduction } from '../config/env';

const VERBOSE = process.env.VERBOSE_LOGS === 'true';

export const configureLogging = (): void => {
  if (!isProduction || VERBOSE) return;

  const noop = () => undefined;
  console.log = noop;
  console.debug = noop;
  console.info = noop;
  // console.warn و console.error يبقيان — نحتاجهما للتشخيص
};

export default configureLogging;
