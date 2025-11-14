import React, { useState, useEffect } from 'react';
import { auth, db, collection, getDocs, doc, setDoc, serverTimestamp } from '../../firebase';
import { useLanguage } from '../../context/LanguageContext';

type Memory = {
    id: string;
    name: string;
    coverUrl: string;
};

type Content = {
    id: string;
    type: 'post' | 'pulse';
    mediaUrl: string;
    timestamp: any;
};

interface AddToMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: Content;
  onOpenCreate: (initialContent: Content) => void;
}

const Spinner: React.FC = () => (
    <div className="flex justify-center items-center p-4">
        <svg className="animate-spin h-5 w-5 text-zinc-500 dark:text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

const AddToMemoryModal: React.FC<AddToMemoryModalProps> = ({ isOpen, onClose, content, onOpenCreate }) => {
    const { t } = useLanguage();
    const [memories, setMemories] = useState<Memory[]>([]);
    const [loading, setLoading] = useState(true);
    const [addingTo, setAddingTo] = useState<string | null>(null);
    const currentUser = auth.currentUser;

    useEffect(() => {
        if (!isOpen || !currentUser) return;

        const fetchMemories = async () => {
            setLoading(true);
            try {
                const memoriesRef = collection(db, 'users', currentUser.uid, 'memories');
                const memoriesSnap = await getDocs(memoriesRef);
                const memoriesData = memoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Memory));
                setMemories(memoriesData);
            } catch (error) {
                console.error("Error fetching memories:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMemories();
    }, [isOpen, currentUser]);

    const handleAdd = async (memoryId: string) => {
        if (!currentUser) return;
        setAddingTo(memoryId);
        try {
            const itemRef = doc(collection(db, 'users', currentUser.uid, 'memories', memoryId, 'items'));
            await setDoc(itemRef, {
                contentId: content.id,
                contentType: content.type,
                mediaUrl: content.mediaUrl,
                timestamp: content.timestamp,
            });
            onClose();
        } catch (error) {
            console.error("Error adding item to memory:", error);
        } finally {
            setAddingTo(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-black rounded-lg shadow-xl w-full max-w-sm border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[60vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center flex-shrink-0">
                    <div className="w-8"></div>
                    <h2 className="text-lg font-semibold">{t('memories.addToMemoryTitle')}</h2>
                    <button onClick={onClose} className="text-2xl font-light w-8">&times;</button>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {loading ? (
                        <Spinner />
                    ) : (
                        <div>
                            <button onClick={() => onOpenCreate(content)} className="w-full flex items-center p-3 gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                                <div className="w-11 h-11 rounded-full border-2 border-dashed border-zinc-400 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                </div>
                                <span className="font-semibold text-sm">{t('memories.createNew')}</span>
                            </button>
                            {memories.map(memory => (
                                <button key={memory.id} onClick={() => handleAdd(memory.id)} disabled={!!addingTo} className="w-full flex items-center p-3 gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-50">
                                    <img src={memory.coverUrl} alt={memory.name} className="w-11 h-11 rounded-full object-cover" />
                                    <span className="font-semibold text-sm">{memory.name}</span>
                                    {addingTo === memory.id && <Spinner />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddToMemoryModal;
