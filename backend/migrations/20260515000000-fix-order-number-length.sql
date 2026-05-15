-- Fix order_number column: increase from VARCHAR(20) to VARCHAR(30)
-- Generated format "ORD-{13-digit-epoch}-{3-digit-random}" = 21 chars, exceeded the 20-char limit

ALTER TABLE `orders` MODIFY COLUMN `order_number` VARCHAR(30) NOT NULL;
