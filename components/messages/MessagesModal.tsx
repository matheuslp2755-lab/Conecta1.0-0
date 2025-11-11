import React, { useState, useEffect } from 'react';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import NewMessage from './NewMessage';
import { auth, db, doc, getDoc, setDoc, serverTimestamp, updateDoc, onSnapshot } from '../../firebase';
import { useLanguage } from '../../context/LanguageContext';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTargetUser: { id: string, username: string, avatar: string } | null;
  initialConversationId: string | null;
}

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


const MessagesModal: React.FC<MessagesModalProps> = ({ isOpen, onClose, initialTargetUser, initialConversationId }) => {
    const { t } = useLanguage();
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [view, setView] = useState<'list' | 'new'>('list');
    const [isAnonymous, setIsAnonymous] = useState(false);

    useEffect(() => {
        if (!isOpen || !auth.currentUser) return;

        const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
            if (doc.exists()) {
                setIsAnonymous(doc.data().isAnonymous || false);
            }
        });

        return () => unsub();
    }, [isOpen]);

    const startConversationWithUser = async (targetUser: { id: string, username: string, avatar: string }) => {
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
            setActiveConversationId(conversationId);
            setView('list');
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
                <header className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                     <button 
                        onClick={handleToggleAnonymous} 
                        className={`w-8 h-8 p-1.5 rounded-full transition-colors ${isAnonymous ? 'bg-sky-500 text-white' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                        title={isAnonymous ? t('messages.anonymousModeOff') : t('messages.anonymousModeOn')}
                    >
                        <AnonIcon className="w-full h-full"/>
                    </button>
                    <h2 className="text-lg font-semibold text-center">{t('messages.title')}</h2>
                    <button onClick={() => setView('new')} className="w-8 text-right" aria-label={t('messages.newMessage')}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                </header>
                <main className="flex-grow overflow-hidden">
                    <ConversationList onSelectConversation={setActiveConversationId} />
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
                {!activeConversationId && (
                     <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white z-10" aria-label={t('messages.close')}>
                        <XIcon className="w-6 h-6" />
                     </button>
                )}
                {renderContent()}
            </div>
        </div>
    );
};

export default MessagesModal;