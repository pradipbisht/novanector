import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const authSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email!`,
      },
    },
    password: {
      type: String,
      required: true,
      minlength: 9,
    },
    profilePicture: {
      type: String,
      // multer will upload the image so what to set default to?
      default:
        "https://res.cloudinary.com/dz1qj3x8h/image/upload/v1735681234/novanector/default-profile-picture.png",
      validate: {
        validator: function (v) {
          return /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))$/.test(v);
        },
        message: (props) => `${props.value} is not a valid image URL!`,
      },
    },
    role: {
      type: String,
      enum: ["admin", "instructor", "student"],
      default: "student",
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
authSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
authSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
authSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Create and export the model
const Auth = mongoose.model("Auth", authSchema);

export default Auth;
