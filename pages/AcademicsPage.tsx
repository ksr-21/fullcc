import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Course, Notice, DepartmentChat, College, TimeSlot, TimetableData, Assignment, Note, TimetableCell } from '../types';
import Header from '../components/Header';
import BottomNavBar from '../components/BottomNavBar';
import Avatar from '../components/Avatar';
import { auth, db, compressImage } from '../api';
import { 
    BookOpenIcon, CloseIcon, PlusIcon, ArrowRightIcon, MegaphoneIcon, 
    TrashIcon, ClipboardListIcon,
    ChartPieIcon, CalendarIcon,
    CheckIcon, AlertTriangleIcon, UsersIcon, MapPinIcon, CoffeeIcon, ActivityIcon, TrendingUpIcon, PhotoIcon, CheckCircleIcon,
    ClockIcon, ChevronRightIcon, FilterIcon, EditIcon, SearchIcon, MenuIcon, EyeIcon, DownloadIcon,
    FileTextIcon, UploadIcon, SaveIcon, LayoutGridIcon, ListIcon, XCircleIcon, BeakerIcon
} from '../components/Icons';
import { TimetableManager } from '../components/AcademicManager';

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = "dwhm79co7";
const CLOUDINARY_UPLOAD_PRESET = "campus_connect_uploads";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatTimeValue = (time: string) => {
    if (!time) return '';
    const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return '';

    let hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    const amp = match[3];

    if (amp) {
        const upper = amp.toUpperCase();
        if (upper === 'PM' && hour < 12) hour += 12;
        if (upper === 'AM' && hour === 12) hour = 0;
    }

    const date = new Date();
    date.setHours(hour);
    date.setMinutes(minute);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatSlotLabel = (label: string) => {
    if (!label) return label;
    const parts = label.split('-').map(p => p.trim());
    if (parts.length < 2) {
        const formatted = formatTimeValue(label);
        return formatted || label;
    }
    const start = formatTimeValue(parts[0]);
    const end = formatTimeValue(parts[1]);
    if (!start || !end) return label;
    return `${start} - ${end}`;
};

const getSlotsForClass = (college: College | undefined, classId: string) => {
    if (!college) return [] as TimeSlot[];
    const classSlots = college.timeSlotsByClass?.[classId];
    if (classSlots && classSlots.length > 0) return classSlots;
    return college.timeSlots || [];
};

const getCellSubjectIds = (cell: any): string[] => {
    if (!cell) return [] as string[];
    if (cell.subjectIds && cell.subjectIds.length > 0) return cell.subjectIds as string[];
    if (cell.subjectId) return [cell.subjectId as string];
    return [];
};

const isDefinedString = (value: string | undefined): value is string => Boolean(value);

const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('resource_type', 'auto'); 
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Upload failed');
    }
    const data = await response.json();
    return data.secure_url;
};

// --- Interfaces ---

export interface AcademicsPageProps {
  currentUser: User;
  onNavigate: (path: string) => void;
  currentPath: string;
  courses: Course[];
  onCreateCourse: (courseData: Omit<Course, 'id' | 'facultyId'>) => void;
  onUpdateCourse: (id: string, data: any) => void;
  onDeleteCourse: (id: string) => void;
  notices: Notice[];
  users: { [key: string]: User };
  onCreateNotice: (noticeData: Omit<Notice, 'id' | 'authorId' | 'timestamp'> & { targetClasses?: string[] }) => void;
  onDeleteNotice: (noticeId: string) => void;
  onRequestToJoinCourse: (courseId: string) => void;
  departmentChats: DepartmentChat[];
  onSendDepartmentMessage: (department: string, channel: string, text: string) => void;
  onCreateUser: (userData: Omit<User, 'id'>, password?: string) => Promise<void>;
  onCreateUsersBatch: (usersData: Omit<User, 'id'>[]) => Promise<{ successCount: number; errors: any[] }>;
  onApproveTeacherRequest: (teacherId: string) => void;
  onDeclineTeacherRequest: (teacherId: string) => void;
  colleges: College[];
  onUpdateCollege: (id: string, data: any) => void;
}

// --- HELPER COMPONENTS ---

const SidebarItem = ({ id, label, icon: Icon, onClick, active }: any) => (
    <button 
        onClick={onClick} 
        className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative ${active ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
    >
        <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${active ? 'text-white' : 'text-muted-foreground group-hover:text-primary'}`} />
        <span className={`text-sm font-semibold ${active ? 'opacity-100' : 'opacity-80'}`}>{label}</span>
        {active && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
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
                className="relative w-full max-w-4xl max-h-[85vh] flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                <img 
                    src={src} 
                    alt="Full View" 
                    className="max-w-full max-h-full w-auto h-auto object-contain rounded-2xl shadow-2xl border border-white/10 bg-black" 
                />
            </div>
        </div>
    );
};

const DailyScheduleModal = ({ onClose, classes, onNavigate }: { onClose: () => void, classes: any[], onNavigate: (path: string) => void }) => {
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-card p-6 rounded-[2rem] shadow-2xl w-full max-w-lg border border-border max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-border/50">
                    <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                        <CalendarIcon className="w-6 h-6 text-primary"/> Today's Schedule
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors"><CloseIcon className="w-5 h-5 text-muted-foreground"/></button>
                </div>
                
                <div className="overflow-y-auto custom-scrollbar space-y-3 p-1">
                    {classes.length > 0 ? (
                        classes.map((cls, index) => (
                            <div key={index} className="flex items-center gap-4 p-4 bg-muted/30 border border-border/50 rounded-2xl hover:border-primary/30 transition-all group">
                                <div className="h-14 w-14 rounded-xl bg-background border border-border flex flex-col items-center justify-center shadow-sm text-foreground flex-shrink-0">
                                    <span className="text-xs font-black">{cls.time ? cls.time.split(' - ')[0] : 'Now'}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-base text-foreground truncate">{cls.subject}</h4>
                                    <div className="flex flex-col gap-1 mt-1">
                                         <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider w-fit">Room {cls.room || '-'}</span>
                                         {cls.facultyNames && cls.facultyNames.length > 0 && <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1"><UsersIcon className="w-3 h-3"/> {cls.facultyNames.join(', ')}</span>}
                                         {cls.displayClass && <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{cls.displayClass}</span>}
                                    </div>
                                </div>
                                <button onClick={() => { if(cls.id) onNavigate(`#/academics/${cls.id}`); onClose(); }} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-all">
                                    <ArrowRightIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground opacity-60">
                            <CoffeeIcon className="w-12 h-12 mb-2"/>
                            <p className="font-bold">No lectures scheduled today.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const NoticeCard = ({ notice, author, onDelete, onViewImage }: { notice: Notice & { targetClasses?: string[] }, author?: User, onDelete?: (id: string) => void, onViewImage?: (url: string) => void }) => {
    const isPriority = author?.tag === 'Director' || author?.tag === 'HOD/Dean';
    const borderColor = isPriority ? 'border-rose-500' : 'border-indigo-500/50';
    const badgeColor = isPriority ? 'bg-rose-500' : 'bg-indigo-600';
    const badgeText = author?.tag || 'Faculty';

    const renderTargets = () => {
        if (!notice.targetClasses || notice.targetClasses.length === 0 || notice.targetClasses.includes('ALL')) {
            return <span className="px-3 py-1.5 bg-[#1a1d26] rounded-lg text-[10px] text-gray-400 font-black uppercase tracking-wider border border-gray-800">TO: ALL</span>;
        }
        return (
            <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 bg-[#1a1d26] rounded-lg text-[10px] text-gray-400 font-black uppercase tracking-wider border border-gray-800">TO: STUDENT</span>
                {notice.targetClasses.slice(0, 3).map((target, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-[#0f292d] text-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-900/50">
                        {target.replace('-', ' DIV ')}
                    </span>
                ))}
                {notice.targetClasses.length > 3 && (
                     <span className="px-2 py-1.5 bg-[#1a1d26] rounded-lg text-[10px] text-gray-400 font-black border border-gray-800">+{notice.targetClasses.length - 3}</span>
                )}
            </div>
        );
    };

    return (
        <div className={`relative bg-[#0f111a] ${borderColor} border-[1.5px] rounded-[2rem] p-6 flex flex-col h-full min-h-[320px] shadow-2xl overflow-hidden group transition-all hover:scale-[1.01]`}>
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2 text-gray-400 text-[11px] font-bold uppercase tracking-widest">
                    <ClockIcon className="w-3.5 h-3.5" />
                    <span>
                        {new Date(notice.timestamp).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                        <span className="mx-1">•</span>
                        {new Date(notice.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <div className={`${badgeColor} text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg transform group-hover:scale-105 transition-transform`}>
                    {badgeText}
                </div>
            </div>

            <div className="flex-1">
                <h3 className="text-2xl font-black text-white mb-3 tracking-tight leading-tight">
                    {notice.title}
                </h3>
                
                {(notice.mediaUrl || notice.imageUrl) && (
                     <div 
                        onClick={() => onViewImage && onViewImage(notice.mediaUrl || notice.imageUrl!)}
                        className="mb-4 rounded-xl overflow-hidden h-32 w-full border border-gray-800 cursor-pointer relative group/img"
                     >
                        <img src={notice.mediaUrl || notice.imageUrl} alt="Notice media" className="w-full h-full object-cover opacity-80 group-hover/img:opacity-100 transition-opacity transform group-hover/img:scale-105 duration-500" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                            <EyeIcon className="w-6 h-6 text-white"/>
                        </div>
                     </div>
                )}

                <div className="text-gray-400 text-sm font-medium leading-relaxed line-clamp-4 whitespace-pre-line">
                     <div dangerouslySetInnerHTML={{__html: notice.content}}></div>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                    {renderTargets()}
                </div>
                
                {onDelete && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(notice.id); }}
                        className="p-2 text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                        title="Delete Notice"
                    >
                        <TrashIcon className="w-4 h-4"/>
                    </button>
                )}
            </div>
        </div>
    );
};

const CreateCourseModal = ({ onClose, onAddCourse, departmentOptions }: any) => {
    const [subject, setSubject] = useState('');
    const [department, setDepartment] = useState(departmentOptions[0] || '');
    const [year, setYear] = useState(1);
    const [division, setDivision] = useState('A');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddCourse({ subject, department, year, division });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-card p-6 rounded-2xl shadow-xl w-full max-w-md border border-border">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-foreground">Add New Course</h2>
                    <button onClick={onClose}><CloseIcon className="w-5 h-5 text-muted-foreground"/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Subject Name</label>
                        <input className="w-full p-3 border border-border rounded-xl bg-input text-foreground focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Data Structures" value={subject} onChange={e => setSubject(e.target.value)} required />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Department</label>
                        <select className="w-full p-3 border border-border rounded-xl bg-input text-foreground focus:ring-2 focus:ring-primary outline-none" value={department} onChange={e => setDepartment(e.target.value)}>
                            {departmentOptions.map((d: string) => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Year</label>
                            <select className="w-full p-3 border border-border rounded-xl bg-input text-foreground focus:ring-2 focus:ring-primary outline-none" value={year} onChange={e => setYear(parseInt(e.target.value))}>
                                {[1, 2, 3, 4, 5].map((y: number) => <option key={y} value={y}>Year {y}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Division</label>
                            <input className="w-full p-3 border border-border rounded-xl bg-input text-foreground focus:ring-2 focus:ring-primary outline-none" placeholder="A, B, C" value={division} onChange={e => setDivision(e.target.value)} required />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted rounded-xl">Cancel</button>
                        <button type="submit" className="px-6 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 shadow-md">Create Course</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CreateNoticeModal = ({ onClose, onCreateNotice, teachingClasses }: { onClose: () => void, onCreateNotice: any, teachingClasses: {id: string, label: string}[] }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedTargets, setSelectedTargets] = useState<string[]>(['ALL']); 
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const toggleTarget = (id: string) => {
        if (id === 'ALL') {
            setSelectedTargets(['ALL']);
            return;
        }

        let newTargets = [...selectedTargets];
        if (newTargets.includes('ALL')) {
            newTargets = []; 
        }

        if (newTargets.includes(id)) {
            newTargets = newTargets.filter(t => t !== id);
        } else {
            newTargets.push(id);
        }

        if (newTargets.length === 0) {
            setSelectedTargets(['ALL']);
        } else {
            setSelectedTargets(newTargets);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);
        try {
            let mediaUrl = '';
            if (imageFile) {
                const compressed = await compressImage(imageFile);
                mediaUrl = await uploadToCloudinary(compressed);
            }
            onCreateNotice({ 
                title, 
                content, 
                mediaUrl, 
                targetClasses: selectedTargets 
            });
            onClose();
        } catch (error) {
            console.error("Notice creation failed", error);
            alert("Failed to post announcement. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
            <div className="bg-[#0f111a] p-8 rounded-[2rem] shadow-2xl w-full max-w-lg border border-gray-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-white">New Broadcast</h2>
                        <p className="text-gray-400 text-xs uppercase tracking-widest font-bold mt-1">Post to Dashboard</p>
                    </div>
                    <button onClick={onClose} disabled={isUploading} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"><CloseIcon className="w-5 h-5 text-gray-400"/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block tracking-widest">Headline</label>
                        <input className="w-full p-4 border border-gray-800 rounded-2xl bg-[#151821] text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold" placeholder="e.g. Submission Deadline Extended" value={title} onChange={e => setTitle(e.target.value)} required disabled={isUploading} />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-500 mb-3 block tracking-widest">Target Audience</label>
                        <div className="flex flex-wrap gap-2">
                             <button
                                type="button"
                                onClick={() => toggleTarget('ALL')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${selectedTargets.includes('ALL') ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50' : 'bg-[#151821] border-gray-800 text-gray-400 hover:border-gray-600'}`}
                             >
                                All My Classes
                             </button>
                             {teachingClasses.map((cls) => (
                                 <button
                                    key={cls.id}
                                    type="button"
                                    onClick={() => toggleTarget(cls.id)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${selectedTargets.includes(cls.id) ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/50' : 'bg-[#151821] border-gray-800 text-gray-400 hover:border-gray-600'}`}
                                 >
                                    {cls.label}
                                 </button>
                             ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block tracking-widest">Message Body</label>
                        <textarea className="w-full p-4 border border-gray-800 rounded-2xl bg-[#151821] text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-medium" placeholder="Type your announcement details here..." value={content} onChange={e => setContent(e.target.value)} required rows={4} disabled={isUploading} />
                    </div>
                    
                    {imagePreview && (
                        <div className="relative rounded-2xl overflow-hidden border border-gray-800 h-40 group">
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            <button 
                                type="button" 
                                onClick={() => { setImageFile(null); setImagePreview(null); }}
                                className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full hover:bg-red-500 transition-colors backdrop-blur-sm"
                            >
                                <CloseIcon className="w-4 h-4"/>
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                        <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 text-sm font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wide"
                            disabled={isUploading}
                        >
                            <PhotoIcon className="w-5 h-5"/> {imagePreview ? 'Change Image' : 'Attach Image'}
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange}/>

                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="px-6 py-3 text-xs font-bold text-gray-400 hover:text-white rounded-xl uppercase tracking-wider" disabled={isUploading}>Cancel</button>
                            <button type="submit" className="px-8 py-3 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 uppercase tracking-wider flex items-center gap-2" disabled={isUploading}>
                                {isUploading ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Sending...</> : 'Broadcast'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Faculty Timetable View Component ---
const FacultyTimetableView = ({ college, currentUser, courses, users, selectedYear, selectedDiv }: { college: College | undefined, currentUser: User, courses: Course[], users: {[key:string]: User}, selectedYear?: number, selectedDiv?: string }) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const slots = useMemo(() => {
        if (!college) return [] as TimeSlot[];
        const map = new Map<string, TimeSlot>();
        (college.timeSlots || []).forEach(s => map.set(s.id, s));
        Object.values(college.timeSlotsByClass || {}).forEach(list => {
            list.forEach(s => {
                if (!map.has(s.id)) map.set(s.id, s);
            });
        });
        return Array.from(map.values());
    }, [college]);

    // Helper to find session for the current faculty at a specific day/time
    const getSessions = (day: string, slotId: string) => {
        if (!college?.timetable) return [];
        
        const mySessions: any[] = [];
        for (const [classId, classSchedule] of Object.entries(college.timetable)) {
            const daySchedule = (classSchedule as any)[day];
            const cell = daySchedule?.[slotId];
            
            // Check Standard Lecture
            const subjectIds = getCellSubjectIds(cell);
            if (cell && cell.type !== 'practical' && subjectIds.length > 0) {
                let effectiveFacultyIds: string[] = [];
                if (cell.facultyIds && cell.facultyIds.length > 0) effectiveFacultyIds = cell.facultyIds;
                else if (cell.facultyId) effectiveFacultyIds = [cell.facultyId];
                else {
                    const course = courses.find(c => c.id === subjectIds[0]);
                    if (course) effectiveFacultyIds = course.facultyIds || (course.facultyId ? [course.facultyId] : []);
                }

                if (effectiveFacultyIds.includes(currentUser.id)) {
                    const [yearStr, div] = classId.split('-');
                    const subjectLabel = subjectIds.map(id => courses.find(c => c.id === id)?.subject).filter(isDefinedString).join(' / ');
                    mySessions.push({
                        classId,
                        displayClass: `Year ${yearStr} - ${div}`,
                        subjectLabel,
                        roomId: cell.roomId,
                        type: 'lecture',
                        coFaculties: effectiveFacultyIds.filter(id => id !== currentUser.id).map(id => users[id]).filter(Boolean)
                    });
                }
            }

            // Check Practical Batches
            if (cell && cell.type === 'practical' && cell.batches) {
                const myBatches = cell.batches.filter((b: any) => b.facultyIds?.includes(currentUser.id));
                myBatches.forEach((myBatch: any) => {
                    const [yearStr, div] = classId.split('-');
                    const course = courses.find(c => c.id === myBatch.subjectId);
                    mySessions.push({
                        classId,
                        displayClass: `Year ${yearStr} - ${div} (${myBatch.name})`,
                        subjectLabel: course?.subject ? `${course.subject} Practical` : 'Practical',
                        roomId: myBatch.roomId,
                        type: 'practical',
                        coFaculties: []
                    });
                });
            }
        }
        return mySessions;
    };

    const downloadCsv = () => {
        if (!slots.length) return;
        const csvHeaders = ['Time', ...days];
        const rows = slots.map(slot => {
            const row = [formatSlotLabel(slot.label)];
            days.forEach(day => {
                const sessions = getSessions(day, slot.id);
                const labels = sessions.map((s: any) => `${s.subjectLabel} (${s.displayClass})`).join('; ');
                row.push(`"${labels}"`);
            });
            return row.join(',');
        });
        const csvContent = "data:text/csv;charset=utf-8," + [csvHeaders.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `faculty_schedule_${currentUser.name.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!slots.length) return <div className="text-center py-20 opacity-50 font-bold">No schedule configured by Director yet.</div>;

    return (
        <div className="animate-fade-in max-w-7xl mx-auto space-y-6">
            <div className="px-1 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-4xl font-black text-foreground tracking-tight">Teaching Schedule</h2>
                    <p className="text-muted-foreground font-medium mt-1">Your weekly consolidated timetable across all classes.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={downloadCsv}
                        className="px-4 py-2 bg-card border border-border hover:bg-muted text-foreground rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <DownloadIcon className="w-4 h-4 text-emerald-500"/> Export CSV
                    </button>
                    <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-2xl border border-border shadow-sm">
                        <UsersIcon className="w-5 h-5 text-primary"/>
                        <span className="text-sm font-bold text-foreground">Faculty View</span>
                    </div>
                </div>
            </div>

            <div className="bg-card border border-border/60 rounded-[2.5rem] shadow-xl overflow-hidden overflow-x-auto custom-scrollbar max-h-[700px]">
                <table className="w-full border-separate border-spacing-0 min-w-[1100px]">
                    <thead>
                        <tr className="bg-muted/30">
                            <th className="p-4 border-r border-b border-border font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground w-32 sticky left-0 top-0 bg-card/80 backdrop-blur-md z-30">Time</th>
                            {days.map(day => (
                                <th key={day} className="p-4 border-r border-b border-border font-black text-[10px] uppercase tracking-[0.2em] text-foreground text-center sticky top-0 bg-card/80 backdrop-blur-md z-20">
                                    {day}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {slots.map((slot) => (
                            <tr key={slot.id} className="group">
                                <td className="p-4 border-r border-b border-border font-bold text-xs text-muted-foreground bg-card sticky left-0 group-hover:bg-muted/10 transition-colors z-10">
                                    {formatSlotLabel(slot.label)}
                                </td>
                                {days.map((day) => {
                                    const sessions = getSessions(day, slot.id);
                                    
                                    return (
                                        <td key={`${day}-${slot.id}`} className="p-3 border-r border-b border-border/40 align-top h-32 transition-colors duration-300">
                                            <div className="flex flex-col gap-3 h-full">
                                                {sessions.map((session, sIdx) => (
                                                    <div 
                                                        key={sIdx}
                                                        className={`p-3 rounded-2xl border transition-all shadow-sm flex-1 flex flex-col justify-between gap-2 group/sess ${
                                                            session.type === 'practical'
                                                            ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10'
                                                            : 'bg-indigo-500/5 border-indigo-500/20 hover:border-indigo-500/50 hover:bg-indigo-500/10'
                                                        }`}
                                                    >
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-1.5">
                                                                {session.type === 'practical' ? <BeakerIcon className="w-3 h-3 text-emerald-600"/> : <BookOpenIcon className="w-3 h-3 text-indigo-600"/>}
                                                                <span className={`text-[8px] font-black uppercase tracking-widest ${session.type === 'practical' ? 'text-emerald-600' : 'text-indigo-600'}`}>{session.type}</span>
                                                            </div>
                                                            <p className="font-bold text-[10px] text-foreground leading-tight line-clamp-2">{session.subjectLabel}</p>
                                                            <p className="text-[9px] font-black text-primary uppercase tracking-tight">{session.displayClass}</p>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-auto">
                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-background rounded-lg border border-border shadow-sm">
                                                                <MapPinIcon className="w-2.5 h-2.5 text-muted-foreground"/>
                                                                <span className="text-[8px] font-black text-muted-foreground uppercase">{session.roomId || '-'}</span>
                                                            </div>
                                                            {session.coFaculties.length > 0 && (
                                                                <div className="flex -space-x-1">
                                                                    {session.coFaculties.map((f:any) => <Avatar key={f.id} src={f.avatarUrl} name={f.name} size="xs" className="w-4 h-4 border border-background" />)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {sessions.length === 0 && (
                                                    <div className="h-full flex items-center justify-center opacity-10">
                                                        <PlusIcon className="w-4 h-4 text-muted-foreground"/>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const StudentTimetableView = ({ college, currentUser, courses, users }: { college: College | undefined, currentUser: User, courses: Course[], users: {[key:string]: User} }) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    const downloadCsv = () => {
        const classId = `${currentUser.yearOfStudy}-${currentUser.division}`;
        const schedule = college?.timetable?.[classId] || {};
        const slots = getSlotsForClass(college, classId);
        
        if (!slots.length) return;
        const csvHeaders = ['Time', ...days];
        const rows = slots.map(slot => {
            const row = [formatSlotLabel(slot.label)];
            days.forEach(day => {
                const session = schedule[day]?.[slot.id];
                if (!session) {
                    row.push('');
                } else if (session.type === 'practical' && session.batches) {
                    const batchInfo = session.batches.map((b: any) => {
                        const subject = courses.find(c => c.id === b.subjectId)?.subject || 'Practical';
                        return `${b.name}:${subject}`;
                    }).join(';');
                    row.push(`"PRACTICAL: ${batchInfo}"`);
                } else {
                    const subjectIds = getCellSubjectIds(session);
                    const subjects = subjectIds.map(id => courses.find(c => c.id === id)?.subject).filter(isDefinedString).join(' / ');
                    row.push(`"${subjects}"`);
                }
            });
            return row.join(',');
        });
        const csvContent = "data:text/csv;charset=utf-8," + [csvHeaders.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `timetable_${classId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const classId = `${currentUser.yearOfStudy}-${currentUser.division}`;
    const schedule = college?.timetable?.[classId] || {};
    const slots = getSlotsForClass(college, classId);

    if (!slots.length) return <div className="text-center py-20 opacity-50 font-bold">No schedule configured.</div>;

    return (
        <div className="animate-fade-in max-w-7xl mx-auto space-y-6">
            <div className="px-1 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-4xl font-black text-foreground tracking-tight">Weekly Timetable</h2>
                    <p className="text-muted-foreground font-medium mt-1">
                        Schedule for Year {currentUser.yearOfStudy} - Division {currentUser.division}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={downloadCsv}
                        className="px-4 py-2 bg-card border border-border hover:bg-muted text-foreground rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <DownloadIcon className="w-4 h-4 text-emerald-500"/> Export CSV
                    </button>
                    <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-2xl border border-border shadow-sm">
                        <CalendarIcon className="w-5 h-5 text-primary"/>
                        <span className="text-sm font-bold text-foreground">Mon - Sat</span>
                    </div>
                </div>
            </div>

            <div className="bg-card border border-border/60 rounded-[2.5rem] shadow-xl overflow-hidden overflow-x-auto custom-scrollbar max-h-[700px]">
                <table className="w-full border-separate border-spacing-0 min-w-[1100px]">
                    <thead>
                        <tr className="bg-muted/30">
                            <th className="p-4 border-r border-b border-border font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground w-32 sticky left-0 top-0 bg-card/80 backdrop-blur-md z-30">Time</th>
                            {days.map(day => (
                                <th key={day} className="p-4 border-r border-b border-border font-black text-[10px] uppercase tracking-[0.2em] text-foreground text-center sticky top-0 bg-card/80 backdrop-blur-md z-20">
                                    {day}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {slots.map((slot) => (
                            <tr key={slot.id} className="group">
                                <td className="p-4 border-r border-b border-border font-bold text-xs text-muted-foreground bg-card sticky left-0 group-hover:bg-muted/10 transition-colors z-10">
                                    {formatSlotLabel(slot.label)}
                                </td>
                                {days.map((day) => {
                                    const session = schedule[day]?.[slot.id];
                                    
                                    // --- RENDER PRACTICAL ---
                                    if (session && session.type === 'practical' && session.batches) {
                                        const practicalSubjects = session.batches.map((b: any) => courses.find(c => c.id === b.subjectId)?.subject).filter(Boolean);
                                        const uniqueSubjects = Array.from(new Set(practicalSubjects));
                                        const displayLabel = uniqueSubjects.map(s => `${s} Practical`).join(' / ') || 'Practical Labs';

                                        return (
                                            <td key={`${day}-${slot.id}`} className="p-3 border-r border-b border-border/40 align-top h-32">
                                                <div className="p-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 h-full flex flex-col gap-2 transition-all hover:bg-emerald-500/10 group/prac shadow-sm">
                                                    <div className="flex items-center gap-1.5">
                                                        <BeakerIcon className="w-3.5 h-3.5 text-emerald-600"/>
                                                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Practical</span>
                                                    </div>
                                                    <p className="font-bold text-[11px] text-foreground leading-tight">
                                                        {displayLabel}
                                                    </p>
                                                    <div className="flex flex-wrap gap-1 mt-auto">
                                                        {session.batches.map((batch: any, i: number) => (
                                                            <span key={i} className="px-1.5 py-0.5 bg-background border border-border rounded-lg text-[7px] font-black text-muted-foreground uppercase tracking-tighter shadow-sm" title={`Batch ${batch.name} - Room ${batch.roomId}`}>
                                                                {batch.name}: {batch.roomId}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                        );
                                    }

                                    // --- RENDER STANDARD LECTURE ---
                                    const subjectIds = getCellSubjectIds(session);
                                    const subjectLabel = subjectIds.length > 0 
                                        ? subjectIds.map(id => courses.find(c => c.id === id)?.subject).filter(isDefinedString).join(' / ') 
                                        : (session ? 'Unknown Subject' : null);
                                    
                                    // Effective Faculty Calculation
                                    let facultyIds: string[] = [];
                                    if (session) {
                                        if (session.facultyIds && session.facultyIds.length > 0) {
                                            facultyIds = session.facultyIds;
                                        } else if (session.facultyId) {
                                            facultyIds = [session.facultyId];
                                        } else if (subjectIds.length > 0) {
                                            subjectIds.forEach(id => {
                                                const courseForId = courses.find(c => c.id === id);
                                                if (courseForId) {
                                                    const defaults = courseForId.facultyIds || (courseForId.facultyId ? [courseForId.facultyId] : []);
                                                    defaults.forEach((fid: string) => {
                                                        if (!facultyIds.includes(fid)) facultyIds.push(fid);
                                                    });
                                                }
                                            });
                                        }
                                    }
                                    
                                    const faculties = facultyIds.map(id => users[id]).filter(Boolean);

                                    return (
                                        <td key={`${day}-${slot.id}`} className="p-3 border-r border-b border-border/40 align-top h-32 transition-colors duration-300">
                                            <div 
                                                className={`p-3 rounded-2xl border transition-all h-full shadow-sm ${
                                                    session 
                                                    ? 'bg-primary/5 border-primary/20 hover:border-primary/50 hover:bg-primary/10 group' 
                                                    : 'bg-muted/5 border-border/30 border-dashed opacity-40 hover:opacity-100 hover:bg-muted/10'
                                                }`}
                                            >
                                                {session ? (
                                                    <div className="flex flex-col h-full justify-between gap-3">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-1.5">
                                                                <BookOpenIcon className="w-3.5 h-3.5 text-indigo-600"/>
                                                                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Lecture</span>
                                                            </div>
                                                            <p className="font-bold text-[11px] text-foreground leading-tight line-clamp-3">
                                                                {subjectLabel}
                                                            </p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex -space-x-2 overflow-hidden">
                                                                {faculties.map((f, i) => (
                                                                    <Avatar key={f.id} src={f.avatarUrl} name={f.name} size="xs" className="border-2 border-background ring-0 shadow-sm" />
                                                                ))}
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-background/80 backdrop-blur-sm rounded-lg border border-border shadow-sm">
                                                                    <MapPinIcon className="w-3 h-3 text-rose-500"/>
                                                                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-wider">{session.roomId || 'TBA'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="h-full flex items-center justify-center">
                                                        <PlusIcon className="w-4 h-4 text-muted-foreground/10"/>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const FacultyDashboardHome: React.FC<{ 
    currentUser: User, 
    courses: Course[], 
    stats: any, 
    onNavigate: (path: string) => void, 
    onQuickAction: (action: string) => void, 
    usersMap: { [key: string]: User }, 
    todaysClasses: any[],
    notices: Notice[]
}> = ({ currentUser, courses, stats, onNavigate, onQuickAction, usersMap, todaysClasses, notices }) => {
    
    // Default to empty array (No pre-uploaded tasks)
    const [tasks, setTasks] = useState<{id: number, text: string, completed: boolean}[]>(() => {
        const saved = localStorage.getItem(`faculty_tasks_${currentUser.id}`);
        return saved ? JSON.parse(saved) : [];
    });
    const [taskInput, setTaskInput] = useState("");
    const [showScheduleModal, setShowScheduleModal] = useState(false);

    useEffect(() => {
        localStorage.setItem(`faculty_tasks_${currentUser.id}`, JSON.stringify(tasks));
    }, [tasks, currentUser.id]);

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskInput.trim()) return;
        setTasks([{ id: Date.now(), text: taskInput, completed: false }, ...tasks]);
        setTaskInput("");
    };

    const toggleTask = (id: number) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    const deleteTask = (id: number) => {
        setTasks(tasks.filter(t => t.id !== id));
    };

    const nextClass = useMemo(() => {
        if (!todaysClasses.length) return null;
        return todaysClasses[0];
    }, [todaysClasses]);

    // Updated StatCard with onClick support
    const StatCard = ({ label, value, icon: Icon, color, subValue, onClick }: any) => (
        <div 
            onClick={onClick}
            className={`bg-card border border-border/60 rounded-[2rem] p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden text-left ${onClick ? 'cursor-pointer hover:border-primary/50' : ''}`}
        >
            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-3xl font-black text-foreground">{value}</p>
                    {subValue && <p className="text-xs font-bold text-emerald-500 mt-1 flex items-center gap-1"><TrendingUpIcon className="w-3 h-3"/> {subValue}</p>}
                </div>
                <div className={`p-3 rounded-2xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-500`}>
                    <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
                </div>
            </div>
            <div className={`absolute bottom-0 left-0 h-1 w-full ${color} opacity-20`}></div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-10 px-4 md:px-0">
            {/* Compact Header Hero Section */}
            <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[2rem] p-6 text-white shadow-xl overflow-hidden border border-white/5 shadow-indigo-500/20">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-1 bg-gradient-to-tr from-primary to-secondary rounded-full">
                            <Avatar src={currentUser.avatarUrl} name={currentUser.name} size="lg" className="border-2 border-slate-900"/>
                        </div>
                        <div className="text-left">
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Welcome, {currentUser.name.split(' ')[0]}</h1>
                            <p className="text-indigo-200 text-sm font-medium">Faculty • {currentUser.department}</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowScheduleModal(true)} 
                            className="bg-white text-indigo-950 px-5 py-3 rounded-xl font-black text-xs shadow-lg hover:scale-105 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <CalendarIcon className="w-4 h-4"/> Today's Lectures
                        </button>
                        <button onClick={() => onQuickAction('postNotice')} className="bg-indigo-600/30 backdrop-blur-md text-white border border-white/20 px-5 py-3 rounded-xl font-black text-xs shadow-lg hover:bg-indigo-600/50 transition-all flex items-center gap-2">
                            <MegaphoneIcon className="w-4 h-4"/> Broadcast
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
                {/* Left Side: Stats and Next Class (8 columns) */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Key Metrics Row - Now Clickable */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard 
                            label="Courses" 
                            value={stats.totalCourses} 
                            icon={BookOpenIcon} 
                            color="bg-blue-500" 
                            onClick={() => onQuickAction('viewClasses')} 
                        />
                        <StatCard 
                            label="Students" 
                            value={stats.totalStudents} 
                            icon={UsersIcon} 
                            color="bg-purple-500" 
                            onClick={() => onQuickAction('viewClasses')} 
                        />
                        <StatCard 
                            label="Submissions" 
                            value={courses.reduce((acc, c) => acc + (c.assignments?.length || 0), 0)} 
                            icon={ClipboardListIcon} 
                            color="bg-amber-500" 
                            onClick={() => onQuickAction('viewClasses')} 
                        />
                    </div>

                    {/* Active/Next Session Hero Card - Compacted */}
                    <div className="bg-card border border-border/60 rounded-[2rem] p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group text-left">
                        {nextClass ? (
                            <>
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                                    <ClockIcon className="w-40 h-40 rotate-12" />
                                </div>
                                <div className="flex items-center gap-5 relative z-10 text-left">
                                    <div className="h-16 w-16 rounded-2xl bg-primary text-white flex flex-col items-center justify-center shadow-md flex-shrink-0">
                                        <span className="text-lg font-black">{nextClass.time?.split(' - ')[0]}</span>
                                        <span className="text-[9px] font-black uppercase tracking-widest opacity-80">Start</span>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] font-black uppercase tracking-wider border border-primary/20">
                                                Up Next
                                            </span>
                                        </div>
                                        <h2 className="text-xl md:text-2xl font-black text-foreground truncate">{nextClass.subject}</h2>
                                        <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground mt-1">
                                            <span className="flex items-center gap-1"><MapPinIcon className="w-3.5 h-3.5 text-rose-500"/> Room {nextClass.room}</span>
                                            <span className="w-1 h-1 bg-border rounded-full"></span>
                                            <span>{nextClass.displayClass}</span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => onNavigate(`#/academics/${nextClass.id}`)}
                                    className="w-full md:w-auto px-6 py-3 bg-foreground text-background font-black rounded-xl hover:scale-105 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 relative z-10 text-xs"
                                >
                                    Take Attendance <ArrowRightIcon className="w-4 h-4"/>
                                </button>
                            </>
                        ) : (
                            <div className="w-full py-8 flex flex-col items-center justify-center text-muted-foreground opacity-60">
                                <CoffeeIcon className="w-8 h-8 mb-2"/>
                                <p className="font-bold text-sm">No lectures scheduled right now</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Productivity and Analysis Widgets (4 columns) */}
                <div className="lg:col-span-4 space-y-6 text-left">
                    {/* Productivity/Task List Widget */}
                    <div className="bg-card border border-border/60 rounded-[2rem] p-6 shadow-sm flex flex-col relative overflow-hidden h-full min-h-[300px] text-left">
                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <h3 className="font-black text-lg text-foreground flex items-center gap-2">
                                <ActivityIcon className="w-5 h-5 text-emerald-500"/> Tasks
                            </h3>
                            <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
                                {tasks.filter(t => !t.completed).length} Left
                            </span>
                        </div>
                        
                        <form onSubmit={handleAddTask} className="relative mb-4 z-10">
                            <input 
                                type="text"
                                value={taskInput}
                                onChange={(e) => setTaskInput(e.target.value)}
                                placeholder="New task..."
                                className="w-full bg-muted/40 border border-border/60 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all pr-10 font-bold"
                            />
                            <button 
                                type="submit"
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-white rounded-lg hover:scale-105 transition-all shadow-md active:scale-95"
                            >
                                <PlusIcon className="w-4 h-4"/>
                            </button>
                        </form>

                        <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar z-10 px-1">
                            {tasks.map(task => (
                                <div 
                                    key={task.id} 
                                    className={`group flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${task.completed ? 'bg-muted/30 border-transparent opacity-60 grayscale' : 'bg-background border-border hover:border-primary/40 hover:shadow-sm'}`}
                                >
                                    <button 
                                        onClick={() => toggleTask(task.id)}
                                        className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border text-transparent hover:border-primary'}`}
                                    >
                                        <CheckIcon className="w-3.5 h-3.5"/>
                                    </button>
                                    <span className={`text-xs font-bold flex-1 truncate leading-tight ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                        {task.text}
                                    </span>
                                    <button 
                                        onClick={() => deleteTask(task.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-rose-500 transition-all"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5"/>
                                    </button>
                                </div>
                            ))}
                            {tasks.length === 0 && (
                                <div className="text-center py-8 opacity-40 flex flex-col items-center justify-center h-full">
                                    <ClipboardListIcon className="w-8 h-8 mb-2" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No tasks pending</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal for Today's Schedule */}
            {showScheduleModal && (
                <DailyScheduleModal 
                    classes={todaysClasses} 
                    onClose={() => setShowScheduleModal(false)}
                    onNavigate={onNavigate}
                />
            )}
        </div>
    );
};

const FacultyAcademicsDashboard: React.FC<AcademicsPageProps> = (props) => {
    const { currentUser, onNavigate, courses, colleges, currentPath, notices, users, onCreateNotice, onDeleteNotice, onCreateCourse } = props;
    const [activeSection, setActiveSection] = useState<'dashboard' | 'classes' | 'notices' | 'timetable'>('dashboard');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreateNoticeModalOpen, setIsCreateNoticeModalOpen] = useState(false);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    
    // Curriculum Filters
    const [selectedDept, setSelectedDept] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const college = useMemo(() => colleges.find(c => c.id === currentUser.collegeId), [colleges, currentUser.collegeId]);
    const collegeDepartments = college?.departments || [];
    
    // --- UPDATED LOGIC FOR ALL ALLOCATED LECTURES ---
    const myCourses = useMemo(() => {
        const relevantCourseIds = new Set<string>();

        // 1. Check Course Definitions (Main Instructor or Co-Instructor)
        courses.forEach(c => {
            if (c.facultyId === currentUser.id) relevantCourseIds.add(c.id);
            if (c.facultyIds && Array.isArray(c.facultyIds) && c.facultyIds.includes(currentUser.id)) relevantCourseIds.add(c.id);
        });

        // 2. Check Timetable Allocations (Overrides, Subs, Practical Batches)
        if (college?.timetable) {
            Object.values(college.timetable).forEach((classSched: any) => {
                Object.values(classSched).forEach((daySched: any) => {
                    Object.values(daySched).forEach((cell: any) => {
                        // Check Standard Lectures
                        const subjectIds = getCellSubjectIds(cell);
                        if (cell.type !== 'practical' && subjectIds.length > 0) {
                            // Use cell overrides if they exist, otherwise don't blindly assume course default (we handled course default in step 1)
                            if (cell.facultyIds && Array.isArray(cell.facultyIds)) {
                                if (cell.facultyIds.includes(currentUser.id)) {
                                    subjectIds.forEach(id => relevantCourseIds.add(id));
                                }
                            } else if (cell.facultyId === currentUser.id) {
                                subjectIds.forEach(id => relevantCourseIds.add(id));
                            }
                        }

                        // Check Practical Batches
                        if (cell.type === 'practical' && cell.batches) {
                            cell.batches.forEach((b: any) => {
                                if (b.facultyIds && b.facultyIds.includes(currentUser.id)) {
                                    relevantCourseIds.add(b.subjectId);
                                }
                            });
                        }
                    });
                });
            });
        }

        return courses.filter(c => relevantCourseIds.has(c.id));
    }, [courses, currentUser, college]);

    const teachingClasses = useMemo(() => {
        const uniqueSet = new Set();
        const classes: {id: string, label: string}[] = [];
        
        myCourses.forEach(c => {
            const id = `${c.year}-${c.division}`;
            if (!uniqueSet.has(id)) {
                uniqueSet.add(id);
                classes.push({ id, label: `Year ${c.year} - ${c.division}` });
            }
        });
        return classes.sort((a, b) => a.id.localeCompare(b.id));
    }, [myCourses]);

    const uniqueDepartments = useMemo(() => {
        const depts = new Set<string>();
        myCourses.forEach(c => depts.add(c.department));
        return ['All', ...Array.from(depts)];
    }, [myCourses]);

    // Filter Logic: Dept + Search
    const filteredCurriculumCourses = useMemo(() => {
        let filtered = myCourses;
        if (selectedDept !== 'All') {
            filtered = filtered.filter(c => c.department === selectedDept);
        }
        if (searchQuery.trim()) {
            const lowerQ = searchQuery.toLowerCase();
            filtered = filtered.filter(c => c.subject.toLowerCase().includes(lowerQ));
        }
        return filtered;
    }, [myCourses, selectedDept, searchQuery]);

    const canCreateClass = currentUser.tag === 'HOD/Dean' || currentUser.tag === 'Director' || currentUser.tag === 'Super Admin';

    // Helper to calculate students for a course dynamically
    const getStudentCount = (course: Course) => {
        if(course.students && course.students.length > 0) return course.students.length;
        
        // Fallback calculation if student array is empty but students exist in registry
        return Object.values(users).filter(u =>
            u.tag === 'Student' &&
            u.department === course.department &&
            Number(u.yearOfStudy) === Number(course.year) &&
            (!course.division || u.division === course.division)
        ).length;
    };

    const totalStudentsCount = useMemo(() => {
        const uniqueStudentIds = new Set<string>();
        myCourses.forEach(course => {
            course.students?.forEach(id => uniqueStudentIds.add(id));
            // Also add matches from user registry to be safe
            Object.values(users).forEach((u: User) => {
                if (u.tag === 'Student' && u.department === course.department && Number(u.yearOfStudy) === Number(course.year)) {
                        const courseDiv = (course.division || '').trim().toLowerCase();
                        const userDiv = (u.division || '').trim().toLowerCase();
                        if (!courseDiv || userDiv === courseDiv) uniqueStudentIds.add(u.id);
                }
            });
        });
        return uniqueStudentIds.size;
    }, [myCourses, users]);

    const todaysClasses = useMemo(() => {
        if (!college?.timetable) return [];
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayName = days[new Date().getDay()];
        const classesForToday: any[] = [];
        
        Object.entries(college.timetable).forEach(([classId, classSchedule]) => {
             const todaySchedule = classSchedule[todayName];
             if (!todaySchedule) return;
             const [yearStr, div] = classId.split('-');
             const year = parseInt(yearStr);

             const classSlots = getSlotsForClass(college, classId);
             classSlots.forEach(slot => {
                const cell = todaySchedule[slot.id];
                
                // Logic for finding my classes in today's schedule
                if (cell) {
                    let isMyClass = false;
                    let subjectIds: string[] = [];
                    let subjectLabel = '';
                    let room = '';

                    // Check standard lecture
                    if (cell.type !== 'practical') {
                        const cellSubjectIds = getCellSubjectIds(cell);
                        let fIds = cell.facultyIds || (cell.facultyId ? [cell.facultyId] : []);
                        if (fIds.length === 0) {
                            // Fallback to course default
                            const course = cellSubjectIds.length > 0 ? courses.find(c => c.id === cellSubjectIds[0]) : undefined;
                            if (course) fIds = course.facultyIds || (course.facultyId ? [course.facultyId] : []);
                        }
                        if (fIds.includes(currentUser.id)) {
                            isMyClass = true;
                            subjectIds = cellSubjectIds;
                            subjectLabel = cellSubjectIds.map(id => courses.find(c => c.id === id)?.subject).filter(isDefinedString).join(' / ');
                            room = cell.roomId || '';
                        }
                    } 
                    // Check practical batch
                    else if (cell.type === 'practical' && cell.batches) {
                        const myBatch = cell.batches.find((b:any) => b.facultyIds?.includes(currentUser.id));
                        if (myBatch) {
                            isMyClass = true;
                            subjectIds = myBatch.subjectId ? [myBatch.subjectId] : [];
                            subjectLabel = courses.find(c => c.id === myBatch.subjectId)?.subject || '';
                            room = myBatch.roomId || '';
                        }
                    }

                    if (isMyClass) {
                        const primaryCourse = subjectIds.length > 0 ? courses.find(c => c.id === subjectIds[0]) : undefined;
                        const baseCourse = primaryCourse || { id: '', subject: subjectLabel || 'Class', department: '', year, division: div, facultyId: currentUser.id };
                        classesForToday.push({
                            ...baseCourse,
                            subject: subjectLabel || baseCourse.subject,
                            time: formatSlotLabel(slot.label),
                            room: room,
                            displayClass: `Year ${year} - ${div}`,
                            facultyNames: [currentUser.name] // Just show self for personal dashboard
                        });
                    }
                }
            });
        });
        return classesForToday;
    }, [college, currentUser, courses, users]);

    const handleLogout = async () => { await auth.signOut(); onNavigate('#/'); };
    const handleSectionChange = (section: any) => { setActiveSection(section); setMobileMenuOpen(false); };

    if (currentUser.isApproved === false) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <div className="bg-card border border-border rounded-[3rem] p-12 max-w-lg shadow-2xl relative overflow-hidden text-left">
                    <div className="absolute top-0 left-0 w-full h-2 bg-amber-500"></div>
                    <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-8">
                        <ClockIcon className="w-12 h-12 text-amber-600"/>
                    </div>
                    <h2 className="text-3xl font-black text-foreground mb-4">Approval Required</h2>
                    <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                        Your account setup is complete. Please wait for your Department Head or Director to approve your access.
                    </p>
                    <button onClick={handleLogout} className="w-full py-4 bg-muted hover:bg-muted/80 rounded-2xl font-black text-sm uppercase tracking-widest transition-all">Sign Out</button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden">
             <Header currentUser={currentUser} onLogout={handleLogout} onNavigate={onNavigate} currentPath={currentPath} />
             
             <div className="flex flex-1 overflow-hidden relative flex-col md:flex-row text-left">
                <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-card border-r border-border transition-all duration-300 ease-in-out md:relative md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="p-6 h-full overflow-y-auto flex flex-col text-left">
                        <div className="space-y-1.5 flex-1">
                            <SidebarItem id="dashboard" label="Overview" icon={ChartPieIcon} onClick={() => handleSectionChange('dashboard')} active={activeSection === 'dashboard'} />
                            <SidebarItem id="classes" label="Curriculum" icon={BookOpenIcon} onClick={() => handleSectionChange('classes')} active={activeSection === 'classes'} />
                            <SidebarItem id="timetable" label="My Timetable" icon={CalendarIcon} onClick={() => handleSectionChange('timetable')} active={activeSection === 'timetable'} />
                            <SidebarItem id="notices" label="Department Broadcasts" icon={MegaphoneIcon} onClick={() => handleSectionChange('notices')} active={activeSection === 'notices'} />
                        </div>
                    </div>
                </aside>
                
                {mobileMenuOpen && <div className="fixed inset-0 z-30 bg-black/40 md:hidden backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>}

                <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-muted/5 pb-24 md:pb-10 custom-scrollbar text-left">
                    {/* Mobile Sidebar Toggle - Visible ONLY on MD and below */}
                    <div className="md:hidden mb-4">
                        <button 
                            onClick={() => setMobileMenuOpen(true)} 
                            className="p-2.5 bg-card border border-border rounded-xl text-foreground shadow-sm hover:bg-muted transition-colors flex items-center gap-2"
                        >
                            <MenuIcon className="w-5 h-5" />
                            <span className="text-sm font-bold">Menu</span>
                        </button>
                    </div>

                    {activeSection === 'dashboard' && (
                        <FacultyDashboardHome 
                            currentUser={currentUser} 
                            courses={myCourses} 
                            stats={{ totalCourses: myCourses.length, totalStudents: totalStudentsCount }} 
                            onNavigate={onNavigate}
                            onQuickAction={(a:any) => {
                                if(a === 'createClass') setIsCreateModalOpen(true);
                                if(a === 'postNotice') setIsCreateNoticeModalOpen(true);
                                if(a === 'viewNotices') setActiveSection('notices');
                                if(a === 'viewClasses') setActiveSection('classes');
                            }}
                            usersMap={users}
                            todaysClasses={todaysClasses}
                            notices={notices}
                        />
                    )}

                    {activeSection === 'classes' && (
                        <div className="animate-fade-in max-w-7xl mx-auto space-y-8 text-left">
                            <div className="flex flex-col md:flex-row md:items-end justify-between px-1 gap-4">
                                <div>
                                    <h2 className="text-4xl font-black text-foreground tracking-tight">Curriculum</h2>
                                    <p className="text-muted-foreground font-medium mt-1">Manage your courses, students, and attendance.</p>
                                </div>
                            </div>

                            {/* Filters & Search Bar Row */}
                            <div className="flex flex-col md:flex-row gap-4 items-center">
                                {/* Search Bar */}
                                <div className="relative w-full md:w-64">
                                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                                    <input 
                                        type="text" 
                                        placeholder="Search subjects..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary outline-none w-full shadow-sm"
                                    />
                                </div>

                                {/* Department Chips */}
                                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar w-full">
                                    {uniqueDepartments.map(dept => (
                                        <button
                                            key={dept}
                                            onClick={() => setSelectedDept(dept)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                                                selectedDept === dept 
                                                ? 'bg-foreground text-background border-foreground shadow-md' 
                                                : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
                                            }`}
                                        >
                                            {dept}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Course Grid - Compact Design */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredCurriculumCourses.map(course => (
                                    <div 
                                        key={course.id} 
                                        onClick={() => onNavigate(`#/academics/${course.id}`)}
                                        className="bg-card border border-border/60 rounded-2xl p-4 hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer group flex flex-col h-full relative overflow-hidden text-left"
                                    >
                                        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                                            <BookOpenIcon className="w-24 h-24 rotate-12" />
                                        </div>

                                        <div className="flex justify-between items-start mb-3 relative z-10">
                                            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                                <BookOpenIcon className="w-5 h-5"/>
                                            </div>
                                            <div className="px-2 py-1 bg-muted rounded-lg text-[9px] font-black uppercase tracking-wider text-muted-foreground border border-border">
                                                YR {course.year} - {course.division}
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 relative z-10">
                                            <h3 className="text-lg font-bold text-foreground leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-2">{course.subject}</h3>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{course.department}</p>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-muted-foreground group-hover:text-foreground transition-colors relative z-10">
                                            <div className="flex items-center gap-1.5 text-xs font-bold">
                                                <UsersIcon className="w-3.5 h-3.5"/>
                                                <span>{getStudentCount(course)} Students</span>
                                            </div>
                                            <ArrowRightIcon className="w-3.5 h-3.5 -ml-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"/>
                                        </div>
                                    </div>
                                ))}
                                {filteredCurriculumCourses.length === 0 && (
                                    <div className="col-span-full py-12 text-center text-muted-foreground opacity-50 flex flex-col items-center">
                                        <BookOpenIcon className="w-12 h-12 mb-3"/>
                                        <p className="font-bold text-sm">No courses match your search.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {activeSection === 'timetable' && (
                        <FacultyTimetableView college={college} currentUser={currentUser} courses={courses} users={users} />
                    )}

                    {activeSection === 'notices' && (
                        <div className="animate-fade-in max-w-7xl mx-auto space-y-8 text-left">
                             <div className="flex justify-between items-end px-1">
                                <div>
                                    <h2 className="text-4xl font-black text-foreground tracking-tight">Department Broadcasts</h2>
                                    <p className="text-muted-foreground font-medium mt-1">Announcements relevant to {currentUser.department} & Institute.</p>
                                </div>
                                <button onClick={() => setIsCreateNoticeModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-95">
                                    <PlusIcon className="w-5 h-5"/> New Broadcast
                                </button>
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {notices.map(notice => (
                                    <NoticeCard 
                                        key={notice.id} 
                                        notice={notice} 
                                        author={users[notice.authorId]} 
                                        onDelete={currentUser.id === notice.authorId || currentUser.tag === 'HOD/Dean' ? onDeleteNotice : undefined}
                                        onViewImage={(url) => setViewingImage(url)}
                                    />
                                ))}
                                {notices.length === 0 && (
                                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground opacity-50">
                                        <MegaphoneIcon className="w-16 h-16 mb-4"/>
                                        <p className="font-bold">No announcements yet.</p>
                                    </div>
                                )}
                             </div>
                        </div>
                    )}
                </div>
            </div>
            
            {isCreateModalOpen && canCreateClass && <CreateCourseModal onClose={() => setIsCreateModalOpen(false)} onAddCourse={onCreateCourse} departmentOptions={collegeDepartments} />}
            
            {isCreateNoticeModalOpen && (
                <CreateNoticeModal 
                    onClose={() => setIsCreateNoticeModalOpen(false)} 
                    onCreateNotice={onCreateNotice} 
                    teachingClasses={teachingClasses}
                />
            )}
            
            <ImageLightbox src={viewingImage} onClose={() => setViewingImage(null)} />

            <BottomNavBar currentUser={currentUser} onNavigate={onNavigate} currentPage={currentPath}/>
        </div>
    );
};

const StudentAcademicsDashboard: React.FC<AcademicsPageProps> = (props) => {
    // Placeholder to match file structure, as student logic wasn't the focus of this fix
    // but needs to exist for the component to compile.
    const { currentUser, onNavigate, courses, currentPath, notices, users, colleges } = props;
    const [activeSection, setActiveSection] = useState('dashboard');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    
    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden">
             <Header currentUser={currentUser} onLogout={() => auth.signOut()} onNavigate={onNavigate} currentPath={currentPath} />
             <div className="flex flex-1 overflow-hidden relative">
                <div className="p-10 w-full overflow-y-auto">
                    <h2 className="text-3xl font-bold mb-4">Student Dashboard</h2>
                    <StudentTimetableView college={colleges.find(c => c.id === currentUser.collegeId)} currentUser={currentUser} courses={courses} users={users} />
                    {/* Add other student sections here */}
                </div>
             </div>
             <BottomNavBar currentUser={currentUser} onNavigate={onNavigate} currentPage={currentPath}/>
        </div>
    );
};

const AcademicsPage: React.FC<AcademicsPageProps> = (props) => {
    return props.currentUser.tag === 'Student' 
        ? <StudentAcademicsDashboard {...props} /> 
        : <FacultyAcademicsDashboard {...props} />;
};

export default AcademicsPage;
