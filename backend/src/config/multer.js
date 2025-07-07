import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { fileURLToPath } from "url";

// Get current directory (ES6 modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../../uploads/profile-pictures");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// File filter function to validate image types
const fileFilter = (req, file, cb) => {
  // Allowed image MIME types
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/tiff",
  ];

  // Check file extension as additional validation
  const allowedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".bmp",
    ".tiff",
  ];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  // Check MIME type and file extension
  if (
    allowedMimeTypes.includes(file.mimetype) &&
    allowedExtensions.includes(fileExtension)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, GIF, WebP, BMP, and TIFF images are allowed."
      ),
      false
    );
  }
};

// Local storage configuration
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure the uploads directory exists
    const uploadPath = path.join(__dirname, "../../uploads/profile-pictures");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString("hex");
    const extension = path.extname(file.originalname).toLowerCase();
    const originalName = path
      .parse(file.originalname)
      .name.replace(/[^a-zA-Z0-9]/g, "_") // Replace special characters with underscore
      .substring(0, 20); // Limit name length

    const filename = `${originalName}-${timestamp}-${randomString}${extension}`;
    cb(null, filename);
  },
});

// Multer configuration for profile pictures
const profilePictureUpload = multer({
  storage: localStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
    files: 1, // Only one file at a time
  },
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          success: false,
          message: "File size too large. Maximum size allowed is 5MB.",
          error: "FILE_TOO_LARGE",
        });
      case "LIMIT_FILE_COUNT":
        return res.status(400).json({
          success: false,
          message: "Too many files. Only one file is allowed.",
          error: "TOO_MANY_FILES",
        });
      case "LIMIT_UNEXPECTED_FILE":
        return res.status(400).json({
          success: false,
          message: "Unexpected field name. Use 'profilePicture' as field name.",
          error: "UNEXPECTED_FIELD",
        });
      default:
        return res.status(400).json({
          success: false,
          message: "File upload error occurred.",
          error: error.code,
        });
    }
  } else if (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "File upload failed.",
      error: "UPLOAD_ERROR",
    });
  }
  next();
};

// Single file upload middleware for profile pictures
const uploadProfilePicture = profilePictureUpload.single("profilePicture");

// Multiple files upload (if needed for other features)
const uploadMultipleImages = profilePictureUpload.array("images", 5);

// Utility function to delete image from local storage
const deleteImageFromLocal = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true, message: "File deleted successfully" };
    } else {
      return { success: false, message: "File not found" };
    }
  } catch (error) {
    console.error("Error deleting image from local storage:", error);
    throw error;
  }
};

// Utility function to get file path from filename
const getLocalImagePath = (filename) => {
  if (!filename) return null;
  return path.join(__dirname, "../../uploads/profile-pictures", filename);
};

// Utility function to extract filename from local URL
const extractFilenameFromUrl = (url) => {
  if (!url) return null;

  try {
    // For local URLs like: http://localhost:3000/uploads/profile-pictures/filename.jpg
    const parts = url.split("/");
    return parts[parts.length - 1];
  } catch (error) {
    console.error("Error extracting filename:", error);
    return null;
  }
};

// Generate URL for locally stored images
const generateImageUrl = (filename, req) => {
  if (!filename) return null;

  // Generate URL based on server configuration
  const protocol = req.protocol;
  const host = req.get("host");
  return `${protocol}://${host}/uploads/profile-pictures/${filename}`;
};

// Validation helper for image URLs
const isValidImageUrl = (url) => {
  const imageUrlRegex =
    /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp|bmp|tiff))$/i;
  return imageUrlRegex.test(url);
};

export {
  uploadProfilePicture,
  uploadMultipleImages,
  handleMulterError,
  deleteImageFromLocal,
  getLocalImagePath,
  extractFilenameFromUrl,
  generateImageUrl,
  isValidImageUrl,
};
