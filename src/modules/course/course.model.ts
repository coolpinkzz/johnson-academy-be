import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { ICourseDoc, ICourseModel } from './course.interfaces';

const courseSchema = new mongoose.Schema<ICourseDoc, ICourseModel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    instrument: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: Number,
      required: false,
    },
    syllabus: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Syllabus',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
courseSchema.plugin(toJSON);
courseSchema.plugin(paginate);

const Course = mongoose.model<ICourseDoc, ICourseModel>('Course', courseSchema);

export default Course;
