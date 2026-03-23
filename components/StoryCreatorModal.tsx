
import React, { useState, useRef } from 'react';
import type { Story, User, Group } from '../types';
import { CloseIcon, SendIcon, UsersIcon, PhotoIcon, TrashIcon } from './Icons';
import Avatar from './Avatar';

// Cloudinary Config
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

interface StoryCreatorModalProps {
  currentUser: User;
  adminOfGroups: Group[];
  onClose: () => void;
  onAddStory: (storyDetails: { 
    textContent?: string; 
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    backgroundColor?: string;
    fontFamily?: string;
    fontWeight?: string;
    fontSize?: string;
    groupId?: string;
  }) => void;
  defaultGroup?: Group;
}

type Poster = {
    type: 'user' | 'group';
    id: string;
    name: string;
    avatarUrl?: string;
}

const backgroundOptions = [
    'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500',
    'bg-gradient-to-br from-green-400 to-cyan-500',
    'bg-gradient-to-br from-yellow-400 via-red-500 to-pink-500',
    'bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500',
    'bg-gradient-to-br from-sky-400 to-blue-600',
    'bg-slate-900', // Simple dark for text
];

const fontFamilies = [
    { name: 'Sans', class: 'font-sans' },
    { name: 'Serif', class: 'font-serif' },
    { name: 'Mono', class: 'font-mono' },
];

const textBackgroundStyles = [
  { name: 'None', classes: '' },
  { name: 'Light', classes: 'bg-white/90 text-black px-4 py-2 rounded-lg' },
  { name: 'Dark', classes: 'bg-black/60 text-white px-4 py-2 rounded-lg' },
];


const StoryCreatorModal: React.FC<StoryCreatorModalProps> = ({ currentUser, adminOfGroups, onClose, onAddStory, defaultGroup }) => {
    const [textContent, setTextContent] = useState('');
    const [backgroundColor, setBackgroundColor] = useState(backgroundOptions[0]);
    const [fontFamilyIndex, setFontFamilyIndex] = useState(0);
    const [textBackgroundIndex, setTextBackgroundIndex] = useState(0);
    const [isBold, setIsBold] = useState(true);
    
    // Media State
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1); // Zoom state
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [poster, setPoster] = useState<Poster>(
        defaultGroup
            ? { type: 'group', id: defaultGroup.id, name: defaultGroup.name }
            : { type: 'user', id: currentUser.id, name: 'Your Story', avatarUrl: currentUser.avatarUrl }
    );

    const activeFont = fontFamilies[fontFamilyIndex];
    const activeTextBackground = textBackgroundStyles[textBackgroundIndex];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMediaFile(file);
            setZoom(1); // Reset zoom on new file
            const reader = new FileReader();
            reader.onloadend = () => {
                setMediaPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const clearMedia = () => {
        setMediaFile(null);
        setMediaPreview(null);
        setZoom(1);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async () => {
        if (!textContent.trim() && !mediaFile) return;

        setIsUploading(true);
        try {
            let mediaUrl = undefined;
            let mediaType: 'image' | 'video' | undefined = undefined;

            if (mediaFile) {
                mediaUrl = await uploadToCloudinary(mediaFile);
                mediaType = 'image'; // Assuming image for now
            }

            onAddStory({ 
                textContent: textContent.trim() || undefined, 
                mediaUrl,
                mediaType,
                backgroundColor: !mediaFile ? backgroundColor : undefined, // BG only for text stories
                fontFamily: !mediaFile ? activeFont.class : undefined,
                fontWeight: !mediaFile && isBold ? 'font-bold' : 'font-normal',
                fontSize: 'text-3xl',
                groupId: poster.type === 'group' ? poster.id : undefined
            });
            onClose();
        } catch (error) {
            console.error("Story upload failed", error);
            alert("Failed to upload story. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };
    
    const isTextMode = !mediaPreview;

    return (
        // Changed z-index from z-50 to z-[60] to stay above BottomNavBar (z-50)
        <div className="fixed inset-0 bg-black z-[60] flex flex-col" role="dialog" aria-modal="true">
            {/* Background Layer */}
            <div className={`absolute inset-0 transition-colors duration-300 overflow-hidden ${isTextMode ? backgroundColor : 'bg-black'}`}>
                {mediaPreview && (
                    <img 
                        src={mediaPreview} 
                        alt="Story Preview" 
                        className="absolute inset-0 w-full h-full object-contain bg-black transition-transform duration-100 ease-out origin-center" 
                        style={{ transform: `scale(${zoom})` }}
                    />
                )}
            </div>

            {/* UI Overlay */}
            <div className="relative flex-1 flex flex-col p-4 safe-area-top">
                {/* Header */}
                <div className="relative h-12 flex justify-between items-center z-10">
                    <button onClick={onClose} className="p-2 bg-black/30 rounded-full text-white hover:bg-black/50 backdrop-blur-sm">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                    
                    {isTextMode && (
                        <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center space-x-2 bg-black/40 backdrop-blur-sm p-1.5 rounded-full">
                            <button 
                                onClick={() => setFontFamilyIndex((prev) => (prev + 1) % fontFamilies.length)}
                                className="text-white font-semibold text-sm px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors"
                            >
                                <span className={activeFont.class}>{activeFont.name}</span>
                            </button>
                            <button
                                onClick={() => setTextBackgroundIndex((prev) => (prev + 1) % textBackgroundStyles.length)}
                                className="text-white font-semibold text-sm w-9 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                            >
                                AA
                            </button>
                            <div className="w-px h-5 bg-white/30 mx-1"></div>
                            {backgroundOptions.map(bg => (
                                <button 
                                    key={bg} 
                                    onClick={() => setBackgroundColor(bg)}
                                    className={`w-6 h-6 rounded-full ${bg} border-2 transition-all duration-200 ${backgroundColor === bg ? 'border-white scale-110' : 'border-white/30 hover:border-white/70'}`}
                                />
                            ))}
                        </div>
                    )}

                    {/* Media Toggle / Remove */}
                    <div className="flex gap-2">
                        {mediaPreview ? (
                            <button onClick={clearMedia} className="p-2 bg-black/30 rounded-full text-white hover:bg-red-500/50 transition-colors backdrop-blur-sm">
                                <TrashIcon className="w-6 h-6"/>
                            </button>
                        ) : (
                            <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-black/30 rounded-full text-white hover:bg-white/20 transition-colors backdrop-blur-sm">
                                <PhotoIcon className="w-6 h-6"/>
                            </button>
                        )}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleFileChange} 
                        />
                    </div>
                </div>


                {/* Content Area */}
                <div className="flex-1 flex flex-col justify-center items-center p-4 relative">
                    {isTextMode ? (
                        // Text Mode Input
                        <div className={`${activeTextBackground.classes} w-full`}>
                            <textarea
                                value={textContent}
                                onChange={(e) => setTextContent(e.target.value)}
                                placeholder="Start typing..."
                                maxLength={500}
                                className={`w-full bg-transparent text-white text-center focus:outline-none resize-none placeholder:text-white/50 text-3xl ${activeFont.class} ${isBold ? 'font-bold' : 'font-normal'}`}
                                autoFocus
                            />
                        </div>
                    ) : (
                        // Media Mode Spacer (Input moves to bottom)
                        <div className="flex-1"></div>
                    )}
                </div>

                {/* Footer / Caption Input for Media */}
                <div className="flex flex-col gap-4 z-10 pb-4">
                    
                    {/* Zoom Slider for Media */}
                    {!isTextMode && (
                        <div className="flex items-center justify-center gap-3 w-full max-w-xs mx-auto bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                            <span className="text-white/80 text-[10px] font-bold">−</span>
                            <input 
                                type="range" 
                                min="1" 
                                max="3" 
                                step="0.05" 
                                value={zoom} 
                                onChange={(e) => setZoom(parseFloat(e.target.value))}
                                className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-teal-500 hover:bg-white/50 transition-colors"
                            />
                            <span className="text-white/80 text-[10px] font-bold">+</span>
                        </div>
                    )}

                    {!isTextMode && (
                        <div className="w-full bg-black/40 backdrop-blur-md rounded-full px-4 py-2 flex items-center border border-white/20">
                            <input
                                type="text"
                                value={textContent}
                                onChange={(e) => setTextContent(e.target.value)}
                                placeholder="Add a caption..."
                                className="w-full bg-transparent text-white placeholder:text-white/70 focus:outline-none text-sm"
                            />
                        </div>
                    )}
                    
                    <div className="flex justify-end items-center">
                        <button 
                            onClick={handleSubmit}
                            disabled={!textContent.trim() && !mediaFile || isUploading}
                            className="flex items-center space-x-2 bg-teal-500 text-white font-bold py-3 px-6 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-transform transform hover:scale-105 shadow-lg"
                        >
                            {isUploading ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                                    Sending...
                                </span>
                            ) : (
                                <>
                                    <SendIcon className="w-5 h-5"/>
                                    <span>Share to Story</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StoryCreatorModal;
