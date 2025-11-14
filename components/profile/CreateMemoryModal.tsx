import React, { useState, useEffect } from 'react';
import { auth, db, collection, getDocs, doc, setDoc, serverTimestamp, writeBatch, query, where, orderBy } from '../../firebase';
import { useLanguage } from '../../context/LanguageContext';
import Button from '../common/Button';
import TextInput from '../common/TextInput';

type ContentItem = {
    id: string;
    type: 'post' | 'pulse';
    mediaUrl: string;
    timestamp: any;
};

interface CreateMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemoryCreated: () => void;
  initialContent?: ContentItem;
}

const Spinner: React.FC = () => (
    <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sky-500"></div>
    </div>
);

const BackArrowIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
);

const CreateMemoryModal: React.FC<CreateMemoryModalProps> = ({ isOpen, onClose, onMemoryCreated, initialContent }) => {
    const { t } = useLanguage();
    const [step, setStep] = useState(1);
    const [allContent, setAllContent] = useState<ContentItem[]>([]);
    const [selectedContent, setSelectedContent] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const currentUser = auth.currentUser;

    useEffect(() => {
        if (!isOpen) {
            // Reset state on close
            setStep(1);
            setAllContent([]);
            setSelectedContent([]);
            setLoading(true);
            setName('');
            setCoverUrl('');
            setIsSubmitting(false);
            return;
        }

        const fetchContent = async () => {
            if (!currentUser) return;
            setLoading(true);
            try {
                const postsQuery = query(collection(db, 'posts'), where('userId', '==', currentUser.uid), orderBy('timestamp', 'desc'));
                const pulsesQuery = query(collection(db, 'pulses'), where('authorId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
                
                const [postsSnap, pulsesSnap] = await Promise.all([getDocs(postsQuery), getDocs(pulsesQuery)]);
                
                const posts: ContentItem[] = postsSnap.docs.map(doc => ({ id: doc.id, type: 'post', mediaUrl: doc.data().imageUrl, timestamp: doc.data().timestamp }));
                const pulses: ContentItem[] = pulsesSnap.docs.map(doc => ({ id: doc.id, type: 'pulse', mediaUrl: doc.data().mediaUrl, timestamp: doc.data().createdAt }));

                const combined = [...posts, ...pulses].sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                setAllContent(combined);

                if (initialContent) {
                    setSelectedContent([initialContent]);
                    setCoverUrl(initialContent.mediaUrl);
                    setStep(2);
                }
            } catch (error) {
                console.error("Error fetching content:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [isOpen, currentUser, initialContent]);

    const handleToggleSelect = (item: ContentItem) => {
        setSelectedContent(prev => {
            if (prev.find(c => c.id === item.id)) {
                return prev.filter(c => c.id !== item.id);
            }
            return [...prev, item];
        });
    };

    const handleNext = () => {
        if (selectedContent.length > 0) {
            setCoverUrl(selectedContent[0].mediaUrl); // Default cover
            setStep(2);
        }
    };
    
    const handleCreate = async () => {
        if (!currentUser || !name.trim() || !coverUrl) return;
        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            const memoryRef = doc(collection(db, 'users', currentUser.uid, 'memories'));
            batch.set(memoryRef, {
                name: name.trim(),
                coverUrl,
                createdAt: serverTimestamp(),
            });

            selectedContent.forEach(item => {
                const itemRef = doc(collection(db, 'users', currentUser.uid, 'memories', memoryRef.id, 'items'));
                batch.set(itemRef, {
                    contentId: item.id,
                    contentType: item.type,
                    mediaUrl: item.mediaUrl,
                    timestamp: item.timestamp,
                });
            });

            await batch.commit();
            onMemoryCreated();
            onClose();
        } catch (error) {
            console.error("Error creating memory:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[51]" onClick={onClose}>
            <div className="bg-white dark:bg-black rounded-lg shadow-xl w-full max-w-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center flex-shrink-0">
                    <div className="w-20">
                        {step === 2 && <button onClick={() => setStep(1)} className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"><BackArrowIcon className="w-6 h-6" /></button>}
                    </div>
                    <h2 className="text-lg font-semibold">{step === 1 ? t('memories.selectContent') : t('memories.title')}</h2>
                    <div className="w-20 text-right">
                        {step === 1 && <Button onClick={handleNext} disabled={selectedContent.length === 0} className="!w-auto !py-0 !px-3 !text-sm">{t('memories.next')}</Button>}
                        {step === 2 && <Button onClick={handleCreate} disabled={!name.trim() || !coverUrl || isSubmitting} className="!w-auto !py-0 !px-3 !text-sm">{isSubmitting ? t('memories.creating') : t('memories.create')}</Button>}
                    </div>
                </div>
                {step === 1 ? (
                    <div className="flex-grow overflow-y-auto p-1">
                        {loading && <Spinner />}
                        {!loading && allContent.length === 0 && <p className="text-center p-8 text-zinc-500">{t('memories.noContent')}</p>}
                        {!loading && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
                                {allContent.map(item => {
                                    const isSelected = !!selectedContent.find(c => c.id === item.id);
                                    return (
                                        <div key={item.id} className="relative aspect-square cursor-pointer" onClick={() => handleToggleSelect(item)}>
                                            <img src={item.mediaUrl} className={`w-full h-full object-cover transition-opacity ${isSelected ? 'opacity-50' : ''}`} alt="" />
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 w-6 h-6 bg-sky-500 rounded-full border-2 border-white flex items-center justify-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-6 flex flex-col items-center gap-6">
                         <img src={coverUrl} alt="Cover preview" className="w-24 h-24 rounded-full object-cover border-2 border-zinc-300" />
                         <div className="w-full">
                            <TextInput id="memory-name" label={t('memories.memoryName')} value={name} onChange={(e) => setName(e.target.value)} />
                         </div>
                         <div className="w-full">
                            <h3 className="text-sm font-semibold mb-2">{t('memories.selectCover')}</h3>
                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                                {selectedContent.map(item => (
                                    <div key={item.id} className={`relative aspect-square cursor-pointer rounded-md overflow-hidden ${coverUrl === item.mediaUrl ? 'ring-2 ring-sky-500' : ''}`} onClick={() => setCoverUrl(item.mediaUrl)}>
                                        <img src={item.mediaUrl} className="w-full h-full object-cover" alt="" />
                                    </div>
                                ))}
                            </div>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateMemoryModal;
