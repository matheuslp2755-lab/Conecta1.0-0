import React, { useState, useEffect, useRef } from 'react';
import { auth, db, collection, getDocs, doc, deleteDoc, writeBatch } from '../../firebase';
import { useLanguage } from '../../context/LanguageContext';

type Memory = {
    id: string;
    name: string;
    coverUrl: string;
};

type MemoryItem = {
    id: string;
    contentId: string;
    contentType: 'post' | 'pulse';
    mediaUrl: string;
    timestamp: any;
};

interface MemoryViewerModalProps {
    memory: Memory;
    authorInfo: { id: string; username: string; avatar: string };
    onClose: () => void;
    onDeleteMemory: (memoryId: string) => void;
}

const MemoryViewerModal: React.FC<MemoryViewerModalProps> = ({ memory, authorInfo, onClose, onDeleteMemory }) => {
    const { t } = useLanguage();
    const [items, setItems] = useState<MemoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const currentUser = auth.currentUser;
    const isOwner = currentUser?.uid === authorInfo.id;
    const videoRef = useRef<HTMLVideoElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchItems = async () => {
            if (!currentUser) return;
            setLoading(true);
            const itemsRef = collection(db, 'users', authorInfo.id, 'memories', memory.id, 'items');
            const itemsSnap = await getDocs(itemsRef);
            const itemsData = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MemoryItem));
            itemsData.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
            setItems(itemsData);
            setLoading(false);
        };
        fetchItems();
    }, [memory.id, authorInfo.id, currentUser]);

    const goToNext = () => setCurrentIndex(prev => Math.min(prev + 1, items.length - 1));
    const goToPrev = () => setCurrentIndex(prev => Math.max(prev - 1, 0));

    useEffect(() => {
        if (loading || items.length === 0 || isPaused) return;

        const currentItem = items[currentIndex];
        const isVideo = currentItem.mediaUrl.includes('.mp4') || currentItem.mediaUrl.includes('.webm');

        if (isVideo && videoRef.current) {
             videoRef.current.currentTime = 0;
             videoRef.current.play().catch(console.error);
        }

        const duration = isVideo ? (videoRef.current?.duration || 5) * 1000 : 5000;
        const timer = setTimeout(() => {
            if (currentIndex < items.length - 1) {
                goToNext();
            } else {
                onClose();
            }
        }, duration);

        return () => clearTimeout(timer);
    }, [currentIndex, items, loading, isPaused, onClose]);
    
    const handleDelete = async () => {
        setIsDeleteConfirmOpen(false);
        try {
            const memoryRef = doc(db, 'users', authorInfo.id, 'memories', memory.id);
            const itemsRef = collection(memoryRef, 'items');
            const itemsSnap = await getDocs(itemsRef);
            const batch = writeBatch(db);
            itemsSnap.forEach(doc => batch.delete(doc.ref));
            batch.delete(memoryRef);
            await batch.commit();
            onDeleteMemory(memory.id);
            onClose();
        } catch (error) {
            console.error("Error deleting memory:", error);
        }
    };
    
    if (loading) {
        return <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div></div>;
    }
    
    if (items.length === 0) {
        onClose();
        return null;
    }
    
    const currentItem = items[currentIndex];
    const isVideo = currentItem.mediaUrl.includes('.mp4') || currentItem.mediaUrl.includes('.webm');

    return (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 select-none" onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)} onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)}>
            <div className="absolute top-0 left-0 right-0 p-4 z-20 bg-gradient-to-b from-black/50 to-transparent">
                <div className="flex items-center gap-2 mb-2">
                    {items.map((_, index) => (
                        <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                           <div ref={index === currentIndex ? progressRef : null} className={`h-full bg-white rounded-full ${index === currentIndex && !isPaused ? 'animate-progress' : ''}`} style={{ width: index < currentIndex ? '100%' : '0', animationDuration: isVideo ? `${videoRef.current?.duration || 5}s` : '5s' }} />
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src={authorInfo.avatar} alt={authorInfo.username} className="w-8 h-8 rounded-full object-cover" />
                        <p className="text-white font-semibold text-sm">{authorInfo.username}</p>
                    </div>
                     <div className="flex items-center gap-2">
                        {isOwner && (
                            <div className="relative">
                                <button onClick={(e) => { e.stopPropagation(); setIsOptionsMenuOpen(p => !p); }} className="text-white p-2 rounded-full hover:bg-white/20">
                                    <svg aria-label="More options" className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.5"></circle><circle cx="6" cy="12" r="1.5"></circle><circle cx="18" cy="12" r="1.5"></circle></svg>
                                </button>
                                {isOptionsMenuOpen && (
                                     <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-950 rounded-md shadow-lg border dark:border-zinc-800 z-30 py-1">
                                         <button onClick={() => setIsDeleteConfirmOpen(true)} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-zinc-50 dark:hover:bg-zinc-900">{t('memories.delete')}</button>
                                     </div>
                                )}
                            </div>
                        )}
                        <button onClick={onClose} className="text-white text-3xl">&times;</button>
                    </div>
                </div>
            </div>
            
             <div className="absolute left-0 top-1/2 h-full w-1/3 z-10" onClick={(e) => { e.stopPropagation(); goToPrev(); }} />
             <div className="absolute right-0 top-1/2 h-full w-1/3 z-10" onClick={(e) => { e.stopPropagation(); goToNext(); }} />

            <div className="relative w-full max-w-sm h-full max-h-[95vh] flex items-center justify-center rounded-lg overflow-hidden bg-black">
               {isVideo ? (
                    <video ref={videoRef} key={currentItem.id} src={currentItem.mediaUrl} className="w-full h-full object-contain" />
                ) : (
                    <img key={currentItem.id} src={currentItem.mediaUrl} alt="Memory item" className="w-full h-full object-contain" />
                )}
            </div>
        </div>
        {isDeleteConfirmOpen && (
             <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60]">
                <div className="bg-white dark:bg-black rounded-lg shadow-xl p-6 w-full max-w-sm text-center border dark:border-zinc-800">
                    <h3 className="text-lg font-semibold mb-2">{t('memories.delete')}</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{t('memories.deleteConfirm')}</p>
                    <div className="flex justify-center gap-4">
                        <button onClick={() => setIsDeleteConfirmOpen(false)} className="px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 font-semibold">{t('common.cancel')}</button>
                        <button onClick={handleDelete} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold">{t('common.delete')}</button>
                    </div>
                </div>
            </div>
        )}
         <style>{`
            @keyframes progress {
                from { width: 0%; }
                to { width: 100%; }
            }
            .animate-progress {
                animation: progress linear forwards;
            }
        `}</style>
      </>
    );
};

export default MemoryViewerModal;
