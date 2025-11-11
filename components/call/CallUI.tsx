import React, { useEffect, useRef } from 'react';
import { useCall } from '../../context/CallContext';
import { useLanguage } from '../../context/LanguageContext';
import Button from '../common/Button';
import { auth } from '../../firebase';

const CallTimer: React.FC = () => {
    const [seconds, setSeconds] = React.useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setSeconds(s => s + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const secs = (totalSeconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    return <p className="text-sm text-zinc-400">{formatTime(seconds)}</p>;
};

const ErrorUI: React.FC<{ error: string, onDismiss: () => void }> = ({ error, onDismiss }) => {
    const { t } = useLanguage();
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[100]" aria-modal="true" role="dialog">
            <div className="bg-zinc-900 text-white rounded-lg shadow-xl w-full max-w-sm p-6 border border-zinc-700 text-center">
                <h3 className="text-xl font-semibold text-red-500">{t('call.callError')}</h3>
                <p className="text-sm text-zinc-400 mt-2">{t(error) || t('call.callError')}</p>
                <Button onClick={onDismiss} className="w-full mt-10">{t('common.cancel')}</Button>
            </div>
        </div>
    );
}

const CallUI: React.FC = () => {
    const { activeCall, localStream, remoteStream, hangUp, answerCall, declineCall, error } = useCall();
    const { t } = useLanguage();
    
    const localAudioRef = useRef<HTMLAudioElement>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (localStream && localAudioRef.current) {
            localAudioRef.current.srcObject = localStream;
        }
        if (remoteStream && remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
        }
    }, [localStream, remoteStream]);

    useEffect(() => {
        if (activeCall && ['ended', 'declined', 'cancelled'].includes(activeCall.status)) {
            const timer = setTimeout(() => {
                hangUp(true); // cleanup only
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [activeCall, hangUp]);


    if (!activeCall && !error) return null;

    if (error) {
        return <ErrorUI error={error} onDismiss={() => hangUp(true)} />;
    }
    
    if (!activeCall) return null;

    const otherUser = activeCall.receiver.id === auth.currentUser?.uid ? activeCall.caller : activeCall.receiver;

    const renderContent = () => {
        switch (activeCall.status) {
            case 'ringing-outgoing':
                return (
                    <div className="text-center">
                        <img src={otherUser.avatar} alt={otherUser.username} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-zinc-700 animate-pulse" />
                        <h3 className="text-xl font-semibold">{t('call.calling', { username: otherUser.username })}</h3>
                        <p className="text-sm text-zinc-400 mt-2">{t('call.callInProgress')}</p>
                        <Button onClick={() => hangUp()} className="w-full mt-10 !bg-red-600 hover:!bg-red-700">{t('call.hangUp')}</Button>
                    </div>
                );
            case 'ringing-incoming':
                return (
                    <div className="text-center">
                        <img src={otherUser.avatar} alt={otherUser.username} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-zinc-700 animate-pulse" />
                        <h3 className="text-xl font-semibold">{t('call.incomingCall', { username: otherUser.username })}</h3>
                        <div className="mt-6 grid grid-cols-2 gap-4">
                            <Button onClick={declineCall} className="!bg-red-600 hover:!bg-red-700">{t('call.decline')}</Button>
                            <Button onClick={answerCall} className="!bg-green-600 hover:!bg-green-700">{t('call.answer')}</Button>
                        </div>
                    </div>
                );
            case 'connected':
                return (
                     <div className="text-center">
                        <img src={otherUser.avatar} alt={otherUser.username} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-green-500" />
                        <h3 className="text-xl font-semibold">{t('call.onCallWith', { username: otherUser.username })}</h3>
                        <CallTimer />
                        <Button onClick={() => hangUp()} className="w-full mt-10 !bg-red-600 hover:!bg-red-700">{t('call.hangUp')}</Button>
                    </div>
                );
            case 'ended':
                return (
                    <div className="text-center">
                         <img src={otherUser.avatar} alt={otherUser.username} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-zinc-700" />
                        <h3 className="text-xl font-semibold">{t('call.callEnded')}</h3>
                    </div>
                );
            case 'declined':
                 return (
                    <div className="text-center">
                         <img src={otherUser.avatar} alt={otherUser.username} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-zinc-700" />
                        <h3 className="text-xl font-semibold">{t('call.callDeclined', { username: otherUser.username })}</h3>
                    </div>
                );
            case 'cancelled':
                return (
                     <div className="text-center">
                        <img src={otherUser.avatar} alt={otherUser.username} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-zinc-700" />
                        <h3 className="text-xl font-semibold">{t('call.callCancelled')}</h3>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[100]" aria-modal="true" role="dialog">
            <div className="bg-zinc-900 text-white rounded-lg shadow-xl w-full max-w-sm p-6 border border-zinc-700">
                {renderContent()}
            </div>
            {/* Audio elements for WebRTC streams */}
            <audio ref={localAudioRef} autoPlay muted playsInline></audio>
            <audio ref={remoteAudioRef} autoPlay playsInline></audio>
        </div>
    );
};

export default CallUI;