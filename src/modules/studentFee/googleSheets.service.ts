import https from 'https';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import FeePackage from './studentFee.model';
import { getStudentFeeProfileStatus, toFeePackageDto } from './studentFee.service';
import User from '../user/user.model';
import { logger } from '../logger';

type GoogleCredentials = {
  client_email: string;
  private_key: string;
};

type IntegrationSettings = {
  _id: string;
  spreadsheetId?: string;
  lastSyncAt?: Date | null;
  lastSyncError?: string | null;
  sharedEmails?: string[];
};

const SHEET_TABS = {
  Students: [
    'Student ID',
    'Name',
    'Email',
    'Roll Number',
    'Phone Number',
    'WhatsApp Number',
    'Profile Picture',
    'Branch',
    'Date of Birth',
    'Occupation',
    'Gender',
    'Address',
    'Referral Source',
    'Referral Source Other',
    'Date of Joining',
    'Mother Name',
    'Father Name',
    'Guardians',
    'Emergency Contact',
    'Courses',
    'Fee Profile Status',
    'Active',
  ],
  Teachers: ['Teacher ID', 'Name', 'Email', 'Phone Number', 'Profile Picture', 'Active'],
  'Fee Packages': [
    'Package ID',
    'Student ID',
    'Student Name',
    'Course',
    'Course Instrument',
    'Start Date',
    'End Date',
    'Duration Months',
    'Amount',
    'Amount Paid',
    'Amount Refunded',
    'Balance',
    'Payment Status',
    'Renewal Status',
    'Days Remaining',
    'State',
    'Renewal Of ID',
    'Cancelled At',
    'Cancel Reason',
    'Notes',
    'Payments',
  ],
  'Deletion History': [
    'Student/Teacher ID',
    'Name',
    'Email',
    'Role',
    'Roll Number',
    'Deleted At',
    'Deleted By',
    'Restored At',
    'Restored By',
  ],
} as const;

let accessToken: { value: string; expiresAt: number } | null = null;
let spreadsheetCreation: Promise<string> | null = null;
let sheetSyncQueue: Promise<void> = Promise.resolve();
let warnedMissingCredentials = false;

const settingsCollection = () => mongoose.connection.collection<IntegrationSettings>('integration_settings');

const credentialsFromEnv = (): GoogleCredentials | null => {
  const raw = process.env['GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON'];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GoogleCredentials;
    if (!parsed.client_email || !parsed.private_key) return null;
    return { ...parsed, private_key: parsed.private_key.replace(/\\n/g, '\n') };
  } catch {
    throw new Error('GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON must be valid service-account JSON');
  }
};

const hasCredentials = (): boolean => Boolean(process.env['GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON']);

export const getConfiguredSpreadsheetId = (value?: string): string | undefined => {
  const configuredValue = value?.trim();
  if (!configuredValue) return undefined;
  if (/^[A-Za-z0-9_-]+$/.test(configuredValue)) return configuredValue;

  let url: URL;
  try {
    url = new URL(configuredValue);
  } catch {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID must be a spreadsheet ID or editable Google Sheets URL');
  }
  const match =
    url.hostname === 'docs.google.com' && url.protocol === 'https:'
      ? url.pathname.match(/^\/spreadsheets\/d\/([A-Za-z0-9_-]+)(?:\/edit)?\/?$/)
      : null;
  if (!match) {
    throw new Error(
      'GOOGLE_SHEETS_SPREADSHEET_ID must be an editable Google Sheets URL; published /pubhtml links cannot be synced'
    );
  }
  return match[1];
};

const request = <T>(
  url: string,
  method: string,
  body?: unknown,
  token?: string,
  contentType = 'application/json'
): Promise<T> =>
  new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const requestBody =
      body == null
        ? undefined
        : Buffer.from(contentType === 'application/x-www-form-urlencoded' ? String(body) : JSON.stringify(body));
    const req = https.request(
      {
        hostname: parsedUrl.hostname,
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(requestBody ? { 'Content-Type': contentType, 'Content-Length': requestBody.length } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const responseText = Buffer.concat(chunks).toString('utf8');
          if ((res.statusCode || 500) < 200 || (res.statusCode || 500) >= 300) {
            reject(new Error(`Google API request failed (${res.statusCode}): ${responseText.slice(0, 500)}`));
            return;
          }
          if (!responseText) {
            resolve(undefined as unknown as T);
            return;
          }
          try {
            resolve(JSON.parse(responseText) as T);
          } catch (error) {
            reject(new Error('Google API returned invalid JSON'));
          }
        });
      }
    );
    req.on('error', reject);
    if (requestBody) req.write(requestBody);
    req.end();
  });

const getAccessToken = async (): Promise<string> => {
  if (accessToken && accessToken.expiresAt > Date.now() + 60_000) return accessToken.value;
  const credentials = credentialsFromEnv();
  if (!credentials) throw new Error('Google Sheets service-account credentials are not configured');
  const issuedAt = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
      aud: 'https://oauth2.googleapis.com/token',
      iat: issuedAt,
      exp: issuedAt + 3600,
    },
    credentials.private_key,
    { algorithm: 'RS256' }
  );
  const result = await request<{ access_token: string; expires_in: number }>(
    'https://oauth2.googleapis.com/token',
    'POST',
    `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${encodeURIComponent(
      assertion
    )}`,
    undefined,
    'application/x-www-form-urlencoded'
  );
  accessToken = { value: result.access_token, expiresAt: Date.now() + result.expires_in * 1000 };
  return result.access_token;
};

const api = async <T>(path: string, method: string, body?: unknown): Promise<T> =>
  request<T>(`https://sheets.googleapis.com/v4/${path}`, method, body, await getAccessToken());

const driveApi = async <T>(path: string, method: string, body?: unknown): Promise<T> =>
  request<T>(`https://www.googleapis.com/drive/v3/${path}`, method, body, await getAccessToken());

const createSpreadsheet = async (): Promise<string> => {
  const spreadsheet = await api<{ spreadsheetId: string }>('spreadsheets', 'POST', {
    properties: { title: 'Johnson Academy Live Data' },
    sheets: Object.keys(SHEET_TABS).map((title) => ({ properties: { title } })),
  });
  return spreadsheet.spreadsheetId;
};

const ensureSpreadsheet = async (): Promise<string> => {
  const configuredId = getConfiguredSpreadsheetId(process.env['GOOGLE_SHEETS_SPREADSHEET_ID']);
  const settings = await settingsCollection().findOne({ _id: 'googleSheets' });
  const existingId = configuredId || settings?.spreadsheetId;
  if (existingId) return existingId;
  if (!spreadsheetCreation) {
    spreadsheetCreation = createSpreadsheet()
      .then(async (id) => {
        await settingsCollection().updateOne({ _id: 'googleSheets' }, { $set: { spreadsheetId: id } }, { upsert: true });
        return id;
      })
      .finally(() => {
        spreadsheetCreation = null;
      });
  }
  return spreadsheetCreation;
};

const ensureTabs = async (spreadsheetId: string): Promise<void> => {
  const spreadsheet = await api<{ sheets?: { properties: { title: string; sheetId: number } }[] }>(
    `spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    'GET'
  );
  const existingTitles = new Set((spreadsheet.sheets || []).map((sheet) => sheet.properties.title));
  const missing = Object.keys(SHEET_TABS).filter((title) => !existingTitles.has(title));
  if (!missing.length) return;
  await api(`spreadsheets/${spreadsheetId}:batchUpdate`, 'POST', {
    requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
  });
};

const shareWithStaff = async (spreadsheetId: string): Promise<void> => {
  const settings = await settingsCollection().findOne({ _id: 'googleSheets' });
  const sharedEmails = new Set(settings?.spreadsheetId === spreadsheetId ? settings.sharedEmails || [] : []);
  const staff = await User.find({
    role: { $in: ['admin', 'master', 'aqsd'] },
    deletedAt: null,
    isActive: { $ne: false },
  })
    .select('email')
    .lean();
  const activeEmails = new Set(staff.map((user) => user.email).filter(Boolean));
  const removedEmails = Array.from(sharedEmails).filter((email) => !activeEmails.has(email));
  if (removedEmails.length) {
    const permissions = await driveApi<{
      permissions?: { id: string; emailAddress?: string }[];
    }>(`files/${spreadsheetId}/permissions?fields=permissions(id,emailAddress)`, 'GET');
    await Promise.all(
      (permissions.permissions || [])
        .filter((permission) => permission.emailAddress && removedEmails.includes(permission.emailAddress))
        .map((permission) => driveApi(`files/${spreadsheetId}/permissions/${permission.id}`, 'DELETE'))
    );
    removedEmails.forEach((email) => sharedEmails.delete(email));
  }
  const emails = Array.from(activeEmails).filter((email) => !sharedEmails.has(email));
  await Promise.all(
    emails.map(async (email) => {
      try {
        await driveApi(`files/${spreadsheetId}/permissions?sendNotificationEmail=false`, 'POST', {
          type: 'user',
          role: 'reader',
          emailAddress: email,
        });
        sharedEmails.add(email);
      } catch (error) {
        logger.warn(`Unable to share the live spreadsheet with ${email}: ${String(error)}`);
      }
    })
  );
  await settingsCollection().updateOne(
    { _id: 'googleSheets' },
    { $set: { spreadsheetId, sharedEmails: Array.from(sharedEmails) } },
    { upsert: true }
  );
};

const cellValue = (value: unknown): string | number | boolean => {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return JSON.stringify(value);
};

const syncRows = async (spreadsheetId: string, rowsByTab: Record<string, unknown[][]>): Promise<void> => {
  const ranges = Object.keys(SHEET_TABS).map((title) => `'${title}'!A:Z`);
  await api(`spreadsheets/${spreadsheetId}/values:batchClear`, 'POST', { ranges });
  await api(`spreadsheets/${spreadsheetId}/values:batchUpdate`, 'POST', {
    valueInputOption: 'RAW',
    data: Object.entries(rowsByTab).map(([title, rows]) => ({
      range: `'${title}'!A1`,
      majorDimension: 'ROWS',
      values: rows.map((row) => row.map(cellValue)),
    })),
  });
};

const syncAll = async (spreadsheetId: string): Promise<void> => {
  const users = await User.find({ role: { $in: ['student', 'user', 'teacher'] } });
  const students = users.filter((user) => ['student', 'user'].includes(user.role));
  const teachers = users.filter((user) => user.role === 'teacher');
  const packages = await FeePackage.find();
  const packageStudentIds = Array.from(new Set(packages.map((feePackage) => feePackage.studentId.toString()))).map(
    (id) => new mongoose.Types.ObjectId(id)
  );
  const packageStudents = await User.find({ _id: { $in: packageStudentIds } })
    .select('name')
    .lean();
  const studentNames = new Map(packageStudents.map((student) => [student._id.toString(), student.name]));
  const packagesByStudent = new Map<string, typeof packages>();
  packages.forEach((feePackage) => {
    const studentId = feePackage.studentId.toString();
    const list = packagesByStudent.get(studentId) || [];
    list.push(feePackage);
    packagesByStudent.set(studentId, list);
  });
  const studentsRows: unknown[][] = [
    [...SHEET_TABS.Students],
    ...students.map((user) => [
      user._id.toString(),
      user.name,
      user.email,
      user.rollNumber,
      user.phoneNumber,
      user.whatsappNumber,
      user.profilePicture,
      user.branch,
      user.dateOfBirth,
      user.occupation,
      user.gender,
      user.address,
      user.referralSource,
      user.referralSourceOther,
      user.dateOfJoining,
      user.motherName,
      user.fatherName,
      user.guardians,
      user.emergencyContact,
      user.courses,
      getStudentFeeProfileStatus(packagesByStudent.get(user._id.toString()) || []),
      user.isActive !== false,
    ]),
  ];
  const teachersRows: unknown[][] = [
    [...SHEET_TABS.Teachers],
    ...teachers.map((teacher) => [
      teacher.id,
      teacher.name,
      teacher.email,
      teacher.phoneNumber,
      teacher.profilePicture,
      teacher.isActive !== false,
    ]),
  ];
  const packageRows: unknown[][] = [
    [...SHEET_TABS['Fee Packages']],
    ...packages.map((item) => {
      const dto = toFeePackageDto(item);
      return [
        dto.id,
        dto.studentId,
        studentNames.get(dto.studentId) || '',
        dto.course?.name || '',
        dto.course?.instrument || '',
        dto.startDate,
        dto.endDate,
        dto.durationMonths,
        dto.amount,
        dto.amountPaid,
        dto.amountRefunded,
        dto.balance,
        dto.paymentStatus,
        dto.renewalStatus,
        dto.daysRemaining,
        dto.state,
        dto.renewalOfId,
        dto.cancelledAt,
        dto.cancelReason,
        dto.notes,
        JSON.stringify(dto.payments),
      ];
    }),
  ];
  const historyRows: unknown[][] = [
    [...SHEET_TABS['Deletion History']],
    ...users.reduce<unknown[][]>((rows, user) => {
      (user.deletionHistory || []).forEach((event) => {
        rows.push([
          user.id,
          user.name,
          user.email,
          user.role,
          user.rollNumber,
          event.deletedAt,
          event.deletedByName,
          event.restoredAt,
          event.restoredByName,
        ]);
      });
      return rows;
    }, []),
  ];
  await syncRows(spreadsheetId, {
    Students: studentsRows,
    Teachers: teachersRows,
    'Fee Packages': packageRows,
    'Deletion History': historyRows,
  });
};

export const syncSheetsAfterWrite = (): Promise<void> => {
  if (!hasCredentials()) {
    if (!warnedMissingCredentials) {
      logger.warn('Google Sheets sync is disabled until GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON is configured');
      warnedMissingCredentials = true;
    }
    return Promise.resolve();
  }
  sheetSyncQueue = sheetSyncQueue.then(async () => {
    try {
      const spreadsheetId = await ensureSpreadsheet();
      await ensureTabs(spreadsheetId);
      await shareWithStaff(spreadsheetId);
      await syncAll(spreadsheetId);
      await settingsCollection().updateOne(
        { _id: 'googleSheets' },
        { $set: { lastSyncAt: new Date(), lastSyncError: null } },
        { upsert: true }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Google Sheets error';
      logger.error(`Google Sheets sync failed: ${message}`);
      try {
        await settingsCollection().updateOne(
          { _id: 'googleSheets' },
          { $set: { lastSyncError: message } },
          { upsert: true }
        );
      } catch (statusError) {
        const statusMessage = statusError instanceof Error ? statusError.message : 'Unknown sync-status persistence error';
        logger.error(`Unable to persist Google Sheets sync status: ${statusMessage}`);
      }
    }
  });
  return sheetSyncQueue;
};

export const getSpreadsheetStatus = async () => {
  const settings = await settingsCollection().findOne({ _id: 'googleSheets' });
  const configured = hasCredentials();
  const spreadsheetId = getConfiguredSpreadsheetId(process.env['GOOGLE_SHEETS_SPREADSHEET_ID']) || settings?.spreadsheetId;
  return {
    configured,
    spreadsheetUrl: spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : null,
    lastSyncAt: settings?.lastSyncAt ?? null,
    lastSyncError: settings?.lastSyncError ?? null,
  };
};

export const getSpreadsheetLink = async () => {
  if (!hasCredentials()) return getSpreadsheetStatus();
  await syncSheetsAfterWrite();
  return getSpreadsheetStatus();
};
