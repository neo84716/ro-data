import React, { useState, useRef, useEffect } from 'react';
import { GachaItem, Rarity } from '../types';
import { Gift, RotateCcw, Play, FastForward, CheckCircle2, History, Link as LinkIcon, Download, AlertTriangle, Package, List, X } from 'lucide-react';

export const GachaSimulator: React.FC = () => {
  // Data Source State
  const [gachaPool, setGachaPool] = useState<GachaItem[]>([]);
  // Default URL as requested
  const [targetUrl, setTargetUrl] = useState('https://ro.gnjoy.com.tw/notice/notice_view.aspx?id=218031');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Inventory & Stats
  const [inventory, setInventory] = useState<{[key: string]: number}>({});
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalPulls, setTotalPulls] = useState(0);
  
  // Logic States
  const [targetId, setTargetId] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLog, setSimulationLog] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'inventory' | 'pool'>('inventory');
  
  // Modal State
  const [showResultModal, setShowResultModal] = useState(false);
  const [lastPullResults, setLastPullResults] = useState<{item: GachaItem, count: number}[]>([]);
  
  const logEndRef = useRef<HTMLDivElement>(null);
  const hasAutoFetched = useRef(false);

  useEffect(() => {
    if (gachaPool.length > 0) {
      setTargetId(gachaPool[0].id);
    } else {
      setTargetId('');
    }
  }, [gachaPool]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [simulationLog]);

  const addToLog = (msg: string) => {
      setSimulationLog(prev => [...prev.slice(-49), msg]); 
  };

  // --- HTML Parsing Logic ---
  const parseTableRows = (rows: HTMLTableRowElement[]): GachaItem[] => {
    const currentPool: GachaItem[] = [];
    rows.forEach((row, rowIndex) => {
        if (row.querySelector('th')) return;
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 2) return; 

        const rowText = row.textContent || '';
        if (rowText.includes('機率') && rowText.includes('物品')) return; 

        let name = '';
        let count = 1;
        let rate = 0;
        let rarityStr = '';

        let rateIdx = -1;
        let nameIdx = -1;
        let countIdx = -1;

        cells.forEach((cell, idx) => {
            const txt = cell.textContent?.trim() || '';
            if (txt.match(/[\d.]+[％%]/) || (txt.match(/^[\d.]+$/) && parseFloat(txt) < 100 && parseFloat(txt) > 0 && idx >= 2)) {
                 if (rateIdx === -1) rateIdx = idx;
            }
            if (/^[SAB]{1,2}$/.test(txt)) {
                rarityStr = txt;
            }
        });

        if (rateIdx !== -1) {
             const rawRate = cells[rateIdx].textContent?.trim().replace(/[％%]/g, '') || '0';
             rate = parseFloat(rawRate);
             for (let i = 0; i < rateIdx; i++) {
                 const txt = cells[i].textContent?.trim() || '';
                 if (txt && !txt.match(/^\d+$/)) {
                     name = txt;
                     nameIdx = i;
                     break;
                 }
             }
             for (let i = 0; i < cells.length; i++) {
                 if (i === rateIdx || i === nameIdx) continue;
                 const txt = cells[i].textContent?.trim() || '';
                 if (txt.match(/^\d+$/)) {
                     count = parseInt(txt);
                     countIdx = i;
                     break;
                 }
             }
        } else {
             const c0 = cells[0]?.textContent?.trim() || '';
             const c1 = cells[1]?.textContent?.trim() || '';
             const c2 = cells[2]?.textContent?.trim() || '';
             const r2 = parseFloat(c2.replace(/[％%]/g, ''));
             if (!isNaN(r2)) {
                 name = c0;
                 if (c1.match(/^\d+$/)) count = parseInt(c1);
                 rate = r2;
             }
        }
    
        if (name && rate > 0) {
            currentPool.push(createGachaItem(name, count, rate, rarityStr));
        }
    });
    return currentPool;
  };

  const createGachaItem = (name: string, count: number, rate: number, rarityStr: string = ''): GachaItem => {
        let finalRarity = Rarity.C;
        if (rarityStr) {
            if (rarityStr === 'SS') finalRarity = Rarity.SS;
            else if (rarityStr === 'S') finalRarity = Rarity.S;
            else if (rarityStr === 'A') finalRarity = Rarity.A;
            else if (rarityStr === 'B') finalRarity = Rarity.B;
        } else {
            if (rate < 0.2) finalRarity = Rarity.SS;      
            else if (rate < 2.0) finalRarity = Rarity.S;  
            else if (rate < 6.0) finalRarity = Rarity.A;  
            else if (rate < 20.0) finalRarity = Rarity.B; 
            else finalRarity = Rarity.C;                  
        }
        
        let category = 'Consumable';
        if (name.includes('卡片') || name.includes('信封') || name.includes('封印') || name.includes('精髓') || name.includes('能量') || name.includes('瓶') || name.includes('石')) category = 'Card/Item';
        else if (name.includes('箱') || name.includes('卷軸') || name.includes('原石') || name.includes('礦石') || name.includes('鐵') || name.includes('鎚')) category = 'Material';
        else if (name.includes('服飾') || name.includes('裝') || name.includes('帽') || name.includes('翅膀') || name.includes('劍') || name.includes('杖') || name.includes('靴') || name.includes('斗篷') || name.includes('戒') || name.includes('衣') || name.includes('耳環') || name.includes('墜子')) category = 'Equipment';

        return {
            id: Math.random().toString(36).substr(2, 9),
            name: count > 1 ? `${name} x${count}` : name,
            rarity: finalRarity,
            probability: rate,
            category
        };
  };

  const parseHtmlToPool = (html: string): GachaItem[] => {
    if (html.trim().startsWith('<tr') || html.trim().startsWith('<td')) {
        html = `<table><tbody>${html}</tbody></table>`;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    let bestPool: GachaItem[] = [];
    const getPoolScore = (p: GachaItem[]) => p.length;
    const allTables = Array.from(doc.querySelectorAll('table'));
    allTables.forEach((table) => {
        const rows = Array.from(table.querySelectorAll('tr'));
        const pool = parseTableRows(rows as HTMLTableRowElement[]);
        if (getPoolScore(pool) > getPoolScore(bestPool)) bestPool = pool;
    });
    return bestPool;
  };

  const parseJsonToPool = (json: any): GachaItem[] => {
      const pool: GachaItem[] = [];
      try {
          let targetArray: any[] = [];
          if (json.Items && Array.isArray(json.Items)) {
              targetArray = json.Items;
          } else if (Array.isArray(json)) {
              targetArray = json;
          }
          targetArray.forEach(item => {
              const name = item.Name || item.ItemName || '';
              const rateStr = item.Value || item.Rate || item.probability || '0';
              const countStr = item.Count || item.amount || '1';
              const memo = item.Memo || ''; 
              if (name && rateStr) {
                   const rate = parseFloat(String(rateStr).replace(/[％%]/g, ''));
                   const count = parseInt(String(countStr)) || 1;
                   if (!isNaN(rate)) {
                       let fullName = name;
                       if (memo) fullName += ` (${memo})`;
                       pool.push(createGachaItem(fullName, count, rate));
                   }
              }
          });
      } catch (e) {
          console.error("JSON Parse Error", e);
      }
      return pool;
  };

  const fetchHtmlViaProxy = async (url: string): Promise<string> => {
      try {
          const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
          if (response.ok) return await response.text();
      } catch (e) { console.warn("CorsProxy fetch failed:", e); }
      try {
          const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
          if (response.ok) {
              const data = await response.json();
              return data.contents;
          }
      } catch (e) { console.warn("AllOrigins fetch failed:", e); }
      throw new Error("Proxy fetch failed");
  };

  const fetchJsonViaProxy = async (url: string): Promise<any> => {
       const text = await fetchHtmlViaProxy(url);
       try { return JSON.parse(text); } catch { return null; }
  };

  const handleFetchData = async () => {
    if (!targetUrl) return;
    setIsLoading(true);
    setFetchError('');
    addToLog(`開始讀取網址...`);
    setGachaPool([]); 
    setInventory({});
    setTotalPulls(0);
    setTotalSpent(0);
    try {
        console.log(`Step 1: Fetching ${targetUrl}`);
        let currentUrl = targetUrl;
        let html = await fetchHtmlViaProxy(currentUrl);
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const loadInput = doc.getElementById('loadPageUrl') as HTMLInputElement || doc.getElementById('loadURL') as HTMLInputElement;
        if (loadInput && loadInput.value) {
            let nextUrl = loadInput.value;
            if (!nextUrl.startsWith('http')) {
                const baseUrl = new URL(targetUrl);
                if (nextUrl.startsWith('/')) { nextUrl = `${baseUrl.origin}${nextUrl}`; } 
                else { nextUrl = new URL(nextUrl, baseUrl.href).href; }
            }
            currentUrl = nextUrl;
            console.log(`Step 2: Redirect detected to ${currentUrl}`);
            addToLog(`轉導至目標頁面...`);
        }
        if (currentUrl.includes('Scroll/index.html') && currentUrl.includes('#')) {
             addToLog(`偵測到轉蛋專屬頁面，開始解析...`);
             const hashIndex = currentUrl.indexOf('#');
             const sn = currentUrl.substring(hashIndex + 1);
             if (sn) {
                 console.log(`Step 3.1: Extracted SN: ${sn}`);
                 const infoUrl = `https://ro.gnjoy.com.tw/notice/Scroll/ScrollInfo.ashx?SN=${sn}`;
                 addToLog(`查詢轉蛋資訊 (Info API)...`);
                 const infoData = await fetchJsonViaProxy(infoUrl);
                 if (infoData && infoData.Scrolls) {
                     let targetScroll = null;
                     const scrolls = infoData.Scrolls;
                     if (Array.isArray(scrolls) && scrolls.length > 0) { targetScroll = scrolls[0]; } 
                     else if (typeof scrolls === 'object') { targetScroll = scrolls[0] || scrolls['0']; }
                     if (targetScroll) {
                         const mainSN = targetScroll.MainSN || sn;
                         const scrollID = targetScroll.ScrollID;
                         console.log(`Step 3.2: Got ScrollID: ${scrollID}`);
                         const detailUrl = `https://ro.gnjoy.com.tw/notice/Scroll/ScrollDetail.ashx?SN=${mainSN}&scrollID=${scrollID}`;
                         addToLog(`下載詳細內容 (Detail API)...`);
                         const detailData = await fetchJsonViaProxy(detailUrl);
                         if (detailData && detailData.Items) {
                             const pool = parseJsonToPool(detailData);
                             if (pool.length > 0) {
                                 setGachaPool(pool);
                                 reset();
                                 addToLog(`🎉 成功解析官方轉蛋資料！(${pool.length} 項)`);
                                 setIsLoading(false);
                                 return;
                             }
                         }
                     }
                 }
             }
        }
        addToLog(`嘗試直接解析表格...`);
        if (currentUrl !== targetUrl) { html = await fetchHtmlViaProxy(currentUrl); }
        const pool = parseHtmlToPool(html);
        if (pool.length > 0) {
            setGachaPool(pool);
            reset();
            addToLog(`成功載入 ${pool.length} 項 (表格模式)`);
            setIsLoading(false);
            return;
        }
        setFetchError('無法找到有效的轉蛋資料。');
        addToLog('❌ 讀取失敗');
    } catch (err: any) {
        setFetchError(`讀取錯誤: ${err.message}`);
        console.error("Fetch Error:", err);
    } finally {
        setIsLoading(false);
    }
  };

  // Auto-execute fetch on mount
  useEffect(() => {
    if (!hasAutoFetched.current && targetUrl) {
        hasAutoFetched.current = true;
        handleFetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const totalWeight = gachaPool.reduce((sum, item) => sum + item.probability, 0);
      if (totalWeight <= 0) return [];
      for (let i = 0; i < count; i++) {
        const rand = Math.random() * totalWeight;
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
      if (activeView !== 'inventory') setActiveView('inventory');
      return results;
  };

  const handleManualPull = (count: number) => {
      const results = performPulls(count);
      const groupedMap: {[id: string]: {item: GachaItem, count: number}} = {};
      results.forEach(item => {
          if (!groupedMap[item.id]) {
              groupedMap[item.id] = { item, count: 0 };
          }
          groupedMap[item.id].count++;
      });
      const groupedResults = Object.values(groupedMap).sort((a, b) => {
           const order = { [Rarity.SS]: 0, [Rarity.S]: 1, [Rarity.A]: 2, [Rarity.B]: 3, [Rarity.C]: 4 };
           return order[a.item.rarity] - order[b.item.rarity];
      });

      setLastPullResults(groupedResults);
      setShowResultModal(true);

      let logMsg = `抽 ${count} 次：`;
      const highRarity = groupedResults.filter(r => r.item.rarity === Rarity.SS || r.item.rarity === Rarity.S);
      if (highRarity.length > 0) {
          logMsg += ` 獲得 ${highRarity.map(r => `${r.item.name} x${r.count}`).join(', ')}`;
      } else {
           const top3 = groupedResults.slice(0, 3);
           logMsg += ` 獲得 ${top3.map(r => `${r.item.name} x${r.count}`).join(', ')}${groupedResults.length > 3 ? '...' : ''}`;
      }
      addToLog(logMsg);
  };

  const handlePullUntil = async () => {
      if (isSimulating) return;
      const targetItem = gachaPool.find(i => i.id === targetId);
      if (!targetItem) return;

      setIsSimulating(true);
      setShowResultModal(false); 
      addToLog(`>>> 開始模擬：直到抽中 [${targetItem.name}] 為止 <<<`);

      // Yield to UI thread briefly to show the "Start" log
      await new Promise(resolve => setTimeout(resolve, 50));

      const totalWeight = gachaPool.reduce((sum, item) => sum + item.probability, 0);
      let found = false;
      let attempts = 0;
      const maxAttempts = 50000;
      const tempInventoryUpdates: {[key:string]: number} = {};

      while (!found && attempts < maxAttempts) {
          const rand = Math.random() * totalWeight;
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
          
          if (selected.id === targetId) {
              found = true;
          }
      }

      setInventory(prev => {
          const next = { ...prev };
          Object.entries(tempInventoryUpdates).forEach(([id, count]) => {
              next[id] = (next[id] || 0) + count;
          });
          return next;
      });
      setTotalPulls(prev => prev + attempts);
      setTotalSpent(prev => prev + (attempts * 49));
      
      setIsSimulating(false);
      
      if (found) {
          addToLog(`✅ 恭喜！在第 ${attempts.toLocaleString()} 抽 獲得 [${targetItem.name}]`);
          addToLog(`總花費增加: ${(attempts * 49).toLocaleString()} P`);
      } else {
          addToLog(`⚠️ 已停止：超過 ${maxAttempts} 次仍未獲得。`);
      }
      
      setActiveView('inventory');
  };

  const reset = () => {
      setInventory({});
      setTotalPulls(0);
      setTotalSpent(0);
      setSimulationLog([]);
      addToLog('紀錄已重置');
  };

  const getFilteredItems = () => {
      if (activeView === 'pool') {
          return gachaPool;
      }
      return gachaPool
          .filter(item => (inventory[item.id] || 0) > 0)
          .sort((a, b) => {
              const order = { [Rarity.SS]: 0, [Rarity.S]: 1, [Rarity.A]: 2, [Rarity.B]: 3, [Rarity.C]: 4 };
              if (order[a.rarity] !== order[b.rarity]) return order[a.rarity] - order[b.rarity];
              return a.name.localeCompare(b.name);
          });
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Result Modal Overlay */}
      {showResultModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
              <div className="bg-slate-800 rounded-xl shadow-2xl border border-ro-highlight max-w-lg w-full max-h-[80vh] flex flex-col">
                  <div className="p-4 border-b border-ro-secondary flex justify-between items-center bg-ro-primary/50 rounded-t-xl">
                      <div className="flex items-center gap-2">
                          <Gift className="w-5 h-5 text-ro-gold" />
                          <h3 className="font-bold text-white text-lg">本次抽獎結果</h3>
                      </div>
                      <button onClick={() => setShowResultModal(false)} className="text-ro-muted hover:text-white p-1">
                          <X className="w-6 h-6" />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      {lastPullResults.map((entry, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-ro-secondary hover:bg-slate-700 transition-colors">
                              <div className="flex items-center gap-3">
                                  <div className={`font-bold w-8 text-center ${getRarityColor(entry.item.rarity)}`}>
                                      {entry.item.rarity}
                                  </div>
                                  <div className={`font-medium ${entry.item.rarity === Rarity.SS ? 'text-ro-gold' : 'text-white'}`}>
                                      {entry.item.name}
                                  </div>
                              </div>
                              <div className="flex items-center gap-2">
                                  <span className="text-xs text-ro-muted">{entry.item.probability}%</span>
                                  <div className="bg-ro-primary text-white font-mono px-2 py-1 rounded border border-ro-secondary min-w-[3rem] text-center font-bold">
                                      x{entry.count}
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
                  
                  <div className="p-4 border-t border-ro-secondary bg-slate-900/50 rounded-b-xl">
                      <button 
                        onClick={() => setShowResultModal(false)}
                        className="w-full py-3 bg-ro-highlight hover:bg-blue-500 text-white font-bold rounded-lg transition-colors shadow-lg"
                      >
                          確認
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* URL Import Section */}
      <div className="bg-slate-800 rounded-xl p-4 border border-ro-secondary">
          <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
              <div className="flex-1 w-full">
                  <label className="text-xs text-ro-muted font-bold uppercase mb-1 flex items-center gap-2">
                      <LinkIcon className="w-3 h-3" />
                      官方公告網址 (支援多層轉向)
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
          {gachaPool.length > 0 && !fetchError && (
              <div className="mt-2 text-ro-success text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  已載入資料 (共 {gachaPool.length} 項)
              </div>
          )}
      </div>

      {/* Conditional Rendering: If no pool loaded, show waiting state */}
      {gachaPool.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-slate-800/50 rounded-xl border-2 border-dashed border-ro-secondary text-center space-y-4">
              {isLoading ? (
                  <>
                    <div className="w-16 h-16 border-4 border-ro-highlight border-t-transparent rounded-full animate-spin"></div>
                    <div className="max-w-md space-y-2">
                        <h3 className="text-xl font-bold text-white">正在讀取資料...</h3>
                        <p className="text-ro-muted">
                            正在解析官方公告頁面，請稍候...
                        </p>
                    </div>
                  </>
              ) : (
                  <>
                    <Gift className="w-20 h-20 text-slate-700" />
                    <div className="max-w-md space-y-2">
                        <h3 className="text-xl font-bold text-white">等待資料載入</h3>
                        <p className="text-ro-muted">
                            請在上方輸入框貼上 RO 官方轉蛋公告網址，系統將自動解析內容與機率。
                        </p>
                        <p className="text-xs text-slate-500">
                            支援：官方公告頁面、Scroll 轉蛋詳情頁面
                        </p>
                    </div>
                  </>
              )}
          </div>
      ) : (
          <>
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
                                        開始自動抽 (速)
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

                {/* Right Column - Results Area with Tabs */}
                <div className="lg:col-span-8 bg-ro-primary rounded-xl border border-ro-secondary flex flex-col overflow-hidden h-[800px] lg:h-auto">
                    {/* Tab Header */}
                    <div className="flex border-b border-ro-secondary bg-slate-900">
                        <button 
                            onClick={() => setActiveView('inventory')}
                            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeView === 'inventory' ? 'bg-slate-800 text-white border-b-2 border-ro-highlight' : 'text-ro-muted hover:text-white hover:bg-slate-800/50'}`}
                        >
                            <Package className="w-4 h-4" />
                            我的背包 (已獲得)
                        </button>
                        <button 
                            onClick={() => setActiveView('pool')}
                            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeView === 'pool' ? 'bg-slate-800 text-white border-b-2 border-ro-highlight' : 'text-ro-muted hover:text-white hover:bg-slate-800/50'}`}
                        >
                            <List className="w-4 h-4" />
                            轉蛋內容 (獎池)
                        </button>
                    </div>
                    
                    <div className="p-4 bg-slate-800 border-b border-ro-secondary flex justify-between items-center">
                        <h3 className="font-bold text-white">
                            {activeView === 'inventory' ? '已獲得物品' : '完整內容物'}
                        </h3>
                        <div className="text-xs text-ro-muted">
                            {activeView === 'inventory' 
                                ? `共獲得 ${Object.keys(inventory).length} 種道具`
                                : `共 ${gachaPool.length} 種道具`
                            }
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto">
                        {activeView === 'inventory' && Object.keys(inventory).length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-ro-muted">
                                <Package className="w-12 h-12 opacity-20 mb-2" />
                                <p>尚未獲得任何物品</p>
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-900 text-ro-muted sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-3 w-16 text-center">稀有度</th>
                                        <th className="p-3">道具名稱</th>
                                        <th className="p-3 text-right">機率</th>
                                        {activeView === 'inventory' && <th className="p-3 text-right w-24">數量</th>}
                                        {activeView === 'inventory' && <th className="p-3 text-right w-24">佔比</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ro-secondary">
                                    {getFilteredItems().map((item) => {
                                        const count = inventory[item.id] || 0;
                                        const percentage = totalPulls > 0 ? ((count / totalPulls) * 100).toFixed(2) : "0.00";
                                        const isObtained = count > 0;
                                        
                                        return (
                                            <tr key={item.id} className={`${activeView === 'inventory' ? 'bg-slate-800/50 hover:bg-slate-800' : isObtained ? 'bg-slate-800/30' : 'opacity-70'} transition-colors`}>
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
                                                {activeView === 'inventory' && (
                                                    <>
                                                        <td className={`p-3 text-right font-mono text-white font-bold`}>
                                                            {count.toLocaleString()}
                                                        </td>
                                                        <td className="p-3 text-right font-mono text-xs text-ro-muted">
                                                            {percentage}%
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                    
                    <div className="p-4 bg-slate-800 border-t border-ro-secondary text-xs text-ro-muted text-center">
                        統計數據僅供參考，實際機率以官方伺服器設定為準。
                    </div>
                </div>
            </div>
          </>
      )}
    </div>
  );
};