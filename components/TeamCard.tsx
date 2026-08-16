
import React, { useState, useRef, useEffect } from 'react';
import { Team, TaskItem, TeamAnalysis, Participant } from '../types';
import { MessageCircle, User, Sparkles, Copy, Check, Edit2, X, Target, ChevronDown, Download, Loader2, Volume2, BookOpen, Image as ImageIcon, RefreshCw, Play, Pause, Activity, TrendingUp, FileText, Award } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import html2canvas from 'html2canvas';
import { generateTeamPoster, analyzeTeamStrength, evaluateParticipant, generateTeamAvatar } from '../services/geminiService';

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
  const [analysisCopied, setAnalysisCopied] = useState(false);
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

  // Avatar Generation State
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisData, setAnalysisData] = useState<TeamAnalysis | null>(team.analysis || null);

  // Member Editing State
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const memberPickerRef = useRef<HTMLDivElement>(null);

  // Member Deep Profile State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Participant | null>(null);
  const [memberBio, setMemberBio] = useState("");
  const [isEvaluatingMember, setIsEvaluatingMember] = useState(false);

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

  // Restore analysis data from team prop if it exists
  useEffect(() => {
      if (team.analysis) {
          setAnalysisData(team.analysis);
      }
  }, [team.analysis]);

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

  const handleCopyAnalysis = async () => {
      if (!analysisData) return;
      const report = `Team Analysis: ${team.name}\nWin Rate: ${analysisData.winRate}%\nOverall: ${analysisData.overallScore}/100\n\nDimensions:\n- Innovation: ${analysisData.dimensions.innovation}\n- Technical: ${analysisData.dimensions.technical}\n- Chemistry: ${analysisData.dimensions.chemistry}\n- Presentation: ${analysisData.dimensions.presentation}\n\nComment: ${analysisData.comment}`;
      try {
          await navigator.clipboard.writeText(report);
          setAnalysisCopied(true);
          setTimeout(() => setAnalysisCopied(false), 2000);
      } catch (err) {
          console.error("Failed to copy report", err);
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

  const handleAnalyzeTeam = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (analysisData) {
        setShowAnalysisModal(true);
        return;
    }
    setIsAnalyzing(true);
    try {
        const result = await analyzeTeamStrength(team, eventName, eventTheme);
        if (result) {
            setAnalysisData(result);
            onUpdateTeam(team.id, { analysis: result });
            setShowAnalysisModal(true);
        } else {
            alert("Analysis failed. Try again.");
        }
    } catch (e) {
        console.error("Analysis Error", e);
    } finally {
        setIsAnalyzing(false);
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
      link.download = `Team_${safeName}.png`;
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
              backgroundColor: '#000000',
              allowTaint: true, // Allow tainted canvas for robustness
          });
          const link = document.createElement('a');
          link.download = `Poster_${team.name.replace(/\s+/g, '_')}.png`;
          link.href = canvas.toDataURL('image/png');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      } catch (e) {
          console.error("Poster download failed", e);
          alert("Failed to download poster: " + (e instanceof Error ? e.message : 'Unknown error'));
      } finally {
          setIsDownloadingPoster(false);
      }
  };

  const handleEmojiSelect = (e: React.MouseEvent, emoji: string) => {
    e.stopPropagation();
    onUpdateTeam(team.id, { mascotEmoji: emoji, mascotImageUrl: undefined }); // Clear image if emoji selected
    setIsPickerOpen(false);
  };

  const handleGenerateAvatar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGeneratingAvatar(true);
    setIsPickerOpen(false); // Close picker immediately to show loading state on mascot
    
    const avatar = await generateTeamAvatar(team, eventName, eventTheme);
    if (avatar) {
        onUpdateTeam(team.id, { mascotImageUrl: avatar });
    } else {
        alert("Failed to generate avatar. / 生成头像失败。");
    }
    setIsGeneratingAvatar(false);
  };

  const handleMemberAvatarUpdate = (memberId: string, avatar: string | undefined) => {
    const updatedMembers = team.members.map(m => 
        m.id === memberId ? { ...m, avatar } : m
    );
    onUpdateTeam(team.id, { members: updatedMembers });
    setActiveMemberId(null);
  };

  const handleOpenMemberProfile = (member: Participant) => {
      setSelectedMember(member);
      setMemberBio(member.bio || "");
      setShowProfileModal(true);
  };

  const handleSaveMemberProfile = () => {
      if (!selectedMember) return;
      const updatedMembers = team.members.map(m => 
          m.id === selectedMember.id ? { ...m, bio: memberBio } : m
      );
      onUpdateTeam(team.id, { members: updatedMembers });
      setSelectedMember({ ...selectedMember, bio: memberBio });
      // Keep modal open to allow evaluation
  };

  const handleEvaluateMember = async () => {
      if (!selectedMember || !memberBio.trim()) {
          alert("Please enter a bio/resume first. / 请先输入履历资料。");
          return;
      }
      setIsEvaluatingMember(true);
      const evaluation = await evaluateParticipant(
          { ...selectedMember, bio: memberBio }, 
          eventTheme, 
          team.topic
      );
      
      if (evaluation) {
        const updatedMembers = team.members.map(m => 
            m.id === selectedMember.id ? { ...m, bio: memberBio, evaluation } : m
        );
        onUpdateTeam(team.id, { members: updatedMembers });
        setSelectedMember({ ...selectedMember, bio: memberBio, evaluation });
      } else {
        alert("Evaluation failed. / 评估失败。");
      }
      setIsEvaluatingMember(false);
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
    {/* Member Profile Modal */}
    {showProfileModal && selectedMember && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in" data-html2canvas-ignore>
             <div className="bg-theme-card border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                 <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-2xl">
                     <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border border-white/10 bg-gradient-to-br ${getAvatarGradient(selectedMember.name)}`}>
                            {selectedMember.avatar || getMemberEmoji(selectedMember.name)}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">{selectedMember.name}</h3>
                            <p className="text-xs text-gray-400">Deep Profile & Quality Assessment</p>
                        </div>
                     </div>
                     <button onClick={() => setShowProfileModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
                 </div>

                 <div className="p-6 overflow-y-auto space-y-5">
                    {/* Bio Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-theme-secondary" />
                            Resume / Bio / Skills
                        </label>
                        <textarea 
                            value={memberBio}
                            onChange={(e) => setMemberBio(e.target.value)}
                            placeholder="Enter detailed resume, skills, or background info here...&#10;请输入详细履历、技能或背景信息..."
                            className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:ring-1 focus:ring-theme-primary outline-none resize-none"
                        />
                        <div className="flex justify-end">
                            <button onClick={handleSaveMemberProfile} className="text-xs text-theme-primary hover:text-theme-accent hover:underline">
                                Save Draft / 保存草稿
                            </button>
                        </div>
                    </div>
                    
                    {/* Evaluation Section */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                                <Award className="w-4 h-4 text-yellow-500" />
                                Quality Assessment
                            </h4>
                            <button 
                                onClick={handleEvaluateMember}
                                disabled={isEvaluatingMember || !memberBio}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isEvaluatingMember ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                AI Evaluate
                            </button>
                        </div>

                        {selectedMember.evaluation ? (
                            <div className="space-y-3 animate-fade-in">
                                <div className="flex items-center gap-4">
                                    <div className={`text-3xl font-black ${selectedMember.evaluation.score >= 80 ? 'text-green-400' : selectedMember.evaluation.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {selectedMember.evaluation.score}
                                    </div>
                                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${selectedMember.evaluation.score >= 80 ? 'bg-green-500' : selectedMember.evaluation.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                            style={{ width: `${selectedMember.evaluation.score}%` }}
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-300 italic">"{selectedMember.evaluation.reason}"</p>
                                <div className="flex flex-wrap gap-1">
                                    {selectedMember.evaluation.tags.map((tag, i) => (
                                        <span key={i} className="text-[10px] bg-white/10 text-gray-400 px-2 py-0.5 rounded border border-white/5">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-500 text-center py-2">No evaluation yet. Add bio and click evaluate.</p>
                        )}
                    </div>
                 </div>
             </div>
        </div>
    )}

    {/* Analysis Modal */}
    {showAnalysisModal && analysisData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in" data-html2canvas-ignore>
            <div className="relative w-full max-w-lg bg-theme-card border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col">
                <button 
                  onClick={() => setShowAnalysisModal(false)} 
                  className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 mb-6">
                    <Activity className="w-6 h-6 text-theme-primary" />
                    <h3 className="text-xl font-display font-bold text-white">Team Evaluation Report</h3>
                </div>

                <div className="flex items-center justify-between bg-white/5 rounded-xl p-6 mb-6">
                    <div className="space-y-1">
                        <p className="text-sm text-gray-400 font-medium">Predicted Win Rate</p>
                        <p className="text-xs text-gray-500">胜率预测</p>
                    </div>
                    <div className="text-center">
                        <div className={`text-4xl font-display font-black tracking-tight ${analysisData.winRate >= 80 ? 'text-green-400' : analysisData.winRate >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {analysisData.winRate}%
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1">Overall Score: {analysisData.overallScore}</div>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Dimensions Analysis / 维度分析</h4>
                    <div className="space-y-3">
                        {Object.entries(analysisData.dimensions).map(([key, value]) => (
                            <div key={key}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="capitalize text-gray-300">{key}</span>
                                    <span className="text-gray-400 font-mono">{value}/100</span>
                                </div>
                                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${value}%` }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                        className={`h-full rounded-full ${
                                            key === 'innovation' ? 'bg-theme-primary' :
                                            key === 'technical' ? 'bg-theme-secondary' :
                                            key === 'chemistry' ? 'bg-theme-accent' :
                                            'bg-green-500'
                                        }`} 
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-black/40 rounded-xl p-4 space-y-3 mb-6 border border-white/5">
                    <p className="text-sm text-gray-300 italic">"{analysisData.comment}"</p>
                    <div className="space-y-1">
                        {analysisData.suggestions.map((s, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
                                <TrendingUp className="w-3 h-3 text-theme-secondary mt-0.5" />
                                <span>{s}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end">
                    <button 
                        onClick={handleCopyAnalysis}
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-white/5 transition-colors"
                    >
                        {analysisCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        {analysisCopied ? "Copied!" : "Copy Report"}
                    </button>
                </div>
            </div>
        </div>
    )}

    {/* Poster Modal - Composite View */}
    {showPosterModal && team.posterUrl && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
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
                                <h2 className="text-lg text-theme-secondary font-display font-bold mt-1 tracking-widest drop-shadow-lg">
                                    {team.nameZh}
                                </h2>
                            )}
                        </div>
                        <div className="w-16 h-1 bg-theme-primary mx-auto rounded-full" />
                        <p className="text-base md:text-lg text-gray-200 font-serif italic max-w-[90%] mx-auto leading-relaxed drop-shadow-md opacity-90">
                            "{team.motto}"
                        </p>
                    </div>

                    <div className="flex-grow" />

                    {/* Footer: Members List (Corner Doc Style) */}
                    <div className="flex justify-between items-end gap-4">
                        {/* Bottom Left: Event Info */}
                        <div className="text-left opacity-70">
                             <p className="text-[10px] text-theme-accent uppercase tracking-[0.2em] font-bold mb-1">Event</p>
                             <p className="text-[9px] text-gray-300 font-mono uppercase leading-tight max-w-[100px]">{eventName}</p>
                             <p className="text-[9px] text-gray-400 font-mono mt-0.5">{new Date().toLocaleDateString()}</p>
                        </div>

                        {/* Bottom Right: Members (Document Style) */}
                        <div className="text-right max-w-[160px]">
                             <div className="flex items-center justify-end gap-2 mb-2 opacity-80">
                                 <div className="h-px w-8 bg-theme-secondary" />
                                 <p className="text-[10px] text-theme-secondary uppercase tracking-[0.2em] font-bold">Operatives</p>
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
                     <p className="text-[8px] text-white font-sans tracking-widest">GENERATED BY TEAM MATCHMAKER</p>
                 </div>
              </div>

              {/* Action Bar */}
              <div className="bg-[#18181B] p-4 rounded-b-2xl border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-gray-500">High-Res Composite</span>
                  <button 
                      onClick={handleDownloadPoster}
                      disabled={isDownloadingPoster}
                      className="flex items-center gap-2 px-6 py-2 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-lg transition-all font-bold text-sm shadow-lg hover:shadow-theme-primary/20 disabled:opacity-50 disabled:cursor-wait"
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
      className={`group relative bg-theme-card/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-visible transition-all duration-300 
        ${isSnapshotting 
            ? 'border-theme-primary/50 ring-1 ring-theme-primary/50 shadow-xl' // Force active look
            : 'hover:border-theme-primary/50 hover:ring-1 hover:ring-theme-primary/50 hover:shadow-2xl hover:shadow-theme-primary/20'}`}
    >
      {/* Background Gradient on Hover - Forced visible during snapshot */}
      <div className={`absolute inset-0 bg-gradient-to-br from-theme-primary/10 to-theme-secondary/10 transition-opacity duration-500 rounded-2xl overflow-hidden pointer-events-none
        ${isSnapshotting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} 
      />
      
      {/* Decorative glow blob - Forced visible during snapshot */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 bg-theme-accent/20 rounded-full blur-3xl transition-opacity duration-700 pointer-events-none
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
                    : 'text-gray-400 hover:text-theme-accent hover:bg-white/10'
                }`}
                >
                    {isPlaying ? (
                        isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                    )}
                </button>
            </TooltipWrapper>

            <TooltipWrapper text="Analyze Strength / 战力分析">
                <button
                    onClick={handleAnalyzeTeam}
                    disabled={isAnalyzing}
                    className={`p-1.5 rounded-lg focus:opacity-100 focus:outline-none transition-all ${analysisData ? 'text-green-400 hover:bg-green-500/10' : 'text-gray-400 hover:text-green-400 hover:bg-white/10'}`}
                >
                    {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-green-400" /> : <Activity className="w-3.5 h-3.5" />}
                </button>
            </TooltipWrapper>

            <TooltipWrapper text="Regenerate Identity / 重新生成">
                <button
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    className="p-1.5 text-gray-400 hover:text-theme-secondary hover:bg-white/10 rounded-lg focus:opacity-100 focus:outline-none transition-all disabled:opacity-50"
                >
                    {isRegenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-theme-secondary" /> : <RefreshCw className="w-3.5 h-3.5" />}
                </button>
            </TooltipWrapper>

            <TooltipWrapper text={team.posterUrl ? "View Poster / 查看海报" : "Generate Poster / 生成海报"}>
                <button
                    onClick={handleGeneratePoster}
                    disabled={isGeneratingPoster}
                    className={`p-1.5 rounded-lg focus:opacity-100 focus:outline-none transition-all ${team.posterUrl ? 'text-theme-primary hover:bg-theme-primary/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
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
                className="p-1.5 text-gray-400 hover:text-theme-accent hover:bg-white/10 rounded-lg focus:opacity-100 focus:outline-none"
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
                    onClick={(e) => { e.stopPropagation(); setIsPickerOpen(!isPickerOpen); }}
                    className={`inline-block origin-center cursor-pointer relative group/emoji focus:outline-none transition-all ${team.mascotImageUrl ? 'w-14 h-14' : 'text-4xl'}`}
                  >
                    {isGeneratingAvatar ? (
                        <div className="w-14 h-14 rounded-full flex items-center justify-center bg-white/10">
                            <Loader2 className="w-6 h-6 animate-spin text-theme-primary" />
                        </div>
                    ) : team.mascotImageUrl ? (
                        <img 
                            src={team.mascotImageUrl} 
                            alt="Avatar" 
                            className="w-full h-full object-cover rounded-full shadow-lg ring-2 ring-white/10 group-hover/emoji:ring-theme-primary/50 transition-all" 
                            crossOrigin="anonymous"
                        />
                    ) : (
                        team.mascotEmoji
                    )}
                    
                    {!isGeneratingAvatar && (
                        <div className="absolute -bottom-1 -right-1 bg-theme-primary/90 text-white rounded-full p-1 opacity-0 group-hover/emoji:opacity-100 transition-opacity shadow-lg transform scale-75" data-html2canvas-ignore>
                        <Edit2 className="w-3 h-3" />
                        </div>
                    )}
                  </motion.button>
                </TooltipWrapper>

                {/* Emoji Picker Popover */}
                {isPickerOpen && (
                  <div className="absolute top-full left-0 mt-2 z-[60] bg-[#18181B] border border-white/20 rounded-xl shadow-2xl p-3 w-64 animate-fade-in text-left" data-html2canvas-ignore>
                     <button 
                        onClick={handleGenerateAvatar}
                        disabled={isGeneratingAvatar}
                        className="w-full mb-3 bg-gradient-to-r from-theme-primary to-theme-secondary hover:from-theme-primary/90 hover:to-theme-secondary/90 text-white rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
                     >
                         <Sparkles className="w-3 h-3" />
                         Generate AI Avatar / 生成AI头像
                     </button>
                     
                     <div className="h-px bg-white/10 mb-2" />

                     <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto scrollbar-thin">
                        {EMOJI_OPTIONS.map(e => (
                           <button 
                            key={e} 
                            onClick={(ev) => handleEmojiSelect(ev, e)} 
                            className={`text-xl hover:bg-white/10 rounded p-1.5 transition-colors ${team.mascotEmoji === e && !team.mascotImageUrl ? 'bg-theme-primary/30' : ''}`}
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
                          className={`text-xl font-display font-bold text-white leading-tight group-hover:text-theme-primary transition-colors duration-300 cursor-pointer hover:underline decoration-dashed underline-offset-4 ${!isSnapshotting ? 'truncate' : 'whitespace-normal break-words'}`}
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
                      className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-lg font-bold text-white focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-all"
                      placeholder="Team Name (EN)"
                      autoFocus
                    />
                    <input 
                      type="text"
                      value={tempNameZh}
                      onChange={(e) => setTempNameZh(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEditingName()}
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm font-medium text-gray-300 focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-all"
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
                <span className="text-xs text-theme-secondary font-mono uppercase tracking-wider bg-theme-secondary/10 inline-block px-2 py-1 rounded border border-theme-secondary/20">
                  Team {index + 1}
                </span>
                <div className="h-px flex-grow bg-gradient-to-r from-white/10 to-transparent" />
              </div>
            )}
          </div>
        </div>

        {/* Motto */}
        <div className={`mb-4 p-3 bg-black/20 rounded-lg border-l-2 border-theme-primary transition-all duration-300
            ${isSnapshotting ? 'bg-black/40 translate-x-1' : 'group-hover:bg-black/40 group-hover:translate-x-1'}`}>
          <p className="text-sm italic text-gray-300 flex items-start gap-2">
             <Sparkles className={`w-3 h-3 text-theme-primary mt-1 shrink-0 transition-opacity ${isSnapshotting ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}`} />
             <span>"{team.motto}"</span>
          </p>
          {team.mottoZh && (
             <p className="text-sm italic text-gray-400 mt-1 pl-5">"{team.mottoZh}"</p>
          )}
        </div>

        {/* Assigned Task Topic */}
        {/* Now Editable */}
        <div className={`mb-6 p-3 rounded-lg bg-theme-secondary/10 border border-theme-secondary/20 relative overflow-visible transition-colors ${isSnapshotting ? 'border-theme-secondary/40' : 'group-hover:border-theme-secondary/40'}`}>
             <div className="absolute top-0 right-0 p-1 opacity-20 pointer-events-none">
                 <Target className="w-12 h-12 text-theme-secondary -rotate-12 translate-x-2 -translate-y-2" />
             </div>
             
             {!isEditingTask ? (
                 // View Mode (Task)
                 <TooltipWrapper text="Edit Task / 编辑任务" className="block">
                    <div 
                        onClick={() => setIsEditingTask(true)}
                        className="relative z-10 cursor-pointer"
                    >
                        <div className="flex justify-between items-start">
                            <h5 className="text-xs font-bold text-theme-secondary uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                                <Target className="w-3.5 h-3.5" />
                                Assigned Task / 任务选题
                            </h5>
                            <div className={`${isSnapshotting ? 'opacity-0' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`} data-html2canvas-ignore>
                                <Edit2 className="w-3 h-3 text-theme-secondary" />
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
                        <h5 className="text-xs font-bold text-theme-secondary uppercase">Edit Task</h5>
                        
                        {/* Library Quick Pick Button */}
                        {taskLibrary.length > 0 && (
                            <button 
                                onClick={() => setIsLibraryOpen(!isLibraryOpen)}
                                className="text-[10px] flex items-center gap-1 text-theme-secondary hover:text-white transition-colors px-2 py-0.5 rounded hover:bg-white/10"
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
                                        className="w-full text-left px-2 py-2 text-xs text-gray-300 hover:bg-theme-secondary/20 hover:text-white rounded transition-colors flex flex-col gap-0.5"
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
                         className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-theme-secondary outline-none"
                     />
                     <input 
                         type="text"
                         value={tempTaskZh}
                         onChange={(e) => setTempTaskZh(e.target.value)}
                         placeholder="Task (CN)"
                         className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-theme-secondary outline-none"
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
                <div className="relative">
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
                    {/* Score Badge */}
                    {member.evaluation && (
                        <div 
                            className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold border border-black/50 ${member.evaluation.score >= 80 ? 'bg-green-500 text-black' : member.evaluation.score >= 60 ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'}`}
                            title={`Score: ${member.evaluation.score}`}
                        >
                            {member.evaluation.score}
                        </div>
                    )}
                </div>

                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1">
                        <span className={`text-sm font-medium text-gray-200 cursor-default ${!isSnapshotting ? 'truncate' : 'whitespace-normal break-words'}`} title={member.name}>{member.name}</span>
                        <TooltipWrapper text="Deep Profile / 深度资料">
                            <button 
                                onClick={() => handleOpenMemberProfile(member)}
                                className="text-gray-500 hover:text-theme-secondary transition-colors p-1 rounded hover:bg-white/10"
                            >
                                <FileText className="w-3 h-3" />
                            </button>
                        </TooltipWrapper>
                    </div>
                </div>

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
            <div className={`p-1.5 rounded-full bg-theme-accent/10 text-theme-accent transition-colors ${isSnapshotting ? 'bg-theme-accent/20' : 'group-hover:bg-theme-accent/20'}`}>
               <MessageCircle className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-400 leading-relaxed">
                <span className={`text-theme-accent font-medium underline-offset-4 transition-all ${isSnapshotting ? 'underline decoration-theme-accent/50' : 'group-hover:underline decoration-theme-accent/50'}`}>Answer this doubt:</span>{' '}
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
