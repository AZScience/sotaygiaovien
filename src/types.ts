/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ClassMetadata {
  id: string;
  className: string; // e.g. 18PMA1_CS2
  subjectName: string; // e.g. Lắp ráp và Bảo trì Máy tính
  course: string; // e.g. 18
  semester: string; // e.g. II
  schoolYear: string; // e.g. 2024 - 2025
  occupation: string; // e.g. CÔNG NGHỆ THÔNG TIN (UDPM)
  level: string; // e.g. TRUNG CẤP
  entryRequirements: string; // e.g. THCS + LỚP 10 + LỚP 11 + LỚP 12 + PTTH.
  classSize: number; // e.g. 36
  formTeacher: string; // e.g. NGUYỄN TRƯỜNG SƠN
  teacherName?: string; // Giảng viên giảng dạy
  monitorName: string; // Lớp trưởng
  deputiesName: string; // Lớp phó và các tổ trưởng
  totalPeriods: number; // Tổng số tiết môn học, ví dụ 60
  schoolName?: string; // Tên trường liên kết
  managingSchool?: string; // Trường quản lý (chủ quản)
  isLocked?: boolean; // Khóa thay đổi dữ liệu
}

export interface Student {
  id: string;
  studentCode: string; // e.g. 18PM00682
  lastName: string; // TRẦN VÕ QUỐC
  firstName: string; // ANH
  schoolName?: string; // Tên trường
  phoneNumber?: string; // Số điện thoại liên lạc
  birthDate?: string; // Ngày sinh
  bcs?: string; // Ban cán sự (Lớp trưởng, Lớp phó, Tổ trưởng)
}

export interface Teacher {
  id: string;
  teacherCode: string; // e.g. GV001
  lastName: string; // e.g. NGUYỄN VĨNH
  firstName: string; // e.g. PHÚC
  phoneNumber?: string; // Số điện thoại liên lạc
  email?: string; // Email liên lạc
  specialty?: string; // Bộ môn giảng dạy / Học hàm học vị
  department?: string; // Đơn vị công tác
}

export interface Grade {
  studentId: string;
  l1: number | null;
  l2: number | null;
  l3: number | null;
  gv1: number | null;
  gv2: number | null;
  lan2: number | null;
  note: string;
}

export interface AttendanceSession {
  id: string;
  date: string; // YYYY-MM-DD
  periods: number; // Số tiết trong ngày học này, ví dụ 5 tiết
  theoryHours?: number; // Số tiết lý thuyết
  practiceHours?: number; // Số tiết thực hành
  examHours?: number; // Số tiết kiểm tra
  topicSummary?: string; // Tóm tắt nội dung bài dạy, kiểm tra
  teacherSignature?: string; // Chữ ký giáo viên / Họ tên / xác nhận
}

export interface AttendanceRecord {
  studentId: string;
  sessionId: string;
  status: 'present' | 'excused' | 'unexcused';
  unexcusedPeriods: number; // Số tiết vắng nếu không phép (1 đến số tiết của session)
}

export interface ClassData {
  metadata: ClassMetadata;
  students: Student[];
  grades: Grade[];
  sessions: AttendanceSession[];
  attendance: AttendanceRecord[];
  teachers?: Teacher[];
}

export interface AppDatabase {
  classes: { [classId: string]: ClassData };
  activeClassId: string;
}
