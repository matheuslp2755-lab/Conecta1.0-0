import React, { useState, useEffect } from 'react';
import { auth, db, collection, query, where, getDocs, orderBy, onSnapshot, addDoc, serverTimestamp, limit } from '../../firebase';
import TextAreaInput from '../common/TextAreaInput';
import Button from '../common/Button';
import { useLanguage } from '../../context/LanguageContext';
import { useTimeAgo } from '../../hooks/useTimeAgo';

interface DiaryViewProps {
    onBack: () => void;
}

type DiaryEntry = {
    id: string;
    userId: string;
    username: string;
    userAvatar: string;
    text: string;
    createdAt: { seconds: number; nanoseconds: number };
};

const BackArrowIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
);

const Spinner: React.FC = () => (
    <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sky-500"></div>
    </div>
);

const isToday = (timestamp: { seconds: number; nanoseconds: number } | null | undefined) => {
    if (!timestamp) return false;
    const date = new Date(timestamp.seconds * 1000);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
};


const DiaryView: React.FC<DiaryViewProps> = ({ onBack }) => {
    const { t } = useLanguage();
    const { formatTimestamp } = useTimeAgo();
    const [entries, setEntries] = useState<DiaryEntry[]>([]);
    const [newEntry, setNewEntry] = useState('');
    const [loading, setLoading] = useState(true);
    const [isPublishing, setIsPublishing] = useState(false);
    const [hasPostedToday, setHasPostedToday] = useState(false);
    const [checkingPostStatus, setCheckingPostStatus] = useState(true);
    const currentUser = auth.currentUser;

    useEffect(() => {
        if (!currentUser) return;
    
        let cleanupFunctions: (() => void)[] = [];
        const entryMap = new Map<string, DiaryEntry>();
    
        const fetchAndListen = async () => {
            setLoading(true);
            const followingRef = collection(db, 'users', currentUser.uid, 'following');
            const followingSnap = await getDocs(followingRef);
            const followingIds = followingSnap.docs.map(doc => doc.id);
            const userIds = [currentUser.uid, ...followingIds];
    
            if (userIds.length === 0) {
                setEntries([]);
                setLoading(false);
                return;
            }
    
            // Firestore 'in' queries are limited to 30 elements. Chunk the user IDs.
            const userIdChunks: string[][] = [];
            for (let i = 0; i < userIds.length; i += 30) {
                userIdChunks.push(userIds.slice(i, i + 30));
            }
    
            userIdChunks.forEach(chunk => {
                if (chunk.length === 0) return;
    
                const diariesQuery = query(
                    collection(db, 'diaries'), 
                    where('userId', 'in', chunk)
                );
    
                const unsubscribe = onSnapshot(diariesQuery, (snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        const docData = { id: change.doc.id, ...change.doc.data() } as DiaryEntry;
                        if (change.type === 'removed') {
                            entryMap.delete(change.doc.id);
                        } else {
                            entryMap.set(change.doc.id, docData);
                        }
                    });
    
                    const combinedEntries = Array.from(entryMap.values());
                    combinedEntries.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                    
                    setEntries(combinedEntries);
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching diary entries chunk: ", error);
                    setLoading(false);
                });
    
                cleanupFunctions.push(unsubscribe);
            });
        };
    
        fetchAndListen();
    
        return () => {
            cleanupFunctions.forEach(unsub => unsub());
        };
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser) {
            setCheckingPostStatus(false);
            return;
        };
        setCheckingPostStatus(true);
        
        const q = query(
            collection(db, 'diaries'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc'),
            limit(1)
        );
    
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const latestDiary = snapshot.docs[0].data() as DiaryEntry;
                setHasPostedToday(isToday(latestDiary.createdAt));
            } else {
                setHasPostedToday(false);
            }
            setCheckingPostStatus(false);
        }, (error) => {
            console.error("Error checking diary post status: ", error);
            setCheckingPostStatus(false);
        });
    
        return () => unsubscribe();
    }, [currentUser]);

    const handlePublish = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || newEntry.trim() === '' || hasPostedToday) return;

        setIsPublishing(true);
        try {
            await addDoc(collection(db, 'diaries'), {
                userId: currentUser.uid,
                username: currentUser.displayName,
                userAvatar: currentUser.photoURL,
                text: newEntry.trim(),
                createdAt: serverTimestamp(),
            });
            setNewEntry('');
        } catch (error) {
            console.error("Error publishing diary entry: ", error);
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <header className="flex items-center gap-3 p-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                <button onClick={onBack} aria-label={t('messages.back')}>
                   <BackArrowIcon className="w-6 h-6" />
                </button>
                <h2 className="text-lg font-semibold text-center flex-grow">{t('diary.title')}</h2>
                <div className="w-6"></div> {/* Spacer */}
            </header>
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                <form onSubmit={handlePublish} className="flex flex-col gap-2">
                    <TextAreaInput
                        id="diary-entry"
                        label={hasPostedToday ? t('diary.alreadyPosted') : t('diary.placeholder')}
                        value={newEntry}
                        onChange={(e) => setNewEntry(e.target.value)}
                        rows={3}
                        disabled={hasPostedToday || checkingPostStatus}
                    />
                    <Button type="submit" disabled={isPublishing || !newEntry.trim() || hasPostedToday || checkingPostStatus} className="self-end !w-auto">
                        {isPublishing ? t('diary.publishing') : t('diary.publish')}
                    </Button>
                </form>
            </div>
            <main className="flex-grow overflow-y-auto">
                {loading ? (
                    <Spinner />
                ) : entries.length > 0 ? (
                    <div className="flex flex-col">
                        {entries.map(entry => (
                            <div key={entry.id} className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-3 mb-2">
                                    <img src={entry.userAvatar} alt={entry.username} className="w-8 h-8 rounded-full" />
                                    <div>
                                        <p className="font-semibold text-sm">{entry.username}</p>
                                        <p className="text-xs text-zinc-500">{formatTimestamp(entry.createdAt)}</p>
                                    </div>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{entry.text}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center p-8">
                        <h3 className="text-lg font-semibold">{t('diary.empty')}</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-2">{t('diary.emptySuggestion')}</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default DiaryView;
