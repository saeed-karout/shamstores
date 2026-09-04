// frontend/src/components/a11y/SkipToContent.tsx

/**
 * رابط «تخطَّ إلى المحتوى».
 *
 * مخفيّ حتى أول ضغطة Tab، فيظهر أعلى الصفحة. بدونه يضطر من يتنقّل بلوحة
 * المفاتيح أو بقارئ شاشة إلى المرور على كل روابط التنقّل في كل صفحة قبل
 * بلوغ المحتوى — عشرات الضغطات في كل تنقّل.
 *
 * الهدف `#main-content` معرَّف في App.tsx حول شجرة المسارات، ويحمل
 * `tabIndex={-1}` ليقبل التركيز برمجياً عند القفز إليه.
 */
const SkipToContent: React.FC = () => (
  <a href="#main-content" className="skip-link">
    تخطَّ إلى المحتوى
  </a>
);

export default SkipToContent;
