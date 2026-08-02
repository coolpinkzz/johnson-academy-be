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

/**
 * Extract branch id from a roll number using longest student-number prefix match
 * (so 1079 → "10", 1143 → "1").
 */
export const extractBranchFromRollNumber = (rollNumber: string): string | null => {
  const match = rollNumber.trim().match(/^JA\/(?:[A-Z]{3}|\d{4})\/(\d+)$/i);
  if (!match?.[1]) {
    return null;
  }
  const studentNumber = match[1];
  const prefixes = Object.entries(BRANCH_STUDENT_NUMBER_PREFIXES).sort(
    (a, b) => b[1].length - a[1].length
  );
  for (const [branch, prefix] of prefixes) {
    if (studentNumber.startsWith(prefix)) {
      return branch;
    }
  }
  return null;
};

export type StudentBranchScope = { type: 'all' } | { type: 'none' } | { type: 'branches'; branches: string[] };

const BRANCH_RESTRICTED_ROLES = new Set(['admin', 'aqsd']);

/**
 * Resolve which student branches an actor may query.
 * Master (and non-restricted roles) get all; admin/aqsd are limited to branchAccess.
 */
export const resolveStudentBranchScope = (
  actor: { role?: string; branchAccess?: number[] },
  requestedBranch?: string | null
): StudentBranchScope => {
  const requested =
    requestedBranch != null && String(requestedBranch).trim() !== ''
      ? String(requestedBranch).trim()
      : undefined;

  if (!actor.role || !BRANCH_RESTRICTED_ROLES.has(actor.role)) {
    return requested ? { type: 'branches', branches: [requested] } : { type: 'all' };
  }

  const allowed = (actor.branchAccess ?? []).map(String).filter((b) => BRANCH_QUERY_VALUES.includes(b));
  if (allowed.length === 0) {
    return { type: 'none' };
  }

  if (requested) {
    if (!allowed.includes(requested)) {
      return { type: 'none' };
    }
    return { type: 'branches', branches: [requested] };
  }

  return { type: 'branches', branches: allowed };
};

export const canAccessStudentRollNumber = (
  actor: { role?: string; branchAccess?: number[] },
  rollNumber?: string | null
): boolean => {
  if (!actor.role || !BRANCH_RESTRICTED_ROLES.has(actor.role)) {
    return true;
  }
  const allowed = (actor.branchAccess ?? []).map(String);
  if (allowed.length === 0 || !rollNumber) {
    return false;
  }
  const branch = extractBranchFromRollNumber(rollNumber);
  return branch != null && allowed.includes(branch);
};

/**
 * Mongo $or clauses for rollNumbers matching any of the given branches.
 */
export const buildBranchAccessRollNumberOr = (
  branches: string[]
): Array<{ rollNumber: { $regex: string; $options: string } }> => {
  return branches
    .map((branch) => buildBranchRollNumberFilter(branch))
    .filter((filter): filter is { $regex: string; $options: string } => filter != null)
    .map((rollNumber) => ({ rollNumber }));
};
