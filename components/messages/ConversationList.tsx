import React, { useState, useEffect, useRef } from 'react';
import { auth, db, collection, query, where, onSnapshot, orderBy, doc, getDoc, writeBatch, getDocs, deleteDoc } from '../../firebase';
import OnlineIndicator from '../common/OnlineIndicator';
import { useLanguage } from '../../context/LanguageContext';
import { useTimeAgo } from '../../hooks/useTimeAgo';

interface Conversation {
    id: string;
    otherUser: {
        id: string;
        username: string;
        avatar: string;
    };
    lastMessage?: {
        text: string;
        timestamp: any;
        mediaType?: 'image' | 'video' | 'audio' | 'forwarded_post';
        senderId: string;
    };
    isOnline?: boolean;
    timestamp: any;
}

interface ConversationListProps {
    onSelectConversation: (id: string) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({ onSelectConversation }) => {
    const { t } = useLanguage();
    const { formatTimestamp } = useTimeAgo();
    const [conversations, setConversations] = useState<Omit<Conversation, 'isOnline'>[]>([]);
    const [userStatuses, setUserStatuses] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [confirmDelete, setConfirmDelete] = useState<Conversation | null>(null);
    const currentUser = auth.currentUser;
    const userUnsubs = useRef<(() => void)[]>([]);

    useEffect(() => {
        if (!currentUser) return;
        setLoading(true);

        const q = query(
            collection(db, 'conversations'), 
            where('participants', 'array-contains', currentUser.uid)
        );

        const unsubConvos = onSnapshot(q, (snapshot) => {
            userUnsubs.current.forEach(unsub => unsub());
            userUnsubs.current = [];

            const conversationsPromises = snapshot.docs.map(async (convDoc) => {
                const data = convDoc.data();
                const participants = data.participants;
                if (!Array.isArray(participants)) return null;
                
                const otherUserId = (participants as string[]).find(p => p !== currentUser.uid);
                if (!otherUserId) return null;

                let otherUserInfo = data.participantInfo?.[otherUserId];

                if (!otherUserInfo?.username || !otherUserInfo?.avatar) {
                    const userDoc = await getDoc(doc(db, 'users', otherUserId));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        otherUserInfo = { username: userData.username, avatar: userData.avatar };
                    } else {
                        return null; 
                    }
                }

                return {
                    id: convDoc.id,
                    otherUser: {
                        id: otherUserId,
                        username: String(otherUserInfo.username),
                        avatar: String(otherUserInfo.avatar),
                    },
                    lastMessage: data.lastMessage,
                    timestamp: data.timestamp,
                };
            });

            Promise.all(conversationsPromises).then(resolvedConversations => {
                const validConvos = resolvedConversations.filter(Boolean) as Omit<Conversation, 'isOnline'>[];
                
                validConvos.sort((a, b) => {
                    const tsA = a.timestamp?.seconds || 0;
                    const tsB = b.timestamp?.seconds || 0;
                    return tsB - tsA;
                });

                const uniqueUserIds = [...new Set(validConvos.map(c => c.otherUser.id))];
                
                uniqueUserIds.forEach(userId => {
                    const userDocRef = doc(db, 'users', userId);
                    const unsub = onSnapshot(userDocRef, (userSnap) => {
                        if (userSnap.exists()) {
                            const userData = userSnap.data();
                            const lastSeen = userData.lastSeen;
                            const isAnonymous = userData.isAnonymous || false;
                            const isOnline = !isAnonymous && lastSeen && (new Date().getTime() / 1000 - lastSeen.seconds) < 600;
                            setUserStatuses(prev => ({...prev, [userId]: isOnline }));
                        }
                    });
                    userUnsubs.current.push(unsub);
                });

                setConversations(validConvos);
                setLoading(false);
            });
        }, (error) => {
            console.error("Error fetching conversations:", error);
            setLoading(false);
        });

        return () => {
            unsubConvos();
            userUnsubs.current.forEach(unsub => unsub());
        };
    }, [currentUser]);

    const conversationsWithStatus = conversations.map(convo => ({
        ...convo,
        isOnline: userStatuses[convo.otherUser.id] || false,
    }));
    
    const renderLastMessage = (convo: Conversation) => {
        const lm = convo.lastMessage;
        if (!lm) return '...';
        
        const sender = lm.senderId === currentUser?.uid ? `${t('common.you')}: ` : '';

        switch (lm.mediaType) {
            case 'image':
                return `${sender}📷 ${lm.text || t('messages.media.photo')}`;
            case 'video':
                return `${sender}📹 ${lm.text || t('messages.media.video')}`;
            case 'audio':
                return `${sender}🎤 ${t('messages.media.audio')}`;
            case 'forwarded_post':
                 return `${sender}↪️ ${t('messages.forwardedPost')}`;
            default:
                return lm.text ? `${sender}${lm.text}` : '...';
        }
    }

    const handleDeleteConversation = async () => {
        if (!confirmDelete) return;
        const conversationId = confirmDelete.id;
    
        try {
            const conversationRef = doc(db, 'conversations', conversationId);
            const messagesRef = collection(conversationRef, 'messages');
            
            const messagesSnap = await getDocs(messagesRef);
            
            const batch = writeBatch(db);
            messagesSnap.forEach(doc => {
                batch.delete(doc.ref);
            });
            batch.delete(conversationRef);
    
            await batch.commit();
        } catch (error) {
            console.error("Error deleting conversation:", error);
        } finally {
            setConfirmDelete(null);
        }
    };


    if (loading) {
        return <div className="p-4 text-center text-sm text-zinc-500">{t('messages.loading')}</div>;
    }

    return (
        <div className="h-full overflow-y-auto">
            {conversations.length === 0 ? (
                <p className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">{t('messages.noConversations')}</p>
            ) : (
                <ul>
                    {conversationsWithStatus.map(convo => (
                        <li key={convo.id} className="group relative">
                            <button
                                onClick={() => onSelectConversation(convo.id)}
                                className="w-full text-left flex items-center p-3 gap-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                            >
                                <div className="relative flex-shrink-0">
                                    <img src={convo.otherUser.avatar} alt={convo.otherUser.username} className="w-14 h-14 rounded-full object-cover" />
                                    {convo.isOnline && <OnlineIndicator />}
                                </div>
                                <div className="flex-grow overflow-hidden">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold truncate">{convo.otherUser.username}</p>
                                        {convo.lastMessage?.timestamp && (
                                            <p className="text-xs text-zinc-400 flex-shrink-0 ml-2">
                                                {formatTimestamp(convo.lastMessage.timestamp).replace(/\s*ago/i, '').replace(' ', '')}
                                            </p>
                                        )}
                                    </div>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                                        {renderLastMessage(convo)}
                                    </p>
                                </div>
                            </button>
                             <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDelete(convo);
                                    }}
                                    className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                    title={t('common.delete')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60]">
                    <div className="bg-white dark:bg-black rounded-lg shadow-xl p-6 w-full max-w-sm text-center border dark:border-zinc-800">
                        <h3 className="text-lg font-semibold mb-2">{t('messages.deleteConversationTitle')}</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                            {t('messages.deleteConversationBody')}
                        </p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 font-semibold"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleDeleteConversation}
                                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold"
                            >
                                {t('messages.deleteConversationConfirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConversationList;