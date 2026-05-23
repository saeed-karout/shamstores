const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MenuCategory = sequelize.define('MenuCategory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  restaurant_id: DataTypes.INTEGER,
  name: DataTypes.STRING,
  sort_order: DataTypes.INTEGER,
});

module.exports = MenuCategory;