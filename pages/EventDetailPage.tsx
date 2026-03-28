
import React, { useMemo, useState } from 'react';
import type { User, Post } from '../types';
import Header from '../components/Header';
import BottomNavBar from '../components/BottomNavBar';
import Avatar from '../components/Avatar';
import { 
    CalendarIcon, MapPinIcon, ClockIcon, ArrowLeftIcon, UsersIcon, 
    ShareIcon, CheckCircleIcon, PlusIcon, UserIcon 
} from '../components/Icons';
import { auth, db } from '../api';

interface EventDetailPageProps {
    eventId: string;
    posts: Post[];
    users: { [key: string]: User };
    currentUser: User;
    onNavigate: (path: string) => void;
    onRegister: (eventId: string) => void;
    onUnregister: (eventId: string) => void;
    onDeleteEvent: (eventId: string) => void;
}

const EventDetailPage: React.FC<EventDetailPageProps> = ({ eventId, posts, users, currentUser, onNavigate, onRegister, onUnregister, onDeleteEvent }) => {
    const [activeTab, setActiveTab] = useState<'about' | 'attendees'>('about');
    
    const handleLogout = async () => { await auth.signOut(); onNavigate('#/'); };

    const event = useMemo(() => posts.find(p => p.id === eventId), [posts, eventId]);

    if (!event || !event.isEvent || !event.eventDetails) {
        return <div className="min-h-screen flex items-center justify-center">Event not found</div>;
    }

    const { eventDetails, authorId } = event;
    const organizer = users[authorId];
    const attendeesList = useMemo(() => (eventDetails.attendees || []).map(uid => users[uid]).filter(Boolean), [eventDetails.attendees, users]);
    const isRegistered = (eventDetails.attendees || []).includes(currentUser.id);
    const isPast = new Date(eventDetails.date) < new Date();
    const canEdit = currentUser.id === event.authorId || currentUser.tag === 'Director';
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        content: event.content,
        agenda: eventDetails.agenda || [],
        registrationType: eventDetails.registrationType || 'internal',
        externalRegistrationLink: eventDetails.externalRegistrationLink || ''
    });

    const handleSave = async () => {
        try {
            await db.collection('posts').doc(eventId).update({
                content: editForm.content,
                'eventDetails.agenda': editForm.agenda,
                'eventDetails.registrationType': editForm.registrationType,
                'eventDetails.externalRegistrationLink': editForm.externalRegistrationLink
            });
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to update event:", error);
            alert("Failed to save changes.");
        }
    };

    const addAgendaItem = () => {
        setEditForm({
            ...editForm,
            agenda: [...editForm.agenda, { time: '', activity: '', details: '' }]
        });
    };

    const removeAgendaItem = (index: number) => {
        const newAgenda = [...editForm.agenda];
        newAgenda.splice(index, 1);
        setEditForm({ ...editForm, agenda: newAgenda });
    };

    const updateAgendaItem = (index: number, field: string, value: string) => {
        const newAgenda = [...editForm.agenda];
        newAgenda[index] = { ...newAgenda[index], [field]: value };
        setEditForm({ ...editForm, agenda: newAgenda });
    };

    // Parse description (using content from post)
    const description = event.content;

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: eventDetails.title,
                text: `Check out this event: ${eventDetails.title}`,
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert("Link copied to clipboard!");
        }
    };

    return (
        <div className="bg-background min-h-screen flex flex-col">
            <Header currentUser={currentUser} onLogout={handleLogout} onNavigate={onNavigate} currentPath={`#/events/${eventId}`} />
            
            <main className="flex-1 pb-24 lg:pb-8">
                {/* Hero Banner */}
                <div className="relative h-64 md:h-80 w-full bg-slate-900 overflow-hidden">
                    {event.mediaUrls && event.mediaUrls.length > 0 ? (
                        <>
                            <img src={event.mediaUrls[0]} alt="Banner" className="w-full h-full object-cover opacity-60 blur-sm absolute inset-0 scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
                            <div className="absolute inset-0 flex items-center justify-center p-4">
                                <img src={event.mediaUrls[0]} alt="Poster" className="h-full max-w-full object-contain rounded-lg shadow-2xl" />
                            </div>
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-purple-800 flex items-center justify-center">
                            <CalendarIcon className="w-24 h-24 text-white/20"/>
                        </div>
                    )}
                    
                    <button onClick={() => onNavigate('#/events')} className="absolute top-4 left-4 bg-black/30 hover:bg-black/50 backdrop-blur-md text-white p-2 rounded-full transition-colors z-10">
                        <ArrowLeftIcon className="w-6 h-6"/>
                    </button>
                </div>

                <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-10">
                    {/* Main Card */}
                    <div className="bg-card border border-border rounded-3xl shadow-xl p-6 md:p-8 mb-6">
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="flex-1">
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-primary/20">
                                        {eventDetails.category || 'Event'}
                                    </span>
                                    {isPast && <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Ended</span>}
                                </div>
                                <h1 className="text-3xl md:text-4xl font-black text-foreground mb-2">{eventDetails.title}</h1>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                                    <span>Organized by</span>
                                    <span className="text-foreground font-bold">{eventDetails.organizer || organizer?.name || 'Campus Group'}</span>
                                </div>
                            </div>

                            {/* Date Box */}
                            <div className="flex-shrink-0 bg-muted/30 rounded-2xl p-4 border border-border flex flex-col items-center justify-center min-w-[100px]">
                                <span className="text-xs font-bold text-primary uppercase tracking-widest">{new Date(eventDetails.date).toLocaleString('default', { month: 'short' })}</span>
                                <span className="text-3xl font-black text-foreground">{new Date(eventDetails.date).getDate()}</span>
                                <span className="text-xs text-muted-foreground font-medium">{new Date(eventDetails.date).toLocaleString('default', { weekday: 'short' })}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-6 border-t border-border">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                                    <ClockIcon className="w-5 h-5"/>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase">Time</p>
                                    <p className="text-sm font-semibold text-foreground">{new Date(eventDetails.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center">
                                    <MapPinIcon className="w-5 h-5"/>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase">Location</p>
                                    <p className="text-sm font-semibold text-foreground">{eventDetails.location}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Bar (Sticky on Mobile) */}
                    <div className="fixed bottom-16 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border md:static md:bg-transparent md:border-0 md:p-0 md:mb-8 z-20">
                        <div className="flex gap-3 max-w-4xl mx-auto">
                            {eventDetails.registrationType === 'external' ? (
                                <a
                                    href={eventDetails.externalRegistrationLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 py-3.5 rounded-xl font-bold text-base shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                    <PlusIcon className="w-5 h-5"/> Register (External)
                                </a>
                            ) : (
                                <button
                                    onClick={() => isRegistered ? onUnregister(eventId) : onRegister(eventId)}
                                    disabled={isPast}
                                    className={`flex-1 py-3.5 rounded-xl font-bold text-base shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${
                                        isRegistered
                                        ? 'bg-red-50 text-red-600 border-2 border-red-100 hover:bg-red-100'
                                        : isPast
                                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                    }`}
                                >
                                    {isRegistered ? (
                                        <><CheckCircleIcon className="w-5 h-5"/> Registered</>
                                    ) : isPast ? (
                                        'Registration Closed'
                                    ) : (
                                        <><PlusIcon className="w-5 h-5"/> Register Now</>
                                    )}
                                </button>
                            )}
                            <button onClick={handleShare} className="p-3.5 bg-card border border-border rounded-xl text-foreground hover:bg-muted shadow-sm">
                                <ShareIcon className="w-6 h-6"/>
                            </button>
                            {canEdit && (
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className={`p-3.5 rounded-xl border shadow-sm transition-colors ${isEditing ? 'bg-primary text-white border-primary' : 'bg-card border-border text-foreground hover:bg-muted'}`}
                                >
                                    <PlusIcon className={`w-6 h-6 transition-transform ${isEditing ? 'rotate-45' : ''}`}/>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content Tabs */}
                    <div className="flex gap-6 border-b border-border mb-6">
                        <button 
                            onClick={() => setActiveTab('about')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'about' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                        >
                            About Event
                        </button>
                        <button 
                            onClick={() => setActiveTab('attendees')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'attendees' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                        >
                            Attendees <span className="bg-muted px-2 py-0.5 rounded-full text-xs ml-1">{attendeesList.length}</span>
                        </button>
                    </div>

                    {activeTab === 'about' && (
                        <div className="bg-card rounded-3xl p-6 md:p-8 border border-border shadow-sm animate-fade-in space-y-8">
                            {isEditing ? (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-foreground mb-2">Description</label>
                                        <textarea
                                            value={editForm.content}
                                            onChange={(e) => setEditForm({...editForm, content: e.target.value})}
                                            className="w-full bg-muted border border-border rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary outline-none min-h-[150px]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-foreground mb-2">Registration Type</label>
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => setEditForm({...editForm, registrationType: 'internal'})}
                                                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${editForm.registrationType === 'internal' ? 'bg-primary text-white border-primary' : 'bg-muted text-muted-foreground border-border'}`}
                                            >
                                                In-App Button
                                            </button>
                                            <button
                                                onClick={() => setEditForm({...editForm, registrationType: 'external'})}
                                                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${editForm.registrationType === 'external' ? 'bg-primary text-white border-primary' : 'bg-muted text-muted-foreground border-border'}`}
                                            >
                                                External Link
                                            </button>
                                        </div>
                                    </div>

                                    {editForm.registrationType === 'external' && (
                                        <div>
                                            <label className="block text-sm font-bold text-foreground mb-2">External Link</label>
                                            <input
                                                type="url"
                                                value={editForm.externalRegistrationLink}
                                                onChange={(e) => setEditForm({...editForm, externalRegistrationLink: e.target.value})}
                                                className="w-full bg-muted border border-border rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none"
                                                placeholder="https://forms.gle/..."
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-sm font-bold text-foreground">Agenda</label>
                                            <button onClick={addAgendaItem} className="text-xs font-black text-primary uppercase">+ Add Item</button>
                                        </div>
                                        <div className="space-y-3">
                                            {editForm.agenda.map((item, idx) => (
                                                <div key={idx} className="bg-muted p-4 rounded-xl border border-border relative">
                                                    <button onClick={() => removeAgendaItem(idx)} className="absolute top-2 right-2 text-muted-foreground hover:text-red-500">×</button>
                                                    <div className="grid grid-cols-2 gap-3 mb-2">
                                                        <input
                                                            placeholder="Time (e.g. 10:00 AM)"
                                                            value={item.time}
                                                            onChange={(e) => updateAgendaItem(idx, 'time', e.target.value)}
                                                            className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-bold"
                                                        />
                                                        <input
                                                            placeholder="Activity"
                                                            value={item.activity}
                                                            onChange={(e) => updateAgendaItem(idx, 'activity', e.target.value)}
                                                            className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-bold"
                                                        />
                                                    </div>
                                                    <textarea
                                                        placeholder="Details (optional)"
                                                        value={item.details}
                                                        onChange={(e) => updateAgendaItem(idx, 'details', e.target.value)}
                                                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-medium min-h-[60px]"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-muted text-muted-foreground rounded-xl font-bold">Cancel</button>
                                        <button onClick={handleSave} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20">Save Changes</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="prose dark:prose-invert max-w-none">
                                        <h3 className="text-lg font-bold mb-2">Description</h3>
                                        <div dangerouslySetInnerHTML={{ __html: description }} className="text-muted-foreground leading-relaxed whitespace-pre-wrap"/>
                                    </div>

                                    {eventDetails.tags && eventDetails.tags.length > 0 && (
                                        <div>
                                            <h3 className="text-lg font-bold mb-3">Tags</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {eventDetails.tags.map(tag => (
                                                    <span key={tag} className="px-3 py-1.5 bg-muted text-muted-foreground text-xs font-bold rounded-lg border border-border">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {eventDetails.agenda && eventDetails.agenda.length > 0 && (
                                        <div className="border border-border rounded-2xl overflow-hidden">
                                            <div className="bg-muted/50 p-4 border-b border-border font-bold text-sm uppercase tracking-wider">Agenda</div>
                                            <div className="divide-y divide-border">
                                                {eventDetails.agenda.map((item, idx) => (
                                                    <div key={idx} className="p-4 flex gap-4">
                                                        <span className="font-mono text-sm font-bold text-primary whitespace-nowrap min-w-[80px]">{item.time}</span>
                                                        <div>
                                                            <p className="font-bold text-sm">{item.activity}</p>
                                                            {item.details && <p className="text-xs text-muted-foreground mt-1">{item.details}</p>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'attendees' && (
                        <div className="bg-card rounded-3xl p-6 border border-border shadow-sm animate-fade-in">
                            {attendeesList.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {attendeesList.map(user => (
                                        <div key={user.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer" onClick={() => onNavigate(`#/profile/${user.id}`)}>
                                            <Avatar src={user.avatarUrl} name={user.name} size="md"/>
                                            <div className="overflow-hidden">
                                                <p className="font-bold text-sm truncate">{user.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{user.department}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-50"/>
                                    <p>No attendees yet. Be the first!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
            
            <BottomNavBar currentUser={currentUser} onNavigate={onNavigate} currentPage={`#/events/${eventId}`} />
        </div>
    );
};

export default EventDetailPage;
