import mongoose from 'mongoose';

const connectDB = async () => {
  let DB;


  if (process.env.NODE_ENV === 'development') {
    DB = process.env.DB_LOCAL;
  } else if (process.env.NODE_ENV === 'production') {
    DB = process.env.DB_LOCAL;
    // DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
    console.log('CONNECTION STRING', DB);
    
  }

  console.log('COONNECTIONS', DB);
  

  try {
    const conn = await mongoose.connect(DB, {
      maxPoolSize: 10,           // Connection pool for concurrency
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;