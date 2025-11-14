import React, { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db, collection, query, where, getDocs, limit, doc, setDoc, deleteDoc, serverTimestamp, orderBy, onSnapshot, writeBatch, addDoc, updateDoc } from '../../firebase';
import OnlineIndicator from './OnlineIndicator';
import { useLanguage } from '../../context/LanguageContext';

type UserSearchResult = {
    id: string;
    username: string;
    avatar: string;
    isPrivate: boolean;
    lastSeen?: { seconds: number; nanoseconds: number };
};

type Notification = {
    id: string;
    type: 'follow' | 'message' | 'follow_request' | 'mention_comment' | 'duo_request' | 'duo_accepted' | 'duo_refused';
    fromUserId: string;
    fromUsername: string;
    fromUserAvatar: string;
    timestamp: { seconds: number; nanoseconds: number };
    read: boolean;
    conversationId?: string;
    postId?: string;
    commentText?: string;
};


interface HeaderProps {
    onSelectUser: (userId: string) => void;
    onGoHome: () => void;
    onOpenCreatePostModal: () => void;
    onOpenCreatePulseModal: () => void;
    onOpenMessages: (conversationId?: string) => void;
    onOpenGallery: () => void;
}

const SearchIcon: React.FC<{className?: string}> = ({className = "h-4 w-4 text-zinc-400 dark:text-zinc-500"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const MessagesIcon: React.FC<{className?: string}> = ({className = "h-6 w-6"}) => (
    <svg aria-label="Direct" className={className} fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24"><title>Direct</title><line fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" x1="22" x2="9.218" y1="3" y2="10.083"></line><polygon fill="none" points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334" stroke="currentColor" strokeLinejoin="round" strokeWidth="2"></polygon></svg>
);


const HeartIcon: React.FC<{className?: string}> = ({className = "h-6 w-6"}) => (
    <svg aria-label="Notifications" className={className} fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24"><title>Notifications</title><path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-6.12 8.351C12.89 20.72 12.434 21 12 21s-.89-.28-1.38-.627C7.152 14.08 4.5 12.192 4.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.118-1.763a4.21 4.21 0 0 1 3.675-1.941Z"></path></svg>
);

const ProfileIcon: React.FC<{className?: string}> = ({className = "h-5 w-5 mr-3"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const PlusCircleIcon: React.FC<{className?: string}> = ({className = "h-6 w-6"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const PulseIcon: React.FC<{className?: string}> = ({className = "h-6 w-6"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 1.5a8.5 8.5 0 110 17 8.5 8.5 0 010-17z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5v9M7.5 12h9" />
    </svg>
);

const GalleryIcon: React.FC<{className?: string}> = ({className = "h-6 w-6"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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


const Header: React.FC<HeaderProps> = ({ onSelectUser, onGoHome, onOpenCreatePostModal, onOpenCreatePulseModal, onOpenMessages, onOpenGallery }) => {
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isActivityDropdownOpen, setIsActivityDropdownOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
    const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
    const [following, setFollowing] = useState<string[]>([]);
    const [requestedIds, setRequestedIds] = useState<string[]>([]);
    const [isMobileSearchVisible, setIsMobileSearchVisible] = useState(false);
    const [forceUpdate, setForceUpdate] = useState(0); // Dummy state to force re-render on profile update
    const searchRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const activityRef = useRef<HTMLDivElement>(null);
    const currentUser = auth.currentUser;

    // Force re-render on profile update to show new avatar
    useEffect(() => {
        const handleProfileUpdate = () => {
            setForceUpdate(c => c + 1);
        };
        window.addEventListener('profileUpdated', handleProfileUpdate);
        return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
    }, []);

    // Listen for notifications
    useEffect(() => {
        if (!currentUser) return;

        const notificationsRef = collection(db, 'users', currentUser.uid, 'notifications');
        // Removed orderBy to prevent index-related permission errors. Sorting is handled client-side.
        const q = query(notificationsRef, limit(20));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedNotifications = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Notification))
                .filter(notification => notification.type !== 'message'); // Do not show message notifications in activity feed
            
            // Client-side sorting
            fetchedNotifications.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            setNotifications(fetchedNotifications);
            const hasUnread = fetchedNotifications.some(n => !n.read);
            setHasUnreadNotifications(hasUnread);
        }, (error) => {
            console.error("Error fetching notifications:", error);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Listen for unread messages
    useEffect(() => {
        if (!currentUser) return;

        const q = query(collection(db, 'conversations'), where('participants', 'array-contains', currentUser.uid));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const anyUnread = snapshot.docs.some(doc => {
                const data = doc.data();
                if (!data.lastMessage || data.lastMessage.senderId === currentUser.uid) {
                    return false;
                }
                const myInfo = data.participantInfo?.[currentUser.uid];
                if (!myInfo?.lastSeenMessageTimestamp) {
                    return true;
                }
                if (!data.lastMessage.timestamp) {
                    return false;
                }
                return data.lastMessage.timestamp.seconds > myInfo.lastSeenMessageTimestamp.seconds;
            });
            setHasUnreadMessages(anyUnread);
        }, (error) => {
            console.error("Error checking for unread messages:", error);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const fetchFollowingAndRequests = async () => {
        if (auth.currentUser) {
            const followingRef = collection(db, 'users', auth.currentUser.uid, 'following');
            const requestsRef = collection(db, 'users', auth.currentUser.uid, 'sentFollowRequests');

            const [followingSnap, requestsSnap] = await Promise.all([
                 getDocs(followingRef),
                 getDocs(requestsRef)
            ]);
            
            const followingIds = followingSnap.docs.map(doc => doc.id);
            const requestedUserIds = requestsSnap.docs.map(doc => doc.id);
            setFollowing(followingIds);
            setRequestedIds(requestedUserIds);
        }
    };
    
    useEffect(() => {
        fetchFollowingAndRequests();
    }, []);

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

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchFocused(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileDropdownOpen(false);
            }
            if (activityRef.current && !activityRef.current.contains(event.target as Node)) {
                setIsActivityDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [searchRef, profileRef, activityRef]);


    const handleLogout = () => {
        signOut(auth).catch(error => console.error("Error signing out: ", error));
    };
    
    const handleProfileLink = () => {
        if (currentUser) {
            onSelectUser(currentUser.uid);
            setIsProfileDropdownOpen(false);
        }
    }

    const handleFollow = async (targetUser: UserSearchResult) => {
        if (!auth.currentUser) return;

        if (targetUser.isPrivate) {
            // Send follow request
            setRequestedIds(prev => [...prev, targetUser.id]);
            const targetUserRequestRef = doc(db, 'users', targetUser.id, 'followRequests', auth.currentUser.uid);
            const currentUserSentRequestRef = doc(db, 'users', auth.currentUser.uid, 'sentFollowRequests', targetUser.id);
            const notificationRef = collection(db, 'users', targetUser.id, 'notifications');
            try {
                const batch = writeBatch(db);
                batch.set(targetUserRequestRef, {
                    username: auth.currentUser.displayName,
                    avatar: auth.currentUser.photoURL,
                    timestamp: serverTimestamp()
                });
                batch.set(currentUserSentRequestRef, {
                    username: targetUser.username,
                    avatar: targetUser.avatar,
                    timestamp: serverTimestamp()
                });
                batch.set(doc(notificationRef), {
                    type: 'follow_request',
                    fromUserId: auth.currentUser.uid,
                    fromUsername: auth.currentUser.displayName,
                    fromUserAvatar: auth.currentUser.photoURL,
                    timestamp: serverTimestamp(),
                    read: false,
                });
                await batch.commit();
            } catch (error) {
                console.error("Error sending follow request:", error);
                setRequestedIds(prev => prev.filter(id => id !== targetUser.id));
            }
        } else {
            // Follow directly
            setFollowing(prev => [...prev, targetUser.id]);
            const currentUserFollowingRef = doc(db, 'users', auth.currentUser.uid, 'following', targetUser.id);
            const targetUserFollowersRef = doc(db, 'users', targetUser.id, 'followers', auth.currentUser.uid);
            const notificationRef = collection(db, 'users', targetUser.id, 'notifications');
            try {
                await setDoc(currentUserFollowingRef, {
                    username: targetUser.username,
                    avatar: targetUser.avatar,
                    timestamp: serverTimestamp()
                });
                await setDoc(targetUserFollowersRef, {
                    username: auth.currentUser.displayName,
                    avatar: auth.currentUser.photoURL,
                    timestamp: serverTimestamp()
                });
                await addDoc(notificationRef, {
                    type: 'follow',
                    fromUserId: auth.currentUser.uid,
                    fromUsername: auth.currentUser.displayName,
                    fromUserAvatar: auth.currentUser.photoURL,
                    timestamp: serverTimestamp(),
                    read: false,
                });
            } catch (error) {
                console.error("Error following user:", error);
                setFollowing(prev => prev.filter(id => id !== targetUser.id));
            }
        }
    };
    
    const handleUnfollow = async (targetUserId: string) => {
        if (!auth.currentUser) return;
        setFollowing(prev => prev.filter(id => id !== targetUserId));

        const currentUserFollowingRef = doc(db, 'users', auth.currentUser.uid, 'following', targetUserId);
        const targetUserFollowersRef = doc(db, 'users', targetUserId, 'followers', auth.currentUser.uid);
        
        try {
            await deleteDoc(currentUserFollowingRef);
            await deleteDoc(targetUserFollowersRef);
        } catch(error) {
            console.error("Error unfollowing user:", error);
            setFollowing(prev => [...prev, targetUserId]);
        }
    };

     const handleCancelRequest = async (targetUserId: string) => {
        if (!auth.currentUser) return;
        setRequestedIds(prev => prev.filter(id => id !== targetUserId));
        
        const targetUserRequestRef = doc(db, 'users', targetUserId, 'followRequests', auth.currentUser.uid);
        const currentUserSentRequestRef = doc(db, 'users', auth.currentUser.uid, 'sentFollowRequests', targetUserId);
        
        try {
            const batch = writeBatch(db);
            batch.delete(targetUserRequestRef);
            batch.delete(currentUserSentRequestRef);
            await batch.commit();
        } catch (error) {
            console.error("Error cancelling follow request:", error);
            setRequestedIds(prev => [...prev, targetUserId]);
        }
    };

    const handleUserClick = (user: UserSearchResult) => {
        onSelectUser(user.id);
        setSearchQuery('');
        setIsSearchFocused(false);
        setIsMobileSearchVisible(false);
    };

    const handleOpenActivity = async () => {
        setIsActivityDropdownOpen(prev => !prev);
        if (hasUnreadNotifications && currentUser) {
            setHasUnreadNotifications(false); // Optimistic update
            const notificationsRef = collection(db, 'users', currentUser.uid, 'notifications');
            const q = query(notificationsRef, where('read', '==', false));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, { read: true });
            });
            await batch.commit();
        }
    };

    const handleAcceptFollowRequest = async (notification: Notification) => {
        if (!currentUser) return;
    
        const requesterId = notification.fromUserId;
        const batch = writeBatch(db);
    
        // 1. Add to current user's followers
        const followerRef = doc(db, 'users', currentUser.uid, 'followers', requesterId);
        batch.set(followerRef, {
            username: notification.fromUsername,
            avatar: notification.fromUserAvatar,
            timestamp: serverTimestamp()
        });
    
        // 2. Add to requester's following
        const followingRef = doc(db, 'users', requesterId, 'following', currentUser.uid);
        batch.set(followingRef, {
            username: currentUser.displayName,
            avatar: currentUser.photoURL,
            timestamp: serverTimestamp()
        });
    
        // 3. Delete the follow request
        const requestRef = doc(db, 'users', currentUser.uid, 'followRequests', requesterId);
        batch.delete(requestRef);
        const sentRequestRef = doc(db, 'users', requesterId, 'sentFollowRequests', currentUser.uid);
        batch.delete(sentRequestRef);
    
        // 4. Delete the 'follow_request' notification
        const notificationRef = doc(db, 'users', currentUser.uid, 'notifications', notification.id);
        batch.delete(notificationRef);
    
        try {
            await batch.commit();
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        } catch (error) {
            console.error("Error accepting follow request:", error);
        }
    };
    
    const handleDeclineFollowRequest = async (notification: Notification) => {
        if (!currentUser) return;
        const requesterId = notification.fromUserId;
    
        const batch = writeBatch(db);
        
        // 1. Delete the follow request
        const requestRef = doc(db, 'users', currentUser.uid, 'followRequests', requesterId);
        batch.delete(requestRef);
        const sentRequestRef = doc(db, 'users', requesterId, 'sentFollowRequests', currentUser.uid);
        batch.delete(sentRequestRef);
    
        // 2. Delete the notification
        const notificationRef = doc(db, 'users', currentUser.uid, 'notifications', notification.id);
        batch.delete(notificationRef);
    
        try {
            await batch.commit();
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        } catch (error) {
            console.error("Error declining follow request:", error);
        }
    };

    const handleAcceptDuoRequest = async (notification: Notification) => {
        if (!currentUser || !notification.postId) return;
    
        const requesterId = notification.fromUserId;
        const batch = writeBatch(db);
    
        // 1. Update the post with duo partner info
        const postRef = doc(db, 'posts', notification.postId);
        batch.update(postRef, {
            duoPartner: {
                userId: currentUser.uid,
                username: currentUser.displayName,
                userAvatar: currentUser.photoURL,
            },
            pendingDuoPartner: null
        });
    
        // 2. Delete the 'duo_request' notification for the current user
        const requestNotificationRef = doc(db, 'users', currentUser.uid, 'notifications', notification.id);
        batch.delete(requestNotificationRef);
    
        // 3. Create a 'duo_accepted' notification for the original poster
        const acceptedNotificationRef = doc(collection(db, 'users', requesterId, 'notifications'));
        batch.set(acceptedNotificationRef, {
            type: 'duo_accepted',
            fromUserId: currentUser.uid,
            fromUsername: currentUser.displayName,
            fromUserAvatar: currentUser.photoURL,
            postId: notification.postId,
            timestamp: serverTimestamp(),
            read: false,
        });
    
        try {
            await batch.commit();
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        } catch (error) {
            console.error("Error accepting duo request:", error);
        }
    };

    const handleDeclineDuoRequest = async (notification: Notification) => {
        if (!currentUser || !notification.postId) return;
    
        const requesterId = notification.fromUserId;
        const batch = writeBatch(db);
    
        // 1. Update the post to remove the pending request
        const postRef = doc(db, 'posts', notification.postId);
        batch.update(postRef, { pendingDuoPartner: null });
    
        // 2. Delete the 'duo_request' notification for the current user
        const requestNotificationRef = doc(db, 'users', currentUser.uid, 'notifications', notification.id);
        batch.delete(requestNotificationRef);
    
        // 3. Create a 'duo_refused' notification for the original poster
        const refusedNotificationRef = doc(collection(db, 'users', requesterId, 'notifications'));
        batch.set(refusedNotificationRef, {
            type: 'duo_refused',
            fromUserId: currentUser.uid,
            fromUsername: currentUser.displayName,
            fromUserAvatar: currentUser.photoURL,
            postId: notification.postId,
            timestamp: serverTimestamp(),
            read: false,
        });
    
        try {
            await batch.commit();
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        } catch (error) {
            console.error("Error declining duo request:", error);
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (notification.type === 'message' && notification.conversationId) {
            onOpenMessages(notification.conversationId);
        } else if (['follow', 'mention_comment', 'duo_accepted', 'duo_refused'].includes(notification.type)) {
            onSelectUser(notification.fromUserId);
        }
        // For request types, actions are handled by buttons, so no general click action
        if(!['follow_request', 'duo_request'].includes(notification.type)) {
             setIsActivityDropdownOpen(false);
        }
    };
    
    const getButtonForUser = (user: UserSearchResult) => {
        if (following.includes(user.id)) {
            return <button onClick={(e) => { e.stopPropagation(); handleUnfollow(user.id); }} className="ml-auto text-sm font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 px-4 py-1 rounded-lg transition-colors">{t('header.following')}</button>;
        }
        if (requestedIds.includes(user.id)) {
            return <button onClick={(e) => { e.stopPropagation(); handleCancelRequest(user.id); }} className="ml-auto text-sm font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 px-4 py-1 rounded-lg transition-colors">{t('header.requested')}</button>;
        }
        return <button onClick={(e) => { e.stopPropagation(); handleFollow(user); }} className="ml-auto text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 px-4 py-1 rounded-lg transition-colors">{t('header.follow')}</button>;
    };

    const searchResultContent = (
        <>
           {isSearching && <SpinnerIcon />}
           {!isSearching && searchQuery && searchResults.length === 0 && <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 p-4">{t('header.noResults')}</p>}
           {!isSearching && searchResults.map(user => {
               const isOnline = user.lastSeen && (new Date().getTime() / 1000 - user.lastSeen.seconds) < 600;
               return (
               <div key={user.id} onClick={() => handleUserClick(user)} className="w-full text-left flex items-center p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer">
                   <div className="relative">
                        <img src={user.avatar} alt={user.username} className="w-11 h-11 rounded-full object-cover" />
                        {isOnline && <OnlineIndicator />}
                   </div>
                   <div className="ml-3 flex-grow">
                       <p className="font-semibold text-sm">{user.username}</p>
                   </div>
                   {getButtonForUser(user)}
               </div>
           )})}
        </>
    );

    const getNotificationText = (notification: Notification) => {
        const params = { username: notification.fromUsername, commentText: notification.commentText || '' };
        switch (notification.type) {
            case 'follow':
                return t('header.followNotification', params);
            case 'message':
                return t('header.messageNotification', params);
            case 'follow_request':
                return t('header.followRequestNotification', params);
            case 'mention_comment':
                return t('header.mentionCommentNotification', params);
            case 'duo_request':
                return t('header.duoRequestNotification', params);
            case 'duo_accepted':
                return t('header.duoAcceptedNotification', params);
            case 'duo_refused':
                return t('header.duoRefusedNotification', params);
            default:
                return '';
        }
    };

    return (
        <header className="fixed top-0 left-0 right-0 bg-white dark:bg-black border-b border-zinc-300 dark:border-zinc-800 z-10">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-4xl gap-4">
                
                <h1 onClick={onGoHome} className={`text-2xl font-serif cursor-pointer transition-all duration-300 ${isMobileSearchVisible ? 'hidden sm:block' : 'block'}`}>
                    {t('header.title')}
                </h1>

                <div 
                    className={`relative flex-grow sm:flex-grow-0 ${isMobileSearchVisible ? 'block' : 'hidden sm:block'}`}
                    ref={searchRef}
                >
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <SearchIcon />
                        </span>
                        <input
                            type="text"
                            placeholder={t('header.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            className={`bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md py-1.5 pl-10 pr-4 w-full sm:w-64 text-sm focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 dark:text-zinc-100`}
                            autoFocus={isMobileSearchVisible}
                        />
                    </div>
                    {isSearchFocused && (
                        <div className={`absolute top-full mt-2 bg-white dark:bg-zinc-950 rounded-md shadow-lg border border-zinc-200 dark:border-zinc-800 z-20 max-h-80 overflow-y-auto w-full sm:w-80`}>
                           {searchResultContent}
                        </div>
                    )}
                </div>

                <nav className={`flex items-center gap-4 ${isMobileSearchVisible ? 'hidden sm:flex' : 'flex'}`}>
                    <button onClick={() => setIsMobileSearchVisible(true)} className="sm:hidden">
                        <SearchIcon className="h-6 w-6 text-zinc-800 dark:text-zinc-200" />
                    </button>
                    
                    <button onClick={onOpenGallery} className="relative" title={t('header.gallery')}>
                        <GalleryIcon className="w-6 h-6 text-zinc-800 dark:text-zinc-200 hover:text-zinc-500 dark:hover:text-zinc-400"/>
                    </button>

                    <button onClick={onOpenCreatePulseModal} className="relative">
                        <PulseIcon className="w-6 h-6 text-zinc-800 dark:text-zinc-200 hover:text-zinc-500 dark:hover:text-zinc-400"/>
                    </button>
                    
                    <button onClick={onOpenCreatePostModal} className="relative">
                        <PlusCircleIcon className="w-6 h-6 text-zinc-800 dark:text-zinc-200 hover:text-zinc-500 dark:hover:text-zinc-400"/>
                    </button>

                    <button onClick={() => onOpenMessages()} className="relative" title={t('header.messages')}>
                        <MessagesIcon className="w-6 h-6 text-zinc-800 dark:text-zinc-200 hover:text-zinc-500 dark:hover:text-zinc-400"/>
                        {hasUnreadMessages && (
                            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-pink-500 ring-2 ring-white dark:ring-black"></span>
                        )}
                    </button>
                    
                    <div ref={activityRef} className="relative">
                        <button onClick={handleOpenActivity} className="relative" title={t('header.notifications')}>
                            <HeartIcon className="w-6 h-6 text-zinc-800 dark:text-zinc-200 hover:text-zinc-500 dark:hover:text-zinc-400"/>
                            {hasUnreadNotifications && (
                                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-black"></span>
                            )}
                        </button>
                        {isActivityDropdownOpen && (
                             <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-zinc-950 rounded-md shadow-lg border border-zinc-200 dark:border-zinc-800 z-20 max-h-96 overflow-y-auto">
                                {notifications.length > 0 ? (
                                    notifications.map(notification => (
                                        <div 
                                            key={notification.id} 
                                            onClick={() => handleNotificationClick(notification)}
                                            className="flex items-center p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
                                        >
                                            <img src={notification.fromUserAvatar} alt={notification.fromUsername} className="w-11 h-11 rounded-full object-cover"/>
                                            <div className="ml-3 text-sm flex-grow">
                                                <p
                                                    dangerouslySetInnerHTML={{ __html: getNotificationText(notification)
                                                        .replace(notification.fromUsername, `<b>${notification.fromUsername}</b>`)
                                                    }}
                                                />
                                                {notification.type === 'follow_request' && (
                                                    <div className="flex gap-2 mt-2">
                                                        <button onClick={(e) => { e.stopPropagation(); handleAcceptFollowRequest(notification); }} className="text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 px-4 py-1 rounded-lg">{t('header.accept')}</button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeclineFollowRequest(notification); }} className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 px-4 py-1 rounded-lg">{t('header.decline')}</button>
                                                    </div>
                                                )}
                                                {notification.type === 'duo_request' && (
                                                    <div className="flex gap-2 mt-2">
                                                        <button onClick={(e) => { e.stopPropagation(); handleAcceptDuoRequest(notification); }} className="text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 px-4 py-1 rounded-lg">{t('header.accept')}</button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeclineDuoRequest(notification); }} className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 px-4 py-1 rounded-lg">{t('header.decline')}</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 p-4">{t('header.noActivity')}</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div ref={profileRef} className="relative">
                        <button onClick={() => setIsProfileDropdownOpen(prev => !prev)} className="w-8 h-8 rounded-full focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-white dark:focus:ring-offset-black">
                             <img src={currentUser?.photoURL || `https://i.pravatar.cc/150?u=${currentUser?.uid}`} alt={t('header.profile')} className="w-full h-full rounded-full object-cover" />
                        </button>
                        {isProfileDropdownOpen && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-zinc-950 rounded-md shadow-lg border border-zinc-200 dark:border-zinc-800 z-20 py-1">
                                <button onClick={handleProfileLink} className="w-full flex items-center text-left px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900">
                                    <ProfileIcon /> {t('header.profile')}
                                </button>
                                <div className="border-t border-zinc-200 dark:border-zinc-800 my-1"></div>
                                <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900">
                                    {t('header.logOut')}
                                </button>
                            </div>
                        )}
                    </div>
                </nav>

                <div className={`${isMobileSearchVisible ? 'flex sm:hidden' : 'hidden'} items-center`}>
                    <button 
                        onClick={() => {
                            setIsMobileSearchVisible(false);
                            setSearchQuery('');
                            setIsSearchFocused(false);
                        }} 
                        className="text-sm font-semibold"
                    >
                        {t('header.cancel')}
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;