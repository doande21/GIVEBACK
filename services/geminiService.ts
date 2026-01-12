
import { GoogleGenAI, Type } from "@google/genai";

declare global {
  interface Window {
    aistudio?: {
      openSelectKey: () => Promise<void>;
    };
  }
}

const SYSTEM_INSTRUCTION = "Bạn là trợ lý AI thông minh của dự án GIVEBACK. Dự án này giúp mọi người tặng đồ cũ và quyên góp từ thiện. Hãy trả lời thân thiện, nhiệt tình và bằng tiếng Việt.";

const handleAIApiError = async (error: any) => {
  const errorMsg = error?.message || "";
  console.error("AI Service Error:", error);
  
  if (window.aistudio && (
    errorMsg.includes("Requested entity was not found") || 
    errorMsg.includes("API_KEY_MISSING") ||
    errorMsg.includes("API key not found")
  )) {
    try {
      await window.aistudio.openSelectKey();
    } catch (e) {
      console.error("Không thể kích hoạt trình chọn Key:", e);
    }
  }
};

export const getAIAssistance = async (prompt: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });
    return response.text || "Xin lỗi, tôi không thể tìm thấy câu trả lời.";
  } catch (error: any) {
    await handleAIApiError(error);
    if (!process.env.API_KEY) return "ERROR_MISSING_KEY";
    return "Đệ ơi, bộ não AI đang hơi 'lag' một chút. Đệ thử nhấn nút chọn lại API Key hoặc kiểm tra kết nối nhé!";
  }
};

export const suggestDescription = async (itemName: string, category: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Hãy viết một đoạn mô tả ngắn gọn, chân thành và thu hút (khoảng 30-50 từ) cho một món đồ quyên góp là '${itemName}' thuộc danh mục '${category}'. Nhấn mạnh vào giá trị món đồ có thể mang lại cho người nhận.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });
    return response.text || "";
  } catch (error: any) {
    await handleAIApiError(error);
    return "";
  }
};

export const analyzeItemImage = async (base64Data: string, mimeType: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    const prompt = `Hãy nhìn vào hình ảnh món đồ này và đóng vai người đăng tin tặng đồ trên dự án GIVEBACK.
    Hãy phân tích thật kỹ và trả về dữ liệu JSON chính xác với các trường sau:
    - title: Tên món đồ cụ thể, ngắn gọn (Vd: Mô hình Gundam HG, Nồi cơm điện Sharp 1.8L).
    - category: BẮT BUỘC chọn 1 trong: 'Quần áo', 'Đồ gia dụng', 'Sách vở', 'Điện tử', 'Đồ chơi', 'Khác'.
    - condition: Chọn 1 trong: 'new' (nếu rất mới), 'good' (còn tốt), 'used' (cũ).
    - description: Một đoạn mô tả chân thành, viết theo kiểu người tặng đồ đang muốn chia sẻ niềm vui (30-50 từ).`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data.includes(',') ? base64Data.split(',')[1] : base64Data,
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            category: { type: Type.STRING },
            condition: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ["title", "category", "condition", "description"],
        },
      },
    });

    const textResponse = response.text || "{}";
    // Đôi khi AI vẫn trả về markdown ```json ... ``` dù đã set mimeType
    const cleanJson = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error: any) {
    await handleAIApiError(error);
    return null;
  }
};

export const searchCharityLocations = async (query: string, lat?: number, lng?: number) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
    return { text: response.text, sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] };
  } catch (error: any) {
    await handleAIApiError(error);
    return { text: "Không thể tìm thấy địa điểm lúc này.", sources: [] };
  }
};

export const generateMissionVideo = async (prompt: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `Cinematic footage of ${prompt}, charity mission in Vietnam, heartwarming atmosphere, high quality, 1080p.`,
      config: { numberOfVideos: 1, resolution: '1080p', aspectRatio: '16:9' }
    });
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await videoResponse.blob();
    return URL.createObjectURL(blob);
  } catch (error: any) {
    await handleAIApiError(error);
    return null;
  }
};
