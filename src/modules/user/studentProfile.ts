import { GENDERS, REFERRAL_SOURCES, type Gender, type ReferralSource } from './admission.constants';

type ProfileFields = {
  dateOfBirth?: Date | string | null;
  gender?: string | null;
  occupation?: string | null;
  dateOfJoining?: Date | string | null;
  referralSource?: string | null;
  referralSourceOther?: string | null;
  address?: string | null;
  emergencyContact?: { phone?: string | null } | null;
};

const isGender = (value: string | null | undefined): value is Gender =>
  !!value && (GENDERS as readonly string[]).includes(value);

const isReferralSource = (value: string | null | undefined): value is ReferralSource =>
  !!value && (REFERRAL_SOURCES as readonly string[]).includes(value);

/** Students this age or younger must provide mother and father details. */
export const PARENT_DETAILS_MAX_AGE = 15;

export const MAX_GUARDIANS = 3;

export type GuardianDetails = {
  name: string;
  relation: string;
};

export type GuardianInput = {
  name?: string | null;
  relation?: string | null;
};

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

const calendarDateFromParts = (year: number, month: number, day: number): CalendarDate | null => {
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day };
};

/** Date-only values use the calendar date, not the server timezone. */
export const toCalendarDate = (value?: Date | string | null): CalendarDate | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!match) return null;
    return calendarDateFromParts(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  return calendarDateFromParts(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
};

export const ageInYears = (dateOfBirth?: Date | string | null, today = new Date()): number | null => {
  const dob = toCalendarDate(dateOfBirth);
  if (!dob) return null;
  const now = {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  };
  let age = now.year - dob.year;
  if (now.month < dob.month || (now.month === dob.month && now.day < dob.day)) {
    age -= 1;
  }
  return age;
};

export const requiresParentDetails = (dateOfBirth?: Date | string | null, today = new Date()): boolean => {
  const age = ageInYears(dateOfBirth, today);
  return age != null && age <= PARENT_DETAILS_MAX_AGE;
};

export const parseGuardians = (
  guardians?: GuardianInput[] | null
): { ok: true; guardians: GuardianDetails[] } | { ok: false; message: string } => {
  const rows = guardians ?? [];
  if (rows.length > MAX_GUARDIANS) {
    return { ok: false, message: 'A student can have at most 3 guardians' };
  }

  const cleaned: GuardianDetails[] = [];
  for (const row of rows) {
    const name = row?.name?.trim() ?? '';
    const relation = row?.relation?.trim() ?? '';
    if (!name && !relation) continue;
    if (!name || !relation) {
      return { ok: false, message: 'Guardian name and relation are required' };
    }
    if (name.length > 120 || relation.length > 80) {
      return { ok: false, message: 'Guardian name or relation is too long' };
    }
    cleaned.push({ name, relation });
  }

  return { ok: true, guardians: cleaned };
};

type ProfileCardFields = {
  profilePicture?: string | null;
  dateOfBirth?: Date | string | null;
  motherName?: string | null;
  fatherName?: string | null;
};

/** Required profile-card data is still present for the student's current age. */
export const profileCardStillValid = (user: ProfileCardFields, today = new Date()): boolean => {
  if (!user.profilePicture?.trim() || !user.dateOfBirth) return false;
  if (!requiresParentDetails(user.dateOfBirth, today)) return true;
  return Boolean(user.motherName?.trim() && user.fatherName?.trim());
};

/** Admission details a student must submit before the student app opens. */
export const isStudentProfileComplete = (user: ProfileFields): boolean => {
  const otherOk = user.referralSource !== 'other' || Boolean(user.referralSourceOther?.trim());
  const phoneDigits = (user.emergencyContact?.phone ?? '').replace(/\D/g, '');
  return Boolean(
    user.dateOfBirth &&
      isGender(user.gender) &&
      user.occupation?.trim() &&
      user.dateOfJoining &&
      isReferralSource(user.referralSource) &&
      otherOk &&
      user.address?.trim() &&
      phoneDigits.length >= 8
  );
};
