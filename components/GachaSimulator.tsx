import React, { useState, useRef, useEffect } from 'react';
import { GachaItem, Rarity } from '../types';
import { Gift, RotateCcw, Play, FastForward, CheckCircle2, History, Link as LinkIcon, Download, AlertTriangle } from 'lucide-react';

// Default Mock Data
const DEFAULT_POOL: GachaItem[] = [
  { id: '1', name: 'MVP BOSS 卡片信封', rarity: Rarity.SS, probability: 0.05, category: 'Card' },
  { id: '2', name: '改良型濃縮神之金屬箱子', rarity: Rarity.A, probability: 8.0, category: 'Material' },
  { id: '3', name: '改良型濃縮鋁箱子', rarity: Rarity.A, probability: 8.0, category: 'Material' },
  { id: '4', name: '(服飾) 墮天使之翼', rarity: Rarity.S, probability: 1.5, category: 'Costume' },
  { id: '5', name: '(服飾) 波利背包', rarity: Rarity.S, probability: 1.5, category: 'Costume' },
  { id: '6', name: '力量防護卷軸', rarity: Rarity.B, probability: 15.0, category: 'Consumable' },
  { id: '7', name: '能量飲料', rarity: Rarity.C, probability: 25.0, category: 'Consumable' },
  { id: '8', name: '萬能藥', rarity: Rarity.C, probability: 25.95, category: 'Consumable' },
  { id: '9', name: '高密度鈽鐳礦石', rarity: Rarity.B, probability: 15.0, category: 'Material' }
];

export const GachaSimulator: React.FC = () => {
  // Data Source State
  const [gachaPool, setGachaPool] = useState<GachaItem[]>(DEFAULT_POOL);
  const [targetUrl, setTargetUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Inventory: Map Item ID -> Count
  const [inventory, setInventory] = useState<{[key: string]: number}>({});
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalPulls, setTotalPulls] = useState(0);
  
  // Logic States
  const [targetId, setTargetId] = useState<string>(DEFAULT_POOL[0].id);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLog, setSimulationLog] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Update target ID when pool changes
  useEffect(() => {
    if (gachaPool.length > 0) {
      setTargetId(gachaPool[0].id);
    }
  }, [gachaPool]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [simulationLog]);

  const addToLog = (msg: string) => {
      setSimulationLog(prev => [...prev.slice(-49), msg]); // Keep last 50 logs
  };

  const parseHtmlToPool = (html: string): GachaItem[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Improved Parser: Scan ALL tables to find the best candidate
    const tables = Array.from(doc.querySelectorAll('table'));
    
    let bestPool: GachaItem[] = [];
    let maxValidRows = 0;
    
    tables.forEach((table) => {
        const rows = Array.from(table.querySelectorAll('tr'));
        const currentPool: GachaItem[] = [];
        
        // Check if this table looks like the specific format requested (#rndItem .table_01)
        // We use this flag to prioritize strict column parsing if possible
        const isStrictStructure = table.closest('#rndItem') && table.classList.contains('table_01');

        rows.forEach((row) => {
            // Skip headers
            if (row.querySelector('th')) return;

            const cells = row.querySelectorAll('td');
            if (cells.length < 2) return; // Need at least name and rate

            let name = '';
            let count = 1;
            let rate = 0;
            let rarityStr = '';

            // --- Strategy A: Strict Column Mapping (Name | Count | Rate) ---
            if (isStrictStructure && cells.length >= 3) {
                const c0 = cells[0].textContent?.trim() || ''; // Name
                const c1 = cells[1].textContent?.trim() || ''; // Count
                const c2 = cells[2].textContent?.trim() || ''; // Rate

                if (c2.includes('%')) {
                    name = c0;
                    const parsedCount = parseInt(c1);
                    if (!isNaN(parsedCount)) count = parsedCount;
                    const parsedRate = parseFloat(c2.replace('%', ''));
                    if (!isNaN(parsedRate)) rate = parsedRate;
                }
            }

            // --- Strategy B: Heuristic Scanning (Fallback) ---
            // If strict mapping failed or wasn't applicable, try smart scanning
            if (!name || rate === 0) {
                // Reset
                name = ''; count = 1; rate = 0;

                for (const cell of Array.from(cells)) {
                    const text = cell.textContent?.trim() || '';
                    if (!text) continue;

                    if (text.endsWith('%')) {
                        // Rate found
                        const r = parseFloat(text.replace('%', ''));
                        if (!isNaN(r)) rate = r;
                    } else if (/^[A-Z]+$/.test(text) && text.length <= 3) {
                        // Rarity found (SS, S, A)
                        rarityStr = text;
                    } else if (/^\d+$/.test(text) && text.length < 4) {
                        // Count found (small integer)
                        const c = parseInt(text);
                        if (!isNaN(c)) count = c;
                    } else if (text.length > name.length) {
                        // Name found (longest text)
                        name = text;
                    }
                }
            }
        
            if (name && rate > 0) {
                // Auto infer rarity based on RO typical rates
                let finalRarity = Rarity.C;
                if (rarityStr) {
                    if (rarityStr === 'SS') finalRarity = Rarity.SS;
                    else if (rarityStr === 'S') finalRarity = Rarity.S;
                    else if (rarityStr === 'A') finalRarity = Rarity.A;
                    else if (rarityStr === 'B') finalRarity = Rarity.B;
                } else {
                    if (rate < 0.2) finalRarity = Rarity.SS;      // MVP Cards, rare Boss items (<0.2%)
                    else if (rate < 2.0) finalRarity = Rarity.S;  // Costumes, High Value (0.2% - 2%)
                    else if (rate < 6.0) finalRarity = Rarity.A;  // Good Consumables/Mats (2% - 6%)
                    else if (rate < 20.0) finalRarity = Rarity.B; // Standard Mats (6% - 20%)
                    else finalRarity = Rarity.C;                  // Filler (>20%)
                }
                
                // Auto infer category
                let category = 'Consumable';
                if (name.includes('卡片') || name.includes('信封') || name.includes('封印') || name.includes('精髓') || name.includes('能量') || name.includes('瓶') || name.includes('石')) category = 'Card/Item';
                else if (name.includes('箱') || name.includes('卷軸') || name.includes('原石') || name.includes('礦石') || name.includes('鐵') || name.includes('鎚')) category = 'Material';
                else if (name.includes('服飾') || name.includes('裝') || name.includes('帽') || name.includes('翅膀') || name.includes('劍') || name.includes('杖') || name.includes('靴') || name.includes('斗篷') || name.includes('戒') || name.includes('衣') || name.includes('耳環') || name.includes('墜子')) category = 'Equipment';
        
                currentPool.push({
                    id: Math.random().toString(36).substr(2, 9),
                    name: count > 1 ? `${name} x${count}` : name,
                    rarity: finalRarity,
                    probability: rate,
                    category
                });
            }
        });
        
        // If this table yielded more valid rows than the previous best, keep it
        if (currentPool.length > maxValidRows) {
            maxValidRows = currentPool.length;
            bestPool = currentPool;
        }
    });
    
    return bestPool;
  };

  const handleFetchData = async () => {
    if (!targetUrl) return;
    
    setIsLoading(true);
    setFetchError('');
    
    try {
        let html = '';
        
        // Strategy 1: AllOrigins JSON API (Avoids direct CORS issues by wrapping in JSON)
        try {
            const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
            if (response.ok) {
                const data = await response.json();
                if (data.contents) {
                    html = data.contents;
                }
            }
        } catch (e) {
            console.warn("AllOrigins JSON fetch failed:", e);
        }

        // Strategy 2: CorsProxy.io (Direct fallback)
        if (!html) {
             try {
                const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
                if (response.ok) {
                    html = await response.text();
                }
            } catch (e) {
                console.warn("CorsProxy fetch failed:", e);
            }
        }

        if (!html) {
            throw new Error("無法透過代理伺服器讀取目標網頁。請檢查網路連線或目標網站是否阻擋了存取。");
        }
        
        const newPool = parseHtmlToPool(html);
        
        if (newPool.length === 0) {
            setFetchError('無法從網址中解析出有效的轉蛋資料。請確認網頁是否包含含有「機率(%)」的道具表格。');
        } else {
            setGachaPool(newPool);
            reset(); // Reset simulation when pool changes
            addToLog(`已成功載入 ${newPool.length} 項轉蛋內容`);
        }
    } catch (err: any) {
        setFetchError(`讀取網址失敗: ${err.message || '未知錯誤'}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  };

  const getRarityColor = (rarity: Rarity) => {
    switch(rarity) {
      case Rarity.SS: return 'text-red-400 font-bold';
      case Rarity.S: return 'text-ro-gold font-bold';
      case Rarity.A: return 'text-purple-400';
      case Rarity.B: return 'text-blue-400';
      default: return 'text-slate-400';
    }
  };

  const performPulls = (count: number): GachaItem[] => {
      const results: GachaItem[] = [];
      const newInventory = { ...inventory };
      
      for (let i = 0; i < count; i++) {
        const rand = Math.random() * 100;
        let cumulative = 0;
        let selected = gachaPool[gachaPool.length - 1];

        for (const item of gachaPool) {
          cumulative += item.probability;
          if (rand <= cumulative) {
            selected = item;
            break;
          }
        }
        results.push(selected);
        newInventory[selected.id] = (newInventory[selected.id] || 0) + 1;
      }
      
      setInventory(newInventory);
      setTotalPulls(prev => prev + count);
      setTotalSpent(prev => prev + (count * 49));
      return results;
  };

  const handleManualPull = (count: number) => {
      const results = performPulls(count);
      
      // Concise Log
      let logMsg = `抽 ${count} 次：`;
      const highRarity = results.filter(r => r.rarity === Rarity.SS || r.rarity === Rarity.S);
      if (highRarity.length > 0) {
          logMsg += ` 獲得 ${highRarity.map(r => r.name).join(', ')}`;
      } else {
          logMsg += ` 無稀有道具`;
      }
      addToLog(logMsg);
  };

  const handlePullUntil = async () => {
      if (isSimulating) return;
      setIsSimulating(true);
      
      const targetItem = gachaPool.find(i => i.id === targetId);
      if (!targetItem) return;

      addToLog(`>>> 開始模擬：直到抽中 [${targetItem.name}] 為止 <<<`);

      let found = false;
      let attempts = 0;
      let batchSize = 100; // Optimization: process in chunks
      const maxAttempts = 50000; // Safety break
      
      const simulateLoop = () => {
          if (found || attempts >= maxAttempts) {
              setIsSimulating(false);
              if (found) {
                  addToLog(`SUCCESS! 在第 ${attempts.toLocaleString()} 抽獲得目標！`);
                  addToLog(`總花費增加: ${(attempts * 49).toLocaleString()} P`);
              } else {
                  addToLog(`STOPPED. 超過安全上限 (${maxAttempts}抽) 仍未獲得。`);
              }
              return;
          }

          // Run a batch
          let currentBatchPulls = 0;
          const tempInventoryUpdates: {[key:string]: number} = {};
          
          while(currentBatchPulls < batchSize && !found && attempts < maxAttempts) {
              const rand = Math.random() * 100;
              let cumulative = 0;
              let selected = gachaPool[gachaPool.length - 1];
              for (const item of gachaPool) {
                  cumulative += item.probability;
                  if (rand <= cumulative) {
                      selected = item;
                      break;
                  }
              }
              
              tempInventoryUpdates[selected.id] = (tempInventoryUpdates[selected.id] || 0) + 1;
              attempts++;
              currentBatchPulls++;
              
              if (selected.id === targetId) {
                  found = true;
              }
          }

          // Update State Once per Batch
          setInventory(prev => {
              const next = { ...prev };
              Object.entries(tempInventoryUpdates).forEach(([id, count]) => {
                  next[id] = (next[id] || 0) + count;
              });
              return next;
          });
          setTotalPulls(prev => prev + currentBatchPulls);
          setTotalSpent(prev => prev + (currentBatchPulls * 49));
          
          if (!found && attempts < maxAttempts) {
              setTimeout(simulateLoop, 10);
          } else {
               setIsSimulating(false);
               if (found) {
                   addToLog(`✅ 恭喜！在第 ${attempts.toLocaleString()} 抽 獲得 [${targetItem.name}]`);
               } else {
                   addToLog(`⚠️ 已停止：超過 ${maxAttempts} 次仍未獲得。`);
               }
          }
      };

      simulateLoop();
  };

  const reset = () => {
      setInventory({});
      setTotalPulls(0);
      setTotalSpent(0);
      setSimulationLog([]);
      addToLog('紀錄已重置');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* URL Import Section */}
      <div className="bg-slate-800 rounded-xl p-4 border border-ro-secondary">
          <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
              <div className="flex-1 w-full">
                  <label className="text-xs text-ro-muted font-bold uppercase mb-1 flex items-center gap-2">
                      <LinkIcon className="w-3 h-3" />
                      官方公告網址 (自動掃描頁面所有表格)
                  </label>
                  <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        placeholder="https://ro.gnjoy.com.tw/notice/notice_view.aspx?id=..."
                        className="flex-1 bg-slate-900 border border-ro-secondary rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-ro-accent outline-none"
                      />
                      <button 
                        onClick={handleFetchData}
                        disabled={isLoading || !targetUrl}
                        className="px-4 py-2 bg-ro-secondary hover:bg-slate-600 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                          {isLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Download className="w-4 h-4" />}
                          抓取資料
                      </button>
                  </div>
              </div>
          </div>
          {fetchError && (
              <div className="mt-2 text-ro-danger text-xs flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {fetchError}
              </div>
          )}
          {gachaPool !== DEFAULT_POOL && !fetchError && (
              <div className="mt-2 text-ro-success text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  已載入自定義轉蛋資料 (共 {gachaPool.length} 項)
              </div>
          )}
      </div>

      {/* Header Stats */}
      <div className="bg-ro-primary rounded-xl p-6 shadow-xl border border-ro-secondary flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
               <div className="bg-ro-secondary p-4 rounded-full">
                    <Gift className="w-8 h-8 text-ro-highlight" />
               </div>
               <div>
                    <h2 className="text-2xl font-bold text-white">轉蛋模擬器</h2>
                    <p className="text-ro-muted text-sm flex items-center gap-1">
                        純文字極速版
                        <span className="w-1 h-1 rounded-full bg-ro-muted mx-2"></span>
                        單價 49 P
                    </p>
               </div>
          </div>
          
          <div className="flex items-center gap-6 bg-slate-800 p-4 rounded-lg border border-ro-secondary">
              <div className="text-center">
                  <div className="text-xs text-ro-muted uppercase">總花費 (P)</div>
                  <div className="text-2xl font-bold text-ro-gold font-mono">{totalSpent.toLocaleString()}</div>
              </div>
              <div className="w-px h-8 bg-ro-secondary"></div>
              <div className="text-center">
                  <div className="text-xs text-ro-muted uppercase">總抽數</div>
                  <div className="text-2xl font-bold text-white font-mono">{totalPulls.toLocaleString()}</div>
              </div>
              <div className="w-px h-8 bg-ro-secondary"></div>
              <button onClick={reset} className="text-ro-muted hover:text-ro-danger p-2 rounded hover:bg-slate-700 transition-colors">
                  <RotateCcw className="w-5 h-5" />
              </button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls - Left Column */}
          <div className="lg:col-span-4 space-y-6">
              
              {/* Manual Pulls */}
              <div className="bg-slate-800 p-6 rounded-xl border border-ro-secondary">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                      <Play className="w-4 h-4 text-ro-highlight" />
                      手動抽轉蛋
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                      {[1, 5, 10, 50, 100, 1000].map(count => (
                          <button
                            key={count}
                            onClick={() => handleManualPull(count)}
                            disabled={isSimulating}
                            className="bg-ro-primary hover:bg-ro-secondary disabled:opacity-50 text-white py-3 px-4 rounded-lg border border-ro-secondary font-mono text-sm transition-all active:scale-95 flex flex-col items-center"
                          >
                              <span className="font-bold text-lg">x{count}</span>
                              <span className="text-xs text-ro-muted">{(count * 49).toLocaleString()} P</span>
                          </button>
                      ))}
                  </div>
              </div>

              {/* Target Simulation */}
              <div className="bg-slate-800 p-6 rounded-xl border border-ro-secondary">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                      <FastForward className="w-4 h-4 text-ro-gold" />
                      目標模擬 (抽到為止)
                  </h3>
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs text-ro-muted block mb-2">選擇目標道具</label>
                          <select 
                            value={targetId}
                            onChange={(e) => setTargetId(e.target.value)}
                            className="w-full bg-slate-900 border border-ro-secondary text-white rounded-lg p-3 outline-none focus:border-ro-gold"
                          >
                              {gachaPool.map(item => (
                                  <option key={item.id} value={item.id}>
                                      [{item.rarity}] {item.name} ({item.probability}%)
                                  </option>
                              ))}
                          </select>
                      </div>
                      
                      <button 
                        onClick={handlePullUntil}
                        disabled={isSimulating}
                        className={`
                            w-full py-4 rounded-lg font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all
                            ${isSimulating ? 'bg-slate-600 cursor-wait' : 'bg-gradient-to-r from-ro-gold to-orange-600 hover:from-yellow-500 hover:to-orange-500 active:scale-95'}
                        `}
                      >
                          {isSimulating ? (
                              <>模擬計算中...</>
                          ) : (
                              <>
                                  <CheckCircle2 className="w-5 h-5" />
                                  開始自動抽
                              </>
                          )}
                      </button>
                      <p className="text-xs text-ro-muted text-center">
                          *為避免當機，單次模擬上限為 50,000 抽
                      </p>
                  </div>
              </div>
              
              {/* Log Panel */}
              <div className="bg-slate-800 p-4 rounded-xl border border-ro-secondary h-64 flex flex-col">
                  <h3 className="text-ro-muted text-xs uppercase font-bold mb-2 flex items-center gap-2">
                      <History className="w-3 h-3" />
                      操作紀錄
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-1 font-mono text-xs text-slate-300 pr-2 scrollbar-thin scrollbar-thumb-ro-secondary">
                      {simulationLog.length === 0 && <div className="text-slate-600 italic">尚無紀錄...</div>}
                      {simulationLog.map((log, idx) => (
                          <div key={idx} className="border-b border-slate-700/50 pb-1">{log}</div>
                      ))}
                      <div ref={logEndRef} />
                  </div>
              </div>
          </div>

          {/* Inventory List - Right Column */}
          <div className="lg:col-span-8 bg-ro-primary rounded-xl border border-ro-secondary flex flex-col overflow-hidden h-[800px] lg:h-auto">
              <div className="p-4 bg-slate-800 border-b border-ro-secondary flex justify-between items-center">
                  <h3 className="font-bold text-white">獲得物品清單</h3>
                  <div className="text-xs text-ro-muted">
                      共獲得 {Object.keys(inventory).length} 種道具
                  </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-900 text-ro-muted sticky top-0 z-10 shadow-sm">
                          <tr>
                              <th className="p-3 w-16 text-center">稀有度</th>
                              <th className="p-3">道具名稱</th>
                              <th className="p-3 text-right">機率</th>
                              <th className="p-3 text-right w-24">數量</th>
                              <th className="p-3 text-right w-24">佔比</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-ro-secondary">
                          {gachaPool.map((item) => {
                              const count = inventory[item.id] || 0;
                              const percentage = totalPulls > 0 ? ((count / totalPulls) * 100).toFixed(2) : "0.00";
                              const isObtained = count > 0;
                              
                              return (
                                  <tr key={item.id} className={`${isObtained ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-transparent opacity-50'} transition-colors`}>
                                      <td className={`p-3 text-center font-bold ${getRarityColor(item.rarity)}`}>
                                          {item.rarity}
                                      </td>
                                      <td className={`p-3 font-medium ${isObtained ? 'text-white' : 'text-slate-500'}`}>
                                          {item.name}
                                          {targetId === item.id && <span className="ml-2 text-xs bg-ro-gold text-black px-1.5 rounded font-bold">TARGET</span>}
                                      </td>
                                      <td className="p-3 text-right text-ro-muted text-xs">
                                          {item.probability}%
                                      </td>
                                      <td className={`p-3 text-right font-mono ${count > 0 ? 'text-white font-bold' : 'text-slate-600'}`}>
                                          {count.toLocaleString()}
                                      </td>
                                      <td className="p-3 text-right font-mono text-xs text-ro-muted">
                                          {percentage}%
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
              
              <div className="p-4 bg-slate-800 border-t border-ro-secondary text-xs text-ro-muted text-center">
                   統計數據僅供參考，實際機率以官方伺服器設定為準。
              </div>
          </div>
      </div>
    </div>
  );
};