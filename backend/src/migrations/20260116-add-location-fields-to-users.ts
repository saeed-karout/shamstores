// migrations/20260116-add-location-fields-to-users.ts

import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    // التحقق من وجود الأعمدة قبل إضافتها
    const tableInfo = await queryInterface.describeTable('users');
    
    if (!tableInfo.last_location_lat) {
      await queryInterface.addColumn('users', 'last_location_lat', {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
      });
    }
    
    if (!tableInfo.last_location_lng) {
      await queryInterface.addColumn('users', 'last_location_lng', {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
      });
    }
    
    if (!tableInfo.last_location_update) {
      await queryInterface.addColumn('users', 'last_location_update', {
        type: DataTypes.DATE,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('users', 'last_location_update');
    await queryInterface.removeColumn('users', 'last_location_lng');
    await queryInterface.removeColumn('users', 'last_location_lat');
  }
};