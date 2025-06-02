import { format } from "date-fns"
import { collection, getDocs, doc, setDoc, deleteDoc, Timestamp } from "firebase/firestore"
import { db } from "./firebase"
import type { TimeRecord } from "../types/index"
import { CACHE } from "./cacheUtils"

export async function getAttendanceRecords(): Promise<TimeRecord[]> {
  try {
    console.log("Fetching attendance records from Firebase...")
    // Force a fresh fetch from Firebase every time to ensure up-to-date data
    const attendanceRef = collection(db, "attendance")
    const querySnapshot = await getDocs(attendanceRef)

    // Clear and rebuild the cache
    const records: TimeRecord[] = []
    Object.keys(CACHE.records).forEach((key) => delete CACHE.records[key])

    querySnapshot.forEach((doc) => {
      const data = doc.data()

      // Process the date properly, similar to how it's done in the component
      const safeFormatDate = (dateValue: any): { formatted: string; original: Date } => {
        try {
          let date: Date
          if (dateValue?.toDate) {
            date = dateValue.toDate()
          } else if (typeof dateValue === "string") {
            date = new Date(dateValue)
            if (isNaN(date.getTime())) {
              throw new Error("Invalid date")
            }
          } else {
            date = new Date()
          }

          return {
            formatted: format(date, "EEEE, MMMM d, yyyy"),
            original: date,
          }
        } catch {
          const now = new Date()
          return {
            formatted: format(now, "EEEE, MMMM d, yyyy"),
            original: now,
          }
        }
      }

      const safeFormatTime = (timeValue: any): string | undefined => {
        try {
          if (!timeValue) return undefined

          if (timeValue?.toDate) {
            return format(timeValue.toDate(), "hh:mm a")
          }
          if (typeof timeValue === "string") {
            if (/^\d{1,2}:\d{2} [AP]M$/.test(timeValue)) {
              return timeValue
            }
            const parsedDate = new Date(timeValue)
            if (!isNaN(parsedDate.getTime())) {
              return format(parsedDate, "hh:mm a")
            }
          }
          return undefined
        } catch {
          return undefined
        }
      }

      const dateInfo = safeFormatDate(data.date)

      const record: TimeRecord = {
        id: doc.id,
        userId: data.userId || "",
        userName: data.userName || "",
        date: dateInfo.formatted,
        originalDate: dateInfo.original,
        timeInAM: safeFormatTime(data.timeInAM),
        timeOutAM: safeFormatTime(data.timeOutAM),
        timeInPM: safeFormatTime(data.timeInPM),
        timeOutPM: safeFormatTime(data.timeOutPM),
      }

      records.push(record)

      // Update cache with fresh data
      CACHE.records[doc.id] = record
    })

    // Update last fetch time
    CACHE.lastFetch = Date.now()

    console.log(`Loaded ${records.length} attendance records`)
    return records
  } catch (error) {
    console.error("Error fetching attendance records:", error)
    throw error // Throw the error to be handled by the component
  }
}

export async function clearAttendanceRecords(): Promise<void> {
  try {
    // Get all attendance records from Firebase
    const attendanceRef = collection(db, "attendance")
    const querySnapshot = await getDocs(attendanceRef)

    // Delete each record
    const deletePromises: Promise<void>[] = []
    querySnapshot.forEach((docSnapshot) => {
      deletePromises.push(deleteDoc(doc(db, "attendance", docSnapshot.id)))
    })

    // Wait for all deletions to complete
    await Promise.all(deletePromises)

    // Clear the cache
    Object.keys(CACHE.records).forEach((key) => delete CACHE.records[key])

    console.log("All attendance records cleared successfully")
  } catch (error) {
    console.error("Error clearing attendance records:", error)
    throw error
  }
}

export async function reprocessAttendanceData(): Promise<{ processedCount: number }> {
  try {
    // Get all users from cache
    const users = Object.values(CACHE.users)

    // Clear existing attendance records first
    await clearAttendanceRecords()

    // For simulation purposes, we'll generate some attendance data
    // In a real system, this would involve analyzing raw scan data
    const today = new Date()
    const randomHour = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min)

    // Process each user
    for (const user of users) {
      // Generate a random attendance pattern for today
      const record = {
        userId: user.id,
        userName: user.name,
        date: Timestamp.fromDate(today), // Store as Firestore Timestamp
        timeInAM: Timestamp.fromDate(new Date().setHours(randomHour(7, 9), randomHour(0, 59))),
        timeOutAM: Timestamp.fromDate(new Date().setHours(randomHour(11, 12), randomHour(0, 59))),
        timeInPM: Timestamp.fromDate(new Date().setHours(randomHour(13, 14), randomHour(0, 59))),
      }

      // Some users have already left for the day
      if (Math.random() > 0.3) {
        record.timeOutPM = Timestamp.fromDate(new Date().setHours(randomHour(16, 18), randomHour(0, 59)))
      }

      // Save to Firebase
      const cacheKey = `${user.id}_${format(today, "yyyy-MM-dd")}`
      await setDoc(doc(db, "attendance", cacheKey), record)
    }

    return { processedCount: users.length }
  } catch (error) {
    console.error("Error reprocessing attendance data:", error)
    throw error
  }
}

export async function exportAttendanceData(month: string): Promise<string> {
  try {
    console.log(`Exporting attendance data for month: ${month}`)

    // Get all records with proper date processing
    const records = await getAttendanceRecords()
    console.log(`Total records fetched: ${records.length}`)

    // Filter records for the specified month
    const filteredRecords = records.filter((record) => {
      if (!record.originalDate) {
        console.warn("Record missing originalDate:", record)
        return false
      }
      try {
        const recordMonth = format(record.originalDate, "yyyy-MM")
        return recordMonth === month
      } catch (error) {
        console.warn("Error formatting date for record:", record, error)
        return false
      }
    })

    console.log(`Filtered records for ${month}: ${filteredRecords.length}`)

    // If no records found, return empty CSV with headers
    if (filteredRecords.length === 0) {
      const headers = ["Date", "Name", "Time In (AM)", "Time Out (AM)", "Time In (PM)", "Time Out (PM)"]
      return headers.join(",") + "\n"
    }

    // Sort records by date and user name
    filteredRecords.sort((a, b) => {
      if (!a.originalDate || !b.originalDate) return 0
      const dateCompare = a.originalDate.getTime() - b.originalDate.getTime()
      if (dateCompare !== 0) return dateCompare
      return (a.userName || "").localeCompare(b.userName || "")
    })

    // Create CSV content with proper escaping
    const headers = ["Date", "Name", "Time In (AM)", "Time Out (AM)", "Time In (PM)", "Time Out (PM)"]
    const csvRows = [
      headers.join(","),
      ...filteredRecords.map((record) => {
        const formattedDate = format(record.originalDate!, "MM/dd/yyyy")
        const values = [
          formattedDate,
          record.userName || "",
          record.timeInAM || "",
          record.timeOutAM || "",
          record.timeInPM || "",
          record.timeOutPM || "",
        ].map((value) => {
          // Escape quotes and wrap in quotes for proper CSV formatting
          const escaped = (value || "").toString().replace(/"/g, '""')
          return `"${escaped}"`
        })
        return values.join(",")
      }),
    ]

    const csvContent = csvRows.join("\n")
    console.log(`Generated CSV with ${csvRows.length - 1} data rows`)

    return csvContent
  } catch (error) {
    console.error("Error exporting attendance data:", error)
    throw error
  }
}
