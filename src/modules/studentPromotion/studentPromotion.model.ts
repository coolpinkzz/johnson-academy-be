import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IStudentPromotionDoc, IStudentPromotionModel } from './studentPromotion.interfaces';

const studentPromotionSchema = new mongoose.Schema<IStudentPromotionDoc, IStudentPromotionModel>(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Classes',
    },
    targetCourseId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Course',
    },
    promotedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    promotedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

studentPromotionSchema.index({ studentId: 1, classId: 1, promotedAt: -1 });
studentPromotionSchema.index({ studentId: 1, classId: 1, targetCourseId: 1 }, { unique: true });

studentPromotionSchema.static(
  'findByStudentAndClass',
  async function (
    studentId: mongoose.Types.ObjectId,
    classId: mongoose.Types.ObjectId
  ): Promise<IStudentPromotionDoc[]> {
    return this['find']({ studentId, classId })
      .sort({ promotedAt: -1 })
      .populate('studentId', 'name email role')
      .populate('classId', 'name')
      .populate('targetCourseId', 'name description instrument')
      .populate('promotedBy', 'name email role');
  }
);

studentPromotionSchema.plugin(toJSON);
studentPromotionSchema.plugin(paginate);

const StudentPromotion = mongoose.model<IStudentPromotionDoc, IStudentPromotionModel>(
  'StudentPromotion',
  studentPromotionSchema
);

export default StudentPromotion;
