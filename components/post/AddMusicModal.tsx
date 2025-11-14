import React from 'react';
import { db, doc, updateDoc } from '../../firebase';
import MusicSearch from './MusicSearch';
import { useLanguage } from '../../context/LanguageContext';

type MusicInfo = {
  nome: string;
  artista: string;
  capa: string;
  preview: string;
  startTime?: number;
};

interface AddMusicModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  onMusicAdded: (musicInfo: MusicInfo) => void;
  isProfileModal?: boolean;
}

const AddMusicModal: React.FC<AddMusicModalProps> = ({ isOpen, onClose, postId, onMusicAdded, isProfileModal = false }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const handleSelectMusic = async (musicInfo: MusicInfo) => {
    if (isProfileModal) {
      onMusicAdded(musicInfo);
      return;
    }

    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        musicInfo: musicInfo
      });
      onMusicAdded(musicInfo);
    } catch (err) {
      console.error("Error adding music to post:", err);
      // Optionally, show an error message to the user
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[51]" onClick={onClose}>
      <div className="bg-white dark:bg-black rounded-lg shadow-xl w-full max-w-4xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold">{t('addMusicModal.title')}</h2>
          <button onClick={onClose} className="text-2xl font-light">&times;</button>
        </div>
        <div className="flex-grow overflow-y-auto">
          <MusicSearch
            onSelectMusic={handleSelectMusic}
            onBack={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default AddMusicModal;
