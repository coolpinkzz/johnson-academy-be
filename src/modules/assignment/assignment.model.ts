import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IAssignmentDoc, IAssignmentModel } from './assignment.interfaces';

const assignmentSchema = new mongoose.Schema<IAssignmentDoc, IAssignmentModel>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ['assigned', 'submitted', 'graded'],
      default: 'assigned',
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Classes',
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    submissions: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        submittedAt: {
          type: Date,
        },
        fileUrl: {
          type: String,
        },
        grade: {
          type: String,
        },
        feedback: {
          type: String,
        },
      },
    ],
    dueDate: {
      type: Date,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
assignmentSchema.plugin(toJSON);
assignmentSchema.plugin(paginate);

const Assignment = mongoose.model<IAssignmentDoc, IAssignmentModel>('Assignment', assignmentSchema);

export default Assignment;
