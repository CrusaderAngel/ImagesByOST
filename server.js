import "dotenv/config";
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post("/api/analyze", async (req, res) => {
  try {
    const { query, userEmotions = [], mode = "combined" } = req.body;

    if (!query && userEmotions.length === 0) {
      return res.status(400).json({ error: "query or userEmotions required" });
    }

    let promptInstruction = "";
    if (mode === "feelings") {
      promptInstruction = `The user describes feelings: ${userEmotions.join(", ")}.`;
    } else if (mode === "ai") {
      promptInstruction = `Analyze the OST/track: "${query}". Use only your knowledge of its musical qualities.`;
    } else {
      const emotionPart =
        userEmotions.length > 0
          ? ` The user also describes these feelings: ${userEmotions.join(", ")}.`
          : "";
      promptInstruction = `Analyze the OST/track: "${query}".${emotionPart} Combine both sources.`;
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a creative visual artist. ${promptInstruction}

Generate exactly 5 distinct, vivid image generation prompts that capture the emotional essence. Each prompt should be a standalone description for an AI image generator — rich with visual detail, color, atmosphere, and mood. Do NOT include numbering, labels, or explanations. Output only the 5 prompts, one per line.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const prompts = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .slice(0, 5);

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
        const bytes =
          response.generatedImages?.[0]?.image?.imageBytes;
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
