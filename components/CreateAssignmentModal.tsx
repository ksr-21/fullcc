import React, { useState, useRef } from 'react';
import { CloseIcon, UploadIcon, AlertTriangleIcon, ClockIcon } from './Icons';
import { Assignment } from '../types';

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = "dwhm79co7";
const CLOUDINARY_UPLOAD_PRESET = "campus_connect_uploads";

interface CreateAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (assignment: Assignment) => void;
}

const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = ({ isOpen, onClose, onCreate }) => {
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const uploadToCloudinary = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            // Using /auto/ specificsmixed resource types
            xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, true);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    setUploadProgress(percentComplete);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        let url = response.secure_url;
                        if (file.name.toLowerCase().endsWith('.pdf') && !url.toLowerCase().endsWith('.pdf')) {
                            url = response.format ? url.split('.').slice(0, -1).join('.') + '.' + response.format : url + '.pdf';
                        }
                        resolve(url);
                    } catch (e) {
                        reject(new Error("Failed to parse storage response"));
                    }
                } else {
                    try {
                        const errRes = JSON.parse(xhr.responseText);
                        reject(new Error(errRes.error?.message || `Storage error (${xhr.status})`));
                    } catch (e) {
                        reject(new Error(`Server error: ${xhr.status}`));
                    }
                }
            };

            xhr.onerror = () => reject(new Error('Network disconnected.'));
            xhr.send(formData);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !dueDate) return;

        setIsUploading(true);
        setError(null);
        setUploadProgress(0);

        try {
            let fileUrl = '';
            let fileName = '';
            
            if (file) {
                fileUrl = await uploadToCloudinary(file);
                fileName = file.name;
            }

            const newAssignment: Assignment = {
                id: Date.now().toString(),
                title: title.trim(),
                fileUrl,
                fileName,
                postedAt: Date.now(),
                dueDate: new Date(dueDate).getTime()
            };
            
            onCreate(newAssignment);
            onClose();
            setTitle('');
            setDueDate('');
            setFile(null);
        } catch (err: any) {
            setError(err.message || "Could not save assignment.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[100] flex justify-center items-center p-4 animate-fade-in backdrop-blur-md">
            <div className="bg-card rounded-[2.5rem] shadow-2xl w-full max-w-md border border-border overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-border flex justify-between items-center bg-muted/5">
                    <div>
                        <h3 className="font-black text-xl text-foreground tracking-tight">New Assignment</h3>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Cloud Sync Active</p>
                    </div>
                    <button onClick={onClose} disabled={isUploading} className="p-2 hover:bg-muted rounded-full">
                        <CloseIcon className="w-5 h-5 text-muted-foreground"/>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 animate-bubble-in">
                            <AlertTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                            <div className="text-[10px] font-bold text-red-600 leading-tight">
                                <p>{error}</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Task Title</label>
                        <input 
                            type="text" 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            className="w-full bg-input border border-border rounded-2xl px-5 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary text-foreground shadow-inner"
                            placeholder="e.g. Mid-term Report"
                            required
                            disabled={isUploading}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Deadline</label>
                        <div className="relative">
                            <ClockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                            <input 
                                type="date" 
                                value={dueDate} 
                                onChange={e => setDueDate(e.target.value)} 
                                className="w-full bg-input border border-border rounded-2xl pl-11 pr-5 py-3.5 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary text-foreground shadow-inner"
                                required
                                disabled={isUploading}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Reference File (PDF)</label>
                        <div className="flex items-center gap-3">
                            <button 
                                type="button"
                                onClick={() => !isUploading && fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="flex-1 bg-muted hover:bg-muted/80 text-foreground px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest border border-border transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <UploadIcon className="w-4 h-4"/> {file ? 'Update File' : 'Attach PDF'}
                            </button>
                            {file && <div className="text-[10px] font-bold text-primary truncate max-w-[100px]">{file.name}</div>}
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={e => setFile(e.target.files?.[0] || null)} 
                            className="hidden" 
                            disabled={isUploading} 
                            accept=".pdf"
                        />
                    </div>

                    {isUploading && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black text-primary uppercase">
                                <span>Processing...</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                            </div>
                        </div>
                    )}

                    <div className="pt-2">
                        <button 
                            type="submit" 
                            disabled={isUploading || !title || !dueDate} 
                            className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all transform active:scale-95 disabled:opacity-50"
                        >
                            {isUploading ? "Uploading..." : "Save Assignment"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateAssignmentModal;