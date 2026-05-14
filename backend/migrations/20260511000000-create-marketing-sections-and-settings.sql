-- Create marketing sections/settings tables for restaurants and stores

CREATE TABLE IF NOT EXISTS marketing_sections (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  business_type ENUM('restaurant', 'store') NOT NULL,
  business_id CHAR(36) NOT NULL,
  section_type ENUM('announcement', 'banner', 'offer') NOT NULL,
  title VARCHAR(255) NULL,
  title_en VARCHAR(255) NULL,
  description TEXT NULL,
  description_en TEXT NULL,
  image_url VARCHAR(1000) NULL,
  link_url VARCHAR(1000) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  start_at DATETIME NULL,
  end_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_marketing_sections_business (business_type, business_id),
  INDEX idx_marketing_sections_section_type (business_type, business_id, section_type)
);

CREATE TABLE IF NOT EXISTS marketing_settings (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  business_type ENUM('restaurant', 'store') NOT NULL,
  business_id CHAR(36) NOT NULL,
  section_order JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_marketing_settings_business (business_type, business_id)
);
