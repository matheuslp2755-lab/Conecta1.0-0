import React, { useState, useEffect } from 'react';
import { updateProfile } from 'firebase/auth';
import {
    auth,
    db,
    storage,
    storageRef,
    uploadBytes,
    getDownloadURL,
    doc,
    getDoc,
    collection,
    getDocs,
    setDoc,
    deleteDoc,
    serverTimestamp,
    updateDoc,
    query,
    where,
    orderBy,
    addDoc,
    writeBatch,
    onSnapshot,
    deleteObject,
} from '../../firebase';
import Button from '../common/Button';
import EditProfileModal from './EditProfileModal';
import OnlineIndicator from '../common/OnlineIndicator';
import PulseViewerModal from '../pulse/PulseViewerModal';
import { useLanguage } from '../../context/LanguageContext';
import { useCall } from '../../context/CallContext';
import ProfileMusicPlayer from './ProfileMusicPlayer';

const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-500"></div>
);

const GridIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg aria-label="Posts" className={className} fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><rect fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" width="18" x="3" y="3"></rect><line fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="9.015" x2="9.015" y1="3" y2="21"></line><line fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="14.985" x2="14.985" y1="3" y2="21"></line><line fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="21" x2="3" y1="9.015" y2="9.015"></line><line fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="21" x2="3" y1="14.985" y2="14.985"></line></svg>
);

const PulseGridIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg aria-label="Pulses" className={className} fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M12 2.5a9.5 9.5 0 100 19 9.5 9.5 0 000-19zm0 1.5a8 8 0 110 16 8 8 0 010-16z" opacity="0.4"></path><path d="M12 7a5 5 0 100 10 5 5 0 000-10z"></path></svg>
);

const CallIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
);

const VideoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);


interface UserProfileProps {
    userId: string;
    onStartMessage: (targetUser: { id: string, username: string, avatar: string }) => void;
}

type MusicInfo = {
    nome: string;
    artista: string;
    capa: string;
    preview: string;
};

type ProfileUserData = {
    username: string;
    avatar: string;
    bio?: string;
    isPrivate?: boolean;
    lastSeen?: { seconds: number; nanoseconds: number };
    isAnonymous?: boolean;
    profileMusic?: MusicInfo;
};

type Post = {
    id: string;
    imageUrl: string;
    caption: string;
    timestamp: { seconds: number; nanoseconds: number };
    userId?: string;
    isVentMode?: boolean;
    allowedUsers?: string[];
    duoPartner?: { userId: string; username: string; userAvatar: string; };
    pendingDuoPartner?: { userId: string; username: string; userAvatar: string; };
};

type Pulse = {
    id: string;
    mediaUrl: string;
    legenda: string;
    createdAt: { seconds: number; nanoseconds: number };
    authorId: string;
    isVentMode?: boolean;
    allowedUsers?: string[];
};

const UserProfile: React.FC<UserProfileProps> = ({ userId, onStartMessage }) => {
    const { t } = useLanguage();
    const { startCall, activeCall } = useCall();
    const [user, setUser] = useState<ProfileUserData | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [pulses, setPulses] = useState<Pulse[]>([]);
    const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });
    const [isFollowing, setIsFollowing] = useState(false);
    const [followRequestSent, setFollowRequestSent] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [activeTab, setActiveTab] = useState<'posts' | 'pulses'>('posts');
    const [viewingPulse, setViewingPulse] = useState<Pulse | null>(null);
    const currentUser = auth.currentUser;

    useEffect(() => {
        setLoading(true);
        const userDocRef = doc(db, 'users', userId);

        const unsubscribe = onSnapshot(userDocRef, async (userDocSnap) => {
            if (!userDocSnap.exists()) {
                console.error("No such user!");
                setUser(null);
                setLoading(false);
                return;
            }

            const userData = userDocSnap.data() as ProfileUserData;
            setUser(userData);

            const followersQuery = collection(db, 'users', userId, 'followers');
            const followingQuery = collection(db, 'users', userId, 'following');
            const pulsesQuery = query(collection(db, 'pulses'), where('authorId', '==', userId));

            const postsQuery = query(collection(db, 'posts'), where('userId', '==', userId));
            const duoPostsQuery = query(collection(db, 'posts'), where('duoPartner.userId', '==', userId));
            
            // FIX: Corrected a typo where duoPostsSnap was used instead of duoPostsQuery.
            const [followersSnap, followingSnap, pulsesSnap, postsSnap, duoPostsSnap] = await Promise.all([
                getDocs(followersQuery),
                getDocs(followingQuery),
                getDocs(pulsesQuery),
                getDocs(postsQuery),
                getDocs(duoPostsQuery)
            ]);

            const combinedPostDocs = [...postsSnap.docs, ...duoPostsSnap.docs];
            const postsMap = new Map<string, Post>();
            combinedPostDocs.forEach(doc => postsMap.set(doc.id, { id: doc.id, ...doc.data() } as Post));
            const allUserPosts = Array.from(postsMap.values());
            
            setStats({ posts: allUserPosts.length, followers: followersSnap.size, following: followingSnap.size });

            let userIsFollowing = false;
            if (currentUser && currentUser.uid !== userId) {
                const followingDoc = await getDoc(doc(db, 'users', currentUser.uid, 'following', userId));
                userIsFollowing = followingDoc.exists();
                setIsFollowing(userIsFollowing);

                if (userData.isPrivate && !userIsFollowing) {
                    const requestDoc = await getDoc(doc(db, 'users', userId, 'followRequests', currentUser.uid));
                    setFollowRequestSent(requestDoc.exists());
                }
            }
            
            if (currentUser?.uid === userId || !userData.isPrivate || userIsFollowing) {
                const filteredPosts = allUserPosts.filter(post => {
                    if (currentUser?.uid === userId || post.userId === userId || post.duoPartner?.userId === userId) return true; // My profile or my post
                    if (!post.isVentMode) return true; // Public post
                    return post.allowedUsers?.includes(currentUser!.uid); // I'm allowed to see this vent post
                });
                filteredPosts.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                setPosts(filteredPosts);
                
                const userPulses = pulsesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pulse));
                const filteredPulses = userPulses.filter(pulse => {
                    if (currentUser?.uid === userId) return true;
                    if (!pulse.isVentMode) return true;
                    return pulse.allowedUsers?.includes(currentUser!.uid);
                });
                filteredPulses.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setPulses(filteredPulses);
            } else {
                setPosts([]);
                setPulses([]);
            }

            setLoading(false);
        }, (error) => {
            console.error("Error fetching user data:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId, currentUser]);

    const handleFollowAction = async () => {
        if (!currentUser || !user) return;
        if(user.isPrivate) {
            handleSendFollowRequest();
        } else {
            handleFollowPublic();
        }
    };
    
    const handleSendFollowRequest = async () => {
        if (!currentUser || !user) return;
        setFollowRequestSent(true);

        const targetUserRequestRef = doc(db, 'users', userId, 'followRequests', currentUser.uid);
        const currentUserSentRequestRef = doc(db, 'users', currentUser.uid, 'sentFollowRequests', userId);
        const notificationRef = doc(collection(db, 'users', userId, 'notifications'));

        try {
            const batch = writeBatch(db);
            batch.set(targetUserRequestRef, {
                username: currentUser.displayName,
                avatar: currentUser.photoURL,
                timestamp: serverTimestamp()
            });
            batch.set(currentUserSentRequestRef, {
                username: user.username,
                avatar: user.avatar,
                timestamp: serverTimestamp()
            });
            batch.set(notificationRef, {
                type: 'follow_request',
                fromUserId: currentUser.uid,
                fromUsername: currentUser.displayName,
                fromUserAvatar: currentUser.photoURL,
                timestamp: serverTimestamp(),
                read: false,
            });
            await batch.commit();
        } catch (error) {
            console.error("Error sending follow request:", error);
            setFollowRequestSent(false); // Revert on failure
        }
    };

    const handleCancelFollowRequest = async () => {
        if (!currentUser) return;
        setFollowRequestSent(false);

        const targetUserRequestRef = doc(db, 'users', userId, 'followRequests', currentUser.uid);
        const currentUserSentRequestRef = doc(db, 'users', currentUser.uid, 'sentFollowRequests', userId);

        try {
            const batch = writeBatch(db);
            batch.delete(targetUserRequestRef);
            batch.delete(currentUserSentRequestRef);
            await batch.commit();
        } catch (error) {
            console.error("Error cancelling follow request:", error);
            setFollowRequestSent(true); // Revert on failure
        }
    };

    const handleFollowPublic = async () => {
        if (!currentUser || !user) return;
        setIsFollowing(true);
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }));

        const currentUserFollowingRef = doc(db, 'users', currentUser.uid, 'following', userId);
        const targetUserFollowersRef = doc(db, 'users', userId, 'followers', currentUser.uid);
        const notificationRef = collection(db, 'users', userId, 'notifications');

        try {
            await setDoc(currentUserFollowingRef, {
                username: user.username,
                avatar: user.avatar,
                timestamp: serverTimestamp()
            });
            await setDoc(targetUserFollowersRef, {
                username: currentUser.displayName,
                avatar: currentUser.photoURL,
                timestamp: serverTimestamp()
            });
            await addDoc(notificationRef, {
                type: 'follow',
                fromUserId: currentUser.uid,
                fromUsername: currentUser.displayName,
                fromUserAvatar: currentUser.photoURL,
                timestamp: serverTimestamp(),
                read: false,
            });
        } catch (error) {
            console.error("Error following user:", error);
            setIsFollowing(false);
            setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
        }
    };
    
    const handleUnfollow = async () => {
        if (!currentUser) return;
        setIsFollowing(false);
        setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));

        const currentUserFollowingRef = doc(db, 'users', currentUser.uid, 'following', userId);
        const targetUserFollowersRef = doc(db, 'users', userId, 'followers', currentUser.uid);
        
        try {
            await deleteDoc(currentUserFollowingRef);
            await deleteDoc(targetUserFollowersRef);
        } catch(error) {
            console.error("Error unfollowing user:", error);
            setIsFollowing(true);
            setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
        }
    };
    
    const updateDenormalizedAvatar = async (userId: string, newAvatarUrl: string) => {
        console.log(`Starting background avatar update for user ${userId}.`);
        const updates: { ref: any; data: any }[] = [];
        const MAX_BATCH_WRITES = 500;
    
        // 1. Find all posts by the user
        try {
            const postsQuery = query(collection(db, 'posts'), where('userId', '==', userId));
            const postsSnapshot = await getDocs(postsQuery);
            postsSnapshot.forEach(doc => {
                updates.push({ ref: doc.ref, data: { userAvatar: newAvatarUrl } });
            });
            console.log(`Found ${postsSnapshot.size} posts to update.`);
        } catch (error) {
            console.error("Failed to query posts for avatar update:", error);
        }
    
        // 2. Find all conversations the user is part of
        try {
            const convosQuery = query(collection(db, 'conversations'), where('participants', 'array-contains', userId));
            const convosSnapshot = await getDocs(convosQuery);
            convosSnapshot.forEach(doc => {
                updates.push({ ref: doc.ref, data: { [`participantInfo.${userId}.avatar`]: newAvatarUrl } });
            });
            console.log(`Found ${convosSnapshot.size} conversations to update.`);
        } catch (error) {
            console.error("Failed to query conversations for avatar update:", error);
        }
    
        // 3. Commit all updates in batches
        if (updates.length === 0) {
            console.log("No denormalized documents needed an update.");
            return;
        }
    
        console.log(`Committing ${updates.length} total updates in batches...`);
        for (let i = 0; i < updates.length; i += MAX_BATCH_WRITES) {
            const batch = writeBatch(db);
            const chunk = updates.slice(i, i + MAX_BATCH_WRITES);
            chunk.forEach(update => {
                batch.update(update.ref, update.data);
            });
            try {
                await batch.commit();
                console.log(`Batch ${i / MAX_BATCH_WRITES + 1} committed successfully.`);
            } catch (error) {
                console.error(`Failed to commit update batch ${i / MAX_BATCH_WRITES + 1}:`, error);
            }
        }
        console.log("Background avatar update finished.");
    };

    const handleProfileUpdate = async ({ username, bio, avatarFile, isPrivate, profileMusic }: { username: string; bio: string; avatarFile: File | null; isPrivate: boolean; profileMusic: MusicInfo | null; }) => {
        const userToUpdate = auth.currentUser;
        if (!userToUpdate) return;
        setIsUpdating(true);
        
        try {
            const userDocRef = doc(db, 'users', userToUpdate.uid);
            const firestoreUpdates: { [key: string]: any } = {};
            const authUpdates: { displayName?: string; photoURL?: string } = {};
            let newAvatarUrl: string | undefined = undefined;

            if (avatarFile) {
                const avatarStorageRef = storageRef(storage, `avatars/${userToUpdate.uid}/${Date.now()}-${avatarFile.name}`);
                await uploadBytes(avatarStorageRef, avatarFile);
                newAvatarUrl = await getDownloadURL(avatarStorageRef);
                firestoreUpdates.avatar = newAvatarUrl;
                authUpdates.photoURL = newAvatarUrl;
            }

            if (username !== user?.username) {
                firestoreUpdates.username = username;
                firestoreUpdates.username_lowercase = username.toLowerCase();
                authUpdates.displayName = username;
            }
            if (bio !== (user?.bio || '')) {
                firestoreUpdates.bio = bio;
            }
            if (isPrivate !== (user?.isPrivate || false)) {
                firestoreUpdates.isPrivate = isPrivate;
            }
            
            firestoreUpdates.profileMusic = profileMusic;


            if (Object.keys(firestoreUpdates).length > 0) {
                await updateDoc(userDocRef, firestoreUpdates);
            }

            if (Object.keys(authUpdates).length > 0) {
                await updateProfile(userToUpdate, authUpdates);
                await userToUpdate.reload(); // Force refresh of the user object
            }

            if (newAvatarUrl) {
                // Fire and forget the background update.
                updateDenormalizedAvatar(userToUpdate.uid, newAvatarUrl).catch(e => {
                    console.error("A failure occurred during the background avatar update process:", e);
                });
            }

            window.dispatchEvent(new CustomEvent('profileUpdated'));
            setIsEditModalOpen(false);
        } catch (error) {
            console.error("Error updating profile: ", error);
            throw error;
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeletePulse = async (pulseToDelete: Pulse) => {
        try {
            const pulseRef = doc(db, 'pulses', pulseToDelete.id);
            const mediaRef = storageRef(storage, pulseToDelete.mediaUrl);
            
            await deleteDoc(pulseRef);
            await deleteObject(mediaRef);
            
            setPulses(currentPulses => currentPulses.filter(p => p.id !== pulseToDelete.id));
            setViewingPulse(null);
        } catch (error) {
            console.error("Error deleting pulse:", error);
        }
    };

    const renderFollowButton = () => {
        if (currentUser?.uid === userId) {
            return <Button onClick={() => setIsEditModalOpen(true)} className="!w-auto !bg-zinc-200 dark:!bg-zinc-700 !text-black dark:!text-white hover:!bg-zinc-300 dark:hover:!bg-zinc-600">{t('profile.editProfile')}</Button>;
        }
        return (
            <div className="flex items-center gap-2">
                {isFollowing ? (
                    <Button onClick={handleUnfollow} className="!w-auto !bg-zinc-200 dark:!bg-zinc-700 !text-black dark:!text-white hover:!bg-zinc-300 dark:hover:!bg-zinc-600">{t('profile.following')}</Button>
                ) : followRequestSent ? (
                    <Button onClick={handleCancelFollowRequest} className="!w-auto !bg-zinc-200 dark:!bg-zinc-700 !text-black dark:!text-white hover:!bg-zinc-300 dark:hover:!bg-zinc-600">{t('header.requested')}</Button>
                ) : (
                    <Button onClick={handleFollowAction} className="!w-auto">{t('profile.follow')}</Button>
                )}
                 <Button onClick={() => onStartMessage({ id: userId, username: user!.username, avatar: user!.avatar })} className="!w-auto !bg-zinc-200 dark:!bg-zinc-700 !text-black dark:!text-white hover:!bg-zinc-300 dark:hover:!bg-zinc-600">{t('profile.message')}</Button>
                 <Button 
                    onClick={() => {
                        if (user) {
                           startCall({ id: userId, username: user.username, avatar: user.avatar });
                        }
                    }} 
                    disabled={!!activeCall}
                    className="!w-auto !px-2 !bg-zinc-200 dark:!bg-zinc-700 !text-black dark:!text-white hover:!bg-zinc-300 dark:hover:!bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('call.voiceCall')}
                 >
                    <CallIcon className="w-5 h-5" />
                 </Button>
                 <Button 
                     disabled // Video call not implemented
                     className="!w-auto !px-2 !bg-zinc-200 dark:!bg-zinc-700 !text-black dark:!text-white hover:!bg-zinc-300 dark:hover:!bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                     title={t('call.videoCall')}
                 >
                    <VideoIcon className="w-5 h-5" />
                 </Button>
            </div>
        );
    };

    const renderContent = () => {
        if (user?.isPrivate && !isFollowing && currentUser?.uid !== userId) {
            return (
                <div className="flex flex-col justify-center items-center p-16 text-center border-t border-zinc-300 dark:border-zinc-700">
                    <h3 className="text-xl font-semibold">{t('profile.privateAccountMessage')}</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-2">{t('profile.privateAccountSuggestion')}</p>
                </div>
            );
        }

        const renderPostsGrid = () => (
            posts.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 sm:gap-4 mt-4">
                    {posts.map(post => (
                        <div key={post.id} className="aspect-square bg-zinc-200 dark:bg-zinc-800 relative group">
                            <img src={post.imageUrl} alt={post.caption} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex justify-center items-center">
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                 <div className="flex flex-col justify-center items-center p-16">
                    <h3 className="text-2xl font-bold">{t('profile.noPosts')}</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-2">{t('profile.noPostsSuggestion')}</p>
                </div>
            )
        );
    
        const renderPulsesGrid = () => (
            pulses.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 sm:gap-4 mt-4">
                    {pulses.map(pulse => (
                        <div key={pulse.id} className="aspect-square bg-zinc-200 dark:bg-zinc-800 relative group cursor-pointer" onClick={() => setViewingPulse(pulse)}>
                            {pulse.mediaUrl.includes('.mp4') || pulse.mediaUrl.includes('.webm') ? (
                                <video src={pulse.mediaUrl} className="w-full h-full object-cover" />
                            ) : (
                                <img src={pulse.mediaUrl} alt={pulse.legenda} className="w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex justify-center items-center">
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col justify-center items-center p-16">
                    <h3 className="text-2xl font-bold">{t('profile.noPulses')}</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-2">{t('profile.noPulsesSuggestion')}</p>
                </div>
            )
        );

        return (
             <div className="border-t border-zinc-300 dark:border-zinc-700 pt-2">
                <div className="flex justify-center gap-8 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    <button 
                        onClick={() => setActiveTab('posts')}
                        className={`flex items-center gap-2 pt-2 -mt-0.5 ${activeTab === 'posts' ? 'text-sky-500 border-t-2 border-sky-500' : ''}`}
                    >
                        <GridIcon className="w-4 h-4"/> {t('profile.postsTab')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('pulses')}
                        className={`flex items-center gap-2 pt-2 -mt-0.5 ${activeTab === 'pulses' ? 'text-sky-500 border-t-2 border-sky-500' : ''}`}
                    >
                        <PulseGridIcon className="w-4 h-4"/> {t('profile.pulsesTab')}
                    </button>
                </div>
                {activeTab === 'posts' ? renderPostsGrid() : renderPulsesGrid()}
            </div>
        )
    }


    if (loading) {
        return <div className="flex justify-center items-center p-8"><Spinner /></div>;
    }
    
    if (!user) {
        return <p className="text-center p-8 text-zinc-500 dark:text-zinc-400">{t('profile.notFound')}</p>;
    }

    const isOnline = !user.isAnonymous && user.lastSeen && (new Date().getTime() / 1000 - user.lastSeen.seconds) < 600; // 10 minutes

    return (
        <>
        <div className="container mx-auto max-w-4xl p-4 sm:p-8">
            <header className="flex flex-col sm:flex-row items-center gap-4 sm:gap-16 mb-8">
                <div className="w-36 h-36 sm:w-40 sm:h-40 flex-shrink-0 relative">
                    <img src={user.avatar} alt={user.username} className="w-full h-full rounded-full object-cover border-2 dark:border-zinc-800 p-1" />
                    {isOnline && <OnlineIndicator />}
                </div>
                <div className="flex flex-col gap-4 items-center sm:items-start w-full">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-light">{user.username}</h2>
                        {renderFollowButton()}
                    </div>
                    <div className="flex items-center gap-8 text-sm">
                        <span><span className="font-semibold">{stats.posts}</span> {t('profile.posts')}</span>
                        <span><span className="font-semibold">{stats.followers}</span> {t('profile.followers')}</span>
                        <span><span className="font-semibold">{stats.following}</span> {t('profile.followingCount')}</span>
                    </div>
                    <div className="text-sm pt-2 text-center sm:text-left w-full">
                        {user.profileMusic && <ProfileMusicPlayer musicInfo={user.profileMusic} />}
                        {user.bio && (
                            <p className="whitespace-pre-wrap mt-2">{user.bio}</p>
                        )}
                    </div>
                </div>
            </header>
            {renderContent()}
        </div>
        {user && (
            <EditProfileModal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)}
                user={user}
                onUpdate={handleProfileUpdate}
                isSubmitting={isUpdating}
            />
        )}
        {viewingPulse && user && (
            <PulseViewerModal
                pulses={pulses}
                initialPulseIndex={pulses.findIndex(p => p.id === viewingPulse.id)}
                authorInfo={{ id: userId, username: user.username, avatar: user.avatar }}
                onClose={() => setViewingPulse(null)}
                onDelete={(pulseToDelete) => {
                    if (pulses.length === 1) {
                        setViewingPulse(null);
                    }
                    handleDeletePulse(pulseToDelete);
                }}
            />
        )}
        </>
    );
};

export default UserProfile;