import { GoogleGenAI, Type } from "@google/genai";
import { ReShapeResult, UserPersona, RenderingStyle, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
  goals: string = ''
): Promise<ReShapeResult> => {
  if (!streetFile && !satelliteFile) throw new Error("At least one image is required.");

  const parts = [];
  if (streetFile) parts.push(await fileToPart(streetFile));
  if (satelliteFile) parts.push(await fileToPart(satelliteFile));

  // --- STEP 0: INPUT VALIDATION ---
  // We use a fast, specific prompt to ensure the user hasn't uploaded irrelevant images (documents, selfies, etc.)
  const validationPrompt = `
    You are an input validator for an urban planning AI application. 
    Analyze the provided images to ensure they meet the strict requirements for analysis.

    Requirements:
    1. Image 1 (The first image provided): MUST be a street-level photograph (eye-level perspective) of an urban or semi-urban environment (road, buildings, neighborhood, plaza). 
       - REJECT if it is a document, screenshot of text, selfie, indoor close-up, or abstract object.
    
    ${satelliteFile ? '2. Image 2 (The second image, if present): MUST be a top-down satellite view, aerial map, or site plan. REJECT if it is another street-level photo or unrelated image.' : ''}

    Return a JSON object with:
    - "isValid": boolean (true only if ALL requirements are met)
    - "reason": string (A short, friendly message explaining exactly what is wrong if isValid is false. E.g., "The first image appears to be a document, not a street view.")
  `;

  const validationResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        ...parts,
        { text: validationPrompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isValid: { type: Type.BOOLEAN },
          reason: { type: Type.STRING }
        }
      }
    }
  });

  const validationResult = JSON.parse(validationResponse.text || "{}");
  
  if (validationResult.isValid === false) {
    throw new Error(`VALIDATION_FAILED: ${validationResult.reason || "The images provided do not match the required format."}`);
  }

  // --- STEP 1: MAIN ANALYSIS ---

  const prompt = `
    You are **ReShape City AI**, a multimodal urban design and simulation assistant.

    CONTEXT:
    - User Persona: ${persona}
    - User Goals: ${goals || "General improvement"}

    You receive:
    - A REQUIRED street-level image of a street or neighborhood.
    - An OPTIONAL satellite / map image of the same area.
    - OPTIONAL text goals from the user.

    You must:
    1. **SPATIAL ANALYSIS (CRITICAL & MANDATORY)**: 
       - Analyze the street-level image to **ESTIMATE** the **approximate road width (in meters)**, number of existing lanes, and sidewalk width. 
       - You MUST populate the 'spatial_metrics' field in the JSON.
       - Use visual cues (lane markings (~3m), car width (~1.8m), pedestrians) to derive these numbers.
    
    2. Analyse the existing condition based on these EXACT spatial constraints.
    3. Propose multiple redesign levels (0, 25, 50, 75, 100).
    4. Estimate costs and feasibility.
    5. Simulate social and economic impact.
    6. Run a basic climate stress test.
    7. Evaluate accessibility.
    8. Suggest business opportunities.
    9. Provide an audio-style tour script.
    
    10. **GENERATE PROMPTS**: 
       - Create image generation prompts that **STRICTLY RESPECT** the estimated 'estimated_street_width_m' from step 1.
       - **Do not** propose interventions that physically cannot fit (e.g., do not ask for a 4-lane highway with wide bike lanes in a 6-meter narrow street).
       - Explicitly describe the perspective/camera angle to match the original image.

    All outputs MUST be returned as a single JSON object that strictly follows the schema structure provided in the system instructions.
    
    IMPORTANT GUIDELINES:
    - **Physical Reality Check**: If the street is narrow (e.g., < 8m), prioritize shared spaces (woonerf) rather than segregated bike lanes.
    - **Perspective Matching**: The 'image_generation_prompts' must explicitly describe the camera angle and perspective.
    - **Use the images heavily**: infer building types, traffic mix, greenery, sidewalks, etc.
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
          context: {
            type: Type.OBJECT,
            properties: {
              location_guess: { type: Type.STRING },
              user_goals: { type: Type.STRING }
            }
          },
          baseline_analysis: {
            type: Type.OBJECT,
            properties: {
              visual_summary: { type: Type.STRING },
              key_problems: { type: Type.ARRAY, items: { type: Type.STRING } },
              spatial_metrics: {
                type: Type.OBJECT,
                properties: {
                  estimated_street_width_m: { type: Type.NUMBER, description: "Total estimated Right of Way in meters" },
                  existing_lanes: { type: Type.NUMBER, description: "Number of vehicular lanes" },
                  sidewalk_width_m: { type: Type.NUMBER, description: "Average sidewalk width in meters" },
                }
              },
              baseline_metrics: {
                type: Type.OBJECT,
                properties: {
                  walkability_index: { type: Type.NUMBER },
                  green_cover_index: { type: Type.NUMBER },
                  traffic_stress_index: { type: Type.NUMBER },
                  public_space_index: { type: Type.NUMBER },
                  accessibility_index: { type: Type.NUMBER },
                  safety_index: { type: Type.NUMBER }
                }
              }
            }
          },
          redesign_levels: {
            type: Type.OBJECT,
            properties: {
              levels: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.NUMBER },
                    label: { type: Type.STRING },
                    description: { type: Type.STRING },
                    interventions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    metric_deltas: {
                      type: Type.OBJECT,
                      properties: {
                        walkability_index: { type: Type.NUMBER },
                        green_cover_index: { type: Type.NUMBER },
                        traffic_stress_index: { type: Type.NUMBER },
                        public_space_index: { type: Type.NUMBER },
                        accessibility_index: { type: Type.NUMBER },
                        safety_index: { type: Type.NUMBER }
                      }
                    }
                  }
                }
              }
            }
          },
          cost_and_feasibility: {
            type: Type.OBJECT,
            properties: {
              currency_hint: { type: Type.STRING },
              phases: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    applies_to_levels: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                    estimated_cost_range_in_crores: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                    duration_months: { type: Type.NUMBER },
                    feasibility_notes: { type: Type.STRING }
                  }
                }
              },
              feasibility_heatmap: {
                type: Type.OBJECT,
                properties: {
                  segments: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        segment_label: { type: Type.STRING },
                        difficulty: { type: Type.STRING, enum: ['easy', 'medium', 'hard'] },
                        reason: { type: Type.STRING }
                      }
                    }
                  }
                }
              }
            }
          },
          social_impact: {
            type: Type.OBJECT,
            properties: {
              target_level_id: { type: Type.NUMBER },
              summary: { type: Type.STRING },
              indicators: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    unit: { type: Type.STRING },
                    baseline: { type: Type.NUMBER },
                    after: { type: Type.NUMBER },
                    explanation: { type: Type.STRING }
                  }
                }
              }
            }
          },
          climate_stress_test: {
            type: Type.OBJECT,
            properties: {
              scenarios: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    baseline_behaviour: { type: Type.STRING },
                    redesigned_behaviour: { type: Type.STRING },
                    key_measures: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              }
            }
          },
          accessibility_analysis: {
            type: Type.OBJECT,
            properties: {
              baseline_issues: { type: Type.ARRAY, items: { type: Type.STRING } },
              redesign_measures: { type: Type.ARRAY, items: { type: Type.STRING } },
              accessibility_score_change: {
                type: Type.OBJECT,
                properties: {
                  baseline: { type: Type.NUMBER },
                  after: { type: Type.NUMBER }
                }
              }
            }
          },
          business_opportunities: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              opportunity_nodes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    recommended_use: { type: Type.STRING },
                    justification: { type: Type.STRING }
                  }
                }
              }
            }
          },
          audio_tour_script: {
            type: Type.OBJECT,
            properties: {
              duration_seconds: { type: Type.NUMBER },
              tone: { type: Type.STRING },
              script: { type: Type.STRING }
            }
          },
          image_generation_prompts: {
            type: Type.OBJECT,
            properties: {
              for_level_50: { type: Type.STRING },
              for_level_75: { type: Type.STRING },
              for_level_100: { type: Type.STRING }
            }
          }
        }
      }
    }
  });

  if (!response.text) throw new Error("Failed to generate analysis.");
  return JSON.parse(response.text) as ReShapeResult;
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
  analysisContext: ReShapeResult | null
): Promise<string> => {
  
  const contextStr = analysisContext ? JSON.stringify(analysisContext) : "No specific analysis context yet.";
  
  const systemInstruction = `
    You are **ReShape City AI**, an expert Urban Planner assistant. 
    You are chatting with a user about a specific urban design project.
    
    Current Project Context (JSON):
    ${contextStr}
    
    Answer the user's questions about the design levels, feasibility, social impact, or specific metrics.
    
    IMPORTANT CONSTRAINTS:
    - Keep answers VERY SHORT and concise (max 2-3 sentences).
    - Avoid long lists or detailed paragraphs unless explicitly requested.
    - Be helpful but direct.
  `;

  const contents = [
    { role: 'user', parts: [{ text: systemInstruction }] },
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