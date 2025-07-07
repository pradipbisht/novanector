import Auth from "../models/authModel.js";
import { generateImageUrl } from "../config/multer.js";
import jwt from "jsonwebtoken";

export const createAuth = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Validate required input fields
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, email, and password are required.",
      });
    }

    // Get uploaded file (single file from multer)
    const uploadedFile = req.file;

    // Validate password length
    if (password.length < 9) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 9 characters long.",
      });
    }

    // Validate email format (additional check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // Check if user already exists (use findOne for better performance)
    const existingUser = await Auth.findOne({
      $or: [{ email: email }, { username: username }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          existingUser.email === email
            ? "User with this email already exists."
            : "Username is already taken.",
      });
    }

    // Handle profile picture URL generation
    let profilePictureUrl;
    if (uploadedFile) {
      // Generate URL for uploaded file
      profilePictureUrl = generateImageUrl(uploadedFile.filename, req);
    } else {
      // Use default profile picture from authModel schema
      profilePictureUrl = undefined; // Let mongoose use the default
    }

    // Create new user
    const newUser = new Auth({
      username,
      email,
      password,
      profilePicture: profilePictureUrl,
      role: role || "student", // Default role if not provided
    });

    // Save user to database
    await newUser.save();

    // Return success response (toJSON already removes password)
    return res.status(201).json({
      success: true,
      message: "User created successfully.",
      user: newUser.toJSON(),
    });
  } catch (error) {
    // Handle mongoose validation errors
    if (error.name === "ValidationError") {
      const errorMessages = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        success: false,
        message: "Validation error.",
        errors: errorMessages,
      });
    }

    // Handle duplicate key error (unique constraint)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists.`,
      });
    }

    console.error("Error creating user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// Login user
export const loginAuth = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Find user by email
    const user = await Auth.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Generate JWT token for successful login
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "24h" }
    );

    // Return success response (toJSON removes password)
    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: user.toJSON(),
      token: token,
    });
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// Update user profile (including profile picture)
export const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, role } = req.body;
    const uploadedFile = req.file; // For profile picture upload

    // Find user
    const user = await Auth.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Check if email/username is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await Auth.findOne({ email: email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email is already taken.",
        });
      }
    }

    if (username && username !== user.username) {
      const existingUser = await Auth.findOne({ username: username });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Username is already taken.",
        });
      }
    }

    // Update profile picture if new file is uploaded
    if (uploadedFile) {
      const newProfilePictureUrl = generateImageUrl(uploadedFile.filename, req);
      user.profilePicture = newProfilePictureUrl;
    }

    // Update other fields
    if (username) user.username = username;
    if (email) user.email = email;
    if (role) user.role = role;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: user.toJSON(),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const errorMessages = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        success: false,
        message: "Validation error.",
        errors: errorMessages,
      });
    }

    console.error("Error updating user profile:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// Update only profile picture
export const updateProfilePicture = async (req, res) => {
  try {
    const { userId } = req.params;
    const uploadedFile = req.file;

    // Validate file upload
    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded.",
      });
    }

    // Find user
    const user = await Auth.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Generate new profile picture URL
    const newProfilePictureUrl = generateImageUrl(uploadedFile.filename, req);

    // Update user profile picture
    user.profilePicture = newProfilePictureUrl;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully.",
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// Get single user by ID (alias for getUserProfile)
export const getSingleUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user
    const user = await Auth.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User retrieved successfully.",
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("Error retrieving user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// Get all users (admin functionality)
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;

    // Build query object
    let query = {};

    // Filter by role if provided
    if (role) {
      query.role = role;
    }

    // Search by username or email if provided
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get users with pagination
    const users = await Auth.find(query)
      .select("-password") // Exclude password field
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const totalUsers = await Auth.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);

    return res.status(200).json({
      success: true,
      message: "Users retrieved successfully.",
      users: users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalUsers: totalUsers,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error retrieving users:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find and delete user
    const user = await Auth.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// Alias for getSingleUser (for backward compatibility)
export const getUserProfile = getSingleUser;
