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
