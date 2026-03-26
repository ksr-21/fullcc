
import React from 'react';
import type { User } from '../types';
import Avatar from './Avatar';
import {
    UserIcon, UsersIcon, CalendarIcon, BriefcaseIcon, BookmarkIcon, SettingsIcon,
    HomeIcon, BookOpenIcon, MegaphoneIcon, MessageIcon,
    HomeIconSolid, UsersIconSolid, CalendarIconSolid, BriefcaseIconSolid,
    BookOpenIconSolid, MessageIconSolid
} from './Icons';

interface LeftSidebarProps {
  currentUser: User;
  onNavigate: (path: string) => void;
  currentPath?: string;
}

const NavLink: React.FC<{
    icon: React.ElementType;
    activeIcon?: React.ElementType;
    label: string;
    path: string;
    onNavigate: (path: string) => void;
    isActive?: boolean;
    badge?: number;
}> = ({ icon: Icon, activeIcon: ActiveIcon, label, path, onNavigate, isActive, badge }) => {
    const IconComponent = isActive && ActiveIcon ? ActiveIcon : Icon;

    return (
        <a
            onClick={() => onNavigate(path)}
            className={`flex items-center justify-between px-5 py-3.5 rounded-2xl cursor-pointer transition-all group border border-transparent ${
                isActive
                ? 'bg-primary/10 text-primary border-primary/10 shadow-sm'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
        >
            <div className="flex items-center space-x-4">
                <IconComponent className={`w-5 h-5 transition-all transform ${isActive ? 'scale-110' : 'opacity-50 group-hover:opacity-100 group-hover:scale-110'}`} />
                <span className={`text-[11px] font-black uppercase tracking-[0.15em] transition-colors ${isActive ? 'font-black' : 'font-bold'}`}>{label}</span>
            </div>
            {badge !== undefined && badge > 0 && (
                <span className="bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-primary/20">
                    {badge}
                </span>
            )}
        </a>
    );
};


const LeftSidebar: React.FC<LeftSidebarProps> = ({ currentUser, onNavigate, currentPath = '' }) => {
    const navItems = [
        { path: '#/home', icon: HomeIcon, activeIcon: HomeIconSolid, label: 'Home' },
        { path: '#/academics', icon: BookOpenIcon, activeIcon: BookOpenIconSolid, label: 'Academics' },
        { path: '#/groups', icon: UsersIcon, activeIcon: UsersIconSolid, label: 'Groups' },
        { path: '#/events', icon: CalendarIcon, activeIcon: CalendarIconSolid, label: 'Events' },
        { path: '#/opportunities', icon: BriefcaseIcon, activeIcon: BriefcaseIconSolid, label: 'Opportunities' },
        { path: '#/notifications', icon: MegaphoneIcon, activeIcon: MegaphoneIcon, label: 'Notices', badge: (window as any).unreadNoticesCount },
        { path: '#/chat', icon: MessageIcon, activeIcon: MessageIconSolid, label: 'Chat' },
    ];
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

        {/* Quick Links Menu - Primary Navigation */}
        <div className="space-y-2">
            <h3 className="px-5 text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] mb-4">Navigation</h3>
            <nav className="space-y-1">
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        {...item}
                        onNavigate={onNavigate}
                        isActive={currentPath.startsWith(item.path)}
                    />
                ))}

                <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent my-6 mx-5"></div>

                <h3 className="px-5 text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] mb-4">My Account</h3>
                <NavLink
                    icon={UserIcon}
                    label="My Profile"
                    path={`#/profile/${currentUser.id}`}
                    onNavigate={onNavigate}
                    isActive={currentPath === `#/profile/${currentUser.id}`}
                />
                <NavLink
                    icon={BookmarkIcon}
                    label="Saved Posts"
                    path={`#/profile/${currentUser.id}`}
                    onNavigate={onNavigate}
                    isActive={false} // Assuming we can't easily check for saved tab yet
                />
                <NavLink
                    icon={SettingsIcon}
                    label="Settings"
                    path="#/settings"
                    onNavigate={() => {}}
                    isActive={currentPath === '#/settings'}
                />
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
