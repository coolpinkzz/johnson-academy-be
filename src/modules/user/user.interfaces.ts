import mongoose, { Model, Document } from 'mongoose';
import { QueryResult } from '../paginate/paginate';
import { AccessAndRefreshTokens } from '../token/token.interfaces';

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: string;
  isEmailVerified: boolean;
  isActive?: boolean;
  rollNumber?: string;
  branch?: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  profilePicture?: string;
  dateOfBirth?: string;
  occupation?: string;
  gender?: string;
  address?: string;
  referralSource?: string;
  referralSourceOther?: string;
  dateOfJoining?: string;
  motherName?: string;
  fatherName?: string;
  guardians?: { name: string; relation: string }[];
  courses?: { id: string; name: string; instrument?: string }[];
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
    email?: string;
  };
  isCompleteProfile?: boolean;
  isProfileCardComplete?: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  createdAt?: Date;
  deletionHistory?: {
    deletedAt: Date;
    deletedBy: mongoose.Types.ObjectId;
    deletedByName: string;
    restoredAt: Date | null;
    restoredBy: mongoose.Types.ObjectId | null;
    restoredByName: string | null;
    wasActive: boolean;
  }[];
}

export interface IUserDoc extends IUser, Document {
  isPasswordMatch(password: string): Promise<boolean>;
}

export interface IUserModel extends Model<IUserDoc> {
  isEmailTaken(email: string, excludeUserId?: mongoose.Types.ObjectId): Promise<boolean>;
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type UpdateUserBody = Partial<IUser>;

export type NewRegisteredUser = Omit<IUser, 'role' | 'isEmailVerified'>;

export type NewCreatedUser = Omit<IUser, 'isEmailVerified'>;

export interface IUserWithTokens {
  user: IUserDoc;
  tokens: AccessAndRefreshTokens;
}
