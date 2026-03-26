
import React, { useState, useMemo } from 'react';
import type { User, Post, Group, ReactionType } from '../types';
import Header from '../components/Header';
import BottomNavBar from '../components/BottomNavBar';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import CreatePostModal from '../components/CreatePostModal';
import { CalendarIcon, PlusIcon, SearchIcon, FilterIcon, ClockIcon, MapPinIcon, ArrowRightIcon } from '../components/Icons';
import { auth } from '../api';

interface EventsPageProps {
  currentUser: User;
  users: { [key: string]: User };
  events: Post[];
  groups: Group[];
  onNavigate: (path: string) => void;
  currentPath: string;
  onAddPost: (postDetails: any) => void;
  onReaction: (postId: string, reaction: ReactionType) => void;
  onAddComment: (postId: string, text: string) => void;
  onDeletePost: (postId: string) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  onCreateOrOpenConversation: (otherUserId: string) => Promise<string>;
  onSharePostAsMessage: (conversationId: string, authorName: string, postContent: string) => void;
  onSharePost: (originalPost: Post, commentary: string, shareTarget: { type: 'feed' | 'group'; id?: string }) => void;
  onToggleSavePost: (postId: string) => void;
}

const categories = ['All', 'Workshop', 'Meetup', 'Competition', 'Cultural', 'Sports', 'E-Cell'];

const EventListingCard: React.FC<{ event: Post, onNavigate: (path: string) => void }> = ({ event, onNavigate }) => {
    const details = event.eventDetails!;
    const dateObj = new Date(details.date);
    const month = dateObj.toLocaleString('default', { month: 'short' });
    const day = dateObj.getDate();
    const isClosed = dateObj < new Date();

    // Attendees count logic 
    const attendeesCount = details.attendees?.length || 0;
    
    return (
        <div 
            className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col h-full"
            onClick={() => onNavigate(`#/events/${event.id}`)}
        >
            {/* Image Section */}
            <div className="relative h-40 bg-muted">
                {event.mediaUrls && event.mediaUrls.length > 0 ? (
                    <img src={event.mediaUrls[0]} alt={details.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                        <CalendarIcon className="w-12 h-12 text-primary/30"/>
                    </div>
                )}
                <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-lg border border-white/10">
                    {details.category || 'Event'}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-row gap-4 flex-1">
                {/* Date Badge */}
                <div className="flex-shrink-0 flex flex-col items-center justify-center bg-primary/5 border border-primary/10 rounded-xl w-12 h-14 text-center">
                    <span className="text-[10px] font-bold text-primary uppercase">{month}</span>
                    <span className="text-lg font-extrabold text-foreground leading-none">{day}</span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col">
                    <h3 className="text-lg font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{details.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 flex items-center gap-1">
                        <MapPinIcon className="w-3 h-3"/> {details.location}
                    </p>
                    
                    <div className="mt-auto pt-3 flex items-center justify-between">
                        <div className="text-xs font-semibold text-muted-foreground">
                            {attendeesCount > 0 ? `${attendeesCount} Registered` : 'Be the first!'}
                        </div>
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded border ${isClosed ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                            {isClosed ? 'Closed' : 'Open'}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Action Bar */}
            <div className="px-4 py-3 border-t border-border bg-muted/20 flex justify-between items-center">
                <span className="text-xs font-medium text-muted-foreground">By {details.organizer || 'Campus'}</span>
                <span className="text-xs font-bold text-primary flex items-center gap-1">
                    View Details <ArrowRightIcon className="w-3 h-3"/>
                </span>
            </div>
        </div>
    )
}

const EventsPage: React.FC<EventsPageProps> = (props) => {
  const { currentUser, users, events, groups, onNavigate, currentPath, onAddPost } = props;
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<'upcoming' | 'today' | 'week' | 'past'>('upcoming');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const handleLogout = async () => {
    await auth.signOut();
    onNavigate('#/');
  };

  const filteredEvents = useMemo(() => {
      let filtered = events;

      // 1. Search
      if (searchTerm.trim()) {
          const lower = searchTerm.toLowerCase();
          filtered = filtered.filter(e => 
              e.eventDetails?.title.toLowerCase().includes(lower) || 
              e.eventDetails?.location.toLowerCase().includes(lower)
          );
      }

      // 2. Category
      if (categoryFilter !== 'All') {
          filtered = filtered.filter(e => e.eventDetails?.category === categoryFilter);
      }

      // 3. Time
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      if (timeFilter === 'past') {
          filtered = filtered.filter(e => e.eventDetails && new Date(e.eventDetails.date) < now);
          return filtered.sort((a, b) => new Date(b.eventDetails!.date).getTime() - new Date(a.eventDetails!.date).getTime()); // Newest past first
      } else {
          // Upcoming logic
          filtered = filtered.filter(e => e.eventDetails && new Date(e.eventDetails.date) >= now);
          
          if (timeFilter === 'today') {
             const tomorrow = new Date(todayStart); tomorrow.setDate(tomorrow.getDate() + 1);
             filtered = filtered.filter(e => {
                 const d = new Date(e.eventDetails!.date);
                 return d >= todayStart && d < tomorrow;
             });
          } else if (timeFilter === 'week') {
              filtered = filtered.filter(e => {
                  const d = new Date(e.eventDetails!.date);
                  return d <= nextWeek;
              });
          }
          
          return filtered.sort((a, b) => new Date(a.eventDetails!.date).getTime() - new Date(b.eventDetails!.date).getTime()); // Nearest future first
      }
  }, [events, searchTerm, timeFilter, categoryFilter]);

  const canHost = currentUser.tag !== 'Student' || (currentUser.tag === 'Student' && groups.some(g => g.memberIds.includes(currentUser.id))); // Allow students in groups to organize? Or stick to strict roles. Let's allow simplified logic for now.

  const usersArray = useMemo(() => Object.values(users), [users]);

  return (
    <div className="bg-background min-h-screen flex flex-col relative">
      {/* Ambient Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] animate-pulse"></div>
          <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] rounded-full bg-secondary/5 blur-[100px]"></div>
      </div>

      <Header currentUser={currentUser} onLogout={handleLogout} onNavigate={onNavigate} currentPath={currentPath} />
      
      <main className="flex-1 container max-w-5xl mx-auto px-4 py-6 pb-24 lg:pb-12 relative z-10">
            {/* Main Content */}
            <div className="space-y-6">
                {/* Compact Search Header with Host Button */}
                <div className="px-0">
            <div className="bg-card/95 backdrop-blur-md border border-border shadow-md rounded-2xl p-2.5 flex flex-col md:flex-row gap-2.5">
                
                {/* Search */}
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input 
                        type="text" 
                        placeholder="Search events..." 
                        className="w-full bg-muted/50 hover:bg-muted border border-transparent focus:border-primary rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 items-center overflow-x-auto no-scrollbar">
                    {/* Time Filter */}
                    <div className="flex bg-muted/50 rounded-xl p-0.5">
                        {['upcoming', 'today', 'week', 'past'].map(t => (
                            <button
                                key={t}
                                onClick={() => setTimeFilter(t as any)}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all ${timeFilter === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    {/* Category Filter */}
                    <select 
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-muted/50 hover:bg-muted border-transparent focus:border-primary rounded-xl px-2 py-1.5 text-xs font-bold text-foreground outline-none cursor-pointer min-w-[100px]"
                    >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex-shrink-0 bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest py-2 px-4 rounded-xl shadow-md hover:opacity-90 transition-all flex items-center gap-1.5"
                    >
                        <PlusIcon className="w-3.5 h-3.5"/> Host
                    </button>
                </div>
            </div>
        </div>

                {/* Content Area */}
                <div className="space-y-6 pt-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                            {timeFilter === 'past' ? 'Past Events' : 'Upcoming Events'}
                            <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">{filteredEvents.length}</span>
                        </h2>
                    </div>

                    {filteredEvents.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredEvents.map(event => (
                                <EventListingCard key={event.id} event={event} onNavigate={onNavigate} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-card/50 border-2 border-dashed border-border rounded-3xl">
                            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                <CalendarIcon className="w-10 h-10 text-muted-foreground/50"/>
                            </div>
                            <h3 className="text-lg font-bold text-foreground">No events found</h3>
                            <p className="text-muted-foreground mt-1">Try adjusting your filters or be the first to host one!</p>
                            <button onClick={() => {setSearchTerm(''); setTimeFilter('upcoming'); setCategoryFilter('All');}} className="mt-4 text-primary font-bold hover:underline">Clear Filters</button>
                        </div>
                    )}
                </div>
            </div>
      </main>

      <CreatePostModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        user={currentUser}
        onAddPost={onAddPost}
        defaultType="event"
      />

      <BottomNavBar currentUser={currentUser} onNavigate={onNavigate} currentPage={currentPath}/>
    </div>
  );
};

export default EventsPage;
