-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NULL,
    `storeId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `role` ENUM('super_admin', 'owner', 'staff', 'user', 'delivery_driver') NOT NULL,
    `permissions` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isOnline` BOOLEAN NOT NULL DEFAULT false,
    `lastLogin` DATETIME(3) NULL,
    `lastLocationLat` DOUBLE NULL,
    `lastLocationLng` DOUBLE NULL,
    `lastLocationUpdate` DATETIME(3) NULL,
    `driverRating` DOUBLE NULL DEFAULT 0,
    `driverRatingCount` INTEGER NULL DEFAULT 0,
    `isEmailVerified` BOOLEAN NOT NULL DEFAULT false,
    `loginAttempts` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `fcmToken` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_email_idx`(`email`),
    INDEX `User_restaurantId_idx`(`restaurantId`),
    INDEX `User_storeId_idx`(`storeId`),
    INDEX `User_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Plan` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `price` DOUBLE NOT NULL,
    `billingCycle` VARCHAR(191) NULL,
    `maxRestaurants` INTEGER NOT NULL DEFAULT 1,
    `maxStores` INTEGER NOT NULL DEFAULT 1,
    `maxUsers` INTEGER NOT NULL DEFAULT 5,
    `maxMenuItems` INTEGER NOT NULL DEFAULT 100,
    `maxProducts` INTEGER NOT NULL DEFAULT 100,
    `maxOrders` INTEGER NOT NULL DEFAULT 1000,
    `features` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `position` INTEGER NOT NULL DEFAULT 0,
    `isPopular` BOOLEAN NOT NULL DEFAULT false,
    `hasWhatsapp` BOOLEAN NOT NULL DEFAULT false,
    `hasOnlineOrders` BOOLEAN NOT NULL DEFAULT false,
    `hasCustomDomain` BOOLEAN NOT NULL DEFAULT false,
    `hasAnalytics` BOOLEAN NOT NULL DEFAULT false,
    `hasTableQr` BOOLEAN NOT NULL DEFAULT false,
    `hasMultiLanguage` BOOLEAN NOT NULL DEFAULT false,
    `hasPromotions` BOOLEAN NOT NULL DEFAULT false,
    `hasCoupons` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Plan_name_key`(`name`),
    UNIQUE INDEX `Plan_slug_key`(`slug`),
    INDEX `Plan_slug_idx`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Restaurant` (
    `id` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `whatsapp` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `logo` VARCHAR(191) NULL,
    `coverImage` VARCHAR(191) NULL,
    `instagram` VARCHAR(191) NULL,
    `facebook` VARCHAR(191) NULL,
    `tiktok` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#3B82F6',
    `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#10B981',
    `subdomain` VARCHAR(191) NULL,
    `customDomain` VARCHAR(191) NULL,
    `customDomainVerified` BOOLEAN NULL DEFAULT false,
    `customDomainVerifiedAt` DATETIME(3) NULL,
    `customDomainVerificationCode` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deliverySettings` JSON NULL,
    `subscriptionStart` DATETIME(3) NULL,
    `subscriptionEnd` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Restaurant_slug_key`(`slug`),
    UNIQUE INDEX `Restaurant_subdomain_key`(`subdomain`),
    UNIQUE INDEX `Restaurant_customDomain_key`(`customDomain`),
    UNIQUE INDEX `Restaurant_customDomainVerificationCode_key`(`customDomainVerificationCode`),
    INDEX `Restaurant_planId_idx`(`planId`),
    INDEX `Restaurant_slug_idx`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Store` (
    `id` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `logo` VARCHAR(191) NULL,
    `coverImage` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#3B82F6',
    `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#10B981',
    `subdomain` VARCHAR(191) NULL,
    `customDomain` VARCHAR(191) NULL,
    `customDomainVerified` BOOLEAN NULL DEFAULT false,
    `customDomainVerifiedAt` DATETIME(3) NULL,
    `customDomainVerificationCode` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `subscriptionStart` DATETIME(3) NULL,
    `subscriptionEnd` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Store_slug_key`(`slug`),
    UNIQUE INDEX `Store_subdomain_key`(`subdomain`),
    UNIQUE INDEX `Store_customDomain_key`(`customDomain`),
    UNIQUE INDEX `Store_customDomainVerificationCode_key`(`customDomainVerificationCode`),
    INDEX `Store_planId_idx`(`planId`),
    INDEX `Store_slug_idx`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Advertisement` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `titleEn` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `descriptionEn` TEXT NULL,
    `imageUrl` VARCHAR(191) NOT NULL,
    `linkUrl` VARCHAR(191) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `startAt` DATETIME(3) NULL,
    `endAt` DATETIME(3) NULL,
    `price` DOUBLE NOT NULL DEFAULT 0,
    `paid` BOOLEAN NOT NULL DEFAULT false,
    `paymentReference` VARCHAR(191) NULL,
    `clientName` VARCHAR(191) NULL,
    `clientEmail` VARCHAR(191) NULL,
    `clientPhone` VARCHAR(191) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Advertisement_isActive_idx`(`isActive`),
    INDEX `Advertisement_startAt_endAt_idx`(`startAt`, `endAt`),
    INDEX `Advertisement_position_idx`(`position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `images` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `business_type` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NULL,
    `upload_type` VARCHAR(191) NULL,
    `sub_type` VARCHAR(191) NULL,
    `provider` VARCHAR(191) NOT NULL DEFAULT 'cloudflare',
    `image_url` VARCHAR(191) NOT NULL,
    `cloudflare_image_id` VARCHAR(191) NULL,
    `original_name` VARCHAR(191) NULL,
    `mime_type` VARCHAR(191) NULL,
    `size_bytes` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `images_business_type_business_id_idx`(`business_type`, `business_id`),
    INDEX `images_upload_type_sub_type_idx`(`upload_type`, `sub_type`),
    INDEX `images_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subscription` (
    `id` VARCHAR(191) NOT NULL,
    `businessType` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `planName` VARCHAR(191) NOT NULL,
    `months` INTEGER NOT NULL,
    `price` DOUBLE NOT NULL,
    `discount` DOUBLE NOT NULL DEFAULT 0,
    `totalPaid` DOUBLE NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `paymentMethod` VARCHAR(191) NOT NULL,
    `paymentReference` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `reminderSent` BOOLEAN NOT NULL DEFAULT false,
    `reminderSentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Subscription_businessType_businessId_idx`(`businessType`, `businessId`),
    INDEX `Subscription_status_idx`(`status`),
    INDEX `Subscription_endDate_idx`(`endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NULL,
    `storeId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Category_restaurantId_idx`(`restaurantId`),
    INDEX `Category_storeId_idx`(`storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MenuItem` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `price` DOUBLE NOT NULL,
    `originalPrice` DOUBLE NULL,
    `image` VARCHAR(191) NULL,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `position` INTEGER NOT NULL DEFAULT 0,
    `ordersCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MenuItem_restaurantId_idx`(`restaurantId`),
    INDEX `MenuItem_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `price` DOUBLE NOT NULL,
    `originalPrice` DOUBLE NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `imageUrl` VARCHAR(191) NULL,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Product_sku_key`(`sku`),
    INDEX `Product_storeId_idx`(`storeId`),
    INDEX `Product_categoryId_idx`(`categoryId`),
    INDEX `Product_sku_idx`(`sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NULL,
    `storeId` VARCHAR(191) NULL,
    `tableId` VARCHAR(191) NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NULL,
    `customerPhone` VARCHAR(191) NULL,
    `status` ENUM('pending', 'preparing', 'ready', 'delivering', 'delivered', 'served', 'cancelled') NOT NULL DEFAULT 'pending',
    `total` DOUBLE NOT NULL,
    `subtotal` DOUBLE NULL DEFAULT 0,
    `discountAmount` DOUBLE NULL DEFAULT 0,
    `couponCode` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `paymentMethod` ENUM('cash', 'card', 'online') NOT NULL DEFAULT 'cash',
    `isPaid` BOOLEAN NOT NULL DEFAULT false,
    `createdBy` VARCHAR(191) NULL,
    `orderType` ENUM('dine_in', 'delivery', 'takeaway') NOT NULL DEFAULT 'dine_in',
    `deliveryAddress` VARCHAR(191) NULL,
    `deliveryLat` DOUBLE NULL,
    `deliveryLng` DOUBLE NULL,
    `assignedDriverId` VARCHAR(191) NULL,
    `estimatedDeliveryTime` INTEGER NULL,
    `actualDeliveryTime` INTEGER NULL,
    `deliveryFee` DOUBLE NULL DEFAULT 0,
    `deliveryDistance` DOUBLE NULL,
    `driverAcceptedAt` DATETIME(3) NULL,
    `driverReachedAt` DATETIME(3) NULL,
    `paymentCollectedAt` DATETIME(3) NULL,
    `rating` INTEGER NULL DEFAULT 0,
    `ratingComment` VARCHAR(191) NULL,
    `ratedAt` DATETIME(3) NULL,
    `orderSource` VARCHAR(191) NOT NULL DEFAULT 'restaurant',
    `deliveryProofImage` VARCHAR(191) NULL,
    `deliveryProofSignature` VARCHAR(191) NULL,
    `deliveryProofType` VARCHAR(191) NULL,
    `proofTakenAt` DATETIME(3) NULL,
    `driverRating` INTEGER NULL,
    `driverRatingComment` VARCHAR(191) NULL,
    `driverRatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Order_orderNumber_key`(`orderNumber`),
    INDEX `Order_restaurantId_idx`(`restaurantId`),
    INDEX `Order_storeId_idx`(`storeId`),
    INDEX `Order_assignedDriverId_idx`(`assignedDriverId`),
    INDEX `Order_status_idx`(`status`),
    INDEX `Order_createdAt_idx`(`createdAt`),
    INDEX `Order_orderNumber_idx`(`orderNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `menuItemId` VARCHAR(191) NULL,
    `productId` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `price` DOUBLE NOT NULL,
    `size` VARCHAR(191) NULL,
    `addons` JSON NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OrderItem_orderId_idx`(`orderId`),
    INDEX `OrderItem_menuItemId_idx`(`menuItemId`),
    INDEX `OrderItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Coupon` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NULL,
    `storeId` VARCHAR(191) NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `discountType` ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
    `discountValue` DOUBLE NOT NULL,
    `minOrderAmount` DOUBLE NULL,
    `usageLimit` INTEGER NULL DEFAULT 1,
    `usedCount` INTEGER NOT NULL DEFAULT 0,
    `validFrom` DATETIME(3) NOT NULL,
    `validUntil` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isStoreOnly` BOOLEAN NOT NULL DEFAULT false,
    `isRestaurantOnly` BOOLEAN NOT NULL DEFAULT false,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Coupon_code_key`(`code`),
    INDEX `Coupon_restaurantId_idx`(`restaurantId`),
    INDEX `Coupon_storeId_idx`(`storeId`),
    INDEX `Coupon_code_idx`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Table` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `nameEn` VARCHAR(191) NULL,
    `seats` INTEGER NOT NULL DEFAULT 2,
    `qrCode` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `qrSvg` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Table_restaurantId_idx`(`restaurantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ticket` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NULL,
    `storeId` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Ticket_userId_idx`(`userId`),
    INDEX `Ticket_restaurantId_idx`(`restaurantId`),
    INDEX `Ticket_storeId_idx`(`storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingSection` (
    `id` VARCHAR(191) NOT NULL,
    `businessType` ENUM('restaurant', 'store') NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `sectionType` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `titleEn` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `descriptionEn` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `linkUrl` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `startAt` DATETIME(3) NULL,
    `endAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketingSection_businessType_businessId_idx`(`businessType`, `businessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingSettings` (
    `id` VARCHAR(191) NOT NULL,
    `businessType` ENUM('restaurant', 'store') NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `sectionOrder` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingSettings_businessId_key`(`businessId`),
    UNIQUE INDEX `MarketingSettings_businessType_businessId_key`(`businessType`, `businessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformSetting` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `type` ENUM('string', 'number', 'boolean', 'json', 'array') NOT NULL DEFAULT 'string',
    `group` ENUM('general', 'auth', 'business', 'subscription', 'payment', 'domain', 'storage', 'delivery', 'notification', 'security', 'analytics', 'seo') NOT NULL DEFAULT 'general',
    `description` VARCHAR(191) NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `contactPhone` VARCHAR(191) NULL,
    `contactWhatsapp` VARCHAR(191) NULL,
    `contactEmail` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PlatformSetting_key_key`(`key`),
    INDEX `PlatformSetting_key_idx`(`key`),
    INDEX `PlatformSetting_group_idx`(`group`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExtendedPlatformSetting` (
    `id` VARCHAR(191) NOT NULL,
    `keyName` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `type` ENUM('string', 'number', 'boolean', 'json', 'array') NOT NULL DEFAULT 'string',
    `settingGroup` ENUM('general', 'auth', 'business', 'subscription', 'payment', 'domain', 'storage', 'delivery', 'notification', 'security', 'analytics', 'seo') NOT NULL DEFAULT 'general',
    `description` VARCHAR(191) NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `isEditable` BOOLEAN NOT NULL DEFAULT true,
    `validation` JSON NULL,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ExtendedPlatformSetting_keyName_key`(`keyName`),
    INDEX `ExtendedPlatformSetting_keyName_idx`(`keyName`),
    INDEX `ExtendedPlatformSetting_settingGroup_idx`(`settingGroup`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UpgradeRequest` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NULL,
    `storeId` VARCHAR(191) NULL,
    `currentPlanId` VARCHAR(191) NOT NULL,
    `requestedPlanId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `reason` TEXT NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UpgradeRequest_userId_idx`(`userId`),
    INDEX `UpgradeRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Feature` (
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `nameEn` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `descriptionEn` TEXT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'both',
    `group` VARCHAR(191) NOT NULL DEFAULT 'basic',
    `isCore` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `price` DOUBLE NOT NULL DEFAULT 0,
    `isOneTime` BOOLEAN NOT NULL DEFAULT false,
    `defaultInPlans` JSON NULL,
    `dependsOn` JSON NULL,
    `configSchema` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Feature_isActive_idx`(`isActive`),
    INDEX `Feature_category_idx`(`category`),
    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusinessFeature` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `businessType` VARCHAR(191) NOT NULL,
    `featureCode` VARCHAR(191) NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `isOverridden` BOOLEAN NOT NULL DEFAULT false,
    `overrideReason` TEXT NULL,
    `overriddenBy` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NULL,
    `config` JSON NULL,
    `assignedBy` VARCHAR(191) NULL,
    `assignedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BusinessFeature_businessId_businessType_idx`(`businessId`, `businessType`),
    INDEX `BusinessFeature_featureCode_idx`(`featureCode`),
    UNIQUE INDEX `BusinessFeature_businessId_businessType_featureCode_key`(`businessId`, `businessType`, `featureCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Setting` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `keyName` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Setting_keyName_key`(`keyName`),
    INDEX `Setting_keyName_idx`(`keyName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DriverDelivery` (
    `id` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'assigned',
    `acceptedAt` DATETIME(3) NULL,
    `pickedUpAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `earnings` DOUBLE NULL DEFAULT 0,
    `proofImage` VARCHAR(191) NULL,
    `customerRating` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DriverDelivery_driverId_idx`(`driverId`),
    INDEX `DriverDelivery_orderId_idx`(`orderId`),
    INDEX `DriverDelivery_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DriverLocationHistory` (
    `id` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DriverLocationHistory_driverId_idx`(`driverId`),
    INDEX `DriverLocationHistory_recordedAt_idx`(`recordedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DriverEarning` (
    `id` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'delivery',
    `orderId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DriverEarning_driverId_idx`(`driverId`),
    INDEX `DriverEarning_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DriverShift` (
    `id` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `deliveriesCount` INTEGER NOT NULL DEFAULT 0,
    `totalEarnings` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DriverShift_driverId_idx`(`driverId`),
    INDEX `DriverShift_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
