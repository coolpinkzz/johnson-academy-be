import mongoose, { Model, Document } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export interface IModuleResource {
  file: string;
  key: string;
}

export interface IModule {
  syllabusId?: mongoose.Types.ObjectId;
  type: 'theory' | 'technical' | 'learning' | 'others';
  title: string;
  description: string;
  session: number;
  seq?: number;
  resources: IModuleResource[];
}

export interface IModuleDoc extends IModule, Document {}

export interface IModuleModel extends Model<IModuleDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type UpdateModuleBody = Partial<IModule>;

export type NewCreatedModule = Omit<IModule, '_id'>;
