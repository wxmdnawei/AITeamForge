
import React, { useRef } from 'react';
import { X, Trash2, Upload, Calendar, Users, Clock, ArrowRight, Download, FileJson } from 'lucide-react';
import { SavedMatch } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SavedMatch[];
  onLoad: (match: SavedMatch) => void;
  onDelete: (id: string) => void;
  onImport: (matches: SavedMatch[]) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onLoad,
  onDelete,
  onImport
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const handleExport = () => {
    if (history.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `trae_history_export_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
            onImport(json);
        } else {
            alert("Invalid file format. Expected an array of records. / 文件格式错误。");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse JSON. / 解析 JSON 失败。");
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-trae-card border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-2xl">
          <div>
            <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-trae-purple" />
              Match History
            </h3>
            <p className="text-xs text-gray-400">Manage your saved team generations / 历史记录管理</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500 space-y-2">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <Clock className="w-6 h-6 opacity-30" />
              </div>
              <p className="text-sm">No history saved yet.</p>
              <p className="text-xs opacity-50">暂无保存记录。</p>
            </div>
          ) : (
            history.map((match) => (
              <div 
                key={match.id}
                className="bg-black/20 border border-white/5 hover:border-trae-purple/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all hover:bg-white/5 group"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm">{match.eventName || 'Untitled Event'}</h4>
                    <span className="text-[10px] bg-white/10 text-gray-300 px-1.5 py-0.5 rounded border border-white/5">
                      {formatDate(match.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate max-w-xs">{match.eventTheme}</p>
                  <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-1">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {match.participantCount} Participants</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {match.teams.length} Teams</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                  <button
                    onClick={() => onDelete(match.id)}
                    className="p-2 rounded-lg border border-white/5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-colors"
                    title="Delete / 删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onLoad(match)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-trae-blue/10 text-trae-blue border border-trae-blue/20 hover:bg-trae-blue hover:text-white transition-all font-medium text-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Load Record
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with Import/Export */}
        <div className="p-3 border-t border-white/10 bg-white/5 rounded-b-2xl flex items-center justify-between">
           <div className="flex items-center gap-2">
               <input 
                   type="file" 
                   ref={fileInputRef} 
                   onChange={handleFileChange} 
                   className="hidden" 
                   accept=".json"
               />
               <button 
                onClick={handleImportClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 hover:text-white border border-white/5 transition-colors"
               >
                   <FileJson className="w-3.5 h-3.5" />
                   <span>Import / 导入</span>
               </button>
               <button 
                onClick={handleExport}
                disabled={history.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 hover:text-white border border-white/5 transition-colors disabled:opacity-50"
               >
                   <Download className="w-3.5 h-3.5" />
                   <span>Export All / 导出全部</span>
               </button>
           </div>
           <p className="text-[10px] text-gray-500 hidden sm:block">
             Local Storage / 本地存储
           </p>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
