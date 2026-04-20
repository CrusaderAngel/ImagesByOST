import "dotenv/config";
import express from "express";
import cors from "cors";
import Groq from "groq-sdk";

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a creative visual artist and synesthete who translates music emotions into vivid imagery. Always respond with a valid JSON array of exactly 5 strings and nothing else.",
        },
        {
          role: "user",
          content: `${promptInstruction}

Return a JSON array of exactly 5 strings. Each string is a standalone, vivid image generation prompt — rich with visual detail, color palette, atmosphere, lighting, and mood. No numbering, no labels, no explanation outside the JSON. Output only the JSON array like: ["prompt1","prompt2","prompt3","prompt4","prompt5"]`,
        },
      ],
      temperature: 0.8,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content ?? "";
    let prompts;
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        prompts = parsed.slice(0, 5).map(String);
      } else {
        const firstArray = Object.values(parsed).find(Array.isArray);
        prompts = firstArray ? firstArray.slice(0, 5).map(String) : [];
      }
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
        const response = await fetch(
          "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: prompt }),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HuggingFace error: ${response.status} ${errText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        return base64;
      })
    );

    res.json({ images: imageResults });
  } catch (err) {
    console.error("Error in /api/generate:", err);
    res.status(500).json({ error: err.message || "Failed to generate images" });
  }
});

const PORT = process.env.BACKEND_PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend server running on port ${PORT}`);
});
