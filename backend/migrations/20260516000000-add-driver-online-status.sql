-- backend/migrations/20260516000000-add-driver-online-status.sql
-- Adds a persistent online/offline state for delivery drivers.

ALTER TABLE users
  ADD COLUMN is_online TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active;
