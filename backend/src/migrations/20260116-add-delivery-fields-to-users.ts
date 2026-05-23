// migrations/20260116-add-delivery-fields-to-users.ts

import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    // إضافة أعمدة الموقع
    await queryInterface.addColumn('users', 'last_location_lat', {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    });
    
    await queryInterface.addColumn('users', 'last_location_lng', {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    });
    
    await queryInterface.addColumn('users', 'last_location_update', {
      type: DataTypes.DATE,
      allowNull: true,
    });
    
    // إضافة فهارس
    await queryInterface.addIndex('users', ['last_location_lat', 'last_location_lng'], {
      name: 'idx_users_last_location',
    });
    
    await queryInterface.addIndex('users', ['last_location_update'], {
      name: 'idx_users_last_location_update',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    // حذف الفهارس
    await queryInterface.removeIndex('users', 'idx_users_last_location');
    await queryInterface.removeIndex('users', 'idx_users_last_location_update');
    
    // حذف الأعمدة
    await queryInterface.removeColumn('users', 'last_location_update');
    await queryInterface.removeColumn('users', 'last_location_lng');
    await queryInterface.removeColumn('users', 'last_location_lat');
  }
};