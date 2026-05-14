// Script to create test restaurant "molstore" for subdomain testing
import dotenv from 'dotenv';
import sequelize from '../config/database';
import Restaurant from '../models/Restaurant';
import Category from '../models/Category';
import MenuItem from '../models/MenuItem';

dotenv.config();

const seedMolstore = async () => {
  try {
    console.log('🌱 Starting seed for molstore...');
    
    // Sync database
    await sequelize.sync();
    console.log('✅ Database synced');

    // Create restaurant
    const restaurant = await Restaurant.create({
      id: 'molstore-1',
      name: 'مول ستور',
      slug: 'molstore',
      subdomain: 'molstore',
      isActive: true,
      description: 'مرحباً بك في مول ستور - متجرك الإلكتروني المفضل',
      logo: null,
      coverImage: null,
      phone: '+966501234567',
      whatsapp: '+966501234567',
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981',
      backgroundColor: '#FFFFFF',
      textColor: '#000000',
      fontFamily: 'Cairo',
    });
    console.log('✅ Restaurant created:', restaurant.name);

    // Create categories
    const category = await Category.create({
      id: 'cat-1',
      restaurantId: restaurant.id,
      name: 'المنتجات الشهيرة',
      description: 'أكثر المنتجات مبيعاً',
      isActive: true,
      sortOrder: 1,
    });
    console.log('✅ Category created:', category.name);

    // Create menu items
    const items = await MenuItem.bulkCreate([
      {
        id: 'item-1',
        categoryId: category.id,
        name: 'برجر الدجاج',
        description: 'برجر طازج من صدور الدجاج مع صلصة خاصة',
        price: 25,
        discountedPrice: 20,
        image: null,
        isAvailable: true,
        ordersCount: 10,
      },
      {
        id: 'item-2',
        categoryId: category.id,
        name: 'ساندويتش اللحم',
        description: 'لحم مشوي مع خضار طازة',
        price: 30,
        discountedPrice: null,
        image: null,
        isAvailable: true,
        ordersCount: 5,
      },
      {
        id: 'item-3',
        categoryId: category.id,
        name: 'سلطة خضراء',
        description: 'سلطة صحية مع صوص منزلي',
        price: 15,
        discountedPrice: null,
        image: null,
        isAvailable: true,
        ordersCount: 3,
      },
    ]);
    console.log('✅ Menu items created:', items.length);

    console.log('\n✨ Seed completed successfully!');
    console.log('🎯 You can now access: molstore.localhost:3000');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seedMolstore();
