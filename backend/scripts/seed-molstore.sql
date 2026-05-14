-- Insert test restaurant "molstore" with subdomain
INSERT INTO Restaurants (
  id, name, slug, subdomain, is_active, description, logo, cover_image,
  phone, whatsapp, primary_color, secondary_color, background_color, 
  text_color, font_family, created_at, updated_at
) VALUES (
  'molstore-1',
  'مول ستور',
  'molstore',
  'molstore',
  1,
  'مرحباً بك في مول ستور - متجرك الإلكتروني المفضل',
  NULL,
  NULL,
  '+966501234567',
  '+966501234567',
  '#3B82F6',
  '#10B981',
  '#FFFFFF',
  '#000000',
  'Cairo',
  NOW(),
  NOW()
);

-- Insert category
INSERT INTO Categories (
  id, restaurant_id, name, description, is_active, sort_order, created_at, updated_at
) VALUES (
  'cat-1',
  'molstore-1',
  'المنتجات الشهيرة',
  'أكثر المنتجات مبيعاً',
  1,
  1,
  NOW(),
  NOW()
);

-- Insert menu items
INSERT INTO MenuItems (
  id, category_id, name, description, price, discounted_price, 
  image, is_available, orders_count, created_at, updated_at
) VALUES
  (
    'item-1',
    'cat-1',
    'برجر الدجاج',
    'برجر طازج من صدور الدجاج مع صلصة خاصة',
    25,
    20,
    NULL,
    1,
    10,
    NOW(),
    NOW()
  ),
  (
    'item-2',
    'cat-1',
    'ساندويتش اللحم',
    'لحم مشوي مع خضار طازة',
    30,
    NULL,
    NULL,
    1,
    5,
    NOW(),
    NOW()
  ),
  (
    'item-3',
    'cat-1',
    'سلطة خضراء',
    'سلطة صحية مع صوص منزلي',
    15,
    NULL,
    NULL,
    1,
    3,
    NOW(),
    NOW()
  );
