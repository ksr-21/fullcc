
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { User, Course, Note, Assignment, AttendanceRecord, AttendanceStatus, Feedback } from '../types';
import Header from '../components/Header';
import BottomNavBar from '../components/BottomNavBar';
import Avatar from '../components/Avatar';
import UploadMaterialModal from '../components/UploadMaterialModal';
import CreateAssignmentModal from '../components/CreateAssignmentModal';
import AddStudentToCourseModal from '../components/AddStudentToCourseModal';
import { 
    BookOpenIcon, UsersIcon, ClipboardListIcon, FileTextIcon, MessageIcon, 
    PlusIcon, ArrowLeftIcon, DownloadIcon, TrashIcon, CheckCircleIcon, 
    ClockIcon, SendIcon, ActivityIcon, UploadIcon, SaveIcon, LinkIcon,
    CheckSquareIcon, XCircleIcon, CalendarIcon, ListIcon, LayoutGridIcon,
    FilterIcon, EyeIcon, SearchIcon
} from '../components/Icons';
import { auth, db, FieldValue } from '../firebase';

// Helper to get YYYY-MM-DD in local time
const getLocalISOString = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().split('T')[0];
};

interface CourseDetailPageProps {
    course: Course;
    currentUser: User;
    allUsers: User[];
    students: { id: string; name: string; avatarUrl?: string; rollNo?: string; email: string }[];
    onNavigate: (path: string) => void;
    currentPath: string;
    onAddNote: (courseId: string, note: Note) => void;
    onAddAssignment: (courseId: string, assignment: Assignment) => void;
    onTakeAttendance: (courseId: string, record: AttendanceRecord) => void;
    onRequestToJoinCourse: (courseId: string) => void;
    onManageCourseRequest: (courseId: string, studentId: string, action: 'approve' | 'reject') => void;
    onAddStudentsToCourse: (courseId: string, studentIds: string[]) => void;
    onRemoveStudentFromCourse: (courseId: string, studentId: string) => void;
    onSendCourseMessage: (courseId: string, text: string) => void;
    onUpdateCoursePersonalNote: (courseId: string, note: string) => void;
    onSaveFeedback: (courseId: string, feedback: Feedback) => void;
    onDeleteCourse: (courseId: string) => void;
    onUpdateCourseFaculty: (courseId: string, facultyId: string) => void;
    onDeleteNote?: (courseId: string, note: Note) => void;
    onDeleteAssignment?: (courseId: string, assignment: Assignment) => void;
    initialTab?: string;
    initialAssignmentId?: string;
    isEmbedded?: boolean;
    isReadOnly?: boolean; 
}

const CourseDetailPage: React.FC<CourseDetailPageProps> = ({
    course,
    currentUser,
    allUsers,
    students,
    onNavigate,
    currentPath,
    onAddNote,
    onAddAssignment,
    onTakeAttendance,
    onAddStudentsToCourse,
    onRemoveStudentFromCourse,
    onSendCourseMessage,
    onDeleteNote,
    onDeleteAssignment,
    initialTab = 'materials',
    initialAssignmentId,
    isEmbedded = false,
    isReadOnly = false
}) => {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
    const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
    const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
    const [viewingSubmissionsTaskId, setViewingSubmissionsTaskId] = useState<string | null>(initialAssignmentId || null);
    
    // Date state for taking attendance
    const [attendanceDate, setAttendanceDate] = useState(getLocalISOString(new Date()));
    const [selectedSessionDate, setSelectedSessionDate] = useState<number | null>(null);
    const [sessionLabel, setSessionLabel] = useState("");
    const [attendanceStatus, setAttendanceStatus] = useState<Record<string, AttendanceStatus>>({});
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);

    // Date state for Exporting CSV
    const [exportFromDate, setExportFromDate] = useState(getLocalISOString(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
    const [exportToDate, setExportToDate] = useState(getLocalISOString(new Date()));

    const [displayMode, setDisplayMode] = useState<'full' | 'compact'>(() => {
        return (localStorage.getItem(`course_view_${course.id}`) as 'full' | 'compact') || 'full';
    });

    // --- Members Tab State ---
    const [memberSearch, setMemberSearch] = useState('');
    const [memberFilter, setMemberFilter] = useState<'All' | 'Low' | 'Safe'>('All');

    const [chatMessage, setChatMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Basic Faculty Check (Visiblity of Tabs)
    const isFaculty = currentUser.tag === 'Teacher' || currentUser.tag === 'HOD/Dean' || currentUser.tag === 'Director';
    
    // Permission Check: Owner/Admin of this specific course (used for deleting, editing assignments)
    const isOwner = !isReadOnly && (
        course.facultyId === currentUser.id || 
        (currentUser.tag === 'HOD/Dean' && currentUser.department === course.department) || 
        (currentUser.tag === 'Director' && currentUser.department === course.department)
    );

    // Permission Check: Specific to marking attendance
    const canManageAttendance = isOwner;

    const handleLogout = async () => { await auth.signOut(); onNavigate('#/'); };

    // Handle Back Navigation based on Role
    const handleBackClick = () => {
        if (currentUser.tag === 'Director') {
            onNavigate('#/director');
        } else {
            onNavigate('#/academics');
        }
    };

    // Submission Logic for Teachers
    const toggleSubmission = async (assignmentId: string, studentId: string) => {
        if (!isOwner) return;
        const assignment = course.assignments?.find(a => a.id === assignmentId);
        if (!assignment) return;

        const currentSubmissions = assignment.submissions || {};
        const isCurrentlySubmitted = currentSubmissions[studentId]?.submitted;
        
        const updatedSubmissions = {
            ...currentSubmissions,
            [studentId]: {
                ...currentSubmissions[studentId],
                submitted: !isCurrentlySubmitted,
                submittedAt: !isCurrentlySubmitted ? Date.now() : (currentSubmissions[studentId]?.submittedAt || null)
            }
        };

        const newAssignments = course.assignments?.map(a => 
            a.id === assignmentId ? { ...a, submissions: updatedSubmissions } : a
        );

        await db.collection('courses').doc(course.id).update({
            assignments: newAssignments
        });
    };

    const handleStudentSubmitTask = async (assignmentId: string, fileUrl: string) => {
        const assignment = course.assignments?.find(a => a.id === assignmentId);
        if (!assignment) return;

        const updatedSubmissions = {
            ...(assignment.submissions || {}),
            [currentUser.id]: {
                submitted: true,
                submittedAt: Date.now(),
                fileUrl: fileUrl
            }
        };

        const newAssignments = course.assignments?.map(a => 
            a.id === assignmentId ? { ...a, submissions: updatedSubmissions } : a
        );

        await db.collection('courses').doc(course.id).update({
            assignments: newAssignments
        });
        
        alert("Assignment submitted successfully!");
        setSubmittingTaskId(null);
    };

    const handleUploadSubmission = (file: Note) => {
        if (!submittingTaskId) return;
        handleStudentSubmitTask(submittingTaskId, file.fileUrl);
    };

    // Update attendance list when date or session changes
    useEffect(() => {
        const dayRecords = (course.attendanceRecords || []).filter(r => 
            new Date(r.date).toDateString() === new Date(attendanceDate).toDateString()
        ).sort((a, b) => a.date - b.date);

        let record: AttendanceRecord | undefined;
        if (selectedSessionDate && selectedSessionDate !== 0) {
            record = dayRecords.find(r => r.date === selectedSessionDate);
        } else if (selectedSessionDate === 0) {
            // Explicitly in "New Session" mode
            record = undefined;
        } else if (dayRecords.length > 0) {
            record = dayRecords[0];
            setSelectedSessionDate(record.date);
        }

        if (record) {
            setAttendanceStatus(Object.fromEntries(Object.entries(record.records).map(([k, v]: any) => [k, v.status])));
            setSessionLabel(record.label || "");
        } else {
            const newStatus: Record<string, AttendanceStatus> = {};
            students.forEach(s => newStatus[s.id] = 'present');
            setAttendanceStatus(newStatus);
            setSessionLabel("");
        }
    }, [attendanceDate, selectedSessionDate, course.attendanceRecords, students]);

    useEffect(() => {
        localStorage.setItem(`course_view_${course.id}`, displayMode);
    }, [displayMode, course.id]);

    const handleTakeAttendance = () => {
        if (!canManageAttendance) return;
        
        // If we're starting a new session (selectedSessionDate is 0 or not in records)
        // or updating an existing one.
        let timestamp = (selectedSessionDate && selectedSessionDate !== 0) ? selectedSessionDate : Date.now();
        
        if (!selectedSessionDate || selectedSessionDate === 0) {
            // New session: Combine selected date with current time
            const dateObj = new Date(attendanceDate);
            const now = new Date();
            dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
            timestamp = dateObj.getTime();
        }

        const record: AttendanceRecord = { 
            date: timestamp, 
            label: sessionLabel,
            records: {} 
        };
        students.forEach(s => record.records[s.id] = { status: attendanceStatus[s.id] || 'present' });
        onTakeAttendance(course.id, record);
        setSelectedSessionDate(timestamp);
        setShowSaveSuccess(true);
        setTimeout(() => setShowSaveSuccess(false), 3000);
    };

    const toggleAttendance = (studentId: string) => {
        if (!canManageAttendance) return;
        setAttendanceStatus(prev => {
            const current = prev[studentId] || 'present';
            const next = current === 'present' ? 'absent' : current === 'absent' ? 'late' : 'present';
            return { ...prev, [studentId]: next };
        });
    };

    const markAllStatus = (status: AttendanceStatus) => {
        if (!canManageAttendance) return;
        const newStatus: Record<string, AttendanceStatus> = {};
        students.forEach(s => {
            newStatus[s.id] = status;
        });
        setAttendanceStatus(newStatus);
    };

    const getExtractedRollNos = () => {
        const present = students.filter(s => (attendanceStatus[s.id] || 'present') === 'present').map(s => s.rollNo).filter(Boolean).join(', ');
        const absent = students.filter(s => (attendanceStatus[s.id] || 'present') === 'absent').map(s => s.rollNo).filter(Boolean).join(', ');
        return { present, absent };
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatMessage.trim()) {
            onSendCourseMessage(course.id, chatMessage.trim());
            setChatMessage('');
        }
    };

    const triggerDownload = (url: string, filename: string) => {
        let downloadUrl = url;
        if (url.includes('cloudinary.com') && !url.includes('fl_attachment')) {
            downloadUrl = url.replace('/upload/', '/upload/fl_attachment/');
        }
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => { if(activeTab === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeTab, course.messages]);

    // CSV Download Logic using Date Range
    const downloadAttendanceRegister = () => {
        if (!course.attendanceRecords?.length) { alert("No attendance records found."); return; }
        
        const fromTs = new Date(exportFromDate).getTime();
        const toTs = new Date(exportToDate).getTime() + 86400000; // end of day

        const recordsInRange = (course.attendanceRecords || [])
            .filter(r => r.date >= fromTs && r.date < toTs)
            .sort((a, b) => a.date - b.date);

        if (recordsInRange.length === 0) {
            alert("No records found in this date range.");
            return;
        }

        const csvHeaders = ['roll no.', 'name', ...recordsInRange.map(r => {
            const d = new Date(r.date);
            const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
            return r.label ? `"${dateStr} - ${r.label}"` : `"${dateStr}"`;
        }), 'percentage'];
        const csvRows = [csvHeaders];

        const sortedStudents = [...students].sort((a, b) => 
            (a.rollNo || '').localeCompare(b.rollNo || '', undefined, { numeric: true })
        );

        sortedStudents.forEach(s => {
            const row: string[] = [s.rollNo || '-', `"${s.name}"`];
            let presentCount = 0;
            let totalSessionsMarked = 0;

            recordsInRange.forEach(record => {
                if (record.records[s.id]) {
                    const status = record.records[s.id].status;
                    const char = status === 'present' ? 'P' : status === 'absent' ? 'A' : 'L';
                    row.push(char);
                    
                    totalSessionsMarked++;
                    if (status === 'present') presentCount++;
                } else {
                    row.push(''); 
                }
            });

            const percentage = totalSessionsMarked > 0 ? Math.round((presentCount / totalSessionsMarked) * 100) : 0;
            row.push(`${percentage}%`);
            csvRows.push(row);
        });

        const csvContent = "\ufeff" + csvRows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${course.subject}_attendance_${exportFromDate}_to_${exportToDate}.csv`;
        link.click();
    };

    // Calculate individual student attendance for this course
    const calculateStudentAttendance = (studentId: string) => {
        let total = 0, present = 0;
        if (course.attendanceRecords) {
            course.attendanceRecords.forEach(r => {
                if (r.records?.[studentId]) {
                    total++;
                    if (r.records[studentId].status === 'present') present++;
                }
            });
        }
        return {
            percentage: total > 0 ? Math.round((present / total) * 100) : 0,
            total,
            present
        };
    };

    // Filtered Students for Members Tab
    const filteredMembers = useMemo(() => {
        return students.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
                                  (s.rollNo || '').toLowerCase().includes(memberSearch.toLowerCase());
            
            if (!matchesSearch) return false;

            const att = calculateStudentAttendance(s.id).percentage;
            
            if (memberFilter === 'Low' && att >= 75) return false;
            if (memberFilter === 'Safe' && att < 75) return false;
            
            return true;
        });
    }, [students, memberSearch, memberFilter, course.attendanceRecords]);

    const tabs = useMemo(() => {
        const t = [
            { id: 'materials', label: 'Materials', icon: FileTextIcon },
            { id: 'assignments', label: 'Tasks', icon: ClipboardListIcon },
            { id: 'attendance', label: 'Attendance', icon: CheckSquareIcon, hide: !isFaculty },
            { id: 'people', label: 'Members', icon: UsersIcon },
            { id: 'chat', label: 'Discussion', icon: MessageIcon }
        ];
        return t.filter(x => !x.hide);
    }, [isFaculty]);

    return (
        <div className="bg-background min-h-screen flex flex-col">
            {!isEmbedded && <Header currentUser={currentUser} onLogout={handleLogout} onNavigate={onNavigate} currentPath={currentPath} />}
            
            <main className={`flex-1 ${!isEmbedded ? 'container mx-auto px-4 py-8 pb-24 lg:pb-8' : ''}`}>
                <div className="max-w-6xl mx-auto">
                    {/* Course Hero */}
                    <div className="bg-gradient-to-br from-indigo-700 via-indigo-900 to-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden mb-8 border border-white/5">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                        
                        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8 items-start md:items-center">
                            <div className="flex-1 min-w-0">
                                <button onClick={handleBackClick} className="flex items-center gap-2 text-xs font-black text-indigo-300 uppercase tracking-widest mb-6 hover:text-white transition-colors group">
                                    <ArrowLeftIcon className="w-4 h-4 transition-transform group-hover:-translate-x-1"/> 
                                    {currentUser.tag === 'Director' ? 'Back to Command Center' : 'Back to Hub'}
                                </button>
                                <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">{course.subject}</h1>
                                <div className="flex flex-wrap gap-4 items-center text-sm font-medium text-indigo-100/80">
                                    <span className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/10"><UsersIcon className="w-4 h-4"/> {students.length} Students</span>
                                    <span className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/10"><BookOpenIcon className="w-4 h-4"/> {course.department}</span>
                                    <span className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/10"><ActivityIcon className="w-4 h-4"/> Year {course.year} - {course.division || 'A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="bg-card border border-border/60 rounded-[2rem] p-2 flex gap-1 mb-8 shadow-sm overflow-x-auto no-scrollbar">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-8 py-3.5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Views */}
                    <div className="min-h-[400px]">
                        {activeTab === 'attendance' && isFaculty && (
                            <div className="animate-fade-in space-y-6">
                                <div className="flex flex-col lg:flex-row gap-6">
                                    <div className="lg:w-80 space-y-6">
                                        <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm">
                                            <h4 className="text-sm font-black text-muted-foreground uppercase tracking-widest mb-4">Register Control</h4>
                                            <div className="space-y-4">
                                                <div className="p-4 bg-muted/50 rounded-2xl border border-border">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Selected Date</label>
                                                    <input type="date" value={attendanceDate} onChange={e => { setAttendanceDate(e.target.value); setSelectedSessionDate(null); }} className="w-full bg-transparent font-black text-foreground focus:outline-none mt-1" />
                                                </div>

                                                <div className="p-4 bg-muted/50 rounded-2xl border border-border">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sessions</label>
                                                        {canManageAttendance && (
                                                            <button 
                                                                onClick={() => { setSelectedSessionDate(0); setSessionLabel(""); setAttendanceStatus(Object.fromEntries(students.map(s => [s.id, 'present']))); }}
                                                                className="text-[10px] font-black text-primary uppercase hover:underline"
                                                            >
                                                                + Add New
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                                        {(course.attendanceRecords || [])
                                                            .filter(r => new Date(r.date).toDateString() === new Date(attendanceDate).toDateString())
                                                            .sort((a,b) => a.date - b.date)
                                                            .map((r, idx) => (
                                                                <button 
                                                                    key={r.date}
                                                                    onClick={() => setSelectedSessionDate(r.date)}
                                                                    className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-all border ${selectedSessionDate === r.date ? 'bg-primary text-white border-primary shadow-md' : 'bg-background text-foreground border-border hover:border-primary/50'}`}
                                                                >
                                                                    {idx + 1}. {r.label || new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </button>
                                                            ))
                                                        }
                                                        {!(course.attendanceRecords || []).some(r => new Date(r.date).toDateString() === new Date(attendanceDate).toDateString()) && selectedSessionDate !== 0 && (
                                                            <p className="text-[10px] text-muted-foreground font-bold italic">No sessions started yet.</p>
                                                        )}
                                                        {selectedSessionDate === 0 && (
                                                            <div className="p-2 rounded-lg text-xs font-black bg-primary/10 text-primary border border-primary/20 animate-pulse">
                                                                New Session (Draft)
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-muted/50 rounded-2xl border border-border">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Session Label</label>
                                                    <input 
                                                        type="text" 
                                                        value={sessionLabel} 
                                                        onChange={e => setSessionLabel(e.target.value)} 
                                                        placeholder="e.g. Lecture 1"
                                                        className="w-full bg-transparent font-bold text-xs text-foreground focus:outline-none mt-1" 
                                                    />
                                                </div>

                                                {/* Export Report Section */}
                                                <div className="pt-4 border-t border-dashed border-border/60">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 block">Export Range</label>
                                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                                        <div className="space-y-1">
                                                            <span className="text-[9px] font-bold text-muted-foreground ml-1">From</span>
                                                            <input type="date" value={exportFromDate} onChange={e => setExportFromDate(e.target.value)} className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-primary" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <span className="text-[9px] font-bold text-muted-foreground ml-1">To</span>
                                                            <input type="date" value={exportToDate} onChange={e => setExportToDate(e.target.value)} className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-primary" />
                                                        </div>
                                                    </div>
                                                  <button onClick={downloadAttendanceRegister} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95">
                                                      <DownloadIcon className="w-4 h-4"/> Export CSV
                                                  </button>
                                                  <button onClick={() => onNavigate(`#/academics/${course.id}/attendance/monthly`)} className="w-full py-3 bg-foreground text-background rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-foreground/20 transition-all flex items-center justify-center gap-2 active:scale-95">
                                                      <CalendarIcon className="w-4 h-4"/> Monthly View
                                                  </button>
                                                  <button onClick={() => setIsExtractModalOpen(true)} className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2 active:scale-95">
                                                      <ClipboardListIcon className="w-4 h-4"/> Extract Roll Nos
                                                  </button>
                                              </div>
                                          </div>
                                        </div>
                                        {/* Permission check for Save button */}
                                        {canManageAttendance && (
                                            <button onClick={handleTakeAttendance} className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${showSaveSuccess ? 'bg-emerald-600 text-white' : 'bg-primary text-white shadow-primary/20 hover:bg-primary/90'}`}>
                                                {showSaveSuccess ? <CheckCircleIcon className="w-6 h-6"/> : <><SaveIcon className="w-5 h-5"/> Save Updates</>}
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-6">
                                        <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden flex flex-col max-h-[700px]">
                                            <div className="p-6 border-b border-border bg-muted/5 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                                                <div>
                                                    <h3 className="font-black text-lg">Student Register</h3>
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Daily Records</p>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-3">
                                                    {/* Bulk Actions - Moved here based on screenshot */}
                                                    {canManageAttendance && (
                                                        <div className="flex items-center gap-2 mr-2">
                                                            <button onClick={() => markAllStatus('present')} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors shadow-sm flex items-center gap-1 active:scale-95">
                                                                <CheckCircleIcon className="w-3.5 h-3.5"/> Present All
                                                            </button>
                                                            <button onClick={() => markAllStatus('absent')} className="px-4 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-colors shadow-sm flex items-center gap-1 active:scale-95">
                                                                <XCircleIcon className="w-3.5 h-3.5"/> Absent All
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div className="flex p-1 bg-muted rounded-2xl border border-border/60 shadow-inner">
                                                        <button 
                                                            onClick={() => setDisplayMode('full')}
                                                            className={`p-2 rounded-xl transition-all ${displayMode === 'full' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                                            title="Show Names"
                                                        >
                                                            <LayoutGridIcon className="w-4 h-4"/>
                                                        </button>
                                                        <button 
                                                            onClick={() => setDisplayMode('compact')}
                                                            className={`p-2 rounded-xl transition-all ${displayMode === 'compact' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                                            title="Roll Numbers Only"
                                                        >
                                                            <ListIcon className="w-4 h-4"/>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                                <div className={`grid ${displayMode === 'compact' ? 'grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 p-4' : 'grid-cols-1 divide-y divide-border/40'}`}>
                                                    {students.map(s => {
                                                        const status = attendanceStatus[s.id] || 'present';
                                                        if (displayMode === 'compact') {
                                                            return (
                                                                <div 
                                                                    key={s.id} 
                                                                    onClick={() => toggleAttendance(s.id)} 
                                                                    className={`p-2 border border-border/40 bg-card rounded-xl hover:bg-muted/30 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer group shadow-sm`}
                                                                >
                                                                    <span className="text-[9px] font-black text-muted-foreground group-hover:text-primary transition-colors uppercase tracking-tight truncate w-full text-center">#{s.rollNo || '-'}</span>
                                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${
                                                                        status === 'present' ? 'bg-emerald-500 text-white shadow-md' : 
                                                                        status === 'absent' ? 'bg-rose-500 text-white shadow-md' : 
                                                                        'bg-amber-500 text-white shadow-md'
                                                                    }`}>
                                                                        {status === 'present' ? 'P' : status === 'absent' ? 'A' : 'L'}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <div key={s.id} onClick={() => toggleAttendance(s.id)} className={`flex items-center justify-between p-4 hover:bg-muted/30 transition-all group cursor-pointer`}>
                                                                <div className="flex items-center gap-4 min-w-0">
                                                                    <span className="w-8 text-[10px] font-mono font-black text-muted-foreground group-hover:text-primary transition-colors">{s.rollNo || '-'}</span>
                                                                    <Avatar src={s.avatarUrl} name={s.name} size="sm" />
                                                                    <p className="font-black text-foreground truncate text-sm">{s.name}</p>
                                                                </div>
                                                                <div className="flex items-center">
                                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black transition-all ${
                                                                        status === 'present' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 
                                                                        status === 'absent' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 
                                                                        'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                                                                    }`}>
                                                                        {status === 'present' ? 'P' : status === 'absent' ? 'A' : 'L'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'materials' && (
                            <div className="animate-fade-in grid gap-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-xl font-black text-foreground">Lecture Materials</h3>
                                    {isOwner && (
                                        <button onClick={() => setIsUploadModalOpen(true)} className="p-2 bg-primary text-white rounded-xl shadow-lg transition-transform active:scale-95"><PlusIcon className="w-6 h-6"/></button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {course.notes?.map(note => (
                                        <div key={note.id} className="bg-card p-5 rounded-[1.5rem] border border-border/60 flex items-center gap-4 hover:shadow-md transition-all group">
                                            <div className="h-14 w-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                                <FileTextIcon className="w-7 h-7"/>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-black text-foreground truncate text-lg leading-tight">{note.title}</h4>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Uploaded {new Date(note.uploadedAt).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => triggerDownload(note.fileUrl, note.title)} className="h-10 w-10 bg-muted hover:bg-primary/10 hover:text-primary rounded-xl flex items-center justify-center transition-colors" title="Download">
                                                    <DownloadIcon className="w-5 h-5"/>
                                                </button>
                                                {isOwner && onDeleteNote && (
                                                    <button onClick={() => { if(window.confirm('Delete this?')) onDeleteNote(course.id, note); }} className="h-10 w-10 bg-muted hover:bg-rose-500/10 hover:text-rose-500 rounded-xl flex items-center justify-center transition-colors" title="Delete">
                                                        <TrashIcon className="w-5 h-5"/>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {(!course.notes || course.notes.length === 0) && (
                                        <div className="col-span-full py-20 bg-muted/10 border-2 border-dashed border-border rounded-[2rem] text-center text-muted-foreground font-bold">
                                            No materials shared yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'assignments' && (
                            <div className="animate-fade-in space-y-6">
                                <div className="flex justify-between items-center px-1">
                                    <h3 className="text-2xl font-black text-foreground">Assignments & Tasks</h3>
                                    {isOwner && (
                                        <button 
                                            onClick={() => setIsAssignmentModalOpen(true)} 
                                            className="bg-primary text-white px-4 py-2 rounded-xl font-black text-sm shadow-lg hover:shadow-primary/25 transition-all active:scale-95 flex items-center gap-2"
                                        >
                                            <PlusIcon className="w-5 h-5"/> New Task
                                        </button>
                                    )}
                                </div>

                                {viewingSubmissionsTaskId ? (
                                    <div className="bg-card rounded-[2.5rem] border border-border shadow-xl overflow-hidden animate-scale-in">
                                        <div className="p-6 border-b border-border bg-muted/5 flex items-center justify-between">
                                            <button 
                                                onClick={() => setViewingSubmissionsTaskId(null)}
                                                className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest hover:underline"
                                            >
                                                <ArrowLeftIcon className="w-4 h-4"/> Back to Tasks
                                            </button>
                                            <h4 className="font-black text-foreground">
                                                {course.assignments?.find(a => a.id === viewingSubmissionsTaskId)?.title}
                                            </h4>
                                            <div className="w-20"></div>
                                        </div>
                                        <div className="p-6 overflow-y-auto max-h-[600px] custom-scrollbar">
                                            <table className="w-full text-left">
                                                <thead className="bg-muted/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">
                                                    <tr>
                                                        <th className="p-4">Student</th>
                                                        <th className="p-4 text-right">Status & Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/40">
                                                    {students.map(s => {
                                                        const assignment = course.assignments?.find(a => a.id === viewingSubmissionsTaskId);
                                                        const submission = assignment?.submissions?.[s.id];
                                                        const isSubmitted = submission?.submitted;
                                                        return (
                                                            <tr key={s.id} className="hover:bg-muted/10 transition-colors">
                                                                <td className="p-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <Avatar src={s.avatarUrl} name={s.name} size="sm" />
                                                                        <div className="min-w-0">
                                                                            <p className="font-bold text-sm text-foreground truncate">{s.name}</p>
                                                                            <p className="text-[10px] text-muted-foreground">Roll: {s.rollNo || '-'}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-right">
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        {submission?.fileUrl && (
                                                                            <button 
                                                                                onClick={() => triggerDownload(submission.fileUrl!, `submission_${s.name}.pdf`)}
                                                                                className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all"
                                                                                title="Download Submission"
                                                                            >
                                                                                <DownloadIcon className="w-4 h-4"/>
                                                                            </button>
                                                                        )}
                                                                        <button 
                                                                            onClick={() => toggleSubmission(viewingSubmissionsTaskId!, s.id)}
                                                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm active:scale-95 flex items-center gap-2 border ${isSubmitted ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-rose-500 hover:text-white hover:border-rose-600' : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-emerald-600 hover:text-white hover:border-emerald-700'}`}
                                                                            title={isSubmitted ? 'Click to mark as missing' : 'Click to mark as received'}
                                                                        >
                                                                            {isSubmitted ? (
                                                                                <><CheckCircleIcon className="w-3.5 h-3.5"/> Submitted</>
                                                                            ) : (
                                                                                <><XCircleIcon className="w-3.5 h-3.5"/> Mark Received</>
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid gap-6">
                                        {course.assignments?.map(assign => {
                                            const submissions = assign.submissions || {};
                                            const totalStudents = students.length;
                                            const submittedCount = Object.values(submissions).filter((s: any) => s.submitted).length;
                                            const submissionPct = totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0;
                                            
                                            const studentSubmission = submissions[currentUser.id];
                                            const isPastDue = new Date(assign.dueDate) < new Date();
                                            const isCompleted = studentSubmission?.submitted;
                                            
                                            return (
                                                <div key={assign.id} className="bg-card p-6 rounded-[2.5rem] border border-border/60 hover:shadow-xl transition-all relative overflow-hidden group flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                    <div className={`absolute top-0 left-0 w-1.5 h-full ${isCompleted ? 'bg-emerald-500' : isPastDue ? 'bg-rose-500' : 'bg-primary'}`}></div>
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-3 mb-3">
                                                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : isPastDue ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-primary/5 text-primary border-primary/20'}`}>
                                                                <ClockIcon className="w-3.5 h-3.5"/> 
                                                                {isCompleted ? 'Completed' : isPastDue ? 'Overdue' : 'Active'}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                                Due: {new Date(assign.dueDate).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-2xl font-black text-foreground leading-tight group-hover:text-primary transition-colors truncate">{assign.title}</h4>
                                                        {assign.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{assign.description}</p>}
                                                        
                                                        {isFaculty && (
                                                            <div className="mt-4 space-y-2 max-w-xs">
                                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                                    <span>Submissions</span>
                                                                    <span>{submittedCount} / {totalStudents} ({submissionPct}%)</span>
                                                                </div>
                                                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden shadow-inner">
                                                                    <div 
                                                                        className="h-full bg-primary transition-all duration-1000 rounded-full" 
                                                                        style={{ width: `${submissionPct}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
                                                        {assign.fileUrl && (
                                                            <button 
                                                                onClick={() => triggerDownload(assign.fileUrl!, assign.title)} 
                                                                className="h-12 px-6 bg-muted hover:bg-muted/80 text-foreground rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 border border-border" 
                                                                title="Download Guidelines"
                                                            >
                                                                <FileTextIcon className="w-4 h-4"/> Guidelines
                                                            </button>
                                                        )}
                                                        
                                                        {isOwner ? (
                                                            <div className="flex items-center gap-2">
                                                                <button 
                                                                    onClick={() => setViewingSubmissionsTaskId(assign.id)}
                                                                    className="h-12 px-6 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
                                                                >
                                                                    <EyeIcon className="w-4 h-4"/> Track Submissions
                                                                </button>
                                                                {onDeleteAssignment && (
                                                                    <button 
                                                                        onClick={() => { if(window.confirm('Delete task?')) onDeleteAssignment(course.id, assign); }} 
                                                                        className="h-12 w-12 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-2xl flex items-center justify-center transition-all"
                                                                    >
                                                                        <TrashIcon className="w-5 h-5"/>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : !isFaculty && (
                                                            isCompleted ? (
                                                                <div className="h-12 px-6 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 border border-emerald-100">
                                                                    <CheckCircleIcon className="w-4 h-4"/> Handed In
                                                                </div>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => setSubmittingTaskId(assign.id)} 
                                                                    disabled={isPastDue}
                                                                    className="h-12 px-8 bg-foreground text-background rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:grayscale"
                                                                >
                                                                    <UploadIcon className="w-4 h-4"/> Submit Task
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {(!course.assignments || course.assignments.length === 0) && (
                                            <div className="col-span-full py-24 bg-muted/10 border-2 border-dashed border-border rounded-[3rem] text-center flex flex-col items-center justify-center gap-4">
                                                <ClipboardListIcon className="w-12 h-12 text-muted-foreground opacity-20"/>
                                                <p className="text-muted-foreground font-black uppercase tracking-widest">No active assignments assigned</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {activeTab === 'people' && (
                             <div className="animate-fade-in space-y-6">
                                {/* Search and Filter Toolbar */}
                                <div className="bg-card p-4 rounded-2xl border border-border shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
                                    <div className="relative flex-1 w-full">
                                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input 
                                            type="text" 
                                            value={memberSearch}
                                            onChange={(e) => setMemberSearch(e.target.value)}
                                            placeholder="Search by name or roll number..."
                                            className="w-full bg-muted/30 border-none rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <span className="text-[10px] font-black uppercase text-muted-foreground whitespace-nowrap">Attendance:</span>
                                        <select 
                                            value={memberFilter} 
                                            onChange={(e: any) => setMemberFilter(e.target.value)} 
                                            className="bg-muted/30 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none cursor-pointer border-none"
                                        >
                                            <option value="All">All Students</option>
                                            <option value="Low">At Risk (&lt;75%)</option>
                                            <option value="Safe">Safe (&ge;75%)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {filteredMembers.length > 0 ? (
                                        filteredMembers.map(s => {
                                            const attStats = calculateStudentAttendance(s.id);
                                            const pct = attStats.percentage;
                                            return (
                                                <div key={s.id} onClick={() => onNavigate(`#/profile/${s.id}`)} className="bg-card p-4 rounded-3xl border border-border/60 hover:shadow-md transition-all flex flex-col items-center text-center group cursor-pointer relative overflow-hidden">
                                                    {isFaculty && (
                                                        <div className={`absolute top-3 right-3 px-2 py-0.5 rounded text-[9px] font-black border ${pct < 75 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                            {pct}%
                                                        </div>
                                                    )}
                                                    
                                                    <Avatar src={s.avatarUrl} name={s.name} size="xl" className="w-16 h-16 mb-3 group-hover:scale-110 transition-transform shadow-md" />
                                                    <h5 className="font-black text-foreground truncate w-full text-sm">{s.name}</h5>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Roll No: {s.rollNo || 'N/A'}</p>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-full py-12 text-center text-muted-foreground text-sm font-medium">
                                            No students found matching your filters.
                                        </div>
                                    )}
                                </div>
                             </div>
                        )}

                        {activeTab === 'chat' && (
                             <div className="bg-card border border-border/60 rounded-[2.5rem] shadow-sm h-[600px] flex flex-col overflow-hidden animate-fade-in">
                                <div className="p-6 border-b border-border bg-muted/5 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><MessageIcon className="w-5 h-5"/></div>
                                    <h3 className="font-black text-lg">Course Feed</h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-slate-900/50 custom-scrollbar">
                                    {(course.messages || []).map((msg, i) => {
                                        const isMe = msg.senderId === currentUser.id;
                                        const sender = allUsers.find(u => u.id === msg.senderId);
                                        return (
                                            <div key={msg.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                <Avatar src={sender?.avatarUrl} name={sender?.name || '?'} size="sm" className="flex-shrink-0" />
                                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                                                    <span className="text-[10px] font-black text-muted-foreground mb-1 uppercase tracking-tighter">{sender?.name}</span>
                                                    <div className={`px-5 py-3 rounded-3xl text-sm font-medium shadow-sm ${isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-card text-foreground border border-border rounded-tl-none'}`}>
                                                        {msg.text}
                                                    </div>
                                                    <span className="text-[9px] text-muted-foreground mt-1 font-bold">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <div ref={chatEndRef} />
                                </div>
                                <div className="p-4 bg-card border-t border-border">
                                    <form onSubmit={handleSendMessage} className="flex gap-2">
                                        <input 
                                            value={chatMessage}
                                            onChange={e => setChatMessage(e.target.value)}
                                            placeholder="Share with the class..."
                                            className="flex-1 bg-muted/50 px-6 py-4 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
                                        />
                                        <button disabled={!chatMessage.trim()} className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/25 disabled:opacity-50 active:scale-95 transition-transform">
                                            <SendIcon className="w-5 h-5"/>
                                        </button>
                                    </form>
                                </div>
                             </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Modals */}
            <UploadMaterialModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onUpload={(n:any) => onAddNote(course.id, n)} courseId={course.id} />
            <CreateAssignmentModal isOpen={isAssignmentModalOpen} onClose={() => setIsAssignmentModalOpen(false)} onCreate={(a:any) => onAddAssignment(course.id, a)} />
            <AddStudentToCourseModal isOpen={isAddStudentModalOpen} onClose={() => setIsAddStudentModalOpen(false)} onAddStudents={(ids:any) => onAddStudentsToCourse(course.id, ids)} availableStudents={allUsers.filter(u => u.tag === 'Student' && !course.students?.includes(u.id))} />
            {submittingTaskId && (
                <UploadMaterialModal 
                    isOpen={!!submittingTaskId} 
                    onClose={() => setSubmittingTaskId(null)} 
                    onUpload={handleUploadSubmission} 
                    courseId={course.id} 
                />
            )}

            {isExtractModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-card border border-border rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl space-y-6 relative">
                        <button onClick={() => setIsExtractModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-muted rounded-full transition-colors">
                            <XCircleIcon className="w-6 h-6 text-muted-foreground"/>
                        </button>
                        <div>
                            <h2 className="text-2xl font-black text-foreground">Extract Roll Numbers</h2>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Copy roll numbers for this session</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Present Students</label>
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(getExtractedRollNos().present); alert("Copied Present Roll Nos!"); }}
                                        className="text-[10px] font-black uppercase text-primary hover:underline flex items-center gap-1"
                                    >
                                        <SaveIcon className="w-3 h-3"/> Copy
                                    </button>
                                </div>
                                <textarea
                                    readOnly
                                    value={getExtractedRollNos().present}
                                    className="w-full h-40 bg-muted/30 border border-border rounded-2xl p-4 text-sm font-mono focus:outline-none resize-none custom-scrollbar"
                                    placeholder="No roll numbers found..."
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black uppercase text-rose-600 tracking-widest">Absent Students</label>
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(getExtractedRollNos().absent); alert("Copied Absent Roll Nos!"); }}
                                        className="text-[10px] font-black uppercase text-primary hover:underline flex items-center gap-1"
                                    >
                                        <SaveIcon className="w-3 h-3"/> Copy
                                    </button>
                                </div>
                                <textarea
                                    readOnly
                                    value={getExtractedRollNos().absent}
                                    className="w-full h-40 bg-muted/30 border border-border rounded-2xl p-4 text-sm font-mono focus:outline-none resize-none custom-scrollbar"
                                    placeholder="No roll numbers found..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button onClick={() => setIsExtractModalOpen(false)} className="px-8 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95">
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!isEmbedded && <BottomNavBar currentUser={currentUser} onNavigate={onNavigate} currentPage={currentPath}/>}
        </div>
    );
};

export default CourseDetailPage;
