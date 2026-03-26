
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
            <div className="absolute inset-0 rounded-full bg-muted/30 border-2 border-dashed border-border p-[3px]">
                 <Avatar src={user.avatarUrl} name={user.name} size="lg" className="w-full h-full rounded-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"/>
            </div>
            <div className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1.5 border-2 border-card shadow-lg group-hover:bg-primary/90 transition-all">
                <PlusIcon className="w-3.5 h-3.5 stroke-[3]" />
            </div>
        </div>
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest group-hover:text-primary transition-colors text-center w-full px-1">You</span>
    </div>
);

const StoryCircle: React.FC<{ entity: StoryEntity; onClick: () => void }> = ({ entity, onClick }) => {
    const ringClass = entity.hasUnviewed 
        ? 'bg-gradient-to-tr from-primary to-cyan-400 p-[2.5px]'
        : 'bg-border/40 p-[1.5px]';

    return (
        <div className="flex flex-col items-center gap-2 cursor-pointer group w-20 flex-shrink-0" onClick={onClick}>
            <div className={`rounded-full ${ringClass} transition-all duration-500 group-hover:scale-105 active:scale-95 shadow-sm group-hover:shadow-primary/20`}>
                <div className="bg-background rounded-full p-[2px]">
                    {entity.type === 'user' ? (
                         <Avatar src={entity.avatarUrl} name={entity.name} size="lg" className="w-14 h-14 rounded-full object-cover"/>
                    ) : (
                        <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
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
        <div className="relative overflow-hidden">
            <div className="flex items-center gap-3 mb-4 px-1">
                <div className="h-6 w-1 bg-primary rounded-full"></div>
                <h3 className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Pulse</h3>
            </div>
            <div className="relative z-10 pb-4 px-1">
                <div className="flex items-center space-x-4 overflow-x-auto no-scrollbar pb-1">
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
