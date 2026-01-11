
import React, { useState, useRef } from 'react';
import { getAIAssistance } from '../services/geminiService';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

// Helper functions for Audio Encoding/Decoding
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
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
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const AIHelper: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'bot', content: string, isError?: boolean}[]>([
    {role: 'bot', content: 'Xin chào! Tôi là trợ lý GIVEBACK AI. Hãy hỏi tôi bất cứ điều gì về thiện nguyện nhé!'}
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Live API Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const outAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

  const handleOpenKeySelector = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        await window.aistudio.openSelectKey();
        // Sau khi mở trình chọn Key, chúng ta giả định người dùng sẽ chọn thành công
        setMessages(prev => [...prev, {
          role: 'bot', 
          content: "Đã hiểu! Đệ hãy chọn một API Key từ Project có tính phí (Paid Project) để kích hoạt toàn bộ tính năng Gemini 3 và Veo nhé."
        }]);
      } catch (err) {
        console.error("Lỗi khi gọi openSelectKey:", err);
      }
    } else {
      setMessages(prev => [...prev, {
        role: 'bot', 
        content: "Đệ ơi, trình chọn Key tự động chỉ hoạt động khi Đệ chạy ứng dụng bên trong Google AI Studio. Nếu đang chạy ở tab riêng (localhost), Đệ hãy quay lại giao diện AI Studio để chọn Key nhé!",
        isError: true
      }]);
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
      setMessages(prev => [...prev, {
        role: 'bot', 
        content: "Huynh ơi, hiện tại hệ thống chưa nhận được API Key. Đệ hãy nhấn nút bên dưới để chọn một Project (cần có Billing/Thanh toán) nhé!",
        isError: true
      }]);
    } else {
      setMessages(prev => [...prev, {role: 'bot', content: response || "Xin lỗi, tôi chưa hiểu ý bạn."}]);
    }
    setIsLoading(false);
  };

  const startVoiceCompanion = async () => {
    try {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        if (!(await window.aistudio.hasSelectedApiKey())) {
          await window.aistudio.openSelectKey();
        }
      }

      setIsVoiceMode(true);
      // Tạo instance ngay lúc dùng để lấy Key mới nhất
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
      
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
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
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
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: any) => { 
            if (e.message?.includes("Requested entity was not found") && window.aistudio) {
              window.aistudio.openSelectKey();
            }
            stopVoiceCompanion(); 
          },
          onclose: () => stopVoiceCompanion(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: 'Bạn là người bạn đồng hành ấm áp của dự án GIVEBACK. Giọng điệu dịu dàng, chân thành.'
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found") && window.aistudio) {
        await window.aistudio.openSelectKey();
      }
      setIsVoiceMode(false);
    }
  };

  const stopVoiceCompanion = () => {
    setIsVoiceMode(false);
    if (sessionRef.current) { sessionRef.current.close(); sessionRef.current = null; }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    if (outAudioContextRef.current) { outAudioContextRef.current.close(); outAudioContextRef.current = null; }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {isOpen ? (
        <div className="w-80 h-[28rem] bg-white rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-emerald-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-emerald-600 p-6 text-white flex justify-between items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 opacity-50 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            <div className="relative flex items-center space-x-3">
              <div className={`w-3 h-3 bg-green-400 rounded-full ${isVoiceMode ? 'animate-ping' : ''}`}></div>
              <span className="font-black text-xs uppercase tracking-widest">GIVEBACK AI</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="relative hover:rotate-90 transition-transform p-1 rounded-full hover:bg-white/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
            {isVoiceMode ? (
              <div className="h-full flex flex-col items-center justify-center space-y-8">
                <div className="flex items-center space-x-2">
                  {[1,2,3,4,5].map(i => <div key={i} className="w-1 bg-emerald-600 rounded-full animate-bounce h-8" style={{animationDelay: `${i * 0.1}s`}}></div>)}
                </div>
                <button onClick={stopVoiceCompanion} className="bg-red-500 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-red-600 active:scale-95 transition-all">Dừng trò chuyện</button>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-3xl text-sm shadow-sm ${m.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : m.isError ? 'bg-red-50 text-red-700 border border-red-100 rounded-tl-none font-bold' : 'bg-white text-gray-800 border border-emerald-50 rounded-tl-none italic'}`}>
                      {m.content}
                      {m.isError && (
                        <button 
                          onClick={handleOpenKeySelector}
                          className="mt-3 w-full bg-red-600 text-white py-2.5 rounded-xl text-[10px] uppercase font-black tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-95"
                        >
                          CHỌN API KEY NGAY
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && <div className="text-center text-[10px] text-gray-400 font-black animate-pulse uppercase">AI đang xử lý...</div>}
              </>
            )}
          </div>

          <div className="p-4 bg-white border-t flex items-center space-x-3">
            {!isVoiceMode && (
              <>
                <button onClick={startVoiceCompanion} className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl hover:bg-emerald-100 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></button>
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Hỏi AI về Giveback..."
                  className="flex-1 bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500 rounded-2xl px-5 py-3 text-sm outline-none font-medium"
                />
                <button onClick={handleSend} className="bg-emerald-600 text-white p-3 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-100"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button>
              </>
            )}
          </div>
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} className="bg-emerald-600 text-white p-5 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center space-x-3 group border-4 border-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          <span className="font-black text-xs uppercase tracking-widest hidden md:inline">Tâm sự cùng AI</span>
        </button>
      )}
    </div>
  );
};

export default AIHelper;
