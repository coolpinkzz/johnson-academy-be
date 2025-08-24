import mongoose, { Model, Document } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export interface ICourse {
  name: string;
  description: string;
  image?: string;
  syllabus?: mongoose.Types.ObjectId[];
  instrument: string;
}

export interface ICourseDoc extends ICourse, Document {}

export interface ICourseModel extends Model<ICourseDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type UpdateCourseBody = Partial<ICourse>;

export type NewCreatedCourse = ICourse;
