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
    window.OneSignal = window.OneSignal || [];
    const OneSignal = window.OneSignal;

    const syncOneSignalUser = async () => {
        await OneSignal.isInitialized;

        // Login/logout logic based on app's user state
        if (user) {
            // Check if OneSignal user is already set to this app user
            let currentOneSignalId = null;
            if (OneSignal.User && typeof OneSignal.User.getExternalId === 'function') {
                currentOneSignalId = OneSignal.User.getExternalId();
            }

            if (currentOneSignalId !== user.uid) {
                console.log(`Logging into OneSignal with external_id: ${user.uid}`);
                await OneSignal.login(user.uid);
            }
        } else {
            // Logout from OneSignal if app user is logged out
            if (OneSignal.User && typeof OneSignal.User.getExternalId === 'function') {
                const currentOneSignalId = OneSignal.User.getExternalId();
                if (currentOneSignalId) {
                    console.log("Logging out from OneSignal.");
                    await OneSignal.logout();
                }
            }
        }

        // Subscription management logic, only runs if user is logged in AND subscribed.
        if (user && OneSignal.User && OneSignal.User.PushSubscription) {
            // Attach listener for subscription changes only once
            if (!window.oneSignalListenerAttached) {
                window.oneSignalListenerAttached = true;
                OneSignal.User.PushSubscription.addEventListener('change', async (change: any) => {
                    const currentUser = auth.currentUser;
                    if (change.current.id && currentUser) {
                        console.log("OneSignal Push Subscription ID changed to:", change.current.id);
                        const userDocRef = doc(db, 'users', currentUser.uid);
                        try {
                            await updateDoc(userDocRef, { oneSignalPlayerId: change.current.id });
                        } catch (error) {
                            console.error("Failed to update OneSignal Player ID in Firestore:", error);
                        }
                    }
                });
            }

            // Sync current subscription ID to Firestore
            const currentSubscriptionId = OneSignal.User.PushSubscription.id;
            if (currentSubscriptionId) {
                const userDocRef = doc(db, 'users', user.uid);
                try {
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists() && userDoc.data().oneSignalPlayerId !== currentSubscriptionId) {
                       await updateDoc(userDocRef, { oneSignalPlayerId: currentSubscriptionId });
                    }
                } catch(e) {
                    console.error("Error checking/updating OneSignal playerId on user doc", e);
                }
            }
        } else if (user) {
            // This case handles when user is logged in but push is not enabled/supported
            console.warn("OneSignal User or PushSubscription not available. Cannot sync subscription ID.");
        }
    };

    OneSignal.push(syncOneSignalUser);
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