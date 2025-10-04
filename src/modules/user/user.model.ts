import mongoose from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { roles } from '../../config/roles';
import { IUserDoc, IUserModel } from './user.interfaces';

const userSchema = new mongoose.Schema<IUserDoc, IUserModel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate(value: string) {
        if (!validator.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
      validate(value: string) {
        if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
          throw new Error('Password must contain at least one letter and one number');
        }
      },
      private: true, // used by the toJSON plugin
    },
    role: {
      type: String,
      enum: roles,
      required: true,
    },
    rollNumber: {
      type: String,
      trim: true,
      validate: {
        validator: function (this: any, value: string) {
          // Roll number is only required for students
          if (this.role === 'student' && !value) {
            return false;
          }
          // If value is provided, it should match the format JA/GTR/1234
          if (value && !value.match(/^JA\/[A-Z]{3}\/\d{4}$/)) {
            return false;
          }
          return true;
        },
        message: 'Roll number must be in format JA/GTR/1234 and is required for students',
      },
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    // Academy-specific fields
    studentId: {
      type: String,
      unique: true,
      sparse: true,
      validate: {
        validator: function (this: any, value: string) {
          if (this.role === 'student' && !value) {
            return false;
          }
          return true;
        },
        message: 'Student ID is required for students',
      },
    },
    teacherId: {
      type: String,
      unique: true,
      sparse: true,
      validate: {
        validator: function (this: any, value: string) {
          if (this.role === 'teacher' && !value) {
            return false;
          }
          return true;
        },
        message: 'Teacher ID is required for teachers',
      },
    },
    department: {
      type: String,
      trim: true,
      validate: {
        validator: function (this: any, value: string) {
          if ((this.role === 'teacher' || this.role === 'admin') && !value) {
            return false;
          }
          return true;
        },
        message: 'Department is required for teachers and admins',
      },
    },
    gradeLevel: {
      type: String,
      trim: true,
      validate: {
        validator: function (this: any, value: string) {
          if (this.role === 'student' && !value) {
            return false;
          }
          return true;
        },
        message: 'Grade level is required for students',
      },
    },
    subjects: [
      {
        type: String,
        trim: true,
      },
    ],
    enrollmentDate: {
      type: Date,
      validate: {
        validator: function (this: any, value: Date) {
          if (this.role === 'student' && !value) {
            return false;
          }
          return true;
        },
        message: 'Enrollment date is required for students',
      },
    },
    graduationDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isCompleteProfile: {
      type: Boolean,
      default: false,
    },
    profilePicture: {
      type: String,
      default: null,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
      validate(value: string) {
        if (value && !validator.isMobilePhone(value)) {
          throw new Error('Invalid phone number');
        }
      },
    },
    address: {
      street: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
      state: {
        type: String,
        trim: true,
      },
      zipCode: {
        type: String,
        trim: true,
      },
      country: {
        type: String,
        trim: true,
      },
    },
    emergencyContact: {
      name: {
        type: String,
        trim: true,
      },
      relationship: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
        validate(value: string) {
          if (value && !validator.isMobilePhone(value)) {
            throw new Error('Invalid emergency contact phone number');
          }
        },
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        validate(value: string) {
          if (value && !validator.isEmail(value)) {
            throw new Error('Invalid emergency contact email');
          }
        },
      },
    },
    // Relationship fields
    classes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classes',
      },
    ],
    courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
    ],
    progress: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudentProgress',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
userSchema.plugin(toJSON);
userSchema.plugin(paginate);

/**
 * Check if email is taken
 * @param {string} email - The user's email
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.static('isEmailTaken', async function (email: string, excludeUserId: mongoose.ObjectId): Promise<boolean> {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
});

/**
 * Check if student ID is taken
 * @param {string} studentId - The student's ID
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.static(
  'isStudentIdTaken',
  async function (studentId: string, excludeUserId: mongoose.ObjectId): Promise<boolean> {
    const user = await this.findOne({ studentId, _id: { $ne: excludeUserId } });
    return !!user;
  }
);

/**
 * Check if teacher ID is taken
 * @param {string} teacherId - The teacher's ID
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.static(
  'isTeacherIdTaken',
  async function (teacherId: string, excludeUserId: mongoose.ObjectId): Promise<boolean> {
    const user = await this.findOne({ teacherId, _id: { $ne: excludeUserId } });
    return !!user;
  }
);

/**
 * Check if roll number is taken
 * @param {string} rollNumber - The roll number
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.static(
  'isRollNumberTaken',
  async function (rollNumber: string, excludeUserId: mongoose.ObjectId): Promise<boolean> {
    const user = await this.findOne({ rollNumber, _id: { $ne: excludeUserId } });
    return !!user;
  }
);

/**
 * Check if password matches the user's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */
userSchema.method('isPasswordMatch', async function (password: string): Promise<boolean> {
  const user = this;
  return bcrypt.compare(password, user.password);
});

userSchema.pre('save', async function (next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

const User = mongoose.model<IUserDoc, IUserModel>('User', userSchema);

export default User;
