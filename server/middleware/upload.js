const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Check if Cloudinary is configured
const isCloudinaryConfigured = () => {
  return process.env.CLOUDINARY_CLOUD_NAME && 
         process.env.CLOUDINARY_API_KEY && 
         process.env.CLOUDINARY_API_SECRET;
};

// File type validation
const allowedFileTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf').split(',');

const fileFilter = (req, file, cb) => {
  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedFileTypes.join(', ')}`), false);
  }
};

// Cloudinary storage configuration
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'aby-productivity',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf'],
    transformation: [
      { width: 1000, height: 1000, crop: 'limit' },
      { quality: 'auto' }
    ]
  }
});

// Local storage configuration
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Memory storage for processing
const memoryStorage = multer.memoryStorage();

// Create multer instances
const createUploadMiddleware = (storageType = 'auto') => {
  let storage;
  
  switch (storageType) {
    case 'cloudinary':
      if (!isCloudinaryConfigured()) {
        throw new Error('Cloudinary is not configured. Please set CLOUDINARY_* environment variables.');
      }
      storage = cloudinaryStorage;
      break;
    case 'local':
      storage = localStorage;
      break;
    case 'memory':
      storage = memoryStorage;
      break;
    case 'auto':
    default:
      storage = isCloudinaryConfigured() ? cloudinaryStorage : localStorage;
      break;
  }
  
  return multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB default
      files: 5 // Maximum 5 files per request
    }
  });
};

// Specific upload middlewares
const uploadSingle = (fieldName, storageType = 'auto') => {
  return createUploadMiddleware(storageType).single(fieldName);
};

const uploadMultiple = (fieldName, maxCount = 5, storageType = 'auto') => {
  return createUploadMiddleware(storageType).array(fieldName, maxCount);
};

const uploadFields = (fields, storageType = 'auto') => {
  return createUploadMiddleware(storageType).fields(fields);
};

// File processing utilities
const processImage = async (file) => {
  // If using Cloudinary, return the URL directly
  if (file.path && file.path.includes('cloudinary')) {
    return {
      url: file.path,
      publicId: file.filename,
      format: file.format,
      size: file.bytes,
      width: file.width,
      height: file.height
    };
  }
  
  // For local files, return local path
  return {
    url: `/uploads/${file.filename}`,
    filename: file.filename,
    originalName: file.originalname,
    size: file.size,
    mimetype: file.mimetype
  };
};

// Delete file utility
const deleteFile = async (fileInfo) => {
  try {
    if (fileInfo.publicId) {
      // Delete from Cloudinary
      await cloudinary.uploader.destroy(fileInfo.publicId);
    } else if (fileInfo.filename) {
      // Delete local file
      const filePath = path.join(__dirname, '../uploads', fileInfo.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Avatar upload middleware
const uploadAvatar = (req, res, next) => {
  const upload = uploadSingle('avatar');
  
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size is ${parseInt(process.env.MAX_FILE_SIZE) || 5242880} bytes`
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    // Process the uploaded file
    if (req.file) {
      try {
        req.processedFile = await processImage(req.file);
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Error processing uploaded file'
        });
      }
    }
    
    next();
  });
};

// Task attachment upload middleware
const uploadTaskAttachment = (req, res, next) => {
  const upload = uploadMultiple('attachments', 3);
  
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size is ${parseInt(process.env.MAX_FILE_SIZE) || 5242880} bytes`
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum 3 files allowed'
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    // Process uploaded files
    if (req.files && req.files.length > 0) {
      try {
        req.processedFiles = await Promise.all(
          req.files.map(file => processImage(file))
        );
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Error processing uploaded files'
        });
      }
    }
    
    next();
  });
};

// Export utilities
module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  uploadAvatar,
  uploadTaskAttachment,
  processImage,
  deleteFile,
  allowedFileTypes
}; 