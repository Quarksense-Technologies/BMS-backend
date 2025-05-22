import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not defined');
    }

    // Increase timeouts and add additional connection options for better reliability
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 120000, // Increased to 120 seconds
      socketTimeoutMS: 90000, // Increased to 90 seconds
      connectTimeoutMS: 120000, // Increased to 120 seconds
      maxPoolSize: 50, // Increased pool size for better concurrent connection handling
      bufferCommands: true, // Enable command buffering
      //bufferTimeoutMS: 30000, // Set buffer timeout to 30 seconds
      heartbeatFrequencyMS: 10000, // More frequent heartbeats
      minPoolSize: 10, // Maintain minimum connections
      maxIdleTimeMS: 60000, // Maximum idle time for connections
      waitQueueTimeoutMS: 30000 // Wait queue timeout
    });
    
    // Add connection error handler with reconnection logic
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
      // Attempt to reconnect
      setTimeout(() => {
        console.log('Attempting to reconnect to MongoDB...');
        mongoose.connect(process.env.MONGO_URI).catch(err => {
          console.error('Reconnection failed:', err);
        });
      }, 5000);
    });

    // Add reconnect handler
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected. Attempting to reconnect...');
    });

    // Add successful reconnection handler
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    // Instead of exiting, attempt to reconnect
    console.log('Attempting to reconnect in 5 seconds...');
    setTimeout(() => {
      connectDB();
    }, 5000);
  }
};