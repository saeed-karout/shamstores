// frontend/src/components/orders/OrderPrintActions.tsx
//
// زرّا «طباعة الفاتورة» و«بوليصة الشحن» في تفاصيل الطلب.
//
// البوليصة للطلبات التي تُشحن أو تُوصَّل وحدها: طاولةٌ في المطعم أو استلامٌ من
// المحل لا ملصق لها، وزرٌّ لا ينطبق يُربك من يجهّز الطلب على عجل.

import React from 'react';
import { IoPrintOutline, IoPricetagOutline } from 'react-icons/io5';
import { useBusinessSummary } from '@/hooks/useBusinessSummary';
import { printInvoice, printShippingLabel, PrintableOrder } from '@/utils/printOrder';

const OrderPrintActions: React.FC<{ order: PrintableOrder }> = ({ order }) => {
  const { data: business } = useBusinessSummary();
  const shippable = !order.orderType || order.orderType === 'delivery';
  const info = {
    name: business?.name || 'متجرنا',
    logo: business?.logo,
    phone: business?.phone,
    address: business?.address,
    publicUrl: business?.publicUrl,
    currency: business?.currency
  };

  const button: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    minHeight: 38,
    padding: '0 14px',
    borderRadius: 10,
    border: '1px solid rgba(8,72,53,0.18)',
    background: '#FFFFFF',
    color: '#084835',
    fontSize: 13,
    fontWeight: 800,
    fontFamily: 'inherit',
    cursor: 'pointer'
  };

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
      <button type="button" style={button} onClick={() => printInvoice(order, info)}>
        <IoPrintOutline size={16} /> طباعة الفاتورة
      </button>
      {shippable && (
        <button type="button" style={button} onClick={() => printShippingLabel(order, info)}>
          <IoPricetagOutline size={16} /> بوليصة الشحن
        </button>
      )}
    </div>
  );
};

export default OrderPrintActions;
