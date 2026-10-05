import { describe, expect, test } from '@jest/globals';
import {
  buildRenewalDateFilter,
  calculatePackageEndDate,
  calculatePaymentTotals,
  getRenewalStatus,
  normalizePaymentReference,
} from './studentFee.util';

const d = (ymd: string): Date => new Date(`${ymd}T00:00:00.000Z`);

describe('calculatePackageEndDate', () => {
  test.each([
    ['2026-05-01', 12, '2027-04-30'],
    ['2026-07-01', 6, '2026-12-31'],
    ['2026-01-01', 12, '2026-12-31'],
    ['2026-04-01', 6, '2026-09-30'],
    ['2026-01-15', 1, '2026-02-14'],
    ['2026-11-01', 3, '2027-01-31'],
    ['2026-01-31', 1, '2026-02-27'],
  ])('%s + %i months ends %s', (start, months, expected) => {
    expect(calculatePackageEndDate(d(start), months)).toEqual(d(expected));
  });
});

describe('calculatePaymentTotals', () => {
  const pay = (amount: number, extra: Partial<{ type: 'payment' | 'refund'; status: 'completed' | 'voided' }> = {}) => ({
    type: extra.type ?? ('payment' as const),
    status: extra.status ?? ('completed' as const),
    amount,
  });

  test('unpaid when there are no payments', () => {
    expect(calculatePaymentTotals(28600, [])).toEqual({
      amountPaid: 0,
      amountRefunded: 0,
      balance: 28600,
      paymentStatus: 'unpaid',
    });
  });

  test('partial, paid and overpaid', () => {
    expect(calculatePaymentTotals(20900, [pay(10000)]).paymentStatus).toBe('partial');
    expect(calculatePaymentTotals(20900, [pay(10000), pay(10900)]).paymentStatus).toBe('paid');
    expect(calculatePaymentTotals(20900, [pay(21000)])).toMatchObject({ balance: -100, paymentStatus: 'overpaid' });
  });

  test('voided payments are ignored', () => {
    expect(calculatePaymentTotals(19845, [pay(19845, { status: 'voided' })]).paymentStatus).toBe('unpaid');
  });

  test('refunds reduce the net amount paid', () => {
    expect(calculatePaymentTotals(27000, [pay(27000), pay(7000, { type: 'refund' })])).toEqual({
      amountPaid: 27000,
      amountRefunded: 7000,
      balance: 7000,
      paymentStatus: 'partial',
    });
  });

  test('free package counts as paid', () => {
    expect(calculatePaymentTotals(0, []).paymentStatus).toBe('paid');
  });
});

describe('getRenewalStatus', () => {
  const pkg = { startDate: d('2026-05-01'), endDate: d('2027-04-30') };

  test('upcoming before the start date', () => {
    expect(getRenewalStatus(pkg, d('2026-04-30'))).toBe('upcoming');
  });

  test('active well before the end date', () => {
    expect(getRenewalStatus(pkg, d('2026-10-01'))).toBe('active');
  });

  test('expiring inside the window, including the last day', () => {
    expect(getRenewalStatus(pkg, d('2027-03-31'))).toBe('expiring');
    expect(getRenewalStatus(pkg, d('2027-04-30'))).toBe('expiring');
    expect(getRenewalStatus(pkg, d('2027-04-15'), 7)).toBe('active');
  });

  test('expired the day after the end date', () => {
    expect(getRenewalStatus(pkg, d('2027-05-01'))).toBe('expired');
  });
});

describe('buildRenewalDateFilter', () => {
  const today = d('2026-10-04');

  test('expiring window is inclusive of today and the cutoff', () => {
    expect(buildRenewalDateFilter('expiring', today, 15)).toEqual({
      startDate: { $lte: today },
      endDate: { $gte: today, $lte: d('2026-10-19') },
    });
  });

  test('expired and upcoming', () => {
    expect(buildRenewalDateFilter('expired', today)).toEqual({ endDate: { $lt: today } });
    expect(buildRenewalDateFilter('upcoming', today)).toEqual({ startDate: { $gt: today } });
  });
});

describe('normalizePaymentReference', () => {
  test('trims and builds a case-insensitive key', () => {
    expect(normalizePaymentReference('  Cofee/0505/37370 ')).toEqual({
      reference: 'Cofee/0505/37370',
      referenceKey: 'COFEE/0505/37370',
    });
  });

  test('empty references are dropped', () => {
    expect(normalizePaymentReference('   ')).toEqual({});
    expect(normalizePaymentReference(undefined)).toEqual({});
  });
});
