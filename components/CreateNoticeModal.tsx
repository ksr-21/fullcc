import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Course, Notice, College } from '../types';
import { MegaphoneIcon, CloseIcon, PhotoIcon } from './Icons';
import { storage, compressImage } from '../api';

interface CreateNoticeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateNotice: (notice: any) => void;
    currentUser: User;
    college: College;
    courses: Course[];
}

const CreateNoticeModal: React.FC<CreateNoticeModalProps> = ({ isOpen, onClose, onCreateNotice, currentUser, college, courses }) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [audience, setAudience] = useState('All');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [targetDept, setTargetDept] = useState('All');
    const [targetYear, setTargetYear] = useState('All');
    const [targetDiv, setTargetDiv] = useState('All');
    const [targetCourseId, setTargetCourseId] = useState('');
    const [isSending, setIsSending] = useState(false);

    const availableYears = useMemo<number[]>(() => {
        if (targetDept === 'All' || !college?.classes?.[targetDept]) return [1, 2, 3, 4];
        return Object.keys(college.classes[targetDept]).map(y => parseInt(y, 10)).sort((a, b) => a - b);
    }, [college, targetDept]);

    const availableDivs = useMemo<string[]>(() => {
        if (targetDept === 'All' || targetYear === 'All' || !college?.classes?.[targetDept]?.[targetYear]) return ['A', 'B', 'C', 'D'];
        return college.classes[targetDept][targetYear].sort();
    }, [college, targetDept, targetYear]);

    const filteredCourses = useMemo(() => {
        if (!courses) return [];
        if (targetDept === 'All') return courses;
        return courses.filter((c: Course) => c.department === targetDept);
    }, [courses, targetDept]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
        }
    };

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
            setTitle('');
            setMessage('');
            setSelectedImage(null);
            onClose();
        } catch (error: any) {
            alert(`Error sending: ${error.message || 'Unknown error'}`);
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-card rounded-[2rem] shadow-2xl w-full max-w-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-border bg-muted/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <MegaphoneIcon className="w-5 h-5 text-primary"/>
                        </div>
                        <h3 className="font-black text-xl text-foreground tracking-tight">New Broadcast</h3>
                    </div>
                    <button onClick={onClose} className="p-2 bg-muted rounded-full hover:bg-muted/80 transition-colors">
                        <CloseIcon className="w-5 h-5 text-muted-foreground"/>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <form onSubmit={handleSend} className="space-y-6">
                        <div className="bg-muted/20 p-5 rounded-2xl border border-border/50 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Target Audience</label>
                                <select value={audience} onChange={e => { setAudience(e.target.value); setTargetDept('All'); setTargetYear('All'); setTargetDiv('All'); setTargetCourseId(''); }} className="w-full bg-input border border-border rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary outline-none">
                                    <option value="All">Everyone</option>
                                    <option value="Student">Specific Class</option>
                                    <option value="Teacher">Specific Faculty</option>
                                    <option value="Course">Specific Subject</option>
                                    <option value="HOD/Dean">HODs & Deans</option>
                                </select>
                            </div>
                            {(audience === 'Student' || audience === 'Teacher' || audience === 'Course') && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Dept</label>
                                        <select value={targetDept} onChange={e => setTargetDept(e.target.value)} className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none">
                                            <option value="All">All Departments</option>
                                            {college?.departments?.map((dept: string) => <option key={dept} value={dept}>{dept}</option>)}
                                        </select>
                                    </div>
                                    {audience === 'Student' && (
                                        <>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Year</label>
                                                <select value={targetYear} onChange={e => setTargetYear(e.target.value)} className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none">
                                                    <option value="All">All Years</option>
                                                    {availableYears.map(y => <option key={y} value={y}>Year {y}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Div</label>
                                                <select value={targetDiv} onChange={e => setTargetDiv(e.target.value)} className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none">
                                                    <option value="All">All</option>
                                                    {availableDivs.map(d => <option key={d} value={d}>Div {d}</option>)}
                                                </select>
                                            </div>
                                        </>
                                    )}
                                    {audience === 'Course' && (
                                        <div className="sm:col-span-2 space-y-1">
                                            <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Subject</label>
                                            <select value={targetCourseId} onChange={e => setTargetCourseId(e.target.value)} className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none">
                                                <option value="">-- Choose Subject --</option>
                                                {filteredCourses.map((c: Course) => <option key={c.id} value={c.id}>{c.subject} {targetDept === 'All' ? `(${c.department})` : ''}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="space-y-4">
                            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Subject Title" className="w-full bg-input border border-border rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary outline-none" required />
                            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} placeholder="Message body..." className="w-full bg-input border border-border rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary outline-none resize-none" required />
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Attachment</label>
                                {!selectedImage ? (
                                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-4 flex items-center justify-center cursor-pointer hover:bg-muted/30">
                                        <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                                        <PhotoIcon className="w-5 h-5 text-muted-foreground mr-2"/>
                                        <p className="text-xs font-bold text-muted-foreground">Upload Image</p>
                                    </div>
                                ) : (
                                    <div className="relative h-20 rounded-xl overflow-hidden border border-border">
                                        <img src={URL.createObjectURL(selectedImage)} className="w-full h-full object-cover" alt="Preview"/>
                                        <button type="button" onClick={() => setSelectedImage(null)} className="absolute inset-0 bg-black/50 text-white font-bold opacity-0 hover:opacity-100 flex items-center justify-center">Remove</button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end pt-4 border-t border-border">
                            <button type="submit" disabled={isSending} className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-primary/90 transition-all">
                                {isSending ? 'Publishing...' : 'Publish'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateNoticeModal;
