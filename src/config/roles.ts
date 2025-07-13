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
    'manageSystem'
  ],
  teacher: [
    'getStudents',
    'manageStudents',
    'getCourses',
    'getSyllabi',
    'getModules',
    'getClasses',
    'viewReports',
    'manageAssignments'
  ],
  student: [
    'getCourses',
    'getSyllabi',
    'getModules',
    'getClasses',
    'viewAssignments',
    'submitAssignments',
    'viewGrades'
  ],
};

export const roles: string[] = Object.keys(allRoles);
export const roleRights: Map<string, string[]> = new Map(Object.entries(allRoles));
