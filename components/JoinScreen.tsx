
import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { Send, CheckCircle2, AlertCircle, Terminal, Loader2, MessageSquare, Users } from 'lucide-react';
import Background from './Background';
import { Team } from '../types';
import { PEER_CONFIG } from '../services/peerConfig'; // Import Config

interface JoinScreenProps {
  hostId: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  isHost: boolean;
  timestamp: number;
  channelId?: string;
  isSystem?: boolean;
}

const JoinScreen: React.FC<JoinScreenProps> = ({ hostId }) => {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'connecting' | 'connected' | 'submitting' | 'success' | 'error'>('connecting');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [activeChannelId, setActiveChannelId] = useState('lobby');
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<any>(null);
  const peerInitTimeoutRef = useRef<any>(null);
  
  // Refs for state access inside event listeners
  const nameRef = useRef(name);

  // Sync name ref
  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  // Derived
  const filteredMessages = chatMessages.filter(m => (m.channelId || 'lobby') === activeChannelId);
  const STORAGE_KEY = `trae_client_session_${hostId}`;

  // 1. Load Session Logic
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(STORAGE_KEY);
      if (savedSession) {
        const session = JSON.parse(savedSession);
        if (session.name) setName(session.name);
        if (session.chatMessages) setChatMessages(session.chatMessages);
        if (session.myTeam) {
            setMyTeam(session.myTeam);
            setActiveChannelId(session.myTeam.id); 
        }
      }
    } catch (e) {
      console.error("Failed to load session", e);
    }
  }, [hostId, STORAGE_KEY]);

  // 2. Save Session Logic
  useEffect(() => {
    if (name) {
      try {
        const session = {
            name,
            chatMessages,
            myTeam,
            timestamp: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } catch (e) {
        console.warn("Failed to save session", e);
      }
    }
  }, [name, chatMessages, myTeam, hostId, STORAGE_KEY]);

  const initPeer = () => {
    if (!hostId) {
        setStatus('error');
        setErrorMsg('Missing Host ID / 缺少主机 ID');
        return;
    }

    // Clean up existing if retrying
    if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
    }

    console.log("Initializing Peer with optimized config...");
    const peer = new Peer(PEER_CONFIG);
    peerRef.current = peer;

    // Connection Timeout Watchdog (8s)
    if (peerInitTimeoutRef.current) clearTimeout(peerInitTimeoutRef.current);
    peerInitTimeoutRef.current = setTimeout(() => {
        if (peer && !peer.id && !peer.destroyed) {
            console.warn("Peer init timeout. Retrying...");
            setErrorMsg("Loading slow... Retrying connection...");
            initPeer(); // Retry
        }
    }, 8000);

    peer.on('open', (id) => {
        console.log('My Peer ID:', id);
        if (peerInitTimeoutRef.current) clearTimeout(peerInitTimeoutRef.current);
        
        const conn = peer.connect(hostId, { reliable: true });
        
        conn.on('open', () => {
            console.log('Connected to host');
            connRef.current = conn;

            // Auto-Rejoin Logic
            if (nameRef.current) {
                console.log("Auto-rejoining as", nameRef.current);
                conn.send({ type: 'join', name: nameRef.current });
                setStatus('success');
            } else {
                setStatus('connected');
            }
        });

        conn.on('data', (data: any) => {
            // Handle Chat
            if (data && data.type === 'chat') {
                setChatMessages(prev => {
                    if (prev.some(m => m.id === data.id)) return prev;
                    return [...prev, {
                        id: data.id,
                        sender: data.sender,
                        text: data.text,
                        isHost: data.isHost,
                        timestamp: data.timestamp,
                        channelId: data.channelId || 'lobby',
                        isSystem: data.isSystem
                    }];
                });
            }
            
            // Handle Team Assignment
            if (data && data.type === 'team_assignment') {
                console.log("Assigned to team:", data.teamInfo);
                setMyTeam(data.teamInfo);
                setActiveChannelId(data.teamId);
                
                setChatMessages(prev => [...prev, {
                    id: Date.now().toString() + Math.random(),
                    sender: 'System',
                    text: `You joined team ${data.teamName}. / 你加入了 ${data.teamName}.`,
                    isHost: false,
                    timestamp: Date.now(),
                    channelId: data.teamId,
                    isSystem: true
                }]);
            }
            
            // Handle History Sync
            if (data && data.type === 'chat_history') {
                console.log("Syncing history:", data.history.length, "messages");
                setChatMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const newMsgs = data.history.filter((m: ChatMessage) => !existingIds.has(m.id));
                    return [...prev, ...newMsgs].sort((a, b) => a.timestamp - b.timestamp);
                });
            }
        });

        conn.on('error', (err) => {
            console.error('Connection error:', err);
            if (!connRef.current || !connRef.current.open) {
                if (status !== 'success') {
                    // Silent retry for connection issues
                    console.warn("Silent retry due to connection error");
                }
            }
        });

        conn.on('close', () => {
            setTimeout(() => {
                if (!connRef.current || !connRef.current.open) {
                    // Don't show error screen immediately, try to reconnect
                    console.warn('Host disconnected.');
                }
            }, 2000);
        });
    });
    
    // Auto-Reconnect logic
    peer.on('disconnected', () => {
        console.log('Connection to PeerServer lost.');
        if (peer && !peer.destroyed && peer.disconnected) {
             console.log('Attempting to reconnect...');
             peer.reconnect();
        }
    });

    peer.on('error', (err) => {
        // Suppress "Lost connection to server" console error spam
        if (err.type === 'network' || err.message === 'Lost connection to server') {
            console.log('PeerJS network hiccup. Checking reconnection...');
            if (peer && !peer.destroyed && peer.disconnected) {
                peer.reconnect();
            }
            return; 
        }

        console.error('Peer error:', err);
        
        if (err.type !== 'disconnected' && err.type !== 'peer-unavailable') {
            if (status !== 'success') {
                setStatus('error');
                setErrorMsg('Network error. Retrying...');
                setTimeout(initPeer, 3000); // Retry after 3s
            }
        }
    });
  };

  useEffect(() => {
    initPeer();
    return () => {
      if (peerInitTimeoutRef.current) clearTimeout(peerInitTimeoutRef.current);
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    };
  }, [hostId]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [filteredMessages, activeChannelId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !connRef.current) return;

    setStatus('submitting');
    
    try {
      connRef.current.send({ 
        type: 'join', 
        name: name.trim() 
      });
      setTimeout(() => {
        setStatus('success');
      }, 500);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg('Failed to send name. / 发送失败。');
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !connRef.current) return;

    const myName = name.trim() || 'Guest';
    const msg: ChatMessage = {
      id: Date.now().toString(),
      sender: myName,
      text: chatInput.trim(),
      isHost: false,
      timestamp: Date.now(),
      channelId: activeChannelId
    };

    // Optimistic update
    setChatMessages(prev => [...prev, msg]);

    try {
        connRef.current.send({ ...msg, type: 'chat' });
    } catch(e) { console.warn("Send failed", e); }
    
    setChatInput('');
  };

  const handleReset = () => {
    if (window.confirm("Start as a new user? This will clear current session. / 以新用户身份开始？这将清除当前会话。")) {
        setStatus('connected');
        setName('');
        setChatMessages([]);
        setMyTeam(null);
        try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
        window.location.reload(); 
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-white font-sans">
      <Background />
      
      <div className="w-full max-w-md space-y-8 animate-fade-in-up">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Terminal className="w-8 h-8 text-trae-purple" />
            <h1 className="text-2xl font-display font-bold">Trae Join</h1>
          </div>
          <p className="text-gray-400 text-sm">Join the AI Coding Challenge</p>
        </div>

        <div className="bg-trae-card border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
          {status === 'connecting' && (
            <div className="flex flex-col items-center py-8 space-y-4">
              <Loader2 className="w-8 h-8 text-trae-blue animate-spin" />
              <p className="text-gray-400">Connecting to host... / 连接中...</p>
              {errorMsg && <p className="text-xs text-yellow-400 animate-pulse">{errorMsg}</p>}
            </div>
          )}

          {(status === 'connected' || status === 'submitting') && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Your Name / 你的名字</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-trae-purple focus:border-transparent transition-all"
                  placeholder="Enter name (e.g. Alice)"
                  autoFocus
                  required
                />
              </div>
              <button
                type="submit"
                disabled={status === 'submitting' || !name.trim()}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-trae-purple to-trae-blue text-white font-bold text-lg shadow-lg hover:shadow-trae-purple/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {status === 'submitting' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {status === 'submitting' ? 'Sending...' : 'Join / 加入'}
              </button>
            </form>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center py-8 space-y-4 animate-fade-in">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-xl font-bold text-white">You're in!</h3>
                <p className="text-gray-400">Connected as <span className="text-white font-bold">{name}</span><br/>已连接。</p>
              </div>
              <button
                onClick={handleReset}
                className="mt-2 px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 transition-colors"
              >
                Sign out / 退出
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center py-8 space-y-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <div className="text-center text-red-400">
                <p>{errorMsg}</p>
              </div>
              <button
                onClick={() => initPeer()} // Retry manually
                className="px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300"
              >
                Retry / 重试
              </button>
            </div>
          )}

          {/* CHAT SECTION (Always visible if connected/success) */}
          {(status === 'success') && (
            <div className="mt-8 pt-6 border-t border-white/10">
              {/* ... Chat UI remains same ... */}
              <div className="flex items-center gap-4 mb-3">
                  <button 
                    onClick={() => setActiveChannelId('lobby')}
                    className={`flex items-center gap-2 text-sm font-medium pb-1 border-b-2 transition-colors ${activeChannelId === 'lobby' ? 'text-white border-trae-blue' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                  >
                      <MessageSquare className="w-4 h-4" />
                      Lobby
                  </button>
                  {myTeam && (
                      <button 
                        onClick={() => setActiveChannelId(myTeam.id)}
                        className={`flex items-center gap-2 text-sm font-medium pb-1 border-b-2 transition-colors ${activeChannelId === myTeam.id ? 'text-trae-purple border-trae-purple' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                      >
                          <Users className="w-4 h-4" />
                          {myTeam.name}
                      </button>
                  )}
              </div>
              
              <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden relative">
                {/* Team Motto Banner */}
                {activeChannelId !== 'lobby' && myTeam && (
                    <div className="absolute top-0 left-0 right-0 bg-trae-purple/10 p-1.5 text-[10px] text-center text-trae-purple font-mono border-b border-trae-purple/20 backdrop-blur-sm z-10">
                        "{myTeam.motto}"
                    </div>
                )}

                <div 
                  ref={chatScrollRef}
                  className={`h-48 overflow-y-auto p-3 space-y-3 scrollbar-thin whitespace-pre-wrap ${activeChannelId !== 'lobby' ? 'pt-8' : ''}`}
                >
                  {filteredMessages.length === 0 && (
                    <div className="text-center mt-12">
                        {activeChannelId === 'lobby' ? (
                            <p className="text-xs text-gray-600">Say hello to the host!<br/>跟大家打个招呼吧！</p>
                        ) : (
                            <p className="text-xs text-trae-purple/70">Start collaborating!<br/>开始协作吧！</p>
                        )}
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
                        <div key={msg.id} className={`flex flex-col ${msg.sender === (name || 'Guest') ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm shadow-sm leading-relaxed ${
                            msg.isHost 
                            ? 'bg-trae-purple text-white rounded-bl-none border border-trae-purple'
                            : msg.sender === (name || 'Guest')
                                ? 'bg-trae-blue text-white rounded-br-none'
                                : 'bg-gray-700 text-gray-200 rounded-bl-none'
                        }`}>
                            {msg.text}
                        </div>
                        <span className="text-[10px] text-gray-500 mt-1 px-1">
                            {msg.isHost ? 'Host' : msg.sender}
                        </span>
                        </div>
                     );
                  })}
                </div>
                
                <form onSubmit={handleSendChat} className="p-2 bg-white/5 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`Message ${activeChannelId === 'lobby' ? 'everyone' : 'team'}...`}
                    className="flex-1 bg-black/40 border-none rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-trae-blue"
                  />
                  <button 
                    type="submit" 
                    disabled={!chatInput.trim()}
                    className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
        
        <div className="text-center text-xs text-gray-600">
          Powered by Trae AI Matchmaker
        </div>
      </div>
    </div>
  );
};

export default JoinScreen;
