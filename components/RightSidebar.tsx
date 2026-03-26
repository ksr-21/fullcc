
import React from 'react';
import type { User, Group, Post, Notice } from '../types';
// Added MapPinIcon and PlusIcon to the imports list
import { UsersIcon, TrendingUpIcon, MegaphoneIcon, CalendarIcon, ArrowRightIcon, SparkleIcon, ClockIcon, MapPinIcon, PlusIcon } from './Icons';
import Avatar from './Avatar';

interface RightSidebarProps {
  groups: Group[];
  events: Post[];
  currentUser: User;
  onNavigate: (path: string) => void;
  users: User[];
  notices?: Notice[];
}

const SidebarCard = ({ title, icon: Icon, children, onSeeMore }: any) => (
    <div className="bg-card/40 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-white/5 overflow-hidden relative group transition-all duration-500 hover:shadow-primary/5">
        <div className="flex items-center justify-between mb-6 relative z-10 px-1">
            <h3 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] flex items-center gap-2">
                {title}
            </h3>
            {onSeeMore && (
                <button onClick={onSeeMore} className="text-[9px] font-black text-primary hover:underline uppercase tracking-widest transition-all">
                    More
                </button>
            )}
        </div>
        <div className="space-y-4 relative z-10">
            {children}
        </div>
    </div>
);

const RightSidebar: React.FC<RightSidebarProps> = ({ groups, events, currentUser, onNavigate, users, notices = [] }) => {

  const suggestedGroups = groups
    .filter(g => !(g.memberIds || []).includes(currentUser.id) && !(currentUser.followingGroups || []).includes(g.id))
    .slice(0, 3);

  const upcomingEvents = events
    .filter(e => e.eventDetails && new Date(e.eventDetails.date) > new Date())
    .sort((a, b) => new Date(a.eventDetails!.date).getTime() - new Date(b.eventDetails!.date).getTime())
    .slice(0, 3);

  const suggestedUsers = users
    .filter(u => u.department === currentUser.department && u.id !== currentUser.id)
    .sort(() => 0.5 - Math.random()) 
    .slice(0, 3);
    
  const latestNotices = notices
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-8">
      
      {/* Search / Discover Hint */}
      <div className="px-6 py-4 bg-primary rounded-3xl text-white shadow-lg shadow-primary/30 flex items-center justify-between group cursor-pointer hover:scale-[1.02] transition-all duration-300" onClick={() => onNavigate('#/search')}>
          <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl"><SparkleIcon className="w-5 h-5 fill-current"/></div>
              <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Discover</p>
                  <p className="text-sm font-black tracking-tight leading-none">Find More Content</p>
              </div>
          </div>
          <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>
      </div>

      {/* Latest Bulletins */}
      {latestNotices.length > 0 && (
          <SidebarCard title="Announcements" icon={MegaphoneIcon} onSeeMore={() => onNavigate('#/academics')}>
              {latestNotices.map(notice => (
                  <div key={notice.id} className="flex items-start gap-4 p-4 rounded-2xl bg-muted/30 hover:bg-primary/5 transition-all cursor-pointer border border-transparent hover:border-primary/10 group/item" onClick={() => onNavigate('#/academics')}>
                      <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl group-hover/item:scale-110 transition-transform shadow-sm flex-shrink-0">
                          <MegaphoneIcon className="w-4 h-4"/>
                      </div>
                      <div className="min-w-0">
                          <p className="text-xs font-black text-foreground line-clamp-2 leading-snug mb-1 group-hover/item:text-primary transition-colors">{notice.title}</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">{new Date(notice.timestamp).toLocaleDateString()}</p>
                      </div>
                  </div>
              ))}
          </SidebarCard>
      )}

      {/* Peer Suggestions */}
       {suggestedUsers.length > 0 && (
        <SidebarCard title="Campus Peers" icon={UsersIcon} onSeeMore={() => onNavigate('#/search')}>
            <div className="space-y-4">
                {suggestedUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between group/user cursor-pointer" onClick={() => onNavigate(`#/profile/${user.id}`)}>
                        <div className="flex items-center gap-3 min-w-0">
                            <Avatar src={user.avatarUrl} name={user.name} size="md" className="w-10 h-10 ring-2 ring-transparent group-hover/user:ring-primary/20 transition-all rounded-xl"/>
                            <div className="min-w-0">
                                <p className="font-black text-foreground text-xs truncate leading-tight group-hover/user:text-primary transition-colors">{user.name}</p>
                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold truncate opacity-70">{user.department.split(' ')[0]}</p>
                            </div>
                        </div>
                        <button className="text-[9px] font-black uppercase tracking-widest bg-muted/60 hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg transition-all active:scale-90">View</button>
                    </div>
                ))}
            </div>
        </SidebarCard>
    )}

      {/* Events Quicklist */}
      {upcomingEvents.length > 0 && (
         <SidebarCard title="Event Radar" icon={CalendarIcon} onSeeMore={() => onNavigate('#/events')}>
            <div className="space-y-5">
                {upcomingEvents.map(event => (
                    <div key={event.id} className="flex items-start gap-4 cursor-pointer group/event" onClick={() => onNavigate(`#/events/${event.id}`)}>
                        <div className="flex-shrink-0 w-12 h-14 bg-card border border-border/60 rounded-2xl flex flex-col items-center justify-center shadow-sm group-hover/event:bg-indigo-600 group-hover/event:border-indigo-600 transition-all duration-500">
                            <span className="text-[9px] font-black uppercase tracking-tighter text-indigo-600 group-hover/event:text-white/80">{new Date(event.eventDetails!.date).toLocaleString('default', { month: 'short' })}</span>
                            <span className="text-xl font-black leading-none text-foreground group-hover/event:text-white mt-0.5">{new Date(event.eventDetails!.date).getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                            <p className="font-black text-foreground text-xs leading-tight group-hover/event:text-primary transition-colors line-clamp-1">{event.eventDetails?.title}</p>
                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5 opacity-70">
                                <MapPinIcon className="w-3 h-3 text-red-500"/>
                                <span className="truncate">{event.eventDetails?.location}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
         </SidebarCard>
      )}

      {/* Clubs Suggestion */}
      {suggestedGroups.length > 0 && (
        <SidebarCard title="Join a Squad" icon={TrendingUpIcon} onSeeMore={() => onNavigate('#/groups')}>
            <div className="space-y-4">
                {suggestedGroups.map(group => (
                    <div key={group.id} className="flex items-center justify-between group/club cursor-pointer" onClick={() => onNavigate(`#/groups/${group.id}`)}>
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center text-white shadow-lg group-hover/club:scale-110 transition-transform">
                                <UsersIcon className="w-5 h-5 stroke-[2.5]"/>
                            </div>
                            <div className="min-w-0">
                                <p className="font-black text-foreground text-xs truncate group-hover/club:text-primary transition-colors leading-tight">{group.name}</p>
                                <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">{(group.memberIds || []).length} Members</p>
                            </div>
                        </div>
                        <button className="p-2 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all">
                            <PlusIcon className="w-4 h-4 stroke-[3]"/>
                        </button>
                    </div>
                ))}
            </div>
        </SidebarCard>
      )}
    </div>
  );
};

export default RightSidebar;
