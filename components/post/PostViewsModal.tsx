import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, doc, getDoc } from '../../firebase';
import { useLanguage } from '../../context/LanguageContext';
import OnlineIndicator from '../common/OnlineIndicator';

interface PostViewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

type UserSearchResult = {
    id: string;
    username: string;
    avatar: string;
    lastSeen?: { seconds: number; nanoseconds: number };
    isAnonymous?: boolean;
};

const Spinner: React.FC = () => (
    <div className="flex justify-center items-center p-4">
        <svg className="animate-spin h-5 w-5 text-zinc-500 dark:text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);


const PostViewsModal: React.FC<PostViewsModalProps> = ({ isOpen, onClose, postId }) => {
    const { t } = useLanguage();
    const [viewers, setViewers] = useState<UserSearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const fetchViewers = async () => {
            setLoading(true);
            try {
                const viewsRef = collection(db, 'posts', postId, 'views');
                const viewsSnap = await getDocs(viewsRef);
                const viewerIds = viewsSnap.docs.map(doc => doc.id);

                if (viewerIds.length > 0) {
                    const viewerPromises = viewerIds.map(id => getDoc(doc(db, 'users', id)));
                    const viewerDocs = await Promise.all(viewerPromises);
                    
                    const viewersData = viewerDocs
                        .filter(doc => doc.exists())
                        .map(doc => ({
                            id: doc.id,
                            username: doc.data()?.username,
                            avatar: doc.data()?.avatar,
                            lastSeen: doc.data()?.lastSeen,
                            isAnonymous: doc.data()?.isAnonymous || false,
                        } as UserSearchResult));

                    setViewers(viewersData);
                } else {
                    setViewers([]);
                }
            } catch (error) {
                console.error("Error fetching post viewers:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchViewers();

    }, [isOpen, postId]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-black rounded-lg shadow-xl w-full max-w-sm border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[60vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center flex-shrink-0">
                    <div className="w-8"></div>
                    <h2 className="text-lg font-semibold">{t('post.viewedBy')}</h2>
                    <button onClick={onClose} className="text-2xl font-light w-8">&times;</button>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {loading ? (
                        <Spinner />
                    ) : viewers.length > 0 ? (
                        viewers.map(user => {
                             const isOnline = !user.isAnonymous && user.lastSeen && (new Date().getTime() / 1000 - user.lastSeen.seconds) < 600;
                             return (
                                <div key={user.id} className="w-full text-left flex items-center p-3 gap-3">
                                    <div className="relative flex-shrink-0">
                                        <img src={user.avatar} alt={user.username} className="w-11 h-11 rounded-full object-cover" />
                                        {isOnline && <OnlineIndicator />}
                                    </div>
                                    <div className="flex-grow overflow-hidden">
                                        <p className="font-semibold">{user.username}</p>
                                    </div>
                                </div>
                             )
                        })
                    ) : (
                        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 p-4">{t('post.noViews')}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PostViewsModal;