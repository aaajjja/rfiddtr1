import { format } from "date-fns";
import { doc, setDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import { TimeRecord, AttendanceAction, ScanResult } from "../types/index";
import { CACHE } from "./cacheUtils";

export async function getTodayRecord(userId: string): Promise<TimeRecord | null> {
  const today = format(new Date(), "yyyy-MM-dd");
  const cacheKey = `${userId}_${today}`;
  
  // Direct cache lookup without async overhead for improved performance
  return CACHE.records[cacheKey] || null;
}

export async function determineAction(userId: string, userName: string): Promise<ScanResult> {
  const today = format(new Date(), "yyyy-MM-dd");
  const now = new Date();
  const formattedTime = format(now, "hh:mm a");
  const cacheKey = `${userId}_${today}`;
  
  // Determine if it's morning or afternoon for proper labeling
  const hour = now.getHours();
  const isAM = hour < 12;
  const timeLabel = isAM ? "AM" : "PM";
  
  try {
    // Get today's record with minimal overhead
    let record = CACHE.records[cacheKey] || null;
    
    if (!record) {
      // No record today, create new with Time In (AM/PM based on time of day)
      record = {
        userId,
        userName,
        date: today,
        timeInAM: isAM ? formattedTime : undefined,
        timeInPM: isAM ? undefined : formattedTime
      };
      
      // Update Firebase immediately to ensure persistence
      try {
        await setDoc(doc(db, "attendance", cacheKey), record);
        console.log("New attendance record created in Firebase");
      } catch (err) {
        console.error("Firebase update failed:", err);
      }
      
      // Update cache immediately
      CACHE.records[cacheKey] = record;
      
      return {
        success: true,
        action: isAM ? "Time In AM" : "Time In PM",
        time: formattedTime,
        message: `Welcome ${userName}! Time In ${timeLabel} recorded at ${formattedTime}`,
        userName
      };
    }
    
    // Determine next action based on existing record and time of day
    let action: AttendanceAction = "Complete";
    let message = `${userName}, you have completed your DTR for today.`;
    let success = false;
    
    if (isAM) {
      // Morning logic
      if (!record.timeOutAM) {
        // Time Out AM
        record.timeOutAM = formattedTime;
        action = "Time Out AM";
        message = `Goodbye ${userName}! Time Out AM recorded at ${formattedTime}`;
        success = true;
      } else if (record.timeOutAM && !record.timeInPM) {
        // Special case: already timed out AM, but now it's still AM again
        // Allow a new Time In AM to override
        record.timeInAM = formattedTime;
        action = "Time In AM (Updated)";
        message = `Welcome back ${userName}! Updated Time In AM recorded at ${formattedTime}`;
        success = true;
      }
    } else {
      // Afternoon logic
      if (!record.timeInPM && record.timeInAM) {
        // Time In PM (only if they had timed in for AM)
        record.timeInPM = formattedTime;
        action = "Time In PM";
        message = `Welcome back ${userName}! Time In PM recorded at ${formattedTime}`;
        success = true;
      } else if (!record.timeInPM) {
        // First scan of the day but in afternoon
        record.timeInPM = formattedTime;
        action = "Time In PM";
        message = `Welcome ${userName}! Time In PM recorded at ${formattedTime}`;
        success = true;
      } else if (record.timeInPM && !record.timeOutPM) {
        // Time Out PM
        record.timeOutPM = formattedTime;
        action = "Time Out PM";
        message = `Goodbye ${userName}! Time Out PM recorded at ${formattedTime}. See you tomorrow!`;
        success = true;
      }
    }
    
    if (success) {
      // Update cache immediately
      CACHE.records[cacheKey] = record;
      
      // Update Firebase immediately to ensure persistence
      try {
        await setDoc(doc(db, "attendance", cacheKey), record);
        console.log("Attendance record updated in Firebase");
      } catch (err) {
        console.error("Firebase update failed:", err);
      }
    }
    
    return {
      success,
      action,
      time: success ? formattedTime : undefined,
      message,
      userName
    };
    
  } catch (error) {
    console.error("Error determining action:", error);
    return {
      success: false,
      message: "System error. Please try again or contact administrator."
    };
  }
}
