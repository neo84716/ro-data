import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Dna, RefreshCw, Zap, Shield, Star, ShieldCheck, History, Play, FastForward, Search, Trash2, Filter, AlertCircle, Layers, Settings2 } from 'lucide-react';
import { LT_ARMOR_ENCHANTS } from '../constants';
import { EnchantOption } from '../types';

const ARMOR_LIST = [
    "時光超越湧現鎧甲-LT",
    "深淵湖水咆嘯鎧甲-LT",
    "粗暴者龍影鎧甲-LT"
];

// Local Interface for History
interface EnchantHistoryItem {
    id: string;
    timestamp: string;
    armorName: string;
    slotName: string;
    slotId: number;
    result: EnchantOption;
    attempts: number; // For bulk/auto operations, counts as 1 or N
}

export const EnchantSimulator: React.FC = () => {
    // --- State ---
    const [selectedArmor, setSelectedArmor] = useState(ARMOR_LIST[0]);
    
    // Current Display Results (Last enchanted item)
    const [results, setResults] = useState<{[key: number]: EnchantOption | null}>({
        4: null, 3: null, 2: null
    });

    // Animation States
    const [isAnimating, setIsAnimating] = useState<{[key: number]: boolean}>({
        4: false, 3: false, 2: false
    });

    // Settings per slot (Batch size & Target)
    const [batchCounts, setBatchCounts] = useState<{[key: number]: number}>({
        4: 1, 3: 1, 2: 1
    });
    const [targets, setTargets] = useState<{[key: number]: string}>({
        4: '', 3: '', 2: ''
    });

    // History with Persistence
    const [history, setHistory] = useState<EnchantHistoryItem[]>(() => {
        try {
            const saved = localStorage.getItem('ro_enchant_history');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [filterSlot, setFilterSlot] = useState<number | 'all'>('all');
    const [filterText, setFilterText] = useState('');
    const historyEndRef = useRef<HTMLDivElement>(null);

    // Persist History
    useEffect(() => {
        localStorage.setItem('ro_enchant_history', JSON.stringify(history));
    }, [history]);

    // --- Logic ---

    // Helper: Perform a single RNG roll
    const rollEnchant = (slotId: number): EnchantOption | null => {
        const slotData = LT_ARMOR_ENCHANTS.find(s => s.slotId === slotId);
        if (!slotData) return null;

        const rand = Math.random() * 100;
        let cumulative = 0;
        for (const option of slotData.options) {
            cumulative += option.probability;
            if (rand <= cumulative) {
                return option;
            }
        }
        return slotData.options[slotData.options.length - 1];
    };

    // Full Enchant (4->3->2) - Single Run
    const handleFullEnchant = () => {
        setIsAnimating({ 4: true, 3: true, 2: true });

        setTimeout(() => {
            const newHistoryItems: EnchantHistoryItem[] = [];
            const newResults: {[key: number]: EnchantOption | null} = {};
            const timestamp = new Date().toLocaleTimeString();
            const batchId = Date.now().toString();

            [4, 3, 2].forEach((slotId) => {
                const result = rollEnchant(slotId);
                const slotData = LT_ARMOR_ENCHANTS.find(s => s.slotId === slotId);
                
                if (result && slotData) {
                    newResults[slotId] = result;
                    newHistoryItems.push({
                        id: `${batchId}-${slotId}`, 
                        timestamp: timestamp,
                        armorName: selectedArmor,
                        slotName: slotData.slotName,
                        slotId: slotId,
                        result: result,
                        attempts: 1
                    });
                }
            });

            setResults(newResults);
            setHistory(prev => [...newHistoryItems.reverse(), ...prev]);
            setIsAnimating({ 4: false, 3: false, 2: false });
        }, 800);
    };

    // Auto Combo Enchant (Until All Targets Match)
    const handleAutoCombo = async () => {
        // Targets are read from state
        const target4 = targets[4];
        const target3 = targets[3];
        const target2 = targets[2];

        // Ensure at least one target is set to avoid infinite accidental loops
        if (!target4 && !target3 && !target2) {
            alert("請至少在下方設定一個目標附魔 (例如：鬥志星雲1Lv) 才能開始自動組合模擬。");
            return;
        }

        setIsAnimating({ 4: true, 3: true, 2: true });

        // Small delay to let React render the loading state
        await new Promise(resolve => setTimeout(resolve, 100));

        let attempts = 0;
        let found = false;
        const maxAttempts = 200000; // High limit because combining probabilities can be very low
        
        let finalR4: EnchantOption | null = null;
        let finalR3: EnchantOption | null = null;
        let finalR2: EnchantOption | null = null;

        while (!found && attempts < maxAttempts) {
            attempts++;
            const r4 = rollEnchant(4);
            const r3 = rollEnchant(3);
            const r2 = rollEnchant(2);

            if (!r4 || !r3 || !r2) break; 

            // If target is empty string, it's a "wildcard" (any result is fine)
            const match4 = !target4 || r4.name === target4;
            const match3 = !target3 || r3.name === target3;
            const match2 = !target2 || r2.name === target2;

            if (match4 && match3 && match2) {
                found = true;
                finalR4 = r4;
                finalR3 = r3;
                finalR2 = r2;
            }
        }

        if (found && finalR4 && finalR3 && finalR2) {
             const timestamp = new Date().toLocaleTimeString();
             const batchId = Date.now().toString();
             const newHistoryItems: EnchantHistoryItem[] = [];
             
             // Create history records for the successful run
             const successSet = [
                 { slotId: 4, res: finalR4 },
                 { slotId: 3, res: finalR3 },
                 { slotId: 2, res: finalR2 }
             ];

             successSet.forEach(({slotId, res}) => {
                 const slotData = LT_ARMOR_ENCHANTS.find(s => s.slotId === slotId);
                 if (slotData) {
                    newHistoryItems.push({
                        id: `${batchId}-${slotId}`,
                        timestamp,
                        armorName: selectedArmor,
                        slotName: slotData.slotName,
                        slotId: slotId,
                        result: res,
                        attempts: attempts // Shows total full-set attempts
                    });
                 }
             });

             setResults({ 4: finalR4, 3: finalR3, 2: finalR2 });
             setHistory(prev => [...newHistoryItems.reverse(), ...prev]);
        } 
        
        setIsAnimating({ 4: false, 3: false, 2: false });
        
        if (!found) {
            alert(`模擬結束：經過 ${maxAttempts.toLocaleString()} 次全套嘗試仍未出現指定組合。\n機率可能過低，建議減少指定條件或分開附魔。`);
        }
    };

    // Manual / Batch Enchant
    const handleEnchant = (slotId: number, overrideCount?: number) => {
        const count = overrideCount || batchCounts[slotId] || 1;
        const slotData = LT_ARMOR_ENCHANTS.find(s => s.slotId === slotId);
        if (!slotData) return;

        setIsAnimating(prev => ({ ...prev, [slotId]: true }));

        if (overrideCount) {
            setBatchCounts(prev => ({ ...prev, [slotId]: overrideCount }));
        }

        setTimeout(() => {
            const newHistoryItems: EnchantHistoryItem[] = [];
            let lastResult: EnchantOption | null = null;

            for (let i = 0; i < count; i++) {
                const result = rollEnchant(slotId);
                if (result) {
                    lastResult = result;
                    newHistoryItems.push({
                        id: Date.now().toString() + Math.random().toString(),
                        timestamp: new Date().toLocaleTimeString(),
                        armorName: selectedArmor,
                        slotName: slotData.slotName,
                        slotId: slotId,
                        result: result,
                        attempts: 1
                    });
                }
            }

            setResults(prev => ({ ...prev, [slotId]: lastResult }));
            setHistory(prev => [...newHistoryItems.reverse(), ...prev]); 
            setIsAnimating(prev => ({ ...prev, [slotId]: false }));
        }, count > 1 ? 200 : 500);
    };

    // Auto Enchant (Until Target) - Single Slot
    const handleAutoEnchant = (slotId: number) => {
        const targetName = targets[slotId];
        if (!targetName) return;

        const slotData = LT_ARMOR_ENCHANTS.find(s => s.slotId === slotId);
        if (!slotData) return;

        setIsAnimating(prev => ({ ...prev, [slotId]: true }));

        setTimeout(() => {
            let attempts = 0;
            let found = false;
            let lastResult: EnchantOption | null = null;
            const maxAttempts = 5000;
            const newHistoryItems: EnchantHistoryItem[] = [];

            while (!found && attempts < maxAttempts) {
                const result = rollEnchant(slotId);
                attempts++;
                if (result) {
                    lastResult = result;
                    if (result.name === targetName) {
                        found = true;
                    }
                }
            }

            if (lastResult) {
                newHistoryItems.push({
                    id: Date.now().toString(),
                    timestamp: new Date().toLocaleTimeString(),
                    armorName: selectedArmor,
                    slotName: slotData.slotName,
                    slotId: slotId,
                    result: lastResult,
                    attempts: attempts
                });
            }

            setResults(prev => ({ ...prev, [slotId]: lastResult }));
            setHistory(prev => [...newHistoryItems, ...prev]);
            setIsAnimating(prev => ({ ...prev, [slotId]: false }));
        }, 100);
    };

    const handleResetDisplay = () => {
        setResults({ 4: null, 3: null, 2: null });
    };

    const clearHistory = () => {
        setHistory([]);
    };

    // --- Helper Functions ---

    const getRarityColor = (option: EnchantOption | null) => {
        if (!option) return "text-ro-muted";
        if (option.name.includes("3Lv") || option.name.includes("5")) return "text-red-400 font-bold drop-shadow-md"; 
        if (option.name.includes("2Lv") || option.name.includes("4")) return "text-ro-highlight font-semibold"; 
        if (option.isRare) return "text-ro-gold font-semibold"; 
        return "text-white"; 
    };

    const getRarityBg = (option: EnchantOption | null) => {
        if (!option) return "border-ro-secondary bg-slate-900";
        if (option.name.includes("3Lv") || option.name.includes("5")) return "border-red-500 bg-red-900/20 shadow-red-500/20 shadow-lg";
        if (option.name.includes("2Lv") || option.name.includes("4")) return "border-ro-highlight bg-blue-900/20";
        if (option.isRare) return "border-ro-gold bg-amber-900/20";
        return "border-ro-success bg-emerald-900/10";
    };

    const filteredHistory = useMemo(() => {
        return history.filter(item => {
            const matchSlot = filterSlot === 'all' ? true : item.slotId === filterSlot;
            const matchText = item.result.name.toLowerCase().includes(filterText.toLowerCase()) || 
                              item.armorName.toLowerCase().includes(filterText.toLowerCase());
            return matchSlot && matchText;
        });
    }, [history, filterSlot, filterText]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-ro-primary rounded-xl p-6 shadow-xl border border-ro-secondary relative overflow-hidden flex flex-col gap-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                            <Dna className="w-6 h-6 text-ro-highlight" />
                            高級附魔模擬器
                        </h2>
                        <p className="text-ro-muted text-sm">
                            支援批量附魔、目標指定自動附魔與完整紀錄。
                        </p>
                    </div>
                    
                    {/* Armor Selector */}
                    <div className="flex items-center gap-3 w-full md:w-auto bg-slate-800 p-2 rounded-lg border border-ro-secondary z-10">
                        <ShieldCheck className="w-5 h-5 text-ro-gold" />
                        <select 
                            value={selectedArmor}
                            onChange={(e) => setSelectedArmor(e.target.value)}
                            className="bg-transparent text-white w-full md:w-64 outline-none font-medium text-sm"
                        >
                            {ARMOR_LIST.map(armor => (
                                <option key={armor} value={armor} className="bg-slate-800 text-white">{armor}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Full Enchant Controls */}
                <div className="bg-slate-800/50 rounded-lg p-4 border border-ro-secondary grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Standard Full Enchant */}
                    <div className="flex flex-col gap-2">
                        <div className="text-sm text-ro-text flex items-center gap-2 font-bold">
                            <Layers className="w-4 h-4 text-ro-highlight" />
                            一鍵完整附魔
                        </div>
                        <p className="text-xs text-ro-muted mb-1">
                             同時進行 4洞 → 3洞 → 2洞 (1次)
                        </p>
                        <button 
                            onClick={handleFullEnchant}
                            disabled={Object.values(isAnimating).some(v => v)}
                            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Zap className="w-4 h-4 text-yellow-300" />
                            執行全套附魔
                        </button>
                    </div>

                    {/* Auto Combo */}
                    <div className="flex flex-col gap-2">
                        <div className="text-sm text-ro-text flex items-center gap-2 font-bold">
                            <Settings2 className="w-4 h-4 text-ro-gold" />
                            自動洗到指定組合
                        </div>
                        <p className="text-xs text-ro-muted mb-1">
                            反覆執行全套，直到出現下方選擇的目標組合
                        </p>
                        <button 
                            onClick={handleAutoCombo}
                            disabled={Object.values(isAnimating).some(v => v)}
                            className="w-full px-4 py-2 bg-gradient-to-r from-ro-gold to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold rounded-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <FastForward className="w-4 h-4 text-white" />
                            自動模擬 (組合)
                        </button>
                    </div>
                </div>
            </div>

            {/* Enchant Slots Cards */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {LT_ARMOR_ENCHANTS.map((slot) => {
                    const activeCount = batchCounts[slot.slotId];
                    const activeTarget = targets[slot.slotId];
                    const currentResult = results[slot.slotId];

                    return (
                        <div key={slot.slotId} className="bg-slate-800 rounded-xl border border-ro-secondary overflow-hidden flex flex-col shadow-lg">
                            {/* Card Header */}
                            <div className="bg-slate-900 p-3 border-b border-ro-secondary flex justify-between items-center">
                                <span className="text-sm font-bold text-ro-text">{slot.slotName}</span>
                                {slot.slotId === 4 ? <Shield className="w-4 h-4 text-ro-muted"/> : 
                                 slot.slotId === 3 ? <Star className="w-4 h-4 text-ro-muted"/> : 
                                 <Zap className="w-4 h-4 text-ro-muted"/>}
                            </div>
                            
                            {/* Display Area */}
                            <div className="p-6 flex-col flex items-center justify-center min-h-[140px] border-b border-ro-secondary bg-slate-800/50">
                                {isAnimating[slot.slotId] ? (
                                    <div className="flex flex-col items-center gap-2 animate-pulse">
                                        <div className="w-8 h-8 border-4 border-ro-highlight border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-sm text-ro-highlight font-mono">ENCHANTING...</span>
                                    </div>
                                ) : currentResult ? (
                                    <div className={`w-full text-center p-3 rounded-lg border-2 transition-all duration-300 animate-scale-in ${getRarityBg(currentResult)}`}>
                                        <div className={`text-lg ${getRarityColor(currentResult)}`}>
                                            {currentResult.name}
                                        </div>
                                        <div className="text-xs text-ro-muted mt-1">
                                            機率: {currentResult.probability}%
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-ro-muted text-sm italic opacity-50">
                                        等待附魔...
                                    </div>
                                )}
                            </div>

                            {/* Controls Area */}
                            <div className="p-4 space-y-4 bg-slate-900">
                                {/* Mode: Manual / Batch */}
                                <div>
                                    <div className="text-xs text-ro-muted mb-2 flex justify-between items-center">
                                        <span>單部位附魔</span>
                                        <span className="font-mono text-ro-highlight">目前: x{activeCount}</span>
                                    </div>
                                    
                                    {/* Quick Buttons Grid */}
                                    <div className="grid grid-cols-4 gap-1 mb-2">
                                        <button 
                                            onClick={() => handleEnchant(slot.slotId, 1)}
                                            disabled={isAnimating[slot.slotId]}
                                            className="bg-ro-primary hover:bg-slate-700 border border-ro-secondary text-white text-xs py-1.5 rounded transition-colors"
                                        >
                                            1次
                                        </button>
                                        <button 
                                            onClick={() => handleEnchant(slot.slotId, 5)}
                                            disabled={isAnimating[slot.slotId]}
                                            className="bg-ro-primary hover:bg-slate-700 border border-ro-secondary text-white text-xs py-1.5 rounded transition-colors"
                                        >
                                            5次
                                        </button>
                                        <button 
                                            onClick={() => handleEnchant(slot.slotId, 10)}
                                            disabled={isAnimating[slot.slotId]}
                                            className="bg-ro-primary hover:bg-slate-700 border border-ro-secondary text-white text-xs py-1.5 rounded transition-colors"
                                        >
                                            10次
                                        </button>
                                        <button 
                                            onClick={() => handleEnchant(slot.slotId)}
                                            disabled={isAnimating[slot.slotId]}
                                            className="bg-ro-secondary hover:bg-blue-600 text-white text-xs py-1.5 rounded transition-colors font-bold"
                                        >
                                            執行
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-ro-muted">自訂次數:</span>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max="1000"
                                            value={activeCount}
                                            onChange={(e) => setBatchCounts(prev => ({...prev, [slot.slotId]: Math.max(1, parseInt(e.target.value)||1) }))}
                                            className="flex-1 bg-slate-800 border border-ro-secondary rounded px-2 py-1 text-white text-xs outline-none focus:border-ro-highlight"
                                        />
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-ro-secondary/50 w-full"></div>

                                {/* Mode: Target Auto */}
                                <div>
                                    <div className="text-xs text-ro-muted mb-1">指定目標 (支援單洞/組合)</div>
                                    <div className="flex gap-2">
                                        <select 
                                            value={activeTarget}
                                            onChange={(e) => setTargets(prev => ({...prev, [slot.slotId]: e.target.value}))}
                                            className="flex-1 bg-slate-800 border border-ro-secondary rounded text-white text-xs px-2 outline-none focus:border-ro-gold"
                                        >
                                            <option value="" className="bg-slate-800 text-black">選擇目標...</option>
                                            {slot.options.map((opt, i) => (
                                                <option key={i} value={opt.name} className="bg-slate-800 text-black">{opt.name} ({opt.probability}%)</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => handleAutoEnchant(slot.slotId)}
                                            disabled={isAnimating[slot.slotId] || !activeTarget}
                                            className="w-16 bg-gradient-to-r from-ro-gold to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:opacity-50 text-white rounded text-sm font-bold py-1.5 transition-all flex items-center justify-center gap-1"
                                        >
                                            <FastForward className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* History Section */}
            <div className="bg-ro-primary rounded-xl shadow-xl border border-ro-secondary flex flex-col mt-8">
                {/* History Header & Controls */}
                <div className="p-4 border-b border-ro-secondary flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-ro-muted" />
                        <h3 className="font-bold text-white">附魔紀錄</h3>
                        <span className="text-xs text-ro-muted bg-slate-800 px-2 py-0.5 rounded-full">
                            {filteredHistory.length} 筆
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        {/* Filters */}
                        <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-ro-secondary">
                            <Filter className="w-4 h-4 text-ro-muted mx-2" />
                            <select 
                                value={filterSlot}
                                onChange={(e) => setFilterSlot(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                className="bg-transparent text-sm text-white outline-none border-r border-ro-secondary pr-2 mr-2"
                            >
                                <option value="all" className="bg-slate-800 text-black">所有部位</option>
                                <option value={4} className="bg-slate-800 text-black">第4洞</option>
                                <option value={3} className="bg-slate-800 text-black">第3洞</option>
                                <option value={2} className="bg-slate-800 text-black">第2洞</option>
                            </select>
                            
                            <Search className="w-4 h-4 text-ro-muted mx-2" />
                            <input 
                                type="text" 
                                placeholder="搜尋附魔名稱..." 
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className="bg-transparent text-sm text-white outline-none w-32 placeholder-ro-muted"
                            />
                            {filterText && <button onClick={() => setFilterText('')}><Trash2 className="w-3 h-3 text-ro-muted hover:text-white" /></button>}
                        </div>

                        {/* Actions */}
                        <button 
                            onClick={handleResetDisplay} 
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition-colors flex items-center gap-1"
                        >
                            <RefreshCw className="w-3 h-3" /> 清空顯示
                        </button>
                        <button 
                            onClick={clearHistory} 
                            className="px-3 py-1.5 bg-ro-danger/20 hover:bg-ro-danger text-ro-danger hover:text-white text-xs rounded-lg transition-colors flex items-center gap-1 border border-ro-danger/20"
                        >
                            <Trash2 className="w-3 h-3" /> 清除紀錄
                        </button>
                    </div>
                </div>

                {/* History List */}
                <div className="max-h-[400px] overflow-y-auto">
                    {filteredHistory.length === 0 ? (
                        <div className="p-12 text-center text-ro-muted flex flex-col items-center">
                            <History className="w-12 h-12 opacity-20 mb-4" />
                            <p>尚無附魔紀錄</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900 text-ro-muted sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3 w-24">時間</th>
                                    <th className="p-3 w-32">部位</th>
                                    <th className="p-3">附魔結果</th>
                                    <th className="p-3 text-right">機率</th>
                                    <th className="p-3 text-right">次數</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ro-secondary bg-slate-900/30">
                                {filteredHistory.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-800/50 transition-colors group">
                                        <td className="p-3 text-ro-muted text-xs font-mono">{item.timestamp}</td>
                                        <td className="p-3 text-slate-400 text-xs">
                                            <div>{item.armorName}</div>
                                            <div className="text-ro-highlight">{item.slotName}</div>
                                        </td>
                                        <td className={`p-3 font-medium ${getRarityColor(item.result)}`}>
                                            {item.result.name}
                                        </td>
                                        <td className="p-3 text-right text-ro-muted text-xs font-mono">
                                            {item.result.probability}%
                                        </td>
                                        <td className="p-3 text-right text-white font-mono text-xs">
                                            {item.attempts > 1 ? (
                                                <span className="bg-ro-gold text-black px-1.5 py-0.5 rounded font-bold">
                                                    {item.attempts} 抽
                                                </span>
                                            ) : (
                                                <span className="text-ro-muted">1</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    <div ref={historyEndRef} />
                </div>
            </div>
        </div>
    );
};