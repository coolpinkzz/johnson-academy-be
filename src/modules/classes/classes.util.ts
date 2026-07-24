import mongoose from 'mongoose';

/**
 * MongoDB filter: class documents where the given user is a teacher.
 * Supports legacy `teacherId` until all documents are migrated to `teachers[]`.
 */
export function filterClassesByTeacher(teacherId: mongoose.Types.ObjectId) {
  return {
    $or: [{ teachers: teacherId }, { teacherId: teacherId }],
  };
}

/** Resolved teacher ids for a class (handles populated refs and legacy `teacherId`). */
export function resolveClassTeacherIds(classLike: Record<string, any>): string[] {
  const rawTeachers = classLike['teachers'];
  if (Array.isArray(rawTeachers) && rawTeachers.length > 0) {
    return rawTeachers.map((t) => {
      const id = t && typeof t === 'object' && t._id != null ? t._id : t;
      return id.toString();
    });
  }
  const leg = classLike['teacherId'];
  if (leg) {
    const id = leg && typeof leg === 'object' && leg._id != null ? leg._id : leg;
    return [id.toString()];
  }
  return [];
}

export function isUserClassTeacher(classLike: Record<string, any>, userId: string): boolean {
  return resolveClassTeacherIds(classLike).includes(userId);
}

/** HH:mm → minutes since midnight; returns null if invalid */
export function parseHhMmToMinutes(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function isDefaultTimeRangeValid(startTime?: string, endTime?: string): boolean {
  if (!startTime && !endTime) return true;
  if (!startTime || !endTime) return false;
  const start = parseHhMmToMinutes(startTime);
  const end = parseHhMmToMinutes(endTime);
  if (start == null || end == null) return false;
  return start < end;
}

export function getUniqueStudentCount(classLike: {
  students?: Array<mongoose.Types.ObjectId | string | { _id?: mongoose.Types.ObjectId }> | undefined;
  studentsInClass?:
    | Array<{ user: mongoose.Types.ObjectId | string | { _id?: mongoose.Types.ObjectId } }>
    | undefined;
}): number {
  const ids = new Set<string>();
  for (const s of classLike.students ?? []) {
    const id = s && typeof s === 'object' && '_id' in s && s._id != null ? s._id : s;
    if (id) ids.add(id.toString());
  }
  for (const entry of classLike.studentsInClass ?? []) {
    const u = entry.user;
    const id = u && typeof u === 'object' && '_id' in u && u._id != null ? u._id : u;
    if (id) ids.add(id.toString());
  }
  return ids.size;
}

/** Prefer unique studentsInClass; fall back to students[] */
export function getEnrolledStudentCount(classLike: {
  students?: Array<mongoose.Types.ObjectId | string | { _id?: mongoose.Types.ObjectId }> | undefined;
  studentsInClass?:
    | Array<{ user: mongoose.Types.ObjectId | string | { _id?: mongoose.Types.ObjectId } }>
    | undefined;
}): number {
  const fromInClass = new Set<string>();
  for (const entry of classLike.studentsInClass ?? []) {
    const u = entry.user;
    const id = u && typeof u === 'object' && '_id' in u && u._id != null ? u._id : u;
    if (id) fromInClass.add(id.toString());
  }
  if (fromInClass.size > 0) return fromInClass.size;
  return getUniqueStudentCount({ students: classLike.students });
}
