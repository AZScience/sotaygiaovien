/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AppDatabase, ClassData, ClassMetadata, Grade, Student, AttendanceSession, AttendanceRecord, Teacher, CurrentUser } from './types';
import { loadDatabase, saveDatabase, getInitialDatabase } from './utils/database';
import { initSQLiteDB, sqliteLoad, sqliteSave, isSQLiteReady, getSQLiteInfo } from './utils/sqlite';
import Sidebar from './components/Sidebar';
import TabCover from './components/TabCover';
import TabResults from './components/TabResults';
import TabResultsBook from './components/TabResultsBook';
import TabAttendance from './components/TabAttendance';
import TabTeachingContent from './components/TabTeachingContent';
import TabExamList from './components/TabExamList';
import TabManagement from './components/TabManagement';
import TabDashboard from './components/TabDashboard';
import StudentPortal from './components/StudentPortal';
import LoginScreen from './components/LoginScreen';
import { BookOpen, GraduationCap, Calendar, Settings, ListFilter, ClipboardCheck, Menu, X, FileSpreadsheet, CalendarRange, Printer, Users, Lock, Unlock, ExternalLink, Info, LayoutDashboard } from 'lucide-react';

export default function App() {
  const [db, setDb] = useState<AppDatabase | null>(null);
  const [activeTab, setActiveTab] = useState<'cover' | 'dashboard' | 'grades' | 'results_book' | 'attendance' | 'teaching_content' | 'exam_list' | 'management'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sqliteReady, setSqliteReady] = useState(false);
  const [sqliteInfo, setSqliteInfo] = useState<{ sizeBytes: number; ready: boolean }>({ sizeBytes: 0, ready: false });

  // Authentication State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loginError, setLoginError] = useState<string | undefined>();

  const handleLogin = (email: string, password: string) => {
    // 1. Hardcoded admin fallback for bootstrap
    if ((email === 'admin' || email === 'admin@example.com') && (password === 'admin123' || password === 'admin')) {
      setCurrentUser({ id: 'admin_sys', email: 'admin@example.com', role: 'admin', name: 'Quản trị viên Hệ thống' });
      setLoginError(undefined);
      return;
    }

    if (!db) {
      setLoginError('Cơ sở dữ liệu chưa sẵn sàng hoặc rỗng.');
      return;
    }

    // 2. Search in all classes for a matching teacher
    let foundTeacher: Teacher | null = null;
    for (const classId of Object.keys(db.classes)) {
      const cls = db.classes[classId];
      if (cls.teachers) {
        const match = cls.teachers.find(t => (t.email === email || t.teacherCode === email) && t.password === password);
        if (match) {
          foundTeacher = match;
          break;
        }
      }
    }

    if (foundTeacher) {
      setCurrentUser({
        id: foundTeacher.id,
        email: foundTeacher.email || email,
        role: foundTeacher.role === 'admin' ? 'admin' : 'teacher',
        name: `${foundTeacher.lastName} ${foundTeacher.firstName}`
      });
      setLoginError(undefined);
    } else {
      setLoginError('Email/Tài khoản hoặc mật khẩu không chính xác.');
    }
  };

  // Listen for real-time QR attendance check-ins from separate tabs/devices on the same origin
  useEffect(() => {
    // 1. Live synchronized BroadcastChannel
    const channel = new BroadcastChannel('qr_attendance_sync');
    const handleBroadcast = (e: MessageEvent) => {
      if (e.data && e.data.type === 'attendance_scanned') {
        const loaded = loadDatabase();
        setDb(loaded);
      }
    };
    channel.addEventListener('message', handleBroadcast);

    // 2. Fallback Storage Event listener (triggers on localStorage edits from other windows/tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'so_tay_giao_vien_db_raw_v1') {
        const loaded = loadDatabase();
        setDb(loaded);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      channel.removeEventListener('message', handleBroadcast);
      channel.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Custom print warning state for sandboxed iframe safety
  const [showPrintWarning, setShowPrintWarning] = useState(false);
  const originalPrintRef = useRef<() => void>(() => {});

  // Intercept window.print to prevent iframe sandboxing print blockages
  useEffect(() => {
    const originalPrint = window.print;
    originalPrintRef.current = originalPrint;

    window.print = () => {
      const isInsideIframe = window.self !== window.top;
      if (isInsideIframe) {
        setShowPrintWarning(true);
      } else {
        originalPrint();
      }
    };

    return () => {
      window.print = originalPrint;
    };
  }, []);

  // Load database on start — SQLite first, fallback to localStorage
  useEffect(() => {
    const init = async () => {
      // 1. Init SQLite (auto-migrates from localStorage if needed)
      await initSQLiteDB();
      setSqliteReady(true);
      setSqliteInfo(getSQLiteInfo());

      // 2. Load data: SQLite takes priority over localStorage
      const fromSQLite = sqliteLoad();
      if (fromSQLite) {
        setDb(fromSQLite);
      } else {
        // Fallback: localStorage or seed
        const fromLS = loadDatabase();
        setDb(fromLS);
        // Persist immediately into SQLite
        await sqliteSave(fromLS);
        setSqliteInfo(getSQLiteInfo());
      }
    };

    init().catch(err => {
      console.error('[App] Lỗi khởi tạo SQLite, dùng localStorage fallback:', err);
      const loaded = loadDatabase();
      setDb(loaded);
    });

    // Auto collapse sidebar on start for mobile/tablet devices
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

  // Debounced auto-save state for attendance to prevent performance drop during rapid marks
  const [attendanceSaveStatus, setAttendanceSaveStatus] = useState<'saved' | 'saving'>('saved');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestDbRef = useRef<AppDatabase | null>(db);

  // Sync latest db reference to circumvent closure restrictions
  useEffect(() => {
    latestDbRef.current = db;
  }, [db]);

  // Flush any pending database saves to localStorage AND SQLite immediately
  const flushPendingSave = () => {
    if (saveTimeoutRef.current && latestDbRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveDatabase(latestDbRef.current);
      sqliteSave(latestDbRef.current).then(() => setSqliteInfo(getSQLiteInfo()));
      setAttendanceSaveStatus('saved');
      saveTimeoutRef.current = null;
    }
  };

  const currentClassId = db?.activeClassId;

  // Automatically flush pending changes on tab or class switches, or unmounting
  useEffect(() => {
    return () => {
      flushPendingSave();
    };
  }, [activeTab, currentClassId]);

  // Helper utility to update and persist database changes (localStorage + SQLite)
  const updateDb = (newDb: AppDatabase) => {
    flushPendingSave();
    setDb(newDb);
    saveDatabase(newDb);
    sqliteSave(newDb).then(() => setSqliteInfo(getSQLiteInfo()));
  };

  // Helper utility for debounced saving of high-frequency changes (like attendance checkboxes)
  const updateDbDebounced = (newDb: AppDatabase) => {
    setDb(newDb);
    setAttendanceSaveStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveDatabase(newDb);
      sqliteSave(newDb).then(() => setSqliteInfo(getSQLiteInfo()));
      setAttendanceSaveStatus('saved');
      saveTimeoutRef.current = null;
    }, 1000); // 1-second debounce
  };

  if (!db) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white font-sans text-sm gap-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center animate-pulse">
            <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 3 8 3s8-.79 8-3V7M4 7c0 2.21 3.582 3 8 3s8-.79 8-3M4 7c0-2.21 3.582-3 8-3s8 .79 8 3" />
            </svg>
          </div>
          <p className="text-slate-300 font-semibold">Đang khởi tạo Sổ tay Giáo viên...</p>
          <p className="text-slate-500 text-xs">Đang nạp SQLite (WebAssembly) từ bộ nhớ IndexedDB</p>
        </div>
      </div>
    );
  }

  // Detect and launch dedicated Student Attendance Self Check-In Portal
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const qrSessionId = urlParams.get('qr_session_id');
  if (qrSessionId) {
    return (
      <StudentPortal 
        qrSessionId={qrSessionId}
        db={db}
        onUpdateDb={updateDb}
      />
    );
  }

  const activeClassId = db.activeClassId;
  const activeClass: ClassData = db.classes[activeClassId] || Object.values(db.classes)[0];

  // Get all unique student profiles across all classes in the system to serve as "Danh sách Hồ sơ Học viên"
  const allSystemStudents: Student[] = db ? (Object.values(db.classes) as ClassData[]).reduce((acc: Student[], cls: ClassData) => {
    if (cls.students) {
      cls.students.forEach((s) => {
        if (s.studentCode && !acc.some(exist => exist.studentCode === s.studentCode)) {
          acc.push(s);
        }
      });
    }
    return acc;
  }, []) : [];

  // 1. Switch Class
  const handleClassChange = (classId: string) => {
    updateDb({
      ...db,
      activeClassId: classId
    });
  };

  // 2. Add New Class/Subject Section
  const handleAddClass = (className: string, subjectName: string, semester: string, schoolYear: string, teacherName: string) => {
    const newId = `class_${Date.now()}`;
    const defaultMeta: ClassMetadata = {
      id: newId,
      className,
      subjectName,
      course: '18',
      semester,
      schoolYear,
      occupation: 'CÔNG NGHỆ THÔNG TIN',
      level: 'TRUNG CẤP',
      entryRequirements: 'THCS / THPT',
      classSize: 30,
      formTeacher: 'Họ và tên giáo viên',
      teacherName: teacherName.trim() || 'Họ và tên giảng viên',
      monitorName: 'Học sinh lớp trưởng',
      deputiesName: 'Học sinh lớp phó',
      totalPeriods: 60
    };

    const newClassData: ClassData = {
      metadata: defaultMeta,
      students: [],
      grades: [],
      sessions: [
        { id: `sess_${Date.now()}_1`, date: new Date().toISOString().split('T')[0], periods: 5 }
      ],
      attendance: []
    };

    const updatedClasses = {
      ...db.classes,
      [newId]: newClassData
    };

    updateDb({
      classes: updatedClasses,
      activeClassId: newId
    });
  };

  // 3. Delete Class
  const handleDeleteClass = (classId: string) => {
    if (db.classes[classId]?.metadata?.isLocked) {
      alert("Lớp học này đã Bị Khóa số liệu. Hãy mở khóa lớp đó trước khi xóa!");
      return;
    }
    const updatedClasses = { ...db.classes };
    delete updatedClasses[classId];

    // Fallback to avoid empty states
    const remainingIds = Object.keys(updatedClasses);
    let newActiveId = remainingIds[0];

    // If we've deleted all classes, recreate the seeded one
    if (remainingIds.length === 0) {
      const resetDb = getInitialDatabase();
      updateDb(resetDb);
      return;
    }

    updateDb({
      classes: updatedClasses,
      activeClassId: newActiveId
    });
  };

  // 4. Restore database defaults
  const handleRestoreDefaults = () => {
    const reset = getInitialDatabase();
    updateDb(reset);
    setActiveTab('cover');
  };

  // 5. Overwrite the DB on JSON Import
  const handleImportDatabase = (imported: AppDatabase) => {
    updateDb(imported);
    setActiveTab('cover');
  };

  // 6. Update Metadata inside the Cover tab
  const handleUpdateMetadata = (updatedMeta: ClassMetadata) => {
    if (activeClass.metadata.isLocked) {
      alert("Lớp học này đã Bị Khóa số liệu. Hãy click vào biểu tượng Ổ khóa ở Danh sách lớp để mở khóa trước!");
      return;
    }
    const updatedClass = {
      ...activeClass,
      metadata: updatedMeta
    };
    updateDb({
      ...db,
      classes: {
        ...db.classes,
        [activeClassId]: updatedClass
      }
    });
  };

  // Toggle lock state of a class
  const handleToggleClassLock = (classId: string) => {
    const clsNode = db.classes[classId];
    if (!clsNode) return;
    const updatedClass = {
      ...clsNode,
      metadata: {
        ...clsNode.metadata,
        isLocked: !clsNode.metadata.isLocked
      }
    };
    updateDb({
      ...db,
      classes: {
        ...db.classes,
        [classId]: updatedClass
      }
    });
  };

  // 7. Update Student Grades on Table Double Click
  const handleUpdateGrade = (studentId: string, updatedFields: Partial<Grade>) => {
    if (activeClass.metadata.isLocked) {
      alert("Lớp học này đã Bị Khóa số liệu. Hãy click vào biểu tượng Ổ khóa ở Danh sách lớp để mở khóa trước!");
      return;
    }
    const updatedGrades = activeClass.grades.map((g) => {
      if (g.studentId === studentId) {
        return {
          ...g,
          ...updatedFields
        };
      }
      return g;
    });

    const updatedClass = {
      ...activeClass,
      grades: updatedGrades
    };

    updateDb({
      ...db,
      classes: {
        ...db.classes,
        [activeClassId]: updatedClass
      }
    });
  };

  // 8. Add Student Profile
  const handleAddStudent = (
    studentCode: string, 
    lastName: string, 
    firstName: string,
    schoolName?: string,
    phoneNumber?: string,
    birthDate?: string,
    bcs?: string
  ) => {
    if (activeClass.metadata.isLocked) {
      alert("Lớp học này đã Bị Khóa số liệu. Hãy click vào biểu tượng Ổ khóa ở Danh sách lớp để mở khóa trước!");
      return;
    }
    const newStudentId = `std_${Date.now()}`;
    const newStudent: Student = {
      id: newStudentId,
      studentCode,
      lastName,
      firstName,
      schoolName: schoolName?.trim(),
      phoneNumber: phoneNumber?.trim(),
      birthDate: birthDate?.trim(),
      bcs: bcs?.trim()
    };

    // Create companion grade row for the student
    const newGradeRow: Grade = {
      studentId: newStudentId,
      l1: null,
      l2: null,
      l3: null,
      gv1: null,
      gv2: null,
      lan2: null,
      note: ''
    };

    const updatedClass: ClassData = {
      ...activeClass,
      students: [...activeClass.students, newStudent],
      grades: [...activeClass.grades, newGradeRow]
    };

    updateDb({
      ...db,
      classes: {
        ...db.classes,
        [activeClassId]: updatedClass
      }
    });
  };

  // 8b. Add Bulk Students (Pasted CSV, text spacing list)
  const handleAddBulkStudents = (
    bulkList: { 
      studentCode: string; 
      lastName: string; 
      firstName: string;
      schoolName?: string;
      phoneNumber?: string;
      birthDate?: string;
      bcs?: string;
    }[]
  ) => {
    if (!db) return;
    if (activeClass.metadata.isLocked) {
      alert("Lớp học này đã Bị Khóa số liệu. Hãy click vào biểu tượng Ổ khóa ở Danh sách lớp để mở khóa trước!");
      return;
    }
    const newStudents: Student[] = [];
    const newGrades: Grade[] = [];

    bulkList.forEach((input, index) => {
      const exists = activeClass.students.some(s => s.studentCode === input.studentCode) ||
                     newStudents.some(s => s.studentCode === input.studentCode);
      if (exists) return;

      const newStudentId = `std_${Date.now()}_${index}`;
      newStudents.push({
        id: newStudentId,
        studentCode: input.studentCode,
        lastName: input.lastName,
        firstName: input.firstName,
        schoolName: input.schoolName?.trim() || '',
        phoneNumber: input.phoneNumber?.trim() || '',
        birthDate: input.birthDate?.trim() || '',
        bcs: input.bcs?.trim() || ''
      });

      newGrades.push({
        studentId: newStudentId,
        l1: null,
        l2: null,
        l3: null,
        gv1: null,
        gv2: null,
        lan2: null,
        note: ''
      });
    });

    if (newStudents.length === 0) return;

    const updatedClass: ClassData = {
      ...activeClass,
      students: [...activeClass.students, ...newStudents],
      grades: [...activeClass.grades, ...newGrades]
    };

    updateDb({
      ...db,
      classes: {
        ...db.classes,
        [activeClassId]: updatedClass
      }
    });
  };

  // 9. Delete Student and associated records
  const handleDeleteStudent = (studentId: string) => {
    if (activeClass.metadata.isLocked) {
      alert("Lớp học này đã Bị Khóa số liệu. Hãy click vào biểu tượng Ổ khóa ở Danh sách lớp để mở khóa trước!");
      return;
    }
    const updatedStudents = activeClass.students.filter(s => s.id !== studentId);
    const updatedGrades = activeClass.grades.filter(g => g.studentId !== studentId);
    const updatedAttendance = activeClass.attendance.filter(a => a.studentId !== studentId);

    const updatedClass: ClassData = {
      ...activeClass,
      students: updatedStudents,
      grades: updatedGrades,
      attendance: updatedAttendance
    };

    updateDb({
      ...db,
      classes: {
        ...db.classes,
        [activeClassId]: updatedClass
      }
    });
  };

  // 9b. Update Student details (Code, Name, School, Phone, Birthday)
  const handleUpdateStudent = (
    studentId: string, 
    studentCode: string, 
    lastName: string, 
    firstName: string,
    schoolName?: string,
    phoneNumber?: string,
    birthDate?: string,
    bcs?: string
  ) => {
    if (!db) return;
    if (activeClass.metadata.isLocked) {
      alert("Lớp học này đã Bị Khóa số liệu. Hãy click vào biểu tượng Ổ khóa ở Danh sách lớp để mở khóa trước!");
      return;
    }
    const updatedStudents = activeClass.students.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          studentCode: studentCode.trim().toUpperCase(),
          lastName: lastName.trim(),
          firstName: firstName.trim(),
          schoolName: schoolName?.trim(),
          phoneNumber: phoneNumber?.trim(),
          birthDate: birthDate?.trim(),
          bcs: bcs?.trim()
        };
      }
      return s;
    });

    const updatedClass: ClassData = {
      ...activeClass,
      students: updatedStudents
    };

    updateDb({
      ...db,
      classes: {
        ...db.classes,
        [activeClassId]: updatedClass
      }
    });
  };

  // 9c. Add Teacher Profile
  const handleAddTeacher = (
    teacherCode: string, 
    lastName: string, 
    firstName: string,
    phoneNumber?: string,
    email?: string,
    specialty?: string,
    department?: string,
    password?: string,
    role?: 'admin' | 'teacher'
  ) => {
    if (activeClass.metadata.isLocked) {
      alert("Lớp học này đã Bị Khóa số liệu. Hãy click vào biểu tượng Ổ khóa ở Danh sách lớp để mở khóa trước!");
      return;
    }
    const newTeacherId = `tch_${Date.now()}`;
    const newTeacher: Teacher = {
      id: newTeacherId,
      teacherCode: teacherCode.trim().toUpperCase(),
      lastName: lastName.trim(),
      firstName: firstName.trim(),
      phoneNumber: phoneNumber?.trim(),
      email: email?.trim(),
      specialty: specialty?.trim(),
      department: department?.trim(),
      password: password?.trim() || '123456', // Mặc định 123456
      role: role || 'teacher'
    };

    const updatedClass: ClassData = {
      ...activeClass,
      teachers: [...(activeClass.teachers || []), newTeacher]
    };

    updateDb({
      ...db,
      classes: {
        ...db.classes,
        [activeClassId]: updatedClass
      }
    });
  };

  // 9d. Add Bulk Teachers
  const handleAddBulkTeachers = (
    bulkList: { 
      teacherCode: string; 
      lastName: string; 
      firstName: string;
      phoneNumber?: string;
      email?: string;
      specialty?: string;
      department?: string;
    }[]
  ) => {
    if (!db) return;
    if (activeClass.metadata.isLocked) {
      alert("Lớp học này đã Bị Khóa số liệu. Hãy click vào biểu tượng Ổ khóa ở Danh sách lớp để mở khóa trước!");
      return;
    }
    const currentTeachers = activeClass.teachers || [];
    const newTeachers: any[] = [];

    bulkList.forEach((input, index) => {
      const exists = currentTeachers.some(t => t.teacherCode === input.teacherCode) ||
                     newTeachers.some(t => t.teacherCode === input.teacherCode);
      if (exists) return;

      const newTeacherId = `tch_${Date.now()}_${index}`;
      newTeachers.push({
        id: newTeacherId,
        teacherCode: input.teacherCode.trim().toUpperCase(),
        lastName: input.lastName.trim(),
        firstName: input.firstName.trim(),
        phoneNumber: input.phoneNumber?.trim() || '',
        email: input.email?.trim() || '',
        specialty: input.specialty?.trim() || '',
        department: input.department?.trim() || ''
      });
    });

    if (newTeachers.length === 0) return;

    const updatedClass: ClassData = {
      ...activeClass,
      teachers: [...currentTeachers, ...newTeachers]
    };

    updateDb({
      ...db,
      classes: {
        ...db.classes,
        [activeClassId]: updatedClass
      }
    });
  };

  // 9e. Delete Teacher
  const handleDeleteTeacher = (teacherId: string) => {
    if (activeClass.metadata.isLocked) {
      alert("Lớp học này đã Bị Khóa số liệu. Hãy click vào biểu tượng Ổ khóa ở Danh sách lớp để mở khóa trước!");
      return;
    }
    const currentTeachers = activeClass.teachers || [];
    const updatedTeachers = currentTeachers.filter(t => t.id !== teacherId);

    const updatedClass: ClassData = {
      ...activeClass,
      teachers: updatedTeachers
    };

    updateDb({
      ...db,
      classes: {
        ...db.classes,
        [activeClassId]: updatedClass
      }
    });
  };

  // 9f. Update Teacher details
  const handleUpdateTeacher = (
    teacherId: string, 
    teacherCode: string, 
    lastName: string, 
    firstName: string,
    phoneNumber?: string,
    email?: string,
    specialty?: string,
    department?: string,
    password?: string,
    role?: 'admin' | 'teacher'
  ) => {
    if (!db) return;
    if (activeClass.metadata.isLocked) {
      alert("Lớp học này đã Bị Khóa số liệu. Hãy click vào biểu tượng Ổ khóa ở Danh sách lớp để mở khóa trước!");
      return;
    }
    const currentTeachers = activeClass.teachers || [];
    const updatedTeachers = currentTeachers.map(t => {
      if (t.id === teacherId) {
        return {
          ...t,
          teacherCode: teacherCode.trim().toUpperCase(),
          lastName: lastName.trim(),
          firstName: firstName.trim(),
          phoneNumber: phoneNumber?.trim(),
          email: email?.trim(),
          specialty: specialty?.trim(),
          department: department?.trim(),
          password: password?.trim() || t.password,
          role: role || t.role || 'teacher'
        };
      }
      return t;
    });

    const updatedClass: ClassData = {
      ...activeClass,
      teachers: updatedTeachers
    };

    updateDb({
      ...db,
      classes: {
        ...db.classes,
        [activeClassId]: updatedClass
      }
    });
  };

  // 10. Attendance marking updates
  const handleUpdateAttendance = (
    studentId: string,
    sessionId: string,
    status: AttendanceRecord['status'],
    unexcusedPeriods: number
  ) => {
    if (activeClass.metadata.isLocked) {
      alert("Lớp học này đã Bị Khóa số liệu. Hãy click vào biểu tượng Ổ khóa ở Danh sách lớp để mở khóa trước!");
      return;
    }
    // Filter out old record for this same cell if any
    const restRecords = activeClass.attendance.filter(
      r => !(r.studentId === studentId && r.sessionId === sessionId)
    );

    // If it's not marked present (which is default '●' empty representation), add the new record
    const updatedAttendance = [...restRecords];
    if (status !== 'present') {
      updatedAttendance.push({
        studentId,
        sessionId,
        status,
        unexcusedPeriods
      });
    }

    const updatedClass = {
      ...activeClass,
      attendance: updatedAttendance
    };

    updateDbDebounced({
      ...db,
      classes: {
        ...db.classes,
        [activeClassId]: updatedClass
      }
    });
  };

  // 11. Add a new attendance session / calendar date column
  const handleAddSession = (date: string, periods: number) => {
    if (activeClass.metadata.isLocked) {
      alert("Lớp học này đã Bị Khóa số liệu. Hãy click vào biểu tượng Ổ khóa ở Danh sách lớp để mở khóa trước!");
      return;
    }
    const newSessionId = `sess_${Date.now()}`;
    const newSession: AttendanceSession = {
      id: newSessionId,
      date,
      periods
    };

    const updatedSessions = [...activeClass.sessions, newSession];
    const newTotalPeriods = updatedSessions.reduce((acc, s) => acc + s.periods, 0);

    const updatedClass = {
      ...activeClass,
      metadata: {
        ...activeClass.metadata,
        totalPeriods: newTotalPeriods
      },
      sessions: updatedSessions
    };

    updateDb({
      ...db,
      classes: {
        ...db.classes,
        [activeClassId]: updatedClass
      }
    });
  };

  // 12. Delete an entire attendance session dynamic column
  const handleDeleteSession = (sessionId: string) => {
    if (activeClass.metadata.isLocked) {
      alert("Lớp học này đã Bị Khóa số liệu. Hãy click vào biểu tượng Ổ khóa ở Danh sách lớp để mở khóa trước!");
      return;
    }
    const updatedSessions = activeClass.sessions.filter(s => s.id !== sessionId);
    const updatedAttendance = activeClass.attendance.filter(a => a.sessionId !== sessionId);
    const newTotalPeriods = updatedSessions.reduce((acc, s) => acc + s.periods, 0);

    const updatedClass = {
      ...activeClass,
      metadata: {
        ...activeClass.metadata,
        totalPeriods: newTotalPeriods
      },
      sessions: updatedSessions,
      attendance: updatedAttendance
    };

    updateDb({
      ...db,
      classes: {
        ...db.classes,
        [activeClassId]: updatedClass
      }
    });
  };

  // 13. Clear all custom attendance records for a session (sets all to present)
  const handleClearSessionAttendance = (sessionId: string) => {
    if (activeClass.metadata.isLocked) {
      alert("Lớp học này đã Bị Khóa số liệu. Hãy click vào biểu tượng Ổ khóa ở Danh sách lớp để mở khóa trước!");
      return;
    }
    const updatedAttendance = activeClass.attendance.filter(a => a.sessionId !== sessionId);
    const updatedClass = {
      ...activeClass,
      attendance: updatedAttendance
    };

    updateDb({
      ...db,
      classes: {
        ...db.classes,
        [activeClassId]: updatedClass
      }
    });
  };

  // 14. Update session data (e.g., teaching contents)
  const handleUpdateSession = (
    sessionId: string,
    updatedFields: Partial<Omit<AttendanceSession, 'id'>>
  ) => {
    if (activeClass.metadata.isLocked) {
      alert("Lớp học này đã Bị Khóa số liệu. Hãy click vào biểu tượng Ổ khóa ở Danh sách lớp để mở khóa trước!");
      return;
    }
    const updatedSessions = activeClass.sessions.map((sess) => {
      if (sess.id === sessionId) {
        return {
          ...sess,
          ...updatedFields
        };
      }
      return sess;
    });

    const newTotalPeriods = updatedSessions.reduce((acc, s) => acc + s.periods, 0);

    const updatedClass = {
      ...activeClass,
      metadata: {
        ...activeClass.metadata,
        totalPeriods: newTotalPeriods
      },
      sessions: updatedSessions
    };

    updateDb({
      ...db,
      classes: {
        ...db.classes,
        [activeClassId]: updatedClass
      }
    });
  };

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} error={loginError} />;
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden print:h-auto print:overflow-visible print:bg-white relative">
      
      {/* Dark Backdrop Overlay on Mobile when Sidebar is open */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-35 lg:hidden transition-all duration-300 ease-in-out cursor-pointer"
          title="Ấn để đóng thanh menu"
        />
      )}

      {/* Dynamic Slide-in Sidebar on mobile or static on desktop */}
      <div 
        id="app-sidebar-container"
        className={`fixed inset-y-0 left-0 z-40 transform lg:relative transition-all duration-300 ease-in-out overflow-hidden print:hidden ${
          sidebarOpen 
            ? 'translate-x-0 w-80 opacity-100' 
            : '-translate-x-full w-80 lg:translate-x-0 lg:w-0 lg:opacity-0 lg:pointer-events-none'
        }`}
      >
        <Sidebar
          db={db}
          activeTab={activeTab}
          onActiveTabChange={(tab) => {
            setActiveTab(tab);
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              setSidebarOpen(false);
            }
          }}
          onClassChange={handleClassChange}
          onAddClass={handleAddClass}
          onDeleteClass={handleDeleteClass}
          onRestoreDefaults={handleRestoreDefaults}
          onImportDatabase={handleImportDatabase}
          onToggleClassLock={handleToggleClassLock}
          onClose={() => setSidebarOpen(false)}
          sqliteInfo={sqliteInfo}
          onExportSQLite={() => { import('./utils/sqlite').then(m => m.sqliteExportFile()); }}
          currentUser={currentUser}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden print:h-auto print:overflow-visible print:bg-white">
        
        {/* Main Application Header Tab Switcher */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3.5 md:py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 print:hidden shadow-xs">
          <div className="flex items-center gap-3 shrink-0 min-w-0">
            <button
              id="btn-toggle-sidebar"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer flex items-center justify-center shrink-0"
              title={sidebarOpen ? "Ẩn thanh menu" : "Hiện thanh menu"}
            >
              {sidebarOpen ? <X className="w-5.5 h-5.5 lg:hidden" /> : <Menu className="w-5.5 h-5.5" />}
              {sidebarOpen && <Menu className="w-5.5 h-5.5 hidden lg:block" />}
            </button>

            <div className="flex flex-col gap-1 justify-center min-w-0">
              <div className="flex items-center gap-2 flex-nowrap whitespace-nowrap overflow-hidden">
                <span className="text-xs md:text-sm font-black text-slate-900 tracking-tight uppercase shrink-0">Lớp:</span>
                <span className="inline-flex items-center bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg text-indigo-750 font-mono font-bold text-xs md:text-sm tracking-wide shadow-xs shrink-0">
                  {activeClass.metadata.className}
                </span>
                <span className="inline-flex items-center bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-lg font-mono font-bold text-xs md:text-sm tracking-wide shadow-xs shrink-0">
                  {activeClass.metadata.schoolYear}
                </span>
                {activeClass.metadata.isLocked && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-red-50 border border-red-200 text-red-600 px-2 py-1 rounded-lg font-bold tracking-wider font-sans uppercase animate-pulse shrink-0">
                    <Lock className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>ĐANG KHÓA SỐ LIỆU</span>
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs md:text-sm truncate whitespace-nowrap pl-0.5">
                Môn học: <strong className="text-indigo-900 font-semibold">{activeClass.metadata.subjectName}</strong>
              </p>
            </div>
          </div>

          {/* Electronic Spreadsheet Tabs */}
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl min-w-0 max-w-full lg:justify-end lg:ml-auto">
            {/* Sheet Tab 0.5: Dashboard */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-indigo-500' : 'text-violet-400'}`} />
              <span>Tổng quan</span>
            </button>

            {/* Sheet Tab 1 */}
            <button
              onClick={() => setActiveTab('cover')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'cover'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BookOpen className={`w-4 h-4 ${activeTab === 'cover' ? 'text-indigo-500' : 'text-sky-500'}`} />
              <span>Thông tin lớp học</span>
            </button>

            {/* Sheet Tab 2 */}
            <button
              onClick={() => setActiveTab('grades')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'grades'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <GraduationCap className={`w-4 h-4 ${activeTab === 'grades' ? 'text-indigo-500' : 'text-emerald-500'}`} />
              <span>Kết quả học tập</span>
            </button>

            {/* Sheet Tab 2.5: Bảng điểm trên lớp */}
            <button
               onClick={() => setActiveTab('results_book')}
               className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                 activeTab === 'results_book'
                   ? 'bg-white text-indigo-700 shadow-sm'
                   : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
               }`}
             >
               <FileSpreadsheet className={`w-4 h-4 ${activeTab === 'results_book' ? 'text-indigo-500' : 'text-teal-500'}`} />
               <span>Bảng ghi điểm</span>
             </button>

            {/* Sheet Tab 3 */}
            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'attendance'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ClipboardCheck className={`w-4 h-4 ${activeTab === 'attendance' ? 'text-indigo-500' : 'text-orange-500'}`} />
              <span>Điểm danh</span>
            </button>

            {/* Sheet Tab 4: Nội dung giảng dạy */}
            <button
              onClick={() => setActiveTab('teaching_content')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'teaching_content'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <CalendarRange className={`w-4 h-4 ${activeTab === 'teaching_content' ? 'text-indigo-500' : 'text-pink-500'}`} />
              <span>Nội dung giảng dạy</span>
            </button>

            {/* Sheet Tab 5: Danh sách thi */}
            <button
              onClick={() => setActiveTab('exam_list')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'exam_list'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Printer className={`w-4 h-4 ${activeTab === 'exam_list' ? 'text-indigo-500' : 'text-rose-500'}`} />
              <span>Danh sách thi</span>
            </button>
          </div>
         </header>

        {/* Scrollable Tab Panel Container */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 print:overflow-visible print:bg-white print:h-auto">
          {activeTab === 'cover' && (
          <TabCover
              metadata={activeClass.metadata}
              studentCount={activeClass.students.length}
              students={activeClass.students}
              teachers={activeClass.teachers || []}
              onUpdateMetadata={handleUpdateMetadata}
              isLocked={activeClass.metadata.isLocked === true}
            />
          )}

          {activeTab === 'dashboard' && (
            <TabDashboard
              db={db}
            />
          )}

          {activeTab === 'grades' && (
            <TabResults
              students={activeClass.students}
              grades={activeClass.grades}
              classMetadata={activeClass.metadata}
              onUpdateGrade={handleUpdateGrade}
            />
          )}

          {activeTab === 'results_book' && (
            <TabResultsBook
              students={activeClass.students}
              grades={activeClass.grades}
              classMetadata={activeClass.metadata}
            />
          )}

          {activeTab === 'attendance' && (
            <TabAttendance
              students={activeClass.students}
              sessions={activeClass.sessions}
              attendance={activeClass.attendance}
              classMetadata={activeClass.metadata}
              onUpdateAttendance={handleUpdateAttendance}
              onAddSession={handleAddSession}
              onDeleteSession={handleDeleteSession}
              onClearSessionAttendance={handleClearSessionAttendance}
              onAddStudent={handleAddStudent}
              onAddBulkStudents={handleAddBulkStudents}
              onDeleteStudent={handleDeleteStudent}
              allStudents={allSystemStudents}
              saveStatus={attendanceSaveStatus}
            />
          )}

          {activeTab === 'teaching_content' && (
            <TabTeachingContent
              students={activeClass.students}
              sessions={activeClass.sessions}
              attendance={activeClass.attendance}
              classMetadata={activeClass.metadata}
              onUpdateSession={handleUpdateSession}
              onAddSession={handleAddSession}
              onDeleteSession={handleDeleteSession}
            />
          )}

          {activeTab === 'exam_list' && (
            <TabExamList
              students={activeClass.students}
              grades={activeClass.grades}
              sessions={activeClass.sessions}
              attendance={activeClass.attendance}
              classMetadata={activeClass.metadata}
              onUpdateGrade={handleUpdateGrade}
            />
          )}

          {activeTab === 'management' && (
            <TabManagement
              students={activeClass.students}
              grades={activeClass.grades}
              teachers={activeClass.teachers || []}
              classMetadata={activeClass.metadata}
              onUpdateMetadata={handleUpdateMetadata}
              onAddStudent={handleAddStudent}
              onAddBulkStudents={handleAddBulkStudents}
              onDeleteStudent={handleDeleteStudent}
              onUpdateStudent={handleUpdateStudent}
              onAddTeacher={handleAddTeacher}
              onAddBulkTeachers={handleAddBulkTeachers}
              onDeleteTeacher={handleDeleteTeacher}
              onUpdateTeacher={handleUpdateTeacher}
            />
          )}
        </div>
      </div>

      {/* Smart Print Warning Modal for Applet iFrame running in sandbox */}
      {showPrintWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-indigo-50 px-6 py-5 border-b border-indigo-100 flex items-start gap-4">
              <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Thông báo hỗ trợ In ấn</h3>
                <p className="text-xs text-indigo-650 font-medium mt-0.5">Yêu cầu chạy độc lập để đạt chất lượng A4/A3 tốt nhất</p>
              </div>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Lưu ý Trình duyệt:</strong> Bạn đang thao tác trong chế độ xem thử (iframe) của AI Studio. Theo chính sách bảo mật, trình duyệt có thể chặn chức năng <code>window.print()</code> của khung phát triển độc lập này.
                </div>
              </div>
              
              <p className="text-xs text-slate-600 leading-relaxed">
                Để in toàn bộ sổ sách, danh sách và biểu điểm một cách hoàn hảo, sắc nét, tự động dàn trang A4/A3, vui lòng click nút bên dưới để mở ứng dụng trong một <strong>Tab mới riêng biệt</strong>:
              </p>
              
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowPrintWarning(false)}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-transparent"
              >
                <ExternalLink className="w-4.5 h-4.5" />
                <span>Mở trong Tab mới để In</span>
              </a>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setShowPrintWarning(false)}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-500 font-semibold rounded-lg cursor-pointer transition border border-slate-200"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  setShowPrintWarning(false);
                  setTimeout(() => {
                    if (originalPrintRef.current) {
                      originalPrintRef.current();
                    }
                  }, 150);
                }}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg cursor-pointer transition border border-transparent"
              >
                Tiếp tục In tại đây
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
