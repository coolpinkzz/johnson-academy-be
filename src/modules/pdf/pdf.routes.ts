import { Router } from 'express';
import { PDFController } from './pdf.controller';

const router = Router();

/**
 * @route   GET /pdf/attendance
 * @desc    Generate attendance PDF with sample data
 * @query   {string} studentId - Student ID
 * @query   {string} classId - Class ID
 * @query   {string} month - Month (e.g., "2025-08")
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
