
import React, { useState, useMemo } from 'react';
import type { User, Post, Group, ReactionType } from '../types';
import Header from '../components/Header';
import BottomNavBar from '../components/BottomNavBar';
import Feed from '../components/Feed';
import Avatar from '../components/Avatar';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import { SearchIcon, UsersIcon, ArrowRightIcon, CloseIcon, BookmarkIcon } from '../components/Icons';
import { auth } from '../api';

interface SearchPageProps {
  currentUser: User;
  users: User[];
  posts: Post[];
  groups: Group[];
  onNavigate: (path: string) => void;
  currentPath: string;
  onReaction: (postId: string, reaction: ReactionType) => void;
  onAddComment: (postId: string, text: string) => void;
  onDeletePost: (postId: string) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  onCreateOrOpenConversation: (otherUserId: string) => Promise<string>;
  onSharePostAsMessage: (conversationId: string, authorName: string, postContent: string) => void;
  onSharePost: (originalPost: Post, commentary: string, shareTarget: { type: 'feed' | 'group'; id?: string }) => void;
  onToggleSavePost: (postId: string) => void;
}

const SearchPage: React.FC<SearchPageProps> = (props) => {
  const { currentUser, users, posts, groups, onNavigate, currentPath, ...postCardProps } = props;
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'people' | 'groups' | 'posts'>('all');

  const handleLogout = async () => {
    await auth.signOut();
    onNavigate('#/');
  };

  const usersMap = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users]);

  const results = useMemo(() => {
      if (!searchTerm.trim()) return { people: [], groups: [], events: [] };
      const lower = searchTerm.toLowerCase();
      return {
          people: users.filter(u => u.name.toLowerCase().includes(lower) || u.department.toLowerCase().includes(lower)),
          groups: groups.filter(g => g.name.toLowerCase().includes(lower) || g.description.toLowerCase().includes(lower)),
          events: posts.filter(p => p.isEvent && (p.eventDetails?.title.toLowerCase().includes(lower) || p.content?.toLowerCase().includes(lower)))
      };
  }, [users, groups, posts, searchTerm]);

  const hasResults = results.people.length > 0 || results.groups.length > 0 || results.events.length > 0;

  const usersArray = useMemo(() => Object.values(users), [users]);

  // Discovery Data
  const featuredEvent = useMemo(() => posts.find(p => p.isEvent && p.mediaUrls && p.mediaUrls.length > 0), [posts]);
  const trendingPosts = useMemo(() => posts.slice(0, 4), [posts]);
  const vibrantGroups = useMemo(() => groups.slice(0, 4), [groups]);
  const eventRadar = useMemo(() => posts.filter(p => p.isEvent).slice(0, 4), [posts]);

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
                {/* Search Bar Area */}
                <div className="px-0">
                    <div className="relative group">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search campus, groups, events..."
                            className="w-full bg-card border border-border/50 focus:border-primary rounded-2xl pl-12 pr-12 py-4 text-base focus:outline-none transition-all shadow-sm"
                            autoFocus
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded-full text-muted-foreground transition-colors">
                                <CloseIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-4 sm:px-0 flex gap-3 overflow-x-auto no-scrollbar">
                    {['all', 'people', 'groups', 'events'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-6 py-2.5 rounded-full text-sm font-black uppercase tracking-widest transition-all border ${
                                activeTab === tab
                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                : 'bg-card text-muted-foreground border-border/50 hover:bg-muted'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Discovery View (When no search term) */}
                {!searchTerm && (
                    <div className="space-y-12 animate-fade-in">
                        {/* Featured Highlight */}
                        {featuredEvent && (
                            <div
                                className="relative rounded-[2.5rem] overflow-hidden aspect-[16/9] group cursor-pointer shadow-2xl"
                                onClick={() => onNavigate(`#/events/${featuredEvent.id}`)}
                            >
                                <img src={featuredEvent.mediaUrls?.[0]} alt="Featured" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full">
                                    <span className="bg-primary/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-md mb-4 inline-block">Featured</span>
                                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2 line-clamp-2">{featuredEvent.eventDetails?.title}</h2>
                                    <p className="text-white/70 text-sm md:text-base line-clamp-2 max-w-xl">{featuredEvent.eventDetails?.description || featuredEvent.content}</p>
                                </div>
                            </div>
                        )}

                        {/* Trending Now */}
                        <section>
                            <div className="flex items-center justify-between mb-6 px-1">
                                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">Trending Now</h3>
                                <ArrowRightIcon className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {trendingPosts.map(post => (
                                    <div key={post.id} className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl p-6 hover:bg-card hover:border-primary/30 transition-all cursor-pointer group">
                                        <span className="text-[9px] font-black text-primary uppercase tracking-widest mb-2 block">#{post.isEvent ? 'Events' : 'CampusLife'}</span>
                                        <h4 className="font-black text-foreground text-sm leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors">{post.eventDetails?.title || post.content}</h4>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Trending in Campus</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Vibrant Communities */}
                        <section>
                            <div className="flex items-center justify-between mb-6 px-1">
                                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">Vibrant Communities</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {vibrantGroups.map(group => (
                                    <div key={group.id} className="bg-card border border-border/50 rounded-3xl p-6 flex items-center justify-between group hover:shadow-xl transition-all cursor-pointer" onClick={() => onNavigate(`#/groups/${group.id}`)}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <UsersIcon className="w-6 h-6 stroke-[2.5]" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-foreground text-sm group-hover:text-primary transition-colors">{group.name}</h4>
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{group.memberIds.length} Members</p>
                                            </div>
                                        </div>
                                        <button className="bg-muted hover:bg-primary hover:text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all">Join</button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Event Radar */}
                        <section>
                            <div className="flex items-center justify-between mb-6 px-1">
                                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">Event Radar</h3>
                            </div>
                            <div className="space-y-4">
                                {eventRadar.map(event => {
                                    const date = new Date(event.eventDetails?.date || Date.now());
                                    return (
                                        <div key={event.id} className="bg-card border border-border/50 rounded-3xl p-4 flex items-center gap-6 group hover:shadow-lg transition-all cursor-pointer" onClick={() => onNavigate(`#/events/${event.id}`)}>
                                            <div className="flex-shrink-0 w-14 h-14 bg-background border border-border rounded-2xl flex flex-col items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all">
                                                <span className="text-[9px] font-black text-primary uppercase group-hover:text-white/80">{date.toLocaleString('default', { month: 'short' })}</span>
                                                <span className="text-xl font-black text-foreground group-hover:text-white leading-none">{date.getDate()}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-black text-foreground text-base group-hover:text-primary transition-colors line-clamp-1">{event.eventDetails?.title}</h4>
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">{event.eventDetails?.location} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                            <BookmarkIcon className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                )}

                {/* Search Results Area */}
                <div className="space-y-10 min-h-[400px]">

            {searchTerm && !hasResults && (
                <div className="text-center py-16 animate-fade-in">
                    <div className="bg-muted/30 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 border border-border dashed">
                        <SearchIcon className="w-12 h-12 text-muted-foreground/40" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">No results found</h3>
                    <p className="text-muted-foreground mt-2">We couldn't find anything for "<span className="font-semibold text-foreground">{searchTerm}</span>".</p>
                </div>
            )}

            {/* People Results */}
            {(activeTab === 'all' || activeTab === 'people') && results.people.length > 0 && (
                <div className="animate-fade-in">
                    <h3 className="text-lg font-bold text-foreground mb-4 px-1 flex items-center gap-2">
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">People</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {results.people.map(user => (
                            <div key={user.id} onClick={() => onNavigate(`#/profile/${user.id}`)} className="bg-card p-4 rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer flex items-center gap-4 group hover:-translate-y-0.5">
                                <Avatar src={user.avatarUrl} name={user.name} size="lg" className="shadow-sm ring-2 ring-transparent group-hover:ring-primary/20 transition-all" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-foreground text-base truncate group-hover:text-primary transition-colors">{user.name}</h4>
                                    <p className="text-sm text-muted-foreground truncate">{user.department}</p>
                                    <span className={`inline-block mt-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-md ${user.tag === 'Student' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                        {user.tag}
                                    </span>
                                </div>
                                <div className="p-2 rounded-full bg-muted/50 group-hover:bg-primary/10 transition-colors">
                                    <ArrowRightIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors"/>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Groups Results */}
            {(activeTab === 'all' || activeTab === 'groups') && results.groups.length > 0 && (
                <div className="animate-fade-in">
                    <h3 className="text-lg font-bold text-foreground mb-4 px-1 flex items-center gap-2">
                        <span className="bg-purple-500/10 text-purple-600 px-2 py-1 rounded text-xs">Groups</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {results.groups.map(group => (
                            <div key={group.id} onClick={() => onNavigate(`#/groups/${group.id}`)} className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-purple-500/30 transition-all cursor-pointer flex items-center gap-4 group hover:-translate-y-0.5">
                                <div className="h-14 w-14 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                                    <UsersIcon className="w-7 h-7"/>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-foreground text-lg truncate group-hover:text-primary transition-colors">{group.name}</h4>
                                    <p className="text-sm text-muted-foreground truncate">{group.memberIds.length} members</p>
                                </div>
                                <div className="px-4 py-1.5 rounded-full bg-muted text-xs font-bold text-muted-foreground group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                                    View
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Events Results */}
            {(activeTab === 'all' || activeTab === 'events') && results.events.length > 0 && (
                        <div className="animate-fade-in">
                            <h3 className="text-lg font-bold text-foreground mb-4 px-1 flex items-center gap-2">
                        <span className="bg-amber-500/10 text-amber-600 px-2 py-1 rounded text-xs">Events</span>
                            </h3>
                            <Feed
                        posts={results.events}
                                users={usersMap}
                                currentUser={currentUser}
                                groups={groups}
                                onNavigate={onNavigate}
                                {...postCardProps}
                            />
                        </div>
                    )}
                </div>
            </div>

      </main>
      <BottomNavBar currentUser={currentUser} onNavigate={onNavigate} currentPage={currentPath}/>
    </div>
  );
};

export default SearchPage;
