import React, { useState, useEffect, useMemo } from 'react';
import { CharacterType, ExpRecord } from '../types';
import { calculateExpDifference, getRequiredExp, calculateFinalLevel } from '../services/expService';
import { QUEST_LIST } from '../constants';
import { Save, Trash2, TrendingUp, Info, Calculator, Search, XCircle, AlertCircle, Map as MapIcon, BarChart3, ListChecks, ArrowRight, Filter } from 'lucide-react';

enum TrackerTab {
    GRINDING = 'GRINDING',
    QUEST = 'QUEST'
}

interface QuestDef {
    id: string;
    minLv: number;
    name: string;
    baseExp: number;
    type?: string; // 'EDEN' | 'DAILY'
}

export const ExpTracker: React.FC = () => {
  // --- Tab State ---
  const [activeTab, setActiveTab] = useState<TrackerTab>(TrackerTab.GRINDING);

  // --- Shared / Common State ---
  const [charType, setCharType] = useState<CharacterType>(CharacterType.NORMAL_POST_TRANS);
  const [startLv, setStartLv] = useState<number>(200);
  const [startPct, setStartPct] = useState<number>(0);
  
  // Modifiers (Shared)
  const [serverRate, setServerRate] = useState<number>(200);
  const [gearRate, setGearRate] = useState<number>(0);
  const [manualBook, setManualBook] = useState<number>(0); // 0, 50, 100, 200
  const [isDaiDai, setIsDaiDai] = useState<boolean>(false);

  // --- Grinding Calculator State ---
  const [mapName, setMapName] = useState('');
  const [endLv, setEndLv] = useState<number>(200);
  const [endPct, setEndPct] = useState<number>(10);
  const [duration, setDuration] = useState<number>(60); // minutes
  const [startReqExp, setStartReqExp] = useState<number | null>(null);
  const [calculatedGained, setCalculatedGained] = useState<number>(0);
  const [calculatedBasePerHour, setCalculatedBasePerHour] = useState<number>(0);

  // --- Quest Calculator State ---
  const [selectedQuests, setSelectedQuests] = useState<Set<string>>(new Set());
  const [questResultLevel, setQuestResultLevel] = useState<{level: number, percent: number} | null>(null);
  const [questTotalBaseExp, setQuestTotalBaseExp] = useState<number>(0);
  const [questTotalFinalExp, setQuestTotalFinalExp] = useState<number>(0);
  const [questCategoryFilter, setQuestCategoryFilter] = useState<'ALL' | 'EDEN' | 'DAILY'>('ALL');

  // Lazy init records
  const [records, setRecords] = useState<ExpRecord[]>(() => {
    try {
        const saved = localStorage.getItem('ro_exp_records');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
  });

  // Filter State
  const [filterMap, setFilterMap] = useState('');
  const [filterManual, setFilterManual] = useState<boolean | null>(null); 
  const [filterDaiDai, setFilterDaiDai] = useState<boolean | null>(null);

  // --- Effects ---

  // Auto-save records
  useEffect(() => {
    localStorage.setItem('ro_exp_records', JSON.stringify(records));
  }, [records]);

  // Level Cap Check
  useEffect(() => {
    const max = getMaxLevel();
    if (startLv > max) setStartLv(max);
    if (endLv > max) setEndLv(max);
  }, [charType]);

  // Grinding Calculation (Standard RO Logic with User's specific Book Logic)
  useEffect(() => {
    if (activeTab !== TrackerTab.GRINDING) return;
    
    const gained = calculateExpDifference(startLv, startPct, endLv, endPct, charType);
    setCalculatedGained(gained);

    const req = getRequiredExp(startLv, charType);
    setStartReqExp(req);

    // Grinding Multiplier Logic:
    // Server Rate: serverRate / 100 (e.g. 200 -> 2.0x)
    // Book Logic: 50% book = 1.25x (1 + 50/200)
    // Gear Logic: gearRate is additive to book effective rate (assumed 1% = +0.01)
    
    const modifierMultiplier = 1 + (manualBook / 200) + (gearRate / 100);
    const serverMultiplier = serverRate / 100;

    let totalMultiplier = serverMultiplier * modifierMultiplier;
    
    if (isDaiDai) totalMultiplier *= 2; 

    if (duration > 0 && totalMultiplier > 0) {
      const perHour = (gained / (duration / 60));
      setCalculatedBasePerHour(perHour);
    } else {
      setCalculatedBasePerHour(0);
    }
  }, [startLv, startPct, endLv, endPct, charType, duration, serverRate, gearRate, manualBook, isDaiDai, activeTab]);

  // Quest Calculation (User Custom Logic)
  useEffect(() => {
    if (activeTab !== TrackerTab.QUEST) return;

    // 1. Calculate Raw Base Exp from Selected Quests
    let rawBase = 0;
    selectedQuests.forEach(id => {
        const quest = QUEST_LIST.find(q => q.id === id);
        if (quest) rawBase += quest.baseExp;
    });

    setQuestTotalBaseExp(rawBase);

    // 2. Apply Multipliers
    // Formula: Server Rate / 100 (e.g., 200 -> 2x)
    const serverMultiplier = serverRate / 100;

    // Book: User specified 50% book = 1.25x (1 + 50/200)
    const bookMultiplier = 1 + (manualBook / 200);

    const finalExp = rawBase * serverMultiplier * bookMultiplier;
    setQuestTotalFinalExp(finalExp);

    // 3. Calculate Result Level
    const result = calculateFinalLevel(startLv, startPct, finalExp, charType);
    setQuestResultLevel(result);

    // Debug Display
    const req = getRequiredExp(startLv, charType);
    setStartReqExp(req);

  }, [startLv, startPct, selectedQuests, serverRate, manualBook, activeTab, charType]);


  // --- Handlers ---

  const handleSave = () => {
    const newRecord: ExpRecord = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mapName: mapName || '未命名地圖',
      startLevel: startLv,
      startPercent: startPct,
      endLevel: endLv,
      endPercent: endPct,
      durationMinutes: duration,
      serverExpRate: serverRate,
      itemExpRate: gearRate,
      manualBook,
      isDaiDai,
      totalExpGained: calculatedGained,
      expPerHour: calculatedBasePerHour
    };
    setRecords(prev => [newRecord, ...prev]);
  };

  const handleDelete = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const toggleQuest = (id: string) => {
      const newSet = new Set(selectedQuests);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedQuests(newSet);
  };

  const toggleQuestGroup = (minLv: number, select: boolean) => {
      const newSet = new Set(selectedQuests);
      const visibleQuests = QUEST_LIST.filter(q => {
          if (questCategoryFilter === 'ALL') return true;
          return q.type === questCategoryFilter;
      });
      
      visibleQuests.filter(q => q.minLv === minLv).forEach(q => {
          if (select) newSet.add(q.id);
          else newSet.delete(q.id);
      });
      setSelectedQuests(newSet);
  };

  // --- Helpers ---

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(Math.floor(num));
  };

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
        const matchMap = record.mapName.toLowerCase().includes(filterMap.toLowerCase());
        const matchManual = filterManual === null ? true : filterManual ? record.manualBook > 0 : record.manualBook === 0;
        const matchDaiDai = filterDaiDai === null ? true : filterDaiDai ? record.isDaiDai : !record.isDaiDai;
        return matchMap && matchManual && matchDaiDai;
    });
  }, [records, filterMap, filterManual, filterDaiDai]);

  const mapStatistics = useMemo(() => {
      const stats: Record<string, { totalExp: number; count: number }> = {};
      records.forEach(record => {
          const name = record.mapName;
          if (!stats[name]) stats[name] = { totalExp: 0, count: 0 };
          stats[name].totalExp += record.expPerHour;
          stats[name].count += 1;
      });
      return Object.entries(stats)
          .map(([name, data]) => ({
              name,
              avgExp: data.totalExp / data.count,
              count: data.count
          }))
          .sort((a, b) => b.avgExp - a.avgExp);
  }, [records]);

  const getMaxLevel = () => {
      return charType === CharacterType.NORMAL_PRE_TRANS ? 99 : 260;
  };

  // Group quests
  const groupedQuests = useMemo(() => {
      const groups: Record<string, QuestDef[]> = {};
      QUEST_LIST.forEach(q => {
          // Filter Logic
          if (questCategoryFilter !== 'ALL') {
              if (q.type !== questCategoryFilter) return;
          }

          const k = String(q.minLv);
          if (!groups[k]) groups[k] = [];
          groups[k].push(q);
      });
      return groups;
  }, [questCategoryFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-ro-primary rounded-xl shadow-xl border border-ro-secondary overflow-hidden">
        
        {/* Tab Header */}
        <div className="flex border-b border-ro-secondary bg-slate-900">
            <button 
                onClick={() => setActiveTab(TrackerTab.GRINDING)}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === TrackerTab.GRINDING ? 'bg-ro-primary text-white border-b-2 border-ro-highlight' : 'text-ro-muted hover:text-white hover:bg-slate-800'}`}
            >
                <Calculator className="w-4 h-4" />
                練功效率計算
            </button>
            <button 
                onClick={() => setActiveTab(TrackerTab.QUEST)}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === TrackerTab.QUEST ? 'bg-ro-primary text-white border-b-2 border-ro-highlight' : 'text-ro-muted hover:text-white hover:bg-slate-800'}`}
            >
                <ListChecks className="w-4 h-4" />
                任務經驗計算
            </button>
        </div>

        <div className="p-6">
            {/* Common Input Section (Start Level & Modifiers) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 border-b border-ro-secondary pb-8">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-ro-muted mb-2">職業類型</label>
                        <select 
                            value={charType}
                            onChange={(e) => setCharType(e.target.value as CharacterType)}
                            className="w-full bg-slate-800 border border-ro-secondary rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-ro-accent outline-none"
                        >
                            {Object.values(CharacterType).map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                        {charType === CharacterType.NORMAL_PRE_TRANS && (
                            <div className="mt-2 text-xs text-orange-400 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                轉生前職業最高等級限制為 99
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-ro-muted mb-2">當前等級 (開始)</label>
                        <div className="flex space-x-2">
                        <input 
                            type="number"
                            min="1"
                            max={getMaxLevel()}
                            value={startLv}
                            onChange={(e) => setStartLv(Math.min(getMaxLevel(), Math.max(1, parseInt(e.target.value) || 0)))}
                            className="w-full bg-slate-800 border border-ro-secondary rounded-lg px-3 py-2 text-white"
                        />
                        <input 
                            type="number" 
                            value={startPct}
                            step="0.01"
                            onChange={(e) => setStartPct(parseFloat(e.target.value) || 0)}
                            placeholder="%"
                            className="w-full bg-slate-800 border border-ro-secondary rounded-lg px-3 py-2 text-white"
                        />
                        <span className="flex items-center text-ro-muted">%</span>
                        </div>
                        {startReqExp && (
                            <div className="mt-1 text-xs text-ro-muted flex justify-between">
                                <span>升級需求:</span>
                                <span className="text-ro-gold font-mono">{formatNumber(startReqExp)}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-slate-800 rounded-lg border border-ro-secondary space-y-4">
                    <h3 className="font-semibold text-ro-highlight">經驗倍率設定</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-ro-muted flex items-center">
                                伺服器倍率 (%)
                            </label>
                            <input type="number" value={serverRate} onChange={e => setServerRate(Number(e.target.value))} className="w-full bg-slate-900 border border-ro-secondary rounded p-1 text-sm text-white" />
                        </div>
                        <div>
                            <label className="text-xs text-ro-muted">裝備/其他加成 (%)</label>
                            <input 
                                type="number" 
                                value={gearRate} 
                                onChange={e => setGearRate(Number(e.target.value))} 
                                className={`w-full bg-slate-900 border border-ro-secondary rounded p-1 text-sm ${activeTab === TrackerTab.QUEST ? 'text-ro-muted opacity-50 cursor-not-allowed' : 'text-white'}`}
                                disabled={activeTab === TrackerTab.QUEST}
                                title={activeTab === TrackerTab.QUEST ? '任務經驗不套用裝備加成' : ''}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-ro-muted mb-1 block">經驗書 (Battle Manual)</label>
                        <div className="flex space-x-2">
                            {[0, 50, 100, 200].map(val => (
                                <button
                                    key={val}
                                    onClick={() => setManualBook(val)}
                                    className={`px-3 py-1 rounded text-sm border ${manualBook === val ? 'bg-ro-accent border-ro-accent text-white' : 'border-ro-secondary text-ro-muted hover:bg-slate-700'}`}
                                >
                                    {val === 0 ? '無' : `+${val}%`}
                                </button>
                            ))}
                        </div>
                    </div>
                     <div className="flex items-center space-x-2">
                        <input 
                            type="checkbox" 
                            id="daidai" 
                            checked={isDaiDai} 
                            onChange={e => setIsDaiDai(e.target.checked)} 
                            className={`w-4 h-4 rounded bg-slate-900 border-ro-secondary accent-ro-accent ${activeTab === TrackerTab.QUEST ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={activeTab === TrackerTab.QUEST}
                        />
                        <label 
                            htmlFor="daidai" 
                            className={`text-sm select-none cursor-pointer text-ro-text ${activeTab === TrackerTab.QUEST ? 'opacity-50 line-through' : ''}`}
                            title={activeTab === TrackerTab.QUEST ? '任務經驗不套用呆呆加倍' : ''}
                        >
                            活動/呆呆加倍 (x2)
                        </label>
                    </div>
                </div>
            </div>

            {/* Content Switched by Tab */}
            {activeTab === TrackerTab.GRINDING ? (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-ro-muted mb-2">結束等級 (目標)</label>
                            <div className="flex space-x-2">
                            <input 
                                type="number" 
                                min="1"
                                max={getMaxLevel()}
                                value={endLv}
                                onChange={(e) => setEndLv(Math.min(getMaxLevel(), Math.max(1, parseInt(e.target.value) || 0)))}
                                className="w-full bg-slate-800 border border-ro-secondary rounded-lg px-3 py-2 text-white"
                            />
                            <input 
                                type="number" 
                                value={endPct}
                                step="0.01"
                                onChange={(e) => setEndPct(parseFloat(e.target.value) || 0)}
                                placeholder="%"
                                className="w-full bg-slate-800 border border-ro-secondary rounded-lg px-3 py-2 text-white"
                            />
                            <span className="flex items-center text-ro-muted">%</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-ro-muted mb-2">地圖名稱</label>
                            <input 
                                type="text"
                                value={mapName}
                                onChange={(e) => setMapName(e.target.value)}
                                placeholder="例如: 幻影龜島 2F"
                                className="w-full bg-slate-800 border border-ro-secondary rounded-lg px-4 py-2 text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-ro-muted mb-2">練功時長 (分鐘)</label>
                            <input 
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                                className="w-full bg-slate-800 border border-ro-secondary rounded-lg px-4 py-2 text-white"
                            />
                        </div>

                        <button 
                            onClick={handleSave}
                            disabled={calculatedGained <= 0}
                            className="w-full bg-ro-success hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-emerald-900/20"
                        >
                            <Save className="w-5 h-5" />
                            <span>儲存練功紀錄</span>
                        </button>
                     </div>

                     <div className="bg-slate-800 rounded-xl p-6 border border-ro-secondary flex flex-col justify-center space-y-8">
                        <div className="text-center">
                            <h3 className="text-ro-muted uppercase text-sm tracking-wider mb-2">本次獲得總經驗值</h3>
                            <div className="text-4xl md:text-5xl font-black text-ro-gold drop-shadow-lg">
                                {formatNumber(calculatedGained)}
                            </div>
                            <div className="mt-2 text-sm text-ro-muted">
                                {(calculatedGained / 1000000).toFixed(2)} M
                            </div>
                        </div>

                        <div className="text-center">
                            <h3 className="text-ro-muted uppercase text-sm tracking-wider mb-2 flex items-center justify-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                <span>平均效率 (每小時)</span>
                            </h3>
                            <div className="text-3xl md:text-4xl font-bold text-ro-highlight">
                                {formatNumber(calculatedBasePerHour)}
                            </div>
                            <div className="mt-2 text-sm text-ro-muted">
                                {(calculatedBasePerHour / 100000000).toFixed(3)} 億 / Hr
                            </div>
                        </div>
                     </div>
                 </div>
            ) : (
                /* Quest Calculator View */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Quest List (Left) */}
                    <div className="lg:col-span-7 bg-slate-800 rounded-lg border border-ro-secondary p-4 max-h-[600px] overflow-y-auto flex flex-col">
                        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
                             <h3 className="font-bold text-white flex items-center gap-2">
                                <ListChecks className="w-5 h-5 text-ro-highlight" />
                                選擇任務
                             </h3>
                             
                             {/* Category Filter */}
                             <div className="flex bg-slate-900 rounded-lg p-1 border border-ro-secondary">
                                 <button 
                                    onClick={() => setQuestCategoryFilter('ALL')}
                                    className={`px-3 py-1 text-xs rounded transition-colors ${questCategoryFilter === 'ALL' ? 'bg-ro-highlight text-black font-bold' : 'text-ro-muted hover:text-white'}`}
                                 >
                                     全部
                                 </button>
                                 <button 
                                    onClick={() => setQuestCategoryFilter('EDEN')}
                                    className={`px-3 py-1 text-xs rounded transition-colors ${questCategoryFilter === 'EDEN' ? 'bg-ro-accent text-white font-bold' : 'text-ro-muted hover:text-white'}`}
                                 >
                                     伊甸園
                                 </button>
                                 <button 
                                    onClick={() => setQuestCategoryFilter('DAILY')}
                                    className={`px-3 py-1 text-xs rounded transition-colors ${questCategoryFilter === 'DAILY' ? 'bg-purple-500 text-white font-bold' : 'text-ro-muted hover:text-white'}`}
                                 >
                                     每日任務
                                 </button>
                             </div>

                             <button 
                                onClick={() => setSelectedQuests(new Set())}
                                className="text-xs text-ro-muted hover:text-white underline ml-2"
                             >
                                清除全部
                             </button>
                        </div>
                        
                        <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                            {Object.entries(groupedQuests).sort((a,b) => Number(a[0]) - Number(b[0])).map(([level, quests]) => (
                                <div key={level} className="space-y-2">
                                    <div className="flex items-center gap-2 bg-slate-900 p-2 rounded border border-ro-secondary">
                                        <span className="font-bold text-ro-gold text-sm w-16">{level} 區間</span>
                                        <div className="flex-1 h-px bg-slate-700"></div>
                                        <button 
                                            onClick={() => toggleQuestGroup(Number(level), true)}
                                            className="text-[10px] px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-white"
                                        >
                                            全選
                                        </button>
                                        <button 
                                            onClick={() => toggleQuestGroup(Number(level), false)}
                                            className="text-[10px] px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-white"
                                        >
                                            取消
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2">
                                        {(quests as QuestDef[]).map(quest => (
                                            <div 
                                                key={quest.id} 
                                                onClick={() => toggleQuest(quest.id)}
                                                className={`
                                                    cursor-pointer p-2 rounded border text-sm flex justify-between items-center transition-all relative overflow-hidden
                                                    ${selectedQuests.has(quest.id) 
                                                        ? 'bg-blue-900/30 border-ro-highlight shadow-inner' 
                                                        : 'bg-slate-900/50 border-transparent hover:bg-slate-700'}
                                                `}
                                            >
                                                {/* Quest Type Indicator Strip */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${quest.type === 'DAILY' ? 'bg-purple-500' : 'bg-ro-accent'}`}></div>
                                                
                                                <div className="flex items-center gap-2 pl-2">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selectedQuests.has(quest.id) ? 'bg-ro-highlight border-ro-highlight' : 'border-slate-500'}`}>
                                                        {selectedQuests.has(quest.id) && <div className="w-2 h-2 bg-white rounded-sm" />}
                                                    </div>
                                                    <span className={`truncate max-w-[140px] ${selectedQuests.has(quest.id) ? 'text-white' : 'text-slate-400'}`} title={quest.name}>
                                                        {quest.name}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-ro-muted font-mono flex-shrink-0">{(quest.baseExp / 1000000).toFixed(1)}M</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quest Results (Right) */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="bg-slate-800 rounded-lg border border-ro-secondary p-6 sticky top-6">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-ro-gold" />
                                任務獎勵試算
                            </h3>
                            
                            <div className="space-y-6">
                                <div>
                                    <div className="text-sm text-ro-muted mb-1 flex justify-between">
                                        <span>預計獲得總經驗 (Base)</span>
                                        <span className="text-ro-success text-xs bg-slate-900 px-2 py-0.5 rounded">
                                            倍率: x{(questTotalFinalExp > 0 && questTotalBaseExp > 0 ? (questTotalFinalExp / questTotalBaseExp).toFixed(2) : '0.00')}
                                        </span>
                                    </div>
                                    <div className="text-3xl font-bold text-ro-highlight font-mono">
                                        {formatNumber(questTotalFinalExp)}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        基礎: {formatNumber(questTotalBaseExp)} x (伺服器+書本加成)
                                    </div>
                                    <div className="text-xs text-ro-muted mt-0.5">
                                        (註: 伺服器 200% 為 2 倍, 書本 50% 為 1.25 倍)
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-900 rounded border border-ro-secondary relative overflow-hidden">
                                     <div className="absolute top-0 right-0 p-2 opacity-10">
                                         <TrendingUp className="w-24 h-24 text-white" />
                                     </div>
                                     <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="text-sm text-ro-muted">等級變化</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div>
                                                <div className="text-2xl font-bold text-slate-400">Lv.{startLv}</div>
                                                <div className="text-xs text-slate-500">{startPct.toFixed(1)}%</div>
                                            </div>
                                            <ArrowRight className="w-6 h-6 text-ro-gold animate-pulse" />
                                            <div>
                                                <div className="text-4xl font-bold text-white">
                                                    Lv.{questResultLevel ? questResultLevel.level : startLv}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-sm text-ro-highlight font-bold">
                                                        {questResultLevel ? questResultLevel.percent.toFixed(2) : startPct.toFixed(2)}%
                                                    </div>
                                                    {questResultLevel && (
                                                        <span className="text-xs text-ro-success bg-slate-800 px-1 rounded">
                                                            +{( (questResultLevel.percent - startPct) + (questResultLevel.level - startLv) * 100 ).toFixed(2)}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {questResultLevel && (questResultLevel.level - startLv > 0) && (
                                            <div className="mt-2 inline-block bg-ro-success text-white text-xs px-2 py-0.5 rounded font-bold">
                                                +{questResultLevel.level - startLv} Level UP!
                                            </div>
                                        )}
                                        {questTotalFinalExp === 0 && (
                                            <div className="mt-2 text-xs text-ro-danger">
                                                * 請先選擇左側任務以計算
                                            </div>
                                        )}
                                     </div>
                                </div>
                                
                                <div className="text-xs text-ro-muted">
                                    <p>* 計算結果僅供參考，實際經驗可能因伺服器特定設定而異。</p>
                                    <p>* 任務經驗僅套用「伺服器加倍」與「經驗書」，呆呆與裝備不計算。</p>
                                    <p>* 此處僅計算 Base EXP。</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Shared: Map Statistics Section */}
      {activeTab === TrackerTab.GRINDING && (
        <>
            <div className="bg-ro-primary rounded-xl p-6 shadow-xl border border-ro-secondary">
                <div className="flex items-center space-x-2 mb-6">
                    <BarChart3 className="w-5 h-5 text-ro-highlight" />
                    <h3 className="text-xl font-bold text-white">地圖效率統計</h3>
                    <span className="text-xs text-ro-muted">(平均時薪)</span>
                </div>

                {mapStatistics.length === 0 ? (
                    <div className="p-8 text-center text-ro-muted bg-slate-900/50 rounded-lg border border-slate-800">
                        <MapIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>尚無數據，請先新增練功紀錄</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {mapStatistics.map((stat, index) => (
                            <div key={stat.name} className="bg-slate-800 p-4 rounded-lg border border-ro-secondary flex flex-col shadow-lg">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-white text-lg truncate pr-2" title={stat.name}>
                                        {stat.name}
                                    </h4>
                                    {index === 0 && <span className="bg-ro-gold text-black text-xs font-bold px-2 py-0.5 rounded-full">TOP 1</span>}
                                </div>
                                
                                <div className="flex-1 flex flex-col justify-end">
                                    <div className="text-2xl font-mono font-bold text-ro-highlight">
                                        {formatNumber(stat.avgExp)}
                                    </div>
                                    <div className="flex justify-between items-end mt-1">
                                        <span className="text-xs text-ro-muted">Exp / 60mins</span>
                                        <span className="text-xs text-slate-500 bg-slate-900 px-2 py-0.5 rounded">
                                            {stat.count} 筆紀錄
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* History Table & Filter */}
            <div className="bg-ro-primary rounded-xl p-6 shadow-xl border border-ro-secondary">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        練功紀錄
                    </h3>
                    
                    {/* Filter Controls */}
                    <div className="flex flex-col md:flex-row gap-3 bg-slate-800 p-2 rounded-lg border border-ro-secondary">
                        <div className="flex items-center gap-2 px-2">
                            <Search className="w-4 h-4 text-ro-muted" />
                            <input 
                                type="text" 
                                placeholder="搜尋地圖..." 
                                value={filterMap}
                                onChange={(e) => setFilterMap(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm text-white w-32 md:w-40 placeholder-ro-muted"
                            />
                            {filterMap && <button onClick={() => setFilterMap('')}><XCircle className="w-4 h-4 text-ro-muted hover:text-white"/></button>}
                        </div>
                        <div className="h-px md:h-6 w-full md:w-px bg-ro-secondary"></div>
                        <select 
                            value={filterManual === null ? 'all' : filterManual ? 'yes' : 'no'}
                            onChange={(e) => setFilterManual(e.target.value === 'all' ? null : e.target.value === 'yes')}
                            className="bg-transparent text-sm text-ro-muted outline-none hover:text-white"
                        >
                            <option value="all" className="bg-slate-800">全部經驗書</option>
                            <option value="yes" className="bg-slate-800">有吃書</option>
                            <option value="no" className="bg-slate-800">無吃書</option>
                        </select>
                        <div className="h-px md:h-6 w-full md:w-px bg-ro-secondary"></div>
                        <select 
                            value={filterDaiDai === null ? 'all' : filterDaiDai ? 'yes' : 'no'}
                            onChange={(e) => setFilterDaiDai(e.target.value === 'all' ? null : e.target.value === 'yes')}
                            className="bg-transparent text-sm text-ro-muted outline-none hover:text-white"
                        >
                            <option value="all" className="bg-slate-800">全部呆呆</option>
                            <option value="yes" className="bg-slate-800">有呆呆</option>
                            <option value="no" className="bg-slate-800">無呆呆</option>
                        </select>
                    </div>
                </div>

                {filteredRecords.length === 0 ? (
                    <div className="text-center py-12 text-ro-muted flex flex-col items-center bg-slate-900/50 rounded-lg">
                        <Info className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-lg font-medium">尚無符合的紀錄</p>
                        <p className="text-sm opacity-70">請調整篩選條件或新增紀錄</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-ro-secondary">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-800 text-ro-muted uppercase font-medium">
                                <tr>
                                    <th className="p-3 w-32">時間</th>
                                    <th className="p-3 w-48">地圖</th>
                                    <th className="p-3">等級變化</th>
                                    <th className="p-3">倍率設定</th>
                                    <th className="p-3 text-right">效率/Hr</th>
                                    <th className="p-3 text-center w-16">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ro-secondary bg-slate-900/50">
                                {filteredRecords.map(record => (
                                    <tr key={record.id} className="hover:bg-slate-800/80 transition-colors">
                                        <td className="p-3 text-ro-muted text-xs whitespace-pre-line">
                                            {record.date}
                                        </td>
                                        <td className="p-3 font-bold text-white">
                                            {record.mapName}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex flex-col">
                                                <div className="flex items-center space-x-1">
                                                    <span className="text-ro-muted">Lv.{record.startLevel}</span>
                                                    <span className="text-ro-secondary">→</span>
                                                    <span className="text-white font-bold">Lv.{record.endLevel}</span>
                                                </div>
                                                <div className="text-xs text-ro-muted">
                                                    {record.durationMinutes} 分鐘
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex flex-wrap gap-1">
                                                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-ro-secondary text-xs text-ro-muted">
                                                    S:{record.serverExpRate}%
                                                </span>
                                                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-ro-secondary text-xs text-ro-muted">
                                                    G:{record.itemExpRate}%
                                                </span>
                                                {record.manualBook > 0 && (
                                                    <span className="px-1.5 py-0.5 rounded bg-blue-900/30 border border-blue-800 text-xs text-blue-400">
                                                    書:{record.manualBook}%
                                                    </span>
                                                )}
                                                {record.isDaiDai && (
                                                    <span className="px-1.5 py-0.5 rounded bg-amber-900/30 border border-amber-800 text-xs text-amber-400">
                                                    呆呆
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="font-mono text-ro-highlight font-bold">
                                                {formatNumber(record.expPerHour)}
                                            </div>
                                            <div className="text-xs text-ro-muted">
                                                Exp / Hr
                                            </div>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button 
                                                onClick={() => handleDelete(record.id)}
                                                className="p-2 hover:bg-ro-danger/20 rounded-lg text-ro-muted hover:text-ro-danger transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
      )}
    </div>
  );
};