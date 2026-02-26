
import React, { useState, useRef, useEffect } from 'react';
import { getAIAssistanceStream } from '../services/geminiService';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

// Helper nội bộ để mã hóa/giải mã âm thanh chuẩn raw PCM
function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
  return buffer;
}

const AIHelper: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'bot', content: string}[]>([
    {role: 'bot', content: 'Chào Bạn! Mình là GIVEBACK AI. Bạn muốn tặng đồ hay tìm địa điểm từ thiện nào không?'}
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    
    // Thêm tin nhắn của user và một tin nhắn trống của bot để chuẩn bị stream
    setMessages(prev => [
      ...prev, 
      {role: 'user', content: userMsg},
      {role: 'bot', content: ''} 
    ]);
    
    setIsLoading(true);

    await getAIAssistanceStream(userMsg, (text) => {
      setIsLoading(false); // Tắt loading ngay khi có chunk đầu tiên
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg && lastMsg.role === 'bot') {
          lastMsg.content = text;
        }
        return newMessages;
      });
    });
  };

  const stopVoice = () => {
    setIsVoiceMode(false);
    if (sessionRef.current) { sessionRef.current.close(); sessionRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    if (outAudioContextRef.current) { outAudioContextRef.current.close(); outAudioContextRef.current = null; }
  };

  const startVoice = async () => {
    try {
      setIsVoiceMode(true);
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
      const gatewayUrl = process.env.VERCEL_AI_GATEWAY_URL;
      const gatewayToken = process.env.VERCEL_AI_GATEWAY_TOKEN;
      
      const ai = new GoogleGenAI({ 
        apiKey,
        // @ts-ignore
        baseUrl: gatewayUrl,
        // @ts-ignore
        requestOptions: gatewayToken ? {
          headers: {
            'Authorization': `Bearer ${gatewayToken}`
          }
        } : undefined
      });
      audioContextRef.current = new AudioContext({sampleRate: 16000});
      outAudioContextRef.current = new AudioContext({sampleRate: 24000});
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(processor);
            processor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioBase64 = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioBase64 && outAudioContextRef.current) {
              const ctx = outAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioBase64), ctx, 24000);
              const node = ctx.createBufferSource();
              node.buffer = buffer;
              node.connect(ctx.destination);
              node.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
            }
          },
          onerror: () => stopVoice(),
          onclose: () => stopVoice(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: 'Mình là - trợ lý GIVEBACK. Hãy trò chuyện ấm áp và vui vẻ bằng tiếng Việt.'
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { setIsVoiceMode(false); }
  };

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[450px] bg-white dark:bg-slate-900 z-[210] shadow-2xl transition-transform transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="p-8 bg-emerald-600 text-white flex justify-between items-center">
          <div>
            <h3 className="font-black text-lg uppercase ">GIVEBACK AI</h3>
            <p className="text-[10px] font-bold opacity-70">Cùng nhau lan tỏa yêu thương</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 dark:bg-slate-950/20 custom-scrollbar">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-[2rem] text-sm font-medium shadow-sm ${m.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-emerald-50 rounded-tl-none'}`}>
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && <div className="flex space-x-2 p-4 animate-pulse"><div className="w-2 h-2 bg-emerald-400 rounded-full"></div><div className="w-2 h-2 bg-emerald-500 rounded-full"></div><div className="w-2 h-2 bg-emerald-600 rounded-full"></div></div>}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 border-t border-emerald-50 dark:border-slate-800 space-y-4">
          <div className="flex items-center space-x-2">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Hỏi mình bất cứ điều gì..." className="flex-1 bg-gray-50 dark:bg-slate-800 rounded-2xl px-6 py-4 text-sm outline-none dark:text-white font-bold" />
            <button onClick={handleSend} className="bg-emerald-600 text-white p-4 rounded-2xl shadow-xl hover:bg-emerald-700 active:scale-95 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a 1 1 0 0 0 -1.788 0l-7 14a 1 1 0 0 0 1.169 1.409l5-1.429A 1 1 0 0 0 9 15.571V11a 1 1 0 1 1 2 0v4.571a 1 1 0 0 0 .725.962l5 1.428a 1 1 0 0 0 1.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
          <button onClick={isVoiceMode ? stopVoice : startVoice} className={`w-full flex items-center justify-center space-x-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isVoiceMode ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1a 3 3 0 0 0 -3 3v8a 3 3 0 0 0 6 0V4a 3 3 0 0 0 -3 -3z M19 10v1a 7 7 0 0 1 -14 0v-1 M12 19v4 M8 23h8" />
            </svg>
            <span>{isVoiceMode ? 'DỪNG TRÒ CHUYỆN' : 'TÂM SỰ GIỌNG NÓI'}</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default AIHelper;
