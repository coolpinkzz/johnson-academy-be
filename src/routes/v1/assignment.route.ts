import express from 'express';
import authMiddleware from '../../modules/auth/auth.middleware';
import validate from '../../modules/validate/validate.middleware';
import * as assignmentValidation from '../../modules/assignment/assignment.validation';
import * as assignmentController from '../../modules/assignment/assignment.controller';

const router = express.Router();

router
  .route('/')
  .post(
    authMiddleware('manageAssignments'), // Only admins and teachers can create assignments
    validate(assignmentValidation.createAssignment),
    assignmentController.createAssignment
  )
  .get(
    authMiddleware('getAssignments'), // All authenticated users can view assignments
    validate(assignmentValidation.getAssignments),
    assignmentController.getAssignments
  );

router.route('/all').get(
  authMiddleware('getAssignments'), // All authenticated users can view all assignments
  assignmentController.getAllAssignments
);

router.route('/my').get(
  authMiddleware('getAssignments'), // All authenticated users can view their assignments
  assignmentController.getMyAssignments
);

router.route('/due-soon').get(
  authMiddleware('getAssignments'), // All authenticated users can view assignments due soon
  assignmentController.getAssignmentsDueSoon
);

router.route('/overdue').get(
  authMiddleware('getAssignments'), // All authenticated users can view overdue assignments
  assignmentController.getOverdueAssignments
);

router.route('/student/:studentId').get(
  authMiddleware('getAssignments'), // All authenticated users can view assignments by student
  validate(assignmentValidation.getAssignmentsByStudent),
  assignmentController.getAssignmentsByStudent
);

router.route('/class/:classId').get(
  authMiddleware('getAssignments'), // All authenticated users can view assignments by class
  validate(assignmentValidation.getAssignmentsByClass),
  assignmentController.getAssignmentsByClass
);

router.route('/teacher/:teacherId').get(
  authMiddleware('getAssignments'), // All authenticated users can view assignments by teacher
  validate(assignmentValidation.getAssignmentsByTeacher),
  assignmentController.getAssignmentsByTeacher
);

router.route('/class/:classId/student/:studentId').get(
  authMiddleware('getAssignments'), // All authenticated users can view assignments by class and student
  validate(assignmentValidation.getAssignmentsByClassAndStudent),
  assignmentController.getAssignmentsByClassAndStudent
);

router
  .route('/:assignmentId')
  .get(
    authMiddleware('getAssignments'), // All authenticated users can view specific assignment
    validate(assignmentValidation.getAssignment),
    assignmentController.getAssignment
  )
  .patch(
    authMiddleware('manageAssignments'), // Only admins and teachers can update assignments
    validate(assignmentValidation.updateAssignment),
    assignmentController.updateAssignment
  )
  .delete(
    authMiddleware('manageAssignments'), // Only admins and teachers can delete assignments
    validate(assignmentValidation.deleteAssignment),
    assignmentController.deleteAssignment
  );

router.route('/:assignmentId/submit').post(
  authMiddleware('submitAssignments'), // Only students can submit assignments
  validate(assignmentValidation.submitAssignment),
  assignmentController.submitAssignment
);

router.route('/:assignmentId/grade').post(
  authMiddleware('manageAssignments'), // Only admins and teachers can grade assignments
  validate(assignmentValidation.gradeAssignment),
  assignmentController.gradeAssignment
);

router.route('/:assignmentId/submission').patch(
  authMiddleware('manageAssignments'), // Only admins and teachers can update submissions
  validate(assignmentValidation.updateSubmission),
  assignmentController.updateSubmission
);

export default router;
