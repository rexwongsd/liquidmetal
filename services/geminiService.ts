
import { GoogleGenAI, Type } from "@google/genai";
import { HackathonIdea } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const hackathonIdeaSchema = {
    type: Type.OBJECT,
    properties: {
        title: {
            type: Type.STRING,
            description: "A catchy and descriptive project title."
        },
        description: {
            type: Type.STRING,
            description: "A one-paragraph summary of the project idea."
        },
        category: {
            type: Type.STRING,
            description: "The category of the project.",
            enum: ['Productivity Tool', 'Creative Assistant', 'Voice Agent', 'Delightfully Weird', 'Data Visualization', 'Developer Tool']
        },
        techStack: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING,
                description: "A technology or service in the stack."
            },
            description: "A list of suggested technologies, including required hackathon platforms."
        },
        justification: {
            type: Type.STRING,
            description: "An explanation of how this idea meets the hackathon's core requirements."
        }
    },
    required: ["title", "description", "category", "techStack", "justification"]
};

export const generateIdeas = async (hackathonRules: string): Promise<HackathonIdea[]> => {
    const prompt = `
You are an expert AI Hackathon Mentor. Your goal is to generate innovative, useful, or delightfully weird project ideas based on a given set of hackathon rules.

The user has provided the following hackathon description:
---
${hackathonRules}
---

Based on these rules, generate 3 distinct and creative project ideas. For each idea, you must provide:
1.  A catchy project title.
2.  A one-paragraph description of the project.
3.  A "Category" from the available enum options.
4.  A suggested "Tech Stack", which MUST include the core requirements mentioned in the rules (e.g., LiquidMetal AI Raindrop Platform, Vultr). You can add other relevant technologies from the partners list or general web technologies.
5.  A "Justification" explaining exactly how the project meets the core requirements of the hackathon.

Return the output as a JSON object that matches the provided schema. The root of the JSON should be an array of these idea objects.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: hackathonIdeaSchema
                }
            },
        });
        
        const jsonText = response.text.trim();
        const ideas: HackathonIdea[] = JSON.parse(jsonText);
        return ideas;

    } catch (error) {
        console.error("Error generating ideas with Gemini:", error);
        throw new Error("Failed to generate ideas. Please check the console for more details.");
    }
};
