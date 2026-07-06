import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IStudentProgressDoc, IStudentProgressModel } from './studentProgress.interfaces';

const moduleProgressSchema = new mongoose.Schema(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Module',
    },
    seq: {
      type: Number,
      required: false,
    },
    status: {
      type: String,
      enum: ['completed', 'inprogress', 'upcoming'],
      default: 'upcoming',
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    dateTakenToComplete: {
      type: Number,
      min: 0,
    },
  },
  { _id: false }
);

const syllabusProgressSchema = new mongoose.Schema(
  {
    syllabusId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Syllabus',
    },
    modules: [moduleProgressSchema],
  },
  { _id: false }
);

const studentProgressSchema = new mongoose.Schema<IStudentProgressDoc, IStudentProgressModel>(
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
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Course',
    },
    progress: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    syllabusProgress: [syllabusProgressSchema],
    totalModules: {
      type: Number,
      required: true,
      default: 0,
    },
    completedModules: {
      type: Number,
      required: true,
      default: 0,
    },
    inProgressModules: {
      type: Number,
      required: true,
      default: 0,
    },
    upcomingModules: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// One progress record per student + class + course (supports multiple courses per class)
studentProgressSchema.index({ studentId: 1, classId: 1, courseId: 1 }, { unique: true });

// add plugin that converts mongoose to json
studentProgressSchema.plugin(toJSON);
studentProgressSchema.plugin(paginate);

/**
 * Calculate progress percentage based on completed modules
 */
studentProgressSchema.methods['calculateProgress'] = async function (): Promise<number> {
  if (this['totalModules'] === 0) return 0;

  const completedCount = this['syllabusProgress'].reduce((total: number, syllabus: { modules: { status: string }[] }) => {
    return total + syllabus.modules.filter((module: { status: string }) => module.status === 'completed').length;
  }, 0);

  this['completedModules'] = completedCount;
  this['inProgressModules'] = this['syllabusProgress'].reduce(
    (total: number, syllabus: { modules: { status: string }[] }) => {
      return total + syllabus.modules.filter((module: { status: string }) => module.status === 'inprogress').length;
    },
    0
  );
  this['upcomingModules'] = this['totalModules'] - this['completedModules'] - this['inProgressModules'];

  this['progress'] = Math.round((completedCount / this['totalModules']) * 100);
  await this['save']();

  return this['progress'];
};

/**
 * Update module status and recalculate progress
 */
studentProgressSchema.methods['updateModuleStatus'] = async function (
  moduleId: mongoose.Types.ObjectId,
  status: string,
  score?: number
): Promise<void> {
  let moduleFound = false;

  for (const syllabus of this['syllabusProgress']) {
    const module = syllabus.modules.find((m: { moduleId: mongoose.Types.ObjectId }) => m.moduleId.equals(moduleId));
    if (module) {
      module.status = status as 'completed' | 'inprogress' | 'upcoming';
      if (score !== undefined) module.score = score;

      if (status === 'inprogress' && !module.startDate) {
        module.startDate = new Date();
      }

      if (status === 'completed') {
        module.endDate = new Date();
        if (module.startDate) {
          const timeDiff = module.endDate.getTime() - module.startDate.getTime();
          module.dateTakenToComplete = Math.ceil(timeDiff / (1000 * 3600 * 24)); // Convert to days
        }
      }

      if (status === 'upcoming') {
        delete module.startDate;
        delete module.endDate;
        delete module.score;
        delete module.dateTakenToComplete;
      }

      moduleFound = true;
      break;
    }
  }

  if (!moduleFound) {
    throw new Error('Module not found in student progress');
  }

  await this['calculateProgress']();
};

const progressPopulateOptions = [
  { path: 'studentId', select: 'name email role' },
  { path: 'classId', select: 'name' },
  { path: 'courseId', select: 'name description' },
  { path: 'syllabusProgress.syllabusId', select: 'title description' },
  {
    path: 'syllabusProgress.modules.moduleId',
    select: 'title description type session seq resources',
  },
];

/**
 * Find all progress records for a student in a class (multiple courses)
 */
studentProgressSchema.static(
  'findAllByStudentAndClass',
  async function (
    studentId: mongoose.Types.ObjectId,
    classId: mongoose.Types.ObjectId
  ): Promise<IStudentProgressDoc[]> {
    return this['find']({ studentId, classId }).populate(progressPopulateOptions);
  }
);

/**
 * Find progress by student, class, and course
 */
studentProgressSchema.static(
  'findByStudentClassAndCourse',
  async function (
    studentId: mongoose.Types.ObjectId,
    classId: mongoose.Types.ObjectId,
    courseId: mongoose.Types.ObjectId
  ): Promise<IStudentProgressDoc | null> {
    return this['findOne']({ studentId, classId, courseId }).populate(progressPopulateOptions);
  }
);

/**
 * Find progress by student and class (returns first match — prefer findAllByStudentAndClass or findByStudentClassAndCourse)
 */
studentProgressSchema.static(
  'findByStudentAndClass',
  async function (
    studentId: mongoose.Types.ObjectId,
    classId: mongoose.Types.ObjectId
  ): Promise<IStudentProgressDoc | null> {
    return this['findOne']({ studentId, classId }).populate(progressPopulateOptions);
  }
);

/**
 * Find all progress records for a student
 */
studentProgressSchema.static('findByStudent', async function (studentId: mongoose.Types.ObjectId): Promise<
  IStudentProgressDoc[]
> {
  return this['find']({ studentId })
    .populate('studentId', 'name email role')
    .populate('classId', 'name')
    .populate('courseId', 'name description')
    .populate('syllabusProgress.syllabusId', 'title description')
    .populate('syllabusProgress.modules.moduleId', 'title description type session seq resources');
});

/**
 * Find all progress records for a class
 */
studentProgressSchema.static('findByClass', async function (classId: mongoose.Types.ObjectId): Promise<
  IStudentProgressDoc[]
> {
  return this['find']({ classId })
    .populate('studentId', 'name email role')
    .populate('classId', 'name')
    .populate('courseId', 'name description')
    .populate('syllabusProgress.syllabusId', 'title description')
    .populate('syllabusProgress.modules.moduleId', 'title description type session seq resources');
});

/**
 * Find all progress records for a course
 */
studentProgressSchema.static('findByCourse', async function (courseId: mongoose.Types.ObjectId): Promise<
  IStudentProgressDoc[]
> {
  return this['find']({ courseId })
    .populate('studentId', 'name email role')
    .populate('classId', 'name')
    .populate('courseId', 'name description')
    .populate('syllabusProgress.syllabusId', 'title description')
    .populate('syllabusProgress.modules.moduleId', 'title description type session seq resources');
});

/**
 * Create progress record for a student when added to a class
 */
studentProgressSchema.static(
  'createProgressForStudent',
  async function (
    studentId: mongoose.Types.ObjectId,
    classId: mongoose.Types.ObjectId,
    courseId: mongoose.Types.ObjectId | any,
    session?: mongoose.ClientSession
  ): Promise<IStudentProgressDoc> {
    // Import required models
    const Course = mongoose.model('Course');
    const Syllabus = mongoose.model('Syllabus');

    // Extract actual courseId if it's a populated object
    const actualCourseId = courseId && typeof courseId === 'object' && courseId._id ? courseId._id : courseId;

    // Get course and its syllabi
    const course = await Course.findById(actualCourseId);
    if (!course) {
      throw new Error('Course not found');
    }

    // Use the course's syllabus array to get syllabi directly
    // If syllabus array exists and has values, use it; otherwise fall back to querying by courseId
    let syllabi = [];
    if (course.syllabus && Array.isArray(course.syllabus) && course.syllabus.length > 0) {
      // Get syllabi by their IDs from the course's syllabus array
      syllabi = await Syllabus.find({ _id: { $in: course.syllabus } });
    } else {
      // Fallback: query syllabi by courseId
      syllabi = await Syllabus.find({ courseId: actualCourseId });
    }

    if (syllabi.length === 0) {
      throw new Error('No syllabi found for this course');
    }

    // Calculate total modules across all syllabi
    let totalModules = 0;
    const syllabusProgress = [];

    for (const syllabus of syllabi) {
      // Get modules for this syllabus, sorted by seq (then session, createdAt as fallback)
      const Module = mongoose.model('Module');
      const modules = await Module.find({ syllabusId: syllabus._id }).sort({ seq: 1, createdAt: 1 });

      totalModules += modules.length;

      // Create module progress entries for this syllabus, preserving seq from each module
      const moduleProgress = modules.map((module) => ({
        moduleId: module._id,
        seq: module.seq,
        status: 'upcoming' as const,
      }));

      syllabusProgress.push({
        syllabusId: syllabus._id,
        modules: moduleProgress,
      });
    }

    // Create the progress record
    const progressData = {
      studentId,
      classId,
      courseId: actualCourseId,
      progress: 0,
      syllabusProgress,
      totalModules,
      completedModules: 0,
      inProgressModules: 0,
      upcomingModules: totalModules,
    };

    const createOptions = session ? { session } : {};
    return this['create']([progressData], createOptions).then((docs: IStudentProgressDoc[]) => docs[0]!);
  }
);

const StudentProgress = mongoose.model<IStudentProgressDoc, IStudentProgressModel>('StudentProgress', studentProgressSchema);

export default StudentProgress;
