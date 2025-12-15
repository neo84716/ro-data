import React, { useState, useEffect, useMemo } from 'react';
import { CharacterType, ExpRecord } from '../types';
import { calculateExpDifference } from '../services/expService';
import { Save, Trash2, TrendingUp, Info, Calculator, Filter, Search, XCircle, AlertCircle, Map as MapIcon, BarChart3 } from 'lucide-react';

export const ExpTracker: React.FC = () => {
  // State with Lazy Initialization for Persistence
  const [charType, setCharType] = useState<CharacterType>(CharacterType.NORMAL_POST_TRANS);
  const [mapName, setMapName] = useState('');
  
  const [startLv, setStartLv] = useState<number>(200);
  const [startPct, setStartPct] = useState<number>(0);
  
  const [endLv, setEndLv] = useState<number>(200);
  const [endPct, setEndPct] = useState<number>(10);
  
  const [duration, setDuration] = useState<number>(60); // minutes
  
  // Modifiers
  const [serverRate, setServerRate] = useState<number>(100);
  const [gearRate, setGearRate] = useState<number>(0);
  const [manualBook, setManualBook] = useState<number>(0); // 0, 50, 100, 200
  const [isDaiDai, setIsDaiDai] = useState<boolean>(false);

  // Lazy init to prevent overwriting with empty array on re-render
  const [records, setRecords] = useState<ExpRecord[]>(() => {
    try {
        const saved = localStorage.getItem('ro_exp_records');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        console.error("Failed to load records", e);
        return [];
    }
  });

  // Filter State
  const [filterMap, setFilterMap] = useState('');
  const [filterManual, setFilterManual] = useState<boolean | null>(null); // null = all, true = yes, false = no
  const [filterDaiDai, setFilterDaiDai] = useState<boolean | null>(null);

  // Derived state
  const [calculatedGained, setCalculatedGained] = useState<number>(0);
  const [calculatedBasePerHour, setCalculatedBasePerHour] = useState<number>(0);

  // Auto-save whenever records change
  useEffect(() => {
    localStorage.setItem('ro_exp_records', JSON.stringify(records));
  }, [records]);

  // Handle Character Type Change and Level Constraints
  useEffect(() => {
    if (charType === CharacterType.NORMAL_PRE_TRANS) {
        if (startLv > 99) setStartLv(99);
        if (endLv > 99) setEndLv(99);
    }
  }, [charType, startLv, endLv]);

  // Real-time Calculation
  useEffect(() => {
    const gained = calculateExpDifference(startLv, startPct, endLv, endPct, charType);
    setCalculatedGained(gained);

    let multiplier = (serverRate / 100) * ((100 + manualBook + gearRate) / 100);
    if (isDaiDai) multiplier *= 2; 

    if (duration > 0 && multiplier > 0) {
      const perHour = (gained / (duration / 60));
      setCalculatedBasePerHour(perHour);
    } else {
      setCalculatedBasePerHour(0);
    }
  }, [startLv, startPct, endLv, endPct, charType, duration, serverRate, gearRate, manualBook, isDaiDai]);

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

  // Map Statistics Logic
  const mapStatistics = useMemo(() => {
      const stats: Record<string, { totalExp: number; count: number }> = {};
      
      records.forEach(record => {
          const name = record.mapName;
          if (!stats[name]) {
              stats[name] = { totalExp: 0, count: 0 };
          }
          stats[name].totalExp += record.expPerHour;
          stats[name].count += 1;
      });

      return Object.entries(stats)
          .map(([name, data]) => ({
              name,
              avgExp: data.totalExp / data.count,
              count: data.count
          }))
          .sort((a, b) => b.avgExp - a.avgExp); // Sort by highest exp first
  }, [records]);

  const getMaxLevel = () => {
      return charType === CharacterType.NORMAL_PRE_TRANS ? 99 : 260;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-ro-primary rounded-xl p-6 shadow-xl border border-ro-secondary">
        <div className="flex items-center space-x-3 mb-6">
          <Calculator className="w-8 h-8 text-ro-highlight" />
          <h2 className="text-2xl font-bold text-white">經驗值效率計算機</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
             {/* Character Type */}
            <div>
                <label className="block text-sm font-medium text-ro-muted mb-2">職業類型 (影響經驗表上限)</label>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ro-muted mb-2">開始等級</label>
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
              </div>

              <div>
                <label className="block text-sm font-medium text-ro-muted mb-2">結束等級</label>
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
            
            <div className="p-4 bg-slate-800 rounded-lg border border-ro-secondary space-y-4">
                <h3 className="font-semibold text-ro-highlight">加倍設定</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-ro-muted">伺服器倍率 (%)</label>
                        <input type="number" value={serverRate} onChange={e => setServerRate(Number(e.target.value))} className="w-full bg-slate-900 border border-ro-secondary rounded p-1 text-sm text-white" />
                    </div>
                    <div>
                        <label className="text-xs text-ro-muted">裝備加成 (%)</label>
                        <input type="number" value={gearRate} onChange={e => setGearRate(Number(e.target.value))} className="w-full bg-slate-900 border border-ro-secondary rounded p-1 text-sm text-white" />
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
                        className="w-4 h-4 rounded bg-slate-900 border-ro-secondary accent-ro-accent"
                    />
                    <label htmlFor="daidai" className="text-sm select-none cursor-pointer text-ro-text">啟用呆呆 (Dai Dai) 加成</label>
                </div>
            </div>

            <button 
                onClick={handleSave}
                disabled={calculatedGained <= 0}
                className="w-full bg-ro-success hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-emerald-900/20"
            >
                <Save className="w-5 h-5" />
                <span>儲存紀錄</span>
            </button>
          </div>

          {/* Results Section */}
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

             <div className="bg-ro-primary/50 p-4 rounded-lg text-sm text-ro-muted space-y-2">
                <div className="flex justify-between">
                    <span>等級差距</span>
                    <span className="text-white font-mono">{(endLv - startLv)} Levels</span>
                </div>
                <div className="flex justify-between">
                    <span>當前倍率</span>
                    <span className="text-white font-mono">
                         {serverRate}% (S) + {manualBook}% (B) + {gearRate}% (G) 
                         {isDaiDai && <span className="text-ro-gold ml-1">x DaiDai</span>}
                    </span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Map Statistics Section */}
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
    </div>
  );
};