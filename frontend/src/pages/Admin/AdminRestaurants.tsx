// pages/Admin/AdminRestaurants.tsx — القائمة المشتركة (`AdminBusinessList`)
import React from 'react';
import AdminBusinessList from '@/components/admin/AdminBusinessList';

const AdminRestaurants: React.FC = () => <AdminBusinessList kind="restaurant" />;

export default AdminRestaurants;
