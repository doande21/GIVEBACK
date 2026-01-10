
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = "Bạn là trợ lý AI thông minh của dự án GIVEBACK. Dự án này giúp mọi người tặng đồ cũ và quyên góp từ thiện. Hãy trả lời thân thiện, nhiệt tình và bằng tiếng Việt.";

export const getAIAssistance = async (prompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });
    return response.text || "Xin lỗi, tôi không thể tìm thấy câu trả lời.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Xin lỗi, tôi gặp chút trục trặc khi kết nối với bộ não AI.";
  }
};

export const suggestDescription = async (itemName: string, category: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Hãy viết một đoạn mô tả ngắn gọn, chân thành và thu hút (khoảng 30-50 từ) cho một món đồ quyên góp là '${itemName}' thuộc danh mục '${category}'. Nhấn mạnh vào giá trị món đồ có thể mang lại cho người nhận.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return "";
  }
};

/**
 * Tính năng AI Vision: Phân tích hình ảnh để trích xuất thông tin món đồ
 */
export const analyzeItemImage = async (base64Data: string, mimeType: string) => {
  try {
    const prompt = `Hãy phân tích hình ảnh món đồ này để đăng tin tặng đồ trên GIVEBACK. 
    Trả về dữ liệu dưới dạng JSON bao gồm:
    - title: Tên món đồ ngắn gọn (Vd: Nồi cơm điện Sharp).
    - category: Một trong các loại: 'Quần áo', 'Đồ gia dụng', 'Sách vở', 'Điện tử', 'Đồ chơi', 'Khác'.
    - condition: Một trong các giá trị: 'new', 'good', 'used'.
    - description: Một đoạn mô tả chân thành, thu hút (30-50 từ) bằng tiếng Việt.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            data: base64Data.split(',')[1], // Lấy phần base64 thực sự
            mimeType: mimeType,
          },
        },
        { text: prompt },
      ],
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
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    return null;
  }
};
