import React, { useState, useEffect } from 'react';
import { auth, db, doc, setDoc, serverTimestamp, collection, onSnapshot } from '../../firebase';
import { useLanguage } from '../../context/LanguageContext';
import PulseViewsModal from './PulseViewsModal';
import MusicPlayer from '../feed/MusicPlayer';

type Pulse = {
    id: string;
    mediaUrl: string;
    legenda: string;
    createdAt: { seconds: number; nanoseconds: number };
    authorId: string;
    musicInfo?: {
      nome: string;
      artista: string;
      capa: string;
      preview: string;
      startTime?: number;
    };
};

interface PulseViewerModalProps {
    pulses: Pulse[];
    initialPulseIndex: number;
    authorInfo: { id: string, username: string; avatar: string };
    onClose: () => void;
    onDelete: (pulse: Pulse) => void;
}

const TrashIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const EyeIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const PrevIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
);

const NextIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
);

const PulseViewerModal: React.FC<PulseViewerModalProps> = ({ pulses, initialPulseIndex, authorInfo, onClose, onDelete }) => {
    const { t } = useLanguage();
    // FIX: Cria uma cópia local dos pulses para prevenir problemas com referências circulares no objeto da prop.
    const [localPulses, setLocalPulses] = useState([...pulses]);
    const [currentIndex, setCurrentIndex] = useState(initialPulseIndex);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [viewsCount, setViewsCount] = useState(0);
    const [isViewsModalOpen, setIsViewsModalOpen] = useState(false);
    // FIX: Cannot find name 'setIsMuted'. Declare isMusicMuted and setIsMuted state variables.
    const [isMusicMuted, setIsMuted] = useState(false);
    
    useEffect(() => {
        setLocalPulses([...pulses]);
        // Se o pulse atual for deletado externamente, talvez precisemos ajustar o índice.
        if (currentIndex >= pulses.length) {
            setCurrentIndex(Math.max(0, pulses.length - 1));
        }
    }, [pulses, currentIndex]);


    const currentUser = auth.currentUser;
    const currentPulse = localPulses[currentIndex];

    useEffect(() => {
        const recordPulseView = async () => {
            // Do not record if there's no pulse, no logged-in user, or if the viewer is the author.
            if (!currentPulse || !currentUser || currentUser.uid === currentPulse.authorId) {
                return;
            }

            try {
                const viewDocRef = doc(db, 'pulses', currentPulse.id, 'views', currentUser.uid);
                await setDoc(viewDocRef, {
                    userId: currentUser.uid,
                    viewedAt: serverTimestamp()
                });
            } catch (error) {
                console.error("Error recording pulse view:", error);
                // Fail silently as this is a background task and should not affect user experience.
            }
        };

        recordPulseView();
    }, [currentPulse, currentUser]);

    useEffect(() => {
        if (!currentPulse) return;

        const viewsRef = collection(db, 'pulses', currentPulse.id, 'views');
        const unsubscribe = onSnapshot(viewsRef, (snapshot) => {
            setViewsCount(snapshot.size);
        });

        return () => unsubscribe();
    }, [currentPulse]);

    if (!currentPulse) {
        onClose();
        return null;
    }
    const isOwner = currentUser?.uid === currentPulse.authorId;
    
    const handleDelete = async () => {
        setIsDeleting(true);
        // Chama o handler onDelete original, que vai atualizar o estado do pai
        await onDelete(currentPulse);
        setIsDeleting(false);
        setIsDeleteConfirmOpen(false);
        // O componente pai vai renderizar este modal novamente com a lista de pulses atualizada.
        // O useEffect vai cuidar da atualização do estado.
    };

    const canGoNext = currentIndex < localPulses.length - 1;
    const canGoPrev = currentIndex > 0;
    
    return (
        <>
            <PulseViewsModal
                isOpen={isViewsModalOpen}
                onClose={() => setIsViewsModalOpen(false)}
                pulseId={currentPulse.id}
            />
            <div 
                className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 select-none"
                onClick={onClose}
            >
                {canGoPrev && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setCurrentIndex(i => i - 1); }} 
                        className="absolute left-2 md:left-4 text-white bg-black/40 rounded-full p-2 z-20 hover:bg-black/70 transition-colors"
                        aria-label={t('pulseViewer.previous')}
                    >
                        <PrevIcon className="w-6 h-6" />
                    </button>
                )}

                <div 
                    className="relative w-full max-w-sm h-full max-h-[95vh] flex flex-col items-center justify-center" 
                    onClick={e => e.stopPropagation()}
                >
                    <div className="absolute top-0 left-0 right-0 p-4 z-20 bg-gradient-to-b from-black/50 to-transparent">
                        <div className="flex items-center gap-2 mb-2">
                           {localPulses.map((_, index) => (
                                <div key={index} className="flex-1 h-1 bg-white/30 rounded-full">
                                    {index <= currentIndex && <div className="h-full bg-white rounded-full"/>}
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
                                    <>
                                        {viewsCount > 0 && (
                                            <button 
                                                onClick={() => setIsViewsModalOpen(true)}
                                                className="text-white p-2 rounded-full hover:bg-white/20 flex items-center gap-1 text-sm"
                                                aria-label={`${viewsCount} ${viewsCount === 1 ? t('pulseViewer.viewSingular') : t('pulseViewer.viewPlural')}`}
                                            >
                                                <EyeIcon className="w-5 h-5" />
                                                {viewsCount}
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => setIsDeleteConfirmOpen(true)} 
                                            className="text-white p-2 rounded-full hover:bg-white/20"
                                            aria-label={t('pulseViewer.delete')}
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </>
                                )}
                                <button onClick={onClose} className="text-white text-3xl">&times;</button>
                            </div>
                        </div>
                    </div>
                   

                    <div className="relative w-full h-full rounded-lg overflow-hidden flex items-center justify-center bg-black">
                        {currentPulse.mediaUrl.includes('.mp4') || currentPulse.mediaUrl.includes('.webm') ? (
                            <video key={currentPulse.id} src={currentPulse.mediaUrl} controls autoPlay className="w-full h-full object-contain" />
                        ) : (
                            <img key={currentPulse.id} src={currentPulse.mediaUrl} alt={currentPulse.legenda || 'Pulse'} className="w-full h-full object-contain" />
                        )}

                        {(currentPulse.legenda || currentPulse.musicInfo) && (
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                                {currentPulse.musicInfo && (
                                    <div className="mb-2 text-white">
                                        <MusicPlayer musicInfo={currentPulse.musicInfo} isPlaying={true} isMuted={isMusicMuted} setIsMuted={setIsMuted} />
                                    </div>
                                )}
                                {currentPulse.legenda && (
                                    <p className="text-white text-center text-sm">{currentPulse.legenda}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {canGoNext && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setCurrentIndex(i => i + 1); }} 
                        className="absolute right-2 md:right-4 text-white bg-black/40 rounded-full p-2 z-20 hover:bg-black/70 transition-colors"
                        aria-label={t('pulseViewer.next')}
                    >
                        <NextIcon className="w-6 h-6" />
                    </button>
                )}
            </div>
            
            {isDeleteConfirmOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60]">
                    <div className="bg-white dark:bg-black rounded-lg shadow-xl p-6 w-full max-w-sm text-center border dark:border-zinc-800">
                        <h3 className="text-lg font-semibold mb-2">{t('pulseViewer.deleteTitle')}</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                            {t('pulseViewer.deleteBody')}
                        </p>
                        <div className="flex flex-col gap-2">
                            <button 
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="w-full px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold disabled:opacity-50"
                            >
                                {isDeleting ? t('common.deleting') : t('common.delete')}
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

export default PulseViewerModal;