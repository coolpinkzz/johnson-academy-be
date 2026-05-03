import Classes from '../classes/classes.model';
import Course from '../course/course.model';
import User from '../user/user.model';
import { IDashboardAggregates } from './dashboard.interfaces';

/**
 * Core dashboard counts aligned with listing behavior: active students/teachers,
 * all class and course documents.
 */
export async function getDashboardAggregates(): Promise<IDashboardAggregates> {
  const [totalStudents, totalTeachers, totalClasses, totalCourses] = await Promise.all([
    User.countDocuments({ role: 'student', isActive: true }),
    User.countDocuments({ role: 'teacher', isActive: true }),
    Classes.countDocuments({}),
    Course.countDocuments({}),
  ]);

  return { totalStudents, totalTeachers, totalClasses, totalCourses };
}
