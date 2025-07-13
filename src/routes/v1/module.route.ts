import express, { Router } from 'express';
import { validate } from '../../modules/validate';
import { auth } from '../../modules/auth';
import { moduleValidation } from '../../modules/module';
import * as moduleController from '../../modules/module/module.controller';

const router: Router = express.Router();

router
  .route('/')
  .post( validate(moduleValidation.createModule), moduleController.createModule)
  .get(auth('getModules'), validate(moduleValidation.getModules), moduleController.getModules);

router
  .route('/bulk')
  .post(auth('manageModules'), validate(moduleValidation.createModulesBulk), moduleController.createModulesBulk);

router
  .route('/syllabus/:syllabusId')
  .get(auth('getModules'), validate(moduleValidation.getModulesBySyllabus), moduleController.getModulesBySyllabus);

router
  .route('/type/:type')
  .get(auth('getModules'), validate(moduleValidation.getModulesByType), moduleController.getModulesByType);

router
  .route('/:moduleId')
  .get(auth('getModules'), validate(moduleValidation.getModule), moduleController.getModule)
  .patch(auth('manageModules'), validate(moduleValidation.updateModule), moduleController.updateModule)
  .delete(auth('manageModules'), validate(moduleValidation.deleteModule), moduleController.deleteModule);

export default router;

/**
 * @swagger
 * tags:
 *   name: Modules
 *   description: Module management and retrieval
 */

/**
 * @swagger
 * /modules:
 *   post:
 *     summary: Create a module
 *     description: Only admins can create modules.
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - syllabusId
 *               - type
 *               - title
 *               - description
 *               - session
 *             properties:
 *               syllabusId:
 *                 type: string
 *                 format: objectId
 *                 description: Syllabus ID that this module belongs to
 *               type:
 *                 type: string
 *                 enum: [theory, technical, learning]
 *                 description: Type of module
 *               title:
 *                 type: string
 *                 description: Module title
 *               description:
 *                 type: string
 *                 description: Module description
 *               session:
 *                 type: integer
 *                 minimum: 1
 *                 description: Session number
 *               resources:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     file:
 *                       type: string
 *                       description: File path or URL
 *                     key:
 *                       type: string
 *                       description: Resource key or identifier
 *             example:
 *               syllabusId: "507f1f77bcf86cd799439011"
 *               type: "theory"
 *               title: "Introduction to Programming Concepts"
 *               description: "Learn the fundamental concepts of programming"
 *               session: 1
 *               resources:
 *                 - file: "https://example.com/video.mp4"
 *                   key: "intro_video"
 *                 - file: "https://example.com/slides.pdf"
 *                   key: "intro_slides"
 *     responses:
 *       "201":
 *         description: Module created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Module'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all modules
 *     description: Retrieve all modules with pagination and filtering.
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Filter by module title
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [theory, technical, learning]
 *         description: Filter by module type
 *       - in: query
 *         name: syllabusId
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filter by syllabus ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort by field in the form of field:desc/asc (ex. title:asc)
 *       - in: query
 *         name: projectBy
 *         schema:
 *           type: string
 *         description: Project fields in the form of field:hide/include (ex. title:hide)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of modules per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: List of modules retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Module'
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
 * /modules/{moduleId}:
 *   get:
 *     summary: Get a module by ID
 *     description: Retrieve a specific module by its ID with populated syllabus.
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Module ID
 *     responses:
 *       "200":
 *         description: Module retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Module'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a module
 *     description: Only admins can update modules.
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Module ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               syllabusId:
 *                 type: string
 *                 format: objectId
 *                 description: Syllabus ID that this module belongs to
 *               type:
 *                 type: string
 *                 enum: [theory, technical, learning]
 *                 description: Type of module
 *               title:
 *                 type: string
 *                 description: Module title
 *               description:
 *                 type: string
 *                 description: Module description
 *               session:
 *                 type: integer
 *                 minimum: 1
 *                 description: Session number
 *               resources:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     file:
 *                       type: string
 *                       description: File path or URL
 *                     key:
 *                       type: string
 *                       description: Resource key or identifier
 *             example:
 *               title: "Advanced Programming Concepts"
 *               description: "Advanced programming concepts and techniques"
 *               session: 2
 *     responses:
 *       "200":
 *         description: Module updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Module'
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
 *     summary: Delete a module
 *     description: Only admins can delete modules.
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Module ID
 *     responses:
 *       "204":
 *         description: Module deleted successfully
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /modules/syllabus/{syllabusId}:
 *   get:
 *     summary: Get modules by syllabus ID
 *     description: Retrieve all modules for a specific syllabus, sorted by session number.
 *     tags: [Modules]
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
 *         description: Modules retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Module'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /modules/type/{type}:
 *   get:
 *     summary: Get modules by type
 *     description: Retrieve all modules of a specific type with populated syllabus.
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [theory, technical, learning]
 *         description: Module type
 *     responses:
 *       "200":
 *         description: Modules retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Module'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */ 