import React, { useState } from 'react';
import { X, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AppDatabase, CurrentUser } from '../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUser;
  db: AppDatabase;
  onUpdateDb: (newDb: AppDatabase) => void;
}

export default function ChangePasswordModal({ isOpen, onClose, currentUser, db, onUpdateDb }: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Vui lòng điền đầy đủ các trường.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới không khớp.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải dài ít nhất 6 ký tự.');
      return;
    }

    if (currentUser.id === 'admin_sys') {
      setError('Tài khoản admin hệ thống không thể đổi mật khẩu qua giao diện này.');
      return;
    }

    // Find teacher and update password
    let updatedDb = { ...db, classes: { ...db.classes } };
    let found = false;
    let oldPasswordMatch = false;

    Object.keys(updatedDb.classes).forEach(classId => {
      const cls = updatedDb.classes[classId];
      if (cls.teachers) {
        const teacherIndex = cls.teachers.findIndex(t => t.id === currentUser.id);
        if (teacherIndex !== -1) {
          found = true;
          if (cls.teachers[teacherIndex].password === oldPassword) {
            oldPasswordMatch = true;
            cls.teachers[teacherIndex] = {
              ...cls.teachers[teacherIndex],
              password: newPassword
            };
          }
        }
      }
    });

    if (!found) {
      setError('Không tìm thấy dữ liệu tài khoản.');
      return;
    }

    if (!oldPasswordMatch) {
      setError('Mật khẩu cũ không chính xác.');
      return;
    }

    onUpdateDb(updatedDb);
    setSuccess(true);
    
    setTimeout(() => {
      onClose();
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
            <KeyRound className="w-4 h-4 text-indigo-600" />
            <span>Đổi mật khẩu</span>
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-5">
          {success ? (
            <div className="text-center py-6 flex flex-col items-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-emerald-700 font-bold">Đổi mật khẩu thành công!</p>
              <p className="text-xs text-slate-500 mt-1">Sẽ tự động đóng hộp thoại...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Mật khẩu cũ</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  placeholder="Nhập mật khẩu hiện tại"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Mật khẩu mới</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  placeholder="Tối thiểu 6 ký tự"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  placeholder="Nhập lại mật khẩu mới"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition active:scale-[0.98] cursor-pointer text-sm"
                >
                  Xác nhận đổi
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
