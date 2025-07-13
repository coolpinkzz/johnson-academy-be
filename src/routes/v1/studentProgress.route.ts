import express from 'express';
import auth from '../../modules/auth/auth.middleware';
import validate from '../../modules/validate/validate.middleware';
import * as studentProgressValidation from '../../modules/studentProgress/studentProgress.validation';
import * as studentProgressController from '../../modules/studentProgress/studentProgress.controller';

const router = express.Router();

router
  .route('/')
  .get(
    auth('getStudentProgress'),
    validate(studentProgressValidation.getStudentProgress),
    studentProgressController.getStudentProgress
  );

router
  .route('/:studentProgressId')
  .get(
    auth('getStudentProgress'),
    validate(studentProgressValidation.getStudentProgressById),
    studentProgressController.getStudentProgressById
  )
  .patch(
    auth('manageStudentProgress'),
    validate(studentProgressValidation.updateStudentProgress),
    studentProgressController.updateStudentProgress
  )
  .delete(
    auth('manageStudentProgress'),
    validate(studentProgressValidation.deleteStudentProgress),
    studentProgressController.deleteStudentProgress
  );

router
  .route('/:studentProgressId/module')
  .patch(
    auth('manageStudentProgress'),
    validate(studentProgressValidation.updateModuleProgress),
    studentProgressController.updateModuleProgress
  );

router
  .route('/:studentProgressId/start-module')
  .post(
    auth('manageStudentProgress'),
    validate(studentProgressValidation.startModule),
    studentProgressController.startModule
  );

router
  .route('/:studentProgressId/end-module')
  .post(
    auth('manageStudentProgress'),
    validate(studentProgressValidation.endModule),
    studentProgressController.endModule
  );

router
  .route('/student/:studentId')
  .get(
    auth('getStudentProgress'),
    validate(studentProgressValidation.getStudentProgressByStudent),
    studentProgressController.getStudentProgressByStudent
  );

router
  .route('/class/:classId')
  .get(
    auth('getStudentProgress'),
    validate(studentProgressValidation.getStudentProgressByClass),
    studentProgressController.getStudentProgressByClass
  );

router
  .route('/course/:courseId')
  .get(
    auth('getStudentProgress'),
    validate(studentProgressValidation.getStudentProgressByCourse),
    studentProgressController.getStudentProgressByCourse
  );

router
  .route('/student/:studentId/class/:classId')
  .get(
    auth('getStudentProgress'),
    validate(studentProgressValidation.getStudentProgressByStudentAndClass),
    studentProgressController.getStudentProgressByStudentAndClass
  );

router
  .route('/class/:classId/statistics')
  .get(
    auth('getStudentProgress'),
    validate(studentProgressValidation.getClassProgressStatistics),
    studentProgressController.getClassProgressStatistics
  );

router
  .route('/course/:courseId/statistics')
  .get(
    auth('getStudentProgress'),
    validate(studentProgressValidation.getCourseProgressStatistics),
    studentProgressController.getCourseProgressStatistics
  );

export default router;

/**
 * @swagger
 * tags:
 *   name: StudentProgress
 *   description: Student progress management and tracking
 */

/**
 * @swagger
 * /student-progress:
 *   get:
 *     summary: Get all student progress records
 *     description: Retrieve all student progress records with optional filtering and pagination.
 *     tags: [StudentProgress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filter by student ID
 *       - in: query
 *         name: classId
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filter by class ID
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filter by course ID
 *       - in: query
 *         name: progress
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *         description: Filter by progress percentage
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort by query in the form of field:desc/asc (ex. progress:asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of records
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/StudentProgress'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 totalResults:
 *                   type: integer
 *                   example: 1
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /student-progress/{studentProgressId}:
 *   get:
 *     summary: Get a student progress record by ID
 *     description: Retrieve a specific student progress record by its ID.
 *     tags: [StudentProgress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentProgressId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Student progress record ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudentProgress'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a student progress record
 *     description: Update an existing student progress record.
 *     tags: [StudentProgress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentProgressId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Student progress record ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               studentId:
 *                 type: string
 *                 format: objectId
 *               classId:
 *                 type: string
 *                 format: objectId
 *               courseId:
 *                 type: string
 *                 format: objectId
 *               progress:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               syllabusProgress:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/SyllabusProgress'
 *               totalModules:
 *                 type: number
 *                 minimum: 0
 *               completedModules:
 *                 type: number
 *                 minimum: 0
 *               inProgressModules:
 *                 type: number
 *                 minimum: 0
 *               upcomingModules:
 *                 type: number
 *                 minimum: 0
 *             example:
 *               progress: 85
 *               completedModules: 8
 *               inProgressModules: 1
 *               upcomingModules: 1
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudentProgress'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete a student progress record
 *     description: Delete a specific student progress record.
 *     tags: [StudentProgress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentProgressId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Student progress record ID
 *     responses:
 *       "204":
 *         description: No Content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /student-progress/{studentProgressId}/module:
 *   patch:
 *     summary: Update module progress
 *     description: Update the progress status of a specific module within a student's progress record.
 *     tags: [StudentProgress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentProgressId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Student progress record ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateModuleProgress'
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudentProgress'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /student-progress/{studentProgressId}/start-module:
 *   post:
 *     summary: Start a module
 *     description: Mark a module as started and set the start date for tracking progress.
 *     tags: [StudentProgress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentProgressId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Student progress record ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StartModule'
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudentProgress'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /student-progress/{studentProgressId}/end-module:
 *   post:
 *     summary: End a module
 *     description: Mark a module as completed with final score and remarks.
 *     tags: [StudentProgress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentProgressId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Student progress record ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EndModule'
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudentProgress'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /student-progress/student/{studentId}:
 *   get:
 *     summary: Get student progress by student ID
 *     description: Retrieve all progress records for a specific student.
 *     tags: [StudentProgress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Student ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StudentProgress'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /student-progress/class/{classId}:
 *   get:
 *     summary: Get student progress by class ID
 *     description: Retrieve all progress records for students in a specific class.
 *     tags: [StudentProgress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Class ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StudentProgress'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /student-progress/course/{courseId}:
 *   get:
 *     summary: Get student progress by course ID
 *     description: Retrieve all progress records for students in a specific course.
 *     tags: [StudentProgress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Course ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StudentProgress'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /student-progress/student/{studentId}/class/{classId}:
 *   get:
 *     summary: Get student progress by student and class
 *     description: Retrieve a specific student's progress record for a specific class.
 *     tags: [StudentProgress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Student ID
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Class ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudentProgress'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /student-progress/class/{classId}/statistics:
 *   get:
 *     summary: Get class progress statistics
 *     description: Retrieve aggregated progress statistics for all students in a class.
 *     tags: [StudentProgress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Class ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProgressStatistics'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /student-progress/course/{courseId}/statistics:
 *   get:
 *     summary: Get course progress statistics
 *     description: Retrieve aggregated progress statistics for all students in a course.
 *     tags: [StudentProgress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Course ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProgressStatistics'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */ 