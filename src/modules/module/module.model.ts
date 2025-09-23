import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IModuleDoc, IModuleModel } from './module.interfaces';

const moduleResourceSchema = new mongoose.Schema(
  {
    file: {
      type: String,
      required: false,
      trim: true,
    },
    key: {
      type: String,
      required: false,
      trim: true,
    },
  },
  { _id: false }
);

const moduleSchema = new mongoose.Schema<IModuleDoc, IModuleModel>(
  {
    syllabusId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: 'Syllabus',
    },
    type: {
      type: String,
      enum: ['theory', 'technical', 'learning', 'others'],
      required: true,
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
    session: {
      type: Number,
      required: true,
    },
    resources: [moduleResourceSchema],
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
moduleSchema.plugin(toJSON);
moduleSchema.plugin(paginate);

const Module = mongoose.model<IModuleDoc, IModuleModel>('Module', moduleSchema);

export default Module;
