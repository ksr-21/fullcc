
import React from 'react';
import type { User } from '../types';
import Avatar from './Avatar';
import { UserIcon, UsersIcon, CalendarIcon, BriefcaseIcon, BookmarkIcon, SettingsIcon, EditIcon, CheckCircleIcon } from './Icons';

interface LeftSidebarProps {
  currentUser: User;
  onNavigate: (path: string) => void;
}

const NavLink: React.FC<{
    icon: React.ElementType;
    label: string;
    path: string;
    onNavigate: (path: string) => void;
}> = ({ icon: Icon, label, path, onNavigate }) => (
    <a 
        onClick={() => onNavigate(path)}
        className="flex items-center space-x-4 px-5 py-3.5 rounded-2xl text-muted-foreground hover:bg-primary/5 hover:text-primary cursor-pointer transition-all group font-black text-xs uppercase tracking-[0.15em] border border-transparent hover:border-primary/10"
    >
        <Icon className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-all transform group-hover:scale-110" />
        <span className="transition-colors">{label}</span>
    </a>
);


const LeftSidebar: React.FC<LeftSidebarProps> = ({ currentUser, onNavigate }) => {
  return (
    <div className="space-y-8">
        {/* Profile Card - Premium Redesign */}
        <div className="bg-card rounded-[2.5rem] shadow-xl border border-border/40 overflow-hidden group hover:shadow-2xl transition-all duration-500">
            <div className="h-28 bg-gradient-to-br from-primary via-teal-600 to-secondary relative">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30 mix-blend-overlay"></div>
                <div className="absolute -bottom-1 left-0 w-full h-12 bg-gradient-to-t from-card to-transparent"></div>
            </div>
            <div className="px-6 pb-8 relative">
                <div className="flex justify-center -mt-12 mb-4 relative">
                    <div className="p-1 bg-card rounded-[2rem] shadow-xl transition-transform duration-500 group-hover:rotate-3 group-hover:scale-105">
                        <Avatar 
                            src={currentUser.avatarUrl} 
                            name={currentUser.name} 
                            size="xl" 
                            className="w-24 h-24 rounded-[1.75rem] border-4 border-card bg-card object-cover cursor-pointer"
                            onClick={() => onNavigate(`#/profile/${currentUser.id}`)}
                        />
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-lg p-1.5 border-4 border-card shadow-lg">
                            <CheckCircleIcon className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                    </div>
                </div>
                <div className="text-center">
                    <h2 
                        className="font-black text-xl text-foreground cursor-pointer hover:text-primary transition-colors tracking-tight"
                        onClick={() => onNavigate(`#/profile/${currentUser.id}`)}
                    >
                        {currentUser.name}
                    </h2>
                    <p className="text-[10px] text-muted-foreground mt-2 font-black uppercase tracking-[0.2em] leading-relaxed">
                        {currentUser.department}<br/>
                        <span className="text-primary/70">{currentUser.tag === 'Student' ? `Year ${currentUser.yearOfStudy || 1}` : currentUser.tag}</span>
                    </p>
                    
                    <button 
                        onClick={() => onNavigate(`#/profile/${currentUser.id}`)} 
                        className="mt-6 w-full py-3 rounded-2xl bg-muted/50 hover:bg-primary hover:text-white border border-border/50 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                        <EditIcon className="w-3.5 h-3.5 stroke-[2.5]" /> Manage Profile
                    </button>
                </div>
            </div>
        </div>

        {/* Quick Links Menu - Minimal & Modern */}
        <div className="space-y-2">
            <h3 className="px-5 text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] mb-4">Explore Campus</h3>
            <nav className="space-y-1">
                <NavLink icon={UserIcon} label="My Profile" path={`#/profile/${currentUser.id}`} onNavigate={onNavigate} />
                <NavLink icon={UsersIcon} label="My Groups" path="#/groups" onNavigate={onNavigate} />
                <NavLink icon={CalendarIcon} label="Events" path="#/events" onNavigate={onNavigate} />
                <NavLink icon={BriefcaseIcon} label="Opportunities" path="#/opportunities" onNavigate={onNavigate} />
                <NavLink icon={BookmarkIcon} label="Saved" path={`#/profile/${currentUser.id}`} onNavigate={onNavigate} />
                <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent my-4 mx-5"></div>
                <NavLink icon={SettingsIcon} label="Account Settings" path="#/settings" onNavigate={() => {}} />
            </nav>
        </div>

        {/* Footer Links */}
        <div className="px-6 space-y-4 pt-4">
           <div className="flex flex-wrap gap-x-4 gap-y-2 text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">
               <a href="#" className="hover:text-primary transition-colors">Privacy</a>
               <a href="#" className="hover:text-primary transition-colors">Terms</a>
               <a href="#" className="hover:text-primary transition-colors">Help</a>
           </div>
           <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.3em]">
               &copy; 2025 CampusConnect
           </p>
       </div>
    </div>
  );
};

export default LeftSidebar;
