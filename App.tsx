import React, { useState } from 'react';
import { 
  Dna, 
  Calculator, 
  Shirt, 
  Gift, 
  Menu, 
  X,
  LayoutDashboard
} from 'lucide-react';
import { GachaSimulator } from './components/GachaSimulator';
import { EnchantSimulator } from './components/EnchantSimulator';
import { ExpTracker } from './components/ExpTracker';
import { AvatarSystem } from './components/AvatarSystem';

// Type definitions for navigation
enum Tab {
  DASHBOARD = 'DASHBOARD',
  GACHA = 'GACHA',
  ENCHANT = 'ENCHANT',
  EXP = 'EXP',
  AVATAR = 'AVATAR'
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.GACHA);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: Tab.GACHA, label: '轉蛋模擬器', icon: Gift },
    { id: Tab.EXP, label: '經驗值紀錄', icon: Calculator },
    { id: Tab.ENCHANT, label: '附魔模擬器', icon: Dna },
    { id: Tab.AVATAR, label: '紙娃娃系統', icon: Shirt },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case Tab.GACHA:
        return <GachaSimulator />;
      case Tab.ENCHANT:
        return <EnchantSimulator />;
      case Tab.EXP:
        return <ExpTracker />;
      case Tab.AVATAR:
        return <AvatarSystem />;
      default:
        return <GachaSimulator />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-ro-text bg-slate-900">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-ro-primary border-b border-ro-secondary shadow-md z-20 sticky top-0">
        <div className="flex items-center space-x-2">
          <LayoutDashboard className="w-6 h-6 text-ro-highlight" />
          <h1 className="text-xl font-bold text-white">RO ToolHub</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen w-64 bg-ro-primary border-r border-ro-secondary 
        transform transition-transform duration-200 ease-in-out z-10
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        flex flex-col
      `}>
        <div className="p-6 border-b border-ro-secondary hidden md:flex items-center space-x-3">
          <div className="bg-ro-accent p-2 rounded-lg">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">RO ToolHub</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`
                w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
                ${activeTab === item.id 
                  ? 'bg-ro-accent text-white shadow-lg shadow-blue-900/50' 
                  : 'text-ro-muted hover:bg-ro-secondary hover:text-white'}
              `}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-ro-muted'}`} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-ro-secondary text-xs text-ro-muted text-center">
          <p>© 2024 RO ToolHub</p>
          <p className="mt-1">Fan-made Utility</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-900">
        <div className="max-w-7xl mx-auto">
           {renderContent()}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-0 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default App;