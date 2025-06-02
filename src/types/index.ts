export interface User {
  id: string;
  name: string;
  cardUID: string;
  department?: string;
  email?: string;
}

export interface TimeRecord {
  id?: string;
  userId: string;
  userName: string;
  date: string;
  originalDate: Date;
  timeInAM?: string;
  timeOutAM?: string;
  timeInPM?: string;
  timeOutPM?: string;
}

export type AttendanceAction = 'Time In AM' | 'Time Out AM' | 'Time In PM' | 'Time Out PM';

export interface ScanResult {
  success: boolean;
  message: string;
}
