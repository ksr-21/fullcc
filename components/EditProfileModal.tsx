import React, { useState, useEffect, useRef } from 'react';
import type { User, College } from '../types';
// Added InfoIcon to the imports
import { CameraIcon, CloseIcon, BriefcaseIcon, UserIcon, InfoIcon } from './Icons';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateProfile: (
    updateData: { name: string; bio: string; },
    avatarFile?: File | null
  ) => void;
  colleges: College[];
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  onUpdateProfile 
}) => {
  const [name, setName] = useState(currentUser.name);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser.avatarUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        setName(currentUser.name);
        setBio(currentUser.bio || '');
        setAvatarFile(null);
        setAvatarPreview(currentUser.avatarUrl || null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 700 * 1024) {
        alert("Profile picture must be smaller than 700KB.");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Only name and bio are sent back to the parent
    onUpdateProfile({ name, bio }, avatarFile);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-card rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-border flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-border flex justify-between items-center bg-muted/5">
          <div>
            <h2 className="text-xl font-black text-foreground tracking-tight">Edit Profile</h2>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Personal Identity</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <CloseIcon className="w-5 h-5 text-muted-foreground"/>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {/* Avatar Section */}
            <div className="flex flex-col items-center mb-4">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-24 h-24 rounded-[2rem] overflow-hidden border-4 border-card shadow-xl ring-2 ring-primary/20 transition-all group-hover:ring-primary/40">
                        <img
                            src={avatarPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`}
                            alt="Avatar preview"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-lg border-2 border-card group-hover:scale-110 transition-transform">
                        <CameraIcon className="w-4 h-4"/>
                    </div>
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-4">Change Photo</span>
            </div>

            {/* Read-Only Academic Info - NON-EDITABLE */}
            {/* Note: We display these in 'div' and 'p' tags, not inputs */}
            <div className="grid grid-cols-2 gap-3 pb-2 opacity-80 select-none">
                <div className="bg-muted/30 p-3 rounded-2xl border border-border/50 cursor-not-allowed">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                        <BriefcaseIcon className="w-3 h-3"/> Department
                    </p>
                    <p className="text-xs font-bold text-foreground truncate">{currentUser.department}</p>
                </div>
                <div className="bg-muted/30 p-3 rounded-2xl border border-border/50 cursor-not-allowed">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                        <UserIcon className="w-3 h-3"/> Role
                    </p>
                    <p className="text-xs font-bold text-foreground capitalize">{currentUser.tag}</p>
                </div>
            </div>

            {/* Editable Fields (Name & Bio) */}
            <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Full Name</label>
                  <input 
                    type="text" 
                    id="name" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                    className="w-full bg-input border border-border rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner" 
                    placeholder="Enter your name"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="bio" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Bio</label>
                  <textarea 
                    id="bio" 
                    value={bio} 
                    onChange={e => setBio(e.target.value)} 
                    rows={4} 
                    placeholder="Tell the campus about yourself..." 
                    className="w-full bg-input border border-border rounded-2xl px-5 py-3.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none resize-none transition-all shadow-inner" 
                  />
                </div>
            </div>

            {/* Disclaimer Box */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-2xl flex items-start gap-3">
                <InfoIcon className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-600 dark:text-blue-300 font-bold leading-relaxed">
                    Department and Role information are managed by your institution's administration. Please contact your HOD to request changes to these details.
                </p>
            </div>
          </div>

          <div className="p-6 bg-muted/5 border-t border-border flex justify-end gap-3">
             <button type="button" onClick={onClose} className="px-6 py-3 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                Cancel
            </button>
            <button type="submit" className="px-8 py-3 font-black text-[10px] uppercase tracking-widest text-primary-foreground bg-primary rounded-2xl hover:bg-primary/90 shadow-xl shadow-primary/20 active:scale-95 transition-all">
                Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;