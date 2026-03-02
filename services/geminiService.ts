
import { GoogleGenAI, Type } from "@google/genai";

const SYSTEM_INSTRUCTION = "Bạn là trợ lý AI thông minh của dự án GIVEBACK. Dự án này giúp mọi người tặng đồ cũ và quyên góp từ thiện. Hãy trả lời thân thiện, nhiệt tình và bằng tiếng Việt.";

const getAIInstance = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) return null;

  const gatewayUrl = process.env.VERCEL_AI_GATEWAY_URL;
  const gatewayToken = process.env.VERCEL_AI_GATEWAY_TOKEN;

  return new GoogleGenAI({ 
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
};

/**
 * getAIAssistanceStream: Trò chuyện văn bản dạng streaming (Tăng tốc độ phản hồi)
 */
export const getAIAssistanceStream = async (prompt: string, onChunk: (text: string) => void) => {
  const ai = getAIInstance();
  if (!ai) return onChunk("LỖI: Chưa có API Key.");

  try {
    const response = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });
    
    let fullText = "";
    for await (const chunk of response) {
      const chunkText = chunk.text || "";
      fullText += chunkText;
      onChunk(fullText);
    }
  } catch (error: any) {
    console.error("Gemini Stream Error:", error);
    onChunk("Đệ ơi, bộ não AI đang hơi 'lag' một chút. Đệ kiểm tra lại Key nhé!");
  }
};

/**
 * getAIAssistance: Trò chuyện văn bản tổng quát (Legacy)
 */
export const getAIAssistance = async (prompt: string) => {
  const ai = getAIInstance();
  if (!ai) return "LỖI: Chưa có API Key.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });
    
    return response.text || "Xin lỗi Đệ, Huynh không nhận được phản hồi.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return "Đệ ơi, bộ não AI đang hơi 'lag' một chút. Đệ kiểm tra lại Key nhé!";
  }
};

/**
 * analyzeDonationItem: Sử dụng AI Vision để phân tích hình ảnh quà tặng siêu cấp
 */
export const analyzeDonationItem = async (imageData: string, userDescription: string) => {
  const ai = getAIInstance();
  if (!ai) return null;

  try {
    const prompt = `Bạn là chuyên gia thẩm định đồ cũ của GIVEBACK. 
    Hãy phân tích hình ảnh này thật chi tiết. 
    Mô tả ban đầu của người dùng (nếu có): "${userDescription}".
    
    Nhiệm vụ của bạn:
    1. Nhận diện chính xác món đồ là gì.
    2. Chọn 1 phân loại phù hợp nhất từ danh sách: ["Quần áo", "Đồ gia dụng", "Sách vở", "Điện tử", "Đồ chơi", "Khác"].
    3. Đề xuất một tiêu đề (suggestedTitle) thu hút và rõ ràng.
    4. Viết một mô tả chi tiết (detailedDescription) khoảng 2-3 câu về tình trạng, đặc điểm nổi bật của món đồ để giúp người nhận dễ hình dung.
    5. Đánh giá tình trạng (condition): "new" (nếu trông như mới) hoặc "good" (nếu đã qua sử dụng nhưng còn tốt).
    6. Ước lượng số lượng (quantity) nếu thấy nhiều món.
    7. Nếu là "Quần áo" hoặc "Đồ chơi": Hãy ước lượng độ tuổi (minAge, maxAge) và cân nặng (minWeight, maxWeight) phù hợp.
    8. Nếu là "Sách vở": Hãy tìm tên tác giả (bookAuthor) và thể loại (bookGenre) nếu có thể nhìn thấy trên bìa.

    Hãy trả về kết quả dưới dạng JSON chính xác 100%.`;

    const imagePart = { 
      inlineData: { 
        mimeType: "image/jpeg", 
        data: imageData.split(',')[1] || "" 
      } 
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [imagePart, { text: prompt }] },
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedTitle: { type: Type.STRING },
            category: { type: Type.STRING, description: "Phải thuộc danh sách CATEGORIES" },
            detailedDescription: { type: Type.STRING },
            condition: { type: Type.STRING, description: "'new' hoặc 'good'" },
            quantity: { type: Type.NUMBER },
            minAge: { type: Type.NUMBER },
            maxAge: { type: Type.NUMBER },
            minWeight: { type: Type.NUMBER },
            maxWeight: { type: Type.NUMBER },
            bookAuthor: { type: Type.STRING },
            bookGenre: { type: Type.STRING }
          },
          required: ["suggestedTitle", "category", "detailedDescription", "condition"]
        }
      }
    });

    const jsonText = response.text;
    return jsonText ? JSON.parse(jsonText.trim()) : null;
  } catch (error) {
    console.error("AI Vision Error:", error);
    return null;
  }
};

/**
 * generateMissionImage: Vẽ ảnh minh họa cho sứ mệnh Admin
 */
export const generateMissionImage = async (location: string, description: string) => {
  const ai = getAIInstance();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `A meaningful charity mission visualization in ${location}, Vietnam. Style: cinematic, warm, hopeful. ${description}. 16:9 aspect ratio.` }] },
      config: { imageConfig: { aspectRatio: "16:9" } },
    });
    
    const parts = response.candidates?.[0]?.content?.parts;
    const imagePart = parts?.find(p => p.inlineData);
    return (imagePart && imagePart.inlineData) ? `data:image/png;base64,${imagePart.inlineData.data}` : null;
  } catch (error) {
    console.error("AI Image Gen Error:", error);
    return null;
  }
};

/**
 * searchCharityLocations: Tìm kiếm địa điểm từ thiện bằng Maps Grounding
 */
export const searchCharityLocations = async (query: string, lat?: number, lng?: number) => {
  const ai = getAIInstance();
  if (!ai) return null;

  try {
    // Maps grounding chỉ hỗ trợ trên dòng Gemini 2.5
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
    
    const text = response.text || "Không tìm thấy kết quả.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return { text, sources: chunks };
  } catch (error) {
    console.error("AI Maps Error:", error);
    return null;
  }
};
