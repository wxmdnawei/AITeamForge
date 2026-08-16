
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GeneratedTeamMetadata, Team, TaskItem, TeamAnalysis, Participant } from "../types";

// Robust UUID Generator (replaces 'uuid' library to prevent load errors)
export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback if crypto.randomUUID fails (e.g. insecure context)
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

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

// Event Presets for Random Initialization
const EVENT_PRESETS = [
  { name: "AI Code Challenge", theme: "Assemble your squad for the AI coding challenge." },
  { name: "Cyberpunk Night", theme: "High tech, low life, neon dreams." },
  { name: "Neural Nexus 2024", theme: "Connecting minds and machines." },
  { name: "Code & Coffee Jam", theme: "Caffeine fueled innovation sprint." },
  { name: "Future Stack Summit", theme: "Building tomorrow's tools, today." },
  { name: "Offline Match", theme: "Find your perfect coding soulmate." },
  { name: "Deep Dive Hackathon", theme: "Exploring the depths of Generative AI." },
  { name: "Pixel Perfect Bash", theme: "Where design meets algorithm." },
  { name: "Quantum Leap Quest", theme: "Solving problems before they exist." },
  { name: "Midnight Makers", theme: "Building while the world sleeps." }
];

export const getRandomEventPreset = () => {
  return EVENT_PRESETS[Math.floor(Math.random() * EVENT_PRESETS.length)];
};

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
  // 1. Remove Markdown code blocks
  let clean = text.replace(/```json\n?|```/g, '').trim();
  
  // 2. Attempt to find JSON structure if there's conversational text
  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');
  
  if (firstBrace === -1 && firstBracket === -1) return clean;
  
  const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) 
    ? firstBrace 
    : firstBracket;
    
  const lastBrace = clean.lastIndexOf('}');
  const lastBracket = clean.lastIndexOf(']');
  
  const end = Math.max(lastBrace, lastBracket);
  
  if (end > start) {
    clean = clean.substring(start, end + 1);
  }
  
  return clean;
};

export const enrichTeamsWithGemini = async (
  teams: Team[],
  eventName: string = 'AI Code Challenge',
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

    // Streamlined payload to reduce request size
    const teamsPayload = teams.map(t => ({
      id: t.id,
      names: t.members.map(m => m.name),
      topic: t.topic, // Pass existing topic if any
      topicZh: t.topicZh
    }));

    const systemInstruction = `You are an Event Organizer Bot for '${eventName}' (${eventTheme}).
    Generate creative, cool, and relevant team identities for the provided teams.
    
    RULES:
    1. If a team has 'topic' in input, you MUST use it. Do NOT change it. Use it to inspire the team name.
    2. If 'topic' is missing, generate a unique, specific project task relevant to '${eventTheme}'.
       - Example: "AI Trash Sorter" (Specific) vs "Environment" (Too broad).
    3. Output fields: name, nameZh, motto, mottoZh, icebreaker, icebreakerZh, mascotEmoji, topic, topicZh.
    4. Return pure JSON array matching the schema.`;

    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Process these teams: ${JSON.stringify(teamsPayload)}`,
        config: {
          systemInstruction: systemInstruction,
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

      const cleanText = cleanJson(response.text || '[]');
      const generatedData = JSON.parse(cleanText) as GeneratedTeamMetadata[];

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
    // Fallback logic
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
      return JSON.parse(cleanJson(response.text || '[]'));
    });
  } catch (e) { return []; }
};

export const generateTaskLibrarySuggestions = async (eventName: string, eventTheme: string): Promise<TaskItem[]> => {
  if (!apiKey) return [];
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    return await withRetry(async () => {
      // Use application/json responseMimeType for robust parsing
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Generate 5 specific, creative, and distinct project tasks or challenges for an event named "${eventName}" with theme "${eventTheme}".
        The tasks MUST be specifically relevant to the theme "${eventTheme}".
        
        Return ONLY a JSON array of objects with the following keys:
        - title: The task title in English.
        - titleZh: The task title in Chinese.
        
        Example output:
        [
          { "title": "AI Trash Sorter", "titleZh": "AI 垃圾分类器" }
        ]`,
        config: {
            responseMimeType: "application/json"
        }
      });

      const cleanText = cleanJson(response.text || '[]');
      const raw = JSON.parse(cleanText);
      
      if (!Array.isArray(raw)) return [];

      return raw.map((r: any) => ({ 
        id: generateUUID(), 
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

export const generateSingleTeamAnnouncement = async (team: Team, eventName: string): Promise<string | undefined> => {
  if (!apiKey) return undefined;
  try {
    const ai = new GoogleGenAI({ apiKey });
    let script = `Attention please! Introducing: ${team.name}. 请注意！接下来介绍：${team.nameZh || team.name}. \n\n`;
    script += `Motto: "${team.motto}". 口号："${team.mottoZh || ''}". \n`;
    if (team.topic) script += `Assigned Mission: ${team.topic}. 任务：${team.topicZh || ''}. \n`;
    
    const memberNames = team.members.map(m => m.name).join(", ");
    script += `Operatives 成员: ${memberNames}. \n`;
    
    script += `Your mission, should you choose to accept it: Answer this doubt. ${team.icebreaker}. 思考题：${team.icebreakerZh || ''}. \n`;
    script += `Good luck, agents!`;
    
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

export const generateTeamPoster = async (team: Team, eventName: string, eventTheme: string): Promise<string | undefined> => {
  if (!apiKey) return undefined;
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // We strictly request a BACKGROUND image because we will overlay accurate text in the UI.
    const prompt = `Design a high-quality, artistic, text-free background art for a promotional poster.
    
    Team Name Identity: "${team.name}" (${team.nameZh || ''}).
    Mascot Concept: ${team.mascotEmoji}.
    Context: ${eventName} - ${eventTheme}.
    
    Visual Requirements:
    1. Style: Cyberpunk, Futuristic, Clean Tech, or Minimalist (matching the team name).
    2. Composition: Center the main artistic element (mascot/symbol). Leave negative space at the top for a large title and at the bottom corners for text details.
    3. Lighting: Dramatic, cinematic.
    4. IMPORTANT: DO NOT include any text, letters, or numbers in the image itself. It should be pure visual art.
    `;

    const response = await withRetry(async () => {
        return await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
        });
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    return undefined;
  } catch (e) {
    console.error("Poster gen error", e);
    return undefined;
  }
};

export const generateTeamAvatar = async (team: Team, eventName: string, eventTheme: string): Promise<string | undefined> => {
  if (!apiKey) return undefined;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Design a high-quality, distinctive team avatar icon.
    Team Name: "${team.name}" (${team.nameZh || ''}).
    Event Theme: "${eventTheme}".
    Style: 3D Render, colorful, icon-style, minimalist background. 
    Subject: A central character or object representing the team name '${team.name}'.
    IMPORTANT: NO TEXT. NO WORDS. Just the visual symbol.`;

    const response = await withRetry(async () => {
        return await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
        });
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    return undefined;
  } catch (e) {
    console.error("Avatar gen error", e);
    return undefined;
  }
};

export const analyzeTeamStrength = async (team: Team, eventName: string, eventTheme: string): Promise<TeamAnalysis | null> => {
  if (!apiKey) return null;
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const analysisPrompt = `
      Act as an expert AI Hackathon Judge and HR Specialist.
      Analyze the following team for the event: "${eventName}" (Theme: "${eventTheme}").
      
      Team Name: ${team.name}
      Motto: ${team.motto}
      Assigned Task: ${team.topic || 'General Participation'}
      Members: ${team.members.map(m => m.name).join(', ')}
      
      Evaluate their "Win Rate" (Success Probability) based on the synergy of their identity, the relevance of their task to the theme, and the implicit diversity of the team composition. Use scientific algorithmic reasoning to determine the scores.
      
      Score them (0-100) on these dimensions:
      1. Innovation (Is the task/identity creative?)
      2. Technical (How difficult/feasible is the task?)
      3. Chemistry (Do the names/vibes suggest good teamwork? - be creative/optimistic)
      4. Presentation (How cool is their branding?)
      
      Provide a brief 1-sentence comment and 2 short suggestions for improvement.
    `;

    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview", // Using Pro for complex reasoning and analysis
        contents: analysisPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              winRate: { type: Type.INTEGER, description: "Success probability 0-100" },
              overallScore: { type: Type.INTEGER, description: "Total score 0-100" },
              dimensions: {
                type: Type.OBJECT,
                properties: {
                  innovation: { type: Type.INTEGER },
                  technical: { type: Type.INTEGER },
                  chemistry: { type: Type.INTEGER },
                  presentation: { type: Type.INTEGER },
                },
                required: ["innovation", "technical", "chemistry", "presentation"]
              },
              comment: { type: Type.STRING },
              suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["winRate", "overallScore", "dimensions", "comment", "suggestions"]
          }
        }
      });
      return JSON.parse(cleanJson(response.text || 'null')) as TeamAnalysis;
    });
  } catch (e) {
    console.error("Analysis error", e);
    return null;
  }
};

export const evaluateParticipant = async (participant: Participant, eventTheme: string, teamTask?: string): Promise<Participant['evaluation'] | null> => {
  if (!apiKey || !participant.bio) return null;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const taskContext = teamTask ? `Assigned Team Task: "${teamTask}"` : "";
    
    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash", // Switch to Flash for robust response handling
        contents: `Act as a Technical Recruiter and Project Manager.
        Event Theme: "${eventTheme}".
        ${taskContext}
        
        Evaluate this participant based on their profile:
        Name: ${participant.name}
        Profile/Resume: "${participant.bio}"
        
        Calculate a "Quality Score" (0-100) representing their fit for this event/task.
        Provide a 1-sentence reason and list 3 key skill tags extracted from their bio.
        
        Return strict JSON format.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER },
              reason: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["score", "reason", "tags"]
          }
        }
      });
      
      const cleanText = cleanJson(response.text || '{}');
      return JSON.parse(cleanText);
    });
  } catch (e) {
    console.error("Member evaluation error", e);
    return null;
  }
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
