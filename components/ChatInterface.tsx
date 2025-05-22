import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType, DatasetInfo } from '../types';
import ChatMessage from './ChatMessage';
import LoadingSpinner from './LoadingSpinner';
import { SendIcon, BrainIcon } from './IconComponents';
import { MAX_CONTEXT_DISPLAY_LENGTH } from '../constants';

interface ChatInterfaceProps {
  datasetInfo: DatasetInfo;
  messages: ChatMessageType[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onReset: () => void; // Renamed for clarity, will clear chat
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ datasetInfo, messages, onSendMessage, isLoading, onReset }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const displayedContext = datasetInfo.content.length > MAX_CONTEXT_DISPLAY_LENGTH 
    ? datasetInfo.content.substring(0, MAX_CONTEXT_DISPLAY_LENGTH) + "..." 
    : datasetInfo.content;

  return (
    <div className="flex flex-col h-screen max-h-[calc(100vh-6rem)] sm:max-h-[calc(100vh-7rem)] w-full max-w-3xl mx-auto bg-white shadow-2xl rounded-none sm:rounded-xl overflow-hidden border-x sm:border-y border-gray-200 my-0 sm:my-4">
      <header className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-2 rounded-full ai-assistant-gradient mr-3">
              <BrainIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-800">AI Assistant: {datasetInfo.topicName}</h1>
              <p className="text-xs text-gray-500">Knowledge Source: {datasetInfo.fileName}</p>
            </div>
          </div>
          <button
            onClick={onReset} // This will now clear chat
            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Clear Chat
          </button>
        </div>
         <details className="mt-2 text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-blue-600 font-medium">View Context Snippet</summary>
            <pre className="mt-1 p-2 bg-gray-100 border border-gray-200 rounded custom-scrollbar max-h-20 overflow-y-auto text-gray-600 text-[0.7rem]">
              {displayedContext || "No context loaded."}
            </pre>
        </details>
      </header>

      <main className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 bg-white">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && messages[messages.length-1]?.sender === 'user' && (
          <div className="flex justify-start">
             <div className="flex items-center max-w-md p-3 rounded-lg shadow-sm bg-gray-100 border border-gray-200">
                <div className="p-1.5 rounded-full bg-blue-500 mr-2">
                    <BrainIcon className="w-4 h-4 text-white" />
                </div>
                <LoadingSpinner size="w-5 h-5" />
                <span className="ml-2 text-sm text-gray-600">AI is thinking...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-3 sm:p-4 bg-gray-50 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2 sm:space-x-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Ask about ${datasetInfo.topicName}...`}
            className="flex-1 px-4 py-2.5 text-gray-800 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow placeholder-gray-400"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            aria-label="Send message"
            className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </footer>
    </div>
  );
};

export default ChatInterface;