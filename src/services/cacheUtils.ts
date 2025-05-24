import { User, TimeRecord } from "../types/index";

// Enhanced in-memory caching system
export const CACHE = {
  // Cache users by cardUID for faster lookups
  users: {} as Record<string, User>,
  // Cache today's records by userId_date for faster lookups
  records: {} as Record<string, TimeRecord>,
  // Track last fetch time to implement cache invalidation
  lastFetch: 0
};
