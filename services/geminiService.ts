import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GeneratedTeamMetadata, Team, TaskItem } from "../types";
import { v4 as uuidv4 } from 'uuid';

// Safely access process.env to avoid "Uncaught ReferenceError: process is not defined"
const getApiKey = () => {
  try {
    // 1. Check global process if defined
    if (typeof process !== 'undefined' && process.env?.API_KEY) {
      return process.env.API_KEY;
    }
    // 2. Check window.process
    if (typeof window !== 'undefined' && (window as any).process?.env?.API_KEY) {
      return (window as any).process.env.API_KEY;
    }
  } catch (e) {
    // Ignore errors
  }
  return '';
};

const apiKey = getApiKey() || '';

// Fallback data
const FALLBACK_PREFIXES = ["Cyber", "Quantum", "Neural", "Deep", "Rapid", "Turbo", "Pixel", "Logic"];
const FALLBACK_SUFFIXES = ["Coders", "Ninjas", "Agents", "Synapse", "Fusion", "Dreamers", "Hackers", "Wizards"];
const FALLBACK_MOTTO = "Code hard, sleep later.";
const FALLBACK_MOTTO_ZH = "代码不息，奋斗不止。";
const FALLBACK_ICEBREAKER = "What is your favorite programming language and why?";
const FALLBACK_ICEBREAKER_ZH = "你最喜欢的编程语言是什么？为什么？";
const FALLBACK_TOPIC = "Build a Personal Task Manager";
const FALLBACK_TOPIC_ZH = "开发一个个人任务管理工具";

const getRandomElement = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

// Helper: Retry Logic with Exponential Backoff
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    console.warn(`API Call failed. Retrying in ${delay}ms...`, err);
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

// Helper: Clean JSON Markdown
const cleanJson = (text: string) => {
  return text.replace(/```json\n?|\n?```/g, '').trim();
};

export const enrichTeamsWithGemini = async (
  teams: Team[],
  eventName: string = 'Trae AI Challenge',
  eventTheme: string = 'AI coding hackathon'
): Promise<Team[]> => {
  if (!apiKey) {
    console.warn("No API Key provided. Using fallback offline generator.");
    return teams.map(t => ({
      ...t,
      name: `${getRandomElement(FALLBACK_PREFIXES)} ${getRandomElement(FALLBACK_SUFFIXES)}`,
      nameZh: "AI 极客小队", 
      motto: FALLBACK_MOTTO,
      mottoZh: FALLBACK_MOTTO_ZH,
      icebreaker: FALLBACK_ICEBREAKER,
      icebreakerZh: FALLBACK_ICEBREAKER_ZH,
      mascotEmoji: "🤖",
      topic: t.topic || FALLBACK_TOPIC, // Keep existing topic if available
      topicZh: t.topicZh || FALLBACK_TOPIC_ZH
    }));
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // We include existing topics in the payload so Gemini knows about them
    const teamsPayload = teams.map(t => ({
      id: t.id,
      memberCount: t.members.length,
      memberNames: t.members.map(m => m.name),
      existingTopic: t.topic, // Pass existing topic
      existingTopicZh: t.topicZh
    }));

    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `I have organized an event called '${eventName}'. 
        The theme or context of the event is: '${eventTheme}'.
        I have divided participants into the following teams: ${JSON.stringify(teamsPayload)}.
        
        For EACH team, I need you to generate a creative, cool, and relevant identity based on the event theme in BOTH English and Chinese.
        
        IMPORTANT RULES:
        1. If a team already has an 'existingTopic' provided in the input, you MUST use that topic for their 'topic' and 'topicZh' fields. Do NOT change it. Use that topic to inspire the team name and motto.
        2. If 'existingTopic' is missing, you MUST generate a unique, specific, and creative project task/challenge for 'topic' and 'topicZh'.
           - The generated task MUST be deeply relevant to the event theme: "${eventTheme}".
           - It should be a concrete project idea (e.g., "AI-powered Trash Sorter" instead of just "Environment").
           - Ensure the Chinese translation 'topicZh' is natural and accurate.
        
        Fields required:
        1. name: A cool team name.
        2. nameZh: Chinese team name.
        3. motto: English motto.
        4. mottoZh: Chinese motto.
        5. icebreaker: Fun question for teammates.
        6. icebreakerZh: Chinese icebreaker.
        7. mascotEmoji: Single emoji.
        8. topic: The project challenge/task.
        9. topicZh: Chinese topic.
        
        Return the data as a JSON array matching the schema.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                nameZh: { type: Type.STRING },
                motto: { type: Type.STRING },
                mottoZh: { type: Type.STRING },
                icebreaker: { type: Type.STRING },
                icebreakerZh: { type: Type.STRING },
                mascotEmoji: { type: Type.STRING },
                topic: { type: Type.STRING },
                topicZh: { type: Type.STRING }
              },
              required: ["id", "name", "nameZh", "motto", "mottoZh", "icebreaker", "icebreakerZh", "mascotEmoji", "topic", "topicZh"]
            }
          }
        }
      });

      const generatedData = JSON.parse(response.text || '[]') as GeneratedTeamMetadata[];

      // Merge generated data back into the original teams
      return teams.map(originalTeam => {
        const metadata = generatedData.find(g => g.id === originalTeam.id);
        if (metadata) {
          return {
            ...originalTeam,
            name: metadata.name,
            nameZh: metadata.nameZh,
            motto: metadata.motto,
            mottoZh: metadata.mottoZh,
            icebreaker: metadata.icebreaker,
            icebreakerZh: metadata.icebreakerZh,
            mascotEmoji: metadata.mascotEmoji,
            topic: metadata.topic,
            topicZh: metadata.topicZh
          };
        }
        return originalTeam;
      });
    });

  } catch (error) {
    console.error("Gemini API Error (enrichTeams):", error);
    return teams.map(t => ({
      ...t,
      name: `Team ${t.id.slice(0, 4)}`,
      nameZh: `队伍 ${t.id.slice(0, 4)}`,
      motto: "Ready to start!",
      mottoZh: "准备开始！",
      icebreaker: "How are you feeling?",
      icebreakerZh: "感觉如何？",
      mascotEmoji: "⚡",
      topic: t.topic || FALLBACK_TOPIC,
      topicZh: t.topicZh || FALLBACK_TOPIC_ZH
    }));
  }
};

export const generateThemeSuggestions = async (eventName: string): Promise<string[]> => {
  if (!apiKey) return ["Codeathon", "Hackathon", "Networking Night", "Workshop"];
  try {
    const ai = new GoogleGenAI({ apiKey });
    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Generate 5 creative event themes for "${eventName}". Return JSON array of strings.`,
        config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
      });
      return JSON.parse(response.text || '[]');
    });
  } catch (e) { return []; }
};

export const generateTaskLibrarySuggestions = async (eventName: string, eventTheme: string): Promise<TaskItem[]> => {
  if (!apiKey) return [];
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    return await withRetry(async () => {
      // Using raw text generation with JSON prompt is often more robust against "xhr error" 500s 
      // than strict schema validation for simple lists.
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Generate 5 specific, creative, and distinct project tasks or challenges for an event named "${eventName}" with theme "${eventTheme}".
        The tasks MUST be specifically relevant to the theme "${eventTheme}".
        
        Return ONLY a JSON array of objects with the following keys:
        - title: The task title in English.
        - titleZh: The task title in Chinese.
        
        Do not include any other text.
        Example output:
        [
          { "title": "AI Trash Sorter", "titleZh": "AI 垃圾分类器" }
        ]`,
      });

      const cleanText = cleanJson(response.text || '[]');
      const raw = JSON.parse(cleanText);
      
      if (!Array.isArray(raw)) return [];

      return raw.map((r: any) => ({ 
        id: uuidv4(), 
        title: r.title || "New Task", 
        titleZh: r.titleZh || r.title || "新任务" 
      }));
    });

  } catch (e) { 
    console.error("Task gen error", e);
    return []; 
  }
};

export const generateTeamAnnouncement = async (teams: Team[], eventName: string): Promise<string | undefined> => {
  if (!apiKey) return undefined;
  try {
    const ai = new GoogleGenAI({ apiKey });
    let script = `Ladies and gentlemen, welcome to ${eventName}! 各位来宾，欢迎来到 ${eventName}！\n\n`;
    teams.forEach((team, index) => {
      script += `Team ${index + 1}: ${team.name}. ${team.nameZh || ''}. \n`;
      const memberNames = team.members.map(m => m.name).join(", ");
      script += `Members 成员: ${memberNames}. \n`;
      script += `Motto: ${team.motto}. 口号：${team.mottoZh || ''}. \n`;
      if (team.topic) script += `Task: ${team.topic}. 任务：${team.topicZh || ''}. \n`;
      script += `Answer this doubt: ${team.icebreaker}. 思考题：${team.icebreakerZh || ''}. \n\n`;
    });
    script += "Good luck! 祝大家好运！";
    
    return await withRetry(async () => {
        const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: script }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } } },
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    });
  } catch (error) { return undefined; }
};

export const generateAIChatResponse = async (history: any[], eventName: string, eventTheme: string, channelName: string): Promise<string> => {
  if (!apiKey) return "";
  try {
    const ai = new GoogleGenAI({ apiKey });
    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `AI Host for "${eventName}" (${eventTheme}). Channel: ${channelName}. Last msg from ${history[history.length-1]?.sender}. Respond strictly in <30 words. Bilingual if needed.`,
      });
      return response.text || "";
    });
  } catch (e) { return ""; }
};

export const generateAIProactiveMessage = async (eventName: string, eventTheme: string): Promise<string> => {
  if (!apiKey) return "";
  try {
    const ai = new GoogleGenAI({ apiKey });
    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `AI Host for "${eventName}" (${eventTheme}). Room quiet. Generate 1 short engaging fun fact/question (<25 words).`,
      });
      return response.text || "";
    });
  } catch (e) { return ""; }
};