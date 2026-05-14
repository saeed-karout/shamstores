import toast from "react-hot-toast";

/**
 * فتح محادثة واتساب
 * @param phoneNumber - رقم الهاتف
 * @param message - الرسالة الافتراضية (اختياري)
 * @returns boolean - هل تم الفتح بنجاح
 */
export const openWhatsApp = (phoneNumber?: string, message?: string): boolean => {
    if (!phoneNumber) {
      console.warn('رقم واتساب غير موجود');
      toast.error('رقم واتساب غير متوفر');
      return false;
    }
    
    try {
      // تنظيف رقم الهاتف من الرموز
      let cleanNumber = phoneNumber.replace(/\D/g, '');
      
      if (!cleanNumber) {
        toast.error('رقم واتساب غير صالح');
        return false;
      }
      
      // إزالة الصفر الأول إذا كان موجوداً (للأرقام الدولية)
      if (cleanNumber.startsWith('0')) {
        cleanNumber = cleanNumber.substring(1);
      }
      
      // التأكد من وجود رمز البلد
      if (!cleanNumber.startsWith('963') && !cleanNumber.startsWith('966') && !cleanNumber.startsWith('965')) {
        // افتراضياً نستخدم رمز السعودية إذا كان الرقم يبدأ بـ 5
        if (cleanNumber.startsWith('5')) {
          cleanNumber = '966' + cleanNumber;
        } 
        // أو رمز سوريا إذا كان يبدأ بـ 9
        else if (cleanNumber.startsWith('9')) {
          cleanNumber = '963' + cleanNumber;
        }
      }
      
      const whatsappUrl = `https://wa.me/${cleanNumber}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
      window.open(whatsappUrl, '_blank');
      return true;
    } catch (error) {
      console.error('خطأ في فتح واتساب:', error);
      toast.error('حدث خطأ في فتح واتساب');
      return false;
    }
  };