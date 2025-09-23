import mongoose, { Document, Model } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export interface IMRT {
  month: string;
  classId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  sptAndFileSubmission: number;
  regularity: number;
  learningSpeed: number;
  songLearning: number;
  assignment: number;
  theoryAndTechnicals: number;
  totalScore?: number;
  averageScore?: number;
  remarks?: string;
  createdBy: string;
  updatedBy?: string;
}

export interface IMRTDoc extends IMRT, Document {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMRTModel extends Model<IMRTDoc> {
  isMonthExistsForStudent(studentId: string, classId: string, month: string): Promise<boolean>;
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export interface IMRTUpdateBody {
  sptAndFileSubmission?: number;
  regularity?: number;
  learningSpeed?: number;
  songLearning?: number;
  assignment?: number;
  theoryAndTechnicals?: number;
  remarks?: string;
}

export interface IMRTCreateBody {
  month: string;
  classId: string;
  studentId: string;
  sptAndFileSubmission: number;
  regularity: number;
  learningSpeed: number;
  songLearning: number;
  assignment: number;
  theoryAndTechnicals: number;
  remarks?: string;
}
