import { QueryInterface, DataTypes } from 'sequelize';

const tableExists = async (queryInterface: QueryInterface, tableName: string): Promise<boolean> => {
  try {
    await queryInterface.describeTable(tableName);
    return true;
  } catch {
    return false;
  }
};

export default {
  up: async (queryInterface: QueryInterface) => {
    const hasSectionsTable = await tableExists(queryInterface, 'marketing_sections');
    if (!hasSectionsTable) {
      await queryInterface.createTable('marketing_sections', {
        id: {
          type: DataTypes.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: DataTypes.UUIDV4
        },
        business_type: {
          type: DataTypes.ENUM('restaurant', 'store'),
          allowNull: false
        },
        business_id: {
          type: DataTypes.UUID,
          allowNull: false
        },
        section_type: {
          type: DataTypes.ENUM('announcement', 'banner', 'offer'),
          allowNull: false
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        title_en: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        description_en: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        image_url: {
          type: DataTypes.STRING(1000),
          allowNull: true
        },
        link_url: {
          type: DataTypes.STRING(1000),
          allowNull: true
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        sort_order: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        start_at: {
          type: DataTypes.DATE,
          allowNull: true
        },
        end_at: {
          type: DataTypes.DATE,
          allowNull: true
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        }
      });

      await queryInterface.addIndex('marketing_sections', ['business_type', 'business_id'], {
        name: 'idx_marketing_sections_business'
      });
      await queryInterface.addIndex('marketing_sections', ['business_type', 'business_id', 'section_type'], {
        name: 'idx_marketing_sections_section_type'
      });
    }

    const hasSettingsTable = await tableExists(queryInterface, 'marketing_settings');
    if (!hasSettingsTable) {
      await queryInterface.createTable('marketing_settings', {
        id: {
          type: DataTypes.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: DataTypes.UUIDV4
        },
        business_type: {
          type: DataTypes.ENUM('restaurant', 'store'),
          allowNull: false
        },
        business_id: {
          type: DataTypes.UUID,
          allowNull: false
        },
        section_order: {
          type: DataTypes.JSON,
          allowNull: false
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        }
      });

      await queryInterface.addIndex('marketing_settings', ['business_type', 'business_id'], {
        unique: true,
        name: 'uniq_marketing_settings_business'
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    if (await tableExists(queryInterface, 'marketing_settings')) {
      await queryInterface.dropTable('marketing_settings');
    }

    if (await tableExists(queryInterface, 'marketing_sections')) {
      await queryInterface.dropTable('marketing_sections');
    }
  }
};
