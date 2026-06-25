import mongoose from 'mongoose';
import StudentPromotion from './studentPromotion.model';
import { IStudentPromotionDoc, NewCreatedStudentPromotion } from './studentPromotion.interfaces';

export const createStudentPromotion = async (
  promotionBody: NewCreatedStudentPromotion,
  session?: mongoose.ClientSession
): Promise<IStudentPromotionDoc> => {
  const [promotion] = await StudentPromotion.create([promotionBody], session ? { session } : undefined);
  return promotion!;
};

export const getPromotionsByStudentAndClass = async (
  studentId: mongoose.Types.ObjectId,
  classId: mongoose.Types.ObjectId
): Promise<IStudentPromotionDoc[]> => StudentPromotion.findByStudentAndClass(studentId, classId);

export const getPromotionByStudentClassAndCourse = async (
  studentId: mongoose.Types.ObjectId,
  classId: mongoose.Types.ObjectId,
  targetCourseId: mongoose.Types.ObjectId
): Promise<IStudentPromotionDoc | null> =>
  StudentPromotion.findOne({ studentId, classId, targetCourseId })
    .populate('studentId', 'name email role')
    .populate('classId', 'name')
    .populate('targetCourseId', 'name description instrument')
    .populate('promotedBy', 'name email role');
