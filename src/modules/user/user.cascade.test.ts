import mongoose from 'mongoose';
import { deleteUserById } from './user.service';
import User from './user.model';
import StudentProgress from '../studentProgress/studentProgress.model';
import StudentAttendance from '../studentAttendance/studentAttendance.model';
import MRT from '../mrt/mrt.model';
import Token from '../token/token.model';
import Classes from '../classes/classes.model';

/**
 * Test function to demonstrate cascade deletion
 * This is a utility function for testing purposes
 */
export const testCascadeDeletion = async (userId: string) => {
  try {
    console.log('Testing cascade deletion for user:', userId);

    // Get counts before deletion
    const beforeCounts = {
      studentProgress: await StudentProgress.countDocuments({ studentId: userId }),
      studentAttendance: await StudentAttendance.countDocuments({ studentId: userId }),
      mrt: await MRT.countDocuments({ studentId: userId }),
      tokens: await Token.countDocuments({ user: userId }),
      classesAsStudent: await Classes.countDocuments({ students: userId }),
      classesAsTeacher: await Classes.countDocuments({ $or: [{ teachers: userId }, { teacherId: userId }] }),
    };

    console.log('Records before deletion:', beforeCounts);

    // Perform cascade deletion
    const deletedUser = await deleteUserById(new mongoose.Types.ObjectId(userId));

    // Get counts after deletion
    const afterCounts = {
      studentProgress: await StudentProgress.countDocuments({ studentId: userId }),
      studentAttendance: await StudentAttendance.countDocuments({ studentId: userId }),
      mrt: await MRT.countDocuments({ studentId: userId }),
      tokens: await Token.countDocuments({ user: userId }),
      classesAsStudent: await Classes.countDocuments({ students: userId }),
      classesAsTeacher: await Classes.countDocuments({ $or: [{ teachers: userId }, { teacherId: userId }] }),
    };

    console.log('Records after deletion:', afterCounts);

    // Verify all records are deleted
    const allDeleted = Object.values(afterCounts).every((count) => count === 0);

    if (allDeleted) {
      console.log('✅ Cascade deletion successful - all related records deleted');
    } else {
      console.log('❌ Cascade deletion failed - some records remain');
    }

    return {
      success: allDeleted,
      deletedUser,
      beforeCounts,
      afterCounts,
    };
  } catch (error) {
    console.error('Error during cascade deletion test:', error);
    throw error;
  }
};

/**
 * Create test data for cascade deletion testing
 */
export const createTestUserWithRelatedData = async () => {
  try {
    // Create a test user
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'student',
      studentId: 'TEST123',
      gradeLevel: '10',
      enrollmentDate: new Date(),
    });

    console.log('Created test user:', user._id);

    // Create related records (this would normally be done through the application)
    // Note: In a real scenario, these would be created through proper service calls

    return user;
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
};

/**
 * Clean up test data
 */
export const cleanupTestData = async (userId: string) => {
  try {
    await Promise.all([
      StudentProgress.deleteMany({ studentId: userId }),
      StudentAttendance.deleteMany({ studentId: userId }),
      MRT.deleteMany({ studentId: userId }),
      Token.deleteMany({ user: userId }),
      Classes.updateMany({ students: userId }, { $pull: { students: userId } }),
      Classes.updateMany({ teachers: userId }, { $pull: { teachers: userId } }),
      Classes.updateMany({ teacherId: userId }, { $unset: { teacherId: 1 } }),
    ]);

    console.log('Test data cleaned up for user:', userId);
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    throw error;
  }
};

