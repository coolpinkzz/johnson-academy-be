/** Legacy format: JA/GTR/1234 */
export const LEGACY_ROLL_NUMBER_PATTERN = /^JA\/[A-Z]{3}\/\d{4}$/;

/** New format: JA/0726/3072 (JA/MMYY/NNNN) */
export const NEW_ROLL_NUMBER_PATTERN = /^JA\/\d{4}\/\d{4}$/;

/** Accepts both legacy and new roll number formats */
export const ROLL_NUMBER_PATTERN = /^JA\/([A-Z]{3}|\d{4})\/\d{4}$/;

export const ROLL_NUMBER_ERROR_MESSAGE =
  'Roll number must be in format JA/MMYY/NNNN (e.g. JA/0726/3072) or legacy format JA/ABC/1234';

export const isValidRollNumber = (value: string): boolean => ROLL_NUMBER_PATTERN.test(value);

/**
 * Generate next roll number in format JA/MMYY/NNNN based on current date.
 * Sequence resets per month-year prefix.
 */
export const formatRollNumberPrefix = (date: Date = new Date()): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `JA/${month}${year}`;
};

export const buildRollNumber = (prefix: string, sequence: number): string => {
  return `${prefix}/${String(sequence).padStart(4, '0')}`;
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Maps branch query values to the first digit of the rollNumber student segment
 * (`JA/<batch>/<studentNumber>`). Add new branches here as needed (e.g. '3': '3').
 */
export const BRANCH_STUDENT_NUMBER_PREFIXES: Record<string, string> = {
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  '11': '11',
  '12': '12',
};

export const BRANCH_QUERY_VALUES = Object.keys(BRANCH_STUDENT_NUMBER_PREFIXES);

/**
 * Mongo filter for rollNumber query. Numeric input (1–4 digits) partially matches the last segment
 * (e.g. 107, 79, 1079 all match JA/1025/1079). Other input uses partial match on the full value.
 */
export const buildRollNumberSearchFilter = (query: string): { $regex: string; $options: string } => {
  const trimmed = query.trim();
  const escaped = escapeRegex(trimmed);

  if (/^\d{1,4}$/.test(trimmed)) {
    return { $regex: `^JA\\/([A-Z]{3}|\\d{4})\\/\\d*${escaped}\\d*$`, $options: 'i' };
  }

  return { $regex: escaped, $options: 'i' };
};

/**
 * Mongo filter matching rollNumbers whose last segment starts with the branch digit
 * (e.g. branch 1 → JA/0626/1143, not JA/0626/2450).
 * Returns null when the branch is unknown.
 */
export const buildBranchRollNumberFilter = (branch: string): { $regex: string; $options: string } | null => {
  const studentNumberPrefix = BRANCH_STUDENT_NUMBER_PREFIXES[branch];
  if (!studentNumberPrefix) {
    return null;
  }
  return { $regex: `\\/${escapeRegex(studentNumberPrefix)}\\d*$`, $options: 'i' };
};
