// pages/Admin/AdminDrivers.tsx

import React, { useEffect, useState } from 'react';
import { IoSearch, IoTrash, IoEye, IoCar } from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';

interface Driver {
    id: string;
    name: string;
    email: string;
    phone: string;
    isActive: boolean;
    restaurant?: { name: string };
    store?: { name: string };
    lastLocationLat?: number;
    lastLocationLng?: number;
    lastLocationUpdate?: string;
    createdAt: string;
}

const AdminDrivers: React.FC = () => {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchDrivers();
    }, []);

    const fetchDrivers = async () => {
        try {
            const response = await api.get('/admin/drivers');
            setDrivers(response.drivers);
        } catch (error) {
            console.error('Error fetching drivers:', error);
            toast.error('فشل تحميل السائقين');
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await api.patch(`/admin/drivers/${id}/toggle`);
            toast.success(currentStatus ? 'تم تعطيل السائق' : 'تم تفعيل السائق');
            fetchDrivers();
        } catch (error) {
            toast.error('فشل تغيير حالة السائق');
        }
    };

    const filteredDrivers = drivers.filter(driver =>
        driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <Loader fullScreen />;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">إدارة السائقين</h1>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="بحث..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <IoSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3 px-4 text-right">#</th>
                                <th className="py-3 px-4 text-right">الاسم</th>
                                <th className="py-3 px-4 text-right">البريد الإلكتروني</th>
                                <th className="py-3 px-4 text-right">رقم الهاتف</th>
                                <th className="py-3 px-4 text-right">مرتبط بـ</th>
                                <th className="py-3 px-4 text-right">الموقع</th>
                                <th className="py-3 px-4 text-right">الحالة</th>
                                <th className="py-3 px-4 text-right">تاريخ التسجيل</th>
                                <th className="py-3 px-4 text-right">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDrivers.map((driver, index) => (
                                <tr key={driver.id} className="border-t hover:bg-gray-50">
                                    <td className="py-3 px-4">{index + 1}</td>
                                    <td className="py-3 px-4 font-medium">{driver.name}</td>
                                    <td className="py-3 px-4">{driver.email}</td>
                                    <td className="py-3 px-4">{driver.phone || '-'}</td>
                                    <td className="py-3 px-4">
                                        {driver.restaurant?.name || driver.store?.name || '-'}
                                    </td>
                                    <td className="py-3 px-4">
                                        {driver.lastLocationLat && driver.lastLocationLng ? (
                                            <span className="text-xs text-green-600">متصل</span>
                                        ) : (
                                            <span className="text-xs text-gray-400">غير متاح</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        <button
                                            onClick={() => toggleStatus(driver.id, driver.isActive)}
                                            className={`px-2 py-1 rounded-full text-xs ${driver.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}
                                        >
                                            {driver.isActive ? 'نشط' : 'غير نشط'}
                                        </button>
                                    </td>
                                    <td className="py-3 px-4 text-sm">
                                        {new Date(driver.createdAt).toLocaleDateString('ar-SA')}
                                    </td>
                                    <td className="py-3 px-4">
                                        <button className="p-1 text-blue-500 hover:text-blue-700">
                                            <IoEye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDrivers;