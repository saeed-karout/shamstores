// backend/src/utils/orderStatus.ts
//
// أسماء حالات الطلب بالعربية — لكلّ نصٍّ يقرؤه إنسان (إشعار، ملفّ تصدير).
// كانت الإشعارات تقول «الطلب ORD-12: preparing» للتاجر.

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكَّد',
  processing: 'قيد التجهيز',
  preparing: 'قيد التجهيز',
  ready: 'جاهز',
  shipped: 'في الطريق',
  delivering: 'في الطريق',
  delivered: 'تمّ التسليم',
  served: 'مكتمل',
  cancelled: 'ملغي'
};

export const orderStatusLabel = (status: string | null | undefined): string =>
  (status && ORDER_STATUS_LABEL[status]) || String(status ?? '');
