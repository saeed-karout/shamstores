// middleware/deliveryAuth.ts

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export const requireDeliveryDriver = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    res.status(401).json({ 
      success: false,
      error: 'غير مصرح' 
    });
    return;
  }

  if (req.user.role !== 'delivery_driver' && req.user.role !== 'super_admin') {
    res.status(403).json({ 
      success: false,
      error: 'هذه الصفحة مخصصة لمندوبي التوصيل فقط' 
    });
    return;
  }

  next();
};

export const requireRestaurantOrDriver = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    res.status(401).json({ 
      success: false,
      error: 'غير مصرح' 
    });
    return;
  }

  const allowedRoles = ['owner', 'super_admin', 'staff', 'delivery_driver'];
  
  if (!allowedRoles.includes(req.user.role)) {
    res.status(403).json({ 
      success: false,
      error: 'غير مصرح بالوصول' 
    });
    return;
  }

  next();
};