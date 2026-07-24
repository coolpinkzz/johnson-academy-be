import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { CLASS_WEEKDAYS, IClassesDoc, IClassesModel } from './classes.interfaces';

const classesSchema = new mongoose.Schema<IClassesDoc, IClassesModel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    branch: {
      type: String,
      trim: true,
    },
    academicYear: {
      type: String,
      trim: true,
    },
    teachers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    /** @deprecated Remove after migrateClassTeachers + DB cleanup — use `teachers` only */
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: 'User',
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: 'Course',
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    studentsInClass: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
    sessionCapacity: {
      type: Number,
      min: 1,
    },
    defaultWeekdays: {
      type: [
        {
          type: String,
          enum: CLASS_WEEKDAYS,
        },
      ],
      default: [],
    },
    defaultStartTime: {
      type: String,
      trim: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    defaultEndTime: {
      type: String,
      trim: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
  },
  {
    timestamps: true,
  }
);

classesSchema.path('teachers').validate(function (value: any[]) {
  // Legacy documents may only have `teacherId` until migration runs
  return (value && value.length > 0) || !!(this as mongoose.Document & { teacherId?: mongoose.Types.ObjectId }).teacherId;
}, 'At least one teacher is required');

classesSchema.plugin(toJSON);
classesSchema.plugin(paginate);

const Classes = mongoose.model<IClassesDoc, IClassesModel>('Classes', classesSchema);

export default Classes;
