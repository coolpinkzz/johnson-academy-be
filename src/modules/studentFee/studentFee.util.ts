import {
  DEFAULT_EXPIRING_WITHIN_DAYS,
  PaymentRecordStatus,
  PaymentStatus,
  PaymentType,
  RenewalStatus,
} from './studentFee.interfaces';

const DAY_MS = 24 * 60 * 60 * 1000;

const daysInUtcMonth = (year: number, monthIndex: number): number =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

/**
 * Last covered day of a package: start + N months - 1 day (clamped to month length).
 * 2026-05-01 + 12 → 2027-04-30, 2026-01-15 + 1 → 2026-02-14.
 */
export const calculatePackageEndDate = (startDate: Date, durationMonths: number): Date => {
  const totalMonths = startDate.getUTCMonth() + durationMonths;
  const year = startDate.getUTCFullYear() + Math.floor(totalMonths / 12);
  const monthIndex = totalMonths % 12;
  const day = Math.min(startDate.getUTCDate(), daysInUtcMonth(year, monthIndex));
  return new Date(Date.UTC(year, monthIndex, day) - DAY_MS);
};

/** Whole days from `from` to `to` (both UTC-midnight calendar dates). */
export const daysBetween = (from: Date, to: Date): number => Math.round((to.getTime() - from.getTime()) / DAY_MS);

export const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * DAY_MS);

export type PaymentTotals = {
  amountPaid: number;
  amountRefunded: number;
  balance: number;
  paymentStatus: PaymentStatus;
};

export const calculatePaymentTotals = (
  packageAmount: number,
  payments: ReadonlyArray<{ type: PaymentType; amount: number; status: PaymentRecordStatus }>
): PaymentTotals => {
  let amountPaid = 0;
  let amountRefunded = 0;
  payments.forEach((payment) => {
    if (payment.status !== 'completed') return;
    if (payment.type === 'refund') {
      amountRefunded += payment.amount;
    } else {
      amountPaid += payment.amount;
    }
  });

  const netPaid = amountPaid - amountRefunded;
  const balance = packageAmount - netPaid;

  let paymentStatus: PaymentStatus;
  if (netPaid <= 0 && packageAmount > 0) {
    paymentStatus = 'unpaid';
  } else if (balance > 0) {
    paymentStatus = 'partial';
  } else if (balance < 0) {
    paymentStatus = 'overpaid';
  } else {
    paymentStatus = 'paid';
  }

  return { amountPaid, amountRefunded, balance, paymentStatus };
};

export const getRenewalStatus = (
  pkg: { startDate: Date; endDate: Date },
  today: Date,
  expiringWithinDays: number = DEFAULT_EXPIRING_WITHIN_DAYS
): RenewalStatus => {
  if (pkg.startDate > today) return 'upcoming';
  if (pkg.endDate < today) return 'expired';
  if (daysBetween(today, pkg.endDate) <= expiringWithinDays) return 'expiring';
  return 'active';
};

/** Mongo match on startDate/endDate for a renewal status, relative to `today`. */
export const buildRenewalDateFilter = (
  status: RenewalStatus,
  today: Date,
  expiringWithinDays: number = DEFAULT_EXPIRING_WITHIN_DAYS
): Record<string, unknown> => {
  const expiringCutoff = addDays(today, expiringWithinDays);
  switch (status) {
    case 'upcoming':
      return { startDate: { $gt: today } };
    case 'expired':
      return { endDate: { $lt: today } };
    case 'expiring':
      return { startDate: { $lte: today }, endDate: { $gte: today, $lte: expiringCutoff } };
    case 'active':
    default:
      return { startDate: { $lte: today }, endDate: { $gt: expiringCutoff } };
  }
};

export const normalizePaymentReference = (reference?: string): { reference?: string; referenceKey?: string } => {
  const trimmed = reference?.trim();
  if (!trimmed) return {};
  return { reference: trimmed, referenceKey: trimmed.replace(/\s+/g, '').toUpperCase() };
};
