
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Post, Group, ReactionType, Course, Notice, UserTag, College, TimeSlot } from '../types';
import Header from '../components/Header';
import BottomNavBar from '../components/BottomNavBar';
import Avatar from '../components/Avatar';
import CreateSingleUserModal from '../components/CreateSingleUserModal';
import AddStudentsCsvModal from '../components/AddStudentsCsvModal';
import AddTeachersCsvModal from '../components/AddTeachersCsvModal';
import { auth, db, uploadToCloudinary, storage, compressImage } from '../api';
import { 
    ChartPieIcon, UsersIcon, BookOpenIcon, MegaphoneIcon, ChartBarIcon,
    PlusIcon, SearchIcon, TrashIcon, CheckCircleIcon, AlertTriangleIcon, 
    MenuIcon, CloseIcon, ChevronRightIcon, 
    ChevronDownIcon, FileTextIcon, UserPlusIcon, EditIcon, 
    CalendarIcon, ActivityIcon, FilterIcon, BuildingIcon, LockIcon, ArrowRightIcon,
    LayoutGridIcon, ArrowLeftIcon, UserIcon, ClockIcon, TrendingUpIcon,
    SettingsIcon, GlobeIcon, PhotoIcon, ShieldIcon, SendIcon, EyeIcon
} from '../components/Icons';
import { TimetableManager } from '../components/AcademicManager';
import HodPage from './HodPage';

interface DirectorPageProps {
    currentUser: User;
    allUsers: User[];       
    onNavigate: (path: string) => void;
    currentPath: string;
    colleges: College[];           
    onUpdateCollegeDepartments: (collegeId: string, departments: string[]) => void;
    onCreateUser: (userData: Omit<User, 'id'>, password?: string) => Promise<void>;
    onApproveHodRequest: (userId: string) => void;
    onDeclineHodRequest: (userId: string) => void;
    onApproveTeacherRequest: (userId: string) => void;
    onDeclineTeacherRequest: (userId: string) => void;
    onToggleFreezeUser: (userId: string) => void;
    onDeleteUser: (userId: string) => void;
    allCourses: Course[];
    onUpdateUserRole: (userId: string, data: { tag: UserTag; department: string }) => void;
    onUpdateUser: (userId: string, data: any) => void;
    onCreateUsersBatch: (usersData: Omit<User, 'id'>[]) => Promise<{ successCount: number; errors: any[] }>;
    onUpdateCourse: (courseId: string, data: any) => void;
    
    // Props required for HodPage masquerade
    onUpdateCollegeClasses: (collegeId: string, department: string, classes: any) => void;
    onUpdateCollege: (collegeId: string, data: any) => void;
    onCreateNotice: (data: any) => void;
    onDeleteNotice: (id: string) => void;
    onCreateCourse: (data: any) => void;
    onDeleteCourse: (id: string) => void;

    // Optional props passed from App.tsx
    allPosts?: Post[];
    allGroups?: Group[];
    usersMap?: { [key: string]: User };
    notices?: Notice[];
    onDeletePost?: (id: string) => void;
    onDeleteComment?: (pid: string, cid: string) => void;
    onDeleteGroup?: (id: string) => void;
    onEditCollegeDepartment?: () => void;
    onDeleteCollegeDepartment?: (collegeId: string, department: string) => void;
    onUpdateCourseFaculty?: (cid: string, fid: string) => void;
    postCardProps?: any;
    onCreateOrOpenConversation: (uid: string) => Promise<string>;
}

// --- Helper Components ---

const SidebarItem = ({ id, label, icon: Icon, onClick, active }: any) => (
    <button 
        onClick={onClick} 
        className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${
            active 
            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
            : 'text-muted-foreground hover:bg-card hover:text-foreground hover:shadow-sm'
        }`}
    >
        {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/20"></div>}
        <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${active ? 'text-white' : 'text-slate-400 group-hover:text-primary'}`} />
        <span className="font-semibold text-sm">{label}</span>
        {active && <ChevronRightIcon className="w-4 h-4 ml-auto opacity-50" />}
    </button>
);

const StatCard = ({ label, value, icon: Icon, colorClass, trend, subValue }: any) => (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border flex items-center justify-between hover:shadow-md transition-all group relative overflow-hidden">
        <div className="relative z-10">
            <p className="text-muted-foreground text-[10px] uppercase font-black tracking-widest">{label}</p>
            <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-black text-foreground tracking-tight">{value}</p>
                {trend && (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-600' : trend === 'neutral' ? 'bg-slate-500/10 text-slate-600' : 'bg-red-500/10 text-red-600'}`}>
                        {trend === 'up' ? '↑' : trend === 'neutral' ? '•' : '↓'}
                    </span>
                )}
            </div>
            {subValue && <p className="text-[10px] font-bold text-muted-foreground mt-1 opacity-70">{subValue}</p>}
        </div>
        <div className={`p-4 rounded-2xl ${colorClass} bg-opacity-10 group-hover:scale-110 transition-transform duration-500`}>
            <Icon className={`w-7 h-7 ${colorClass.replace('bg-', 'text-')}`} />
        </div>
        <div className={`absolute bottom-0 left-0 h-1 w-full ${colorClass} opacity-20`}></div>
    </div>
);

const QuickAction = ({ icon: Icon, label, onClick, color }: any) => (
    <button 
        onClick={onClick}
        className="flex flex-col items-center justify-center p-4 bg-card hover:bg-muted/50 border border-border rounded-2xl shadow-sm hover:shadow-md transition-all group aspect-square sm:aspect-auto sm:h-28"
    >
        <div className={`p-3 rounded-xl ${color} text-white mb-2 shadow-lg group-hover:scale-110 transition-transform`}>
            <Icon className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-black text-foreground uppercase tracking-widest text-center">{label}</span>
    </button>
);

const ImageLightbox = ({ src, onClose }: { src: string | null, onClose: () => void }) => {
    if (!src) return null;
    return (
        <div 
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fade-in" 
            onClick={onClose}
        >
            <button 
                onClick={onClose} 
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-3 bg-black/50 hover:bg-white/10 rounded-full text-white transition-all transform hover:rotate-90 backdrop-blur-md border border-white/10 z-[210]"
            >
                <CloseIcon className="w-6 h-6"/>
            </button>
            <div 
                className="relative w-full max-w-3xl max-h-[85vh] flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                <img 
                    src={src} 
                    alt="Full View" 
                    className="max-w-full max-h-full w-auto h-auto object-contain rounded-2xl shadow-2xl border border-white/10 bg-black/50" 
                />
            </div>
        </div>
    );
};

const ExpandableText = ({ text }: { text: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const shouldTruncate = useMemo(() => {
        return text.length > 200 || text.split('\n').length > 4;
    }, [text]);

    return (
        <div>
            <p className={`text-sm text-muted-foreground whitespace-pre-wrap transition-all ${!isExpanded ? 'line-clamp-4' : ''}`}>
                {text}
            </p>
            {shouldTruncate && (
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} 
                    className="mt-1 text-xs font-black text-primary hover:underline uppercase tracking-wide focus:outline-none"
                >
                    {isExpanded ? 'Show Less' : 'Read More'}
                </button>
            )}
        </div>
    );
};

// --- Create Class Modal ---
const CreateClassModal = ({ isOpen, onClose, onCreate, existingClasses, onDelete, classStats }: any) => {
    const [year, setYear] = useState('');
    const [division, setDivision] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setError('');
            setIsSaving(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsedYear = parseInt(year);
        const normalizedDivision = division.toUpperCase().trim();

        if (year && normalizedDivision && !isNaN(parsedYear)) {
            const alreadyExists = (existingClasses || []).some(
                (cls: any) => cls.year === parsedYear && String(cls.division).toUpperCase() === normalizedDivision
            );

            if (alreadyExists) {
                setError(`Class Year ${parsedYear} - Division ${normalizedDivision} already exists.`);
                return;
            }

            setIsSaving(true);
            setError('');

            try {
                await onCreate({ year: parsedYear, division: normalizedDivision });
                setDivision('');
            } catch (err: any) {
                setError(err?.message || 'Failed to create class.');
            } finally {
                setIsSaving(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-card rounded-[1.5rem] shadow-2xl w-full max-w-md border border-border overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center px-6 py-5 border-b border-border">
                    <h3 className="font-black text-xl text-foreground tracking-tight">Manage Classes</h3>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors"><CloseIcon className="w-5 h-5 text-muted-foreground"/></button>
                </div>

                <div className="overflow-y-auto custom-scrollbar p-6">
                    <form onSubmit={handleSubmit} className="mb-8">
                        <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                            <PlusIcon className="w-4 h-4"/>
                            <span className="text-[11px] font-black uppercase tracking-widest">Add New Class</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-muted/20 p-4 rounded-2xl border border-border/50">
                            <div className="flex gap-4 mb-4">
                                <div className="flex-1 space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Year</label>
                                    <input type="number" value={year} onChange={e => setYear(e.target.value)} className="w-full bg-slate-200/50 dark:bg-black/20 border border-transparent focus:bg-white dark:focus:bg-black focus:border-primary/50 rounded-xl px-4 py-2.5 font-bold text-foreground outline-none transition-all placeholder:text-muted-foreground/50" placeholder="1, 2, FY..." required disabled={isSaving} />
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Div</label>
                                    <input value={division} onChange={e => setDivision(e.target.value.toUpperCase())} className="w-full bg-slate-200/50 dark:bg-black/20 border border-transparent focus:bg-white dark:focus:bg-black focus:border-primary/50 rounded-xl px-4 py-2.5 font-bold text-foreground outline-none transition-all placeholder:text-muted-foreground/50 uppercase" placeholder="A, B..." maxLength={2} required disabled={isSaving} />
                                </div>
                            </div>
                            {error && <p className="mb-3 text-sm font-bold text-red-600">{error}</p>}
                            <button type="submit" disabled={isSaving} className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white py-3 rounded-xl font-bold shadow-lg shadow-purple-500/20 transition-all active:scale-95 text-sm disabled:opacity-60 disabled:cursor-not-allowed">{isSaving ? 'Creating...' : 'Create Class'}</button>
                        </div>
                    </form>

                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2 text-muted-foreground border-t border-border/50 pt-4"><BookOpenIcon className="w-4 h-4"/><span className="text-[11px] font-black uppercase tracking-widest">Existing Classes</span></div>
                        {existingClasses && existingClasses.length > 0 ? (
                            <div className="space-y-2">{existingClasses.sort((a: any, b: any) => a.year - b.year || a.division.localeCompare(b.division)).map((cls: any) => {
                                const statKey = `${cls.year}-${cls.division}`;
                                const stats = classStats?.[statKey] || { count: 0, avg: 0 };
                                
                                return (
                                    <div key={`${cls.year}-${cls.division}`} className="flex items-center justify-between p-3 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 flex items-center justify-center font-black text-sm">{cls.year}</div>
                                            <div>
                                                <p className="font-bold text-foreground text-sm">Year {cls.year} - {cls.division}</p>
                                                <div className="flex gap-3 text-[10px] font-bold text-muted-foreground mt-0.5">
                                                    <span className="flex items-center gap-1"><UsersIcon className="w-3 h-3"/> {stats.count}</span>
                                                    <span className={`flex items-center gap-1 ${stats.avg < 75 ? 'text-amber-500' : 'text-emerald-500'}`}><ActivityIcon className="w-3 h-3"/> {stats.avg}%</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => onDelete(cls.year, cls.division)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all" title="Delete Class"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                );
                            })}</div>
                        ) : (<div className="text-center py-8 text-muted-foreground/50 text-xs font-medium italic">No classes created yet.</div>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

const EditClassModal = ({ isOpen, onClose, initialYear, initialDivision, onSave }: any) => {
    const [year, setYear] = useState(String(initialYear || ''));
    const [division, setDivision] = useState(String(initialDivision || ''));

    useEffect(() => {
        setYear(String(initialYear || ''));
        setDivision(String(initialDivision || ''));
    }, [initialYear, initialDivision]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const parsedYear = parseInt(year);
        if (year && division && !isNaN(parsedYear)) {
            onSave(parsedYear, division.toUpperCase());
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-card rounded-[1.5rem] shadow-2xl w-full max-w-md border border-border overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center px-6 py-5 border-b border-border">
                    <h3 className="font-black text-xl text-foreground tracking-tight">Edit Class</h3>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors"><CloseIcon className="w-5 h-5 text-muted-foreground"/></button>
                </div>
                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-1 space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Year</label>
                                <input type="number" value={year} onChange={e => setYear(e.target.value)} className="w-full bg-slate-200/50 dark:bg-black/20 border border-transparent focus:bg-white dark:focus:bg-black focus:border-primary/50 rounded-xl px-4 py-2.5 font-bold text-foreground outline-none transition-all" required />
                            </div>
                            <div className="flex-1 space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Div</label>
                                <input value={division} onChange={e => setDivision(e.target.value.toUpperCase())} className="w-full bg-slate-200/50 dark:bg-black/20 border border-transparent focus:bg-white dark:focus:bg-black focus:border-primary/50 rounded-xl px-4 py-2.5 font-bold text-foreground outline-none transition-all uppercase" maxLength={2} required />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={onClose} className="px-6 py-3 font-bold text-muted-foreground hover:bg-muted rounded-xl transition-colors">Cancel</button>
                            <button type="submit" className="px-8 py-3 font-black text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 shadow-xl shadow-primary/20 transform active:scale-95 transition-all">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
// --- Create Course Modal ---
const CreateCourseModal = ({ isOpen, onClose, onCreate, activeClasses, defaultClass }: any) => {
    const [subjectName, setSubjectName] = useState('');
    const [selectedClass, setSelectedClass] = useState(defaultClass || '');

    useEffect(() => {
        if(defaultClass) setSelectedClass(defaultClass);
    }, [defaultClass]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (subjectName && selectedClass) {
            const [year, div] = selectedClass.split('-');
            onCreate({ subject: subjectName, year: parseInt(year), division: div });
            setSubjectName('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-card rounded-[2rem] shadow-2xl w-full max-w-sm border border-border overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-border bg-muted/10">
                    <h3 className="font-black text-lg text-foreground uppercase tracking-tight">Add New Subject</h3>
                    <button onClick={onClose}><CloseIcon className="w-5 h-5 text-muted-foreground"/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Subject Name</label>
                        <input value={subjectName} onChange={e => setSubjectName(e.target.value)} className="w-full bg-input border border-border rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Mathematics" required />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Target Class</label>
                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full bg-input border border-border rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-primary" required>
                            <option value="">-- Select Class --</option>
                            {activeClasses.map((cls: any) => (
                                <option key={`${cls.year}-${cls.division}`} value={`${cls.year}-${cls.division}`}>Year {cls.year} - Division {cls.division}</option>
                            ))}
                        </select>
                    </div>
                    <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                        <PlusIcon className="w-5 h-5" /> Add Subject
                    </button>
                </form>
            </div>
        </div>
    );
};

const EditSubjectModal = ({ isOpen, onClose, initialSubject, onSave }: any) => {
    const [subject, setSubject] = useState(initialSubject || '');

    useEffect(() => {
        setSubject(initialSubject || '');
    }, [initialSubject]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (subject.trim()) onSave(subject.trim());
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-card rounded-[2rem] shadow-2xl w-full max-w-sm border border-border overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-border bg-muted/10">
                    <h3 className="font-black text-lg text-foreground uppercase tracking-tight">Edit Subject</h3>
                    <button onClick={onClose}><CloseIcon className="w-5 h-5 text-muted-foreground"/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Subject Name</label>
                        <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-input border border-border rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-primary" required />
                    </div>
                    <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                        <CheckCircleIcon className="w-5 h-5" /> Save Changes
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- Reports Helper Components ---

const ReportStatCard = ({ label, value, subtext, icon: Icon, color }: any) => (
    <div className="bg-card border border-border p-5 rounded-2xl flex items-start justify-between shadow-sm hover:shadow-md transition-all">
        <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">{label}</p>
            <h4 className="text-2xl font-black text-foreground tracking-tight">{value}</h4>
            <p className="text-xs font-bold text-muted-foreground mt-1 opacity-80">{subtext}</p>
        </div>
        <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
            <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
        </div>
    </div>
);

// --- REPORTS VIEW ---
const ReportsView: React.FC<{ courses?: Course[]; departments: string[] }> = ({ courses = [], departments }) => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const [startDate, setStartDate] = useState(sevenDaysAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [filterDept, setFilterDept] = useState('All');
    const [filterYear, setFilterYear] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const stats = useMemo(() => {
        const start = new Date(startDate); start.setHours(0, 0, 0, 0);
        const end = new Date(endDate); end.setHours(23, 59, 59, 999);

        let totalPresent = 0, totalStudents = 0, lowAttendanceClasses = 0;
        const deptStats: { [key: string]: { present: number, total: number } } = {};
        
        departments.forEach(d => deptStats[d] = { present: 0, total: 0 });

        courses.forEach(course => {
            if (filterDept !== 'All' && course.department !== filterDept) return;
            if (filterYear !== 'All' && course.year.toString() !== filterYear) return;
            if (searchQuery && !course.subject.toLowerCase().includes(searchQuery.toLowerCase())) return;

            if (!deptStats[course.department]) {
                deptStats[course.department] = { present: 0, total: 0 };
            }

            const matchingRecords = course.attendanceRecords?.filter(r => {
                const rDate = new Date(r.date);
                return rDate >= start && rDate <= end;
            }) || [];

            if (matchingRecords.length > 0) {
                let coursePresent = 0, courseTotal = 0;
                matchingRecords.forEach(record => {
                    if (record.records) {
                        Object.values(record.records).forEach((status: any) => {
                            courseTotal++;
                            if (status.status === 'present') coursePresent++;
                        });
                    }
                });
                totalPresent += coursePresent;
                totalStudents += courseTotal;
                
                deptStats[course.department].present += coursePresent;
                deptStats[course.department].total += courseTotal;
                
                const coursePercentage = courseTotal > 0 ? Math.round((coursePresent / courseTotal) * 100) : 0;
                if (coursePercentage < 60) lowAttendanceClasses++;
            }
        });

        const deptChartData = Object.entries(deptStats).map(([dept, data]) => ({
            department: dept,
            percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
            totalStudents: data.total
        })).sort((a, b) => b.percentage - a.percentage);

        const overallPercentage = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
        const totalAbsent = totalStudents - totalPresent;

        return { overallPercentage, deptChartData, totalStudents, totalPresent, totalAbsent, lowAttendanceClasses };
    }, [courses, departments, startDate, endDate, filterDept, filterYear, searchQuery]);

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div className="flex flex-col gap-6">
                <div>
                    <h2 className="text-3xl font-black text-foreground tracking-tighter">Usage Intelligence</h2>
                    <p className="text-muted-foreground text-lg mt-1">Analytical breakdown of institutional attendance over time.</p>
                </div>
                <div className="bg-card border border-border p-2 rounded-2xl shadow-sm flex flex-col xl:flex-row gap-2">
                    <div className="flex flex-col sm:flex-row gap-2 bg-muted/30 rounded-xl p-1 flex-shrink-0">
                        <div className="relative group flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">From</span></div>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent hover:bg-muted/50 border border-transparent hover:border-border/50 rounded-lg pl-12 pr-2 py-2 text-sm font-bold text-foreground focus:ring-2 focus:ring-primary focus:bg-background transition-all outline-none w-full cursor-pointer h-full" />
                        </div>
                        <div className="hidden sm:flex items-center text-muted-foreground"><ArrowRightIcon className="w-3 h-3"/></div>
                        <div className="relative group flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">To</span></div>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} className="bg-transparent hover:bg-muted/50 border border-transparent hover:border-border/50 rounded-lg pl-8 pr-2 py-2 text-sm font-bold text-foreground focus:ring-2 focus:ring-primary focus:bg-background transition-all outline-none w-full cursor-pointer h-full" />
                        </div>
                    </div>
                    <div className="h-px xl:h-auto w-full xl:w-px bg-border mx-1"></div>
                    <div className="relative flex-1 min-w-[140px] group">
                        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="w-full bg-muted/30 hover:bg-muted/50 border-0 rounded-xl pl-4 pr-10 py-3 text-sm font-bold text-foreground focus:ring-2 focus:ring-primary focus:bg-background transition-all outline-none appearance-none cursor-pointer">
                            <option value="All">All Departments</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"/>
                    </div>
                    <div className="relative w-full xl:w-32 group">
                        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-full bg-muted/30 hover:bg-muted/50 border-0 rounded-xl pl-4 pr-10 py-3 text-sm font-bold text-foreground focus:ring-2 focus:ring-primary focus:bg-background transition-all outline-none appearance-none cursor-pointer">
                            <option value="All">All Years</option>
                            {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                        </select>
                        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"/>
                    </div>
                    <div className="h-px xl:h-auto w-full xl:w-px bg-border mx-1"></div>
                    <div className="relative flex-[1.5]">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search (filters charts)..." className="w-full bg-muted/30 hover:bg-muted/50 border-0 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-foreground focus:ring-2 focus:ring-primary focus:bg-background transition-all outline-none"/>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
                <ReportStatCard label="Total Present" value={stats.totalPresent.toLocaleString()} subtext="Cumulative attendance count" icon={CheckCircleIcon} color="bg-emerald-500" />
                <ReportStatCard label="Total Absent" value={stats.totalAbsent.toLocaleString()} subtext="Cumulative absence count" icon={AlertTriangleIcon} color="bg-rose-500" />
                <ReportStatCard label="Avg. Attendance" value={`${stats.overallPercentage}%`} subtext="Across selected range" icon={ChartPieIcon} color="bg-blue-500" />
                <ReportStatCard label="Consistent Issues" value={stats.lowAttendanceClasses} subtext="Classes avg < 60% in range" icon={ShieldIcon} color="bg-amber-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
                <div className="bg-card border border-border p-6 rounded-[2rem] shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                    <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest mb-6 z-10">Attendance Health</h3>
                    <div className="relative h-40 w-40 flex items-center justify-center z-10">
                        <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                            <path className="text-muted/30" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                            <path className={`${stats.overallPercentage >= 75 ? 'text-emerald-500' : stats.overallPercentage >= 60 ? 'text-amber-500' : 'text-rose-500'} transition-all duration-1000 ease-out`} strokeDasharray={`${stats.overallPercentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-4xl font-black text-foreground tracking-tight">{stats.overallPercentage}%</span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Range Avg</span>
                        </div>
                    </div>
                    <div className="mt-6 flex gap-4 text-xs font-bold text-muted-foreground">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Good</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div>Avg</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div>Low</div>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-card border border-border p-6 rounded-[2rem] shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest">Department Breakdown</h3>
                        <div className="px-3 py-1 bg-muted/50 rounded-lg text-[10px] font-black text-foreground border border-border">
                            {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                        </div>
                    </div>
                    <DepartmentAttendanceChart data={stats.deptChartData} />
                </div>
            </div>
        </div>
    );
};

const DepartmentAttendanceChart: React.FC<{ data: { department: string; percentage: number; totalStudents?: number }[] }> = ({ data }) => (
    <div className="w-full relative h-64 flex items-end justify-between gap-2 sm:gap-4 px-2">
        {data.length > 0 ? data.map((item, index) => {
            const height = Math.max(item.percentage, 5);
            let colorClass = item.percentage >= 75 ? 'bg-emerald-500' : item.percentage >= 60 ? 'bg-amber-500' : 'bg-rose-500';
            return (
                <div key={index} className="flex-1 flex flex-col items-center h-full justify-end group relative min-w-[30px]">
                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 bg-popover text-popover-foreground text-[10px] font-bold px-3 py-2 rounded-xl shadow-xl border border-border whitespace-nowrap z-20 pointer-events-none flex flex-col items-center">
                        <span className="uppercase tracking-widest text-[9px] opacity-70">{item.department}</span>
                        <span className="text-lg">{item.percentage}%</span>
                        {item.totalStudents !== undefined && <span className="text-[9px] opacity-70">{item.totalStudents} Students</span>}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover"></div>
                    </div>
                    <div className="w-full max-w-[50px] bg-muted/30 rounded-t-lg relative h-full flex items-end overflow-hidden group-hover:bg-muted/50 transition-colors">
                        <div className={`w-full transition-all duration-1000 ease-out rounded-t-lg relative ${colorClass} opacity-90 group-hover:opacity-100`} style={{ height: `${height}%` }}><div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div></div>
                    </div>
                    <div className="mt-3 text-center w-full"><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider truncate px-1" title={item.department}>{item.department.substring(0, 3)}</p></div>
                </div>
            );
        }) : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-bold uppercase tracking-wider opacity-60">No data available</div>}
        <div className="absolute bottom-7 left-0 right-0 h-px bg-border z-0"></div>
    </div>
);

const CreateNoticeModal = ({ isOpen, onClose, onCreateNotice, currentUser, college, courses }: any) => {
    const [title, setTitle] = useState(''); const [message, setMessage] = useState(''); const [audience, setAudience] = useState('All'); const [selectedImage, setSelectedImage] = useState<File | null>(null); const fileInputRef = useRef<HTMLInputElement>(null); const [targetDept, setTargetDept] = useState('All'); const [targetYear, setTargetYear] = useState('All'); const [targetDiv, setTargetDiv] = useState('All'); const [targetCourseId, setTargetCourseId] = useState(''); const [isSending, setIsSending] = useState(false);
    const availableYears = useMemo<number[]>(() => {
        if (targetDept === 'All' || !college?.classes?.[targetDept]) return [1, 2, 3, 4];
        return Object.keys(college.classes[targetDept]).map(y => parseInt(y, 10)).sort((a, b) => a - b);
    }, [college, targetDept]);
    const availableDivs = useMemo<string[]>(() => {
        if (targetDept === 'All' || targetYear === 'All' || !college?.classes?.[targetDept]?.[targetYear]) return ['A', 'B', 'C', 'D'];
        return college.classes[targetDept][targetYear].sort();
    }, [college, targetDept, targetYear]);
    const filteredCourses = useMemo(() => { if (!courses) return []; if (targetDept === 'All') return courses; return courses.filter((c: Course) => c.department === targetDept); }, [courses, targetDept]);
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { setSelectedImage(file); } };
    const handleSend = async (e: React.FormEvent) => { 
        e.preventDefault(); 
        if (!title.trim() || !message.trim()) return; 
        if (audience === 'Course' && !targetCourseId) { alert("Select a course."); return; } 
        setIsSending(true); 
        try { 
            let mediaUrl = null;
            if (selectedImage) {
                const compressed = await compressImage(selectedImage);
                const snapshot = await storage.ref(`notices/${Date.now()}_${selectedImage.name}`).put(compressed as any);
                mediaUrl = await snapshot.ref.getDownloadURL();
            }
            const newNotice = { 
                title, 
                content: message, 
                mediaUrl: mediaUrl,
                targetAudience: audience, 
                targetDept: targetDept === 'All' ? null : targetDept, 
                targetYear: targetYear === 'All' ? null : targetYear, 
                targetDiv: targetDiv === 'All' ? null : targetDiv, 
                targetCourseId: audience === 'Course' ? targetCourseId : null, 
                authorId: currentUser.id, 
                collegeId: currentUser.collegeId, 
                type: 'general', 
                timestamp: new Date().toISOString() 
            }; 
            await onCreateNotice(newNotice); 
            setTitle(''); setMessage(''); setSelectedImage(null); onClose(); 
        } catch (error: any) { alert(`Error sending: ${error.message || 'Unknown error'}`); } finally { setIsSending(false); }
    };
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4 animate-fade-in" onClick={onClose}><div className="bg-card rounded-[2rem] shadow-2xl w-full max-w-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center p-6 border-b border-border bg-muted/10"><div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-xl"><MegaphoneIcon className="w-5 h-5 text-primary"/></div><h3 className="font-black text-xl text-foreground tracking-tight">New Broadcast</h3></div><button onClick={onClose} className="p-2 bg-muted rounded-full hover:bg-muted/80 transition-colors"><CloseIcon className="w-5 h-5 text-muted-foreground"/></button></div><div className="p-6 overflow-y-auto custom-scrollbar flex-1"><form onSubmit={handleSend} className="space-y-6"><div className="bg-muted/20 p-5 rounded-2xl border border-border/50 space-y-4"><div className="space-y-2"><label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Target Audience</label><select value={audience} onChange={e => { setAudience(e.target.value); setTargetDept('All'); setTargetYear('All'); setTargetDiv('All'); setTargetCourseId(''); }} className="w-full bg-input border border-border rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary outline-none"><option value="All">Everyone</option><option value="Student">Specific Class</option><option value="Teacher">Specific Faculty</option><option value="Course">Specific Subject</option><option value="HOD/Dean">HODs & Deans</option></select></div>{(audience === 'Student' || audience === 'Teacher' || audience === 'Course') && (<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in"><div className="space-y-1"><label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Dept</label><select value={targetDept} onChange={e => setTargetDept(e.target.value)} className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none"><option value="All">All Departments</option>{college?.departments?.map((dept: string) => <option key={dept} value={dept}>{dept}</option>)}</select></div>{audience === 'Student' && (<><div className="space-y-1"><label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Year</label><select value={targetYear} onChange={e => setTargetYear(e.target.value)} className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none"><option value="All">All Years</option>{availableYears.map(y => <option key={y} value={y}>Year {y}</option>)}</select></div><div className="space-y-1"><label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Div</label><select value={targetDiv} onChange={e => setTargetDiv(e.target.value)} className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none"><option value="All">All</option>{availableDivs.map(d => <option key={d} value={d}>Div {d}</option>)}</select></div></>)}{audience === 'Course' && (<div className="sm:col-span-2 space-y-1"><label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Subject</label><select value={targetCourseId} onChange={e => setTargetCourseId(e.target.value)} className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none"><option value="">-- Choose Subject --</option>{filteredCourses.map((c: Course) => <option key={c.id} value={c.id}>{c.subject} {targetDept === 'All' ? `(${c.department})` : ''}</option>)}</select></div>)}</div>)}</div><div className="space-y-4"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Subject Title" className="w-full bg-input border border-border rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary outline-none" required /><textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} placeholder="Message body..." className="w-full bg-input border border-border rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary outline-none resize-none" required /><div className="space-y-2"><label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Attachment</label>{!selectedImage ? (<div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-4 flex items-center justify-center cursor-pointer hover:bg-muted/30"><input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" /><p className="text-xs font-bold text-muted-foreground">Upload Image</p></div>) : (<div className="relative h-20 rounded-xl overflow-hidden border border-border"><img src={URL.createObjectURL(selectedImage)} className="w-full h-full object-cover"/><button type="button" onClick={() => setSelectedImage(null)} className="absolute inset-0 bg-black/50 text-white font-bold opacity-0 hover:opacity-100 flex items-center justify-center">Remove</button></div>)}</div></div><div className="flex justify-end pt-4 border-t border-border"><button type="submit" disabled={isSending} className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-primary/90 transition-all">{isSending ? 'Publishing...' : 'Publish'}</button></div></form></div></div></div>
    );
};

const AddDepartmentModal = ({ isOpen, onClose, onAdd }: any) => {
    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setName('');
            setIsSaving(false);
            setError('');
        }
    }, [isOpen]);

    if(!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName || isSaving) return;

        setIsSaving(true);
        setError('');

        try {
            await onAdd(trimmedName);
            setName('');
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to create department.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-card p-8 rounded-[2rem] w-full max-w-sm border border-border shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="font-black text-xl mb-2 text-foreground tracking-tight">Create Department</h3>
                <form onSubmit={handleSubmit}>
                    <input className="w-full p-4 border border-border rounded-xl mb-4 bg-input text-foreground font-medium outline-none" placeholder="e.g. Computer Engineering" value={name} onChange={e=>setName(e.target.value)} autoFocus disabled={isSaving} />
                    {error && <p className="mb-4 text-sm font-bold text-red-600">{error}</p>}
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-sm font-bold text-muted-foreground hover:bg-muted rounded-xl" disabled={isSaving}>Cancel</button>
                        <button type="submit" disabled={isSaving || !name.trim()} className="px-8 py-3 text-sm font-black bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed">{isSaving ? 'Creating...' : 'Create'}</button>
                    </div>
                </form>
            </div>
        </div>
    )
};

const EditUserModal: React.FC<{ isOpen: boolean; onClose: () => void; user: User; onUpdate: (id: string, data: any) => void; activeClasses?: {year: number, division: string}[] }> = ({ isOpen, onClose, user, onUpdate, activeClasses = [] }) => {
    const [name, setName] = useState(user.name); 
    const [email, setEmail] = useState(user.email); 
    const [rollNo, setRollNo] = useState(user.rollNo || ''); 
    const [year, setYear] = useState<number>(user.yearOfStudy || 0); 
    const [division, setDivision] = useState(user.division || ''); 
    const [designation, setDesignation] = useState(user.designation || '');
    const [qualification, setQualification] = useState(user.qualification || '');
    const [tempPassword, setTempPassword] = useState(user.tempPassword || ''); 
    
    if (!isOpen) return null;
    
    const handleSubmit = (e: React.FormEvent) => { 
        e.preventDefault(); 
        const updateData: any = { name, email }; 
        if (user.tag === 'Student') { 
            updateData.rollNo = rollNo; 
            updateData.yearOfStudy = year;
            updateData.division = division; 
        } else if (user.tag === 'Teacher') {
            updateData.designation = designation;
            updateData.qualification = qualification;
        }
        if (!user.isRegistered) { updateData.tempPassword = tempPassword.trim() || null; } 
        onUpdate(user.id, updateData); 
        onClose(); 
    };

    return ( 
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-card rounded-[2rem] shadow-2xl w-full max-w-md border border-border overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-border bg-muted/10">
                    <h3 className="font-black text-lg text-foreground uppercase tracking-tight">Modify User Profile</h3>
                    <button onClick={onClose} className="p-2 bg-muted rounded-full"><CloseIcon className="w-5 h-5 text-muted-foreground"/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Display Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary font-medium" required />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Institutional Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary font-medium" required />
                    </div>
                    {user.tag === 'Student' && (
                        <>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Roll No</label>
                                <input value={rollNo} onChange={e => setRollNo(e.target.value)} className="w-full bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary font-medium" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Year</label>
                                    <select 
                                        value={year || ''} 
                                        onChange={e => { setYear(parseInt(e.target.value) || 0); setDivision(''); }} 
                                        className="w-full bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                                    >
                                        <option value="">Select Year</option>
                                        {Array.from(new Set(activeClasses.map(c => c.year))).sort().map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Division</label>
                                    <select 
                                        value={division} 
                                        onChange={e => setDivision(e.target.value)} 
                                        className="w-full bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                                        disabled={!year}
                                    >
                                        <option value="">Select Div</option>
                                        {activeClasses.filter(c => c.year === year).map(c => (
                                            <option key={c.division} value={c.division}>{c.division}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </>
                    )}
                    {user.tag === 'Teacher' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Designation</label>
                                <input value={designation} onChange={e => setDesignation(e.target.value)} className="w-full bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary font-medium" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Qualification</label>
                                <input value={qualification} onChange={e => setQualification(e.target.value)} className="w-full bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary font-medium" />
                            </div>
                        </div>
                    )}
                    {!user.isRegistered && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Invite Code / Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><LockIcon className="h-4 w-4 text-muted-foreground" /></div>
                                <input type="text" value={tempPassword} onChange={e => setTempPassword(e.target.value)} className="w-full bg-input border border-border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-medium" placeholder="Set invite code" />
                            </div>
                            <p className="text-[10px] text-muted-foreground font-bold mt-2">User is pending registration. This code acts as their initial password.</p>
                        </div>
                    )}
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-sm font-bold text-muted-foreground hover:bg-muted rounded-xl transition-colors">Cancel</button>
                        <button type="submit" className="px-8 py-3 text-sm font-black bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/20">Save Profile</button>
                    </div>
                </form>
            </div>
        </div> 
    );
};

const AssignHodModal: React.FC<{ isOpen: boolean; onClose: () => void; department: string; teachers: User[]; currentHod?: User; onAssign: (teacherId: string) => void; onCreateUser: any; }> = ({ isOpen, onClose, department, teachers = [], currentHod, onAssign, onCreateUser }) => {
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>(''); const [showCreateForm, setShowCreateForm] = useState(false); if (!isOpen) return null; const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (selectedTeacherId) { onAssign(selectedTeacherId); onClose(); } }; if (showCreateForm) { return ( <CreateSingleUserModal isOpen={true} onClose={() => setShowCreateForm(false)} department={department} role="Teacher" onCreateUser={async (userData, password) => { await onCreateUser(userData, password); setShowCreateForm(false); }} /> ); }
    return ( <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex justify-center items-center p-4 animate-fade-in" onClick={onClose}><div className="bg-card rounded-[2.5rem] shadow-2xl w-full max-w-md border border-border overflow-hidden" onClick={e => e.stopPropagation()}><div className="p-6 border-b border-border flex justify-between items-center bg-indigo-600 text-white"><div><h3 className="text-xl font-black tracking-tight">Assign Department Head</h3><p className="text-xs text-indigo-100 font-bold uppercase tracking-widest mt-1">{department}</p></div><button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors"><CloseIcon className="w-5 h-5"/></button></div><form onSubmit={handleSubmit} className="p-8 space-y-6">{currentHod && (<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl mb-4 relative overflow-hidden"><div className="absolute top-0 right-0 w-1 h-full bg-amber-400"></div><p className="text-[10px] font-black text-amber-800 dark:text-amber-200 uppercase tracking-widest mb-2">Current HOD Being Replaced</p><div className="flex items-center gap-3"><Avatar src={currentHod.avatarUrl} name={currentHod.name} size="sm"/><span className="text-sm font-bold text-foreground">{currentHod.name}</span></div></div>)}<div className="space-y-3"><div className="flex justify-between items-center"><label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block ml-1">Select from Faculty</label><button type="button" onClick={() => setShowCreateForm(true)} className="text-[10px] font-black uppercase text-primary tracking-widest hover:underline flex items-center gap-1"><PlusIcon className="w-3 h-3"/> New Faculty</button></div><div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar border border-border rounded-2xl p-2 bg-muted/5">{teachers && teachers.length > 0 ? teachers.map(teacher => ( <label key={teacher.id} className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border ${selectedTeacherId === teacher.id ? 'bg-primary/10 border-primary/40' : 'hover:bg-muted border-transparent'}`}><input type="radio" name="teacher" value={teacher.id} checked={selectedTeacherId === teacher.id} onChange={() => setSelectedTeacherId(teacher.id)} className="text-primary focus:ring-primary w-4 h-4"/><Avatar src={teacher.avatarUrl} name={teacher.name} size="sm" className="ring-2 ring-card"/><div className="flex-1 min-w-0"><p className="text-sm font-bold text-foreground truncate">{teacher.name}</p><p className="text-[10px] text-muted-foreground font-medium truncate uppercase tracking-tighter">{teacher.email}</p></div></label> )) : ( <div className="text-center py-10 opacity-50"><UsersIcon className="w-10 h-10 mx-auto mb-2 text-muted-foreground"/><p className="text-xs font-bold uppercase">No eligible faculty</p></div> )}</div></div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={onClose} className="px-6 py-3 font-bold text-muted-foreground hover:bg-muted rounded-xl transition-colors">Cancel</button><button type="submit" disabled={!selectedTeacherId} className="px-8 py-3 font-black text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 disabled:opacity-50 shadow-xl shadow-primary/20 transform active:scale-95 transition-all">Assign New Head</button></div></form></div></div> );
};

const UserDirectory = ({ 
    users = [], 
    type, 
    onCreateUser, 
    onCreateUsersBatch, 
    department, 
    onDeleteUser, 
    onUpdateUser, 
    activeCourses = [], 
    availableYears,
    existingEmails = [],
    activeClasses = [],
    attendanceMap = {} // NEW PROP
}: { 
    users?: User[], 
    type: 'Student' | 'Teacher', 
    onCreateUser: any, 
    onCreateUsersBatch: any, 
    department: string, 
    onDeleteUser: (id: string) => void; 
    onUpdateUser: (id: string, data: any) => void; 
    activeCourses?: Course[]; 
    availableYears?: number[];
    existingEmails?: string[];
    activeClasses?: { year: number, division: string }[];
    attendanceMap?: Record<string, number>;
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [yearFilter, setYearFilter] = useState('All');
    const [divFilter, setDivFilter] = useState('All');
    const [attFilter, setAttFilter] = useState<'All' | 'Low' | 'Safe'>('All'); // NEW FILTER STATE
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const uniqueYears = useMemo(() => {
        if (type !== 'Student') return [];
        const years = new Set(
            users
                .map(u => u.yearOfStudy)
                .filter((year): year is number => typeof year === 'number')
        );
        return Array.from(years).sort((a, b) => a - b);
    }, [users, type, availableYears]);

    const uniqueDivs = useMemo(() => {
        if (type !== 'Student') return [];
        let relevantUsers = users;
        if (yearFilter !== 'All') {
            relevantUsers = users.filter(u => u.yearOfStudy?.toString() === yearFilter);
        }
        const divs = new Set(relevantUsers.map(u => u.division).filter(Boolean));
        return Array.from(divs).sort();
    }, [users, type, yearFilter]);

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  (u.rollNo && u.rollNo.toLowerCase().includes(searchTerm.toLowerCase()));
            
            if (!matchesSearch) return false;

            if (type === 'Student') {
                if (yearFilter !== 'All' && u.yearOfStudy?.toString() !== yearFilter) return false;
                if (divFilter !== 'All' && u.division !== divFilter) return false;
                
                // Attendance Filter Logic
                const attendance = attendanceMap[u.id] || 0;
                if (attFilter === 'Low' && attendance >= 75) return false;
                if (attFilter === 'Safe' && attendance < 75) return false;
            }
            return true;
        }).sort((a, b) => {
            if (type === 'Student') {
                if ((a.yearOfStudy || 0) !== (b.yearOfStudy || 0)) return (a.yearOfStudy || 0) - (b.yearOfStudy || 0);
                if ((a.division || '') !== (b.division || '')) return (a.division || '').localeCompare(b.division || '');
                if (a.rollNo && b.rollNo) return a.rollNo.localeCompare(b.rollNo, undefined, {numeric: true});
            }
            return a.name.localeCompare(b.name);
        });
    }, [users, searchTerm, yearFilter, divFilter, type, attFilter, attendanceMap]);

    const groupedStudents = useMemo(() => {
        if (type !== 'Student') return null;
        const groups: { [key: string]: User[] } = {};
        filteredUsers.forEach(user => {
            const year = user.yearOfStudy || 'N/A';
            const div = user.division || 'N/A';
            const key = `Year ${year} - Division ${div}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(user);
        });
        const sortedKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        return sortedKeys.map(key => ({ title: key, students: groups[key] }));
    }, [filteredUsers, type]);

    const handleDelete = (userId: string) => {
        if(window.confirm(`Are you sure you want to delete this ${type}?`)) {
            onDeleteUser(userId);
        }
    }

    const UserAvatar = ({ name, src }: any) => {
        const colors = ['bg-purple-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600', 'bg-indigo-600'];
        const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;
        const bgColor = colors[colorIndex];
        if (src) return <img src={src} alt={name} className="w-9 h-9 rounded-full object-cover border border-white/10" />;
        return <div className={`w-9 h-9 rounded-full ${bgColor} flex items-center justify-center text-white text-xs font-bold border border-white/10`}>{name ? name.substring(0, 2).toUpperCase() : '??'}</div>;
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-3xl font-black text-white tracking-tight">{type === 'Student' ? 'Student Directory' : 'Faculty Directory'}</h2>
                    
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => setIsBulkModalOpen(true)} className="flex-1 sm:flex-none bg-card border border-border hover:bg-muted text-foreground px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm">
                            <FileTextIcon className="w-4 h-4"/> Bulk Upload
                        </button>
                        <button onClick={() => setIsSingleModalOpen(true)} className="flex-1 sm:flex-none bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-md">
                            <PlusIcon className="w-4 h-4"/> Add {type}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input 
                            type="text" 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            placeholder={`Search by name, email${type === 'Student' ? ', roll no' : ''}...`} 
                            className="w-full bg-input border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                        />
                    </div>
                    
                    {type === 'Student' && (
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                            {uniqueYears.length > 0 && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-xl border border-border">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-1">Year:</span>
                                    <select 
                                        value={yearFilter}
                                        onChange={(e) => { setYearFilter(e.target.value); setDivFilter('All'); }}
                                        className="bg-transparent text-sm font-bold text-foreground outline-none cursor-pointer"
                                    >
                                        <option value="All">All</option>
                                        {uniqueYears.map((y: any) => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            )}

                            {uniqueDivs.length > 0 && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-xl border border-border">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-1">Div:</span>
                                    <select 
                                        value={divFilter}
                                        onChange={(e) => setDivFilter(e.target.value)}
                                        className="bg-transparent text-sm font-bold text-foreground outline-none cursor-pointer"
                                    >
                                        <option value="All">All</option>
                                        {uniqueDivs.map((d: any) => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            )}

                            {/* NEW: Attendance Filter */}
                            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-xl border border-border">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-1">Status:</span>
                                <select 
                                    value={attFilter}
                                    onChange={(e) => setAttFilter(e.target.value as any)}
                                    className="bg-transparent text-sm font-bold text-foreground outline-none cursor-pointer"
                                >
                                    <option value="All">All</option>
                                    <option value="Low">At Risk (&lt;75%)</option>
                                    <option value="Safe">Safe (&ge;75%)</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {type === 'Student' && groupedStudents ? (
                <div className="space-y-8">
                    {groupedStudents.map((group) => (
                        <div key={group.title} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                            <div className="bg-gradient-to-r from-card to-muted/20 px-6 py-4 border-b border-border flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                        <UsersIcon className="w-5 h-5"/>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-foreground">{group.title}</h3>
                                        <p className="text-xs text-muted-foreground font-medium">{group.students.length} Students Enrolled</p>
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left min-w-[700px]">
                                    <thead className="bg-muted/10 border-b border-border text-muted-foreground font-bold text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="p-4 w-24">Roll No</th>
                                            <th className="p-4">Student Name</th>
                                            <th className="p-4 text-center">Avg. Attd.</th>
                                            <th className="p-4">Email Address</th>
                                            <th className="p-4 text-center">Account Status</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {group.students.map(user => {
                                            const att = attendanceMap[user.id] || 0;
                                            return (
                                                <tr key={user.id} className="hover:bg-muted/20 transition-colors group">
                                                    <td className="p-4 font-mono text-xs text-muted-foreground font-bold">{user.rollNo || '-'}</td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <UserAvatar src={user.avatarUrl} name={user.name} size="sm"/>
                                                            <span className="font-bold text-foreground text-sm">{user.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-2 py-1 rounded text-[10px] font-black border ${att < 75 ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'}`}>
                                                            {att}%
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-muted-foreground text-sm">{user.email}</td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${user.isFrozen ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' : 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'}`}>
                                                            {user.isFrozen ? 'Suspended' : 'Active'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={() => setEditingUser(user)}
                                                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                                                title="Edit User"
                                                            >
                                                                <EditIcon className="w-4 h-4"/>
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDelete(user.id)} 
                                                                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                                title="Delete User"
                                                            >
                                                                <TrashIcon className="w-4 h-4"/>
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
                    ))}
                    {groupedStudents.length === 0 && (
                         <div className="text-center p-16 text-muted-foreground bg-card border border-border rounded-2xl border-dashed">
                            <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                            <p className="font-medium text-lg">No students found.</p>
                            <p className="text-sm mt-1">Try adjusting your search or filters.</p>
                         </div>
                    )}
                </div>
            ) : (
                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left min-w-[700px]">
                            <thead className="bg-muted/30 border-b border-border text-muted-foreground font-bold text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {filteredUsers.length > 0 ? filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-muted/20 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar src={user.avatarUrl} name={user.name} size="sm"/>
                                                <span className="font-bold text-foreground">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-muted-foreground">{user.email}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${user.isFrozen ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' : 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'}`}>
                                                {user.isFrozen ? 'Suspended' : 'Active'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => setEditingUser(user)}
                                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                                    title="Edit User"
                                                >
                                                    <EditIcon className="w-4 h-4"/>
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(user.id)} 
                                                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                    title="Delete User"
                                                >
                                                    <TrashIcon className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={4} className="p-12 text-center text-muted-foreground">No faculty members found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isSingleModalOpen && <CreateSingleUserModal activeClasses={activeClasses} availableYears={uniqueYears} availableDivisions={activeClasses.map(c => c.division)} isOpen={isSingleModalOpen} onClose={() => setIsSingleModalOpen(false)} department={department} role={type} onCreateUser={onCreateUser} existingEmails={existingEmails} />}
            {isBulkModalOpen && type === 'Student' && <AddStudentsCsvModal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} department={department} onCreateUsersBatch={onCreateUsersBatch} existingEmails={existingEmails} />}
            {isBulkModalOpen && type === 'Teacher' && <AddTeachersCsvModal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} department={department} onCreateUsersBatch={onCreateUsersBatch} existingEmails={existingEmails} />}
            {editingUser && <EditUserModal activeClasses={activeClasses} isOpen={!!editingUser} onClose={() => setEditingUser(null)} user={editingUser} onUpdate={onUpdateUser} />}
        </div>
    );
};

// ... [BroadcastManager Component - Unchanged] ...
// ... [CreateNoticeModal Component - Unchanged] ...
const BroadcastManager = ({ notices = [], onCreateNotice, onDeleteNotice, currentUser, college, courses, allUsers }: any) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    // Filter notices specifically for this college
    const collegeNotices = useMemo(() => {
        return notices
            .filter((n: Notice) => n.collegeId === college?.id)
            .sort((a: Notice, b: Notice) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [notices, college]);

    const getAudienceLabel = (notice: Notice) => {
        if (notice.targetAudience === 'All') return 'Everyone';
        if (notice.targetAudience === 'Student') {
            const parts = [];
            if (notice.targetDept) parts.push(notice.targetDept);
            if (notice.targetYear) parts.push(`Yr ${notice.targetYear}`);
            if (notice.targetDiv) parts.push(`Div ${notice.targetDiv}`);
            return parts.length > 0 ? parts.join(' • ') : 'All Students';
        }
        if (notice.targetAudience === 'Course') {
            const course = courses.find((c: Course) => c.id === notice.targetCourseId);
            return course ? `${course.subject} (${course.department})` : 'Specific Subject';
        }
        return notice.targetAudience;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-foreground tracking-tighter">Broadcast Center</h2>
                    <p className="text-muted-foreground text-lg">Manage announcements and push notifications.</p>
                </div>
                <button 
                    onClick={() => setIsCreateModalOpen(true)} 
                    className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-2"
                >
                    <MegaphoneIcon className="w-5 h-5"/> New Broadcast
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collegeNotices.length > 0 ? (
                    collegeNotices.map((notice: Notice) => {
                        const author = allUsers?.find((u: User) => u.id === notice.authorId);
                        
                        return (
                            <div key={notice.id} className="bg-card border border-border rounded-[2rem] p-6 shadow-sm flex flex-col group hover:shadow-md transition-all relative overflow-hidden">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="px-3 py-1 bg-muted rounded-lg border border-border">
                                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                            <UsersIcon className="w-3 h-3"/> {getAudienceLabel(notice)}
                                        </p>
                                    </div>
                                    <div className="text-[10px] font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                                        {new Date(notice.timestamp).toLocaleDateString()}
                                    </div>
                                </div>

                                <h3 className="text-lg font-black text-foreground mb-2 line-clamp-2">{notice.title}</h3>
                                <div className="mb-4">
                                    <ExpandableText text={notice.content} />
                                </div>

                                {(notice.mediaUrl || notice.imageUrl) && (
                                    <div 
                                        onClick={() => setViewingImage(notice.mediaUrl || notice.imageUrl || null)}
                                        className="mt-auto mb-4 h-32 w-full rounded-xl overflow-hidden cursor-pointer relative group/img"
                                    >
                                        <img src={notice.mediaUrl || notice.imageUrl} alt="Attachment" className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                            <EyeIcon className="w-6 h-6 text-white"/>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-auto pt-4 border-t border-border flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Avatar src={author?.avatarUrl} name={author?.name || 'Unknown'} size="xs"/>
                                        <span className="text-xs font-bold text-muted-foreground">
                                            {author?.id === currentUser.id ? 'You' : (author?.name || 'Unknown')}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={(e) => { 
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if(window.confirm("Delete this notice?")) {
                                                onDeleteNotice(notice.id); 
                                            }
                                        }}
                                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                        title="Delete Notice"
                                    >
                                        <TrashIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full py-20 text-center bg-card border border-border border-dashed rounded-[2rem]">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <MegaphoneIcon className="w-8 h-8 text-muted-foreground opacity-50"/>
                        </div>
                        <h3 className="font-bold text-lg text-foreground">No Broadcasts Active</h3>
                        <p className="text-muted-foreground text-sm mt-1">Create an announcement to notify students or faculty.</p>
                    </div>
                )}
            </div>

            <CreateNoticeModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                onCreateNotice={onCreateNotice} 
                currentUser={currentUser} 
                college={college} 
                courses={courses}
            />

            <ImageLightbox src={viewingImage} onClose={() => setViewingImage(null)} />
        </div>
    );
};

// --- Main Director Page ---

const DirectorPage: React.FC<DirectorPageProps> = (props) => {
    const { 
        currentUser, allUsers, onNavigate, currentPath, colleges, onUpdateCollegeDepartments, 
        onCreateUser, onApproveHodRequest, onDeclineHodRequest, onApproveTeacherRequest, 
        onDeclineTeacherRequest, onToggleFreezeUser, onDeleteUser, allCourses, 
        onUpdateUserRole, onUpdateUser, onCreateUsersBatch,
        onUpdateCollegeClasses, onUpdateCollege, onCreateNotice, onDeleteNotice, onCreateCourse, 
        onDeleteCourse, onUpdateCourse, usersMap, notices,
        onCreateOrOpenConversation
    } = props;

    const [activeSection, setActiveSection] = useState<'dashboard' | 'departments' | 'faculty' | 'students' | 'approvals' | 'reports' | 'academics' | 'timetable' | 'settings' | 'broadcast'>('dashboard');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Safety Redirect: Super Admin should not be on Director Page
    useEffect(() => {
        if (currentUser.tag === 'Super Admin') {
            onNavigate('#/superadmin');
            setIsLoading(false);
        }
    }, [currentUser.tag, onNavigate]);

    if (currentUser.tag === 'Super Admin') {
        return <div className="h-screen flex items-center justify-center bg-background text-foreground font-black uppercase tracking-widest animate-pulse">Redirecting to Super Admin Panel...</div>;
    }
    // --- State for Class/Course Creation & Expansion ---
    const [isCreateClassModalOpen, setIsCreateClassModalOpen] = useState(false);
    const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
    const [createCourseDefaultClass, setCreateCourseDefaultClass] = useState<string | null>(null);
    const [expandedClass, setExpandedClass] = useState<string | null>(null);
    const [editClassData, setEditClassData] = useState<{ year: number; division: string } | null>(null);
    const [editSubjectData, setEditSubjectData] = useState<{ id: string; subject: string } | null>(null);

    const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
    const [viewingHodDept, setViewingHodDept] = useState<string | null>(null);
    const [selectedDept, setSelectedDept] = useState('');
    const [deptSearchTerm, setDeptSearchTerm] = useState('');
    const [editCollegeName, setEditCollegeName] = useState('');
    const [isSavingBranding, setIsSavingBranding] = useState(false);
    const [assignHodData, setAssignHodData] = useState<{ department: string, teachers: User[], currentHod?: User } | null>(null);

    // NEW STATE: For Assigning Faculty
    const [courseToAssignFaculty, setCourseToAssignFaculty] = useState<Course | null>(null);
    const [assignSearch, setAssignSearch] = useState(''); // SEARCH STATE

    const handleLogout = async () => { await auth.signOut(); onNavigate('#/'); };
    const college = useMemo(() => {
        const matchedCollege = colleges.find((c: any) => c.id === currentUser.collegeId);
        if (matchedCollege) return matchedCollege;

        const adminMatchedCollege = colleges.find((c: any) => (c.adminUids || []).includes(currentUser.id));
        if (adminMatchedCollege) return adminMatchedCollege;

        const namedCollege = currentUser.requestedCollegeName
            ? colleges.find((c: any) => c.name?.toLowerCase() === currentUser.requestedCollegeName?.toLowerCase())
            : null;
        if (namedCollege) return namedCollege;

        if (!currentUser.collegeId) return null;

        // Keep the Director workspace usable while the college document is still syncing.
        return {
            id: currentUser.collegeId,
            name: currentUser.requestedCollegeName || 'College Workspace',
            adminUids: [],
            departments: [],
            classes: {},
            timetable: {},
            timeSlots: [],
            timeSlotsByClass: {}
        } as College;
    }, [colleges, currentUser.collegeId, currentUser.requestedCollegeName]);

    // Calculate all user emails for duplicate checking
    const allUserEmails = useMemo(() => allUsers.map(u => u.email), [allUsers]);

    useEffect(() => {
        if (college) setEditCollegeName(college.name);
        if (college || (colleges.length > 0 && !college)) { setIsLoading(false); return; }
        const timer = setTimeout(() => setIsLoading(false), 3000); 
        return () => clearTimeout(timer);
    }, [colleges, college]);

    useEffect(() => {
        if (college?.departments?.length && !college.departments.includes(selectedDept)) { setSelectedDept(college.departments[0]); }
        else if (!selectedDept && college?.departments?.[0]) { setSelectedDept(college.departments[0]); }
    }, [college, selectedDept]);

    const hods = useMemo(() => { 
        if (!college) return []; 
        return allUsers.filter((u: any) => (u.tag === 'HOD/Dean' || u.role === 'HOD/Dean') && u.collegeId === college.id);
    }, [allUsers, college]);
    
    const collegeUsers = useMemo(() => allUsers.filter(u => u.collegeId === college?.id), [allUsers, college]);

    const faculty = useMemo(() => collegeUsers.filter(u =>
        (u.tag === 'Teacher' || u.tag === 'HOD/Dean') 
    ), [collegeUsers]);

    const students = useMemo(() => collegeUsers.filter(u =>
        u.tag === 'Student' 
    ).sort((a, b) => (a.rollNo || '').localeCompare(b.rollNo || '', undefined, { numeric: true })), [collegeUsers]);

    const pendingApprovals = useMemo(() => { if (!college) return []; return allUsers.filter((u: any) => u.collegeId === college.id && !u.isApproved && u.isRegistered); }, [allUsers, college]);

    const collegeCourses = useMemo(() => allCourses.filter((c: any) => c.collegeId === college?.id), [allCourses, college?.id]);
    const deptCourses = useMemo(() => collegeCourses.filter((c: any) => c.department === selectedDept), [collegeCourses, selectedDept]);
    
    const deptStudents = useMemo(() => {
        if (!selectedDept) return students;
        return students.filter(u => u.department === selectedDept);
    }, [students, selectedDept]);

    const deptFaculty = useMemo(() => {
        if (!selectedDept) return faculty;
        return faculty.filter(u => u.department === selectedDept);
    }, [faculty, selectedDept]);

    // NEW: Calculate Attendance Percentage for each student
    const studentAttendanceMap = useMemo(() => {
        const stats: Record<string, { present: number, total: number }> = {};
        
        // Initialize for all students
        deptStudents.forEach(s => {
            stats[s.id] = { present: 0, total: 0 };
        });

        // Iterate through all courses in the department (or college if no dept selected)
        const relevantCourses = selectedDept ? deptCourses : collegeCourses;

        relevantCourses.forEach(course => {
            if (course.attendanceRecords) {
                course.attendanceRecords.forEach(record => {
                    if (record.records) {
                        Object.entries(record.records).forEach(([studentId, statusObj]: [string, any]) => {
                            if (stats[studentId]) {
                                stats[studentId].total++;
                                if (statusObj.status === 'present') {
                                    stats[studentId].present++;
                                }
                            }
                        });
                    }
                });
            }
        });

        const percentageMap: Record<string, number> = {};
        Object.keys(stats).forEach(id => {
            const s = stats[id];
            percentageMap[id] = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
        });

        return percentageMap;
    }, [deptStudents, deptCourses, collegeCourses, selectedDept]);

    // For Academics/Timetable: Allow selecting HODs/Teachers from ANY department
    // REMOVED ISAPPROVED CHECK
    const allAcademicStaff = useMemo(() => {
        if (!college) return [];
        return allUsers.filter((u: any) => 
            u.collegeId === college.id && 
            (
                u.tag === 'Teacher' || 
                u.tag === 'HOD/Dean' || 
                u.tag === 'Director'
            )
        );
    }, [allUsers, college]);

    // Filter logic for Assign Faculty Search (Director)
    const filteredAcademicStaffForAssignment = useMemo(() => {
        if (!assignSearch.trim()) return allAcademicStaff;
        const lowerSearch = assignSearch.toLowerCase();
        return allAcademicStaff.filter(f => 
            f.name.toLowerCase().includes(lowerSearch) || 
            f.email.toLowerCase().includes(lowerSearch) || 
            (f.department && f.department.toLowerCase().includes(lowerSearch))
        );
    }, [allAcademicStaff, assignSearch]);

    const stats = useMemo(() => {
        let globalPresent = 0, globalTotal = 0, todayPresent = 0, todayTotal = 0;
        const todayStr = new Date().toDateString();
        collegeCourses.forEach(course => {
            course.attendanceRecords?.forEach(record => {
                const isToday = new Date(record.date).toDateString() === todayStr;
                Object.values(record.records).forEach((statusObj: any) => {
                    globalTotal++; if (statusObj.status === 'present') globalPresent++;
                    if (isToday) { todayTotal++; if (statusObj.status === 'present') todayPresent++; }
                });
            });
        });
        return {
            deptCount: college?.departments?.length || 0, hodCount: hods.length, facultyCount: faculty.length, studentCount: students.length, pendingApprovals: pendingApprovals.length,
            avgAttendance: globalTotal > 0 ? Math.round((globalPresent / globalTotal) * 100) : 0,
            todayAttendance: todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : 0, hasTodayData: todayTotal > 0
        };
    }, [college, hods, faculty, students, pendingApprovals, collegeCourses]);

    const deptAttendanceData = useMemo(() => {
        if (!college?.departments) return [];
        return college.departments.map((dept: string) => {
            const courses = collegeCourses.filter((c: any) => c.department === dept);
            let present = 0, total = 0;
            courses.forEach((c: any) => { c.attendanceRecords?.forEach((r: any) => { Object.values(r.records).forEach((status: any) => { total++; if (status.status === 'present') present++; }); }); });
            return { department: dept, percentage: total > 0 ? Math.round((present / total) * 100) : 0, totalStudents: total };
        }).sort((a: any, b: any) => b.percentage - a.percentage);
    }, [college, collegeCourses]);

    const activeClassesForDept = useMemo(() => {
        const deptClassesRaw = college?.classes?.[selectedDept] || {};
        const classes: { year: number; division: string }[] = [];
        Object.entries(deptClassesRaw).forEach(([year, divs]) => { (divs as string[]).forEach(div => classes.push({ year: parseInt(year), division: div })); });
        return classes;
    }, [college, selectedDept]);

    const activeYearsForDept = useMemo(() => {
        return Array.from(new Set(activeClassesForDept.map(c => c.year))).sort();
    }, [activeClassesForDept]);

    // --- Calculate Stats for Class Boxes (Count & Avg) ---
    const classStats = useMemo(() => {
        const data: Record<string, { count: number, avg: number }> = {};
        activeClassesForDept.forEach(cls => {
            const key = `${cls.year}-${cls.division}`;
            const cnt = deptStudents.filter(s => s.yearOfStudy === cls.year && s.division === cls.division).length;
            
            const courses = deptCourses.filter(c => c.year === cls.year && c.division === cls.division);
            let p = 0, t = 0;
            courses.forEach(c => {
                c.attendanceRecords?.forEach(r => {
                    Object.values(r.records).forEach((s:any) => {
                        t++; if(s.status === 'present') p++;
                    });
                });
            });
            const avg = t > 0 ? Math.round((p/t)*100) : 0;
            data[key] = { count: cnt, avg };
        });
        return data;
    }, [activeClassesForDept, deptStudents, deptCourses]);

    const handleAddDepartment = async (name: string) => {
        if (!college) {
            throw new Error('College workspace is still loading. Please try again.');
        }

        const normalizedName = name.trim();
        if (!normalizedName) {
            throw new Error('Department name is required.');
        }

        const existingDepartment = (college.departments || []).find(
            (department: string) => department.toLowerCase() === normalizedName.toLowerCase()
        );
        if (existingDepartment) {
            setSelectedDept(existingDepartment);
            throw new Error(`Department "${existingDepartment}" already exists.`);
        }

        await onUpdateCollegeDepartments(college.id, [...(college.departments || []), normalizedName]);
        setSelectedDept(normalizedName);
    };
    const handleDeleteDepartment = (deptName: string) => {
        if (!college) return;
        const confirmation = window.prompt(`DANGER ZONE: You are about to delete "${deptName}".\n\nThis action cannot be undone.\n\nType "delete" below to confirm:`);
        if (confirmation === 'delete') {
            const remainingDepartments = (college.departments || []).filter((d: string) => d !== deptName);
            onUpdateCollegeDepartments(college.id, remainingDepartments);
            if (selectedDept === deptName) {
                setSelectedDept(remainingDepartments[0] || '');
            }
        }
        else if (confirmation !== null) { alert("Deletion cancelled. You must type 'delete' exactly to confirm."); }
    };

    const handleUpdateCollegeName = async () => { if (!college || !editCollegeName.trim()) return; setIsSavingBranding(true); await onUpdateCollege(college.id, { name: editCollegeName.trim() }); setIsSavingBranding(false); alert("Branding Updated Successfully"); };
    
    const openAssignHodModal = (department: string) => {
        const teachersInDept = allUsers.filter((u: any) => u.collegeId === college?.id && u.department === department && u.tag === 'Teacher');
        const currentHod = hods.find((h: any) => h.department === department);
        setAssignHodData({ department, teachers: teachersInDept, currentHod });
    };

    const handleAssignHod = async (teacherId: string) => {
        if (!assignHodData) return;
        try {
            if (assignHodData.currentHod && assignHodData.currentHod.id !== teacherId) {
                await onUpdateUserRole(assignHodData.currentHod.id, { tag: 'Teacher', department: assignHodData.department });
            }
            await onUpdateUserRole(teacherId, { tag: 'HOD/Dean', department: assignHodData.department });
            setAssignHodData(null); alert("HOD Assigned Successfully");
        } catch (err) { console.error(err); alert("Failed to assign HOD"); }
    };

    const handleCreateClass = async ({ year, division }: { year: number; division: string }) => {
        if (!college) {
            throw new Error('College workspace is still loading. Please try again.');
        }
        if (!selectedDept) {
            throw new Error('Create or select a department before adding classes.');
        }

        const normalizedDivision = division.toUpperCase().trim();
        const deptClasses = { ...(college.classes?.[selectedDept] || {}) };
        const existingDivisions = (deptClasses[year] || []).map((entry: string) => entry.toUpperCase());

        if (existingDivisions.includes(normalizedDivision)) {
            throw new Error(`Class Year ${year} - Division ${normalizedDivision} already exists.`);
        }

        const updatedClasses = {
            ...deptClasses,
            [year]: [...existingDivisions, normalizedDivision].sort(),
        };

        await onUpdateCollegeClasses(college.id, selectedDept, updatedClasses);
    };

    // --- Delete Class Logic for Director ---
    const handleDeleteClass = async (year: number, division: string) => {
        if (!window.confirm(`Are you sure you want to delete Class Year ${year} - Division ${division} from ${selectedDept}? This will remove all subjects in this class.`)) return;
        if (!college) return;
        
        const updatedClasses = { ...(college.classes?.[selectedDept] || {}) };
        if (updatedClasses[year]) {
            updatedClasses[year] = updatedClasses[year].filter((d: string) => d !== division);
            if (updatedClasses[year].length === 0) {
                delete updatedClasses[year];
            }
            await onUpdateCollegeClasses(college.id, selectedDept, updatedClasses);
        }

        const toDelete = deptCourses.filter(c => c.year === year && (c.division || '').toUpperCase() === division.toUpperCase());
        for (const c of toDelete) {
            await onDeleteCourse(c.id);
        }
    };

    const handleEditClass = async (fromYear: number, fromDiv: string, toYear: number, toDiv: string) => {
        if (!college?.classes?.[selectedDept]) return;
        const updatedClasses = { ...(college.classes?.[selectedDept] || {}) };
        const fromDivUpper = fromDiv.toUpperCase();
        const toDivUpper = toDiv.toUpperCase();

        if (fromYear === toYear && fromDivUpper === toDivUpper) {
            setEditClassData(null);
            return;
        }

        const targetDivs = updatedClasses[toYear] || [];
        if (targetDivs.includes(toDivUpper)) {
            alert(`Class Year ${toYear} - Division ${toDivUpper} already exists.`);
            return;
        }

        if (updatedClasses[fromYear]) {
            updatedClasses[fromYear] = updatedClasses[fromYear].filter((d: string) => d !== fromDivUpper);
            if (updatedClasses[fromYear].length === 0) delete updatedClasses[fromYear];
        }

        updatedClasses[toYear] = [...(updatedClasses[toYear] || []), toDivUpper].sort();
        await onUpdateCollegeClasses(college.id, selectedDept, updatedClasses);

        const affectedCourses = deptCourses.filter(c => c.year === fromYear && (c.division || '').toUpperCase() === fromDivUpper);
        for (const c of affectedCourses) {
            await onUpdateCourse(c.id, { year: toYear, division: toDivUpper });
        }
        setEditClassData(null);
    };

    const handleEditSubject = async (courseId: string, subject: string) => {
        await onUpdateCourse(courseId, { subject });
        setEditSubjectData(null);
    };

    const handleCreateUser = async (userData: any, password?: string) => {
        // Updated check: Only check against current allUsers list. 
        // If a user was deleted, they are removed from allUsers, so this check will pass.
        const normalize = (str: string) => str ? str.toLowerCase().trim() : '';
        const emailExists = allUsers.some(u => normalize(u.email) === normalize(userData.email));
        const rollExists = userData.rollNo && allUsers.some(u => u.rollNo && normalize(u.rollNo) === normalize(userData.rollNo));
        
        if (emailExists) { alert("Email already exists."); return; }
        if (rollExists) { alert("Roll Number already exists."); return; }
        
        await onCreateUser(userData, password);
    };

    const navigateToSection = (section: any) => { setActiveSection(section); setMobileMenuOpen(false); };

    if (isLoading) return <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div><p className="font-bold text-muted-foreground animate-pulse uppercase tracking-widest text-xs">Authenticating Director...</p></div>;
    if (!college) return <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-tighter text-2xl opacity-20">Preparing Director Workspace</div>;
    if (viewingHodDept) {
        const masqueradeUser = { ...currentUser, department: viewingHodDept, tag: 'HOD/Dean' };
        return (
            <div className="bg-background min-h-screen flex flex-col animate-fade-in">
                <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow-xl z-50 sticky top-0 border-b border-white/10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setViewingHodDept(null)} className="flex items-center gap-2 text-xs font-black text-white/70 hover:text-white bg-white/5 px-4 py-2 rounded-xl transition-all border border-white/5 hover:border-white/20 active:scale-95"><ArrowLeftIcon className="w-4 h-4"/> Director Portal</button>
                        <div className="h-6 w-px bg-white/20"></div>
                        <div className="flex flex-col"><span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Live Masquerade</span><span className="font-black text-sm tracking-tight">{viewingHodDept} HOD Context</span></div>
                    </div>
                </div>
                <div className="flex-1 relative overflow-hidden">
                    <HodPage currentUser={masqueradeUser as User} onNavigate={onNavigate} currentPath={currentPath} courses={allCourses} onCreateCourse={onCreateCourse} onUpdateCourse={onUpdateCourse} onDeleteCourse={onDeleteCourse} notices={notices || []} users={usersMap || {}} allUsers={allUsers} onCreateNotice={onCreateNotice} onDeleteNotice={onDeleteNotice} departmentChats={[]} onSendDepartmentMessage={() => {}} onCreateUser={onCreateUser} onCreateUsersBatch={onCreateUsersBatch} onApproveTeacherRequest={onApproveTeacherRequest} onDeclineTeacherRequest={onDeclineTeacherRequest} colleges={colleges} onUpdateCourseFaculty={props.onUpdateCourseFaculty || (() => {})} onUpdateCollegeClasses={onUpdateCollegeClasses} onUpdateCollege={onUpdateCollege} onDeleteUser={onDeleteUser} onToggleFreezeUser={onToggleFreezeUser} onUpdateUserRole={onUpdateUserRole} onUpdateUser={onUpdateUser} onCreateOrOpenConversation={onCreateOrOpenConversation}/>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background min-h-screen flex flex-col">
            <Header currentUser={currentUser} onLogout={handleLogout} onNavigate={onNavigate} currentPath={currentPath} />
            <div className="md:hidden bg-card border-b border-border p-4 flex justify-between items-center sticky top-16 z-30 shadow-sm backdrop-blur-md bg-opacity-90">
                <div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-xl"><ShieldIcon className="w-5 h-5 text-primary"/></div><span className="font-black text-lg uppercase tracking-tighter text-foreground">{activeSection}</span></div>
                <button onClick={() => setMobileMenuOpen(true)} className="p-2.5 rounded-2xl bg-muted text-foreground active:scale-90 transition-transform"><MenuIcon className="w-6 h-6" /></button>
            </div>
            <div className="flex flex-1 overflow-hidden w-full relative">
                <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-card border-r border-border transform transition-transform duration-500 ease-in-out md:relative md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="p-8 h-full overflow-y-auto flex flex-col">
                        <div className="flex items-center gap-3 mb-10 px-2">
                             <div className="w-10 h-10 rounded-[1.25rem] bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-lg"><BuildingIcon className="w-5 h-5"/></div>
                             <div><h3 className="font-black text-sm tracking-tight text-foreground truncate max-w-[140px]">{college.name}</h3><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Admin Control</p></div>
                        </div>
                        <div className="space-y-1.5 flex-1">
                            <SidebarItem id="dashboard" label="Command Center" icon={LayoutGridIcon} onClick={() => navigateToSection('dashboard')} active={activeSection === 'dashboard'} />
                            <SidebarItem id="departments" label="Departments & Heads" icon={BuildingIcon} onClick={() => navigateToSection('departments')} active={activeSection === 'departments'} />
                            <SidebarItem id="academics" label="Academic Portfolio" icon={BookOpenIcon} onClick={() => navigateToSection('academics')} active={activeSection === 'academics'} />
                            <SidebarItem id="timetable" label="Master Schedules" icon={CalendarIcon} onClick={() => navigateToSection('timetable')} active={activeSection === 'timetable'} />
                            <SidebarItem id="reports" label="Usage Intelligence" icon={ChartBarIcon} onClick={() => navigateToSection('reports')} active={activeSection === 'reports'} />
                            <SidebarItem id="broadcast" label="Broadcast Center" icon={MegaphoneIcon} onClick={() => navigateToSection('broadcast')} active={activeSection === 'broadcast'} />
                            <div className="h-px bg-border my-6 mx-2"></div>
                            <SidebarItem id="faculty" label="Faculty Register" icon={UserPlusIcon} onClick={() => navigateToSection('faculty')} active={activeSection === 'faculty'} />
                            <SidebarItem id="students" label="Student Database" icon={UsersIcon} onClick={() => navigateToSection('students')} active={activeSection === 'students'} />
                            <SidebarItem id="approvals" label="Verification Tasks" icon={CheckCircleIcon} onClick={() => navigateToSection('approvals')} active={activeSection === 'approvals'} />
                            <SidebarItem id="settings" label="College Settings" icon={SettingsIcon} onClick={() => navigateToSection('settings')} active={activeSection === 'settings'} />
                        </div>
                    </div>
                </aside>
                {mobileMenuOpen && <div className="fixed inset-0 z-30 bg-black/60 md:hidden backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>}
                <main className="flex-1 p-4 md:p-10 overflow-y-auto h-[calc(100vh-112px)] md:h-[calc(100vh-64px)] bg-muted/5 pb-32 lg:pb-10 custom-scrollbar text-left">
                    {activeSection !== 'dashboard' && activeSection !== 'departments' && activeSection !== 'reports' && activeSection !== 'approvals' && activeSection !== 'settings' && activeSection !== 'broadcast' && (
                         <div className="mb-8 bg-card p-5 rounded-[2rem] border border-border flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-muted/50 rounded-2xl border border-border"><BuildingIcon className="w-5 h-5 text-muted-foreground"/></div>
                                <div><h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Department View</h4><p className="text-xl font-black text-foreground tracking-tighter">{selectedDept}</p></div>
                            </div>
                            <div className="w-full sm:w-auto relative group">
                                <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="w-full sm:w-64 bg-white dark:bg-muted/40 px-5 py-3 rounded-2xl text-sm font-black focus:outline-none border border-border appearance-none cursor-pointer text-slate-900 dark:text-foreground transition-all shadow-sm">{college.departments?.map((d:string) => <option key={d} value={d}>{d}</option>)}</select>
                                <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none transition-transform group-hover:translate-y-0.5"/>
                            </div>
                        </div>
                    )}
                    
                    {activeSection === 'dashboard' && (
                        <div className="space-y-10 animate-fade-in">
                            <div className="flex justify-between items-end">
                                <div><h2 className="text-4xl font-black text-foreground tracking-tighter">Command Center</h2><p className="text-muted-foreground text-lg mt-1">Hello, Director. Here is your institutional snapshot.</p></div>
                                <div className="hidden lg:flex items-center gap-3 bg-emerald-500/10 px-4 py-2 rounded-2xl border border-emerald-500/20"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div><span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">System Health: Optimal</span></div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                <StatCard label="Total Reach" value={stats.studentCount} icon={UsersIcon} colorClass="bg-blue-500" trend="up" subValue="Active Learners" />
                                <StatCard label="Core Faculty" value={stats.facultyCount} icon={UserPlusIcon} colorClass="bg-purple-500" trend="up" subValue="Academic Staff" />
                                <StatCard label="Portfolio" value={stats.deptCount} icon={BuildingIcon} colorClass="bg-indigo-500" subValue="Departments" />
                                <StatCard label="Daily Attendance" value={stats.hasTodayData ? `${stats.todayAttendance}%` : "-"} icon={ActivityIcon} colorClass="bg-orange-500" trend={stats.hasTodayData ? (stats.todayAttendance >= stats.avgAttendance ? "up" : "down") : "neutral"} subValue={stats.hasTodayData ? "Marked Today" : "Awaiting Marks"} />
                                <StatCard label="Avg. Attendance" value={`${stats.avgAttendance}%`} icon={ChartBarIcon} colorClass="bg-cyan-600" subValue="Cumulative Log" />
                            </div>
                            <div className="space-y-8">
                                <div className="bg-card border border-border/60 rounded-[3rem] p-8 shadow-sm overflow-hidden relative">
                                    <div className="flex items-center justify-between mb-8"><h3 className="font-black text-xl text-foreground uppercase tracking-tight flex items-center gap-3"><ActivityIcon className="w-6 h-6 text-primary"/> Department Attendance</h3><div className="px-3 py-1 bg-muted rounded-full text-[10px] font-black uppercase text-muted-foreground">Real-time Analysis</div></div>
                                    <DepartmentAttendanceChart data={deptAttendanceData} />
                                </div>
                                <div className="bg-card border border-border/60 rounded-[3rem] p-8 shadow-sm">
                                    <h3 className="font-black text-xl text-foreground mb-8 flex items-center gap-3 uppercase tracking-tight"><CalendarIcon className="w-6 h-6 text-indigo-500"/> Executive Tasks</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <QuickAction label="Broadcast" icon={MegaphoneIcon} color="bg-amber-500" onClick={() => navigateToSection('broadcast')} />
                                        <QuickAction label="Approvals" icon={CheckCircleIcon} color="bg-emerald-500" onClick={() => navigateToSection('approvals')} />
                                        <QuickAction label="Schedule" icon={CalendarIcon} color="bg-blue-500" onClick={() => navigateToSection('timetable')} />
                                        <QuickAction label="Configuration" icon={SettingsIcon} color="bg-slate-600" onClick={() => navigateToSection('settings')} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeSection === 'settings' && (
                        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
                            <h2 className="text-3xl font-black text-foreground tracking-tighter">College Configuration</h2>
                            <div className="bg-card border border-border rounded-[3rem] p-10 shadow-sm space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <div className="space-y-2"><label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-1">Institutional Identity</label><input value={editCollegeName} onChange={e => setEditCollegeName(e.target.value)} className="w-full bg-muted/40 border border-border rounded-2xl px-6 py-4 text-lg font-black focus:outline-none focus:ring-2 focus:ring-primary shadow-inner" placeholder="Institute Name" /></div>
                                        <div className="space-y-2"><label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-1">Public Description</label><textarea rows={4} className="w-full bg-muted/40 border border-border rounded-2xl px-6 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-inner resize-none" placeholder="Brief overview of your institution..." /></div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-[2.5rem] bg-muted/10 group hover:border-primary/50 transition-all cursor-pointer p-8 text-center">
                                        <div className="w-20 h-20 bg-background rounded-[1.5rem] shadow-md flex items-center justify-center text-muted-foreground mb-4 group-hover:scale-110 transition-transform"><PhotoIcon className="w-10 h-10"/></div>
                                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Change Hero Banner</p>
                                        <p className="text-[10px] text-muted-foreground mt-1 opacity-60">High resolution institutional image</p>
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-border flex justify-end">
                                    <button onClick={handleUpdateCollegeName} disabled={isSavingBranding} className="bg-primary text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.15em] shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50">{isSavingBranding ? "Syncing..." : "Update Infrastructure"} <GlobeIcon className="w-5 h-5"/></button>
                                </div>
                            </div>
                            <div className="bg-red-500/5 border border-red-500/20 rounded-[3rem] p-10 space-y-6">
                                <div><h3 className="text-red-600 font-black text-xl tracking-tight">Access Control & Security</h3><p className="text-red-600/60 text-sm font-medium">Manage institutional access and director-level security protocols.</p></div>
                                <div className="flex flex-wrap gap-4"><button className="px-6 py-3 bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-600/10">Freeze All Accounts</button><button className="px-6 py-3 bg-card border border-red-200 text-red-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-all">Audit Permissions</button></div>
                            </div>
                        </div>
                    )}
                    {activeSection === 'reports' && <ReportsView courses={collegeCourses} departments={college.departments || []} />}
                    {activeSection === 'academics' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-3xl font-black text-foreground tracking-tighter">Academic Portfolio</h2>
                                    <p className="text-muted-foreground text-lg">Manage classes and subjects for {selectedDept}.</p>
                                </div>
                                <div className="flex gap-2">
                                    {/* MODIFIED BUTTON: Uses internal masquerade instead of route change */}
                                    <button 
                                        onClick={() => setViewingHodDept(selectedDept)}
                                        className="bg-card text-foreground border border-border px-5 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-muted transition-all active:scale-95 shadow-sm"
                                        title={`Switch to ${selectedDept} View`}
                                    >
                                        <ArrowRightIcon className="w-5 h-5 text-primary" />
                                        Dept. Portal
                                    </button>
                                    <button
                                        onClick={() => setIsCreateCourseModalOpen(true)}
                                        className="bg-card text-foreground border border-border px-5 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-muted transition-all active:scale-95"
                                    >
                                        <BookOpenIcon className="w-5 h-5 text-primary" />
                                        Add Subject
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!selectedDept) {
                                                alert('Create a department first, then you can add classes to it.');
                                                return;
                                            }
                                            setIsCreateClassModalOpen(true);
                                        }}
                                        className="bg-primary text-white px-5 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                                    >
                                        <PlusIcon className="w-5 h-5" />
                                        Create Class
                                    </button>
                                </div>
                            </div>
                            
                            {/* NEW: Custom Class List View (Accordion Style) */}
                            <div className="flex flex-col gap-4">
                                {activeClassesForDept.length > 0 ? (
                                    activeClassesForDept.sort((a:any, b:any) => a.year - b.year || a.division.localeCompare(b.division)).map((cls: any) => {
                                        const classKey = `${cls.year}-${cls.division}`;
                                        const isExpanded = expandedClass === classKey;
                                        const stats = classStats?.[classKey] || { count: 0, avg: 0 };
                                        const subjects = deptCourses.filter((c: any) => c.year === cls.year && c.division === cls.division);

                                        return (
                                            <div key={classKey} className="bg-card border border-border rounded-3xl overflow-hidden transition-all duration-300 hover:border-primary/30 group">
                                                <div 
                                                    className="p-6 flex items-center justify-between cursor-pointer"
                                                    onClick={() => setExpandedClass(isExpanded ? null : classKey)}
                                                >
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-xl font-black text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors shadow-inner">
                                                            {cls.division}
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-black text-foreground">Year {cls.year}</h3>
                                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide opacity-80">{subjects.length} Modules Assigned</p>
                                                            
                                                            {/* New Stats Row */}
                                                            <div className="flex items-center gap-3 mt-2">
                                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-wide">
                                                                    <UsersIcon className="w-3 h-3" />
                                                                    {stats.count} Students
                                                                </div>
                                                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wide border ${stats.avg >= 75 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : stats.avg >= 60 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'}`}>
                                                                    <ActivityIcon className="w-3 h-3" />
                                                                    {stats.avg}% Avg. Attd.
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                      <div className="flex items-center gap-2">
                                                          <button
                                                              onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.year, cls.division); }}
                                                              className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors"
                                                              title="Delete Class"
                                                          >
                                                              <TrashIcon className="w-4 h-4"/>
                                                          </button>
                                                          <button
                                                              onClick={(e) => { e.stopPropagation(); setEditClassData({ year: cls.year, division: cls.division }); }}
                                                              className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                                                              title="Edit Class"
                                                          >
                                                              <EditIcon className="w-4 h-4"/>
                                                          </button>
                                                          <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                                              <ChevronDownIcon className="w-6 h-6 text-muted-foreground group-hover:text-foreground" />
                                                          </div>
                                                      </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="border-t border-border bg-muted/20 p-6 animate-fade-in">
                                                        <div className="flex justify-between items-center mb-4">
                                                            <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest">Active Curriculum</h4>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setCreateCourseDefaultClass(classKey); setIsCreateCourseModalOpen(true); }}
                                                                className="text-[10px] font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors flex items-center gap-1"
                                                            >
                                                                <PlusIcon className="w-3 h-3"/> Add Subject
                                                            </button>
                                                        </div>
                                                        
                                                        {subjects.length > 0 ? (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                {subjects.map((sub: any) => {
                                                                    const teacher = allAcademicStaff.find((u:any) => u.id === sub.facultyId);
                                                                    // Calculate Avg Attendance for this Subject
                                                                    let subTotal = 0, subPresent = 0;
                                                                    sub.attendanceRecords?.forEach((r: any) => {
                                                                        if (r.records) {
                                                                            Object.values(r.records).forEach((s: any) => {
                                                                                subTotal++;
                                                                                if (s.status === 'present') subPresent++;
                                                                            });
                                                                        }
                                                                    });
                                                                    const subAvg = subTotal > 0 ? Math.round((subPresent / subTotal) * 100) : 0;

                                                                    return (
                                                                        <div 
                                                                            key={sub.id} 
                                                                            onClick={() => onNavigate(`#/academics/${sub.id}`)}
                                                                            className="bg-background border border-border rounded-xl p-4 flex justify-between items-start group/sub hover:border-primary/40 transition-all relative overflow-hidden cursor-pointer hover:shadow-md"
                                                                        >
                                                                            <div>
                                                                                <p className="font-bold text-sm text-foreground group-hover/sub:text-primary transition-colors">{sub.subject}</p>
                                                                                
                                                                                {/* UPDATED: Clickable Teacher Section with State Setter */}
                                                                                <div 
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setAssignSearch('');
                                                                                        setCourseToAssignFaculty(sub);
                                                                                    }}
                                                                                    className="flex items-center gap-2 mt-1 cursor-pointer hover:bg-muted p-1 -ml-1 rounded-lg transition-colors group/teacher z-10 relative"
                                                                                    title="Assign Faculty"
                                                                                >
                                                                                    <Avatar src={teacher?.avatarUrl} name={teacher?.name || "?"} size="xs" />
                                                                                    <span className={`text-xs font-medium ${teacher ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-500 font-bold'}`}>
                                                                                        {teacher?.name || "Unassigned"}
                                                                                    </span>
                                                                                    <EditIcon className="w-3 h-3 text-muted-foreground opacity-0 group-hover/teacher:opacity-100 transition-opacity"/>
                                                                                </div>

                                                                                <div className={`mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${subAvg >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : subAvg >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                                                    {subAvg}% Avg. Attendance
                                                                                </div>
                                                                            </div>
                                                                            <button 
                                                                                onClick={(e) => { 
                                                                                    e.stopPropagation();
                                                                                    setEditSubjectData({ id: sub.id, subject: sub.subject });
                                                                                }}
                                                                                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors opacity-0 group-hover/sub:opacity-100 absolute top-2 right-9 z-10"
                                                                            >
                                                                                <EditIcon className="w-3.5 h-3.5"/>
                                                                            </button>
                                                                            <button 
                                                                                onClick={(e) => { 
                                                                                    e.stopPropagation();
                                                                                    if(window.confirm("Delete subject?")) onDeleteCourse(sub.id); 
                                                                                }}
                                                                                className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover/sub:opacity-100 absolute top-2 right-2 z-10"
                                                                            >
                                                                                <TrashIcon className="w-3.5 h-3.5"/>
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center py-8 text-muted-foreground text-xs italic">No subjects added to this class yet.</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-20 bg-card border border-border border-dashed rounded-[2rem]">
                                        <div className="p-4 bg-muted rounded-full mb-4 inline-flex"><BookOpenIcon className="w-8 h-8 text-muted-foreground"/></div>
                                        <h3 className="font-bold text-lg text-foreground">No Classes Found</h3>
                                        <p className="text-muted-foreground text-sm mt-1">Create a class to get started with curriculum management.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {/* --- REPLACED ACADEMICS SECTION END --- */}

                    {activeSection === 'timetable' && (
                        <TimetableManager 
                            activeClasses={activeClassesForDept} 
                            deptCourses={deptCourses} 
                            faculty={allAcademicStaff} 
                            timetables={college?.timetable || {}} 
                            onUpdateTimetables={(t:any)=>onUpdateCollege(college.id, {timetable: t})} 
                            slots={college?.timeSlots || []} 
                            slotsByClass={college?.timeSlotsByClass || {}} 
                            onUpdateSlots={(s:any)=>onUpdateCollege(college.id, {timeSlots: s})} 
                            onUpdateSlotsByClass={(classId: string, s: any)=>onUpdateCollege(college.id, {timeSlotsByClass: { ...(college?.timeSlotsByClass || {}), [classId]: s }})} 
                            onSaveAll={()=>{}} 
                        />
                    )}
                    {activeSection === 'broadcast' && <BroadcastManager notices={notices} onCreateNotice={onCreateNotice} onDeleteNotice={onDeleteNotice} currentUser={currentUser} college={college} courses={allCourses} allUsers={allUsers}/>}
                    {activeSection === 'departments' && (
                        <div className="space-y-10 animate-fade-in">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                <div><h2 className="text-3xl font-black text-foreground tracking-tighter">Academic Departments</h2><p className="text-muted-foreground text-lg">Infrastructure management for all college branches.</p></div>
                                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                                    <div className="relative flex-1 sm:w-64"><SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/><input type="text" value={deptSearchTerm} onChange={(e) => setDeptSearchTerm(e.target.value)} placeholder="Search departments..." className="w-full bg-card border border-border hover:bg-muted/40 focus:bg-background px-4 pl-11 py-3.5 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"/></div>
                                    <button onClick={() => setIsAddDeptModalOpen(true)} className="bg-primary text-white px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all transform active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"><PlusIcon className="w-5 h-5"/> New Branch</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                                {college.departments?.filter((d:string) => d.toLowerCase().includes(deptSearchTerm.toLowerCase())).map((dept:string) => {
                                    const deptHod = hods.find((u:any) => u.department === dept);
                                    const dCourses = collegeCourses.filter((c:any) => c.department === dept);
                                    let totalRecs = 0, totalPresent = 0, todayRecs = 0, todayPresent = 0;
                                    const todayStr = new Date().toDateString();
                                    dCourses.forEach(c => { c.attendanceRecords?.forEach(r => { const isToday = new Date(r.date).toDateString() === todayStr; Object.values(r.records).forEach((s: any) => { totalRecs++; if(s.status === 'present') totalPresent++; if(isToday) { todayRecs++; if(s.status === 'present') todayPresent++; } }); }); });
                                    const avg = totalRecs > 0 ? Math.round((totalPresent/totalRecs)*100) : 0;
                                    const daily = todayRecs > 0 ? Math.round((todayPresent/todayRecs)*100) : 0;
                                    const facultyCount = allUsers.filter(u => u.collegeId === college.id && u.department === dept && u.tag === 'Teacher').length;
                                    const studentCount = allUsers.filter((u:any)=>u.department === dept && u.tag === 'Student').length;
                                    return (
                                        <div key={dept} className="bg-card border border-border/60 rounded-[2rem] p-4 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden flex flex-col border-b-4 hover:border-primary/40">
                                            <div className="flex justify-between items-start mb-4 sm:mb-6 relative z-10">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted/50 rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-inner"><BuildingIcon className="w-5 h-5 sm:w-6 sm:h-6" /></div>
                                                <div className="text-right flex flex-col items-end gap-1"><span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border ${daily >= 75 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>{daily}% Today</span><span className="text-[9px] font-black px-2 py-0.5 bg-muted text-muted-foreground rounded-lg border border-border">{avg}% Avg</span></div>
                                            </div>
                                            <h3 className="text-sm sm:text-xl font-black text-foreground tracking-tight leading-none mb-4 group-hover:text-primary transition-colors truncate" title={dept}>{dept}</h3>
                                            <div className="space-y-3 mb-6">
                                                <div className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-xl border border-border/50">
                                                    <div className="flex items-center gap-2 sm:gap-3 overflow-hidden"><Avatar src={deptHod?.avatarUrl} name={deptHod?.name || 'Vacant'} size="sm" /><div className="min-w-0"><p className="text-[10px] sm:text-xs font-black text-foreground truncate">{deptHod?.name || 'Head Required'}</p><p className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Assigned HOD</p></div></div>
                                                    <button onClick={() => openAssignHodModal(dept)} className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-border hover:bg-muted transition-all active:scale-90 flex-shrink-0"><EditIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary"/></button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="p-2 sm:p-3 bg-muted/30 rounded-xl border border-border/50 text-center"><p className="text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase mb-0.5">Faculty</p><p className="text-sm sm:text-base font-black text-foreground">{facultyCount}</p></div>
                                                    <div className="p-2 sm:p-3 bg-muted/30 rounded-xl border border-border/50 text-center"><p className="text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase mb-0.5">Students</p><p className="text-sm sm:text-base font-black text-foreground">{studentCount}</p></div>
                                                </div>
                                            </div>
                                            <div className="mt-auto flex gap-2">
                                                <button onClick={() => { setViewingHodDept(dept); }} className="flex-1 py-3 bg-foreground text-background font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-foreground/90 transition-all flex items-center justify-center gap-2 group/btn shadow-xl active:scale-95"><span className="hidden sm:inline">Masquerade</span> <span className="sm:hidden">View</span> <ArrowRightIcon className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1"/></button>
                                                <button onClick={() => handleDeleteDepartment(dept)} className="p-3 text-muted-foreground hover:text-rose-500 bg-muted/40 hover:bg-rose-500/10 rounded-xl border border-transparent hover:border-rose-500/20 transition-all active:scale-90"><TrashIcon className="w-4 h-4"/></button>
                                            </div>
                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {activeSection === 'faculty' && <UserDirectory type="Teacher" users={deptFaculty} onCreateUser={handleCreateUser} onCreateUsersBatch={onCreateUsersBatch} department={selectedDept} activeCourses={deptCourses} onDeleteUser={onDeleteUser} onUpdateUser={onUpdateUser} existingEmails={allUserEmails} />}
                    {activeSection === 'students' && (
                        <UserDirectory 
                            activeClasses={activeClassesForDept} 
                            type="Student" 
                            users={deptStudents} 
                            onCreateUser={handleCreateUser} 
                            onCreateUsersBatch={onCreateUsersBatch} 
                            department={selectedDept} 
                            activeCourses={deptCourses} 
                            onDeleteUser={onDeleteUser} 
                            onUpdateUser={onUpdateUser} 
                            availableYears={activeYearsForDept} 
                            existingEmails={allUserEmails}
                            attendanceMap={studentAttendanceMap} // Pass the attendance map
                        />
                    )}
                    {activeSection === 'approvals' && (
                        <div className="space-y-10 animate-fade-in max-w-5xl mx-auto">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div><h2 className="text-3xl font-black text-foreground tracking-tighter">Verification Queue</h2><p className="text-muted-foreground text-lg">Approve institutional access for registered faculty and students.</p></div>
                                <div className="px-5 py-2 bg-amber-500/10 text-amber-600 rounded-full text-xs font-black uppercase tracking-widest border border-amber-500/20">{pendingApprovals.length} Required</div>
                            </div>
                            <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-muted/30 text-muted-foreground font-black text-[10px] uppercase tracking-[0.25em] border-b border-border">
                                            <tr><th className="p-6">Applicant Profile</th><th className="p-6">Requested Role</th><th className="p-6">Branch</th><th className="p-6 text-right">Verification</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {pendingApprovals.length > 0 ? pendingApprovals.map((user:any) => (
                                                <tr key={user.id} className="hover:bg-muted/10 transition-colors group">
                                                    <td className="p-6"><div className="flex items-center gap-4"><Avatar src={user.avatarUrl} name={user.name} size="md" className="shadow-md ring-2 ring-card group-hover:ring-primary/20 transition-all"/><div className="min-w-0"><p className="font-black text-foreground tracking-tight leading-none mb-1 group-hover:text-primary transition-colors">{user.name}</p><p className="text-[10px] text-muted-foreground font-bold truncate">{user.email}</p></div></div></td>
                                                    <td className="p-6 align-middle"><span className="px-3 py-1 bg-muted rounded-lg text-[10px] font-black uppercase tracking-widest text-muted-foreground border border-border">{user.tag}</span></td>
                                                    <td className="p-6 align-middle"><p className="text-xs font-bold text-foreground opacity-80">{user.department}</p></td>
                                                    <td className="p-6 text-right align-middle"><div className="flex justify-end gap-3"><button onClick={() => onDeclineTeacherRequest(user.id)} className="px-5 py-2.5 bg-rose-500/10 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-white transition-all shadow-sm active:scale-95">Revoke</button><button onClick={() => onApproveTeacherRequest(user.id)} className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-95">Validate</button></div></td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan={4} className="p-24 text-center"><CheckCircleIcon className="w-16 h-16 mx-auto mb-4 text-emerald-500 opacity-20"/><p className="text-muted-foreground font-black text-xl uppercase tracking-tighter opacity-40">Queue cleared successfully</p></td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
            {/* Modals */} 
            <AddDepartmentModal isOpen={isAddDeptModalOpen} onClose={() => setIsAddDeptModalOpen(false)} onAdd={handleAddDepartment} />
            <AssignHodModal isOpen={!!assignHodData} onClose={() => setAssignHodData(null)} department={assignHodData?.department || ''} teachers={assignHodData?.teachers || []} currentHod={assignHodData?.currentHod} onAssign={handleAssignHod} onCreateUser={onCreateUser} />
            
            {/* NEW: Create Class Modal */}
            {isCreateClassModalOpen && (
                <CreateClassModal 
                    isOpen={isCreateClassModalOpen} 
                    onClose={() => setIsCreateClassModalOpen(false)} 
                    onCreate={handleCreateClass}
                    existingClasses={activeClassesForDept}
                    onDelete={handleDeleteClass}
                    classStats={classStats}
                />
            )}

            {editClassData && (
                <EditClassModal
                    isOpen={!!editClassData}
                    onClose={() => setEditClassData(null)}
                    initialYear={editClassData.year}
                    initialDivision={editClassData.division}
                    onSave={(newYear: number, newDiv: string) => handleEditClass(editClassData.year, editClassData.division, newYear, newDiv)}
                />
            )}

            {/* NEW: Create Course Modal */}
            {isCreateCourseModalOpen && (
                <CreateCourseModal
                    isOpen={isCreateCourseModalOpen}
                    onClose={() => setIsCreateCourseModalOpen(false)} 
                    onCreate={(data: any) => onCreateCourse({ ...data, collegeId: college.id, department: selectedDept })}
                    activeClasses={activeClassesForDept}
                    defaultClass={createCourseDefaultClass}
                />
            )}

            {editSubjectData && (
                <EditSubjectModal
                    isOpen={!!editSubjectData}
                    onClose={() => setEditSubjectData(null)}
                    initialSubject={editSubjectData.subject}
                    onSave={(subject: string) => handleEditSubject(editSubjectData.id, subject)}
                />
            )}

            {/* NEW: Assign Faculty Modal (Inline) */}
            {courseToAssignFaculty && (
                <div className="fixed inset-0 bg-black/60 z-[150] flex justify-center items-center p-4 animate-fade-in" onClick={() => setCourseToAssignFaculty(null)}>
                    <div className="bg-card rounded-[2rem] shadow-2xl w-full max-w-md border border-border overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-6 border-b border-border bg-muted/10">
                            <div>
                                <h3 className="font-black text-lg text-foreground tracking-tight">Assign Faculty</h3>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{courseToAssignFaculty.subject}</p>
                            </div>
                            <button onClick={() => setCourseToAssignFaculty(null)} className="p-2 bg-muted rounded-full hover:bg-muted/80 transition-colors"><CloseIcon className="w-5 h-5 text-muted-foreground"/></button>
                        </div>
                        
                        {/* SEARCH BAR ADDED HERE */}
                        <div className="p-4 border-b border-border bg-card">
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                                <input 
                                    type="text" 
                                    value={assignSearch} 
                                    onChange={(e) => setAssignSearch(e.target.value)} 
                                    placeholder="Search faculty..." 
                                    className="w-full bg-muted/30 border border-border rounded-xl pl-9 pr-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                                    autoFocus
                                />
                            </div>
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-2">Cross-Department Selection Enabled</p>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar p-2 flex-1">
                            {filteredAcademicStaffForAssignment.length > 0 ? (
                                <div className="space-y-1">
                                    {filteredAcademicStaffForAssignment.map(f => (
                                        <label key={f.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${courseToAssignFaculty.facultyId === f.id ? 'bg-primary/10 border-primary/40' : 'hover:bg-muted/50 border-transparent'}`}>
                                            <input 
                                                type="radio" 
                                                name="faculty" 
                                                value={f.id} 
                                                checked={courseToAssignFaculty.facultyId === f.id} 
                                                onChange={() => {
                                                    onUpdateCourse(courseToAssignFaculty.id, { facultyId: f.id });
                                                    setCourseToAssignFaculty(null);
                                                }} 
                                                className="text-primary focus:ring-primary w-4 h-4 accent-primary"
                                            />
                                            <Avatar src={f.avatarUrl} name={f.name} size="sm" />
                                            <div className="min-w-0">
                                                <p className={`text-sm font-bold truncate ${courseToAssignFaculty.facultyId === f.id ? 'text-primary' : 'text-foreground'}`}>{f.name} {f.id === currentUser.id && '(You)'}</p>
                                                <p className="text-[10px] text-muted-foreground font-medium truncate uppercase">{f.tag} • {f.department}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-60">No academic staff found</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <BottomNavBar currentUser={currentUser} onNavigate={onNavigate} currentPage={currentPath}/>
        </div>
    );
};

export default DirectorPage;
