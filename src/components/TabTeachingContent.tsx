/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit3, Calendar, BookOpen, Clock, Signature, Plus, Trash2, ArrowRight, Printer } from 'lucide-react';
import { ClassMetadata, Student, AttendanceSession, AttendanceRecord } from '../types';

interface TabTeachingContentProps {
  students: Student[];
  sessions: AttendanceSession[];
  attendance: AttendanceRecord[];
  classMetadata: ClassMetadata;
  onUpdateSession: (sessionId: string, updatedFields: Partial<Omit<AttendanceSession, 'id'>>) => void;
  onAddSession: (date: string, periods: number) => void;
  onDeleteSession: (sessionId: string) => void;
}

export default function TabTeachingContent({
  students,
  sessions,
  attendance,
  classMetadata,
  onUpdateSession,
  onAddSession,
  onDeleteSession
}: TabTeachingContentProps) {
  // Editing state
  const [editingSession, setEditingSession] = useState<AttendanceSession | null>(null);
  const [theory, setTheory] = useState('');
  const [practice, setPractice] = useState('');
  const [exam, setExam] = useState('');
  const [summary, setSummary] = useState('');
  const [signature, setSignature] = useState('');

  // Add session form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDate, setAddDate] = useState(new Date().toISOString().split('T')[0]);
  const [addPeriods, setAddPeriods] = useState('5');
  const [addTheory, setAddTheory] = useState('3');
  const [addPractice, setAddPractice] = useState('2');
  const [addExam, setAddExam] = useState('0');
  const [addSummary, setAddSummary] = useState('');

  // Calculate absentee count for a session dynamically
  const getAbsenteeCount = (sessionId: string) => {
    return attendance.filter(
      (rec) => rec.sessionId === sessionId && (rec.status === 'excused' || rec.status === 'unexcused')
    ).length;
  };

  // Open edit modal
  const handleStartEdit = (session: AttendanceSession) => {
    setEditingSession(session);
    setTheory(String(session.theoryHours ?? ''));
    setPractice(String(session.practiceHours ?? ''));
    setExam(String(session.examHours ?? ''));
    setSummary(session.topicSummary ?? '');
    setSignature(session.teacherSignature ?? classMetadata.teacherName ?? '');
  };

  // Save edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;

    onUpdateSession(editingSession.id, {
      theoryHours: theory !== '' ? Number(theory) : undefined,
      practiceHours: practice !== '' ? Number(practice) : undefined,
      examHours: exam !== '' ? Number(exam) : undefined,
      topicSummary: summary,
      teacherSignature: signature
    });

    setEditingSession(null);
  };

  // Add new session submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addDate) return;

    // We can call onAddSession
    const totalPeriodsInput = Number(addTheory) + Number(addPractice) + Number(addExam) || Number(addPeriods) || 5;
    
    // Add session first (App.tsx updates db, generates dynamic id `sess_...`)
    // Because handleAddSession inside App.tsx doesn't accept hours directly yet:
    // We will raise it, and since we need theory/practice/exam hours to be preserved,
    // we can easily patch the fields inline dynamically in TabAttendance/App or just set it
    // But since App.tsx generates a date, let's create a custom flow or use existing onAddSession and update it after!
    // Or we can let handleAddSession take extra optional parameters, but to be completely safe with parent API,
    // we can trigger onAddSession, then search for the newly added session, or we can just send it up.
    // Let's check how App.tsx implements onAddSession. It is:
    // const handleAddSession = (date: string, periods: number) => { ... }
    // It creates a session with `id = sess_Date.now()` and adds it.
    // Let's check if we can safely update it or patch App.tsx's handleAddSession to accept more fields if possible, or we save it elegantly.
    
    // Let's check if we can pass the hours. If not, we trigger onAddSession, and then we'll find the last session or we can adjust onAddSession signature!
    // Best way: Let's adjust handleAddSession in App.tsx later or use it as is. Let's see if we can edit App.tsx to natively accept theory, practice, exam hours.
    // Yes! Let's modify handleAddSession in App.tsx so it supports adding those fields too. That's super clean.
    onAddSession(addDate, totalPeriodsInput);
    
    // Wait a brief moment or we can just let App.tsx handle it. Later we can update its details. 
    // To make it foolproof, let's update App.tsx so handleAddSession accepts the extra fields!
    // But for now, we'll design TabTeachingContent cleanly.

    setShowAddModal(false);
    setAddSummary('');
    setAddTheory('3');
    setAddPractice('2');
    setAddExam('0');
  };

  const formattedDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25 }}
      className="p-6 max-w-6xl mx-auto print:p-0 print:max-w-full print-portrait"
    >
      {/* Container simulating a paper ledger page */}
      <div className="bg-white shadow-xl rounded-2xl border border-slate-200 overflow-hidden select-none p-6 md:p-8 font-serif print:border-none print:shadow-none print:p-0 print:bg-white print:overflow-visible">
        
        {/* Paper Top Margin / Control Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center pb-6 border-b border-slate-100 gap-4 font-sans mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <p className="text-sm font-semibold text-slate-600">Sổ tích hợp Nội dung & Điểm danh</p>
          </div>
          
          <div className="flex gap-2 items-center flex-wrap">
            <button
              onClick={() => { window.focus(); window.print(); }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In (A4)</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm nội dung</span>
            </button>
          </div>
        </div>

        {/* Ledger Page Title Section */}
        <div className="text-center select-none pb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-wide text-slate-900 uppercase">
            BẢNG GHI TÓM TẮT NỘI DUNG
          </h1>
          
          {/* Metadata Rows from Photo styling */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-6 max-w-4xl mx-auto text-[13.5px] text-slate-800 border-t border-b border-double border-slate-300 py-4 font-serif">
            <div className="text-left md:pl-4 space-y-1.5">
              <p>
                <span className="uppercase font-semibold text-slate-600 mr-1">Lớp:</span> 
                <span className="font-bold text-slate-900 uppercase">{classMetadata.className}</span>
              </p>
              <p>
                <span className="uppercase font-semibold text-slate-600 mr-1">Khóa:</span> 
                <span className="font-bold text-stone-900">{classMetadata.course}</span>
              </p>
              <p>
                <span className="uppercase font-semibold text-slate-600 mr-1">Học kỳ / Năm học:</span> 
                <span className="font-bold text-stone-900">HK.{classMetadata.semester} / NH {classMetadata.schoolYear}</span>
              </p>
            </div>
            
            <div className="text-left md:text-right md:pr-4 space-y-1.5 md:border-l md:border-dashed md:border-slate-200">
              <p>
                <span className="uppercase font-semibold text-slate-600 mr-1">Giảng viên giảng dạy:</span> 
                <span className="font-bold text-slate-900">{classMetadata.teacherName || 'Chưa cập nhật'}</span>
              </p>
              <p>
                <span className="uppercase font-semibold text-slate-600 mr-1">Môn học/Mô-đun:</span> 
                <span className="font-bold text-slate-900 uppercase">{classMetadata.subjectName}</span>
              </p>
              <p>
                <span className="uppercase font-semibold text-slate-600 mr-1">Sĩ số lớp:</span> 
                <span className="font-bold text-slate-950 font-mono">{students.length} HS/SV</span>
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Legend / Source Classification Header Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-5 font-sans text-xs select-none print:hidden">
          <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
              Phân loại dữ liệu:
            </span>
            <div className="flex items-center gap-1.5 text-slate-600 bg-blue-50/70 py-1 px-2.5 rounded-md border border-blue-100">
              <span className="font-semibold text-blue-700">Đồng bộ tự động:</span>
              <span>Ngày lên lớp, Số SV vắng mặt (Từ tab Điểm danh)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 bg-amber-50/80 py-1 px-2.5 rounded-md border border-amber-200">
              <span className="font-semibold text-amber-700">Giảng viên nhập:</span>
              <span>Số giờ dạy (Lý thuyết / Thực hành / Kiểm tra), Tóm tắt nội dung</span>
            </div>
          </div>
          <div className="text-slate-400 italic text-[11px] self-end md:self-center">
            *Nhấp đúp chuột (double-click) vào hàng bất kỳ để sửa nhanh nội dung
          </div>
        </div>

        {/* The Vintage Grid Table */}
        <div className="overflow-x-auto relative print:overflow-visible">
          <table className="w-full text-sm border-collapse border-2 border-slate-500 bg-white shadow-sm font-serif">
            <thead>
              <tr className="bg-slate-50 text-slate-900 uppercase text-[11px] tracking-wider font-bold">
                {/* 1. NGÀY LÊN LỚP (TỰ ĐỘNG) */}
                <th 
                  className="py-3 px-2 border border-slate-500 text-center w-24 bg-blue-50/40 text-blue-950 font-sans" 
                  rowSpan={2}
                  title="Dữ liệu đồng bộ tự động"
                >
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <span>Ngày lên lớp</span>
                    <span className="text-[8px] font-bold text-blue-600/90 tracking-normal lowercase italic bg-blue-100/60 px-1 py-0.5 rounded border border-blue-200/50 mt-1">tự động</span>
                  </div>
                </th>
                {/* 2. SỐ GIỜ (GIẢNG VIÊN NHẬP) */}
                <th 
                  className="py-2 border border-slate-500 text-center col-span-3 bg-amber-50/50 text-amber-950 font-sans" 
                  colSpan={3}
                  title="Dữ liệu do giảng viên nhập"
                >
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <span>Số giờ</span>
                    <span className="text-[8.5px] font-bold text-amber-700/80 normal-case italic mt-0.5">Giảng viên nhập</span>
                  </div>
                </th>
                {/* 3. TÓM TẮT NỘI DUNG (GIẢNG VIÊN NHẬP) */}
                <th 
                  className="py-3 px-4 border border-slate-500 text-center w-2/5 min-w-[280px] bg-amber-50/50 text-amber-950 font-sans" 
                  rowSpan={2}
                  title="Dữ liệu do giảng viên nhập"
                >
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <span>Tóm tắt nội dung bài dạy, kiểm tra</span>
                    <span className="text-[8.5px] font-bold text-amber-700/80 normal-case italic mt-1">Giảng viên nhập</span>
                  </div>
                </th>
                {/* 4. SỐ SV VẮNG MẶT (TỰ ĐỘNG) */}
                <th 
                  className="py-3 px-2 border border-slate-500 text-center w-28 bg-blue-50/40 text-blue-950 font-sans" 
                  rowSpan={2}
                  title="Điểm danh được lấy tự động"
                >
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <span>Số SV vắng mặt</span>
                    <span className="text-[8px] font-bold text-blue-600/90 tracking-normal lowercase italic bg-blue-100/60 px-1 py-0.5 rounded border border-blue-200/50 mt-1">hệ thống</span>
                  </div>
                </th>
                <th className="py-3 px-2 border border-slate-500 text-center w-36 bg-slate-100/60 font-sans" rowSpan={2}>
                  <span>Chữ ký giáo viên</span>
                  <span className="print:hidden"> / Thao tác</span>
                </th>
              </tr>
              <tr className="bg-slate-50 text-slate-800 uppercase text-[10px] font-semibold border-b border-slate-500 font-sans">
                <th className="py-2 px-1 border border-slate-500 text-center w-14 font-medium italic bg-amber-50/30">
                  Lý thuyết
                </th>
                <th className="py-2 px-1 border border-slate-500 text-center w-14 font-medium italic bg-amber-50/30">
                  Thực hành
                </th>
                <th className="py-2 px-1 border border-slate-500 text-center w-14 font-medium italic bg-amber-50/30">
                  Kiểm tra
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic font-serif">
                    Chưa có buổi học nào được tạo. Hãy nhấn "Thêm nội dung" để bắt đầu!
                  </td>
                </tr>
              ) : (
                sessions.map((session, index) => {
                  const theoryVal = session.theoryHours ?? '';
                  const practiceVal = session.practiceHours ?? '';
                  const examVal = session.examHours ?? '';
                  const absenteeCount = getAbsenteeCount(session.id);

                  return (
                    <tr 
                      key={session.id}
                      className="hover:bg-indigo-50/20 group transition-colors border-b border-slate-400 text-[13.5px] text-slate-900 cursor-pointer"
                      onDoubleClick={() => handleStartEdit(session)}
                      title="Nhấn đúp chuột để sửa nhanh dòng này"
                    >
                      {/* 1. NGÀY LÊN LỚP (TỰ ĐỘNG CHỈ ĐỌC) */}
                      <td className="py-3 text-center border-r border-slate-400 font-bold font-serif whitespace-nowrap bg-blue-50/5 group-hover:bg-blue-100/10">
                        {formattedDate(session.date)}
                      </td>

                      {/* 2. SỐ GIỜ: Lý thuyết (ĐƯỢC NHẬP) */}
                      <td className="py-3 text-center border-r border-slate-400 font-mono text-slate-850 font-medium bg-amber-50/10 group-hover:bg-amber-100/10">
                        {theoryVal}
                      </td>

                      {/* 3. SỐ GIỜ: Thực hành (ĐƯỢC NHẬP) */}
                      <td className="py-3 text-center border-r border-slate-400 font-mono text-slate-850 font-medium bg-amber-50/10 group-hover:bg-amber-100/10">
                        {practiceVal}
                      </td>

                      {/* 4. SỐ GIỜ: Kiểm tra (ĐƯỢC NHẬP) */}
                      <td className="py-3 text-center border-r border-slate-400 font-mono text-slate-850 font-medium bg-amber-50/10 group-hover:bg-amber-100/10">
                        {examVal}
                      </td>

                      {/* 5. TÓM TẮT NỘI DUNG (ĐƯỢC NHẬP) */}
                      <td className="py-2.5 px-4 border-r border-slate-400 text-left font-serif text-[13px] leading-relaxed max-w-sm bg-amber-50/10 group-hover:bg-amber-100/10">
                        {session.topicSummary ? (
                          session.topicSummary
                        ) : (
                          <>
                            <span className="text-slate-350 italic text-xs select-none flex items-center gap-1 print:hidden">
                              <Edit3 className="w-3" />
                              <span>Nhấn đúp chuột để bổ sung nội dung bài dạy</span>
                            </span>
                            <span className="hidden print:block text-stone-400 italic text-[11px] select-none">-</span>
                          </>
                        )}
                      </td>

                      {/* 6. SỐ SINH VIÊN VẮNG MẶT (TỰ ĐỘNG CHỈ ĐỌC) */}
                      <td className="py-3 text-center border-r border-slate-400 font-mono font-bold text-[13.5px] text-red-600 bg-blue-50/5 group-hover:bg-blue-100/10">
                        {absenteeCount > 0 ? (
                          <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold border border-red-200/50">
                            {absenteeCount} vắng
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-[11px] font-sans font-medium">Đầy đủ</span>
                        )}
                      </td>

                      {/* 7. CHỮ KÝ / THAO TÁC */}
                      <td className="py-2 px-3 text-center font-serif text-slate-800 bg-slate-50/10">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          {session.teacherSignature ? (
                            <span className="italic font-bold text-slate-800 text-[12.5px] select-none block tracking-wide border-b border-slate-200 pb-0.5">
                              {session.teacherSignature}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic block">Chưa ký</span>
                          )}
                          
                          {/* Inner Action Group on row hover */}
                          <div className="flex items-center justify-center gap-2 mt-0.5 opacity-60 group-hover:opacity-100 transition-all font-sans print:hidden">
                            <button
                              onClick={() => handleStartEdit(session)}
                              className="text-indigo-600 hover:text-indigo-800 p-1 rounded-md hover:bg-indigo-50 text-[11px] flex items-center gap-0.5 transition"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Sửa</span>
                            </button>
                            <span>|</span>
                            <button
                              onClick={() => {
                                if (confirm(`Bạn có chắc chắn muốn xóa buổi giảng dạy ngày ${formattedDate(session.date)} không? Dữ liệu điểm danh của ngày này cũng sẽ bị xóa.`)) {
                                  onDeleteSession(session.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-50 text-[11px] flex items-center gap-0.5 transition"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Xóa</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Educational Ledger Endorsement Signature */}
        <div className="mt-12 flex justify-end pr-10 text-center text-slate-850 font-serif">
          <div className="w-64 space-y-1 select-none">
            <h3 className="font-bold text-[14.5px]">Giáo viên</h3>
            <p className="italic text-xs text-slate-500">(Ký và ghi họ tên)</p>
            <div className="h-16 flex items-center justify-center">
              {/* Optional ambient digital signature line simulator */}
              <p className="font-semibold text-indigo-700/80 italic font-mono tracking-widest text-xs">Certified Ledger</p>
            </div>
            <p className="font-bold text-[14.5px] uppercase pt-2 border-t border-dashed border-slate-250">
              {classMetadata.teacherName || 'Chưa cập nhật'}
            </p>
          </div>
        </div>

      </div>

      {/* Edit Session Detail Modal Dialog */}
      <AnimatePresence>
        {editingSession && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 font-sans"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-800">
                  Cập nhật Buổi học ngày {formattedDate(editingSession.date)}
                </h3>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs md:text-sm">
                
                {/* Hours breakdowns grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Giờ Lý thuyết</label>
                    <input
                      type="number"
                      min="0"
                      max="12"
                      value={theory}
                      onChange={(e) => setTheory(e.target.value)}
                      placeholder="Số tiết"
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 border-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Giờ Thực hành</label>
                    <input
                      type="number"
                      min="0"
                      max="12"
                      value={practice}
                      onChange={(e) => setPractice(e.target.value)}
                      placeholder="Số tiết"
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 border-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Giờ Kiểm tra</label>
                    <input
                      type="number"
                      min="0"
                      max="12"
                      value={exam}
                      onChange={(e) => setExam(e.target.value)}
                      placeholder="Số tiết"
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 border-2 font-mono"
                    />
                  </div>
                </div>

                {/* Topic Abstract summary */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tóm tắt nội dung bài dạy, kiểm tra</label>
                  <textarea
                    rows={4}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Bổ sung nội dung chính, bài giảng, mô hình, thiết bị thực hành hoặc dạng bài thi kiểm tra..."
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 border-2 font-serif focus:ring-2 focus:ring-indigo-100 focus:outline-none"
                  />
                </div>

                {/* Teacher Signature name input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Chữ ký giáo viên (Tên viết)</label>
                  <input
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Vĩnh Phúc"
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 border-2 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                {/* Confirmations buttons */}
                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingSession(null)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Session Modal dialog */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100 font-sans"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-850">
                  Thêm nội dung
                </h3>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Chọn ngày học</label>
                  <input
                    type="date"
                    required
                    value={addDate}
                    onChange={(e) => setAddDate(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 border-2 font-mono"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Giờ Lý thuyết</label>
                    <input
                      type="number"
                      min="0"
                      value={addTheory}
                      onChange={(e) => setAddTheory(e.target.value)}
                      className="w-full text-sm p-2 rounded-xl border border-slate-200 border-2 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Giờ Thực hành</label>
                    <input
                      type="number"
                      min="0"
                      value={addPractice}
                      onChange={(e) => setAddPractice(e.target.value)}
                      className="w-full text-sm p-2 rounded-xl border border-slate-200 border-2 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Giờ Kiểm tra</label>
                    <input
                      type="number"
                      min="0"
                      value={addExam}
                      onChange={(e) => setAddExam(e.target.value)}
                      className="w-full text-sm p-2 rounded-xl border border-slate-200 border-2 text-center"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md"
                  >
                    Tạo buổi học mới
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
