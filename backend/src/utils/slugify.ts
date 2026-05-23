const slugify = (text: string): string => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')           // استبدال المسافات بـ -
      .replace(/[^\u0600-\u065F\u066A-\u06EF\u06FA-\u06FFa-zA-Z0-9-]/g, '') // إزالة الأحرف الخاصة مع دعم العربية
      .replace(/-+/g, '-');            // استبدال عدة - بواحد
  };
  
  export default slugify;