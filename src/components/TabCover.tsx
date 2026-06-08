/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ClassMetadata, Student, Teacher } from '../types';
import { Edit2, BookOpen, User, Calendar, Award, ShieldAlert, Users, GraduationCap, ChevronDown, Check, XCircle, Hash, Briefcase, Layers, Compass, Clock, UserCheck, School, ListTodo, Crown, Printer } from 'lucide-react';

interface TabCoverProps {
  metadata: ClassMetadata;
  studentCount: number;
  students?: Student[];
  teachers?: Teacher[];
  onUpdateMetadata: (metadata: ClassMetadata) => void;
  isLocked?: boolean;
}

export default function TabCover({ metadata, studentCount, students = [], teachers = [], onUpdateMetadata, isLocked = false }: TabCoverProps) {
  const uniqueSchools = Array.from(
    new Set(
      students
        .map(s => s.schoolName?.trim() || '')
        .filter(s => s !== '')
    )
  );

  const activeSchool = metadata.schoolName || '';
  const schoolStudents = activeSchool 
    ? students.filter(s => s.schoolName?.trim().toLowerCase() === activeSchool.trim().toLowerCase())
    : students;

  const schoolMonitors = schoolStudents.filter(s => s.bcs === 'Lớp trưởng');
  const schoolDeputies = schoolStudents.filter(s => 
    (s.bcs === 'Lớp phó' || s.bcs === 'Tổ trưởng') &&
    `${s.lastName} ${s.firstName}`.trim().toLowerCase() !== (metadata.monitorName || '').trim().toLowerCase()
  );
  const otherSchoolStudents = schoolStudents.filter(s => s.bcs !== 'Lớp trưởng' && s.bcs !== 'Lớp phó' && s.bcs !== 'Tổ trưởng');

  const allDeputiesJoined = schoolDeputies
    .map(s => `${s.lastName} ${s.firstName}`.trim() + (s.bcs ? ` (${s.bcs})` : ''))
    .join(', ');

  const [showDeputiesDropdown, setShowDeputiesDropdown] = useState(false);
  const deputiesDropdownRef = useRef<HTMLDivElement>(null);
  const [editingField, setEditingField] = useState<'header' | 'list' | null>(null);
  const [editManagingSchoolValue, setEditManagingSchoolValue] = useState('');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (deputiesDropdownRef.current && !deputiesDropdownRef.current.contains(event.target as Node)) {
        setShowDeputiesDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedDeputies = (metadata.deputiesName || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  const handleToggleDeputy = (s: Student) => {
    const fullName = `${s.lastName} ${s.firstName}`.trim();
    const label = s.bcs ? `${fullName} (${s.bcs})` : fullName;
    
    const isChecked = selectedDeputies.some(item => {
      const cleanItem = item.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
      return cleanItem === fullName.toLowerCase();
    });

    let newSelected: string[];
    if (isChecked) {
      newSelected = selectedDeputies.filter(item => {
        const cleanItem = item.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
        return cleanItem !== fullName.toLowerCase();
      });
    } else {
      newSelected = [...selectedDeputies, label];
    }

    onUpdateMetadata({
      ...metadata,
      deputiesName: newSelected.join(', ')
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (isLocked) {
      alert('⛔ Lớp học đang bị khóa! Hãy mở khóa từ sidebar trước khi sửa.');
      return;
    }
    const { name, value } = e.target;
    onUpdateMetadata({
      ...metadata,
      [name]: name === 'classSize' || name === 'totalPeriods' ? Number(value) || 0 : value
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-8 space-y-8 print:p-0 print:space-y-0 print:max-w-full print-portrait">
      {/* Dynamic Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 print:hidden">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-full">
            <BookOpen className="w-3.5 h-3.5" />
            Hồ sơ điện tử
          </span>
          <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-slate-950">
            Sổ tay & Thông tin Lớp học
          </h2>
          <p className="text-slate-500 text-sm">
            Nơi quản lý thông tin hành chính, ban cán sự, và đề cương phân bổ thời lượng của mô-đun.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 self-stretch md:self-auto">
          <div className="flex-1 md:flex-initial bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-center">
            <p className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Sĩ số danh sách</p>
            <p className="text-2xl font-mono font-bold text-slate-900">{studentCount}</p>
          </div>
          <div className="flex-1 md:flex-initial bg-indigo-50/50 border border-indigo-100 rounded-xl px-5 py-3 text-center">
            <p className="text-[10px] uppercase font-semibold text-indigo-600 tracking-wider">Tổng số tiết học</p>
            <p className="text-2xl font-mono font-bold text-indigo-800">{metadata.totalPeriods || 60}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block print:max-w-2xl print:mx-auto">
        
        {/* Left Side: Handbook Cover Page representation (vietnamese: Bìa Sổ Tay) */}
        <div className="lg:col-span-5 bg-stone-50 border-2 border-stone-200 rounded-2xl p-8 print:p-12 relative flex flex-col items-center justify-between min-h-[480px] print:min-h-[85vh] print:border-4 print:border-double print:border-stone-800 print:rounded-none print:shadow-none print:bg-white shadow-sm overflow-hidden">
          {/* Cover decorative elements */}
          <div className="absolute top-0 left-0 w-full h-2 bg-amber-500"></div>
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 shadow-inner mt-4">
            <GraduationCap className="w-10 h-10 stroke-[1.25]" />
          </div>

          <div className="text-center space-y-4 my-8">
            <h1 className="text-3xl font-display font-extrabold tracking-widest text-stone-850 border-b-2 border-stone-300 pb-2">
              SỔ TAY GIÁO VIÊN
            </h1>
             {editingField === 'header' ? (
              <input
                type="text"
                value={editManagingSchoolValue}
                onChange={(e) => setEditManagingSchoolValue(e.target.value)}
                onBlur={() => {
                  setEditingField(null);
                  onUpdateMetadata({
                    ...metadata,
                    managingSchool: editManagingSchoolValue.trim() || 'TRƯỜNG TC KTNV TÔN ĐỨC THẮNG'
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setEditingField(null);
                    onUpdateMetadata({
                      ...metadata,
                      managingSchool: editManagingSchoolValue.trim() || 'TRƯỜNG TC KTNV TÔN ĐỨC THẮNG'
                    });
                  } else if (e.key === 'Escape') {
                    setEditingField(null);
                  }
                }}
                autoFocus
                className="w-full text-center text-xs font-mono font-bold border-stone-300 border-2 rounded-lg py-1 px-2 focus:outline-none focus:border-indigo-500 bg-white text-stone-800 uppercase"
              />
            ) : (
              <p 
                onClick={() => {
                  if (isLocked) { alert('⛔ Lớp học đang bị khóa! Hãy mở khóa từ sidebar trước khi sửa.'); return; }
                  setEditingField('header');
                  setEditManagingSchoolValue(metadata.managingSchool || 'TRƯỜNG TC KTNV TÔN ĐỨC THẮNG');
                }}
                className="text-stone-500 hover:text-indigo-600 hover:bg-stone-100/60 transition-all rounded-lg py-1 px-2 cursor-pointer font-mono text-xs tracking-wider uppercase font-bold max-w-[280px] mx-auto text-wrap group flex items-center justify-center gap-1 print:p-0 print:hover:bg-transparent print:hover:text-stone-500"
                title="Nhấp chuột để sửa trực tiếp tên trường quản lý"
              >
                <span>{metadata.managingSchool || 'TRƯỜNG TC KTNV TÔN ĐỨC THẮNG'}</span>
                <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500 shrink-0 print:hidden" />
              </p>
            )}
          </div>

          <div className="w-full bg-white border border-stone-200 rounded-xl p-4 space-y-3.5 text-sm text-stone-800 shadow-xs select-none">
            <div className="flex justify-between border-b border-dashed border-stone-200 pb-1.5">
              <span className="font-medium text-stone-500">Môn học/Mô-đun:</span>
              <span className="font-bold text-indigo-800 text-right">{metadata.subjectName}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-stone-200 pb-1.5 items-center">
              <span className="font-medium text-stone-500">Trường quản lý:</span>
              {editingField === 'list' ? (
                <input
                  type="text"
                  value={editManagingSchoolValue}
                  onChange={(e) => setEditManagingSchoolValue(e.target.value)}
                  onBlur={() => {
                    setEditingField(null);
                    onUpdateMetadata({
                      ...metadata,
                      managingSchool: editManagingSchoolValue.trim() || 'TRƯỜNG TC KTNV TÔN ĐỨC THẮNG'
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setEditingField(null);
                      onUpdateMetadata({
                        ...metadata,
                        managingSchool: editManagingSchoolValue.trim() || 'TRƯỜNG TC KTNV TÔN ĐỨC THẮNG'
                      });
                    } else if (e.key === 'Escape') {
                      setEditingField(null);
                    }
                  }}
                  autoFocus
                  className="text-right text-xs font-mono font-bold border-stone-300 border rounded py-0.5 px-1 focus:outline-none focus:border-indigo-500 bg-white text-stone-850 uppercase max-w-[180px]"
                />
              ) : (
                <span 
                  onClick={() => {
                    if (isLocked) { alert('⛔ Lớp học đang bị khóa! Hãy mở khóa từ sidebar trước khi sửa.'); return; }
                    setEditingField('list');
                    setEditManagingSchoolValue(metadata.managingSchool || 'TRƯỜNG TC KTNV TÔN ĐỨC THẮNG');
                  }}
                  className="font-bold text-stone-900 text-right text-xs max-w-[160px] truncate cursor-pointer hover:text-indigo-650 hover:bg-stone-50 rounded px-1 transition-all flex items-center gap-0.5 group/item"
                  title="Nhấp chuột để sửa trực tiếp tên trường quản lý"
                >
                  <span className="truncate">{metadata.managingSchool || 'TRƯỜNG TC KTNV TÔN ĐỨC THẮNG'}</span>
                  <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover/item:opacity-100 transition-opacity text-indigo-500 shrink-0 print:hidden" />
                </span>
              )}
            </div>
            <div className="flex justify-between border-b border-dashed border-stone-200 pb-1.5">
              <span className="font-medium text-stone-500">Đơn vị liên kết:</span>
              <span className="font-bold text-stone-900 text-right text-xs max-w-[160px] truncate" title={metadata.schoolName}>{metadata.schoolName || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-stone-200 pb-1.5">
              <span className="font-medium text-stone-500">Lớp:</span>
              <span className="font-bold text-stone-900">{metadata.className}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-stone-200 pb-1.5">
              <span className="font-medium text-stone-500">Khóa / Học kỳ:</span>
              <span className="font-bold text-stone-900">K.{metadata.course} - HK.{metadata.semester}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-stone-200 pb-1.5">
              <span className="font-medium text-stone-500">Giảng viên giảng dạy:</span>
              <span className="font-bold text-stone-900">{metadata.teacherName || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-stone-200 pb-1.5">
              <span className="font-medium text-stone-500">GV chủ nhiệm:</span>
              <span className="font-bold text-stone-900">{metadata.formTeacher}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-stone-500">Năm học:</span>
              <span className="font-bold text-stone-900">{metadata.schoolYear}</span>
            </div>
          </div>

          <p className="text-stone-400 text-xs font-mono mt-4 text-center">
            Mẫu sổ số hóa - Lưu trữ cục bộ bảo mật
          </p>
        </div>

        {/* Right Side: Editable Administrative Information Form */}
        <div className={`lg:col-span-7 bg-white rounded-2xl border shadow-xs p-6 md:p-8 space-y-6 print:hidden ${
          isLocked ? 'border-orange-200 bg-orange-50/30' : 'border-slate-200'
        }`}>
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-display font-bold text-slate-900 flex items-center gap-2">
              {isLocked ? (
                <>
                  <ShieldAlert className="w-5 h-5 text-orange-500" />
                  Thông tin hành chính &amp; Đào tạo
                </>
              ) : (
                <>
                  <Edit2 className="w-5 h-5 text-indigo-500" />
                  Thông tin hành chính &amp; Đào tạo
                </>
              )}
            </h3>
            {isLocked ? (
              <div className="mt-2 flex items-center gap-2 bg-orange-100 border border-orange-200 rounded-lg px-3 py-2">
                <ShieldAlert className="w-4 h-4 text-orange-500 shrink-0" />
                <p className="text-orange-700 text-xs font-semibold">
                  ⛔ Lớp học đang bị khóa. Hãy nhấn biểu tượng ổ khóa trong Sidebar để mở khóa trước khi chỉnh sửa.
                </p>
              </div>
            ) : (
              <p className="text-slate-500 text-xs mt-1">Cập nhật thông tin chi tiết chương trình học để tự động hiển thị trên biên bản điểm.</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Subject name */}
            <div className="col-span-12 md:col-span-8 space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span>Môn học / Mô-đun</span>
              </label>
              <input
                type="text"
                name="subjectName"
                value={metadata.subjectName}
                onChange={handleChange}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Class code */}
            <div className="col-span-12 md:col-span-4 space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Mã lớp học</span>
              </label>
              <input
                type="text"
                name="className"
                value={metadata.className}
                onChange={handleChange}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Occupation */}
            <div className="col-span-12 md:col-span-8 space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                <span>Nghề đào tạo</span>
              </label>
              <input
                type="text"
                name="occupation"
                value={metadata.occupation}
                onChange={handleChange}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Training Level */}
            <div className="col-span-12 md:col-span-4 space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>Trình độ đào tạo nghề</span>
              </label>
              <input
                type="text"
                name="level"
                value={metadata.level}
                onChange={handleChange}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Course & Semester, School Year & Total Periods - Compact on one row */}
            <div className="col-span-6 md:col-span-3 space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Khóa</span>
              </label>
              <input
                type="text"
                name="course"
                value={metadata.course}
                onChange={handleChange}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="col-span-6 md:col-span-3 space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                <span>Học kỳ</span>
              </label>
              <input
                type="text"
                name="semester"
                value={metadata.semester}
                onChange={handleChange}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="col-span-6 md:col-span-3 space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Năm học</span>
              </label>
              <input
                type="text"
                name="schoolYear"
                value={metadata.schoolYear}
                onChange={handleChange}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="col-span-6 md:col-span-3 space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>Tổng số tiết</span>
              </label>
              <input
                type="number"
                name="totalPeriods"
                value={metadata.totalPeriods}
                onChange={handleChange}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Giảng viên giảng dạy */}
            <div className="col-span-12 md:col-span-6 space-y-2 bg-slate-50/50 p-3.5 rounded-xl border border-slate-150 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    <span>Giảng viên giảng dạy</span>
                  </label>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold uppercase shrink-0">Hồ sơ GV</span>
                </div>
                <select
                  name="teacherName"
                  value={metadata.teacherName || ''}
                  onChange={handleChange}
                  className="w-full text-sm p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold text-slate-800 bg-white cursor-pointer select-none"
                >
                  <option value="">— Hãy chọn giảng viên từ danh sách hồ sơ —</option>
                  {teachers.map((t) => {
                    const fullName = `${t.lastName} ${t.firstName}`.trim();
                    return (
                      <option key={t.id} value={fullName}>
                        👤 {fullName} ({t.teacherCode || 'GV'}) {t.specialty ? `— ${t.specialty}` : ''}
                      </option>
                    );
                  })}
                  {metadata.teacherName && !teachers.some(t => `${t.lastName} ${t.firstName}`.trim().toLowerCase() === (metadata.teacherName || '').trim().toLowerCase()) && (
                    <option value={metadata.teacherName}>{metadata.teacherName} (Tùy chỉnh khác)</option>
                  )}
                </select>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 italic font-sans">Trực tiếp liên kết với hồ sơ cán bộ giảng dạy trong hệ thống.</p>
            </div>

            {/* Trường (Đơn vị liên kết) */}
            <div className="col-span-12 md:col-span-6 space-y-2 bg-slate-50/50 p-3.5 rounded-xl border border-slate-150 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                    <span>Trường (Đơn vị liên kết)</span>
                  </label>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold uppercase shrink-0">Đối tác</span>
                </div>
                <input
                  type="text"
                  name="schoolName"
                  value={metadata.schoolName || ''}
                  onChange={handleChange}
                  className="w-full text-sm p-2 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold text-slate-800"
                  placeholder="Nhập tên trường liên kết hoặc click nhanh gợi ý bên dưới"
                />
              </div>
              
              {uniqueSchools.length > 0 ? (
                <div className="space-y-1.5 mt-1.5">
                  <p className="text-[10px] text-slate-500 font-medium font-sans">Click nhanh gợi ý đơn vị liên kết:</p>
                  <div className="flex flex-wrap gap-1">
                    {uniqueSchools.map((sch) => (
                      <button
                        key={sch}
                        type="button"
                        onClick={() => {
                          onUpdateMetadata({
                            ...metadata,
                            schoolName: sch
                          });
                        }}
                        className={`text-[9px] px-2 py-0.5 rounded-full border font-bold transition flex items-center gap-1 cursor-pointer select-none ${
                          metadata.schoolName === sch
                            ? 'bg-indigo-600 border-indigo-750 text-white shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-indigo-600'
                        }`}
                      >
                        <span>🏫</span>
                        <span className="truncate max-w-[125px]">{sch}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 italic">Chưa có học sinh nào được phân nhóm trường.</p>
              )}
            </div>
          </div>

          {/* Entry description requirements */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <ListTodo className="w-3.5 h-3.5 text-pink-500 shrink-0" />
              <span>Trình độ đầu vào và hình thức đánh giá</span>
            </label>
            <input
              type="text"
              name="entryRequirements"
              value={metadata.entryRequirements}
              onChange={handleChange}
              className="w-full text-sm p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h4 className="text-sm font-display font-semibold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Bộ máy quản lý & Ban cán sự lớp
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-755 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Giáo viên chủ nhiệm (GVCN)</span>
                </label>
                <select
                  name="formTeacher"
                  value={metadata.formTeacher || ''}
                  onChange={handleChange}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold text-slate-800 bg-white cursor-pointer select-none"
                >
                  <option value="">— Chọn GVCN —</option>
                  {teachers.map((t) => {
                    const fullName = `${t.lastName} ${t.firstName}`.trim();
                    return (
                      <option key={t.id} value={fullName}>
                        👤 {fullName}
                      </option>
                    );
                  })}
                  {metadata.formTeacher && !teachers.some(t => `${t.lastName} ${t.firstName}`.trim().toLowerCase() === (metadata.formTeacher || '').trim().toLowerCase()) && (
                    <option value={metadata.formTeacher}>{metadata.formTeacher} (Tùy chỉnh khác)</option>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-755 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                    <span>Lớp trưởng</span>
                  </label>
                  {schoolMonitors.length > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold uppercase">Đã khớp từ Hồ sơ SV</span>
                  )}
                </div>
                <select
                  name="monitorName"
                  value={metadata.monitorName || ''}
                  onChange={handleChange}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold text-slate-800 bg-white cursor-pointer select-none"
                >
                  <option value="">— Hãy chọn Lớp trưởng —</option>
                  {schoolMonitors.map((s) => {
                    const fullName = `${s.lastName} ${s.firstName}`.trim();
                    return (
                      <option key={s.id} value={fullName}>
                        👑 {fullName} (Lớp trưởng khớp cột BCS)
                      </option>
                    );
                  })}
                  {otherSchoolStudents.length > 0 && (
                    <optgroup label="Các học viên khác">
                      {otherSchoolStudents.map((s) => {
                        const fullName = `${s.lastName} ${s.firstName}`.trim();
                        return (
                          <option key={s.id} value={fullName}>
                            👤 {fullName}
                          </option>
                        );
                      })}
                    </optgroup>
                  )}
                  {metadata.monitorName && !schoolStudents.some(s => `${s.lastName} ${s.firstName}`.trim().toLowerCase() === (metadata.monitorName || '').trim().toLowerCase()) && (
                    <option value={metadata.monitorName}>{metadata.monitorName} (Tùy chỉnh khác)</option>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-755 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <span>Lớp phó và các tổ trưởng</span>
                  </label>
                  {schoolDeputies.length > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold uppercase font-sans">Chọn nhiều</span>
                  )}
                </div>
                
                <div className="relative" ref={deputiesDropdownRef}>
                  <div
                    onClick={() => setShowDeputiesDropdown(!showDeputiesDropdown)}
                    className="w-full min-h-[42px] select-none text-sm p-2.5 rounded-lg border border-slate-250 focus:outline-none bg-white cursor-pointer flex items-center justify-between gap- 2 font-semibold text-slate-800 ring-offset-white focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
                      {selectedDeputies.length === 0 ? (
                        <span className="text-slate-400 font-normal">— Hãy chọn Lớp phó / Ban tự quản —</span>
                      ) : (
                        selectedDeputies.map((dep, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold font-sans">
                            {dep}
                          </span>
                        ))
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 ml-auto text-slate-400 shrink-0 transition-transform ${showDeputiesDropdown ? 'rotate-180' : ''}`} />
                  </div>

                  {showDeputiesDropdown && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-2 space-y-2 max-h-72 overflow-y-auto">
                      {/* Batch helpers */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-150 pb-2 text-[11px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateMetadata({
                              ...metadata,
                              deputiesName: allDeputiesJoined
                            });
                          }}
                          className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200 cursor-pointer select-none"
                        >
                          ⚡ Đồng bộ tất cả cán sự
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateMetadata({
                              ...metadata,
                              deputiesName: ''
                            });
                          }}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold cursor-pointer select-none"
                        >
                          Xóa tất cả
                        </button>
                      </div>

                      {/* Options list */}
                      <div className="space-y-1">
                        {schoolDeputies.length > 0 && (
                          <div className="font-sans text-[10px] font-bold uppercase text-slate-400 px-2 py-0.5 tracking-wider select-none">
                            Ban cán sự có sẵn (khớp cột bcs)
                          </div>
                        )}
                        {schoolDeputies.map((s) => {
                          const fullName = `${s.lastName} ${s.firstName}`.trim();
                          const isChecked = selectedDeputies.some(item => {
                            const cleanItem = item.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
                            return cleanItem === fullName.toLowerCase();
                          });
                          return (
                            <div
                              key={s.id}
                              className="flex items-center justify-between p-2 rounded-md hover:bg-indigo-50/50 cursor-pointer text-xs font-semibold select-none text-slate-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleDeputy(s);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}} // handled by click container
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                />
                                <span>⚡ {fullName}</span>
                              </div>
                              <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.5 rounded font-sans uppercase">
                                {s.bcs}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
