import React, { useState, useEffect } from 'react';
import { AppDatabase, ClassData, Student, AttendanceSession, AttendanceRecord } from '../types';
import { CheckCircle2, UserCheck, Smartphone, Search, AlertCircle, ArrowLeft, Send } from 'lucide-react';

interface StudentPortalProps {
  qrSessionId: string;
  db: AppDatabase;
  onUpdateDb: (newDb: AppDatabase) => void;
}

export default function StudentPortal({ qrSessionId, db, onUpdateDb }: StudentPortalProps) {
  const [portalMode, setPortalMode] = useState<'quick' | 'list'>('quick');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typedCode, setTypedCode] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successInfo, setSuccessInfo] = useState<{ name: string; code: string; time: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // URL Parameters for anti-cheat
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const urlToken = urlParams.get('token') || '';
  const urlLat = parseFloat(urlParams.get('lat') || '0');
  const urlLng = parseFloat(urlParams.get('lng') || '0');
  const gpsRequired = urlParams.get('gps_required') === 'true';
  const deviceLimit = urlParams.get('device_limit') === 'true';

  // Anti-cheat verification states
  const [tokenValid, setTokenValid] = useState<boolean>(true);
  const [gpsSimMode, setGpsSimMode] = useState<'classroom' | 'home' | 'real'>('classroom');

  // Helper to generate rolling token (OTP) for verification
  const calculateOTP = (block: number): string => {
    const str = `${qrSessionId}_rolling_secret_${block}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash % 1000000).toString().padStart(6, '0');
  };

  // Haversine formula to compute distance in meters
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
  };

  // Monitor rolling OTP validity in real-time
  useEffect(() => {
    if (!urlToken) return;
    
    const checkValidity = () => {
      const currentBlock = Math.floor(Date.now() / 10000);
      const otpCurrent = calculateOTP(currentBlock);
      const otpPrev = calculateOTP(currentBlock - 1);
      setTokenValid(urlToken === otpCurrent || urlToken === otpPrev);
    };

    checkValidity();
    const interval = setInterval(checkValidity, 1000);
    return () => clearInterval(interval);
  }, [urlToken, qrSessionId]);

  // Find the class and session that matches qrSessionId
  let activeClassId = db.activeClassId;
  let activeClass: ClassData = db.classes[activeClassId] || Object.values(db.classes)[0];
  let targetSession: AttendanceSession | null = null;

  for (const cid of Object.keys(db.classes)) {
    const cls = db.classes[cid];
    const sess = cls.sessions.find(s => s.id === qrSessionId);
    if (sess) {
      activeClassId = cid;
      activeClass = cls;
      targetSession = sess;
      break;
    }
  }

  const { students = [], sessions = [], attendance = [] } = activeClass;

  // Filter students based on search query
  const filteredStudents = students.filter(s => {
    const fullName = `${s.lastName} ${s.firstName}`.toLowerCase();
    const cleanQuery = searchQuery.toLowerCase();
    return s.studentCode.toLowerCase().includes(cleanQuery) || fullName.includes(cleanQuery);
  });

  // Self-lookup computed student
  const matchedStudent = typedCode.trim() 
    ? students.find(s => s.studentCode.toLowerCase().trim() === typedCode.toLowerCase().trim()) 
    : null;

  // Synthesize realistic sound beep
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 880; // High frequency beep (A5)
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn('Silent beep due to user interaction policies:', e);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let student: Student | undefined;

    if (portalMode === 'quick') {
      if (!typedCode.trim()) {
        setErrorMessage('Vui lòng nhập Mã Số Học Viên (MSSV) của bạn.');
        return;
      }
      student = matchedStudent || undefined;
      if (!student) {
        setErrorMessage(`Không tìm thấy mã học viên "${typedCode}" trong lớp này. Vui lòng kiểm tra lại chính xác.`);
        return;
      }
    } else {
      if (!selectedStudentId) {
        setErrorMessage('Vui lòng chọn hoặc tìm tên của bạn trong danh sách lớp.');
        return;
      }
      student = students.find(s => s.id === selectedStudentId);
      if (!student) {
        setErrorMessage('Học viên không tồn tại trong lớp này.');
        return;
      }
      if (typedCode && student.studentCode.toLowerCase().trim() !== typedCode.toLowerCase().trim()) {
        setErrorMessage('Mã số học viên nhập vào không khớp với người được chọn.');
        return;
      }
    }

    // Check if already present to prevent duplicate logs/operations
    const presentAlready = attendance.some(r => r.studentId === student?.id && r.sessionId === qrSessionId && r.status === 'present');
    if (presentAlready) {
      setErrorMessage(`Học viên ${student.lastName} ${student.firstName} (${student.studentCode}) đã được ghi nhận có mặt trong buổi học này rồi.`);
      return;
    }

    // 1. Verify rolling QR code token
    if (urlToken) {
      const currentBlock = Math.floor(Date.now() / 10000);
      const otpCurrent = calculateOTP(currentBlock);
      const otpPrev = calculateOTP(currentBlock - 1);
      
      if (urlToken !== otpCurrent && urlToken !== otpPrev) {
        setErrorMessage("Mã QR đã hết hạn! Vui lòng căn chỉnh điện thoại để quét mã QR mới nhất đang hiển thị trên màn hình của giảng viên.");
        return;
      }
    } else {
      setErrorMessage("Không tìm thấy mã bảo mật OTP trong URL điểm danh. Vui lòng quét mã QR từ màn hình giáo viên.");
      return;
    }

    // 2. Verify device check-in limit
    if (deviceLimit) {
      const localCheckedInCode = localStorage.getItem(`device_checkin_for_${qrSessionId}`);
      if (localCheckedInCode && localCheckedInCode !== student.studentCode) {
        setErrorMessage(`Thiết bị này đã được dùng để điểm danh cho học sinh có mã ${localCheckedInCode}. Mỗi thiết bị chỉ được điểm danh cho 1 học viên duy nhất.`);
        return;
      }
    }

    // 3. Verify classroom location (Geofencing GPS check)
    let calculatedDistance = 0;
    let actualUserLat = 0;
    let actualUserLng = 0;

    if (gpsRequired) {
      if (gpsSimMode === 'classroom') {
        // Mock classroom: ~15m away
        actualUserLat = urlLat + 0.0001;
        actualUserLng = urlLng + 0.0001;
        calculatedDistance = calculateDistance(urlLat, urlLng, actualUserLat, actualUserLng);
      } else if (gpsSimMode === 'home') {
        // Mock home: ~5.4km away
        actualUserLat = urlLat + 0.04;
        actualUserLng = urlLng + 0.03;
        calculatedDistance = calculateDistance(urlLat, urlLng, actualUserLat, actualUserLng);
      } else {
        // Real browser location
        setSubmitting(true);
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 });
          });
          actualUserLat = pos.coords.latitude;
          actualUserLng = pos.coords.longitude;
          calculatedDistance = calculateDistance(urlLat, urlLng, actualUserLat, actualUserLng);
        } catch (error) {
          setErrorMessage("Không thể truy cập định vị GPS trên thiết bị của bạn. Vui lòng cấp quyền vị trí cho trình duyệt và thử lại.");
          setSubmitting(false);
          return;
        }
      }

      if (calculatedDistance > 50) {
        setErrorMessage(`Điểm danh thất bại! Bạn đang ở cách xa lớp học ${calculatedDistance > 1000 ? `${(calculatedDistance/1000).toFixed(2)} km` : `${Math.round(calculatedDistance)} m`}. Khoảng cách tối đa cho phép là 50m.`);
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(true);

    // Simulate scanning/network delay
    setTimeout(() => {
      // 1. Mark present in local storage
      const existingRecordIndex = attendance.findIndex(
        r => r.studentId === student!.id && r.sessionId === qrSessionId
      );

      let updatedAttendance = [...attendance];
      const newRecord: AttendanceRecord = {
        studentId: student!.id,
        sessionId: qrSessionId,
        status: 'present',
        unexcusedPeriods: 0
      };

      if (existingRecordIndex > -1) {
        updatedAttendance[existingRecordIndex] = newRecord;
      } else {
        updatedAttendance.push(newRecord);
      }

      const updatedDb: AppDatabase = {
        ...db,
        classes: {
          ...db.classes,
          [activeClassId]: {
            ...activeClass,
            attendance: updatedAttendance
          }
        }
      };

      // Call parent updateDb (which saves to disk)
      onUpdateDb(updatedDb);

      // Play "Tít!" sound
      playBeep();

      // Lock device to this student code if limit is active
      if (deviceLimit) {
        localStorage.setItem(`device_checkin_for_${qrSessionId}`, student!.studentCode);
      }

      // 2. Broadcast scanning event in real-time
      try {
        const getDeviceFingerprint = () => {
          const fingerprintInput = `${navigator.userAgent}_${screen.width}x${screen.height}_${navigator.language}_${navigator.platform}`;
          let hash = 0;
          for (let i = 0; i < fingerprintInput.length; i++) {
            hash = (hash << 5) - hash + fingerprintInput.charCodeAt(i);
            hash |= 0;
          }
          return 'fp_' + Math.abs(hash).toString(16);
        };

        const getDeviceInfo = () => {
          const ua = navigator.userAgent;
          if (/mobile/i.test(ua)) {
            if (/iphone|ipad|ipod/i.test(ua)) return 'iPhone (iOS)';
            if (/android/i.test(ua)) return 'Android Phone';
            return 'Mobile';
          }
          if (/macintosh/i.test(ua)) return 'MacBook (macOS)';
          if (/windows/i.test(ua)) return 'Windows PC';
          if (/linux/i.test(ua)) return 'Linux PC';
          return 'Web Browser';
        };

        const channel = new BroadcastChannel('qr_attendance_sync');
        channel.postMessage({
          type: 'attendance_scanned',
          studentId: student!.id,
          studentCode: student!.studentCode,
          fullName: `${student!.lastName} ${student!.firstName}`,
          sessionId: qrSessionId,
          deviceFingerprint: getDeviceFingerprint(),
          deviceInfo: getDeviceInfo(),
          distanceText: gpsRequired ? `${Math.round(calculatedDistance)} m` : 'Không xác minh GPS',
          bypassGps: false
        });
        channel.close();
      } catch (err) {
        console.warn('BroadcastChannel error:', err);
      }

      // Record success state
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      
      setSuccessInfo({
        name: `${student!.lastName} ${student!.firstName}`,
        code: student!.studentCode,
        time: timeStr
      });

      setSubmitting(false);
      setTypedCode('');
      setSelectedStudentId('');
    }, 900);
  };

  const handleReturnToTeacher = () => {
    // Clear URL query parameter to return to classroom dashboard
    window.location.search = '';
  };

  if (!targetSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-200 font-sans">
        <div className="bg-slate-900 border border-slate-850 p-8 rounded-2xl max-w-md w-full text-center space-y-6 shadow-2xl">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto animate-bounce" />
          <h2 className="text-xl font-bold tracking-tight text-white">Phiên điểm danh không hợp lệ!</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Mã QR này không tương thích với bất kỳ buổi học hiển thị nào trên hệ thống sổ điểm ngày hôm nay. Vui lòng liên hệ Giảng viên để được hỗ trợ kiểm tra lại.
          </p>
          <button
            onClick={handleReturnToTeacher}
            className="w-full bg-slate-800 hover:bg-slate-750 text-slate-200 py-3 rounded-xl font-bold text-xs transition cursor-pointer"
          >
            Quay lại trang chính Giáo viên
          </button>
        </div>
      </div>
    );
  }

  const dateParts = targetSession.date.split('-');
  const formattedDate = dateParts.length >= 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : targetSession.date;

  // Render scan success congratulations card
  if (successInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-indigo-950/60 flex items-center justify-center p-4 text-slate-200 font-sans">
        <div className="bg-slate-900/90 border border-emerald-500/20 p-8 rounded-2xl max-w-md w-full text-center space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
          {/* Confetti element decorations */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 shadow-[0_0_15px_#10b981]"></div>
          <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-emerald-500/5 blur-xl"></div>
          
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 relative">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-[bounce_1s_infinite]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-white tracking-tight uppercase">Điểm Danh Thành Công!</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Tín hiệu của bạn đã được truyền tải thành công tới máy chủ bài giảng lớp học.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4.5 text-left font-mono space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 uppercase font-black text-[10px]">Học viên:</span>
              <strong className="text-emerald-400 font-sans font-bold">{successInfo.name}</strong>
            </div>
            <div className="flex justify-between border-t border-slate-850 pt-2">
              <span className="text-slate-500 uppercase font-black text-[10px]">Mã số (MSSV):</span>
              <strong className="text-slate-300 font-mono font-bold">{successInfo.code}</strong>
            </div>
            <div className="flex justify-between border-t border-slate-850 pt-2">
              <span className="text-slate-500 uppercase font-black text-[10px]">Thời gian quét:</span>
              <strong className="text-amber-400 font-mono">{successInfo.time}</strong>
            </div>
            <div className="flex justify-between border-t border-slate-850 pt-2">
              <span className="text-slate-500 uppercase font-black text-[10px]">Môn học/Buổi:</span>
              <strong className="text-indigo-400 font-sans text-right line-clamp-1">{activeClass.metadata.subjectName}</strong>
            </div>
            <div className="flex justify-between border-t border-slate-850 pt-2">
              <span className="text-slate-500 uppercase font-black text-[10px]">Lớp / Ngày:</span>
              <strong className="text-slate-300 font-sans">{activeClass.metadata.className} | {formattedDate}</strong>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1.5 font-mono">
            <Smartphone className="w-3.5 h-3.5 text-slate-600" />
            <span>Kênh trực tuyến hoạt động: ĐÃ ĐỒNG BỘ ✓</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => setSuccessInfo(null)}
              className="py-2.5 bg-slate-800 hover:bg-slate-755 text-xs text-slate-300 rounded-lg font-bold cursor-pointer transition border border-slate-700/50"
            >
              Mã SV khác
            </button>
            <button
              onClick={handleReturnToTeacher}
              className="py-2.5 bg-indigo-650 hover:bg-indigo-700 text-xs text-white rounded-lg font-bold cursor-pointer transition flex items-center justify-center gap-1 shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Giao diện giáo viên
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Find if some students are already checked in to show them beautifully
  const isAlreadyPresent = (sid: string) => {
    const rec = attendance.find(r => r.studentId === sid && r.sessionId === qrSessionId);
    return rec?.status === 'present';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-between py-6 px-4 font-sans text-slate-200">
      
      {/* Decorative Blur Background Globals */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-amber-500/5 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/3 w-64 h-64 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none"></div>

      {/* Header Container */}
      <header className="max-w-md w-full mx-auto text-center space-y-2 relative z-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-black uppercase tracking-widest font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
          Cổng Smart QR Chuyên Cần
        </span>
        <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight uppercase font-display leading-tight">
          Học Viên Điểm Danh Tự Phục Vụ
        </h1>
        <p className="text-slate-400 text-xs px-4">
          Xác nhận có mặt tại buổi học lớp <strong>{activeClass.metadata.className}</strong>.
        </p>
      </header>

      {/* Main Interactive Checkin Form Card */}
      <main className="max-w-md w-full mx-auto my-6 relative z-10">
        <form 
          onSubmit={handleCheckIn}
          className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6.5 shadow-2xl space-y-4.5 relative overflow-hidden backdrop-blur-sm"
        >
          {/* Lecture metadata card block */}
          <div className="bg-slate-950/65 border border-slate-805/50 rounded-xl p-4.5 space-y-2 text-xs">
            <h3 className="text-slate-200 font-bold flex items-center gap-1.5 font-display text-xs border-b border-slate-800/40 pb-2 mb-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              Thông tin buổi học đang mở điểm danh:
            </h3>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 uppercase tracking-wider font-extrabold text-[9px]">Môn học:</span>
              <strong className="col-span-2 text-slate-350">{activeClass.metadata.subjectName}</strong>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 uppercase tracking-wider font-extrabold text-[9px]">Ngày học:</span>
              <strong className="col-span-2 text-amber-500 font-mono">{formattedDate} ({targetSession.periods} tiết)</strong>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 uppercase tracking-wider font-extrabold text-[9px]">Giảng viên:</span>
              <strong className="col-span-2 text-slate-400">{activeClass.metadata.teacherName}</strong>
            </div>
          </div>

          {/* Security Status Panel */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
            <h4 className="text-slate-200 font-bold flex items-center gap-1.5 uppercase text-[9px] tracking-wider border-b border-slate-800/60 pb-1.5 mb-1.5">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              Chế độ kiểm tra bảo mật:
            </h4>
            <div className="space-y-1.5">
              {/* Token status */}
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Mã QR động (10s):</span>
                <span className={`font-bold ${tokenValid ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`}>
                  {tokenValid ? '✓ Đang hoạt động' : '❌ Đã hết hạn (Quét lại)'}
                </span>
              </div>
              
              {/* GPS status */}
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Xác thực vị trí:</span>
                <span className={`font-bold ${gpsRequired ? 'text-amber-400' : 'text-slate-400'}`}>
                  {gpsRequired ? '✓ Bắt buộc (<50m)' : 'Không yêu cầu'}
                </span>
              </div>

              {/* Device Limit status */}
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Giới hạn thiết bị:</span>
                <span className={`font-bold ${deviceLimit ? 'text-indigo-400' : 'text-slate-400'}`}>
                  {deviceLimit ? '✓ 1 Thiết bị / 1 Học viên' : 'Tắt'}
                </span>
              </div>
            </div>
          </div>

          {/* GPS Simulation Panel for testing */}
          {gpsRequired && (
            <div className="bg-slate-950/80 border border-amber-500/10 p-3.5 rounded-xl space-y-2 text-left">
              <span className="text-amber-500 text-[9px] font-black uppercase tracking-wider block">
                🛠️ Giả lập định vị (Kiểm thử Geofencing):
              </span>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setGpsSimMode('classroom')}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all text-center cursor-pointer ${
                    gpsSimMode === 'classroom'
                      ? 'bg-amber-500/20 text-amber-450 border border-amber-500/30 font-extrabold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-350 border border-slate-800'
                  }`}
                >
                  📍 Trong lớp (~15m)
                </button>
                <button
                  type="button"
                  onClick={() => setGpsSimMode('home')}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all text-center cursor-pointer ${
                    gpsSimMode === 'home'
                      ? 'bg-rose-500/20 text-rose-450 border border-rose-500/30 font-extrabold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-350 border border-slate-800'
                  }`}
                >
                  🏠 Ở nhà (~5.4km)
                </button>
                <button
                  type="button"
                  onClick={() => setGpsSimMode('real')}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all text-center cursor-pointer ${
                    gpsSimMode === 'real'
                      ? 'bg-indigo-500/20 text-indigo-455 border border-indigo-500/30 font-extrabold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-350 border border-slate-800'
                  }`}
                >
                  📡 GPS thực tế
                </button>
              </div>
              <p className="text-[9px] text-slate-500 leading-normal italic mt-1.5">
                {gpsSimMode === 'classroom' && "* Mô phỏng học sinh đang ngồi trong lớp học. Điểm danh SẼ THÀNH CÔNG."}
                {gpsSimMode === 'home' && "* Mô phỏng học sinh đang ở nhà. Điểm danh SẼ BỊ CHẶN."}
                {gpsSimMode === 'real' && "* Sử dụng tọa độ GPS thực tế lấy từ định vị thiết bị của bạn."}
              </p>
            </div>
          )}

          {/* Mode Switcher Buttons */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 border border-slate-850 rounded-xl relative z-20">
            <button
              type="button"
              onClick={() => {
                setPortalMode('quick');
                setErrorMessage(null);
                setSelectedStudentId('');
                setTypedCode('');
              }}
              className={`py-2 px-2.5 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                portalMode === 'quick'
                  ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-400 hover:text-slate-250'
              }`}
            >
              🚀 Nhập nhanh MSSV
            </button>
            <button
              type="button"
              onClick={() => {
                setPortalMode('list');
                setErrorMessage(null);
                setSelectedStudentId('');
                setTypedCode('');
              }}
              className={`py-2 px-2.5 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                portalMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-400 hover:text-slate-250'
              }`}
            >
              📋 Chọn từ danh sách
            </button>
          </div>

          {errorMessage && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-450 text-xs flex gap-2.5 items-start">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
              <p className="leading-relaxed text-left">{errorMessage}</p>
            </div>
          )}

          {portalMode === 'quick' ? (
            <div className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="block text-slate-350 text-[10px] font-black uppercase tracking-wider font-sans">
                  Nhập Mã Số Học Viên (MSSV):
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: SV001, SV002..."
                  value={typedCode}
                  onChange={(e) => {
                    setTypedCode(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm font-bold rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-mono tracking-widest text-center uppercase"
                  autoFocus
                />
              </div>

              {/* Dynamic Student Match Card Feedback */}
              {matchedStudent ? (
                <div className="bg-slate-950/80 border border-emerald-500/30 p-4 rounded-xl text-left text-xs space-y-1.5 animate-pulse">
                  <div className="text-[10px] font-mono text-emerald-400 uppercase font-black tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    Đã nhận diện học viên:
                  </div>
                  <div className="font-sans text-sm font-bold text-white">
                    {matchedStudent.lastName} {matchedStudent.firstName}
                  </div>
                  <div className="font-mono text-slate-400 text-[11px] flex justify-between border-t border-slate-850/50 pt-1.5 mt-1">
                    <span>MSSV: {matchedStudent.studentCode}</span>
                    <span className="text-slate-400 font-sans">{matchedStudent.schoolName || 'Chưa ghi nhận trường'}</span>
                  </div>
                </div>
              ) : typedCode.trim() ? (
                <p className="text-[10px] text-rose-400 text-left font-sans italic leading-snug">
                  * Chưa tìm thấy MSSV này trong cơ sở dữ liệu của lớp hiện tại. Hãy kiểm tra lại!
                </p>
              ) : (
                <p className="text-[10px] text-slate-500 text-left font-sans italic leading-snug">
                  * Hãy gõ chính xác mã số học sinh của bạn để hệ thống tự động nhận diện thông minh, tránh chọn lầm tên người khác.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Input Select Your Name */}
              <div className="space-y-1.5 text-left">
                <label className="block text-slate-350 text-[10px] font-black uppercase tracking-wider font-sans">
                  Tìm hoặc chọn Tên học viên của bạn:
                </label>
                
                {/* Instant Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Nhập MSSV hoặc họ và tên của bạn..."
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-4.5 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-sans tracking-wide"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setErrorMessage(null);
                    }}
                  />
                </div>

                {/* Listbox simulated or native selector for easier touch targets */}
                <div className="mt-1.5 relative">
                  <select
                    value={selectedStudentId}
                    onChange={(e) => {
                      setSelectedStudentId(e.target.value);
                      setErrorMessage(null);
                      
                      // Match and auto fill code
                      const matched = students.find(s => s.id === e.target.value);
                      if (matched) {
                        setTypedCode(matched.studentCode);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 max-h-40 cursor-pointer text-left"
                  >
                    <option value="">-- Click để lựa chọn tên bạn --</option>
                    {filteredStudents
                      .sort((a, b) => a.lastName.localeCompare(b.lastName))
                      .map(s => {
                        const present = isAlreadyPresent(s.id);
                        return (
                          <option key={s.id} value={s.id} disabled={present}>
                            {s.lastName} {s.firstName} ({s.studentCode}) {present ? ' [✓ Đã điểm danh]' : ''}
                          </option>
                        );
                      })}
                  </select>
                </div>
              </div>

              {/* Student Code verification for security */}
              <div className="space-y-1.5 text-left">
                <label className="block text-slate-350 text-[10px] font-black uppercase tracking-wider font-sans flex items-center justify-between">
                  <span>Xác nhận Mã số Học viên để đối sánh:</span>
                  <span className="text-slate-500 text-[8px] font-normal italic lowercase border border-slate-800/60 rounded px-1.5 bg-slate-950/20">Bảo mật</span>
                </label>
                <input
                  type="text"
                  placeholder="Hệ thống tự điền khi chọn tên..."
                  value={typedCode}
                  onChange={(e) => {
                    setTypedCode(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="w-full bg-slate-950/50 border border-slate-850 text-slate-400 text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-mono tracking-widest text-center"
                />
              </div>
            </div>
          )}

          {/* Confirm Button */}
          <button
            type="submit"
            disabled={submitting || (portalMode === 'quick' ? !matchedStudent : !selectedStudentId)}
            className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all shadow-lg text-center select-none flex items-center justify-center gap-2 cursor-pointer border ${
              submitting || (portalMode === 'quick' ? !matchedStudent : !selectedStudentId)
                ? 'bg-slate-800 text-slate-550 border-slate-850 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500/20 shadow-emerald-900/10'
            }`}
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-200 border-t-transparent rounded-full animate-spin"></div>
                Đang truyền mã phát tín hiệu...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 animate-pulse text-emerald-300" />
                Gửi lệnh xác nhận có mặt
              </>
            )}
          </button>
        </form>
      </main>

      {/* Footer Instructions Info */}
      <footer className="max-w-md w-full mx-auto text-center space-y-4 pt-4 relative z-10 border-t border-slate-850/50">
        <p className="text-[10px] text-slate-500 leading-snug">
          Hệ thống chạy hoàn chỉnh trong môi trường sandbox của trình duyệt. <br />
          Mọi thông tin ghi nhận tức thì trên bảng điểm biểu của giảng viên.
        </p>

        <button
          onClick={handleReturnToTeacher}
          className="text-[11px] text-slate-400 hover:text-white font-bold transition flex items-center justify-center gap-1 mx-auto py-1.5 px-4 bg-slate-900 border border-slate-800 rounded-full cursor-pointer hover:bg-slate-850"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-indigo-400" />
          Về Sổ điểm Giáo viên chính
        </button>
      </footer>

    </div>
  );
}
