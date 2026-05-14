-- Create images table to persist uploaded image URLs (Cloudflare/local)

CREATE TABLE IF NOT EXISTS images (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NULL,
  business_type ENUM('restaurant', 'store', 'unknown') NOT NULL DEFAULT 'unknown',
  business_id CHAR(36) NULL,
  upload_type VARCHAR(100) NULL,
  sub_type VARCHAR(100) NULL,
  provider ENUM('cloudflare', 'local') NOT NULL DEFAULT 'cloudflare',
  image_url VARCHAR(1000) NOT NULL,
  cloudflare_image_id VARCHAR(255) NULL,
  original_name VARCHAR(255) NULL,
  mime_type VARCHAR(100) NULL,
  size_bytes INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_images_user_id (user_id),
  INDEX idx_images_business (business_type, business_id),
  INDEX idx_images_provider (provider),
  INDEX idx_images_created_at (created_at)
);
