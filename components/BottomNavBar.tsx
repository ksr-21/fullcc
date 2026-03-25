
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { auth } from '../api';
import { 
    HomeIcon, UsersIcon, SearchIcon, UserIcon, CalendarIcon, BriefcaseIcon, 
    HomeIconSolid, UsersIconSolid, SearchIconSolid, UserIconSolid, CalendarIconSolid, BriefcaseIconSolid,
    LogoutIcon, ChartPieIcon, UserIcon as ProfileIcon
} from './Icons';

interface BottomNavBarProps {
  currentUser: User;
  onNavigate: (path: string) => void;
  currentPage: string;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentUser, onNavigate, currentPage }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const longPressTimer = useRef<any>(null);
  const isLongPress = useRef(false);

  // Removed Chat and Academics. Renamed Opportunities to Career for fit.
  const navItems = [
    { path: '#/home', icon: HomeIcon, activeIcon: HomeIconSolid, label: 'Home' },
    { path: '#/search', icon: SearchIcon, activeIcon: SearchIconSolid, label: 'Search' },
    { path: '#/groups', icon: UsersIcon, activeIcon: UsersIconSolid, label: 'Groups' },
    { path: '#/events', icon: CalendarIcon, activeIcon: CalendarIconSolid, label: 'Events' },
    { path: '#/opportunities', icon: BriefcaseIcon, activeIcon: BriefcaseIconSolid, label: 'Career' },
    { path: `#/profile/${currentUser.id}`, icon: UserIcon, activeIcon: UserIconSolid, label: 'Profile' },
  ];

  const getDashboardPath = () => {
      switch(currentUser.tag) {
          case 'Teacher': return '#/academics';
          case 'HOD/Dean': return '#/hod/academics';
          case 'Director': return '#/director';
          case 'Super Admin': return '#/superadmin';
          default: return null;
      }
  };

  const dashboardPath = getDashboardPath();

  const handleLogout = async () => {
      await auth.signOut();
      onNavigate('#/');
      setShowProfileMenu(false);
  };

  const handleProfilePressStart = () => {
      isLongPress.current = false;
      longPressTimer.current = setTimeout(() => {
          isLongPress.current = true;
          setShowProfileMenu(true);
          if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
  };

  const handleProfilePressEnd = (e: React.MouseEvent | React.TouchEvent) => {
      // Clear the timer if the user lifts their finger/mouse early
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
      }

      // If it wasn't a long press, treat it as a click
      if (!isLongPress.current && !showProfileMenu) {
          onNavigate(`#/profile/${currentUser.id}`);
      }
      
      // Reset after a short delay to prevent event conflicts
      setTimeout(() => { isLongPress.current = false; }, 100);
  };

  const handleClickOutside = () => {
      setShowProfileMenu(false);
  };

  return (
    <>
        {showProfileMenu && (
            <div className="fixed inset-0 z-[60]" onClick={handleClickOutside}>
                <div className="absolute bottom-20 right-2 w-48 bg-popover border border-border shadow-2xl rounded-xl overflow-hidden animate-scale-in origin-bottom-right" onClick={e => e.stopPropagation()}>
                    <div className="p-2 flex flex-col gap-1">
                        {dashboardPath && (
                            <button 
                                onClick={() => { onNavigate(dashboardPath); setShowProfileMenu(false); }}
                                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors text-left"
                            >
                                <ChartPieIcon className="w-4 h-4 text-primary"/> Dashboard
                            </button>
                        )}
                        <button 
                            onClick={() => { onNavigate(`#/profile/${currentUser.id}`); setShowProfileMenu(false); }}
                            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors text-left"
                        >
                            <ProfileIcon className="w-4 h-4 text-foreground"/> My Profile
                        </button>
                        <div className="h-px bg-border my-1"></div>
                        <button 
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors text-left"
                        >
                            <LogoutIcon className="w-4 h-4"/> Logout
                        </button>
                    </div>
                    {/* Little arrow */}
                    <div className="absolute -bottom-2 right-6 w-4 h-4 bg-popover border-b border-r border-border transform rotate-45"></div>
                </div>
            </div>
        )}

        <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50 lg:hidden pb-safe select-none">
        {/* CSS Grid for static, non-scrollable layout with 6 columns */}
        <div className="grid grid-cols-6 h-16 w-full px-1">
            {navItems.map(({ path, icon: Icon, activeIcon: ActiveIcon, label }) => {
            const isProfile = label === 'Profile';
            const isActive = isProfile 
                ? currentPage.startsWith('#/profile/') && currentPage.endsWith(currentUser.id)
                : currentPage.startsWith(path);
                
            const IconComponent = isActive ? ActiveIcon : Icon;
            
            if (isProfile) {
                return (
                    <button
                        key={path}
                        onMouseDown={handleProfilePressStart}
                        onMouseUp={handleProfilePressEnd}
                        onMouseLeave={() => {
                            if (longPressTimer.current) clearTimeout(longPressTimer.current);
                        }}
                        onTouchStart={handleProfilePressStart}
                        onTouchEnd={handleProfilePressEnd}
                        onContextMenu={(e) => e.preventDefault()} // Prevent native context menu
                        className={`flex flex-col items-center justify-center h-full transition-colors duration-200 group focus:outline-none ${
                            isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                        }`}
                        aria-label={label}
                    >
                        <div className={`p-1 rounded-xl transition-all duration-300 ${isActive ? 'transform scale-110' : ''}`}>
                            <IconComponent className="w-6 h-6" />
                        </div>
                        <span className="text-[9px] font-bold mt-0.5 opacity-90 truncate max-w-[60px]">{label}</span>
                    </button>
                );
            }

            return (
                <button
                key={path}
                onClick={() => onNavigate(path)}
                className={`flex flex-col items-center justify-center h-full transition-colors duration-200 group focus:outline-none ${
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label={label}
                >
                <div className={`p-1 rounded-xl transition-all duration-300 ${isActive ? 'transform scale-110' : ''}`}>
                    <IconComponent className="w-6 h-6" />
                </div>
                <span className="text-[9px] font-bold mt-0.5 opacity-90 truncate max-w-[60px]">{label}</span>
                </button>
            );
            })}
        </div>
        </nav>
    </>
  );
};

export default BottomNavBar;
