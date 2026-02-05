
import { GoogleGenAI } from "@google/genai";

// Note: In a real production app, the key should be handled more securely or via a proxy.
// Per instructions, we use process.env.API_KEY. 
// However, since this is a client-side app where the USER brings their key (or we prompt for it),
// we will instantiate this dynamically.

let genAI: GoogleGenAI | null = null;

export const initGemini = (apiKey: string) => {
  genAI = new GoogleGenAI({ apiKey });
};

export const generateLessonPlan = async (
  level: string,
  subject: string,
  topic: string
): Promise<string> => {
  if (!genAI) throw new Error("API Key not set");

  const prompt = `
    أنت مساعد تربوي وخبير في المناهج الموريتانية (المقاربة بالكفايات).
    قم بإعداد خطة درس مفصلة للصف: ${level}، المادة: ${subject}، الموضوع: ${topic}.
    
    يجب أن يكون الرد بصيغة JSON فقط بهذه الهيكلة:
    {
      "title": "عنوان الدرس",
      "duration": "المدة الزمنية",
      "objectives": ["هدف 1", "هدف 2"],
      "situation": "الوضعية الانطلاقية",
      "phases": [
        { "name": "اسم المرحلة", "activity": "نشاط المعلم والمتعلم", "duration": "مدة المرحلة" }
      ],
      "evaluation": "التقويم"
    }
  `;

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    return response.text || "{}";
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

export const analyzeStudentPerformance = async (
  studentName: string,
  grades: { subject: string; score: number; total: number }[],
  attendanceRate: number,
  strengths: string[] = [],
  weaknesses: string[] = []
): Promise<string> => {
  if (!genAI) return "التحليل الذكي غير مفعل (مفتاح API مفقود)";

  const prompt = `
    بصفتك مستشاراً تربويًا خبيرًا، قم بإجراء تحليل معمق لأداء التلميذ: "${studentName}".
    
    البيانات المتوفرة:
    - نسبة الحضور: ${attendanceRate}%
    - نقاط القوة المرصودة: ${strengths.length > 0 ? strengths.join('، ') : 'لا توجد نقاط بارزة'}
    - نقاط الضعف المرصودة: ${weaknesses.length > 0 ? weaknesses.join('، ') : 'لا توجد نقاط ضعف حرجة'}
    - تفاصيل الدرجات: ${JSON.stringify(grades)}
    
    المطلوب تقديم تقرير تربوي موجه للمعلم يتضمن:
    1. **تشخيص دقيق:** تحليل العلاقة بين الحضور والنتائج والمستوى العام.
    2. **خطة علاجية (لنقاط الضعف):** اقترح نشاطين محددين يمكن للمعلم القيام بهما داخل الفصل لمعالجة المواد التي يعاني فيها التلميذ.
    3. **خطة إثرائية (لنقاط القوة):** كيف يمكن استثمار تفوقه في المواد القوية (مثل جعله رئيساً لمجموعة أو تكليفه بمشاريع).
    4. **توصية نفسية/سلوكية:** نصيحة قصيرة للتعامل مع شخصية التلميذ بناءً على أدائه.

    *ملاحظة: اجعل الرد باللغة العربية، مباشراً، ومنظماً في فقرات قصيرة أو نقاط واضحة.*
  `;

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview', // Faster for text analysis
      contents: prompt,
    });
    return response.text || "لا يمكن إجراء التحليل حالياً.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.";
  }
};
