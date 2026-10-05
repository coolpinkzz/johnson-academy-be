import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, IAuditLogDoc, IAuditLogModel } from './auditLog.interfaces';

const auditLogSchema = new mongoose.Schema<IAuditLogDoc, IAuditLogModel>(
  {
    entityType: {
      type: String,
      enum: AUDIT_ENTITY_TYPES,
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changes: [
      {
        _id: false,
        field: { type: String, required: true },
        from: { type: mongoose.Schema.Types.Mixed },
        to: { type: mongoose.Schema.Types.Mixed },
      },
    ],
    reason: {
      type: String,
      trim: true,
    },
    at: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

auditLogSchema.index({ studentId: 1, at: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, at: -1 });

auditLogSchema.plugin(toJSON);
auditLogSchema.plugin(paginate);

const AuditLog = mongoose.model<IAuditLogDoc, IAuditLogModel>('AuditLog', auditLogSchema);

export default AuditLog;
