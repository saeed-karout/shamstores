// components/CartItem.tsx

import React from 'react';
import { IoRestaurant, IoClose } from 'react-icons/io5';
import { getImageUrl } from '@/utils/imageHelpers';

interface CartItemProps {
  item: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    size?: string;
  };
  onUpdateQuantity: (id: string, quantity: number, size?: string) => void;
  onRemove: (id: string, size?: string) => void;
}

const CartItem: React.FC<CartItemProps> = ({ item, onUpdateQuantity, onRemove }) => {
  return (
    <div className="flex items-center gap-4 py-4 border-b last:border-0">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden">
        {item.image ? (
          <img 
            src={getImageUrl(item.image)}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <IoRestaurant className="text-2xl text-gray-400" />
          </div>
        )}
      </div>

      <div className="flex-1">
        <h4 className="font-bold">{item.name}</h4>
        <p className="text-sm text-gray-500">{item.price} ل.س</p>
        {item.size && <p className="text-xs text-gray-400">المقاس: {item.size}</p>}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1, item.size)}
          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          -
        </button>
        <span className="w-8 text-center font-bold">{item.quantity}</span>
        <button
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1, item.size)}
          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          +
        </button>
        <button
          onClick={() => onRemove(item.id, item.size)}
          className="w-8 h-8 rounded-full bg-red-100 text-red-500 hover:bg-red-200 flex items-center justify-center transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default CartItem;