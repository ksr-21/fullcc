
import React, { useState } from 'react';
import type { User } from '../types';
import Avatar from './Avatar';
import { PhotoIcon, CalendarIcon, BriefcaseIcon, CodeIcon, MapIcon, CloseIcon, PlusIcon, SparkleIcon } from './Icons';

interface InlineCreatePostProps {
  user: User;
  onOpenCreateModal: (type: 'post' | 'event' | 'opportunity' | 'project' | 'roadmap') => void;
}

const InlineCreatePost: React.FC<InlineCreatePostProps> = ({ user, onOpenCreateModal }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const options = [
      { id: 'post', label: 'Update', icon: PhotoIcon, color: 'text-indigo-500', bg: 'bg-indigo-50/50 dark:bg-indigo-900/10' },
      { id: 'event', label: 'Event', icon: CalendarIcon, color: 'text-rose-500', bg: 'bg-rose-50/50 dark:bg-rose-900/10' },
      { id: 'opportunity', label: 'Career', icon: BriefcaseIcon, color: 'text-emerald-500', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10' },
      { id: 'project', label: 'Project', icon: CodeIcon, color: 'text-violet-500', bg: 'bg-violet-50/50 dark:bg-violet-900/10' },
      { id: 'roadmap', label: 'Goal', icon: MapIcon, color: 'text-cyan-500', bg: 'bg-cyan-50/50 dark:bg-cyan-900/10' },
  ] as const;

  if (isExpanded) {
      return (
          <div className="bg-card rounded-[2.5rem] shadow-xl border border-border/60 p-6 mb-8 animate-scale-in relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-50"></div>
              <div className="flex justify-between items-center mb-6 relative z-10">
                  <h3 className="font-black text-foreground text-xl tracking-tight flex items-center gap-2">
                      <SparkleIcon className="w-5 h-5 text-primary fill-current"/> Share Something New
                  </h3>
                  <button onClick={() => setIsExpanded(false)} className="p-2 rounded-full bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all">
                      <CloseIcon className="w-5 h-5"/>
                  </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 relative z-10">
                  {options.map((opt) => (
                      <button 
                        key={opt.id}
                        onClick={() => { onOpenCreateModal(opt.id); setIsExpanded(false); }}
                        className={`flex flex-col items-center justify-center p-5 rounded-3xl gap-3 transition-all transform hover:scale-105 active:scale-95 border border-transparent hover:border-border/50 group ${opt.bg}`}
                      >
                          <div className={`p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm group-hover:shadow-md transition-all ${opt.color}`}>
                              <opt.icon className="w-6 h-6 stroke-[2.5]"/>
                          </div>
                          <span className="text-xs font-black text-foreground/80 uppercase tracking-widest">{opt.label}</span>
                      </button>
                  ))}
              </div>
          </div>
      )
  }

  return (
    <div 
        className="glassmorphism rounded-3xl shadow-sm p-4 mb-8 cursor-pointer hover:shadow-primary/5 hover:bg-card/80 transition-all duration-300 group"
        onClick={() => setIsExpanded(true)}
    >
        <div className="flex items-center gap-4">
            <Avatar src={user.avatarUrl} name={user.name} size="md" className="rounded-full border border-white/10"/>
            <div className="flex-1 bg-muted/20 group-hover:bg-muted/30 border border-white/5 rounded-2xl px-6 py-3 text-muted-foreground/60 text-sm font-bold tracking-tight transition-all flex justify-between items-center">
                <span>What's on your mind, {user.name.split(' ')[0]}?</span>
                <div className="p-1.5 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                    <PlusIcon className="w-4 h-4 stroke-[3]"/>
                </div>
            </div>
        </div>
    </div>
  );
};

export default InlineCreatePost;
