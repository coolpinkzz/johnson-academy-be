import mongoose, { Model, Document } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export interface IStudentInClass {
  user: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
}

export interface IClasses {
  name: string;
  teachers: mongoose.Types.ObjectId[];
  /** @deprecated Use `teachers`; kept for migration backward compatibility */
  teacherId?: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  students: mongoose.Types.ObjectId[];
  studentsInClass?: IStudentInClass[];
}

export interface IClassesDoc extends IClasses, Document {}

export interface IClassesModel extends Model<IClassesDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type UpdateClassesBody = Partial<IClasses>;

/** Payload for POST /classes (supports legacy `teacherId`) */
export type NewCreatedClasses = {
  name: string;
  teachers?: mongoose.Types.ObjectId[];
  /** @deprecated send `teachers` array instead */
  teacherId?: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  students?: mongoose.Types.ObjectId[];
  studentsInClass?: IStudentInClass[];
};
