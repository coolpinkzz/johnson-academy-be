import mongoose, { Model, Document } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export interface IModuleProgress {
  moduleId: mongoose.Types.ObjectId;
  status: 'completed' | 'inprogress' | 'upcoming';
  score?: number;
  startDate?: Date;
  endDate?: Date;
  dateTakenToComplete?: number; // in days
}

export interface ISyllabusProgress {
  syllabusId: mongoose.Types.ObjectId;
  modules: IModuleProgress[];
}

export interface IStudentProgress {
  studentId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  progress: number; // percentage 1-100
  syllabusProgress: ISyllabusProgress[];
  totalModules: number;
  completedModules: number;
  inProgressModules: number;
  upcomingModules: number;
}

export interface IStudentProgressDoc extends IStudentProgress, Document {
  calculateProgress(): Promise<number>;
  updateModuleStatus(moduleId: mongoose.Types.ObjectId, status: string, score?: number): Promise<void>;
}

export interface IStudentProgressModel extends Model<IStudentProgressDoc> {
  findByStudentAndClass(
    studentId: mongoose.Types.ObjectId,
    classId: mongoose.Types.ObjectId
  ): Promise<IStudentProgressDoc | null>;
  findByStudent(studentId: mongoose.Types.ObjectId): Promise<IStudentProgressDoc[]>;
  findByClass(classId: mongoose.Types.ObjectId): Promise<IStudentProgressDoc[]>;
  findByCourse(courseId: mongoose.Types.ObjectId): Promise<IStudentProgressDoc[]>;
  createProgressForStudent(
    studentId: mongoose.Types.ObjectId,
    classId: mongoose.Types.ObjectId,
    courseId: mongoose.Types.ObjectId
  ): Promise<IStudentProgressDoc>;
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type NewCreatedStudentProgress = IStudentProgress;

export type UpdateStudentProgressBody = Partial<IStudentProgress>;

export interface IUpdateModuleProgressBody {
  moduleId: mongoose.Types.ObjectId;
  syllabusId: mongoose.Types.ObjectId;
  status: 'completed' | 'inprogress' | 'upcoming';
  score?: number;
}

export interface IStartModuleBody {
  moduleId: mongoose.Types.ObjectId;
  syllabusId: mongoose.Types.ObjectId;
}

export interface IEndModuleBody {
  moduleId: mongoose.Types.ObjectId;
  syllabusId: mongoose.Types.ObjectId;
  score: number;
}
