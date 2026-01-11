
import { GoogleGenAI, Type } from "@google/genai";

declare global {
  interface Window {
    aistudio?: any;
  }
}

const SYSTEM_INSTRUCTION = "Bạn là trợ lý AI thông minh của dự án GIVEBACK. Dự án này giúp mọi người tặng đồ cũ và quyên góp từ thiện. Hãy trả lời thân thiện, nhiệt tình và bằng tiếng Việt.";

// Helper to handle potential API key issues (e.g. billing not enabled)
const handleAIApiError = async (error: any) => {
  const errorMsg = error?.message || "";
  console.error("AI Service Error:", error);
  
  // Tự động kích hoạt trình chọn Key nếu lỗi liên quan đến xác thực hoặc project
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
    // Luôn tạo instance mới trước khi gọi để lấy Key mới nhất từ process.env.API_KEY
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
    const prompt = `Hãy phân tích hình ảnh món đồ này để đăng tin tặng đồ trên GIVEBACK. 
    Trả về dữ liệu dưới dạng JSON bao gồm:
    - title: Tên món đồ ngắn gọn (Vd: Nồi cơm điện Sharp).
    - category: Một trong các loại: 'Quần áo', 'Đồ gia dụng', 'Sách vở', 'Điện tử', 'Đồ chơi', 'Khác'.
    - condition: Một trong các giá trị: 'new', 'good', 'used'.
    - description: Một đoạn mô tả chân thành, thu hút (30-50 từ) bằng tiếng Việt.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data.split(',')[1],
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

    const result = JSON.parse(response.text || "{}");
    return result;
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

    const text = response.text;
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return { text, sources };
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
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '16:9'
      }
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
