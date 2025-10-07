// Fix: Create ChatBubble component to render messages.
import React from 'react';
import { type ChatMessage, type ChatContent } from '../types';
import ChartRenderer from './ChartRenderer';
import { BotIcon, UserIcon } from './icons/Icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatBubbleProps {
  message: ChatMessage;
  isLoading?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isLoading = false }) => {
  const isAssistant = message.role === 'assistant';

  const renderContent = (contentItem: ChatContent, index: number) => {
    switch (contentItem.type) {
      case 'text':
        return <ReactMarkdown key={index} remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none text-white prose-p:text-white prose-li:text-white prose-strong:text-white">{contentItem.text}</ReactMarkdown>;
      case 'chart':
        return <ChartRenderer key={index} spec={contentItem.spec} data={contentItem.data} />;
      case 'error':
        return <p key={index} className="text-red-300">{contentItem.text}</p>;
      default:
        // Using JSON.stringify for debugging unknown content types
        return <pre key={index} className="text-xs">{JSON.stringify(contentItem, null, 2)}</pre>;
    }
  };
  
    const renderAssistantContent = (contentItem: ChatContent, index: number) => {
    switch (contentItem.type) {
      case 'text':
        return <ReactMarkdown key={index} remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">{contentItem.text}</ReactMarkdown>;
      case 'chart':
        return <ChartRenderer key={index} spec={contentItem.spec} data={contentItem.data} />;
      case 'error':
        return <p key={index} className="text-red-500">{contentItem.text}</p>;
      default:
        return null;
    }
  };

  const Icon = isAssistant ? BotIcon : UserIcon;
  
  return (
    <div className={`flex items-start gap-4 ${isAssistant ? '' : 'justify-end'}`}>
      {isAssistant && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      )}

      <div className={`w-full max-w-2xl space-y-4 p-4 rounded-xl ${
          isAssistant
            ? 'bg-background border border-border-color'
            : 'bg-primary text-white'
        }`}>
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        ) : (
          isAssistant ? message.content.map(renderAssistantContent) : message.content.map(renderContent)
        )}
      </div>

       {!isAssistant && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
      )}
    </div>
  );
};

export default ChatBubble;
