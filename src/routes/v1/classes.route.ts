import express from 'express';
import authMiddleware from '../../modules/auth/auth.middleware';
import validate from '../../modules/validate/validate.middleware';
import * as classesValidation from '../../modules/classes/classes.validation';
import * as classesController from '../../modules/classes/classes.controller';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Classes
 *   description: Class management and retrieval
 */

/**
 * @swagger
 * /classes:
 *   post:
 *     summary: Create a class
 *     description: Only admins can create classes.
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - teacherId
 *               - courseId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Class name
 *               teacherId:
 *                 type: string
 *                 format: objectId
 *                 description: Teacher ID (must be a user with role 'teacher')
 *               courseId:
 *                 type: string
 *                 format: objectId
 *                 description: Course ID
 *               students:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: objectId
 *                 description: Array of student IDs (must be users with role 'student')
 *             example:
 *               name: "Advanced Mathematics 101"
 *               teacherId: "507f1f77bcf86cd799439011"
 *               courseId: "507f1f77bcf86cd799439012"
 *               students: ["507f1f77bcf86cd799439013", "507f1f77bcf86cd799439014"]
 *     responses:
 *       "201":
 *         description: Class created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Class'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all classes
 *     description: Retrieve all classes with pagination and filtering.
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: teacherId
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filter by teacher ID
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filter by course ID
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by class name
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort by field in the form of field:desc/asc (ex. name:asc)
 *       - in: query
 *         name: projectBy
 *         schema:
 *           type: string
 *         description: Project fields in the form of field:hide/include (ex. name:hide)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of classes per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: List of classes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Class'
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
 * /classes/all:
 *   get:
 *     summary: Get all classes (non-paginated)
 *     description: Retrieve all classes without pagination.
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: All classes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Class'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /classes/teacher/{teacherId}:
 *   get:
 *     summary: Get classes by teacher
 *     description: Retrieve all classes taught by a specific teacher.
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teacherId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Teacher ID
 *     responses:
 *       "200":
 *         description: Classes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Class'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /classes/course/{courseId}:
 *   get:
 *     summary: Get classes by course
 *     description: Retrieve all classes for a specific course.
 *     tags: [Classes]
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
 *         description: Classes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Class'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /classes/student/{studentId}:
 *   get:
 *     summary: Get classes by student
 *     description: Retrieve all classes where a specific student is enrolled.
 *     tags: [Classes]
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
 *         description: Classes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Class'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /classes/{classesId}:
 *   get:
 *     summary: Get a class by ID
 *     description: Retrieve a specific class by its ID.
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classesId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Class ID
 *     responses:
 *       "200":
 *         description: Class retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Class'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a class
 *     description: Only admins can update classes.
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classesId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Class ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Class name
 *               teacherId:
 *                 type: string
 *                 format: objectId
 *                 description: Teacher ID (must be a user with role 'teacher')
 *               courseId:
 *                 type: string
 *                 format: objectId
 *                 description: Course ID
 *               students:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: objectId
 *                 description: Array of student IDs (must be users with role 'student')
 *             example:
 *               name: "Advanced Mathematics 102"
 *               students: ["507f1f77bcf86cd799439013", "507f1f77bcf86cd799439014", "507f1f77bcf86cd799439015"]
 *     responses:
 *       "200":
 *         description: Class updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Class'
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
 *     summary: Delete a class
 *     description: Only admins can delete classes.
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classesId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Class ID
 *     responses:
 *       "204":
 *         description: Class deleted successfully
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /classes/{classesId}/students/bulk-add:
 *   post:
 *     summary: Bulk add students to a class
 *     description: Only admins can bulk add students to classes.
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classesId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Class ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentIds
 *             properties:
 *               studentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: objectId
 *                 minItems: 1
 *                 description: Array of student IDs to add to the class
 *             example:
 *               studentIds: ["507f1f77bcf86cd799439013", "507f1f77bcf86cd799439014", "507f1f77bcf86cd799439015"]
 *     responses:
 *       "200":
 *         description: Students added to class successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Class'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

router
  .route('/')
  .post(
    authMiddleware('manageClasses'), // Only admins can create classes
    validate(classesValidation.createClasses),
    classesController.createClasses
  )
  .get(
    authMiddleware('getClasses'), // All authenticated users can view classes
    validate(classesValidation.getClasses),
    classesController.getClasses
  );

router
  .route('/all')
  .get(
    authMiddleware('getClasses'), // All authenticated users can view all classes
    classesController.getAllClasses
  );

router
  .route('/teacher/:teacherId')
  .get(
    authMiddleware('getClasses'), // All authenticated users can view classes by teacher
    validate(classesValidation.getClassesByTeacher),
    classesController.getClassesByTeacher
  );

router
  .route('/course/:courseId')
  .get(
    authMiddleware('getClasses'), // All authenticated users can view classes by course
    validate(classesValidation.getClassesByCourse),
    classesController.getClassesByCourse
  );

router
  .route('/student/:studentId')
  .get(
    authMiddleware('getClasses'), // All authenticated users can view classes by student
    validate(classesValidation.getClassesByStudent),
    classesController.getClassesByStudent
  );

router
  .route('/:classesId')
  .get(
    authMiddleware('getClasses'), // All authenticated users can view specific class
    validate(classesValidation.getClass),
    classesController.getClass
  )
  .patch(
    authMiddleware('manageClasses'), // Only admins can update classes
    validate(classesValidation.updateClasses),
    classesController.updateClasses
  )
  .delete(
    authMiddleware('manageClasses'), // Only admins can delete classes
    validate(classesValidation.deleteClasses),
    classesController.deleteClasses
  );

router
  .route('/:classesId/students/bulk-add')
  .post(
    authMiddleware('manageClasses'), // Only admins can bulk add students to classes
    validate(classesValidation.bulkAddStudentsToClass),
    classesController.bulkAddStudentsToClass
  );

export default router; 