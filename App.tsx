
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MatchingStatus, Participant, Team, ChatMessage, TaskItem, SavedMatch } from './types';
import { enrichTeamsWithGemini, generateTeamAnnouncement, generateSingleTeamAnnouncement, generateAIChatResponse, generateAIProactiveMessage, generateUUID } from './services/geminiService';
import { PEER_CONFIG } from './services/peerConfig'; // Import Config
import ParticipantInput from './components/ParticipantInput';
import TeamCard from './components/TeamCard';
import Background from './components/Background';
import JoinScreen from './components/JoinScreen';
import ChatWidget from './components/ChatWidget';
import HistoryModal from './components/HistoryModal';
import { RefreshCw, ArrowLeft, Terminal, Save, Share2, AudioLines, Loader2, QrCode, X, Check, AlertCircle, Info, History, Square, Pause, Play } from 'lucide-react';
import Peer, { type DataConnection } from 'peerjs';

// Audio Decoding Utilities for Raw PCM
function decode(base64: string) {
  try {
    if (!base64) return new Uint8Array(0);
    // Sanitize input: remove whitespace/newlines which cause atob to fail
    const cleanBase64 = base64.replace(/\s/g, '');
    const binaryString = atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("Base64 decoding failed", e);
    return new Uint8Array(0);
  }
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  try {
      if (data.length === 0) {
        return ctx.createBuffer(numChannels, 1, sampleRate);
      }
      const dataInt16 = new Int16Array(data.buffer);
      const frameCount = dataInt16.length / numChannels;
      const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

      for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
          channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
      }
      return buffer;
  } catch (e) {
      console.error("Decode Audio Data Failed", e);
      return ctx.createBuffer(numChannels, 1, sampleRate);
  }
}

const base64EncodeUnicode = (str: string) => {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
      return String.fromCharCode(parseInt(p1, 16));
    })
  );
};

const base64DecodeUnicode = (str: string) => {
  return decodeURIComponent(
    Array.prototype.map
      .call(atob(str), function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join('')
  );
};

// Safe Storage Wrappers
const safeLocalStorage = {
  getItem: (key: string) => {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  },
  setItem: (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch (e) { console.warn('LocalStorage failed', e); }
  }
};

const safeSessionStorage = {
  getItem: (key: string) => {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  },
  setItem: (key: string, value: string) => {
    try { sessionStorage.setItem(key, value); } catch (e) { console.warn('SessionStorage failed', e); }
  }
};

const App: React.FC = () => {
  // --- Routing Check ---
  const [viewMode, setViewMode] = useState<'app' | 'join'>('app');
  const [joinHostId, setJoinHostId] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'join') {
      setViewMode('join');
      setJoinHostId(params.get('host') || '');
    }
  }, []);

  // --- App State ---
  const [rawInput, setRawInput] = useState<string>('');
  const [teamSize, setTeamSize] = useState<number>(3);
  const [eventName, setEventName] = useState<string>('Trae AI Challenge');
  const [eventTheme, setEventTheme] = useState<string>('Assemble your squad for the AI coding challenge.');
  const [status, setStatus] = useState<MatchingStatus>('idle');
  const [teams, setTeams] = useState<Team[]>([]);
  
  // History State
  const [matchHistory, setMatchHistory] = useState<SavedMatch[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [playingTeamId, setPlayingTeamId] = useState<string | null>(null);
  
  // Playback Intent Ref to handle race conditions
  const shouldPlayAudioRef = useRef<boolean>(false);

  const [isResultQrOpen, setIsResultQrOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Task Library State
  const [taskLibrary, setTaskLibrary] = useState<TaskItem[]>([]);

  // --- PeerJS & Chat State (Global) ---
  const [hostId, setHostId] = useState<string>('');
  const [peerError, setPeerError] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAiChatEnabled, setIsAiChatEnabled] = useState(true); 
  const [isAiTyping, setIsAiTyping] = useState(false);
  
  // Refs
  const chatMessagesRef = useRef<ChatMessage[]>([]);
  const peerRef = useRef<Peer | null>(null);
  const participantConnectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const connectionsRef = useRef<DataConnection[]>([]);
  const peerInitTimeoutRef = useRef<any>(null);

  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Sync chatMessages state to ref for event handlers
  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  const joinUrl = hostId 
    ? `${window.location.origin}${window.location.pathname}?view=join&host=${hostId}`
    : '';

  // --- Session Storage & Initialization (Independent Sessions) ---
  useEffect(() => {
    if (viewMode === 'app') {
      // 1. Load History (Global LocalStorage)
      const savedHistory = safeLocalStorage.getItem('trae_match_history');
      if (savedHistory) {
        try {
          setMatchHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error('Failed to parse history', e);
        }
      }

      // 2. Load Active Session State (Isolated SessionStorage)
      try {
        const sessionData = safeSessionStorage.getItem('trae_app_session');
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          if (parsed.rawInput) setRawInput(parsed.rawInput);
          if (parsed.eventName) setEventName(parsed.eventName);
          if (parsed.eventTheme) setEventTheme(parsed.eventTheme);
          if (parsed.teams) {
             setTeams(parsed.teams);
             if (parsed.teams.length > 0) setStatus('complete');
          }
          if (parsed.taskLibrary) setTaskLibrary(parsed.taskLibrary);
        }
      } catch(e) {
        console.error("Failed to restore session", e);
      }
    }
  }, [viewMode]);

  // Persist Active State to SessionStorage
  useEffect(() => {
    if (viewMode === 'app') {
      const sessionData = {
        rawInput,
        eventName,
        eventTheme,
        teams,
        taskLibrary
      };
      safeSessionStorage.setItem('trae_app_session', JSON.stringify(sessionData));
    }
  }, [rawInput, eventName, eventTheme, teams, taskLibrary, viewMode]);


  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const sendSystemMessage = useCallback((text: string, channelId: string = 'lobby') => {
    const sysMsg: ChatMessage = {
      id: generateUUID(),
      sender: 'System',
      text: text,
      isHost: false,
      timestamp: Date.now(),
      channelId: channelId,
      isSystem: true
    };
    setChatMessages(prev => [...prev, sysMsg]);
    connectionsRef.current.forEach(conn => {
      if (conn.open) conn.send({ ...sysMsg, type: 'chat' });
    });
  }, []);

  const initHostPeer = useCallback(() => {
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }

      const peer = new Peer(PEER_CONFIG);
      peerRef.current = peer;

      // Connection Timeout Watchdog
      peerInitTimeoutRef.current = setTimeout(() => {
        if (peer && !peer.id && !peer.destroyed) {
            console.warn("Peer init timeout. Retrying...");
            setPeerError("Initializing slow... Retrying...");
            initHostPeer(); // Retry
        }
      }, 10000); // 10s timeout

      peer.on('open', (id) => {
        console.log('Host Peer ID:', id);
        setHostId(id);
        setPeerError('');
        if (peerInitTimeoutRef.current) clearTimeout(peerInitTimeoutRef.current);
      });

      peer.on('connection', (conn) => {
        connectionsRef.current.push(conn);
        
        conn.on('open', () => {
             // Send current history to new participant immediately upon connection
             if (chatMessagesRef.current.length > 0) {
                 conn.send({ type: 'chat_history', history: chatMessagesRef.current });
             }
        });

        conn.on('data', (data: any) => {
          handleIncomingPeerData(data, conn);
        });
        conn.on('close', () => {
          connectionsRef.current = connectionsRef.current.filter(c => c.peer !== conn.peer);
          let disconnectedName: string | undefined;
          for (const [name, c] of participantConnectionsRef.current.entries()) {
            if (c.peer === conn.peer) {
              disconnectedName = name;
              participantConnectionsRef.current.delete(name);
              break;
            }
          }
          if (disconnectedName) {
             sendSystemMessage(`${disconnectedName} left the lobby. / ${disconnectedName} 离开了大厅。`, 'lobby');
          }
        });
      });

      peer.on('disconnected', () => {
        console.warn('PeerServer disconnected.');
        // IMPORTANT: Only reconnect if actually disconnected and not destroyed
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
           setPeerError(`Network: ${err.type || 'Error'}`);
        }
      });
  }, [sendSystemMessage]);

  useEffect(() => {
    if (viewMode === 'app') {
        initHostPeer();
    }
    return () => {
        if (peerInitTimeoutRef.current) clearTimeout(peerInitTimeoutRef.current);
        if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
        }
    };
  }, [viewMode, initHostPeer]);

  const handleIncomingPeerData = (data: any, sourceConn: DataConnection) => {
    if (data && (data.name || data.type === 'join')) {
      const newName = (data.name || data.payload)?.trim();
      if (newName && typeof newName === 'string') {
        const existingConn = participantConnectionsRef.current.get(newName);
        if (!existingConn) {
             sendSystemMessage(`${newName} joined the lobby. / ${newName} 加入了大厅。`, 'lobby');
        }
        setRawInput((prev) => {
          const cleanPrev = prev.trim();
          return cleanPrev ? `${cleanPrev}\n${newName}` : newName;
        });
        participantConnectionsRef.current.set(newName, sourceConn);
      }
    }

    if (data && data.type === 'chat') {
      const channelId = data.channelId || 'lobby';
      const newMsg: ChatMessage = {
        id: data.id || generateUUID(),
        sender: data.sender || 'Anonymous',
        text: data.text,
        isHost: false,
        timestamp: Date.now(),
        channelId: channelId
      };
      setChatMessages(prev => [...prev, newMsg]);
      connectionsRef.current.forEach(c => {
        if (c.peer !== sourceConn.peer && c.open) {
          c.send({ ...newMsg, type: 'chat' });
        }
      });
    }
  };

  const sendAiMessage = useCallback((text: string, channelId: string = 'lobby') => {
    const aiMsg: ChatMessage = {
      id: generateUUID(),
      sender: 'AI Host',
      text: text,
      isHost: false,
      isAi: true,
      timestamp: Date.now(),
      channelId: channelId
    };
    setChatMessages(prev => [...prev, aiMsg]);
    connectionsRef.current.forEach(conn => {
      if (conn.open) conn.send({ ...aiMsg, type: 'chat' });
    });
  }, []);

  useEffect(() => {
    const respondWithAI = async () => {
      if (!isAiChatEnabled || chatMessages.length === 0) return;
      const lastMsg = chatMessages[chatMessages.length - 1];
      if (lastMsg.isHost || lastMsg.isAi || lastMsg.isSystem) return;

      setIsAiTyping(true);
      await new Promise(r => setTimeout(r, 1000));

      const channelHistory = chatMessages.filter(m => m.channelId === lastMsg.channelId);
      const channelName = lastMsg.channelId === 'lobby' ? 'Lobby' : 'Team Channel';

      const responseText = await generateAIChatResponse(
        channelHistory.slice(-10),
        eventName,
        eventTheme,
        channelName
      );

      setIsAiTyping(false);
      if (responseText) {
        sendAiMessage(responseText, lastMsg.channelId);
      }
    };
    respondWithAI();
  }, [chatMessages, isAiChatEnabled, eventName, eventTheme, sendAiMessage]);

  useEffect(() => {
    if (!isAiChatEnabled) return;
    const IDLE_TIMEOUT = 20000; 
    const triggerProactiveMessage = async () => {
      if (isAiTyping || chatMessages.length === 0) return;
      const lastMsg = chatMessages[chatMessages.length - 1];
      if (lastMsg.isAi || lastMsg.isHost || lastMsg.isSystem) return;

      setIsAiTyping(true);
      await new Promise(r => setTimeout(r, 1500));
      const text = await generateAIProactiveMessage(eventName, eventTheme);
      setIsAiTyping(false);
      if (text) {
        sendAiMessage(text, 'lobby');
      }
    };
    const timer = setTimeout(triggerProactiveMessage, IDLE_TIMEOUT);
    return () => clearTimeout(timer);
  }, [chatMessages, isAiChatEnabled, isAiTyping, eventName, eventTheme, sendAiMessage]);

  const handleSendHostChat = (text: string, channelId: string = 'lobby') => {
    const msg: ChatMessage = {
      id: generateUUID(),
      sender: 'Host',
      text: text,
      isHost: true,
      timestamp: Date.now(),
      channelId: channelId
    };
    setChatMessages(prev => [...prev, msg]);
    connectionsRef.current.forEach(conn => {
      if (conn.open) conn.send({ ...msg, type: 'chat' });
    });
  };

  const saveHistoryToStorage = (history: SavedMatch[]) => {
    safeLocalStorage.setItem('trae_match_history', JSON.stringify(history));
  };

  const handleSaveToHistory = () => {
    if (teams.length === 0) return;
    try {
      const newRecord: SavedMatch = {
        id: generateUUID(),
        timestamp: Date.now(),
        eventName,
        eventTheme,
        teams,
        participantCount: teams.reduce((acc, t) => acc + t.members.length, 0),
        chatMessages: chatMessages,
        taskLibrary: taskLibrary
      };
      const newHistory = [newRecord, ...matchHistory];
      setMatchHistory(newHistory);
      saveHistoryToStorage(newHistory);
      showToast('Saved to History! / 已保存到历史记录！', 'success');
    } catch (e) { console.error(e); showToast('Failed to save / 保存失败', 'error'); }
  };

  const handleLoadHistoryItem = (match: SavedMatch) => {
    setTeams(match.teams);
    setEventName(match.eventName);
    setEventTheme(match.eventTheme);
    
    if (match.taskLibrary) {
        setTaskLibrary(match.taskLibrary);
    }

    // Reconstruct raw input for display
    const allNames = match.teams.flatMap(t => t.members.map(m => m.name)).join('\n');
    setRawInput(allNames);

    // Restore chat messages if they exist
    if (match.chatMessages) {
        setChatMessages(match.chatMessages);
    } else {
        setChatMessages([]);
    }
    
    setStatus('complete');
    setIsHistoryOpen(false);
    showToast(`Loaded "${match.eventName}"`, 'success');
  };

  const handleDeleteHistoryItem = (id: string) => {
    if (window.confirm('Delete this record? / 确定删除此记录吗？')) {
      const newHistory = matchHistory.filter(m => m.id !== id);
      setMatchHistory(newHistory);
      saveHistoryToStorage(newHistory);
      showToast('Record deleted.', 'info');
    }
  };

  // History Import/Export
  const handleImportHistory = (importedMatches: SavedMatch[]) => {
    // Filter out duplicates based on ID
    const existingIds = new Set(matchHistory.map(m => m.id));
    const newMatches = importedMatches.filter(m => !existingIds.has(m.id));
    
    if (newMatches.length === 0) {
        showToast('No new records found. / 未发现新记录。', 'info');
        return;
    }

    const updatedHistory = [...newMatches, ...matchHistory];
    // Sort by timestamp desc
    updatedHistory.sort((a, b) => b.timestamp - a.timestamp);
    
    setMatchHistory(updatedHistory);
    saveHistoryToStorage(updatedHistory);
    showToast(`Imported ${newMatches.length} records. / 成功导入 ${newMatches.length} 条记录。`, 'success');
  };

  useEffect(() => {
    if (viewMode !== 'app') return;
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('data');
    if (sharedData) {
      try {
        const jsonString = base64DecodeUnicode(sharedData);
        const loadedTeams: Team[] = JSON.parse(jsonString);
        if (Array.isArray(loadedTeams) && loadedTeams.length > 0) {
          setTeams(loadedTeams);
          const allNames = loadedTeams
            .flatMap(t => t.members.map(m => m.name))
            .join('\n');
          setRawInput(allNames);
          setStatus('complete');
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch (e) {
        console.error('Failed to parse shared data', e);
        showToast('Invalid share link or data corrupted. / 分享数据损坏。', 'error');
      }
    }
  }, [viewMode]);

  const participants = rawInput
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const handleMatch = useCallback(async () => {
    if (participants.length < 2) return;

    setStatus('shuffling');
    handleStopBroadcast();

    await new Promise(resolve => setTimeout(resolve, 800));

    const participantObjects: Participant[] = participants.map(name => ({
      id: generateUUID(),
      name: name
    }));

    const shuffled = shuffleArray(participantObjects);

    const tempBuckets: Participant[][] = Array.from({ length: Math.ceil(shuffled.length / teamSize) }, () => []);
    
    shuffled.forEach((p, index) => {
      const bucketIndex = index % tempBuckets.length;
      tempBuckets[bucketIndex].push(p);
    });

    const basicTeams: Team[] = tempBuckets.map((members, index) => {
      let initialTopic = undefined;
      let initialTopicZh = undefined;
      if (taskLibrary.length > 0) {
         const taskIndex = index % taskLibrary.length;
         initialTopic = taskLibrary[taskIndex].title;
         initialTopicZh = taskLibrary[taskIndex].titleZh;
      }

      return {
        id: generateUUID(),
        name: 'Processing...',
        members: members,
        motto: 'Loading metadata...',
        icebreaker: 'Initializing...',
        mascotEmoji: '⏳',
        topic: initialTopic,
        topicZh: initialTopicZh
      };
    });

    setTeams(basicTeams);
    setStatus('enriching');

    try {
      const enriched = await enrichTeamsWithGemini(basicTeams, eventName, eventTheme);
      setTeams(enriched);
      setStatus('complete');

      enriched.forEach(team => {
        team.members.forEach(member => {
          const conn = participantConnectionsRef.current.get(member.name);
          if (conn && conn.open) {
            conn.send({
              type: 'team_assignment',
              teamId: team.id,
              teamName: team.name,
              teamInfo: team
            });
          }
        });
      });

      const announcement = `🎉 SYSTEMS ALIGNED! MATCHING COMPLETE!\n\nGenerated ${enriched.length} teams for "${eventName}". Theme: "${eventTheme}".`;
      sendAiMessage(announcement, 'lobby');

      enriched.forEach((t, i) => {
        setTimeout(() => {
          const memberList = t.members.map(m => m.name).join(', ');
          const detailMsg = `⚡ TEAM ${i + 1}: ${t.mascotEmoji} ${t.name} ${t.nameZh ? `(${t.nameZh})` : ''}\n\n` +
                            `📜 MOTTO:\n"${t.motto}"\n${t.mottoZh ? `"${t.mottoZh}"` : ''}\n\n` +
                            `🎯 TASK:\n${t.topic}\n${t.topicZh ? `(${t.topicZh})` : ''}\n\n` +
                            `🚀 ANSWER THIS DOUBT:\n${t.icebreaker}\n${t.icebreakerZh ? `(${t.icebreakerZh})` : ''}\n\n` +
                            `👥 OPERATIVES / 成员:\n${memberList}`;
          sendAiMessage(detailMsg, 'lobby');
        }, 800 + (i * 400));
      });

      enriched.forEach(t => {
         const welcomeMsg = `👋 Welcome to your private team channel, ${t.name}!\n\n` +
                            `📜 Motto: "${t.motto}"${t.mottoZh ? ` ("${t.mottoZh}")` : ''}\n\n` +
                            `🎯 Task: ${t.topic}\n${t.topicZh ? `(${t.topicZh})` : ''}\n\n` +
                            `🚀 Answer this doubt: ${t.icebreaker}\n${t.icebreakerZh ? `(${t.icebreakerZh})` : ''}`;
         sendAiMessage(welcomeMsg, t.id);
      });

    } catch (e) {
      console.error(e);
      setStatus('complete');
      sendAiMessage("⚠️ System Alert: Team generation completed with some fallback data.", 'lobby');
    }

  }, [participants, teamSize, eventName, eventTheme, sendAiMessage, taskLibrary]);

  const handleUpdateTeam = (id: string, updates: Partial<Team>) => {
    const team = teams.find(t => t.id === id);
    if (team) {
      const topicChanged = updates.topic !== undefined && updates.topic !== team.topic;
      const topicZhChanged = updates.topicZh !== undefined && updates.topicZh !== team.topicZh;

      if (topicChanged || topicZhChanged) {
        const newTopic = updates.topic !== undefined ? updates.topic : team.topic;
        const newTopicZh = updates.topicZh !== undefined ? updates.topicZh : team.topicZh;
        
        const updateMsg = `📢 MISSION UPDATE for ${team.name}!\n\nNew Directive:\n🎯 ${newTopic}\n${newTopicZh ? `(${newTopicZh})` : ''}`;
        sendAiMessage(updateMsg, 'lobby');
        sendAiMessage(updateMsg, team.id);
      }
    }

    setTeams(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleRegenerateTeam = async (teamId: string) => {
      const team = teams.find(t => t.id === teamId);
      if (!team) return;

      try {
          // Call service for single team, preserving existing topic/members but asking for new identity
          const enriched = await enrichTeamsWithGemini([team], eventName, eventTheme);
          
          if (enriched && enriched.length > 0) {
              const updatedTeam = enriched[0];
              handleUpdateTeam(teamId, updatedTeam);
              showToast("Team identity regenerated! / 团队信息已更新！", "success");
              
              // Announce update
              const updateMsg = `🔄 IDENTITY REFRESH for Team ${team.name}!\n\n` +
                                `Reborn as: ${updatedTeam.mascotEmoji} ${updatedTeam.name}\n` + 
                                `Motto: "${updatedTeam.motto}"`;
              sendAiMessage(updateMsg, 'lobby');
          }
      } catch(e) {
          console.error("Regeneration failed", e);
          showToast("Regeneration failed / 更新失败", "error");
      }
  };

  const handleShare = async () => {
    if (teams.length === 0) return;
    try {
      const jsonString = JSON.stringify(teams);
      const base64Data = base64EncodeUnicode(jsonString);
      const url = `${window.location.origin}${window.location.pathname}?data=${base64Data}`;
      await navigator.clipboard.writeText(url);
      showToast('Share link copied! / 分享链接已复制！', 'success');
    } catch (e) { console.error(e); showToast('Failed to copy link / 复制失败', 'error'); }
  };

  const handleStopBroadcast = () => {
    // This is now a "Hard Reset" function
    shouldPlayAudioRef.current = false;

    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (e) {}
      audioSourceRef.current = null;
    }
    
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
          try { audioContextRef.current.close(); } catch (e) {}
      }
      audioContextRef.current = null;
    }

    setIsPlayingAudio(false);
    setIsPaused(false);
    setPlayingTeamId(null);
  };

  const toggleAudioPlayback = async (action: 'global' | 'team', teamId?: string) => {
    // Case 1: Resume if paused and matches current context
    if (audioContextRef.current && isPaused) {
        // Ensure we are resuming the correct context (global vs specific team)
        const isSameContext = (action === 'global' && !playingTeamId) || (action === 'team' && playingTeamId === teamId);
        
        if (isSameContext) {
            await audioContextRef.current.resume();
            setIsPlayingAudio(true);
            setIsPaused(false);
            shouldPlayAudioRef.current = true;
            return;
        }
    }

    // Case 2: Pause if playing
    if (isPlayingAudio) {
         const isSameContext = (action === 'global' && !playingTeamId) || (action === 'team' && playingTeamId === teamId);
         if (isSameContext) {
             if (audioContextRef.current && audioContextRef.current.state === 'running') {
                 await audioContextRef.current.suspend();
                 setIsPlayingAudio(false);
                 setIsPaused(true);
                 // Keep shouldPlayAudioRef true-ish or create a new paused state, 
                 // but 'shouldPlayAudioRef' is mainly for aborting async gen.
                 // The context holds the paused state.
                 return;
             }
         }
    }

    // Case 3: Start New (or restart if switched context)
    handleStopBroadcast(); // Reset everything first
    shouldPlayAudioRef.current = true;
    setIsPlayingAudio(true); // Optimistic UI update
    setIsPaused(false);

    if (action === 'team' && teamId) {
        setPlayingTeamId(teamId);
        handleBroadcastTeam(teamId);
    } else {
        handleBroadcast();
    }
  };

  const playAudioFromBase64 = async (base64Audio: string) => {
      if (!shouldPlayAudioRef.current) return;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        showToast("AudioContext not supported / 不支持音频播放", 'error');
        handleStopBroadcast();
        return;
      }

      let audioCtx;
      try {
         audioCtx = new AudioContextClass({sampleRate: 24000});
      } catch (err) {
         console.warn("Standard AudioContext Init Failed, retrying without sampleRate", err);
         try {
             audioCtx = new AudioContextClass();
         } catch (e2) {
             throw new Error("AudioContext creation failed");
         }
      }
      
      if (!shouldPlayAudioRef.current) {
          audioCtx.close();
          return;
      }

      audioContextRef.current = audioCtx;

      const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
      
      if (!shouldPlayAudioRef.current) {
          audioCtx.close();
          return;
      }

      const source = audioCtx.createBufferSource();
      audioSourceRef.current = source;

      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.onended = () => {
         // Only reset if we naturally finished playing (state is running)
         // If state is suspended, it means we are just paused, don't reset UI.
         if (audioCtx.state === 'running') {
             handleStopBroadcast();
         }
      };
      source.start();
  };

  const handleBroadcast = async () => {
    try {
      const base64Audio = await generateTeamAnnouncement(teams, eventName);
      
      if (!shouldPlayAudioRef.current) return;

      if (!base64Audio) {
          showToast("Failed to generate audio / 生成音频失败", 'error');
          handleStopBroadcast();
          return;
      }
      await playAudioFromBase64(base64Audio);
    } catch (e) {
      console.error("Audio Broadcast Error:", e);
      showToast("Error playing audio broadcast / 播放失败", 'error');
      handleStopBroadcast();
    }
  };

  const handleBroadcastTeam = async (teamId: string) => {
     const team = teams.find(t => t.id === teamId);
     if (!team) return;

     try {
         const base64Audio = await generateSingleTeamAnnouncement(team, eventName);
         
         if (!shouldPlayAudioRef.current || playingTeamId !== teamId) return;

         if (!base64Audio) {
             showToast("Failed to generate team audio / 生成队伍音频失败", 'error');
             handleStopBroadcast();
             return;
         }
         await playAudioFromBase64(base64Audio);
     } catch (e) {
         console.error("Team Broadcast Error:", e);
         showToast("Error playing team broadcast / 播放失败", 'error');
         handleStopBroadcast();
     }
  };

  const reset = () => {
    setStatus('idle');
    setTeams([]);
    window.history.replaceState({}, '', window.location.pathname);
  };

  if (viewMode === 'join') {
    return <JoinScreen hostId={joinHostId} />;
  }

  return (
    <div className="min-h-screen text-white font-sans selection:bg-trae-purple selection:text-white pb-20 relative">
      <Background />
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] animate-fade-in-down">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md ${
            toast.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
            toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
            'bg-blue-500/10 border-blue-500/20 text-blue-400'
          }`}>
            {toast.type === 'success' && <Check className="w-4 h-4" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4" />}
            {toast.type === 'info' && <Info className="w-4 h-4" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* History Modal */}
      <HistoryModal 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={matchHistory}
        onLoad={handleLoadHistoryItem}
        onDelete={handleDeleteHistoryItem}
        onImport={handleImportHistory}
      />

      <header className="pt-12 pb-8 px-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Terminal className="w-8 h-8 text-trae-purple animate-pulse" />
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
            {eventName}
          </h1>
        </div>
        <div className="space-y-1">
          <p className="text-gray-400 max-w-lg mx-auto text-lg break-words">{eventTheme}</p>
          <p className="text-gray-500 max-w-lg mx-auto text-sm">AI Team Matchmaker / 智能组队助手</p>
        </div>
      </header>

      <main className="container mx-auto px-4">
        {status === 'idle' && (
          <ParticipantInput 
            rawInput={rawInput}
            setRawInput={setRawInput}
            teamSize={teamSize}
            setTeamSize={setTeamSize}
            eventName={eventName}
            setEventName={setEventName}
            eventTheme={eventTheme}
            setEventTheme={setEventTheme}
            onMatch={handleMatch}
            participantCount={participants.length}
            historyCount={matchHistory.length}
            onOpenHistory={() => setIsHistoryOpen(true)}
            hostId={hostId}
            peerError={peerError}
            chatMessages={chatMessages}
            onSendChat={(text) => handleSendHostChat(text, 'lobby')} 
            isAiChatEnabled={isAiChatEnabled}
            onToggleAiChat={() => setIsAiChatEnabled(!isAiChatEnabled)}
            isAiTyping={isAiTyping}
            taskLibrary={taskLibrary}
            setTaskLibrary={setTaskLibrary}
          />
        )}

        {(status === 'shuffling' || status === 'enriching') && (
          <div className="flex flex-col items-center justify-center h-64 space-y-6">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-t-4 border-trae-purple rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-r-4 border-trae-blue rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-display font-bold animate-pulse">
                {status === 'shuffling' ? 'Aligning Neural Pathways...' : 'Generating Team Identities...'}
              </h3>
              <p className="text-lg text-trae-purple/80 font-display font-medium">
                {status === 'shuffling' ? '正在匹配神经通路...' : '正在生成队伍标识...'}
              </p>
              <p className="text-gray-500 font-mono text-sm">
                {status === 'enriching' ? 'Consulting the AI Oracle...' : 'Optimizing human resources...'}
              </p>
            </div>
          </div>
        )}

        {status === 'complete' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between bg-black/40 p-4 rounded-xl border border-white/10 backdrop-blur-md sticky top-4 z-50 shadow-2xl gap-4">
              <button onClick={reset} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5 text-sm">
                <ArrowLeft className="w-4 h-4" /> <span>Edit / 编辑</span>
              </button>
              <div className="font-mono text-sm text-gray-500 text-center flex-grow hidden sm:block">
                {teams.length} Teams Generated / 已生成 {teams.length} 个队伍
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsResultQrOpen(true)} className="flex items-center gap-2 text-white hover:text-trae-purple transition-colors px-4 py-2 rounded-lg hover:bg-white/5 text-sm border border-white/5">
                  <QrCode className="w-4 h-4" /> <span className="hidden sm:inline">Join QR</span>
                </button>
                
                <div className="flex items-center gap-1">
                    {/* Main Toggle Button */}
                    <button 
                        onClick={() => toggleAudioPlayback('global')}
                        className={`flex items-center gap-2 transition-colors px-4 py-2 rounded-lg text-sm border min-w-[130px] justify-center ${
                            isPlayingAudio 
                            ? 'border-trae-purple/30 text-trae-purple bg-trae-purple/10 hover:bg-trae-purple/20' 
                            : isPaused
                                ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20'
                                : 'border-trae-accent/30 text-trae-accent hover:bg-trae-accent/10 hover:text-white'
                        }`}
                    >
                        {isPlayingAudio ? (
                            <> <Pause className="w-4 h-4 fill-current" /> Pause / 暂停 </>
                        ) : isPaused ? (
                            <> <Play className="w-4 h-4 fill-current" /> Resume / 继续 </>
                        ) : (
                            <> <AudioLines className="w-4 h-4" /> Announce All </>
                        )}
                    </button>

                    {/* Dedicated Stop Button (Visible when Active or Paused) */}
                    {(isPlayingAudio || isPaused) && (
                        <button
                            onClick={handleStopBroadcast}
                            className="p-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Stop Broadcast"
                        >
                            <Square className="w-4 h-4 fill-current" />
                        </button>
                    )}
                </div>

                <button onClick={handleShare} className="flex items-center gap-2 text-trae-purple hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-trae-purple/10 text-sm border border-trae-purple/30">
                  <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Share</span>
                </button>
                <button onClick={handleSaveToHistory} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/10 text-sm border border-white/5">
                  <Save className="w-4 h-4" /> <span className="hidden sm:inline">Save Record</span>
                </button>
                 <button onClick={() => setIsHistoryOpen(true)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/10 text-sm border border-white/5">
                  <History className="w-4 h-4" /> <span className="hidden sm:inline">History</span>
                </button>
                <button onClick={handleMatch} className="flex items-center gap-2 text-trae-blue hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-trae-blue/10 text-sm">
                  <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Rematch</span>
                </button>
              </div>
            </div>

            {isResultQrOpen && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
                <div className="bg-trae-card border border-white/10 rounded-2xl p-6 max-w-sm w-full relative shadow-2xl">
                    <button onClick={() => setIsResultQrOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                    <h3 className="text-xl font-bold text-center mb-2 text-white">Join Chat</h3>
                    <div className="bg-white p-4 rounded-xl mx-auto w-48 h-48 mb-4 flex items-center justify-center">
                         {joinUrl ? <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}&bgcolor=ffffff`} className="w-full h-full object-contain"/> : <Loader2 className="w-8 h-8 animate-spin" />}
                    </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team, idx) => (
                <TeamCard 
                  key={team.id} 
                  team={team} 
                  index={idx} 
                  onUpdateTeam={handleUpdateTeam}
                  taskLibrary={taskLibrary}
                  onBroadcast={(id) => toggleAudioPlayback('team', id)}
                  isPlaying={playingTeamId === team.id}
                  isPaused={isPaused}
                  eventName={eventName}
                  eventTheme={eventTheme}
                  onRegenerate={handleRegenerateTeam}
                />
              ))}
            </div>

            <ChatWidget 
              mode="floating"
              messages={chatMessages}
              onSend={handleSendHostChat}
              isAiEnabled={isAiChatEnabled}
              onToggleAi={() => setIsAiChatEnabled(!isAiChatEnabled)}
              currentHostId={hostId}
              isTyping={isAiTyping}
              teams={teams} 
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
