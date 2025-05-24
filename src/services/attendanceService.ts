
import { User, ScanResult } from "../types";
import { getUserByCardUID, registerNewUser } from "./userService";
import { determineAction } from "./timeRecordService";
import { getAttendanceRecords, clearAttendanceRecords, reprocessAttendanceData } from "./attendanceManagementService";

export async function recordAttendance(cardUID: string): Promise<ScanResult> {
  try {
    // Get user by card UID
    const user = await getUserByCardUID(cardUID);
    
    if (!user) {
      return {
        success: false,
        message: "Unregistered RFID card. Please contact administrator."
      };
    }
    
    // Determine and execute appropriate action
    const result = await determineAction(user.id, user.name);
    return result;
    
  } catch (error) {
    console.error("Error recording attendance:", error);
    return {
      success: false,
      message: "Failed to process scan. Please try again."
    };
  }
}

// Re-export functions from the other services
export {
  getUserByCardUID,
  registerNewUser,
  determineAction,
  getAttendanceRecords,
  clearAttendanceRecords,
  reprocessAttendanceData
};
