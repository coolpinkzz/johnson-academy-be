import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IMRTDoc, IMRTModel } from './mrt.interfaces';

const scoreField = (message: string) => ({
  type: Number,
  required: function (this: { isAbsent?: boolean }) {
    return !this.isAbsent;
  },
  min: 0,
  max: 5,
  default: 0,
  validate: {
    validator: function (this: { isAbsent?: boolean }, value: number) {
      if (this.isAbsent) return true;
      return Number.isInteger(value);
    },
    message,
  },
});

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
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Course',
    },
    isAbsent: {
      type: Boolean,
      default: false,
    },
    regularity: scoreField('Regularity must be an integer'),
    learningSpeed: scoreField('Learning Speed must be an integer'),
    theory: scoreField('Theory must be an integer'),
    technicalExercises: scoreField('Technical Exercises must be an integer'),
    repertoireRhythmSense: scoreField('Repertoire (Rhythm Sense) must be an integer'),
    repertoireDynamics: scoreField('Repertoire (Dynamics) must be an integer'),
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// One MRT per student + class + course + month (supports multiple courses per class)
mrtSchema.index({ month: 1, classId: 1, studentId: 1, courseId: 1 }, { unique: true });
// Reporting lookups match an enrollment, then filter months in memory.
mrtSchema.index({ studentId: 1, classId: 1, courseId: 1 });

const zeroAbsentScores = (doc: IMRTDoc) => {
  doc.regularity = 0;
  doc.learningSpeed = 0;
  doc.theory = 0;
  doc.technicalExercises = 0;
  doc.repertoireRhythmSense = 0;
  doc.repertoireDynamics = 0;
  doc.totalScore = 0;
  doc.averageScore = 0;
};

// Pre-save middleware to calculate total and average scores
mrtSchema.pre('save', function (this: any, next) {
  if (this.isAbsent) {
    zeroAbsentScores(this);
    next();
    return;
  }

  if (
    this.isModified('regularity') ||
    this.isModified('learningSpeed') ||
    this.isModified('theory') ||
    this.isModified('technicalExercises') ||
    this.isModified('repertoireRhythmSense') ||
    this.isModified('repertoireDynamics') ||
    this.isModified('isAbsent')
  ) {
    this.totalScore =
      this.regularity +
      this.learningSpeed +
      this.theory +
      this.technicalExercises +
      this.repertoireRhythmSense +
      this.repertoireDynamics;
    this.averageScore = Math.round(this.totalScore / 6);
  }
  next();
});

// Static method to check if month exists for a student in a class
mrtSchema.statics['isMonthExistsForStudent'] = async function (
  studentId: string,
  classId: string,
  month: string,
  courseId: string
): Promise<boolean> {
  const mrt = await this.findOne({ studentId, classId, month, courseId });
  return !!mrt;
};

// add plugin that converts mongoose to json
mrtSchema.plugin(toJSON);
mrtSchema.plugin(paginate);

const MRT = mongoose.model<IMRTDoc, IMRTModel>('MRT', mrtSchema);

export default MRT;
