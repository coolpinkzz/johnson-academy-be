import { Request, Response } from 'express';
import { PDFService, AttendanceData } from './pdf.service';
import mongoose from 'mongoose';
import { getStudentAttendanceByStudentAndClass } from '../studentAttendance/studentAttendance.service';
import { filterAttendanceByMonth, isValidMonthFormat } from './pdf.utils';
import { getStudentProgressByStudentClassAndCourse } from '../studentProgress/studentProgress.service';
import { getMRTByStudentClassMonth } from '../mrt/mrt.service';
import moment from 'moment';

export class PDFController {
  /**
   * Generate attendance PDF
   */
  static async generateAttendancePDF(req: Request, res: Response): Promise<void> {
    try {
      const { studentId, classId, month, courseId } = req.query;

      // Validate required query parameters
      if (!studentId || !classId || !month || !courseId) {
        res.status(400).json({
          error: 'Missing required query parameters: studentId, classId, courseId, and month',
        });
        return;
      }

      // Validate month format
      if (!isValidMonthFormat(month as string)) {
        res.status(400).json({
          error: 'Invalid month format. Expected format: YYYY-MM (e.g., 2025-08)',
        });
        return;
      }

      // Get attendance data from database
      const attendance = await getStudentAttendanceByStudentAndClass(
        new mongoose.Types.ObjectId(studentId as string),
        new mongoose.Types.ObjectId(classId as string)
      );

      if (!attendance) {
        res.status(400).json({
          error: 'Attendance not found',
        });
        return;
      }

      // Filter attendance by month using utility function
      const filteredAttendance = filterAttendanceByMonth(attendance, month as string);

      // use getStudentProgressByStudentAndClass to get syllabus modules
      const studentProgress = await getStudentProgressByStudentClassAndCourse(
        attendance.studentId,
        attendance.classId,
        new mongoose.Types.ObjectId(courseId as string)
      );
      if (!studentProgress) {
        res.status(400).json({
          error: 'Student progress not found',
        });
        return;
      }

      const syllabusModules = studentProgress.syllabusProgress[0]?.modules?.map((moduleId: any) => ({
        moduleId: {
          type: moduleId?.moduleId?.type || '',
          title: moduleId?.moduleId?.title || '',
        },
        status: moduleId?.status || '',
        startDate: moduleId?.startDate || '',
        endDate: moduleId?.endDate || '',
      }));

      const monthFormatted = moment(month as string).format('MM-YYYY');
      // Fetch MRT data
      const mrtData = await getMRTByStudentClassMonth(
        studentId as string,
        classId as string,
        monthFormatted as string,
        courseId as string
      );

      // console.log(mrtData);
      // Sample syllabus modules data (in a real app, this would come from database based on query params)
      const data = {
        presentDates: filteredAttendance.presentDates,
        absentDates: filteredAttendance.absentDates,
        syllabusModules: syllabusModules,
        studentDetails: studentProgress.studentId,
        classDetails: studentProgress.classId,
        courseDetails: studentProgress.courseId,
        joiningDate: attendance.joiningDate,
        month: moment(month as string).format('MMM YYYY'),
        mrtData: mrtData
          ? {
              regularity: mrtData.regularity,
              learningSpeed: mrtData.learningSpeed,
              theory: mrtData.theory,
              technicalExercises: mrtData.technicalExercises,
              repertoireRhythmSense: mrtData.repertoireRhythmSense,
              repertoireDynamics: mrtData.repertoireDynamics,
              totalScore: mrtData.totalScore,
              averageScore: mrtData.averageScore,
              remarks: mrtData.remarks,
            }
          : undefined,

        // syllabusModules: [
        //   {
        //     moduleId: { type: 'theory', title: 'Introduction to Music' },
        //     status: 'completed',
        //     startDate: '2025-08-12T09:30:47.840Z',
        //     endDate: '2025-08-12T09:38:54.502Z',
        //   },
        //   {
        //     moduleId: { type: 'theory', title: 'Working on Scales' },
        //     status: 'completed',
        //     startDate: '2025-08-12T09:33:46.142Z',
        //     endDate: '2025-08-13T20:07:03.913Z',
        //   },
        //   {
        //     moduleId: { type: 'theory', title: 'Standard music notation' },
        //     status: 'inprogress',
        //     startDate: '2025-08-12T09:35:03.086Z',
        //   },
        //   {
        //     moduleId: { type: 'theory', title: 'Know your Instrument' },
        //     status: 'inprogress',
        //     startDate: '2025-08-13T20:07:38.284Z',
        //   },
        //   {
        //     moduleId: { type: 'theory', title: 'Common Time Signature' },
        //     status: 'upcoming',
        //   },
        //   {
        //     moduleId: {
        //       type: 'technical',
        //       title: 'The Right Way',
        //     },
        //     status: 'completed',
        //     startDate: '2025-09-01T09:28:02.464Z',
        //     endDate: '2025-09-01T09:28:20.159Z',
        //     // remark: "ok",
        //     // "score": 3
        //   },
        // ],
      };

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=attendance_${studentId}_${classId}_${month}.pdf`);

      // Generate PDF and pipe to response
      const doc = PDFService.generateAttendancePDF(data as any);
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error('PDF generation error:', error);
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }

  /**
   * Generate attendance PDF with custom data
   */
  static async generateCustomAttendancePDF(req: Request, res: Response): Promise<void> {
    try {
      const data: AttendanceData = req.body;

      if (!data.presentDates || !data.syllabusModules) {
        res.status(400).json({ error: 'Missing required fields: presentDates and syllabusModules' });
        return;
      }

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename=attendance.pdf');

      // Generate PDF and pipe to response
      const doc = PDFService.generateAttendancePDF(data);
      doc.pipe(res);
      doc.end();
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }
}
