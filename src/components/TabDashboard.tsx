/**
 * TabDashboard.tsx
 * Professional, high-contrast, beautiful stats dashboard using Recharts and Lucide-react.
 */

import React, { useMemo, useState } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  AreaChart,
  Area,
  Line,
  ComposedChart
} from 'recharts';
import { motion } from 'motion/react';
import { 
  Users, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  GraduationCap, 
  Clock, 
  FileSpreadsheet,
  Gauge
} from 'lucide-react';
import { AppDatabase, Student, Grade, AttendanceSession, AttendanceRecord, ClassMetadata, ClassData } from '../types';
import { 
  calculatePeriodicGradeAverage, 
  calculateExamGradeAverage, 
  calculateFinalGrade,
  roundTo1Decimal 
} from '../utils/database';

interface TabDashboardProps {
  db: AppDatabase;
}

export default function TabDashboard({
  db
}: TabDashboardProps) {

  // Global Filters State
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  // Partner School Filter State
  const [selectedSchool, setSelectedSchool] = useState<string>('');

  // Extract unique school years and semesters from db
  const filterOptions = useMemo(() => {
    const years = new Set<string>();
    const semesters = new Set<string>();
    Object.values(db.classes).forEach(cls => {
      if (cls.metadata.schoolYear) years.add(cls.metadata.schoolYear.trim());
      if (cls.metadata.semester) semesters.add(cls.metadata.semester.trim());
    });
    return {
      years: Array.from(years).sort().reverse(),
      semesters: Array.from(semesters).sort()
    };
  }, [db.classes]);

  // Filtered classes based on Year and Semester
  const filteredClasses = useMemo(() => {
    return Object.entries(db.classes).filter(([classId, cls]) => {
      if (selectedSchoolYear && cls.metadata.schoolYear?.trim() !== selectedSchoolYear) return false;
      if (selectedSemester && cls.metadata.semester?.trim() !== selectedSemester) return false;
      if (selectedClassId && classId !== selectedClassId) return false;
      return true;
    }).map(([_, cls]) => cls);
  }, [db.classes, selectedSchoolYear, selectedSemester, selectedClassId]);

  // Aggregate Data
  const { students, grades, sessions, attendance, classMetadata } = useMemo(() => {
    let allStudents: Student[] = [];
    let allGrades: Grade[] = [];
    let allSessions: AttendanceSession[] = [];
    let allAttendance: AttendanceRecord[] = [];
    
    // Aggregated metadata for syllabus
    let totalPeriodsNeeded = 0;
    
    filteredClasses.forEach(cls => {
      allStudents = allStudents.concat(cls.students || []);
      allGrades = allGrades.concat(cls.grades || []);
      allSessions = allSessions.concat(cls.sessions || []);
      allAttendance = allAttendance.concat(cls.attendance || []);
      totalPeriodsNeeded += (cls.metadata.totalPeriods || 60);
    });

    return {
      students: allStudents,
      grades: allGrades,
      sessions: allSessions,
      attendance: allAttendance,
      classMetadata: { totalPeriods: totalPeriodsNeeded }
    };
  }, [filteredClasses]);

  // Extract unique school names dynamically from students
  const schoolOptions = useMemo(() => {
    return Array.from(new Set(students.map(s => s.schoolName?.trim()).filter(Boolean))) as string[];
  }, [students]);

  // Syllabus Progression Tracker
  const syllabusStats = useMemo(() => {
    const totalPeriodsNeeded = classMetadata.totalPeriods || 60;
    const completedPeriods = sessions.reduce((sum, s) => sum + s.periods, 0);
    const completedTheory = sessions.reduce((sum, s) => sum + (s.theoryHours || 0), 0);
    const completedPractice = sessions.reduce((sum, s) => sum + (s.practiceHours || 0), 0);
    const completedExam = sessions.reduce((sum, s) => sum + (s.examHours || 0), 0);
    const percentage = totalPeriodsNeeded > 0 ? Math.min(100, Math.round((completedPeriods / totalPeriodsNeeded) * 100)) : 0;
    return {
      totalPeriodsNeeded,
      completedPeriods,
      completedTheory,
      completedPractice,
      completedExam,
      percentage
    };
  }, [sessions, classMetadata]);

  // Process data for charts and KPI cards
  const stats = useMemo(() => {
    const filteredStudents = selectedSchool
      ? students.filter(s => s.schoolName?.trim() === selectedSchool.trim())
      : students;

    // 1. Calculate student points and grades
    const studentsWithPoints = filteredStudents.map((std) => {
      const grade = grades.find(g => g.studentId === std.id) || {
        studentId: std.id, l1: null, l2: null, l3: null, gv1: null, gv2: null, lan2: null, note: ''
      };
      const periodicAvg = calculatePeriodicGradeAverage(grade);
      const examAvg = calculateExamGradeAverage(grade);
      const finalScore = calculateFinalGrade(grade);

      // Check attendance for this student
      const studentAttendance = attendance.filter(r => r.studentId === std.id);
      const totalUnexcusedPeriods = studentAttendance.reduce((sum, rec) => {
        if (rec.status === 'unexcused') {
          return sum + (rec.unexcusedPeriods || 0);
        }
        return sum;
      }, 0);

      const missedPercent = classMetadata.totalPeriods > 0 
        ? (totalUnexcusedPeriods / classMetadata.totalPeriods) * 100 
        : 0;

      return {
        student: std,
        grade,
        periodicAvg,
        examAvg,
        finalScore,
        unexcusedPeriods: totalUnexcusedPeriods,
        missedPercent,
        isBanned: missedPercent > 20
      };
    });

    const totalCount = filteredStudents.length;
    
    // 2. Pass vs Fail rates
    const gradedCount = studentsWithPoints.filter(s => s.finalScore !== null).length;
    const passedCount = studentsWithPoints.filter(s => s.finalScore !== null && s.finalScore >= 5.0).length;
    const failedCount = studentsWithPoints.filter(s => s.finalScore !== null && s.finalScore < 5.0).length;
    const ungradedCount = totalCount - gradedCount;

    const passRate = gradedCount > 0 ? parseFloat(((passedCount / gradedCount) * 100).toFixed(1)) : 0;
    const overallPassRateOfTotal = totalCount > 0 ? parseFloat(((passedCount / totalCount) * 100).toFixed(1)) : 0;

    // 3. Score distribution ranking
    let xuatSac = 0; // 9.0 - 10.0
    let gioi = 0;    // 8.0 - 8.9
    let kha = 0;     // 6.5 - 7.9
    let truyenBinh = 0; // 5.0 - 6.4
    let yeuKem = 0;  // < 5.0

    studentsWithPoints.forEach(s => {
      if (s.finalScore === null) return;
      if (s.finalScore >= 9.0) xuatSac++;
      else if (s.finalScore >= 8.0) gioi++;
      else if (s.finalScore >= 6.5) kha++;
      else if (s.finalScore >= 5.0) truyenBinh++;
      else yeuKem++;
    });

    // 4. Attendance alert tracking
    const bannedCount = studentsWithPoints.filter(s => s.isBanned).length;
    const warningCount = studentsWithPoints.filter(s => s.missedPercent > 10 && s.missedPercent <= 20).length;
    const perfectCount = studentsWithPoints.filter(s => s.unexcusedPeriods === 0).length;

    // 5. General Class Average
    const gradedScores = studentsWithPoints.filter(s => s.finalScore !== null).map(s => s.finalScore as number);
    const classAvg = gradedScores.length > 0
      ? roundTo1Decimal(gradedScores.reduce((sum, val) => sum + val, 0) / gradedScores.length)
      : null;

    // Data for PieChart (Pass vs Fail vs Ungraded)
    const pieData = [
      { name: 'Đạt học phần (≥5.0)', value: passedCount, color: '#10b981' }, // Emerald
      { name: 'Chưa đạt (<5.0)', value: failedCount, color: '#f43f5e' },    // Rose
      { name: 'Chưa đủ điểm số', value: ungradedCount, color: '#94a3b8' }   // Slate
    ].filter(item => item.value > 0);

    // If empty class, default mock slice for visualization elegance
    const displayPieData = pieData.length > 0 ? pieData : [
      { name: 'Chưa có dữ liệu', value: 1, color: '#cbd5e1' }
    ];

    // Data for BarChart (Score distribution)
    const barData = [
      { name: 'Kém/Yếu (<5.0)', count: yeuKem, fill: '#f43f5e' },
      { name: 'Trung bình (5.0-6.4)', count: truyenBinh, fill: '#f59e0b' },
      { name: 'Khá (6.5-7.9)', count: kha, fill: '#3b82f6' },
      { name: 'Giỏi (8.0-8.9)', count: gioi, fill: '#8b5cf6' },
      { name: 'Xuất sắc (9.0-10)', count: xuatSac, fill: '#10b981' }
    ];

    // 6. Chronological Attendance Trends per Session
    const sortedSessions = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
    const attendanceTrendData = sortedSessions.map((s, index) => {
      let presentCount = 0;
      let excusedCount = 0;
      let unexcusedCount = 0;

      filteredStudents.forEach((std) => {
        const rec = attendance.find(r => r.studentId === std.id && r.sessionId === s.id);
        if (!rec || rec.status === 'present') {
          presentCount++;
        } else if (rec.status === 'excused') {
          excusedCount++;
        } else if (rec.status === 'unexcused') {
          unexcusedCount++;
        }
      });

      const total = filteredStudents.length;
      
      const presentRate = total > 0 ? parseFloat(((presentCount / total) * 105).toFixed(1)) : 100;
      // Cap at 100%
      const presentRateCalculated = Math.min(100, total > 0 ? parseFloat(((presentCount / total) * 100).toFixed(1)) : 100);
      const excusedRate = Math.min(100, total > 0 ? parseFloat(((excusedCount / total) * 100).toFixed(1)) : 0);
      const unexcusedRate = Math.min(100, total > 0 ? parseFloat(((unexcusedCount / total) * 100).toFixed(1)) : 0);

      let label = `Buổi ${index + 1}`;
      if (s.date) {
        const parts = s.date.split('-');
        if (parts.length === 3) {
          label = `${parts[2]}/${parts[1]}`;
        }
      }

      return {
        sessionId: s.id,
        sessionName: `Buổi ${index + 1}`,
        date: s.date,
        label,
        topic: s.topicSummary || 'Chưa cập nhật nội dung bài giảng',
        'Đi học (%)': presentRateCalculated,
        'Nghỉ có phép (%)': excusedRate,
        'Nghỉ không phép (%)': unexcusedRate,
        presentCount,
        excusedCount,
        unexcusedCount,
        total
      };
    });

    return {
      studentsWithPoints,
      totalCount,
      gradedCount,
      passedCount,
      failedCount,
      ungradedCount,
      passRate,
      overallPassRateOfTotal,
      bannedCount,
      warningCount,
      perfectCount,
      classAvg,
      displayPieData,
      barData,
      attendanceTrendData,
      rankings: { xuatSac, gioi, kha, truyenBinh, yeuKem }
    };
  }, [students, grades, sessions, attendance, classMetadata, selectedSchool]);

  // Motion Framer Animation Settings
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  const RADIAN = Math.PI / 180;
  // Custom label for Pie Chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent === 0) return null;

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[11px] font-bold font-mono">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto p-4 md:p-6 space-y-6"
    >
      {/* Banner / Header */}
      <motion.div 
        variants={itemVariants} 
        className="bg-slate-900 bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden"
      >
        <div className="absolute right-0 bottom-0 top-0 opacity-10 w-96 bg-radial-gradient from-indigo-505 pointer-events-none"></div>
        <div className="z-10 relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-900/50">
              📊 Tổng quan phân tích dữ liệu chuyên sâu
            </span>
            <h1 className="text-xl md:text-2xl font-black tracking-tight mt-1">
              Tổng quan Thống kê Học tập & Chuyên cần
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Biểu đồ trực quan và KPIs định lượng giúp giáo viên chủ nhiệm và giảng viên môn học dễ dàng nắm bắt kết quả học sinh đạt/chưa đạt, phổ điểm của lớp và các trường hợp cảnh báo nguy cơ cấm thi để có những điều chỉnh kịp thời.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-center bg-white/5 border border-white/10 px-4.5 py-3 rounded-2xl backdrop-blur-sm">
            <Gauge className="w-8 h-8 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase leading-none">Tỉ lệ Đạt chuẩn</p>
              <h3 className="text-xl font-black text-emerald-400 mt-1 font-mono tracking-tight">
                {stats.passRate}%
              </h3>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Global Filters */}
      <motion.div variants={itemVariants} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4.5 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Cơ sở liên kết</label>
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-250 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-800 bg-slate-50 cursor-pointer"
          >
            <option value="">Tất cả cơ sở đối tác ({schoolOptions.length})</option>
            {schoolOptions.map((sch) => (
              <option key={sch} value={sch}>{sch}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Năm học</label>
          <select
            value={selectedSchoolYear}
            onChange={(e) => {
              setSelectedSchoolYear(e.target.value);
              setSelectedClassId(''); // Reset class when year changes
            }}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-250 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-800 bg-slate-50 cursor-pointer"
          >
            <option value="">Tất cả Năm học</option>
            {filterOptions.years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Học kỳ</label>
          <select
            value={selectedSemester}
            onChange={(e) => {
              setSelectedSemester(e.target.value);
              setSelectedClassId(''); // Reset class when semester changes
            }}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-250 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-800 bg-slate-50 cursor-pointer"
          >
            <option value="">Tất cả Học kỳ</option>
            {filterOptions.semesters.map(sem => (
              <option key={sem} value={sem}>{sem}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Lớp học</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-250 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-800 bg-slate-50 cursor-pointer"
          >
            <option value="">Tất cả Lớp học</option>
            {Object.entries(db.classes)
              .filter(([_, cls]) => (!selectedSchoolYear || cls.metadata.schoolYear === selectedSchoolYear) && (!selectedSemester || cls.metadata.semester === selectedSemester))
              .map(([classId, cls]) => (
                <option key={classId} value={classId}>
                  {cls.metadata.className} {cls.metadata.subjectName ? `- ${cls.metadata.subjectName}` : ''}
                </option>
              ))
            }
          </select>
        </div>
      </motion.div>

      {/* Syllabus progression widget */}
      <motion.div variants={itemVariants} className="mb-6">
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4.5 md:col-span-2 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              📈 Tiến độ giảng dạy chương trình
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed font-sans mt-1">
              Đã thực hiện <strong className="text-indigo-600 font-mono text-sm">{syllabusStats.completedPeriods}</strong> trên tổng số <strong className="text-slate-800 font-mono text-sm">{syllabusStats.totalPeriodsNeeded}</strong> tiết học mô-đun được cấu hình trong sổ.
            </p>
            {/* Hour Breakdown badge list */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2 font-mono text-[10px]">
              <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100 font-bold">Lý thuyết: {syllabusStats.completedTheory}t</span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold font-sans">Thực hành: {syllabusStats.completedPractice}t</span>
              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100 font-bold font-mono">Kiểm tra: {syllabusStats.completedExam}t</span>
            </div>
          </div>

          {/* Simple Compact Horizontal/Radial Progress indicator */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="32" cy="32" r="26" stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                <circle 
                  cx="32" 
                  cy="32" 
                  r="26" 
                  stroke="#6366f1" 
                  strokeWidth="6" 
                  fill="transparent" 
                  strokeDasharray={`${2 * Math.PI * 26}`}
                  strokeDashoffset={`${2 * Math.PI * 26 * (1 - syllabusStats.percentage / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-xs font-black font-mono text-indigo-600">{syllabusStats.percentage}%</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold leading-none uppercase select-none">Tiến độ thực tế</p>
              <span className="text-xs font-bold mt-1 text-slate-800 block">
                {syllabusStats.percentage === 100 ? '✅ Đã hoàn thành' : '⚡ Đang triển khai'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Primary KPI Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Sĩ số */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4.5 hover:shadow-md transition-all flex items-start gap-3.5">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <Users className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider leading-none">Sĩ số lớp học</p>
            <h3 className="text-xl font-black mt-1 text-slate-900 font-mono">{stats.totalCount} <span className="text-xs font-semibold text-slate-400">HV</span></h3>
            <p className="text-[10px] text-slate-400 mt-1 leading-normal">
              Đã đánh giá điểm: <strong className="text-slate-700">{stats.gradedCount}</strong>
            </p>
          </div>
        </div>

        {/* KPI 2: Điểm trung bình lớp */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4.5 hover:shadow-md transition-all flex items-start gap-3.5">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <TrendingUp className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider leading-none">Điểm trung bình</p>
            <h3 className="text-xl font-black mt-1 text-slate-900 font-mono">
              {stats.classAvg !== null ? stats.classAvg : 'N/A'}{' '}
              {stats.classAvg !== null && <span className="text-xs font-semibold text-slate-400">/10</span>}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 leading-normal">
              Mức độ học lực: <strong className="text-slate-705">
                {stats.classAvg === null ? 'Chưa rõ' : 
                 stats.classAvg >= 8.0 ? 'Giỏi/X.Sắc' : 
                 stats.classAvg >= 6.5 ? 'Khá' : 
                 stats.classAvg >= 5.0 ? 'Trung bình' : 'Yếu kém'}
              </strong>
            </p>
          </div>
        </div>

        {/* KPI 3: Số lượng đạt */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4.5 hover:shadow-md transition-all flex items-start gap-3.5">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <CheckCircle2 className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider leading-none">Đạt học liệu (≥ 5.0)</p>
            <h3 className="text-xl font-black mt-1 text-emerald-600 font-mono">{stats.passedCount} <span className="text-xs font-semibold text-emerald-400">HV</span></h3>
            <p className="text-[10px] text-slate-450 mt-1 leading-normal">
              Chiếm tỉ lệ: <strong className="text-emerald-700">{stats.passRate}%</strong> số học viên có điểm
            </p>
          </div>
        </div>

        {/* KPI 4: Trạng thái cấm thi */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4.5 hover:shadow-md transition-all flex items-start gap-3.5">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
            <AlertTriangle className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider leading-none">Phạt cấm thi (&gt;20%)</p>
            <h3 className="text-xl font-black mt-1 text-rose-600 font-mono">{stats.bannedCount} <span className="text-xs font-semibold text-rose-450">HV</span></h3>
            <p className="text-[10px] text-slate-400 mt-1 leading-normal">
              Cảnh báo vắng học ({stats.warningCount} HV vắng từ 10-20%)
            </p>
          </div>
        </div>
      </motion.div>

      {/* High-Risk Students Alert Summary Card */}
      <motion.div 
        variants={itemVariants}
        className="bg-white border border-rose-200 shadow-sm rounded-2xl p-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-rose-100 pb-3 mb-4 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Danh sách Học viên Nguy cơ cao (Vắng &gt; 10% tổng số tiết)</h3>
              <p className="text-[10.5px] text-slate-400">Các học viên có tỉ lệ nghỉ học (vắng không phép) vượt quá mức an toàn 10%, cần được nhắc nhở để tránh bị cấm thi (vắng &gt; 20%)</p>
            </div>
          </div>
          <span className="self-start sm:self-center text-[10.5px] bg-rose-50 text-rose-700 px-3 py-1 rounded-full font-bold font-mono border border-rose-100">
            Cảnh báo: {stats.studentsWithPoints.filter(s => s.missedPercent > 10).length} học viên
          </span>
        </div>

        {stats.studentsWithPoints.filter(s => s.missedPercent > 10).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-1.5 font-sans">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-80" />
            <p className="text-xs font-semibold text-slate-600">Lớp học kỷ luật tốt! Không có học viên nào vắng quá 10% số tiết.</p>
            <p className="text-[10px] text-slate-400">Tất cả học viên đều duy trì chuyên cần dưới ngưỡng cảnh báo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[190px] overflow-y-auto pr-1">
            {stats.studentsWithPoints
              .filter(s => s.missedPercent > 10)
              .sort((a, b) => b.missedPercent - a.missedPercent)
              .map((s, idx) => (
                <div 
                  key={idx} 
                  className="bg-rose-50/20 border border-rose-100 rounded-xl p-3 flex items-center justify-between gap-3 hover:bg-rose-50/50 transition-all shadow-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-xs truncate">
                      {s.student.lastName} {s.student.firstName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Mã: {s.student.studentCode} | Vắng: <strong className="text-slate-600">{s.unexcusedPeriods}t</strong>
                    </p>
                  </div>
                  <div className="shrink-0">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-wide ${
                      s.isBanned 
                        ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse' 
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {s.missedPercent.toFixed(1)}% {s.isBanned ? 'CẤM THI' : 'CẢNH BÁO'}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </motion.div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1: Tỷ lệ Đạt / Không Đạt (Donut Pie Chart) */}
        <motion.div 
          variants={itemVariants}
          className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5.5 lg:col-span-5 flex flex-col h-[400px]"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tỉ lệ Đạt / Chưa đạt học phần</h3>
              <p className="text-[10.5px] text-slate-400">Tỉ lệ tính trên tổng số học viên trong danh sách sổ lớp</p>
            </div>
            <Award className="w-4.5 h-4.5 text-indigo-500" />
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center relative">
            <div className="w-full h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.displayPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomizedLabel}
                  >
                    {stats.displayPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', fontSize: '11px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Overlay Center Summary */}
            <div className="absolute text-center flex flex-col pointer-events-none">
              <span className="text-[10px] uppercase font-bold text-slate-400 leading-none">Pass Rate</span>
              <span className="text-2xl font-black text-emerald-600 font-mono mt-0.5">{stats.passRate}%</span>
            </div>
          </div>

          {/* Legends */}
          <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3.5 shrink-0 text-center text-[11px] font-sans">
            <div className="space-y-0.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5"></span>
              <span className="text-slate-500">Đạt:</span>
              <strong className="block text-slate-800 font-bold">{stats.passedCount} HV ({stats.overallPassRateOfTotal}%)</strong>
            </div>
            <div className="space-y-0.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 mr-1.5"></span>
              <span className="text-slate-500">Chưa đạt:</span>
              <strong className="block text-slate-800 font-bold">{stats.failedCount} HV</strong>
            </div>
            <div className="space-y-0.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-400 mr-1.5"></span>
              <span className="text-slate-500">Chưa điểm:</span>
              <strong className="block text-slate-800 font-bold">{stats.ungradedCount} HV</strong>
            </div>
          </div>
        </motion.div>

        {/* Chart 2: Phổ điểm Học tập (Bar Chart) */}
        <motion.div 
          variants={itemVariants}
          className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5.5 lg:col-span-7 flex flex-col h-[400px]"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Phân phối xếp loại học lý thuyết</h3>
              <p className="text-[10.5px] text-slate-400">Số lượng học sinh trong từng khung phổ điểm đánh giá</p>
            </div>
            <GraduationCap className="w-4.5 h-4.5 text-indigo-500" />
          </div>

          <div className="flex-1 min-h-0">
            {stats.gradedCount === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <FileSpreadsheet className="w-8 h-8 opacity-40 text-slate-5s00" />
                <p className="text-xs">Chưa có dữ liệu học lực được cập nhật.</p>
              </div>
            ) : (
              <div className="w-full h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.barData}
                    margin={{ top: 15, right: 10, left: -25, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#64748b', fontSize: 10 }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      allowDecimals={false} 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', fontSize: '11px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    />
                    <Bar 
                      dataKey="count" 
                      name="Số học viên" 
                      radius={[6, 6, 0, 0]}
                      maxBarSize={45}
                    >
                      {stats.barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Detailed stats summary footer for consistency */}
          <div className="grid grid-cols-5 gap-1.5 border-t border-slate-100 pt-3.5 shrink-0 text-center font-sans text-[10px] leading-relaxed">
            <div>
              <span className="block text-slate-450 uppercase tracking-wide">Yếu / Kém</span>
              <strong className="text-rose-600 font-bold font-mono text-sm">{stats.rankings.yeuKem}</strong>
            </div>
            <div>
              <span className="block text-slate-450 uppercase tracking-wide">Trung bình</span>
              <strong className="text-amber-600 font-bold font-mono text-sm">{stats.rankings.truyenBinh}</strong>
            </div>
            <div>
              <span className="block text-slate-450 uppercase tracking-wide">Khá</span>
              <strong className="text-blue-600 font-bold font-mono text-sm">{stats.rankings.kha}</strong>
            </div>
            <div>
              <span className="block text-slate-450 uppercase tracking-wide">Giỏi</span>
              <strong className="text-violet-600 font-bold font-mono text-sm">{stats.rankings.gioi}</strong>
            </div>
            <div>
              <span className="block text-slate-450 uppercase tracking-wide">Xuất sắc</span>
              <strong className="text-emerald-600 font-bold font-mono text-sm">{stats.rankings.xuatSac}</strong>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Attendance Trend & Status Analysis Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart 3: Attendance Rate Trend (Area Chart) */}
        <motion.div 
          variants={itemVariants}
          className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5.5 flex flex-col h-[400px]"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Xu hướng tỉ lệ chuyên cần qua các buổi học</h3>
              <p className="text-[10.5px] text-slate-400">Biểu đồ trực quan hóa xu thế tỉ lệ đi học đầy đủ, nghỉ phép và nghỉ không phép qua chuỗi thời gian</p>
            </div>
            <TrendingUp className="w-4.5 h-4.5 text-indigo-500" />
          </div>

          <div className="flex-1 min-h-0">
            {!selectedClassId ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <Clock className="w-8 h-8 opacity-40 text-slate-500" />
                <p className="text-xs text-center px-4">Vui lòng chọn 1 lớp học cụ thể ở bộ lọc phía trên để xem biểu đồ chuyên cần chi tiết theo từng buổi học.</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <Clock className="w-8 h-8 opacity-40 text-slate-500" />
                <p className="text-xs">Chưa có thông tin buổi học và điểm danh để thống kê xu hướng.</p>
              </div>
            ) : (
              <div className="w-full h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stats.attendanceTrendData}
                    margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
                      </linearGradient>
                      <linearGradient id="colorExcused" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01}/>
                      </linearGradient>
                      <linearGradient id="colorUnexcused" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.01}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tickFormatter={(val) => `${val}%`}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        fontSize: '11px', 
                        border: '1px solid #e2e8f0', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        backgroundColor: '#fff'
                      }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg space-y-1.5 min-w-[200px]">
                              <p className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-1 mb-1">
                                {data.sessionName} ({data.date})
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium truncate max-w-[220px]">
                                📖 {data.topic}
                              </p>
                              <div className="space-y-1 pt-1 text-xs">
                                <div className="flex justify-between items-center text-emerald-600 font-semibold">
                                  <span>Đi học:</span>
                                  <span>{data['Đi học (%)']}% ({data.presentCount}/{data.total})</span>
                                </div>
                                <div className="flex justify-between items-center text-indigo-500 font-semibold">
                                  <span>Vắng có phép:</span>
                                  <span>{data['Nghỉ có phép (%)']}% ({data.excusedCount}/{data.total})</span>
                                </div>
                                <div className="flex justify-between items-center text-rose-500 font-semibold">
                                  <span>Vắng không phép:</span>
                                  <span>{data['Nghỉ không phép (%)']}% ({data.unexcusedCount}/{data.total})</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 10, fontWeight: 500, color: '#64748b' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="Đi học (%)" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorPresent)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="Nghỉ có phép (%)" 
                      stroke="#6366f1" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorExcused)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="Nghỉ không phép (%)" 
                      stroke="#f43f5e" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorUnexcused)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </motion.div>

        {/* Chart 4: Student Attendance Status & Discipline (Bar + Trend Line) */}
        <motion.div 
          variants={itemVariants}
          className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5.5 flex flex-col h-[400px]"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sĩ số đi học chi tiết theo từng buổi học</h3>
              <p className="text-[10.5px] text-slate-400">Biểu lộ tương quan số lượng học viên đi học thực tế đối chiếu sĩ số lớp học</p>
            </div>
            <Users className="w-4.5 h-4.5 text-emerald-500" />
          </div>

          <div className="flex-1 min-h-0">
            {!selectedClassId ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <Users className="w-8 h-8 opacity-40 text-slate-500" />
                <p className="text-xs text-center px-4">Vui lòng chọn 1 lớp học cụ thể ở bộ lọc phía trên để xem biểu đồ sĩ số chi tiết.</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <Users className="w-8 h-8 opacity-40 text-slate-500" />
                <p className="text-xs">Chưa có thông tin buổi học và điểm danh để thống kê sĩ số chi tiết.</p>
              </div>
            ) : (
              <div className="w-full h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={stats.attendanceTrendData}
                    margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      allowDecimals={false}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        fontSize: '11px', 
                        border: '1px solid #e2e8f0', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        backgroundColor: '#fff'
                      }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const absentCount = data.excusedCount + data.unexcusedCount;
                          return (
                            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg space-y-1.5 min-w-[200px]">
                              <p className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-1 mb-1">
                                {data.sessionName} ({data.date})
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium truncate max-w-[220px]">
                                📖 {data.topic}
                              </p>
                              <div className="space-y-1 pt-1 text-xs">
                                <div className="flex justify-between items-center text-emerald-600 font-semibold">
                                  <span>Đi học (Có mặt):</span>
                                  <span>{data.presentCount} học viên</span>
                                </div>
                                <div className="flex justify-between items-center text-indigo-500 font-semibold">
                                  <span>Vắng có phép:</span>
                                  <span>{data.excusedCount} học viên</span>
                                </div>
                                <div className="flex justify-between items-center text-rose-500 font-semibold border-b border-slate-100 pb-1 mb-1">
                                  <span>Vắng không phép:</span>
                                  <span>{data.unexcusedCount} học viên</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-600 font-semibold pt-0.5">
                                  <span>Tổng sĩ số lớp:</span>
                                  <span>{data.total} học viên</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 10, fontWeight: 500, color: '#64748b' }}
                    />
                    <Bar 
                      dataKey="presentCount" 
                      name="Đi học (Có mặt)" 
                      fill="#10b981" 
                      stackId="attendance"
                      radius={[0, 0, 0, 0]}
                      maxBarSize={40}
                    />
                    <Bar 
                      dataKey="excusedCount" 
                      name="Vắng có phép" 
                      fill="#6366f1" 
                      stackId="attendance"
                      radius={[0, 0, 0, 0]}
                      maxBarSize={40}
                    />
                    <Bar 
                      dataKey="unexcusedCount" 
                      name="Vắng không phép" 
                      fill="#f43f5e" 
                      stackId="attendance"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      name="Tổng sĩ số lớp" 
                      stroke="#4f46e5" 
                      strokeWidth={2}
                      dot={{ r: 3, stroke: '#4f46e5', strokeWidth: 1.5, fill: '#fff' }}
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </motion.div>

      </div>

      {/* Advanced Insights Grid: Classroom Danger Zone & Highly Disciplined lists */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Attendance warnings */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5.5 flex flex-col h-[350px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4.5 h-4.5 text-rose-500" />
                <span>Cảnh báo chuyên cần (Vắng trên 10%)</span>
              </h3>
              <p className="text-[10.5px] text-slate-400">Nếu tỉ lệ vắng không phép &gt; 20% học viên sẽ bị cấm thi học phần</p>
            </div>
            <span className="text-[10.5px] bg-red-50 text-red-700 px-2 py-0.5 rounded-md font-bold font-mono">
              Vượt khung: {stats.bannedCount} HV
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {stats.studentsWithPoints.filter(s => s.missedPercent > 10).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-1.5 font-sans py-12">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-60" />
                <p className="text-xs font-semibold text-slate-600">Tuyệt vời! Không có học viên nào vắng quá quy định</p>
                <p className="text-[10px] text-slate-400">Tất cả các học viên đều duy trì mức chuyên cần tốt.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.studentsWithPoints
                  .filter(s => s.missedPercent > 10)
                  .sort((a, b) => b.missedPercent - a.missedPercent)
                  .map((s, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between font-sans gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">
                          {s.student.lastName} {s.student.firstName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Mã số: {s.student.studentCode} | Vắng không phép: <span className="font-bold text-slate-600">{s.unexcusedPeriods}t</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                          s.isBanned 
                            ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                            : 'bg-amber-140 text-amber-800 border border-amber-200'
                        }`}>
                          {s.isBanned ? `CẤM THI (${s.missedPercent.toFixed(1)}%)` : `CẢNH BÁO (${s.missedPercent.toFixed(1)}%)`}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Performers or Warning list about academic */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5.5 flex flex-col h-[350px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Award className="w-4.5 h-4.5 text-emerald-500" />
                <span>Học viên tiêu biểu đạt điểm giỏi trở lên (&ge; 8.0)</span>
              </h3>
              <p className="text-[10.5px] text-slate-400">Danh dự ghi nhận nỗ lực học tập xuất sắc của khóa học</p>
            </div>
            <span className="text-[10.5px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold font-mono">
              Thành tích: {stats.studentsWithPoints.filter(s => s.finalScore !== null && s.finalScore >= 8.0).length} HV
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {stats.studentsWithPoints.filter(s => s.finalScore !== null && s.finalScore >= 8.0).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-1.5 font-sans py-12">
                <Award className="w-8 h-8 opacity-40 text-slate-500" />
                <p className="text-xs">Chưa ghi nhận học viên nào đạt điểm &ge; 8.0</p>
                <p className="text-[10px] text-slate-400">Tiếp tục cập nhật điểm thi và đánh giá định kỳ để xếp thứ hạng cao.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.studentsWithPoints
                  .filter(s => s.finalScore !== null && s.finalScore >= 8.0)
                  .sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0))
                  .map((s, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between font-sans gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-850 truncate">
                          {s.student.lastName} {s.student.firstName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Mã số: {s.student.studentCode} | Định kỳ: <strong className="text-slate-600">{s.periodicAvg}</strong> | Thi: <strong className="text-slate-600">{s.examAvg}</strong>
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <span className="text-xs font-black text-emerald-600 font-mono leading-none bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg">
                          {s.finalScore?.toFixed(1)}
                        </span>
                        <span className="text-[9.5px] uppercase font-black text-emerald-700 font-sans tracking-wide">
                          {s.finalScore && s.finalScore >= 9.0 ? 'Xuất sắc ⭐' : 'Giỏi 🥇'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
}
