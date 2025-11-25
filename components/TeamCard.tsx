
import React, { useState, useRef, useEffect } from 'react';
import { Team, TaskItem } from '../types';
import { MessageCircle, User, Sparkles, Copy, Check, Edit2, X, Target, ChevronDown, Download, Loader2, Volume2, BookOpen, Image as ImageIcon, RefreshCw, Play, Pause } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import html2canvas from 'html2canvas';
import { generateTeamPoster } from '../services/geminiService';

interface TeamCardProps {
  team: Team;
  index: number;
  onUpdateTeam: (id: string, updates: Partial<Team>) => void;
  taskLibrary?: TaskItem[];
  onBroadcast: (id: string) => void;
  isPlaying: boolean; // Effectively "Is Active Context"
  isPaused: boolean;  // New prop to determine icon state
  eventName: string;
  eventTheme: string;
  onRegenerate: (id: string) => Promise<void>;
}

const EMOJI_OPTIONS = [
  "🤖", "👾", "👽", "👻", "💀", "🧠", "💪", "👀",
  "🚀", "🛸", "🚁", "🏎️", "🏍️", "⚓", "⛵", "🚧",
  "💻", "🖥️", "📱", "📷", "🕹️", "🎮", "🎲", "🧩",
  "⚡", "🔥", "❄️", "🌈", "☀️", "🌙", "⭐", "🌟",
  "🦄", "🐉", "🦕", "🦖", "🐙", "🦊", "🦁", "🐯",
  "🛡️", "⚔️", "🗡️", "🏹", "🔧", "🔨", "⛏️", "🧱",
  "💯", "💢", "💤", "💣", "💬", "💡", "📡", "💎",
  "🐱", "🐶", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼",
  "🐨", "🐯", "🦁", "Dg", "🐵", "🐔", "🐧", "🐦"
];

const AVATAR_GRADIENTS = [
  'from-pink-500 to-rose-500',
  'from-purple-500 to-indigo-500',
  'from-blue-500 to-cyan-500',
  'from-teal-500 to-emerald-500',
  'from-green-500 to-lime-600',
  'from-yellow-500 to-orange-600',
  'from-orange-500 to-red-500',
  'from-red-500 to-pink-600',
  'from-indigo-500 to-purple-600',
  'from-gray-600 to-slate-700',
  'from-fuchsia-500 to-purple-600',
  'from-sky-500 to-blue-600'
];

const getAvatarGradient = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
};

const getMemberEmoji = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % EMOJI_OPTIONS.length;
  return EMOJI_OPTIONS[index];
};

// Internal Tooltip Component
const TooltipWrapper = ({ text, children, className = "" }: { text: React.ReactNode; children?: React.ReactNode; className?: string }) => (
  <div className={`relative group/tooltip ${className}`}>
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 text-[11px] font-medium text-white bg-gray-900/95 border border-white/10 rounded-lg opacity-0 translate-y-1 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl backdrop-blur-sm">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900/95" />
    </div>
  </div>
);

const TeamCard: React.FC<TeamCardProps> = ({ team, index, onUpdateTeam, taskLibrary = [], onBroadcast, isPlaying, isPaused, eventName, eventTheme, onRegenerate }) => {
  const [copied, setCopied] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  // Poster Generation State
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [isDownloadingPoster, setIsDownloadingPoster] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  // Member Editing State
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const memberPickerRef = useRef<HTMLDivElement>(null);

  // Team Name Editing State
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(team.name);
  const [tempNameZh, setTempNameZh] = useState(team.nameZh || '');

  // Task Editing State
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [tempTask, setTempTask] = useState(team.topic || '');
  const [tempTaskZh, setTempTaskZh] = useState(team.topicZh || '');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  // Close pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false);
      }
      if (memberPickerRef.current && !memberPickerRef.current.contains(event.target as Node)) {
        setActiveMemberId(null);
      }
    };
    if (isPickerOpen || activeMemberId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPickerOpen, activeMemberId]);

  // Sync state with props
  useEffect(() => {
    if (!isEditingName) {
      setTempName(team.name);
      setTempNameZh(team.nameZh || '');
    }
  }, [team.name, team.nameZh, isEditingName]);

  useEffect(() => {
    if (!isEditingTask) {
      setTempTask(team.topic || '');
      setTempTaskZh(team.topicZh || '');
    }
  }, [team.topic, team.topicZh, isEditingTask]);

  const handleCopyContent = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const lines = [
      `${team.mascotEmoji} ${team.name} ${team.nameZh ? `(${team.nameZh})` : ''}`,
      `Motto: "${team.motto}"${team.mottoZh ? ` ("${team.mottoZh}")` : ''}`,
      `Task: ${team.topic || 'Pending'} ${team.topicZh ? `(${team.topicZh})` : ''}`,
      `Members: ${team.members.map(m => m.name).join(', ')}`,
      `Answer this doubt: ${team.icebreaker}${team.icebreakerZh ? ` (${team.icebreakerZh})` : ''}`
    ];

    const textToCopy = lines.join('\n');
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRegenerate = async (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsRegenerating(true);
      try {
          await onRegenerate(team.id);
      } finally {
          setIsRegenerating(false);
      }
  };

  const handleDownloadImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cardRef.current) return;

    setIsDownloading(true);
    setIsSnapshotting(true); // Trigger static style mode & text wrapping
    
    try {
      // Wait longer for React to apply "snapshot mode" styles and browser to re-layout expanded text
      await new Promise(resolve => setTimeout(resolve, 500));

      // Use html2canvas to capture the card
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true, // Important for external images if any
        scale: 3, // Higher resolution
        backgroundColor: '#0A0A0B', // Force dark background to avoid transparency issues
        logging: false,
        windowWidth: 1920, // Force a wide virtual viewport to prevent horizontal clipping
        // Remove the transform style from the clone to ensure it's straight even if Framer Motion was mid-frame
        onclone: (clonedDoc) => {
           const clonedCard = clonedDoc.querySelector('[data-card-root="true"]') as HTMLElement;
           if (clonedCard) {
               clonedCard.style.transform = 'none';
               clonedCard.style.boxShadow = 'none';
           }
        }
      });

      const link = document.createElement('a');
      const safeName = team.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.download = `Trae_Team_${safeName}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Screenshot failed:", error);
      alert("Failed to generate image. / 生成图片失败。");
    } finally {
      setIsSnapshotting(false);
      setIsDownloading(false);
    }
  };

  const handleGeneratePoster = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (team.posterUrl) {
          setShowPosterModal(true);
          return;
      }

      setIsGeneratingPoster(true);
      const poster = await generateTeamPoster(team, eventName, eventTheme);
      if (poster) {
          onUpdateTeam(team.id, { posterUrl: poster });
          setShowPosterModal(true);
      } else {
          alert("Failed to generate poster. Try again. / 海报生成失败，请重试。");
      }
      setIsGeneratingPoster(false);
  };

  const handleDownloadPoster = async () => {
      if (!posterRef.current) return;
      setIsDownloadingPoster(true);
      try {
          const canvas = await html2canvas(posterRef.current, {
              useCORS: true,
              scale: 2,
              backgroundColor: '#000000'
          });
          const link = document.createElement('a');
          link.download = `Trae_Poster_${team.name.replace(/\s+/g, '_')}.png`;
          link.href = canvas.toDataURL('image/png');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      } catch (e) {
          console.error("Poster download failed", e);
          alert("Failed to download poster.");
      } finally {
          setIsDownloadingPoster(false);
      }
  };

  const handleEmojiSelect = (emoji: string) => {
    onUpdateTeam(team.id, { mascotEmoji: emoji });
    setIsPickerOpen(false);
  };

  const handleMemberAvatarUpdate = (memberId: string, avatar: string | undefined) => {
    const updatedMembers = team.members.map(m => 
        m.id === memberId ? { ...m, avatar } : m
    );
    onUpdateTeam(team.id, { members: updatedMembers });
    setActiveMemberId(null);
  };

  const saveEditingName = () => {
    onUpdateTeam(team.id, { name: tempName, nameZh: tempNameZh });
    setIsEditingName(false);
  };

  const saveEditingTask = () => {
    onUpdateTeam(team.id, { topic: tempTask, topicZh: tempTaskZh });
    setIsEditingTask(false);
    setIsLibraryOpen(false);
  };

  const selectTaskFromLibrary = (taskId: string) => {
    const item = taskLibrary.find(t => t.id === taskId);
    if (item) {
        setTempTask(item.title);
        setTempTaskZh(item.titleZh);
    }
    setIsLibraryOpen(false);
  };

  // Animation Variants
  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, delay: i * 0.05 }
    }),
    hover: { 
      y: -5, 
      scale: 1.01,
      transition: { duration: 0.2 }
    }
  };

  const mascotVariants: Variants = {
    rest: { scale: 1, rotate: 0, y: 0 },
    hover: { 
      scale: 1.1, 
      rotate: 5,
      transition: { duration: 0.3 }
    }
  };

  return (
    <>
    {/* Poster Modal - Composite View */}
    {showPosterModal && team.posterUrl && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in" data-html2canvas-ignore>
          <div className="relative w-full max-w-[450px] shadow-2xl flex flex-col">
              {/* Close Button */}
              <button 
                  onClick={() => setShowPosterModal(false)} 
                  className="absolute -top-4 -right-4 bg-white/10 hover:bg-red-500 text-white rounded-full p-2 backdrop-blur transition-colors z-[110] border border-white/10"
              >
                  <X className="w-5 h-5" />
              </button>
              
              {/* Composite Poster Area */}
              <div 
                ref={posterRef} 
                className="relative w-full aspect-[2/3] bg-[#0A0A0B] rounded-xl overflow-hidden shadow-2xl border border-white/10 group select-none"
              >
                 {/* AI Background Image */}
                 <img src={team.posterUrl} alt="Poster Background" className="absolute inset-0 w-full h-full object-cover" crossOrigin="anonymous" />
                 
                 {/* Gradient Overlays for Readability */}
                 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60" />
                 <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />

                 {/* Poster Content Overlay */}
                 <div className="absolute inset-0 p-6 flex flex-col">
                    {/* Header: Name & Motto */}
                    <div className="text-center mt-8 space-y-3">
                        <div className="inline-block relative">
                            <h1 className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-wider drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] leading-none">
                                {team.name}
                            </h1>
                            {team.nameZh && (
                                <h2 className="text-lg text-trae-blue font-display font-bold mt-1 tracking-widest drop-shadow-lg">
                                    {team.nameZh}
                                </h2>
                            )}
                        </div>
                        <div className="w-16 h-1 bg-trae-purple mx-auto rounded-full" />
                        <p className="text-base md:text-lg text-gray-200 font-serif italic max-w-[90%] mx-auto leading-relaxed drop-shadow-md opacity-90">
                            "{team.motto}"
                        </p>
                    </div>

                    <div className="flex-grow" />

                    {/* Footer: Members List (Corner Doc Style) */}
                    <div className="flex justify-between items-end gap-4">
                        {/* Bottom Left: Event Info */}
                        <div className="text-left opacity-70">
                             <p className="text-[10px] text-trae-accent uppercase tracking-[0.2em] font-bold mb-1">Event</p>
                             <p className="text-[9px] text-gray-300 font-mono uppercase leading-tight max-w-[100px]">{eventName}</p>
                             <p className="text-[9px] text-gray-400 font-mono mt-0.5">{new Date().toLocaleDateString()}</p>
                        </div>

                        {/* Bottom Right: Members (Document Style) */}
                        <div className="text-right max-w-[160px]">
                             <div className="flex items-center justify-end gap-2 mb-2 opacity-80">
                                 <div className="h-px w-8 bg-trae-blue" />
                                 <p className="text-[10px] text-trae-blue uppercase tracking-[0.2em] font-bold">Operatives</p>
                             </div>
                             <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs font-mono text-gray-200 leading-snug">
                                 {team.members.map((m, idx) => (
                                     <span key={m.id} className="whitespace-nowrap">
                                         {m.name}{idx < team.members.length - 1 ? '' : ''}
                                     </span>
                                 ))}
                             </div>
                        </div>
                    </div>
                 </div>
                 
                 {/* Watermark */}
                 <div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-30">
                     <p className="text-[8px] text-white font-sans tracking-widest">GENERATED BY TRAE MATCHMAKER</p>
                 </div>
              </div>

              {/* Action Bar */}
              <div className="bg-[#18181B] p-4 rounded-b-2xl border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-gray-500">High-Res Composite</span>
                  <button 
                      onClick={handleDownloadPoster}
                      disabled={isDownloadingPoster}
                      className="flex items-center gap-2 px-6 py-2 bg-trae-purple hover:bg-trae-purple/90 text-white rounded-lg transition-all font-bold text-sm shadow-lg hover:shadow-trae-purple/20 disabled:opacity-50 disabled:cursor-wait"
                  >
                      {isDownloadingPoster ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Download Poster
                  </button>
              </div>
          </div>
      </div>
    )}

    <motion.div
      ref={cardRef}
      data-card-root="true"
      custom={index}
      initial="hidden"
      animate="visible"
      // Disable hover animation during snapshot to prevent scaling artifacts
      whileHover={isSnapshotting ? undefined : "hover"}
      variants={cardVariants}
      className={`group relative bg-trae-card/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-visible transition-all duration-300 
        ${isSnapshotting 
            ? 'border-trae-purple/50 ring-1 ring-trae-purple/50 shadow-xl' // Force active look
            : 'hover:border-trae-purple/50 hover:ring-1 hover:ring-trae-purple/50 hover:shadow-2xl hover:shadow-trae-purple/20'}`}
    >
      {/* Background Gradient on Hover - Forced visible during snapshot */}
      <div className={`absolute inset-0 bg-gradient-to-br from-trae-purple/10 to-trae-blue/10 transition-opacity duration-500 rounded-2xl overflow-hidden pointer-events-none
        ${isSnapshotting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} 
      />
      
      {/* Decorative glow blob - Forced visible during snapshot */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 bg-trae-accent/20 rounded-full blur-3xl transition-opacity duration-700 pointer-events-none
        ${isSnapshotting ? 'opacity-50' : 'opacity-0 group-hover:opacity-50'}`} 
      />

      {/* Floating Action Toolbar - Positioned absolutely in top-right to prevent layout overflow */}
      {!isEditingName && (
        <div 
            className={`absolute top-4 right-4 z-40 flex items-center gap-1 bg-[#18181B]/90 backdrop-blur-md border border-white/10 p-1.5 rounded-xl shadow-xl transition-all duration-300 
            ${isSnapshotting ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'}`}
            data-html2canvas-ignore
        >
            <TooltipWrapper text={isPlaying ? (isPaused ? "Resume Broadcast / 继续播报" : "Pause Broadcast / 暂停播报") : "Broadcast Team / 播报此队"}>
                <button
                onClick={(e) => { e.stopPropagation(); onBroadcast(team.id); }}
                className={`p-1.5 rounded-lg focus:opacity-100 focus:outline-none transition-all ${
                    isPlaying 
                    ? isPaused ? 'text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20' : 'text-red-400 bg-red-500/10 hover:bg-red-500/20 animate-pulse' 
                    : 'text-gray-400 hover:text-trae-accent hover:bg-white/10'
                }`}
                >
                    {isPlaying ? (
                        isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                    )}
                </button>
            </TooltipWrapper>

            <TooltipWrapper text="Regenerate Identity / 重新生成">
                <button
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    className="p-1.5 text-gray-400 hover:text-trae-blue hover:bg-white/10 rounded-lg focus:opacity-100 focus:outline-none transition-all disabled:opacity-50"
                >
                    {isRegenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-trae-blue" /> : <RefreshCw className="w-3.5 h-3.5" />}
                </button>
            </TooltipWrapper>

            <TooltipWrapper text={team.posterUrl ? "View Poster / 查看海报" : "Generate Poster / 生成海报"}>
                <button
                    onClick={handleGeneratePoster}
                    disabled={isGeneratingPoster}
                    className={`p-1.5 rounded-lg focus:opacity-100 focus:outline-none transition-all ${team.posterUrl ? 'text-trae-purple hover:bg-trae-purple/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                >
                    {isGeneratingPoster ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                </button>
            </TooltipWrapper>

            <TooltipWrapper text="Edit Team Name / 编辑名称">
                <button
                onClick={() => setIsEditingName(true)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg focus:opacity-100 focus:outline-none"
                >
                <Edit2 className="w-3.5 h-3.5" />
                </button>
            </TooltipWrapper>
            
            <TooltipWrapper text={copied ? "Copied! / 已复制" : "Copy Team Info / 复制信息"}>
                <button
                onClick={handleCopyContent}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg focus:opacity-100 focus:outline-none"
                >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
            </TooltipWrapper>
            
            <TooltipWrapper text="Download Image / 下载截图">
                <button
                onClick={handleDownloadImage}
                disabled={isDownloading}
                className="p-1.5 text-gray-400 hover:text-trae-accent hover:bg-white/10 rounded-lg focus:opacity-100 focus:outline-none"
                >
                {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                </button>
            </TooltipWrapper>
        </div>
      )}

      <div className="p-6 relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="w-full">
            <div className="flex items-start gap-3 mb-1">
              
              {/* Interactive Mascot Avatar */}
              <div className="relative shrink-0" ref={pickerRef}>
                <TooltipWrapper text="Change Mascot / 更换队徽">
                  <motion.button
                    variants={mascotVariants}
                    onClick={() => setIsPickerOpen(!isPickerOpen)}
                    className="text-4xl inline-block origin-center cursor-pointer relative group/emoji focus:outline-none"
                  >
                    {team.mascotEmoji}
                    <div className="absolute -bottom-1 -right-1 bg-trae-purple/90 text-white rounded-full p-1 opacity-0 group-hover/emoji:opacity-100 transition-opacity shadow-lg transform scale-75" data-html2canvas-ignore>
                      <Edit2 className="w-3 h-3" />
                    </div>
                  </motion.button>
                </TooltipWrapper>

                {/* Emoji Picker Popover */}
                {isPickerOpen && (
                  <div className="absolute top-full left-0 mt-2 z-[60] bg-[#18181B] border border-white/20 rounded-xl shadow-2xl p-3 w-64 animate-fade-in text-left" data-html2canvas-ignore>
                     <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto scrollbar-thin">
                        {EMOJI_OPTIONS.map(e => (
                           <button 
                            key={e} 
                            onClick={() => handleEmojiSelect(e)} 
                            className={`text-xl hover:bg-white/10 rounded p-1.5 transition-colors ${team.mascotEmoji === e ? 'bg-trae-purple/30' : ''}`}
                           >
                             {e}
                           </button>
                        ))}
                     </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col flex-1 min-w-0 pt-1">
                {!isEditingName ? (
                  // View Mode (Name)
                  <>
                    <div className="flex items-center gap-2 pr-12">
                      <TooltipWrapper text="Edit Team Name / 编辑名称">
                        <h3 
                          onClick={() => setIsEditingName(true)}
                          className={`text-xl font-display font-bold text-white leading-tight group-hover:text-trae-purple transition-colors duration-300 cursor-pointer hover:underline decoration-dashed underline-offset-4 ${!isSnapshotting ? 'truncate' : 'whitespace-normal break-words'}`}
                        >
                          {team.name}
                        </h3>
                      </TooltipWrapper>
                    </div>
                    {team.nameZh && (
                      <h4 
                        onClick={() => setIsEditingName(true)}
                        className={`text-sm font-display text-gray-400 font-medium cursor-pointer hover:text-gray-300 ${!isSnapshotting ? 'truncate' : 'whitespace-normal break-words'}`}
                      >
                        {team.nameZh}
                      </h4>
                    )}
                  </>
                ) : (
                  // Edit Mode (Name)
                  <div className="flex flex-col gap-2 w-full animate-fade-in" data-html2canvas-ignore>
                    <input 
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEditingName()}
                      className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-lg font-bold text-white focus:ring-2 focus:ring-trae-purple focus:border-transparent outline-none transition-all"
                      placeholder="Team Name (EN)"
                      autoFocus
                    />
                    <input 
                      type="text"
                      value={tempNameZh}
                      onChange={(e) => setTempNameZh(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEditingName()}
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm font-medium text-gray-300 focus:ring-2 focus:ring-trae-purple focus:border-transparent outline-none transition-all"
                      placeholder="Team Name (CN) / 中文名"
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <button 
                        onClick={saveEditingName}
                        className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs py-1 rounded flex items-center justify-center gap-1 transition-colors"
                      >
                        <Check className="w-3 h-3" /> Save
                      </button>
                      <button 
                        onClick={() => setIsEditingName(false)}
                        className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs py-1 rounded flex items-center justify-center gap-1 transition-colors"
                      >
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {!isEditingName && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-trae-blue font-mono uppercase tracking-wider bg-trae-blue/10 inline-block px-2 py-1 rounded border border-trae-blue/20">
                  Team {index + 1}
                </span>
                <div className="h-px flex-grow bg-gradient-to-r from-white/10 to-transparent" />
              </div>
            )}
          </div>
        </div>

        {/* Motto */}
        <div className={`mb-4 p-3 bg-black/20 rounded-lg border-l-2 border-trae-purple transition-all duration-300
            ${isSnapshotting ? 'bg-black/40 translate-x-1' : 'group-hover:bg-black/40 group-hover:translate-x-1'}`}>
          <p className="text-sm italic text-gray-300 flex items-start gap-2">
             <Sparkles className={`w-3 h-3 text-trae-purple mt-1 shrink-0 transition-opacity ${isSnapshotting ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}`} />
             <span>"{team.motto}"</span>
          </p>
          {team.mottoZh && (
             <p className="text-sm italic text-gray-400 mt-1 pl-5">"{team.mottoZh}"</p>
          )}
        </div>

        {/* Assigned Task Topic */}
        {/* Now Editable */}
        <div className={`mb-6 p-3 rounded-lg bg-trae-blue/10 border border-trae-blue/20 relative overflow-visible transition-colors ${isSnapshotting ? 'border-trae-blue/40' : 'group-hover:border-trae-blue/40'}`}>
             <div className="absolute top-0 right-0 p-1 opacity-20 pointer-events-none">
                 <Target className="w-12 h-12 text-trae-blue -rotate-12 translate-x-2 -translate-y-2" />
             </div>
             
             {!isEditingTask ? (
                 // View Mode (Task)
                 <TooltipWrapper text="Edit Task / 编辑任务" className="block">
                    <div 
                        onClick={() => setIsEditingTask(true)}
                        className="relative z-10 cursor-pointer"
                    >
                        <div className="flex justify-between items-start">
                            <h5 className="text-xs font-bold text-trae-blue uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                                <Target className="w-3.5 h-3.5" />
                                Assigned Task / 任务选题
                            </h5>
                            <div className={`${isSnapshotting ? 'opacity-0' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`} data-html2canvas-ignore>
                                <Edit2 className="w-3 h-3 text-trae-blue" />
                            </div>
                        </div>
                        <p className="text-sm font-semibold text-white leading-snug">
                            {team.topic || <span className="text-gray-500 italic">No topic assigned...</span>}
                        </p>
                        {team.topicZh && (
                            <p className="text-xs text-gray-400 mt-0.5">
                                {team.topicZh}
                            </p>
                        )}
                    </div>
                 </TooltipWrapper>
             ) : (
                 // Edit Mode (Task)
                 <div className="relative z-10 space-y-2 animate-fade-in" data-html2canvas-ignore>
                     <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-trae-blue uppercase">Edit Task</h5>
                        
                        {/* Library Quick Pick Button */}
                        {taskLibrary.length > 0 && (
                            <button 
                                onClick={() => setIsLibraryOpen(!isLibraryOpen)}
                                className="text-[10px] flex items-center gap-1 text-trae-blue hover:text-white transition-colors px-2 py-0.5 rounded hover:bg-white/10"
                            >
                                <BookOpen className="w-3 h-3" />
                                Library
                                <ChevronDown className={`w-3 h-3 transition-transform ${isLibraryOpen ? 'rotate-180' : ''}`} />
                            </button>
                        )}
                     </div>
                     
                     {/* Library Dropdown */}
                     {isLibraryOpen && taskLibrary.length > 0 && (
                        <div className="bg-[#18181B] border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto scrollbar-thin absolute top-6 right-0 left-0 z-50 animate-fade-in">
                             <div className="p-1 space-y-0.5">
                                 {taskLibrary.map(t => (
                                     <button 
                                        key={t.id}
                                        onClick={() => selectTaskFromLibrary(t.id)}
                                        className="w-full text-left px-2 py-2 text-xs text-gray-300 hover:bg-trae-blue/20 hover:text-white rounded transition-colors flex flex-col gap-0.5"
                                     >
                                         <span className="font-medium truncate">{t.title}</span>
                                         {t.titleZh && <span className="text-[10px] text-gray-500 truncate">{t.titleZh}</span>}
                                     </button>
                                 ))}
                             </div>
                        </div>
                     )}

                     <input 
                         type="text"
                         value={tempTask}
                         onChange={(e) => setTempTask(e.target.value)}
                         placeholder="Task (EN)"
                         className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-trae-blue outline-none"
                     />
                     <input 
                         type="text"
                         value={tempTaskZh}
                         onChange={(e) => setTempTaskZh(e.target.value)}
                         placeholder="Task (CN)"
                         className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-trae-blue outline-none"
                     />
                     <div className="flex items-center gap-2">
                        <button 
                            onClick={saveEditingTask}
                            className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-[10px] py-1 rounded flex items-center justify-center gap-1"
                        >
                            <Check className="w-3 h-3" /> Save
                        </button>
                        <button 
                            onClick={() => { setIsEditingTask(false); setIsLibraryOpen(false); }}
                            className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[10px] py-1 rounded flex items-center justify-center gap-1"
                        >
                            <X className="w-3 h-3" /> Cancel
                        </button>
                     </div>
                 </div>
             )}
        </div>

        {/* Members */}
        <div className="space-y-3 mb-6 flex-grow">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <User className="w-3 h-3" /> Operatives / 队员
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3" ref={memberPickerRef}>
            {team.members.map((member) => (
              <div 
                key={member.id}
                className="relative flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5 group-hover:bg-white/10 group-hover:border-white/10 transition-all duration-300"
              >
                <TooltipWrapper text="Change Avatar / 更换头像">
                    <button 
                    onClick={() => setActiveMemberId(activeMemberId === member.id ? null : member.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg shrink-0 border border-white/10 ring-2 ring-black/50 transition-transform hover:scale-110 overflow-hidden bg-gradient-to-br ${getAvatarGradient(member.name)}`}
                    >
                        <span className="text-lg leading-none filter drop-shadow-sm">
                            {member.avatar || getMemberEmoji(member.name)}
                        </span>
                        <div className="absolute -bottom-1 -right-1 bg-white/10 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10" data-html2canvas-ignore>
                        <Edit2 className="w-2 h-2 text-white" />
                        </div>
                    </button>
                </TooltipWrapper>
                <span className={`text-sm font-medium text-gray-200 cursor-default ${!isSnapshotting ? 'truncate' : 'whitespace-normal break-words'}`} title={member.name}>{member.name}</span>
                {activeMemberId === member.id && (
                    <div className="absolute top-full left-0 mt-2 z-50 bg-[#18181B] border border-white/20 rounded-xl shadow-2xl p-3 w-48 animate-fade-in text-left" data-html2canvas-ignore>
                      <div className="mb-2 pb-2 border-b border-white/10">
                          <button 
                            onClick={() => handleMemberAvatarUpdate(member.id, undefined)}
                            className="w-full text-xs text-left px-2 py-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                          >
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border border-white/10 bg-gradient-to-br ${getAvatarGradient(member.name)}`}>
                                {getMemberEmoji(member.name)}
                            </span>
                            Reset / 重置
                          </button>
                      </div>
                      <div className="grid grid-cols-5 gap-1 max-h-32 overflow-y-auto scrollbar-thin">
                          {EMOJI_OPTIONS.slice(0, 40).map(e => (
                              <button 
                              key={e} 
                              onClick={() => handleMemberAvatarUpdate(member.id, e)} 
                              className="text-lg hover:bg-white/10 rounded p-1 transition-colors"
                              >
                                  {e}
                              </button>
                          ))}
                      </div>
                    </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Icebreaker */}
        <div className="pt-4 border-t border-white/5 mt-auto relative">
          <div className={`absolute inset-0 bg-gradient-to-t from-black/20 to-transparent transition-opacity duration-300 pointer-events-none rounded-b-2xl
            ${isSnapshotting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
          <div className="flex items-start gap-3 relative z-10">
            <div className={`p-1.5 rounded-full bg-trae-accent/10 text-trae-accent transition-colors ${isSnapshotting ? 'bg-trae-accent/20' : 'group-hover:bg-trae-accent/20'}`}>
               <MessageCircle className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-400 leading-relaxed">
                <span className={`text-trae-accent font-medium underline-offset-4 transition-all ${isSnapshotting ? 'underline decoration-trae-accent/50' : 'group-hover:underline decoration-trae-accent/50'}`}>Answer this doubt:</span>{' '}
                {team.icebreaker}
              </p>
              {team.icebreakerZh && (
                <p className={`text-sm text-gray-500 transition-colors ${isSnapshotting ? 'text-gray-400' : 'group-hover:text-gray-400'}`}>
                  {team.icebreakerZh}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
    </>
  );
};

export default TeamCard;
