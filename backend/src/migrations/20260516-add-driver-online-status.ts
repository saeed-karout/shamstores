// migrations/20260516-add-driver-online-status.ts

import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    const tableInfo = await queryInterface.describeTable('users');

    if (!tableInfo.is_online) {
      await queryInterface.addColumn('users', 'is_online', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('users', 'is_online');
  }
};