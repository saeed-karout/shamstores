// backend/src/services/deliveryService.ts

import { prisma } from '../server';

export class DeliveryService {
  /**
   * جلب جميع السائقين
   */
  static async getAllDrivers(includeInactive: boolean = false) {
    return prisma.driver.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * جلب جميع السائقين النشطين والمتصلين
   */
  static async getActiveDrivers() {
    return prisma.driver.findMany({
      where: { 
        isActive: true, 
        isOnline: true 
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });
  }

  /**
   * جلب سائق بالـ ID
   */
  static async getDriverById(id: string) {
    return prisma.driver.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        earnings: {
          orderBy: { createdAt: 'desc' }
        },
        shifts: {
          orderBy: { startedAt: 'desc' },
          take: 10
        }
      }
    });
  }

  /**
   * جلب سائق بالـ User ID
   */
  static async getDriverByUserId(userId: string) {
    return prisma.driver.findFirst({
      where: { userId },
      include: {
        user: true
      }
    });
  }

  /**
   * إنشاء سائق جديد
   */
  static async createDriver(data: {
    userId: string;
    vehicleType: string;
    vehiclePlate: string;
    licenseNumber?: string;
    hourlyRate?: number;
    baseSalary?: number;
  }) {
    return prisma.driver.create({
      data: {
        userId: data.userId,
        vehicleType: data.vehicleType,
        vehiclePlate: data.vehiclePlate,
        licenseNumber: data.licenseNumber,
        hourlyRate: data.hourlyRate || 0,
        baseSalary: data.baseSalary || 0,
        isActive: true,
        isOnline: false,
        totalDeliveries: 0,
        rating: 5.0,
        totalEarnings: 0
      },
      include: {
        user: true
      }
    });
  }

  /**
   * تحديث بيانات السائق
   */
  static async updateDriver(id: string, data: any) {
    return prisma.driver.update({
      where: { id },
      data,
      include: {
        user: true
      }
    });
  }

  /**
   * تحديث حالة السائق (نشط/غير نشط)
   */
  static async updateDriverActiveStatus(id: string, isActive: boolean) {
    return prisma.driver.update({
      where: { id },
      data: { isActive }
    });
  }

  /**
   * تحديث حالة الاتصال (متصل/غير متصل)
   */
  static async updateDriverOnlineStatus(id: string, isOnline: boolean) {
    return prisma.driver.update({
      where: { id },
      data: { 
        isOnline,
        lastActiveAt: isOnline ? new Date() : undefined
      }
    });
  }

  /**
   * تحديث موقع السائق
   */
  static async updateDriverLocation(id: string, lat: number, lng: number) {
    return prisma.driver.update({
      where: { id },
      data: {
        currentLat: lat,
        currentLng: lng,
        lastLocationUpdate: new Date()
      }
    });
  }

  /**
   * جلب موقع السائق
   */
  static async getDriverLocation(id: string) {
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: {
        currentLat: true,
        currentLng: true,
        lastLocationUpdate: true,
        isOnline: true
      }
    });
    
    return driver;
  }

  /**
   * حساب المسافة بين نقطتين (باستخدام Haversine formula)
   */
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * جلب أقرب سائق لموقع معين
   */
  static async getNearestDriver(lat: number, lng: number, maxDistance: number = 10) {
    const drivers = await this.getActiveDrivers();
    
    const driversWithDistance = drivers.map(driver => {
      const distance = this.calculateDistance(
        lat,
        lng,
        driver.currentLat || 0,
        driver.currentLng || 0
      );
      return { ...driver, distance };
    });

    driversWithDistance.sort((a, b) => a.distance - b.distance);
    
    const nearest = driversWithDistance[0];
    if (nearest && nearest.distance <= maxDistance) {
      return nearest;
    }
    
    return null;
  }

  /**
   * حذف سائق
   */
  static async deleteDriver(id: string) {
    return prisma.driver.delete({ where: { id } });
  }

  // ==================== إدارة الورديات (Shifts) ====================

  static async startShift(driverId: string) {
    await this.endOpenShift(driverId);
    
    return prisma.driverShift.create({
      data: {
        driverId,
        startedAt: new Date(),
        status: 'active'
      }
    });
  }

  static async endShift(driverId: string) {
    const activeShift = await prisma.driverShift.findFirst({
      where: {
        driverId,
        status: 'active'
      }
    });

    if (!activeShift) {
      throw new Error('لا توجد وردية نشطة');
    }

    const endedAt = new Date();
    const duration = (endedAt.getTime() - activeShift.startedAt.getTime()) / (1000 * 60);

    return prisma.driverShift.update({
      where: { id: activeShift.id },
      data: {
        endedAt,
        duration,
        status: 'completed'
      }
    });
  }

  static async endOpenShift(driverId: string) {
    const activeShift = await prisma.driverShift.findFirst({
      where: {
        driverId,
        status: 'active'
      }
    });

    if (activeShift) {
      const endedAt = new Date();
      const duration = (endedAt.getTime() - activeShift.startedAt.getTime()) / (1000 * 60);
      
      await prisma.driverShift.update({
        where: { id: activeShift.id },
        data: {
          endedAt,
          duration,
          status: 'completed'
        }
      });
    }
  }

  static async getDriverShifts(driverId: string, startDate?: Date, endDate?: Date) {
    const where: any = { driverId };
    
    if (startDate && endDate) {
      where.startedAt = {
        gte: startDate,
        lte: endDate
      };
    }

    return prisma.driverShift.findMany({
      where,
      orderBy: { startedAt: 'desc' }
    });
  }

  // ==================== إدارة الأرباح (Earnings) ====================

  static async addEarning(data: {
    driverId: string;
    orderId: string;
    amount: number;
    type: 'delivery' | 'bonus' | 'tip' | 'adjustment';
    description?: string;
  }) {
    const earning = await prisma.driverEarning.create({
      data: {
        driverId: data.driverId,
        orderId: data.orderId,
        amount: data.amount,
        type: data.type,
        description: data.description,
        status: 'pending'
      }
    });

    await prisma.driver.update({
      where: { id: data.driverId },
      data: {
        totalEarnings: {
          increment: data.amount
        }
      }
    });

    return earning;
  }

  static async confirmEarning(earningId: string) {
    const earning = await prisma.driverEarning.update({
      where: { id: earningId },
      data: { status: 'paid', paidAt: new Date() }
    });

    return earning;
  }

  static async getDriverEarnings(driverId: string, startDate?: Date, endDate?: Date) {
    const where: any = { driverId };
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate
      };
    }

    const earnings = await prisma.driverEarning.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            deliveryAddress: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const summary = {
      totalEarnings: earnings.reduce((sum, e) => sum + e.amount, 0),
      totalPaid: earnings.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0),
      totalPending: earnings.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0),
      byType: {
        delivery: earnings.filter(e => e.type === 'delivery').reduce((sum, e) => sum + e.amount, 0),
        bonus: earnings.filter(e => e.type === 'bonus').reduce((sum, e) => sum + e.amount, 0),
        tip: earnings.filter(e => e.type === 'tip').reduce((sum, e) => sum + e.amount, 0)
      }
    };

    return { earnings, summary };
  }

  // ==================== إحصائيات التوصيل ====================

  static async getDriverStats(driverId: string) {
    const [completedDeliveries, totalEarnings, averageRating, activeHours] = await Promise.all([
      prisma.order.count({
        where: {
          assignedDriverId: driverId,
          status: 'delivered'
        }
      }),
      prisma.driverEarning.aggregate({
        where: { driverId },
        _sum: { amount: true }
      }),
      prisma.driver.findUnique({
        where: { id: driverId },
        select: { rating: true }
      }),
      prisma.driverShift.aggregate({
        where: {
          driverId,
          status: 'completed'
        },
        _sum: { duration: true }
      })
    ]);

    return {
      completedDeliveries,
      totalEarnings: totalEarnings._sum.amount || 0,
      averageRating: averageRating?.rating || 5.0,
      totalActiveHours: Math.round((activeHours._sum.duration || 0) / 60),
      totalOrders: completedDeliveries
    };
  }

  static async getDeliveryStats() {
    const [totalDrivers, activeDrivers, onlineDrivers, totalDeliveries, todayDeliveries] = await Promise.all([
      prisma.driver.count(),
      prisma.driver.count({ where: { isActive: true } }),
      prisma.driver.count({ where: { isOnline: true, isActive: true } }),
      prisma.order.count({ where: { orderType: 'delivery' } }),
      prisma.order.count({
        where: {
          orderType: 'delivery',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    const totalEarnings = await prisma.driverEarning.aggregate({
      _sum: { amount: true }
    });

    return {
      totalDrivers,
      activeDrivers,
      onlineDrivers,
      totalDeliveries,
      todayDeliveries,
      totalEarnings: totalEarnings._sum.amount || 0
    };
  }

  static async getShiftsStats(startDate?: Date, endDate?: Date) {
    const where: any = {};
    
    if (startDate && endDate) {
      where.startedAt = {
        gte: startDate,
        lte: endDate
      };
    }

    const shifts = await prisma.driverShift.findMany({
      where,
      include: {
        driver: {
          include: {
            user: {
              select: { name: true, phone: true }
            }
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    });

    const summary = {
      totalShifts: shifts.length,
      totalHours: shifts.reduce((sum, s) => sum + (s.duration || 0), 0) / 60,
      activeShifts: shifts.filter(s => s.status === 'active').length,
      completedShifts: shifts.filter(s => s.status === 'completed').length
    };

    return { shifts, summary };
  }

  static async getEarningsStats(startDate?: Date, endDate?: Date) {
    const where: any = {};
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate
      };
    }

    const earnings = await prisma.driverEarning.findMany({
      where,
      include: {
        driver: {
          include: {
            user: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const summary = {
      totalEarnings: earnings.reduce((sum, e) => sum + e.amount, 0),
      byType: {
        delivery: earnings.filter(e => e.type === 'delivery').reduce((sum, e) => sum + e.amount, 0),
        bonus: earnings.filter(e => e.type === 'bonus').reduce((sum, e) => sum + e.amount, 0),
        tip: earnings.filter(e => e.type === 'tip').reduce((sum, e) => sum + e.amount, 0),
        adjustment: earnings.filter(e => e.type === 'adjustment').reduce((sum, e) => sum + e.amount, 0)
      }
    };

    return { earnings, summary };
  }
}

export default DeliveryService;