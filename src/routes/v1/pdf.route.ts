import { Router } from 'express';
import { PDFController } from '../../modules/pdf/pdf.controller';

const router = Router();

/**
 * @route   GET /pdf/attendance
 * @desc    Generate attendance PDF with sample data
 * @query   {string} studentId - Student ID
 * @query   {string} classId - Class ID
 * @query   {string} courseId - Course ID (required when student has multiple courses in the class)
 * @access  Public
 */
router.get('/attendance', PDFController.generateAttendancePDF);

/**
 * @route   POST /pdf/attendance/custom
 * @desc    Generate attendance PDF with custom data
 * @access  Public
 */
router.post('/attendance/custom', PDFController.generateCustomAttendancePDF);

export default router;
