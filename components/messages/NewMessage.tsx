import React, { useState, useEffect } from 'react';
import { auth, db, collection, query, where, getDocs, limit } from '../../firebase';
import OnlineIndicator from '../common/OnlineIndicator';
import { useLanguage } from '../../context/LanguageContext';

const BackArrowIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
);

const SearchIcon: React.FC<{className?: string}> = ({className = "h-4 w-4 text-zinc-400 dark:text-zinc-500"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const SpinnerIcon: React.FC = () => (
    <div className="flex justify-center items-center p-4">
        <svg className="animate-spin h-5 w-5 text-zinc-500 dark:text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

type UserSearchResult = {
    id: string;
    username: string;
    avatar: string;
    lastSeen?: { seconds: number; nanoseconds: number };
    isAnonymous?: boolean;
};

interface NewMessageProps {
    onSelectUser: (user: UserSearchResult) => void;
    onBack: () => void;
}

const NewMessage: React.FC<NewMessageProps> = ({ onSelectUser, onBack }) => {
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setSearchResults([]);
            return;
        }

        const debouncedSearch = setTimeout(async () => {
            setIsSearching(true);
            const usersRef = collection(db, 'users');
            const q = query(
                usersRef,
                where('username_lowercase', '>=', searchQuery.toLowerCase()),
                where('username_lowercase', '<=', searchQuery.toLowerCase() + '\uf8ff'),
                limit(10)
            );
            
            try {
                const querySnapshot = await getDocs(q);
                const users = querySnapshot.docs
                    .map(doc => ({ id: doc.id, ...(doc.data() as Omit<UserSearchResult, 'id'>) }))
                    .filter(user => user.id !== auth.currentUser?.uid);
                
                setSearchResults(users);
            } catch (error) {
                console.error("Error searching users:", error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(debouncedSearch);
    }, [searchQuery]);

    return (
        <div className="h-full flex flex-col">
            <header className="flex items-center gap-3 p-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                <button onClick={onBack} aria-label={t('messages.back')}>
                   <BackArrowIcon className="w-6 h-6" />
                </button>
                <h2 className="text-lg font-semibold text-center flex-grow">{t('messages.newMessageTitle')}</h2>
                <div className="w-6"></div> {/* Spacer */}
            </header>
            <div className="p-4 flex-shrink-0">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <SearchIcon />
                    </span>
                    <input
                        type="text"
                        placeholder={t('messages.searchUsers')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md py-1.5 pl-10 pr-4 w-full text-sm focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 dark:text-zinc-100`}
                        autoFocus
                    />
                </div>
            </div>
            <main className="flex-grow overflow-y-auto">
                {isSearching && <SpinnerIcon />}
                {!isSearching && searchQuery && searchResults.length === 0 && <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 p-4">{t('header.noResults')}</p>}
                {!isSearching && searchResults.map(user => {
                    const isOnline = !user.isAnonymous && user.lastSeen && (new Date().getTime() / 1000 - user.lastSeen.seconds) < 600;
                    return (
                        <button key={user.id} onClick={() => onSelectUser(user)} className="w-full text-left flex items-center p-3 gap-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
                           <div className="relative flex-shrink-0">
                                <img src={user.avatar} alt={user.username} className="w-14 h-14 rounded-full object-cover" />
                                {isOnline && <OnlineIndicator />}
                           </div>
                           <div className="flex-grow overflow-hidden">
                               <p className="font-semibold">{user.username}</p>
                           </div>
                        </button>
                    )
                })}
            </main>
        </div>
    );
};

export default NewMessage;