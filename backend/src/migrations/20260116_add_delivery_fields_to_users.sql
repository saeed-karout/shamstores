-- migrations/20260116_add_delivery_fields_to_users.sql

-- إضافة أعمدة الموقع لمندوبي التوصيل إلى جدول users
ALTER TABLE users 
ADD COLUMN last_location_lat DECIMAL(10, 8) NULL,
ADD COLUMN last_location_lng DECIMAL(11, 8) NULL,
ADD COLUMN last_location_update DATETIME NULL;

-- إضافة فهارس للأعمدة الجديدة
CREATE INDEX idx_users_last_location ON users(last_location_lat, last_location_lng);
CREATE INDEX idx_users_last_location_update ON users(last_location_update);