// backend/src/routes/inventoryRoutes.ts

import express from 'express';
import { authenticate } from '../middleware/auth';  // ✅ استخدم authenticate
import {
  getInventoryItems,
  getInventoryItem,
  updateInventoryQuantity,
  reorderProduct,
  getInventoryStats,
  getInventoryTransactions,
  getInventoryAlerts,
  exportInventory,
  updateInventorySettings,
  getInventory,
  addProduct,
  updateProduct,
  deleteProduct,
  addStock,
  removeStock,
  adjustStock,
  getLowStockAlerts,
  getInventoryMovements
} from '../controllers/inventoryController';

const router = express.Router();

// ✅ تطبيق المصادقة على جميع مسارات المخزون
router.use(authenticate);

// ==================== مسارات المخزون ====================
router.get('/', getInventoryItems);
router.get('/stats', getInventoryStats);
router.get('/transactions', getInventoryTransactions);
router.get('/alerts', getInventoryAlerts);
router.get('/export', exportInventory);
router.get('/:id', getInventoryItem);
router.patch('/:id/quantity', updateInventoryQuantity);
router.patch('/:id/settings', updateInventorySettings);
router.post('/:id/reorder', reorderProduct);

// ==================== مسارات إضافية ====================
router.get('/inventory', getInventory);
router.post('/inventory/products', addProduct);
router.put('/inventory/products/:productId', updateProduct);
router.delete('/inventory/products/:productId', deleteProduct);
router.post('/inventory/products/:productId/add-stock', addStock);
router.post('/inventory/products/:productId/remove-stock', removeStock);
router.put('/inventory/products/:productId/adjust-stock', adjustStock);
router.get('/inventory/low-stock', getLowStockAlerts);
router.get('/inventory/movements', getInventoryMovements);
router.get('/inventory/movements/:productId', getInventoryMovements);
router.get('/inventory/stats', getInventoryStats);
router.get('/inventory/export', exportInventory);

export default router;