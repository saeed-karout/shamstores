// pages/PublicMenu.tsx

import React from 'react';
import RestaurantPublicMenu from '@/pages/Restaurant/RestaurantPublicMenu';
import StorePublicMenu from '@/pages/Store/StorePublicMenu';
import Loader from '../components/common/Loader';

interface PublicMenuProps {
  businessId?: string;
  businessName?: string;
  businessSlug?: string;
  businessSubdomain?: string;
  businessLogo?: string;
  businessCoverImage?: string;
  businessDescription?: string;
  businessPhone?: string;
  businessWhatsapp?: string;
  businessPrimaryColor?: string;
  businessSecondaryColor?: string;
  businessType?: 'restaurant' | 'store';
}

const PublicMenu: React.FC<PublicMenuProps> = (props) => {
  const { businessType, businessId, businessName } = props;
  
  // عرض شاشة تحميل إذا لم تكن البيانات جاهزة
  if (!businessId || !businessName) {
    return <Loader fullScreen />;
  }
  
  // اختيار المكون المناسب حسب النوع
  if (businessType === 'store') {
    return <StorePublicMenu {...props} />;
  }
  
  // افتراضياً مطعم
  return <RestaurantPublicMenu {...props} />;
};

export default PublicMenu;