import React, { useState, useEffect, StrictMode, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, doc, updateDoc, serverTimestamp, collection, query, where, onSnapshot, getDoc } from './firebase';
import Login from './components/Login';
import SignUp from './context/SignUp';
import Feed from './components/Feed';
import { LanguageProvider } from './context/LanguageContext';
import { CallProvider, useCall } from './context/CallContext';
import WelcomeAnimation from './components/feed/WelcomeAnimation';
import Toast from './components/common/Toast';
import CallUI from './components/call/CallUI';

declare global {
  interface Window {
    OneSignal: any;
    OneSignalDeferred?: any[];
    oneSignalListenerAttached?: boolean;
  }
}

const AppContent: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [authPage, setAuthPage] = useState<'login' | 'signup'>('login');
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const prevUser = useRef<any | null>(null);
  const { setIncomingCall, activeCall } = useCall();

  useEffect(() => {
    const welcomeKey = 'hasSeenWelcome_Vibe';
    const hasSeen = localStorage.getItem(welcomeKey);
    if (!hasSeen) {
      setShowWelcomeAnimation(true);
      localStorage.setItem(welcomeKey, 'true');
    }
  }, []);

  useEffect(() => {
    const requestMicrophonePermission = async () => {
      // Check if the Permissions API is supported for a more robust request flow.
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        try {
          // Check for permission status first.
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          
          // Only prompt if the user hasn't made a decision yet ('prompt' state).
          // This avoids repeatedly asking a user who has already denied permission.
          if (permissionStatus.state === 'prompt') {
            console.log("Microphone permission state is 'prompt'. Requesting access on app load.");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Permission granted. Stop the track as we don't need to use the stream now.
            stream.getTracks().forEach(track => track.stop());
            console.log("Microphone permission granted on load.");
          } else {
              console.log(`Microphone permission status is '${permissionStatus.state}'. No prompt will be shown on load.`);
          }
  
          // Listen for future changes in permission status.
          permissionStatus.onchange = () => {
            console.log(`Microphone permission status changed to: ${permissionStatus.state}`);
          };
  
        } catch (err: any) {
          console.warn("Could not query microphone permission on load:", err.message);
        }
      } else {
        // Fallback for environments without the Permissions API.
        console.warn("Permissions API not supported. Falling back to direct getUserMedia request on load.");
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                stream.getTracks().forEach(track => track.stop());
            })
            .catch(err => {
                // This might fail silently in some webviews if permissions aren't configured correctly.
                console.warn("Direct getUserMedia request on load failed:", err.message);
            });
      }
    };

    requestMicrophonePermission();
  }, []); // The empty dependency array ensures this runs only once when the component mounts.

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && !prevUser.current) {
        setToastMessage(`Seja bem-vindo(a) ao Vibe`);
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 3000); 
      }
      prevUser.current = currentUser;
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  // Listener for incoming calls
  useEffect(() => {
    if (!user || activeCall) return;

    const callsRef = collection(db, 'calls');
    const q = query(callsRef, where('receiverId', '==', user.uid), where('status', '==', 'ringing'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            const callDoc = snapshot.docs[0];
            const callData = callDoc.data();
            setIncomingCall({ callId: callDoc.id, ...callData });
        }
    });

    return () => unsubscribe();
  }, [user, activeCall, setIncomingCall]);

  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);

    const updateUserLastSeen = () => {
        updateDoc(userDocRef, {
            lastSeen: serverTimestamp()
        }).catch(err => console.error("Failed to update last seen:", err));
    };

    updateUserLastSeen();

    const intervalId = setInterval(updateUserLastSeen, 5 * 60 * 1000); // every 5 minutes

    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            updateUserLastSeen();
        }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', updateUserLastSeen);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', updateUserLastSeen);
    };
}, [user]);

useEffect(() => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {

        // Attach listener for subscription changes only once.
        if (!window.oneSignalListenerAttached) {
            window.oneSignalListenerAttached = true;
            OneSignal.User.PushSubscription.addEventListener('change', (subscriptionChangeEvent: any) => {
                console.log("OneSignal Push Subscription state changed.");
                // Using event.current.id is correct for v16.
                // It can be null if the user unsubscribes.
                const newSubscriptionId = subscriptionChangeEvent.current.id;

                // Log only the ID, not the whole event object, to prevent circular reference errors.
                console.log("Novo ID de push:", newSubscriptionId);

                const currentUser = auth.currentUser;
                // Only update Firestore if a user is logged in at the time of the change.
                if (currentUser) {
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    updateDoc(userDocRef, { oneSignalPlayerId: newSubscriptionId || null })
                        .catch(error => console.error("Failed to update OneSignal Player ID in Firestore:", error));
                }
            });
        }

        if (user) {
            // USER LOGGED IN
            console.log(`OneSignal: Logging into OneSignal with user ID: ${user.uid}`);
            await OneSignal.login(user.uid);

            // This will prompt the user for notifications if not already subscribed
            await OneSignal.registerForPushNotifications();

            // Sync current subscription ID to Firestore immediately if it exists
            const subscriptionId = OneSignal.User.PushSubscription.id;
            if (subscriptionId) {
                const userDocRef = doc(db, 'users', user.uid);
                try {
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists() && userDoc.data().oneSignalPlayerId !== subscriptionId) {
                       await updateDoc(userDocRef, { oneSignalPlayerId: subscriptionId });
                       console.log("OneSignal: Synced subscription ID to Firestore:", subscriptionId);
                    }
                } catch(e) {
                    console.error("Error checking/updating OneSignal playerId on user doc", e);
                }
            }
        } else {
            // USER LOGGED OUT
            // The isLoggedIn check is deprecated in v16. `logout` can be called safely without checking.
            console.log("OneSignal: User logged out from Firebase. Logging out of OneSignal if applicable.");
            await OneSignal.logout();
        }
    });
}, [user]);


  const switchAuthPage = (page: 'login' | 'signup') => {
    setAuthPage(page);
  };

  const renderApp = () => {
    if (loading) {
      return (
        <div className="bg-zinc-50 dark:bg-black min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-500"></div>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="bg-zinc-50 dark:bg-black font-sans text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col">
          <main className="flex-grow flex items-center justify-center py-10 px-4">
            {authPage === 'login' ? (
              <Login onSwitchMode={() => switchAuthPage('signup')} />
            ) : (
              <SignUp onSwitchMode={() => switchAuthPage('login')} />
            )}
          </main>
        </div>
      );
    }

    return (
      <div className="bg-zinc-50 dark:bg-black font-sans text-zinc-900 dark:text-zinc-100 min-h-screen">
        <Feed />
      </div>
    );
  };

  return (
    <>
      {showWelcomeAnimation && (
        <WelcomeAnimation onAnimationEnd={() => setShowWelcomeAnimation(false)} />
      )}
      <Toast message={toastMessage} show={showToast} />
      <CallUI />
      {renderApp()}
    </>
  );
};

const App: React.FC = () => (
  <StrictMode>
    <LanguageProvider>
        <CallProvider>
            <AppContent />
        </CallProvider>
    </LanguageProvider>
  </StrictMode>
);


export default App;
