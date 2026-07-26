import mongoose, { Document, Model } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export interface IMRT {
  month: string;
  classId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  regularity: number;
  learningSpeed: number;
  theory: number;
  technicalExercises: number;
  repertoireRhythmSense: number;
  repertoireDynamics: number;
  totalScore?: number;
  averageScore?: number;
  remarks?: string;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
}

export interface IMRTDoc extends IMRT, Document {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMRTModel extends Model<IMRTDoc> {
  isMonthExistsForStudent(
    studentId: string,
    classId: string,
    month: string,
    courseId: string
  ): Promise<boolean>;
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export interface IMRTUpdateBody {
  regularity?: number;
  learningSpeed?: number;
  theory?: number;
  technicalExercises?: number;
  repertoireRhythmSense?: number;
  repertoireDynamics?: number;
  remarks?: string;
}

export interface IMRTCreateBody {
  month: string;
  classId: string;
  studentId: string;
  courseId: string;
  regularity: number;
  learningSpeed: number;
  theory: number;
  technicalExercises: number;
  repertoireRhythmSense: number;
  repertoireDynamics: number;
  remarks?: string;
}
