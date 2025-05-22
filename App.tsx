
// Fix: Declare global window.google object for TypeScript to recognize Google Identity Services.
declare global {
  interface Window {
    google: any; // Consider using more specific types if available e.g. from @types/google.accounts
    onGoogleLibraryLoad: () => void; // Kept for type safety, though not defined by App.tsx anymore
    handleGoogleLoginResponse: (response: any) => void; // For HTML API button
    gsiScriptLoadedFromHtml?: boolean; // Flag set by inline script in index.html
  }
}

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChatInterface from './components/ChatInterface';
import { isApiKeyMissing, getAiResponse } from './services/geminiService';
import type { ChatMessage, DatasetInfo, User } from './types';
import { Sender } from './types';
import { WarningIcon, BrainIcon, GoogleIcon } from './components/IconComponents';
import { UNIVERSITY_OF_JHANG_PROSPECTUS_TEXT } from './dataset'; // Import the dataset

// --- Google Sign-In Setup ---
const GOOGLE_CLIENT_ID: string = "1016711069132-jeann07e4a96dq4gji6g12io38h0k8mc.apps.googleusercontent.com";
const PLACEHOLDER_GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
// --- End Google Sign-In Setup ---


const App: React.FC = () => {
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [datasetInfo, setDatasetInfo] = useState<DatasetInfo | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoadingAiResponse, setIsLoadingAiResponse] = useState<boolean>(false);
  const [appError, setAppError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isGoogleScriptLoaded, setIsGoogleScriptLoaded] = useState(false);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const googleSignInButtonRef = useRef<HTMLDivElement>(null);


  const preProcessProspectusText = (text: string): string => {
    let processedText = text;
    processedText = processedText.replace(/==Start of OCR for page \d+==/g, '');
    processedText = processedText.replace(/==End of OCR for page \d+==/g, '');
    processedText = processedText.replace(/^\d+ \| P a g e\s*$/gm, '');
    processedText = processedText.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n');
    processedText = processedText.replace(/\n\n+/g, '\n\n');
    return processedText.trim();
  };

  const fixedDatasetContent = preProcessProspectusText(UNIVERSITY_OF_JHANG_PROSPECTUS_TEXT);
  const fixedTopicName = "University of Jhang";
  const fixedFileName = "University_of_Jhang_Prospectus_2024.txt";

  const handleGoogleLoginCb = useCallback((response: any) => {
    if (response.credential) {
      try {
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const userData = JSON.parse(jsonPayload);
        setCurrentUser({
          id: userData.sub,
          name: userData.name,
          email: userData.email,
          picture: userData.picture,
        });
        setAuthError(null); 
        setAppError(null); 
      } catch (error) {
        console.error("Error decoding JWT or setting user:", error);
        setAuthError("Failed to process your login information. Please try again.");
      }
    } else {
      console.error("Google login failed:", response);
      setAuthError("Google Sign-In failed. Please ensure pop-ups are allowed and try again.");
    }
  }, []);

  useEffect(() => {
    if (isGoogleScriptLoaded) return; 

    let loadCheckInterval: NodeJS.Timeout | null = null;

    const checkScriptAvailability = () => {
      if (window.gsiScriptLoadedFromHtml || (window.google?.accounts?.id)) {
        setIsGoogleScriptLoaded(true);
        if (loadCheckInterval) {
          clearInterval(loadCheckInterval);
        }
      }
    };
    checkScriptAvailability();
    if (!isGoogleScriptLoaded && !window.gsiScriptLoadedFromHtml && !window.google?.accounts?.id) {
      loadCheckInterval = setInterval(checkScriptAvailability, 100);
    }
    return () => {
      if (loadCheckInterval) {
        clearInterval(loadCheckInterval);
      }
    };
  }, [isGoogleScriptLoaded]);

  useEffect(() => {
    if (!isGoogleScriptLoaded) {
      return; 
    }
    window.handleGoogleLoginResponse = handleGoogleLoginCb;

    if (GOOGLE_CLIENT_ID === PLACEHOLDER_GOOGLE_CLIENT_ID) {
      setAuthError("Google Client ID is not configured. Please update it in the application code.");
      setIsAuthInitialized(true);
      return;
    }

    try {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleLoginCb, 
        });
        setIsAuthInitialized(true);
      } else {
        setAuthError("Google Sign-In library not fully available for initialization.");
        setIsAuthInitialized(true);
      }
    } catch (error) {
      console.error("Error initializing Google Sign-In:", error);
      setAuthError("Could not initialize Google Sign-In. Please try refreshing the page.");
      setIsAuthInitialized(true); 
    }
    return () => {
      // @ts-ignore
      delete window.handleGoogleLoginResponse;
    };
  }, [isGoogleScriptLoaded, GOOGLE_CLIENT_ID, handleGoogleLoginCb]);

  // Effect to render the Google Sign-In button
  useEffect(() => {
    if (isAuthInitialized && !currentUser && window.google?.accounts?.id && googleSignInButtonRef.current) {
      // Clear any previous button in case of re-renders
      googleSignInButtonRef.current.innerHTML = '';
      try {
        window.google.accounts.id.renderButton(
          googleSignInButtonRef.current,
          { // Configuration options for the button
            type: "standard",
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "rectangular",
            logo_alignment: "left",
          }
        );
      } catch (renderError) {
        console.error("Error rendering Google Sign-In button:", renderError);
        setAuthError("Failed to display Google Sign-In button. Check console for details.");
      }
    }
  }, [isAuthInitialized, currentUser, isGoogleScriptLoaded]); // Dependencies ensure this runs when needed


  useEffect(() => {
    if (isApiKeyMissing()) {
      setApiKeyError("Gemini API key is missing or invalid. Please ensure the API_KEY environment variable is correctly set. The application cannot function without it.");
    }
  }, []);

  const setupChatForLoggedInUser = useCallback(() => {
    const info: DatasetInfo = {
      fileName: fixedFileName,
      content: fixedDatasetContent,
      topicName: fixedTopicName,
    };
    setDatasetInfo(info);
    setChatMessages([]);
    setAppError(null);
    
    const welcomeMessage: ChatMessage = {
      id: crypto.randomUUID(),
      text: `Hello! I'm the AI assistant for "${info.topicName}". How can I assist you today?`,
      sender: Sender.AI,
      timestamp: Date.now(),
    };
    setChatMessages([welcomeMessage]);
  }, [fixedDatasetContent, fixedFileName, fixedTopicName]);
  
  useEffect(() => {
    if (currentUser) {
      setupChatForLoggedInUser();
    }
  }, [currentUser, setupChatForLoggedInUser]);

  const handleGoogleSignOut = () => {
    setCurrentUser(null);
    setDatasetInfo(null);
    setChatMessages([]);
    setAuthError(null);
    if (typeof window.google !== 'undefined' && window.google.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
      // Optionally, revoke the token if you have it stored, but not strictly necessary for sign out.
      // window.google.accounts.id.revoke(user.email, done => { console.log('consent revoked'); });
    }
  };

  const handleSendMessage = useCallback(async (userText: string) => {
    if (!datasetInfo) {
      setAppError("Dataset not loaded. Cannot send message.");
      return;
    }

    const newUserMessage: ChatMessage = {
      id: crypto.randomUUID(),
      text: userText,
      sender: Sender.USER,
      timestamp: Date.now(),
    };
    setChatMessages(prev => [...prev, newUserMessage]);
    setIsLoadingAiResponse(true);
    setAppError(null);

    try {
      const aiText = await getAiResponse(datasetInfo, userText);
      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        text: aiText,
        sender: Sender.AI,
        timestamp: Date.now(),
      };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error getting AI response in App:", error);
      const errorMessageText = error instanceof Error ? error.message : "An unexpected error occurred.";
      const errorResponseMessage: ChatMessage = {
        id: crypto.randomUUID(),
        text: `Sorry, I encountered an error: ${errorMessageText}`,
        sender: Sender.AI,
        timestamp: Date.now(),
      };
      setChatMessages(prev => [...prev, errorResponseMessage]);
      setAppError(`Failed to get AI response: ${errorMessageText}`);
    } finally {
      setIsLoadingAiResponse(false);
    }
  }, [datasetInfo]);

  const handleResetChat = useCallback(() => {
    setChatMessages([]);
    setIsLoadingAiResponse(false);
    setAppError(null);
    if (datasetInfo) {
       const welcomeMessage: ChatMessage = {
        id: crypto.randomUUID(),
        text: `Hello! I'm the AI assistant for "${datasetInfo.topicName}". How can I assist you today?`,
        sender: Sender.AI,
        timestamp: Date.now(),
      };
      setChatMessages([welcomeMessage]);
    }
  }, [datasetInfo]);

  if (apiKeyError) { 
     return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-2xl text-center border border-gray-200">
          <WarningIcon className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Configuration Error</h1>
          <p className="text-gray-600">{apiKeyError}</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthInitialized || !isGoogleScriptLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Initializing Authentication...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-xs sm:max-w-sm p-8 bg-white rounded-xl shadow-2xl text-center border border-gray-200">
          <div className="inline-block p-3 rounded-full ai-assistant-gradient mb-4">
             <BrainIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Welcome to the AI Assistant</h1>
          <p className="text-sm text-gray-600 mb-6">Sign in with Google to chat with the University of Jhang AI assistant.</p>
          
          {authError && <p className="mb-4 text-sm text-red-600">{authError}</p>}

          {/* This div is for Google's HTML API to initialize One Tap & auto-prompt features */}
          <div id="g_id_onload"
            data-client_id={GOOGLE_CLIENT_ID}
            data-callback="handleGoogleLoginResponse" 
            data-auto_prompt="false" // Set to true if you want Google One Tap UI
            style={{ display: 'none' }} // Hide if not using One Tap UI directly here
          ></div>

          {/* This div is the explicit target for the standard Sign-In button */}
          <div ref={googleSignInButtonRef} className="flex justify-center"></div>
          
           {GOOGLE_CLIENT_ID === PLACEHOLDER_GOOGLE_CLIENT_ID && (
             <p className="mt-4 text-red-500 text-xs">Google Sign-In is pending configuration by the administrator.</p>
           )}
        </div>
      </div>
    );
  }
  
  if (appError && !datasetInfo) {
     return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-2xl text-center border border-gray-200">
          <WarningIcon className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Application Error</h1>
          <p className="text-gray-600">{appError}</p>
           <button 
            onClick={handleGoogleSignOut}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Sign Out & Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-100 pt-0 pb-4 px-0">
       {currentUser && datasetInfo && (
         <header className="w-full bg-white shadow-md p-3 mb-0 sticky top-0 z-10 border-b border-gray-200">
          <div className="max-w-3xl mx-auto flex justify-between items-center">
            <div className="flex items-center">
              {currentUser.picture && <img src={currentUser.picture} alt="User" className="w-8 h-8 rounded-full mr-2"/>}
              <span className="text-sm text-gray-700 font-medium">Welcome, {currentUser.name}!</span>
            </div>
            <button
              onClick={handleGoogleSignOut}
              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-100 hover:bg-red-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            >
              Sign Out
            </button>
          </div>
        </header>
       )}

      {datasetInfo ? (
        <ChatInterface
          datasetInfo={datasetInfo}
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          isLoading={isLoadingAiResponse}
          onReset={handleResetChat} 
        />
      ) : (
        <div className="min-h-[calc(100vh-100px)] flex items-center justify-center">
          { currentUser ?
            <p className="text-gray-600">Loading University of Jhang Assistant...</p> :
            <p className="text-gray-600">Please sign in to continue.</p>
          }
        </div>
      )}

      {appError && datasetInfo && (
        <div className="fixed bottom-4 right-4 max-w-sm p-4 bg-red-600 text-white rounded-lg shadow-xl z-50 flex items-center">
          <WarningIcon className="w-5 h-5 mr-3 shrink-0"/>
          <span className="text-sm">{appError}</span>
          <button onClick={() => setAppError(null)} className="ml-auto text-red-100 hover:text-white text-xl leading-none">&times;</button>
        </div>
      )}
       <footer className="w-full max-w-3xl mx-auto text-center text-xs text-gray-500 mt-4 pb-2">
        <p>&copy; {new Date().getFullYear()} AI Topic Assistant. Powered by Gemini.</p>
        <p>AI responses are generated based on the provided information and may not always be perfect.</p>
      </footer>
    </div>
  );
};

export default App;
