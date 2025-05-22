import React from 'react';
import { ChatMessage as ChatMessageType, Sender } from '../types';
import { BrainIcon, UserIcon, InfoIcon } from './IconComponents';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === Sender.USER;
  const isAI = message.sender === Sender.AI;
  const isSystem = message.sender === Sender.SYSTEM;

  let messageClass = 'shadow-sm border ';
  let iconBgClass = '';
  let iconColor = 'text-white';
  let textColor = 'text-gray-700';

  if (isUser) {
    messageClass += 'bg-blue-500 self-end';
    iconBgClass = 'bg-blue-600';
    textColor = 'text-white';
  } else if (isAI) {
    messageClass += 'bg-gray-100 border-gray-200 self-start';
    iconBgClass = 'ai-assistant-gradient'; // Using the gradient for AI icon
    textColor = 'text-gray-800';
  } else { // System message
    messageClass += 'bg-gray-50 border-gray-200 self-center text-xs italic w-full md:w-3/4 text-center';
    textColor = 'text-gray-500';
  }

  const Icon = isUser ? UserIcon : isAI ? BrainIcon : InfoIcon;

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : isSystem ? 'justify-center' : 'justify-start'}`}>
      <div className={`flex items-start max-w-xl lg:max-w-2xl p-3 rounded-lg ${messageClass}`}>
        {!isSystem && (
          <div className={`mr-2 p-1.5 rounded-full ${iconBgClass} flex-shrink-0`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
        )}
         {isSystem && <InfoIcon className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />}
        <p className={`text-sm whitespace-pre-wrap ${textColor}`}>{message.text}</p>
      </div>
    </div>
  );
};

export default ChatMessage;