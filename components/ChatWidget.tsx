
import React, { useRef, useEffect, useState } from 'react';
import { MessageSquare, Send, Sparkles, X, Minimize2, Maximize2, Bot, Hash } from 'lucide-react';
import { ChatMessage, Team } from '../types';

interface ChatWidgetProps {
  messages: ChatMessage[];
  onSend: (text: string, channelId: string) => void;
  isAiEnabled: boolean;
  onToggleAi: () => void;
  mode: 'embedded' | 'floating';
  currentHostId?: string;
  isTyping?: boolean;
  teams?: Team[]; // Optional, used by Host to see team channels
}

const ChatWidget: React.FC<ChatWidgetProps> = ({
  messages,
  onSend,
  isAiEnabled,
  onToggleAi,
  mode,
  currentHostId,
  isTyping = false,
  teams = []
}) => {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false); // Only for floating mode
  const [activeChannelId, setActiveChannelId] = useState('lobby'); // 'lobby' or team ID
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter messages based on active channel
  const filteredMessages = messages.filter(m => 
    // Backward compatibility: if no channelId, assume lobby
    (m.channelId || 'lobby') === activeChannelId
  );

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredMessages, isOpen, isTyping, activeChannelId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input.trim(), activeChannelId);
    setInput('');
  };

  const TypingIndicator = () => (
    <div className="flex flex-col items-end animate-fade-in">
      <div className="bg-gradient-to-br from-trae-purple/80 to-trae-accent/80 text-white rounded-xl rounded-br-none px-3 py-2 text-xs shadow-sm border border-white/10 flex items-center gap-1">
        <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-[10px] text-gray-500 mt-0.5 px-1 flex items-center gap-1">
         <Sparkles className="w-2 h-2 text-trae-accent" />
         AI Host is typing...
      </span>
    </div>
  );

  // Embedded Mode (Inside ParticipantInput - Usually for Setup/Lobby only)
  if (mode === 'embedded') {
    return (
      <div className="flex flex-col h-[320px] bg-white/5 rounded-lg border border-white/5 overflow-hidden">
        <div className="p-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-trae-blue" />
            <span className="text-xs font-medium text-gray-300">Live Chat / 实时互动</span>
          </div>
          <button
            onClick={onToggleAi}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border transition-all ${
              isAiEnabled 
                ? 'bg-trae-purple/20 border-trae-purple text-trae-purple shadow-[0_0_10px_rgba(124,58,237,0.3)]' 
                : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300'
            }`}
            title="Enable AI Auto-Reply"
          >
            <Bot className="w-3 h-3" />
            <span>AI Host: {isAiEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
        
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin bg-black/20">
          {filteredMessages.length === 0 && !isTyping && (
            <div className="text-center mt-10 text-gray-600 text-xs space-y-1">
              <p>Waiting for messages...</p>
              <p>暂无消息...</p>
            </div>
          )}
          {filteredMessages.map((msg) => {
             if (msg.isSystem) {
                 return (
                     <div key={msg.id} className="w-full flex justify-center my-2">
                         <span className="px-2 py-1 rounded-full bg-white/5 text-[10px] text-gray-500 italic border border-white/5">
                             {msg.text}
                         </span>
                     </div>
                 );
             }
             return (
                <div key={msg.id} className={`flex flex-col ${msg.isHost || msg.isAi ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-lg text-xs shadow-sm whitespace-pre-wrap leading-relaxed ${
                    msg.isAi
                    ? 'bg-gradient-to-br from-trae-purple/80 to-trae-accent/80 text-white rounded-br-none border border-white/10'
                    : msg.isHost 
                        ? 'bg-trae-purple text-white rounded-br-none' 
                        : 'bg-gray-700 text-gray-200 rounded-bl-none'
                }`}>
                    {msg.text}
                </div>
                <span className="text-[10px] text-gray-500 mt-0.5 px-1 flex items-center gap-1">
                    {msg.isAi && <Sparkles className="w-2 h-2 text-trae-accent" />}
                    {msg.sender}
                </span>
                </div>
             );
          })}
          {isTyping && <TypingIndicator />}
        </div>

        <form onSubmit={handleSubmit} className="p-2 border-t border-white/5 bg-white/5 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send message as Host..."
            className="flex-1 bg-black/20 border-none rounded px-2 py-1.5 text-xs text-white focus:ring-1 focus:ring-trae-blue placeholder-gray-600"
          />
          <button 
            type="submit" 
            disabled={!input.trim()}
            className="p-1.5 bg-trae-blue text-white rounded hover:bg-trae-blue/80 disabled:opacity-50 transition-colors"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>
    );
  }

  // Floating Mode (For Results Page - Host View)
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end pointer-events-none">
      {/* Chat Window */}
      <div 
        className={`
          pointer-events-auto bg-[#0A0A0B] border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-bottom-right flex flex-col
          ${isOpen ? 'w-80 h-[500px] opacity-100 scale-100 mb-4' : 'w-0 h-0 opacity-0 scale-90 mb-0'}
        `}
      >
        {/* Header */}
        <div className="p-3 bg-white/5 border-b border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-bold text-white">Live Chat</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                    onClick={onToggleAi}
                    className={`p-1.5 rounded-md transition-colors ${
                        isAiEnabled ? 'bg-trae-purple/20 text-trae-purple' : 'text-gray-500 hover:text-gray-300'
                    }`}
                    title="Toggle AI Host"
                    >
                    <Bot className="w-4 h-4" />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">
                    <Minimize2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Channel Selector (Only if teams exist) */}
            {teams.length > 0 && (
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
                    <button
                        onClick={() => setActiveChannelId('lobby')}
                        className={`px-2 py-1 rounded text-[10px] whitespace-nowrap transition-colors ${
                            activeChannelId === 'lobby' 
                            ? 'bg-white text-black font-bold' 
                            : 'bg-white/5 text-gray-400 hover:text-white'
                        }`}
                    >
                        Lobby
                    </button>
                    {teams.map((team, idx) => (
                        <button
                            key={team.id}
                            onClick={() => setActiveChannelId(team.id)}
                            className={`px-2 py-1 rounded text-[10px] whitespace-nowrap transition-colors flex items-center gap-1 ${
                                activeChannelId === team.id
                                ? 'bg-trae-purple text-white font-bold' 
                                : 'bg-white/5 text-gray-400 hover:text-white'
                            }`}
                        >
                            <span>{team.mascotEmoji}</span>
                            <span>T{idx + 1}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin bg-black/40">
          {filteredMessages.length === 0 && !isTyping && (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 text-xs">
               <MessageSquare className="w-8 h-8 mb-2 opacity-20" />
               <p>Channel is quiet...</p>
            </div>
          )}
          {filteredMessages.map((msg) => {
             if (msg.isSystem) {
                 return (
                     <div key={msg.id} className="w-full flex justify-center my-2">
                         <span className="px-2 py-1 rounded-full bg-white/5 text-[10px] text-gray-500 italic border border-white/5">
                             {msg.text}
                         </span>
                     </div>
                 );
             }
             return (
                <div key={msg.id} className={`flex flex-col ${msg.isHost || msg.isAi ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs shadow-sm whitespace-pre-wrap leading-relaxed ${
                    msg.isAi
                    ? 'bg-gradient-to-r from-trae-purple to-trae-accent text-white rounded-br-none'
                    : msg.isHost 
                        ? 'bg-trae-purple text-white rounded-br-none' 
                        : 'bg-white/10 text-gray-200 rounded-bl-none'
                }`}>
                    {msg.text}
                </div>
                <span className="text-[10px] text-gray-500 mt-1 px-1 flex items-center gap-1">
                    {msg.isAi && <Sparkles className="w-2 h-2 text-trae-accent" />}
                    {msg.sender}
                </span>
                </div>
             );
          })}
          {isTyping && activeChannelId === 'lobby' && <TypingIndicator />} 
          {/* Note: currently AI only types in lobby unless triggered explicitly in team channel logic */}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 bg-white/5 border-t border-white/5 flex gap-2 flex-col">
          {teams.length > 0 && (
              <div className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  Sending to: <span className="text-white font-medium">{activeChannelId === 'lobby' ? 'Lobby (All)' : teams.find(t => t.id === activeChannelId)?.name || 'Team Channel'}</span>
              </div>
          )}
          <div className="flex gap-2">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Message ${activeChannelId === 'lobby' ? 'everyone' : 'team'}...`}
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-trae-purple outline-none"
            />
            <button 
                type="submit" 
                disabled={!input.trim()}
                className="p-2 bg-trae-purple text-white rounded-lg hover:bg-trae-purple/80 disabled:opacity-50 transition-colors"
            >
                <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          pointer-events-auto w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110
          ${isOpen ? 'bg-white/10 text-white rotate-90' : 'bg-gradient-to-r from-trae-purple to-trae-blue text-white'}
        `}
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
        {!isOpen && messages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-black" />
        )}
      </button>
    </div>
  );
};

export default ChatWidget;
