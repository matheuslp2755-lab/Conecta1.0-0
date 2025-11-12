import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
// FIX: Changed import path to be relative to the local firebase config file.
import { auth, db, doc, addDoc, collection, onSnapshot, updateDoc, getDoc } from '../../firebase';
import type { Unsubscribe } from 'firebase/firestore';

// WebRTC configuration - using public STUN servers
const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

type CallStatus = 'idle' | 'ringing-outgoing' | 'ringing-incoming' | 'connected' | 'ended' | 'declined' | 'cancelled';

interface UserInfo {
    id: string;
    username: string;
    avatar: string;
}

interface ActiveCall {
    callId: string;
    caller: UserInfo;
    receiver: UserInfo;
    status: CallStatus;
}

interface CallContextType {
    activeCall: ActiveCall | null;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    startCall: (receiver: UserInfo) => Promise<void>;
    answerCall: () => Promise<void>;
    hangUp: (isCleanupOnly?: boolean) => Promise<void>;
    declineCall: () => Promise<void>;
    setIncomingCall: (callData: any) => void;
    error: string | null;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    const pc = useRef<RTCPeerConnection | null>(null);
    
    const activeCallRef = useRef(activeCall);
    useEffect(() => {
        activeCallRef.current = activeCall;
    }, [activeCall]);


    const resetCallState = useCallback(() => {
        console.log("Resetting call state.");
        if (pc.current) {
            pc.current.onicecandidate = null;
            pc.current.ontrack = null;
            pc.current.onconnectionstatechange = null;
            pc.current.onsignalingstatechange = null;
            pc.current.close();
            pc.current = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        setRemoteStream(null);
        setActiveCall(null);
        setError(null);
    }, [localStream]);

    // Effect for managing Firestore listeners based on activeCall
    useEffect(() => {
        const currentUser = auth.currentUser;
        if (!activeCall?.callId || !pc.current || !currentUser) return;
        
        const callId = activeCall.callId;
        console.log(`Setting up Firestore listeners for call ${callId}`);
        const callDocRef = doc(db, 'calls', callId);
        
        const unsubs: Unsubscribe[] = [];

        // Listener for the main call document
        unsubs.push(onSnapshot(callDocRef, async (snapshot) => {
            const data = snapshot.data();
            console.log("Firestore listener: Call document updated.", data);
            
            if (!data) {
                console.log("Firestore listener: Call document deleted, resetting state.");
                resetCallState();
                return;
            };

            const status = data.status as CallStatus;

            // Handle call termination
            if (['ended', 'declined', 'cancelled'].includes(status) && activeCallRef.current?.status !== status) {
                 console.log(`Firestore listener: Call status changed to ${status}.`);
                 setActiveCall(prev => prev ? { ...prev, status } : null);
                 return;
            }
            
            // For caller: set remote description when answer is available
            if (data.answer && pc.current?.remoteDescription?.type !== 'answer') {
                try {
                    console.log("Firestore listener: Received answer, setting remote description.");
                    await pc.current.setRemoteDescription(new RTCSessionDescription(data.answer));
                    console.log("Firestore listener: Remote description (answer) set successfully.");
                } catch (e) {
                    console.error("Firestore listener: Error setting remote description.", e);
                }
            }
        }));
        
        // Listen for ICE candidates from the other party
        const isCaller = activeCall.caller.id === currentUser.uid;
        const candidatesCollectionName = isCaller ? 'receiverCandidates' : 'callerCandidates';
        const candidatesCollection = collection(db, 'calls', callId, candidatesCollectionName);
        console.log(`Listening for candidates in: ${candidatesCollectionName}`);
        
        unsubs.push(onSnapshot(candidatesCollection, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    console.log("Firestore listener: Received new ICE candidate.", change.doc.data());
                    const candidate = new RTCIceCandidate(change.doc.data());
                    pc.current?.addIceCandidate(candidate).catch(e => console.error("Firestore listener: Error adding received ICE candidate.", e));
                }
            });
        }));

        return () => {
            console.log(`Cleaning up Firestore listeners for call ${callId}`);
            unsubs.forEach(unsub => unsub());
        };
    }, [activeCall, resetCallState]);
    
    const setupPeerConnection = (stream: MediaStream, callId: string, isCaller: boolean) => {
        pc.current = new RTCPeerConnection(servers);
        console.log("Peer connection created.");
    
        stream.getTracks().forEach(track => pc.current?.addTrack(track, stream));
        console.log("Local stream tracks added to peer connection.");
    
        pc.current.onicecandidate = event => {
            if (event.candidate) {
                console.log("New ICE candidate found, sending to Firestore.", event.candidate);
                const candidatesCollection = collection(db, 'calls', callId, isCaller ? 'callerCandidates' : 'receiverCandidates');
                addDoc(candidatesCollection, event.candidate.toJSON());
            }
        };
    
        pc.current.ontrack = event => {
            console.log("Received remote track.");
            setRemoteStream(event.streams[0]);
        };
    
        pc.current.onconnectionstatechange = () => {
            if(pc.current) {
                 console.log(`Connection state change: ${pc.current.connectionState}`);
                 if (pc.current.connectionState === 'failed') {
                    setError("call.callError");
                 }
            }
        };
    
        pc.current.onsignalingstatechange = () => {
             if(pc.current) {
                console.log(`Signaling state change: ${pc.current.signalingState}`);
             }
        };
    };

    const startCall = async (receiver: UserInfo) => {
        const currentUser = auth.currentUser;
        console.log("startCall: Initiating call to", receiver.id, "from user:", currentUser?.uid);
        if (!currentUser || activeCallRef.current) {
            console.error("startCall: Aborted. Pre-conditions not met.", { hasUser: !!currentUser, hasActiveCall: !!activeCallRef.current });
            return;
        }
        setError(null);
        
        try {
            console.log("startCall: Requesting microphone access...");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("startCall: Microphone access granted.");
            setLocalStream(stream);
            
            const callDocRef = await addDoc(collection(db, 'calls'), {
                callerId: currentUser.uid,
                callerUsername: currentUser.displayName,
                callerAvatar: currentUser.photoURL,
                receiverId: receiver.id,
                receiverUsername: receiver.username,
                receiverAvatar: receiver.avatar,
                status: 'ringing',
            });
            const callId = callDocRef.id;
            console.log("startCall: Created call document in Firestore with ID:", callId);
            
            setupPeerConnection(stream, callId, true);
            
            if (!pc.current) throw new Error("Peer connection not initialized");

            const offerDescription = await pc.current.createOffer();
            console.log("startCall: Offer created.");
            await pc.current.setLocalDescription(offerDescription);
            console.log("startCall: Local description (offer) set.");

            await updateDoc(callDocRef, { offer: { sdp: offerDescription.sdp, type: offerDescription.type } });
            console.log("startCall: Offer sent to Firestore.");

            setActiveCall({
                callId,
                caller: { id: currentUser.uid, username: currentUser.displayName || '', avatar: currentUser.photoURL || '' },
                receiver,
                status: 'ringing-outgoing'
            });
        } catch (err) {
            console.error("startCall: Error during call initiation.", err);
            resetCallState();
            setError("call.noMicrophone");
        }
    };
    
    const setIncomingCall = (callData: any) => {
        setActiveCall({
            callId: callData.callId,
            caller: { id: callData.callerId, username: callData.callerUsername, avatar: callData.callerAvatar },
            receiver: { id: callData.receiverId, username: callData.receiverUsername, avatar: callData.receiverAvatar },
            status: 'ringing-incoming',
        });
    };

    const answerCall = async () => {
        const currentUser = auth.currentUser;
        const call = activeCallRef.current;
        console.log("answerCall: Answering call...", call?.callId);
        if (!currentUser || !call || call.status !== 'ringing-incoming') {
            console.error("answerCall: Aborted. Pre-conditions not met.", { hasUser: !!currentUser, call });
            return;
        }
        setError(null);
        
        try {
            const callId = call.callId;
            const callDocRef = doc(db, 'calls', callId);
            const callDocSnap = await getDoc(callDocRef);
            if (!callDocSnap.exists()) throw new Error("Call document not found.");
            
            const callData = callDocSnap.data();

            console.log("answerCall: Requesting microphone access...");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("answerCall: Microphone access granted.");
            setLocalStream(stream);

            setupPeerConnection(stream, callId, false);

            if (!pc.current) throw new Error("Peer connection not initialized");
            
            await pc.current.setRemoteDescription(new RTCSessionDescription(callData.offer));
            console.log("answerCall: Remote description (offer) set.");

            const answerDescription = await pc.current.createAnswer();
            console.log("answerCall: Answer created.");
            await pc.current.setLocalDescription(answerDescription);
            console.log("answerCall: Local description (answer) set.");

            await updateDoc(callDocRef, { answer: { sdp: answerDescription.sdp, type: answerDescription.type }, status: 'connected' });
            console.log("answerCall: Answer sent to Firestore.");
            
            setActiveCall(prev => prev ? ({ ...prev, status: 'connected' }) : null);

        } catch (err) {
            console.error("answerCall: Error during call answering.", err);
            resetCallState();
            setError("call.callError");
        }
    };
    
    const hangUp = useCallback(async (isCleanupOnly = false) => {
        const call = activeCallRef.current;
        console.log("hangUp called.", { callId: call?.callId, isCleanupOnly });
        if (call && !isCleanupOnly) {
            const callDocRef = doc(db, 'calls', call.callId);
            const callDoc = await getDoc(callDocRef);
            if(callDoc.exists() && !['ended', 'declined', 'cancelled'].includes(callDoc.data().status)) {
                let newStatus: CallStatus = 'ended';
                 if (call.status === 'ringing-outgoing') {
                    newStatus = 'cancelled';
                }
                await updateDoc(callDocRef, { status: newStatus });
            }
        }
        resetCallState();
    }, [resetCallState]);

    const declineCall = useCallback(async () => {
        const call = activeCallRef.current;
        console.log("declineCall called for call ID:", call?.callId);
        if(call) {
            const callDocRef = doc(db, 'calls', call.callId);
            await updateDoc(callDocRef, { status: 'declined' });
        }
        resetCallState();
    }, [resetCallState]);

    // Auto-hangup on window close
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (activeCallRef.current) {
                hangUp();
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hangUp]);

    const value = {
        activeCall,
        localStream,
        remoteStream,
        startCall,
        answerCall,
        hangUp,
        declineCall,
        setIncomingCall,
        error
    };

    return (
        <CallContext.Provider value={value}>
            {children}
        </CallContext.Provider>
    );
};

export const useCall = (): CallContextType => {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error('useCall must be used within a CallProvider');
    }
    return context;
};