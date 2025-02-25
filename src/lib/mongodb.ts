import mongoose from "mongoose";
import { ERROR_CODES } from "../constants/errorCodes";
import { AppError } from "../utils/errors";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new AppError(ERROR_CODES.MONGODB.MISSING_URI);
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null };
}

async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw new AppError(ERROR_CODES.MONGODB.CONNECTION_FAILED, {}, e);
  }

  return cached.conn;
}

export default connectDB;
