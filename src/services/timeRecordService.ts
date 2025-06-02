import { format, parse, isValid } from "date-fns"
import { doc, setDoc, collection, getDocs, deleteDoc, Timestamp } from "firebase/firestore"
import { db } from "./firebase"
import type { TimeRecord, AttendanceAction, ScanResult } from "../types/index"
import { CACHE } from "./cacheUtils"

// Working hours configuration
const WORKING_HOURS = {
  AM_START: 8, // 8:00 AM
  AM_END: 12, // 12:00 PM
  PM_START: 13, // 1:00 PM
  PM_END: 17, // 5:00 PM
  GRACE_PERIOD: 30, // 30 minutes grace period
} as const

// Helper function to convert time string to Firestore Timestamp
function convertToTimestamp(dateStr: any, timeValue: any): Timestamp | null {
  if (!timeValue) return null

  try {
    // Handle different time value formats
    if (timeValue instanceof Timestamp) {
      return timeValue
    }

    if (timeValue instanceof Date) {
      return Timestamp.fromDate(timeValue)
    }

    if (typeof timeValue !== "string") {
      console.warn("Unsupported time format:", timeValue)
      return null
    }

    // Parse time string (format: "hh:mm a" or "h:mm a")
    const timeStr = timeValue.trim()
    const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
    const match = timeStr.match(timeRegex)

    if (!match) {
      console.warn("Invalid time format:", timeStr)
      return null
    }

    const [, hoursStr, minutesStr, period] = match
    let hours = Number.parseInt(hoursStr, 10)
    const minutes = Number.parseInt(minutesStr, 10)

    // Validate time components
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
      console.warn("Invalid time values:", { hours, minutes })
      return null
    }

    // Convert to 24-hour format
    if (period.toUpperCase() === "PM" && hours !== 12) {
      hours += 12
    } else if (period.toUpperCase() === "AM" && hours === 12) {
      hours = 0
    }

    // Parse date
    let date: Date
    if (dateStr instanceof Date) {
      date = new Date(dateStr)
    } else if (dateStr?.toDate) {
      date = dateStr.toDate()
    } else if (typeof dateStr === "string") {
      date = parse(dateStr, "yyyy-MM-dd", new Date())
      if (!isValid(date)) {
        console.warn("Invalid date string:", dateStr)
        return null
      }
    } else {
      date = new Date()
    }

    // Set the time
    date.setHours(hours, minutes, 0, 0)

    if (!isValid(date)) {
      console.warn("Invalid date after setting time:", date)
      return null
    }

    return Timestamp.fromDate(date)
  } catch (error) {
    console.error("Error converting to timestamp:", error)
    return null
  }
}

// Helper function to prepare record for Firestore
function prepareFirestoreRecord(record: TimeRecord): any {
  const parseDate = (dateValue: any): Date => {
    if (dateValue instanceof Date) return dateValue
    if (dateValue?.toDate) return dateValue.toDate()
    if (typeof dateValue === "string") {
      const parsed = parse(dateValue, "yyyy-MM-dd", new Date())
      return isValid(parsed) ? parsed : new Date()
    }
    return new Date()
  }

  const firestoreRecord: any = {
    userId: record.userId,
    userName: record.userName,
    date: Timestamp.fromDate(parseDate(record.date)),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }

  // Add time fields only if they exist
  const timeFields = ["timeInAM", "timeOutAM", "timeInPM", "timeOutPM"] as const

  timeFields.forEach((field) => {
    if (record[field] !== undefined && record[field] !== null) {
      const timestamp = convertToTimestamp(record.date, record[field])
      if (timestamp) {
        firestoreRecord[field] = timestamp
      }
    }
  })

  // Add flags for missed entries
  if (record.missedAM) firestoreRecord.missedAM = true
  if (record.missedPM) firestoreRecord.missedPM = true

  return firestoreRecord
}

// Get current time period
function getCurrentTimePeriod(currentHour: number): "AM" | "PM" | "LUNCH" | "AFTER_HOURS" | "BEFORE_HOURS" {
  if (currentHour < WORKING_HOURS.AM_START) {
    return "BEFORE_HOURS"
  } else if (currentHour >= WORKING_HOURS.AM_START && currentHour < WORKING_HOURS.AM_END) {
    return "AM"
  } else if (currentHour >= WORKING_HOURS.AM_END && currentHour < WORKING_HOURS.PM_START) {
    return "LUNCH"
  } else if (currentHour >= WORKING_HOURS.PM_START && currentHour < WORKING_HOURS.PM_END) {
    return "PM"
  } else {
    return "AFTER_HOURS"
  }
}

export async function getTodayRecord(userId: string): Promise<TimeRecord | null> {
  const today = format(new Date(), "yyyy-MM-dd")
  const cacheKey = `${userId}_${today}`

  return CACHE.records[cacheKey] || null
}

// Updated function with explicit action parameter
export async function determineAction(
  userId: string,
  userName: string,
  requestedAction?: AttendanceAction,
): Promise<ScanResult> {
  const today = format(new Date(), "yyyy-MM-dd")
  const now = new Date()
  const currentHour = now.getHours()
  const formattedTime = format(now, "hh:mm a")
  const cacheKey = `${userId}_${today}`

  try {
    let record = CACHE.records[cacheKey]

    // Initialize record if it doesn't exist
    if (!record) {
      record = {
        userId,
        userName,
        date: today,
        timeInAM: undefined,
        timeOutAM: undefined,
        timeInPM: undefined,
        timeOutPM: undefined,
      }
    }

    // Always use handleSpecificAction when an action is provided
    if (requestedAction) {
      return await handleSpecificAction(record, requestedAction, formattedTime, currentHour)
    }

    // This is a fallback that should rarely be used - only if no action is specified
    console.warn('No specific action provided - falling back to auto-determination. This should be avoided.')
    return await handleAutoAction(record, formattedTime, currentHour)
  } catch (error) {
    console.error("Error determining action:", error)
    return {
      success: false,
      message: "System error. Please try again or contact administrator.",
      userName,
    }
  }
}

// Handle specific user-requested actions
async function handleSpecificAction(
  record: TimeRecord,
  action: AttendanceAction,
  formattedTime: string,
  currentHour: number,
): Promise<ScanResult> {
  const userName = record.userName

  switch (action) {
    case "Time In AM":
      // Block AM time-in after 12 PM
      if (currentHour >= 12) {
        return {
          success: false,
          message: `${userName}, you cannot time in for AM  at ${formattedTime}. Time-in AM has ended.`,
          userName,
        }
      }
      // Check if already timed in
      if (record.timeInAM) {
        return {
          success: false,
          message: `${userName}, you have already timed in for AM .`,
          userName,
        }
      }
      record.timeInAM = formattedTime
      return await handleSuccess(record, action, `Welcome ${userName}! AM time-in recorded at ${formattedTime}`)

    case "Time Out AM":
      // Allow AM time-out even without time-in (for people who forgot to time in)
      if (record.timeOutAM) {
        return {
          success: false,
          message: `${userName}, you have already timed out for AM.`,
          userName,
        }
      }
      record.timeOutAM = formattedTime
      return await handleSuccess(record, action, `${userName}, AM time-out recorded at ${formattedTime}`)

    case "Time In PM":
      // Block PM time-in before 12 PM
      if (currentHour < 12) {
        return {
          success: false,
          message: `${userName}, you cannot time in for PM  before 12:00 PM.`,
          userName,
        }
      }
      // Check if already timed in
      if (record.timeInPM) {
        return {
          success: false,
          message: `${userName}, you have already timed in for PM .`,
          userName,
        }
      }
      record.timeInPM = formattedTime
      return await handleSuccess(record, action, `Welcome ${userName}! PM time-in recorded at ${formattedTime}`)

    case "Time Out PM":
      // Allow PM time-out even without time-in (for people who forgot to time in)
      if (record.timeOutPM) {
        return {
          success: false,
          message: `${userName}, you have already timed out for PM shift.`,
          userName,
        }
      }
      record.timeOutPM = formattedTime
      return await handleSuccess(record, action, `Goodbye ${userName}! PM time-out recorded at ${formattedTime}`)

    default:
      return {
        success: false,
        message: `${userName}, invalid action requested.`,
        userName,
      }
  }
}

// Auto-determine action (legacy behavior)
async function handleAutoAction(record: TimeRecord, formattedTime: string, currentHour: number): Promise<ScanResult> {
  const userName = record.userName

  // If it's AM hours (before 12 PM)
  if (currentHour < 12) {
    // Priority 1: Time In AM (if not done yet)
    if (!record.timeInAM) {
      record.timeInAM = formattedTime
      return await handleSuccess(record, "Time In AM", `Welcome ${userName}! AM time-in recorded at ${formattedTime}`)
    }
    // Priority 2: Time Out AM (if AM time-in exists but time-out doesn't)
    else if (!record.timeOutAM) {
      record.timeOutAM = formattedTime
      return await handleSuccess(record, "Time Out AM", `${userName}, AM time-out recorded at ${formattedTime}`)
    }
    // AM is complete, inform user about PM
    else {
      return {
        success: false,
        message: `${userName}, AM shift is complete. You can time-in for PM shift anytime after 12:00 PM.`,
        userName,
      }
    }
  }

  // If it's PM hours (12 PM or later)
  else {
    // Allow AM time-out even without time-in
    if (!record.timeOutAM) {
      record.timeOutAM = formattedTime
      return await handleSuccess(record, "Time Out AM", `${userName}, AM time-out recorded at ${formattedTime}`)
    }

    // Priority 1: Time In PM (if not done yet)
    if (!record.timeInPM) {
      record.timeInPM = formattedTime
      return await handleSuccess(record, "Time In PM", `Welcome ${userName}! PM time-in recorded at ${formattedTime}`)
    }

    // Priority 2: Time Out PM (if PM time-in exists but time-out doesn't)
    else if (!record.timeOutPM) {
      record.timeOutPM = formattedTime
      return await handleSuccess(record, "Time Out PM", `Goodbye ${userName}! PM time-out recorded at ${formattedTime}`)
    }

    // All PM actions completed
    else {
      return {
        success: false,
        message: `${userName}, you have completed all time entries for today.`,
        userName,
      }
    }
  }
}

async function handleSuccess(record: TimeRecord, action: AttendanceAction, message: string): Promise<ScanResult> {
  try {
    // Save to Firestore
    await setDoc(doc(db, "attendance", `${record.userId}_${record.date}`), prepareFirestoreRecord(record))

    // Update cache
    CACHE.records[`${record.userId}_${record.date}`] = record

    return {
      success: true,
      action,
      time: format(new Date(), "hh:mm a"),
      message,
      userName: record.userName,
    }
  } catch (error) {
    console.error("Error saving record:", error)
    return {
      success: false,
      message: "Failed to save attendance record. Please try again.",
      userName: record.userName,
    }
  }
}

// Additional utility functions
export async function getAttendanceRecords(userId: string, startDate: string, endDate: string): Promise<TimeRecord[]> {
  try {
    const records: TimeRecord[] = []
    const snapshot = await getDocs(collection(db, "attendance"))

    snapshot.forEach((doc) => {
      const data = doc.data()
      if (data.userId === userId) {
        const recordDate = data.date.toDate()
        const dateStr = format(recordDate, "yyyy-MM-dd")

        if (dateStr >= startDate && dateStr <= endDate) {
          records.push({
            userId: data.userId,
            userName: data.userName,
            date: dateStr,
            timeInAM: data.timeInAM ? format(data.timeInAM.toDate(), "hh:mm a") : undefined,
            timeOutAM: data.timeOutAM ? format(data.timeOutAM.toDate(), "hh:mm a") : undefined,
            timeInPM: data.timeInPM ? format(data.timeInPM.toDate(), "hh:mm a") : undefined,
            timeOutPM: data.timeOutPM ? format(data.timeOutPM.toDate(), "hh:mm a") : undefined,
            missedAM: data.missedAM || false,
            missedPM: data.missedPM || false,
          })
        }
      }
    })

    return records.sort((a, b) => a.date.localeCompare(b.date))
  } catch (error) {
    console.error("Error fetching attendance records:", error)
    return []
  }
}

export async function deleteAttendanceRecord(userId: string, date: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "attendance", `${userId}_${date}`))
    delete CACHE.records[`${userId}_${date}`]
    return true
  } catch (error) {
    console.error("Error deleting attendance record:", error)
    return false
  }
}

export function getAttendanceStatus(record: TimeRecord): {
  amComplete: boolean
  pmComplete: boolean
  dayComplete: boolean
  nextAction: string
} {
  const amComplete = !!(record.timeInAM && record.timeOutAM)
  const pmComplete = !!(record.timeInPM && record.timeOutPM)

  // Day is complete if either AM+PM are both complete OR just PM is complete (for PM-only workers)
  const dayComplete = (amComplete && pmComplete) || (pmComplete && !record.timeInAM)

  let nextAction = "Time In AM"
  const currentHour = new Date().getHours()

  // Determine next action based on current time and record state
  if (currentHour < 12) {
    // AM hours
    if (!record.timeInAM) {
      nextAction = "Time In AM"
    } else if (!record.timeOutAM) {
      nextAction = "Time Out AM"
    } else {
      nextAction = "Wait for PM (after 12:00 PM)"
    }
  } else {
    // PM hours
    if (record.timeInAM && !record.timeOutAM) {
      nextAction = "Time Out AM"
    } else if (!record.timeInPM) {
      nextAction = "Time In PM"
    } else if (!record.timeOutPM) {
      nextAction = "Time Out PM"
    } else {
      nextAction = "Day Complete"
    }
  }

  return {
    amComplete,
    pmComplete,
    dayComplete,
    nextAction,
  }
}
