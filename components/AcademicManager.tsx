import React, { useState, useMemo, useEffect } from 'react';
import { User, Course, TimeSlot, TimetableData, TimetableCell } from '../types';
import { 
    ClockIcon, CloseIcon, TrashIcon, PlusIcon, LayoutGridIcon, 
    CalendarIcon, UploadIcon, SaveIcon, MapPinIcon, UsersIcon, CheckIcon,
    BookOpenIcon, BeakerIcon, DownloadIcon
} from './Icons';

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

const normalizeSlotLabel = (label: string) => label.toLowerCase().replace(/\s+/g, '');
const isDefinedString = (value: string | undefined): value is string => Boolean(value);

const matchesSlotLabel = (slotLabel: string, input: string) => {
    const normalizedInput = normalizeSlotLabel(input);
    const normalizedSlot = normalizeSlotLabel(slotLabel);
    const normalizedSlotFormatted = normalizeSlotLabel(formatSlotLabel(slotLabel));
    const normalizedInputFormatted = normalizeSlotLabel(formatSlotLabel(input));
    return (
        normalizedInput === normalizedSlot ||
        normalizedInput === normalizedSlotFormatted ||
        normalizedInputFormatted === normalizedSlot ||
        normalizedInputFormatted === normalizedSlotFormatted
    );
};

const getCellSubjectIds = (cell: any): string[] => {
    if (!cell) return [] as string[];
    if (cell.subjectIds && cell.subjectIds.length > 0) return cell.subjectIds as string[];
    if (cell.subjectId) return [cell.subjectId as string];
    return [];
};

// --- Debounced Input for Room to avoid rapid DB writes ---
const RoomInput = ({ value, onUpdate }: { value: string, onUpdate: (val: string) => void }) => {
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    return (
        <input
            type="text"
            placeholder="Room"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={() => {
                if (localValue !== value) {
                    onUpdate(localValue);
                }
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    if (localValue !== value) {
                        onUpdate(localValue);
                    }
                    (e.target as HTMLInputElement).blur();
                }
            }}
            className="w-full bg-transparent text-[10px] font-medium text-muted-foreground border-b border-border/30 focus:border-primary outline-none"
        />
    );
};

// --- Helper Components ---

const ModalBackdrop = ({ children, onClose }: { children?: React.ReactNode, onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
        <div onClick={e => e.stopPropagation()} className="w-full max-w-lg animate-scale-in">
            {children}
        </div>
    </div>
);

const ButtonPrimary = ({ children, onClick, className = '', type = 'button', disabled = false }: any) => (
    <button 
        type={type} 
        onClick={onClick} 
        disabled={disabled}
        className={`px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
        {children}
    </button>
);

const ButtonSecondary = ({ children, onClick, className = '' }: any) => (
    <button type="button" onClick={onClick} className={`px-4 py-2 bg-muted text-muted-foreground hover:text-foreground text-xs font-bold rounded-xl hover:bg-muted/80 transition-all ${className}`}>
        {children}
    </button>
);

// --- Sub-Modals ---

export const TimeSlotEditorModal = ({ isOpen, onClose, slots, onUpdateSlots, scope = 'class', onScopeChange, scopeLabel }: any) => {
    const [localSlots, setLocalSlots] = useState<any[]>([]);

    const normalizeTimeInput = (timeStr: string) => {
        const normalized = formatTimeValue(timeStr);
        return normalized || timeStr;
    };

    useEffect(() => {
        if (isOpen) {
            const parsed = slots.map((s: TimeSlot) => {
                const parts = s.label.split('-').map(p => p.trim());

                return {
                    id: s.id,
                    start: parts[0] ? normalizeTimeInput(parts[0]) : '',
                    end: parts[1] ? normalizeTimeInput(parts[1]) : ''
                };
            });
            setLocalSlots(parsed);
        }
    }, [isOpen, slots]);

    const handleTimeChange = (idx: number, field: 'start' | 'end', value: string) => {
        const newSlots = [...localSlots];
        newSlots[idx][field] = value;
        setLocalSlots(newSlots);
    };

    const addSlot = () => {
        const newId = `s${Date.now()}`; 
        setLocalSlots([...localSlots, { id: newId, start: '', end: '' }]);
    };

    const removeSlot = (idx: number) => {
        const newSlots = [...localSlots];
        newSlots.splice(idx, 1);
        setLocalSlots(newSlots);
    };

    const handleSave = () => {
        const formattedSlots = localSlots.map(s => {
            const formatTime = (time: string) => {
                const formatted = formatTimeValue(time);
                return formatted || '??:??';
            };

            return {
                id: s.id,
                label: `${formatTime(s.start)} - ${formatTime(s.end)}`
            };
        });
        
        onUpdateSlots(formattedSlots);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <ModalBackdrop onClose={onClose}>
            <div className="bg-card w-full rounded-2xl shadow-2xl border border-border flex flex-col max-h-[85vh]">
                <div className="p-5 border-b border-border flex justify-between items-center bg-muted/10">
                    <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-primary"/> Configure Time Slots
                    </h3>
                    <button onClick={onClose}><CloseIcon className="w-5 h-4 text-muted-foreground hover:text-foreground"/></button>
                </div>

                {onScopeChange && (
                    <div className="px-5 pt-4">
                        <div className="flex items-center justify-between bg-muted/20 border border-border/50 rounded-xl p-2">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Applies To</span>
                            <div className="flex items-center bg-background/70 border border-border rounded-lg overflow-hidden">
                                <button
                                    onClick={() => onScopeChange('class')}
                                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wide transition-all ${scope === 'class' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    This Class
                                </button>
                                <button
                                    onClick={() => onScopeChange('global')}
                                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wide transition-all ${scope === 'global' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    All Classes
                                </button>
                            </div>
                        </div>
                        {scope === 'class' && scopeLabel && (
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2">
                                Editing: {scopeLabel}
                            </p>
                        )}
                    </div>
                )}
                
                <div className="p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
                    {localSlots.map((slot, idx) => (
                        <div key={slot.id} className="flex items-end gap-3 animate-fade-in">
                            <div className="flex-1 grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-xl border border-border/50">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block ml-1">Start Time</label>
                                    <div className="relative">
                                        <input 
                                            type="text"
                                            value={slot.start} 
                                            onChange={(e) => handleTimeChange(idx, 'start', e.target.value)}
                                            onBlur={(e) => handleTimeChange(idx, 'start', normalizeTimeInput(e.target.value))}
                                            placeholder="09:00 AM"
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-bold text-foreground focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                        />
                                        <ClockIcon className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block ml-1">End Time</label>
                                    <div className="relative">
                                        <input 
                                            type="text"
                                            value={slot.end} 
                                            onChange={(e) => handleTimeChange(idx, 'end', e.target.value)}
                                            onBlur={(e) => handleTimeChange(idx, 'end', normalizeTimeInput(e.target.value))}
                                            placeholder="09:50 AM"
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-bold text-foreground focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                        />
                                        <ClockIcon className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => removeSlot(idx)}
                                className="h-[74px] w-[50px] flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 border border-border rounded-xl transition-all"
                                title="Remove Slot"
                            >
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    ))}
                    
                    <button 
                        onClick={addSlot}
                        className="w-full py-4 border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm font-bold hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 group"
                    >
                        <div className="p-1 rounded-full bg-muted group-hover:bg-primary group-hover:text-white transition-colors">
                            <PlusIcon className="w-4 h-4"/> 
                        </div>
                        Add New Time Slot
                    </button>
                </div>

                <div className="p-4 border-t border-border bg-muted/10 flex justify-end gap-3">
                    <ButtonSecondary onClick={onClose}>Cancel</ButtonSecondary>
                    <ButtonPrimary onClick={handleSave}>Save Configuration</ButtonPrimary>
                </div>
            </div>
        </ModalBackdrop>
    );
};

// --- UTILITY: Generate Batch ID ---
const generateId = () => Math.random().toString(36).substr(2, 9);

export const TimetableManager = ({ 
    activeClasses, 
    deptCourses, 
    faculty,
    timetables,
    onUpdateTimetables,
    slots,
    slotsByClass,
    onUpdateSlots,
    onUpdateSlotsByClass,
    onSaveAll
}: { 
    activeClasses: { year: number, division: string }[], 
    deptCourses: Course[], 
    faculty: User[],
    timetables: { [classId: string]: TimetableData },
    onUpdateTimetables: (t: { [classId: string]: TimetableData }) => void,
    slots: TimeSlot[],
    slotsByClass?: { [classId: string]: TimeSlot[] },
    onUpdateSlots: (s: TimeSlot[]) => void,
    onUpdateSlotsByClass?: (classId: string, s: TimeSlot[]) => void,
    onSaveAll: () => void
}) => {
    const uniqueYears = useMemo(() => Array.from(new Set(activeClasses.map(c => c.year))).sort((a,b) => (a as number)-(b as number)), [activeClasses]);
    const [selectedYear, setSelectedYear] = useState<number>(uniqueYears[0] || 1);
    const availableDivisions = useMemo(() => activeClasses.filter(c => c.year === selectedYear).map(c => c.division).sort(), [activeClasses, selectedYear]);
    const [selectedDiv, setSelectedDiv] = useState<string>(availableDivisions[0] || 'A');
    const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
    const [slotScope, setSlotScope] = useState<'class' | 'global'>(slotsByClass ? 'class' : 'global');
    const [viewMode, setViewMode] = useState<'grid' | 'dnd' | 'upload'>('grid'); // All 3 modes restored
    const [isSaving, setIsSaving] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvPreview, setCsvPreview] = useState<any[]>([]);

    const downloadTimetableCsv = () => {
        if (!effectiveSlots.length) return;
        
        const csvHeaders = ['Day', ...effectiveSlots.map(s => formatSlotLabel(s.label))];
        const rows = DAYS.map(day => {
            const row = [day];
            effectiveSlots.forEach(slot => {
                const cell = schedule[day]?.[slot.id];
                if (!cell) {
                    row.push('');
                } else if (cell.type === 'practical') {
                    const batchInfo = (cell.batches || []).map((b: any) => {
                        const subject = relevantCourses.find(c => c.id === b.subjectId)?.subject || 'Practical';
                        return `${b.name}:${subject}`;
                    }).join(';');
                    row.push(`PRACTICAL|${batchInfo}`);
                } else {
                    const subjectIds = getCellSubjectIds(cell);
                    const subjects = subjectIds.map(id => relevantCourses.find(c => c.id === id)?.subject).filter(isDefinedString).join(';');
                    row.push(subjects);
                }
            });
            return row.join(',');
        });

        const csvContent = "data:text/csv;charset=utf-8," + [csvHeaders.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `timetable_${selectedYear}_${selectedDiv}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        if (!availableDivisions.includes(selectedDiv) && availableDivisions.length > 0) {
            setSelectedDiv(availableDivisions[0]);
        }
    }, [selectedYear, availableDivisions, selectedDiv]);

    useEffect(() => {
        if (!onUpdateSlotsByClass) {
            setSlotScope('global');
        }
    }, [onUpdateSlotsByClass]);

    const relevantCourses = useMemo(() => deptCourses.filter(c => c.year === selectedYear && (c.division ? c.division === selectedDiv : true)), [deptCourses, selectedYear, selectedDiv]);
    const classKey = `${selectedYear}-${selectedDiv}`;
    const schedule = timetables[classKey] || {};
    const classSlots = slotsByClass?.[classKey] || [];
    const effectiveSlots = classSlots.length > 0 ? classSlots : slots;
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const handleUpdateSchedule = (newClassSchedule: TimetableData) => {
        onUpdateTimetables({ ...timetables, [classKey]: newClassSchedule });
    };

    const handleSave = () => {
        setIsSaving(true); onSaveAll();
        setTimeout(() => { setIsSaving(false); alert("Saved!"); }, 800);
    };

    const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setCsvFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const rows = text.split(/\r?\n/).slice(1).map(row => {
                    const [day, time, subject, room, facultyEmails] = row.split(',').map(s => s?.trim());
                    return { day, time, subject, room, facultyEmails };
                }).filter(r => r.day && r.time);
                setCsvPreview(rows);
            };
            reader.readAsText(file);
        }
    };

    const commitCsv = () => {
        if (csvPreview.length === 0) return;
        const newSched = { ...schedule };
        let matchCount = 0;
        csvPreview.forEach(row => {
            const dayKey = DAYS.find(d => d.toLowerCase() === row.day.toLowerCase());
            const slot = effectiveSlots.find(s => matchesSlotLabel(s.label, row.time));
            const course = relevantCourses.find(c => c.subject.toLowerCase() === row.subject.toLowerCase());
            
            if (dayKey && slot && course) {
                if (!newSched[dayKey]) newSched[dayKey] = {};
                
                let facultyIds: string[] = [];
                if (row.facultyEmails) {
                    const emails = row.facultyEmails.split(';').map((e: string) => e.trim().toLowerCase());
                    facultyIds = faculty.filter(f => emails.includes(f.email.toLowerCase())).map(f => f.id);
                } else if (course.facultyId) {
                    facultyIds = [course.facultyId];
                }

                newSched[dayKey][slot.id] = { 
                    subjectId: course.id, 
                    facultyIds: facultyIds,
                    roomId: row.room || '',
                    type: 'lecture'
                };
                matchCount++;
            }
        });
        handleUpdateSchedule(newSched);
        alert(`Imported ${matchCount} entries.`);
        setCsvPreview([]); setCsvFile(null); setViewMode('grid');
    };

    const handleDragStart = (e: React.DragEvent, courseId: string) => { e.dataTransfer.setData('courseId', courseId); };

    const handleDrop = (day: string, slotId: string, e: React.DragEvent) => {
        e.preventDefault();
        const courseId = e.dataTransfer.getData('courseId');
        if (courseId) {
            const newSched = { ...schedule };
            if (!newSched[day]) newSched[day] = {};
            const course = relevantCourses.find(c => c.id === courseId);
            
            // Default to lecture on Drop
            newSched[day][slotId] = { 
                subjectId: courseId, 
                facultyIds: course?.facultyId ? [course.facultyId] : [], 
                roomId: '',
                type: 'lecture'
            };
            handleUpdateSchedule(newSched);
        }
    };

    const handleClearSlot = (day: string, slotId: string) => {
        const newSched = { ...schedule };
        if (newSched[day]) { delete newSched[day][slotId]; handleUpdateSchedule(newSched); }
    };

    const handleSaveSlots = (newSlots: TimeSlot[]) => {
        if (slotScope === 'class' && onUpdateSlotsByClass) {
            onUpdateSlotsByClass(classKey, newSlots);
            return;
        }
        onUpdateSlots(newSlots);
    };

    const slotEditorSlots = slotScope === 'class' ? (classSlots.length > 0 ? classSlots : slots) : slots;
    const slotScopeLabel = `Year ${selectedYear} - ${selectedDiv}`;
    const hasCustomSlots = classSlots.length > 0;
    const canScopeToggle = Boolean(onUpdateSlotsByClass);

    return (
        <div className="space-y-4 animate-fade-in text-left">
            {/* Control Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-card p-3 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-muted/30 rounded-xl p-1 border border-border/50">
                        <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-transparent text-sm font-bold px-3 py-1.5 focus:outline-none cursor-pointer">
                            {uniqueYears.map(y => <option key={y} value={y}>Year {y}</option>)}
                        </select>
                        <div className="w-px h-4 bg-border mx-1"></div>
                        <select value={selectedDiv} onChange={e => setSelectedDiv(e.target.value)} className="bg-transparent text-sm font-bold px-3 py-1.5 focus:outline-none cursor-pointer">
                            {availableDivisions.map(d => <option key={d} value={d}>Division {d}</option>)}
                        </select>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${hasCustomSlots ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
                        {hasCustomSlots ? 'Custom Timings' : 'Global Timings'}
                    </span>
                </div>

                <div className="flex bg-muted/40 p-1 rounded-xl border border-border/50">
                    {[{ id: 'grid', label: 'Grid Editor', icon: LayoutGridIcon }, { id: 'dnd', label: 'Visual Builder', icon: CalendarIcon }, { id: 'upload', label: 'Upload CSV', icon: UploadIcon }].map(mode => (
                        <button key={mode.id} onClick={() => setViewMode(mode.id as any)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${viewMode === mode.id ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50' : 'text-muted-foreground hover:text-foreground'}`}>
                            <mode.icon className="w-3.5 h-3.5" /> {mode.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={downloadTimetableCsv}
                        className="px-4 py-2 bg-card border border-border hover:bg-muted text-foreground rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-colors"
                        title="Download as CSV"
                    >
                        <DownloadIcon className="w-4 h-4 text-emerald-500"/> Export
                    </button>
                     <button onClick={() => setIsSlotModalOpen(true)} className="px-4 py-2 bg-card border border-border hover:bg-muted text-foreground rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-colors">
                        <ClockIcon className="w-4 h-4 text-primary"/> Timing
                    </button>
                    <ButtonPrimary onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
                       <SaveIcon className="w-4 h-4"/> {isSaving ? "Saving..." : "Save"} 
                    </ButtonPrimary>
                </div>
            </div>

            {viewMode === 'grid' && (
                <div className="bg-card rounded-[2.5rem] border border-border shadow-xl overflow-hidden overflow-x-auto custom-scrollbar max-h-[750px]">
                    <table className="w-full text-sm text-left border-separate border-spacing-0 min-w-[1200px]">
                        <thead>
                            <tr className="bg-muted/30">
                                <th className="p-4 border-r border-b border-border font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground w-32 sticky left-0 top-0 bg-card/80 backdrop-blur-md z-30">Day / Time</th>
                                {effectiveSlots.map((slot, idx) => (
                                    <th key={slot.id} className="p-4 border-r border-b border-border font-semibold text-foreground text-center min-w-[240px] sticky top-0 bg-card/80 backdrop-blur-md z-20">
                                         <div className="flex flex-col items-center justify-center">
                                            <span className="text-[9px] font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-full mb-1 tracking-widest uppercase shadow-sm">Slot {idx + 1}</span>
                                            <span className="text-xs font-black text-foreground">{formatSlotLabel(slot.label)}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {DAYS.map(day => (
                                <tr key={day} className="hover:bg-muted/5 transition-colors group">
                                    <td className="p-4 border-r border-b border-border font-black text-[10px] uppercase tracking-widest text-foreground bg-card sticky left-0 z-10 group-hover:bg-muted/10 transition-colors">{day}</td>
                                    {effectiveSlots.map(slot => {
                                        const cell = schedule[day]?.[slot.id] || { subjectId: '', facultyIds: [], roomId: '', type: 'lecture' };
                                        
                                        const updateCell = (updates: any) => {
                                            const newSched = { ...schedule };
                                            if (!newSched[day]) newSched[day] = {};

                                            // Handle special case for facultyId vs facultyIds
                                            const mergedCell = { ...cell, ...updates };
                                            if (updates.facultyIds && updates.facultyIds.length > 0) {
                                                mergedCell.facultyId = updates.facultyIds[0];
                                            } else if (updates.facultyIds && updates.facultyIds.length === 0) {
                                                mergedCell.facultyId = undefined;
                                            }

                                            newSched[day][slot.id] = mergedCell;
                                            handleUpdateSchedule(newSched);
                                        };

                                        const clearCell = () => {
                                            const newSched = { ...schedule };
                                            if (newSched[day]) { delete newSched[day][slot.id]; }
                                            handleUpdateSchedule(newSched);
                                        };

                                        return (
                                            <td key={slot.id} className={`p-3 border-r border-b border-border/40 align-top transition-colors duration-300 ${cell.type === 'practical' ? 'bg-emerald-500/[0.02]' : cell.subjectId ? 'bg-indigo-500/[0.02]' : ''}`}>
                                                
                                                {/* --- 3-OPTION TOGGLE --- */}
                                                <div className="flex items-center justify-between mb-3 bg-muted/40 p-1 rounded-xl border border-border/50 shadow-inner">
                                                    <button 
                                                        onClick={() => updateCell({ type: 'lecture' })}
                                                        className={`flex-1 text-[9px] font-bold py-1 rounded-md transition-all flex items-center justify-center gap-1 ${cell.type !== 'practical' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                                        title="Single Lecture"
                                                    >
                                                        <BookOpenIcon className="w-3 h-3"/> Lect
                                                    </button>
                                                    <button 
                                                        onClick={() => updateCell({ type: 'practical', batches: cell.batches || [{id: generateId(), name: 'B1', facultyIds: []}] })}
                                                        className={`flex-1 text-[9px] font-bold py-1 rounded-md transition-all flex items-center justify-center gap-1 ${cell.type === 'practical' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                                        title="Practical / Batches"
                                                    >
                                                        <BeakerIcon className="w-3 h-3"/> Prac
                                                    </button>
                                                    <button 
                                                        onClick={clearCell}
                                                        className="flex-1 text-[9px] font-bold py-1 rounded-md transition-all text-muted-foreground hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center"
                                                        title="Clear Slot"
                                                    >
                                                        <CloseIcon className="w-3 h-3"/>
                                                    </button>
                                                </div>

                                                {/* --- SINGLE LECTURE MODE --- */}
                                                {cell.type !== 'practical' && (
                                                    <div className="space-y-3 h-full flex flex-col justify-start">
                                                        <div className="relative group/sel">
                                                            <select
                                                                multiple
                                                                className="w-full bg-background/50 text-xs font-bold text-foreground border border-border/60 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none p-2 cursor-pointer transition-all hover:bg-background min-h-[100px] custom-scrollbar shadow-sm"
                                                                value={getCellSubjectIds(cell)}
                                                                onChange={(e) => {
                                                                    const selected = Array.from(e.target.selectedOptions).map(opt => opt.value).filter(Boolean);
                                                                    updateCell({ subjectIds: selected, subjectId: selected[0] || '' });
                                                                }}
                                                            >
                                                                {relevantCourses.map(c => <option key={c.id} value={c.id} className="p-2 rounded-lg mb-1">{c.subject}</option>)}
                                                            </select>
                                                            <div className="mt-2 flex flex-wrap gap-1">
                                                                {getCellSubjectIds(cell).length > 0 && (
                                                                    <div className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20 shadow-sm">
                                                                        {getCellSubjectIds(cell).map(id => relevantCourses.find(c => c.id === id)?.subject).filter(isDefinedString).join(' / ')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <MapPinIcon className="w-3 h-3 text-muted-foreground/50 shrink-0"/>
                                                            <RoomInput value={cell.roomId || ''} onUpdate={(val) => updateCell({ roomId: val })} />
                                                        </div>
                                                        {getCellSubjectIds(cell).length > 0 && (
                                                            <div className="mt-1">
                                                                <div className="flex flex-wrap gap-1 mb-1">
                                                                    {/* Effective Faculty Display (Overrides + Default) */}
                                                                    {(() => {
                                                                        const primaryId = getCellSubjectIds(cell)[0];
                                                                        const course = relevantCourses.find(c => c.id === primaryId);
                                                                        const overrides = (cell.facultyIds || []).map(fid => {
                                                                            const f = faculty.find(u => u.id === fid);
                                                                            return f ? (
                                                                                <span key={fid} title={f.name} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-bold rounded cursor-help border border-primary/20">
                                                                                    {f.name}
                                                                                    <button onClick={() => updateCell({ facultyIds: cell.facultyIds?.filter(id => id !== fid) })} className="hover:text-red-500 ml-0.5">×</button>
                                                                                </span>
                                                                            ) : null;
                                                                        });
                                                                        let defaults = null;
                                                                        if ((!cell.facultyIds || cell.facultyIds.length === 0) && course) {
                                                                            const defIds = (course as any).facultyIds || (course.facultyId ? [course.facultyId] : []);
                                                                            defaults = defIds.map((fid:string) => {
                                                                                const f = faculty.find(u => u.id === fid);
                                                                                return f ? <span key={`def-${fid}`} title={`Default: ${f.name}`} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-muted text-muted-foreground text-[8px] font-bold rounded cursor-help border border-border opacity-70">{f.name}</span> : null;
                                                                            });
                                                                        }
                                                                        return <>{overrides}{defaults}</>;
                                                                    })()}
                                                                </div>
                                                                <select className="w-full bg-muted/40 text-[9px] font-bold text-muted-foreground border border-border/30 rounded px-1 py-1 focus:border-primary outline-none cursor-pointer" value="" onChange={(e) => { if(e.target.value && !cell.facultyIds?.includes(e.target.value)) updateCell({ facultyIds: [...(cell.facultyIds || []), e.target.value] }); }}>
                                                                    <option value="">+ Faculty Override</option>
                                                                    {faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* --- PRACTICAL / BATCH MODE --- */}
                                                {cell.type === 'practical' && (
                                                    <div className="space-y-3">
                                                        <div className="flex flex-wrap gap-1 mb-1">
                                                            {(() => {
                                                                const subjects = (cell.batches || []).map((b: any) => relevantCourses.find(c => c.id === b.subjectId)?.subject).filter(Boolean);
                                                                const unique = Array.from(new Set(subjects));
                                                                return unique.length > 0 ? (
                                                                    <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                                                                        {unique.map(s => `${s} Practical`).join(' / ')}
                                                                    </div>
                                                                ) : null;
                                                            })()}
                                                        </div>
                                                        {(cell.batches || []).map((batch: any, bIdx: number) => (
                                                            <div key={batch.id || bIdx} className="bg-muted/30 p-2.5 rounded-xl border border-border/50 text-left shadow-sm">
                                                                <div className="flex items-center gap-1.5 mb-2">
                                                                    <input type="text" placeholder="Batch" value={batch.name || ''} onChange={(e) => { const newBatches = [...(cell.batches || [])]; newBatches[bIdx].name = e.target.value; updateCell({ batches: newBatches }); }} className="w-12 bg-background border border-border rounded-lg px-1 py-1 text-[10px] font-black text-center focus:ring-1 focus:ring-primary outline-none" />
                                                                    <input type="text" placeholder="Room" value={batch.roomId || ''} onChange={(e) => { const newBatches = [...(cell.batches || [])]; newBatches[bIdx].roomId = e.target.value; updateCell({ batches: newBatches }); }} className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-[10px] font-bold focus:ring-1 focus:ring-primary outline-none" />
                                                                    <button onClick={() => { const newBatches = cell.batches?.filter((_, i) => i !== bIdx); updateCell({ batches: newBatches }); }} className="p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"><CloseIcon className="w-3.5 h-3.5"/></button>
                                                                </div>
                                                                <select value={batch.subjectId || ''} onChange={(e) => { const newBatches = [...(cell.batches || [])]; newBatches[bIdx].subjectId = e.target.value; updateCell({ batches: newBatches }); }} className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-[10px] font-black mb-2 outline-none cursor-pointer focus:ring-1 focus:ring-primary">
                                                                    <option value="">Select Module</option>
                                                                    {relevantCourses.map(c => <option key={c.id} value={c.id}>{c.subject}</option>)}
                                                                </select>
                                                                <select value={batch.facultyIds?.[0] || ''} onChange={(e) => { const newBatches = [...(cell.batches || [])]; newBatches[bIdx].facultyIds = [e.target.value]; updateCell({ batches: newBatches }); }} className="w-full bg-muted/50 text-[9px] border border-border/30 rounded-lg px-2 py-1 outline-none cursor-pointer">
                                                                    <option value="">Assign Faculty</option>
                                                                    {faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                                                </select>
                                                            </div>
                                                        ))}
                                                        <button onClick={() => updateCell({ batches: [...(cell.batches || []), { id: generateId(), name: `B${(cell.batches?.length || 0) + 1}`, facultyIds: [] }] })} className="w-full py-1.5 border border-dashed border-primary/30 text-primary text-[10px] font-bold rounded-lg hover:bg-primary/5 transition-colors">
                                                            + Add Batch
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {viewMode === 'dnd' && (
                <div className="flex flex-col gap-4 text-left">
                    <div className="bg-card rounded-2xl border border-border p-3 flex gap-3 overflow-x-auto custom-scrollbar shadow-sm items-center min-h-[80px]">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap pl-2">Subject Palette:</span>
                        {relevantCourses.map(c => (
                            <div key={c.id} draggable onDragStart={(e) => handleDragStart(e, c.id)} className="shrink-0 px-3 py-2 bg-muted/40 border border-border/60 rounded-xl cursor-grab active:cursor-grabbing text-xs font-semibold text-foreground hover:bg-primary/10 hover:border-primary/30 transition-all shadow-sm flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/60"></div>
                                {c.subject}
                            </div>
                        ))}
                    </div>

                    <div className="bg-card rounded-2xl border border-border overflow-auto custom-scrollbar shadow-sm h-[600px]">
                        <table className="w-full text-sm border-collapse min-w-[850px]">
                            <thead>
                                <tr className="bg-muted/30 border-b border-border sticky top-0 z-10 backdrop-blur-md">
                                    <th className="p-3 border-r border-border font-bold text-[10px] uppercase tracking-wide text-muted-foreground w-20 bg-card">Period</th>
                                    {DAYS.map(d => <th key={d} className="p-3 border-r border-border font-bold text-[10px] uppercase tracking-wide text-foreground text-center min-w-[120px] bg-card">{d}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {effectiveSlots.map(slot => (
                                    <tr key={slot.id}>
                                        <td className="p-3 border-r border-border font-bold text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/5">{formatSlotLabel(slot.label)}</td>
                                        {DAYS.map(day => {
                                            const cell = schedule[day]?.[slot.id];
                                            const subjectIds = getCellSubjectIds(cell);
                                            const subject = subjectIds.length > 0
                                                ? subjectIds.map(id => relevantCourses.find(c => c.id === id)?.subject).filter(isDefinedString).join(' / ')
                                                : null;
                                            
                                            // DnD Specific Rendering
                                            return (
                                                <td key={`${day}-${slot.id}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(day, slot.id, e)} className={`p-1.5 border-r border-border/40 h-24 align-top transition-all duration-300 ${cell ? 'bg-primary/5' : 'hover:bg-muted/10'}`}>
                                                    {cell ? (
                                                        <div className="h-full w-full p-2 rounded-lg border border-primary/20 bg-background flex flex-col justify-between relative group/item shadow-sm">
                                                            <button onClick={() => handleClearSlot(day, slot.id)} className="absolute -top-1.5 -right-1.5 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover/item:opacity-100 transition-opacity shadow-sm z-10"><CloseIcon className="w-2.5 h-2.5"/></button>
                                                            
                                                            {cell.type === 'practical' ? (
                                                                <div className="flex flex-col h-full justify-center">
                                                                    <div className="flex items-center gap-1 mb-1 text-primary">
                                                                        <BeakerIcon className="w-3 h-3"/>
                                                                        <span className="font-bold text-[10px] uppercase">Practical</span>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {cell.batches?.map((b:any, i:number) => <span key={i} className="px-1 bg-muted rounded text-[8px] font-bold border border-border">{b.name}</span>)}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                // Standard Lecture Card in DnD
                                                                <>
                                                                    <div>
                                                                        <span className="font-bold text-[10px] text-primary line-clamp-1 leading-tight">{subject}</span>
                                                                        {/* Simple list of faculties for DnD view */}
                                                                        <div className="flex flex-wrap gap-0.5 mt-1">
                                                                            {(cell.facultyIds || []).map(fid => {
                                                                                const f = faculty.find(u => u.id === fid);
                                                                                return f ? <span key={fid} className="bg-muted px-1 rounded text-[7px] font-bold text-muted-foreground">{f.name.split(' ')[0]}</span> : null;
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-[9px] font-bold text-muted-foreground/60 uppercase text-right">{cell.roomId || 'RM?'}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    ) : <div className="h-full w-full rounded-lg border border-dashed border-border/40 hover:border-primary/30 transition-all"></div>}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {viewMode === 'upload' && (
                <div className="flex flex-col items-center justify-center p-12 bg-card rounded-2xl border border-border shadow-sm min-h-[300px] border-dashed">
                    <div className="p-4 bg-primary/10 rounded-full mb-4">
                        <UploadIcon className="w-8 h-8 text-primary"/>
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1">Bulk CSV Import</h3>
                    <p className="text-muted-foreground text-xs mb-6 text-center max-w-xs">Upload a CSV with columns: Day, Time, Subject, Room, FacultyEmails(separated by ;).</p>
                    
                    <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                        <label className="w-full py-3 bg-muted border border-border rounded-xl flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-all font-bold text-xs text-foreground">
                            <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                            {csvFile ? csvFile.name : "Select File"}
                        </label>
                        {csvPreview.length > 0 && (
                            <ButtonPrimary onClick={commitCsv} className="w-full">
                                Process {csvPreview.length} Rows 
                            </ButtonPrimary>
                        )}
                    </div>
                </div>
            )}
            
            <TimeSlotEditorModal
                isOpen={isSlotModalOpen}
                onClose={() => setIsSlotModalOpen(false)}
                slots={slotEditorSlots}
                onUpdateSlots={handleSaveSlots}
                scope={slotScope}
                onScopeChange={canScopeToggle ? setSlotScope : undefined}
                scopeLabel={slotScopeLabel}
            />
        </div>
    );
};
