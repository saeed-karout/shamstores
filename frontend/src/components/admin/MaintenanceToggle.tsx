// frontend/src/components/admin/MaintenanceToggle.tsx

import React, { useState, useEffect } from 'react';
import { IoConstruct, IoCheckmarkCircle, IoWarning, IoRefresh } from 'react-icons/io5';
import api from '../../services/api';
import toast from 'react-hot-toast';

const MaintenanceToggle: React.FC = () => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceMessageEn, setMaintenanceMessageEn] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMaintenanceSettings();
  }, []);

  const fetchMaintenanceSettings = async () => {
    try {
      const [modeRes, messageRes, messageEnRes] = await Promise.all([
        api.get('/platform-settings/maintenance_mode'),
        api.get('/platform-settings/maintenance_message'),
        api.get('/platform-settings/maintenance_message_en')
      ]);
      
      setMaintenanceMode(modeRes.data?.value === 'true');
      setMaintenanceMessage(messageRes.data?.value || 'نعمل على تحسين المنصة، نعتذر عن الإزعاج');
      setMaintenanceMessageEn(messageEnRes.data?.value || 'We are improving the platform, sorry for the inconvenience');
    } catch (error) {
      console.error('Error fetching maintenance settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMaintenance = async () => {
    setSaving(true);
    try {
      const newMode = !maintenanceMode;
      await api.put('/platform-settings/maintenance_mode', { value: newMode });
      setMaintenanceMode(newMode);
      
      toast.success(newMode ? 'تم تفعيل وضع الصيانة' : 'تم إيقاف وضع الصيانة');
      
      // تحديث رسالة الصيانة إذا كانت موجودة
      if (maintenanceMessage) {
        await api.put('/platform-settings/maintenance_message', { value: maintenanceMessage });
      }
      if (maintenanceMessageEn) {
        await api.put('/platform-settings/maintenance_message_en', { value: maintenanceMessageEn });
      }
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      toast.error('حدث خطأ في تغيير حالة وضع الصيانة');
    } finally {
      setSaving(false);
    }
  };

  const saveMessages = async () => {
    setSaving(true);
    try {
      await api.put('/platform-settings/maintenance_message', { value: maintenanceMessage });
      await api.put('/platform-settings/maintenance_message_en', { value: maintenanceMessageEn });
      toast.success('تم حفظ رسائل الصيانة بنجاح');
    } catch (error) {
      console.error('Error saving messages:', error);
      toast.error('حدث خطأ في حفظ الرسائل');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-emerald-500/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${maintenanceMode ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
            {maintenanceMode ? (
              <IoWarning className="text-red-500 text-2xl" />
            ) : (
              <IoConstruct className="text-emerald-500 text-2xl" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">وضع الصيانة</h3>
            <p className="text-slate-400 text-sm">
              {maintenanceMode 
                ? 'المنصة حالياً في وضع الصيانة. الزوار يرون رسالة الصيانة.' 
                : 'المنصة تعمل بشكل طبيعي. يمكنك تفعيل وضع الصيانة عند الحاجة.'}
            </p>
          </div>
        </div>
        
        <button
          onClick={toggleMaintenance}
          disabled={saving}
          className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none ${
            maintenanceMode ? 'bg-red-600' : 'bg-emerald-600'
          } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
              maintenanceMode ? 'translate-x-9' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {maintenanceMode && (
        <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <p className="text-yellow-500 text-sm mb-3 flex items-center gap-2">
            <IoWarning className="text-lg" />
            المنصة حالياً في وضع الصيانة. المستخدمون يرون رسالة الصيانة التالية:
          </p>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">رسالة الصيانة (عربي)</label>
              <textarea
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white"
                rows={2}
                placeholder="نعمل على تحسين المنصة، نعتذر عن الإزعاج"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Maintenance Message (English)</label>
              <textarea
                value={maintenanceMessageEn}
                onChange={(e) => setMaintenanceMessageEn(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white"
                rows={2}
                placeholder="We are improving the platform, sorry for the inconvenience"
              />
            </div>
            
            <button
              onClick={saveMessages}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <IoCheckmarkCircle className="text-lg" />
              )}
              حفظ الرسائل
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-slate-500 flex items-center gap-4">
        <button
          onClick={fetchMaintenanceSettings}
          className="flex items-center gap-1 hover:text-slate-300 transition"
        >
          <IoRefresh className="text-sm" />
          تحديث
        </button>
        {maintenanceMode && (
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            وضع الصيانة مفعل
          </span>
        )}
      </div>
    </div>
  );
};

export default MaintenanceToggle;