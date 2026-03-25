import React, { useState } from 'react';
import type { Group, User } from '../types';
import { UsersIcon, StarIcon, LockIcon, GlobeIcon, CheckCircleIcon, XCircleIcon } from './Icons';

interface GroupCardProps {
  group: Group;
  currentUser: User;
  onNavigate: (path: string) => void;
  onJoinGroupRequest: (groupId: string) => void;
  onToggleFollowGroup: (groupId: string) => void;
  // Optional callbacks if passed from parent
  onWithdrawJoinRequest?: (groupId: string) => void;
  onAcceptGroupInvite?: (groupId: string) => void;
  onDeclineGroupInvite?: (groupId: string) => void;
}

const generateGradient = (name: string) => {
    const gradients = [
        'from-blue-500 to-cyan-400',
        'from-violet-500 to-purple-500',
        'from-emerald-400 to-teal-500',
        'from-pink-500 to-rose-500',
        'from-amber-400 to-orange-500',
        'from-indigo-500 to-blue-600'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % gradients.length);
    return gradients[index];
};

const GroupCard: React.FC<GroupCardProps> = ({ 
    group, currentUser, onNavigate, onJoinGroupRequest, onToggleFollowGroup,
    onWithdrawJoinRequest, onAcceptGroupInvite, onDeclineGroupInvite
}) => {
  const gradient = generateGradient(group.name);

  const isCreator = group.creatorId === currentUser.id;
  const isMember = (group.memberIds || []).includes(currentUser.id);
  const isPending = group.pendingMemberIds?.includes(currentUser.id);
  const isInvited = group.invitedMemberIds?.includes(currentUser.id);
  const isFollowing = currentUser.followingGroups?.includes(group.id);
  const isPrivate = group.privacy === 'private';

  const handleJoinClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isMember || isCreator) {
          onNavigate(`#/groups/${group.id}`);
      } else if (isPending) {
          if (onWithdrawJoinRequest) onWithdrawJoinRequest(group.id);
      } else if (!isInvited) {
          // Prevent request if private
          if (!isPrivate) {
              onJoinGroupRequest(group.id);
          }
      }
  };

  const handleFollowClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleFollowGroup(group.id);
  };
  
  // Logic for the button Text/State
  let buttonText = "Join Group";
  let buttonDisabled = false;
  let buttonStyle = "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md shadow-primary/20";

  if (isCreator) {
      buttonText = "Manage Group";
  } else if (isMember) {
      buttonText = "View Group";
      buttonStyle = "bg-muted text-foreground hover:bg-muted/80 border border-border";
  } else if (isInvited) {
      // Handled separately in JSX to show Accept/Decline buttons
  } else if (isPending) {
      buttonText = "Cancel Request";
      buttonStyle = "bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200";
  } else if (isPrivate) {
      buttonText = "Invite Only";
      buttonDisabled = true;
      buttonStyle = "bg-muted text-muted-foreground cursor-not-allowed opacity-70 border border-border";
  }

  return (
    <div 
        className={`relative p-[1px] rounded-2xl bg-gradient-to-br ${gradient} hover:shadow-xl dark:hover:shadow-primary/10 transition-all duration-300 group hover:-translate-y-1 cursor-pointer h-full flex flex-col`}
        onClick={() => onNavigate(`#/groups/${group.id}`)}
    >
        <div className="bg-card dark:bg-slate-900 rounded-[15px] h-full relative z-10 overflow-hidden flex flex-col">
            {/* Banner */}
            <div className={`relative h-28 bg-gradient-to-r ${gradient} flex items-center justify-center`}>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
                
                <div className="absolute top-3 right-3 flex gap-2">
                    {group.category && (
                        <span className="px-2 py-1 bg-black/20 backdrop-blur-md rounded-lg text-[10px] font-bold text-white border border-white/10 uppercase tracking-wide">
                            {group.category}
                        </span>
                    )}
                    <div className="w-6 h-6 bg-black/20 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/10 text-white" title={isPrivate ? "Private Group" : "Public Group"}>
                        {isPrivate ? <LockIcon className="w-3 h-3"/> : <GlobeIcon className="w-3 h-3"/>}
                    </div>
                </div>

                <div className="relative w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                    <UsersIcon className="w-7 h-7 text-white drop-shadow-md" />
                </div>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col flex-grow">
                <h3 className="text-lg font-bold text-card-foreground mb-2 line-clamp-1" title={group.name}>{group.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-grow leading-relaxed">{group.description}</p>
                
                <div className="flex items-center gap-3 mt-auto">
                    <div className="flex items-center text-[11px] font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-md border border-border/50">
                        <UsersIcon className="w-3 h-3 mr-1.5 opacity-70" />
                        <span>{(group.memberIds || []).length} Members</span>
                    </div>
                    <div className="flex items-center text-[11px] font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-md border border-border/50">
                        <StarIcon className="w-3 h-3 mr-1.5 opacity-70" />
                        <span>{group.followers?.length || 0}</span>
                    </div>
                </div>
            </div>
            
            {/* Action Footer */}
            <div className="px-4 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-between gap-2">
                <div className="flex gap-1">
                    <button 
                        onClick={handleFollowClick} 
                        className={`p-2 rounded-xl transition-colors border ${isFollowing ? 'bg-amber-50 border-amber-200 text-amber-500 dark:bg-amber-900/20 dark:border-amber-800' : 'bg-background border-border text-muted-foreground hover:text-amber-500 hover:border-amber-200'}`}
                        title={isFollowing ? "Unfollow" : "Follow"}
                    >
                        <StarIcon className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />
                    </button>
                </div>

                {isInvited ? (
                    <div className="flex flex-1 gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onAcceptGroupInvite && onAcceptGroupInvite(group.id); }}
                            className="flex-1 bg-green-100 text-green-700 hover:bg-green-200 px-3 py-2 rounded-xl text-xs font-bold"
                        >
                            Accept
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDeclineGroupInvite && onDeclineGroupInvite(group.id); }}
                            className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-2 rounded-xl text-xs font-bold"
                        >
                            <XCircleIcon className="w-4 h-4"/>
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={handleJoinClick}
                        disabled={buttonDisabled}
                        className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all transform active:scale-95 ${buttonStyle}`}
                    >
                        {buttonText}
                    </button>
                )}
            </div>
        </div>
    </div>
  );
};

export default GroupCard;