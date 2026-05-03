import express, { Router } from 'express';
import { auth } from '../../modules/auth';
import * as dashboardController from '../../modules/dashboard/dashboard.controller';

const router: Router = express.Router();

router.route('/aggregates').get(auth('manageSystem'), dashboardController.getAggregates);

export default router;

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Admin dashboard metrics
 */

/**
 * @swagger
 * /dashboard/aggregates:
 *   get:
 *     summary: Get core dashboard aggregate counts
 *     description: Returns totals for active students and teachers and for all classes and courses. Admin only.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalStudents:
 *                   type: integer
 *                 totalTeachers:
 *                   type: integer
 *                 totalClasses:
 *                   type: integer
 *                 totalCourses:
 *                   type: integer
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */
