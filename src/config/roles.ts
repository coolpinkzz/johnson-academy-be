const allRoles = {
  user: [],
  student: [],
  teacher: [],
  admin: ['getUsers', 'manageUsers', 'deleteUsers', 'restoreUsers', 'getStudentFees', 'manageStudentFees'],
  master: ['getUsers', 'manageUsers', 'deleteUsers', 'restoreUsers', 'getStudentFees', 'manageStudentFees'],
  aqsd: ['getUsers', 'deleteUsers', 'restoreUsers', 'getStudentFees'],
};

export const roles: string[] = Object.keys(allRoles);
export const roleRights: Map<string, string[]> = new Map(Object.entries(allRoles));
