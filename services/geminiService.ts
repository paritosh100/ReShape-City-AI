import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, UserPersona, DesignFocus, RenderingStyle, ChatMessage } from "../types";

const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

// Helper to convert File to Base64
const fileToPart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeUrbanImages = async (
  streetFile: File | null, 
  satelliteFile: File | null,
  persona: UserPersona = 'General Planner',
  focus: DesignFocus = 'Balanced'
): Promise<AnalysisResult> => {
  if (!streetFile && !satelliteFile) throw new Error("At least one image is required.");

  const parts = [];
  if (streetFile) parts.push(await fileToPart(streetFile));
  if (satelliteFile) parts.push(await fileToPart(satelliteFile));

  const prompt = `
    You are "Urban Planner AI," a multimodal city-design expert.
    
    CRITICAL CONTEXT:
    - You are analyzing this space from the perspective of: **${persona}**.
    - Your design priority/focus is: **${focus}**.

    Analyze the provided images (Street View and/or Satellite View) to produce a professional urban planning dashboard report.
    
    IMPORTANT: Pay close attention to the visible road width and total available area. 
    - Estimate the road width (e.g., "approx 6m", "approx 12m").
    - Your Redesign Plan must be realistic for this specific width. 
    - If the area is narrow, focus on shared spaces, vertical greenery, and pedestrian safety.
    
    INCLUSIVITY INSTRUCTION:
    - Because you are acting as a "${persona}", highlight problems specific to this group.
    - Ensure the redesign specifically addresses these needs.

    Return the response in a structured JSON format matching the schema provided.
    
    1. Analyze existing conditions (traffic, safety, green coverage, density, building massing). Include the estimated road width in the "streetLevel" analysis list.
    2. Identify 4-8 specific urban design problems, with at least 2 specific to the "${persona}" perspective.
    3. Propose a redesign plan (new land-use, heights, green corridors, pedestrian-first) that respects the physical constraints and achieves the goal of "${focus}".
    4. Estimate planning metrics (Before vs After for Floor Area and Open Space) based on visual estimation.
    5. Estimate benefits (percentage changes).
    6. SOLAR ANALYSIS:
       - Based on shadows or satellite view, estimate general sun exposure and suggest a shade strategy.
    7. Create a high-quality text-to-image prompt to generate a realistic "After" visualization.
       - The prompt must explicitly describe the scene as having "${focus}" elements.
       - Mention people in the scene matching the persona.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        ...parts,
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          beforeAnalysis: {
            type: Type.OBJECT,
            properties: {
              streetLevel: { type: Type.ARRAY, items: { type: Type.STRING } },
              satellite: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          identifiedProblems: { type: Type.ARRAY, items: { type: Type.STRING } },
          redesignPlan: {
            type: Type.OBJECT,
            properties: {
              concept: { type: Type.STRING },
              interventions: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          metrics: {
            type: Type.OBJECT,
            properties: {
              floorArea: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  before: { type: Type.NUMBER },
                  after: { type: Type.NUMBER },
                  unit: { type: Type.STRING }
                }
              },
              openSpace: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  before: { type: Type.NUMBER },
                  after: { type: Type.NUMBER },
                  unit: { type: Type.STRING }
                }
              },
              solar: {
                type: Type.OBJECT,
                properties: {
                  sunExposure: { type: Type.STRING, enum: ['High', 'Moderate', 'Low'] },
                  shadeStrategy: { type: Type.STRING }
                }
              },
              benefits: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    value: { type: Type.NUMBER },
                    type: { type: Type.STRING, enum: ['increase', 'decrease'] }
                  }
                }
              }
            }
          },
          imageGenerationPrompt: { type: Type.STRING }
        }
      }
    }
  });

  if (!response.text) throw new Error("Failed to generate analysis.");
  return JSON.parse(response.text) as AnalysisResult;
};

export const generateRedesignVisualization = async (
  basePrompt: string, 
  refImageFile: File | null,
  style: RenderingStyle = 'Photorealistic'
): Promise<string> => {
  
  let stylePrefix = "";
  switch (style) {
    case 'Watercolor Sketch':
      stylePrefix = "A loose, artistic watercolor architectural sketch of ";
      break;
    case 'Blueprint/Schematic':
      stylePrefix = "A technical architectural blueprint overlay style, detailed line drawing of ";
      break;
    case 'Futuristic':
      stylePrefix = "A futuristic, sci-fi cyberpunk urban concept art of ";
      break;
    case 'Photorealistic':
    default:
      stylePrefix = "A highly detailed, photorealistic 8k image of ";
      break;
  }

  const finalPrompt = `${stylePrefix} ${basePrompt}. Maintain the perspective of the original image. High quality, professional urban design rendering.`;

  const parts: any[] = [{ text: finalPrompt }];

  if (refImageFile) {
    const refImagePart = await fileToPart(refImageFile);
    parts.unshift(refImagePart);
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: parts
    },
  });

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) throw new Error("No image generated.");

  for (const part of candidates[0].content.parts) {
    if (part.inlineData && part.inlineData.data) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image data found in response.");
};

export const chatWithUrbanPlanner = async (
  history: ChatMessage[],
  newMessage: string,
  analysisContext: AnalysisResult | null
): Promise<string> => {
  
  // Construct a text-only context from the analysis to save tokens/complexity, 
  // or we could pass the full JSON string.
  const contextStr = analysisContext ? JSON.stringify(analysisContext) : "No specific analysis context yet.";
  
  const systemInstruction = `
    You are an expert Urban Planner assistant. 
    You are chatting with a user about a specific urban design project.
    
    Current Project Context (JSON):
    ${contextStr}
    
    Answer the user's questions about the design, feasibility, or specific details.
    Be helpful, professional, and concise. 
    If the user asks for a change, explain how it might impact the metrics (floor area, open space, etc.).
  `;

  const contents = [
    { role: 'user', parts: [{ text: systemInstruction }] }, // System context as first user message for simple chat model usage
    ...history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    })),
    { role: 'user', parts: [{ text: newMessage }] }
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: contents
  });

  return response.text || "I couldn't generate a response.";
};