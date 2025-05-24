import { format, parse } from "date-fns";
import { doc, setDoc, collection, getDocs, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { TimeRecord, AttendanceAction, ScanResult } from "../types/index";
import { CACHE } from "./cacheUtils";

// Helper function to convert time string to Firestore Timestamp
function convertToTimestamp(dateStr: any, timeValue: any): Timestamp | null {
  // Return null for empty/falsy values
  if (!timeValue) return null;
  
  try {
    let timeStr: string;
    
    // Handle different time value formats
    if (typeof timeValue === 'string') {
      timeStr = timeValue;
    } else if (timeValue instanceof Timestamp) {
      // If it's already a Timestamp, return it directly
      return timeValue;
    } else if (timeValue instanceof Date) {
      // Convert Date to Timestamp
      return Timestamp.fromDate(timeValue);
    } else {
      console.warn("Unsupported time format:", timeValue);
      return null;
    }

    // Parse time string (format: "hh:mm a")
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    // Convert to 24-hour format
    let hours24 = hours;
    if (period === 'PM' && hours < 12) hours24 += 12;
    if (period === 'AM' && hours === 12) hours24 = 0;
    
    // Handle different date formats
    let date: Date;
    if (dateStr instanceof Date) {
      date = new Date(dateStr); // Clone the date
    } else if (dateStr?.toDate) {
      date = dateStr.toDate(); // Firestore Timestamp
    } else if (typeof dateStr === 'string') {
      date = parse(dateStr, 'yyyy-MM-dd', new Date());
    } else {
      date = new Date(); // Fallback
    }
    
    date.setHours(hours24, minutes, 0, 0);
    return Timestamp.fromDate(date);
  } catch (error) {
    console.error("Error converting to timestamp:", error);
    return null;
  }
}
// Helper function to prepare record for Firestore with proper types
// Updated prepareFirestoreRecord function
function prepareFirestoreRecord(record: TimeRecord): any {
  // Helper to safely parse dates
  const parseDate = (dateValue: any): Date => {
    if (dateValue instanceof Date) return dateValue;
    if (dateValue?.toDate) return dateValue.toDate();
    if (typeof dateValue === 'string') {
      try {
        return parse(dateValue, 'yyyy-MM-dd', new Date());
      } catch {
        console.warn("Failed to parse date string");
      }
    }
    return new Date();
  };

  // Prepare the Firestore document
  const firestoreRecord: any = {
    userId: record.userId,
    userName: record.userName,
    date: Timestamp.fromDate(parseDate(record.date))
  };

  // Only add time fields if they exist (using null instead of undefined)
  if (record.timeInAM !== undefined) {
    firestoreRecord.timeInAM = convertToTimestamp(record.date, record.timeInAM);
  }
  if (record.timeOutAM !== undefined) {
    firestoreRecord.timeOutAM = convertToTimestamp(record.date, record.timeOutAM);
  }
  if (record.timeInPM !== undefined) {
    firestoreRecord.timeInPM = convertToTimestamp(record.date, record.timeInPM);
  }
  if (record.timeOutPM !== undefined) {
    firestoreRecord.timeOutPM = convertToTimestamp(record.date, record.timeOutPM);
  }

  return firestoreRecord;
}
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
        timeOutAM: undefined,
        timeInPM: isAM ? undefined : formattedTime,
        timeOutPM: undefined
      };
      
      // Update Firebase immediately to ensure persistence
      try {
        await setDoc(doc(db, "attendance", cacheKey), prepareFirestoreRecord(record));
        console.log("New attendance record created in Firebase");
      } catch (err) {
        console.error("Firebase update failed:", err);
      }
      
      // Update cache immediately (keep as strings in cache)
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
      // Update cache immediately (keep as strings in cache)
      CACHE.records[cacheKey] = record;
      
      // Update Firebase immediately with proper types
      try {
        await setDoc(doc(db, "attendance", cacheKey), prepareFirestoreRecord(record));
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