import { GoogleGenAI, Type } from "@google/genai";
import { RemoteKey, GeminiCommandResult } from "../types";

// Initialize Gemini
// Note: In a real production app, ensure your API key is secure.
// This demo assumes process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTION = `
You are a smart TV assistant. Your job is to map natural language requests to a specific TV remote control button.
The available buttons are: Power, VolumeUp, VolumeDown, Mute, ChannelUp, ChannelDown, Up, Down, Left, Right, Select, Back, Home, Info, Netflix, YouTube.

If the user request implies repeated action (e.g., "turn it up a lot"), set the 'repeat' field to a number between 1 and 10. Default is 1.
If the request is ambiguous or not supported, return null for action.
`;

export const interpretCommand = async (userInput: string): Promise<GeminiCommandResult> => {
  if (!process.env.API_KEY) {
    console.warn("Gemini API Key missing. Returning null command.");
    return { action: null };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userInput,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              enum: Object.values(RemoteKey),
              description: "The remote key to press."
            },
            repeat: {
              type: Type.NUMBER,
              description: "How many times to press the key."
            }
          },
          required: ["action"]
        }
      }
    });

    const text = response.text;
    if (!text) return { action: null };

    const result = JSON.parse(text) as GeminiCommandResult;
    return result;

  } catch (error) {
    console.error("Gemini interpretation failed:", error);
    return { action: null };
  }
};
