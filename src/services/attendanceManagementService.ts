import { format } from "date-fns"
import { collection, getDocs, doc, setDoc, deleteDoc, Timestamp } from "firebase/firestore"
import { db } from "./firebase"
import type { TimeRecord } from "../types/index"
import { CACHE } from "./cacheUtils"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

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
        timeInAM: Timestamp.fromDate(
          new Date(today.getFullYear(), today.getMonth(), today.getDate(), randomHour(7, 9), randomHour(0, 59)),
        ),
        timeOutAM: Timestamp.fromDate(
          new Date(today.getFullYear(), today.getMonth(), today.getDate(), randomHour(11, 12), randomHour(0, 59)),
        ),
        timeInPM: Timestamp.fromDate(
          new Date(today.getFullYear(), today.getMonth(), today.getDate(), randomHour(13, 14), randomHour(0, 59)),
        ),
      }

      // Some users have already left for the day
      if (Math.random() > 0.3) {
        record.timeOutPM = Timestamp.fromDate(
          new Date(today.getFullYear(), today.getMonth(), today.getDate(), randomHour(16, 18), randomHour(0, 59)),
        )
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

export async function generatePDF(records: TimeRecord[], month: string): Promise<Blob> {
  try {
    const doc = new jsPDF()

    // Determine month label
    const monthLabel =
      records.length > 0 && records[0].originalDate ? format(records[0].originalDate, "MMMM yyyy") : month

    // Add title
    doc.setFontSize(16)
    doc.text("MMSU Attendance Records", 14, 15)
    doc.setFontSize(12)
    doc.text(monthLabel, 14, 25)

    // Prepare table data with better error handling
    const tableData = records.map((record) => {
      try {
        const date = record.originalDate || new Date(record.date)
        return [
          format(date, "MM/dd/yyyy"),
          record.userName || "Unknown",
          record.timeInAM || "-",
          record.timeOutAM || "-",
          record.timeInPM || "-",
          record.timeOutPM || "-",
        ]
      } catch (error) {
        console.warn("Error formatting record for PDF:", record, error)
        return [
          record.date || "Invalid Date",
          record.userName || "Unknown",
          record.timeInAM || "-",
          record.timeOutAM || "-",
          record.timeInPM || "-",
          record.timeOutPM || "-",
        ]
      }
    })

    // Add table using autoTable
    autoTable(doc, {
      head: [["Date", "Name", "Time In AM", "Time Out AM", "Time In PM", "Time Out PM"]],
      body: tableData,
      startY: 35,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [51, 153, 153],
        textColor: 255,
        fontSize: 10,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    })

    // Return as blob
    const pdfBlob = doc.output("blob")
    return pdfBlob
  } catch (error) {
    console.error("Error generating PDF:", error)
    throw new Error(`Failed to generate PDF: ${error.message}`)
  }
}

export async function exportAttendanceData(month: string, exportFormat: "pdf" | "csv" = "pdf"): Promise<string | Blob> {
  try {
    console.log(`Exporting attendance data for month: ${month}`)

    // Get all records with proper date processing
    const records = await getAttendanceRecords()
    console.log(`Total records fetched: ${records.length}`)

    // Filter records for the specified month
    const filteredRecords = records.filter((record) => {
      if (!record.originalDate && !record.date) {
        console.warn("Record missing date:", record)
        return false
      }

      try {
        const dateToCheck = record.originalDate || new Date(record.date)
        const recordMonth = format(dateToCheck, "yyyy-MM")
        return recordMonth === month
      } catch (error) {
        console.warn("Error formatting date for record:", record, error)
        return false
      }
    })

    console.log(`Filtered records for ${month}: ${filteredRecords.length}`)

    if (filteredRecords.length === 0) {
      throw new Error(`No attendance records found for ${month}`)
    }

    // Sort records by date and user name
    filteredRecords.sort((a, b) => {
      try {
        const dateA = a.originalDate || new Date(a.date)
        const dateB = b.originalDate || new Date(b.date)
        const dateCompare = dateA.getTime() - dateB.getTime()
        if (dateCompare !== 0) return dateCompare
        return (a.userName || "").localeCompare(b.userName || "")
      } catch (error) {
        console.warn("Error sorting records:", error)
        return 0
      }
    })

    if (exportFormat === "pdf") {
      return await generatePDF(filteredRecords, month)
    }

    // CSV format
    const headers = ["Date", "Name", "Time In (AM)", "Time Out (AM)", "Time In (PM)", "Time Out (PM)"]

    const csvRows = [
      headers.join(","),
      ...filteredRecords.map((record) => {
        try {
          const dateToFormat = record.originalDate || new Date(record.date)
          const formattedDate = format(dateToFormat, "MM/dd/yyyy")
          const values = [
            formattedDate,
            record.userName || "",
            record.timeInAM || "",
            record.timeOutAM || "",
            record.timeInPM || "",
            record.timeOutPM || "",
          ].map((value) => {
            const escaped = (value || "").toString().replace(/"/g, '""')
            return `"${escaped}"`
          })
          return values.join(",")
        } catch (error) {
          console.warn("Error formatting record for CSV:", record, error)
          return `"${record.date || "Invalid Date"}","${record.userName || ""}","","","",""`
        }
      }),
    ]

    return csvRows.join("\n")
  } catch (error) {
    console.error("Error exporting attendance data:", error)
    throw error
  }
}
