import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

type Memory = {
    id: string;
    name: string;
    coverUrl: string;
};

interface MemoriesBarProps {
    memories: Memory[];
    isOwner: boolean;
    onViewMemory: (memory: Memory) => void;
    onCreateMemory: () => void;
}

const MemoriesBar: React.FC<MemoriesBarProps> = ({ memories, isOwner, onViewMemory, onCreateMemory }) => {
    const { t } = useLanguage();

    return (
        <div className="w-full px-4 sm:px-0">
            <div className="flex items-start gap-4 overflow-x-auto py-2">
                {isOwner && (
                    <div
                        onClick={onCreateMemory}
                        className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0 group text-center w-20"
                        role="button"
                    >
                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-zinc-400 flex items-center justify-center group-hover:border-zinc-600 dark:group-hover:border-zinc-300 transition-colors">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
                        </div>
                        <p className="text-xs font-semibold truncate w-full">{t('memories.new')}</p>
                    </div>
                )}
                {memories.map(memory => (
                     <div
                        key={memory.id}
                        onClick={() => onViewMemory(memory)}
                        className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0 group text-center w-20"
                        role="button"
                    >
                        <div className="w-16 h-16 rounded-full p-0.5 bg-zinc-200 dark:bg-zinc-700">
                             <img
                                src={memory.coverUrl}
                                alt={memory.name}
                                className="w-full h-full rounded-full object-cover"
                            />
                        </div>
                        <p className="text-xs truncate w-full">{memory.name}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MemoriesBar;
