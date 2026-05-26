// frontend/src/components/public/PublicFooter.tsx

import React from 'react';
import { 
  IoLogoFacebook, 
  IoLogoInstagram, 
  IoLogoWhatsapp, 
  IoLogoTwitter, 
  IoLogoYoutube,
  IoCall, 
  IoMail, 
  IoLocation, 
  IoTime, 
  IoArrowUp,
  IoStorefront,
  IoRestaurant,
  IoCart,
  IoHeart,
  IoInformationCircle,
  IoHelpBuoy,
  IoDocumentText,
  IoLockClosed
} from 'react-icons/io5';
import { Link } from 'react-router-dom';

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  whatsapp?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
}

interface ContactInfo {
  phone?: string;
  email?: string;
  address?: string;
  openingHours?: string;
}

interface PublicFooterProps {
  businessName: string;
  businessType: 'restaurant' | 'store';
  businessLogo?: string;
  businessSlug?: string;
  description?: string;
  socialLinks?: SocialLinks;
  contactInfo?: ContactInfo;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  mutedColor?: string;
  accentColor?: string;
  showNewsletter?: boolean;
  showQuickLinks?: boolean;
  year?: number;
}

const PublicFooter: React.FC<PublicFooterProps> = ({
  businessName,
  businessType,
  businessLogo,
  businessSlug,
  description,
  socialLinks = {},
  contactInfo = {},
  primaryColor = '#C8E235',
  secondaryColor = '#10B981',
  backgroundColor = '#0F3D31',
  textColor = '#E8F5E9',
  mutedColor = '#9DC4AC',
  accentColor = '#C8E235',
  showNewsletter = false,
  showQuickLinks = true,
  year = new Date().getFullYear()
}) => {
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // روابط سريعة حسب نوع النشاط التجاري
  const quickLinks = businessType === 'restaurant' ? [
    { name: 'القائمة', path: `/${businessSlug}/menu` },
    { name: 'الطلبات', path: '/my-orders' },
    { name: 'المفضلة', path: '/favorites' },
    { name: 'تواصل معنا', path: `/${businessSlug}/contact` },
  ] : [
    { name: 'المنتجات', path: `/${businessSlug}/products` },
    { name: 'الطلبات', path: '/my-orders' },
    { name: 'المفضلة', path: '/favorites' },
    { name: 'تواصل معنا', path: `/${businessSlug}/contact` },
  ];

  const infoLinks = [
    { name: 'عن الشركة', path: '/about' },
    { name: 'سياسة الخصوصية', path: '/privacy' },
    { name: 'الشروط والأحكام', path: '/terms' },
    { name: 'الأسئلة الشائعة', path: '/faq' },
  ];

  const socialIcons: Record<string, { icon: JSX.Element; color: string }> = {
    facebook: { icon: <IoLogoFacebook size={20} />, color: '#1877F2' },
    instagram: { icon: <IoLogoInstagram size={20} />, color: '#E4405F' },
    whatsapp: { icon: <IoLogoWhatsapp size={20} />, color: '#25D366' },
    twitter: { icon: <IoLogoTwitter size={20} />, color: '#1DA1F2' },
    youtube: { icon: <IoLogoYoutube size={20} />, color: '#FF0000' },
    tiktok: { icon: <IoLogoInstagram size={20} />, color: '#000000' },
  };

  const styles = {
    footer: {
      background: backgroundColor,
      color: textColor,
      marginTop: 'auto',
      fontFamily: 'Cairo, sans-serif',
      direction: 'rtl' as const,
    },
    container: {
      maxWidth: 1280,
      margin: '0 auto',
      padding: '48px 24px 24px',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: 32,
      marginBottom: 32,
    },
    section: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 16,
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    },
    logoImage: {
      width: 48,
      height: 48,
      borderRadius: 12,
      objectFit: 'cover' as const,
    },
    logoText: {
      fontSize: 20,
      fontWeight: 800,
      color: primaryColor,
    },
    description: {
      fontSize: 14,
      lineHeight: 1.6,
      color: mutedColor,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 700,
      marginBottom: 8,
      position: 'relative' as const,
      paddingBottom: 12,
      borderBottom: `2px solid ${primaryColor}`,
      display: 'inline-block',
    },
    contactItem: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontSize: 14,
      color: mutedColor,
    },
    contactIcon: {
      width: 32,
      height: 32,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `${primaryColor}15`,
      borderRadius: '50%',
      color: primaryColor,
    },
    link: {
      display: 'block',
      color: mutedColor,
      textDecoration: 'none',
      fontSize: 14,
      padding: '6px 0',
      transition: 'all 0.2s',
    },
    socialLinks: {
      display: 'flex',
      gap: 12,
      flexWrap: 'wrap' as const,
    },
    socialIcon: {
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `${primaryColor}10`,
      borderRadius: '50%',
      transition: 'all 0.2s',
      cursor: 'pointer',
      textDecoration: 'none',
    },
    newsletter: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 12,
    },
    newsletterInput: {
      display: 'flex',
      gap: 8,
    },
    input: {
      flex: 1,
      padding: '12px 16px',
      background: `${backgroundColor}CC`,
      border: `1px solid ${mutedColor}30`,
      borderRadius: 12,
      color: textColor,
      fontSize: 14,
      outline: 'none',
      fontFamily: 'Cairo, sans-serif',
    },
    button: {
      padding: '12px 24px',
      background: primaryColor,
      color: backgroundColor,
      border: 'none',
      borderRadius: 12,
      fontWeight: 600,
      cursor: 'pointer',
      fontSize: 14,
      fontFamily: 'Cairo, sans-serif',
      transition: 'all 0.2s',
    },
    bottom: {
      paddingTop: 24,
      borderTop: `1px solid ${mutedColor}20`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap' as const,
      gap: 16,
      fontSize: 13,
      color: mutedColor,
    },
   
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // يمكن إضافة منطق الـ Newsletter هنا
    alert('شكراً للاشتراك في النشرة البريدية');
  };

  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.grid}>
          {/* قسم معلومات المتجر/المطعم */}
          <div style={styles.section}>
            <div style={styles.logo}>
              {businessLogo ? (
                <img src={businessLogo} alt={businessName} style={styles.logoImage} />
              ) : (
                <div style={{
                  ...styles.logoImage,
                  background: primaryColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {businessType === 'restaurant' ? (
                    <IoRestaurant size={24} color={backgroundColor} />
                  ) : (
                    <IoStorefront size={24} color={backgroundColor} />
                  )}
                </div>
              )}
              <span style={styles.logoText}>{businessName}</span>
            </div>
            {description && (
              <p style={styles.description}>{description}</p>
            )}
            <div style={styles.socialLinks}>
              {Object.entries(socialLinks).map(([platform, url]) => {
                if (!url) return null;
                const social = socialIcons[platform];
                return (
                  <a
                    key={platform}
                    href={url.startsWith('http') ? url : `https://${url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.socialIcon}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = social.color;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = `${primaryColor}10`;
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {social.icon}
                  </a>
                );
              })}
            </div>
          </div>

          {/* روابط سريعة */}
          {showQuickLinks && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>روابط سريعة</h3>
              <div>
                {quickLinks.map((link, index) => (
                  <Link
                    key={index}
                    to={link.path}
                    style={styles.link}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = primaryColor;
                      e.currentTarget.style.paddingRight = '8px';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = mutedColor;
                      e.currentTarget.style.paddingRight = '0';
                    }}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* معلومات الاتصال */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>تواصل معنا</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {contactInfo.phone && (
                <a href={`tel:${contactInfo.phone}`} style={styles.contactItem}>
                  <div style={styles.contactIcon}>
                    <IoCall size={16} />
                  </div>
                  <span>{contactInfo.phone}</span>
                </a>
              )}
              {contactInfo.email && (
                <a href={`mailto:${contactInfo.email}`} style={styles.contactItem}>
                  <div style={styles.contactIcon}>
                    <IoMail size={16} />
                  </div>
                  <span>{contactInfo.email}</span>
                </a>
              )}
              {contactInfo.address && (
                <div style={styles.contactItem}>
                  <div style={styles.contactIcon}>
                    <IoLocation size={16} />
                  </div>
                  <span>{contactInfo.address}</span>
                </div>
              )}
              {contactInfo.openingHours && (
                <div style={styles.contactItem}>
                  <div style={styles.contactIcon}>
                    <IoTime size={16} />
                  </div>
                  <span>{contactInfo.openingHours}</span>
                </div>
              )}
            </div>
          </div>

          {/* روابط المعلومات */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>معلومات</h3>
            <div>
              {infoLinks.map((link, index) => (
                <Link
                  key={index}
                  to={link.path}
                  style={styles.link}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = primaryColor;
                    e.currentTarget.style.paddingRight = '8px';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = mutedColor;
                    e.currentTarget.style.paddingRight = '0';
                  }}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* نشرة بريدية (اختياري) */}
          {showNewsletter && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>النشرة البريدية</h3>
              <p style={styles.description}>
                اشترك ليصلك كل جديد عن العروض والمنتجات
              </p>
              <form onSubmit={handleNewsletterSubmit} style={styles.newsletter}>
                <div style={styles.newsletterInput}>
                  <input
                    type="email"
                    placeholder="بريدك الإلكتروني"
                    style={styles.input}
                    required
                  />
                  <button type="submit" style={styles.button}>
                    اشتراك
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* القسم السفلي */}
        <div style={styles.bottom}>
          <div>
            © {year} {businessName}. جميع الحقوق محفوظة
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Link to="/privacy" style={{ color: mutedColor, textDecoration: 'none' }}>
              سياسة الخصوصية
            </Link>
            <Link to="/terms" style={{ color: mutedColor, textDecoration: 'none' }}>
              الشروط والأحكام
            </Link>
          </div>
        </div>
      </div>

    </footer>
  );
};

export default PublicFooter;