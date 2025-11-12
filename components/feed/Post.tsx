import React, { useState, useEffect, useRef } from 'react';
import { auth, db, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, storage, storageRef, deleteObject, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, getDocs, limit, writeBatch, getDoc, setDoc } from '../../firebase';
import { useLanguage } from '../../context/LanguageContext';
import { useTimeAgo } from '../../hooks/useTimeAgo';
import PostViewsModal from '../post/PostViewsModal';
import MusicPlayer from './MusicPlayer';
import Button from '../common/Button';
import AddCaptionModal from '../post/AddCaptionModal';
import AddMusicModal from '../post/AddMusicModal';


type PostType = {
    id: string;
    userId: string;
    username: string;
    userAvatar: string;
    imageUrl: string;
    caption: string;
    likes: string[];
    timestamp: { seconds: number; nanoseconds: number };
    musicInfo?: {
      nome: string;
      artista: string;
      capa: string;
      preview: string;
    };
    isVentMode?: boolean;
    allowedUsers?: string[];
    duoPartner?: { userId: string; username: string; userAvatar: string; };
    pendingDuoPartner?: { userId: string; username: string; userAvatar: string; };
};

type CommentType = {
    id: string;
    userId: string;
    username: string;
    text: string;
    timestamp: { seconds: number; nanoseconds: number };
}

type UserSearchResult = {
    id: string;
    username: string;
    avatar: string;
};

type Follower = {
    id: string;
    username: string;
    avatar: string;
};

interface ForwardPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostType;
}

const ForwardPostModal: React.FC<ForwardPostModalProps> = ({ isOpen, onClose, post }) => {
    const { t } = useLanguage();
    const currentUser = auth.currentUser;
    const [following, setFollowing] = useState<Follower[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setSelectedUsers([]);
            setSearchTerm('');
            setIsSending(false);
            return;
        }

        const fetchFollowing = async () => {
            if (!currentUser) return;
            setLoading(true);
            try {
                const followingRef = collection(db, 'users', currentUser.uid, 'following');
                const snapshot = await getDocs(followingRef);
                const followingData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Follower));
                setFollowing(followingData);
            } catch (error) {
                console.error("Error fetching following list:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFollowing();
    }, [isOpen, currentUser]);

    const handleSend = async () => {
        if (selectedUsers.length === 0 || !currentUser) return;
        setIsSending(true);
    
        const sendPromises = selectedUsers.map(async (recipientId) => {
            const recipient = following.find(f => f.id === recipientId);
            if (!recipient) return;
    
            const conversationId = [currentUser.uid, recipient.id].sort().join('_');
            const conversationRef = doc(db, 'conversations', conversationId);
    
            try {
                const conversationSnap = await getDoc(conversationRef);
                if (!conversationSnap.exists()) {
                    const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    const currentUserData = currentUserDoc.data();
                    await setDoc(conversationRef, {
                        participants: [currentUser.uid, recipient.id],
                        participantInfo: {
                            [currentUser.uid]: {
                                username: currentUserData?.username,
                                avatar: currentUserData?.avatar,
                            },
                            [recipient.id]: {
                                username: recipient.username,
                                avatar: recipient.avatar,
                            }
                        },
                        timestamp: serverTimestamp(),
                    });
                }
    
                const messagesRef = collection(conversationRef, 'messages');
                await addDoc(messagesRef, {
                    senderId: currentUser.uid,
                    text: '',
                    timestamp: serverTimestamp(),
                    mediaType: 'forwarded_post',
                    forwardedPostData: {
                        postId: post.id,
                        imageUrl: post.imageUrl,
                        originalPosterUsername: post.username,
                        originalPosterAvatar: post.userAvatar,
                        caption: post.caption,
                    }
                });
    
                await updateDoc(conversationRef, {
                    lastMessage: {
                        senderId: currentUser.uid,
                        text: t('messages.forwardedPost'),
                        timestamp: serverTimestamp(),
                        mediaType: 'forwarded_post',
                    },
                    timestamp: serverTimestamp(),
                });
            } catch (error) {
                console.error(`Failed to send post to ${recipient.username}:`, error);
            }
        });
    
        await Promise.all(sendPromises);
        setIsSending(false);
        onClose();
    };

    const filteredFollowing = following.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
            <div
                className="bg-white dark:bg-black rounded-lg shadow-xl w-full max-w-sm border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[70vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center flex-shrink-0">
                    <div className="w-8"></div>
                    <h2 className="text-lg font-semibold">{t('forwardModal.title')}</h2>
                    <button onClick={onClose} className="text-2xl font-light w-8">&times;</button>
                </div>
                <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                    <input
                        type="text"
                        placeholder={t('forwardModal.search')}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md py-1.5 px-4 text-sm"
                    />
                </div>
                <div className="flex-grow overflow-y-auto">
                    {loading ? (
                        <p className="text-center p-4">{t('messages.loading')}</p>
                    ) : filteredFollowing.length > 0 ? (
                        filteredFollowing.map(user => (
                            <label key={user.id} className="flex items-center p-3 gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer">
                                <img src={user.avatar} alt={user.username} className="w-11 h-11 rounded-full object-cover" />
                                <span className="font-semibold text-sm flex-grow">{user.username}</span>
                                <input
                                    type="checkbox"
                                    checked={selectedUsers.includes(user.id)}
                                    onChange={() => {
                                        setSelectedUsers(prev =>
                                            prev.includes(user.id)
                                                ? prev.filter(id => id !== user.id)
                                                : [...prev, user.id]
                                        );
                                    }}
                                    className="w-5 h-5 text-sky-600 bg-zinc-100 border-zinc-300 rounded focus:ring-sky-500"
                                />
                            </label>
                        ))
                    ) : (
                        <p className="text-center p-4 text-sm text-zinc-500">
                            {following.length === 0 ? t('forwardModal.noFollowing') : t('forwardModal.noResults')}
                        </p>
                    )}
                </div>
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                    <Button onClick={handleSend} disabled={isSending || selectedUsers.length === 0}>
                        {isSending ? t('forwardModal.sending') : t('forwardModal.send')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

interface DuoPhotoModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: PostType;
}
  
const DuoPhotoModal: React.FC<DuoPhotoModalProps> = ({ isOpen, onClose, post }) => {
    const { t } = useLanguage();
    const currentUser = auth.currentUser;
    const [following, setFollowing] = useState<Follower[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<Follower | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setSelectedUser(null);
            setSearchTerm('');
            setIsSending(false);
            setError('');
            return;
        }

        const fetchFollowing = async () => {
            if (!currentUser) return;
            setLoading(true);
            try {
                const followingRef = collection(db, 'users', currentUser.uid, 'following');
                const snapshot = await getDocs(followingRef);
                const followingData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Follower));
                setFollowing(followingData);
            } catch (error) {
                console.error("Error fetching following list:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFollowing();
    }, [isOpen, currentUser]);

    const handleSendRequest = async () => {
        if (!selectedUser || !currentUser) return;
        if (post.duoPartner) {
            setError(t('duoModal.alreadyPartnered'));
            return;
        }
        if (post.pendingDuoPartner) {
            setError(t('duoModal.requestPending'));
            return;
        }
        
        setIsSending(true);
        setError('');

        try {
            const postRef = doc(db, 'posts', post.id);
            await updateDoc(postRef, {
                pendingDuoPartner: {
                    userId: selectedUser.id,
                    username: selectedUser.username,
                    userAvatar: selectedUser.avatar
                }
            });

            const notificationRef = doc(collection(db, 'users', selectedUser.id, 'notifications'));
            await setDoc(notificationRef, {
                type: 'duo_request',
                fromUserId: currentUser.uid,
                fromUsername: currentUser.displayName,
                fromUserAvatar: currentUser.photoURL,
                postId: post.id,
                timestamp: serverTimestamp(),
                read: false,
            });

            onClose();
        } catch (error) {
            console.error("Error sending duo request:", error);
            setError(t('duoModal.requestError'));
        } finally {
            setIsSending(false);
        }
    };

    const filteredFollowing = following.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
            <div
                className="bg-white dark:bg-black rounded-lg shadow-xl w-full max-w-sm border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[70vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center flex-shrink-0">
                    <div className="w-8"></div>
                    <h2 className="text-lg font-semibold">{t('duoModal.title')}</h2>
                    <button onClick={onClose} className="text-2xl font-light w-8">&times;</button>
                </div>
                <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    <p>{t('duoModal.description')}</p>
                </div>
                <div className="p-2 border-y border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                    <input
                        type="text"
                        placeholder={t('forwardModal.search')}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md py-1.5 px-4 text-sm"
                    />
                </div>
                <div className="flex-grow overflow-y-auto">
                    {loading ? (
                        <p className="text-center p-4">{t('messages.loading')}</p>
                    ) : filteredFollowing.length > 0 ? (
                        filteredFollowing.map(user => (
                            <label key={user.id} className="flex items-center p-3 gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer">
                                <img src={user.avatar} alt={user.username} className="w-11 h-11 rounded-full object-cover" />
                                <span className="font-semibold text-sm flex-grow">{user.username}</span>
                                <input
                                    type="radio"
                                    name="duo-partner"
                                    checked={selectedUser?.id === user.id}
                                    onChange={() => setSelectedUser(user)}
                                    className="w-5 h-5 text-sky-600 bg-zinc-100 border-zinc-300 focus:ring-sky-500"
                                />
                            </label>
                        ))
                    ) : (
                        <p className="text-center p-4 text-sm text-zinc-500">
                            {following.length === 0 ? t('duoModal.noFollowing') : t('forwardModal.noResults')}
                        </p>
                    )}
                </div>
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                    {error && <p className="text-red-500 text-xs text-center mb-2">{error}</p>}
                    <Button onClick={handleSendRequest} disabled={isSending || !selectedUser}>
                        {isSending ? t('duoModal.sending') : t('duoModal.sendRequest')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const LikeIcon: React.FC<{className?: string, isLiked: boolean, title: string}> = ({ className, isLiked, title }) => (
  <svg aria-label={title} className={className} fill={isLiked ? '#ef4444' : 'currentColor'} height="24" role="img" viewBox="0 0 24 24" width="24"><title>{title}</title><path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-6.12 8.351C12.89 20.72 12.434 21 12 21s-.89-.28-1.38-.627C7.152 14.08 4.5 12.192 4.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.118-1.763a4.21 4.21 0 0 1 3.675-1.941Z"></path></svg>
);

const CommentIcon: React.FC<{className?: string, title: string}> = ({ className, title }) => (
    <svg aria-label={title} className={className} fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24"><title>{title}</title><path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2"></path></svg>
);

const ShareIcon: React.FC<{className?: string, title: string}> = ({ className, title }) => (
  <svg aria-label={title} className={className} fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24"><title>{title}</title><line fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" x1="22" x2="9.218" y1="3" y2="10.083"></line><polygon fill="none" points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334" stroke="currentColor" strokeLinejoin="round" strokeWidth="2"></polygon></svg>
);

const MoreIcon: React.FC<{className?: string, title: string}> = ({ className, title }) => (
    <svg aria-label={title} className={className} fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24"><title>{title}</title><circle cx="12" cy="12" r="1.5"></circle><circle cx="6" cy="12" r="1.5"></circle><circle cx="18" cy="12" r="1.5"></circle></svg>
);

interface PostProps {
  post: PostType;
  onPostDeleted: (postId: string) => void;
  playingMusicPostId: string | null;
  setPlayingMusicPostId: (postId: string | null) => void;
  isMusicMuted: boolean;
  setIsMusicMuted: (isMuted: boolean) => void;
}

const Post: React.FC<PostProps> = ({ post, onPostDeleted, playingMusicPostId, setPlayingMusicPostId, isMusicMuted, setIsMusicMuted }) => {
  const currentUser = auth.currentUser;
  const { t } = useLanguage();
  const { formatTimestamp } = useTimeAgo();
  const [postData, setPostData] = useState<PostType>(post);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes.length);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isCommentDeleteConfirmOpen, setIsCommentDeleteConfirmOpen] = useState(false);
  const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);
  const [isViewsModalOpen, setIsViewsModalOpen] = useState(false);
  const [viewsCount, setViewsCount] = useState(0);
  const postRef = useRef<HTMLElement>(null);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [isDuoPhotoModalOpen, setIsDuoPhotoModalOpen] = useState(false);
  const [isAddCaptionModalOpen, setIsAddCaptionModalOpen] = useState(false);
  const [isAddMusicModalOpen, setIsAddMusicModalOpen] = useState(false);

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<UserSearchResult[]>([]);
  const [isMentionLoading, setIsMentionLoading] = useState(false);
  const mentionStartPosition = useRef<number | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPostData(post);
    setLikesCount(post.likes.length);
  }, [post]);

  useEffect(() => {
    if (currentUser) {
        setIsLiked(postData.likes.includes(currentUser.uid));
    }
  }, [postData.likes, currentUser]);

  useEffect(() => {
    const commentsRef = collection(db, 'posts', postData.id, 'comments');
    const q = query(commentsRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommentType)));
    });

    return () => unsubscribe();
  }, [postData.id]);
  
  useEffect(() => {
    if (!postRef.current || !currentUser || currentUser.uid === postData.userId) {
        return;
    }

    const observer = new IntersectionObserver(
        async ([entry]) => {
            if (entry.isIntersecting) {
                const viewRef = doc(db, 'posts', postData.id, 'views', currentUser.uid);
                await setDoc(viewRef, {
                    userId: currentUser.uid,
                    viewedAt: serverTimestamp()
                });
                observer.unobserve(entry.target);
            }
        },
        {
            threshold: 0.5 
        }
    );

    const currentPostRef = postRef.current;
    observer.observe(currentPostRef);

    return () => {
        if(currentPostRef) {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            observer.unobserve(currentPostRef);
        }
    };
  }, [postData.id, postData.userId, currentUser]);

  useEffect(() => {
    if (!postData.musicInfo) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPlayingMusicPostId(postData.id);
        } else {
          if (playingMusicPostId === postData.id) {
            setPlayingMusicPostId(null);
          }
        }
      },
      {
        threshold: 0.75,
      }
    );
    
    const currentPostRef = postRef.current;
    if (currentPostRef) {
      observer.observe(currentPostRef);
    }

    return () => {
      if (currentPostRef) {
        observer.unobserve(currentPostRef);
      }
    };
  }, [postData.id, postData.musicInfo, setPlayingMusicPostId, playingMusicPostId]);

  useEffect(() => {
    const viewsRef = collection(db, 'posts', postData.id, 'views');
    const unsubscribe = onSnapshot(viewsRef, (snapshot) => {
        setViewsCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [postData.id]);

  const handleLikeToggle = async () => {
    if (!currentUser) return;
    
    const postDocRef = doc(db, 'posts', postData.id);
    const originalIsLiked = isLiked;
    const originalLikes = [...postData.likes];

    // Optimistic update
    const newLikes = originalIsLiked
        ? postData.likes.filter(uid => uid !== currentUser.uid)
        : [...postData.likes, currentUser.uid];
    
    setIsLiked(!originalIsLiked);
    setLikesCount(newLikes.length);
    setPostData(prev => ({ ...prev, likes: newLikes }));

    try {
        if (originalIsLiked) {
            await updateDoc(postDocRef, { likes: arrayRemove(currentUser.uid) });
        } else {
            await updateDoc(postDocRef, { likes: arrayUnion(currentUser.uid) });
        }
    } catch (error) {
        console.error("Error toggling like:", error);
        // Revert on error
        setIsLiked(originalIsLiked);
        setLikesCount(originalLikes.length);
        setPostData(prev => ({ ...prev, likes: originalLikes }));
    }
  };

  const handleDelete = async () => {
    if (currentUser?.uid !== postData.userId) return;

    setIsDeleting(true);
    try {
        const imagePath = decodeURIComponent(postData.imageUrl.split('/o/')[1].split('?')[0]);
        const imageRef = storageRef(storage, imagePath);
        const postDocRef = doc(db, 'posts', postData.id);

        await deleteDoc(postDocRef);
        await deleteObject(imageRef);
        
        onPostDeleted(postData.id);

    } catch (error) {
        console.error("Error deleting post:", error);
    } finally {
        setIsDeleting(false);
        setIsDeleteConfirmOpen(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser || newComment.trim() === '') return;

    const commentText = newComment.trim();
    const mentionRegex = /@(\w+)/g;
    const mentions = commentText.match(mentionRegex)?.map(m => m.substring(1)) || [];
    const uniqueMentions = [...new Set(mentions)];

    try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
            throw new Error("Current user not found in database.");
        }
        const currentUsername = userDoc.data().username;

        const batch = writeBatch(db);
        const commentsRef = collection(db, 'posts', postData.id, 'comments');
        const newCommentRef = doc(commentsRef);
        
        batch.set(newCommentRef, {
            text: commentText,
            userId: currentUser.uid,
            username: currentUsername,
            timestamp: serverTimestamp()
        });

        if (uniqueMentions.length > 0) {
            const usersRef = collection(db, 'users');
            for (const username of uniqueMentions) {
                const q = query(usersRef, where('username', '==', username), limit(1));
                const userSnapshot = await getDocs(q);

                if (!userSnapshot.empty) {
                    const mentionedUserDoc = userSnapshot.docs[0];
                    const mentionedUserId = mentionedUserDoc.id;

                    if (mentionedUserId !== currentUser.uid) {
                        const notificationRef = doc(collection(db, 'users', mentionedUserId, 'notifications'));
                        batch.set(notificationRef, {
                            type: 'mention_comment',
                            fromUserId: currentUser.uid,
                            fromUsername: currentUsername,
                            fromUserAvatar: currentUser.photoURL,
                            postId: postData.id,
                            commentText: commentText.length > 100 ? `${commentText.substring(0, 97)}...` : commentText,
                            timestamp: serverTimestamp(),
                            read: false,
                        });
                    }
                }
            }
        }

        await batch.commit();
        setNewComment('');
        setMentionQuery(null);
    } catch (error) {
        console.error("Error adding comment or sending notifications: ", error);
    }
  };
  
  const confirmDeleteComment = async () => {
    if (!commentToDeleteId) return;

    setIsDeletingComment(true);
    try {
        const commentRef = doc(db, 'posts', postData.id, 'comments', commentToDeleteId);
        await deleteDoc(commentRef);
        setIsCommentDeleteConfirmOpen(false);
        setCommentToDeleteId(null);
    } catch (error) {
        console.error("Error deleting comment:", error);
    } finally {
        setIsDeletingComment(false);
    }
  };

    useEffect(() => {
        if (mentionQuery === null) {
            setMentionResults([]);
            return;
        }

        if (mentionQuery.trim() === '') {
            setMentionResults([]);
            return;
        }

        const debouncedSearch = setTimeout(async () => {
            setIsMentionLoading(true);
            const usersRef = collection(db, 'users');
            const q = query(
                usersRef,
                where('username_lowercase', '>=', mentionQuery.toLowerCase()),
                where('username_lowercase', '<=', mentionQuery.toLowerCase() + '\uf8ff'),
                limit(5)
            );
            
            try {
                const querySnapshot = await getDocs(q);
                const users = querySnapshot.docs
                    .map(doc => ({ id: doc.id, username: doc.data().username, avatar: doc.data().avatar } as UserSearchResult))
                    .filter(user => user.id !== auth.currentUser?.uid);
                
                setMentionResults(users);
            } catch (error) {
                console.error("Error searching for mentionable users:", error);
            } finally {
                setIsMentionLoading(false);
            }
        }, 300);

        return () => clearTimeout(debouncedSearch);
    }, [mentionQuery]);

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    setNewComment(value);

    if (cursorPosition === null) {
        setMentionQuery(null);
        return;
    }
    
    const textBeforeCursor = value.substring(0, cursorPosition);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
        setMentionQuery(atMatch[1]);
        mentionStartPosition.current = textBeforeCursor.lastIndexOf('@');
    } else {
        setMentionQuery(null);
    }
  };

  const handleMentionSelect = (username: string) => {
    if (mentionStartPosition.current === null) return;
    
    const textBefore = newComment.substring(0, mentionStartPosition.current);
    const queryLength = mentionQuery !== null ? mentionQuery.length : 0;
    const textAfter = newComment.substring(mentionStartPosition.current + 1 + queryLength);

    setNewComment(`${textBefore}@${username} ${textAfter}`);
    setMentionQuery(null);
    commentInputRef.current?.focus();
  };

  const renderTextWithMentions = (text: string) => {
    if (!text) return text;
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => {
        if (part.startsWith('@')) {
            return <strong key={index} className="text-sky-500 font-semibold">{part}</strong>;
        }
        return part;
    });
  };

  return (
    <>
        <article ref={postRef} className="bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 rounded-lg">
        <div className="flex items-center p-3">
            {postData.duoPartner ? (
                <>
                    <div className="flex -space-x-4">
                        <img src={postData.userAvatar} alt={postData.username} className="w-8 h-8 rounded-full object-cover border-2 border-white dark:border-black" />
                        <img src={postData.duoPartner.userAvatar} alt={postData.duoPartner.username} className="w-8 h-8 rounded-full object-cover border-2 border-white dark:border-black" />
                    </div>
                    <span className="font-semibold text-sm ml-3">{postData.username} {t('post.and')} {postData.duoPartner.username}</span>
                </>
            ) : (
                <>
                    <img src={postData.userAvatar} alt={postData.username} className="w-8 h-8 rounded-full object-cover" />
                    <span className="font-semibold text-sm ml-3">{postData.username}</span>
                </>
            )}
            {currentUser?.uid === postData.userId && (
                 <div className="ml-auto relative">
                    <button onClick={() => setIsOptionsOpen(prev => !prev)}>
                        <MoreIcon className="w-6 h-6" title={t('post.moreOptions')} />
                    </button>
                    {isOptionsOpen && (
                         <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-950 rounded-md shadow-lg border dark:border-zinc-800 z-10 py-1">
                            {!postData.caption?.trim() && (
                                <button
                                    onClick={() => {
                                        setIsAddCaptionModalOpen(true);
                                        setIsOptionsOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                >
                                    {t('post.addCaption')}
                                </button>
                            )}
                            {!postData.musicInfo && (
                                <button
                                    onClick={() => {
                                        setIsAddMusicModalOpen(true);
                                        setIsOptionsOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                >
                                    {t('post.addMusic')}
                                </button>
                            )}
                            {!postData.duoPartner && !postData.pendingDuoPartner && (
                                <button
                                    onClick={() => {
                                        setIsDuoPhotoModalOpen(true);
                                        setIsOptionsOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                >
                                    {t('post.duoPhoto')}
                                </button>
                            )}
                            <button 
                                onClick={() => {
                                    setIsDeleteConfirmOpen(true);
                                    setIsOptionsOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                            >
                                {t('post.delete')}
                            </button>
                        </div>
                    )}
                 </div>
            )}
        </div>
        
        <div>
            <img src={postData.imageUrl} alt="Post content" className="w-full object-cover" />
        </div>
        
        {postData.musicInfo && (
            <div className="bg-zinc-50 dark:bg-zinc-950 border-y border-zinc-200 dark:border-zinc-800">
                <MusicPlayer musicInfo={postData.musicInfo} isPlaying={playingMusicPostId === postData.id} isMuted={isMusicMuted} setIsMuted={setIsMusicMuted} />
            </div>
        )}

        <div className="p-4">
            <div className="flex items-center gap-4 mb-2">
                <button onClick={handleLikeToggle}>
                    <LikeIcon title={t('post.like')} className={`w-6 h-6 hover:opacity-70 transition-opacity ${isLiked ? 'text-red-500' : 'dark:text-white'}`} isLiked={isLiked} />
                </button>
                <button>
                    <CommentIcon title={t('post.comment')} className="w-6 h-6 hover:text-zinc-500 dark:hover:text-zinc-400" />
                </button>
                <button onClick={() => setIsForwardModalOpen(true)}>
                    <ShareIcon title={t('post.forward')} className="w-6 h-6 hover:text-zinc-500 dark:hover:text-zinc-400" />
                </button>
            </div>
            <div className="text-sm space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                    <span>{likesCount.toLocaleString()} {t('post.likes')}</span>
                    {(viewsCount > 0) && (
                        <>
                            <span className="text-zinc-400 dark:text-zinc-600">•</span>
                            {currentUser?.uid === postData.userId ? (
                                <button onClick={() => setIsViewsModalOpen(true)} className="hover:underline">
                                    {viewsCount.toLocaleString()} {viewsCount === 1 ? t('post.viewSingular') : t('post.viewPlural')}
                                </button>
                            ) : (
                                <span>{viewsCount.toLocaleString()} {viewsCount === 1 ? t('post.viewSingular') : t('post.viewPlural')}</span>
                            )}
                        </>
                    )}
                </div>
                {postData.caption && (
                    <p>
                        <span className="font-semibold mr-2">{postData.username}</span>
                        {renderTextWithMentions(postData.caption)}
                    </p>
                )}
                 {comments.slice(0, 2).reverse().map(comment => (
                    <div key={comment.id} className="flex items-center justify-between group">
                         <p className="flex-grow pr-2">
                             <span className="font-semibold mr-2">{comment.username}</span>
                             {renderTextWithMentions(comment.text)}
                         </p>
                         {(currentUser?.uid === comment.userId || currentUser?.uid === postData.userId) && (
                              <button 
                                 onClick={() => {
                                     setCommentToDeleteId(comment.id);
                                     setIsCommentDeleteConfirmOpen(true);
                                 }}
                                 className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                 aria-label={t('post.delete')}
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                             </button>
                         )}
                     </div>
                ))}
            </div>
            {comments.length > 2 && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                    {t('post.viewAllComments', { count: comments.length })}
                </p>
            )}
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase mt-2">{formatTimestamp(postData.timestamp)}</p>
        </div>

        <div className="relative border-t border-zinc-200 dark:border-zinc-800 px-4 py-2">
            {mentionQuery !== null && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-zinc-950 rounded-md shadow-lg border border-zinc-200 dark:border-zinc-800 z-20 max-h-60 overflow-y-auto">
                {isMentionLoading && <div className="p-2 text-center text-sm text-zinc-500">{t('post.mentionSearching')}</div>}
                {!isMentionLoading && mentionResults.length > 0 && (
                  mentionResults.map(user => (
                    <div key={user.id} onClick={() => handleMentionSelect(user.username)} className="flex items-center p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer">
                      <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full object-cover mr-3" />
                      <span className="font-semibold text-sm">{user.username}</span>
                    </div>
                  ))
                )}
                {!isMentionLoading && mentionResults.length === 0 && mentionQuery.trim() !== '' && (
                  <div className="p-2 text-center text-sm text-zinc-500">{t('post.mentionNoUsers')}</div>
                )}
              </div>
            )}
            <form onSubmit={handleCommentSubmit} className="flex items-center">
                <input 
                  ref={commentInputRef}
                  type="text" 
                  placeholder={t('post.addComment')}
                  value={newComment}
                  onChange={handleCommentChange}
                  autoComplete="off"
                  className="w-full bg-transparent border-none focus:outline-none text-sm placeholder:text-zinc-500 dark:placeholder:text-zinc-400" />
                <button 
                  type="submit" 
                  className="text-sky-500 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed" 
                  disabled={!newComment.trim()}
                >
                    {t('post.postButton')}
                </button>
            </form>
        </div>
        </article>
        
        <ForwardPostModal
            isOpen={isForwardModalOpen}
            onClose={() => setIsForwardModalOpen(false)}
            post={postData}
        />
        
        <DuoPhotoModal
            isOpen={isDuoPhotoModalOpen}
            onClose={() => setIsDuoPhotoModalOpen(false)}
            post={postData}
        />

        <PostViewsModal
            isOpen={isViewsModalOpen}
            onClose={() => setIsViewsModalOpen(false)}
            postId={postData.id}
        />
        
        <AddCaptionModal
            isOpen={isAddCaptionModalOpen}
            onClose={() => setIsAddCaptionModalOpen(false)}
            postId={postData.id}
            onCaptionSaved={(newCaption) => {
                setPostData(prev => ({ ...prev, caption: newCaption }));
                setIsAddCaptionModalOpen(false);
            }}
        />
        <AddMusicModal
            isOpen={isAddMusicModalOpen}
            onClose={() => setIsAddMusicModalOpen(false)}
            postId={postData.id}
            onMusicAdded={(newMusicInfo) => {
                setPostData(prev => ({ ...prev, musicInfo: newMusicInfo }));
                setIsAddMusicModalOpen(false);
            }}
        />

        {isCommentDeleteConfirmOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white dark:bg-black rounded-lg shadow-xl p-6 w-full max-w-sm text-center border dark:border-zinc-800">
                    <h3 className="text-lg font-semibold mb-2">{t('post.deleteCommentTitle')}</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                        {t('post.deleteCommentBody')}
                    </p>
                    <div className="flex flex-col gap-2">
                         <button 
                            onClick={confirmDeleteComment}
                            disabled={isDeletingComment}
                            className="w-full px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold disabled:opacity-50"
                        >
                            {isDeletingComment ? t('post.deleting') : t('post.delete')}
                        </button>
                        <button 
                            onClick={() => setIsCommentDeleteConfirmOpen(false)}
                            className="w-full px-4 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold"
                        >
                            {t('common.cancel')}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {isDeleteConfirmOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white dark:bg-black rounded-lg shadow-xl p-6 w-full max-w-sm text-center border dark:border-zinc-800">
                    <h3 className="text-lg font-semibold mb-2">{t('post.deletePostTitle')}</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                        {t('post.deletePostBody')}
                    </p>
                    <div className="flex flex-col gap-2">
                         <button 
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="w-full px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold disabled:opacity-50"
                        >
                            {isDeleting ? t('post.deleting') : t('post.delete')}
                        </button>
                        <button 
                            onClick={() => setIsDeleteConfirmOpen(false)}
                            className="w-full px-4 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold"
                        >
                            {t('common.cancel')}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

export default Post;
