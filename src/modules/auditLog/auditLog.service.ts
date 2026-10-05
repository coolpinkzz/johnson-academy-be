import mongoose from 'mongoose';
import { IOptions, QueryResult } from '../paginate/paginate';
import AuditLog from './auditLog.model';
import { AuditValue, IAuditChange, NewAuditLog } from './auditLog.interfaces';

const toComparable = (value: unknown): AuditValue => {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
};

const isSameValue = (a: AuditValue, b: AuditValue): boolean => {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return a === b;
};

const readField = (source: object, field: string): unknown => (source as Record<string, unknown>)[field];

/**
 * Field-level diff between two snapshots. Only `fields` are compared so internal/cached
 * values never show up as audit noise.
 */
export const diffFields = (before: object, after: object, fields: readonly string[]): IAuditChange[] =>
  fields.reduce<IAuditChange[]>((changes, field) => {
    const from = toComparable(readField(before, field));
    const to = toComparable(readField(after, field));
    if (!isSameValue(from, to)) {
      changes.push({ field, from, to });
    }
    return changes;
  }, []);

/** Snapshot of `fields` for a "create" entry (from = null). */
export const snapshotFields = (doc: object, fields: readonly string[]): IAuditChange[] => diffFields({}, doc, fields);

export const recordAudit = async (entry: NewAuditLog, session?: mongoose.ClientSession): Promise<void> => {
  await AuditLog.create([{ ...entry, at: new Date() }], session ? { session } : {});
};

export const queryStudentAuditLogs = async (studentId: mongoose.Types.ObjectId, options: IOptions): Promise<QueryResult> => {
  const result = await AuditLog.paginate(
    { studentId },
    { ...options, sortBy: options.sortBy ?? 'at:desc', projectBy: options.projectBy ?? '' }
  );
  await AuditLog.populate(result.results, { path: 'actorId', select: 'name email role' });
  return result;
};
