import React from 'react';
import { Shirt, Construction } from 'lucide-react';

export const AvatarSystem: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6 animate-fade-in">
        <div className="bg-ro-primary p-8 rounded-full border-4 border-ro-secondary shadow-2xl">
            <Shirt className="w-16 h-16 text-purple-400 animate-bounce" />
        </div>
        <div>
            <h2 className="text-3xl font-bold text-white mb-2">紙娃娃系統</h2>
            <p className="text-ro-muted max-w-md mx-auto">
                後續將補上資料，讓您自由搭配各種頭飾與服裝預覽。
            </p>
        </div>
        <div className="flex items-center space-x-2 text-purple-500 bg-purple-500/10 px-4 py-2 rounded-lg">
            <Construction className="w-4 h-4" />
            <span className="text-sm font-bold">WIP - Coming Soon</span>
        </div>
    </div>
  );
};