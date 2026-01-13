
import { GoogleGenAI, Type, Modality } from "@google/genai";

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey(): Promise<boolean>;
      openSelectKey(): Promise<void>;
    };
  }
}

const SYSTEM_INSTRUCTION = "Bạn là trợ lý AI thông minh của dự án GIVEBACK. Dự án này giúp mọi người tặng đồ cũ và quyên góp từ thiện. Hãy trả lời thân thiện, nhiệt tình và bằng tiếng Việt.";

// Hàm hỗ trợ kiểm tra và yêu cầu chọn API Key
const ensureApiKey = async () => {
  if (window.aistudio) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
      // Theo quy định, sau khi gọi openSelectKey ta cứ giả định là đã thành công để tiếp tục
    }
  }
};

const handleAIApiError = async (error: any) => {
  const errorMsg = error?.message || "";
  console.error("AI Service Error:", error);
  if (window.aistudio && (errorMsg.includes("Requested entity was not found") || errorMsg.includes("API_KEY_MISSING") || errorMsg.includes("API key not found"))) {
    try { 
      await window.aistudio.openSelectKey(); 
    } catch (e) { 
      console.error(e); 
    }
  }
};

export const getAIAssistance = async (prompt: string) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "ERROR_MISSING_KEY";
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { systemInstruction: SYSTEM_INSTRUCTION }
    });
    return response.text || "Xin lỗi, tôi không thể tìm thấy câu trả lời.";
  } catch (error: any) {
    await handleAIApiError(error);
    return "Đệ ơi, bộ não AI đang hơi 'lag' một chút.";
  }
};

export const generateMissionImage = async (location: string, description: string) => {
  await ensureApiKey();
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `A breathtaking, cinematic, heartwarming photograph of happy ethnic minority children laughing and smiling in ${location}, Vietnam. Soft natural sunlight, mountain background, hopeful and bright atmosphere. High-end documentary photography style, 4k, emotional.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "16:9" } }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error: any) {
    await handleAIApiError(error);
    return null;
  }
};

export const generateMissionVideo = async (prompt: string) => {
  await ensureApiKey(); // Veo bắt buộc phải có bước này
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  try {
    const ai = new GoogleGenAI({ apiKey });
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `Cinematic 4k footage of ${prompt}, high quality documentary style, emotional journey, hopeful music vibes.`,
      config: { 
        numberOfVideos: 1, 
        resolution: '720p', 
        aspectRatio: '16:9' 
      }
    });
    
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }
    
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) return null;
    
    const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
    const blob = await videoResponse.blob();
    return URL.createObjectURL(blob);
  } catch (error: any) {
    await handleAIApiError(error);
    return null;
  }
};

// Fixed: Maps grounding is only supported in Gemini 2.5 series models. Changed from gemini-3-pro-image-preview to gemini-2.5-flash.
export const searchCharityLocations = async (query: string, lat?: number, lng?: number) => {
  await ensureApiKey();
  const apiKey = process.env.API_KEY;
  if (!apiKey) return { text: "Lỗi tìm kiếm: Thiếu API Key.", sources: [] };
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-latest", 
      contents: query,
      config: { 
        tools: [{ googleMaps: {} }], 
        toolConfig: { 
          retrievalConfig: { 
            latLng: lat && lng ? { latitude: lat, longitude: lng } : undefined 
          } 
        } 
      },
    });
    return { 
      text: response.text || "AI chưa tìm thấy mô tả chi tiết.", 
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] 
    };
  } catch (error: any) { 
    await handleAIApiError(error); 
    return { text: "Có lỗi xảy ra khi quét bản đồ.", sources: [] }; 
  }
};
