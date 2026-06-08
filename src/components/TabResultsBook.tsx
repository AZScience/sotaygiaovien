/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  Printer,
  FileSpreadsheet,
  HelpCircle,
  Calendar,
  Save,
  CheckCircle,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface TabResultsBookProps {
  students: Student[];
  grades: Grade[];
  classMetadata: ClassMetadata;
}

export default function TabResultsBook({
  students,
  grades,
  classMetadata
}: TabResultsBookProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter students based on search term (ID, firstName or lastName)
  const filteredStudents = students.filter(s => {
    const fullName = `${s.lastName} ${s.firstName}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    return s.studentCode.toLowerCase().includes(searchLower) || fullName.includes(searchLower);
  });

  // Print function
  const handlePrint = () => {
    window.focus();
    window.print();
  };

  // Export to Excel / CSV function
  const exportCSV = () => {
    const list: any[][] = [
      ["SỞ LAO ĐỘNG - THƯƠNG BINH VÀ XÃ HỘI TP. HỒ CHÍ MINH"],
      [classMetadata.managingSchool || classMetadata.schoolName || "TRƯỜNG TC KTNV TÔN ĐỨC THẮNG"],
      ["KHOA: " + (classMetadata.occupation || "CÔNG NGHỆ THÔNG TIN").toUpperCase()],
      [],
      ["BẢNG GHI ĐIỂM SỔ LÊN LỚP"],
      ["MÔN HỌC/MÔ-ĐUN: " + classMetadata.subjectName.toUpperCase(), "", "", "", "LỚP: " + classMetadata.className.toUpperCase()],
      ["Năm học: " + classMetadata.schoolYear, "", "", "", "Học kỳ: " + classMetadata.semester],
      [],
      [
        "TT",
        "HỌ VÀ TÊN SINH VIÊN",
        "",
        "NGÀY KIỂM TRA",
        "",
        "",
        "Điểm trung bình thi",
        "Điểm tổng kết MH/MĐ",
        "Ghi chú"
      ],
      [
        "",
        "",
        "Họ và đệm",
        "Tên",
        "Cột 1",
        "Cột 2",
        "Cột 3",
        "",
        "",
        ""
      ]
    ];

    filteredStudents.forEach((std, idx) => {
      const grade = grades.find(g => g.studentId === std.id) || {
        studentId: std.id, l1: null, l2: null, l3: null, gv1: null, gv2: null, lan2: null, note: ''
      };
      
      const examAvg = calculateExamGradeAverage(grade);
      const isFail = grade.note.includes('Học lại');
      const finalScore = isFail ? null : calculateFinalGrade(grade);

      list.push([
        idx + 1,
        std.lastName,
        std.firstName,
        grade.l1 ?? '',
        grade.l2 ?? '',
        grade.l3 ?? '',
        examAvg ?? '',
        finalScore ?? '',
        grade.note ?? ''
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(list);

    // Merge titles and dual headers
    const merges = [
      // Title Row
      { s: { r: 4, c: 0 }, e: { r: 4, c: 8 } },
      
      // Dual Row Table Headers (Row 8 & 10 are index 8 & 9)
      // TT
      { s: { r: 8, c: 0 }, e: { r: 9, c: 0 } },
      // HỌ VÀ TÊN SINH VIÊN (merged Horizontally first on Row 8)
      { s: { r: 8, c: 1 }, e: { r: 8, c: 2 } },
      // NGÀY KIỂM TRA (merged across Cột 1, 2, 3)
      { s: { r: 8, c: 3 }, e: { r: 8, c: 5 } },
      // Điểm trung bình thi
      { s: { r: 8, c: 6 }, e: { r: 9, c: 6 } },
      // Điểm tổng kết MH/MĐ
      { s: { r: 8, c: 7 }, e: { r: 9, c: 7 } },
      // Ghi chú
      { s: { r: 8, c: 8 }, e: { r: 9, c: 8 } }
    ];

    worksheet['!merges'] = merges;

    // Col widths
    const cols = [
      { wch: 6 },  // TT
      { wch: 22 }, // Họ đệm
      { wch: 10 }, // Tên
      { wch: 10 }, // Cột 1
      { wch: 10 }, // Cột 2
      { wch: 10 }, // Cột 3
      { wch: 22 }, // Điểm trung bình thi
      { wch: 22 }, // Điểm tổng kết MH/MĐ
      { wch: 20 }  // Ghi chú
    ];
    worksheet['!cols'] = cols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sổ lên lớp");

    XLSX.writeFile(workbook, `So_Len_Lop_Lop_${classMetadata.className}_${classMetadata.subjectName.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 print:p-0 print:space-y-0 print:max-w-full print-portrait">
      
      {/* Search and Toolbar (Hidden when printing) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col md:flex-row gap-4 items-center justify-between print:hidden">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm SV (Mã số, Họ tên lót, Tên)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            In (A4)
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
            title="Xuất bảng điểm ra file Excel (.XLSX) đầy đủ định dạng cột dòng và tiêu đề"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Xuất (.xlsx)
          </button>
        </div>
      </div>

      {/* Main Paper Sheet styled block */}
      <div className="bg-white border border-slate-300 shadow-lg rounded-xl overflow-hidden p-6 md:p-10 select-none print:shadow-none print:border-none print:p-0 print:bg-white relative">
        
        {/* Printable page layout header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-serif font-extrabold text-black uppercase tracking-wide leading-tight">
            BẢNG GHI ĐIỂM
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 text-sm md:text-base font-serif font-semibold text-slate-900 border-b border-stone-300 pb-4 print:text-xs">
            <div className="text-left flex items-baseline gap-1">
              <span>MÔN HỌC/MÔ-ĐUN:</span>
              <span className="font-bold underline uppercase">{classMetadata.subjectName}</span>
            </div>
            <div className="text-left md:text-right flex items-baseline md:justify-end gap-1">
              <span>LỚP:</span>
              <span className="font-bold underline">{classMetadata.className}</span>
            </div>
          </div>
        </div>

        {/* Ledger grid table */}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-base font-serif border-collapse border border-black print:text-[11px] leading-snug">
            <thead>
              {/* Row 1 Header */}
              <tr className="bg-white text-black font-semibold text-center border-b border-black">
                <th className="py-2.5 px-1.5 w-12 text-center border-r border-black" colSpan={1} rowSpan={2}>
                  TT
                </th>
                <th className="py-2.5 px-4 text-center border-r border-black" colSpan={2} rowSpan={2}>
                  HỌ VÀ TÊN SINH VIÊN
                </th>
                <th className="py-1 px-1 border-r border-black" colSpan={3} rowSpan={1}>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-black uppercase font-bold text-xs tracking-wider">NGÀY KIỂM TRA</span>
                  </div>
                </th>
                <th className="py-2 px-3 w-28 text-center border-r border-black font-semibold" colSpan={1} rowSpan={2}>
                  Điểm trung bình thi
                </th>
                <th className="py-2 px-3 w-28 text-center border-r border-black font-semibold" colSpan={1} rowSpan={2}>
                  Điểm tổng kết MH/MĐ
                </th>
                <th className="py-2 px-4 text-left font-semibold" colSpan={1} rowSpan={2}>
                  Ghi chú
                </th>
              </tr>

              {/* Row 2 Header: Covers the 3 columns under NGÀY KIỂM TRA */}
              <tr className="bg-white text-black text-center border-b border-black">
                <th className="py-1.5 px-1 bg-white border-r border-black text-center font-bold text-xs uppercase tracking-tight" colSpan={3}>
                  Điểm kiểm tra định kỳ Môn học/Mô-đun
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500 font-serif italic">
                    Không tìm thấy sinh viên nào.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std, index) => {
                  const grade = grades.find(g => g.studentId === std.id) || {
                    studentId: std.id, l1: null, l2: null, l3: null, gv1: null, gv2: null, lan2: null, note: ''
                  };

                  const examAvg = calculateExamGradeAverage(grade);
                  
                  // Rules: If a student is fails/marked "Học lại", the final total score is left blank
                  const isFail = grade.note.toLowerCase().includes('học lại');
                  const finalScore = isFail ? null : calculateFinalGrade(grade);

                  return (
                    <tr
                      key={std.id}
                      className={`hover:bg-slate-50/50 border-b border-black transition-colors ${
                        isFail ? 'bg-red-50/10' : ''
                      }`}
                    >
                      {/* TT (STT) */}
                      <td className="py-2.5 px-2 text-center text-black border-r border-black">
                        {index + 1}
                      </td>

                      {/* Họ và tên đệm */}
                      <td className="py-2.5 px-4 text-black border-r border-black min-w-[150px] uppercase font-light">
                        {std.lastName}
                      </td>

                      {/* Tên */}
                      <td className="py-2.5 px-3 text-black border-r border-black w-24 font-bold uppercase">
                        {std.firstName}
                      </td>

                      {/* Periodic test scores columns matching L1, L2, L3 */}
                      {['l1', 'l2', 'l3'].map((fd) => {
                        const field = fd as 'l1' | 'l2' | 'l3';
                        const currentVal = grade[field];

                        return (
                          <td
                            key={field}
                            className="py-2 px-1 text-center border-r border-black w-20 text-[13px]"
                          >
                            {currentVal !== null ? currentVal.toFixed(1) : ''}
                          </td>
                        );
                      })}

                      {/* Điểm trung bình thi */}
                      <td className="py-2.5 px-3 text-center border-r border-black font-bold w-28 text-[13px]">
                        {examAvg !== null ? examAvg.toFixed(1) : ''}
                      </td>

                      {/* Điểm tổng kết MH-MD */}
                      <td className="py-2.5 px-3 text-center border-r border-black font-bold text-black w-28 text-[13px]">
                        {finalScore !== null ? finalScore.toFixed(1) : ''}
                      </td>

                      {/* Notes Column */}
                      <td className="py-2 px-4 min-w-[120px] text-left text-xs text-slate-850">
                        {grade.note || ''}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paper Footer matching vocational training style */}
        <div className="mt-8 flex flex-col sm:flex-row justify-between items-start text-xs font-serif italic text-stone-500 border-t border-stone-200 pt-4 print:text-[10px]">
          <div>
            <span>* Chú thích: Sinh viên thuộc diện "Học lại" sẽ để trống điểm tổng kết môn học.</span>
          </div>
          <div className="mt-2 sm:mt-0">
            <span>Ngày in bảng điểm: {new Date().toLocaleDateString('vi-VN')}</span>
          </div>
        </div>

        {/* Double-click hint overlay (Hidden when printing) */}
        <div className="absolute bottom-3 left-6 right-6 flex items-center gap-2 text-xs text-slate-500 border border-slate-150 p-2.5 bg-slate-50 rounded-lg shrink-0 print:hidden mt-6">
          <HelpCircle className="w-4 h-4 text-emerald-500" />
          <span>
            Bảng ghi điểm được <strong>đồng bộ tự động</strong> (chỉ đọc) từ dữ liệu trang <strong>Kết quả học tập</strong>. Nhấn <strong>"In (A4)"</strong> ở góc phải phía trên để xem bản in hoàn hảo.
          </span>
        </div>
      </div>
    </div>
  );
}
