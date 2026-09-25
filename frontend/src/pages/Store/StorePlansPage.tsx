// frontend/src/pages/Store/StorePlansPage.tsx
//
// الخطط في لوحة المتجر — العرض كلّه في components/plans/MerchantPlansView
// (مشترك مع المطعم ومع مقارنة الصفحة الرئيسية).

import React from 'react';
import MerchantPlansView from '@/components/plans/MerchantPlansView';

const StorePlansPage: React.FC = () => <MerchantPlansView kind="store" />;

export default StorePlansPage;
