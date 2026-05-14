import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CartItem } from '../services/types';

export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadCart = () => {
      try {
        const savedCart = localStorage.getItem('cart');
        console.log('Loading cart from localStorage:', savedCart);
        
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          const validatedCart = parsedCart.map((item: any) => ({
            ...item,
            originalPrice: Number(item.price) || 0,
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 1
          }));
          console.log('Validated cart:', validatedCart);
          setCart(validatedCart);
        }
      } catch (error) {
        console.error('Error loading cart:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadCart();
  }, []);

  useEffect(() => {
    if (isInitialized) {
      console.log('Saving cart to localStorage:', cart);
      localStorage.setItem('cart', JSON.stringify(cart));
    }
  }, [cart, isInitialized]);

  const addToCart = (item: CartItem) => {
    const validItem = {
      ...item,
      originalPrice: Number(item.originalPrice) || 0,
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1
    };

    setCart(prev => {
      const existing = prev.find(i => 
        i.id === item.id && i.size === item.size
      );
      
      if (existing) {
        return prev.map(i => 
          i.id === item.id && i.size === item.size
            ? { ...i, quantity: i.quantity + validItem.quantity }
            : i
        );
      }
      return [...prev, validItem];
    });
    
    toast.success('✅ تمت الإضافة إلى السلة');
  };

  const removeFromCart = (itemId: string, size?: string) => {
    setCart(prev => prev.filter(i => !(i.id === itemId && i.size === size)));
    toast.success('تمت الإزالة من السلة');
  };

  const updateQuantity = (itemId: string, quantity: number, size?: string) => {
    if (quantity < 1) {
      removeFromCart(itemId, size);
      return;
    }
    setCart(prev => prev.map(i => 
      i.id === itemId && i.size === size ? { ...i, quantity } : i
    ));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('cart');
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