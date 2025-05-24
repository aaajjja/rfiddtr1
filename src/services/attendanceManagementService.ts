import { format } from "date-fns";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import { TimeRecord } from "../types/index";
import { CACHE } from "./cacheUtils";

export async function getAttendanceRecords(): Promise<TimeRecord[]> {
  try {
    console.log("Fetching attendance records from Firebase...");
    // Force a fresh fetch from Firebase every time to ensure up-to-date data
    const attendanceRef = collection(db, "attendance");
    const querySnapshot = await getDocs(attendanceRef);
    
    // Clear and rebuild the cache
    const records: TimeRecord[] = [];
    Object.keys(CACHE.records).forEach(key => delete CACHE.records[key]);
    
    querySnapshot.forEach(doc => {
      const data = doc.data() as TimeRecord;
      records.push(data);
      
      // Update cache with fresh data
      CACHE.records[doc.id] = data;
    });
    
    // Update last fetch time
    CACHE.lastFetch = Date.now();
    
    console.log(`Loaded ${records.length} attendance records`);
    return records;
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    throw error; // Throw the error to be handled by the component
  }
}

export async function clearAttendanceRecords(): Promise<void> {
  try {
    // Get all attendance records from Firebase
    const attendanceRef = collection(db, "attendance");
    const querySnapshot = await getDocs(attendanceRef);
    
    // Delete each record
    const deletePromises: Promise<void>[] = [];
    querySnapshot.forEach(docSnapshot => {
      deletePromises.push(deleteDoc(doc(db, "attendance", docSnapshot.id)));
    });
    
    // Wait for all deletions to complete
    await Promise.all(deletePromises);
    
    // Clear the cache
    Object.keys(CACHE.records).forEach(key => delete CACHE.records[key]);
    
    console.log("All attendance records cleared successfully");
  } catch (error) {
    console.error("Error clearing attendance records:", error);
    throw error;
  }
}

export async function reprocessAttendanceData(): Promise<{ processedCount: number }> {
  try {
    // Get all users from cache
    const users = Object.values(CACHE.users);
    
    // Clear existing attendance records first
    await clearAttendanceRecords();
    
    // For simulation purposes, we'll generate some attendance data
    // In a real system, this would involve analyzing raw scan data
    const today = format(new Date(), "yyyy-MM-dd");
    const randomHour = (min: number, max: number) => 
      Math.floor(Math.random() * (max - min + 1) + min);
    
    // Process each user
    for (const user of users) {
      // Generate a random attendance pattern for today
      const record: TimeRecord = {
        userId: user.id,
        userName: user.name,
        date: today,
        timeInAM: format(new Date().setHours(randomHour(7, 9), randomHour(0, 59)), "hh:mm a"),
        timeOutAM: format(new Date().setHours(randomHour(11, 12), randomHour(0, 59)), "hh:mm a"),
        timeInPM: format(new Date().setHours(randomHour(13, 14), randomHour(0, 59)), "hh:mm a"),
      };
      
      // Some users have already left for the day
      if (Math.random() > 0.3) {
        record.timeOutPM = format(new Date().setHours(randomHour(16, 18), randomHour(0, 59)), "hh:mm a");
      }
      
      // Save to Firebase
      const cacheKey = `${user.id}_${today}`;
      await setDoc(doc(db, "attendance", cacheKey), record);
      
      // Update cache
      CACHE.records[cacheKey] = record;
    }
    
    return { processedCount: users.length };
  } catch (error) {
    console.error("Error reprocessing attendance data:", error);
    throw error;
  }
}
