
import { GoogleGenAI, Type, Blob } from "@google/genai";

const SYSTEM_INSTRUCTION = "Bạn là trợ lý AI thông minh của dự án GIVEBACK. Dự án này giúp mọi người tặng đồ cũ và quyên góp từ thiện. Hãy trả lời thân thiện, nhiệt tình và bằng tiếng Việt.";

/**
 * analyzeDonationItem analyzes a donation item's image and description
 * imageData is expected to be a base64 data URL
 */
export const analyzeDonationItem = async (imageData: string, description: string) => {
  if (!process.env.API_KEY) return null;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Phân tích hình ảnh và mô tả sau để trích xuất thông tin sản phẩm tặng. 
    Mô tả của người dùng: "${description}"
    Hãy trả về JSON chính xác theo cấu trúc sau (nếu không có thông tin thì để null hoặc 0):
    {
      "suggestedTitle": "Tên ngắn gọn",
      "minAge": số tuổi tối thiểu,
      "maxAge": số tuổi tối đa,
      "minWeight": kg tối thiểu,
      "maxWeight": kg tối đa,
      "minHeight": cm tối thiểu,
      "maxHeight": cm tối đa,
      "bookAuthor": "Tên tác giả nếu là sách",
      "bookGenre": "Thể loại sách",
      "toyType": "Loại đồ chơi",
      "householdType": "Loại đồ gia dụng"
    }`;

    // Fix: Explicitly use the @google/genai Blob type for image data to prevent conflict with browser's global Blob
    const imagePart: { inlineData: Blob } = { 
      inlineData: { 
        mimeType: "image/jpeg", 
        data: imageData.split(',')[1] || "" 
      } 
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          imagePart,
          { text: prompt }
        ]
      },
      config: { 
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return null;
  }
};

/**
 * getAIAssistance provides text-based AI assistance using gemini-3-flash-preview
 */
export const getAIAssistance = async (prompt: string) => {
  if (!process.env.API_KEY) return "ERROR_MISSING_KEY";
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { systemInstruction: SYSTEM_INSTRUCTION }
    });
    return response.text || "Xin lỗi, tôi không thể tìm thấy câu trả lời.";
  } catch (error: any) {
    return "Đệ ơi, bộ não AI đang hơi 'lag' một chút.";
  }
};

/**
 * Generates an AI vision image for a charity mission
 */
export const generateMissionImage = async (location: string, description: string) => {
  if (!process.env.API_KEY) return null;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `A conceptual and inspiring image of a charity mission in ${location}. Description: ${description}. Realistic style, cinematic lighting, 16:9 aspect ratio.`;
    
    // gemini-2.5-flash-image is the recommended model for general image generation
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    // Iterate through parts to find the generated image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("AI Image Generation Error:", error);
    return null;
  }
};

/**
 * Uses Google Maps grounding to find charity-related locations
 */
export const searchCharityLocations = async (query: string, lat?: number, lng?: number) => {
  if (!process.env.API_KEY) return null;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const config: any = {
      tools: [{ googleMaps: {} }],
    };

    // Provide user location for better grounding relevance if available
    if (lat !== undefined && lng !== undefined) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: lat,
            longitude: lng
          }
        }
      };
    }

    // gemini-2.5-flash is required for Google Maps grounding
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: query,
      config: config,
    });

    const text = response.text || "Không tìm thấy thông tin phù hợp.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return {
      text,
      // Filter for chunks containing Google Maps URIs
      sources: chunks.filter((c: any) => c.maps)
    };
  } catch (error) {
    console.error("AI Maps Search Error:", error);
    return null;
  }
};
