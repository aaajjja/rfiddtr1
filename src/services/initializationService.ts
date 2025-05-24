import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import { User, TimeRecord } from "../types/index";
import { CACHE } from "./cacheUtils";
import { loadSimulatedUsers } from "./userService";

// Initialize application by loading data from Firebase into cache
export async function initializeAppData(): Promise<void> {
  try {
    console.log("Initializing application data from Firebase...");
    
    // Clear existing cache to prevent stale data
    Object.keys(CACHE.users).forEach(key => delete CACHE.users[key]);
    Object.keys(CACHE.records).forEach(key => delete CACHE.records[key]);
    
    // Load all users from Firebase into cache
    const usersRef = collection(db, "users");
    const userSnapshot = await getDocs(usersRef);
    
    userSnapshot.forEach(doc => {
      const userData = doc.data() as User;
      if (userData && userData.cardUID) {
        CACHE.users[userData.cardUID] = userData;
      }
    });
    
    console.log(`Loaded ${userSnapshot.size} users from Firebase into cache`);
    
    // Only load simulated users if no real users exist
    if (userSnapshot.size === 0) {
      loadSimulatedUsers();
      console.log("No users found in Firebase, loaded simulated users");
    }
    
    // Load attendance records into cache
    const attendanceRef = collection(db, "attendance");
    const attendanceSnapshot = await getDocs(attendanceRef);
    
    attendanceSnapshot.forEach(doc => {
      const recordData = doc.data() as TimeRecord;
      CACHE.records[doc.id] = recordData;
    });
    
    console.log(`Loaded ${attendanceSnapshot.size} attendance records into cache`);
    
    // Update last fetch time
    CACHE.lastFetch = Date.now();
    
    console.log("Application data initialization complete");
  } catch (error) {
    console.error("Error initializing application data:", error);
    // Fall back to simulated users if Firebase fails
    loadSimulatedUsers();
  }
}

// Reset the application state - clear Firebase data and cache
export async function resetApplicationState(): Promise<boolean> {
  try {
    console.log("Resetting application state...");
    
    // Clear users collection
    const usersRef = collection(db, "users");
    const userSnapshot = await getDocs(usersRef);
    const userDeletePromises: Promise<void>[] = [];
    
    userSnapshot.forEach(docSnapshot => {
      userDeletePromises.push(deleteDoc(doc(db, "users", docSnapshot.id)));
    });
    
    // Clear attendance collection
    const attendanceRef = collection(db, "attendance");
    const attendanceSnapshot = await getDocs(attendanceRef);
    const attendanceDeletePromises: Promise<void>[] = [];
    
    attendanceSnapshot.forEach(docSnapshot => {
      attendanceDeletePromises.push(deleteDoc(doc(db, "attendance", docSnapshot.id)));
    });
    
    // Wait for all deletions to complete
    await Promise.all([...userDeletePromises, ...attendanceDeletePromises]);
    
    // Clear the cache
    Object.keys(CACHE.users).forEach(key => delete CACHE.users[key]);
    Object.keys(CACHE.records).forEach(key => delete CACHE.records[key]);
    
    console.log("Application state reset complete");
    return true;
  } catch (error) {
    console.error("Error resetting application state:", error);
    return false;
  }
} 