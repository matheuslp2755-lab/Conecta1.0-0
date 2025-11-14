import React, { useState, useRef, useEffect } from 'react';
import {
    auth,
    db,
    storage,
    addDoc,
    collection,
    serverTimestamp,
    storageRef,
    uploadString,
    getDownloadURL,
    getDocs
} from '../../firebase';
import Button from '../common/Button';
import TextAreaInput from '../common/TextAreaInput';
import { useLanguage } from '../../context/LanguageContext';
import MusicSearch from '../post/MusicSearch';

interface CreatePulseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPulseCreated: () => void;
  initialImage?: { file: File, preview: string } | null;
}

type Follower = {
    id: string;
    username: string;
    avatar: string;
};

type MusicInfo = {
  nome: string;
  artista: string;
  capa: string;
  preview: string;
  startTime?: number;
};

const MediaIcon: React.FC = () => (
    <svg aria-label="Icon to represent media" className="w-24 h-24 text-zinc-800 dark:text-zinc-200" fill="currentColor" role="img" viewBox="0 0 97.6 77.3"><path d="M16.3 24h.3c2.8-.2 4.9-2.6 4.8-5.4A4.9 4.9 0 0 0 16 13.6c-2.8.2-4.9 2.6-4.8 5.4.1 2.7 2.4 4.8 5.1 5zM42.4 28.9c-2.8.2-5.4-2-5.6-4.8-.2-2.8 2-5.4 4.8-5.6 2.8-.2 5.4 2 5.6 4.8.2 2.8-2 5.4-4.8 5.6z" fill="currentColor"></path><path d="M84.7 18.4 58 16.9l-.2-3.2c-.3-5.7-5.2-10.1-11-9.8L12.9 6c-5.7.3-10.1 5.2-9.8 11L5 51.1v.8c.3 5.7 5.2 10.1 11 9.8l24.7-1.9v-9.4l-14.4 1.1c-1.2.1-2.2-1-2.1-2.2l-.2-3.2 14.5-1.2c5.7-.3 10.1-5.2 9.8-11L51 15.1l18.7 1.4c1.2.1 2.2 1 2.1 2.2l.2 3.2-18.7-1.4c-5.7.3-10.1 5.2-9.8 11l-1.9 24.7c.1 1.2 1 2.2 2.2 2.1l14.4-1.1v9.4l-24.7 1.9c-5.7-.3-10.1-5.2-9.8-11L18.4 25.6v-.8c-.3-5.7 5.2-10.1 11-9.8l24.7 1.9v9.4l14.4-1.1c-1.2-.1-2.2-1-2.1-2.2l.2-3.2-14.5 1.2c-5.7.3-10.1 5.2-9.8 11L49 60.3l-18.7-1.4c-1.2-.1-2.2-1-2.1-2.2l-.2-3.2 18.7 1.4c5.7-.3 10.1-5.2 9.8-11l1.9-24.7c-.1-1.2-1-2.2-2.2-2.1L31.2 20.1v-9.4l24.7-1.9c5.7.3 10.1 5.2 9.8 11l-2.1 28.9.2.6c.3 5.7-5.2 10.1-11 9.8L31.2 68.1v.8c.3 5.7 5.2 10.1 11 9.8l24.7-1.9v-9.4l-14.4 1.1c-1.2.1-2.2-1-2.1-2.2l-.2-3.2 14.5-1.2c5.7-.3 10.1-5.2 9.8-11L72.2 19l14.5-1.2c1.2-.1 2.2 1 2.1 2.2l-.2 3.2-14.5 1.2c-5.7.3-10.1 5.2-9.8 11l-1.9 24.7c.1 1.2 1 2.2 2.2 2.1l14.4-1.1v9.4l-24.7 1.9c-5.7-.3-10.1-5.2-9.8-11l2.1-28.9-.2-.6c-.3-5.7 5.2-10.1 11-9.8l21.5 1.7 2.1-28.9c-.3-5.7-5.2-10.1-11-9.8L21.5 4.9v.8c-.3 5.7 5.2 10.1 11 9.8l24.7-1.9v-9.4L31.2 6C25.5 5.7 21.1.8 21.4-5l2.1-28.9c.3-5.7 5.2-10.1 11-9.8l42.2-3.2c5.7-.3 10.1 5.2 9.8 11z" fill="currentColor"></path></svg>
);


const CreatePulseModal: React.FC<CreatePulseModalProps> = ({ isOpen, onClose, onPulseCreated, initialImage }) => {
    const { t } = useLanguage();
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
    const [caption, setCaption] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isVentMode, setIsVentMode] = useState(false);
    const [allowedUsers, setAllowedUsers] = useState<string[]>([]);
    const [followers, setFollowers] = useState<Follower[]>([]);
    const [followerSearch, setFollowerSearch] = useState('');
    const [loadingFollowers, setLoadingFollowers] = useState(false);
    const [selectedMusic, setSelectedMusic] = useState<MusicInfo | null>(null);
    const [showMusicSearch, setShowMusicSearch] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) {
            setMediaFile(null);
            setMediaPreview(null);
            setMediaType(null);
            setCaption('');
            setError('');
            setIsVentMode(false);
            setAllowedUsers([]);
            setFollowers([]);
            setFollowerSearch('');
            setSelectedMusic(null);
            setShowMusicSearch(false);
        } else if (initialImage) {
            setMediaFile(initialImage.file);
            setMediaPreview(initialImage.preview);
            if (initialImage.file.type.startsWith('image/')) {
                setMediaType('image');
            } else if (initialImage.file.type.startsWith('video/')) {
                setMediaType('video');
            }
        }
    }, [isOpen, initialImage]);

    useEffect(() => {
        if (isOpen && isVentMode && followers.length === 0) {
            const fetchFollowers = async () => {
                if (!auth.currentUser) return;
                setLoadingFollowers(true);
                try {
                    const followingRef = collection(db, 'users', auth.currentUser.uid, 'following');
                    const snapshot = await getDocs(followingRef);
                    const followersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Follower));
                    setFollowers(followersData);
                } catch (error) {
                    console.error("Error fetching followers:", error);
                } finally {
                    setLoadingFollowers(false);
                }
            };
            fetchFollowers();
        }
    }, [isOpen, isVentMode, followers.length]);


    if (!isOpen) return null;

    const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type.startsWith('image/')) {
                setMediaType('image');
            } else if (file.type.startsWith('video/')) {
                setMediaType('video');
            } else {
                setError(t('createPulse.invalidFileError'));
                return;
            }
            setMediaFile(file);
            setError('');
    
            const reader = new FileReader();
            reader.onload = (event) => {
                setMediaPreview(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleAllowedUserToggle = (userId: string) => {
        setAllowedUsers(prev => 
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const currentUser = auth.currentUser;
        if (!mediaFile || !currentUser || !mediaPreview) return;

        setSubmitting(true);
        setError('');
        try {
            const mediaUploadRef = storageRef(storage, `pulses/${currentUser.uid}/${Date.now()}-${mediaFile.name}`);
            await uploadString(mediaUploadRef, mediaPreview, 'data_url');
            const downloadURL = await getDownloadURL(mediaUploadRef);

            const pulseData: { [key: string]: any } = {
                authorId: currentUser.uid,
                mediaUrl: downloadURL,
                legenda: caption,
                createdAt: serverTimestamp(),
            };
            
            if (selectedMusic) {
                pulseData.musicInfo = selectedMusic;
            }

            if (isVentMode) {
                pulseData.isVentMode = true;
                pulseData.allowedUsers = [...new Set([currentUser.uid, ...allowedUsers])];
            }

            await addDoc(collection(db, 'pulses'), pulseData);

            onPulseCreated();

        } catch (err) {
            console.error("Error creating pulse:", err);
            setError(t('createPulse.publishError'));
        } finally {
            setSubmitting(false);
        }
    };

    const filteredFollowers = followers.filter(f => f.username.toLowerCase().includes(followerSearch.toLowerCase()));

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-black rounded-lg shadow-xl w-full max-w-4xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                    <h2 className="text-lg font-semibold">{showMusicSearch ? t('createPost.addMusic') : t('createPulse.title')}</h2>
                    {mediaPreview && !showMusicSearch && (
                         <Button onClick={handleSubmit} disabled={submitting} className="!w-auto !py-0 !px-3 !text-sm">
                            {submitting ? t('createPulse.publishing') : t('createPulse.publish')}
                        </Button>
                    )}
                </div>
                <div className="flex-grow overflow-y-auto">
                    {showMusicSearch ? (
                        <MusicSearch
                          onSelectMusic={(track) => {
                            setSelectedMusic(track);
                            setShowMusicSearch(false);
                          }}
                          onBack={() => setShowMusicSearch(false)}
                        />
                    ) : mediaPreview ? (
                        <div className="flex flex-col md:flex-row">
                            <div className="w-full md:w-1/2 aspect-[9/16] bg-black flex items-center justify-center">
                                {mediaType === 'image' && <img src={mediaPreview} alt="Pulse preview" className="max-h-full max-w-full object-contain" />}
                                {mediaType === 'video' && <video src={mediaPreview} controls className="max-h-full max-w-full object-contain" />}
                            </div>
                            <div className="w-full md:w-1/2 p-4 flex flex-col">
                                <div className="flex items-center mb-4">
                                    <img src={auth.currentUser?.photoURL || ''} alt={auth.currentUser?.displayName || 'User'} className="w-8 h-8 rounded-full object-cover"/>
                                    <p className="font-semibold text-sm ml-3">{auth.currentUser?.displayName}</p>
                                </div>
                                <TextAreaInput 
                                    id="caption"
                                    label={t('createPulse.captionLabel')}
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                    className="!min-h-[100px]"
                                />
                                <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                {selectedMusic ? (
                                    <div className="flex items-center gap-3">
                                        <img src={selectedMusic.capa} alt={selectedMusic.nome} className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                                        <div className="flex-grow overflow-hidden">
                                            <p className="font-semibold text-sm truncate">{selectedMusic.nome}</p>
                                            <p className="text-xs text-zinc-500 truncate">{selectedMusic.artista}</p>
                                        </div>
                                        <button type="button" onClick={() => setShowMusicSearch(true)} className="text-sky-500 font-semibold text-sm ml-auto flex-shrink-0">
                                            {t('createPost.changeMusic')}
                                        </button>
                                    </div>
                                ) : (
                                    <button type="button" onClick={() => setShowMusicSearch(true)} className="w-full text-zinc-600 dark:text-zinc-300 font-semibold text-sm flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M18 3a1 1 0 00-1.447-.894L4 6.424V20.5a1 1 0 001.5 1.5h.01L17 18.424V4.5a1 1 0 00-1-1.5zM6 8.118l8-2.436v8.664l-8 2.436V8.118z" /><path d="M11 5.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg>
                                        {t('createPost.addMusic')}
                                    </button>
                                )}
                                </div>
                                <div className="flex items-center justify-between w-full mt-4 py-2 border-y border-zinc-200 dark:border-zinc-800">
                                    <div>
                                        <label htmlFor="vent-mode-pulse" className="font-semibold text-sm">{t('createPulse.ventMode')}</label>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('createPulse.ventModeInfo')}</p>
                                    </div>
                                    <label htmlFor="vent-mode-pulse" className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            id="vent-mode-pulse" 
                                            className="sr-only peer"
                                            checked={isVentMode}
                                            onChange={() => setIsVentMode(!isVentMode)}
                                        />
                                        <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                                    </label>
                                </div>
                                {isVentMode && (
                                     <div className="flex flex-col mt-4 flex-grow min-h-0">
                                        <input 
                                            type="text"
                                            placeholder={t('createPost.searchFollowers')}
                                            value={followerSearch}
                                            onChange={e => setFollowerSearch(e.target.value)}
                                            className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md py-1.5 px-4 text-sm mb-2"
                                        />
                                        <div className="flex justify-between items-center mb-2 text-xs font-semibold">
                                             <span>{t('createPost.selectedCount', { count: allowedUsers.length })}</span>
                                            <div>
                                                <button onClick={() => setAllowedUsers(followers.map(f => f.id))} className="text-sky-500 px-1">{t('createPost.selectAll')}</button>
                                                <button onClick={() => setAllowedUsers([])} className="text-sky-500 px-1">{t('createPost.deselectAll')}</button>
                                            </div>
                                        </div>
                                        <div className="flex-grow overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-md">
                                            {loadingFollowers ? <p className="p-4 text-center text-sm text-zinc-500">{t('messages.loading')}</p> : 
                                            filteredFollowers.length > 0 ? (
                                                filteredFollowers.map(follower => (
                                                    <label key={follower.id} className="flex items-center p-2 gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer">
                                                        <input type="checkbox" checked={allowedUsers.includes(follower.id)} onChange={() => handleAllowedUserToggle(follower.id)} className="w-4 h-4 text-sky-600 bg-zinc-100 border-zinc-300 rounded focus:ring-sky-500 dark:focus:ring-sky-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600" />
                                                        <img src={follower.avatar} alt={follower.username} className="w-8 h-8 rounded-full object-cover" />
                                                        <span className="text-sm font-medium">{follower.username}</span>
                                                    </label>
                                                ))
                                            ) : (
                                                <p className="p-4 text-center text-sm text-zinc-500">{t('createPost.noFollowersFound')}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {error && <p className="text-red-500 text-xs text-center mt-2">{error}</p>}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-16">
                            <MediaIcon />
                            <h3 className="text-xl mt-4 mb-2">{t('createPulse.selectMedia')}</h3>
                            <input type="file" ref={fileInputRef} onChange={handleMediaChange} className="hidden" accept="image/*,video/*" />
                            <Button onClick={triggerFileInput}>
                                {t('createPulse.selectFromComputer')}
                            </Button>
                             {error && <p className="text-red-500 text-xs text-center mt-4">{error}</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
};

export default CreatePulseModal;