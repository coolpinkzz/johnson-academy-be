import mongoose, { Model, Document } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export interface IAssignmentSubmission {
  student: mongoose.Types.ObjectId;
  submittedAt?: Date;
  fileUrl?: string;
  grade?: string;
  feedback?: string;
}

export interface IAssignment {
  title: string;
  description: string;
  attachments?: string[];
  status: 'assigned' | 'submitted' | 'graded';
  students: mongoose.Types.ObjectId[];
  classId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  submissions: IAssignmentSubmission[];
  dueDate: Date;
  createdBy: mongoose.Types.ObjectId;
}

export interface IAssignmentDoc extends IAssignment, Document {}

export interface IAssignmentModel extends Model<IAssignmentDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type UpdateAssignmentBody = Partial<IAssignment>;

export type NewCreatedAssignment = Omit<IAssignment, '_id'>;

export type UpdateSubmissionBody = {
  fileUrl?: string;
  grade?: string;
  feedback?: string;
};
