import mongoose, { Model, Document } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export interface ISyllabus {
  courseId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  theory: mongoose.Types.ObjectId[];
  technical: mongoose.Types.ObjectId[];
  learning: mongoose.Types.ObjectId[];
}

export interface ISyllabusDoc extends ISyllabus, Document {}

export interface ISyllabusModel extends Model<ISyllabusDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type UpdateSyllabusBody = Partial<ISyllabus>;

export type NewCreatedSyllabus = Omit<ISyllabus, '_id'>; 