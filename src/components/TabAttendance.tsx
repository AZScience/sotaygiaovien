/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Student, AttendanceSession, AttendanceRecord, ClassMetadata } from '../types';
import { calculateAttendanceStats } from '../utils/database';
import { 
  Plus, Trash2, Calendar, UserX, AlertCircle, HelpCircle, Check, ShieldAlert, 
  UserCheck, Search, UserPlus, Phone, Cake, CheckSquare, Square, School, 
  GraduationCap, Sparkles, Printer, FileSpreadsheet, Loader2, QrCode, 
  Camera, Laptop, Smartphone, RefreshCw, X, CheckCircle2, Award,
  Play, Pause, ExternalLink, Volume2, Zap
} from 'lucide-react';

interface TabAttendanceProps {
  students: Student[];
  sessions: AttendanceSession[];
  attendance: AttendanceRecord[];
  classMetadata: ClassMetadata;
  onUpdateAttendance: (studentId: string, sessionId: string, status: AttendanceRecord['status'], unexcusedPeriods: number) => void;
  onAddSession: (date: string, periods: number) => void;
  onDeleteSession: (sessionId: string) => void;
  onClearSessionAttendance: (sessionId: string) => void;
  onAddStudent: (
    studentCode: string,
    lastName: string,
    firstName: string,
    schoolName?: string,
    phoneNumber?: string,
    birthDate?: string,
    bcs?: string
  ) => void;
  onAddBulkStudents?: (
    bulkList: { 
      studentCode: string; 
      lastName: string; 
      firstName: string;
      schoolName?: string;
      phoneNumber?: string;
      birthDate?: string;
      bcs?: string;
    }[]
  ) => void;
  onDeleteStudent: (studentId: string) => void;
  allStudents: Student[];
  saveStatus?: 'saved' | 'saving';
}

export default function TabAttendance({
  students,
  sessions,
  attendance,
  classMetadata,
  onUpdateAttendance,
  onAddSession,
  onDeleteSession,
  onClearSessionAttendance,
  onAddStudent,
  onAddBulkStudents,
  onDeleteStudent,
  allStudents = [],
  saveStatus = 'saved'
}: TabAttendanceProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddSessionForm, setShowAddSessionForm] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSessionPeriods, setNewSessionPeriods] = useState(5);

  // Student import states
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [importSearchTerm, setImportSearchTerm] = useState('');
  const [selectedStudentCodes, setSelectedStudentCodes] = useState<string[]>([]);

  // Active cell popup for fast attendance marking
  const [activeMenu, setActiveMenu] = useState<{ studentId: string; sessionId: string } | null>(null);

  // Custom state-based confirmation dialogs to circumvent sandboxed window.confirm blocks
  const [sessionToDelete, setSessionToDelete] = useState<AttendanceSession | null>(null);
  const [sessionToClear, setSessionToClear] = useState<AttendanceSession | null>(null);

  // QR Code attendance system states
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrSelectedSessionId, setQrSelectedSessionId] = useState<string>('');
  const [selectedSimStudentId, setSelectedSimStudentId] = useState<string>('');
  const [isSimulatingScan, setIsSimulatingScan] = useState(false);
  const [simScanSuccess, setSimScanSuccess] = useState<string | null>(null);
  const [recentQrActivity, setRecentQrActivity] = useState<{ 
    name: string; 
    code: string; 
    time: string; 
    status: string;
    device?: string;
    distance?: string;
    warning?: boolean;
    fingerprint?: string;
  }[]>([]);
  const [teacherManualCode, setTeacherManualCode] = useState<string>('');

  // Anti-cheat configurations
  const [gpsRequired, setGpsRequired] = useState<boolean>(true);
  const [blockMultipleDevices, setBlockMultipleDevices] = useState<boolean>(true);
  const [teacherLat, setTeacherLat] = useState<number>(10.7629); // Default to Ton Duc Thang School
  const [teacherLng, setTeacherLng] = useState<number>(106.6823);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);

  // Rolling token states (10 seconds)
  const [qrToken, setQrToken] = useState<string>('');
  const [tokenTimeLeft, setTokenTimeLeft] = useState<number>(10);

  // Helper to generate a 6-digit rolling token (OTP) every 10 seconds
  const generateOTP = (sessionId: string, timeBlock: number): string => {
    const str = `${sessionId}_rolling_secret_${timeBlock}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash % 1000000).toString().padStart(6, '0');
  };

  // QR Code auto scan and physical sync system states
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const autoScanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Synthesize pleasant school scanner "Tít!" sound effect
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 950; // crisp high frequency beep (pitch of school scanner)
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn('Physical scanner beep suppressed by browser policies:', e);
    }
  };

  // 1. Listen for real-time QR scans from actual users scanning QR code in a separate tab/device
  useEffect(() => {
    if (!showQRModal) {
      setIsAutoScanning(false);
      return;
    }

    const channel = new BroadcastChannel('qr_attendance_sync');
    const handleSyncMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'attendance_scanned') {
        const { studentId, studentCode, fullName, sessionId, deviceFingerprint, deviceInfo, distanceText, bypassGps } = event.data;
        if (sessionId === qrSelectedSessionId) {
          // Play physical sound
          playBeep();

          // Append to Live stream logs on teacher screen
          const now = new Date();
          const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
          
          setRecentQrActivity(prev => {
            // Check if fingerprint is already used by another student in this list
            const hasDuplicateFingerprint = deviceFingerprint && prev.some(act => act.code !== studentCode && act.fingerprint === deviceFingerprint);
            const warning = !!(hasDuplicateFingerprint || bypassGps);
            
            return [
              { 
                name: fullName, 
                code: studentCode, 
                time: timeStr, 
                status: 'SUCCESS',
                device: deviceInfo || 'Thiết bị không rõ',
                distance: distanceText || '',
                warning: warning,
                fingerprint: deviceFingerprint
              },
              ...prev.slice(0, 4)
            ];
          });
        }
      }
    };
    channel.addEventListener('message', handleSyncMessage);

    return () => {
      channel.removeEventListener('message', handleSyncMessage);
      channel.close();
    };
  }, [showQRModal, qrSelectedSessionId]);

  // 2. Continuous simulator auto-scanning loop to automatically check-in absent students sequentially
  useEffect(() => {
    if (!isAutoScanning || !showQRModal || !qrSelectedSessionId) {
      if (autoScanIntervalRef.current) {
        clearInterval(autoScanIntervalRef.current);
        autoScanIntervalRef.current = null;
      }
      return;
    }

    autoScanIntervalRef.current = setInterval(() => {
      // Find all students currently absent in the selected session
      const targetSessionStudents = students.map(std => {
        const rec = attendance.find(r => r.studentId === std.id && r.sessionId === qrSelectedSessionId);
        const isPresent = rec?.status === 'present';
        return { std, isPresent };
      });

      const absentStudents = targetSessionStudents.filter(s => !s.isPresent);

      if (absentStudents.length === 0) {
        setIsAutoScanning(false);
        return;
      }

      // Pick a random absent student
      const randomIndex = Math.floor(Math.random() * absentStudents.length);
      const chosenStudent = absentStudents[randomIndex].std;

      // Simulate QR reader sweep laser
      setIsSimulatingScan(true);
      setSimScanSuccess(null);
      setSelectedSimStudentId(chosenStudent.id);

      setTimeout(() => {
        // Record present in state
        onUpdateAttendance(chosenStudent.id, qrSelectedSessionId, 'present', 0);

        // Sound effect beep!
        playBeep();

        // Save to teacher's live UI list logs
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        
        // Randomly simulate fingerprint sharing in auto scanning to demonstrate the anti-cheat warning UI
        const isDuplicateSim = Math.random() > 0.8;
        const simFingerprint = isDuplicateSim ? 'simulated_shared_fingerprint' : `simulated_fingerprint_${chosenStudent.id}`;

        setRecentQrActivity(prev => {
          const hasDuplicateFingerprint = prev.some(act => act.code !== chosenStudent.studentCode && act.fingerprint === simFingerprint);
          
          return [
            { 
              name: `${chosenStudent.lastName} ${chosenStudent.firstName}`, 
              code: chosenStudent.studentCode, 
              time: timeStr, 
              status: 'SUCCESS',
              device: 'Simulated Phone',
              distance: '1.5 m',
              warning: hasDuplicateFingerprint,
              fingerprint: simFingerprint
            },
            ...prev.slice(0, 4)
          ];
        });

        setSimScanSuccess(`${chosenStudent.lastName} ${chosenStudent.firstName} điểm danh thành công!`);
        setIsSimulatingScan(false);

        // Broadcast check-in signal to all open tabs for multi-device simulation
        try {
          const syncChan = new BroadcastChannel('qr_attendance_sync');
          syncChan.postMessage({
            type: 'attendance_scanned',
            studentId: chosenStudent.id,
            studentCode: chosenStudent.studentCode,
            fullName: `${chosenStudent.lastName} ${chosenStudent.firstName}`,
            sessionId: qrSelectedSessionId,
            deviceFingerprint: simFingerprint,
            deviceInfo: 'Simulated Phone',
            distanceText: '1.5 m',
            bypassGps: false
          });
          syncChan.close();
        } catch (e) {
          console.warn(e);
        }

      }, 1000); // 1s scanning effect delay

    }, 2500); // 2.5s loop interval per student

    return () => {
      if (autoScanIntervalRef.current) {
        clearInterval(autoScanIntervalRef.current);
        autoScanIntervalRef.current = null;
      }
    };
  }, [isAutoScanning, showQRModal, qrSelectedSessionId, students, attendance]);

  // 3. Retrieve teacher's geolocation when GPS option is enabled or modal is shown
  useEffect(() => {
    if (showQRModal && gpsRequired) {
      setGpsLoading(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setTeacherLat(position.coords.latitude);
            setTeacherLng(position.coords.longitude);
            setGpsLoading(false);
          },
          (error) => {
            console.warn("Lỗi lấy GPS trình duyệt:", error.message);
            setGpsLoading(false);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        setGpsLoading(false);
      }
    }
  }, [showQRModal, gpsRequired]);

  // 4. Rolling token timer effect (updates every 10 seconds)
  useEffect(() => {
    if (!showQRModal || !qrSelectedSessionId) return;

    // Generate initial token
    const initialTimeBlock = Math.floor(Date.now() / 10000);
    setQrToken(generateOTP(qrSelectedSessionId, initialTimeBlock));
    setTokenTimeLeft(10 - (Math.floor(Date.now() / 1000) % 10));

    const interval = setInterval(() => {
      const currentTime = Date.now();
      const currentBlock = Math.floor(currentTime / 10000);
      const secondsInBlock = Math.floor(currentTime / 1000) % 10;
      
      setQrToken(generateOTP(qrSelectedSessionId, currentBlock));
      setTokenTimeLeft(10 - secondsInBlock);
    }, 1000);

    return () => clearInterval(interval);
  }, [showQRModal, qrSelectedSessionId]);

  // Filter master students list for import modal
  const filteredImportStudents = allStudents.filter(s => {
    const fullName = `${s.lastName} ${s.firstName}`.toLowerCase();
    const searchLower = importSearchTerm.toLowerCase();
    return s.studentCode.toLowerCase().includes(searchLower) || fullName.includes(searchLower);
  });

  // Filter students based on search term (ID, firstName or lastName)
  const filteredStudents = students.filter(s => {
    const fullName = `${s.lastName} ${s.firstName}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    return s.studentCode.toLowerCase().includes(searchLower) || fullName.includes(searchLower);
  });

  const numDateColumns = Math.max(12, sessions.length);

  const handleAddSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionDate) return;
    onAddSession(newSessionDate, newSessionPeriods);
    setShowAddSessionForm(false);
  };

  const selectAttendanceOption = (
    studentId: string,
    sessionId: string,
    status: AttendanceRecord['status'],
    unexcusedPeriods: number
  ) => {
    onUpdateAttendance(studentId, sessionId, status, unexcusedPeriods);
    setActiveMenu(null);
  };

  // Export to Excel / CSV function
  const exportToExcel = () => {
    // Generate dates header cells for Row 8 and Row 9
    const sessionHeaders8: string[] = [];
    const sessionHeaders9: string[] = [];
    
    sessions.forEach((s) => {
      const dateParts = s.date.split('-');
      const formattedDate = dateParts.length >= 3 ? `${dateParts[2]}/${dateParts[1]}` : s.date;
      sessionHeaders8.push("");
      sessionHeaders9.push(`${formattedDate} (${s.periods}t)`);
    });

    const list: any[][] = [
      ["SỞ LAO ĐỘNG - THƯƠNG BINH VÀ XÃ HỘI TP. HỒ CHÍ MINH"],
      [classMetadata.managingSchool || classMetadata.schoolName || "TRƯỜNG TC KTNV TÔN ĐỨC THẮNG"],
      ["KHOA: " + (classMetadata.occupation || "CÔNG NGHỆ THÔNG TIN").toUpperCase()],
      [],
      ["BẢNG KỶ LUẬT CHUYÊN CẦN VÀ THEO DÕI ĐIỂM DANH"],
      ["MÔN HỌC/MÔ-ĐUN: " + classMetadata.subjectName.toUpperCase(), "", "", "", "LỚP: " + classMetadata.className.toUpperCase()],
      ["Năm học: " + classMetadata.schoolYear, "", "", "", "Tổng số tiết học phần: " + classMetadata.totalPeriods],
      [],
      [
        "TT",
        "HỌ VÀ TÊN SINH VIÊN",
        "",
        "CÁC BUỔI THEO DÕI ĐIỂM DANH (Cột ngày & số tiết dạy)",
        ...sessionHeaders8.slice(1),
        "Tổng vắng",
        "Tỉ lệ vắng",
        "Trạng thái kết luận"
      ],
      [
        "",
        "",
        "Họ và tên đệm",
        "Tên",
        ...sessionHeaders9,
        "(Số tiết không phép)",
        "%",
        "(Nếu > 20% sẽ bị cấm thi)"
      ]
    ];

    filteredStudents.forEach((std, idx) => {
      const rowCells: any[] = [
        idx + 1,
        std.lastName,
        std.firstName
      ];

      // Add individual session statuses
      sessions.forEach((s) => {
        const rec = attendance.find(r => r.studentId === std.id && r.sessionId === s.id);
        if (rec) {
          if (rec.status === 'excused') {
            rowCells.push("P");
          } else if (rec.status === 'unexcused') {
            rowCells.push(rec.unexcusedPeriods || 0);
          } else {
            rowCells.push("");
          }
        } else {
          rowCells.push("");
        }
      });

      // Calculate totals
      const unexcusedSum = sessions.reduce((sum, s) => {
        const rec = attendance.find(r => r.studentId === std.id && r.sessionId === s.id);
        if (rec && rec.status === 'unexcused') {
          return sum + (rec.unexcusedPeriods || 0);
        }
        return sum;
      }, 0);

      const missedPercentage = classMetadata.totalPeriods > 0 
        ? (unexcusedSum / classMetadata.totalPeriods) * 100 
        : 0;
      const roundedPercentage = Math.round(missedPercentage * 10) / 10;
      const isBanned = roundedPercentage > 20;

      rowCells.push(unexcusedSum || 0);
      rowCells.push(unexcusedSum > 0 ? `${roundedPercentage}%` : "0%");
      rowCells.push(isBanned ? "CẤM THI" : "ĐỦ ĐIỀU KIỆN THI");

      list.push(rowCells);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(list);

    // Merge titles and dual headers dynamic coordinates
    const numSessions = sessions.length;
    const totalCols = 3 + numSessions + 3;
    
    const merges = [
      // Title Row
      { s: { r: 4, c: 0 }, e: { r: 4, c: Math.max(8, totalCols - 1) } },
      
      // TT
      { s: { r: 8, c: 0 }, e: { r: 9, c: 0 } },
      // HỌ VÀ TÊN
      { s: { r: 8, c: 1 }, e: { r: 8, c: 2 } },
      // CÁC BUỔI THEO DÕI ĐIỂM DANH
      { s: { r: 8, c: 3 }, e: { r: 8, c: Math.max(3, 3 + numSessions - 1) } },
      // Tổng vắng
      { s: { r: 8, c: 3 + numSessions }, e: { r: 9, c: 3 + numSessions } },
      // Tỉ lệ vắng
      { s: { r: 8, c: 3 + numSessions + 1 }, e: { r: 9, c: 3 + numSessions + 1 } },
      // Trạng thái kết luận
      { s: { r: 8, c: 3 + numSessions + 2 }, e: { r: 9, c: 3 + numSessions + 2 } }
    ];

    worksheet['!merges'] = merges;

    // Column widths
    const cols = [
      { wch: 6 },  // TT
      { wch: 22 }, // Họ đệm
      { wch: 10 }  // Tên
    ];
    for (let i = 0; i < numSessions; i++) {
      cols.push({ wch: 10 });
    }
    cols.push({ wch: 14 }); // Total absence
    cols.push({ wch: 12 }); // %
    cols.push({ wch: 24 }); // Status

    worksheet['!cols'] = cols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Chuyên cần");

    XLSX.writeFile(workbook, `Diem_Danh_Lop_${classMetadata.className}_${classMetadata.subjectName.replace(/\s+/g, '_')}.xlsx`);
  };

  // Calculate statistics for the selected QR session
  const qrSession = sessions.find(s => s.id === qrSelectedSessionId);
  const sessionStudents = qrSelectedSessionId
    ? students.map(std => {
        const rec = attendance.find(r => r.studentId === std.id && r.sessionId === qrSelectedSessionId);
        // If a student doesn't have an excused or unexcused attendance record, they are present
        const isPresent = !rec || rec.status === 'present';
        return { std, isPresent, rec };
      })
    : [];

  const presentCount = sessionStudents.filter(s => s.isPresent).length;
  const absentCount = sessionStudents.filter(s => !s.isPresent).length;
  const presentPercent = students.length > 0 ? (presentCount / students.length) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 print:p-0 print:space-y-0 print:max-w-full print-landscape">
      
      {/* Attendance Stats banner banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm print:hidden">
        <div className="flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-display font-bold text-amber-900 text-sm">Cảnh báo kỷ luật chuyên cần</h4>
            <p className="text-amber-800 text-xs mt-1">
              Theo quy chế đào tạo nghề Việt Nam, sinh viên vắng quá <strong>20% tổng số tiết</strong> môn học này (tương đương với vắng quá <strong>{Math.floor(classMetadata.totalPeriods * 0.2)} tiết</strong>) sẽ bị <strong>CẤM THI</strong> và bắt buộc phải đăng ký <strong>Học lại</strong>.
            </p>
          </div>
        </div>

        <div className="bg-white border border-amber-200 rounded-lg px-4 py-2 text-center shadow-sm self-stretch md:self-auto flex md:flex-col justify-between items-center md:justify-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Tổng điểm danh</span>
          <span className="font-mono text-lg font-extrabold text-amber-900">
            {sessions.length} buổi học ({sessions.reduce((acc, c) => acc + c.periods, 0)} tiết)
          </span>
        </div>
      </div>

      {/* Main control control box */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none print:p-0 print:bg-white print:overflow-visible">
        
        {/* Table Filters Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between print:hidden">
          
          <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Tìm kiếm sinh viên để điểm danh..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-4 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
              />
            </div>

            {/* Auto-save Status Indicator */}
            <div className="flex items-center select-none transition-all duration-300">
              {saveStatus === 'saving' ? (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold shadow-xs animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                  <span>Saving...</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold shadow-xs">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Saved</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              onClick={() => { window.focus(); window.print(); }}
              className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              In (A4)
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
              title="Xuất bảng điểm danh ra file Excel (.XLSX) đầy đủ định dạng cột dòng"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Xuất (.xlsx)
            </button>
            <button
              onClick={() => setShowAddStudentForm(true)}
              className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Thêm học viên
            </button>
            <button
              onClick={() => setShowAddSessionForm(true)}
              className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Thêm buổi
            </button>
            <button
              onClick={() => {
                if (sessions.length === 0) {
                  alert("Chưa có buổi học nào được tạo. Vui lòng thêm ít nhất một buổi học để điểm danh QR!");
                  return;
                }
                // Pick the last session by default
                if (!qrSelectedSessionId) {
                  setQrSelectedSessionId(sessions[sessions.length - 1].id);
                }
                setShowQRModal(true);
              }}
              className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
              title="Mở bảng trình chiếu QR điểm danh và điện thoại giả lập cho học sinh quét"
            >
              <QrCode className="w-4 h-4" />
              Điểm danh (QR)
            </button>
          </div>
        </div>

        {/* Physical Paper-Style Ledger Page Title Header */}
        <div className="pt-6 pb-4 px-6 text-center select-none bg-white font-serif">
          <h2 className="text-xl font-bold tracking-wide text-slate-900 uppercase font-serif">
            SỐ GIỜ NGHỈ TRONG MÔN HỌC
          </h2>
          <p className="text-slate-800 text-[11px] md:text-xs mt-1.5 font-serif italic max-w-4xl mx-auto leading-relaxed">
            (Ghi chú: Học sinh vắng có phép ghi P, vắng không phép ghi số tiết vắng trong buổi học - Ví dụ: vắng 2 tiết ghi số 2, vắng cả buổi học ghi số 5)
          </p>
        </div>

        {/* Scrollable Attendance Grid Grid */}
        <div className="overflow-x-auto relative p-4 bg-white font-serif print:overflow-visible print:p-0">
          <table className="w-full text-sm border-collapse border-2 border-slate-400 select-none bg-white font-serif">
            <thead>
              <tr className="bg-white text-slate-950 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-2 w-12 border-r border-b border-slate-400 text-center" rowSpan={2}>
                  <div className="flex flex-col items-center justify-center font-bold text-[9px] text-slate-900 leading-none py-1 select-none font-serif">
                    <span>S</span>
                    <span>ố</span>
                    <span className="my-0.5"></span>
                    <span>T</span>
                    <span>T</span>
                  </div>
                </th>
                <th className="py-3 px-4 border-r border-b border-slate-400 text-center w-64 text-slate-900 font-serif" colSpan={2} rowSpan={2}>
                  Tên HS/SV
                </th>
                
                {/* Dynamically spanned date columns */}
                <th className="py-2 text-center border-b border-r border-slate-400 text-slate-900 text-[10px] tracking-wide font-serif" colSpan={numDateColumns - 3}>
                  <div className="flex flex-col items-center justify-center leading-normal py-0.5">
                    <span className="font-bold uppercase tracking-wide text-[11px] text-slate-900">Ngày lên lớp</span>
                    <span className="text-[9px] font-normal italic text-slate-600">(Ghi ngày/ tháng cụ thể)</span>
                  </div>
                </th>
                
                <th className="py-2 text-center border-b border-r border-slate-400 text-slate-900 text-[10px] font-serif" colSpan={2}>
                  <span className="font-bold text-slate-900 tracking-wide">Số tiết:</span>
                </th>
                
                <th className="py-2 text-center border-b border-r border-slate-400 text-slate-900 font-bold font-serif text-sm w-12" colSpan={1}>
                  {classMetadata.totalPeriods}
                </th>

                <th className="py-3 px-2 w-14 border-r border-b border-slate-400 text-center" rowSpan={2}>
                  <div className="flex flex-col items-center justify-center font-bold text-[9px] text-slate-900 leading-none py-1 select-none font-serif">
                    <span>T</span>
                    <span>ổ</span>
                    <span>n</span>
                    <span>g</span>
                    <span className="my-0.5"></span>
                    <span>s</span>
                    <span>ố</span>
                  </div>
                </th>
                <th className="py-3 px-2 w-16 border-b border-slate-400 text-center" rowSpan={2}>
                  <div className="flex flex-col items-center justify-center font-bold text-[9px] text-slate-900 leading-none py-1 select-none font-serif">
                    <span>T</span>
                    <span>ỉ</span>
                    <span className="my-0.5"></span>
                    <span>l</span>
                    <span>ệ</span>
                    <span className="my-0.5"></span>
                    <span>%</span>
                  </div>
                </th>
              </tr>
              <tr className="bg-white text-slate-700 uppercase text-[9px] font-semibold border-b border-slate-400 font-serif">
                {Array.from({ length: numDateColumns }).map((_, idx) => {
                  const session = sessions[idx];
                  const dateString = session ? session.date.split('-').slice(1).reverse().join('/') : '';
                  const isSessionColumn = !!session;

                  return (
                    <th 
                      key={session ? session.id : `empty-header-${idx}`} 
                      className={`h-14 text-center border-r border-b border-slate-400 font-serif text-[10px] text-slate-800 w-12 group relative min-w-[44px] ${
                        isSessionColumn ? 'bg-sky-50/5' : 'bg-slate-50/20 select-none'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-between h-full py-1">
                        <span className="font-semibold text-slate-800 text-[10px]">{dateString}</span>
                        {isSessionColumn && (
                          <div className="flex items-center justify-center gap-1 mt-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSessionToClear(session);
                              }}
                              className="p-0.5 rounded text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                              title="Đặt tất cả đi học đầy đủ"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSessionToDelete(session);
                              }}
                              className="p-0.5 rounded text-red-500 hover:bg-red-50 transition cursor-pointer"
                              title="Xoá cột buổi học này"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={numDateColumns + 5} className="py-12 text-center text-slate-400 font-sans border border-slate-400">
                    Không tìm thấy sinh viên nào.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std, index) => {
                  // Calculate unexcused periods sum and percentage relative to totalPeriods
                  const unexcusedSum = sessions.reduce((sum, s) => {
                    const rec = attendance.find(r => r.studentId === std.id && r.sessionId === s.id);
                    if (rec && rec.status === 'unexcused') {
                      return sum + (rec.unexcusedPeriods || 0);
                    }
                    return sum;
                  }, 0);

                  const missedPercentage = classMetadata.totalPeriods > 0 
                    ? (unexcusedSum / classMetadata.totalPeriods) * 100 
                    : 0;
                  const roundedPercentage = Math.round(missedPercentage * 10) / 10;
                  const isBanned = roundedPercentage > 20;

                  return (
                    <tr
                      key={std.id}
                      className={`hover:bg-slate-50 bg-white transition-colors border-b border-slate-400`}
                    >
                      {/* index */}
                      <td className="py-2 text-center font-serif text-[12.5px] text-slate-800 border-r border-slate-400 w-12 font-medium">
                        {index + 1}
                      </td>

                      {/* Họ và Tên lót */}
                      <td className="py-2 px-3 text-[13px] text-slate-900 border-r border-slate-400 text-left truncate font-serif font-medium max-w-[180px] uppercase">
                        {std.lastName}
                      </td>

                      {/* Tên */}
                      <td className="py-2 px-3 text-[13px] text-slate-900 border-r border-slate-400 text-left font-serif font-bold w-20 uppercase">
                        {std.firstName}
                      </td>

                      {/* Attendance columns */}
                      {Array.from({ length: numDateColumns }).map((_, idx) => {
                        const session = sessions[idx];
                        const isSessionColumn = !!session;

                        if (!isSessionColumn) {
                          // Unusable empty cell placeholder
                          return (
                            <td 
                              key={`empty-cell-${idx}`} 
                              className="py-2 border-r border-slate-400 bg-slate-50/5 select-none w-12"
                            >
                            </td>
                          );
                        }

                        const rec = attendance.find(r => r.studentId === std.id && r.sessionId === session.id);
                        const isMenuOpen = activeMenu?.studentId === std.id && activeMenu?.sessionId === session.id;

                        // Visual outputs matching Vietnamese standard
                        let displayVal = '';
                        let textStyle = '';

                        if (rec) {
                          if (rec.status === 'excused') {
                            displayVal = 'P';
                            textStyle = 'text-slate-900 font-bold font-serif text-[13px]';
                          } else if (rec.status === 'unexcused') {
                            displayVal = String(rec.unexcusedPeriods);
                            textStyle = 'text-slate-900 font-bold font-serif text-[13px]';
                          }
                        }

                        return (
                          <td
                            key={session.id}
                            onClick={() => setActiveMenu({ studentId: std.id, sessionId: session.id })}
                            className="py-2 text-center border-r border-slate-400 font-serif text-[12.5px] cursor-pointer select-none hover:bg-indigo-50/20 active:bg-indigo-50 transition-all duration-100 relative w-12"
                            title="Bấm để điểm danh"
                          >
                            <span className={textStyle}>{displayVal}</span>

                            {/* Dropdown status setter select menu */}
                            {isMenuOpen && (
                              <>
                                <div className="fixed inset-0 z-20 cursor-default" onClick={(e) => { e.stopPropagation(); setActiveMenu(null); }}></div>
                                <div
                                  className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-36 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl p-1 text-left z-30 space-y-0.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Presence options */}
                                  <button
                                    onClick={() => selectAttendanceOption(std.id, session.id, 'present', 0)}
                                    className="w-full flex items-center justify-between text-left px-2 py-1.5 text-[11px] font-semibold rounded-md hover:bg-slate-800 text-slate-100 cursor-pointer"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                      Đi học đầy đủ
                                    </span>
                                    {!rec && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                                  </button>

                                  <button
                                    onClick={() => selectAttendanceOption(std.id, session.id, 'excused', 0)}
                                    className="w-full flex items-center justify-between text-left px-2 py-1.5 text-[11px] font-semibold rounded-md hover:bg-slate-800 text-slate-100 cursor-pointer"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <span className="font-bold font-mono text-amber-500 text-xs">P</span>
                                      Vắng có phép
                                    </span>
                                    {rec?.status === 'excused' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                                  </button>

                                  <hr className="border-slate-800 my-1" />
                                  <span className="block text-[8px] text-slate-500 font-mono px-2 uppercase font-bold mb-1">Vắng không phép (Số tiết):</span>

                                  {/* Loop through possible hours 1 to session periods */}
                                  {Array.from({ length: session.periods }).map((_, hIdx) => {
                                    const hr = hIdx + 1;
                                    const isSelected = rec?.status === 'unexcused' && rec.unexcusedPeriods === hr;
                                    return (
                                      <button
                                        key={hr}
                                        onClick={() => selectAttendanceOption(std.id, session.id, 'unexcused', hr)}
                                        className="w-full flex items-center justify-between text-left px-2 py-1 text-[11px] font-mono rounded-md hover:bg-slate-800 text-slate-200 cursor-pointer"
                                      >
                                        <span>Vắng {hr} tiết</span>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-red-500" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </td>
                        );
                      })}

                      {/* Total unexcused absences (Tổng số) */}
                      <td className="py-2 text-center font-serif font-bold text-slate-900 border-r border-slate-400 w-14 text-[13px]">
                        {unexcusedSum || ''}
                      </td>

                      {/* Percentage (Tỉ lệ %) */}
                      <td className={`py-2 text-center font-serif font-bold text-slate-900 w-16 text-[13px] ${
                        isBanned ? 'bg-red-50 text-red-700 font-bold' : ''
                      }`}>
                        {unexcusedSum > 0 ? `${roundedPercentage}%` : ''}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Legend block */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 print:bg-transparent print:border-none print:pt-4">
          <div className="flex flex-wrap gap-4 text-xs font-sans text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
              <strong>● (Chấm xanh)</strong>: Đi học đầy đủ
            </span>
            <span className="flex items-center gap-1.5">
              <strong className="text-amber-600 font-bold font-mono">P (Ký tự P)</strong>: Vắng có phép (Tính theo số lượng tiết buổi học đó)
            </span>
            <span className="flex items-center gap-1.5">
              <strong className="text-red-500 font-extrabold font-mono text-sm">Số tiết (1-5)</strong>: Vắng không phép
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono italic">
            * Bấm chuột trực tiếp vào biểu tượng chuyên cần để thay đổi nhanh trạng thái điểm danh.
          </div>
        </div>
      </div>

      {/* Prominent High-Visibility Inline Form when Sessions are Empty */}
      {sessions.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm max-w-md mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-display font-bold text-slate-900 text-sm">Học phần chuyên cần chưa có buổi học</h4>
              <p className="text-slate-500 text-[11px]">Vui lòng điền ngày và số tiết để khởi tạo cột đầu tiên:</p>
            </div>
          </div>
          <form onSubmit={handleAddSessionSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Ngày lên lớp</label>
              <input
                type="date"
                required
                value={newSessionDate}
                onChange={(e) => setNewSessionDate(e.target.value)}
                className="w-full text-sm p-2 bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Thời lượng buổi học này (Số tiết)</label>
              <select
                value={newSessionPeriods}
                onChange={(e) => setNewSessionPeriods(Number(e.target.value))}
                className="w-full text-sm p-2 bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value={1}>1 Tiết</option>
                <option value={2}>2 Tiết</option>
                <option value={3}>3 Tiết</option>
                <option value={4}>4 Tiết</option>
                <option value={5}>5 Tiết (Cả buổi học chuẩn)</option>
                <option value={6}>6 Tiết</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Khởi tạo buổi học đầu tiên
            </button>
          </form>
        </div>
      )}

      {/* Add session calendar modal popup popup */}
      {showAddSessionForm && (
        <div 
          onClick={() => setShowAddSessionForm(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          <div 
            className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-sm shadow-2xl relative" 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-display font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Tạo cột điểm danh buổi học mới
            </h3>

            <form onSubmit={handleAddSessionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày lên lớp</label>
                <input
                  type="date"
                  required
                  value={newSessionDate}
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 bg-slate-50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Thời lượng buổi học này (Số tiết)</label>
                <select
                  value={newSessionPeriods}
                  onChange={(e) => setNewSessionPeriods(Number(e.target.value))}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 bg-slate-50 font-mono"
                >
                  <option value={1}>1 Tiết</option>
                  <option value={2}>2 Tiết</option>
                  <option value={3}>3 Tiết</option>
                  <option value={4}>4 Tiết</option>
                  <option value={5}>5 Tiết (Cả buổi học chuẩn)</option>
                  <option value={6}>6 Tiết</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSessionForm(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition cursor-pointer"
                >
                  Khởi tạo cột
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add student form popup popup */}
      {showAddStudentForm && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" 
          onClick={() => {
            setShowAddStudentForm(false);
            setImportSearchTerm('');
            setSelectedStudentCodes([]);
          }}
        >
          <div 
            className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-4xl shadow-2xl relative flex flex-col max-h-[92vh]" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-150 pb-3">
              <div>
                <h3 className="text-base md:text-lg font-display font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                  Nhập học viên từ Hồ sơ Học viên hệ thống
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-sans">
                  Chọn một hoặc nhiều học viên có sẵn từ <strong>Hồ sơ Học viên</strong> để nhập nhanh hàng loạt vào lớp học hiện tại.
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowAddStudentForm(false);
                  setImportSearchTerm('');
                  setSelectedStudentCodes([]);
                }} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <span className="sr-only">Đóng</span>
                &times;
              </button>
            </div>

            {/* Utility control bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mt-4 mb-2">
              {/* Search Bar */}
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-4 h-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder="Tìm theo Mã MSHV, Họ Tên, SĐT, Trường liên kết..."
                  value={importSearchTerm}
                  onChange={(e) => setImportSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 text-slate-800 font-sans font-medium"
                  autoFocus
                />
                {importSearchTerm && (
                  <button
                    onClick={() => setImportSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600 cursor-pointer font-sans"
                  >
                    Xóa
                  </button>
                )}
              </div>

              {/* Bulk select actions */}
              {filteredImportStudents.length > 0 && (
                <div className="flex items-center gap-2 font-sans text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const addableCodes = filteredImportStudents
                        .filter(item => !students.some(s => s.studentCode === item.studentCode))
                        .map(item => item.studentCode);
                      setSelectedStudentCodes(prev => {
                        const next = [...prev];
                        addableCodes.forEach(code => {
                          if (!next.includes(code)) next.push(code);
                        });
                        return next;
                      });
                    }}
                    className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg transition active:scale-95 cursor-pointer"
                  >
                    Chọn tất cả kết quả
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const codesToRemove = filteredImportStudents.map(item => item.studentCode);
                      setSelectedStudentCodes(prev => prev.filter(code => !codesToRemove.includes(code)));
                    }}
                    className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-medium rounded-lg transition active:scale-95 cursor-pointer"
                  >
                    Bỏ chọn kết quả
                  </button>
                </div>
              )}
            </div>

            {/* List Results Container - TABLE list view with checkboxes */}
            <div className="flex-1 overflow-y-auto mt-2 pr-1 min-h-[220px] max-h-[420px] border border-slate-200 rounded-xl bg-white shadow-inner">
              {allStudents.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs font-sans">
                  Không tìm thấy hồ sơ học viên nào khả dụng trong hệ thống. Hãy qua tab <strong>Quản lý lớp học</strong> để thêm hồ sơ mới trước.
                </div>
              ) : filteredImportStudents.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs font-sans">
                  Không tìm thấy học viên nào phù hợp với từ khóa: "{importSearchTerm}"
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-xs border-collapse">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-150 z-10 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center select-none">Mở</th>
                        <th className="py-2.5 px-3 w-28">Mã MSHV</th>
                        <th className="py-2.5 px-3">Họ Tên</th>
                        <th className="py-2.5 px-3">Trường liên kết</th>
                        <th className="py-2.5 px-3 w-28">Số điện thoại</th>
                        <th className="py-2.5 px-3 w-24">Ngày sinh</th>
                        <th className="py-2.5 px-3 w-24 text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {filteredImportStudents.map((item) => {
                        const isAlreadyInClass = students.some(s => s.studentCode === item.studentCode);
                        const isSelected = selectedStudentCodes.includes(item.studentCode);

                        return (
                          <tr
                            key={item.id}
                            onClick={() => {
                              if (!isAlreadyInClass) {
                                setSelectedStudentCodes(prev =>
                                  prev.includes(item.studentCode)
                                    ? prev.filter(code => code !== item.studentCode)
                                    : [...prev, item.studentCode]
                                );
                              }
                            }}
                            className={`hover:bg-slate-50/70 transition-all duration-150 select-none cursor-pointer ${
                              isAlreadyInClass
                                ? 'bg-slate-50 opacity-60 cursor-not-allowed text-slate-400'
                                : isSelected
                                  ? 'bg-emerald-50/60 text-emerald-950 font-bold'
                                  : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center">
                                {isAlreadyInClass ? (
                                  <div className="w-4 h-4 rounded bg-slate-200 text-slate-505 flex items-center justify-center shrink-0">
                                    <Check className="w-2.5 h-2.5 font-black" />
                                  </div>
                                ) : (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {
                                      setSelectedStudentCodes(prev =>
                                        prev.includes(item.studentCode)
                                          ? prev.filter(code => code !== item.studentCode)
                                          : [...prev, item.studentCode]
                                      );
                                    }}
                                    className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500/20 cursor-pointer"
                                  />
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-slate-800">
                              {item.studentCode}
                            </td>
                            <td className="py-2.5 px-3 uppercase text-slate-900 font-bold">
                              <span className="flex items-center gap-1.5 flex-wrap">
                                <span>{item.lastName} {item.firstName}</span>
                                {item.bcs && (
                                  <span className="text-[8px] bg-indigo-50 border border-indigo-100 text-indigo-750 px-1 py-0.5 rounded font-black uppercase">
                                    👑 {item.bcs}
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 truncate max-w-[180px]" title={item.schoolName}>
                              {item.schoolName || '—'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {item.phoneNumber || '—'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {item.birthDate || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isAlreadyInClass ? (
                                <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded font-bold uppercase select-none">
                                  Đã ở trong lớp
                                </span>
                              ) : isSelected ? (
                                <span className="text-[9px] bg-emerald-100 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase select-none shadow-xs animate-pulse">
                                  Đã chọn
                                </span>
                              ) : (
                                <span className="text-[9px] bg-sky-50 border border-sky-100 text-sky-700 px-2 py-0.5 rounded font-bold uppercase select-none">
                                  Sẵn có
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="border-t border-slate-150 pt-4 mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs text-slate-500 font-sans select-none">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  Hồ sơ hệ thống: <strong>{allStudents.length}</strong>
                </span>
                <span className="text-slate-300">•</span>
                <span>
                  Khớp tìm kiếm: <strong>{filteredImportStudents.length}</strong>
                </span>
                {selectedStudentCodes.length > 0 && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Đã chọn {selectedStudentCodes.length} hồ sơ mới
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStudentForm(false);
                    setImportSearchTerm('');
                    setSelectedStudentCodes([]);
                  }}
                  className="flex-1 sm:flex-none py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition cursor-pointer text-center select-none"
                >
                  Đóng lại
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Filter the actual profiles to import (must be selected AND not already in active class)
                    const toImport = filteredImportStudents.filter(
                      item => selectedStudentCodes.includes(item.studentCode) && !students.some(s => s.studentCode === item.studentCode)
                    );

                    if (toImport.length === 0) {
                      alert("Vui lòng chọn ít nhất một học viên mới bằng cách nhấn chọn thẻ của họ!");
                      return;
                    }

                    if (onAddBulkStudents) {
                      const bulkData = toImport.map(item => ({
                        studentCode: item.studentCode,
                        lastName: item.lastName,
                        firstName: item.firstName,
                        schoolName: item.schoolName,
                        phoneNumber: item.phoneNumber,
                        birthDate: item.birthDate,
                        bcs: item.bcs
                      }));
                      onAddBulkStudents(bulkData);
                    } else {
                      // Fallback loop if prop was not fed
                      toImport.forEach(item => {
                        onAddStudent(
                          item.studentCode,
                          item.lastName,
                          item.firstName,
                          item.schoolName,
                          item.phoneNumber,
                          item.birthDate,
                          item.bcs
                        );
                      });
                    }

                    // Reset and close
                    setSelectedStudentCodes([]);
                    setImportSearchTerm('');
                    setShowAddStudentForm(false);
                  }}
                  disabled={selectedStudentCodes.length === 0}
                  className={`flex-1 sm:flex-none py-2 px-5 font-bold rounded-lg transition cursor-pointer text-center select-none shadow-sm flex items-center justify-center gap-1.5 ${
                    selectedStudentCodes.length === 0
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Nhập {selectedStudentCodes.length} học viên đã chọn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
         {/* Custom Modal: Clear Attendance Confirmation */}
      {sessionToClear && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="p-2 bg-emerald-50 rounded-full">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Điểm danh nhanh đi học đầy đủ</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed text-left">
              Bạn có chắc chắn muốn đặt trạng thái đi học cho tất cả học viên của buổi này là đi học đầy đủ? Hành động này sẽ thay thế các thông tin vắng đã lưu trong buổi học này.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setSessionToClear(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition text-xs font-bold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  onClearSessionAttendance(sessionToClear.id);
                  setSessionToClear(null);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-xs font-bold cursor-pointer shadow-sm"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal: Delete Session Confirmation */}
      {sessionToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-50 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Xóa cột điểm danh</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed text-left">
              Bạn có chắc chắn muốn xoá cột điểm danh ngày <strong>{sessionToDelete.date.split('-').reverse().join('/')}</strong> không? Mọi lịch sử và thông tin đi học của tất cả học viên trong ngày này sẽ bị mất vĩnh viễn và không thể khôi phục.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setSessionToDelete(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition text-xs font-bold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  onDeleteSession(sessionToDelete.id);
                  setSessionToDelete(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-xs font-bold cursor-pointer shadow-sm"
              >
                Thực hiện Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Modal: QR Code Attendance System & Simulator */}
      {showQRModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          {/* Style injection for laser beam */}
          <style>{`
            @keyframes scan-laser {
              0% { top: 0%; }
              50% { top: 96%; }
              100% { top: 0%; }
            }
            .scan-laser-line {
              animation: scan-laser 3s infinite linear;
            }
          `}</style>
          
          <div 
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                  <QrCode className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-slate-100 flex items-center gap-2 font-display">
                    Hệ Thống Điểm Danh Thông Minh QR Code
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Sử dụng thiết bị di động quét mã QR được hiển thị, hoặc sử dụng thanh giả lập điện thoại bên phải để thử nghiệm nhanh.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowQRModal(false);
                  setSimScanSuccess(null);
                }}
                className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Screen Container */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 bg-slate-900/40 overflow-y-auto max-h-[75vh]">
              
              {/* Left Column: Teacher slide interface (Col span 7) */}
              <div className="lg:col-span-7 space-y-5 flex flex-col justify-between">
                
                {/* Selector / Configuration box */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4.5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="text-slate-300 text-xs font-bold font-sans">Chọn buổi học muốn hiển thị QR:</label>
                    <select
                      value={qrSelectedSessionId}
                      onChange={(e) => {
                        setQrSelectedSessionId(e.target.value);
                        setSimScanSuccess(null);
                      }}
                      className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono rounded-lg p-2 focus:outline-none focus:border-amber-500 max-w-xs cursor-pointer"
                    >
                      {sessions.map(s => {
                        const dateParts = s.date.split('-');
                        const VietnameseDate = dateParts.length >= 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : s.date;
                        return (
                          <option key={s.id} value={s.id}>
                            Buổi ngày {VietnameseDate} ({s.periods} tiết)
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  
                  {/* Countdown Timer with progress bar */}
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                        <span>Mã QR bảo mật động (Thay đổi sau mỗi 10s):</span>
                      </span>
                      <strong className="text-amber-450 font-mono text-xs">{tokenTimeLeft} giây</strong>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
                        style={{ width: `${(tokenTimeLeft / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Anti-cheat configuration toggles */}
                  <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-800 space-y-3">
                    <h5 className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Cấu hình chống điểm danh hộ:</h5>
                    <div className="flex flex-col sm:flex-row gap-x-6 gap-y-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                        <input
                          type="checkbox"
                          checked={gpsRequired}
                          onChange={(e) => setGpsRequired(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-600 border-slate-700 bg-slate-900 focus:ring-amber-500/20 cursor-pointer"
                        />
                        <span>Yêu cầu định vị GPS lớp học</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                        <input
                          type="checkbox"
                          checked={blockMultipleDevices}
                          onChange={(e) => setBlockMultipleDevices(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-600 border-slate-700 bg-slate-900 focus:ring-amber-500/20 cursor-pointer"
                        />
                        <span>Giới hạn 1 thiết bị / 1 sinh viên</span>
                      </label>
                    </div>

                    {gpsRequired && (
                      <div className="text-[10px] bg-slate-950 border border-slate-850 p-2 rounded text-slate-400 font-mono flex items-center justify-between">
                        <span>Vị trí lớp: {gpsLoading ? "Đang dò tọa độ..." : `${teacherLat.toFixed(6)}, ${teacherLng.toFixed(6)}`}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setGpsLoading(true);
                            if (navigator.geolocation) {
                              navigator.geolocation.getCurrentPosition(
                                (p) => {
                                  setTeacherLat(p.coords.latitude);
                                  setTeacherLng(p.coords.longitude);
                                  setGpsLoading(false);
                                },
                                (e) => {
                                  alert("Không thể định vị tự động. Đang giữ nguyên tọa độ mặc định.");
                                  setGpsLoading(false);
                                }
                              );
                            }
                          }}
                          className="text-amber-500 hover:text-amber-450 font-sans font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${gpsLoading ? "animate-spin" : ""}`} />
                          Cập nhật GPS thật
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Stats banner on teacher's slide */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-900 border border-slate-805 rounded-lg p-3 text-center">
                      <span className="block text-[9px] uppercase text-slate-550 font-bold tracking-wide">Sĩ số đi học</span>
                      <strong className="text-lg font-mono text-emerald-400 mt-1 block">
                        {presentCount} <span className="text-slate-500 text-xs font-normal">/ {students.length}</span>
                      </strong>
                    </div>
                    <div className="bg-slate-900 border border-slate-805 rounded-lg p-3 text-center">
                      <span className="block text-[9px] uppercase text-slate-550 font-bold tracking-wide">Vắng học</span>
                      <strong className="text-lg font-mono text-rose-400 mt-1 block">
                        {absentCount} <span className="text-slate-500 text-xs font-normal">HV</span>
                      </strong>
                    </div>
                    <div className="bg-slate-900 border border-slate-820 rounded-lg p-3 text-center">
                      <span className="block text-[9px] uppercase text-slate-550 font-bold tracking-wide">Tỉ lệ chuyên cần</span>
                      <strong className="text-lg font-mono text-amber-400 mt-1 block">
                        {presentPercent.toFixed(1)}%
                      </strong>
                    </div>
                  </div>

                  {/* Present progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                      <span>Tiến độ điểm danh lớp</span>
                      <span>{presentCount} / {students.length} học viên ({presentPercent.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-850">
                      <div 
                        className="h-full bg-linear-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${presentPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Smart Real-time Automation and Cross-Tab Real-Device scan testing */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setIsAutoScanning(!isAutoScanning)}
                      className={`py-2 px-3.5 text-xs font-bold rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer uppercase ${
                        isAutoScanning 
                          ? 'bg-amber-600 hover:bg-amber-700 text-slate-100 animate-pulse border border-amber-500/20' 
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/10'
                      }`}
                      title={isAutoScanning ? "Dừng mô phỏng điểm danh tự động" : "Tự động duyệt quét điểm danh cho toàn bộ học sinh vắng trong lớp"}
                    >
                      {isAutoScanning ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Dừng Quét Tự Động</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Quét Tự Động (Rảnh tay)</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const portalUrl = window.location.origin + window.location.pathname + 
                          `?qr_session_id=${qrSelectedSessionId}` +
                          `&token=${qrToken}` + 
                          (gpsRequired ? `&lat=${teacherLat}&lng=${teacherLng}&gps_required=true` : '') +
                          (blockMultipleDevices ? `&device_limit=true` : '');
                        window.open(portalUrl, '_blank');
                      }}
                      className="py-2 px-3.5 bg-slate-800 hover:bg-slate-750 border border-slate-750 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase font-sans"
                      title="Mở cổng điểm danh độc lập dành cho Sinh viên trong một cửa sổ mở rộng khác"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                      <span>Quét thật (Mở tab mới)</span>
                    </button>
                  </div>

                  {/* Brief educational instruction */}
                  <div className="text-[10px] text-slate-400/90 leading-relaxed bg-slate-950/50 p-3 rounded-lg border border-slate-850">
                    <span className="font-extrabold uppercase text-[9px] tracking-wide text-amber-555 block mb-1">
                      💡 Mẹo kiểm nghiệm bảo mật:
                    </span>
                    Nhấp vào <strong className="text-indigo-400">"Quét thật (Mở tab mới)"</strong> để mở Cổng học sinh. Thử chờ 10 giây để xem cảnh báo hết hạn, hoặc bật định vị GPS và thử nghiệm tính năng Geofencing!
                  </div>
                </div>

                {/* Big Center QR Projector Screen */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center relative shadow-inner overflow-hidden group">
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[9px] font-mono font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>TRÌNH CHIẾU MÀN HÌNH CHÍNH (GIẢNG VIÊN)</span>
                  </div>

                  {/* Pulse background effects */}
                  <div className="absolute inset-0 bg-radial-to-c from-emerald-500/5 via-slate-950/0 to-slate-950 pointer-events-none"></div>

                  <div className="relative bg-white p-4 rounded-2xl shadow-2xl border border-slate-700/50 mt-4 group-hover:scale-[1.02] transition-transform duration-300">
                    {/* Generates standard QR Code using free safe global api */}
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=0f172a&data=${encodeURIComponent(
                        window.location.origin + window.location.pathname + 
                        `?qr_session_id=${qrSelectedSessionId}` +
                        `&token=${qrToken}` + 
                        (gpsRequired ? `&lat=${teacherLat}&lng=${teacherLng}&gps_required=true` : '') +
                        (blockMultipleDevices ? `&device_limit=true` : '')
                      )}`}
                      alt="Mã QR Chuyên Cần"
                      className="w-44 h-44 block"
                    />
                    <div className="absolute inset-0 border border-slate-200 rounded-2xl pointer-events-none"></div>
                  </div>

                  <p className="text-slate-300 text-xs text-center font-semibold mt-5 leading-normal max-w-sm font-sans">
                    Quét mã QR bằng Camera điện thoại hoặc Zalo để Điểm danh tự động.
                  </p>
                  <p className="text-[10px] text-slate-500 text-center font-mono mt-1.5 truncate max-w-md bg-slate-900 border border-slate-800 px-3 py-1 rounded">
                    Mã bảo mật OTP hiện tại: <span className="text-amber-400 font-bold">{qrToken}</span>
                  </p>
                </div>

                {/* Recent live activity logs */}
                <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-3">
                  <h4 className="text-slate-350 text-xs font-bold font-sans uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Nhật ký điểm danh trực tiếp hôm nay (Real-Time Activity)
                  </h4>
                  {recentQrActivity.length === 0 ? (
                    <div className="text-center py-5 text-slate-550 text-xs italic font-sans">
                      Chưa ghi nhận hoạt động quét mới trong phiên này.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[140px] overflow-y-auto">
                      {recentQrActivity.map((act, index) => (
                        <div key={index} className={`flex items-center justify-between border rounded-lg p-2.5 text-xs animate-[fadeIn_0.2s_ease-out] ${
                          act.warning 
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-250' 
                            : 'bg-slate-950/80 border-slate-850 text-slate-200'
                        }`}>
                          <div className="flex items-center gap-2">
                            {act.warning ? (
                              <span className="p-1 px-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold font-mono text-[9px] rounded flex items-center gap-1 uppercase">
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                                WARNING
                              </span>
                            ) : (
                              <span className="p-1 px-1.5 bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 font-bold font-mono text-[9px] rounded uppercase">
                                SUCCESS
                              </span>
                            )}
                            <span className="font-bold text-slate-200">{act.name}</span>
                            <span className="text-slate-500 font-mono text-[10px]">({act.code})</span>
                          </div>
                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3 font-mono text-[10px] text-slate-400">
                            {act.device && <span className="text-slate-500 text-[9px] font-sans">📱 {act.device} {act.distance ? `(${act.distance})` : ''}</span>}
                            <div className="flex items-center gap-1">
                              <span>{act.time}</span>
                              <span className={act.warning ? 'text-rose-450 font-bold' : 'text-emerald-500 font-bold'}>
                                {act.warning ? '⚠️ Trùng thiết bị/Bypass GPS' : '✓ Đã điểm danh'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column: Physical USB reader / student guides (Col span 5) */}
              <div className="lg:col-span-5 space-y-5 flex flex-col justify-start">
                
                {/* Panel 1: Physical Desktop USB Reader Port */}
                <div id="teacher-scanner-console" className="bg-slate-950/85 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center gap-2.5 text-indigo-400">
                    <Smartphone className="w-5 h-5 text-indigo-500 animate-pulse" />
                    <h4 className="text-xs font-black uppercase text-slate-200 tracking-wider font-display">
                      CỔNG MÁY QUẾT PHẦN CỨNG (USB READER PORT)
                    </h4>
                  </div>
                  
                  <p className="text-[11px] text-slate-400 leading-relaxed text-left">
                    Sử dụng Máy quét barcode/QR USB hoặc máy đọc thẻ RFID cầm tay để điểm danh hàng loạt. Đặt con trỏ chuột vào ô dưới và bắt đầu bấm quét thẻ học viên để nhận diện trực tiếp:
                  </p>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const codeParsed = teacherManualCode.trim();
                      if (!codeParsed) return;
                      
                      const matched = students.find(s => s.studentCode.toLowerCase().trim() === codeParsed.toLowerCase().trim());
                      if (!matched) {
                        alert(`Không tìm thấy hồ sơ học sinh khớp với Mã Số: "${codeParsed}". Vui lòng xác minh lại.`);
                        setTeacherManualCode('');
                        return;
                      }

                      // Check duplicates
                      const isAlreadyPresent = attendance.some(r => r.studentId === matched.id && r.sessionId === qrSelectedSessionId && r.status === 'present');
                      if (isAlreadyPresent) {
                        alert(`Học viên "${matched.lastName} ${matched.firstName}" (${matched.studentCode}) đã được ghi nhận có mặt trong buổi học này trước đây!`);
                        setTeacherManualCode('');
                        return;
                      }

                      // Apply attendance
                      onUpdateAttendance(matched.id, qrSelectedSessionId, 'present', 0);
                      playBeep();
                      
                      const now = new Date();
                      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
                      setRecentQrActivity(prev => [
                        { name: `${matched.lastName} ${matched.firstName}`, code: matched.studentCode, time: timeStr, status: 'SUCCESS' },
                        ...prev.slice(0, 4)
                      ]);

                      setTeacherManualCode('');
                    }}
                    className="space-y-3"
                  >
                    <div className="space-y-1 text-left">
                      <label htmlFor="teacher-usb-input" className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">Cảm biến tín hiệu cổng quét:</label>
                      <input
                        id="teacher-usb-input"
                        type="text"
                        placeholder="👉 Click vào đây để chờ tín hiệu quét ..."
                        value={teacherManualCode}
                        onChange={(e) => setTeacherManualCode(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-amber-400 font-mono text-sm tracking-widest text-center py-2.5 rounded-lg focus:outline-none focus:border-amber-500 uppercase font-bold"
                        autoComplete="off"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={!teacherManualCode.trim()}
                      className={`w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition rounded-lg cursor-pointer ${
                        !teacherManualCode.trim() ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-900' : ''
                      }`}
                    >
                      Nhận Mã Thẻ (Bật Enter)
                    </button>
                  </form>
                </div>

                {/* Panel 2: Real Student Self-CheckIn Flow instruction */}
                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <QrCode className="w-5 h-5 text-emerald-500 animate-pulse" />
                    <h4 className="text-xs font-black uppercase text-slate-200 tracking-wider font-display">
                      QUY TRÌNH HỌC VIÊN QUÉT BẰNG CAMERA ĐIỆN THOẠI
                    </h4>
                  </div>
                  
                  <div className="space-y-3 text-left text-xs leading-relaxed text-slate-400">
                    <div className="flex gap-2.5">
                      <span className="w-5 h-5 bg-slate-900 rounded-full flex items-center justify-center font-bold text-[10px] text-teal-400 border border-slate-800 shrink-0 mt-0.5 font-mono">1</span>
                      <p>Học viên bật Camera điện thoại (hoặc ứng dụng Zalo/Viber) hướng về mã QR trên bảng trình chiếu của Giáo viên.</p>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="w-5 h-5 bg-slate-900 rounded-full flex items-center justify-center font-bold text-[10px] text-teal-400 border border-slate-800 shrink-0 mt-0.5 font-mono">2</span>
                      <p>Đường dẫn tự động nhận diện duy nhất và chuyển hướng học sinh tới cổng điểm danh trực tuyến.</p>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="w-5 h-5 bg-slate-900 rounded-full flex items-center justify-center font-bold text-[10px] text-teal-400 border border-slate-800 shrink-0 mt-0.5 font-mono">3</span>
                      <p>Học viên nhập <strong>Mã Số Học Viên (MSSV)</strong>. Hệ thống tự động lưu kết quả vào sổ điểm trung tâm ngay lập tức!</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-850/60 pt-3 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-mono text-[10px]">Realtime Broadcast Sync:</span>
                    <span className="text-emerald-500 font-black tracking-wider text-[10px] flex items-center gap-1 font-sans">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      CONNECTED ✓
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/50 text-[10px] text-slate-500 font-mono">
              <span>Hệ thống điểm danh được tối ưu hóa cho màn hình lớn của giáo viên.</span>
              <button
                type="button"
                onClick={() => {
                  setShowQRModal(false);
                  setSimScanSuccess(null);
                }}
                className="py-1.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-350 hover:text-slate-100 font-bold rounded-lg transition text-xs cursor-pointer"
              >
                Đóng màn hình
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
