
import { GoogleGenAI, Type } from "@google/genai";

const SYSTEM_INSTRUCTION = "Bạn là trợ lý AI thông minh của dự án GIVEBACK. Dự án này giúp mọi người tặng đồ cũ và quyên góp từ thiện. Hãy trả lời thân thiện, nhiệt tình và bằng tiếng Việt.";

/**
 * getAIAssistance provides text-based AI assistance
 */
export const getAIAssistance = async (prompt: string) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "LỖI: Chưa có API Key.";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { systemInstruction: SYSTEM_INSTRUCTION }
    });
    
    // Correctly access .text property from GenerateContentResponse
    if (response && response.text) {
      return response.text;
    }
    
    return "Xin lỗi Đệ, Huynh không nhận được phản hồi từ hệ thống.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    const errorStr = JSON.stringify(error);
    
    if (errorStr.includes("API_KEY_SERVICE_BLOCKED") || error?.status === 403) {
      return "ERROR_KEY_BLOCKED";
    }
    if (errorStr.includes("API_KEY_INVALID")) {
      return "ERROR_KEY_INVALID";
    }
    
    return "Đệ ơi, bộ não AI đang hơi 'lag' một chút.";
  }
};

/**
 * analyzeDonationItem analyzes a donation item's image and description
 */
export const analyzeDonationItem = async (imageData: string, description: string) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Phân tích hình ảnh và mô tả sau để trích xuất thông tin sản phẩm tặng. 
    Mô tả của người dùng: "${description}"
    Hãy trả về JSON chính xác theo cấu trúc sau:
    {
      "suggestedTitle": "Tên ngắn gọn",
      "minAge": số, "maxAge": số, "minWeight": số, "maxWeight": số,
      "bookAuthor": "string", "bookGenre": "string"
    }`;

    // Defined the image part structure without using the SDK's Blob type name to avoid conflict with browser Blob
    const imagePart = { 
      inlineData: { 
        mimeType: "image/jpeg", 
        data: imageData.split(',')[1] || "" 
      } 
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [imagePart, { text: prompt }] },
      config: { responseMimeType: "application/json" }
    });

    const jsonText = response.text;
    if (jsonText) {
      return JSON.parse(jsonText.trim());
    }
    return null;
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return null;
  }
};

/**
 * generateMissionImage
 */
export const generateMissionImage = async (location: string, description: string) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `A conceptual charity mission in ${location}. ${description}. 16:9` }] },
      config: { imageConfig: { aspectRatio: "16:9" } },
    });
    
    // Safely iterate through candidate parts to find the generated image
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts;
    if (parts) {
      const imagePart = parts.find(p => p.inlineData !== undefined);
      if (imagePart && imagePart.inlineData) {
        return `data:image/png;base64,${imagePart.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("AI Image Generation Error:", error);
    return null;
  }
};

/**
 * searchCharityLocations
 */
export const searchCharityLocations = async (query: string, lat?: number, lng?: number) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    // Maps grounding is only supported in Gemini 2.5 series models
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-latest',
      contents: query,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: { 
          retrievalConfig: { 
            latLng: { 
              latitude: lat || 10.762622, 
              longitude: lng || 106.660172 
            } 
          } 
        }
      },
    });
    
    const text = response.text || "Không tìm thấy thông tin phù hợp.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return {
      text,
      sources: chunks
    };
  } catch (error) {
    console.error("AI Maps Search Error:", error);
    return null;
  }
};
