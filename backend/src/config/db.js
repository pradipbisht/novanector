import mongoose from "mongoose";

/**
 * Database connection configuration
 * How: Uses mongoose to connect to MongoDB with connection string from environment
 * Why: Centralizes database connection logic and handles connection errors gracefully
 */
const dbConnect = async () => {
  try {
    // Connect to MongoDB using connection string from environment variables
    // Why: Environment variables keep sensitive connection details secure
    const connect = await mongoose.connect(process.env.MONGODB_URL);

    console.log(`MongoDB Connected: ${connect.connection.host}`);
  } catch (error) {
    // Log the error and exit process if database connection fails
    // Why: The application cannot function without database connectivity
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1); // Exit with failure code
  }
};

export default dbConnect;
