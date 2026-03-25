import React, { useState, useRef, useEffect } from 'react';
import type { User } from '../types';
import Avatar from './Avatar';
import { PostIcon, EventIcon, PhotoIcon, CloseIcon, CalendarIcon, ClockIcon, LinkIcon, MapPinIcon, SparkleIcon, BriefcaseIcon } from './Icons';

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = "dwhm79co7";
const CLOUDINARY_UPLOAD_PRESET = "campus_connect_uploads";

const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('resource_type', 'auto'); 
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) throw new Error('Upload failed');
    const data = await response.json();
    return data.secure_url;
};

interface CreatePostProps {
  user: User;
  onAddPost: (postDetails: {
    content: string;
    mediaUrls?: string[];
    mediaType?: 'image' | 'video' | null;
    eventDetails?: { 
        title: string; 
        date: string; 
        location: string; 
        link?: string; 
        category?: string; 
        tags?: string[];
        organizer?: string;
    };
    groupId?: string;
    isConfession?: boolean;
  }) => void;
  groupId?: string;
  isConfessionMode?: boolean;
  isModalMode?: boolean;
  defaultType?: 'post' | 'event';
}

const StyleButton: React.FC<{ onMouseDown: (e: React.MouseEvent) => void; children: React.ReactNode }> = ({ onMouseDown, children }) => (
    <button 
      type="button" 
      onMouseDown={onMouseDown}
      className="font-bold text-sm w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
    </button>
);

const CreatePost: React.FC<CreatePostProps> = ({ user, onAddPost, groupId, isConfessionMode = false, isModalMode = false, defaultType }) => {
  const [postType, setPostType] = useState<'post' | 'event'>(defaultType || 'post');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Event State
  const [eventDetails, setEventDetails] = useState({ 
      title: '', date: '', time: '', location: '', link: '', 
      category: 'Workshop', tags: '' 
  });

  // Media State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  
  const [hasText, setHasText] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Load Draft
  useEffect(() => {
      const draft = localStorage.getItem('postDraft');
      if (draft && !isModalMode && postType === 'post') {
          if (editorRef.current) {
              editorRef.current.innerHTML = draft;
              setHasText(!!draft.trim());
          }
      }
  }, [isModalMode, postType]);

  const clearMedia = () => {
    setSelectedFiles([]);
    setMediaPreviews([]);
    if(imageInputRef.current) imageInputRef.current.value = '';
  };

  const removeMediaItem = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
    setMediaPreviews(urls => urls.filter((_, i) => i !== index));
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
        const filesArray = Array.from(event.target.files);
        const validFiles: File[] = [];
        const newPreviews: string[] = [];

        // 1. Filter valid files (Size limit & Total count limit check)
        for (const file of filesArray) {
             if (file.size > 10 * 1024 * 1024) { // 10MB limit
                 alert(`File ${file.name} is too large (max 10MB)`);
                 continue;
             }
             // Check if adding this file exceeds limit of 5
             if (selectedFiles.length + validFiles.length >= 5) {
                 break; 
             }
             validFiles.push(file);
        }

        if (filesArray.length > validFiles.length) {
             alert("Some files were skipped (limit exceeded or too large).");
        }

        // 2. Generate Previews Asynchronously
        const previewPromises = validFiles.map(file => new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        }));

        const generatedPreviews = await Promise.all(previewPromises);

        // 3. Update State
        setSelectedFiles(prev => [...prev, ...validFiles]);
        setMediaPreviews(prev => [...prev, ...generatedPreviews]);
    }
  };

  const applyStyle = (e: React.MouseEvent, command: string) => {
    e.preventDefault();
    document.execCommand(command, false, undefined);
    editorRef.current?.focus();
  };

  const handleInput = () => {
      const text = editorRef.current?.innerText.trim();
      const html = editorRef.current?.innerHTML || '';
      setHasText(!!text);
      
      // Save draft for main posts only
      if (!isModalMode && postType === 'post') {
          localStorage.setItem('postDraft', html);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const finalContent = editorRef.current?.innerHTML || '';
    const currentTextContent = editorRef.current?.innerText.trim() || editorRef.current?.textContent?.trim() || '';

    if (postType === 'post' && !currentTextContent && selectedFiles.length === 0) {
        alert("Please write something or add a photo.");
        return;
    }

    let finalEventDetails;
    if (postType === 'event' && !isConfessionMode) {
        const title = eventDetails.title.trim();
        const date = eventDetails.date;
        const time = eventDetails.time;
        const location = eventDetails.location.trim();

        if (!title || !date || !time || !location) {
            alert("Please fill in all required event details.");
            return;
        }

        try {
            const combinedDateTime = new Date(`${date}T${time}`);
            if (isNaN(combinedDateTime.getTime())) {
                alert("Invalid date or time.");
                return;
            }
            finalEventDetails = {
                title,
                date: combinedDateTime.toISOString(),
                location,
                link: eventDetails.link.trim(),
                category: eventDetails.category,
                tags: eventDetails.tags.split(',').map(t => t.trim()).filter(t => t),
                organizer: user.department
            };
        } catch (error) {
            console.error("Event error:", error);
            alert("Failed to process event details.");
            return;
        }
    }

    setIsSubmitting(true);
    try {
        // Upload Media to Cloudinary
        let uploadedUrls: string[] = [];
        if (selectedFiles.length > 0) {
            const uploadPromises = selectedFiles.map(uploadToCloudinary);
            uploadedUrls = await Promise.all(uploadPromises);
        }

        const determinedMediaType = uploadedUrls.length > 0 ? 'image' : null;

        await onAddPost({
            content: finalContent,
            mediaUrls: uploadedUrls, // Sending Cloudinary URLs
            mediaType: determinedMediaType,
            eventDetails: finalEventDetails,
            groupId,
            isConfession: isConfessionMode,
        });

        // Reset UI
        if (editorRef.current) {
            editorRef.current.innerHTML = '';
            setHasText(false);
        }
        localStorage.removeItem('postDraft');
        
        setEventDetails({ title: '', date: '', time: '', location: '', link: '', category: 'Workshop', tags: '' });
        clearMedia();
        
        // Close modal if needed (handled by parent typically via callback, but we just clear state here)
    } catch (error) {
        console.error("Failed to post:", error);
        alert("Failed to create post. Please check your connection and try again.");
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const isEventFormValid = postType === 'event' 
    ? eventDetails.title.trim() && eventDetails.date && eventDetails.time && eventDetails.location.trim()
    : true;

  const isPostFormValid = postType === 'post'
    ? hasText || selectedFiles.length > 0
    : true;

  return (
    <div className="flex flex-col h-full bg-card relative overflow-hidden">
        {/* Post Type Switcher */}
        {!isConfessionMode && (
            <div className="px-4 pt-4 pb-2">
                <div className="bg-muted/50 p-1 rounded-xl flex relative overflow-hidden">
                    <button 
                        type="button" 
                        onClick={() => setPostType('post')} 
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all duration-200 z-10 ${postType === 'post' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                    >
                        <PostIcon className="w-4 h-4"/> Regular Post
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setPostType('event')} 
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all duration-200 z-10 ${postType === 'event' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                    >
                        <EventIcon className="w-4 h-4"/> Event
                    </button>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="flex gap-3 mb-4 items-center">
                <Avatar src={user.avatarUrl} name={user.name} size="md" />
                <div>
                    <p className="font-bold text-sm text-foreground leading-none">{user.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border/50">
                            {groupId ? 'Group Member' : 'Public'}
                        </span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {postType === 'event' && !isConfessionMode && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Event Title */}
                        <div className="relative group">
                            <input 
                                type="text" 
                                disabled={isSubmitting} 
                                placeholder="Event Title" 
                                className="w-full text-2xl font-bold bg-transparent border-b-2 border-border focus:border-primary py-2 placeholder:text-muted-foreground/40 text-foreground outline-none transition-colors"
                                value={eventDetails.title} 
                                onChange={e => setEventDetails({...eventDetails, title: e.target.value})} 
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Category */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <BriefcaseIcon className="w-3 h-3"/> Category
                                </label>
                                <div className="relative">
                                    <select 
                                        disabled={isSubmitting} 
                                        className="w-full bg-muted/30 border border-border hover:border-primary/50 focus:border-primary rounded-xl px-3 py-2.5 text-sm font-medium text-foreground outline-none transition-all appearance-none" 
                                        value={eventDetails.category} 
                                        onChange={e => setEventDetails({...eventDetails, category: e.target.value})} 
                                    >
                                        <option value="Workshop">Workshop</option>
                                        <option value="Meetup">Meetup</option>
                                        <option value="Competition">Competition</option>
                                        <option value="Cultural">Cultural</option>
                                        <option value="Sports">Sports</option>
                                        <option value="E-Cell">E-Cell</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            {/* Tags */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    Tags (Comma sep)
                                </label>
                                <input 
                                    type="text" 
                                    disabled={isSubmitting} 
                                    placeholder="AI, Dance, Coding..."
                                    className="w-full bg-muted/30 border border-border hover:border-primary/50 focus:border-primary rounded-xl px-3 py-2.5 text-sm font-medium text-foreground outline-none transition-all" 
                                    value={eventDetails.tags} 
                                    onChange={e => setEventDetails({...eventDetails, tags: e.target.value})} 
                                />
                            </div>
                        </div>

                        {/* Date & Time Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <CalendarIcon className="w-3 h-3"/> Date
                                </label>
                                <div className="relative">
                                    <input 
                                        type="date" 
                                        disabled={isSubmitting} 
                                        className="w-full bg-muted/30 border border-border hover:border-primary/50 focus:border-primary rounded-xl px-3 py-2.5 text-sm font-medium text-foreground outline-none transition-all" 
                                        value={eventDetails.date} 
                                        onChange={e => setEventDetails({...eventDetails, date: e.target.value})} 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <ClockIcon className="w-3 h-3"/> Time
                                </label>
                                <div className="relative">
                                    <input 
                                        type="time" 
                                        disabled={isSubmitting} 
                                        className="w-full bg-muted/30 border border-border hover:border-primary/50 focus:border-primary rounded-xl px-3 py-2.5 text-sm font-medium text-foreground outline-none transition-all" 
                                        value={eventDetails.time} 
                                        onChange={e => setEventDetails({...eventDetails, time: e.target.value})} 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Location</label>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                                    <MapPinIcon className="w-4 h-4"/>
                                </div>
                                <input 
                                    type="text" 
                                    disabled={isSubmitting} 
                                    placeholder="Where is it happening?" 
                                    className="w-full bg-muted/30 border border-border hover:border-primary/50 focus:border-primary rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50" 
                                    value={eventDetails.location} 
                                    onChange={e => setEventDetails({...eventDetails, location: e.target.value})} 
                                />
                            </div>
                        </div>

                        {/* Link */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Registration Link (Optional)</label>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                                    <LinkIcon className="w-4 h-4"/>
                                </div>
                                <input 
                                    type="url" 
                                    disabled={isSubmitting} 
                                    placeholder="External URL if applicable" 
                                    className="w-full bg-muted/30 border border-border hover:border-primary/50 focus:border-primary rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50" 
                                    value={eventDetails.link} 
                                    onChange={e => setEventDetails({...eventDetails, link: e.target.value})} 
                                />
                            </div>
                        </div>
                        
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent my-4"></div>
                    </div>
                )}
                
                <div 
                    className={`min-h-[120px] relative cursor-text`}
                    onClick={() => !isSubmitting && editorRef.current?.focus()}
                >
                    <div
                        ref={editorRef}
                        contentEditable={!isSubmitting}
                        suppressContentEditableWarning={true}
                        onInput={handleInput}
                        data-placeholder={postType === 'event' ? "Describe the event agenda, speakers, etc..." : "What's on your mind?"}
                        className="w-full h-full outline-none text-lg text-foreground placeholder:text-muted-foreground empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40 cursor-text leading-relaxed whitespace-pre-wrap"
                    />
                </div>

                {mediaPreviews.length > 0 && (
                    <div className={`grid gap-1 rounded-xl overflow-hidden ${
                        mediaPreviews.length === 1 ? 'grid-cols-1' : 
                        mediaPreviews.length === 2 ? 'grid-cols-2' : 
                        mediaPreviews.length === 3 ? 'grid-cols-2' : 'grid-cols-2'
                    }`}>
                        {mediaPreviews.map((preview, index) => (
                            <div key={index} className={`relative group bg-muted ${
                                mediaPreviews.length === 3 && index === 0 ? 'row-span-2' : ''
                            }`}>
                                <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover aspect-square sm:aspect-video" />
                                <button 
                                    type="button" 
                                    disabled={isSubmitting} 
                                    onClick={() => removeMediaItem(index)} 
                                    className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 shadow-sm backdrop-blur-sm"
                                >
                                    <CloseIcon className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        {mediaPreviews.length < 5 && (
                            <button 
                                type="button"
                                onClick={() => imageInputRef.current?.click()}
                                className="flex flex-col items-center justify-center bg-muted/30 hover:bg-muted/60 aspect-square sm:aspect-video transition-colors text-muted-foreground hover:text-primary group border-2 border-dashed border-border/50 hover:border-primary/30"
                            >
                                <div className="p-3 rounded-full bg-background shadow-sm group-hover:scale-110 transition-transform">
                                    <PhotoIcon className="w-6 h-6"/>
                                </div>
                                <span className="text-xs font-bold mt-2">Add Photo</span>
                            </button>
                        )}
                    </div>
                )}
            </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-muted/5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-1">
                <input type="file" accept="image/*" ref={imageInputRef} onChange={handleFileChange} multiple className="hidden" disabled={isSubmitting} />
                {!isConfessionMode && (
                    <>
                        <button 
                            type="button" 
                            disabled={isSubmitting} 
                            onClick={() => imageInputRef.current?.click()} 
                            className="p-2.5 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20 rounded-full transition-colors" 
                            title="Add Photo"
                        >
                            <PhotoIcon className="w-5 h-5" />
                        </button>
                        <div className="w-px h-6 bg-border mx-2"></div>
                        <StyleButton onMouseDown={(e) => applyStyle(e, 'bold')}>B</StyleButton>
                        <StyleButton onMouseDown={(e) => applyStyle(e, 'italic')}>I</StyleButton>
                    </>
                )}
            </div>
            <button 
                onClick={handleSubmit}
                disabled={isSubmitting || !isEventFormValid || !isPostFormValid}
                className="bg-primary text-primary-foreground font-bold py-2.5 px-6 rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 transform active:scale-95 min-w-[100px] flex justify-center items-center"
            >
                {isSubmitting ? (
                    <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Posting...
                    </span>
                ) : postType === 'event' ? 'Host Event' : 'Post'}
            </button>
        </div>
    </div>
  );
};

export default CreatePost;