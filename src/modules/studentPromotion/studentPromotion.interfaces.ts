import mongoose, { Document, Model } from 'mongoose';

export interface IStudentPromotion {
  studentId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  targetCourseId: mongoose.Types.ObjectId;
  promotedBy?: mongoose.Types.ObjectId;
  promotedAt: Date;
}

export interface IStudentPromotionDoc extends IStudentPromotion, Document {}

export interface IStudentPromotionModel extends Model<IStudentPromotionDoc> {
  findByStudentAndClass(
    studentId: mongoose.Types.ObjectId,
    classId: mongoose.Types.ObjectId
  ): Promise<IStudentPromotionDoc[]>;
}

export type NewCreatedStudentPromotion = Omit<IStudentPromotion, 'promotedAt'> & {
  promotedAt?: Date;
};
