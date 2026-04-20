import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(cors());
app.use(express.json());

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post("/api/analyze", async (req, res) => {
  try {
    const { query, userEmotions = [], mode = "combined" } = req.body;

    if (!query && userEmotions.length === 0) {
      return res.status(400).json({ error: "query or userEmotions required" });
    }

    let promptInstruction = "";
    if (mode === "feelings") {
      promptInstruction = `The user describes feelings about a track: ${userEmotions.join(", ")}.`;
    } else if (mode === "ai") {
      promptInstruction = `Analyze the mood, atmosphere, and emotions of the anime/game OST or track: "${query}". Use only your knowledge of its musical and thematic qualities.`;
    } else {
      const emotionPart =
        userEmotions.length > 0
          ? ` The user also describes these feelings: ${userEmotions.join(", ")}.`
          : "";
      promptInstruction = `Analyze the mood, atmosphere, and emotions of the anime/game OST or track: "${query}".${emotionPart} Combine both the track's qualities and the user's feelings.`;
    }

    const systemPrompt = `You are a creative visual artist and synesthete who translates music emotions into vivid imagery.

${promptInstruction}

Return a JSON array of exactly 5 strings. Each string is a standalone, vivid image generation prompt — rich with visual detail, color palette, atmosphere, lighting, and mood. No numbering, no labels, no explanation. Output only valid JSON like: ["prompt1","prompt2","prompt3","prompt4","prompt5"]`;

    const result = await genai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
      config: { responseMimeType: "application/json" },
    });

    const text = result.text ?? "";
    let prompts;
    try {
      prompts = JSON.parse(text);
      if (!Array.isArray(prompts)) throw new Error("Not an array");
      prompts = prompts.slice(0, 5).map(String);
    } catch {
      prompts = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .slice(0, 5);
    }

    res.json({ prompts });
  } catch (err) {
    console.error("Error in /api/analyze:", err);
    res.status(500).json({ error: err.message || "Failed to analyze" });
  }
});

app.post("/api/generate", async (req, res) => {
  try {
    const { prompts = [] } = req.body;

    if (!prompts.length) {
      return res.status(400).json({ error: "prompts array required" });
    }

    const imageResults = await Promise.all(
      prompts.map(async (prompt) => {
        const response = await genai.models.generateImages({
          model: "imagen-3.0-generate-001",
          prompt,
          config: { numberOfImages: 1, outputMimeType: "image/jpeg" },
        });
        const bytes = response.generatedImages?.[0]?.image?.imageBytes;
        return bytes ?? null;
      })
    );

    const images = imageResults.filter(Boolean);
    res.json({ images });
  } catch (err) {
    console.error("Error in /api/generate:", err);
    res.status(500).json({ error: err.message || "Failed to generate images" });
  }
});

const PORT = process.env.BACKEND_PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend server running on port ${PORT}`);
});
