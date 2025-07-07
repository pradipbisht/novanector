import express from "express";
import {
  createAuth,
  loginAuth,
  getSingleUser,
  getAllUsers,
  updateUserProfile,
  updateProfilePicture,
  deleteUser,
} from "../controllers/authController.js";
import { uploadProfilePicture } from "../config/multer.js";

const router = express.Router();

// Test route
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Auth API is working!",
  });
});

// Authentication routes
router.post("/register", uploadProfilePicture, createAuth);
router.post("/login", loginAuth);

// User management routes
router.get("/users", getAllUsers);
router.get("/users/:userId", getSingleUser);
router.put("/users/:userId", uploadProfilePicture, updateUserProfile);
router.put(
  "/users/:userId/picture",
  uploadProfilePicture,
  updateProfilePicture
);
router.delete("/users/:userId", deleteUser);

export default router;
