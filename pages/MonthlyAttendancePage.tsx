import React, { useMemo, useState } from 'react';
import type { User, Course, AttendanceStatus, AttendanceRecord } from '../types';
import Header from '../components/Header';
import BottomNavBar from '../components/BottomNavBar';
import Avatar from '../components/Avatar';
import { ArrowLeftIcon, CalendarIcon, DownloadIcon, UsersIcon, SearchIcon, SaveIcon, EditIcon } from '../components/Icons';
import { auth } from '../api';
import { db } from '../api';

// Helper to get YYYY-MM-DD in local time
const getLocalISOString = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().split('T')[0];
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthlyAttendancePageProps {
    course: Course;
    currentUser: User;
    students: { id: string; name: string; avatarUrl?: string; rollNo?: string; email: string }[];
    onNavigate: (path: string) => void;
    currentPath: string;
}

const MonthlyAttendancePage: React.FC<MonthlyAttendancePageProps> = ({
    course,
    currentUser,
    students,
    onNavigate,
    currentPath
}) => {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [searchQuery, setSearchQuery] = useState('');
    const [attendanceFilter, setAttendanceFilter] = useState<'All' | 'Low' | 'Safe'>('All');
    const [editMode, setEditMode] = useState(false);
    const [editedRecords, setEditedRecords] = useState<Record<number, Record<string, AttendanceStatus | null>>>({});

    const isFaculty = currentUser.tag === 'Teacher' || currentUser.tag === 'HOD/Dean' || currentUser.tag === 'Director' || currentUser.tag === 'Super Admin';
    const isOwner = (
        course.facultyId === currentUser.id || 
        (course.facultyIds && course.facultyIds.includes(currentUser.id)) ||
        (currentUser.tag === 'HOD/Dean' && currentUser.department === course.department) || 
        (currentUser.tag === 'Director' && currentUser.collegeId === course.collegeId) ||
        (currentUser.tag === 'Super Admin')
    );
    const canView = isFaculty && isOwner;
    const canManageAttendance = canView;

    const yearOptions = useMemo(() => {
        const current = new Date().getFullYear();
        return [current - 2, current - 1, current, current + 1];
    }, []);

    const daysInMonth = useMemo(() => {
        if (!year || !month) return [];
        const count = new Date(year, month, 0).getDate();
        return Array.from({ length: count }, (_, idx) => {
            const date = new Date(year, month - 1, idx + 1);
            return {
                iso: getLocalISOString(date),
                label: String(date.getDate()),
                weekday: date.toLocaleDateString('en-US', { weekday: 'short' })
            };
        });
    }, [year, month]);

    const attendanceByDate = useMemo(() => {
        const map: Record<string, AttendanceRecord[]> = {};
        
        // 1. Start with existing records
        (course.attendanceRecords || []).forEach(record => {
            const iso = getLocalISOString(new Date(record.date));
            if (!map[iso]) map[iso] = [];
            map[iso].push(record);
        });

        // 2. Add "virtual" records for timestamps in editedRecords that aren't in existing
        const existingTimestamps = new Set((course.attendanceRecords || []).map(r => r.date));
        Object.keys(editedRecords).forEach(tsStr => {
            const ts = Number(tsStr);
            if (!existingTimestamps.has(ts)) {
                const iso = getLocalISOString(new Date(ts));
                if (!map[iso]) map[iso] = [];
                map[iso].push({ date: ts, records: {} });
            }
        });

        // Sort sessions by time within each day
        Object.keys(map).forEach(iso => map[iso].sort((a,b) => a.date - b.date));
        return map;
    }, [course.attendanceRecords, editedRecords]);

    const getStatusForCell = (dateIso: string, studentId: string): { status?: AttendanceStatus, sessionDate: number }[] => {
        const records = attendanceByDate[dateIso] || [];
        return records.map(r => {
            if (Object.prototype.hasOwnProperty.call(editedRecords[r.date] || {}, studentId)) {
                return { status: editedRecords[r.date][studentId] || undefined, sessionDate: r.date };
            }
            return { status: r.records?.[studentId]?.status as AttendanceStatus | undefined, sessionDate: r.date };
        });
    };

    const toggleStatus = (sessionDate: number, studentId: string, fallbackDateIso?: string) => {
        if (!canManageAttendance || !editMode) return;
        
        let effectiveSessionDate = sessionDate;
        if (!effectiveSessionDate && fallbackDateIso) {
            const [y, m, d] = fallbackDateIso.split('-').map(Number);
            effectiveSessionDate = new Date(y, m - 1, d).getTime();
        }

        const record = (course.attendanceRecords || []).find(r => r.date === effectiveSessionDate);
        const current = Object.prototype.hasOwnProperty.call(editedRecords[effectiveSessionDate] || {}, studentId) 
            ? editedRecords[effectiveSessionDate][studentId] 
            : record?.records?.[studentId]?.status;

        const next: AttendanceStatus | null = current === undefined || current === null
            ? 'present'
            : current === 'present'
            ? 'absent'
            : current === 'absent'
            ? 'late'
            : null; // allow unmark

        setEditedRecords(prev => ({
            ...prev,
            [effectiveSessionDate]: {
                ...(prev[effectiveSessionDate] || {}),
                [studentId]: next
            }
        }));
    };

    const getStudentMonthStats = (studentId: string) => {
        let total = 0;
        let present = 0;
        let absent = 0;
        let late = 0;

        // Collect all relevant session dates (existing + newly edited placeholders)
        const editedSessionDates = Object.keys(editedRecords).map(Number);
        
        daysInMonth.forEach(d => {
            const existingRecords = attendanceByDate[d.iso] || [];
            const dayStart = new Date(d.iso).getTime();
            
            // Check existing sessions
            existingRecords.forEach(record => {
                const status = Object.prototype.hasOwnProperty.call(editedRecords[record.date] || {}, studentId)
                    ? editedRecords[record.date][studentId]
                    : record.records?.[studentId]?.status;

                if (status) {
                    total += 1;
                    if (status === 'present') present += 1;
                    if (status === 'absent') absent += 1;
                    if (status === 'late') late += 1;
                }
            });

            // Check if there's a new placeholder session created from the monthly view
            if (existingRecords.length === 0) {
                const status = editedRecords[dayStart]?.[studentId];
                if (status) {
                    total += 1;
                    if (status === 'present') present += 1;
                    if (status === 'absent') absent += 1;
                    if (status === 'late') late += 1;
                }
            }
        });
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
        return { total, present, absent, late, percentage };
    };

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (s.rollNo || '').toLowerCase().includes(searchQuery.toLowerCase());
            if (!matchesSearch) return false;

            const pct = getStudentMonthStats(s.id).percentage;
            if (attendanceFilter === 'Low' && pct >= 75) return false;
            if (attendanceFilter === 'Safe' && pct < 75) return false;
            return true;
        });
    }, [students, searchQuery, attendanceFilter, daysInMonth, attendanceByDate]);

    const monthStats = useMemo(() => {
        let totalPresent = 0;
        let totalRecords = 0;
        let totalMarkedSessions = 0;
        daysInMonth.forEach(d => {
            const records = attendanceByDate[d.iso] || [];
            records.forEach(record => {
                totalMarkedSessions += 1;
                Object.values(record.records || {}).forEach((entry: any) => {
                    totalRecords += 1;
                    if (entry.status === 'present') totalPresent += 1;
                });
            });
        });
        const avgAttendance = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;
        return { totalPresent, totalRecords, totalMarkedSessions, avgAttendance };
    }, [daysInMonth, attendanceByDate]);

    const downloadMonthlyCsv = () => {
        if (!daysInMonth.length) return;
        
        // Generate headers with date and label if multiple sessions exist
        const sessionHeaders: string[] = [];
        daysInMonth.forEach(d => {
            const records = attendanceByDate[d.iso] || [];
            if (records.length === 0) {
                sessionHeaders.push(d.label);
            } else {
                records.forEach((r, idx) => {
                    const label = r.label ? `${d.label} (${r.label})` : records.length > 1 ? `${d.label} (S${idx+1})` : d.label;
                    sessionHeaders.push(label);
                });
            }
        });

        const csvHeaders = ['roll no.', 'name', ...sessionHeaders, 'percentage'];
        const csvRows: string[][] = [csvHeaders];

        const sortedStudents = [...students].sort((a, b) => 
            (a.rollNo || '').localeCompare(b.rollNo || '', undefined, { numeric: true })
        );

        sortedStudents.forEach(s => {
            const row: string[] = [s.rollNo || '-', `"${s.name}"`];
            let presentCount = 0;
            let totalSessionsMarked = 0;

            daysInMonth.forEach(day => {
                const records = attendanceByDate[day.iso] || [];
                if (records.length === 0) {
                    row.push('');
                } else {
                    records.forEach(record => {
                        if (record.records[s.id]) {
                            const status = record.records[s.id].status as AttendanceStatus;
                            const char = status === 'present' ? 'P' : status === 'absent' ? 'A' : 'L';
                            row.push(char);
                            totalSessionsMarked += 1;
                            if (status === 'present') presentCount += 1;
                        } else {
                            row.push('');
                        }
                    });
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
        link.download = `${course.subject}_attendance_${year}-${String(month).padStart(2, '0')}.csv`;
        link.click();
    };

    const handleSaveMonthlyEdits = async () => {
        if (!canManageAttendance) return;
        const existing = course.attendanceRecords || [];
        
        const editedTimestamps = new Set(Object.keys(editedRecords).map(Number));

        // 1. Update existing records with edits
        const updatedExisting = existing.map(record => {
            const edits = editedRecords[record.date];
            if (!edits) return record;

            const mergedRecords: Record<string, { status: AttendanceStatus; note?: string }> = { ...record.records };
            Object.entries(edits).forEach(([sid, status]) => {
                if (!status) {
                    delete mergedRecords[sid];
                } else {
                    mergedRecords[sid] = { ...mergedRecords[sid], status };
                }
            });
            return {
                ...record,
                records: mergedRecords
            };
        });

        // 2. Identify new records (where timestamp in editedRecords doesn't exist in courses.attendanceRecords)
        const existingTimestamps = new Set(existing.map(r => r.date));
        const newRecords: AttendanceRecord[] = [];
        Object.entries(editedRecords).forEach(([tsStr, recordsMap]) => {
            const ts = Number(tsStr);
            if (!existingTimestamps.has(ts)) {
                const mergedRecords: Record<string, { status: AttendanceStatus; note?: string }> = {};
                Object.entries(recordsMap).forEach(([sid, status]) => {
                    if (status) mergedRecords[sid] = { status };
                });
                if (Object.keys(mergedRecords).length > 0) {
                    newRecords.push({
                        date: ts,
                        records: mergedRecords
                    });
                }
            }
        });

        await db.collection('courses').doc(course.id).update({ 
            attendanceRecords: [...updatedExisting, ...newRecords] 
        });
        setEditedRecords({});
        setEditMode(false);
    };

    const handleLogout = async () => { await auth.signOut(); onNavigate('#/'); };

    const renderStatusPill = (status?: AttendanceStatus) => {
        if (!status) return <span className="text-[10px] text-muted-foreground">-</span>;
        if (status === 'present') {
            return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black">P</span>;
        }
        if (status === 'absent') {
            return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black">A</span>;
        }
        return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black">L</span>;
    };

    if (!canView) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Header currentUser={currentUser} onLogout={handleLogout} onNavigate={onNavigate} currentPath={currentPath} />
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="bg-card border border-border rounded-[2rem] p-8 max-w-lg w-full text-center">
                        <h2 className="text-2xl font-black text-foreground">Access Restricted</h2>
                        <p className="text-muted-foreground mt-2">Only course owners can view monthly attendance.</p>
                        <button onClick={() => onNavigate(`#/academics/${course.id}/attendance`)} className="mt-6 px-6 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest">
                            Back to Attendance
                        </button>
                    </div>
                </div>
                <BottomNavBar currentUser={currentUser} onNavigate={onNavigate} currentPage={currentPath} />
            </div>
        );
    }

    return (
        <div className="bg-background min-h-screen flex flex-col">
            <Header currentUser={currentUser} onLogout={handleLogout} onNavigate={onNavigate} currentPath={currentPath} />
            <main className="flex-1 container mx-auto px-4 py-8 pb-24 lg:pb-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <button onClick={() => onNavigate(`#/academics/${course.id}/attendance`)} className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors group">
                        <ArrowLeftIcon className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Back to Attendance
                    </button>

                    <div className="bg-gradient-to-br from-indigo-700 via-indigo-900 to-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden border border-white/5">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                        <div className="relative z-10 flex flex-col md:flex-row gap-6 justify-between">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black tracking-tighter">{course.subject}</h1>
                                <p className="text-indigo-100/80 font-medium mt-2 flex items-center gap-2">
                                    <UsersIcon className="w-4 h-4" />
                                    Year {course.year} - {course.division || 'A'} • {course.department}
                                </p>
                                <p className="text-[10px] font-black uppercase tracking-widest mt-3 text-indigo-200">Monthly Attendance</p>
                            </div>
                            <div className="flex items-center gap-3">
                        <div className="bg-white/10 rounded-2xl px-4 py-3 border border-white/10">
                            <label className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Month</label>
                            <div className="flex items-center gap-2 mt-1">
                                <CalendarIcon className="w-4 h-4 text-indigo-200" />
                                <select
                                    value={month}
                                    onChange={(e) => setMonth(parseInt(e.target.value))}
                                    className="bg-transparent text-white font-black text-sm focus:outline-none"
                                >
                                    {MONTHS.map((m, idx) => (
                                        <option key={m} value={idx + 1} className="text-foreground">
                                            {m}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={year}
                                    onChange={(e) => setYear(parseInt(e.target.value))}
                                    className="bg-transparent text-white font-black text-sm focus:outline-none"
                                >
                                    {yearOptions.map(y => (
                                        <option key={y} value={y} className="text-foreground">
                                            {y}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <button
                            onClick={downloadMonthlyCsv}
                            className="px-4 py-3 bg-white text-indigo-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Export CSV</span>
                            <span className="sm:hidden">CSV</span>
                        </button>
                        {canManageAttendance && !editMode && (
                            <button
                                onClick={() => setEditMode(true)}
                                className="px-4 py-3 bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 hover:bg-indigo-600 transition-all active:scale-95"
                            >
                                <EditIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Edit Month</span>
                                <span className="sm:hidden">Edit</span>
                            </button>
                        )}
                        {canManageAttendance && editMode && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { setEditMode(false); setEditedRecords({}); }}
                                    className="px-4 py-3 bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-slate-600 transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveMonthlyEdits}
                                    className="px-4 py-3 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 hover:bg-emerald-600 transition-all active:scale-95 animate-pulse"
                                >
                                    <SaveIcon className="w-4 h-4" />
                                    Save
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-card border border-border rounded-2xl p-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sessions Marked</p>
                            <p className="text-2xl font-black text-foreground mt-2">{monthStats.totalMarkedSessions}</p>
                        </div>
                        <div className="bg-card border border-border rounded-2xl p-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Records</p>
                            <p className="text-2xl font-black text-foreground mt-2">{monthStats.totalRecords}</p>
                        </div>
                        <div className="bg-card border border-border rounded-2xl p-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Avg Attendance</p>
                            <p className="text-2xl font-black text-foreground mt-2">{monthStats.avgAttendance}%</p>
                        </div>
                        <div className="bg-card border border-border rounded-2xl p-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Students</p>
                            <p className="text-2xl font-black text-foreground mt-2">{students.length}</p>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative w-full md:w-72">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name or roll number..."
                                className="w-full bg-muted/30 border border-border rounded-xl pl-9 pr-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <span className="text-[10px] font-black uppercase text-muted-foreground">Filter</span>
                            <select
                                value={attendanceFilter}
                                onChange={(e) => setAttendanceFilter(e.target.value as any)}
                                className="bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                            >
                                <option value="All">All</option>
                                <option value="Low">At Risk (&lt;75%)</option>
                                <option value="Safe">Safe (&ge;75%)</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-[2rem] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-[1100px] w-full text-left">
                                <thead className="bg-muted/30 border-b border-border">
                                    <tr>
                                        <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-r border-border/70">Student</th>
                                        {daysInMonth.map(day => (
                                            <th key={day.iso} className="p-3 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground border-r border-border/50">
                                                <div>{day.label}</div>
                                                <div className="text-[8px] opacity-70">{day.weekday}</div>
                                            </th>
                                        ))}
                                        <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground border-r border-border/70">P</th>
                                        <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground border-r border-border/70">A</th>
                                        <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground border-r border-border/70">L</th>
                                        <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map(s => {
                                        const stats = getStudentMonthStats(s.id);
                                        return (
                                            <tr key={s.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                                                <td className="p-4 border-r border-border/50">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar src={s.avatarUrl} name={s.name} size="sm" />
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-black text-foreground truncate">{s.name}</p>
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Roll No: {s.rollNo || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                {daysInMonth.map(day => {
                                                    const sessionInfo = getStatusForCell(day.iso, s.id);
                                                    return (
                                                        <td key={`${s.id}-${day.iso}`} className="p-2 text-center border-r border-border/40">
                                                            <div className="flex flex-wrap items-center justify-center gap-1 min-w-[32px]">
                                                                {sessionInfo.length > 0 ? sessionInfo.map((info, idx) => (
                                                                    <button
                                                                        key={idx}
                                                                        onClick={() => toggleStatus(info.sessionDate, s.id)}
                                                                        className={`w-8 h-8 rounded-full flex items-center justify-center ${editMode ? 'hover:bg-muted/40' : ''}`}
                                                                        title={editMode ? 'Click to change status' : undefined}
                                                                    >
                                                                        {renderStatusPill(info.status)}
                                                                    </button>
                                                                )) : (
                                                                    <button
                                                                        onClick={() => toggleStatus(0, s.id, day.iso)}
                                                                        className={`w-8 h-8 rounded-full flex items-center justify-center ${editMode ? 'hover:bg-muted/40' : ''}`}
                                                                        title={editMode ? 'Click to start attendance for this day' : undefined}
                                                                    >
                                                                        {renderStatusPill()}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td className="p-4 text-center text-xs font-black text-foreground border-r border-border/50">{stats.present}</td>
                                                <td className="p-4 text-center text-xs font-black text-foreground border-r border-border/50">{stats.absent}</td>
                                                <td className="p-4 text-center text-xs font-black text-foreground border-r border-border/50">{stats.late}</td>
                                                <td className="p-4 text-center text-xs font-black text-foreground">{stats.percentage}%</td>
                                            </tr>
                                        );
                                    })}
                                    {filteredStudents.length === 0 && (
                                        <tr>
                                            <td colSpan={daysInMonth.length + 5} className="p-10 text-center text-muted-foreground font-bold">
                                                No students found for this month.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {canManageAttendance && editMode && (
                        <div className="flex justify-end pt-6 pb-12">
                            <button
                                onClick={handleSaveMonthlyEdits}
                                className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
                            >
                                <SaveIcon className="w-5 h-5" />
                                Save Monthly Updates
                            </button>
                        </div>
                    )}
                </div>
            </main>
            <BottomNavBar currentUser={currentUser} onNavigate={onNavigate} currentPage={currentPath} />
        </div>
    );
};

export default MonthlyAttendancePage;
