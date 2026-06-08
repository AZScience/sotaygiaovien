/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppDatabase, ClassData, Student, Grade, AttendanceSession, AttendanceRecord } from '../types';

const STORAGE_KEY = 'so_tay_giao_vien_db_raw_v1';

// Seed data
const SEED_STUDENTS: Omit<Student, 'id'>[] = [
  { studentCode: '18PM00682', lastName: 'TRẦN VÕ QUỐC', firstName: 'ANH' },
  { studentCode: '18PM00683', lastName: 'NGUYỄN THÁI', firstName: 'DANH' },
  { studentCode: '18PM00684', lastName: 'NGUYỄN THÀNH', firstName: 'ĐẠT' },
  { studentCode: '18PM00685', lastName: 'NGUYỄN THỊ MỸ', firstName: 'DUNG' },
  { studentCode: '18PM00687', lastName: 'NGUYỄN LÂM MINH', firstName: 'DUY' },
  { studentCode: '18PM00688', lastName: 'NGUYỄN HOÀNG LÊ', firstName: 'DUY' },
  { studentCode: '18PM00689', lastName: 'VÕ GIA', firstName: 'HÂN' },
  { studentCode: '18PM00690', lastName: 'CAO NGUYỄN GIA', firstName: 'HÂN' },
  { studentCode: '18PM00691', lastName: 'ĐẶNG TRẦN TRUNG', firstName: 'HẬU' },
  { studentCode: '18PM00693', lastName: 'NGUYỄN KHÁNH', firstName: 'HƯNG' },
  { studentCode: '18PM00694', lastName: 'PHẠM HOÀNG', firstName: 'KHANG' },
  { studentCode: '18PM00695', lastName: 'VŨ NGUYỄN ĐĂNG', firstName: 'KHOA' },
  { studentCode: '18PM00696', lastName: 'LÊ ĐĂNG', firstName: 'KHOA' },
  { studentCode: '18PM00697', lastName: 'TẠ GIA', firstName: 'KỲ' },
  { studentCode: '18PM00698', lastName: 'HUỲNH KIM', firstName: 'LỢI' }
];

const SEED_GRADES_MAP: { [code: string]: Omit<Grade, 'studentId'> } = {
  '18PM00682': { l1: 7.5, l2: 6.5, l3: null, gv1: 7.5, gv2: 7.5, lan2: null, note: '' },
  '18PM00683': { l1: 7.0, l2: 6.0, l3: null, gv1: 7.5, gv2: 7.5, lan2: null, note: '' },
  '18PM00684': { l1: 6.0, l2: 5.0, l3: null, gv1: 6.0, gv2: 6.0, lan2: null, note: '' },
  '18PM00685': { l1: 9.0, l2: 8.0, l3: null, gv1: 9.0, gv2: 9.0, lan2: null, note: '' },
  '18PM00687': { l1: 6.0, l2: 5.0, l3: null, gv1: 5.0, gv2: 5.0, lan2: null, note: '' },
  '18PM00688': { l1: 9.0, l2: 8.0, l3: null, gv1: 9.0, gv2: 9.0, lan2: null, note: '' },
  '18PM00689': { l1: 8.5, l2: 7.5, l3: null, gv1: 8.5, gv2: 8.5, lan2: null, note: '' },
  '18PM00690': { l1: 0.0, l2: 0.0, l3: null, gv1: 0.0, gv2: 0.0, lan2: null, note: 'Học lại' },
  '18PM00691': { l1: 9.0, l2: 8.0, l3: null, gv1: 9.0, gv2: 9.0, lan2: null, note: '' },
  '18PM00693': { l1: 0.0, l2: 0.0, l3: null, gv1: 0.0, gv2: 0.0, lan2: null, note: 'Học lại' },
  '18PM00694': { l1: 7.0, l2: 6.0, l3: null, gv1: 7.0, gv2: 7.0, lan2: null, note: '' },
  '18PM00695': { l1: 7.5, l2: 7.0, l3: null, gv1: 8.5, gv2: 8.5, lan2: null, note: '' },
  '18PM00696': { l1: 7.5, l2: 6.5, l3: null, gv1: 7.5, gv2: 7.5, lan2: null, note: '' },
  '18PM00697': { l1: 7.0, l2: 6.5, l3: null, gv1: 8.0, gv2: 8.0, lan2: null, note: '' },
  '18PM00698': { l1: 0.0, l2: 0.0, l3: null, gv1: 0.0, gv2: 0.0, lan2: null, note: 'Học lại' }
};

export function getInitialDatabase(): AppDatabase {
  const classId = 'class_18PMA1_CS2';

  // Build Students
  const students: Student[] = SEED_STUDENTS.map((s, idx) => {
    let schoolName = 'Trường TC KTNV Tôn Đức Thắng';
    if (idx >= 5 && idx < 10) {
      schoolName = 'Trường CĐ Công nghệ Thủ Đức';
    } else if (idx >= 10) {
      schoolName = 'Trường TCN Sư phạm Kỹ thuật';
    }
    let bcs = '';
    if (s.studentCode === '18PM00683') {
      bcs = 'Lớp trưởng';
    } else if (s.studentCode === '18PM00682' || s.studentCode === '18PM00685') {
      bcs = 'Lớp phó';
    } else if (s.studentCode === '18PM00687') {
      bcs = 'Tổ trưởng';
    }
    return {
      id: `std_${idx + 1}`,
      studentCode: s.studentCode,
      lastName: s.lastName,
      firstName: s.firstName,
      schoolName,
      bcs
    };
  });

  // Build Grades
  const grades: Grade[] = students.map((std) => {
    const seed = SEED_GRADES_MAP[std.studentCode] || { l1: null, l2: null, l3: null, gv1: null, gv2: null, lan2: null, note: '' };
    return {
      studentId: std.id,
      ...seed
    };
  });

  // Default Sessions
  const sessions: AttendanceSession[] = [
    { 
      id: 'sess_1', 
      date: '2026-05-02', 
      periods: 5,
      theoryHours: 3,
      practiceHours: 2,
      examHours: 0,
      topicSummary: 'Giới thiệu chung về phần cứng máy tính, các thành phần phần chính',
      teacherSignature: 'Nguyễn Vĩnh Phúc'
    },
    { 
      id: 'sess_2', 
      date: '2026-05-09', 
      periods: 5,
      theoryHours: 3,
      practiceHours: 2,
      examHours: 0,
      topicSummary: 'Các thiết bị ngoại vi, nguyên lý hoạt động',
      teacherSignature: 'Nguyễn Vĩnh Phúc'
    },
    { 
      id: 'sess_3', 
      date: '2026-05-16', 
      periods: 5,
      theoryHours: 2,
      practiceHours: 2,
      examHours: 1,
      topicSummary: 'Bo mạch chủ, CPU, RAM – chức năng và nguyên tắc chọn lựa (Kiểm tra)',
      teacherSignature: 'Nguyễn Vĩnh Phúc'
    },
    { 
      id: 'sess_4', 
      date: '2026-05-23', 
      periods: 5,
      theoryHours: 2,
      practiceHours: 3,
      examHours: 0,
      topicSummary: 'Ổ cứng, SSD, các loại bộ nhớ lưu trữ',
      teacherSignature: 'Nguyễn Vĩnh Phúc'
    }
  ];

  // Default Attendance records
  const attendance: AttendanceRecord[] = [];
  // Give some students minor absences to show off the math
  // Student 8 (Cao Nguyễn Gia Hân) misses sess_1 and sess_2 (unexcused, 5 periods each)
  const std8 = students.find(s => s.studentCode === '18PM00690');
  if (std8) {
    attendance.push({ studentId: std8.id, sessionId: 'sess_1', status: 'unexcused', unexcusedPeriods: 5 });
    attendance.push({ studentId: std8.id, sessionId: 'sess_2', status: 'unexcused', unexcusedPeriods: 5 });
  }

  // Student 10 (Nguyễn Khánh Hưng) misses sess_1, sess_2, sess_3 (unexcused, 5 periods each)
  const std10 = students.find(s => s.studentCode === '18PM00693');
  if (std10) {
    attendance.push({ studentId: std10.id, sessionId: 'sess_1', status: 'unexcused', unexcusedPeriods: 5 });
    attendance.push({ studentId: std10.id, sessionId: 'sess_2', status: 'unexcused', unexcusedPeriods: 5 });
    attendance.push({ studentId: std10.id, sessionId: 'sess_3', status: 'unexcused', unexcusedPeriods: 5 });
  }

  // Student 15 (Huỳnh Kim Lợi) vắng có phép 'P'
  const std15 = students.find(s => s.studentCode === '18PM00698');
  if (std15) {
    attendance.push({ studentId: std15.id, sessionId: 'sess_1', status: 'excused', unexcusedPeriods: 0 });
    attendance.push({ studentId: std15.id, sessionId: 'sess_2', status: 'unexcused', unexcusedPeriods: 4 });
  }

  // One other student has a little unexcused absence
  const std1 = students.find(s => s.studentCode === '18PM00682');
  if (std1) {
    attendance.push({ studentId: std1.id, sessionId: 'sess_4', status: 'unexcused', unexcusedPeriods: 2 });
  }

  const defaultClass: ClassData = {
    metadata: {
      id: classId,
      className: '18PMA1_CS2',
      subjectName: 'Lắp ráp và Bảo trì Máy tính',
      course: '18',
      semester: 'II',
      schoolYear: '2024 - 2025',
      occupation: 'CÔNG NGHỆ THÔNG TIN (UDPM)',
      level: 'TRUNG CẤP',
      entryRequirements: 'THCS + LỚP 10 + LỚP 11 + LỚP 12 + PTTH.',
      classSize: 36,
      formTeacher: 'NGUYỄN TRƯỜNG SƠN',
      teacherName: 'NGUYỄN VĂN HÙNG',
      monitorName: 'NGUYỄN THÁI DANH',
      deputiesName: 'TRẦN VÕ QUỐC ANH, NGUYỄN THỊ MỸ DUNG',
      totalPeriods: 60,
      managingSchool: 'Trường TC KTNV Tôn Đức Thắng',
      schoolName: 'Trường TCN Sư phạm Kỹ thuật'
    },
    students,
    grades,
    sessions,
    attendance,
    teachers: [
      { id: 't_1', teacherCode: 'GV001', lastName: 'NGUYỄN VĂN', firstName: 'HÙNG', phoneNumber: '0901234567', email: 'hunghv@truongcongnghe.edu.vn', specialty: 'Lắp ráp & Bảo trì PC', department: 'Bộ môn Phần cứng' },
      { id: 't_2', teacherCode: 'GV002', lastName: 'NGUYỄN TRƯỜNG', firstName: 'SƠN', phoneNumber: '0912345678', email: 'sonnt@truongcongnghe.edu.vn', specialty: 'Quản trị mạng & An ninh mạng', department: 'Bộ môn Mạng máy tính' },
      { id: 't_3', teacherCode: 'GV003', lastName: 'PHẠM MINH', firstName: 'HOÀNG', phoneNumber: '0934567890', email: 'hoangpm@truongcongnghe.edu.vn', specialty: 'Phần mềm & Ứng dụng di động', department: 'Bộ môn Công nghệ phần mềm' }
    ]
  };

  return {
    classes: {
      [classId]: defaultClass
    },
    activeClassId: classId
  };
}

export function loadDatabase(): AppDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure all required fields exist
      if (parsed.classes && parsed.activeClassId) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Lỗi khi tải cơ sở dữ liệu, khởi tạo lại:', e);
  }
  const initial = getInitialDatabase();
  saveDatabase(initial);
  return initial;
}

export function saveDatabase(db: AppDatabase): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Lỗi khi lưu cơ sở dữ liệu:', e);
  }
}

// Precision Vietnamese grade rounding to 1 decimal place (e.g. 7.25 -> 7.3, 6.75 -> 6.8)
export function roundTo1Decimal(num: number | null): number | null {
  if (typeof num !== 'number' || num === null || isNaN(num)) return null;
  return Math.round(num * 10) / 10;
}

export function calculatePeriodicGradeAverage(grade: Grade): number | null {
  const grades = [grade.l1, grade.l2, grade.l3].filter((g): g is number => typeof g === 'number' && g !== null);
  if (grades.length === 0) return null;
  const sum = grades.reduce((acc, curr) => acc + curr, 0);
  return roundTo1Decimal(sum / grades.length);
}

export function calculateExamGradeAverage(grade: Grade): number | null {
  // If Lần 2 (lan2) is filled, it takes priority and replaces/is the final exam score
  if (typeof grade.lan2 === 'number' && grade.lan2 !== null) {
    return grade.lan2;
  }
  const examinerGrades = [grade.gv1, grade.gv2].filter((g): g is number => typeof g === 'number' && g !== null);
  if (examinerGrades.length === 0) return null;
  const sum = examinerGrades.reduce((acc, curr) => acc + curr, 0);
  return roundTo1Decimal(sum / examinerGrades.length);
}

export function calculateFinalGradeFromValues(periodicAverage: number | null, examAverage: number | null): number | null {
  if (typeof periodicAverage !== 'number' || periodicAverage === null ||
      typeof examAverage !== 'number' || examAverage === null) {
    return null;
  }
  // Formula: ĐTB Định Kỳ * 0.4 + ĐTB Thi * 0.6
  const finalScore = (periodicAverage * 0.4) + (examAverage * 0.6);
  return roundTo1Decimal(finalScore);
}

export function calculateFinalGrade(grade: Grade): number | null {
  const periodicAverage = calculatePeriodicGradeAverage(grade);
  const examAverage = calculateExamGradeAverage(grade);
  return calculateFinalGradeFromValues(periodicAverage, examAverage);
}

export interface AttendanceStats {
  excusedPeriods: number;  // vắng có phép
  unexcusedPeriods: number; // vắng không phép
  totalMissedPeriods: number; // tổng số tiết vắng (phép + không phép)
  missedPercentage: number;  // tỉ lệ % vắng
  bannedFromExam: boolean;   // bị cấm thi (> 20% vắng)
}

export function calculateAttendanceStats(
  studentId: string,
  sessions: AttendanceSession[],
  records: AttendanceRecord[],
  totalPeriods: number
): AttendanceStats {
  let excusedPeriods = 0;
  let unexcusedPeriods = 0;

  sessions.forEach((session) => {
    const record = records.find(r => r.studentId === studentId && r.sessionId === session.id);
    if (!record) return;

    if (record.status === 'excused') {
      // P: vắng phép = tính toàn bộ số tiết của session đó
      excusedPeriods += session.periods;
    } else if (record.status === 'unexcused') {
      // Số tiết vắng không phép ghi cụ thể
      unexcusedPeriods += record.unexcusedPeriods;
    }
  });

  const totalMissedPeriods = excusedPeriods + unexcusedPeriods;
  const missedPercentage = totalPeriods > 0 ? (totalMissedPeriods / totalPeriods) * 100 : 0;
  const bannedFromExam = missedPercentage > 20; // Cấm thi nếu vắng quá 20%

  return {
    excusedPeriods,
    unexcusedPeriods,
    totalMissedPeriods,
    missedPercentage: Math.round(missedPercentage * 10) / 10,
    bannedFromExam
  };
}
