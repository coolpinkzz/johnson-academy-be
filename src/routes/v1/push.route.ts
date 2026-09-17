import express, { Router } from 'express';
import { validate } from '../../modules/validate';
import { auth } from '../../modules/auth';
import { pushController, pushValidation } from '../../modules/push';

const router: Router = express.Router();

router
  .route('/register')
  .post(auth('updateProfile'), validate(pushValidation.registerToken), pushController.registerToken)
  .delete(auth('updateProfile'), validate(pushValidation.unregisterToken), pushController.unregisterToken);

export default router;
