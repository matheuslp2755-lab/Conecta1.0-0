import React, { useState, useEffect, useRef } from 'react';
import Button from '../common/Button';
import TextInput from '../common/TextInput';
import TextAreaInput from '../common/TextAreaInput';
import { useLanguage } from '../../context/LanguageContext';
import AddMusicModal from '../post/AddMusicModal'; // Reusing for UI, but need a profile version

type MusicInfo = {
  nome: string;
  artista: string;
  capa: string;
  preview: string;
  startTime?: number;
};

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    username: string;
    avatar: string;
    bio?: string;
    isPrivate?: boolean;
    profileMusic?: MusicInfo;
  };
  onUpdate: (updatedData: { username: string; bio: string; avatarFile: File | null; avatarPreview: string | null; isPrivate: boolean; profileMusic: MusicInfo | null }) => Promise<void>;
  isSubmitting: boolean;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, user, onUpdate, isSubmitting }) => {
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || '');
  const [isPrivate, setIsPrivate] = useState(user.isPrivate || false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileMusic, setProfileMusic] = useState<MusicInfo | null>(user.profileMusic || null);
  const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUsername(user.username);
      setBio(user.bio || '');
      setIsPrivate(user.isPrivate || false);
      setAvatarFile(null);
      setAvatarPreview(null);
      setProfileMusic(user.profileMusic || null);
      setError('');
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setError('');

      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
        await onUpdate({ username, bio, avatarFile, avatarPreview, isPrivate, profileMusic });
        // onClose will be called by parent on success
    } catch (err) {
        console.error(err);
        setError(t('editProfile.updateError'));
    }
  };

  return (
    <>
      <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={onClose}
      >
        <div 
          className="bg-white dark:bg-black rounded-lg shadow-xl w-full max-w-md border border-zinc-200 dark:border-zinc-800"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
            <h2 className="text-lg font-semibold">{t('editProfile.title')}</h2>
            <button onClick={onClose} className="text-2xl font-light">&times;</button>
          </div>
          <form onSubmit={handleSubmit}>
              <div className="p-6 flex flex-col items-center gap-4">
                  <div className="flex items-center gap-6 w-full">
                      <img src={avatarPreview || user.avatar} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
                      <div className="flex flex-col">
                          <span className="font-semibold">{user.username}</span>
                          <button
                            type="button"
                            onClick={() => avatarInputRef.current?.click()}
                            className="text-sm font-semibold text-sky-500 hover:text-sky-600 dark:hover:text-sky-400 text-left p-0 bg-transparent border-none cursor-pointer"
                          >
                            {t('editProfile.changePhoto')}
                          </button>
                          <input 
                              type="file"
                              ref={avatarInputRef}
                              onChange={handleAvatarChange}
                              className="hidden"
                              accept="image/*"
                          />
                      </div>
                  </div>
                  <div className="w-full flex flex-col gap-4 mt-4">
                      <TextInput
                          id="username"
                          label={t('editProfile.usernameLabel')}
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                      />
                      <TextAreaInput
                          id="bio"
                          label={t('editProfile.bioLabel')}
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                      />
                       <div className="w-full">
                          <label className="font-semibold text-sm">{t('editProfile.profileMusic')}</label>
                          {profileMusic ? (
                              <div className="flex items-center gap-2 mt-1 text-sm p-2 rounded-md bg-zinc-50 dark:bg-zinc-900">
                                  <img src={profileMusic.capa} className="w-10 h-10 rounded" alt={profileMusic.nome}/>
                                  <div className="flex-grow">
                                      <p className="font-semibold truncate">{profileMusic.nome}</p>
                                      <p className="text-xs text-zinc-500 truncate">{profileMusic.artista}</p>
                                  </div>
                                   <button type="button" onClick={() => setProfileMusic(null)} className="text-xs font-semibold text-red-500 hover:underline p-1">{t('editProfile.removeMusic')}</button>
                              </div>
                          ) : <p className="text-xs text-zinc-500 mt-1">{t('editProfile.noProfileMusic')}</p>}
                          <button 
                            type="button" 
                            onClick={() => setIsMusicModalOpen(true)}
                            className="text-sm font-semibold text-sky-500 hover:text-sky-600 dark:hover:text-sky-400 mt-2 p-0 bg-transparent border-none"
                          >
                            {profileMusic ? t('editProfile.changeMusic') : t('createPost.addMusic')}
                          </button>
                      </div>
                       <div className="flex items-center justify-between w-full mt-2">
                          <div>
                              <label htmlFor="private-account" className="font-semibold text-sm">{t('editProfile.privateAccount')}</label>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('editProfile.privateAccountInfo')}</p>
                          </div>
                          <label htmlFor="private-account" className="relative inline-flex items-center cursor-pointer">
                              <input 
                                  type="checkbox" 
                                  id="private-account" 
                                  className="sr-only peer"
                                  checked={isPrivate}
                                  onChange={() => setIsPrivate(!isPrivate)}
                              />
                              <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 dark:peer-focus:ring-sky-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-sky-600"></div>
                          </label>
                      </div>
                  </div>
              </div>
              <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col items-end">
                  {error && <p className="text-red-500 text-xs text-center mb-2 w-full">{error}</p>}
                  <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? t('editProfile.submitting') : t('editProfile.submit')}
                  </Button>
              </div>
          </form>
        </div>
      </div>
      <AddMusicModal 
        isOpen={isMusicModalOpen}
        onClose={() => setIsMusicModalOpen(false)}
        postId="" // Not used for profile music, but prop is required.
        onMusicAdded={(music) => {
          setProfileMusic(music);
          setIsMusicModalOpen(false);
        }}
        isProfileModal={true}
      />
    </>
  );
};

export default EditProfileModal;