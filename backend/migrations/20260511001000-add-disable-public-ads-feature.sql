-- Add feature: disable marketing sections on public page

INSERT INTO features (
  id,
  code,
  name,
  name_en,
  description,
  description_en,
  category,
  feature_group,
  is_core,
  is_active,
  price,
  is_one_time,
  default_in_plans,
  depends_on,
  created_at,
  updated_at
)
SELECT
  UUID(),
  'disable_public_ads',
  'تعطيل الإعلانات في الصفحة العامة',
  'Disable public ads',
  'عند تفعيل هذه الميزة يتم إخفاء أقسام الإعلانات والعروض من الصفحة العامة لهذا النشاط',
  'When enabled, marketing sections are hidden from this business public page.',
  'both',
  'marketing',
  FALSE,
  TRUE,
  0,
  FALSE,
  JSON_ARRAY(),
  JSON_ARRAY(),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM features WHERE code = 'disable_public_ads'
);
