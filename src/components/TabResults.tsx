/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Student, Grade, ClassMetadata } from '../types';
import {
  calculatePeriodicGradeAverage,
  calculateExamGradeAverage,
  calculateFinalGrade,
  roundTo1Decimal
} from '../utils/database';
import {
  Search,
  Plus,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle,
  Award,
  CheckCircle2,
  HelpCircle,
  Printer
} from 'lucide-react';

interface TabResultsProps {
  students: Student[];
  grades: Grade[];
  classMetadata: ClassMetadata;
  onUpdateGrade: (studentId: string, updatedFields: Partial<Grade>) => void;
}

// Keep track of which cell is actively being edited
function VerticalUprightText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={`vertical-upright-text font-bold font-serif select-none ${className}`}>
      {text}
    </span>
  );
}

interface ActiveCell {
  studentId: string;
  field: 'l1' | 'l2' | 'l3' | 'gv1' | 'gv2' | 'lan2' | 'note' | 'studentCode' | 'lastName' | 'firstName';
}

export default function TabResults({
  students,
  grades,
  classMetadata,
  onUpdateGrade
}: TabResultsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [editValue, setEditValue] = useState('');

  // Sorter
  const [sortBy, setSortBy] = useState<'studentCode' | 'firstName' | 'finalScore' | 'none'>('none');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Handler to start cell edit
  const startEditing = (studentId: string, field: ActiveCell['field'], currentValue: string | number | null) => {
    setActiveCell({ studentId, field });
    setEditValue(currentValue === null ? '' : String(currentValue));
  };

  // Handler to save cell edit
  const saveEditing = (studentId: string, field: ActiveCell['field']) => {
    if (!activeCell) return;

    const trimmedValue = editValue.trim();

    if (field === 'studentCode' || field === 'lastName' || field === 'firstName') {
      // In this version, we directly edit student variables inside the parent's logic if needed.
      // But let's delegate or handle it gracefully, or focus strictly on grade and metadata values.
    } else {
      if (field === 'note') {
        onUpdateGrade(studentId, { note: trimmedValue });
      } else {
        if (trimmedValue === '') {
          onUpdateGrade(studentId, { [field]: null });
        } else {
          // Parse as number
          const parsed = parseFloat(trimmedValue);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 10) {
            onUpdateGrade(studentId, { [field]: parsed });
          } else {
            alert('Điểm số phải nằm trong khoảng từ 0.0 đến 10.0');
          }
        }
      }
    }
    setActiveCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, studentId: string, field: ActiveCell['field']) => {
    if (e.key === 'Enter') {
      saveEditing(studentId, field);
    } else if (e.key === 'Escape') {
      setActiveCell(null);
    }
  };

  // Filter students based on search term (ID, firstName or lastName)
  const filteredStudents = students.filter(s => {
    const fullName = `${s.lastName} ${s.firstName}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    return s.studentCode.toLowerCase().includes(searchLower) || fullName.includes(searchLower);
  });

  // Calculate scores and attach to objects for sorting
  const studentsWithPoints = filteredStudents.map((std) => {
    const grade = grades.find(g => g.studentId === std.id) || {
      studentId: std.id, l1: null, l2: null, l3: null, gv1: null, gv2: null, lan2: null, note: ''
    };
    const periodicAvg = calculatePeriodicGradeAverage(grade);
    const examAvg = calculateExamGradeAverage(grade);
    const finalScore = calculateFinalGrade(grade);

    return {
      student: std,
      grade,
      periodicAvg,
      examAvg,
      finalScore
    };
  });

  // Sort students
  if (sortBy === 'studentCode') {
    studentsWithPoints.sort((a, b) => {
      const cmp = a.student.studentCode.localeCompare(b.student.studentCode);
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  } else if (sortBy === 'firstName') {
    studentsWithPoints.sort((a, b) => {
      const cmp = a.student.firstName.localeCompare(b.student.firstName, 'vi');
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  } else if (sortBy === 'finalScore') {
    studentsWithPoints.sort((a, b) => {
      const scoreA = a.finalScore ?? -1;
      const scoreB = b.finalScore ?? -1;
      return sortOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
    });
  }

  const toggleSort = (field: 'studentCode' | 'firstName' | 'finalScore') => {
    if (sortBy === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortBy('none');
      }
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Quantitative Stats for Dashboard Top Cards
  const gradedStudents = studentsWithPoints.filter(s => s.finalScore !== null);
  const classAvgSum = gradedStudents.reduce((acc, curr) => acc + (curr.finalScore || 0), 0);
  const classAverage = gradedStudents.length ? roundTo1Decimal(classAvgSum / gradedStudents.length) : null;

  const passedCount = studentsWithPoints.filter(s => s.finalScore !== null && s.finalScore >= 5.0).length;
  const passPercent = students.length ? Math.round((passedCount / students.length) * 100) : 0;

  const failsCount = studentsWithPoints.filter(s => s.finalScore !== null && s.finalScore < 5.0).length;
  const learningAgainCount = studentsWithPoints.filter(s => s.grade.note.includes('Học lại') || (s.finalScore !== null && s.finalScore < 5.0)).length;

  const exportCSV = () => {
    // Build beautiful multi-line headers matching original paper sheet
    const list: any[][] = [
      ["SỞ LAO ĐỘNG - THƯƠNG BINH VÀ XÃ HỘI TP. HỒ CHÍ MINH"],
      [classMetadata.managingSchool || classMetadata.schoolName || "TRƯỜNG TC KTNV TÔN ĐỨC THẮNG"],
      ["KHOA: " + (classMetadata.occupation || "CÔNG NGHỆ THÔNG TIN").toUpperCase()],
      [],
      ["KẾT QUẢ HỌC TẬP MÔN HỌC / MÔ-ĐUN HỌC PHẦN"],
      ["MÔN HỌC/MÔ-ĐUN: " + classMetadata.subjectName.toUpperCase(), "", "", "", "", "", "", "LỚP: " + classMetadata.className.toUpperCase()],
      ["Năm học: " + classMetadata.schoolYear, "", "", "", "", "", "", "Học kỳ: " + classMetadata.semester],
      ["Giảng viên giảng dạy: " + (classMetadata.teacherName || classMetadata.formTeacher || ""), "", "", "", "", "", "", "Sĩ số: " + (classMetadata.classSize || students.length)],
      [],
      [
        "Số TT",
        "Mã Số HS",
        "Họ và tên học sinh / sinh viên",
        "",
        "Điểm kiểm tra định kỳ MH / MĐ",
        "",
        "",
        "",
        "Điểm Thi",
        "",
        "",
        "",
        "MH-MĐ Điểm T/kết",
        "Ghi chú"
      ],
      [
        "",
        "",
        "Họ và đệm",
        "Tên",
        "Lần 1",
        "Lần 2",
        "Lần 3",
        "ĐTB",
        "GV 1",
        "GV 2",
        "Lần 2 (x)",
        "ĐTB",
        "",
        ""
      ]
    ];

    // Data rows
    studentsWithPoints.forEach((s, idx) => {
      const p = s.grade;
      const isHocLai = p.note?.toLowerCase().includes('học lại') || p.note?.toLowerCase().includes('học mới');
      const displayFinal = isHocLai ? "" : (s.finalScore !== null ? s.finalScore : "");
      
      list.push([
        idx + 1,
        s.student.studentCode,
        s.student.lastName,
        s.student.firstName,
        p.l1 ?? "",
        p.l2 ?? "",
        p.l3 ?? "",
        s.periodicAvg ?? "",
        p.gv1 ?? "",
        p.gv2 ?? "",
        p.lan2 ?? "",
        s.examAvg ?? "",
        displayFinal,
        p.note ?? ""
      ]);
    });

    // Add summary statistics at the bottom
    list.push([]);
    list.push(["THỐNG KÊ CHUNG:"]);
    list.push(["Sĩ số danh sách:", classMetadata.classSize || students.length, "Học viên"]);
    list.push(["Số lượng đạt (>= 5.0):", passedCount, "Học viên", `Tỷ lệ: ${passPercent}%`]);
    list.push(["Chưa đạt hoặc học lại:", failsCount, "Học viên"]);
    list.push(["Điểm trung bình học phần:", classAverage ?? "Chưa đánh giá"]);

    // Create Worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(list);

    // Merge cells for headers & title
    const merges = [
      // Title Row
      { s: { r: 4, c: 0 }, e: { r: 4, c: 13 } },
      
      // Header merges (row 9 & 10 are indices 9 & 10)
      // "Số TT" (Row 9-10, Col 0)
      { s: { r: 9, c: 0 }, e: { r: 10, c: 0 } },
      // "Mã Số HS" (Row 9-10, Col 1)
      { s: { r: 9, c: 1 }, e: { r: 10, c: 1 } },
      // "Họ và tên" (Row 9, Col 2-3) -> merged horizontally first
      { s: { r: 9, c: 2 }, e: { r: 9, c: 3 } },
      // "Điểm kiểm tra" (Row 9, Col 4-7)
      { s: { r: 9, c: 4 }, e: { r: 9, c: 7 } },
      // "Điểm Thi" (Row 9, Col 8-11)
      { s: { r: 9, c: 8 }, e: { r: 9, c: 11 } },
      // "MH-MĐ Điểm T/kết" (Row 9-10, Col 12)
      { s: { r: 9, c: 12 }, e: { r: 10, c: 12 } },
      // "Ghi chú" (Row 9-10, Col 13)
      { s: { r: 9, c: 13 }, e: { r: 10, c: 13 } }
    ];

    worksheet['!merges'] = merges;

    // Define column widths for beautiful layout
    const cols = [
      { wch: 6 },  // STT
      { wch: 14 }, // Mã Số
      { wch: 22 }, // Họ đệm
      { wch: 10 }, // Tên
      { wch: 7 },  // L1
      { wch: 7 },  // L2
      { wch: 7 },  // L3
      { wch: 8 },  // ĐTB Định Kỳ
      { wch: 7 },  // GV1
      { wch: 7 },  // GV2
      { wch: 10 }, // Thi L2
      { wch: 8 },  // ĐTB Thi
      { wch: 15 }, // Điểm Tổng Kết
      { wch: 20 }  // Ghi chú
    ];
    worksheet['!cols'] = cols;

    // Build workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kết Quả Học Tập");

    // Write file natively in Excel binary format (.xlsx)
    XLSX.writeFile(workbook, `Bang_diem_Lop_${classMetadata.className}_${classMetadata.subjectName.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 print:p-0 print:space-y-0 print:max-w-full print-portrait">
      
      {/* Mini Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {/* Card 1: Class Average */}
        <div className="bg-white border border-slate-205 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">ĐTB Cả Lớp</p>
            <p className="text-3xl font-display font-bold text-slate-900 mt-1">
              {classAverage !== null ? `${classAverage}` : '--'}
            </p>
            <p className="text-slate-400 text-[10px] mt-1">Tính theo (Periodic * 0.4 + Exam * 0.6)</p>
          </div>
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
            <RefreshCw className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Pass rate */}
        <div className="bg-white border border-slate-205 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Tỉ lệ Đạt (≥5.0)</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-display font-bold text-emerald-600">{passPercent}%</p>
              <p className="text-slate-500 text-xs">({passedCount}/{students.length} đạt)</p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${passPercent}%` }}></div>
            </div>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Remedial students count */}
        <div className="bg-white border border-slate-205 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Số SVS vắng/Học lại</p>
            <p className="text-3xl font-display font-bold text-amber-500 mt-1">
              {learningAgainCount} SV
            </p>
            <p className="text-slate-400 text-[10px] mt-1">SV có Điểm TK &lt; 5.0 hoặc ghi chú Học lại</p>
          </div>
          <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Top academic score */}
        <div className="bg-white border border-slate-205 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Sinh viên Xuất Sắc</p>
            <p className="text-3xl font-display font-bold text-rose-500 mt-1">
              {studentsWithPoints.filter(s => s.finalScore !== null && s.finalScore >= 8.5).length} SV
            </p>
            <p className="text-slate-400 text-[10px] mt-1">SV có Điểm Tổng Kết đạt mức Giỏi (≥ 8.5)</p>
          </div>
          <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Spreadsheet Operations Panel */}
      <div className="bg-white rounded-xl border border-slate-205 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between select-none print:hidden">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-450" />
            <input
              type="text"
              placeholder="Tìm kiếm SV (Mã số, Tên)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Sorting information & Actions */}
        <div className="flex flex-wrap items-center gap-2 justify-end w-full md:w-auto">
          <div className="flex bg-slate-50 border border-slate-200 rounded-lg p-0.5 text-[11px]">
            <button
              onClick={() => toggleSort('studentCode')}
              className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                sortBy === 'studentCode' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mã số {sortBy === 'studentCode' && (sortOrder === 'asc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => toggleSort('firstName')}
              className={`px-2.5 py-1 rounded-md font-semibold transition border-l border-slate-200 cursor-pointer ${
                sortBy === 'firstName' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tên {sortBy === 'firstName' && (sortOrder === 'asc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => toggleSort('finalScore')}
              className={`px-2.5 py-1 rounded-md font-semibold transition border-l border-slate-200 cursor-pointer ${
                sortBy === 'finalScore' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Điểm TK {sortBy === 'finalScore' && (sortOrder === 'asc' ? '↓' : '↑')}
            </button>
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg bg-white border border-slate-250 text-slate-700 hover:bg-slate-50 text-[11px] font-semibold transition cursor-pointer shadow-xs"
            title="Xuất bảng điểm ra file Excel (.XLSX) đầy đủ định dạng cột dòng và tiêu đề"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Xuất (.xlsx)
          </button>

          <button
            onClick={() => { window.focus(); window.print(); }}
            className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition cursor-pointer shadow-xs"
            title="In bảng điểm khổ A4 đứng hoàn mỹ"
          >
            <Printer className="w-3.5 h-3.5" />
            In (A4)
          </button>
        </div>
      </div>

      {/* Physical Paper-Style Printed Ledger Card */}
      <div className="bg-white border-2 border-slate-300 rounded-[16px] shadow-lg pt-8 pb-10 px-6 sm:px-10 max-w-7xl mx-auto print:border-none print:shadow-none print:p-0 print:bg-white">
        
        {/* Ledger Header Title Layout representing original roster exactly */}
        <div className="pb-5 mx-auto select-none font-serif">
          <h1 className="text-[26px] sm:text-[32px] font-bold tracking-wide text-slate-950 uppercase font-serif text-center leading-normal">
            KẾT QUẢ HỌC TẬP
          </h1>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-6 gap-3 text-slate-950 text-[14px] md:text-[15px] font-serif">
            <div className="text-left py-1 uppercase tracking-wide leading-none font-bold">
              MÔN HỌC/MÔ-ĐUN: <span className="font-bold ml-1 uppercase">{classMetadata.subjectName}</span>
            </div>
            <div className="text-right py-1 uppercase tracking-wide leading-none font-bold self-start sm:self-auto">
              LỚP: <span className="font-bold ml-1">{classMetadata.className}</span>
            </div>
          </div>
        </div>

        {/* Editable Spreadsheet Table Ledger */}
        <div className="overflow-x-auto relative print:overflow-visible">
          <table className="w-full text-sm border-collapse border-2 border-slate-950 select-none bg-white font-serif">
            <thead>
              <tr className="bg-white text-slate-950 border-b border-slate-950 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-2.5 px-1 w-11 border-r border-b border-slate-950 text-center font-serif" rowSpan={2}>
                  <VerticalUprightText text="Số TT" className="text-slate-950 text-[9px] font-bold" />
                </th>
                <th className="py-2.5 px-1 w-12 border-r border-b border-slate-950 text-center font-serif" rowSpan={2}>
                  <VerticalUprightText text="Mã Số HS" className="text-slate-950 text-[9px] font-bold" />
                </th>
                <th className="py-2.5 px-4 h-14 border-r border-b border-slate-950 text-center w-80 text-slate-950 font-serif" colSpan={2} rowSpan={2}>
                  Họ Và Tên<br />
                  học Sinh / Sinh Viên
                </th>
                <th className="py-1 text-center border-b border-r border-slate-950 text-slate-950 text-[10px] font-bold font-serif" colSpan={4}>
                  Điểm kiểm tra<br />định kỳ MH / MĐ
                </th>
                <th className="py-1 text-center border-b border-r border-slate-950 text-slate-950 text-[10px] font-bold font-serif" colSpan={4}>
                  Điểm Thi
                </th>
                <th className="py-2 px-1 w-20 border-r border-b border-slate-950 text-center select-none relative font-serif" rowSpan={2}>
                  <div className="flex flex-row items-center justify-center gap-1.5 font-serif">
                    <VerticalUprightText text="MH-MĐ" className="text-slate-950 font-bold text-[9px]" />
                    <VerticalUprightText text="Điểm T/kết" className="text-slate-950 font-bold text-[9px]" />
                  </div>
                </th>
                <th className="py-2 px-3 border-r border-b border-slate-950 text-center font-bold text-[10px] leading-tight font-serif" rowSpan={2}>
                  Ghi<br />chú
                </th>

              </tr>
              <tr className="bg-white text-slate-950 uppercase text-[9px] font-bold border-b border-slate-950 h-7 font-serif">
                {/* Periodic metrics */}
                <th className="py-1 px-1 text-center w-11 border-r border-slate-950 font-serif font-semibold">L1</th>
                <th className="py-1 px-1 text-center w-11 border-r border-slate-950 font-serif font-semibold">L2</th>
                <th className="py-1 px-1 text-center w-11 border-r border-slate-950 font-serif font-semibold">L3</th>
                <th className="py-1 px-1 text-center w-12 border-r border-slate-950 text-slate-950 font-serif font-bold">ĐTB</th>

                {/* Exam metrics */}
                <th className="py-1 px-0.5 text-center w-11 border-r border-slate-950 font-serif font-semibold whitespace-nowrap">GV 1</th>
                <th className="py-1 px-0.5 text-center w-11 border-r border-slate-950 font-serif font-semibold whitespace-nowrap">GV 2</th>
                <th className="py-1 px-0.5 text-center w-13 border-r border-slate-950 font-serif font-semibold relative leading-tight">
                  Lần 2<br />(x)
                </th>
                <th className="py-1 px-1 text-center w-12 border-r border-slate-950 text-slate-950 font-serif font-bold relative">
                  ĐTB
                </th>
              </tr>
            </thead>
            <tbody>
              {studentsWithPoints.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400 font-sans border border-slate-950">
                    Không tìm thấy sinh viên nào phù hợp với từ khóa tìm kiếm.
                  </td>
                </tr>
              ) : (
                studentsWithPoints.map(({ student, grade, periodicAvg, examAvg, finalScore }, index) => {
                  const isHocLai = grade.note?.toLowerCase().includes('học lại') || grade.note?.toLowerCase().includes('học mới');
                  const isFail = finalScore !== null && finalScore < 5.0 && !isHocLai;
                  
                  // Color rows representing 'Học lại' standard red ink text dynamically
                  const rowTextColor = isHocLai 
                    ? 'text-red-600 font-medium' 
                    : isFail 
                      ? 'text-amber-750 font-medium' 
                      : 'text-slate-900';

                  const displayFinal = isHocLai || finalScore === null ? '' : finalScore.toFixed(1);

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50 h-10 transition-colors border-b border-slate-950`}
                    >
                      {/* index */}
                      <td className="py-1.5 px-1 text-center font-serif text-[12.5px] text-slate-950 font-semibold border-r border-slate-950">
                        {index + 1}
                      </td>

                      {/* Code */}
                      <td className="py-1.5 px-3 text-center font-serif text-[12.5px] border-r border-slate-950 text-slate-950">
                        {student.studentCode}
                      </td>

                      {/* LastName */}
                      <td className={`py-1.5 px-3 text-left font-serif text-[13px] uppercase truncate max-w-[200px] ${rowTextColor}`}>
                        {student.lastName}
                      </td>

                      {/* FirstName */}
                      <td className={`py-1.5 px-3 text-right pr-6 font-serif text-[13px] uppercase border-r border-slate-950 font-bold ${
                        isHocLai ? 'text-red-600 font-extrabold' : 'text-slate-900'
                      }`}>
                        {student.firstName}
                      </td>

                      {/* Periodic Grades columns (L1, L2, L3) */}
                      {['l1', 'l2', 'l3'].map((fd) => {
                        const field = fd as 'l1' | 'l2' | 'l3';
                        const currentVal = grade[field];
                        const isEditing = activeCell?.studentId === student.id && activeCell?.field === field;

                        return (
                          <td
                            key={field}
                            onDoubleClick={() => startEditing(student.id, field, currentVal)}
                            className={`py-1.5 px-1 text-center border-r border-slate-950 font-serif text-[12.5px] cursor-pointer select-all transition-all duration-150 relative w-11 ${
                              isEditing ? 'bg-indigo-50 shadow-inner' : 'hover:bg-indigo-50/30'
                            } ${isHocLai ? 'text-red-600 font-semibold' : 'text-slate-800'}`}
                            title="Bấm đúp chuột để chỉnh sửa"
                          >
                            {isEditing ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveEditing(student.id, field)}
                                onKeyDown={(e) => handleKeyDown(e, student.id, field)}
                                autoFocus
                                className="absolute inset-0 w-full h-full text-center bg-white border border-indigo-500 shadow-md focus:outline-none font-serif text-[12.5px] z-10"
                                placeholder="..."
                              />
                            ) : (
                              currentVal !== null ? currentVal.toFixed(1) : ''
                            )}
                          </td>
                        );
                      })}

                      {/* Periodic Average ĐTB (Periodic Auto Calc) */}
                      <td className={`py-1.5 px-1.5 text-center font-serif text-[12.5px] border-r border-slate-950 w-12 ${
                        isHocLai ? 'text-red-600 font-bold' : 'text-slate-950'
                      }`}>
                        {periodicAvg !== null ? periodicAvg.toFixed(1) : ''}
                      </td>

                      {/* Exam Grades columns (GV1, GV2, Lần 2) */}
                      {['gv1', 'gv2', 'lan2'].map((fd) => {
                        const field = fd as 'gv1' | 'gv2' | 'lan2';
                        const currentVal = grade[field];
                        const isEditing = activeCell?.studentId === student.id && activeCell?.field === field;

                        return (
                          <td
                            key={field}
                            onDoubleClick={() => startEditing(student.id, field, currentVal)}
                            className={`py-1.5 px-1 text-center border-r border-slate-950 font-serif text-[12.5px] cursor-pointer select-all transition-all duration-150 relative w-11 ${
                              isEditing ? 'bg-indigo-50 shadow-inner' : 'hover:bg-indigo-50/30'
                            } ${isHocLai ? 'text-red-600 font-semibold' : 'text-slate-800'}`}
                            title="Bấm đúp chuột để chỉnh sửa"
                          >
                            {isEditing ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveEditing(student.id, field)}
                                onKeyDown={(e) => handleKeyDown(e, student.id, field)}
                                autoFocus
                                className="absolute inset-0 w-full h-full text-center bg-white border border-indigo-500 shadow-md focus:outline-none font-serif text-[12.5px] z-10"
                                placeholder="..."
                              />
                            ) : (
                              currentVal !== null ? currentVal.toFixed(1) : ''
                            )}
                          </td>
                        );
                      })}

                      {/* Exam Average DD (Exam Auto Calc) */}
                      <td className={`py-1.5 px-1.5 text-center font-serif text-[12.5px] border-r border-slate-950 w-12 relative ${
                        isHocLai ? 'text-red-600 font-bold' : 'text-slate-950'
                      }`}>
                        {examAvg !== null ? examAvg.toFixed(1) : ''}
                      </td>

                      {/* Final Course Score (Formula: CK Avg * 0.4 + Exam * 0.6) */}
                      <td className={`py-1.5 px-2 text-center font-serif font-extrabold text-[13px] border-r border-slate-950 w-24 relative ${
                        isHocLai ? 'text-red-600' : 'text-slate-950 text-sm font-bold'
                      }`}>
                        {displayFinal}
                      </td>

                      {/* Notes (Editable text field) */}
                      {(() => {
                        const isEditingNote = activeCell?.studentId === student.id && activeCell?.field === 'note';
                        return (
                          <td
                            onDoubleClick={() => startEditing(student.id, 'note', grade.note)}
                            className={`py-1.5 px-3 border-r border-slate-950 text-xs text-slate-950 font-semibold relative cursor-pointer min-w-[125px] max-w-[200px] truncate ${
                              isEditingNote ? 'bg-indigo-50' : 'hover:bg-indigo-50/10'
                            }`}
                            title="Bấm đúp chuột để nhập Ghi chú"
                          >
                            {isEditingNote ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveEditing(student.id, 'note')}
                                onKeyDown={(e) => handleKeyDown(e, student.id, 'note')}
                                autoFocus
                                className="absolute inset-0 w-full h-full px-2 bg-white border border-indigo-500 shadow-md focus:outline-none text-xs z-10 font-sans"
                                placeholder="..."
                              />
                            ) : (
                              grade.note || ''
                            )}
                          </td>
                        );
                      })()}


                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Double click instruction info banner in ledger style */}
        <div className="mt-5 p-3.5 bg-slate-50 border border-slate-205 rounded-xl text-slate-700 text-xs flex items-center gap-2 select-none">
          <HelpCircle className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <span>Mẹo Sổ sách: Nhấn <strong>đúp chuột (double-click)</strong> vào bất kỳ ô điểm hay ghi chú nào để sửa trực tiếp. Điểm tổng kết tự động tính theo công thức quy chuẩn Giáo dục.</span>
        </div>
      </div>
    </div>
  );
}
