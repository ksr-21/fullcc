


import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Course, Notice, College, UserTag, TimetableData, TimeSlot } from '../types';
import Header from '../components/Header';
import BottomNavBar from '../components/BottomNavBar';
import Avatar from '../components/Avatar';
import CreateSingleUserModal from '../components/CreateSingleUserModal';
import AddStudentsCsvModal from '../components/AddStudentsCsvModal';
import AddTeachersCsvModal from '../components/AddTeachersCsvModal';
import { auth } from '../api';
import { db } from '../api';
import { 
    ChartPieIcon, UsersIcon, BookOpenIcon, MegaphoneIcon, ChartBarIcon, 
    PlusIcon, SearchIcon, TrashIcon, CheckCircleIcon, AlertTriangleIcon, 
    ClockIcon, ArrowRightIcon, MenuIcon, CloseIcon, ChevronRightIcon, 
    ChevronDownIcon, FileTextIcon, UserPlusIcon, EditIcon, 
    CalendarIcon, TrendingUpIcon, UploadIcon, SaveIcon, MapPinIcon, LayoutGridIcon,
    ActivityIcon, XCircleIcon, CoffeeIcon, LockIcon, PhotoIcon, ArrowLeftIcon, 
    MessageIcon, EyeIcon, SendIcon, BuildingIcon
} from '../components/Icons';
import { TimetableManager } from '../components/AcademicManager';

// --- Constants ---
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DEFAULT_SLOTS: TimeSlot[] = [
    { id: 's1', label: '09:00 - 10:00' },
    { id: 's2', label: '10:00 - 11:00' },
    { id: 's3', label: '11:15 - 12:15' },
    { id: 's4', label: '12:15 - 01:15' },
    { id: 's5', label: '02:00 - 03:00' },
    { id: 's6', label: '03:00 - 04:00' },
];

// --- Helper Utilities ---

const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxWidth = 800;
                let width = img.width, height = img.height;
                if (width > maxWidth) { height = img.height * (maxWidth / width); width = maxWidth; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

// --- UI Components ---

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

const StatCard = ({ label, value, icon: Icon, colorClass, trend, subValue, onClick }: any) => (
    <div 
        onClick={onClick}
        className={`bg-card rounded-2xl p-6 shadow-sm border border-border flex items-center justify-between hover:shadow-md transition-all group relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
    >
        <div className="relative z-10">
            <p className="text-muted-foreground text-[10px] uppercase font-black tracking-widest">{label}</p>
            <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-black text-foreground tracking-tight">{value}</p>
            </div>
            {subValue && <p className="text-[10px] font-bold text-muted-foreground mt-1 opacity-70">{subValue}</p>}
        </div>
        <div className={`p-4 rounded-2xl ${colorClass} bg-opacity-10 group-hover:scale-110 transition-transform duration-500`}>
            <Icon className={`w-7 h-7 ${colorClass.replace('bg-', 'text-')}`} />
        </div>
        <div className={`absolute bottom-0 left-0 h-1 w-full ${colorClass} opacity-20`}></div>
    </div>
);

const QuickActionBtn = ({ icon: Icon, label, onClick, color = "bg-primary" }: any) => (
    <button 
        onClick={onClick}
        className="flex flex-col items-center justify-center p-6 bg-card hover:bg-muted/50 border border-border rounded-3xl shadow-sm hover:shadow-lg transition-all group h-full aspect-square md:aspect-auto md:h-32 relative overflow-hidden"
    >
        <div className={`absolute top-0 left-0 w-full h-1 ${color} opacity-50`}></div>
        <div className={`p-4 rounded-2xl ${color} text-white mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
            <Icon className="w-6 h-6" />
        </div>
        <span className="text-xs font-black text-foreground text-center uppercase tracking-widest">{label}</span>
    </button>
);

const ImageLightbox = ({ src, onClose }: { src: string | null, onClose: () => void }) => {
    if (!src) return null;
    return (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fade-in" onClick={onClose}>
            <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 p-3 bg-black/50 hover:bg-white/10 rounded-full text-white transition-all transform hover:rotate-90 backdrop-blur-md border border-white/10 z-[210]"><CloseIcon className="w-6 h-6"/></button>
            <div className="relative w-full max-w-3xl max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <img src={src} alt="Full View" className="max-w-full max-h-full w-auto h-auto object-contain rounded-2xl shadow-2xl border border-white/10 bg-black/50" />
            </div>
        </div>
    );
};

const ExpandableText = ({ text }: { text: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const shouldTruncate = useMemo(() => text.length > 200 || text.split('\n').length > 4, [text]);
    return (
        <div>
            <p className={`text-sm text-muted-foreground whitespace-pre-wrap transition-all ${!isExpanded ? 'line-clamp-4' : ''}`}>{text}</p>
            {shouldTruncate && <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="mt-1 text-xs font-black text-primary hover:underline uppercase tracking-wide focus:outline-none">{isExpanded ? 'Show Less' : 'Read More'}</button>}
        </div>
    );
};

// --- Modals ---

const CreateClassModal = ({ isOpen, onClose, onCreate, existingClasses, onDelete, classStats }: any) => {
    const [year, setYear] = useState('');
    const [division, setDivision] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const parsedYear = parseInt(year);
        if (year && division && !isNaN(parsedYear)) {
            onCreate({ year: parsedYear, division: division.toUpperCase() });
            setDivision('');
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
                                    <input type="number" value={year} onChange={e => setYear(e.target.value)} className="w-full bg-slate-200/50 dark:bg-black/20 border border-transparent focus:bg-white dark:focus:bg-black focus:border-primary/50 rounded-xl px-4 py-2.5 font-bold text-foreground outline-none transition-all placeholder:text-muted-foreground/50" placeholder="1, 2, FY..." required />
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Div</label>
                                    <input value={division} onChange={e => setDivision(e.target.value.toUpperCase())} className="w-full bg-slate-200/50 dark:bg-black/20 border border-transparent focus:bg-white dark:focus:bg-black focus:border-primary/50 rounded-xl px-4 py-2.5 font-bold text-foreground outline-none transition-all placeholder:text-muted-foreground/50 uppercase" placeholder="A, B..." maxLength={2} required />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white py-3 rounded-xl font-bold shadow-lg shadow-purple-500/20 transition-all active:scale-95 text-sm">Create Class</button>
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

const CreateNoticeModal = ({ isOpen, onClose, onCreateNotice, currentUser, college, courses }: any) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [audience, setAudience] = useState('All'); 
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const myDept = currentUser.department;
    const [targetYear, setTargetYear] = useState('All');
    const [targetDiv, setTargetDiv] = useState('All');
    const [targetCourseId, setTargetCourseId] = useState('');
    const [isSending, setIsSending] = useState(false);
    
    const filteredCourses = useMemo(() => courses.filter((c: Course) => c.department === currentUser.department), [courses, currentUser.department]);
    
    const availableYears = useMemo(() => {
        if (!college?.classes?.[currentUser.department]) return [1, 2, 3, 4];
        return Object.keys(college.classes[currentUser.department]).map(y => parseInt(y)).sort();
    }, [college, currentUser.department]);
    
    const availableDivs = useMemo(() => {
        if (targetYear === 'All' || !college?.classes?.[currentUser.department]?.[targetYear]) return ['A', 'B', 'C', 'D'];
        return college.classes[currentUser.department][targetYear].sort();
    }, [college, currentUser.department, targetYear]);
    
    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try { const compressed = await compressImage(file); setSelectedImage(compressed); } catch (err) { alert("Image processing failed."); }
        }
    };
    
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault(); setIsSending(true);
        try {
            const newNotice = { id: Date.now().toString(), title, content: message, imageUrl: selectedImage, targetAudience: audience, targetDept: myDept, targetYear: targetYear === 'All' ? null : targetYear, targetDiv: targetDiv === 'All' ? null : targetDiv, targetCourseId: audience === 'Course' ? targetCourseId : null, authorId: currentUser.id, collegeId: currentUser.collegeId, type: 'department', timestamp: new Date().toISOString() };
            await onCreateNotice(newNotice); onClose();
        } catch (error) { alert("Failed to send."); } finally { setIsSending(false); }
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-card rounded-[2rem] shadow-2xl w-full max-w-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-border bg-muted/10">
                    <h3 className="font-black text-xl">New Department Broadcast</h3><button onClick={onClose}><CloseIcon className="w-5 h-5"/></button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <form onSubmit={handleSend} className="space-y-6">
                        <div className="bg-muted/20 p-5 rounded-2xl border border-border/50 space-y-4">
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Audience</label><select value={audience} onChange={e => setAudience(e.target.value)} className="w-full bg-input border border-border rounded-xl px-4 py-3 font-bold outline-none"><option value="All">All {myDept} Members</option><option value="Student">Specific Class</option><option value="Teacher">Faculty Only</option><option value="Course">Specific Course</option></select></div>
                            {(audience === 'Student' || audience === 'Course') && (<div className="grid grid-cols-2 gap-4">{audience === 'Student' && (<><div className="space-y-1"><label className="text-[9px] font-black uppercase text-muted-foreground">Year</label><select value={targetYear} onChange={e => setTargetYear(e.target.value)} className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm font-medium"><option value="All">All Years</option>{availableYears.map(y => <option key={y} value={y}>Year {y}</option>)}</select></div><div className="space-y-1"><label className="text-[9px] font-black uppercase text-muted-foreground">Div</label><select value={targetDiv} onChange={e => setTargetDiv(e.target.value)} className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm font-medium"><option value="All">All</option>{availableDivs.map(d => <option key={d} value={d}>Div {d}</option>)}</select></div></>)}{audience === 'Course' && (<div className="col-span-2 space-y-1"><label className="text-[9px] font-black uppercase text-muted-foreground">Subject</label><select value={targetCourseId} onChange={e => setTargetCourseId(e.target.value)} className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm font-medium"><option value="">-- Choose Subject --</option>{filteredCourses.map((c: Course) => <option key={c.id} value={c.id}>{c.subject}</option>)}</select></div>)}</div>)}
                        </div>
                        <div className="space-y-4"><input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-input border border-border rounded-xl px-4 py-3 font-bold" placeholder="Title" required /><textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} className="w-full bg-input border border-border rounded-xl px-4 py-3 font-medium resize-none" placeholder="Message" required />
                        {!selectedImage ? <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-4 flex items-center justify-center cursor-pointer hover:bg-muted/30"><input type="file" ref={fileInputRef} onChange={handleImageSelect} className="hidden"/><PhotoIcon className="w-5 h-5 text-muted-foreground mr-2"/><span className="text-xs font-bold text-muted-foreground">Add Image</span></div> : <div className="relative h-20 rounded-xl overflow-hidden"><img src={selectedImage} className="w-full h-full object-cover"/><button type="button" onClick={() => setSelectedImage(null)} className="absolute inset-0 bg-black/50 text-white font-bold opacity-0 hover:opacity-100 flex items-center justify-center">Remove</button></div>}</div>
                        <div className="flex justify-end pt-4 border-t border-border"><button type="submit" disabled={isSending} className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/90">{isSending ? 'Posting...' : 'Post Notice'}</button></div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// --- Functional Components ---

const BroadcastManager = ({ notices, onCreateNotice, onDeleteNotice, currentUser, college, courses, allUsers }: any) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [viewImage, setViewImage] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'All' | 'Me' | 'Others'>('All');

    // FIX: Added event propagation stop and preventDefault
    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if(window.confirm("Delete this notice?")) onDeleteNotice(id);
    };

    const myDepartment = currentUser.department;
    
    const visibleNotices = useMemo(() => {
        const relevant = notices.filter((n: Notice) => {
            const isAuthor = n.authorId === currentUser.id;
            const isForMyDept = n.targetDept === myDepartment;
            const isGlobal = (!n.targetDept || n.targetDept === 'All' || n.targetAudience === 'All') && n.collegeId === currentUser.collegeId; 
            const isLeadership = n.targetAudience === 'HOD/Dean';
            return isAuthor || isForMyDept || isGlobal || isLeadership;
        }).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (filterType === 'Me') return relevant.filter((n: Notice) => n.authorId === currentUser.id);
        if (filterType === 'Others') return relevant.filter((n: Notice) => n.authorId !== currentUser.id);
        return relevant;
    }, [notices, currentUser.id, myDepartment, filterType, currentUser.collegeId]);

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-foreground tracking-tighter">Department Broadcasts</h2>
                        <p className="text-muted-foreground text-lg mt-1">Announcements relevant to {myDepartment} & Institute.</p>
                    </div>
                    <button onClick={() => setIsCreateModalOpen(true)} className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2 active:scale-95 shrink-0">
                        <PlusIcon className="w-5 h-5"/> New Broadcast
                    </button>
                </div>

                <div className="flex p-1 bg-muted/40 rounded-xl border border-border w-full sm:w-fit self-start">
                    <button onClick={() => setFilterType('All')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${filterType === 'All' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>All</button>
                    <button onClick={() => setFilterType('Me')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${filterType === 'Me' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>By Me</button>
                    <button onClick={() => setFilterType('Others')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${filterType === 'Others' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>By Others</button>
                </div>
            </div>
            
            {visibleNotices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {visibleNotices.map((notice: any) => {
                        const courseName = notice.targetCourseId ? courses.find((c:any) => c.id === notice.targetCourseId)?.subject : null;
                        const dateObj = new Date(notice.timestamp);
                        const isMyPost = notice.authorId === currentUser.id;
                        
                        const author = allUsers.find((u: any) => u.id === notice.authorId);
                        const role = author ? author.tag : 'Unknown';

                        let cardBorderClass = 'border-border';
                        let badgeClass = 'bg-muted text-muted-foreground';
                        let roleLabel = role === 'HOD/Dean' ? 'HOD' : role;

                        if (isMyPost) {
                            cardBorderClass = 'border-primary shadow-lg shadow-primary/10';
                            badgeClass = 'bg-primary text-white';
                            roleLabel = 'You';
                        } else if (role === 'Director') {
                            cardBorderClass = 'border-red-500 shadow-lg shadow-red-500/10';
                            badgeClass = 'bg-red-500 text-white';
                            roleLabel = 'Director';
                        } else if (role === 'HOD/Dean') {
                            cardBorderClass = 'border-primary/50 shadow-lg shadow-primary/5';
                            badgeClass = 'bg-primary/80 text-white';
                        } else if (role === 'Teacher') {
                            cardBorderClass = 'border-emerald-500/50 shadow-lg shadow-emerald-500/10';
                            badgeClass = 'bg-emerald-500 text-white';
                            roleLabel = 'Faculty';
                        }

                        return (
                            <div key={notice.id} className={`bg-card border-2 ${cardBorderClass} rounded-[1.5rem] overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow group relative`}>
                                <div className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full z-10 shadow-sm ${badgeClass}`}>
                                    {roleLabel}
                                </div>
                                
                                {notice.imageUrl && (
                                    <div className="h-48 w-full bg-muted/20 overflow-hidden relative border-b border-border/50 cursor-pointer group/image" onClick={() => setViewImage(notice.imageUrl)}>
                                        <img src={notice.imageUrl} alt="Notice" className="w-full h-full object-cover transition-transform duration-700 group-hover/image:scale-105"/>
                                        <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 transition-colors flex items-center justify-center">
                                            <div className="bg-black/50 p-2 rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity backdrop-blur-sm"><EyeIcon className="w-5 h-5 text-white"/></div>
                                        </div>
                                    </div>
                                )}
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            <ClockIcon className="w-3 h-3 text-primary/70"/>
                                            <span>{dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                            <span className="opacity-50">•</span>
                                            <span>{dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        {/* FIX: Added z-20 and relative to ensure clicks register over any overlapping absolute elements */}
                                        {isMyPost && <button onClick={(e) => handleDelete(e, notice.id)} className="text-muted-foreground hover:text-red-500 p-1.5 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 relative z-20"><TrashIcon className="w-4 h-4"/></button>}
                                    </div>
                                    <h3 className="font-bold text-lg text-foreground mb-2 line-clamp-1">{notice.title}</h3>
                                    <div className="mb-4 flex-1"><ExpandableText text={notice.content} /></div>
                                    <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-border/50">
                                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-muted/50 text-muted-foreground border border-border uppercase tracking-wide">To: {notice.targetAudience || 'All'}</span>
                                        {(notice.targetYear || notice.targetDiv) && <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-wide">{notice.targetYear ? `Yr ${notice.targetYear}` : ''} {notice.targetDiv ? `Div ${notice.targetDiv}` : ''}</span>}
                                        {courseName && <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase tracking-wide">Sub: {courseName}</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-card border border-border border-dashed rounded-[2rem]">
                    <div className="p-5 bg-muted rounded-full mb-4"><MegaphoneIcon className="w-10 h-10 text-muted-foreground"/></div>
                    <h3 className="font-bold text-lg text-foreground">No Broadcasts Found</h3>
                    <p className="text-muted-foreground text-sm mt-1 mb-6 text-center max-w-xs">{filterType === 'Me' ? "You haven't posted any notices yet." : "No notices available in this category."}</p>
                    {filterType === 'Me' && <button onClick={() => setIsCreateModalOpen(true)} className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">Create Broadcast</button>}
                </div>
            )}
            <CreateNoticeModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onCreateNotice={onCreateNotice} currentUser={currentUser} college={college} courses={courses} />
            <ImageLightbox src={viewImage} onClose={() => setViewImage(null)} />
        </div>
    );
};

const UserDirectory = ({ 
    users = [], 
    type, 
    onCreateUser, 
    onCreateUsersBatch, 
    department, 
    activeCourses,
    onDeleteUser,
    onUpdateUser,
    availableYears,
    existingEmails = [],
    activeClasses = []
}: { 
    users?: User[], 
    type: 'Student' | 'Teacher', 
    onCreateUser: any, 
    onCreateUsersBatch: any, 
    department: string, 
    activeCourses: Course[],
    onDeleteUser: (id: string) => void;
    onUpdateUser: (id: string, data: any) => void;
    availableYears?: number[];
    existingEmails?: string[];
    activeClasses?: { year: number, division: string }[];
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [yearFilter, setYearFilter] = useState('All');
    const [divFilter, setDivFilter] = useState('All');
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const uniqueYears = useMemo(() => {
        if (type !== 'Student') return [];
        const years = new Set(users.map(u => u.yearOfStudy).filter(Boolean));
        return Array.from(years).sort((a,b) => (a as number) - (b as number));
    }, [users, type]);

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
    }, [users, searchTerm, yearFilter, divFilter, type]);

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

    // Calculate Attendance Function
    const getStudentAttendance = (studentId: string) => {
        let total = 0, present = 0;
        activeCourses.forEach(course => {
            course.attendanceRecords?.forEach(r => {
                if (r.records?.[studentId]) {
                    total++;
                    if (r.records[studentId].status === 'present') present++;
                }
            });
        });
        if (total === 0) return <span className="text-xs text-muted-foreground">-</span>;
        const pct = Math.round((present / total) * 100);
        return (
            <span className={`px-2 py-1 rounded text-[10px] font-black border ${pct < 75 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                {pct}%
            </span>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-2xl font-bold text-foreground">{type === 'Student' ? 'Student Directory' : 'Faculty Directory'}</h2>
                    
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
                    
                    {type === 'Student' && uniqueYears.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
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
                                            {/* ADDED COLUMN HEADER */}
                                            {type === 'Student' && <th className="p-4 text-center">Avg. Attd.</th>}
                                            <th className="p-4">Email Address</th>
                                            <th className="p-4 text-center">Account Status</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {group.students.map(user => (
                                            <tr key={user.id} className="hover:bg-muted/20 transition-colors group">
                                                <td className="p-4 font-mono text-xs text-muted-foreground font-bold">{user.rollNo || '-'}</td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar src={user.avatarUrl} name={user.name} size="sm"/>
                                                        <span className="font-bold text-foreground text-sm">{user.name}</span>
                                                    </div>
                                                </td>
                                                {/* ADDED ATTENDANCE DATA */}
                                                {type === 'Student' && <td className="p-4 text-center">{getStudentAttendance(user.id)}</td>}
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
                                        ))}
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
                                                <Avatar src={user.avatarUrl} name={user.name} size="sm"/>
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

            {isSingleModalOpen && (
                <CreateSingleUserModal 
                    availableYears={availableYears} 
                    activeClasses={activeClasses} 
                    isOpen={isSingleModalOpen} 
                    onClose={() => setIsSingleModalOpen(false)} 
                    department={department} 
                    role={type} 
                    onCreateUser={onCreateUser} 
                    existingEmails={existingEmails}
                />
            )}
            
            {isBulkModalOpen && type === 'Student' && <AddStudentsCsvModal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} department={department} onCreateUsersBatch={onCreateUsersBatch} existingEmails={existingEmails}/>}
            {isBulkModalOpen && type === 'Teacher' && <AddTeachersCsvModal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} department={department} onCreateUsersBatch={onCreateUsersBatch} existingEmails={existingEmails}/>}
            
            {editingUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4 animate-fade-in" onClick={() => setEditingUser(null)}>
                    <div className="bg-card rounded-[2rem] shadow-2xl w-full max-w-md border border-border overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-6 border-b border-border bg-muted/10">
                            <h3 className="font-black text-lg text-foreground uppercase tracking-tight">Modify User Profile</h3>
                            <button onClick={() => setEditingUser(null)} className="p-2 bg-muted rounded-full"><CloseIcon className="w-5 h-5 text-muted-foreground"/></button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            onUpdateUser(editingUser.id, { 
                                name: editingUser.name, 
                                email: editingUser.email,
                                yearOfStudy: editingUser.yearOfStudy,
                                division: editingUser.division,
                                rollNo: editingUser.rollNo
                            });
                            setEditingUser(null);
                        }} className="p-8 space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Display Name</label>
                                <input value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary font-medium" required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Institutional Email</label>
                                <input type="email" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary font-medium" required />
                            </div>

                            {type === 'Student' && (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Roll No</label>
                                        <input value={editingUser.rollNo || ''} onChange={e => setEditingUser({...editingUser, rollNo: e.target.value})} className="w-full bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary font-medium" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Year</label>
                                            <select 
                                                value={editingUser.yearOfStudy || ''} 
                                                onChange={e => setEditingUser({...editingUser, yearOfStudy: parseInt(e.target.value) || 0, division: ''})} 
                                                className="w-full bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                                            >
                                                <option value="">Select Year</option>
                                                {Array.from(new Set(activeClasses?.map(c => c.year) || [])).sort().map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Division</label>
                                            <select 
                                                value={editingUser.division || ''} 
                                                onChange={e => setEditingUser({...editingUser, division: e.target.value})} 
                                                className="w-full bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                                                disabled={!editingUser.yearOfStudy}
                                            >
                                                <option value="">Select Div</option>
                                                {activeClasses?.filter(c => c.year === editingUser.yearOfStudy).map(c => (
                                                    <option key={c.division} value={c.division}>{c.division}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setEditingUser(null)} className="px-6 py-3 text-sm font-bold text-muted-foreground hover:bg-muted rounded-xl transition-colors">Cancel</button>
                                <button type="submit" className="px-8 py-3 text-sm font-black bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/20">Save Profile</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const AtRiskView = ({ students, courses, onNavigateToProfile, onCreateConvo }: any) => {
    // ... [No changes to AtRiskView] ...
    const riskStudents = useMemo(() => {
        const list: any[] = [];
        students.forEach((student: User) => {
            const courseRisks: any[] = [];
            courses.forEach((course: Course) => {
                const records = course.attendanceRecords || [];
                const studentRecords = records.filter(r => r.records && r.records[student.id]);
                if (studentRecords.length > 0) {
                    const presentCount = studentRecords.filter(r => r.records[student.id].status === 'present').length;
                    const pct = Math.round((presentCount / studentRecords.length) * 100);
                    if (pct < 75) {
                        courseRisks.push({ subject: course.subject, attendance: pct });
                    }
                }
            });
            if (courseRisks.length > 0) {
                list.push({ student, courseRisks });
            }
        });
        return list.sort((a, b) => {
            const minA = Math.min(...a.courseRisks.map((r: any) => r.attendance));
            const minB = Math.min(...b.courseRisks.map((r: any) => r.attendance));
            return minA - minB;
        });
    }, [students, courses]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <AlertTriangleIcon className="w-7 h-7 text-red-500" />
                    Risk Monitoring Tool
                    <span className="ml-2 text-sm bg-red-100 text-red-600 px-2 py-1 rounded-full border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900">{riskStudents.length}</span>
                </h2>
                <p className="text-sm text-muted-foreground">Identifying students with attendance below 75% in one or more subjects.</p>
            </div>

            {riskStudents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {riskStudents.map(({ student, courseRisks }) => (
                        <div key={student.id} className="bg-card rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                            <div className="p-5 border-b border-red-50 dark:bg-red-900/5 flex justify-between items-center">
                                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigateToProfile(student.id)}>
                                    <Avatar src={student.avatarUrl} name={student.name} size="md" className="group-hover:ring-2 ring-primary/20" />
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">{student.name}</h4>
                                        <p className="text-[10px] text-muted-foreground font-mono uppercase">ROLL: {student.rollNo || 'N/A'}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={async () => {
                                        const convoId = await onCreateConvo(student.id);
                                        window.location.hash = '#/chat';
                                    }}
                                    className="p-2.5 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                                    title="Message Student"
                                >
                                    <MessageIcon className="w-5 h-5"/>
                                </button>
                            </div>
                            <div className="p-5 flex-1 space-y-4">
                                <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">Critical Subjects</p>
                                <div className="space-y-3">
                                    {courseRisks.map((risk: any, i: number) => (
                                        <div key={i} className="flex items-center gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="font-bold text-foreground truncate pr-2">{risk.subject}</span>
                                                    <span className="font-black text-red-600 dark:text-red-400">{risk.attendance}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                                    <div className="h-full bg-red-500 rounded-full" style={{width: `${risk.attendance}%`}}></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="px-5 py-3 bg-red-50/50 dark:bg-red-950/20 border-t border-red-50 dark:border-red-900/20">
                                <p className="text-[10px] text-muted-foreground font-medium">Recommended: Issue warning letter or schedule counseling.</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-24 bg-card rounded-3xl border border-border border-dashed">
                    <CheckCircleIcon className="w-16 h-16 mx-auto mb-4 text-emerald-500 opacity-20"/>
                    <h3 className="text-xl font-bold text-foreground">No students at risk</h3>
                    <p className="text-muted-foreground mt-1">Excellent! All students in your department are maintaining healthy attendance.</p>
                </div>
            )}
        </div>
    );
};

const ClassPerformanceModal = ({ isOpen, onClose, classData, courses, faculty, students, onNavigateToClass }: any) => {
    // ... [No changes to ClassPerformanceModal] ...
    const [activeTab, setActiveTab] = useState<'subjects' | 'students'>('subjects');

    if (!isOpen || !classData) return null;

    const classCourses = courses.filter((c: Course) => c.year === classData.year && c.division === classData.division);
    const classStudents = useMemo(() => {
        return students
            .filter((s: User) => s.yearOfStudy === classData.year && s.division === classData.division)
            .sort((a: User, b: User) => {
                const rollA = a.rollNo || '';
                const rollB = b.rollNo || '';
                return rollA.localeCompare(rollB, undefined, { numeric: true, sensitivity: 'base' });
            });
    }, [students, classData]);

    const todayStr = new Date().toDateString();

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-card rounded-2xl shadow-2xl w-[90%] md:w-full max-w-md md:max-w-4xl border border-border flex flex-col max-h-[70vh] md:max-h-[85vh] my-auto" onClick={e => e.stopPropagation()}>
                <div className="p-4 md:p-6 border-b border-border flex justify-between items-center bg-muted/10 shrink-0">
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-foreground">Daily Attendance Report</h2>
                        <p className="text-xs md:text-sm text-muted-foreground font-medium mt-1">
                            {todayStr} • Year {classData.year} - Div {classData.division}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"><CloseIcon className="w-5 h-5"/></button>
                </div>
                <div className="flex p-1 bg-muted/40 rounded-xl mx-4 mt-4 mb-2 border border-border shrink-0">
                    <button onClick={() => setActiveTab('subjects')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'subjects' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Subject Breakdown</button>
                    <button onClick={() => setActiveTab('students')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'students' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Student Status</button>
                </div>
                <div className="px-4 md:px-6 pb-6 overflow-y-auto custom-scrollbar flex-1 space-y-3">
                    {activeTab === 'subjects' && (
                        classCourses.length > 0 ? classCourses.map((course: Course) => {
                            const todayRecord = course.attendanceRecords?.find(r => new Date(r.date).toDateString() === todayStr);
                            let pct = 0, hasClassToday = false, presentCount = 0, totalStudents = 0;
                            if (todayRecord && todayRecord.records) {
                                totalStudents = Object.keys(todayRecord.records).length;
                                if (todayRecord.records) {
                                    presentCount = Object.values(todayRecord.records).filter((s:any) => s.status === 'present').length;
                                }
                                if (totalStudents > 0) { pct = Math.round((presentCount / totalStudents) * 100); hasClassToday = true; }
                            }
                            const facultyMember = faculty.find((f: any) => f.id === course.facultyId);
                            return (
                                <div key={course.id} className="bg-card hover:bg-muted/10 p-4 rounded-xl border border-border transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-bold text-foreground text-sm md:text-base">{course.subject}</h4>
                                            <div className="flex items-center gap-2 mt-1"><Avatar src={facultyMember?.avatarUrl} name={facultyMember?.name || 'Unassigned'} size="xs" /><p className="text-xs text-muted-foreground font-medium">{facultyMember ? facultyMember.name : 'Unassigned'}</p></div>
                                        </div>
                                        <div className="text-right">
                                            {hasClassToday ? (
                                                <>
                                                    <span className={`text-lg font-black ${pct < 75 ? 'text-red-500' : 'text-emerald-500'}`}>{pct}%</span>
                                                    <p className="text-[10px] text-muted-foreground font-bold">{presentCount}/{totalStudents} Present</p>
                                                </>
                                            ) : (
                                                <span className="text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">Not Conducted</span>
                                            )}
                                        </div>
                                    </div>
                                    {hasClassToday && (
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${pct < 75 ? 'bg-red-500' : pct < 85 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }}/></div>
                                    )}
                                </div>
                            )
                        }) : <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-xl border border-border border-dashed text-sm">No subjects mapped to this class.</div>
                    )}
                    {activeTab === 'students' && (
                        classStudents.length > 0 ? (
                            <div className="space-y-1">
                                <div className="flex justify-between px-2 pb-2 text-[10px] font-black uppercase text-muted-foreground tracking-wider"><span>Student</span><span>Today's Status</span></div>
                                {classStudents.map((student: User) => {
                                    const attendanceDetails = classCourses.map(course => {
                                        const todayRecord = course.attendanceRecords?.find(r => new Date(r.date).toDateString() === todayStr);
                                        if (!todayRecord || !todayRecord.records) return null; 
                                        
                                        const status = todayRecord.records[student.id]?.status;
                                        return {
                                            subject: course.subject,
                                            status: status
                                        };
                                    }).filter(item => item !== null);

                                    return (
                                        <div key={student.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-card border border-border rounded-xl hover:bg-muted/20 transition-colors gap-3">
                                            <div className="flex items-center gap-3 overflow-hidden min-w-[200px]">
                                                <div className="w-8 text-xs font-mono text-muted-foreground font-bold">{student.rollNo || '-'}</div>
                                                <div className="flex items-center gap-2 overflow-hidden"><Avatar src={student.avatarUrl} name={student.name} size="sm" /><span className="font-bold text-sm truncate max-w-[140px]">{student.name}</span></div>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-2 justify-end flex-1">
                                                {attendanceDetails.length > 0 ? (
                                                    attendanceDetails.map((detail: any, idx: number) => {
                                                        const isPresent = detail.status === 'present';
                                                        const isAbsent = detail.status === 'absent';
                                                        return (
                                                            <div key={idx} className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold border ${isPresent ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : isAbsent ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
                                                                <span className="uppercase max-w-[60px] truncate">{detail.subject}</span>
                                                                <span className="w-px h-3 bg-current opacity-20"></span>
                                                                <span>{isPresent ? 'P' : isAbsent ? 'A' : '-'}</span>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">No classes conducted</span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-xl border border-border border-dashed text-sm">No students found.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AdvancedDashboardHome = ({ 
    stats, 
    quickActions, 
    approvals, 
    atRiskStudents,
    activeClasses,
    classAttendanceStats,
    courseDetails, 
    timetables,
    onClassClick 
}: any) => {
    // ... [No changes to AdvancedDashboardHome] ...
    const [currentTime, setCurrentTime] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000); 
        return () => clearInterval(timer);
    }, []);

    // Calculate Live Lectures Logic
    const liveLectures = useMemo(() => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDayIndex = currentTime.getDay();
        const currentDayName = days[currentDayIndex];
        const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

        const parseTimeStr = (timeStr: string) => {
            if (!timeStr) return -1;
            const normalized = timeStr.toLowerCase().trim();
            const isPM = normalized.includes('pm');
            const isAM = normalized.includes('am');
            const cleanTime = normalized.replace(/[a-z]/g, '').trim();
            const [hStr, mStr] = cleanTime.split(':');
            let hours = parseInt(hStr, 10);
            const minutes = parseInt(mStr, 10) || 0;
            if (isNaN(hours)) return -1;
            if (isPM && hours < 12) hours += 12;
            if (isAM && hours === 12) hours = 0;
            if (!isPM && !isAM && hours < 7) hours += 12; 
            return hours * 60 + minutes;
        };

        const activeSlot = courseDetails.slots.find((slot: TimeSlot) => {
            if (!slot.label.includes('-')) return false;
            const [startStr, endStr] = slot.label.split('-').map(s => s.trim());
            const startMin = parseTimeStr(startStr);
            const endMin = parseTimeStr(endStr);
            if (startMin === -1 || endMin === -1) return false;
            return currentMinutes >= startMin && currentMinutes < endMin;
        });

        if (!activeSlot) return [];

        const active: any[] = [];
        const timetableEntries = Object.entries(timetables as { [classId: string]: TimetableData });
        
        timetableEntries.forEach(([classId, schedule]) => {
            const daySchedule = schedule[currentDayName];
            if (daySchedule) {
                const cell = daySchedule[activeSlot.id];
                if (cell && cell.facultyId && cell.subjectId) {
                    const teacher = courseDetails.faculty.find((f: any) => f.id === cell.facultyId);
                    const course = courseDetails.courses.find((c: any) => c.id === cell.subjectId);
                    const [year, div] = classId.split('-');
                    
                    if (teacher) {
                        active.push({
                            teacherName: teacher.name,
                            teacherAvatar: teacher.avatarUrl,
                            subject: course?.subject || 'Unknown Subject',
                            classInfo: `Year ${year} - ${div}`,
                            room: cell.roomId || 'N/A'
                        });
                    }
                }
            }
        });
        return active;
    }, [timetables, currentTime, courseDetails]);

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return { live: liveLectures, status: 'all' };
        const lowerQuery = searchQuery.toLowerCase();
        const liveMatches = liveLectures.filter((l: any) => l.teacherName.toLowerCase().includes(lowerQuery));
        if (liveMatches.length > 0) return { live: liveMatches, status: 'busy' };
        const facultyMatches = courseDetails.faculty.filter((f: any) => f.name.toLowerCase().includes(lowerQuery));
        if (facultyMatches.length > 0) return { live: [], status: 'free', teachers: facultyMatches };
        return { live: [], status: 'not_found' };
    }, [searchQuery, liveLectures, courseDetails.faculty]);

    return (
        <div className="space-y-8 animate-fade-in">
            <h1 className="text-3xl font-black text-foreground mb-6">HOD Dashboard Overview</h1>

            <div className="bg-slate-950 text-white rounded-3xl border border-slate-800 shadow-xl p-8 relative overflow-hidden min-h-[320px] flex flex-col">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></div>
                        <h2 className="text-lg font-bold">Live Lectures Now</h2>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-none"><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Check teacher availability..." className="w-full sm:w-64 bg-slate-900 border border-slate-700 rounded-full pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-300 placeholder:text-slate-500" /></div>
                        <span className="text-xs font-mono font-medium text-slate-400 hidden sm:block">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                </div>
                <div className="relative z-10 min-h-[100px]">
                    {searchResults.status === 'all' && (liveLectures.length > 0 ? (
                        <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                            {liveLectures.map((lecture: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800 hover:bg-slate-800/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Avatar src={lecture.teacherAvatar} name={lecture.teacherName} size="sm" className="border border-slate-700" />
                                        <div><p className="font-bold text-sm text-slate-200">{lecture.teacherName}</p><p className="text-[10px] text-slate-400 uppercase tracking-wide">{lecture.subject}</p></div>
                                    </div>
                                    <div className="text-right"><span className="text-[10px] font-bold bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md text-slate-300">{lecture.classInfo}</span><p className="text-[10px] text-indigo-400 font-bold mt-1"><MapPinIcon className="w-3 h-3 inline mr-1"/>{lecture.room}</p></div>
                                </div>
                            ))}
                        </div>
                    ) : <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm"><p>No lectures are currently in progress.</p></div>)}
                    
                    {searchResults.status === 'busy' && (
                         <div className="flex flex-col gap-2">{searchResults.live.map((lecture: any, i: number) => (<div key={i} className="p-3 bg-red-900/20 border border-red-900/50 rounded-xl flex items-center gap-3"><Avatar src={lecture.teacherAvatar} name={lecture.teacherName} size="sm"/><div><p className="text-sm font-bold text-red-200">{lecture.teacherName} is busy.</p><p className="text-xs text-red-300/70">Teaching {lecture.subject} in {lecture.classInfo}</p></div></div>))}</div>
                    )}
                    {searchResults.status === 'free' && (<div className="flex flex-col gap-2">{searchResults.teachers.map((t: any) => (<div key={t.id} className="p-3 bg-emerald-900/20 border border-emerald-900/50 rounded-xl flex items-center gap-3"><Avatar src={t.avatarUrl} name={t.name} size="sm"/><div><p className="text-sm font-bold text-emerald-200">{t.name} is available.</p><p className="text-xs text-emerald-300/70">Currently free.</p></div></div>))}</div>)}
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                    <div className="relative z-10 flex justify-between items-end">
                        <div><p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mb-1">Dept Health</p><h3 className="text-4xl font-black tracking-tighter">{stats.dailyAttendance}%</h3><p className="text-xs font-bold text-indigo-200 mt-1 opacity-80">Daily Attd.</p></div>
                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm shadow-inner"><ActivityIcon className="w-6 h-6 text-white"/></div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                    <div className="relative z-10 flex justify-between items-end">
                        <div><p className="text-cyan-100 text-[10px] font-black uppercase tracking-widest mb-1">Dept Health</p><h3 className="text-4xl font-black tracking-tighter">{stats.overallAttendance}%</h3><p className="text-xs font-bold text-cyan-200 mt-1 opacity-80">Avg Attd.</p></div>
                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm shadow-inner"><TrendingUpIcon className="w-6 h-6 text-white"/></div>
                    </div>
                </div>
                <StatCard label="Total Faculty" value={stats.facultyCount} icon={UserPlusIcon} colorClass="bg-purple-500/10 text-purple-600 dark:text-purple-400" onClick={() => quickActions.onViewFaculty()} />
                <StatCard label="Total Students" value={stats.studentCount} icon={UsersIcon} colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400" onClick={() => quickActions.onViewStudents()} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 <div className="md:col-span-1"><StatCard label="Active Subjects" value={stats.classesCount} icon={BookOpenIcon} colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" onClick={() => quickActions.onViewClasses()} /></div>
            </div>

            {activeClasses.length > 0 && (
                <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2"><ChartBarIcon className="w-4 h-4"/> Daily Attendance (Today)</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {activeClasses.map((cls: any) => {
                            const pct = classAttendanceStats[`${cls.year}-${cls.division}`];
                            const hasData = pct !== undefined && pct !== -1;
                            return (
                                <button key={`${cls.year}-${cls.division}`} onClick={() => onClassClick(cls)} className="p-4 bg-muted/20 border border-border rounded-2xl flex flex-col justify-between min-h-[80px] hover:border-primary/30 transition-all group text-left">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="p-1.5 bg-primary/10 text-primary rounded-lg group-hover:bg-primary group-hover:text-white transition-colors"><UsersIcon className="w-3 h-3"/></div>
                                        <span className={`text-xs font-bold ${!hasData ? 'text-muted-foreground' : pct < 75 ? 'text-red-500' : 'text-emerald-500'}`}>{hasData ? `${pct}%` : '-'}</span>
                                    </div>
                                    <p className="text-[10px] font-black text-foreground uppercase tracking-wide">Yr {cls.year} - {cls.division}</p>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex flex-col">
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2"><ClockIcon className="w-4 h-4"/> Pending Actions</h3>
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                            <div><p className="font-bold text-rose-600 dark:text-rose-400 text-sm">Approvals Needed</p><p className="text-[10px] font-bold text-rose-600/60 dark:text-rose-400/60 uppercase tracking-wide mt-0.5">{approvals.length} Requests</p></div>
                            <button onClick={() => quickActions.onViewApprovals()} className="px-4 py-2 bg-card border border-border text-foreground text-xs font-bold rounded-xl hover:bg-muted transition-colors shadow-sm">Review</button>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                            <div><p className="font-bold text-amber-600 dark:text-amber-400 text-sm">At-Risk Students</p><p className="text-[10px] font-bold text-amber-600/60 dark:text-amber-400/60 uppercase tracking-wide mt-0.5">{atRiskStudents.length} Students</p></div>
                            <button onClick={() => quickActions.onViewAtRisk()} className="px-4 py-2 bg-card border border-border text-foreground text-xs font-bold rounded-xl hover:bg-muted transition-colors shadow-sm">View</button>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-2">
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <QuickActionBtn label="Add Faculty" icon={UserPlusIcon} onClick={quickActions.onAddFaculty} color="bg-purple-600" />
                        <QuickActionBtn label="Add Student" icon={UsersIcon} onClick={quickActions.onAddStudent} color="bg-blue-600" />
                        <QuickActionBtn label="Post Notice" icon={MegaphoneIcon} onClick={quickActions.onPostNotice} color="bg-amber-500" />
                        <QuickActionBtn label="Manage Classes" icon={BookOpenIcon} onClick={quickActions.onCreateClass} color="bg-emerald-600" />
                    </div>
                </div>
            </div>
        </div>
    )
}

interface HodPageProps {
    currentUser: User;
    onNavigate: (path: string) => void;
    currentPath: string;
    courses: Course[];
    onCreateCourse: (course: any) => void;
    onUpdateCourse: (courseId: string, data: any) => void;
    onDeleteCourse: (courseId: string) => void;
    notices: Notice[];
    users: { [key: string]: User };
    allUsers: User[];
    onCreateNotice: (notice: any) => void;
    onDeleteNotice: (id: string) => void;
    departmentChats: any[];
    onSendDepartmentMessage: any;
    onCreateUser: (user: any) => void;
    onCreateUsersBatch: (users: any[]) => void;
    onApproveTeacherRequest: (id: string) => void;
    onDeclineTeacherRequest: (id: string) => void;
    colleges: College[];
    onUpdateCourseFaculty: any;
    onUpdateCollegeClasses: (collegeId: string, dept: string, classes: any) => void;
    onUpdateCollege: (id: string, data: any) => void;
    onDeleteUser: (id: string) => void;
    onToggleFreezeUser: (id: string) => void;
    onUpdateUserRole: (id: string, role: UserTag) => void;
    onUpdateUser: (id: string, data: any) => void;
    onCreateOrOpenConversation: (id: string) => Promise<string>;
    onSendCourseMessage?: (courseId: string, text: string) => void;
}

const HodPage: React.FC<HodPageProps> = (props) => {
    const { 
        currentUser, onNavigate, currentPath, courses, onCreateCourse, onUpdateCourse, onDeleteCourse,
        notices, users, allUsers, onCreateNotice, onDeleteNotice, 
        departmentChats, onSendDepartmentMessage, onCreateUser, onCreateUsersBatch,
        onApproveTeacherRequest, onDeclineTeacherRequest, colleges, onUpdateCourseFaculty,
        onUpdateCollegeClasses, onUpdateCollege, onDeleteUser, onToggleFreezeUser, onUpdateUserRole, onUpdateUser, onCreateOrOpenConversation,
        onSendCourseMessage 
    } = props;

    const [activeSection, setActiveSection] = useState<'dashboard' | 'classes' | 'timetable' | 'faculty' | 'students' | 'notices' | 'approvals' | 'at-risk'>('dashboard');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    
    // --- State for Modals and Features ---
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreateClassModalOpen, setIsCreateClassModalOpen] = useState(false); // Added for New Modal
    const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false); // Added for New Modal
    const [editClassData, setEditClassData] = useState<{ year: number; division: string } | null>(null);
    const [editSubjectData, setEditSubjectData] = useState<{ id: string; subject: string } | null>(null);
    const [createCourseDefaultClass, setCreateCourseDefaultClass] = useState<string | null>(null);
    const [expandedClass, setExpandedClass] = useState<string | null>(null);

    const [isCreateNoticeModalOpen, setIsCreateNoticeModalOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState<{year: number, division: string} | null>(null);
    const [selectedClassForPerf, setSelectedClassForPerf] = useState<{year: number, division: string} | null>(null);
    const [viewImage, setViewImage] = useState<string | null>(null);

    // NEW STATE: For Assigning Faculty
    const [courseToAssignFaculty, setCourseToAssignFaculty] = useState<Course | null>(null);
    const [assignSearch, setAssignSearch] = useState(''); // NEW SEARCH STATE

    const handleLogout = async () => { await auth.signOut(); onNavigate('#/'); };

    // Derived State
    const department = currentUser.department;
    const college = colleges.find(c => c.id === currentUser.collegeId);
    const deptCourses = courses.filter(c => c.department === department);
    const deptNotices = notices.filter(n => (n.targetDept === department || n.authorId === currentUser.id)); 
    const deptFaculty = allUsers.filter(u => u.collegeId === currentUser.collegeId && u.department === department && (u.tag === 'Teacher' || u.tag === 'HOD/Dean'));
    const deptStudents = allUsers.filter(u => u.collegeId === currentUser.collegeId && u.department === department && u.tag === 'Student');
    
    // Get list for Faculty Assignment in HOD View (Only show own department + self)
    // REMOVED isApproved check to allow pending teachers to be assigned immediately
    const eligibleFacultyForAssignment = useMemo(() => {
        if (!college) return [];
        return allUsers.filter((u: any) => 
            u.collegeId === college.id && 
            // u.isApproved && // <--- Removed strict approval check
            u.department === department && // Filter by department
            (u.tag === 'Teacher' || u.tag === 'HOD/Dean' || u.tag === 'Director')
        );
    }, [allUsers, college, department]);

    // FILTERED LIST FOR ASSIGNMENT
    const filteredFacultyForAssignment = useMemo(() => {
        if (!assignSearch.trim()) return eligibleFacultyForAssignment;
        const lowerSearch = assignSearch.toLowerCase();
        return eligibleFacultyForAssignment.filter(f => 
            f.name.toLowerCase().includes(lowerSearch) || 
            f.email.toLowerCase().includes(lowerSearch)
        );
    }, [eligibleFacultyForAssignment, assignSearch]);

    const activeClasses = useMemo(() => {
        const deptClassesRaw = college?.classes?.[department] || {};
        const classes: { year: number; division: string }[] = [];
        Object.entries(deptClassesRaw).forEach(([year, divs]) => {
            (divs as string[]).forEach(div => classes.push({ year: parseInt(year), division: div }));
        });
        return classes;
    }, [college, department]);

    const activeYears = useMemo(() => Array.from(new Set(activeClasses.map(c => c.year))).sort(), [activeClasses]);
    const pendingApprovals = deptFaculty.filter(f => !f.isApproved);
    const pendingStudents = deptStudents.filter(s => !s.isApproved); 
    const allPending = [...pendingApprovals, ...pendingStudents]; 
    const timetables = college?.timetable || {};
    const timeSlots = college?.timeSlots || [];
    const timeSlotsByClass = college?.timeSlotsByClass || {};

    // Calculate all user emails for duplicate checking
    const allUserEmails = useMemo(() => allUsers.map(u => u.email), [allUsers]);

    const deptAvgAttendance = useMemo(() => {
        let totalPresent = 0;
        let totalInstances = 0;
        deptCourses.forEach(course => {
            course.attendanceRecords?.forEach(record => {
                if (record.records) {
                    const statuses = Object.values(record.records);
                    totalInstances += statuses.length;
                    totalPresent += statuses.filter(s => (s as any).status === 'present').length;
                }
            });
        });
        return totalInstances > 0 ? Math.round((totalPresent / totalInstances) * 100) : 0;
    }, [deptCourses]);

    const classTodayAttendanceStats = useMemo(() => {
        const stats: Record<string, { totalPct: number, sessionCount: number }> = {};
        const todayStr = new Date().toDateString();
        deptCourses.forEach(course => {
            const classKey = `${course.year}-${course.division}`;
            const todayRecord = course.attendanceRecords?.find(r => new Date(r.date).toDateString() === todayStr);
            if (todayRecord && todayRecord.records) {
                const statuses = Object.values(todayRecord.records);
                if (statuses.length > 0) {
                    const presentCount = statuses.filter((s: any) => s.status === 'present').length;
                    const sessionPct = Math.round((presentCount / statuses.length) * 100);
                    if (!stats[classKey]) { stats[classKey] = { totalPct: 0, sessionCount: 0 }; }
                    stats[classKey].totalPct += sessionPct;
                    stats[classKey].sessionCount += 1;
                }
            }
        });
        const finalStats: Record<string, number> = {};
        Object.entries(stats).forEach(([key, val]) => {
            finalStats[key] = Math.round(val.totalPct / val.sessionCount);
        });
        return finalStats;
    }, [deptCourses]);

    // --- Stats for Class Boxes (Count & Avg) ---
    const classStats = useMemo(() => {
        const data: Record<string, { count: number, avg: number }> = {};
        activeClasses.forEach(cls => {
            const key = `${cls.year}-${cls.division}`;
            const cnt = deptStudents.filter(s => s.yearOfStudy === cls.year && s.division === cls.division).length;
            
            const courses = deptCourses.filter(c => c.year === cls.year && c.division === cls.division);
            let p = 0, t = 0;
            courses.forEach(c => {
                c.attendanceRecords?.forEach(r => {
                    if (r.records) {
                        Object.values(r.records).forEach((s:any) => {
                            t++; if(s.status === 'present') p++;
                        });
                    }
                });
            });
            const avg = t > 0 ? Math.round((p/t)*100) : 0;
            data[key] = { count: cnt, avg };
        });
        return data;
    }, [activeClasses, deptStudents, deptCourses]);

    const atRiskStudents = useMemo(() => {
        const list: any[] = [];
        deptStudents.forEach(student => {
            let hasRisk = false;
            deptCourses.forEach(course => {
                const records = course.attendanceRecords || [];
                const studentRecords = records.filter(r => r.records && r.records[student.id]);
                if (studentRecords.length > 0) { 
                    const presentCount = studentRecords.filter(r => r.records[student.id].status === 'present').length;
                    const pct = Math.round((presentCount / studentRecords.length) * 100);
                    if (pct < 75) hasRisk = true;
                }
            });
            if (hasRisk) list.push(student);
        });
        return list;
    }, [deptStudents, deptCourses]);

    const stats = {
        facultyCount: deptFaculty.length,
        studentCount: deptStudents.length,
        pendingCount: allPending.length,
        avgAttendance: deptAvgAttendance,
        overallAttendance: deptAvgAttendance,
        dailyAttendance: 0, 
        classesCount: activeClasses.length
    };

    const quickActions = {
        onAddFaculty: () => { setActiveSection('faculty'); },
        onAddStudent: () => { setActiveSection('students'); },
        onPostNotice: () => { setIsCreateNoticeModalOpen(true); },
        onCreateClass: () => { setActiveSection('classes'); setIsCreateClassModalOpen(true); },
        onViewFaculty: () => setActiveSection('faculty'),
        onViewStudents: () => setActiveSection('students'),
        onViewClasses: () => setActiveSection('classes'),
        onViewApprovals: () => setActiveSection('approvals'),
        onViewAtRisk: () => setActiveSection('at-risk'), 
    };

    // --- Delete Class Logic ---
    const handleDeleteClass = async (year: number, division: string) => {
        if (!window.confirm(`Are you sure you want to delete Class Year ${year} - Division ${division}? This will remove all subjects in this class.`)) return;
        
        const updatedClasses = { ...(college.classes?.[department] || {}) };
        if (updatedClasses[year]) {
            updatedClasses[year] = updatedClasses[year].filter((d: string) => d !== division);
            if (updatedClasses[year].length === 0) {
                delete updatedClasses[year];
            }
            onUpdateCollegeClasses(college.id, department, updatedClasses);
        }

        const toDelete = deptCourses.filter(c => c.year === year && (c.division || '').toUpperCase() === division.toUpperCase());
        for (const c of toDelete) {
            await onDeleteCourse(c.id);
        }
    };

    const handleEditClass = async (fromYear: number, fromDiv: string, toYear: number, toDiv: string) => {
        if (!college?.classes?.[department]) return;
        const updatedClasses = { ...(college.classes?.[department] || {}) };
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
        onUpdateCollegeClasses(college.id, department, updatedClasses);

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

    // --- Duplicate Check for Batch Upload ---
    const handleBatchUpload = async (newUsersData: any[]) => {
        const existingEmails = new Set(allUsers.map(u => u.email.toLowerCase().trim()));
        const existingRolls = new Set(allUsers.filter(u => u.rollNo).map(u => u.rollNo!.toLowerCase().trim()));
        const filteredData = newUsersData.filter(user => {
            const emailExists = existingEmails.has(user.email.toLowerCase().trim());
            const rollExists = user.rollNo && existingRolls.has(user.rollNo.toLowerCase().trim());
            return !(emailExists || rollExists);
        });
        const skippedCount = newUsersData.length - filteredData.length;
        if (filteredData.length === 0) {
            alert(`Upload Skipped: All ${newUsersData.length} users already exist.`);
            return { successCount: 0, errors: [] };
        }
        if (skippedCount > 0) {
            if (!window.confirm(`${skippedCount} duplicates skipped. Add ${filteredData.length} unique users?`)) return { successCount: 0, errors: [] };
        }
        return onCreateUsersBatch(filteredData);
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

    if (!college) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="bg-background min-h-screen flex flex-col">
            <Header currentUser={currentUser} onLogout={handleLogout} onNavigate={onNavigate} currentPath={currentPath} />
            
            <div className="md:hidden bg-card border-b border-border p-4 flex justify-between items-center sticky top-16 z-30 shadow-sm backdrop-blur-md bg-opacity-90">
                <div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-xl"><ChartPieIcon className="w-5 h-5 text-primary"/></div><span className="font-black text-lg uppercase tracking-tighter text-foreground">{activeSection}</span></div>
                <button onClick={() => setMobileMenuOpen(true)} className="p-2.5 rounded-2xl bg-muted text-foreground active:scale-90 transition-transform"><MenuIcon className="w-6 h-6" /></button>
            </div>

            <div className="flex flex-1 overflow-hidden w-full relative">
                {/* Sidebar */}
                <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-card border-r border-border transform transition-transform duration-500 ease-in-out md:relative md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="p-8 h-full overflow-y-auto flex flex-col">
                        <div className="flex items-center gap-3 mb-10 px-2">
                             <div className="w-10 h-10 rounded-[1.25rem] bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-lg"><BuildingIcon className="w-5 h-5"/></div>
                             <div><h3 className="font-black text-sm tracking-tight text-foreground truncate max-w-[140px]">{department}</h3><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Department Head</p></div>
                        </div>

                        <div className="space-y-1.5 flex-1">
                            <SidebarItem id="dashboard" label="Overview" icon={ChartPieIcon} onClick={() => navigateToSection('dashboard')} active={activeSection === 'dashboard'} />
                            <SidebarItem id="classes" label="Academics" icon={BookOpenIcon} onClick={() => navigateToSection('classes')} active={activeSection === 'classes'} />
                            <SidebarItem id="timetable" label="Timetable" icon={CalendarIcon} onClick={() => navigateToSection('timetable')} active={activeSection === 'timetable'} />
                            <SidebarItem id="faculty" label="Faculty" icon={UserPlusIcon} onClick={() => navigateToSection('faculty')} active={activeSection === 'faculty'} />
                            <SidebarItem id="students" label="Students" icon={UsersIcon} onClick={() => navigateToSection('students')} active={activeSection === 'students'} />
                            <SidebarItem id="at-risk" label="Risk Monitoring" icon={AlertTriangleIcon} onClick={() => navigateToSection('at-risk')} active={activeSection === 'at-risk'} />
                            <SidebarItem id="notices" label="Notices" icon={MegaphoneIcon} onClick={() => navigateToSection('notices')} active={activeSection === 'notices'} />
                            <SidebarItem id="approvals" label="Approvals" icon={CheckCircleIcon} onClick={() => navigateToSection('approvals')} active={activeSection === 'approvals'} />
                        </div>
                    </div>
                </aside>
                
                {mobileMenuOpen && <div className="fixed inset-0 z-30 bg-black/60 md:hidden backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>}

                {/* Main Content */}
                <main className="flex-1 p-4 md:p-10 overflow-y-auto h-[calc(100vh-112px)] md:h-[calc(100vh-64px)] bg-muted/5 pb-32 lg:pb-10 custom-scrollbar text-left">
                    {activeSection === 'dashboard' && (
                        <AdvancedDashboardHome 
                            stats={stats} 
                            quickActions={quickActions}
                            approvals={allPending}
                            atRiskStudents={atRiskStudents}
                            activeClasses={activeClasses}
                            classAttendanceStats={classTodayAttendanceStats}
                            courseDetails={{ courses: deptCourses, faculty: allUsers, slots: timeSlots }}
                            timetables={timetables}
                            onClassClick={(cls: any) => setSelectedClassForPerf(cls)}
                            students={deptStudents}
                        />
                    )}

                    {/* --- REPLACED ACADEMICS SECTION START --- */}
                    {activeSection === 'classes' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-3xl font-black text-foreground tracking-tighter">Academic Portfolio</h2>
                                    <p className="text-muted-foreground text-lg">Manage classes and subjects for {department}.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsCreateCourseModalOpen(true)}
                                        className="bg-card text-foreground border border-border px-5 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-muted transition-all active:scale-95"
                                    >
                                        <BookOpenIcon className="w-5 h-5 text-primary" />
                                        Add Subject
                                    </button>
                                    <button
                                        onClick={() => setIsCreateClassModalOpen(true)}
                                        className="bg-primary text-white px-5 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                                    >
                                        <PlusIcon className="w-5 h-5" />
                                        Create Class
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-4">
                                {activeClasses.length > 0 ? (
                                    activeClasses.sort((a:any, b:any) => a.year - b.year || a.division.localeCompare(b.division)).map((cls: any) => {
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
                                                                    const teacher = allUsers.find((u: any) => u.id === sub.facultyId);
                                                                    
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
                            activeClasses={activeClasses}
                            deptCourses={deptCourses}
                            faculty={deptFaculty}
                            timetables={timetables}
                            onUpdateTimetables={(t:any)=>onUpdateCollege(college.id, {timetable: t})}
                            slots={timeSlots}
                            slotsByClass={timeSlotsByClass}
                            onUpdateSlots={(s:any)=>onUpdateCollege(college.id, {timeSlots: s})}
                            onUpdateSlotsByClass={(classId: string, s: any)=>onUpdateCollege(college.id, {timeSlotsByClass: { ...timeSlotsByClass, [classId]: s }})}
                            onSaveAll={() => { /* Auto saved via updates */ }}
                        />
                    )}
                    {activeSection === 'faculty' && <UserDirectory type="Teacher" users={deptFaculty} onCreateUser={handleCreateUser} onCreateUsersBatch={handleBatchUpload} department={department} activeCourses={deptCourses} onDeleteUser={onDeleteUser} onUpdateUser={onUpdateUser} existingEmails={allUserEmails} />}
                    {activeSection === 'students' && (
                        <UserDirectory 
                            availableYears={activeYears} 
                            activeClasses={activeClasses} // Passed activeClasses for student forms
                            type="Student" 
                            users={deptStudents} 
                            onCreateUser={handleCreateUser} 
                            onCreateUsersBatch={handleBatchUpload} 
                            department={department} 
                            activeCourses={deptCourses} 
                            onDeleteUser={onDeleteUser} 
                            onUpdateUser={onUpdateUser} 
                            existingEmails={allUserEmails} 
                        />
                    )}
                    {activeSection === 'at-risk' && (
                        <AtRiskView 
                            students={deptStudents} 
                            courses={deptCourses} 
                            onNavigateToProfile={(uid: string) => onNavigate(`#/profile/${uid}`)}
                            onCreateConvo={onCreateOrOpenConversation}
                        />
                    )}
                    {activeSection === 'notices' && (
                        <BroadcastManager 
                            notices={notices} 
                            onCreateNotice={onCreateNotice} 
                            onDeleteNotice={onDeleteNotice} 
                            currentUser={currentUser} 
                            college={college} 
                            courses={deptCourses}
                            allUsers={allUsers} 
                        />
                    )}
                    {activeSection === 'approvals' && (
                        <div className="space-y-10 animate-fade-in max-w-5xl mx-auto">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div><h2 className="text-3xl font-black text-foreground tracking-tighter">Verification Queue</h2><p className="text-muted-foreground text-lg">Approve institutional access for registered faculty and students.</p></div>
                                <div className="px-5 py-2 bg-amber-500/10 text-amber-600 rounded-full text-xs font-black uppercase tracking-widest border border-amber-500/20">{allPending.length} Required</div>
                            </div>
                            <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-muted/30 text-muted-foreground font-black text-[10px] uppercase tracking-[0.25em] border-b border-border">
                                            <tr><th className="p-6">Applicant Profile</th><th className="p-6">Requested Role</th><th className="p-6 text-right">Verification</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {allPending.length > 0 ? allPending.map((user:any) => (
                                                <tr key={user.id} className="hover:bg-muted/10 transition-colors group">
                                                    <td className="p-6"><div className="flex items-center gap-4"><Avatar src={user.avatarUrl} name={user.name} size="md" className="shadow-md ring-2 ring-card group-hover:ring-primary/20 transition-all"/><div className="min-w-0"><p className="font-black text-foreground tracking-tight leading-none mb-1 group-hover:text-primary transition-colors">{user.name}</p><p className="text-[10px] text-muted-foreground font-bold truncate">{user.email}</p></div></div></td>
                                                    <td className="p-6 align-middle"><span className="px-3 py-1 bg-muted rounded-lg text-[10px] font-black uppercase tracking-widest text-muted-foreground border border-border">{user.tag}</span></td>
                                                    <td className="p-6 text-right align-middle"><div className="flex justify-end gap-3"><button onClick={() => onDeclineTeacherRequest(user.id)} className="px-5 py-2.5 bg-rose-500/10 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-white transition-all shadow-sm active:scale-95">Revoke</button><button onClick={() => onApproveTeacherRequest(user.id)} className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-95">Validate</button></div></td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan={3} className="p-24 text-center"><CheckCircleIcon className="w-16 h-16 mx-auto mb-4 text-emerald-500 opacity-20"/><p className="text-muted-foreground font-black text-xl uppercase tracking-tighter opacity-40">Queue cleared successfully</p></td></tr>
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
            {isCreateModalOpen && (
                <CreateSingleUserModal 
                    availableYears={activeYears} 
                    activeClasses={activeClasses} // Passed for Add Student popup
                    isOpen={isCreateModalOpen} 
                    onClose={() => setIsCreateModalOpen(false)} 
                    department={department} 
                    role="Student" 
                    onCreateUser={handleCreateUser} 
                    existingEmails={allUserEmails} 
                />
            )}
            {isCreateNoticeModalOpen && <CreateNoticeModal isOpen={isCreateNoticeModalOpen} onClose={() => setIsCreateNoticeModalOpen(false)} onCreateNotice={onCreateNotice} currentUser={currentUser} college={college} courses={courses} />}
            
            {/* NEW: Create Class Modal */}
            {isCreateClassModalOpen && (
                <CreateClassModal 
                    isOpen={isCreateClassModalOpen} 
                    onClose={() => setIsCreateClassModalOpen(false)} 
                    onCreate={(data: any) => onUpdateCollegeClasses(college.id, department, {...(college.classes?.[department] || {}), [data.year]: [...(college.classes?.[department]?.[data.year] || []), data.division]})}
                    existingClasses={activeClasses}
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
                    onCreate={(data: any) => onCreateCourse({ ...data, collegeId: college.id, department: department })}
                    activeClasses={activeClasses}
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
                        </div>

                        <div className="overflow-y-auto custom-scrollbar p-2 flex-1">
                            {filteredFacultyForAssignment.length > 0 ? (
                                <div className="space-y-1">
                                    {filteredFacultyForAssignment.map(f => (
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
                                <div className="text-center py-8 text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-60">No eligible faculty found</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <ImageLightbox src={viewImage} onClose={() => setViewImage(null)} />

            {selectedClassForPerf && (
                <ClassPerformanceModal 
                    isOpen={!!selectedClassForPerf}
                    onClose={() => setSelectedClassForPerf(null)}
                    classData={selectedClassForPerf}
                    courses={deptCourses}
                    faculty={allUsers}
                    onNavigateToClass={() => setActiveSection('classes')} 
                    students={deptStudents}
                />
            )}
            
            <BottomNavBar currentUser={currentUser} onNavigate={onNavigate} currentPage={currentPath}/>
        </div>
    );
};

export default HodPage;
