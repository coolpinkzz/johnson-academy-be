const allRoles = {
  admin: [
    'getUsers',
    'manageUsers',
    'getCourses',
    'manageCourses',
    'getSyllabi',
    'manageSyllabi',
    'getModules',
    'manageModules',
    'manageStudents',
    'manageTeachers',
    'getClasses',
    'manageClasses',
    'viewReports',
    'manageSystem',
    'getStudentProgress',
    'manageStudentProgress'
  ],
  teacher: [
    'getStudents',
    'manageStudents',
    'getCourses',
    'getSyllabi',
    'getModules',
    'getClasses',
    'viewReports',
    'manageAssignments',
    'getStudentProgress',
    'manageStudentProgress'
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
    'getStudentProgress'
  ],
};

export const roles: string[] = Object.keys(allRoles);
export const roleRights: Map<string, string[]> = new Map(Object.entries(allRoles));
