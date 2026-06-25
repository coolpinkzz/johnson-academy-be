export { default as StudentPromotion } from './studentPromotion.model';
export * from './studentPromotion.interfaces';
export {
  createStudentPromotion,
  getPromotionsByStudentAndClass,
  getPromotionByStudentClassAndCourse,
} from './studentPromotion.service';
