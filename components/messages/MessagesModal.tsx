import React, { useState, useEffect } from 'react';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import NewMessage from './NewMessage';
import { auth, db, doc, getDoc, setDoc, serverTimestamp, updateDoc, onSnapshot, collection, addDoc, query, where, orderBy, limit, getDocs } from '../../firebase';
import { useLanguage } from '../../context/LanguageContext';
import TextAreaInput from '../common/TextAreaInput';
import Button from '../common/Button';
import { useTimeAgo } from '../../hooks/useTimeAgo';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTargetUser: { id: string, username: string, avatar: string } | null;
  initialConversationId: string | null;
}

type DiaryEntry = {
    id: string;
    userId: string;
    username: string;
    userAvatar: string;
    text: string;
    createdAt: { seconds: number; nanoseconds: number };
};

const XIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const AnonIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c2.761 0 5 2.239 5 5s-2.239 5-5 5-5-2.239-5-5 2.239-5 5-5zm0 10c-3.866 0-7 1.79-7 4v3h14v-3c0-2.21-3.134-4-7-4zm-1.5-6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm6 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 13.5a6.002 6.002 0 00-4.321 1.832" />
    </svg>
);

const isToday = (timestamp: { seconds: number; nanoseconds: number } | null | undefined) => {
    if (!timestamp) return false;
    const date = new Date(timestamp.seconds * 1000);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
};

const DiaryCarousel: React.FC<{
    diaries: DiaryEntry[],
    myDiary: DiaryEntry | null,
    onViewDiary: (diary: DiaryEntry) => void,
    onAddDiary: () => void,
    loading: boolean
}> = ({ diaries, myDiary, onViewDiary, onAddDiary, loading }) => {
    const { t } = useLanguage();
    const currentUser = auth.currentUser;

    const getTimeRemaining = (timestamp: { seconds: number }) => {
        const expirationTime = timestamp.seconds * 1000 + 24 * 60 * 60 * 1000;
        const remainingMillis = expirationTime - Date.now();
        if (remainingMillis <= 0) return null;
        const hours = Math.floor(remainingMillis / (1000 * 60 * 60));
        if (hours > 0) return `${hours}h`;
        const minutes = Math.floor((remainingMillis % (1000 * 60 * 60)) / (1000 * 60));
        return `${minutes}m`;
    };

    return (
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-semibold mb-3">{t('messages.diariesTitle')}</h3>
            <div className="flex items-start gap-4 overflow-x-auto pb-2 -mb-2">
                <div 
                    className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0 group text-center"
                    onClick={onAddDiary}
                >
                    <div className="w-16 h-16 rounded-full p-0.5 bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center relative">
                        <img 
                            src={currentUser?.photoURL || ''} 
                            alt={t('messages.addNote')} 
                            className={`w-full h-full rounded-full object-cover ${myDiary ? '' : 'opacity-50'}`} 
                        />
                         {!myDiary && (
                             <div className="absolute bottom-0 right-0 bg-sky-500 rounded-full p-0.5 border-2 border-white dark:border-black">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                     <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                 </svg>
                             </div>
                         )}
                    </div>
                    <p className="text-xs truncate w-16">{t('messages.addNote')}</p>
                </div>

                {loading ? <div className="text-xs text-zinc-400">{t('messages.loading')}</div> : diaries.map(diary => (
                     <div 
                        key={diary.id} 
                        className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0 group text-center"
                        onClick={() => onViewDiary(diary)}
                    >
                        <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500">
                           <div className="bg-white dark:bg-black p-0.5 rounded-full h-full w-full">
                                <img src={diary.userAvatar} alt={diary.username} className="w-full h-full rounded-full object-cover"/>
                           </div>
                        </div>
                        <p className="text-xs truncate w-16">{diary.username}</p>
                        <p className="text-xs text-zinc-500">{getTimeRemaining(diary.createdAt)}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};


const MessagesModal: React.FC<MessagesModalProps> = ({ isOpen, onClose, initialTargetUser, initialConversationId }) => {
    const { t } = useLanguage();
    const { formatTimestamp } = useTimeAgo();
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [view, setView] = useState<'list' | 'new'>('list');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [myLatestDiary, setMyLatestDiary] = useState<DiaryEntry | null>(null);
    const [newDiaryEntry, setNewDiaryEntry] = useState('');
    const [isPublishingDiary, setIsPublishingDiary] = useState(false);
    const [hasPostedToday, setHasPostedToday] = useState(false);
    const [followedDiaries, setFollowedDiaries] = useState<DiaryEntry[]>([]);
    const [diariesLoading, setDiariesLoading] = useState(true);
    const [viewingDiary, setViewingDiary] = useState<DiaryEntry | null>(null);

    const currentUser = auth.currentUser;

    useEffect(() => {
        if (!isOpen || !currentUser) return;

        const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
            if (doc.exists()) {
                setIsAnonymous(doc.data().isAnonymous || false);
            }
        });

        const q = query(
            collection(db, 'diaries'), 
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc'),
            limit(1)
        );
    
        const unsubDiary = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const latestDiary = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as DiaryEntry;
                setMyLatestDiary(latestDiary);
                setHasPostedToday(isToday(latestDiary.createdAt));
            } else {
                setMyLatestDiary(null);
                setHasPostedToday(false);
            }
        });

        return () => {
            unsub();
            unsubDiary();
        };
    }, [isOpen, currentUser]);
    
    useEffect(() => {
        if (!isOpen || !currentUser) return;
        setDiariesLoading(true);

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const fetchDiaries = async () => {
            const followingRef = collection(db, 'users', currentUser.uid, 'following');
            const followingSnap = await getDocs(followingRef);
            const followingIds = followingSnap.docs.map(doc => doc.id);
            
            if (followingIds.length === 0) {
                setFollowedDiaries([]);
                setDiariesLoading(false);
                return;
            }
            
            const userIdChunks: string[][] = [];
            for (let i = 0; i < followingIds.length; i += 30) {
                userIdChunks.push(followingIds.slice(i, i + 30));
            }

            const allDiaries: DiaryEntry[] = [];
            for (const chunk of userIdChunks) {
                if (chunk.length === 0) continue;
                const diariesQuery = query(
                    collection(db, 'diaries'),
                    where('userId', 'in', chunk)
                );
                const diariesSnap = await getDocs(diariesQuery);
                diariesSnap.forEach(doc => {
                    const diaryData = { id: doc.id, ...doc.data() } as DiaryEntry;
                    if (diaryData.createdAt?.seconds) {
                        const diaryDate = new Date(diaryData.createdAt.seconds * 1000);
                        if (diaryDate > twentyFourHoursAgo) {
                            allDiaries.push(diaryData);
                        }
                    }
                });
            }
            
            const latestDiariesMap = new Map<string, DiaryEntry>();
            allDiaries.forEach(diary => {
                const existing = latestDiariesMap.get(diary.userId);
                if (!existing || diary.createdAt.seconds > existing.createdAt.seconds) {
                    latestDiariesMap.set(diary.userId, diary);
                }
            });

            const sortedDiaries = Array.from(latestDiariesMap.values()).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            setFollowedDiaries(sortedDiaries);
            setDiariesLoading(false);
        };

        fetchDiaries().catch(console.error);

    }, [isOpen, currentUser]);


    const startConversationWithUser = async (targetUser: { id: string, username: string, avatar: string }, initialMessage?: string) => {
        if (!auth.currentUser) return;

        const currentUserId = auth.currentUser.uid;
        const targetUserId = targetUser.id;
        const conversationId = [currentUserId, targetUserId].sort().join('_');
        
        const conversationRef = doc(db, 'conversations', conversationId);
        
        try {
            const conversationSnap = await getDoc(conversationRef);
            if (!conversationSnap.exists()) {
                await setDoc(conversationRef, {
                    participants: [currentUserId, targetUserId],
                    participantInfo: {
                        [currentUserId]: {
                            username: auth.currentUser.displayName,
                            avatar: auth.currentUser.photoURL,
                            lastSeenMessageTimestamp: null,
                        },
                        [targetUserId]: {
                            username: targetUser.username,
                            avatar: targetUser.avatar,
                            lastSeenMessageTimestamp: null,
                        }
                    },
                    timestamp: serverTimestamp(),
                });
            } else {
                await updateDoc(conversationRef, { timestamp: serverTimestamp() });
            }

            if(initialMessage) {
                await addDoc(collection(conversationRef, 'messages'), {
                    senderId: currentUserId,
                    text: initialMessage,
                    timestamp: serverTimestamp(),
                });
                await updateDoc(conversationRef, {
                    lastMessage: {
                        senderId: currentUserId,
                        text: initialMessage,
                        timestamp: serverTimestamp(),
                    }
                });
            }

            setActiveConversationId(conversationId);
            setView('list');
            setViewingDiary(null);
        } catch (error) {
            console.error("Error ensuring conversation exists:", error);
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setActiveConversationId(null);
            setView('list');
            return;
        }

        if (initialConversationId) {
            setActiveConversationId(initialConversationId);
            return;
        }

        if (initialTargetUser) {
            startConversationWithUser(initialTargetUser);
        } else {
            setActiveConversationId(null);
        }
    }, [isOpen, initialTargetUser, initialConversationId]);

    if (!isOpen) return null;
    
    const handleToggleAnonymous = async () => {
        if (!auth.currentUser) return;
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, { isAnonymous: !isAnonymous });
    };

    const handlePublishDiary = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || newDiaryEntry.trim() === '' || hasPostedToday) return;

        setIsPublishingDiary(true);
        try {
            await addDoc(collection(db, 'diaries'), {
                userId: currentUser.uid,
                username: currentUser.displayName,
                userAvatar: currentUser.photoURL,
                text: newDiaryEntry.trim(),
                createdAt: serverTimestamp(),
            });
            setNewDiaryEntry('');
        } catch (error) {
            console.error("Error publishing diary entry: ", error);
        } finally {
            setIsPublishingDiary(false);
        }
    };

    const renderContent = () => {
        if (activeConversationId) {
            return (
                <ChatWindow 
                    conversationId={activeConversationId} 
                    onBack={() => setActiveConversationId(null)}
                    isCurrentUserAnonymous={isAnonymous}
                />
            );
        }
        
        if (view === 'new') {
            return (
                <NewMessage 
                    onSelectUser={startConversationWithUser}
                    onBack={() => setView('list')}
                />
            );
        }

        return (
            <>
                <header className="flex items-center p-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                    <div className="w-1/4 flex justify-start">
                        <button 
                            onClick={handleToggleAnonymous} 
                            className={`w-8 h-8 p-1.5 rounded-full transition-colors ${isAnonymous ? 'bg-sky-500 text-white' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                            title={isAnonymous ? t('messages.anonymousModeOff') : t('messages.anonymousModeOn')}
                        >
                            <AnonIcon className="w-full h-full"/>
                        </button>
                    </div>
                    <h2 className="w-1/2 text-lg font-semibold text-center">{t('messages.title')}</h2>
                    <div className="w-1/4 flex justify-end items-center gap-2">
                        <button onClick={() => setView('new')} className="p-1" aria-label={t('messages.newMessage')}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button onClick={onClose} className="p-1" aria-label={t('messages.close')}>
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                </header>
                <main className="flex-grow overflow-hidden flex flex-col">
                    <DiaryCarousel 
                        diaries={followedDiaries}
                        myDiary={myLatestDiary}
                        onViewDiary={setViewingDiary}
                        onAddDiary={() => { /* Scroll to form or focus */ }}
                        loading={diariesLoading}
                    />
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                         <form onSubmit={handlePublishDiary} className="flex flex-col gap-2">
                            <TextAreaInput
                                id="diary-entry-modal"
                                label={hasPostedToday ? t('diary.alreadyPosted') : t('diary.placeholder')}
                                value={newDiaryEntry}
                                onChange={(e) => setNewDiaryEntry(e.target.value)}
                                rows={2}
                                disabled={hasPostedToday}
                            />
                            <Button type="submit" disabled={isPublishingDiary || !newDiaryEntry.trim() || hasPostedToday} className="self-end !w-auto !py-1 !px-3">
                                {isPublishingDiary ? t('diary.publishing') : t('diary.publish')}
                            </Button>
                        </form>
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        <ConversationList onSelectConversation={setActiveConversationId} />
                    </div>
                </main>
            </>
        );
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-white dark:bg-black rounded-lg shadow-xl w-full max-w-4xl h-[90vh] max-h-[700px] flex flex-col relative" 
                onClick={e => e.stopPropagation()}
            >
                {renderContent()}
            </div>
            {viewingDiary && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[60]"
                    onClick={() => setViewingDiary(null)}
                >
                    <div className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl w-full max-w-sm p-6 text-center shadow-lg flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                             <img src={viewingDiary.userAvatar} alt={viewingDiary.username} className="w-10 h-10 rounded-full" />
                             <p className="font-semibold text-left">{viewingDiary.username}</p>
                        </div>
                        <p className="text-xl font-serif text-center whitespace-pre-wrap flex-grow min-h-[100px]">{viewingDiary.text}</p>
                        <form onSubmit={(e) => {
                             e.preventDefault();
                             const replyText = (e.currentTarget.elements.namedItem('reply') as HTMLInputElement).value;
                             if(replyText.trim()){
                                startConversationWithUser({id: viewingDiary.userId, username: viewingDiary.username, avatar: viewingDiary.userAvatar}, replyText)
                             }
                        }}>
                             <input
                                name="reply"
                                type="text"
                                placeholder={t('messages.replyToNote', { username: viewingDiary.username })}
                                className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-full py-2 px-4 text-sm"
                            />
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessagesModal;
