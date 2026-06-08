/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { 
  Users, 
  UserSquare2, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Upload, 
  Search, 
  GraduationCap, 
  AlertTriangle, 
  FileText, 
  FileSpreadsheet,
  CheckCircle, 
  HelpCircle, 
  Save, 
  PenTool, 
  Calendar, 
  Phone, 
  ChevronDown,
  GraduationCap as SchoolIcon 
} from 'lucide-react';
import { Student, ClassMetadata, Grade, Teacher } from '../types';

interface TabManagementProps {
  students: Student[];
  grades: Grade[];
  teachers: Teacher[];
  classMetadata: ClassMetadata;
  onUpdateMetadata: (updated: Partial<ClassMetadata>) => void;
  onAddStudent: (
    studentCode: string, 
    lastName: string, 
    firstName: string, 
    schoolName?: string, 
    phoneNumber?: string, 
    birthDate?: string,
    bcs?: string
  ) => void;
  onAddBulkStudents: (
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
  onUpdateStudent: (
    studentId: string, 
    studentCode: string, 
    lastName: string, 
    firstName: string, 
    schoolName?: string, 
    phoneNumber?: string, 
    birthDate?: string,
    bcs?: string
  ) => void;
  onAddTeacher: (
    teacherCode: string, 
    lastName: string, 
    firstName: string, 
    phoneNumber?: string, 
    email?: string, 
    specialty?: string,
    department?: string
  ) => void;
  onAddBulkTeachers: (
    bulkList: { 
      teacherCode: string; 
      lastName: string; 
      firstName: string; 
      phoneNumber?: string; 
      email?: string; 
      specialty?: string; 
      department?: string;
    }[]
  ) => void;
  onDeleteTeacher: (teacherId: string) => void;
  onUpdateTeacher: (
    teacherId: string, 
    teacherCode: string, 
    lastName: string, 
    firstName: string, 
    phoneNumber?: string, 
    email?: string, 
    specialty?: string,
    department?: string
  ) => void;
}

export default function TabManagement({
  students,
  grades,
  teachers = [],
  classMetadata,
  onUpdateMetadata,
  onAddStudent,
  onAddBulkStudents,
  onDeleteStudent,
  onUpdateStudent,
  onAddTeacher,
  onAddBulkTeachers,
  onDeleteTeacher,
  onUpdateTeacher
}: TabManagementProps) {
  // Management sub-tabs: 'students' | 'teachers_list' | 'teachers'
  const [subTab, setSubTab] = useState<'students' | 'teachers_list' | 'teachers'>('students');

  // Search Filter state
  const [searchTerm, setSearchTerm] = useState('');

  // Sorter State
  const [sortBy, setSortBy] = useState<'studentCode' | 'firstName' | 'schoolName' | 'bcs' | 'none'>('studentCode');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Single Student Input state
  const [newCode, setNewCode] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newBcs, setNewBcs] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Bulk Paste Import state
  const [bulkText, setBulkText] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [bulkPreview, setBulkPreview] = useState<{ 
    studentCode: string; 
    lastName: string; 
    firstName: string; 
    schoolName?: string; 
    phoneNumber?: string; 
    birthDate?: string; 
    bcs?: string;
  }[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [importMode, setImportMode] = useState<'paste' | 'excel'>('paste');

  // Row Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editSchoolName, setEditSchoolName] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editBcs, setEditBcs] = useState('');

  // Row Deleting confirmation check
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Single Teacher Input state
  const [tchCode, setTchCode] = useState('');
  const [tchLastName, setTchLastName] = useState('');
  const [tchFirstName, setTchFirstName] = useState('');
  const [tchPhoneNumber, setTchPhoneNumber] = useState('');
  const [tchEmail, setTchEmail] = useState('');
  const [tchSpecialty, setTchSpecialty] = useState('');
  const [tchDepartment, setTchDepartment] = useState('');
  const [tchFormError, setTchFormError] = useState('');
  const [tchSuccessMsg, setTchSuccessMsg] = useState('');

  // Bulk Paste Import for Teachers
  const [tchBulkText, setTchBulkText] = useState('');
  const [tchBulkError, setTchBulkError] = useState('');
  const [tchBulkPreview, setTchBulkPreview] = useState<{ 
    teacherCode: string; 
    lastName: string; 
    firstName: string; 
    phoneNumber?: string; 
    email?: string; 
    specialty?: string; 
    department?: string;
  }[]>([]);
  const [showTchBulkModal, setShowTchBulkModal] = useState(false);
  const [tchImportMode, setTchImportMode] = useState<'paste' | 'excel'>('paste');

  // Teacher Sorting and Searching State
  const [tchSearchTerm, setTchSearchTerm] = useState('');
  const [tchSortBy, setTchSortBy] = useState<'teacherCode' | 'firstName' | 'specialty' | 'department' | 'none'>('teacherCode');
  const [tchSortOrder, setTchSortOrder] = useState<'asc' | 'desc'>('asc');

  // Teacher Row Editing state
  const [editingTchId, setEditingTchId] = useState<string | null>(null);
  const [editTchCode, setEditTchCode] = useState('');
  const [editTchLastName, setEditTchLastName] = useState('');
  const [editTchFirstName, setEditTchFirstName] = useState('');
  const [editTchPhoneNumber, setEditTchPhoneNumber] = useState('');
  const [editTchEmail, setEditTchEmail] = useState('');
  const [editTchSpecialty, setEditTchSpecialty] = useState('');
  const [editTchDepartment, setEditTchDepartment] = useState('');

  // Teacher Deleting confirmation
  const [confirmDeleteTchId, setConfirmDeleteTchId] = useState<string | null>(null);

  const getNextSuggestedTchCode = () => {
    if (!teachers || teachers.length === 0) return 'GV001';
    const codes = teachers
      .map(t => t.teacherCode.trim().toUpperCase())
      .filter(code => /^[a-zA-Z]+[0-9]+$/.test(code));
    if (codes.length === 0) return 'GV001';
    const lastCode = teachers[teachers.length - 1].teacherCode;
    const numPart = lastCode.match(/\d+$/);
    if (numPart) {
      const originalNumStr = numPart[0];
      const incrementedNum = parseInt(originalNumStr, 10) + 1;
      const zeroPaddedNum = String(incrementedNum).padStart(originalNumStr.length, '0');
      return lastCode.slice(0, lastCode.length - originalNumStr.length) + zeroPaddedNum;
    }
    return 'GV001';
  };

  React.useEffect(() => {
    if (!tchCode) {
      const sug = getNextSuggestedTchCode();
      if (sug) setTchCode(sug);
    }
  }, [teachers, tchCode]);

  // Suggesting sequential Student ID Code based on existing list
  const getNextSuggestedCode = () => {
    if (students.length === 0) return '25PM00001';
    
    const codes = students
      .map(s => s.studentCode.trim().toUpperCase())
      .filter(code => /^[0-9]+[A-Z]+[0-9]+$/.test(code) || /^[0-9]+[0-9]+$/.test(code) || /^[A-Z0-9]+$/.test(code));
    
    if (codes.length === 0) return '';
    
    // Get last student's code
    const lastCode = students[students.length - 1].studentCode;
    const numPart = lastCode.match(/\d+$/);
    if (numPart) {
      const originalNumStr = numPart[0];
      const incrementedNum = parseInt(originalNumStr, 10) + 1;
      const zeroPaddedNum = String(incrementedNum).padStart(originalNumStr.length, '0');
      return lastCode.slice(0, lastCode.length - originalNumStr.length) + zeroPaddedNum;
    }
    return '';
  };

  // Pre-fill suggested code
  React.useEffect(() => {
    if (!newCode) {
      const sug = getNextSuggestedCode();
      if (sug) setNewCode(sug);
    }
  }, [students, newCode]);

  // Handle single student addition
  const handleSingleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    const trimmedCode = newCode.trim().toUpperCase();
    const trimmedLast = newLastName.trim();
    const trimmedFirst = newFirstName.trim();

    if (!trimmedCode || !trimmedLast || !trimmedFirst) {
      setFormError('Vui lòng nhập đầy đủ: Mã số, Họ đệm và Tên học viên.');
      return;
    }

    if (students.some(s => s.studentCode === trimmedCode)) {
      setFormError(`Mã số học viên [${trimmedCode}] đã tồn tại trong lớp.`);
      return;
    }

    onAddStudent(
      trimmedCode, 
      trimmedLast, 
      trimmedFirst, 
      newSchoolName.trim(), 
      newPhoneNumber.trim(), 
      newBirthDate.trim(),
      newBcs.trim()
    );
    
    setSuccessMsg(`Đã thêm thành công học viên: ${trimmedLast} ${trimmedFirst}`);
    
    // Auto increment sequential code for next insert
    const nextCode = getNextSuggestedCode();
    if (nextCode && nextCode !== trimmedCode) {
      setNewCode(nextCode);
    } else {
      setNewCode('');
    }
    setNewLastName('');
    setNewFirstName('');
    setNewSchoolName('');
    setNewPhoneNumber('');
    setNewBirthDate('');
    setNewBcs('');

    setTimeout(() => {
      setSuccessMsg('');
    }, 4500);
  };

  // Automated parsing helper for Bulk text input (supports up to 6 columns or split-name fallbacks)
  const parseBulkText = () => {
    setBulkError('');
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const parsedList: typeof bulkPreview = [];

    const baseSuggested = getNextSuggestedCode() || '25PM00001';
    let seqIndex = 0;

    const generateSeqCode = () => {
      const numPart = baseSuggested.match(/\d+$/);
      if (numPart) {
        const originalNumStr = numPart[0];
        const incrementedNum = parseInt(originalNumStr, 10) + seqIndex;
        seqIndex++;
        const zeroPaddedNum = String(incrementedNum).padStart(originalNumStr.length, '0');
        return baseSuggested.slice(0, baseSuggested.length - originalNumStr.length) + zeroPaddedNum;
      }
      seqIndex++;
      return `ST_${Date.now()}_${seqIndex}`;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Split by common delimiters
      const delimiter = line.includes(',') ? ',' : line.includes('\t') ? '\t' : line.includes(';') ? ';' : line.includes('|') ? '|' : null;

      if (delimiter && line.includes(delimiter)) {
        const parts = line.split(delimiter).map(p => p.trim());
        if (parts.length >= 3) {
          // Format expected: Code, Last Name, First Name, School, Phone, Birthday, BCS
          parsedList.push({
            studentCode: parts[0].toUpperCase(),
            lastName: parts[1],
            firstName: parts[2],
            schoolName: parts[3] || '',
            phoneNumber: parts[4] || '',
            birthDate: parts[5] || '',
            bcs: parts[6] || ''
          });
        } else if (parts.length === 2) {
          // LastName, FirstName
          parsedList.push({
            studentCode: generateSeqCode(),
            lastName: parts[0],
            firstName: parts[1],
            schoolName: '',
            phoneNumber: '',
            birthDate: ''
          });
        }
      } else {
        // Space delimiter attempt
        const words = line.split(/\s+/).filter(w => w.length > 0);
        if (words.length < 2) continue;

        const firstWord = words[0];
        // Guess if first word is a student code sequence
        const hasCode = /^[0-9]+[A-Z]+[0-9]+$/.test(firstWord) || /^[a-zA-Z0-9]{5,15}$/.test(firstWord);

        if (hasCode && words.length >= 3) {
          const code = firstWord.toUpperCase();
          const firstName = words[words.length - 1];
          const lastName = words.slice(1, words.length - 1).join(' ');
          parsedList.push({
            studentCode: code,
            lastName,
            firstName,
            schoolName: '',
            phoneNumber: '',
            birthDate: ''
          });
        } else if (hasCode && words.length === 2) {
          const code = firstWord.toUpperCase();
          parsedList.push({
            studentCode: code,
            lastName: 'Học viên',
            firstName: words[1],
            schoolName: '',
            phoneNumber: '',
            birthDate: ''
          });
        } else {
          // Pure full name "Trần Văn Toàn"
          const firstName = words[words.length - 1];
          const lastName = words.slice(0, words.length - 1).join(' ');
          parsedList.push({
            studentCode: generateSeqCode(),
            lastName,
            firstName,
            schoolName: '',
            phoneNumber: '',
            birthDate: ''
          });
        }
      }
    }

    if (parsedList.length === 0) {
      setBulkError('Không tìm thấy dòng dữ liệu nào hợp lệ. Thử phân cách bằng dấu phẩy: Mã, Họ lót, Tên, Tên trường, SĐT, Ngày sinh');
      return;
    }

    setBulkPreview(parsedList);
  };

  const handleStudentExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBulkError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const rawRes = evt.target?.result;
        if (!rawRes) return;
        const data = new Uint8Array(rawRes as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (rawRows.length === 0) {
          setBulkError('File excel không chứa dữ liệu hoặc bị lỗi.');
          return;
        }

        const validRows = rawRows.filter(row => row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== ''));
        if (validRows.length === 0) {
          setBulkError('Không tìm thấy dòng dữ liệu nào trong file Excel.');
          return;
        }

        const firstRow = validRows[0].map(c => String(c || '').trim().toLowerCase());
        let hasHeader = false;
        
        let codeIdx = -1;
        let lastIdx = -1;
        let firstIdx = -1;
        let schoolIdx = -1;
        let phoneIdx = -1;
        let bdayIdx = -1;
        let bcsIdx = -1;

        firstRow.forEach((val, idx) => {
          if (val.includes('mã') || val.includes('code') || val.includes('ms')) {
            codeIdx = idx;
            hasHeader = true;
          } else if (val.includes('họ') || val.includes('lót') || val.includes('ho ') || val.includes('ho_')) {
            lastIdx = idx;
            hasHeader = true;
          } else if (val === 'tên' || val === 'ten' || val.includes('tên hs') || val.includes('tên sv') || val.includes('first_name') || val.includes('first name')) {
            firstIdx = idx;
            hasHeader = true;
          } else if (val.includes('trường') || val.includes('truong') || val.includes('school')) {
            schoolIdx = idx;
            hasHeader = true;
          } else if (val.includes('đt') || val.includes('sđt') || val.includes('thoại') || val.includes('phone') || val.includes('số đt') || val.includes('điện thoại')) {
            phoneIdx = idx;
            hasHeader = true;
          } else if (val.includes('sinh') || val.includes('birth') || val.includes('bday') || val.includes('ngày sinh')) {
            bdayIdx = idx;
            hasHeader = true;
          } else if (val.includes('cán sự') || val.includes('bcs') || val.includes('lớp trưởng') || val.includes('bí thư') || val.includes('chức vụ')) {
            bcsIdx = idx;
            hasHeader = true;
          }
        });

        if (!hasHeader || (lastIdx === -1 && firstIdx === -1)) {
          codeIdx = 0;
          lastIdx = 1;
          firstIdx = 2;
          schoolIdx = 3;
          phoneIdx = 4;
          bdayIdx = 5;
          bcsIdx = 6;
        }

        const parsedList: typeof bulkPreview = [];
        const baseSuggested = getNextSuggestedCode() || '25PM00001';
        let seqIndex = 0;

        const generateSeqCode = () => {
          const numPart = baseSuggested.match(/\d+$/);
          if (numPart) {
            const originalNumStr = numPart[0];
            const incrementedNum = parseInt(originalNumStr, 10) + seqIndex;
            seqIndex++;
            const zeroPaddedNum = String(incrementedNum).padStart(originalNumStr.length, '0');
            return baseSuggested.slice(0, baseSuggested.length - originalNumStr.length) + zeroPaddedNum;
          }
          seqIndex++;
          return `ST_${Date.now()}_${seqIndex}`;
        };

        const dataRows = hasHeader ? validRows.slice(1) : validRows;

        for (let row of dataRows) {
          if (row.length === 0) continue;
          
          let stCode = '';
          if (codeIdx !== -1 && row[codeIdx] !== undefined && row[codeIdx] !== null) {
            stCode = String(row[codeIdx]).trim();
          }
          if (!stCode) {
            stCode = generateSeqCode();
          }

          let lName = '';
          if (lastIdx !== -1 && row[lastIdx] !== undefined && row[lastIdx] !== null) {
            lName = String(row[lastIdx]).trim();
          }

          let fName = '';
          if (firstIdx !== -1 && row[firstIdx] !== undefined && row[firstIdx] !== null) {
            fName = String(row[firstIdx]).trim();
          }

          if (lName && !fName) {
            const words = lName.split(/\s+/).filter(w => w.length > 0);
            if (words.length >= 2) {
              fName = words[words.length - 1];
              lName = words.slice(0, words.length - 1).join(' ');
            } else {
              fName = lName;
              lName = 'Học viên';
            }
          }

          if (!fName && !lName) continue;

          let schl = '';
          if (schoolIdx !== -1 && row[schoolIdx] !== undefined && row[schoolIdx] !== null) {
            schl = String(row[schoolIdx]).trim();
          }

          let ph = '';
          if (phoneIdx !== -1 && row[phoneIdx] !== undefined && row[phoneIdx] !== null) {
            ph = String(row[phoneIdx]).trim();
          }

          let bDayStr = '';
          if (bdayIdx !== -1 && row[bdayIdx] !== undefined && row[bdayIdx] !== null) {
            const rawVal = row[bdayIdx];
            if (typeof rawVal === 'number' && rawVal > 1000) {
              try {
                const dateObj = XLSX.SSF.parse_date_code(rawVal);
                const d = String(dateObj.d).padStart(2, '0');
                const m = String(dateObj.m).padStart(2, '0');
                bDayStr = `${d}/${m}/${dateObj.y}`;
              } catch {
                bDayStr = String(rawVal);
              }
            } else {
              bDayStr = String(rawVal).trim();
            }
          }

          let classRole = '';
          if (bcsIdx !== -1 && row[bcsIdx] !== undefined && row[bcsIdx] !== null) {
            classRole = String(row[bcsIdx]).trim();
          }

          parsedList.push({
            studentCode: stCode.toUpperCase(),
            lastName: lName || 'Học viên',
            firstName: fName,
            schoolName: schl,
            phoneNumber: ph,
            birthDate: bDayStr,
            bcs: classRole
          });
        }

        if (parsedList.length === 0) {
          setBulkError('Không thể phân tích dữ liệu hợp lệ nào từ file excel.');
        } else {
          setBulkPreview(parsedList);
        }
      } catch (err: any) {
        setBulkError(`Đã có lỗi xảy ra khi đọc file Excel: ${err.message || err}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkSubmitSubmit = () => {
    if (bulkPreview.length === 0) return;
    onAddBulkStudents(bulkPreview);
    setBulkText('');
    setBulkPreview([]);
    setShowBulkModal(false);
    
    setSuccessMsg(`Đã nhập thành công ${bulkPreview.length} học viên mới từ danh sách tải lên!`);
    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  // Row Editing handlers
  const startRowEdit = (std: Student) => {
    setEditingId(std.id);
    setEditCode(std.studentCode);
    setEditLastName(std.lastName);
    setEditFirstName(std.firstName);
    setEditSchoolName(std.schoolName || '');
    setEditPhoneNumber(std.phoneNumber || '');
    setEditBirthDate(std.birthDate || '');
    setEditBcs(std.bcs || '');
  };

  const saveRowEdit = (stdId: string) => {
    if (!editCode.trim() || !editLastName.trim() || !editFirstName.trim()) {
      alert('Vui lòng không để trống Mã số, Họ đệm hoặc Tên học viên.');
      return;
    }
    onUpdateStudent(
      stdId, 
      editCode, 
      editLastName, 
      editFirstName, 
      editSchoolName, 
      editPhoneNumber, 
      editBirthDate,
      editBcs
    );
    setEditingId(null);
  };

  // Single Add Teacher
  const handleSingleAddTch = (e: React.FormEvent) => {
    e.preventDefault();
    setTchFormError('');
    setTchSuccessMsg('');

    const trimmedCode = tchCode.trim().toUpperCase();
    const trimmedLast = tchLastName.trim();
    const trimmedFirst = tchFirstName.trim();

    if (!trimmedCode || !trimmedLast || !trimmedFirst) {
      setTchFormError('Vui lòng nhập đầy đủ: Mã số, Họ đệm và Tên giảng viên/giáo viên.');
      return;
    }

    if (teachers.some(t => t.teacherCode === trimmedCode)) {
      setTchFormError(`Mã số giáo viên [${trimmedCode}] đã tồn tại.`);
      return;
    }

    onAddTeacher(
      trimmedCode,
      trimmedLast,
      trimmedFirst,
      tchPhoneNumber.trim(),
      tchEmail.trim(),
      tchSpecialty.trim(),
      tchDepartment.trim()
    );

    setTchSuccessMsg(`Đã thêm thành công giáo viên: ${trimmedLast} ${trimmedFirst}`);

    const nextCode = getNextSuggestedTchCode();
    if (nextCode && nextCode !== trimmedCode) {
      setTchCode(nextCode);
    } else {
      setTchCode('');
    }
    setTchLastName('');
    setTchFirstName('');
    setTchPhoneNumber('');
    setTchEmail('');
    setTchSpecialty('');
    setTchDepartment('');

    setTimeout(() => {
      setTchSuccessMsg('');
    }, 4500);
  };

  // Parse bulk text for teachers
  const parseTchBulkText = () => {
    setTchBulkError('');
    const lines = tchBulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const parsedList: typeof tchBulkPreview = [];

    const baseSuggested = getNextSuggestedTchCode() || 'GV001';
    let seqIndex = 0;

    const generateSeqCode = () => {
      const numPart = baseSuggested.match(/\d+$/);
      if (numPart) {
        const originalNumStr = numPart[0];
        const incrementedNum = parseInt(originalNumStr, 10) + seqIndex;
        seqIndex++;
        const zeroPaddedNum = String(incrementedNum).padStart(originalNumStr.length, '0');
        return baseSuggested.slice(0, baseSuggested.length - originalNumStr.length) + zeroPaddedNum;
      }
      seqIndex++;
      return `GV_${Date.now()}_${seqIndex}`;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const delimiter = line.includes(',') ? ',' : line.includes('\t') ? '\t' : line.includes(';') ? ';' : line.includes('|') ? '|' : null;

      if (delimiter && line.includes(delimiter)) {
        const parts = line.split(delimiter).map(p => p.trim());
        if (parts.length >= 3) {
          parsedList.push({
            teacherCode: parts[0].toUpperCase(),
            lastName: parts[1],
            firstName: parts[2],
            phoneNumber: parts[3] || '',
            email: parts[4] || '',
            specialty: parts[5] || '',
            department: parts[6] || ''
          });
        } else if (parts.length === 2) {
          parsedList.push({
            teacherCode: generateSeqCode(),
            lastName: parts[0],
            firstName: parts[1],
            phoneNumber: '',
            email: '',
            specialty: '',
            department: ''
          });
        }
      } else {
        const words = line.split(/\s+/).filter(w => w.length > 0);
        if (words.length < 2) continue;

        const firstWord = words[0];
        const hasCode = /^[a-zA-Z]+[0-9]+$/.test(firstWord) || /^[a-zA-Z0-9_]{3,15}$/.test(firstWord);

        if (hasCode && words.length >= 3) {
          const code = firstWord.toUpperCase();
          const firstName = words[words.length - 1];
          const lastName = words.slice(1, words.length - 1).join(' ');
          parsedList.push({
            teacherCode: code,
            lastName,
            firstName,
            phoneNumber: '',
            email: '',
            specialty: '',
            department: ''
          });
        } else {
          const firstName = words[words.length - 1];
          const lastName = words.slice(0, words.length - 1).join(' ');
          parsedList.push({
            teacherCode: generateSeqCode(),
            lastName,
            firstName,
            phoneNumber: '',
            email: '',
            specialty: '',
            department: ''
          });
        }
      }
    }

    if (parsedList.length === 0) {
      setTchBulkError('Không tìm thấy dòng dữ liệu nào hợp lệ. Định dạng mẫu: GV001, Nguyễn Văn, Hùng, 090..., email@..., Chuyên môn, Đơn vị');
      return;
    }

    setTchBulkPreview(parsedList);
  };

  const handleTeacherExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTchBulkError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const rawRes = evt.target?.result;
        if (!rawRes) return;
        const data = new Uint8Array(rawRes as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (rawRows.length === 0) {
          setTchBulkError('File excel không chứa dữ liệu hoặc bị lỗi.');
          return;
        }

        const validRows = rawRows.filter(row => row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== ''));
        if (validRows.length === 0) {
          setTchBulkError('Không tìm thấy dòng dữ liệu nào trong file Excel.');
          return;
        }

        const firstRow = validRows[0].map(c => String(c || '').trim().toLowerCase());
        let hasHeader = false;
        
        let codeIdx = -1;
        let lastIdx = -1;
        let firstIdx = -1;
        let phoneIdx = -1;
        let emailIdx = -1;
        let specIdx = -1;
        let deptIdx = -1;

        firstRow.forEach((val, idx) => {
          if (val.includes('mã') || val.includes('code') || val.includes('gv')) {
            codeIdx = idx;
            hasHeader = true;
          } else if (val.includes('họ') || val.includes('lót') || val.includes('ho ') || val.includes('ho_')) {
            lastIdx = idx;
            hasHeader = true;
          } else if (val === 'tên' || val === 'ten' || val.includes('tên gv') || val.includes('tên giảng viên') || val.includes('first_name') || val.includes('first name')) {
            firstIdx = idx;
            hasHeader = true;
          } else if (val.includes('đt') || val.includes('sđt') || val.includes('thoại') || val.includes('phone') || val.includes('số đt') || val.includes('điện thoại')) {
            phoneIdx = idx;
            hasHeader = true;
          } else if (val.includes('email') || val.includes('thư') || val.includes('mail')) {
            emailIdx = idx;
            hasHeader = true;
          } else if (val.includes('môn') || val.includes('chuyên') || val.includes('dạy') || val.includes('specialty')) {
            specIdx = idx;
            hasHeader = true;
          } else if (val.includes('bộ môn') || val.includes('khoa') || val.includes('phòng') || val.includes('đơn vị') || val.includes('department')) {
            deptIdx = idx;
            hasHeader = true;
          }
        });

        if (!hasHeader || (lastIdx === -1 && firstIdx === -1)) {
          codeIdx = 0;
          lastIdx = 1;
          firstIdx = 2;
          phoneIdx = 3;
          emailIdx = 4;
          specIdx = 5;
          deptIdx = 6;
        }

        const parsedList: typeof tchBulkPreview = [];
        const baseSuggested = getNextSuggestedTchCode() || 'GV001';
        let seqIndex = 0;

        const generateSeqCode = () => {
          const numPart = baseSuggested.match(/\d+$/);
          if (numPart) {
            const originalNumStr = numPart[0];
            const incrementedNum = parseInt(originalNumStr, 10) + seqIndex;
            seqIndex++;
            const zeroPaddedNum = String(incrementedNum).padStart(originalNumStr.length, '0');
            return baseSuggested.slice(0, baseSuggested.length - originalNumStr.length) + zeroPaddedNum;
          }
          seqIndex++;
          return `GV_${Date.now()}_${seqIndex}`;
        };

        const dataRows = hasHeader ? validRows.slice(1) : validRows;

        for (let row of dataRows) {
          if (row.length === 0) continue;
          
          let tCode = '';
          if (codeIdx !== -1 && row[codeIdx] !== undefined && row[codeIdx] !== null) {
            tCode = String(row[codeIdx]).trim();
          }
          if (!tCode) {
            tCode = generateSeqCode();
          }

          let lName = '';
          if (lastIdx !== -1 && row[lastIdx] !== undefined && row[lastIdx] !== null) {
            lName = String(row[lastIdx]).trim();
          }

          let fName = '';
          if (firstIdx !== -1 && row[firstIdx] !== undefined && row[firstIdx] !== null) {
            fName = String(row[firstIdx]).trim();
          }

          if (lName && !fName) {
            const words = lName.split(/\s+/).filter(w => w.length > 0);
            if (words.length >= 2) {
              fName = words[words.length - 1];
              lName = words.slice(0, words.length - 1).join(' ');
            } else {
              fName = lName;
              lName = 'Giáo viên';
            }
          }

          if (!fName && !lName) continue;

          let ph = '';
          if (phoneIdx !== -1 && row[phoneIdx] !== undefined && row[phoneIdx] !== null) {
            ph = String(row[phoneIdx]).trim();
          }

          let em = '';
          if (emailIdx !== -1 && row[emailIdx] !== undefined && row[emailIdx] !== null) {
            em = String(row[emailIdx]).trim();
          }

          let spec = '';
          if (specIdx !== -1 && row[specIdx] !== undefined && row[specIdx] !== null) {
            spec = String(row[specIdx]).trim();
          }

          let dept = '';
          if (deptIdx !== -1 && row[deptIdx] !== undefined && row[deptIdx] !== null) {
            dept = String(row[deptIdx]).trim();
          }

          parsedList.push({
            teacherCode: tCode.toUpperCase(),
            lastName: lName || 'Giáo viên',
            firstName: fName,
            phoneNumber: ph,
            email: em,
            specialty: spec,
            department: dept
          });
        }

        if (parsedList.length === 0) {
          setTchBulkError('Không thể phân tích dữ liệu hợp lệ nào từ file excel.');
        } else {
          setTchBulkPreview(parsedList);
        }
      } catch (err: any) {
        setTchBulkError(`Đã có lỗi xảy ra khi đọc file Excel: ${err.message || err}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleTchBulkSubmit = () => {
    if (tchBulkPreview.length === 0) return;
    onAddBulkTeachers(tchBulkPreview);
    setTchBulkText('');
    setTchBulkPreview([]);
    setShowTchBulkModal(false);
    
    setTchSuccessMsg(`Đã nhập thành công ${tchBulkPreview.length} giáo viên mới!`);
    setTimeout(() => {
      setTchSuccessMsg('');
    }, 4000);
  };

  // Row Editing handlers for Teacher
  const startTchRowEdit = (t: Teacher) => {
    setEditingTchId(t.id);
    setEditTchCode(t.teacherCode);
    setEditTchLastName(t.lastName);
    setEditTchFirstName(t.firstName);
    setEditTchPhoneNumber(t.phoneNumber || '');
    setEditTchEmail(t.email || '');
    setEditTchSpecialty(t.specialty || '');
    setEditTchDepartment(t.department || '');
  };

  const saveTchRowEdit = (tId: string) => {
    if (!editTchCode.trim() || !editTchLastName.trim() || !editTchFirstName.trim()) {
      alert('Vui lòng không để trống Mã số, Họ đệm hoặc Tên giáo viên.');
      return;
    }
    onUpdateTeacher(
      tId, 
      editTchCode, 
      editTchLastName, 
      editTchFirstName, 
      editTchPhoneNumber, 
      editTchEmail, 
      editTchSpecialty,
      editTchDepartment
    );
    setEditingTchId(null);
  };

  // Teachers form local state representation
  const [lclTeacherName, setLclTeacherName] = useState(classMetadata.teacherName || '');
  const [lclFormTeacher, setLclFormTeacher] = useState(classMetadata.formTeacher || '');
  const [lclMonitorName, setLclMonitorName] = useState(classMetadata.monitorName || '');
  const [lclDeputiesName, setLclDeputiesName] = useState(classMetadata.deputiesName || '');
  const [lclClassSize, setLclClassSize] = useState(classMetadata.classSize || 36);

  React.useEffect(() => {
    setLclTeacherName(classMetadata.teacherName || '');
    setLclFormTeacher(classMetadata.formTeacher || '');
    setLclMonitorName(classMetadata.monitorName || '');
    setLclDeputiesName(classMetadata.deputiesName || '');
    setLclClassSize(classMetadata.classSize || 36);
  }, [classMetadata]);

  const activeClassSchool = classMetadata.schoolName || '';
  const schoolStudents = activeClassSchool 
    ? students.filter(s => s.schoolName?.trim().toLowerCase() === activeClassSchool.trim().toLowerCase())
    : students;

  const schoolMonitors = schoolStudents.filter(s => s.bcs === 'Lớp trưởng');
  const schoolDeputies = schoolStudents.filter(s => 
    (s.bcs === 'Lớp phó' || s.bcs === 'Tổ trưởng') &&
    `${s.lastName} ${s.firstName}`.trim().toLowerCase() !== (lclMonitorName || '').trim().toLowerCase()
  );
  const otherSchoolStudents = schoolStudents.filter(s => s.bcs !== 'Lớp trưởng' && s.bcs !== 'Lớp phó' && s.bcs !== 'Tổ trưởng');

  const allDeputiesJoined = schoolDeputies
    .map(s => `${s.lastName} ${s.firstName}`.trim() + (s.bcs ? ` (${s.bcs})` : ''))
    .join(', ');

  const [showDeputiesDropdown, setShowDeputiesDropdown] = useState(false);
  const deputiesDropdownRef = useRef<HTMLDivElement>(null);

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

  const selectedDeputiesLclList = (lclDeputiesName || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  const handleToggleDeputyLcl = (s: Student) => {
    const fullName = `${s.lastName} ${s.firstName}`.trim();
    const label = s.bcs ? `${fullName} (${s.bcs})` : fullName;

    const isChecked = selectedDeputiesLclList.some(item => {
      const cleanItem = item.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
      return cleanItem === fullName.toLowerCase();
    });

    let newSelected: string[];
    if (isChecked) {
      newSelected = selectedDeputiesLclList.filter(item => {
        const cleanItem = item.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
        return cleanItem !== fullName.toLowerCase();
      });
    } else {
      newSelected = [...selectedDeputiesLclList, label];
    }

    setLclDeputiesName(newSelected.join(', '));
  };

  const saveTeacherMetadata = () => {
    onUpdateMetadata({
      teacherName: lclTeacherName,
      formTeacher: lclFormTeacher,
      monitorName: lclMonitorName,
      deputiesName: lclDeputiesName,
      classSize: Number(lclClassSize)
    });
    alert('Đã cập nhật phân công giảng giảng viên & quản lý lớp học!');
  };

  // Query and table logic
  const filteredStudents = students.filter(s => {
    const fullName = `${s.lastName} ${s.firstName}`.toLowerCase();
    const school = (s.schoolName || '').toLowerCase();
    const phone = (s.phoneNumber || '').toLowerCase();
    const bcs = (s.bcs || '').toLowerCase();
    const query = searchTerm.toLowerCase();
    return s.studentCode.toLowerCase().includes(query) || 
           fullName.includes(query) || 
           school.includes(query) || 
           phone.includes(query) ||
           bcs.includes(query);
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortBy === 'none') return 0;

    let valA = '';
    let valB = '';

    if (sortBy === 'studentCode') {
      valA = a.studentCode;
      valB = b.studentCode;
    } else if (sortBy === 'firstName') {
      valA = a.firstName;
      valB = b.firstName;
    } else if (sortBy === 'schoolName') {
      valA = a.schoolName || '';
      valB = b.schoolName || '';
    } else if (sortBy === 'bcs') {
      valA = a.bcs || '';
      valB = b.bcs || '';
    }

    return sortOrder === 'asc' 
      ? valA.localeCompare(valB, 'vi', { sensitivity: 'base' }) 
      : valB.localeCompare(valA, 'vi', { sensitivity: 'base' });
  });

  // Filter and sort Teacher List
  const filteredTeachers = (teachers || []).filter(t => {
    const fullName = `${t.lastName} ${t.firstName}`.toLowerCase();
    const specialty = (t.specialty || '').toLowerCase();
    const department = (t.department || '').toLowerCase();
    const phone = (t.phoneNumber || '').toLowerCase();
    const email = (t.email || '').toLowerCase();
    const query = tchSearchTerm.toLowerCase();
    return t.teacherCode.toLowerCase().includes(query) || 
           fullName.includes(query) || 
           specialty.includes(query) || 
           department.includes(query) ||
           email.includes(query) ||
           phone.includes(query);
  });

  const sortedTeachers = [...filteredTeachers].sort((a, b) => {
    if (tchSortBy === 'none') return 0;

    let valA = '';
    let valB = '';

    if (tchSortBy === 'teacherCode') {
      valA = a.teacherCode;
      valB = b.teacherCode;
    } else if (tchSortBy === 'firstName') {
      valA = a.firstName;
      valB = b.firstName;
    } else if (tchSortBy === 'specialty') {
      valA = a.specialty || '';
      valB = b.specialty || '';
    } else if (tchSortBy === 'department') {
      valA = a.department || '';
      valB = b.department || '';
    }

    return tchSortOrder === 'asc' 
      ? valA.localeCompare(valB, 'vi', { sensitivity: 'base' }) 
      : valB.localeCompare(valA, 'vi', { sensitivity: 'base' });
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25 }}
      className="p-4 md:p-6 max-w-7xl mx-auto"
    >
      {/* Dynamic Upper Hero */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl shadow-xl p-5 md:p-6 text-white mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/15">
              <Users className="w-8 h-8 text-indigo-300 stroke-[1.5]" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Quản trị Lớp học: Giảng viên & Học viên</h1>
              <p className="text-indigo-200/95 text-xs font-sans mt-0.5">
                Quản lý hồ sơ học viên tuyển sinh, lưu thông tin số điện thoại, ngày sinh, tên trường chính thức.
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 bg-white/5 border border-white/10 p-2 rounded-xl backdrop-blur-sm">
            <div className="px-3 py-1.5 text-center">
              <span className="block text-[10px] uppercase tracking-wider text-indigo-200 font-semibold">Học viên thực tế</span>
              <span className="block font-mono font-bold text-lg text-emerald-305">{students.length} sv</span>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div className="px-3 py-1.5 text-center">
              <span className="block text-[10px] uppercase tracking-wider text-indigo-200 font-semibold">Sĩ số chỉ tiêu</span>
              <span className="block font-semibold text-sm">{classMetadata.classSize || 36} sv</span>
            </div>
          </div>
        </div>

        {/* Local view switcher */}
        <div className="flex items-center gap-1.5 mt-5 bg-black/20 p-1 rounded-xl w-fit border border-white/5">
          <button
            onClick={() => setSubTab('students')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
              subTab === 'students' 
                ? 'bg-white text-indigo-950 shadow-md' 
                : 'text-indigo-200 hover:bg-white/5 hover:text-white'
            }`}
          >
            <UserSquare2 className="w-4 h-4 text-indigo-505" />
            <span>Danh sách Hồ sơ Học viên</span>
          </button>
          
          <button
            onClick={() => setSubTab('teachers_list')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
              subTab === 'teachers_list' 
                ? 'bg-white text-indigo-950 shadow-md' 
                : 'text-indigo-200 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-505" />
            <span>Danh sách Hồ sơ Giáo viên</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {subTab === 'students' ? (
          <motion.div
            key="students-grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 xl:grid-cols-4 gap-6"
          >
            {/* 1. Left controls panel */}
            <div className="xl:col-span-1 space-y-6">
              {/* Add form */}
              <div className="bg-white rounded-2xl border border-slate-205 shadow-sm p-4 md:p-5">
                <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-500 mb-4 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  Hồ sơ học viên mới
                </h3>

                <form onSubmit={handleSingleAdd} className="space-y-3 font-sans text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5">Mã số học viên</label>
                    <input
                      type="text"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      placeholder="e.g. 18PM00705"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 uppercase font-mono font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    <div className="col-span-3">
                      <label className="block font-bold text-slate-700 mb-0.5">Họ và chữ lót</label>
                      <input
                        type="text"
                        value={newLastName}
                        onChange={(e) => setNewLastName(e.target.value)}
                        placeholder="NGUYỄN VĂN"
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block font-bold text-slate-700 mb-0.5">Tên</label>
                      <input
                        type="text"
                        value={newFirstName}
                        onChange={(e) => setNewFirstName(e.target.value)}
                        placeholder="AN"
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl text-slate-800 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5">Tên trường</label>
                    <input
                      type="text"
                      value={newSchoolName}
                      onChange={(e) => setNewSchoolName(e.target.value)}
                      placeholder="e.g. THPT Chu Văn An"
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-1 focus:ring-indigo-505 focus:outline-none"
                    />
                  </div>

                   <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-705 mb-0.5">Số điện thoại</label>
                      <input
                        type="tel"
                        value={newPhoneNumber}
                        onChange={(e) => setNewPhoneNumber(e.target.value)}
                        placeholder="09xx..."
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl text-slate-800 font-mono focus:ring-1 focus:ring-indigo-505 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-705 mb-0.5">Ngày sinh</label>
                      <input
                        type="text"
                        value={newBirthDate}
                        onChange={(e) => setNewBirthDate(e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl text-slate-800 font-mono focus:ring-1 focus:ring-indigo-505 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-705 mb-0.5">Ban cán sự (BCS)</label>
                    <select
                      value={newBcs}
                      onChange={(e) => setNewBcs(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl text-slate-850 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white"
                    >
                      <option value="">— Thành viên thường —</option>
                      <option value="Lớp trưởng">Lớp trưởng 👑</option>
                      <option value="Lớp phó">Lớp phó ⚡</option>
                      <option value="Tổ trưởng">Tổ trưởng 🚀</option>
                    </select>
                  </div>

                  {formError && (
                    <div className="p-2.5 bg-red-50 text-red-700 text-[11px] font-semibold border border-red-200 rounded-lg flex items-center gap-1.5 leading-snug">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl shadow transition active:scale-95 cursor-pointer mt-2"
                  >
                    Thêm vào Hồ sơ Lớp
                  </button>
                </form>
              </div>

              {/* Bulk uploading card tool */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5">
                <h3 className="text-xs uppercase font-extrabold text-slate-800 mb-2 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  Nhập nhanh hàng loạt
                </h3>
                <p className="text-[11px] text-slate-500 mb-3.5 leading-relaxed font-sans">
                  Nhập danh sách học viên có đầy đủ Tên trường, SĐT hay Ngày sinh bằng cách dán hàng dữ liệu Excel phân cách bằng dấu phẩy.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setBulkText('');
                    setBulkPreview([]);
                    setShowBulkModal(true);
                  }}
                  className="w-full bg-white border border-slate-205 text-slate-820 font-bold hover:bg-slate-100 py-2.5 rounded-xl text-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Nhập nhanh hàng loạt
                </button>
              </div>
            </div>

            {/* 2. Right Student profiles list table */}
            <div className="xl:col-span-3 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4 select-none">
                  <div className="relative flex-1 max-w-sm">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Tìm Mã số, Họ Tên, Tên trường hoặc Số điện thoại..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full text-xs bg-slate-52 border border-slate-200 rounded-xl py-2 pl-9 pr-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-1 text-xs font-sans text-slate-600 font-semibold bg-slate-50 border border-slate-200 p-1 rounded-xl self-end md:self-auto">
                    <span className="text-[10px] text-slate-400 uppercase px-1">Sắp xếp:</span>
                    <button
                      onClick={() => {
                        if (sortBy === 'studentCode') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('studentCode');
                          setSortOrder('asc');
                        }
                      }}
                      className={`px-2 py-1 rounded-lg transition ${
                        sortBy === 'studentCode' ? 'bg-white shadow text-indigo-700 font-bold' : ''
                      }`}
                    >
                      Mã số {sortBy === 'studentCode' && (sortOrder === 'asc' ? '↓' : '↑')}
                    </button>
                    <button
                      onClick={() => {
                        if (sortBy === 'firstName') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('firstName');
                          setSortOrder('asc');
                        }
                      }}
                      className={`px-2 py-1 rounded-lg transition ${
                        sortBy === 'firstName' ? 'bg-white shadow text-indigo-700 font-bold' : ''
                      }`}
                    >
                      Tên {sortBy === 'firstName' && (sortOrder === 'asc' ? '↓' : '↑')}
                    </button>
                    <button
                      onClick={() => {
                        if (sortBy === 'schoolName') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('schoolName');
                          setSortOrder('asc');
                        }
                      }}
                      className={`px-2 py-1 rounded-lg transition ${
                        sortBy === 'schoolName' ? 'bg-white shadow text-indigo-700 font-bold' : ''
                      }`}
                    >
                      Tên trường {sortBy === 'schoolName' && (sortOrder === 'asc' ? '↓' : '↑')}
                    </button>
                    <button
                      onClick={() => {
                        if (sortBy === 'bcs') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('bcs');
                          setSortOrder('asc');
                        }
                      }}
                      className={`px-2 py-1 rounded-lg transition ${
                        sortBy === 'bcs' ? 'bg-white shadow text-indigo-700 font-bold' : ''
                      }`}
                    >
                      Cán sự (BCS) {sortBy === 'bcs' && (sortOrder === 'asc' ? '↓' : '↑')}
                    </button>
                  </div>
                </div>

                {/* Database Table layout */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-sans border-collapse text-left text-slate-800">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                        <th className="py-2.5 px-3 text-center w-12">TT</th>
                        <th className="py-2.5 px-3 w-28">Mã số SV</th>
                        <th className="py-2.5 px-3">Họ và chữ lót</th>
                        <th className="py-2.5 px-3 w-20">Tên</th>
                        <th className="py-2.5 px-3 w-32">Ban cán sự (BCS)</th>
                        <th className="py-2.5 px-3 w-24">Ngày sinh</th>
                        <th className="py-2.5 px-3 w-28">Số điện thoại</th>
                        <th className="py-2.5 px-3">Tên trường</th>
                        <th className="py-2.5 px-3 text-center w-24">Sửa/Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStudents.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400 italic">
                            Không tìm thấy học viên khớp với điều kiện tìm kiếm.
                          </td>
                        </tr>
                      ) : (
                        sortedStudents.map((std, idx) => {
                          const isEditing = editingId === std.id;
                          const isConfirmingDelete = confirmDeleteId === std.id;

                          return (
                            <tr 
                              key={std.id}
                              className={`border-b border-slate-100/90 hover:bg-slate-50/50 transition-colors ${
                                isEditing ? 'bg-amber-50/30' : ''
                              }`}
                            >
                              {/* 1. TT */}
                              <td className="py-3 px-3 text-center font-mono font-semibold text-slate-400">
                                {idx + 1}
                              </td>

                              {/* 2. Code */}
                              <td className="py-2 px-3 font-mono">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editCode}
                                    onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                                    className="w-full p-1 border border-slate-300 rounded font-bold uppercase"
                                  />
                                ) : (
                                  <span className="font-bold text-slate-700">{std.studentCode}</span>
                                )}
                              </td>

                              {/* 3. Last name */}
                              <td className="py-2 px-3 font-medium">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editLastName}
                                    onChange={(e) => setEditLastName(e.target.value)}
                                    className="w-full p-1 border border-slate-300 rounded uppercase font-semibold"
                                  />
                                ) : (
                                  <span className="font-semibold text-slate-800 uppercase">{std.lastName}</span>
                                )}
                              </td>

                              {/* 4. First name */}
                              <td className="py-2 px-3">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editFirstName}
                                    onChange={(e) => setEditFirstName(e.target.value)}
                                    className="w-full p-1 border border-slate-300 rounded uppercase font-bold text-indigo-900"
                                  />
                                ) : (
                                  <span className="font-extrabold text-indigo-900 uppercase">{std.firstName}</span>
                                )}
                              </td>

                              {/* 4.5 Cán sự (BCS) */}
                              <td className="py-2 px-3">
                                {isEditing ? (
                                  <select
                                    value={editBcs}
                                    onChange={(e) => setEditBcs(e.target.value)}
                                    className="w-full p-1 border border-slate-300 rounded text-slate-800 text-xs bg-white font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                  >
                                    <option value="">— Cán sự thường —</option>
                                    <option value="Lớp trưởng">Lớp trưởng 👑</option>
                                    <option value="Lớp phó">Lớp phó ⚡</option>
                                    <option value="Tổ trưởng">Tổ trưởng 🚀</option>
                                  </select>
                                ) : (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {std.bcs === 'Lớp trưởng' && (
                                      <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-150 text-indigo-755 text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                                        <span>👑</span>
                                        <span>Lớp trưởng</span>
                                      </span>
                                    )}
                                    {std.bcs === 'Lớp phó' && (
                                      <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-150 text-amber-800 text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                                        <span>⚡</span>
                                        <span>Lớp phó</span>
                                      </span>
                                    )}
                                    {std.bcs === 'Tổ trưởng' && (
                                      <span className="inline-flex items-center gap-1 bg-teal-50 border border-teal-150 text-teal-800 text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                                        <span>🚀</span>
                                        <span>Tổ trưởng</span>
                                      </span>
                                    )}
                                    {!std.bcs && (
                                      <span className="text-slate-350 italic text-[11px]">—</span>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* 5. Birth date */}
                              <td className="py-2 px-3 text-slate-600">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editBirthDate}
                                    onChange={(e) => setEditBirthDate(e.target.value)}
                                    className="w-full p-1 border border-slate-300 rounded font-mono"
                                    placeholder="DD/MM/YYYY"
                                  />
                                ) : (
                                  <span className="font-mono text-xs">{std.birthDate || '_'}</span>
                                )}
                              </td>

                              {/* 6. Phone */}
                              <td className="py-2 px-3 text-slate-600 font-mono">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editPhoneNumber}
                                    onChange={(e) => setEditPhoneNumber(e.target.value)}
                                    className="w-full p-1 border border-slate-300 rounded"
                                  />
                                ) : (
                                  <span>{std.phoneNumber || '_'}</span>
                                )}
                              </td>

                              {/* 7. School Name */}
                              <td className="py-2 px-3">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editSchoolName}
                                    onChange={(e) => setEditSchoolName(e.target.value)}
                                    className="w-full p-1 border border-slate-300 rounded"
                                  />
                                ) : (
                                  <div className="flex items-center gap-1">
                                    {std.schoolName ? (
                                      <>
                                        <SchoolIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="font-medium text-slate-800">{std.schoolName}</span>
                                      </>
                                    ) : (
                                      <span className="text-slate-350 italic">Chưa cập nhật</span>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* 8. Actions */}
                              <td className="py-2 px-3 text-center">
                                {isEditing ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => saveRowEdit(std.id)}
                                      className="p-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition shadow-sm"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingId(null)}
                                      className="p-1 rounded bg-slate-150 hover:bg-slate-200 text-slate-600 transition"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : isConfirmingDelete ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => {
                                        onDeleteStudent(std.id);
                                        setConfirmDeleteId(null);
                                      }}
                                      className="py-0.5 px-2 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded"
                                    >
                                      Xóa
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="p-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px]"
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1.5 opacity-80 hover:opacity-100">
                                    <button
                                      onClick={() => startRowEdit(std)}
                                      className="p-1 rounded text-indigo-600 hover:bg-indigo-50 transition"
                                      title="Sửa thông tin học viên"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(std.id)}
                                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                                      title="Xóa học viên"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        ) : subTab === 'teachers_list' ? (
          <motion.div
            key="teachers-list-grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 xl:grid-cols-4 gap-6"
          >
            {/* 1. Left controls panel */}
            <div className="xl:col-span-1 space-y-6">
              {/* Add form */}
              <div className="bg-white rounded-2xl border border-slate-205 shadow-sm p-4 md:p-5">
                <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-500 mb-4 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  Hồ sơ giáo viên mới
                </h3>

                <form onSubmit={handleSingleAddTch} className="space-y-3 font-sans text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5">Mã số giáo viên</label>
                    <input
                      type="text"
                      value={tchCode}
                      onChange={(e) => setTchCode(e.target.value)}
                      placeholder="e.g. GV004"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 uppercase font-mono font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    <div className="col-span-3">
                      <label className="block font-bold text-slate-700 mb-0.5">Họ và chữ lót</label>
                      <input
                        type="text"
                        value={tchLastName}
                        onChange={(e) => setTchLastName(e.target.value)}
                        placeholder="NGUYỄN VĂN"
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block font-bold text-slate-700 mb-0.5">Tên</label>
                      <input
                        type="text"
                        value={tchFirstName}
                        onChange={(e) => setTchFirstName(e.target.value)}
                        placeholder="HÙNG"
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl text-slate-800 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5">Chuyên môn</label>
                    <input
                      type="text"
                      value={tchSpecialty}
                      onChange={(e) => setTchSpecialty(e.target.value)}
                      placeholder="e.g. Đồ họa / Lập trình Web"
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-1 focus:ring-indigo-505 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5">Đơn vị công tác</label>
                    <input
                      type="text"
                      value={tchDepartment}
                      onChange={(e) => setTchDepartment(e.target.value)}
                      placeholder="e.g. Khoa CNTT hoặc Tổ Điện tử"
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-1 focus:ring-indigo-505 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-2.5 mt-2.5">
                    <div>
                      <label className="block font-bold text-slate-705 mb-0.5">Số điện thoại</label>
                      <input
                        type="tel"
                        value={tchPhoneNumber}
                        onChange={(e) => setTchPhoneNumber(e.target.value)}
                        placeholder="09xx..."
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl text-slate-800 font-mono focus:ring-1 focus:ring-indigo-505 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-705 mb-0.5">Email liên hệ</label>
                      <input
                        type="email"
                        value={tchEmail}
                        onChange={(e) => setTchEmail(e.target.value)}
                        placeholder="name@school.edu.vn"
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl text-slate-800 font-mono focus:ring-1 focus:ring-indigo-505 focus:outline-none"
                      />
                    </div>
                  </div>

                  {tchFormError && (
                    <div className="p-2.5 bg-red-50 text-red-700 font-bold border border-red-200 rounded-lg flex items-center gap-1.5 leading-tight">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{tchFormError}</span>
                    </div>
                  )}

                  {tchSuccessMsg && (
                    <div className="p-2.5 bg-green-50 text-green-700 font-bold border border-green-200 rounded-lg flex items-center gap-1.5 leading-tight">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{tchSuccessMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl shadow-md cursor-pointer transition active:scale-95"
                  >
                    Thêm giảng viên
                  </button>
                </form>
              </div>

              {/* Bulk insert prompt block */}
              <div className="bg-slate-905 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-4.5 text-white shadow-md space-y-3 font-sans">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-bold tracking-wide uppercase">Nhập hàng loạt</h3>
                    <p className="text-slate-300 text-[10px] font-sans mt-0.5">Hỗ trợ dán hàng loạt ngăn cách bằng dấu phẩy</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTchBulkModal(true)}
                  className="w-full bg-indigo-600 hover:bg-indigo-505 text-white text-xs font-bold py-2 rounded-xl transition cursor-pointer"
                >
                  Dán Danh sách Giáo viên
                </button>
              </div>
            </div>

            {/* 2. Right Data Grid Table */}
            <div className="xl:col-span-3 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-205 shadow-sm p-4 md:p-5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-slate-800 text-sm">Hồ sơ Giáo viên/Giảng viên của lớp</h2>
                    <span className="bg-slate-100 text-slate-700 text-[10.5px] font-bold font-mono px-2 py-0.5 rounded-full">
                      {(teachers || []).length} giáo viên
                    </span>
                  </div>

                  {/* Search box */}
                  <div className="relative w-full sm:w-64">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                      <Search className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      placeholder="Tìm Mã số, Họ Tên, Chuyên môn..."
                      value={tchSearchTerm}
                      onChange={(e) => setTchSearchTerm(e.target.value)}
                      className="w-full text-xs bg-slate-52 border border-slate-200 rounded-xl py-2 pl-9 pr-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-medium"
                    />
                  </div>
                </div>

                {/* Sorting options bar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 py-3 border-b border-dashed border-slate-100 font-sans text-xs">
                  <span className="text-slate-500 text-[11px] font-medium">Sắp xếp theo:</span>
                  <div className="flex items-center gap-2 font-sans text-xs">
                    <button
                      onClick={() => {
                        if (tchSortBy === 'teacherCode') {
                          setTchSortOrder(tchSortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setTchSortBy('teacherCode');
                          setTchSortOrder('asc');
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer border transition ${
                        tchSortBy === 'teacherCode'
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-705'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Mã giáo viên {tchSortBy === 'teacherCode' && (tchSortOrder === 'asc' ? '↓' : '↑')}
                    </button>

                    <button
                      onClick={() => {
                        if (tchSortBy === 'firstName') {
                          setTchSortOrder(tchSortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setTchSortBy('firstName');
                          setTchSortOrder('asc');
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer border transition ${
                        tchSortBy === 'firstName'
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-705'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Tên giáo viên {tchSortBy === 'firstName' && (tchSortOrder === 'asc' ? '↓' : '↑')}
                    </button>

                    <button
                      onClick={() => {
                        if (tchSortBy === 'specialty') {
                          setTchSortOrder(tchSortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setTchSortBy('specialty');
                          setTchSortOrder('asc');
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer border transition ${
                        tchSortBy === 'specialty'
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-705'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Chuyên môn {tchSortBy === 'specialty' && (tchSortOrder === 'asc' ? '↓' : '↑')}
                    </button>

                    <button
                      onClick={() => {
                        if (tchSortBy === 'department') {
                          setTchSortOrder(tchSortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setTchSortBy('department');
                          setTchSortOrder('asc');
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer border transition ${
                        tchSortBy === 'department'
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-705'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Đơn vị {tchSortBy === 'department' && (tchSortOrder === 'asc' ? '↓' : '↑')}
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-xs mt-2 border-collapse">
                    <thead>
                      <tr className="border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3 w-16 text-center">STT</th>
                        <th className="py-2.5 px-3 w-24">Mã số</th>
                        <th className="py-2.5 px-3">Họ và chữ lót</th>
                        <th className="py-2.5 px-3 w-20">Tên</th>
                        <th className="py-2.5 px-3">Chuyên môn</th>
                        <th className="py-2.5 px-3">Đơn vị công tác</th>
                        <th className="py-2.5 px-3 w-28">Số điện thoại</th>
                        <th className="py-2.5 px-3">Email</th>
                        <th className="py-2.5 px-3 text-center w-24">Sửa/Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {sortedTeachers.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-405 font-medium font-sans">
                            Không tìm thấy hồ sơ giáo viên nào phù hợp hoặc danh sách trống.
                          </td>
                        </tr>
                      ) : (
                        sortedTeachers.map((tc, idx) => {
                          const isEditing = editingTchId === tc.id;
                          const isConfirmingDelete = confirmDeleteTchId === tc.id;

                          return (
                            <tr 
                              key={tc.id} 
                              className={`hover:bg-slate-50/50 transition duration-150 ${
                                isEditing ? 'bg-indigo-50/30' : ''
                              }`}
                            >
                              <td className="py-2 px-3 text-center font-mono font-bold text-slate-400">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3 font-semibold font-mono">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editTchCode}
                                    onChange={(e) => setEditTchCode(e.target.value)}
                                    className="w-full bg-white p-1.5 border border-slate-300 rounded font-mono font-bold text-indigo-750 focus:outline-none"
                                  />
                                ) : (
                                  <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono font-bold">
                                    {tc.teacherCode}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editTchLastName}
                                    onChange={(e) => setEditTchLastName(e.target.value)}
                                    className="w-full bg-white p-1.5 border border-slate-300 rounded font-bold text-slate-800 focus:outline-none"
                                  />
                                ) : (
                                  <span className="text-slate-500 font-semibold">{tc.lastName}</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editTchFirstName}
                                    onChange={(e) => setEditTchFirstName(e.target.value)}
                                    className="w-full bg-white p-1.5 border border-slate-300 rounded font-bold text-slate-800 focus:outline-none"
                                  />
                                ) : (
                                  <span className="text-slate-900 font-bold">{tc.firstName}</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editTchSpecialty}
                                    onChange={(e) => setEditTchSpecialty(e.target.value)}
                                    className="w-full bg-white p-1.5 border border-slate-300 rounded focus:outline-none"
                                  />
                                ) : (
                                  <span className="text-indigo-950 font-semibold text-[11px]">{tc.specialty || '—'}</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editTchDepartment}
                                    onChange={(e) => setEditTchDepartment(e.target.value)}
                                    className="w-full bg-white p-1.5 border border-slate-300 rounded focus:outline-none"
                                    placeholder="e.g. Khoa CNTT"
                                  />
                                ) : (
                                  <span className="text-indigo-900 font-bold text-[11px]">{tc.department || '—'}</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editTchPhoneNumber}
                                    onChange={(e) => setEditTchPhoneNumber(e.target.value)}
                                    className="w-full bg-white p-1.5 border border-slate-300 rounded font-mono focus:outline-none"
                                  />
                                ) : (
                                  <span className="font-mono text-[11px] text-slate-600">{tc.phoneNumber || '—'}</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editTchEmail}
                                    onChange={(e) => setEditTchEmail(e.target.value)}
                                    className="w-full bg-white p-1.5 border border-slate-300 rounded font-mono focus:outline-none"
                                  />
                                ) : (
                                  <span className="font-mono text-[11px] text-slate-505">{tc.email || '—'}</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {isEditing ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => saveTchRowEdit(tc.id)}
                                      className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingTchId(null)}
                                      className="p-1 rounded bg-slate-150 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : isConfirmingDelete ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => {
                                        onDeleteTeacher(tc.id);
                                        setConfirmDeleteTchId(null);
                                      }}
                                      className="py-0.5 px-2 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded cursor-pointer"
                                    >
                                      Xóa
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteTchId(null)}
                                      className="p-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] cursor-pointer"
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1.5 opacity-80 hover:opacity-100">
                                    <button
                                      onClick={() => startTchRowEdit(tc)}
                                      className="p-1 rounded text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                                      title="Sửa thông tin giáo viên"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteTchId(tc.id)}
                                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                      title="Xóa giáo viên"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="teachers-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Primary assignments */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                <PenTool className="w-4 h-4 text-indigo-600" />
                Thiết lập Phân công Nhân sự & Giảng dạy học phần
              </h3>

              <div className="space-y-4 font-sans text-xs">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-700">Giảng viên giảng dạy chính (Người ký Sổ)</label>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold uppercase font-sans">Chọn từ hồ sơ</span>
                  </div>
                  <select
                    value={lclTeacherName}
                    onChange={(e) => setLclTeacherName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 font-semibold text-slate-800 bg-white cursor-pointer"
                  >
                    <option value="">— Chưa phân công —</option>
                    {teachers.map((t) => {
                      const fullName = `${t.lastName} ${t.firstName}`.trim();
                      return (
                        <option key={t.id} value={fullName}>
                          👤 {fullName} ({t.teacherCode || 'GV'}) {t.specialty ? `— ${t.specialty}` : ''}
                        </option>
                      );
                    })}
                    {lclTeacherName && !teachers.some(t => `${t.lastName} ${t.firstName}`.trim().toLowerCase() === lclTeacherName.trim().toLowerCase()) && (
                      <option value={lclTeacherName}>{lclTeacherName} (Tùy chỉnh khác)</option>
                    )}
                  </select>
                  <span className="text-[10px] text-slate-400 italic block mt-0.5">Họ tên tích hợp trực tiếp làm chữ ký số tự động tại tab "Danh sách thi" và "Nội dung học dạy"</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-700">Giáo viên chủ nhiệm lớp (GVCN)</label>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold uppercase font-sans">Chọn từ hồ sơ</span>
                  </div>
                  <select
                    value={lclFormTeacher}
                    onChange={(e) => setLclFormTeacher(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 font-semibold text-slate-800 bg-white cursor-pointer"
                  >
                    <option value="">— Hãy chọn GVCN —</option>
                    {teachers.map((t) => {
                      const fullName = `${t.lastName} ${t.firstName}`.trim();
                      return (
                        <option key={t.id} value={fullName}>
                          👤 {fullName} ({t.teacherCode || 'GV'})
                        </option>
                      );
                    })}
                    {lclFormTeacher && !teachers.some(t => `${t.lastName} ${t.firstName}`.trim().toLowerCase() === lclFormTeacher.trim().toLowerCase()) && (
                      <option value={lclFormTeacher}>{lclFormTeacher} (Tùy chỉnh khác)</option>
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Lớp trưởng</label>
                    <select
                      value={lclMonitorName}
                      onChange={(e) => setLclMonitorName(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 font-semibold text-slate-800 bg-white cursor-pointer"
                    >
                      <option value="">— Chọn Lớp trưởng —</option>
                      {schoolMonitors.map((s) => {
                        const fullName = `${s.lastName} ${s.firstName}`.trim();
                        return (
                          <option key={s.id} value={fullName}>
                            👑 {fullName} (Cột BCS: Lớp trưởng)
                          </option>
                        );
                      })}
                      {otherSchoolStudents.length > 0 && (
                        <optgroup label="Học viên khác">
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
                      {lclMonitorName && !schoolStudents.some(s => `${s.lastName} ${s.firstName}`.trim().toLowerCase() === lclMonitorName.trim().toLowerCase()) && (
                        <option value={lclMonitorName}>{lclMonitorName} (Tùy chỉnh khác)</option>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Lớp phó & Ban tự quản (Chọn nhiều)</label>
                    <div className="relative" ref={deputiesDropdownRef}>
                      <div
                        onClick={() => setShowDeputiesDropdown(!showDeputiesDropdown)}
                        className="w-full min-h-[38px] select-none text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none bg-white cursor-pointer flex items-center justify-between gap-2 font-semibold text-slate-800"
                      >
                        <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto">
                          {selectedDeputiesLclList.length === 0 ? (
                            <span className="text-slate-400 font-normal">— Chọn Lớp phó / Ban tự quản —</span>
                          ) : (
                            selectedDeputiesLclList.map((dep, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold font-sans">
                                {dep}
                              </span>
                            ))
                          )}
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 ml-auto text-slate-400 shrink-0 transition-transform ${showDeputiesDropdown ? 'rotate-180' : ''}`} />
                      </div>

                      {showDeputiesDropdown && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-2 space-y-2 max-h-70 overflow-y-auto">
                          {/* Batch helper buttons */}
                          <div className="flex items-center justify-between gap-2 border-b border-slate-150 pb-2 text-[10px]">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLclDeputiesName(allDeputiesJoined);
                              }}
                              className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200 cursor-pointer select-none"
                            >
                              ⚡ Đồng bộ tất cả cán sự
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLclDeputiesName('');
                              }}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold cursor-pointer select-none"
                            >
                              Xóa tất cả
                            </button>
                          </div>

                          {/* Options list */}
                          <div className="space-y-1 text-left">
                            {schoolDeputies.length > 0 && (
                              <div className="font-sans text-[9px] font-bold uppercase text-slate-405 px-2 py-0.5 tracking-wider select-none">
                                Ban cán sự có sẵn (khớp cột bcs)
                              </div>
                            )}
                            {schoolDeputies.map((s) => {
                              const fullName = `${s.lastName} ${s.firstName}`.trim();
                              const isChecked = selectedDeputiesLclList.some(item => {
                                const cleanItem = item.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
                                return cleanItem === fullName.toLowerCase();
                              });
                              return (
                                <div
                                  key={s.id}
                                  className="flex items-center justify-between p-2 rounded-md hover:bg-indigo-50/50 cursor-pointer text-xs font-semibold select-none text-slate-800"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleDeputyLcl(s);
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
                                  <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold px-1 py-0.5 rounded font-sans uppercase">
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

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Sĩ số danh sách định mức của lớp (Chỉ tiêu)</label>
                  <input
                    type="number"
                    value={lclClassSize}
                    onChange={(e) => setLclClassSize(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-slate-800 font-mono"
                  />
                </div>

                <button
                  type="button"
                  onClick={saveTeacherMetadata}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl shadow transition active:scale-95 cursor-pointer mt-3 flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Cập nhật phân công lớp học</span>
                </button>
              </div>
            </div>

            {/* Display profile details */}
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 font-sans text-xs">
                <h4 className="font-extrabold text-slate-900 border-b border-slate-200 pb-2 text-sm">
                  Chi tiết Quản lý Hành chính
                </h4>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500">Mã lớp học phần:</span>
                    <span className="font-bold text-slate-900 font-mono text-[11px]">{classMetadata.className}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500">Đơn vị chủ quản:</span>
                    <span className="font-bold text-indigo-950 uppercase">{classMetadata.className.includes('CS2') ? 'KHOA KỸ THUẬT NGHIỆP VỤ CS2' : 'KHOA KỸ THUẬT NGHIỆP VỤ'}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500">Môn học học phần:</span>
                    <span className="font-bold text-indigo-950 uppercase text-right leading-tight max-w-[200px]">{classMetadata.subjectName}</span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">Hiệu suất tuyển sinh / Sĩ số chỉ định:</span>
                    <span className="font-mono font-bold text-indigo-700">{students.length} / {lclClassSize} ({Math.round((students.length / (lclClassSize || 1)) * 100)}%)</span>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50/50 border border-indigo-100/70 rounded-2xl p-4 flex items-start gap-2.5 text-xs text-indigo-950 leading-relaxed font-sans">
                <HelpCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-indigo-900">Tính năng chữ ký số liên động:</p>
                  <p>
                    Thông tin phân nhiệm Giảng viên giảng dạy và ban cán sự sẽ cập nhật đồng bộ lên các biểu mẫu <strong>Nội dung bài dạy kiểm tra</strong> và <strong>Danh sách thi tuyển chính thức</strong> để quý thầy cô không cần viết tay lại khi lưu trữ xuất bản file in.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Bulk modal with delimiter hints */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl border border-slate-205 shadow-2xl w-full max-w-2xl overflow-hidden text-slate-900 font-sans text-xs"
          >
            <div className="bg-slate-905 bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold tracking-wide uppercase">Nhập Học viên hàng loạt</h3>
                  <p className="text-slate-300 text-[10px] font-sans mt-0.5">Hỗ trợ dán văn bản phân tách bằng dấu phẩy hoặc tải lên file Excel trực tiếp</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setBulkText('');
                  setBulkPreview([]);
                  setShowBulkModal(false);
                }}
                className="text-slate-400 hover:text-white transition p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Segmented Tab Selector */}
            <div className="flex border-b border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setImportMode('paste');
                  setBulkPreview([]);
                  setBulkError('');
                }}
                className={`flex-1 py-3 text-center border-b-2 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  importMode === 'paste'
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>📋 Dán Văn bản (Nhiều cột)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportMode('excel');
                  setBulkPreview([]);
                  setBulkError('');
                }}
                className={`flex-1 py-3 text-center border-b-2 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  importMode === 'excel'
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>📁 Tải lên file Excel (.xlsx, .xls)</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {importMode === 'paste' ? (
                <>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-slate-700 leading-normal space-y-1.5 font-sans">
                    <p className="font-bold text-indigo-950">Mẫu định dạng dán hỗ trợ:</p>
                    <div className="font-mono text-[10.5px] bg-slate-900 text-slate-100 p-2.5 rounded-lg space-y-1">
                      <p className="text-slate-400"># Cấu trúc: Mã số, Họ đệm, Tên, Tên trường, SĐT, Ngày sinh, Cán sự</p>
                      <p>25PM0001,NGUYỄN MINH,DŨNG,THPT Chu Văn An,0901234567,11/05/2006,Lớp trưởng</p>
                      <p>25PM0002,PHẠM HOÀNG,NAM,THPT Lương Thế Vinh,0988776655,25/08/2007,</p>
                    </div>
                    <p className="text-[10px] text-slate-500 italic mt-1">Lưu ý: Bạn có thể chỉ dán Mã số, Họ đệm, Tên và các cột sau để trống (ngăn cách bằng dấu phẩy) hoặc dán Tên thuần túy.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-755">Dán văn bản sao chép vào ô bên dưới:</label>
                    <textarea
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder="25PM0001,NGUYỄN MINH,DŨNG,THPT Chu Văn An,0901234567,11/05/2006&#10;25PM0002,PHẠM HOÀNG,NAM,THPT Lương Thế Vinh,,25/08/2007"
                      rows={6}
                      className="w-full p-2.5 font-mono border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 bg-slate-50 text-[11px]"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-slate-700 leading-normal space-y-1.5 font-sans">
                    <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-600" />
                      Hướng dẫn định dạng cột Excel:
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Hệ thống tự động nhận diện tiêu đề cột thông minh dựa trên dòng đầu tiên. Hãy đảm bảo các cột của bạn chứa các từ khóa sau hoặc sắp xếp theo thứ tự mặc định từ cột đầu tiên:<br/>
                      <span className="font-semibold text-slate-800">Cột 1:</span> Mã học viên | <span className="font-semibold text-slate-800">Cột 2:</span> Họ lót | <span className="font-semibold text-slate-800">Cột 3:</span> Tên | <span className="font-semibold text-slate-800">Cột 4:</span> Tên trường | <span className="font-semibold text-slate-800">Cột 5:</span> Số điện thoại | <span className="font-semibold text-slate-800">Cột 6:</span> Ngày sinh | <span className="font-semibold text-slate-800">Cột 7:</span> Cán sự.
                    </p>
                  </div>

                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 hover:bg-slate-50 transition text-center relative group">
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleStudentExcelUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <div className="p-3.5 bg-indigo-50 text-indigo-700 rounded-full group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-xs">Nhấp chuột hoặc Kéo thả file Excel vào đây</p>
                        <p className="text-[10px] text-slate-400 mt-1">Hỗ trợ định dạng file .xlsx, .xls hoặc .csv</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {bulkError && (
                <div className="p-2.5 bg-red-50 text-red-700 font-semibold border border-red-200 rounded-lg">
                  {bulkError}
                </div>
              )}

              {importMode === 'paste' && (
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={parseBulkText}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl shadow active:scale-95 transition cursor-pointer"
                  >
                    Phân tích cấu trúc trước
                  </button>

                  <div className="text-[11.5px] text-slate-500">
                    Phân tích được: <strong className="font-mono text-indigo-700">{bulkPreview.length}</strong> dòng
                  </div>
                </div>
              )}

              {importMode === 'excel' && bulkPreview.length > 0 && (
                <div className="text-right text-[11.5px] text-slate-500 font-sans">
                  Nhận diện từ Excel: <strong className="font-mono text-indigo-700">{bulkPreview.length}</strong> dòng hợp lệ
                </div>
              )}

              {bulkPreview.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 font-bold text-slate-600 border-b border-slate-200 uppercase text-[10px]">
                    Xem trước kết quả phân tích
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-100">
                    {bulkPreview.map((item, id) => (
                      <div key={id} className="p-2 px-3 flex items-center justify-between hover:bg-slate-50 font-sans text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-mono">#{id+1}</span>
                          <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">{item.studentCode}</span>
                        </div>
                        <div className="font-bold text-slate-900 flex-1 px-4 truncate">
                          <span className="font-semibold text-slate-500 mr-1">{item.lastName}</span>
                          <span>{item.firstName}</span>
                        </div>
                        <div className="text-slate-500 text-[10px] space-y-0.5 max-w-[200px] truncate text-right">
                          {item.bcs && <span className="inline-block bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] px-1 rounded font-bold uppercase tracking-wider mb-0.5">{item.bcs}</span>}
                          {item.schoolName && <p>🏫 {item.schoolName}</p>}
                          {(item.phoneNumber || item.birthDate) && (
                            <p className="font-mono text-[9px]">
                              {item.phoneNumber && `📞 ${item.phoneNumber}`} {item.birthDate && `📅 ${item.birthDate}`}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-150 flex items-center justify-end gap-2.5 select-none animate-none">
              <button
                type="button"
                onClick={() => {
                  setBulkText('');
                  setBulkPreview([]);
                  setShowBulkModal(false);
                }}
                className="py-2 px-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleBulkSubmitSubmit}
                disabled={bulkPreview.length === 0}
                className={`py-2 px-5 font-bold rounded-xl transition shadow h-full flex items-center gap-1.5 cursor-pointer ${
                  bulkPreview.length > 0 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>Nhập danh sách ngay</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Advanced Bulk modal with delimiter hints for Teachers */}
      {showTchBulkModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl border border-slate-201 shadow-2xl w-full max-w-2xl overflow-hidden text-slate-900 font-sans text-xs"
          >
            <div className="bg-slate-905 bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4.5 flex items-center justify-between font-sans">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold tracking-wide uppercase">Nhập Giáo viên hàng loạt</h3>
                  <p className="text-slate-300 text-[10px] mt-0.5">Hỗ trợ dán văn bản phân tách bằng dấu phẩy hoặc tải lên file Excel trực tiếp</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setTchBulkText('');
                  setTchBulkPreview([]);
                  setShowTchBulkModal(false);
                }}
                className="text-slate-400 hover:text-white transition p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Segmented Tab Selector */}
            <div className="flex border-b border-slate-200 bg-slate-50 font-sans">
              <button
                type="button"
                onClick={() => {
                  setTchImportMode('paste');
                  setTchBulkPreview([]);
                  setTchBulkError('');
                }}
                className={`flex-1 py-3 text-center border-b-2 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  tchImportMode === 'paste'
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>📋 Dán Văn bản (Nhiều cột)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTchImportMode('excel');
                  setTchBulkPreview([]);
                  setTchBulkError('');
                }}
                className={`flex-1 py-3 text-center border-b-2 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  tchImportMode === 'excel'
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>📁 Tải lên file Excel (.xlsx, .xls)</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {tchImportMode === 'paste' ? (
                <>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-slate-700 leading-normal space-y-1.5 font-sans">
                    <p className="font-bold text-indigo-950">Mẫu định dạng dán hỗ trợ:</p>
                    <div className="font-mono text-[10.5px] bg-slate-900 text-slate-100 p-2.5 rounded-lg space-y-1">
                      <p className="text-slate-400"># Cấu trúc: Mã số, Họ đệm, Tên, Số điện thoại, Email, Chuyên môn, Đơn vị</p>
                      <p>GV001,NGUYỄN VĂN,HÙNG,0901234567,hunghv@truong.edu.vn,Lắp ráp & Bảo trì PC,Khoa CNTT</p>
                      <p>GV002,PHẠM ANH,TÚ,0911223344,tupa@truong.edu.vn,Lập trình Web,Khoa Điện tử</p>
                    </div>
                    <p className="text-[10px] text-slate-500 italic mt-1">Lưu ý: Bạn có thể chỉ dán Mã số, Họ đệm, Tên và các cột sau để trống (ngăn cách bằng dấu phẩy) hoặc chỉ dán Họ Tên thuần túy (hệ thống tự phát sinh mã giáo viên liên tiếp).</p>
                  </div>

                  <div className="space-y-1.5 font-sans">
                    <label className="block font-bold text-slate-755">Dán văn bản sao chép vào ô bên dưới:</label>
                    <textarea
                      value={tchBulkText}
                      onChange={(e) => setTchBulkText(e.target.value)}
                      placeholder="GV001,NGUYỄN VĂN,HÙNG,0901234567,hunghv@truong.edu.vn,Lắp ráp & Bảo trì PC,Khoa CNTT&#10;GV002,PHẠM ANH,TÚ,0911223344,tupa@truong.edu.vn,Lập trình Web,Khoa Điện tử"
                      rows={6}
                      className="w-full p-2.5 font-mono border border-slate-200 rounded-xl focus:border-indigo-505 focus:ring-1 focus:ring-indigo-500 text-slate-800 bg-slate-50 text-[11px]"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-slate-700 leading-normal space-y-1.5 font-sans">
                    <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-600" />
                      Hướng dẫn định dạng cột Excel:
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Hệ thống tự động nhận diện tiêu đề cột thông minh dựa trên dòng đầu tiên. Hãy đảm bảo các cột của bạn chứa các từ khóa sau hoặc sắp xếp theo thứ tự mặc định từ cột đầu tiên:<br/>
                      <span className="font-semibold text-slate-800">Cột 1:</span> Mã giáo viên | <span className="font-semibold text-slate-800">Cột 2:</span> Họ lót | <span className="font-semibold text-slate-800">Cột 3:</span> Tên | <span className="font-semibold text-slate-800">Cột 4:</span> Số điện thoại | <span className="font-semibold text-slate-800">Cột 5:</span> Email | <span className="font-semibold text-slate-800">Cột 6:</span> Chuyên môn | <span className="font-semibold text-slate-800">Cột 7:</span> Đơn vị / Khoa.
                    </p>
                  </div>

                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 hover:bg-slate-50 transition text-center relative group font-sans">
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleTeacherExcelUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <div className="p-3.5 bg-indigo-50 text-indigo-700 rounded-full group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-xs">Nhấp chuột hoặc Kéo thả file Excel vào đây</p>
                        <p className="text-[10px] text-slate-400 mt-1">Hỗ trợ định dạng file .xlsx, .xls hoặc .csv</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {tchBulkError && (
                <div className="p-2.5 bg-red-50 text-red-700 font-semibold border border-red-200 rounded-lg font-sans">
                  {tchBulkError}
                </div>
              )}

              {tchImportMode === 'paste' && (
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={parseTchBulkText}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl shadow active:scale-95 transition cursor-pointer"
                  >
                    Phân tích cấu trúc trước
                  </button>

                  <div className="text-[11.5px] text-slate-500 font-sans">
                    Phân tích được: <strong className="font-mono text-indigo-700">{tchBulkPreview.length}</strong> dòng
                  </div>
                </div>
              )}

              {tchImportMode === 'excel' && tchBulkPreview.length > 0 && (
                <div className="text-right text-[11.5px] text-slate-500 font-sans">
                  Nhận diện từ Excel: <strong className="font-mono text-indigo-700">{tchBulkPreview.length}</strong> dòng giáo viên hợp lệ
                </div>
              )}

              {tchBulkPreview.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden font-sans">
                  <div className="bg-slate-50 px-3 py-2 font-bold text-slate-600 border-b border-slate-200 uppercase text-[10px]">
                    Xem trước kết quả phân tích
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-100">
                    {tchBulkPreview.map((item, id) => (
                      <div key={id} className="p-2 px-3 flex items-center justify-between hover:bg-slate-50 font-sans text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-mono">#{id+1}</span>
                          <span className="bg-emerald-100 text-emerald-950 px-1.5 py-0.5 rounded font-mono font-bold">{item.teacherCode}</span>
                        </div>
                        <div className="font-bold text-slate-900 flex-1 px-4 truncate">
                          <span className="font-semibold text-slate-500 mr-1">{item.lastName}</span>
                          <span>{item.firstName}</span>
                        </div>
                        <div className="text-slate-500 text-[10px] space-y-0.5 max-w-[200px] truncate text-right font-mono">
                          {item.specialty && <p className="font-semibold">💼 {item.specialty}</p>}
                          {item.department && <p className="text-indigo-600 font-bold">🏢 {item.department}</p>}
                          {item.phoneNumber && <p>📞 {item.phoneNumber}</p>}
                          {item.email && <p>✉️ {item.email}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-150 flex items-center justify-end gap-2.5 select-none animate-none font-sans">
              <button
                type="button"
                onClick={() => {
                  setTchBulkText('');
                  setTchBulkPreview([]);
                  setShowTchBulkModal(false);
                }}
                className="py-2 px-4 bg-white border border-slate-200 text-slate-705 font-bold rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleTchBulkSubmit}
                disabled={tchBulkPreview.length === 0}
                className={`py-2 px-5 font-bold rounded-xl transition shadow h-full flex items-center gap-1.5 cursor-pointer ${
                  tchBulkPreview.length > 0 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>Nhập danh sách giáo viên</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
