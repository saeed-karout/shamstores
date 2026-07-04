// frontend/src/pages/Admin/AdminSubscriptions.tsx

import React, { useState } from 'react';
import { IoRefresh, IoTime, IoCheckmarkCircle, IoCloseCircle, IoWarning, IoSend, IoSearch, IoBusiness, IoCalendar, IoCash, IoDiamond } from 'react-icons/io5';
import { useSubscription } from '../../hooks/useSubscription';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const C = {
  bg: '#082E24',
  card: '#112E23',
  surf: '#0F3D31',
  accent: '#C8E235',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B',
  blue: '#60A5FA',
  purple: '#A78BFA',
  yellow: '#FBBF24',
};

const AdminSubscriptions: React.FC = () => {
  const { 
    allSubscriptions, 
    expiringSubscriptions, 
    loading, 
    refreshing, 
    refreshAll,
    sendReminders,
    checkExpired
  } = useSubscription();

  const [activeTab, setActiveTab] = useState<'all' | 'expiring'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ التأكد من أن البيانات هي مصفوفات
  const subscriptionsList = Array.isArray(allSubscriptions) ? allSubscriptions : [];
  const expiringList = Array.isArray(expiringSubscriptions) ? expiringSubscriptions : [];

  // ✅ فلترة البيانات
  const filteredSubscriptions = subscriptionsList.filter(sub => {
    if (!searchTerm) return true;
    const businessName = sub.business?.name || sub.businessId || '';
    return businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           sub.planName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredExpiring = expiringList.filter(sub => {
    if (!searchTerm) return true;
    const businessName = sub.business?.name || sub.businessId || '';
    return businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           sub.planName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const displayedSubscriptions = activeTab === 'all' ? filteredSubscriptions : filteredExpiring;

  const handleRefresh = async () => {
    await refreshAll();
    toast.success('تم تحديث البيانات');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span style={{ background: `${C.accent}20`, color: C.accent, padding: '3px 10px', borderRadius: 20, fontSize: 11 }}>✅ نشط</span>;
      case 'expired':
        return <span style={{ background: `${C.red}20`, color: C.red, padding: '3px 10px', borderRadius: 20, fontSize: 11 }}>⏰ منتهي</span>;
      case 'cancelled':
        return <span style={{ background: `${C.muted}20`, color: C.muted, padding: '3px 10px', borderRadius: 20, fontSize: 11 }}>❌ ملغي</span>;
      default:
        return <span style={{ color: C.muted }}>{status}</span>;
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, marginBottom: 4 }}>📋 إدارة الاشتراكات</h1>
          <p style={{ color: C.muted, fontSize: 13 }}>مراقبة وإدارة اشتراكات المطاعم والمتاجر</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <IoRefresh size={16} /> تحديث
          </Button>
          <Button variant="primary" onClick={sendReminders}>
            <IoSend size={16} /> إرسال تذكيرات
          </Button>
          <Button variant="secondary" onClick={checkExpired}>
            <IoWarning size={16} /> إنهاء المنتهية
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 20px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: `${C.accent}20`, padding: 8, borderRadius: 10 }}>
              <IoCheckmarkCircle size={20} color={C.accent} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{subscriptionsList.filter(s => s.status === 'active').length}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>اشتراكات نشطة</div>
            </div>
          </div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 20px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: `${C.yellow}20`, padding: 8, borderRadius: 10 }}>
              <IoTime size={20} color={C.yellow} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{expiringList.length}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>تنتهي قريباً (3 أيام)</div>
            </div>
          </div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 20px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: `${C.red}20`, padding: 8, borderRadius: 10 }}>
              <IoCloseCircle size={20} color={C.red} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{subscriptionsList.filter(s => s.status === 'expired').length}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>اشتراكات منتهية</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '8px 20px',
              borderRadius: 10,
              border: 'none',
              background: activeTab === 'all' ? C.accent : C.surf,
              color: activeTab === 'all' ? C.bg : C.muted,
              cursor: 'pointer',
              fontWeight: activeTab === 'all' ? 700 : 400,
            }}
          >
            جميع الاشتراكات ({subscriptionsList.length})
          </button>
          <button
            onClick={() => setActiveTab('expiring')}
            style={{
              padding: '8px 20px',
              borderRadius: 10,
              border: 'none',
              background: activeTab === 'expiring' ? C.accent : C.surf,
              color: activeTab === 'expiring' ? C.bg : C.muted,
              cursor: 'pointer',
              fontWeight: activeTab === 'expiring' ? 700 : 400,
            }}
          >
            تنتهي قريباً ({expiringList.length})
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="بحث باسم النشاط أو الخطة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: C.surf,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              color: C.text,
              padding: '8px 36px 8px 12px',
              fontSize: 14,
              outline: 'none',
              width: 250,
            }}
          />
          <IoSearch style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
        </div>
      </div>

      {/* Subscriptions Table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
        {displayedSubscriptions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted }}>
            <IoDiamond size={48} style={{ color: C.border, marginBottom: 12 }} />
            <p>{activeTab === 'all' ? 'لا توجد اشتراكات' : 'لا توجد اشتراكات تنتهي قريباً'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.surf }}>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12 }}>النشاط التجاري</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12 }}>الخطة</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12 }}>المبلغ</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12 }}>المدة</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12 }}>تاريخ البدء</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12 }}>تاريخ الانتهاء</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12 }}>الأيام المتبقية</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12 }}>الحالة</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12 }}>التذكير</th>
                </tr>
              </thead>
              <tbody>
                {displayedSubscriptions.map((sub) => {
                  const daysRemaining = getDaysRemaining(sub.endDate);
                  const isExpired = daysRemaining < 0;
                  const isExpiring = daysRemaining >= 0 && daysRemaining <= 3;

                  return (
                    <tr key={sub.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <IoBusiness size={16} color={sub.businessType === 'restaurant' ? C.blue : C.purple} />
                          <span style={{ color: C.text }}>
                            {sub.business?.name || sub.businessId}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: C.muted }}>
                          {sub.businessType === 'restaurant' ? '🍽️ مطعم' : '🛍️ متجر'}
                          {sub.business && !sub.business.isActive && (
                            <span style={{ color: C.red, marginLeft: 6 }}>(غير نشط)</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: C.accent, fontWeight: 600 }}>{sub.planName}</td>
                      <td style={{ padding: '12px 16px', color: C.text }}>
                        {sub.totalPaid} ر.س
                        {sub.discount > 0 && (
                          <div style={{ fontSize: 10, color: C.accent }}>خصم {sub.discount}%</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: C.muted, fontSize: 13 }}>{sub.months} شهر</td>
                      <td style={{ padding: '12px 16px', color: C.muted, fontSize: 13 }}>
                        {new Date(sub.startDate).toLocaleDateString('ar-SA')}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ 
                          color: isExpired ? C.red : isExpiring ? C.yellow : C.muted
                        }}>
                          {new Date(sub.endDate).toLocaleDateString('ar-SA')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {isExpired ? (
                          <span style={{ color: C.red, fontWeight: 600 }}>منتهي</span>
                        ) : isExpiring ? (
                          <span style={{ color: C.yellow, fontWeight: 600 }}>{daysRemaining} أيام</span>
                        ) : (
                          <span style={{ color: C.muted }}>{daysRemaining} يوم</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>{getStatusBadge(sub.status)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {sub.reminderSent ? (
                          <span style={{ color: C.accent, fontSize: 12 }}>✓ تم الإرسال</span>
                        ) : (
                          <span style={{ color: C.muted, fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSubscriptions;