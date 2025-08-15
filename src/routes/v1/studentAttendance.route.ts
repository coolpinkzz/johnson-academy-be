import express, { Router } from 'express';
import { validate } from '../../modules/validate';
import { auth } from '../../modules/auth';
import { studentAttendanceController, studentAttendanceValidation } from '../../modules/studentAttendance';

const router: Router = express.Router();

router
  .route('/')
  .get(
    auth('getAttendance'),
    validate(studentAttendanceValidation.getStudentAttendance),
    studentAttendanceController.getStudentAttendance
  );

router
  .route('/student/:studentId/class/:classId')
  .get(
    auth('getAttendance'),
    validate(studentAttendanceValidation.getStudentAttendanceByStudentAndClass),
    studentAttendanceController.getStudentAttendanceByStudentAndClass
  );

router
  .route('/student/:studentId')
  .get(
    auth('getAttendance'),
    validate(studentAttendanceValidation.getAttendanceByStudent),
    studentAttendanceController.getAttendanceByStudent
  );

router
  .route('/class/:classId')
  .get(
    auth('getAttendance'),
    validate(studentAttendanceValidation.getAttendanceByClass),
    studentAttendanceController.getAttendanceByClass
  );

router
  .route('/:attendanceId')
  .get(
    auth('getAttendance'),
    validate(studentAttendanceValidation.getStudentAttendanceById),
    studentAttendanceController.getStudentAttendanceById
  )
  .patch(
    auth('manageAttendance'),
    validate(studentAttendanceValidation.updateStudentAttendance),
    studentAttendanceController.updateStudentAttendance
  )
  .delete(
    auth('manageAttendance'),
    validate(studentAttendanceValidation.deleteStudentAttendance),
    studentAttendanceController.deleteStudentAttendance
  );

router
  .route('/:attendanceId/present')
  .post(
    auth('manageAttendance'),
    validate(studentAttendanceValidation.markAttendancePresent),
    studentAttendanceController.markAttendancePresent
  );

router
  .route('/:attendanceId/absent')
  .post(
    auth('manageAttendance'),
    validate(studentAttendanceValidation.markAttendanceAbsent),
    studentAttendanceController.markAttendanceAbsent
  );

export default router;

/**
 * @swagger
 * tags:
 *   name: StudentAttendance
 *   description: Student attendance management and retrieval
 */

/**
 * @swagger
 * /student-attendance:
 *   get:
 *     summary: Get all student attendance records
 *     description: Only authorized users can retrieve attendance records.
 *     tags: [StudentAttendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *         description: Student ID filter
 *       - in: query
 *         name: classId
 *         schema:
 *           type: string
 *         description: Class ID filter
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: sort by query in the form of field:desc/asc (ex. joiningDate:asc)
 *       - in: query
 *         name: projectBy
 *         schema:
 *           type: string
 *         description: project by query in the form of field:hide/include (ex. presentDates:hide)
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
 *                     $ref: '#/components/schemas/StudentAttendance'
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
 * /student-attendance/student/{studentId}/class/{classId}:
 *   get:
 *     summary: Get student attendance by student ID and class ID
 *     description: Retrieve attendance record for a specific student in a specific class.
 *     tags: [StudentAttendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *         description: Class ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/StudentAttendance'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /student-attendance/student/{studentId}:
 *   get:
 *     summary: Get all attendance records for a student
 *     description: Retrieve all attendance records for a specific student across all classes.
 *     tags: [StudentAttendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StudentAttendance'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /student-attendance/class/{classId}:
 *   get:
 *     summary: Get all attendance records for a class
 *     description: Retrieve all attendance records for a specific class.
 *     tags: [StudentAttendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *         description: Class ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StudentAttendance'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /student-attendance/{id}:
 *   get:
 *     summary: Get a student attendance record
 *     description: Retrieve a specific attendance record by ID.
 *     tags: [StudentAttendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Attendance record ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/StudentAttendance'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a student attendance record
 *     description: Only authorized users can update attendance records.
 *     tags: [StudentAttendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Attendance record ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               presentDates:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: date
 *               absentDates:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: date
 *               lastDate:
 *                 type: string
 *                 format: date
 *               classesInOneWeek:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/StudentAttendance'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete a student attendance record
 *     description: Only authorized users can delete attendance records.
 *     tags: [StudentAttendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Attendance record ID
 *     responses:
 *       "204":
 *         description: No content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /student-attendance/{id}/present:
 *   post:
 *     summary: Mark student attendance as present
 *     description: Mark a student as present for a specific date. Only authorized users can mark attendance.
 *     tags: [StudentAttendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Attendance record ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - classId
 *               - date
 *             properties:
 *               studentId:
 *                 type: string
 *                 description: Student ID
 *               classId:
 *                 type: string
 *                 description: Class ID
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date for marking attendance
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/StudentAttendance'
 *       "400":
 *         description: Bad request - Attendance record does not match student/class or date already marked
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "409":
 *         description: Conflict - Attendance already marked for this date
 */

/**
 * @swagger
 * /student-attendance/{id}/absent:
 *   post:
 *     summary: Mark student attendance as absent
 *     description: Mark a student as absent for a specific date. Only authorized users can mark attendance.
 *     tags: [StudentAttendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Attendance record ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - classId
 *               - date
 *             properties:
 *               studentId:
 *                 type: string
 *                 description: Student ID
 *               classId:
 *                 type: string
 *                 description: Class ID
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date for marking attendance
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/StudentAttendance'
 *       "400":
 *         description: Bad request - Attendance record does not match student/class or date already marked
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "409":
 *         description: Conflict - Attendance already marked for this date
 */
