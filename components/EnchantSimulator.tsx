import React, { useState } from 'react';
import { Dna, RefreshCw, Zap, Shield, Star, ShieldCheck } from 'lucide-react';
import { LT_ARMOR_ENCHANTS } from '../constants';
import { EnchantOption } from '../types';

const ARMOR_LIST = [
    "時光超越湧現鎧甲-LT",
    "深淵湖水咆嘯鎧甲-LT",
    "粗暴者龍影鎧甲-LT"
];

export const EnchantSimulator: React.FC = () => {
    const [selectedArmor, setSelectedArmor] = useState(ARMOR_LIST[0]);
    const [results, setResults] = useState<{[key: number]: EnchantOption | null}>({
        4: null,
        3: null,
        2: null
    });
    const [isAnimating, setIsAnimating] = useState<{[key: number]: boolean}>({
        4: false,
        3: false,
        2: false
    });

    const handleEnchant = (slotId: number) => {
        const slotData = LT_ARMOR_ENCHANTS.find(s => s.slotId === slotId);
        if (!slotData) return;

        // Set animation state
        setIsAnimating(prev => ({ ...prev, [slotId]: true }));

        setTimeout(() => {
            const rand = Math.random() * 100;
            let cumulative = 0;
            let selectedOption = slotData.options[0];

            for (const option of slotData.options) {
                cumulative += option.probability;
                if (rand <= cumulative) {
                    selectedOption = option;
                    break;
                }
            }

            setResults(prev => ({ ...prev, [slotId]: selectedOption }));
            setIsAnimating(prev => ({ ...prev, [slotId]: false }));
        }, 500); // 500ms delay for effect
    };

    const handleReset = () => {
        setResults({ 4: null, 3: null, 2: null });
    };

    const getRarityColor = (option: EnchantOption | null) => {
        if (!option) return "text-ro-muted";
        if (option.name.includes("3Lv") || option.name.includes("5")) return "text-red-400 font-bold drop-shadow-md"; // Highly Rare
        if (option.name.includes("2Lv") || option.name.includes("4")) return "text-ro-highlight font-semibold"; // Rare
        if (option.isRare) return "text-ro-gold font-semibold"; // Special/Rare Base
        return "text-white"; // Common
    };

    const getRarityBg = (option: EnchantOption | null) => {
        if (!option) return "border-ro-secondary bg-slate-900";
        if (option.name.includes("3Lv") || option.name.includes("5")) return "border-red-500 bg-red-900/20 shadow-red-500/20 shadow-lg";
        if (option.name.includes("2Lv") || option.name.includes("4")) return "border-ro-highlight bg-blue-900/20";
        if (option.isRare) return "border-ro-gold bg-amber-900/20";
        return "border-ro-success bg-emerald-900/10";
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-ro-primary rounded-xl p-6 shadow-xl border border-ro-secondary relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Dna className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold text-white mb-2">高級附魔模擬器</h2>
                    <p className="text-ro-muted text-sm max-w-xl">
                        模擬 LT 系列鎧甲附魔機率。選擇鎧甲並點擊下方欄位進行附魔。
                    </p>
                </div>
            </div>

            {/* Armor Selector */}
            <div className="bg-slate-800 p-6 rounded-xl border border-ro-secondary flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <ShieldCheck className="w-6 h-6 text-ro-gold" />
                    <select 
                        value={selectedArmor}
                        onChange={(e) => setSelectedArmor(e.target.value)}
                        className="bg-slate-900 text-white border border-ro-secondary rounded-lg px-4 py-2 w-full md:w-80 focus:ring-2 focus:ring-ro-accent outline-none font-medium"
                    >
                        {ARMOR_LIST.map(armor => (
                            <option key={armor} value={armor}>{armor}</option>
                        ))}
                    </select>
                </div>
                <button 
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                    <RefreshCw className="w-4 h-4" />
                    重置所有附魔
                </button>
            </div>

            {/* Enchant Slots */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {LT_ARMOR_ENCHANTS.map((slot) => (
                    <div key={slot.slotId} className="bg-slate-800 rounded-xl border border-ro-secondary overflow-hidden flex flex-col">
                        <div className="bg-slate-900 p-4 border-b border-ro-secondary flex justify-between items-center">
                            <span className="text-sm text-ro-muted font-mono uppercase tracking-wider">{slot.slotName}</span>
                            {slot.slotId === 4 ? <Shield className="w-4 h-4 text-ro-muted"/> : 
                             slot.slotId === 3 ? <Star className="w-4 h-4 text-ro-muted"/> : 
                             <Zap className="w-4 h-4 text-ro-muted"/>}
                        </div>
                        
                        <div className="p-6 flex-1 flex flex-col items-center justify-center min-h-[160px]">
                            {isAnimating[slot.slotId] ? (
                                <div className="flex flex-col items-center gap-2 animate-pulse">
                                    <div className="w-8 h-8 border-4 border-ro-highlight border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-sm text-ro-highlight">附魔中...</span>
                                </div>
                            ) : results[slot.slotId] ? (
                                <div className={`w-full text-center p-4 rounded-lg border-2 transition-all duration-300 animate-scale-in ${getRarityBg(results[slot.slotId])}`}>
                                    <div className={`text-xl ${getRarityColor(results[slot.slotId])}`}>
                                        {results[slot.slotId]?.name}
                                    </div>
                                    <div className="text-xs text-ro-muted mt-1">
                                        機率: {results[slot.slotId]?.probability}%
                                    </div>
                                </div>
                            ) : (
                                <div className="text-ro-muted text-sm italic">
                                    尚未附魔
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-900/50 border-t border-ro-secondary">
                            <button
                                onClick={() => handleEnchant(slot.slotId)}
                                disabled={isAnimating[slot.slotId]}
                                className="w-full py-2 bg-ro-accent hover:bg-blue-600 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all rounded-lg text-white font-bold shadow-lg shadow-blue-900/20"
                            >
                                進行附魔
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Probability Table (Reference) */}
            <div className="mt-8 pt-8 border-t border-ro-secondary">
                <h3 className="text-lg font-bold text-white mb-4">附魔機率參考表</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-ro-muted">
                    {LT_ARMOR_ENCHANTS.map((slot) => (
                        <div key={`table-${slot.slotId}`} className="bg-slate-900 p-4 rounded-lg">
                            <h4 className="font-bold text-white mb-2 pb-2 border-b border-ro-secondary">{slot.slotName}</h4>
                            <div className="space-y-1 h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-ro-secondary scrollbar-track-transparent">
                                {slot.options.map((opt, i) => (
                                    <div key={i} className="flex justify-between items-center hover:bg-slate-800 p-1 rounded">
                                        <span className={opt.isRare ? 'text-ro-highlight' : ''}>{opt.name}</span>
                                        <span className="font-mono">{opt.probability}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};