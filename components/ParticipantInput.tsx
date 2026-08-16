import React, { useState } from 'react';
import { Users, History, Trash2, QrCode, ChevronDown, ChevronUp, Link, Loader2, Settings2, Sparkles, X, Plus, Target } from 'lucide-react';
import { generateThemeSuggestions, generateTaskLibrarySuggestions } from '../services/geminiService';
import ChatWidget from './ChatWidget';
import { ChatMessage, TaskItem } from '../types';

interface ParticipantInputProps {
  rawInput: string;
  setRawInput: (val: string | ((prev: string) => string)) => void;
  teamSize: number;
  setTeamSize: (val: number) => void;
  eventName: string;
  setEventName: (val: string) => void;
  eventTheme: string;
  setEventTheme: (val: string) => void;
  onMatch: () => void;
  participantCount: number;
  historyCount: number;
  onOpenHistory: () => void;
  // Chat & Connection Props
  hostId: string;
  peerError: string;
  chatMessages: ChatMessage[];
  onSendChat: (text: string) => void;
  isAiChatEnabled: boolean;
  onToggleAiChat: () => void;
  isAiTyping?: boolean;
  // Task Library Props
  taskLibrary: TaskItem[];
  setTaskLibrary: (val: TaskItem[] | ((prev: TaskItem[]) => TaskItem[])) => void;
  // Theme Props
  currentTheme: string;
  setCurrentTheme: (theme: string) => void;
}

const THEMES = [
  { id: 'default', name: 'Default', color: 'bg-[#6366f1]' }, // Indigo
  { id: 'cyberpunk', name: 'Cyber', color: 'bg-[#FACC15]' },
  { id: 'ocean', name: 'Ocean', color: 'bg-[#0EA5E9]' },
  { id: 'forest', name: 'Forest', color: 'bg-[#10B981]' },
  { id: 'sunset', name: 'Sunset', color: 'bg-[#F97316]' },
];

const ParticipantInput: React.FC<ParticipantInputProps> = ({
  rawInput,
  setRawInput,
  teamSize,
  setTeamSize,
  eventName,
  setEventName,
  eventTheme,
  setEventTheme,
  onMatch,
  participantCount,
  historyCount,
  onOpenHistory,
  hostId,
  peerError,
  chatMessages,
  onSendChat,
  isAiChatEnabled,
  onToggleAiChat,
  isAiTyping = false,
  taskLibrary,
  setTaskLibrary,
  currentTheme,
  setCurrentTheme
}) => {
  const [isQrOpen, setIsQrOpen] = useState(false);
  
  // Theme Suggestion State
  const [isGeneratingThemes, setIsGeneratingThemes] = useState(false);
  const [suggestedThemes, setSuggestedThemes] = useState<string[]>([]);

  // Task Library State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTitleZh, setNewTaskTitleZh] = useState('');
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);

  const joinUrl = hostId 
    ? `${window.location.origin}${window.location.pathname}?view=join&host=${hostId}`
    : '';

  const copyLink = () => {
    if (joinUrl) {
      navigator.clipboard.writeText(joinUrl);
      alert('Link copied! / 链接已复制！');
    }
  };

  const handleSuggestThemes = async () => {
    if (!eventName.trim()) {
      alert("Please enter an Event Name first. / 请先输入活动名称。");
      return;
    }
    setIsGeneratingThemes(true);
    setSuggestedThemes([]);
    try {
      const themes = await generateThemeSuggestions(eventName);
      setSuggestedThemes(themes);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingThemes(false);
    }
  };

  const handleSelectTheme = (theme: string) => {
    setEventTheme(theme);
    setSuggestedThemes([]);
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: TaskItem = {
      id: Date.now().toString(),
      title: newTaskTitle,
      titleZh: newTaskTitleZh || newTaskTitle // Fallback to English if Chinese is empty
    };
    setTaskLibrary(prev => [...prev, newTask]);
    setNewTaskTitle('');
    setNewTaskTitleZh('');
  };

  const handleDeleteTask = (id: string) => {
    setTaskLibrary(prev => prev.filter(t => t.id !== id));
  };

  const handleGenerateTasks = async () => {
    if (!eventName.trim()) {
      alert("Please enter Event Name & Theme first.");
      return;
    }
    setIsGeneratingTasks(true);
    try {
      const suggestions = await generateTaskLibrarySuggestions(eventName, eventTheme);
      setTaskLibrary(prev => [...prev, ...suggestions]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  const maxTeamSize = Math.max(10, participantCount);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-fade-in-up">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Name Input Area */}
        <div className="lg:col-span-2 bg-theme-card border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-display font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-theme-secondary" />
                Participant List
              </h2>
              <p className="text-xs text-gray-500 font-sans mt-0.5 ml-7">参赛名单</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsQrOpen(!isQrOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isQrOpen ? 'bg-theme-primary text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
              >
                <QrCode className="w-4 h-4" />
                <span>Live Join / 扫码加入</span>
                {isQrOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              <span className="text-sm font-medium px-3 py-1 rounded-full bg-white/5 text-gray-400 border border-white/5">
                {participantCount} <span className="hidden sm:inline">people / 人</span>
              </span>
            </div>
          </div>

          {/* QR Code & Chat Section */}
          {isQrOpen && (
            <div className="mb-4 p-4 bg-black/40 rounded-xl border border-white/10 animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Instructions & QR */}
              <div className="flex flex-col gap-4">
                <div className="flex-1 space-y-3">
                  <label className="block text-sm text-gray-400 font-medium">
                    Scan to Join / 扫码输入名字
                  </label>
                  <div className="text-xs text-gray-500 leading-relaxed space-y-2">
                    <p>1. Participants scan QR code.<br/>选手扫码。</p>
                    <p>2. Enter name to join list.<br/>输入名字加入名单。</p>
                    <p>3. Chat enabled.<br/>开启聊天。</p>
                  </div>
                  {peerError && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                       {peerError}
                    </p>
                  )}
                  <button onClick={copyLink} className="text-xs text-theme-primary hover:text-theme-accent underline flex items-center gap-1">
                    <Link className="w-3 h-3" /> Copy Direct Link / 复制链接
                  </button>
                </div>
                
                <div className="flex-shrink-0 flex items-center justify-center bg-white p-2 rounded-lg w-32 h-32 self-center md:self-start">
                  {hostId ? (
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(joinUrl)}&bgcolor=ffffff`}
                      alt="Join QR Code"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                      <Loader2 className="w-8 h-8 mb-2 animate-spin text-theme-primary" />
                      <span className="text-[10px] text-gray-400 text-center">Init...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Chat Widget (Embedded) */}
              <ChatWidget 
                mode="embedded"
                messages={chatMessages}
                onSend={onSendChat}
                isAiEnabled={isAiChatEnabled}
                onToggleAi={onToggleAiChat}
                currentHostId={hostId}
                isTyping={isAiTyping}
              />
            </div>
          )}

          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="Paste names here, one per line... or scan QR code to add.&#10;此处粘贴名单，每行一个名字... 或扫码自动添加。&#10;Alice&#10;Bob&#10;Charlie"
            className="w-full flex-grow min-h-[300px] bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent resize-none font-mono text-sm leading-relaxed transition-all"
          />
        </div>

        {/* Configuration Panel */}
        <div className="space-y-6">
          <div className="bg-theme-card border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-theme-accent" />
              <div>
                <h2 className="text-xl font-display font-semibold text-white">Settings</h2>
                <p className="text-xs text-gray-500">活动设置</p>
              </div>
            </div>
            
            <div className="space-y-5">
              {/* Event Config */}
              <div className="space-y-1">
                <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold">Event Name / 活动名称</label>
                <input 
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-theme-primary focus:ring-1 focus:ring-theme-primary focus:outline-none"
                  placeholder="e.g. AI Hackathon"
                />
              </div>

              <div className="space-y-1 relative">
                <div className="flex justify-between items-center">
                  <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold">Event Theme / 活动主题</label>
                  <button 
                    onClick={handleSuggestThemes}
                    disabled={isGeneratingThemes}
                    className="text-[10px] flex items-center gap-1 text-theme-primary hover:text-theme-accent disabled:opacity-50 transition-colors mb-1"
                  >
                    {isGeneratingThemes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Suggest Theme
                  </button>
                </div>
                <input 
                  type="text"
                  value={eventTheme}
                  onChange={(e) => setEventTheme(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-theme-primary focus:ring-1 focus:ring-theme-primary focus:outline-none"
                  placeholder="e.g. AI Hackathon, Board Game Night..."
                />
                
                {/* Suggestions Dropdown/List */}
                {suggestedThemes.length > 0 && (
                  <div className="mt-2 space-y-2 animate-fade-in">
                    <div className="flex justify-between items-center text-xs text-gray-500 px-1">
                      <span>Suggestions:</span>
                      <button onClick={() => setSuggestedThemes([])} className="hover:text-white"><X className="w-3 h-3" /></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {suggestedThemes.map((theme, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectTheme(theme)}
                          className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 text-gray-300 hover:text-white hover:border-theme-primary/50 transition-all text-left"
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full h-px bg-white/5 my-2"></div>

              {/* Theme Selector */}
              <div className="space-y-1">
                 <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold">Color Theme / 界面主题</label>
                 <div className="flex gap-2.5">
                    {THEMES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setCurrentTheme(t.id)}
                          className={`w-8 h-8 rounded-full ${t.color} transition-transform hover:scale-110 shadow-lg ${currentTheme === t.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#18181B] scale-110' : 'opacity-70 hover:opacity-100'}`}
                          title={t.name}
                        />
                    ))}
                 </div>
              </div>

              <div className="w-full h-px bg-white/5 my-2"></div>

              {/* TASK LIBRARY SECTION */}
              <div className="space-y-3">
                 <div className="flex justify-between items-center">
                     <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-1">
                         <Target className="w-3 h-3" /> Task Library / 选题库
                     </label>
                     <button 
                        onClick={handleGenerateTasks}
                        disabled={isGeneratingTasks}
                        className="text-[10px] flex items-center gap-1 text-theme-secondary hover:text-white disabled:opacity-50 transition-colors"
                     >
                         {isGeneratingTasks ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                         Auto-Fill
                     </button>
                 </div>
                 
                 <div className="bg-black/40 rounded-lg border border-white/10 p-2 space-y-2">
                     {/* Add Task Input */}
                     <div className="space-y-2">
                         <input 
                             type="text"
                             value={newTaskTitle}
                             onChange={(e) => setNewTaskTitle(e.target.value)}
                             placeholder="Task Title (EN)"
                             className="w-full bg-white/5 border border-white/5 rounded px-2 py-1.5 text-xs text-white focus:ring-1 focus:ring-theme-secondary outline-none"
                         />
                         <div className="flex gap-2">
                             <input 
                                 type="text"
                                 value={newTaskTitleZh}
                                 onChange={(e) => setNewTaskTitleZh(e.target.value)}
                                 placeholder="Task Title (CN)"
                                 className="flex-1 bg-white/5 border border-white/5 rounded px-2 py-1.5 text-xs text-white focus:ring-1 focus:ring-theme-secondary outline-none"
                             />
                             <button 
                                 onClick={handleAddTask}
                                 disabled={!newTaskTitle.trim()}
                                 className="bg-white/10 hover:bg-white/20 text-white rounded px-2 flex items-center justify-center disabled:opacity-50"
                             >
                                 <Plus className="w-4 h-4" />
                             </button>
                         </div>
                     </div>
                     
                     {/* Task List */}
                     <div className="max-h-32 overflow-y-auto scrollbar-thin space-y-1 mt-2">
                         {taskLibrary.length === 0 && (
                             <p className="text-[10px] text-gray-500 text-center py-2">Empty. Add manually or Auto-Fill.<br/>暂无选题，请添加或自动生成。</p>
                         )}
                         {taskLibrary.map(task => (
                             <div key={task.id} className="flex items-center justify-between bg-white/5 px-2 py-1.5 rounded group">
                                 <div className="truncate text-xs text-gray-300 flex-1 mr-2">
                                     {task.title}
                                     {task.titleZh && <span className="text-gray-500 ml-1 text-[10px]">({task.titleZh})</span>}
                                 </div>
                                 <button 
                                     onClick={() => handleDeleteTask(task.id)}
                                     className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                 >
                                     <Trash2 className="w-3 h-3" />
                                 </button>
                             </div>
                         ))}
                     </div>
                     {taskLibrary.length > 0 && (
                        <p className="text-[10px] text-gray-500 text-center pt-1 border-t border-white/5">
                            Tasks will be randomly assigned to teams. <br/> 选题将随机分配给队伍。
                        </p>
                     )}
                 </div>
              </div>

              <div className="w-full h-px bg-white/5 my-2"></div>

              {/* Team Size Config */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Team Size / 队伍人数</label>
                <div className="flex items-center gap-4 bg-black/40 p-2 rounded-xl border border-white/10">
                  <button 
                    onClick={() => setTeamSize(Math.max(2, teamSize - 1))}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-display text-2xl font-bold">{teamSize}</span>
                  <button 
                    onClick={() => setTeamSize(Math.min(maxTeamSize, teamSize + 1))}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Approx {participantCount > 0 ? Math.ceil(participantCount / teamSize) : 0} teams / 约 {participantCount > 0 ? Math.ceil(participantCount / teamSize) : 0} 组
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={onMatch}
              disabled={participantCount < 2}
              className={`
                w-full py-4 rounded-2xl font-display font-bold text-lg tracking-wide shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                ${participantCount < 2 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5' 
                  : 'bg-gradient-to-r from-theme-primary to-theme-secondary text-white hover:shadow-theme-primary/50 border border-transparent'}
              `}
            >
              <div className="flex flex-col items-center leading-tight">
                <span>{participantCount < 2 ? 'Add Participants' : 'GENERATE TEAMS ⚡'}</span>
                <span className="text-xs font-normal opacity-80">{participantCount < 2 ? '请添加参赛者' : '开始随机组队'}</span>
              </div>
            </button>

            <button
              onClick={onOpenHistory}
              className="w-full py-3 rounded-xl font-display font-medium text-sm tracking-wide border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center gap-2 group"
            >
              <History className="w-4 h-4 group-hover:text-theme-primary transition-colors" />
              <span>Match History / 历史记录</span>
              {historyCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs font-bold text-gray-300 border border-white/5">
                   {historyCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantInput;