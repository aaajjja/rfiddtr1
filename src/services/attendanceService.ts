import type { User, ScanResult, AttendanceAction } from "../types";
import { getUserByCardUID, registerNewUser } from "./userService";
import { determineAction } from "./timeRecordService";
import { getAttendanceRecords, clearAttendanceRecords} from "./attendanceManagementService";

export async function recordAttendance(cardUID: string, action: AttendanceAction): Promise<ScanResult> {
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
    const result = await determineAction(user.id, user.name, action);
    return result;
    
  } catch (error) {
    console.error("Error recording attendance:", error);
    return {
      success: false,
      message: "Failed to process scan. Please try again or contact support."
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
};
