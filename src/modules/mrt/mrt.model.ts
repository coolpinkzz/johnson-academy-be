import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IMRTDoc, IMRTModel } from './mrt.interfaces';

const mrtSchema = new mongoose.Schema<IMRTDoc, IMRTModel>(
  {
    month: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (value: string) {
          // Validate month format (YYYY-MM or MM-YYYY)
          const monthRegex = /^(0[1-9]|1[0-2])-\d{4}$|^\d{4}-(0[1-9]|1[0-2])$/;
          return monthRegex.test(value);
        },
        message: 'Month must be in format MM-YYYY or YYYY-MM',
      },
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Classes',
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    sptAndFileSubmission: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'SPT & File Submission must be an integer',
      },
    },
    regularity: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Regularity must be an integer',
      },
    },
    learningSpeed: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Learning Speed must be an integer',
      },
    },
    songLearning: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Song Learning must be an integer',
      },
    },
    assignment: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Assignment must be an integer',
      },
    },
    theoryAndTechnicals: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Theory and Technical must be an integer',
      },
    },
    totalScore: {
      type: Number,
      min: 0,
      max: 30,
      default: 0,
    },
    averageScore: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique month per student per class
mrtSchema.index({ month: 1, classId: 1, studentId: 1 }, { unique: true });

// Pre-save middleware to calculate total and average scores
mrtSchema.pre('save', function (this: any, next) {
  if (
    this.isModified('sptAndFileSubmission') ||
    this.isModified('regularity') ||
    this.isModified('learningSpeed') ||
    this.isModified('songLearning') ||
    this.isModified('assignment') ||
    this.isModified('theoryAndTechnicals')
  ) {
    this.totalScore =
      this.sptAndFileSubmission +
      this.regularity +
      this.learningSpeed +
      this.songLearning +
      this.assignment +
      this.theoryAndTechnicals;
    this.averageScore = Math.round(this.totalScore / 6);
  }
  next();
});

// Static method to check if month exists for a student in a class
mrtSchema.statics['isMonthExistsForStudent'] = async function (
  studentId: string,
  classId: string,
  month: string
): Promise<boolean> {
  const mrt = await this.findOne({ studentId, classId, month });
  return !!mrt;
};

// add plugin that converts mongoose to json
mrtSchema.plugin(toJSON);
mrtSchema.plugin(paginate);

const MRT = mongoose.model<IMRTDoc, IMRTModel>('MRT', mrtSchema);

export default MRT;
