import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IStudentAttendanceDoc, IStudentAttendanceModel } from './studentAttendance.interfaces';

const studentAttendanceSchema = new mongoose.Schema<IStudentAttendanceDoc, IStudentAttendanceModel>(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classes',
      required: true,
    },
    presentDates: [{
      type: Date,
      default: [],
    }],
    absentDates: [{
      type: Date,
      default: [],
    }],
    joiningDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastDate: {
      type: Date,
    },
    classesInOneWeek: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      default: [],
    }],
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
studentAttendanceSchema.plugin(toJSON);
studentAttendanceSchema.plugin(paginate);

// Create compound index for studentId and classId to ensure unique combination
studentAttendanceSchema.index({ studentId: 1, classId: 1 }, { unique: true });

const StudentAttendance = mongoose.model<IStudentAttendanceDoc, IStudentAttendanceModel>('StudentAttendance', studentAttendanceSchema);

export default StudentAttendance; 