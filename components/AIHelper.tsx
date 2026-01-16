
import React, { useState, useRef, useEffect } from 'react';
import { getAIAssistance } from '../services/geminiService';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';

interface AIHelperProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper functions for Audio Encoding/Decoding
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

const AIHelper: React.FC<AIHelperProps> = ({ isOpen, onClose }) => {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'bot', content: string, isError?: boolean}[]>([
    {role: 'bot', content: 'Chào Đệ! Huynh là GIVEBACK AI. Đệ cần hỏi gì về quà tặng hay các chuyến cứu trợ không?'}
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Live API Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const outAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleOpenKeySelector = async () => {
    const win = window as any;
    if (win.aistudio && typeof win.aistudio.openSelectKey === 'function') {
      try { await win.aistudio.openSelectKey(); } catch (err) { console.error(err); }
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, {role: 'user', content: userMsg}]);
    setIsLoading(true);
    const response = await getAIAssistance(userMsg);
    if (response === "ERROR_MISSING_KEY") {
      setMessages(prev => [...prev, { role: 'bot', content: "Hệ thống cần API Key để kích hoạt AI đệ ơi!", isError: true }]);
    } else {
      setMessages(prev => [...prev, {role: 'bot', content: response || "Xin lỗi, Huynh chưa rõ ý Đệ."}]);
    }
    setIsLoading(false);
  };

  const stopVoiceCompanion = () => {
    setIsVoiceMode(false);
    if (sessionRef.current) { sessionRef.current.close(); sessionRef.current = null; }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    if (outAudioContextRef.current) { outAudioContextRef.current.close(); outAudioContextRef.current = null; }
  };

  const startVoiceCompanion = async () => {
    try {
      setIsVoiceMode(true);
      // Create a new GoogleGenAI instance right before making an API call to ensure it uses the current key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
      outAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
              
              // Fix: Explicitly type pcmBlob as the SDK's Blob to avoid browser global type conflict
              const pcmBlob: Blob = { 
                data: encode(new Uint8Array(int16.buffer)), 
                mimeType: 'audio/pcm;rate=16000' 
              };
              
              // CRITICAL: Solely rely on sessionPromise resolves to send realtime data
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outAudioContextRef.current) {
              const ctx = outAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const sourceNode = ctx.createBufferSource();
              sourceNode.buffer = buffer;
              sourceNode.connect(ctx.destination);
              sourceNode.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(sourceNode);
            }
            
            if (message.serverContent?.interrupted) {
              for (const source of sourcesRef.current.values()) {
                source.stop();
                sourcesRef.current.delete(source);
              }
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => { console.error(e); stopVoiceCompanion(); },
          onclose: () => stopVoiceCompanion(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: 'Bạn là Huynh - một trợ lý nhiệt huyết của GIVEBACK. Trả lời thân thiện, hào sảng bằng tiếng Việt.'
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) { 
      console.error(err);
      setIsVoiceMode(false); 
    }
  };

  return (
    <>
      {/* OVERLAY */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] transition-opacity duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose}
      ></div>

      {/* SIDEBAR DRAWER */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[450px] bg-white dark:bg-slate-900 z-[210] shadow-[-10px_0_30px_rgba(0,0,0,0.1)] transition-transform duration-500 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col border-l border-emerald-50 dark:border-slate-800`}>
        {/* Header */}
        <div className="p-8 bg-emerald-600 dark:bg-emerald-700 text-white flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
          <div className="relative flex items-center space-x-4">
            <div className={`w-3 h-3 bg-green-300 rounded-full ${isVoiceMode ? 'animate-ping' : ''}`}></div>
            <div>
               <h3 className="font-black text-lg uppercase tracking-tighter italic">GIVEBACK AI</h3>
               <p className="text-[9px] font-bold uppercase tracking-widest opacity-70">Người bạn đồng hành nhân ái</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 dark:bg-slate-950/20 custom-scrollbar">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`max-w-[85%] p-4 rounded-[2rem] text-sm font-medium shadow-sm transition-all ${m.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-emerald-50 rounded-tl-none border border-emerald-50 dark:border-slate-700'}`}>
                {m.content}
                {m.isError && <button onClick={handleOpenKeySelector} className="block mt-2 text-[10px] underline font-black">CHỌN API KEY 🔑</button>}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <div className="bg-white dark:bg-slate-800 p-4 rounded-[2rem] border border-emerald-50 dark:border-slate-700 shadow-sm flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input & Voice Controls */}
        <div className="p-6 bg-white dark:bg-slate-900 border-t border-emerald-50 dark:border-slate-800 space-y-4">
          <div className="flex items-center space-x-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Hỏi Huynh bất cứ điều gì..."
              className="flex-1 bg-gray-50 dark:bg-slate-800 rounded-2xl px-6 py-4 text-sm outline-none border-2 border-transparent focus:border-emerald-500 dark:text-white font-bold transition-all shadow-inner"
            />
            <button 
              onClick={handleSend} 
              disabled={!input.trim()}
              className="bg-emerald-600 text-white p-4 rounded-2xl shadow-xl hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <button 
                onClick={isVoiceMode ? stopVoiceCompanion : startVoiceCompanion}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isVoiceMode ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                <span>{isVoiceMode ? 'DỪNG TRÒ CHUYỆN' : 'TÂM SỰ GIỌNG NÓI'}</span>
              </button>
            </div>
            <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">v2.0 Beta</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIHelper;
