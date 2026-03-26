
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
        {/* Profile Card - Target Style */}
        <div className="bg-card/40 backdrop-blur-xl rounded-3xl shadow-sm border border-white/5 overflow-hidden group hover:shadow-primary/5 transition-all duration-500">
            <div className="h-20 bg-gradient-to-br from-primary/20 to-cyan-400/20 relative">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            </div>
            <div className="px-6 pb-6 relative">
                <div className="flex justify-center -mt-10 mb-4 relative">
                    <div className="p-1 bg-background rounded-full transition-transform duration-500 group-hover:scale-105 border border-white/10 shadow-xl">
                        <Avatar 
                            src={currentUser.avatarUrl} 
                            name={currentUser.name} 
                            size="xl" 
                            className="w-20 h-20 rounded-full object-cover cursor-pointer"
                            onClick={() => onNavigate(`#/profile/${currentUser.id}`)}
                        />
                    </div>
                </div>
                <div className="text-center">
                    <h2 
                        className="font-black text-lg text-foreground cursor-pointer hover:text-primary transition-colors tracking-tight"
                        onClick={() => onNavigate(`#/profile/${currentUser.id}`)}
                    >
                        {currentUser.name}
                    </h2>
                    <p className="text-[10px] text-muted-foreground mt-1 font-black uppercase tracking-[0.2em]">
                        {currentUser.department}<br/>
                        <span className="text-primary/70">{currentUser.tag === 'Student' ? `Year ${currentUser.yearOfStudy || 1}` : currentUser.tag}</span>
                    </p>
                    
                    <button 
                        onClick={() => onNavigate(`#/profile/${currentUser.id}`)} 
                        className="mt-6 w-full py-3 rounded-2xl bg-muted/20 hover:bg-primary hover:text-white border border-white/5 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                    >
                        Manage Profile
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
