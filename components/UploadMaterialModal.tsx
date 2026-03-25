import React, { useState, useRef } from 'react';
import { CloseIcon, FileIcon, AlertTriangleIcon, UploadIcon } from './Icons';
import { Note } from '../types';

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = "dwhm79co7";
const CLOUDINARY_UPLOAD_PRESET = "campus_connect_uploads";

interface UploadMaterialModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (note: Note) => void;
    courseId: string;
}

const UploadMaterialModal: React.FC<UploadMaterialModalProps> = ({ isOpen, onClose, onUpload, courseId }) => {
    const [title, setTitle] = useState('');
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
            // Using /auto/ path specifies mixed resource types (PDF, Image, etc)
            const xhr = new XMLHttpRequest();
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
                        
                        // Ensure PDF extension is present in URL for delivery
                        if (file.name.toLowerCase().endsWith('.pdf') && !url.toLowerCase().endsWith('.pdf')) {
                            if (response.format) {
                                url = url.split('.').slice(0, -1).join('.') + '.' + response.format;
                            } else {
                                url = url + '.pdf';
                            }
                        }
                        resolve(url);
                    } catch (e) {
                        reject(new Error("Failed to process server response"));
                    }
                } else {
                    try {
                        const errRes = JSON.parse(xhr.responseText);
                        reject(new Error(errRes.error?.message || `Upload rejected (${xhr.status})`));
                    } catch (e) {
                        reject(new Error(`Server error: ${xhr.status}`));
                    }
                }
            };

            xhr.onerror = () => reject(new Error('Network error. Check your connection.'));
            xhr.send(formData);
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.size > 25 * 1024 * 1024) {
                setError("File size exceeds 25MB limit.");
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !file) return;

        setIsUploading(true);
        setError(null);
        setUploadProgress(0);

        try {
            const fileUrl = await uploadToCloudinary(file);
            
            const newNote: Note = {
                id: Date.now().toString(),
                title: title.trim(),
                fileUrl,
                fileName: file.name,
                uploadedAt: Date.now()
            };
            
            onUpload(newNote);
            onClose();
            setTitle('');
            setFile(null);
        } catch (err: any) {
            setError(err.message || "Upload failed. Please try again.");
            console.error("Upload Error:", err);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[100] flex justify-center items-center p-4 animate-fade-in backdrop-blur-md">
            <div className="bg-card rounded-[2rem] shadow-2xl w-full max-w-md border border-border overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-border flex justify-between items-center bg-muted/5">
                    <div>
                        <h3 className="font-black text-xl text-foreground tracking-tight">Add Course Material</h3>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Direct Cloud Upload</p>
                    </div>
                    <button onClick={onClose} disabled={isUploading} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <CloseIcon className="w-5 h-5 text-muted-foreground"/>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-start gap-3 animate-bubble-in">
                            <AlertTriangleIcon className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                            <div className="text-xs font-bold text-destructive leading-relaxed">
                                <p className="uppercase mb-1">Upload Issue</p>
                                <p className="opacity-90 font-medium">{error}</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Label</label>
                        <input 
                            type="text" 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            className="w-full bg-input border border-border rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-medium shadow-inner"
                            placeholder="e.g. Unit 1 Notes"
                            required
                            disabled={isUploading}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">File (PDF or Image)</label>
                        <div 
                            onClick={() => !isUploading && fileInputRef.current?.click()}
                            className={`relative border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${isUploading ? 'opacity-50 cursor-wait' : 'hover:bg-primary/5 hover:border-primary/50 group'}`}
                        >
                            <div className="p-4 bg-muted rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                                <FileIcon className="w-8 h-8 text-muted-foreground group-hover:text-primary"/>
                            </div>
                            <span className="text-sm font-bold text-muted-foreground text-center line-clamp-1 px-4">
                                {file ? file.name : "Pick a Document"}
                            </span>
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                            required 
                            disabled={isUploading} 
                            accept=".pdf,image/*" 
                        />
                    </div>

                    {isUploading && (
                        <div className="space-y-2 animate-fade-in">
                            <div className="flex justify-between items-center text-[10px] font-black text-primary uppercase tracking-widest">
                                <span>Syncing...</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden shadow-inner">
                                <div 
                                    className="h-full bg-primary transition-all duration-300 rounded-full" 
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="pt-2">
                        <button 
                            type="submit" 
                            disabled={isUploading || !file || !title} 
                            className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-3 transform active:scale-95"
                        >
                            {isUploading ? "Uploading..." : <><UploadIcon className="w-5 h-5"/> Start Upload</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UploadMaterialModal;