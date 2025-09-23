const PDFDocument = require('pdfkit');
import moment from 'moment';
import path from 'path';
import fs from 'fs';

export interface SyllabusModule {
  moduleId: {
    type: string;
    title: string;
  };
  status: string;
  startDate?: string;
  endDate?: string;
}

export interface AttendanceData {
  presentDates: string[];
  absentDates: string[];
  syllabusModules: SyllabusModule[];
  studentDetails: any;
  classDetails: any;
  courseDetails: any;
  joiningDate: string;
  month: string;
  mrtData?: {
    sptAndFileSubmission: number;
    regularity: number;
    learningSpeed: number;
    songLearning: number;
    assignment: number;
    theoryAndTechnicals: number;
    totalScore?: number;
    averageScore?: number;
    remarks?: string;
  };
}

export class PDFService {
  /**
   * Find logo file in various possible locations
   */
  private static findLogoFile(): string | null {
    const possiblePaths = [
      // Development: from src folder
      path.join(process.cwd(), 'src', 'modules', 'pdf', 'assets', 'icon-logo.png'),
      // Production: from dist folder
      path.join(process.cwd(), 'dist', 'modules', 'pdf', 'assets', 'icon-logo.png'),
      // Fallback: from root assets
    ];

    for (const logoPath of possiblePaths) {
      if (fs.existsSync(logoPath)) {
        return logoPath;
      }
    }
    return null;
  }

  /**
   * Generate attendance PDF
   */
  static generateAttendancePDF(data: AttendanceData): any {
    console.log('Generating attendance PDF for student:', data);

    const { studentDetails: student, classDetails: classId, courseDetails: courseId, joiningDate, month } = data;
    const doc = new PDFDocument({ margin: 40 }) as any;

    // Add logo at the top center
    const logoPath = this.findLogoFile();
    if (logoPath) {
      try {
        // Position logo at the top center, above the title
        doc.image(logoPath, 250, 40, { width: 80, height: 80, align: 'center' });
        doc.moveDown(7);
        console.log('Logo loaded successfully from:', logoPath);
        // // Subtitle - Monthly Report Card
        doc.fontSize(18).fillColor('#1a4e8a').text(`Monthly Report Card - ${month}`, { align: 'center' });
        doc.moveDown(1);
      } catch (error) {
        console.log('Error loading logo:', error);
        doc.moveDown(1);
      }
    } else {
      console.log('Logo file not found in any expected location');
      doc.moveDown(1);
    }

    // Main Title - Johnson's Academy (positioned below logo)
    // doc.fontSize(24).fillColor('#1a4e8a').text("Johnson's Academy", { align: 'center' });
    // doc.moveDown(0.2);

    // doc.fontSize(16).fillColor('#1a4e8a').text(`Class Attendance & Sessions - ${month}`);
    // doc.moveDown(1);

    // remove this
    doc.fontSize(12).fillColor('#333333');
    doc.moveDown(0.5);

    // Define student details table dimensions
    const studentTableStartX = 50;
    const studentTableEndX = 550;
    const labelColWidth = 150;
    const valueColWidth = 350;
    const studentRowHeight = 25;
    let studentCurrentY = doc.y;

    // Student details data (hardcoded for now)
    const studentDetails = [
      { label: 'Name', value: student.name },
      { label: 'Email', value: student.email },
      { label: 'Class', value: classId.name },
      { label: 'Course', value: courseId.name },
      { label: 'Date of Joining', value: moment(joiningDate).format('DD MMM YYYY') },
    ];

    // Create student details table
    studentDetails.forEach((detail, _index) => {
      const rowY = studentCurrentY;

      // Draw row border
      doc.rect(studentTableStartX, rowY, studentTableEndX - studentTableStartX, studentRowHeight).stroke();

      // Draw vertical line between columns
      doc
        .moveTo(studentTableStartX + labelColWidth, rowY)
        .lineTo(studentTableStartX + labelColWidth, rowY + studentRowHeight)
        .stroke();

      // Add label text
      doc.text(detail.label, studentTableStartX + 10, rowY + 8, { width: labelColWidth - 20 });

      // Add value text
      doc.text(detail.value, studentTableStartX + labelColWidth + 10, rowY + 8, { width: valueColWidth - 20 });

      studentCurrentY += studentRowHeight;
    });

    doc.y = studentCurrentY; // Update doc.y to the end of the student table
    doc.moveDown(1);

    // Title
    // doc.fontSize(16).fillColor('#1a4e8a').text(`Class Attendance & Sessions - ${month}`);
    // doc.moveDown(1);

    // Table headers
    doc.fontSize(12).fillColor('black');

    // Define table dimensions
    const tableStartX = 50;
    const tableEndX = 550;
    const dateColWidth = 250;
    const sessionColWidth = 250;
    const headerY = doc.y;

    // Draw table border
    doc.rect(tableStartX, headerY, tableEndX - tableStartX, 20).stroke();

    // Draw vertical line between columns
    doc
      .moveTo(tableStartX + dateColWidth, headerY)
      .lineTo(tableStartX + dateColWidth, headerY + 20)
      .stroke();

    // Add header text
    doc.text('Date', tableStartX + 10, headerY + 5, { width: dateColWidth - 20 });
    doc.text('Session Details', tableStartX + dateColWidth + 10, headerY + 5, { width: sessionColWidth - 20 });

    doc.moveDown(0.5);

    // Combine and sort all dates
    const allDates = [
      ...data.presentDates.map((date) => ({ date, type: 'present' })),
      ...data.absentDates.map((date) => ({ date, type: 'absent' })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Loop over all dates to create table rows
    allDates.forEach((dateInfo, _index) => {
      const date = moment(dateInfo.date).format('dddd, DD MMMM YYYY');
      const isPresent = dateInfo.type === 'present';

      let sessionDetails = 'Absent';

      if (isPresent) {
        // Find modules active on that date
        const activeModules = data.syllabusModules.filter((m) => {
          const start = m.startDate ? moment(m.startDate) : null;
          const end = m.endDate ? moment(m.endDate) : null;
          const d = moment(dateInfo.date);

          return start && d.isSameOrAfter(start, 'day') && (!end || d.isSameOrBefore(end, 'day'));
        });

        // Map module titles
        sessionDetails =
          activeModules.length > 0
            ? activeModules.map((m) => (m.moduleId.type === 'theory' ? 'Theory' : m.moduleId.title)).join(', ')
            : '-';
      }

      // Calculate row position and height based on content
      const rowY = doc.y;
      const rowHeight = 35; // Increased row height to accommodate text

      // Draw row border
      doc.rect(tableStartX, rowY, tableEndX - tableStartX, rowHeight).stroke();

      // Draw vertical line between columns
      doc
        .moveTo(tableStartX + dateColWidth, rowY)
        .lineTo(tableStartX + dateColWidth, rowY + rowHeight)
        .stroke();

      // Add date text (centered vertically in row)
      doc.text(date, tableStartX + 10, rowY + 12, { width: dateColWidth - 20 });

      // Add session details text (centered vertically in row)
      doc.text(sessionDetails, tableStartX + dateColWidth + 10, rowY + 9, { width: sessionColWidth - 20 });

      // Move to next row position
      doc.y = rowY + rowHeight;
    });

    // Add MRT data table if available
    if (data.mrtData) {
      doc.moveDown(1);

      // MRT Title
      // doc.fontSize(16).fillColor('#1a4e8a').text('Monthly Report & Tracking (MRT)', { align: 'left' });
      // doc.moveDown(1);

      // Define MRT table dimensions
      const mrtTableStartX = 50;
      const mrtTableEndX = 550;
      const mrtLabelColWidth = 400;
      const mrtScoreColWidth = 100;
      const mrtRowHeight = 25;
      let mrtCurrentY = doc.y;

      // MRT data
      const mrtDetails = [
        { label: 'SPT & File Submission', value: data.mrtData.sptAndFileSubmission },
        { label: 'Regularity', value: data.mrtData.regularity },
        { label: 'Learning Speed', value: data.mrtData.learningSpeed },
        { label: 'Song Learning', value: data.mrtData.songLearning },
        { label: 'Assignment', value: data.mrtData.assignment },
        { label: 'Theory & Technical', value: data.mrtData.theoryAndTechnicals },
        { label: 'Total Score', value: data.mrtData.totalScore },
      ];

      // Calculate total table height
      const totalTableHeight = mrtDetails.length * mrtRowHeight;

      // Draw the main table border (single rectangle for the entire table)
      doc.rect(mrtTableStartX, mrtCurrentY, mrtTableEndX - mrtTableStartX, totalTableHeight).stroke();

      // Draw vertical line between columns (single line for the entire table)
      doc
        .moveTo(mrtTableStartX + mrtLabelColWidth, mrtCurrentY)
        .lineTo(mrtTableStartX + mrtLabelColWidth, mrtCurrentY + totalTableHeight)
        .stroke();

      // Draw horizontal lines between rows and add content
      mrtDetails.forEach((detail, index) => {
        const rowY = mrtCurrentY + index * mrtRowHeight;

        // Draw horizontal line between rows (except for the last row)
        if (index < mrtDetails.length - 1) {
          doc
            .moveTo(mrtTableStartX, rowY + mrtRowHeight)
            .lineTo(mrtTableEndX, rowY + mrtRowHeight)
            .stroke();
        }

        // Add label text
        doc
          .fontSize(12)
          .fillColor('#1a4e8a')
          .text(detail.label, mrtTableStartX + 10, rowY + 8, { width: mrtLabelColWidth - 20 });

        // Add score text (centered)
        doc
          .fontSize(12)
          .fillColor('#1a4e8a')
          .text(detail?.value?.toString(), mrtTableStartX + mrtLabelColWidth + 10, rowY + 8, {
            width: mrtScoreColWidth - 20,
            align: 'center',
          });
      });

      // Update current Y position to the end of the table
      doc.y = mrtCurrentY + totalTableHeight;
      doc.x = mrtTableStartX;

      // Add remarks if available
      if (data.mrtData.remarks) {
        doc.moveDown(1);
        doc.fontSize(12).fillColor('#1a4e8a').text('Remarks:');
        doc.fontSize(10).fillColor('black').text(data.mrtData.remarks);
      }

      // doc.y = mrtCurrentY; // Update doc.y to the end of the MRT table
    }

    return doc;
  }
}
