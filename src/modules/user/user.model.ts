import mongoose from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { roles } from '../../config/roles';
import { IUserDoc, IUserModel } from './user.interfaces';
import { isValidRollNumber, ROLL_NUMBER_ERROR_MESSAGE } from './rollNumber.util';
import { GENDERS, REFERRAL_SOURCES } from './admission.constants';

/** Required only while creating a student, so existing records can still be saved. */
const requiredForNewStudent = (message: string) =>
  [
    function (this: IUserDoc) {
      return this.role === 'student' && this.isNew;
    },
    message,
  ] as [ (this: IUserDoc) => boolean, string ];

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
          // Accept legacy (JA/ABC/1234) and new (JA/MMYY/NNNN) formats
          if (value && !isValidRollNumber(value)) {
            return false;
          }
          return true;
        },
        message: `${ROLL_NUMBER_ERROR_MESSAGE} and is required for students`,
      },
    },
    branchAccess: {
      type: [
        {
          type: Number,
          min: 1,
          max: 12,
        },
      ],
      default: undefined,
      validate: {
        validator: function (this: any, value: number[] | undefined) {
          if (['admin', 'aqsd'].includes(this.role)) {
            return Array.isArray(value) && value.length > 0;
          }
          return true;
        },
        message: 'branchAccess is required for admin and aqsd users',
      },
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    // Academy-specific fields
    department: {
      type: String,
      trim: true,
      validate: {
        validator: function (this: any, value: string) {
          if (['teacher', 'admin', 'aqsd', 'master'].includes(this.role) && !value) {
            return false;
          }
          return true;
        },
        message: 'Department is required for teachers, admins, aqsd, and master',
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
    dateOfBirth: {
      type: Date,
      required: requiredForNewStudent('Date of birth is required for students'),
    },
    occupation: {
      type: String,
      trim: true,
      maxlength: 120,
      required: requiredForNewStudent('Occupation is required for students'),
    },
    whatsappNumber: {
      type: String,
      trim: true,
      required: requiredForNewStudent('WhatsApp number is required for students'),
      validate(value: string) {
        if (value && !/^\+?[\d\s-()]+$/.test(value)) {
          throw new Error('Invalid WhatsApp number');
        }
      },
    },
    gender: {
      type: String,
      enum: GENDERS,
      required: requiredForNewStudent('Gender is required for students'),
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
      required: requiredForNewStudent('Address is required for students'),
    },
    referralSource: {
      type: String,
      enum: REFERRAL_SOURCES,
      required: requiredForNewStudent('How did you hear about us is required for students'),
    },
    referralSourceOther: {
      type: String,
      trim: true,
      maxlength: 200,
      required: [
        function (this: IUserDoc) {
          return this.referralSource === 'other';
        },
        'Please specify how you heard about us',
      ],
    },
    dateOfJoining: {
      type: Date,
      required: requiredForNewStudent('Date of joining is required for students'),
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
          if (value && !/^\+?[\d\s-()]+$/.test(value)) {
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
    motherName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    fatherName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    guardians: {
      type: [
        new mongoose.Schema(
          {
            name: {
              type: String,
              required: true,
              trim: true,
              maxlength: 120,
            },
            relation: {
              type: String,
              required: true,
              trim: true,
              maxlength: 80,
            },
          },
          { _id: false }
        ),
      ],
      validate: {
        validator(value: { name: string }[]) {
          return value.length <= 3;
        },
        message: 'A student can have at most 3 guardians',
      },
    },
    isProfileCardComplete: {
      type: Boolean,
      default: false,
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
