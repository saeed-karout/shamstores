// frontend/src/components/SEOHead.tsx
import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { platformSettingsApi } from '@/services/api/platformSettings.service';

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

const SEOHead = ({ title, description, image, url, type }: SEOHeadProps) => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSEOSettings = async () => {
      try {
        // جلب إعدادات SEO العامة من API
        const response = await platformSettingsApi.getPublic();
        setSettings(response.data);
      } catch (error) {
        console.error('Error fetching SEO settings:', error);
        // استخدام القيم الافتراضية في حالة الخطأ
        setSettings({
          seo_title: 'شام ستورز',
          seo_description: 'الحل الرقمي المتكامل للمطاعم والمتاجر',
          seo_keywords: 'قائمة رقمية, منيو مطعم, طلبات اونلاين',
          seo_author: 'Sham Stores',
          seo_robots: 'index, follow',
          og_title: 'شام ستورز',
          og_description: 'الحل الرقمي المتكامل للمطاعم والمتاجر',
          og_type: 'website',
          twitter_card: 'summary_large_image',
          twitter_title: 'شام ستورز',
          twitter_description: 'الحل الرقمي المتكامل للمطاعم والمتاجر',
          schema_org_type: 'SoftwareApplication',
          schema_org_name: 'شام ستورز',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSEOSettings();
  }, []);

  if (loading) {
    return null;
  }

  const seoTitle = title || settings?.seo_title || 'شام ستورز';
  const seoDescription = description || settings?.seo_description || '';
  const seoImage = image || settings?.og_image || '/og-image.jpg';
  const seoUrl = url || window.location.href;
  const seoType = type || settings?.og_type || 'website';

  return (
    <Helmet>
      {/* Basic SEO */}
      <title>{seoTitle}</title>
      <meta name="title" content={seoTitle} />
      <meta name="description" content={seoDescription} />
      <meta name="keywords" content={settings?.seo_keywords} />
      <meta name="author" content={settings?.seo_author || 'Sham Stores'} />
      <meta name="robots" content={settings?.seo_robots || 'index, follow'} />
      <link rel="canonical" href={settings?.seo_canonical_url || seoUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={seoType} />
      <meta property="og:url" content={seoUrl} />
      <meta property="og:title" content={settings?.og_title || seoTitle} />
      <meta property="og:description" content={settings?.og_description || seoDescription} />
      <meta property="og:image" content={seoImage} />

      {/* Twitter */}
      <meta property="twitter:card" content={settings?.twitter_card || 'summary_large_image'} />
      <meta property="twitter:url" content={seoUrl} />
      <meta property="twitter:title" content={settings?.twitter_title || seoTitle} />
      <meta property="twitter:description" content={settings?.twitter_description || seoDescription} />
      <meta property="twitter:image" content={seoImage} />

      {/* Schema.org结构化数据 */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": settings?.schema_org_type || "SoftwareApplication",
          "name": settings?.schema_org_name || "شام ستورز",
          "description": settings?.schema_org_description || seoDescription,
          ...(settings?.schema_org_rating_value && {
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": settings.schema_org_rating_value,
              "ratingCount": settings.schema_org_rating_count || "1250"
            }
          })
        })}
      </script>

      {/* Geo Tags */}
      {settings?.geo_region && <meta name="geo.region" content={settings.geo_region} />}
      {settings?.geo_placename && <meta name="geo.placename" content={settings.geo_placename} />}
      {settings?.geo_position && <meta name="geo.position" content={settings.geo_position} />}
      {settings?.icbm && <meta name="ICBM" content={settings.icbm} />}
    </Helmet>
  );
};

export default SEOHead;