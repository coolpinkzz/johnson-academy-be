import mongoose, { Model, Document } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export const AUDIT_ENTITY_TYPES = ['StudentPackage', 'StudentPayment'] as const;
export type AuditEntityType = typeof AUDIT_ENTITY_TYPES[number];

export const AUDIT_ACTIONS = ['create', 'update', 'cancel', 'void'] as const;
export type AuditAction = typeof AUDIT_ACTIONS[number];

export type AuditValue = string | number | boolean | Date | null;

export interface IAuditChange {
  field: string;
  from: AuditValue;
  to: AuditValue;
}

export interface IAuditLog {
  entityType: AuditEntityType;
  entityId: mongoose.Types.ObjectId;
  /** Student (User) the change belongs to, for per-student history */
  studentId: mongoose.Types.ObjectId;
  action: AuditAction;
  actorId: mongoose.Types.ObjectId;
  changes: IAuditChange[];
  reason?: string;
  /** Explicit timestamp — toJSON strips createdAt */
  at: Date;
}

export interface IAuditLogDoc extends IAuditLog, Document {}

export interface IAuditLogModel extends Model<IAuditLogDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type NewAuditLog = Omit<IAuditLog, 'at'>;
