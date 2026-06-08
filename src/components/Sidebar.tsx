/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { AppDatabase, ClassMetadata, CurrentUser } from '../types';
import { 
  Plus, Trash2, Download, Upload, RotateCcw, BookOpen, GraduationCap, 
  Calendar, Settings, Users, Lock, Unlock, Search, Database, School, 
  Compass, Hash, UserCheck, Layers, ChevronDown, X, SlidersHorizontal,
  LayoutGrid, BookMarked, HardDrive, History, ArrowDownToLine, Trash
} from 'lucide-react';
import { BackupInfo, createBackup, getBackups, restoreBackup, deleteBackup } from '../utils/sqlite';

interface SidebarProps {
  db: AppDatabase;
  activeTab: string;
  onActiveTabChange: (tab: 'cover' | 'grades' | 'results_book' | 'attendance' | 'teaching_content' | 'exam_list' | 'management' | 'dashboard') => void;
  onClassChange: (classId: string) => void;
  onAddClass: (className: string, subjectName: string, semester: string, schoolYear: string, teacherName: string) => void;
  onDeleteClass: (classId: string) => void;
  onRestoreDefaults: () => void;
  onImportDatabase: (data: AppDatabase) => void;
  onToggleClassLock: (classId: string) => void;
  onClose?: () => void;
  sqliteInfo?: { sizeBytes: number; ready: boolean };
  onExportSQLite?: () => void;
  currentUser?: CurrentUser | null;
}

export default function Sidebar({
  db,
  activeTab,
  onActiveTabChange,
  onClassChange,
  onAddClass,
  onDeleteClass,
  onRestoreDefaults,
  onImportDatabase,
  onToggleClassLock,
  onClose,
  sqliteInfo,
  onExportSQLite,
  currentUser
}: SidebarProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSemester, setNewSemester] = useState('I');
  const [newSchoolYear, setNewSchoolYear] = useState('2025 - 2026');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for Class List Search & Advanced Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSchool, setFilterSchool] = useState('');
  const [filterSemesterYear, setFilterSemesterYear] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedClassIds, setExpandedClassIds] = useState<Record<string, boolean>>({});
  const [isSystemMenuExpanded, setIsSystemMenuExpanded] = useState(false);
  const [isManagementMenuExpanded, setIsManagementMenuExpanded] = useState(false);

  // Backup & Restore states
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [backupsList, setBackupsList] = useState<BackupInfo[]>([]);

  // Function to load backups
  const handleOpenRestore = async () => {
    try {
      const list = await getBackups();
      setBackupsList(list);
      setShowRestoreModal(true);
    } catch (e: any) {
      alert('Không thể tải danh sách bản sao lưu: ' + e.message);
    }
  };

  const handleCreateBackup = async () => {
    try {
      await createBackup();
      alert('Tạo bản sao lưu thành công!');
    } catch (e: any) {
      alert('Lỗi khi tạo sao lưu: ' + e.message);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    if (!confirm('Bạn có chắc chắn muốn khôi phục bản sao lưu này? Dữ liệu HIỆN TẠI sẽ bị ghi đè hoàn toàn!')) return;
    try {
      await restoreBackup(backupId);
      alert('Khôi phục thành công! Ứng dụng sẽ được tải lại.');
      window.location.reload();
    } catch (e: any) {
      alert('Lỗi khôi phục: ' + e.message);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm('Xóa bản sao lưu này? Không thể hoàn tác!')) return;
    try {
      await deleteBackup(backupId);
      const list = await getBackups();
      setBackupsList(list);
    } catch (e: any) {
      alert('Lỗi khi xóa: ' + e.message);
    }
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `SoTayGiaoVien_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object' && parsed.classes && parsed.activeClassId) {
          if (onImportDatabase) {
             onImportDatabase(parsed);
             alert('Khôi phục dữ liệu từ tệp tin thành công!');
          }
        } else {
          alert('Tệp tin không đúng định dạng Sổ tay Giáo viên backup.');
        }
      } catch (err) {
        alert('Có lỗi xảy ra khi đọc file JSON.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const activeClass = db.classes[db.activeClassId];

  // Dynamic filter values collected from all existing classes in the DB
  const uniqueSchools = Array.from(new Set(
    Object.values(db.classes)
      .map(cls => cls.metadata.schoolName)
      .filter((s): s is string => !!s)
  ));

  const uniqueTeachers = Array.from(new Set(
    Object.values(db.classes)
      .map(cls => cls.metadata.teacherName)
      .filter((t): t is string => !!t)
  ));

  const uniqueSemesterYears = Array.from(new Set(
    Object.values(db.classes)
      .map(cls => {
        const sem = cls.metadata.semester || '';
        const year = cls.metadata.schoolYear || '';
        if (!sem && !year) return '';
        return `${sem ? `Học kỳ ${sem}` : ''} ${year ? `(NH ${year})` : ''}`.trim();
      })
      .filter(sy => sy !== '')
  ));

  const hasActiveFilters = searchQuery !== '' || filterSchool !== '' || filterSemesterYear !== '' || filterTeacher !== '';

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterSchool('');
    setFilterSemesterYear('');
    setFilterTeacher('');
  };

  // Perform search & filter match
  const filteredClasses = Object.values(db.classes).filter(cls => {
    // 1. School name filter
    if (filterSchool.trim()) {
      const schQuery = filterSchool.trim().toLowerCase();
      const schoolName = (cls.metadata.schoolName || '').toLowerCase();
      if (!schoolName.includes(schQuery)) return false;
    }
    // 2. Teacher name filter
    if (filterTeacher.trim()) {
      const tchQuery = filterTeacher.trim().toLowerCase();
      const teacher = (cls.metadata.teacherName || '').toLowerCase();
      if (!teacher.includes(tchQuery)) return false;
    }
    // 3. Semester & School year filter
    if (filterSemesterYear.trim()) {
      const syQuery = filterSemesterYear.trim().toLowerCase();
      const sem = cls.metadata.semester || '';
      const year = cls.metadata.schoolYear || '';
      const combo = `${sem ? `Học kỳ ${sem}` : ''} ${year ? `(NH ${year})` : ''}`.trim().toLowerCase();
      if (!combo.includes(syQuery)) return false;
    }
    // 4. Text search query (covers class code & subject name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const className = (cls.metadata.className || '').toLowerCase();
      const subjectName = (cls.metadata.subjectName || '').toLowerCase();
      if (!className.includes(query) && !subjectName.includes(query)) return false;
    }
    return true;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !newSubjectName.trim() || !newSemester.trim() || !newSchoolYear.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ thông tin lớp, môn học, học kỳ và năm học.');
      return;
    }
    onAddClass(
      newClassName.trim(),
      newSubjectName.trim(),
      newSemester.trim(),
      newSchoolYear.trim(),
      newTeacherName.trim()
    );
    setNewClassName('');
    setNewSubjectName('');
    setNewSemester('I');
    setNewSchoolYear('2025 - 2026');
    setNewTeacherName('');
    setErrorMsg('');
    setShowAddModal(false);
  };

  return (
    <div className="w-full bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 h-screen overflow-hidden">
      {/* Fixed Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-800/80 bg-slate-950 shrink-0 flex flex-col gap-1.5 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 shrink-0">
              <GraduationCap className="w-5.5 h-5.5 stroke-[1.5]" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-display font-extrabold tracking-wider text-white leading-tight uppercase">
                Sổ tay Giáo viên
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span className="text-slate-400 text-[10px] font-sans font-bold tracking-wider uppercase leading-none">
                  Cơ sở dữ liệu sư phạm
                </span>
              </div>
            </div>
          </div>
          
          {/* Mobile close button "X" inside Sidebar */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer flex items-center justify-center"
              title="Đóng thanh menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Dynamic Search & Filters Module directly under Header */}
        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-slate-800/80 space-y-3 font-sans shadow-inner">
          {/* Search Input and Filter Toggle Icon on the same line */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              </span>
              <input
                type="text"
                placeholder="Tìm tên lớp, môn học..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/50 text-xs text-white pl-8.5 pr-14 py-2.5 rounded-lg border-2 border-indigo-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 placeholder-slate-500 font-sans transition-all shadow-[0_0_10px_rgba(99,102,241,0.1)]"
              />
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[10px] font-extrabold text-rose-400 hover:text-rose-300 transition cursor-pointer font-sans"
                >
                  Xóa lọc
                </button>
              )}
            </div>

              {/* Filter Toggle Button */}
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`w-[38px] h-[38px] rounded-lg border-2 transition-all cursor-pointer flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 shadow-[0_0_10px_rgba(99,102,241,0.1)] ${
                  showFilters
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-950/50 border-indigo-500 text-indigo-400 hover:text-indigo-300 hover:border-indigo-400'
                }`}
                title={showFilters ? "Thu gọn bộ lọc" : "Mở rộng bộ lọc"}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Filter Dropdowns container */}
            {showFilters && (
              <div className="space-y-3 pt-3 border-t border-slate-800/50 animate-fade-in font-sans">
                {/* 1. Partner School filter */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 h-4 select-none">
                    <School className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                    <span>Trường liên kết</span>
                  </label>
                  <input
                    type="text"
                    list="school-suggestions"
                    value={filterSchool}
                    onChange={(e) => setFilterSchool(e.target.value)}
                    placeholder="Chọn hoặc nhập trường..."
                    className="w-full bg-slate-950 text-[11px] text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-800/80 focus:outline-none focus:border-indigo-500 font-sans shadow-xs"
                  />
                  <datalist id="school-suggestions">
                    {uniqueSchools.map(sch => (
                      <option key={sch} value={sch} />
                    ))}
                  </datalist>
                </div>

                {/* 2. Semester & Year filter */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 h-4 select-none">
                    <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>Học kỳ & Năm học</span>
                  </label>
                  <input
                    type="text"
                    list="semester-year-suggestions"
                    value={filterSemesterYear}
                    onChange={(e) => setFilterSemesterYear(e.target.value)}
                    placeholder="Chọn học kỳ, năm học..."
                    className="w-full bg-slate-950 text-[11px] text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-800/80 focus:outline-none focus:border-indigo-500 font-sans shadow-xs"
                  />
                  <datalist id="semester-year-suggestions">
                    {uniqueSemesterYears.map(sy => (
                      <option key={sy} value={sy} />
                    ))}
                  </datalist>
                </div>

                {/* 3. Teacher filter */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 h-4 select-none">
                    <UserCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Giảng viên</span>
                  </label>
                  <input
                    type="text"
                    list="teacher-suggestions"
                    value={filterTeacher}
                    onChange={(e) => setFilterTeacher(e.target.value)}
                    placeholder="Chọn tên giảng viên..."
                    className="w-full bg-slate-950 text-[11px] text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-800/80 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                  <datalist id="teacher-suggestions">
                    {uniqueTeachers.map(t => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
              </div>
            )}
          </div>
      </div>

      {/* Class/Subject Selector list */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-3">
        {/* Prominent Class List Header */}
        <div className="flex items-center justify-between px-2.5 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 shadow-xs select-none shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0 animate-pulse"></span>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">
              Danh sách lớp học ({filteredClasses.length}/{Object.keys(db.classes).length})
            </span>
          </div>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-550 text-white transition-all shadow-md flex items-center justify-center cursor-pointer border border-indigo-500/25 hover:scale-105 active:scale-95 shrink-0"
              title="Thêm lớp học mới"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          )}
        </div>

        <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
          {filteredClasses.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 italic bg-slate-950/10 rounded-xl border border-dashed border-slate-800/85 p-4 font-sans leading-relaxed">
              Không tìm thấy lớp học nào phù hợp với bộ lọc.
            </div>
          ) : (
            filteredClasses.map((cls) => {
              const isActive = cls.metadata.id === db.activeClassId;
              // Mặc định tất cả lớp đều thu gọn; chỉ mở nếu người dùng bấm expand
              const isExpanded = expandedClassIds[cls.metadata.id] === true;

              return (
                <div
                  key={cls.metadata.id}
                  className={`group relative flex flex-col rounded-xl p-4 transition-all duration-200 cursor-pointer border select-none ${
                    isActive
                      ? 'bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-750 border-indigo-500 text-white shadow-md shadow-indigo-950/20'
                      : 'text-slate-350 bg-slate-950/15 border-slate-850 hover:bg-slate-800/30 hover:border-slate-800 hover:text-slate-100'
                  }`}
                  onClick={() => {
                    if (isActive) {
                      setExpandedClassIds(prev => ({
                        ...prev,
                        [cls.metadata.id]: !isExpanded
                      }));
                    } else {
                      onClassChange(cls.metadata.id);
                      if (onClose) onClose();
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Class Code Row with prominent colored icon */}
                      <div className="flex items-center gap-1.5">
                        <div className={`p-1 rounded-md shrink-0 ${
                          isActive ? 'bg-white/20' : 'bg-indigo-500/15'
                        }`}>
                          <LayoutGrid className={`w-3.5 h-3.5 ${
                            isActive ? 'text-yellow-300' : 'text-indigo-400'
                          }`} />
                        </div>
                        <span className={`text-[13px] font-mono font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                          isActive ? 'bg-white/20 text-white font-black' : 'bg-slate-800 text-slate-200 border border-slate-700/50'
                        }`}>
                          {cls.metadata.className}
                        </span>
                      </div>
                      {/* Subject Name Row */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <BookMarked className={`w-3 h-3 shrink-0 ${
                          isActive ? 'text-indigo-200' : 'text-sky-400'
                        }`} />
                        <h4 className={`font-semibold text-xs leading-snug line-clamp-1 ${
                          isActive ? 'text-white font-bold' : 'text-slate-300'
                        }`}>
                          {cls.metadata.subjectName}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0 -mt-1 -mr-1">
                      {/* Expand/Collapse Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedClassIds(prev => ({
                            ...prev,
                            [cls.metadata.id]: !isExpanded
                          }));
                        }}
                        className={`p-1.5 rounded-md transition-all ${
                          isActive
                            ? 'opacity-65 hover:opacity-100 hover:bg-white/15 text-white'
                            : 'opacity-40 group-hover:opacity-100 text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                        }`}
                        title={isExpanded ? "Thu gọn chi tiết" : "Xem chi tiết"}
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleClassLock(cls.metadata.id);
                        }}
                        className={`p-1.5 rounded-md transition-all ${
                          cls.metadata.isLocked 
                            ? 'text-red-500 bg-red-500/10 hover:bg-red-500/25' 
                            : isActive
                              ? 'opacity-60 hover:opacity-100 hover:bg-white/10 text-white'
                              : 'opacity-40 group-hover:opacity-100 text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                        }`}
                        title={cls.metadata.isLocked ? "Mở khóa lớp học (Cho phép thay đổi dữ liệu)" : "Khóa lớp học (Chặn thay đổi dữ liệu)"}
                      >
                        {cls.metadata.isLocked ? (
                          <Lock className="w-3.5 h-3.5 cursor-pointer text-red-500" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5 cursor-pointer" />
                        )}
                      </button>

                      {Object.keys(db.classes).length > 1 && currentUser?.role === 'admin' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Bạn có chắc chắn muốn xoá lớp ${cls.metadata.className} không? Mọi dữ liệu điểm và điểm danh sẽ mất.`)) {
                              onDeleteClass(cls.metadata.id);
                            }
                          }}
                          className={`p-1.5 rounded-md transition-all ${
                            isActive 
                              ? 'opacity-60 hover:opacity-100 hover:bg-red-950/40 text-red-150' 
                              : 'opacity-40 group-hover:opacity-100 text-slate-500 hover:bg-red-950/10 hover:text-red-400'
                          }`}
                          title="Xoá lớp học"
                        >
                          <Trash2 className="w-3.5 h-3.5 cursor-pointer" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Metadata fields (animated expand/collapse) */}
                  <div className={`grid transition-all duration-300 ease-in-out overflow-hidden ${
                    isExpanded 
                      ? 'grid-rows-[1fr] opacity-100 mt-3' 
                      : 'grid-rows-[0fr] opacity-0 mt-0'
                  }`}>
                    <div className="min-h-0 space-y-1.5 pt-2.5 border-t border-dashed border-slate-500/15">
                      <div className="flex items-center gap-2">
                        <GraduationCap className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-yellow-300' : 'text-yellow-400'}`} />
                        <p className={`text-[11px] truncate ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                          GV: <span className="font-semibold">{cls.metadata.teacherName || 'Chưa cập nhật'}</span>
                        </p>
                      </div>

                      {cls.metadata.schoolName && (
                        <div className="flex items-center gap-2">
                          <School className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-pink-300' : 'text-pink-400'}`} />
                          <p className={`text-[11px] truncate ${isActive ? 'text-indigo-200/90' : 'text-slate-400'}`}>
                            {cls.metadata.schoolName}
                          </p>
                        </div>
                      )}

                      {/* Footer tags */}
                      <div className="flex items-center gap-2 pt-1">
                        <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold tracking-wide ${
                          isActive ? 'bg-white/15 text-white' : 'bg-slate-950/60 text-slate-400 border border-slate-800'
                        }`}>
                          <Compass className={`w-3 h-3 ${isActive ? 'text-teal-300' : 'text-teal-400'}`} />
                          HK {cls.metadata.semester || 'I'}
                        </span>
                        <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold tracking-wide ${
                          isActive ? 'bg-white/15 text-white' : 'bg-slate-950/60 text-slate-400 border border-slate-800'
                        }`}>
                          <Calendar className={`w-3 h-3 ${isActive ? 'text-blue-300' : 'text-blue-400'}`} />
                          {cls.metadata.schoolYear || '2025 - 2026'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Personnel (Lecturer & Student) Management sidebar menu option */}
      {activeClass && (
        <div className="px-4 py-3 border-t border-slate-800/80 bg-slate-950/15 shrink-0">
          <button 
            onClick={() => setIsManagementMenuExpanded(!isManagementMenuExpanded)}
            className="w-full flex items-center justify-between px-2 text-slate-400 hover:text-slate-200 transition cursor-pointer mb-2 select-none group"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span>Quản trị &amp; Thành viên</span>
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isManagementMenuExpanded ? 'rotate-180' : ''}`} />
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 space-y-2 ${isManagementMenuExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
            <button
              onClick={() => {
                onActiveTabChange('management');
                if (onClose) onClose();
              }}
              className={`w-full flex items-center gap-3.5 p-3 rounded-xl transition-all duration-200 cursor-pointer text-left border ${
                activeTab === 'management'
                  ? 'bg-indigo-600 border-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/10'
                  : 'text-slate-350 hover:bg-slate-800/35 hover:text-slate-100 border-slate-850 bg-slate-950/20 hover:border-slate-800'
              }`}
              title="Quản lý Giảng viên và Học viên"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                activeTab === 'management' ? 'bg-white/15 text-white' : 'bg-slate-950/50 text-indigo-400 border border-slate-800'
              }`}>
                <Users className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0 font-sans">
                <p className={`text-xs font-bold leading-none select-none ${activeTab === 'management' ? 'text-white' : 'text-slate-200'}`}>
                  Hồ sơ giảng viên & học viên
                </p>
                <p className={`text-[10px] mt-1.5 select-none leading-none truncate ${activeTab === 'management' ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {activeClass.students.length} học viên • {activeClass.metadata.teacherName || 'Chưa phân công'}
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Storage and System Settings Action Block */}
      {currentUser?.role === 'admin' && (
        <div className="p-4 border-t border-slate-800/80 bg-slate-950 shrink-0 text-sans">
          <button 
            onClick={() => setIsSystemMenuExpanded(!isSystemMenuExpanded)}
            className="w-full flex items-center justify-between px-2 text-slate-400 hover:text-slate-200 text-[10px] font-bold uppercase tracking-wider select-none mb-3 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Dữ liệu &amp; Hệ thống</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isSystemMenuExpanded ? '' : '-rotate-90'}`} />
          </button>

        {isSystemMenuExpanded && (
          <div className="animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="grid grid-cols-2 gap-2">
              {/* Backup button */}
              <button
                onClick={handleCreateBackup}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition border border-emerald-800/50 hover:border-emerald-700/60 cursor-pointer shadow-sm select-none"
                title="Tạo bản sao lưu hệ thống"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Backup</span>
              </button>

              {/* Restore button */}
              <button
                onClick={handleOpenRestore}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-400 hover:text-indigo-300 text-xs font-bold transition border border-indigo-800/50 hover:border-indigo-700/60 cursor-pointer shadow-sm select-none"
                title="Khôi phục dữ liệu từ các bản sao lưu"
              >
                <History className="w-3.5 h-3.5 shrink-0" />
                <span>Restore</span>
              </button>

              {/* Export JSON button */}
              <button
                onClick={exportJSON}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-400 hover:text-amber-300 text-xs font-bold transition border border-amber-800/50 hover:border-amber-700/60 cursor-pointer shadow-sm select-none"
                title="Xuất dữ liệu ra file JSON"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Xuất File</span>
              </button>

              {/* Import JSON button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-sky-950/40 hover:bg-sky-900/60 text-sky-400 hover:text-sky-300 text-xs font-bold transition border border-sky-800/50 hover:border-sky-700/60 cursor-pointer shadow-sm select-none"
                title="Nhập dữ liệu từ file JSON"
              >
                <Database className="w-3.5 h-3.5 shrink-0" />
                <span>Nhập File</span>
              </button>
              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleImportFile}
                className="hidden"
              />
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-900/80 flex justify-between items-center text-[10px] text-slate-500 px-1 font-mono select-none">
              <span className="flex items-center gap-1">
                {sqliteInfo?.ready ? (
                  <>
                    <HardDrive className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span className="text-indigo-400 font-bold">SQLite</span>
                    <span className="text-slate-500">• {(sqliteInfo.sizeBytes / 1024).toFixed(1)} KB</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
                    <span>BỘ NHỜ LOCAL</span>
                  </>
                )}
              </span>
              <span>Sỹ số: {activeClass?.students.length || 0}</span>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Restore Modal popup */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-semibold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400 shrink-0" />
                <span>Khôi phục dữ liệu</span>
              </h3>
              <button 
                onClick={() => setShowRestoreModal(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin space-y-2 mb-4 min-h-[150px]">
              {backupsList.length === 0 ? (
                <div className="text-center text-slate-500 py-8 text-sm italic border border-dashed border-slate-800 rounded-lg">
                  Chưa có bản sao lưu nào. <br/> Hãy dùng chức năng Backup để tạo!
                </div>
              ) : (
                backupsList.map(b => (
                  <div key={b.id} className="flex items-center justify-between bg-slate-950 border border-slate-800 p-3 rounded-lg hover:border-slate-700 transition">
                    <div>
                      <div className="text-sm font-semibold text-slate-200">{b.date}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{b.id}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRestoreBackup(b.id)}
                        className="p-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 hover:text-indigo-300 rounded-md transition"
                        title="Khôi phục bản này"
                      >
                        <ArrowDownToLine className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBackup(b.id)}
                        className="p-2 bg-rose-600/10 hover:bg-rose-600/30 text-rose-500 hover:text-rose-400 rounded-md transition"
                        title="Xóa bản sao lưu"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowRestoreModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-lg transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Class Modal popup */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400 shrink-0" />
              <span>Thêm Lớp & Môn học mới</span>
            </h3>
            <form onSubmit={handleAddSubmit} className="space-y-4 font-sans">
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5 h-6">
                  <Hash className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Tên Lớp (Mã lớp)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 18PMA1_CS2"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5 h-6">
                  <BookOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Tên Môn học/Mô-đun</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Lắp ráp và Bảo trì Máy tính"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5 h-6">
                  <UserCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Giảng viên giảng dạy</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: NGUYỄN VĂN HÙNG"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-805 p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5 h-6">
                    <Compass className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>Học kỳ</span>
                  </label>
                  <select
                    value={newSemester}
                    onChange={(e) => setNewSemester(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-sans cursor-pointer"
                  >
                    <option value="I">Học kỳ I</option>
                    <option value="II">Học kỳ II</option>
                    <option value="III">Học kỳ III</option>
                    <option value="Học kỳ phụ">Học kỳ phụ</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5 h-6">
                    <Calendar className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                    <span>Năm học</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 2025 - 2026"
                    value={newSchoolYear}
                    onChange={(e) => setNewSchoolYear(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>
              </div>

              {errorMsg && <p className="text-red-400 text-xs font-sans mt-1">⚠️ {errorMsg}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setErrorMsg('');
                  }}
                  className="flex-1 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 text-sm font-semibold rounded-lg transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-650 hover:bg-indigo-600 text-white text-sm font-semibold rounded-lg transition cursor-pointer shadow-md"
                >
                  Tạo lớp học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
