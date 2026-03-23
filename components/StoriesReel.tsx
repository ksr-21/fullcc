
import React from 'react';
import type { Story, User, Group } from '../types';
import { PlusIcon, UsersIcon } from './Icons';
import Avatar from './Avatar';

interface StoriesReelProps {
  stories: Story[];
  users: { [key: string]: User };
  groups: Group[];
  currentUser: User;
  onAddStoryClick: () => void;
  onViewStoryEntity: (entityId: string) => void;
}

type StoryEntity = {
    id: string;
    type: 'user' | 'group';
    name: string;
    avatarUrl?: string;
    hasUnviewed: boolean;
    latestTimestamp: number;
}

const AddStoryCircle: React.FC<{ user: User; onClick: () => void; }> = ({ user, onClick }) => (
    <div className="flex flex-col items-center gap-2 cursor-pointer group w-20 flex-shrink-0" onClick={onClick}>
        <div className="relative w-16 h-16 transition-all duration-500 group-hover:scale-105 active:scale-95">
            <div className="absolute inset-0 rounded-[22px] bg-muted/50 border-2 border-border p-[3px]">
                 <Avatar src={user.avatarUrl} name={user.name} size="lg" className="w-full h-full rounded-[18px] object-cover opacity-80 group-hover:opacity-100 transition-opacity"/>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-xl p-1.5 border-4 border-card shadow-lg group-hover:bg-primary/90 group-hover:translate-x-1 group-hover:translate-y-1 transition-all">
                <PlusIcon className="w-3.5 h-3.5 stroke-[3]" />
            </div>
        </div>
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest group-hover:text-primary transition-colors text-center w-full px-1">You</span>
    </div>
);

const StoryCircle: React.FC<{ entity: StoryEntity; onClick: () => void }> = ({ entity, onClick }) => {
    const ringClass = entity.hasUnviewed 
        ? 'bg-gradient-to-tr from-primary via-purple-500 to-secondary p-[3px]' 
        : 'bg-border/60 p-[1.5px]';

    return (
        <div className="flex flex-col items-center gap-2 cursor-pointer group w-20 flex-shrink-0" onClick={onClick}>
            <div className={`rounded-[22px] ${ringClass} transition-all duration-500 group-hover:scale-105 active:scale-95 shadow-sm group-hover:shadow-xl`}>
                <div className="bg-card rounded-[19px] p-[2px]">
                    {entity.type === 'user' ? (
                         <Avatar src={entity.avatarUrl} name={entity.name} size="lg" className="w-14 h-14 rounded-[17px] object-cover"/>
                    ) : (
                        <div className="w-14 h-14 rounded-[17px] bg-primary/10 text-primary flex items-center justify-center">
                            <UsersIcon className="w-6 h-6 stroke-[2.5]" />
                        </div>
                    )}
                </div>
            </div>
             <span className={`text-[10px] truncate w-full text-center transition-colors uppercase tracking-widest ${entity.hasUnviewed ? 'font-black text-foreground' : 'font-bold text-muted-foreground'}`}>
                 {entity.name.split(' ')[0]}
             </span>
        </div>
    );
};

const StoriesReel: React.FC<StoriesReelProps> = ({ stories, users, groups, currentUser, onAddStoryClick, onViewStoryEntity }) => {
    const storyEntities = React.useMemo(() => {
        const entities: { [key: string]: StoryEntity } = {};

        stories.forEach(story => {
            const isGroupStory = !!story.groupId;
            const entityId = isGroupStory ? `group-${story.groupId}` : `user-${story.authorId}`;
            const isViewed = (story.viewedBy || []).includes(currentUser.id);

             if (isGroupStory) {
                const group = groups.find(g => g.id === story.groupId);
                if (!group || !(currentUser.followingGroups || []).includes(group.id)) return;
            } else {
                 const user = users[story.authorId];
                 if (!user) return;
            }

            if (!entities[entityId]) {
                if (isGroupStory) {
                    const group = groups.find(g => g.id === story.groupId)!;
                    entities[entityId] = {
                        id: entityId, type: 'group', name: group.name,
                        hasUnviewed: !isViewed, latestTimestamp: story.timestamp,
                    }
                } else {
                     const user = users[story.authorId]!;
                     entities[entityId] = {
                        id: entityId, type: 'user', name: user.name, avatarUrl: user.avatarUrl,
                        hasUnviewed: !isViewed, latestTimestamp: story.timestamp,
                     }
                }
            } else {
                if (!isViewed) entities[entityId].hasUnviewed = true;
                if (story.timestamp > entities[entityId].latestTimestamp) {
                     entities[entityId].latestTimestamp = story.timestamp;
                }
            }
        });

        const currentUserStoryId = `user-${currentUser.id}`;
        const currentUserStory = entities[currentUserStoryId];
        delete entities[currentUserStoryId];

        const otherEntities = Object.values(entities).sort((a, b) => {
            if (a.hasUnviewed && !b.hasUnviewed) return -1;
            if (!a.hasUnviewed && b.hasUnviewed) return 1;
            return b.latestTimestamp - a.latestTimestamp;
        });

        return currentUserStory ? [currentUserStory, ...otherEntities] : otherEntities;
    }, [stories, users, groups, currentUser.id, currentUser.followingGroups]);

    const canCreateStory = !(currentUser.tag === 'Teacher' && currentUser.isApproved === false);
    
    return (
        <div className="relative p-[1px] rounded-[32px] bg-gradient-to-r from-border/50 to-border/20 shadow-sm border border-white/40 overflow-hidden">
            <div className="absolute inset-0 bg-white/40 dark:bg-black/20 backdrop-blur-3xl z-0"></div>
            <div className="relative z-10 px-4 py-6">
                <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
                    {canCreateStory && <AddStoryCircle user={currentUser} onClick={onAddStoryClick} />}
                    {storyEntities.map(entity => (
                        <StoryCircle 
                            key={entity.id}
                            entity={entity}
                            onClick={() => onViewStoryEntity(entity.id)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StoriesReel;
