import React, { useState } from 'react';
import { db, doc, updateDoc } from '../../firebase';
import Button from '../common/Button';
import TextAreaInput from '../common/TextAreaInput';
import { useLanguage } from '../../context/LanguageContext';

interface AddCaptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  onCaptionSaved: (newCaption: string) => void;
}

const AddCaptionModal: React.FC<AddCaptionModalProps> = ({ isOpen, onClose, postId, onCaptionSaved }) => {
  const { t } = useLanguage();
  const [caption, setCaption] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (caption.trim() === '') return;

    setIsSaving(true);
    setError('');
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        caption: caption.trim()
      });
      onCaptionSaved(caption.trim());
    } catch (err) {
      console.error("Error updating caption:", err);
      setError(t('addCaptionModal.error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-black rounded-lg shadow-xl w-full max-w-md border border-zinc-200 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold">{t('addCaptionModal.title')}</h2>
          <button onClick={onClose} className="text-2xl font-light">&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <TextAreaInput
              id="add-caption"
              label={t('addCaptionModal.captionLabel')}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              autoFocus
            />
          </div>
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col items-end">
            {error && <p className="text-red-500 text-xs text-center mb-2 w-full">{error}</p>}
            <Button type="submit" disabled={isSaving || !caption.trim()}>
              {isSaving ? t('addCaptionModal.saving') : t('addCaptionModal.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCaptionModal;
