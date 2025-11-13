import React, { useState, useEffect } from 'react';
import { auth, db, collection, getDocs, doc, getDoc, setDoc, deleteDoc, serverTimestamp, writeBatch, addDoc } from '../../firebase';
import { useLanguage } from '../../context/LanguageContext';
import Button from '../common/Button';

type User = {
    id: string;
    username: string;
    avatar: string;
    isPrivate?: boolean;
};

const Spinner: React.FC = () => (
    <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sky-500"></div>
    </div>
);

interface FollowersModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    mode: 'followers' | 'following';
}

const FollowersModal: React.FC<FollowersModalProps> = ({ isOpen, onClose, userId, mode }) => {
    const { t } = useLanguage();
    const [listUsers, setListUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [myFollowingIds, setMyFollowingIds] = useState<string[]>([]);
    const [mySentRequestIds, setMySentRequestIds] = useState<string[]>([]);
    const currentUser = auth.currentUser;

    useEffect(() => {
        if (!isOpen || !currentUser) return;
        
        const fetchData = async () => {
            setLoading(true);
            try {
                const followingRef = collection(db, 'users', currentUser.uid, 'following');
                const requestsRef = collection(db, 'users', currentUser.uid, 'sentFollowRequests');
                const [followingSnap, requestsSnap] = await Promise.all([getDocs(followingRef), getDocs(requestsRef)]);
                setMyFollowingIds(followingSnap.docs.map(doc => doc.id));
                setMySentRequestIds(requestsSnap.docs.map(doc => doc.id));

                const listRef = collection(db, 'users', userId, mode);
                const listSnap = await getDocs(listRef);
                const userIds = listSnap.docs.map(doc => doc.id);

                if (userIds.length > 0) {
                    const userPromises = userIds.map(id => getDoc(doc(db, 'users', id)));
                    const userDocs = await Promise.all(userPromises);
                    const usersData = userDocs
                        .filter(doc => doc.exists())
                        .map(doc => ({ id: doc.id, ...doc.data() } as User));
                    setListUsers(usersData);
                } else {
                    setListUsers([]);
                }
            } catch (error) {
                console.error(`Error fetching ${mode}:`, error);
                setListUsers([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isOpen, userId, mode, currentUser]);

    useEffect(() => {
        if (!isOpen) {
            setListUsers([]);
            setLoading(true);
        }
    }, [isOpen]);

    const handleFollow = async (targetUser: User) => {
        if (!currentUser) return;
        if (targetUser.isPrivate) {
            setMySentRequestIds(prev => [...prev, targetUser.id]);
            const targetUserRequestRef = doc(db, 'users', targetUser.id, 'followRequests', currentUser.uid);
            const currentUserSentRequestRef = doc(db, 'users', currentUser.uid, 'sentFollowRequests', targetUser.id);
            const notificationRef = collection(db, 'users', targetUser.id, 'notifications');
            try {
                const batch = writeBatch(db);
                batch.set(targetUserRequestRef, { username: currentUser.displayName, avatar: currentUser.photoURL, timestamp: serverTimestamp() });
                batch.set(currentUserSentRequestRef, { username: targetUser.username, avatar: targetUser.avatar, timestamp: serverTimestamp() });
                batch.set(doc(notificationRef), { type: 'follow_request', fromUserId: currentUser.uid, fromUsername: currentUser.displayName, fromUserAvatar: currentUser.photoURL, timestamp: serverTimestamp(), read: false, });
                await batch.commit();
            } catch (error) {
                console.error("Error sending follow request:", error);
                setMySentRequestIds(prev => prev.filter(id => id !== targetUser.id));
            }
        } else {
            setMyFollowingIds(prev => [...prev, targetUser.id]);
            const currentUserFollowingRef = doc(db, 'users', currentUser.uid, 'following', targetUser.id);
            const targetUserFollowersRef = doc(db, 'users', targetUser.id, 'followers', currentUser.uid);
            const notificationRef = collection(db, 'users', targetUser.id, 'notifications');
            try {
                await setDoc(currentUserFollowingRef, { username: targetUser.username, avatar: targetUser.avatar, timestamp: serverTimestamp() });
                await setDoc(targetUserFollowersRef, { username: currentUser.displayName, avatar: currentUser.photoURL, timestamp: serverTimestamp() });
                await addDoc(notificationRef, { type: 'follow', fromUserId: currentUser.uid, fromUsername: currentUser.displayName, fromUserAvatar: currentUser.photoURL, timestamp: serverTimestamp(), read: false, });
            } catch (error) {
                console.error("Error following user:", error);
                setMyFollowingIds(prev => prev.filter(id => id !== targetUser.id));
            }
        }
    };
    
    const handleUnfollow = async (targetUserId: string) => {
        if (!currentUser) return;
        setMyFollowingIds(prev => prev.filter(id => id !== targetUserId));
        const currentUserFollowingRef = doc(db, 'users', currentUser.uid, 'following', targetUserId);
        const targetUserFollowersRef = doc(db, 'users', targetUserId, 'followers', currentUser.uid);
        try {
            await deleteDoc(currentUserFollowingRef);
            await deleteDoc(targetUserFollowersRef);
        } catch(error) {
            console.error("Error unfollowing user:", error);
            setMyFollowingIds(prev => [...prev, targetUserId]);
        }
    };

     const handleCancelRequest = async (targetUserId: string) => {
        if (!currentUser) return;
        setMySentRequestIds(prev => prev.filter(id => id !== targetUserId));
        const targetUserRequestRef = doc(db, 'users', targetUserId, 'followRequests', currentUser.uid);
        const currentUserSentRequestRef = doc(db, 'users', currentUser.uid, 'sentFollowRequests', targetUserId);
        try {
            const batch = writeBatch(db);
            batch.delete(targetUserRequestRef);
            batch.delete(currentUserSentRequestRef);
            await batch.commit();
        } catch (error) {
            console.error("Error cancelling follow request:", error);
            setMySentRequestIds(prev => [...prev, targetUserId]);
        }
    };
    
    const getButtonForUser = (user: User) => {
        if (user.id === currentUser?.uid) return null;
        if (myFollowingIds.includes(user.id)) {
            return <Button onClick={() => handleUnfollow(user.id)} className="!w-auto !py-1 !px-4 !text-sm !bg-zinc-200 dark:!bg-zinc-700 !text-black dark:!text-white hover:!bg-zinc-300 dark:hover:!bg-zinc-600">{t('header.following')}</Button>;
        }
        if (mySentRequestIds.includes(user.id)) {
            return <Button onClick={() => handleCancelRequest(user.id)} className="!w-auto !py-1 !px-4 !text-sm !bg-zinc-200 dark:!bg-zinc-700 !text-black dark:!text-white hover:!bg-zinc-300 dark:hover:!bg-zinc-600">{t('header.requested')}</Button>;
        }
        return <Button onClick={() => handleFollow(user)} className="!w-auto !py-1 !px-4 !text-sm">{t('header.follow')}</Button>;
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-black rounded-lg shadow-xl w-full max-w-sm border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[60vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center flex-shrink-0">
                    <div className="w-8"></div>
                    <h2 className="text-lg font-semibold">{mode === 'followers' ? t('profile.followersModalTitle') : t('profile.followingModalTitle')}</h2>
                    <button onClick={onClose} className="text-2xl font-light w-8">&times;</button>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {loading ? (
                        <Spinner />
                    ) : listUsers.length > 0 ? (
                        listUsers.map(user => (
                            <div key={user.id} className="w-full flex items-center p-3 gap-3">
                                <img src={user.avatar} alt={user.username} className="w-11 h-11 rounded-full object-cover" />
                                <span className="font-semibold text-sm flex-grow">{user.username}</span>
                                {getButtonForUser(user)}
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 p-8">
                            {mode === 'followers' ? t('profile.noFollowers') : t('profile.notFollowingAnyone')}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FollowersModal;
