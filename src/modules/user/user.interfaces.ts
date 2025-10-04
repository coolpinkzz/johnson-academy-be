import mongoose, { Model, Document } from 'mongoose';
import { QueryResult } from '../paginate/paginate';
import { AccessAndRefreshTokens } from '../token/token.interfaces';

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: string;
  rollNumber?: string;
  isEmailVerified: boolean;
  // Academy-specific fields
  studentId?: string;
  teacherId?: string;
  department?: string;
  gradeLevel?: string;
  subjects?: string[];
  enrollmentDate?: Date;
  graduationDate?: Date;
  isActive: boolean;
  isCompleteProfile: boolean;
  profilePicture?: string;
  phoneNumber?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
    email: string;
  };
  // Relationship fields
  classes?: mongoose.Types.ObjectId[];
  courses?: mongoose.Types.ObjectId[];
  progress?: mongoose.Types.ObjectId[];
}

export interface IUserDoc extends IUser, Document {
  isPasswordMatch(password: string): Promise<boolean>;
}

export interface IUserModel extends Model<IUserDoc> {
  isEmailTaken(email: string, excludeUserId?: mongoose.Types.ObjectId): Promise<boolean>;
  isStudentIdTaken(studentId: string, excludeUserId?: mongoose.Types.ObjectId): Promise<boolean>;
  isTeacherIdTaken(teacherId: string, excludeUserId?: mongoose.Types.ObjectId): Promise<boolean>;
  isRollNumberTaken(rollNumber: string, excludeUserId?: mongoose.Types.ObjectId): Promise<boolean>;
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type UpdateUserBody = Partial<IUser>;

export type NewRegisteredUser = Omit<IUser, 'isEmailVerified' | 'isActive'>;

export type NewCreatedUser = Omit<IUser, 'isEmailVerified'>;

export interface IUserWithTokens {
  user: IUserDoc;
  tokens: AccessAndRefreshTokens;
}
