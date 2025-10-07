import React, { useState, useEffect, useCallback } from 'react';
import { type ChatMessage, type Dataset } from '../types';
import ChatBubble from './ChatBubble';
import SuggestedQuestions from './SuggestedQuestions';
import { startChatSession, generateChatResponse, clearChatSession } from '../services/geminiService';
import { SendIcon, SparklesIcon } from './icons/Icons';

interface ChatInterfaceProps {
  dataset: Dataset | null;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  chatContainerRef: React.RefObject<HTMLDivElement>;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ dataset, messages, setMessages, chatContainerRef }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const scrollToBottom = () => {
    if(chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(scrollToBottom, [messages]);
  
  const handleStartChat = useCallback(async () => {
    if (!dataset) return;
    setIsLoading(true);
    setMessages([]);
    setSuggestions([]);
    try {
      const { content, suggestions } = await startChatSession(dataset);
      setMessages([
        {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: content,
        },
      ]);
      setSuggestions(suggestions);
    } catch (error) {
      console.error('Falha ao iniciar a sessão de chat:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
      setMessages([
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: [{ type: 'error', text: `Desculpe, não consegui analisar o conjunto de dados.\n\n**Detalhe:** ${errorMessage}` }],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [dataset, setMessages]);

  useEffect(() => {
    if (dataset) {
        handleStartChat();
    }
    // Cleanup function to clear the session when the component unmounts
    // (e.g., when a new dataset is loaded and the component key changes)
    return () => {
      clearChatSession();
    };
  }, [dataset, handleStartChat]);

  const handleSubmit = async (prompt?: string) => {
    const userMessageText = prompt || input;
    if (!userMessageText.trim() || isLoading || !dataset) return;

    setSuggestions([]);
    const newUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: [{ type: 'text', text: userMessageText }],
    };
    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { content, suggestions } = await generateChatResponse(userMessageText, dataset);
      const newAssistantMessage: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: content,
      };
      setMessages(prev => [...prev, newAssistantMessage]);
      setSuggestions(suggestions);
    } catch (error) {
      console.error('Falha ao obter resposta do chat:', error);
      const errorMessageText = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: [{ type: 'error', text: `Desculpe, algo deu errado.\n\n**Detalhe:** ${errorMessageText}` }],
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-secondary-background overflow-hidden">
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && !isLoading && !dataset && (
          <div className="text-center text-gray-500 pt-20">
            <SparklesIcon className="mx-auto h-16 w-16 text-gray-300" />
            <h2 className="mt-4 text-2xl font-semibold">Bem-vindo ao Agente EDA</h2>
            <p className="mt-2">Envie um arquivo CSV para iniciar sua análise.</p>
          </div>
        )}
        {messages.map(msg => <ChatBubble key={msg.id} message={msg} />)}
        {isLoading && <ChatBubble message={{ id: 'loading', role: 'assistant', content: [] }} isLoading={true} />}
      </div>
      <div className="p-4 bg-background/80 backdrop-blur-sm border-t border-border-color">
         {!isLoading && <SuggestedQuestions questions={suggestions} onQuestionClick={handleSubmit} />}
        <div className="relative">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={dataset ? 'Pergunte algo sobre seus dados...' : 'Por favor, envie um conjunto de dados primeiro'}
            className="w-full pl-4 pr-12 py-3 bg-secondary-background rounded-xl border border-border-color focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={1}
            disabled={!dataset || isLoading}
            aria-label="Caixa de entrada de bate-papo"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!dataset || isLoading || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-primary text-white disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            aria-label="Enviar mensagem"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;