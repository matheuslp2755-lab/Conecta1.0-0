import React, { useState, useEffect, useRef } from 'react';
import { 
    auth, 
    db, 
    doc, 
    collection, 
    query, 
    orderBy, 
    onSnapshot, 
    writeBatch, 
    serverTimestamp,
    deleteDoc,
    updateDoc,
    getDocs,
    limit,
    getDoc,
    storage,
    storageRef,
    uploadBytes,
    getDownloadURL
} from '../../firebase';
import ConnectionCrystal from './ConnectionCrystal';
import OnlineIndicator from '../common/OnlineIndicator';
import { useLanguage } from '../../context/LanguageContext';
import { useCall } from '../../context/CallContext';
import ConnectionStreakShareModal from './ConnectionStreakShareModal';

interface ForwardedPostProps {
  content: {
    originalPosterAvatar: string;
    originalPosterUsername: string;
    imageUrl: string;
    caption: string;
  };
}

const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const AudioPlayer: React.FC<{ src: string }> = ({ src }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
  
    const togglePlayPause = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play().catch(console.error);
            }
        }
    };
  
    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            const setAudioData = () => {
                setDuration(audio.duration);
                setCurrentTime(audio.currentTime);
            };
            const setAudioTime = () => setCurrentTime(audio.currentTime);
            const onPlay = () => setIsPlaying(true);
            const onPause = () => setIsPlaying(false);

            audio.addEventListener('loadedmetadata', setAudioData);
            audio.addEventListener('timeupdate', setAudioTime);
            audio.addEventListener('play', onPlay);
            audio.addEventListener('pause', onPause);
            audio.addEventListener('ended', onPause);
    
            return () => {
                audio.removeEventListener('loadedmetadata', setAudioData);
                audio.removeEventListener('timeupdate', setAudioTime);
                audio.removeEventListener('play', onPlay);
                audio.removeEventListener('pause', onPause);
                audio.removeEventListener('ended', onPause);
            };
        }
    }, []);
  
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
    return (
        <div className="flex items-center gap-2 w-60 p-2 text-inherit">
            <audio ref={audioRef} src={src} preload="metadata" />
            <button onClick={togglePlayPause} className="flex-shrink-0">
                {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
            </button>
            <div className="w-full bg-zinc-300 dark:bg-zinc-700 rounded-full h-1.5 flex-grow">
                <div style={{ width: `${progress}%` }} className="bg-current h-1.5 rounded-full"></div>
            </div>
            <span className="text-xs font-mono flex-shrink-0">{formatTime(duration > 0 ? currentTime : 0)}</span>
        </div>
    );
};

const ForwardedPost: React.FC<ForwardedPostProps> = ({ content }) => {
  return (
    <div className="p-2">
        <div className="border border-zinc-300 dark:border-zinc-700 rounded-xl overflow-hidden w-60 bg-white dark:bg-black">
            <div className="p-2 flex items-center gap-2">
                <img src={content.originalPosterAvatar} alt={content.originalPosterUsername} className="w-6 h-6 rounded-full" />
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{content.originalPosterUsername}</span>
            </div>
            <img src={content.imageUrl} alt="Forwarded post" className="w-full aspect-square object-cover" />
            {content.caption && <p className="text-xs p-2 truncate text-zinc-600 dark:text-zinc-400">{content.caption}</p>}
        </div>
    </div>
  );
};


interface ChatWindowProps {
    conversationId: string | null;
    onBack: () => void;
    isCurrentUserAnonymous: boolean;
}

interface Message {
    id: string;
    senderId: string;
    text: string;
    timestamp: any;
    replyTo?: {
        messageId: string;
        senderId: string;
        senderUsername: string;
        text: string;
    };
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'forwarded_post' | 'audio';
    forwardedPostData?: {
        postId: string;
        imageUrl: string;
        originalPosterUsername: string;
        originalPosterAvatar: string;
        caption: string;
    };
}

interface OtherUser {
    id: string;
    username: string;
    avatar: string;
}

type CrystalLevel = 'BRILHANTE' | 'EQUILIBRADO' | 'APAGADO' | 'RACHADO';

interface CrystalData {
    createdAt: any;
    lastInteractionAt: any;
    level: CrystalLevel;
    streak: number;
}

interface ConversationData {
    participants: string[];
    participantInfo: {
        [key: string]: {
            username: string;
            avatar: string;
            lastSeenMessageTimestamp?: any;
        }
    };
    crystal?: CrystalData;
}


function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T | undefined>(undefined);
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}


const TrashIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const ReplyIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15l-6-6m0 0l6-6M3 9h12a6 6 0 016 6v3" />
    </svg>
);

const BackArrowIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
);

const PlusCircleIcon: React.FC<{className?: string}> = ({className = "h-6 w-6"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const XIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const MicrophoneIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19v3" />
    </svg>
);
  
const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.722-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
    </svg>
);

const PauseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75.75v12a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75zm9 0a.75.75 0 01.75.75v12a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75z" clipRule="evenodd" />
    </svg>
);

const CallIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
);

const VideoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);


const ChatWindow: React.FC<ChatWindowProps> = ({ conversationId, onBack, isCurrentUserAnonymous }) => {
    const { t } = useLanguage();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
    const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
    const [conversationData, setConversationData] = useState<ConversationData | null>(null);
    const [crystalData, setCrystalData] = useState<CrystalData | null>(null);
    const [loading, setLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ open: boolean, messageId: string | null }>({ open: false, messageId: null });
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [viewingMedia, setViewingMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const { startCall, activeCall } = useCall();
    const [isCallDropdownOpen, setIsCallDropdownOpen] = useState(false);
    const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);

    type AnimationState = 'idle' | 'forming' | 'settling';
    const [animationState, setAnimationState] = useState<AnimationState>('idle');
    const [animationMessage, setAnimationMessage] = useState('');
    const [finalCrystalPos, setFinalCrystalPos] = useState({ top: 0, left: 0, width: 0, height: 0 });

    const currentUser = auth.currentUser;
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const crystalHeaderRef = useRef<HTMLDivElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const prevCrystalData = usePrevious(crystalData);
    const unsubUserStatusRef = useRef<(() => void) | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<number | null>(null);
    const callDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (callDropdownRef.current && !callDropdownRef.current.contains(event.target as Node)) {
                setIsCallDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [messages]);

    useEffect(() => {
        if (replyingTo) {
            inputRef.current?.focus();
        }
    }, [replyingTo]);
    
    useEffect(() => {
        if (!crystalData || !crystalHeaderRef.current || !dialogRef.current) return;

        const justFormed = crystalData.streak >= 2 && (!prevCrystalData || prevCrystalData.streak < 2);
        const upgradedToBrilhante = crystalData.level === 'BRILHANTE' && prevCrystalData?.level && prevCrystalData.level !== 'BRILHANTE';

        if (justFormed || upgradedToBrilhante) {
            const rect = crystalHeaderRef.current.getBoundingClientRect();
            const modalRect = dialogRef.current.getBoundingClientRect();
           
            setFinalCrystalPos({
                top: rect.top - modalRect.top,
                left: rect.left - modalRect.left,
                width: rect.width,
                height: rect.height
            });

            setAnimationMessage(justFormed ? t('crystal.formed') : t('crystal.glowing'));
            setAnimationState('forming');

            const settlingTimer = setTimeout(() => {
                setAnimationState('settling');
            }, 4000); // Wait 4s before moving

            return () => {
                clearTimeout(settlingTimer);
            };
        }
    }, [crystalData, prevCrystalData, t]);

    useEffect(() => {
        if (!conversationId || !currentUser) {
            setMessages([]);
            setOtherUser(null);
            setCrystalData(null);
            setConversationData(null);
            return;
        }

        setLoading(true);

        const unsubConversation = onSnapshot(doc(db, 'conversations', conversationId), (docSnap) => {
            const data = docSnap.data() as ConversationData;
            if (data) {
                setConversationData(data);
                const otherUserId = data.participants.find((p: string) => p !== currentUser.uid);
                
                if(otherUserId) {
                    const otherUserInfo = data.participantInfo[otherUserId];
                    setOtherUser({
                        id: otherUserId,
                        username: otherUserInfo?.username || t('common.user'),
                        avatar: otherUserInfo?.avatar || `https://i.pravatar.cc/150?u=${otherUserId}`,
                    });

                    if (!unsubUserStatusRef.current) {
                        const userDocRef = doc(db, 'users', otherUserId);
                        unsubUserStatusRef.current = onSnapshot(userDocRef, (userSnap) => {
                            if (userSnap.exists()) {
                                const userData = userSnap.data();
                                const lastSeen = userData.lastSeen;
                                const isAnonymous = userData.isAnonymous || false;
                                const isOnline = !isAnonymous && lastSeen && (new Date().getTime() / 1000 - lastSeen.seconds) < 600;
                                setIsOtherUserOnline(isOnline);
                            } else {
                                setIsOtherUserOnline(false);
                            }
                        });
                    }
                }

                if (data.crystal && data.crystal.lastInteractionAt && data.crystal.streak >= 2) {
                    const lastInteractionDate = data.crystal.lastInteractionAt.toDate();
                    const now = new Date();
                    const diffHours = (now.getTime() - lastInteractionDate.getTime()) / (1000 * 60 * 60);

                    let calculatedLevel: CrystalLevel = data.crystal.level;
                    if (diffHours <= 24) {
                        calculatedLevel = 'BRILHANTE';
                    } else if (diffHours > 24 && diffHours <= 72) {
                        calculatedLevel = 'EQUILIBRADO';
                    } else if (diffHours > 72 && diffHours <= 168) {
                        calculatedLevel = 'APAGADO';
                    } else if (diffHours > 168) {
                        calculatedLevel = 'RACHADO';
                    }
                    
                    setCrystalData({ ...data.crystal, level: calculatedLevel });
                } else {
                    setCrystalData(null);
                }
            }
        });

        const messagesQuery = query(collection(db, 'conversations', conversationId, 'messages'), orderBy('timestamp', 'asc'));
        const unsubMessages = onSnapshot(messagesQuery, async (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(msgs);

            const lastOtherUserMessage = [...msgs].reverse().find(m => m.senderId !== currentUser.uid);
            
            if (lastOtherUserMessage && !isCurrentUserAnonymous) {
                const convRef = doc(db, 'conversations', conversationId);
                const convSnap = await getDoc(convRef);
                const convData = convSnap.data() as ConversationData;
                const currentUserInfo = convData?.participantInfo?.[currentUser.uid];

                if (!currentUserInfo?.lastSeenMessageTimestamp || 
                    lastOtherUserMessage.timestamp?.seconds > currentUserInfo.lastSeenMessageTimestamp.seconds) {
                    
                    await updateDoc(convRef, {
                        [`participantInfo.${currentUser.uid}.lastSeenMessageTimestamp`]: lastOtherUserMessage.timestamp
                    });
                }
            }
            
            setLoading(false);
        });

        return () => {
            unsubConversation();
            unsubMessages();
            if (unsubUserStatusRef.current) {
                unsubUserStatusRef.current();
                unsubUserStatusRef.current = null;
            }
        };
    }, [conversationId, currentUser, t, isCurrentUserAnonymous]);

    const handleClearMedia = () => {
        setMediaFile(null);
        setMediaPreview(null);
        setMediaType(null);
        setUploadError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadError('');

        if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = function() {
                window.URL.revokeObjectURL(video.src);
                if (video.duration > 30) {
                    setUploadError(t('messages.media.videoTooLong'));
                    if (e.target) e.target.value = '';
                } else {
                    setMediaType('video');
                    setMediaFile(file);
                    setMediaPreview(URL.createObjectURL(file));
                }
            };
            video.src = URL.createObjectURL(file);
        } else if (file.type.startsWith('image/')) {
            setMediaType('image');
            setMediaFile(file);
            setMediaPreview(URL.createObjectURL(file));
        }
    };

    const sendAudioMessage = async (audioBlob: Blob) => {
        if (!currentUser || !conversationId || !otherUser) return;
        
        setIsUploading(true);
        setUploadError('');
      
        const conversationRef = doc(db, 'conversations', conversationId);
        const messagesRef = collection(conversationRef, 'messages');
      
        try {
            const uploadRef = storageRef(storage, `chat_audio/${conversationId}/${Date.now()}.webm`);
            await uploadBytes(uploadRef, audioBlob);
            const audioUrl = await getDownloadURL(uploadRef);
    
            const messageData: any = {
                senderId: currentUser.uid,
                text: '',
                timestamp: serverTimestamp(),
                mediaUrl: audioUrl,
                mediaType: 'audio',
            };
    
            const conversationSnap = await getDoc(conversationRef);
            const currentData = conversationSnap.data();
            let newStreak = currentData?.crystal?.streak || 1;
    
            const lastMessageUpdate: any = {
                text: '',
                senderId: currentUser.uid,
                timestamp: serverTimestamp(),
                mediaType: 'audio',
            };
    
            const batch = writeBatch(db);
            const newMessageRef = doc(messagesRef);
            batch.set(newMessageRef, messageData);
            batch.update(conversationRef, { 
                lastMessage: lastMessageUpdate, 
                timestamp: serverTimestamp(),
                'crystal.lastInteractionAt': serverTimestamp(),
                'crystal.level': 'BRILHANTE',
                'crystal.streak': newStreak
            });

            await batch.commit();
        } catch (error) {
            console.error("Error sending audio message:", error);
            setUploadError(t('messages.media.uploadError'));
        } finally {
            setIsUploading(false);
        }
    };

    const handleStartRecording = async () => {
        if (isRecording) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                sendAudioMessage(audioBlob);
                stream.getTracks().forEach(track => track.stop()); // Stop microphone
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            recordingTimerRef.current = window.setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error("Error starting recording:", error);
            setUploadError(t('messages.recordingError'));
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
            setIsRecording(false);
            setRecordingTime(0);
        }
    };

    const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if ((newMessage.trim() === '' && !mediaFile) || !currentUser || !conversationId || !otherUser) return;
        
        setIsUploading(true);
        setUploadError('');

        const tempMessageText = newMessage;
        const tempReplyingTo = replyingTo;
        const tempMediaFile = mediaFile;
        const tempMediaType = mediaType;
        
        setNewMessage('');
        setReplyingTo(null);
        handleClearMedia();

        const conversationRef = doc(db, 'conversations', conversationId);
        const messagesRef = collection(conversationRef, 'messages');

        try {
            const messageData: any = {
                senderId: currentUser.uid,
                text: tempMessageText,
                timestamp: serverTimestamp(),
            };

            if (tempReplyingTo) {
                 messageData.replyTo = {
                    messageId: tempReplyingTo.id,
                    senderId: tempReplyingTo.senderId,
                    senderUsername: tempReplyingTo.senderId === currentUser.uid 
                        ? (currentUser.displayName || t('common.you'))
                        : (otherUser?.username || t('common.user')),
                    text: tempReplyingTo.text,
                };
            }

            if (tempMediaFile && tempMediaType) {
                const uploadRef = storageRef(storage, `chat_media/${conversationId}/${Date.now()}-${tempMediaFile.name}`);
                await uploadBytes(uploadRef, tempMediaFile);
                const mediaUrl = await getDownloadURL(uploadRef);
                messageData.mediaUrl = mediaUrl;
                messageData.mediaType = tempMediaType;
            }

            const conversationSnap = await getDoc(conversationRef);
            const currentData = conversationSnap.data();
            
            let crystalUpdate: { [key: string]: any } = {};
            
            if (currentData?.crystal && currentData.crystal.lastInteractionAt) {
                const lastInteractionDate = currentData.crystal.lastInteractionAt.toDate();
                const now = new Date();
                let newStreak = currentData.crystal.streak;

                const isToday = (d: Date) => {
                    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
                };
                const isYesterday = (d: Date) => {
                    const yesterday = new Date(now);
                    yesterday.setDate(now.getDate() - 1);
                    return d.getFullYear() === yesterday.getFullYear() && d.getMonth() === yesterday.getMonth() && d.getDate() === yesterday.getDate();
                };
                
                if (isYesterday(lastInteractionDate)) {
                    newStreak++;
                } else if (!isToday(lastInteractionDate)) {
                    newStreak = 1;
                }
                
                crystalUpdate = {
                    'crystal.lastInteractionAt': serverTimestamp(),
                    'crystal.streak': newStreak
                };
            } else {
                crystalUpdate = {
                    crystal: {
                        createdAt: serverTimestamp(),
                        lastInteractionAt: serverTimestamp(),
                        level: 'APAGADO', // Start as inactive
                        streak: 1
                    }
                };
            }

            const lastMessageUpdate: any = {
                text: tempMessageText,
                senderId: currentUser.uid,
                timestamp: serverTimestamp(),
            };
            
            if (tempMediaType) {
                lastMessageUpdate.mediaType = tempMediaType;
            }
            
            const batch = writeBatch(db);
            const newMessageRef = doc(messagesRef);
            batch.set(newMessageRef, messageData);
            batch.update(conversationRef, { lastMessage: lastMessageUpdate, timestamp: serverTimestamp(), ...crystalUpdate });

            await batch.commit();

        } catch (error) {
            console.error("Error sending message:", error);
            setUploadError(t('messages.media.uploadError'));
            setNewMessage(tempMessageText);
            setReplyingTo(tempReplyingTo);
            setMediaFile(tempMediaFile);
            setMediaType(tempMediaType);
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleDeleteMessage = async () => {
        if (!showDeleteConfirm.messageId || !conversationId) return;
        
        const messageIdToDelete = showDeleteConfirm.messageId;
        setShowDeleteConfirm({ open: false, messageId: null });

        const messageRef = doc(db, 'conversations', conversationId, 'messages', messageIdToDelete);
        const conversationRef = doc(db, 'conversations', conversationId);

        try {
            await deleteDoc(messageRef);

            const messagesQuery = query(collection(db, 'conversations', conversationId, 'messages'), orderBy('timestamp', 'desc'), limit(1));
            const lastMessageSnap = await getDocs(messagesQuery);

            let lastMessageUpdate: any = {};
            if (lastMessageSnap.empty) {
                lastMessageUpdate = { lastMessage: null };
            } else {
                const lastMessage = lastMessageSnap.docs[0].data();
                lastMessageUpdate = {
                    lastMessage: {
                        text: lastMessage.text,
                        senderId: lastMessage.senderId,
                        timestamp: lastMessage.timestamp,
                        mediaType: lastMessage.mediaType || null,
                    }
                };
            }
            await updateDoc(conversationRef, lastMessageUpdate);

        } catch (error) {
            console.error("Error deleting message:", error);
        }
    };

    const getCrystalStatusText = (level: CrystalLevel) => {
        const statuses: Record<CrystalLevel, string> = {
            BRILHANTE: t('crystal.level.brilhante'),
            EQUILIBRADO: t('crystal.level.equilibrado'),
            APAGADO: t('crystal.level.apagado'),
            RACHADO: t('crystal.level.rachado'),
        };
        return statuses[level] || '';
    }

    const lastSentMessageIndex = messages.map(m => m.senderId).lastIndexOf(currentUser?.uid);
    let shouldShowSeen = false;
    if (lastSentMessageIndex !== -1 && otherUser && conversationData) {
        const lastSentMessage = messages[lastSentMessageIndex];
        const otherUserInfo = conversationData.participantInfo[otherUser.id];
        if (otherUserInfo?.lastSeenMessageTimestamp && lastSentMessage.timestamp?.seconds <= otherUserInfo.lastSeenMessageTimestamp.seconds) {
            shouldShowSeen = true;
        }
    }


    if (loading) {
        return <div className="h-full flex items-center justify-center">{t('messages.loading')}</div>;
    }
    
    if (!conversationId) {
         return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <svg aria-label="Direct" className="w-24 h-24 text-zinc-800 dark:text-zinc-200" fill="currentColor" height="96" role="img" viewBox="0 0 96 96" width="96"><path d="M48 0C21.534 0 0 21.534 0 48s21.534 48 48 48 48-21.534 48-48S74.466 0 48 0Zm0 91.5C24.087 91.5 4.5 71.913 4.5 48S24.087 4.5 48 4.5 91.5 24.087 91.5 48 71.913 91.5 48 91.5Zm16.5-54.498L33.91 56.41l-10.46-10.46a4.5 4.5 0 0 0-6.364 6.364l13.642 13.64a4.5 4.5 0 0 0 6.364 0L70.864 43.37a4.5 4.5 0 0 0-6.364-6.368Z"></path></svg>
                <h2 className="text-2xl mt-4">{t('messages.yourMessages')}</h2>
                <p className="text-zinc-500 dark:text-zinc-400 mt-2">{t('messages.sendPrivate')}</p>
            </div>
        );
    }


    return (
        <div className="flex flex-col h-full relative" ref={dialogRef}>
            {otherUser && (
                <header className="flex items-center gap-3 p-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                    <button onClick={onBack} aria-label={t('messages.back')}>
                       <BackArrowIcon className="w-6 h-6" />
                    </button>
                    <div className="relative">
                        <img src={otherUser.avatar} alt={otherUser.username} className="w-10 h-10 rounded-full object-cover" />
                        {isOtherUserOnline && <OnlineIndicator className="bottom-0 right-0 h-3 w-3" />}
                    </div>
                    <div className="flex-grow">
                        <p className="font-semibold">{otherUser.username}</p>
                        {crystalData && (
                            <button 
                                onClick={() => setIsStreakModalOpen(true)} 
                                className="rounded-md -ml-1 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                title={t('crystal.title', { status: getCrystalStatusText(crystalData.level) })}
                            >
                                <div 
                                    ref={crystalHeaderRef} 
                                    className={`flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 transition-opacity duration-300 ${animationState !== 'idle' ? 'opacity-0' : 'opacity-100'}`} 
                                >
                                    <ConnectionCrystal level={crystalData.level} className="w-4 h-4" />
                                    <span>{getCrystalStatusText(crystalData.level)}</span>
                                    {crystalData.streak > 1 && (
                                        <span title={t('crystal.streak', { streak: crystalData.streak })}>🔥 {crystalData.streak}</span>
                                    )}
                                </div>
                            </button>
                        )}
                    </div>
                    <div ref={callDropdownRef} className="ml-auto relative">
                        <button 
                            onClick={() => setIsCallDropdownOpen(prev => !prev)}
                            disabled={!!activeCall}
                            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t('call.call')}
                        >
                            <CallIcon className="w-6 h-6" />
                        </button>
                        {isCallDropdownOpen && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-950 rounded-md shadow-lg border border-zinc-200 dark:border-zinc-800 z-20 py-1">
                                <button 
                                    disabled // Video call not implemented
                                    className="w-full flex items-center gap-3 text-left px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <VideoIcon className="w-5 h-5" />
                                    <span>{t('call.videoCall')}</span>
                                </button>
                                <button 
                                    onClick={() => {
                                        if (otherUser) {
                                            startCall(otherUser);
                                        }
                                        setIsCallDropdownOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 text-left px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                >
                                    <CallIcon className="w-5 h-5" />
                                    <span>{t('call.voiceCall')}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </header>
            )}
            <div className="flex-grow py-4 px-2 overflow-y-auto">
                <div className="flex flex-col gap-1">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex items-end group gap-2 ${msg.senderId === currentUser?.uid ? 'self-end flex-row-reverse' : 'self-start'}`}>
                            <div className={`max-w-xs md:max-w-md lg:max-w-lg rounded-2xl overflow-hidden ${
                                msg.mediaType === 'forwarded_post' ? '' :
                                (msg.senderId === currentUser?.uid 
                                ? 'bg-sky-500 text-white' 
                                : 'bg-zinc-200 dark:bg-zinc-800')
                            }`}>
                                {msg.replyTo && (
                                    <div className={`p-2 mx-2 mt-2 rounded-lg truncate ${
                                        msg.senderId === currentUser?.uid
                                        ? 'bg-sky-400 border-l-2 border-sky-200'
                                        : 'bg-zinc-300 dark:bg-zinc-700 border-l-2 border-zinc-400 dark:border-zinc-500'
                                    }`}>
                                        <p className="font-semibold text-xs">{msg.replyTo.senderUsername}</p>
                                        <p className="text-sm opacity-90">{msg.replyTo.text}</p>
                                    </div>
                                )}
                                {msg.mediaType === 'forwarded_post' && msg.forwardedPostData ? (
                                    <ForwardedPost content={msg.forwardedPostData} />
                                ) : msg.mediaType === 'audio' && msg.mediaUrl ? (
                                    <AudioPlayer src={msg.mediaUrl} />
                                ) : msg.mediaUrl ? (
                                    <div className="p-1 cursor-pointer" onClick={() => setViewingMedia({url: msg.mediaUrl!, type: msg.mediaType! as 'image' | 'video'})}>
                                        {msg.mediaType === 'image' ? (
                                            <img src={msg.mediaUrl} alt={t('messages.media.viewMedia')} className="w-full h-auto max-h-80 object-cover rounded-md" />
                                        ) : (
                                            <video src={msg.mediaUrl} className="w-full h-auto max-h-80 rounded-md" controls />
                                        )}
                                    </div>
                                ) : null}

                                {msg.text && (
                                    <p className="text-sm break-words px-4 py-2">{msg.text}</p>
                                )}
                            </div>
                    
                            <div className="flex-shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => setReplyingTo(msg)}
                                    className="p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                    aria-label="Reply to message"
                                >
                                    <ReplyIcon className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                                </button>
                                {msg.senderId === currentUser?.uid && (
                                    <button 
                                        onClick={() => setShowDeleteConfirm({ open: true, messageId: msg.id })}
                                        className="p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                        aria-label="Delete message"
                                    >
                                        <TrashIcon className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {shouldShowSeen && (
                         <div className="flex justify-end pr-12">
                             <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('messages.seen')}</p>
                         </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                 {mediaPreview && (
                    <div className="relative w-24 h-24 mb-2 p-1 border border-zinc-300 dark:border-zinc-700 rounded-lg">
                        {mediaType === 'image' ? (
                            <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover rounded" />
                        ) : (
                            <video src={mediaPreview} className="w-full h-full object-cover rounded" />
                        )}
                        <button 
                            onClick={handleClearMedia} 
                            className="absolute -top-2 -right-2 bg-zinc-700 text-white rounded-full p-0.5"
                            aria-label={t('messages.media.cancelUpload')}
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
                {uploadError && <p className="text-red-500 text-xs mb-2">{uploadError}</p>}
                {replyingTo && currentUser && (
                    <div className="bg-zinc-100 dark:bg-zinc-900 p-2 rounded-t-lg mb-[-8px] border-l-4 border-sky-500 relative mx-1">
                        <div className="flex justify-between items-center">
                            <p className="text-xs font-semibold text-sky-500">
                                {replyingTo.senderId === currentUser.uid
                                    ? t('messages.replyingToSelf')
                                    : t('messages.replyingToOther', { username: otherUser?.username || '...' })}
                            </p>
                             <button onClick={() => setReplyingTo(null)} className="p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                            {replyingTo.text}
                        </p>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    {isRecording ? (
                        <div className="flex items-center justify-between w-full bg-zinc-100 dark:bg-zinc-900 rounded-full px-4 py-2">
                            <div className="flex items-center gap-2 text-red-500">
                                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                                <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
                                <span className="text-sm hidden sm:inline">{t('messages.recording')}</span>
                            </div>
                            <button type="button" onClick={handleStopRecording} className="text-sky-500 font-semibold text-sm px-2">
                                {t('messages.send')}
                            </button>
                        </div>
                    ) : (
                        <>
                             <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,video/*" className="hidden" />
                             <button 
                                type="button" 
                                onClick={() => fileInputRef.current?.click()} 
                                disabled={isUploading}
                                className="p-1 text-zinc-500 dark:text-zinc-400 hover:text-sky-500 dark:hover:text-sky-400"
                                aria-label={t('messages.media.select')}
                            >
                                <PlusCircleIcon className="w-7 h-7" />
                            </button>
                             <input 
                                ref={inputRef}
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={t('messages.messagePlaceholder')}
                                disabled={isUploading}
                                className={`w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 py-2 pl-4 pr-4 text-sm focus:outline-none focus:border-sky-500 ${replyingTo || mediaPreview ? 'rounded-b-full rounded-t-none' : 'rounded-full'}`}
                            />
                            { (newMessage.trim() || mediaFile) ? (
                                <button 
                                    type="submit" 
                                    disabled={isUploading} 
                                    className="text-sky-500 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed px-2"
                                >
                                    {isUploading ? <Spinner /> : t('messages.send')}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleStartRecording}
                                    disabled={isUploading}
                                    className="p-1 text-zinc-500 dark:text-zinc-400 hover:text-sky-500 dark:hover:text-sky-400 disabled:opacity-50"
                                    aria-label="Record voice message"
                                >
                                    <MicrophoneIcon className="w-7 h-7" />
                                </button>
                            )}
                        </>
                    )}
                </form>
            </div>
            {showDeleteConfirm.open && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60]"
                    onClick={() => setShowDeleteConfirm({ open: false, messageId: null })}
                >
                    <div className="bg-white dark:bg-black rounded-lg shadow-xl p-6 w-full max-w-sm text-center"
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-semibold mb-2">{t('messages.deleteTitle')}</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                            {t('messages.deleteBody')}
                        </p>
                        <div className="flex justify-center gap-4">
                            <button 
                                onClick={() => setShowDeleteConfirm({ open: false, messageId: null })}
                                className="px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 font-semibold"
                            >
                                {t('common.cancel')}
                            </button>
                            <button 
                                onClick={handleDeleteMessage}
                                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold"
                            >
                                {t('common.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {viewingMedia && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-[70]" onClick={() => setViewingMedia(null)}>
                    <div className="relative w-full h-full p-4 md:p-8 flex items-center justify-center">
                        <button onClick={() => setViewingMedia(null)} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 z-10">
                            <XIcon className="w-6 h-6" />
                        </button>
                        {viewingMedia.type === 'image' ? (
                            <img src={viewingMedia.url} alt={t('messages.media.viewMedia')} className="max-w-full max-h-full object-contain" />
                        ) : (
                            <video src={viewingMedia.url} controls autoPlay className="max-w-full max-h-full" />
                        )}
                    </div>
                </div>
            )}
            {animationState !== 'idle' && (
                <div className="absolute inset-0 bg-black bg-opacity-30 z-10 flex flex-col justify-center items-center pointer-events-none">
                    <div
                        onTransitionEnd={() => {
                            if (animationState === 'settling') {
                                setAnimationState('idle');
                            }
                        }}
                        className="absolute transition-all duration-1000 ease-in-out"
                        style={
                            animationState === 'forming'
                            ? {
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '96px', // w-24
                                height: '96px', // h-24
                            }
                            : { // 'settling'
                                top: `${finalCrystalPos.top}px`,
                                left: `${finalCrystalPos.left}px`,
                                width: `${finalCrystalPos.width}px`,
                                height: `${finalCrystalPos.height}px`,
                                transform: 'translate(0, 0)',
                            }
                        }
                    >
                        <ConnectionCrystal level="BRILHANTE" className="w-full h-full" />
                    </div>
                    <p
                        className="text-white text-lg font-semibold mt-40 transition-opacity duration-500"
                        style={{
                            opacity: animationState === 'forming' ? 1 : 0,
                            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        }}
                    >
                        {animationMessage}
                    </p>
                </div>
            )}
            {otherUser && crystalData && currentUser && (
                <ConnectionStreakShareModal
                    isOpen={isStreakModalOpen}
                    onClose={() => setIsStreakModalOpen(false)}
                    crystalData={crystalData}
                    currentUser={currentUser}
                    otherUser={otherUser}
                    onPulseCreated={() => {
                        setIsStreakModalOpen(false);
                    }}
                />
            )}
        </div>
    );
};

export default ChatWindow;