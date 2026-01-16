
import React, { useState, useRef } from 'react';
import { getAIAssistance } from '../services/geminiService';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from '@google/genai';

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
    const win = window as any;
    if (win.aistudio && typeof win.aistudio.openSelectKey === 'function') {
      try {
        await win.aistudio.openSelectKey();
      } catch (err) {
        console.error("Lỗi khi gọi openSelectKey:", err);
      }
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
      setMessages(prev => [...prev, {role: 'bot', content: response || "Xin lỗi, tôi chưa hiểu ý bạn."}]);
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
      // Tạo instance mới để luôn lấy API Key mới nhất
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
              const pcmBlob: GenAIBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              // Đảm bảo chỉ gửi sau khi session đã sẵn sàng
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Fix: Added safety check for nested audio parts in Live API response
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
          },
          onerror: (e) => {
            console.error("Live API Error:", e);
            stopVoiceCompanion();
          },
          onclose: () => stopVoiceCompanion(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: 'Bạn là người bạn đồng hành ấm áp của dự dự án GIVEBACK. Hãy trả lời thân thiện.'
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) { 
      console.error("Voice start error:", err);
      setIsVoiceMode(false); 
    }
  };

  return (
    <div className="fixed bottom-24 right-4 z-[100]">
      {isOpen ? (
        <div className="w-80 h-[28rem] bg-white rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-emerald-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-[#059669] p-6 text-white flex justify-between items-center">
            <div className="relative flex items-center space-x-3">
              <div className={`w-2 h-2 bg-green-400 rounded-full ${isVoiceMode ? 'animate-ping' : ''}`}></div>
              <span className="font-black text-xs uppercase tracking-widest">GIVEBACK AI</span>
            </div>
            <button onClick={() => setIsOpen(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-3xl text-xs font-bold ${m.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-800 shadow-sm border border-emerald-50'}`}>
                  {m.content}
                  {m.isError && <button onClick={handleOpenKeySelector} className="block mt-2 text-[8px] underline">Chọn Key</button>}
                </div>
              </div>
            ))}
            {isLoading && <div className="text-center text-[8px] font-black animate-pulse text-gray-400 uppercase tracking-widest">Đang xử lý...</div>}
          </div>
          <div className="p-4 bg-white border-t flex space-x-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Nhắn nhủ..."
              className="flex-1 bg-gray-50 rounded-2xl px-4 py-3 text-xs outline-none font-bold"
            />
            <button onClick={handleSend} className="bg-emerald-600 text-white p-3 rounded-2xl"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button>
          </div>
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} className="bg-[#00a876] text-white px-6 py-4 rounded-full shadow-2xl flex items-center space-x-3 border-4 border-white transition-transform hover:scale-105">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          <span className="font-black text-[11px] uppercase tracking-widest">Tâm sự cùng AI</span>
        </button>
      )}
    </div>
  );
};

export default AIHelper;
