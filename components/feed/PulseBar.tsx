import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

type Pulse = {
    id: string;
    mediaUrl: string;
    legenda: string;
    createdAt: { seconds: number; nanoseconds: number };
    authorId: string;
};

type UserWithPulses = {
    author: {
        id: string;
        username: string;
        avatar: string;
    };
    pulses: Pulse[];
};

interface PulseBarProps {
    usersWithPulses: UserWithPulses[];
    onViewPulses: (authorId: string) => void;
}

const PulseBar: React.FC<PulseBarProps> = ({ usersWithPulses, onViewPulses }) => {
    const { t } = useLanguage();
    return (
        <div className="w-full border-b border-zinc-300 dark:border-zinc-800">
            {/* The `overflow-x-auto` with padding creates a nice scrollable area */}
            <div className="flex items-center gap-4 px-4 py-3 overflow-x-auto">
                {usersWithPulses.map(({ author }) => (
                    <div 
                        key={author.id} 
                        className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0 group"
                        onClick={() => onViewPulses(author.id)}
                        role="button"
                        aria-label={t('pulseBar.viewPulse', { username: author.username })}
                    >
                        <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 group-hover:scale-105 transition-transform">
                            <div className="bg-white dark:bg-black p-0.5 rounded-full h-full w-full">
                                <img 
                                    src={author.avatar} 
                                    alt={author.username} 
                                    className="w-full h-full rounded-full object-cover" 
                                />
                            </div>
                        </div>
                        <p className="text-xs truncate w-16 text-center">{author.username}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PulseBar;
