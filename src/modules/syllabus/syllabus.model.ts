import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { ISyllabusDoc, ISyllabusModel } from './syllabus.interfaces';

const syllabusSchema = new mongoose.Schema<ISyllabusDoc, ISyllabusModel>(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Course',
    },
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
    theory: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
    }],
    technical: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
    }],
    learning: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
    }],
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
syllabusSchema.plugin(toJSON);
syllabusSchema.plugin(paginate);

const Syllabus = mongoose.model<ISyllabusDoc, ISyllabusModel>('Syllabus', syllabusSchema);

export default Syllabus; 