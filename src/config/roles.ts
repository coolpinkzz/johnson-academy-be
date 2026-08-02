/**
 * Backend API rights. Staff UI visibility is enforced on the admin FE (rbac.ts).
 *
 * admin / aqsd share the same staff API surface (including courses/syllabi/modules)
 * so FE can open or hide modules without BE 403s.
 *
 * teacher / student keep existing app-facing rights.
 */

const profileRights = ['uploadFiles', 'updateProfile'] as const;

const dashboardRights = ['manageSystem', 'viewReports'] as const;

const studentsTeachersRights = [
  'getStudents',
  'manageStudents',
  'getUsers',
  'manageUsers',
  'manageTeachers',
] as const;

const contentRights = [
  'getCourses',
  'manageCourses',
  'getSyllabi',
  'manageSyllabi',
  'getModules',
  'manageModules',
] as const;

const classesRights = [
  'getClasses',
  'manageClasses',
  'promoteStudents',
  'getStudentProgress',
  'manageStudentProgress',
] as const;

const attendanceRights = ['getAttendance', 'manageAttendance'] as const;

const monthlyReportRights = ['getMRT', 'manageMRT'] as const;

const compensationRights = ['getCompensationBookings', 'manageCompensationBookings'] as const;

const noticeBoardRights = ['getNotices', 'manageNotices'] as const;

const allRoles = {
  admin: [
    ...dashboardRights,
    ...studentsTeachersRights,
    ...contentRights,
    ...classesRights,
    ...attendanceRights,
    ...monthlyReportRights,
    ...compensationRights,
    ...profileRights,
    'getAssignments',
  ],
  aqsd: [
    ...dashboardRights,
    ...studentsTeachersRights,
    ...contentRights,
    ...classesRights,
    ...attendanceRights,
    ...monthlyReportRights,
    ...compensationRights,
    ...profileRights,
    'getAssignments',
  ],
  master: [
    ...dashboardRights,
    ...studentsTeachersRights,
    ...contentRights,
    ...classesRights,
    ...attendanceRights,
    ...monthlyReportRights,
    ...compensationRights,
    ...noticeBoardRights,
    ...profileRights,
    'getAssignments',
  ],
  teacher: [
    'getStudents',
    'manageStudents',
    'getCourses',
    'getSyllabi',
    'getModules',
    'getClasses',
    'promoteStudents',
    'viewReports',
    'manageAssignments',
    'getStudentProgress',
    'manageStudentProgress',
    'getAttendance',
    'manageAttendance',
    'getMRT',
    'manageMRT',
    'uploadFiles',
    'updateProfile',
    'getAssignments',
    'getCompensationBookings',
    'manageCompensationBookings',
  ],
  student: [
    'getStudents',
    'getCourses',
    'getSyllabi',
    'getModules',
    'getClasses',
    'viewAssignments',
    'submitAssignments',
    'viewGrades',
    'getStudentProgress',
    'getAttendance',
    'getMRT',
    'uploadFiles',
    'updateProfile',
    'getAssignments',
    'getCompensationBookings',
    'manageCompensationBookings',
  ],
};

/** Staff roles that manage academy operations (not teacher/student app users). */
export const staffRoles = ['admin', 'aqsd', 'master'] as const;

/** Roles allowed to manage classes (BE open for staff; FE gates UI). */
export const classManagerRoles = ['admin', 'aqsd', 'master'] as const;

/** Roles allowed to manage courses / syllabi / modules (BE open for staff; FE gates UI). */
export const contentManagerRoles = ['admin', 'aqsd', 'master'] as const;

export const roles: string[] = Object.keys(allRoles);
export const roleRights: Map<string, string[]> = new Map(Object.entries(allRoles));
