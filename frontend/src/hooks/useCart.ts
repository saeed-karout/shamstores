import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CartItem } from '../services/types';

const LEGACY_KEY = 'cart';
const keyFor = (scope: string) => `cart:${scope}`;

/**
 * سلّة لكلّ نشاط.
 *
 * كانت مفتاحاً واحداً `cart` للمنصّة كلّها: زبونٌ أضاف ساعةً من متجرٍ ثم
 * فتح مطعماً يجد الساعة في سلّة المطعم، ويُرسلها معه فيرفضها الخادم (ليست
 * من أصنافه) أو يضيع الطلب. `scope` معرّف النشاط؛ قبل معرفته السلّة فارغة
 * ولا تُحفظ، كي لا تُكتب سلّةٌ فارغة فوق سلّة النشاط قبل تحميلها.
 */
export const useCart = (scope?: string | null) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setIsInitialized(false);
    setCart([]);
    if (!scope) return;
    try {
      // السلّة المشتركة القديمة لا يُعرف لأيّ نشاطٍ أصنافها — تُترك
      localStorage.removeItem(LEGACY_KEY);
      const savedCart = localStorage.getItem(keyFor(scope));
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart)) {
          setCart(
            parsedCart.map((item: any) => ({
              ...item,
              // كان يُستبدل بالسعر النهائي عند كلّ تحميل، فيضيع السعر قبل الخصم
              originalPrice: Number(item.originalPrice ?? item.price) || 0,
              price: Number(item.price) || 0,
              quantity: Number(item.quantity) || 1
            }))
          );
        }
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setIsInitialized(true);
    }
  }, [scope]);

  useEffect(() => {
    if (!isInitialized || !scope) return;
    try {
      if (cart.length === 0) localStorage.removeItem(keyFor(scope));
      else localStorage.setItem(keyFor(scope), JSON.stringify(cart));
    } catch {
      // التخزين ممنوع (تصفّح خاصّ) — السلّة تعمل في الذاكرة
    }
  }, [cart, isInitialized, scope]);

  /**
   * هوية سطر السلة.
   *
   * كان التمييز بـ (id, size) وحدهما، فقميصان بنفس المقاس ولونين مختلفين
   * يندمجان في سطر واحد — ويصل التاجر طلبٌ بلون واحد.
   */
  const lineKey = (item: Pick<CartItem, 'id' | 'size' | 'addons'>) =>
    `${item.id}::${item.size || ''}::${(item.addons || []).slice().sort().join('|')}`;

  const addToCart = (item: CartItem) => {
    const validItem = {
      ...item,
      originalPrice: Number(item.originalPrice) || 0,
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1
    };

    setCart(prev => {
      const key = lineKey(validItem);
      const existing = prev.find(i => lineKey(i) === key);

      if (existing) {
        return prev.map(i =>
          lineKey(i) === key
            ? { ...i, quantity: i.quantity + validItem.quantity }
            : i
        );
      }
      return [...prev, validItem];
    });
    
    toast.success('✅ تمت الإضافة إلى السلة');
  };

  // `addons` اختياري في التوقيع كي لا تتغيّر النداءات القائمة: بلا تمريره
  // يُطابَق السطر بالمعرّف والمقاس كما كان.
  const removeFromCart = (itemId: string, size?: string, addons?: string[]) => {
    const key = lineKey({ id: itemId, size, addons });
    setCart(prev =>
      prev.filter(i => (addons === undefined ? !(i.id === itemId && i.size === size) : lineKey(i) !== key))
    );
    toast.success('تمت الإزالة من السلة');
  };

  const updateQuantity = (itemId: string, quantity: number, size?: string, addons?: string[]) => {
    if (quantity < 1) {
      removeFromCart(itemId, size, addons);
      return;
    }
    const key = lineKey({ id: itemId, size, addons });
    setCart(prev =>
      prev.map(i => {
        const match = addons === undefined ? i.id === itemId && i.size === size : lineKey(i) === key;
        return match ? { ...i, quantity } : i;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    toast.success('تم إفراغ السلة');
  };

  const getCartSubtotal = () => {
    return cart.reduce((sum, item) => {
      // originalPrice هو السعر الأصلي للحسابات (قبل أي خصم)
      const itemPrice = Number(item.originalPrice) || 0;
      const itemQuantity = Number(item.quantity) || 0;
      return sum + (itemPrice * itemQuantity);
    }, 0);
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => {
      // price هو السعر النهائي بعد الخصم
      const itemPrice = Number(item.price) || 0;
      const itemQuantity = Number(item.quantity) || 0;
      return sum + (itemPrice * itemQuantity);
    }, 0);
  };

  const getCartCount = () => {
    return cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  };

  const formatPrice = (price: number) => {
    if (isNaN(price) || price === null || price === undefined) return '0';
    return price.toLocaleString('ar-SY');
  };

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartSubtotal,
    getCartTotal,
    getCartCount,
    formatPrice,
    isInitialized
  };
};