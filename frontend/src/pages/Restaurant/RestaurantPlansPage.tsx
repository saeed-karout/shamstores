// frontend/src/pages/Restaurant/RestaurantPlansPage.tsx
//
// الخطط في لوحة المطعم — العرض كلّه في components/plans/MerchantPlansView
// (مشترك مع المتجر ومع مقارنة الصفحة الرئيسية).

import React from 'react';
import MerchantPlansView from '@/components/plans/MerchantPlansView';

const RestaurantPlansPage: React.FC = () => <MerchantPlansView kind="restaurant" />;

export default RestaurantPlansPage;
