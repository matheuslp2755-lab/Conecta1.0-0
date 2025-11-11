import React, { useState, useEffect, useRef } from 'react';
import { auth, db, collection, query, where, onSnapshot, orderBy, doc, getDoc } from '../../firebase';
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
        // FIX: Added senderId to the lastMessage type to match the data structure and resolve a TypeScript error.
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
    const currentUser = auth.currentUser;
    const userUnsubs = useRef<(() => void)[]>([]);

    useEffect(() => {
        if (!currentUser) return;
        setLoading(true);

        const q = query(
            collection(db, 'conversations'), 
            where('participants', 'array-contains', currentUser.uid)
            // Removed orderBy('timestamp', 'desc') to avoid needing a composite index.
            // Sorting will be handled on the client.
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
                        // Don't show conversations with deleted users
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
                
                // Sort conversations by timestamp client-side
                validConvos.sort((a, b) => {
                    const tsA = a.timestamp?.seconds || 0;
                    const tsB = b.timestamp?.seconds || 0;
                    return tsB - tsA; // Descending order
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
                        <li key={convo.id}>
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
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default ConversationList;