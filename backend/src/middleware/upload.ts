import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

// فلترة أنواع الملفات
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];
  
  const allowedExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('يسمح فقط بصور JPG, PNG, GIF, WEBP, SVG'));
  }
};

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB حد أقصى
  },
  fileFilter: fileFilter
});

export const handleUploadError = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ 
        success: false,
        error: 'حجم الملف كبير جداً. الحد الأقصى 10MB' 
      });
      return;
    }
    res.status(400).json({ 
      success: false,
      error: err.message 
    });
    return;
  }
  
  if (err) {
    res.status(400).json({ 
      success: false,
      error: err.message 
    });
    return;
  }
  
  next(err);
};

export default upload;
