import express from 'express';
import authMiddleware from '../../modules/auth/auth.middleware';
import validate from '../../modules/validate/validate.middleware';
import * as syllabusValidation from '../../modules/syllabus/syllabus.validation';
import * as syllabusController from '../../modules/syllabus/syllabus.controller';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Syllabi
 *   description: Syllabus management and retrieval
 */

/**
 * @swagger
 * /syllabi:
 *   post:
 *     summary: Create a syllabus
 *     description: Only admins can create syllabi.
 *     tags: [Syllabi]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *               - title
 *               - description
 *             properties:
 *               courseId:
 *                 type: string
 *                 format: objectId
 *                 description: Course ID that this syllabus belongs to
 *               title:
 *                 type: string
 *                 description: Syllabus title
 *               description:
 *                 type: string
 *                 description: Syllabus description
 *               theory:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: objectId
 *                 description: Array of theory module IDs
 *               technical:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: objectId
 *                 description: Array of technical module IDs
 *               learning:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: objectId
 *                 description: Array of learning module IDs
 *             example:
 *               courseId: "507f1f77bcf86cd799439011"
 *               title: "Introduction to Programming Syllabus"
 *               description: "Complete syllabus for programming fundamentals"
 *               theory: ["507f1f77bcf86cd799439021", "507f1f77bcf86cd799439022"]
 *               technical: ["507f1f77bcf86cd799439023"]
 *               learning: ["507f1f77bcf86cd799439024"]
 *     responses:
 *       "201":
 *         description: Syllabus created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Syllabus'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /syllabi/all:
 *   get:
 *     summary: Get all syllabi (non-paginated)
 *     description: Retrieve all syllabi without pagination.
 *     tags: [Syllabi]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: All syllabi retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Syllabus'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /syllabi/course/{courseId}:
 *   get:
 *     summary: Get syllabus by course
 *     description: Retrieve syllabus for a specific course.
 *     tags: [Syllabi]
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
 *         description: Syllabus retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Syllabus'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /syllabi/{syllabusId}:
 *   get:
 *     summary: Get a syllabus by ID
 *     description: Retrieve a specific syllabus by its ID.
 *     tags: [Syllabi]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: syllabusId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Syllabus ID
 *     responses:
 *       "200":
 *         description: Syllabus retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Syllabus'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a syllabus
 *     description: Only admins can update syllabi.
 *     tags: [Syllabi]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: syllabusId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Syllabus ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               courseId:
 *                 type: string
 *                 format: objectId
 *                 description: Course ID that this syllabus belongs to
 *               title:
 *                 type: string
 *                 description: Syllabus title
 *               description:
 *                 type: string
 *                 description: Syllabus description
 *               theory:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: objectId
 *                 description: Array of theory module IDs
 *               technical:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: objectId
 *                 description: Array of technical module IDs
 *               learning:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: objectId
 *                 description: Array of learning module IDs
 *             example:
 *               title: "Advanced Programming Syllabus"
 *               description: "Updated syllabus for advanced programming concepts"
 *               theory: ["507f1f77bcf86cd799439021", "507f1f77bcf86cd799439022", "507f1f77bcf86cd799439025"]
 *     responses:
 *       "200":
 *         description: Syllabus updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Syllabus'
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
 *     summary: Delete a syllabus
 *     description: Only admins can delete syllabi.
 *     tags: [Syllabi]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: syllabusId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Syllabus ID
 *     responses:
 *       "204":
 *         description: Syllabus deleted successfully
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /syllabi/{syllabusId}/bulk-add-modules:
 *   post:
 *     summary: Bulk add modules to a syllabus
 *     description: Only admins can bulk add modules to syllabi.
 *     tags: [Syllabi]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: syllabusId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Syllabus ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - moduleIds
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [theory, technical, learning]
 *                 description: Category to add modules to
 *               moduleIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: objectId
 *                 minItems: 1
 *                 description: Array of module IDs to add to the syllabus
 *             example:
 *               category: "theory"
 *               moduleIds: ["507f1f77bcf86cd799439021", "507f1f77bcf86cd799439022", "507f1f77bcf86cd799439025"]
 *     responses:
 *       "200":
 *         description: Modules added to syllabus successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Syllabus'
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
 * /syllabi/bulk-add-modules:
 *   post:
 *     summary: Bulk add modules to multiple syllabi
 *     description: Only admins can bulk add modules to multiple syllabi at once.
 *     tags: [Syllabi]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bulkData
 *             properties:
 *               bulkData:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - syllabusId
 *                     - category
 *                     - moduleIds
 *                   properties:
 *                     syllabusId:
 *                       type: string
 *                       format: objectId
 *                       description: Syllabus ID
 *                     category:
 *                       type: string
 *                       enum: [theory, technical, learning]
 *                       description: Category to add modules to
 *                     moduleIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                         format: objectId
 *                       minItems: 1
 *                       description: Array of module IDs to add
 *                 minItems: 1
 *                 description: Array of bulk operations
 *             example:
 *               bulkData:
 *                 - syllabusId: "507f1f77bcf86cd799439011"
 *                   category: "theory"
 *                   moduleIds: ["507f1f77bcf86cd799439021", "507f1f77bcf86cd799439022"]
 *                 - syllabusId: "507f1f77bcf86cd799439012"
 *                   category: "technical"
 *                   moduleIds: ["507f1f77bcf86cd799439023", "507f1f77bcf86cd799439024"]
 *     responses:
 *       "200":
 *         description: Modules added to syllabi successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Syllabus'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

router
  .route('/')
  .post(
    authMiddleware('manageSyllabi'), // Only admins can create syllabi
    validate(syllabusValidation.createSyllabus),
    syllabusController.createSyllabus
  )
  .get(
    authMiddleware('getSyllabi'), // All authenticated users can view syllabi
    validate(syllabusValidation.getSyllabi),
    syllabusController.getSyllabi
  );

router
  .route('/all')
  .get(
    authMiddleware('getSyllabi'), // All authenticated users can view all syllabi
    syllabusController.getAllSyllabi
  );

router
  .route('/course/:courseId')
  .get(
    authMiddleware('getSyllabi'), // All authenticated users can view syllabus by course
    validate(syllabusValidation.getSyllabusByCourse),
    syllabusController.getSyllabusByCourse
  );

router
  .route('/:syllabusId')
  .get(
    authMiddleware('getSyllabi'), // All authenticated users can view specific syllabus
    validate(syllabusValidation.getSyllabus),
    syllabusController.getSyllabus
  )
  .patch(
    authMiddleware('manageSyllabi'), // Only admins can update syllabi
    validate(syllabusValidation.updateSyllabus),
    syllabusController.updateSyllabus
  )
  .delete(
    authMiddleware('manageSyllabi'), // Only admins can delete syllabi
    validate(syllabusValidation.deleteSyllabus),
    syllabusController.deleteSyllabus
  );

router
  .route('/:syllabusId/bulk-add-modules')
  .post(
    authMiddleware('manageSyllabi'), // Only admins can bulk add modules
    validate(syllabusValidation.bulkAddModulesToSyllabus),
    syllabusController.bulkAddModulesToSyllabus
  );

router
  .route('/bulk-add-modules')
  .post(
    authMiddleware('manageSyllabi'), // Only admins can bulk add modules
    validate(syllabusValidation.bulkAddModulesToMultipleSyllabi),
    syllabusController.bulkAddModulesToMultipleSyllabi
  );

export default router; 