import { CLASS_TIMEZONE, CLASS_WEEKDAYS, ClassWeekday } from '../classes/classes.interfaces';

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const JS_UTC_DAY_TO_WEEKDAY: ClassWeekday[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** Parse YYYY-MM-DD into a Date at UTC midnight for that calendar day */
export function parseBookingDate(input: string | Date): Date {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) {
      throw new Error('Invalid date');
    }
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  }
  const match = YMD_RE.exec(input.trim());
  if (!match) {
    throw new Error('Date must be YYYY-MM-DD');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error('Invalid calendar date');
  }
  return date;
}

export function formatBookingDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today's calendar date in India as YYYY-MM-DD */
export function todayYmdInIndia(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CLASS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function isBookingDateInPast(date: Date): boolean {
  return formatBookingDate(date) < todayYmdInIndia();
}

export function getWeekdayForBookingDate(date: Date): ClassWeekday {
  return JS_UTC_DAY_TO_WEEKDAY[date.getUTCDay()]!;
}

export function classRunsOnDate(
  defaultWeekdays: ClassWeekday[] | undefined,
  date: Date
): boolean {
  if (!defaultWeekdays || defaultWeekdays.length === 0) {
    return true;
  }
  const weekday = getWeekdayForBookingDate(date);
  return defaultWeekdays.includes(weekday);
}

export function isValidWeekday(value: string): value is ClassWeekday {
  return (CLASS_WEEKDAYS as readonly string[]).includes(value);
}
