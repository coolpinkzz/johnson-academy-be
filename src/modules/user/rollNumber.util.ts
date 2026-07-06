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
