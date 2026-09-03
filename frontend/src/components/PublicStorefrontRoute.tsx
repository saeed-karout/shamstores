// frontend/src/components/PublicStorefrontRoute.tsx
//
// واجهة المتجر عند الوصول عبر الدومين الرئيسي: shamstores.com/<slug>
//
// كان هذا المسار مفقوداً تماماً في App.tsx رغم أن مولّد رموز QR يعود إليه
// كرابط افتراضي عندما لا يوجد subdomain أو دومين مخصص — فكان الزائر يرى 404.

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PublicMenu from '@/pages/PublicMenu';
import StorefrontSkeleton from '@/components/storefront/StorefrontSkeleton';
import api from '@/services/api';
import { sf } from '@/utils/storefrontTheme';

interface BusinessData {
  id: string;
  name: string;
  slug: string;
  subdomain?: string;
  type: 'restaurant' | 'store';
  logo?: string;
  coverImage?: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

const PublicStorefrontRoute: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!slug) {
        setError('رابط غير صالح');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response: any = await api.get(`/public/${encodeURIComponent(slug)}`);
        const data = response?.data || response;

        if (cancelled) return;

        if (!data?.id) throw new Error('not-found');

        setBusiness({
          id: data.id,
          name: data.name,
          slug: data.slug,
          subdomain: data.subdomain,
          type: data.type,
          logo: data.logo,
          coverImage: data.coverImage,
          description: data.description,
          phone: data.phone,
          whatsapp: data.whatsapp,
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor
        });
      } catch {
        if (!cancelled) setError('لم نعثر على هذا المتجر');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) return <StorefrontSkeleton />;

  if (error || !business) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          textAlign: 'center',
          background: sf.bg,
          color: sf.text,
          fontFamily: sf.font
        }}
      >
        <div style={{ maxWidth: 380 }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>🏪</div>
          <h1 style={{ fontSize: 19, fontWeight: 800, marginBottom: 8 }}>{error}</h1>
          <p style={{ color: sf.muted, fontSize: 13.5, lineHeight: 1.9, marginBottom: 20 }}>
            تأكد من صحة الرابط، أو عد إلى الصفحة الرئيسية.
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '11px 22px',
              borderRadius: 12,
              background: sf.accent,
              color: sf.onAccent,
              fontWeight: 800,
              fontSize: 13.5,
              textDecoration: 'none'
            }}
          >
            الصفحة الرئيسية
          </a>
        </div>
      </div>
    );
  }

  return (
    <PublicMenu
      businessId={business.id}
      businessName={business.name}
      businessSlug={business.slug}
      businessSubdomain={business.subdomain}
      businessType={business.type}
      businessLogo={business.logo}
      businessCoverImage={business.coverImage}
      businessDescription={business.description}
      businessPhone={business.phone}
      businessWhatsapp={business.whatsapp}
      businessPrimaryColor={business.primaryColor}
      businessSecondaryColor={business.secondaryColor}
    />
  );
};

export default PublicStorefrontRoute;
