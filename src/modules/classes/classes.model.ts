import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IClassesDoc, IClassesModel } from './classes.interfaces';

const classesSchema = new mongoose.Schema<IClassesDoc, IClassesModel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Course',
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    studentsInClass: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
classesSchema.plugin(toJSON);
classesSchema.plugin(paginate);

const Classes = mongoose.model<IClassesDoc, IClassesModel>('Classes', classesSchema);

export default Classes;
