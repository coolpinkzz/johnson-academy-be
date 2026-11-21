import mongoose from 'mongoose';
import FeePackage, { IFeePackageDoc } from './studentFee.model';
import { getStudentFeeProfileStatus } from './studentFee.service';

describe('getStudentFeeProfileStatus', () => {
  test('uses the newest valid package instead of an older package with a later end date', () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const dateParts: Record<string, string> = {};
    parts.forEach((part) => {
      dateParts[part.type] = part.value;
    });
    const today = `${dateParts['year']}-${dateParts['month']}-${dateParts['day']}`;
    const yesterday = new Date(`${today}T00:00:00.000Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const recentStart = new Date(`${today}T00:00:00.000Z`);
    recentStart.setUTCDate(recentStart.getUTCDate() - 5);

    const olderActive = new FeePackage({
      studentId: new mongoose.Types.ObjectId(),
      courseId: 'older-course',
      courseName: 'Older course',
      startDate: new Date('2020-01-01T00:00:00.000Z'),
      endDate: new Date('2099-12-31T00:00:00.000Z'),
      durationMonths: 12,
      amount: 1000,
      state: 'valid',
    });
    const recentExpired = new FeePackage({
      studentId: olderActive.studentId,
      courseId: 'recent-course',
      courseName: 'Recent course',
      startDate: recentStart,
      endDate: yesterday,
      durationMonths: 1,
      amount: 1000,
      state: 'valid',
    });

    expect(getStudentFeeProfileStatus([olderActive, recentExpired] as IFeePackageDoc[])).toBe('expired');
  });

  test('does not fall back to an older valid package when the newest package is cancelled', () => {
    const olderActive = new FeePackage({
      studentId: new mongoose.Types.ObjectId(),
      courseId: 'older-course',
      courseName: 'Older course',
      startDate: new Date('2020-01-01T00:00:00.000Z'),
      endDate: new Date('2099-12-31T00:00:00.000Z'),
      durationMonths: 12,
      amount: 1000,
      state: 'valid',
    });
    const newestCancelled = new FeePackage({
      studentId: olderActive.studentId,
      courseId: 'newest-course',
      courseName: 'Newest course',
      startDate: new Date('2099-01-01T00:00:00.000Z'),
      endDate: new Date('2099-12-31T00:00:00.000Z'),
      durationMonths: 12,
      amount: 1000,
      state: 'cancelled',
    });

    expect(getStudentFeeProfileStatus([olderActive, newestCancelled] as IFeePackageDoc[])).toBe('none');
  });
});
