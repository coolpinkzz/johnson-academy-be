export interface FilteredAttendanceData {
  presentDates: string[];
  absentDates: string[];
}

/**
 * Filter attendance dates by month and year
 * @param attendance - The attendance data from the database
 * @param monthParam - Month parameter in format "YYYY-MM" (e.g., "2025-08")
 * @returns Filtered attendance data with only dates from the specified month
 */
export function filterAttendanceByMonth(attendance: any, monthParam: string): FilteredAttendanceData {
  const [yearStr, monthStr] = monthParam.split('-');

  if (!yearStr || !monthStr) {
    throw new Error('Invalid month format. Expected format: YYYY-MM');
  }

  const filterYear = parseInt(yearStr, 10);
  const filterMonth = parseInt(monthStr, 10) - 1; // JS months are 0-based

  if (isNaN(filterYear) || isNaN(filterMonth) || filterMonth < 0 || filterMonth > 11) {
    throw new Error('Invalid month or year values');
  }

  const presentDates = attendance.presentDates.filter(
    (date: Date) => date.getMonth() === filterMonth && date.getFullYear() === filterYear
  );

  const absentDates = attendance.absentDates.filter(
    (date: Date) => date.getMonth() === filterMonth && date.getFullYear() === filterYear
  );

  return {
    presentDates: presentDates.map((date: Date) => date.toISOString()),
    absentDates: absentDates.map((date: Date) => date.toISOString()),
  };
}

/**
 * Validate month parameter format
 * @param month - Month parameter to validate
 * @returns true if valid, false otherwise
 */
export function isValidMonthFormat(month: string): boolean {
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(month)) {
    return false;
  }

  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr as string, 10);
  const monthNum = parseInt(monthStr as string, 10);

  return year >= 1900 && year <= 2100 && monthNum >= 1 && monthNum <= 12;
}
