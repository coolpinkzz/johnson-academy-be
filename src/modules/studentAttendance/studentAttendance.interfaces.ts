import mongoose, { Model, Document } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export interface IStudentAttendance {
  studentId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  presentDates: Date[];
  absentDates: Date[];
  joiningDate: Date;
  lastDate?: Date;
  classesInOneWeek: string[];
}

export interface IStudentAttendanceDoc extends IStudentAttendance, Document {}

export interface IStudentAttendanceModel extends Model<IStudentAttendanceDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type UpdateStudentAttendanceBody = Partial<IStudentAttendance>;

export type NewStudentAttendance = IStudentAttendance; 