
import React, { useState } from 'react';
import { getAIAssistance } from '../services/geminiService';

const AIHelper: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'bot', content: string}[]>([
    {role: 'bot', content: 'Xin chào! Tôi là trợ lý GIVEBACK AI. Bạn cần tôi hỗ trợ gì về việc tặng đồ hay quyên góp không?'}
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, {role: 'user', content: userMsg}]);
    setIsLoading(true);

    const response = await getAIAssistance(userMsg);
    setMessages(prev => [...prev, {role: 'bot', content: response || "Xin lỗi, tôi chưa hiểu ý bạn."}]);
    setIsLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="w-80 h-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="font-bold">Hỗ trợ GIVEBACK AI</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:opacity-70">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-emerald-500 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-2xl text-sm animate-pulse">Đang suy nghĩ...</div>
              </div>
            )}
          </div>

          <div className="p-3 border-t flex space-x-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Hỏi về cách tặng đồ..."
              className="flex-1 bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500 rounded-xl px-4 py-2 text-sm outline-none"
            />
            <button 
              onClick={handleSend}
              className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-emerald-600 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center space-x-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="font-bold hidden md:inline">GIVEBACK AI</span>
        </button>
      )}
    </div>
  );
};

export default AIHelper;
