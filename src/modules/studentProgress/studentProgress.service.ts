import httpStatus from 'http-status';
import mongoose from 'mongoose';
import StudentProgress from './studentProgress.model';
import Module from '../module/module.model';
import User from '../user/user.model';
import Classes from '../classes/classes.model';
import Course from '../course/course.model';
import { IModuleDoc } from '../module/module.interfaces';
import ApiError from '../errors/ApiError';
import { IOptions, QueryResult } from '../paginate/paginate';
import {
  NewCreatedStudentProgress,
  UpdateStudentProgressBody,
  IStudentProgressDoc,
  IModuleProgress,
  IUpdateModuleProgressBody,
  IStartModuleBody,
  IEndModuleBody,
} from './studentProgress.interfaces';

/**
 * Create student progress record
 * @param {NewCreatedStudentProgress} studentProgressBody
 * @returns {Promise<IStudentProgressDoc>}
 */
export const createStudentProgress = async (
  studentProgressBody: NewCreatedStudentProgress
): Promise<IStudentProgressDoc> => {
  // Validate that the student exists and is a student
  const student = await User.findById(studentProgressBody.studentId);
  if (!student) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student not found');
  }
  if (student.role !== 'student') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User must be a student');
  }

  // Validate that the class exists
  const classRecord = await Classes.findById(studentProgressBody.classId);
  if (!classRecord) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class not found');
  }

  // Validate that the course exists
  const course = await Course.findById(studentProgressBody.courseId);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // Check if progress record already exists for this student-class combination
  const existingProgress = await StudentProgress.findByStudentAndClass(
    studentProgressBody.studentId,
    studentProgressBody.classId
  );
  if (existingProgress) {
    throw new ApiError(httpStatus.CONFLICT, 'Progress record already exists for this student in this class');
  }

  return StudentProgress.create(studentProgressBody);
};

/**
 * Create progress record for a student when added to a class
 * @param {mongoose.Types.ObjectId} studentId
 * @param {mongoose.Types.ObjectId} classId
 * @param {mongoose.Types.ObjectId} courseId
 * @returns {Promise<IStudentProgressDoc>}
 */
export const createProgressForStudent = async (
  studentId: mongoose.Types.ObjectId,
  classId: mongoose.Types.ObjectId,
  courseId: mongoose.Types.ObjectId
): Promise<IStudentProgressDoc> => {
  return StudentProgress.createProgressForStudent(studentId, classId, courseId);
};

/**
 * Add newly created modules to existing student progress snapshots and recalculate totals.
 * Matches by syllabusProgress.syllabusId (not syllabus.courseId), because enrolled students
 * may use a different course document that still references the same syllabus.
 */
export const syncNewModulesToStudentProgress = async (modules: IModuleDoc[]): Promise<void> => {
  const modulesWithSyllabus = modules.filter((m) => m.syllabusId);
  if (modulesWithSyllabus.length === 0) {
    return;
  }

  const modulesBySyllabusId = new Map<string, IModuleDoc[]>();
  for (const mod of modulesWithSyllabus) {
    const syllabusKey = mod.syllabusId!.toString();
    const list = modulesBySyllabusId.get(syllabusKey) ?? [];
    list.push(mod);
    modulesBySyllabusId.set(syllabusKey, list);
  }

  for (const [syllabusIdStr, syllabusModules] of modulesBySyllabusId) {
    const syllabusObjectId = new mongoose.Types.ObjectId(syllabusIdStr);
    const progressRecords = await StudentProgress.find({
      'syllabusProgress.syllabusId': syllabusObjectId,
    });

    for (const progress of progressRecords) {
      let modified = false;
      let syllabusProgress = progress.syllabusProgress.find((sp) => sp.syllabusId.equals(syllabusObjectId));

      if (!syllabusProgress) {
        const courseIncludesSyllabus = await Course.exists({
          _id: progress.courseId,
          syllabus: syllabusObjectId,
        });
        if (!courseIncludesSyllabus) {
          continue;
        }

        const newSyllabusProgress = {
          syllabusId: syllabusObjectId,
          modules: [] as IModuleProgress[],
        };
        progress.syllabusProgress.push(newSyllabusProgress);
        syllabusProgress = newSyllabusProgress;
        modified = true;
      }

      for (const mod of syllabusModules) {
        const alreadyTracked = syllabusProgress.modules.some((mp) => mp.moduleId.equals(mod._id));
        if (!alreadyTracked) {
          const moduleProgress: IModuleProgress = {
            moduleId: mod._id,
            status: 'upcoming',
          };
          if (mod.seq !== undefined) {
            moduleProgress.seq = mod.seq;
          }
          syllabusProgress.modules.push(moduleProgress);
          modified = true;
        }
      }

      if (modified) {
        progress.totalModules = progress.syllabusProgress.reduce((sum, sp) => sum + sp.modules.length, 0);
        progress.markModified('syllabusProgress');
        await progress.calculateProgress();
      }
    }
  }
};

/**
 * Backfill all modules for a syllabus into matching student progress records (idempotent).
 */
export const syncAllModulesForSyllabusToStudentProgress = async (
  syllabusId: mongoose.Types.ObjectId
): Promise<void> => {
  const modules = await Module.find({ syllabusId }).sort({ seq: 1, createdAt: 1 });
  await syncNewModulesToStudentProgress(modules);
};

/**
 * Query for student progress records
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryStudentProgress = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  const studentProgress = await StudentProgress.paginate(filter, options);
  return studentProgress;
};

/**
 * Get student progress by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IStudentProgressDoc | null>}
 */
export const getStudentProgressById = async (id: mongoose.Types.ObjectId): Promise<IStudentProgressDoc | null> =>
  StudentProgress.findById(id)
    .populate('studentId', 'name email role')
    .populate('classId', 'name')
    .populate('courseId', 'name description')
    .populate('syllabusProgress.syllabusId', 'title description')
    .populate('syllabusProgress.modules.moduleId', 'title description type session seq resources');

/**
 * Get student progress by student and class
 * @param {mongoose.Types.ObjectId} studentId
 * @param {mongoose.Types.ObjectId} classId
 * @returns {Promise<IStudentProgressDoc | null>}
 */
export const getStudentProgressByStudentAndClass = async (
  studentId: mongoose.Types.ObjectId,
  classId: mongoose.Types.ObjectId
): Promise<IStudentProgressDoc | null> => StudentProgress.findByStudentAndClass(studentId, classId);

/**
 * Get all progress records for a student
 * @param {mongoose.Types.ObjectId} studentId
 * @returns {Promise<IStudentProgressDoc[]>}
 */
export const getStudentProgressByStudent = async (studentId: mongoose.Types.ObjectId): Promise<IStudentProgressDoc[]> =>
  StudentProgress.findByStudent(studentId);

/**
 * Get all progress records for a class
 * @param {mongoose.Types.ObjectId} classId
 * @returns {Promise<IStudentProgressDoc[]>}
 */
export const getStudentProgressByClass = async (classId: mongoose.Types.ObjectId): Promise<IStudentProgressDoc[]> =>
  StudentProgress.findByClass(classId);

/**
 * Get all progress records for a course
 * @param {mongoose.Types.ObjectId} courseId
 * @returns {Promise<IStudentProgressDoc[]>}
 */
export const getStudentProgressByCourse = async (courseId: mongoose.Types.ObjectId): Promise<IStudentProgressDoc[]> =>
  StudentProgress.findByCourse(courseId);

/**
 * Update student progress by id
 * @param {mongoose.Types.ObjectId} studentProgressId
 * @param {UpdateStudentProgressBody} updateBody
 * @returns {Promise<IStudentProgressDoc | null>}
 */
export const updateStudentProgressById = async (
  studentProgressId: mongoose.Types.ObjectId,
  updateBody: UpdateStudentProgressBody
): Promise<IStudentProgressDoc | null> => {
  const studentProgress = await getStudentProgressById(studentProgressId);
  if (!studentProgress) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student progress not found');
  }

  Object.assign(studentProgress, updateBody);
  await studentProgress.save();
  return studentProgress;
};

/**
 * Update module progress for a student
 * @param {mongoose.Types.ObjectId} studentProgressId
 * @param {IUpdateModuleProgressBody} updateBody
 * @returns {Promise<IStudentProgressDoc | null>}
 */
export const updateModuleProgress = async (
  studentProgressId: mongoose.Types.ObjectId,
  updateBody: IUpdateModuleProgressBody
): Promise<IStudentProgressDoc | null> => {
  const studentProgress = await getStudentProgressById(studentProgressId);
  if (!studentProgress) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student progress not found');
  }

  await studentProgress.updateModuleStatus(updateBody.moduleId, updateBody.status, updateBody.score);

  return studentProgress;
};

/**
 * Delete student progress by id
 * @param {mongoose.Types.ObjectId} studentProgressId
 * @returns {Promise<IStudentProgressDoc | null>}
 */
export const deleteStudentProgressById = async (
  studentProgressId: mongoose.Types.ObjectId
): Promise<IStudentProgressDoc | null> => {
  const studentProgress = await getStudentProgressById(studentProgressId);
  if (!studentProgress) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student progress not found');
  }
  await studentProgress.deleteOne();
  return studentProgress;
};

/**
 * Get progress statistics for a class
 * @param {mongoose.Types.ObjectId} classId
 * @returns {Promise<Object>}
 */
export const getClassProgressStatistics = async (classId: mongoose.Types.ObjectId): Promise<Object> => {
  const progressRecords = await getStudentProgressByClass(classId);

  if (progressRecords.length === 0) {
    return {
      totalStudents: 0,
      averageProgress: 0,
      completedStudents: 0,
      inProgressStudents: 0,
      notStartedStudents: 0,
    };
  }

  const totalStudents = progressRecords.length;
  const averageProgress = Math.round(progressRecords.reduce((sum, record) => sum + record.progress, 0) / totalStudents);
  const completedStudents = progressRecords.filter((record) => record.progress === 100).length;
  const inProgressStudents = progressRecords.filter((record) => record.progress > 0 && record.progress < 100).length;
  const notStartedStudents = progressRecords.filter((record) => record.progress === 0).length;

  return {
    totalStudents,
    averageProgress,
    completedStudents,
    inProgressStudents,
    notStartedStudents,
  };
};

/**
 * Get progress statistics for a course
 * @param {mongoose.Types.ObjectId} courseId
 * @returns {Promise<Object>}
 */
export const getCourseProgressStatistics = async (courseId: mongoose.Types.ObjectId): Promise<Object> => {
  const progressRecords = await getStudentProgressByCourse(courseId);

  if (progressRecords.length === 0) {
    return {
      totalStudents: 0,
      averageProgress: 0,
      completedStudents: 0,
      inProgressStudents: 0,
      notStartedStudents: 0,
    };
  }

  const totalStudents = progressRecords.length;
  const averageProgress = Math.round(progressRecords.reduce((sum, record) => sum + record.progress, 0) / totalStudents);
  const completedStudents = progressRecords.filter((record) => record.progress === 100).length;
  const inProgressStudents = progressRecords.filter((record) => record.progress > 0 && record.progress < 100).length;
  const notStartedStudents = progressRecords.filter((record) => record.progress === 0).length;

  return {
    totalStudents,
    averageProgress,
    completedStudents,
    inProgressStudents,
    notStartedStudents,
  };
};

/**
 * Start a module for a student
 * @param {mongoose.Types.ObjectId} studentProgressId
 * @param {IStartModuleBody} startBody
 * @returns {Promise<IStudentProgressDoc | null>}
 */
export const startModule = async (
  studentProgressId: mongoose.Types.ObjectId,
  startBody: IStartModuleBody
): Promise<IStudentProgressDoc | null> => {
  const studentProgress = await StudentProgress.findById(studentProgressId);
  if (!studentProgress) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student progress not found');
  }

  // Find the syllabus progress that contains the module
  const syllabusProgress = studentProgress.syllabusProgress.find(
    (sp) => sp.syllabusId.toString() === startBody.syllabusId.toString()
  );

  if (!syllabusProgress) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Syllabus progress not found');
  }

  // Find the module in the syllabus
  const moduleProgress = syllabusProgress.modules.find((mp) => mp.moduleId.toString() === startBody.moduleId.toString());

  if (!moduleProgress) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Module not found in syllabus');
  }

  // Check if module is in upcoming status
  if (moduleProgress.status !== 'upcoming') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Module must be in upcoming status to start');
  }

  // Use the existing updateModuleStatus method to update the module
  await studentProgress.updateModuleStatus(startBody.moduleId, 'inprogress');

  return studentProgress;
};

/**
 * End a module for a student
 * @param {mongoose.Types.ObjectId} studentProgressId
 * @param {IEndModuleBody} endBody
 * @returns {Promise<IStudentProgressDoc | null>}
 */
export const endModule = async (
  studentProgressId: mongoose.Types.ObjectId,
  endBody: IEndModuleBody
): Promise<IStudentProgressDoc | null> => {
  const studentProgress = await StudentProgress.findById(studentProgressId);
  if (!studentProgress) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student progress not found');
  }

  // Find the syllabus progress that contains the module
  const syllabusProgress = studentProgress.syllabusProgress.find(
    (sp) => sp.syllabusId.toString() === endBody.syllabusId.toString()
  );

  if (!syllabusProgress) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Syllabus progress not found');
  }

  // Find the module in the syllabus
  const moduleProgress = syllabusProgress.modules.find((mp) => mp.moduleId.toString() === endBody.moduleId.toString());

  if (!moduleProgress) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Module not found in syllabus');
  }

  // Check if module is in inprogress status
  if (moduleProgress.status !== 'inprogress') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Module must be in inprogress status to end');
  }

  // Validate score range
  if (endBody.score < 0 || endBody.score > 100) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Score must be between 0 and 100');
  }

  // Use the existing updateModuleStatus method to update the module
  await studentProgress.updateModuleStatus(endBody.moduleId, 'completed', endBody.score);

  return studentProgress;
};
