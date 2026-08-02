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
    regularity: number;
    learningSpeed: number;
    theory: number;
    technicalExercises: number;
    repertoireRhythmSense: number;
    repertoireDynamics: number;
    totalScore?: number;
    averageScore?: number;
    remarks?: string;
  };
}

export class PDFService {
  private static readonly PAGE_BOTTOM_PADDING = 40;

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
   * Remaining usable vertical space on the current page.
   */
  private static remainingPageSpace(doc: PDFKit.PDFDocument): number {
    return doc.page.height - doc.page.margins.bottom - doc.y;
  }

  /**
   * Start a new page when the requested height will not fit.
   */
  private static ensureSpace(doc: PDFKit.PDFDocument, neededHeight: number): void {
    if (this.remainingPageSpace(doc) < neededHeight + this.PAGE_BOTTOM_PADDING) {
      doc.addPage();
    }
  }

  /**
   * Draw text at an absolute position without advancing the document cursor.
   * Callers should ensureSpace() first so PDFKit does not auto-insert blank pages.
   */
  private static drawFixedText(
    doc: PDFKit.PDFDocument,
    text: string,
    x: number,
    y: number,
    options: PDFKit.Mixins.TextOptions = {}
  ): void {
    const previousX = doc.x;
    const previousY = doc.y;
    doc.text(text, x, y, options);
    doc.x = previousX;
    doc.y = previousY;
  }

  /**
   * Generate attendance PDF
   */
  static generateAttendancePDF(data: AttendanceData): PDFKit.PDFDocument {
    console.log('Generating attendance PDF for student:', data);

    const { studentDetails: student, classDetails: classId, courseDetails: courseId, joiningDate, month } = data;
    const doc = new PDFDocument({ margin: 40, size: 'A4' }) as PDFKit.PDFDocument;

    // Add logo at the top center
    const logoPath = this.findLogoFile();
    if (logoPath) {
      try {
        doc.image(logoPath, 250, 40, { width: 80, height: 80 });
        doc.y = 130;
        console.log('Logo loaded successfully from:', logoPath);
      } catch (error) {
        console.log('Error loading logo:', error);
        doc.moveDown(1);
      }
    } else {
      console.log('Logo file not found in any expected location');
      doc.moveDown(1);
    }

    doc.fontSize(18).fillColor('#1a4e8a').text(`Students Monthly Progress Report - ${month}`, { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(12).fillColor('#333333');
    doc.moveDown(0.5);

    // Define student details table dimensions
    const studentTableStartX = 50;
    const studentTableEndX = 550;
    const labelColWidth = 150;
    const valueColWidth = 350;
    const studentRowHeight = 25;
    let studentCurrentY = doc.y;

    const studentDetails = [
      { label: 'Name', value: student.name },
      { label: 'Email', value: student.email },
      { label: 'Class', value: classId.name },
      { label: 'Course', value: courseId.name },
      { label: 'Date of Joining', value: moment(joiningDate).format('DD MMM YYYY') },
    ];

    this.ensureSpace(doc, studentDetails.length * studentRowHeight);

    studentDetails.forEach((detail) => {
      const rowY = studentCurrentY;

      doc.rect(studentTableStartX, rowY, studentTableEndX - studentTableStartX, studentRowHeight).stroke();
      doc
        .moveTo(studentTableStartX + labelColWidth, rowY)
        .lineTo(studentTableStartX + labelColWidth, rowY + studentRowHeight)
        .stroke();

      this.drawFixedText(doc, detail.label, studentTableStartX + 10, rowY + 8, {
        width: labelColWidth - 20,
      });
      this.drawFixedText(doc, detail.value, studentTableStartX + labelColWidth + 10, rowY + 8, {
        width: valueColWidth - 20,
      });

      studentCurrentY += studentRowHeight;
    });

    doc.y = studentCurrentY;
    doc.x = studentTableStartX;
    doc.moveDown(1);

    doc.fontSize(12).fillColor('black');

    const tableStartX = 50;
    const tableEndX = 550;
    const dateColWidth = 250;
    const sessionColWidth = 250;
    const sessionHeaderHeight = 20;

    this.ensureSpace(doc, sessionHeaderHeight + 28);

    const headerY = doc.y;

    doc.rect(tableStartX, headerY, tableEndX - tableStartX, sessionHeaderHeight).stroke();
    doc
      .moveTo(tableStartX + dateColWidth, headerY)
      .lineTo(tableStartX + dateColWidth, headerY + sessionHeaderHeight)
      .stroke();

    this.drawFixedText(doc, 'Date', tableStartX + 10, headerY + 5, { width: dateColWidth - 20 });
    this.drawFixedText(doc, 'Session Details', tableStartX + dateColWidth + 10, headerY + 5, {
      width: sessionColWidth - 20,
    });

    doc.y = headerY + sessionHeaderHeight;
    doc.x = tableStartX;

    const allDates = [
      ...data.presentDates.map((date) => ({ date, type: 'present' as const })),
      ...data.absentDates.map((date) => ({ date, type: 'absent' as const })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    allDates.forEach((dateInfo) => {
      const date = moment(dateInfo.date).format('dddd, DD MMMM YYYY');
      const isPresent = dateInfo.type === 'present';

      let sessionDetails = 'Absent';

      if (isPresent) {
        const activeModules = data.syllabusModules.filter((m) => {
          const start = m.startDate ? moment(m.startDate) : null;
          const end = m.endDate ? moment(m.endDate) : null;
          const d = moment(dateInfo.date);

          return start && d.isSameOrAfter(start, 'day') && (!end || d.isSameOrBefore(end, 'day'));
        });

        sessionDetails = activeModules.length > 0 ? activeModules.map((m) => m.moduleId.title).join(', ') : '-';
      }

      const cellPadding = 8;
      const dateTextWidth = dateColWidth - 20;
      const sessionTextWidth = sessionColWidth - 20;

      const dateTextHeight = doc.heightOfString(date, { width: dateTextWidth });
      const sessionTextHeight = doc.heightOfString(sessionDetails, { width: sessionTextWidth });
      const rowHeight = Math.max(28, Math.max(dateTextHeight, sessionTextHeight) + cellPadding * 2);

      this.ensureSpace(doc, rowHeight);

      const rowY = doc.y;

      doc.rect(tableStartX, rowY, tableEndX - tableStartX, rowHeight).stroke();
      doc
        .moveTo(tableStartX + dateColWidth, rowY)
        .lineTo(tableStartX + dateColWidth, rowY + rowHeight)
        .stroke();

      this.drawFixedText(doc, date, tableStartX + 10, rowY + cellPadding, { width: dateTextWidth });
      this.drawFixedText(doc, sessionDetails, tableStartX + dateColWidth + 10, rowY + cellPadding, {
        width: sessionTextWidth,
      });

      doc.y = rowY + rowHeight;
      doc.x = tableStartX;
    });

    if (data.mrtData) {
      doc.moveDown(1);

      const mrtTableStartX = 50;
      const mrtTableEndX = 550;
      const mrtLabelColWidth = 400;
      const mrtScoreColWidth = 100;
      const mrtRowHeight = 25;

      const mrtDetails = [
        { label: 'Regularity (5M)', value: data.mrtData.regularity },
        { label: 'Learning Speed (5M)', value: data.mrtData.learningSpeed },
        { label: 'Theory (5M)', value: data.mrtData.theory },
        { label: 'Technical Exercises (5M)', value: data.mrtData.technicalExercises },
        { label: 'Repertoire (Rhythm Sense) (5M)', value: data.mrtData.repertoireRhythmSense },
        { label: 'Repertoire (Dynamics) (5M)', value: data.mrtData.repertoireDynamics },
        { label: 'Total Marks (30M)', value: data.mrtData.totalScore },
      ];

      const totalTableHeight = mrtDetails.length * mrtRowHeight;
      const remarksHeight = data.mrtData.remarks ? 60 : 0;

      // Keep the whole MRT block on one page so rows are not split across blank pages
      this.ensureSpace(doc, totalTableHeight + remarksHeight);

      const mrtCurrentY = doc.y;

      doc.rect(mrtTableStartX, mrtCurrentY, mrtTableEndX - mrtTableStartX, totalTableHeight).stroke();
      doc
        .moveTo(mrtTableStartX + mrtLabelColWidth, mrtCurrentY)
        .lineTo(mrtTableStartX + mrtLabelColWidth, mrtCurrentY + totalTableHeight)
        .stroke();

      mrtDetails.forEach((detail, index) => {
        const rowY = mrtCurrentY + index * mrtRowHeight;

        if (index < mrtDetails.length - 1) {
          doc
            .moveTo(mrtTableStartX, rowY + mrtRowHeight)
            .lineTo(mrtTableEndX, rowY + mrtRowHeight)
            .stroke();
        }

        doc.fontSize(12).fillColor('#1a4e8a');
        this.drawFixedText(doc, detail.label, mrtTableStartX + 10, rowY + 8, {
          width: mrtLabelColWidth - 20,
        });
        this.drawFixedText(doc, detail.value?.toString() ?? '', mrtTableStartX + mrtLabelColWidth + 10, rowY + 8, {
          width: mrtScoreColWidth - 20,
          align: 'center',
        });
      });

      doc.y = mrtCurrentY + totalTableHeight;
      doc.x = mrtTableStartX;

      if (data.mrtData.remarks) {
        doc.moveDown(1);
        doc.fontSize(12).fillColor('#1a4e8a').text('Remarks:');
        doc.fontSize(12).fillColor('black').text(data.mrtData.remarks);
      }
    }

    return doc;
  }
}
