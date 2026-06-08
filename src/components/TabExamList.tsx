/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Printer, FileSpreadsheet, Info, Settings2, Sparkles, HelpCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Student, Grade, ClassMetadata, AttendanceSession, AttendanceRecord } from '../types';
import { calculatePeriodicGradeAverage, calculateAttendanceStats } from '../utils/database';

interface TabExamListProps {
  students: Student[];
  grades: Grade[];
  sessions: AttendanceSession[];
  attendance: AttendanceRecord[];
  classMetadata: ClassMetadata;
  onUpdateGrade: (studentId: string, updatedFields: Partial<Grade>) => void;
}

export default function TabExamList({
  students,
  grades,
  sessions,
  attendance,
  classMetadata,
  onUpdateGrade
}: TabExamListProps) {
  // Input fields for print header settings (with persistent local states for easy customization)
  const [schoolName, setSchoolName] = useState(classMetadata.managingSchool || classMetadata.schoolName || 'TRƯỜNG TC KTNV TÔN ĐỨC THẮNG');

  useEffect(() => {
    const defaultSchool = classMetadata.managingSchool || classMetadata.schoolName;
    if (defaultSchool) {
      setSchoolName(defaultSchool);
    }
  }, [classMetadata.managingSchool, classMetadata.schoolName]);
  const [departmentName, setDepartmentName] = useState('KHOA KỸ THUẬT NGHIỆP VỤ');
  const [examRound, setExamRound] = useState('01');
  const [examDateStr, setExamDateStr] = useState('..../..../.........');
  const [examDuration, setExamDuration] = useState('....');
  const [showSettings, setShowSettings] = useState(false);
  
  // Signature location and date states
  const [signatureLocation, setSignatureLocation] = useState('Tp Hồ Chí Minh');
  const [signatureDay, setSignatureDay] = useState('31');
  const [signatureMonth, setSignatureMonth] = useState('05');
  const [signatureYear, setSignatureYear] = useState('2026');
  
  // Custom View States
  const [viewMode, setViewMode] = useState<'blank' | 'filled'>('blank'); // blank: for print checklist; filled: shows actual grades & notes from results book
  const [bannedThresholdPercentage, setBannedThresholdPercentage] = useState(20);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Filtering students
  const filteredStudents = students.filter((std) => {
    const fullName = `${std.lastName} ${std.firstName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || std.studentCode.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Helper to run calculations per student
  const getStudentStats = (studentId: string) => {
    const stats = calculateAttendanceStats(studentId, sessions, attendance, classMetadata.totalPeriods);
    // Recalculate based on custom threshold if changed
    const customBanned = stats.missedPercentage > bannedThresholdPercentage;
    return {
      ...stats,
      bannedFromExam: customBanned
    };
  };

  // Aggregated Counters
  let eligibleCount = 0;
  let ineligibleCount = 0;

  students.forEach((std) => {
    const stats = getStudentStats(std.id);
    if (stats.bannedFromExam) {
      ineligibleCount++;
    } else {
      eligibleCount++;
    }
  });

  const handlePrint = () => {
    window.focus();
    window.print();
  };

  // Export to CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // UTF-8 BOM
    csvContent += `DANH SÁCH THI HẾT MÔN\n`;
    csvContent += `Môn học / Mô-đun: ${classMetadata.subjectName}, Lớp: ${classMetadata.className}\n\n`;
    csvContent += "TT,Mã số HS/SV,Họ và chữ lót,Tên,Điểm TB Đ.Kỳ,Vắng >20% (x),Không được dự thi (x),Ký tên,Điểm thi,Ghi chú\n";

    filteredStudents.forEach((std, idx) => {
      const g = grades.find((gr) => gr.studentId === std.id);
      const periodicAverage = g ? calculatePeriodicGradeAverage(g) : null;
      const stats = getStudentStats(std.id);
      
      const row = [
        idx + 1,
        std.studentCode,
        std.lastName,
        std.firstName,
        periodicAverage !== null ? periodicAverage.toFixed(1) : '',
        stats.bannedFromExam ? 'x' : '',
        stats.bannedFromExam ? 'x' : '',
        '',
        viewMode === 'filled' && g?.gv1 !== null ? g?.gv1 : '',
        g?.note ? `"${g.note.replace(/"/g, '""')}"` : ''
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Danh_sach_thi_Lop_${classMetadata.className}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25 }}
      className="p-4 md:p-6 max-w-6xl mx-auto print:p-0 print:max-w-full print-portrait"
    >
      {/* 1. Print and Config Actions Panel (Hidden on Print) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 mb-6 print:hidden">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Quick Search Input */}
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm học sinh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-60 text-xs bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium text-slate-700"
            />
          </div>

          {/* View Mode Selection toggles */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode('blank')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'blank'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mẫu in thi trống
            </button>
            <button
              onClick={() => setViewMode('filled')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'filled'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bảng điểm hoàn thiện
            </button>
          </div>

          {/* Toggle Header Config Tool */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold border transition ${
              showSettings 
                ? 'bg-amber-50 text-amber-700 border-amber-300' 
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Chỉnh thông tin in ấn</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md transition active:scale-95 cursor-pointer w-full sm:w-auto"
          >
            <Printer className="w-4 h-4" />
            <span>In (A4)</span>
          </button>
          
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs py-2 px-3 rounded-xl transition cursor-pointer w-full sm:w-auto"
            title="Xuất bảng điểm ra file CSV cho Microsoft Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Xuất (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* 2. Collapsible Print Settings Form Panel (Hidden on Print) */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-slate-100 rounded-2xl border border-slate-200 p-5 mb-6 text-slate-800 font-sans text-xs space-y-4 print:hidden"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Thiết lập Tùy chỉnh Tiêu đề Phiếu Thi
            </h4>
            <span className="text-[10px] text-slate-500 italic">Dữ liệu tự động đồng bộ xuống mẫu bên dưới</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">TÊN TRƯỜNG (In hoa)</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                placeholder="Ví dụ: TRƯỜNG TCN KTNV TÔN ĐỨC THẮNG"
              />
            </div>
            
            <div>
              <label className="block font-semibold text-slate-700 mb-1">TÊN KHOA (In hoa)</label>
              <input
                type="text"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                placeholder="Ví dụ: KHOA KỸ THUẬT NGHIỆP VỤ"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="block font-semibold text-slate-700 mb-1">Lần thi</label>
                <input
                  type="text"
                  value={examRound}
                  onChange={(e) => setExamRound(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white text-center font-mono font-bold"
                  placeholder="01"
                />
              </div>
              <div className="col-span-1">
                <label className="block font-semibold text-slate-705 mb-1">% Vắng tối đa</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={bannedThresholdPercentage}
                  onChange={(e) => setBannedThresholdPercentage(Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white text-center font-mono font-bold"
                  placeholder="20"
                />
              </div>
              <div className="col-span-1">
                <label className="block font-semibold text-slate-700 mb-1">Thời gian thi</label>
                <input
                  type="text"
                  value={examDuration}
                  onChange={(e) => setExamDuration(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white text-center"
                  placeholder="90 phút"
                />
              </div>
            </div>

            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ngày thi (nhập chữ hiển thị)</label>
                <input
                  type="text"
                  value={examDateStr}
                  onChange={(e) => setExamDateStr(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                  placeholder="Ví dụ: 15/06/2026 hoặc ký tự ...."
                />
              </div>
              <div className="text-slate-500 text-[11px] leading-relaxed self-center pt-3 italic">
                * Mẹo: Nhấp vào nút "In danh sách thi" để mở trình xem in hệ thống. Trình duyệt sẽ tự động căn lề hoàn hảo theo đúng tiêu chuẩn trang A4 ngang/dọc, ẩn toàn bộ nút bấm ngoài lề cấu trúc.
              </div>
            </div>

            <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4 pb-2 border-t border-slate-200 pt-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nơi ký (địa điểm)</label>
                <input
                  type="text"
                  value={signatureLocation}
                  onChange={(e) => setSignatureLocation(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white font-medium"
                  placeholder="Ví dụ: Tp Hồ Chí Minh"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ngày ký</label>
                <input
                  type="text"
                  value={signatureDay}
                  onChange={(e) => setSignatureDay(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white font-mono text-center font-bold"
                  placeholder="Ví dụ: 31"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tháng ký</label>
                <input
                  type="text"
                  value={signatureMonth}
                  onChange={(e) => setSignatureMonth(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white font-mono text-center font-bold"
                  placeholder="Ví dụ: 05"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Năm ký</label>
                <input
                  type="text"
                  value={signatureYear}
                  onChange={(e) => setSignatureYear(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white font-mono text-center font-bold"
                  placeholder="Ví dụ: 2026"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 3. The Paper Sheet Layout Panel */}
      <div className="bg-white border border-slate-200 hover:border-slate-350 shadow-xl rounded-2xl p-6 md:p-10 select-none font-serif text-slate-950 relative print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
        
        {/* Dynamic Source Ledger Identification watermark (Hidden when printing) */}
        <div className="absolute top-4 right-6 text-slate-400 text-[10px] font-sans flex items-center gap-1.5 border border-slate-200 bg-slate-50 px-2 py-1.5 rounded-lg select-none print:hidden">
          <Info className="w-3.5 h-3.5 text-indigo-500" />
          <span>
            {viewMode === 'blank' ? (
              <span>Chế độ: <strong>In mẫu thô trống</strong> (Cột điểm thi & Ký tên để trống hoàn chỉnh cho thi thực tế)</span>
            ) : (
              <span>Chế độ: <strong>Điền sẵn điểm thi</strong> (Dữ liệu thi hiển thị từ bảng kết quả hệ thống)</span>
            )}
          </span>
        </div>

        {/* Vintage Educational Top Header Row */}
        <div className="text-left font-serif leading-tight">
          <p className="text-xs md:text-sm font-semibold tracking-wider uppercase">{schoolName}</p>
          <p className="text-xs md:text-sm font-extrabold tracking-wide uppercase underline decoration-double pt-1 underline-offset-[3px]">
            {departmentName}
          </p>
        </div>

        {/* Document centered core title */}
        <div className="text-center mt-7 mb-6 select-none">
          <h1 className="text-xl md:text-2xl font-bold tracking-wide text-black uppercase">
            DANH SÁCH HỌC SINH THI HẾT MÔN
          </h1>
        </div>

        {/* Two Columns metadata summary section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 font-serif py-3 text-[14px] leading-snug border-none">
          <div className="text-left space-y-1">
            <p className="flex items-baseline">
              <span className="font-semibold text-slate-800">Môn học/ Mô đun:</span>
              <span className="font-bold uppercase ml-1.5 underline underline-offset-2 decoration-stone-500">
                {classMetadata.subjectName}
              </span>
            </p>
            <p className="flex items-baseline">
              <span className="font-semibold text-slate-800">Lớp:</span>
              <span className="font-bold ml-1.5 uppercase">{classMetadata.className}</span>
            </p>
            <p className="flex items-baseline">
              <span className="font-semibold text-slate-800">Năm học:</span>
              <span className="font-bold ml-1.5">{classMetadata.schoolYear}</span>
            </p>
          </div>

          <div className="text-left md:text-right md:pr-4 space-y-1">
            <p className="flex items-baseline md:justify-end">
              <span className="font-semibold text-slate-805">Lần thi:</span>
              <span className="font-bold ml-1.5 font-sans text-xs">{examRound}</span>
            </p>
            <p className="flex items-baseline md:justify-end">
              <span className="font-semibold text-slate-800">Ngày thi:</span>
              <span className="font-bold ml-1.5 border-b border-dotted border-slate-700 font-sans text-xs px-2">{examDateStr}</span>
            </p>
            <p className="flex items-baseline md:justify-end">
              <span className="font-semibold text-slate-800">Thời gian thi:</span>
              <span className="font-bold ml-1.5">{examDuration === '....' ? '....' : `${examDuration} Phút`}</span>
            </p>
          </div>
        </div>

        {/* Ledger Grade Grid Table Sheet */}
        <div className="overflow-x-auto print:overflow-visible mt-5">
          <table className="w-full text-base border-collapse border-2 border-slate-800 bg-white font-serif leading-tight text-slate-900 print:text-[12px]">
            <thead>
              <tr className="bg-slate-100/40 text-black uppercase text-[11px] font-bold border-b-2 border-slate-800 text-center select-none">
                <th className="py-2.5 px-1 bg-amber-200/50 text-slate-950 font-sans border border-slate-800 w-10">
                  TT
                </th>
                <th className="py-2.5 px-1 bg-amber-200/50 text-slate-950 font-sans border border-slate-800 w-28">
                  Mã số HS/SV
                </th>
                <th 
                  className="py-2.5 px-3 bg-amber-200/50 text-slate-950 font-sans border border-slate-800 text-center min-w-[200px]" 
                  colSpan={2}
                >
                  Họ và Tên Học sinh
                </th>
                <th className="py-2 px-1.5 bg-amber-200/50 text-slate-950 font-sans border border-slate-800 text-center w-28 leading-snug">
                  Điểm trung bình Đ.Kỳ
                </th>
                <th className="py-2 px-1 bg-amber-200/50 text-slate-950 font-sans border border-slate-800 text-center w-24 leading-snug">
                  Vắng &gt;{bannedThresholdPercentage}% (x)
                </th>
                <th className="py-2 px-1 bg-amber-200/50 text-slate-950 font-sans border border-slate-800 text-center w-24 leading-snug">
                  Không được dự thi (x)
                </th>
                <th className="py-2 px-1 bg-amber-200/50 text-slate-950 font-sans border border-slate-800 text-center w-24">
                  Ký tên
                </th>
                <th className="py-2 px-1 bg-amber-200/50 text-slate-950 font-sans border border-slate-800 text-center w-24">
                  Điểm thi
                </th>
                <th className="py-2 px-2 bg-amber-200/50 text-slate-950 font-sans border border-slate-800 text-center min-w-[100px]">
                  Ghi chú
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400 italic font-serif">
                    Không tìm thấy sinh viên nào trong học phần này.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std, index) => {
                  const g = grades.find((gr) => gr.studentId === std.id) || {
                    studentId: std.id, l1: null, l2: null, l3: null, gv1: null, gv2: null, lan2: null, note: ''
                  };
                  
                  const stats = getStudentStats(std.id);
                  const periodicAverage = calculatePeriodicGradeAverage(g);
                  const isBanned = stats.bannedFromExam;

                  return (
                    <tr 
                      key={std.id}
                      className={`hover:bg-slate-50/50 transition-colors border-b border-slate-600 text-[13.5px] ${
                        isBanned ? 'bg-red-50/30' : ''
                      }`}
                    >
                      {/* 1. TT (Index) */}
                      <td className="py-2.5 text-center border-r border-slate-600 font-mono font-medium text-slate-700 w-10">
                        {index + 1}
                      </td>

                      {/* 2. Mã số HS/SV */}
                      <td className="py-2.5 text-center border-r border-slate-600 font-mono text-slate-800 font-medium">
                        {std.studentCode}
                      </td>

                      {/* 3. Họ và đệm */}
                      <td className="py-2.5 px-3 border-r border-slate-300 font-light text-slate-900 uppercase">
                        {std.lastName}
                      </td>

                      {/* 4. Tên */}
                      <td className="py-2.5 px-3 border-r border-slate-600 font-bold text-slate-950 uppercase">
                        {std.firstName}
                      </td>

                      {/* 5. Điểm trung bình Đ.Kỳ */}
                      <td className="py-2.5 text-center border-r border-slate-600 font-mono text-slate-850 font-bold bg-slate-50/10">
                        {periodicAverage !== null ? periodicAverage.toFixed(1) : ''}
                      </td>

                      {/* 6. Vắng >20% */}
                      <td className="py-2.5 text-center border-r border-slate-600 font-serif font-bold text-[14.5px] text-red-700">
                        {isBanned ? 'x' : ''}
                      </td>

                      {/* 7. Không được dự thi */}
                      <td className="py-2.5 text-center border-r border-slate-600 font-serif font-bold text-[14.5px] text-red-700 bg-red-100/10">
                        {isBanned ? (
                          <span className="font-extrabold text-red-700 uppercase" title="Bị cấm dự thi do nghỉ học quá nhiều">
                            x
                          </span>
                        ) : ''}
                      </td>

                      {/* 8. Ký tên (Chừa trống hoặc dấu hiệu nhạt) */}
                      <td className="py-2.5 text-center border-r border-slate-600 text-slate-350 italic text-[11px] font-sans">
                        {/* Always print empty for students, except maybe cross out if banned */}
                        {isBanned ? (
                          <span className="text-red-500 font-bold font-sans text-[10.5px]">Cấm thi</span>
                        ) : ''}
                      </td>

                      {/* 9. Điểm thi (Tùy chọn điền sẵn hoặc chừa trống) */}
                      <td className="py-2.5 text-center border-r border-slate-600 font-mono font-bold text-[14px]">
                        {isBanned ? (
                          <span className="text-red-500 font-semibold font-sans text-xs">0.0</span>
                        ) : (
                          viewMode === 'filled' && g.gv1 !== null ? g.gv1.toFixed(1) : ''
                        )}
                      </td>

                      {/* 10. Ghi chú */}
                      <td className="py-2.5 px-2 font-serif text-slate-800 text-xs">
                        {isBanned ? (
                          <span className="text-red-700 font-bold" title="Học viên vắng quá tỉ lệ quy định">
                            Nghỉ {stats.missedPercentage}% / cấm thi
                          </span>
                        ) : (
                          g.note || ''
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Aggregated candidate stats under sheet */}
        <div className="mt-5 space-y-1 font-serif text-slate-900 border-none leading-relaxed text-[13.5px]">
          <p className="flex items-center gap-1">
            <span className="font-bold">Tổng số học sinh đủ điều kiện kiểm tra:</span>
            <span className="font-extrabold text-large underline font-mono px-1 select-all">{eligibleCount}</span> Thí sinh
          </p>
          <p className="flex items-center gap-1 text-red-800/90">
            <span className="font-bold">Tổng số học sinh không đủ điều kiện kiểm tra:</span>
            <span className="font-extrabold text-large underline font-mono px-1 select-all">{ineligibleCount}</span> Thí sinh
          </p>
        </div>

        {/* Triple Signature Block at the base */}
        <div className="mt-10 pt-4 leading-snug font-serif text-slate-900 select-none">
          <div className="flex justify-end pr-5 text-center text-xs italic text-stone-600 pb-3 font-serif md:text-sm">
            <span>{signatureLocation}, ngày {signatureDay} tháng {signatureMonth} năm {signatureYear}</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center text-[13.5px] font-bold">
            {/* Column 1: KHOA */}
            <div className="space-y-1">
              <h3>KHOA KTNV</h3>
              <p className="italic text-xs text-stone-500 font-normal font-serif">(Ký và ghi rõ họ tên)</p>
              <div className="h-20 flex items-center justify-center"></div>
              <p className="font-semibold text-stone-400 font-sans text-[10px] invisible">Khoa ký duyệt</p>
            </div>

            {/* Column 2: GIÁO VIÊN 2 */}
            <div className="space-y-1">
              <h3>GIÁO VIÊN 2</h3>
              <p className="italic text-xs text-stone-500 font-normal font-serif">(Ký và ghi rõ họ tên)</p>
              <div className="h-20 flex items-center justify-center"></div>
              <p className="font-semibold text-stone-400 font-sans text-[10px] invisible">Giám khảo 2</p>
            </div>

            {/* Column 3: GIÁO VIÊN 1 */}
            <div className="space-y-1">
              <h3>GIÁO VIÊN 1</h3>
              <p className="italic text-xs text-stone-500 font-normal font-serif">(Ký và ghi rõ họ tên)</p>
              <div className="h-20 flex items-center justify-center">
                <span className="italic font-mono text-[10.5px] tracking-wide text-indigo-400/70 select-none">Electronic Ledger System</span>
              </div>
              <p className="font-extrabold text-[14px] uppercase pt-1 border-stone-250 tracking-wide border-t border-dashed w-3/4 mx-auto">
                {classMetadata.teacherName || 'Chưa cập nhật'}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Retro user-tip overlay visible in dynamic app preview */}
      <div className="mt-5 p-4 border border-indigo-150 bg-indigo-50/50 rounded-2xl flex items-start gap-3 text-xs leading-relaxed text-indigo-900 print:hidden font-sans">
        <HelpCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-extrabold text-indigo-950">Tính năng Phục vụ Thi và In ấn Thông minh:</p>
          <p>
            Bảng danh sách thi tự động liên kết điểm kiểm tra định kỳ ĐTB Đ.Kỳ từ trang <strong>Bảng ghi điểm/Kết quả</strong>. Đồng thời, dựa trên tổng số buổi học và số bài vắng mặt ghi nhận trong trang <strong>Điểm danh</strong>, hệ thống tự động tính tỷ lệ nghỉ của từng sinh viên. Những sinh viên có số tiết vắng vượt quá <strong>{bannedThresholdPercentage}%</strong> sẽ lập tức được đánh dấu chéo <strong>(x) cấm thi</strong>. 
          </p>
        </div>
      </div>

    </motion.div>
  );
}
