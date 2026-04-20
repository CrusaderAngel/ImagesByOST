import "dotenv/config";
import express from "express";
import cors from "cors";
import Groq from "groq-sdk";

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const searchCache = new Map();

async function searchContext(query) {
  if (searchCache.has(query)) {
    return searchCache.get(query);
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `${query} anime game OST soundtrack atmosphere mood`,
        max_results: 3,
        search_depth: "basic",
      }),
    });

    if (!response.ok) return "";

    const data = await response.json();
    const context = data.results
      ?.map((r) => r.content)
      .filter(Boolean)
      .join(" ")
      .slice(0, 1500);

    const result = context || "";
    searchCache.set(query, result);
    return result;
  } catch {
    return "";
  }
}

app.post("/api/analyze", async (req, res) => {
  try {
    const { query, userEmotions = [], mode = "combined" } = req.body;

    if (!query && userEmotions.length === 0) {
      return res.status(400).json({ error: "query or userEmotions required" });
    }

    // Поиск контекста через Tavily (только если есть query)
    let webContext = "";
    if (query) {
      webContext = await searchContext(query);
    }

    const contextPart = webContext
      ? `\n\nHere is background context from the web about this: ${webContext}`
      : "";

    let promptInstruction = "";
    if (mode === "feelings") {
      const contextPart = webContext ? `\n\nContext about "${query}": ${webContext}` : "";
      promptInstruction = `The user entered "${query}" as their reference. First validate that "${query}" is a recognizable movie, anime, game, track, artist, or character name. Then focus on the user's personal emotions: ${userEmotions.join(", ")}. Use "${query}" as visual backdrop.${contextPart}`;
    } else if (mode === "ai") {
      promptInstruction = `Analyze "${query}" objectively. Ignore any personal feelings. Focus purely on the visual atmosphere, themes, and emotions that "${query}" itself communicates. Web context: ${webContext}`;
    } else {
      const emotionPart = userEmotions.length > 0
        ? ` User's personal feelings: ${userEmotions.join(", ")}.`
        : "";
      promptInstruction = `Combine two sources equally: the objective atmosphere of "${query}" AND the user's personal feelings.${emotionPart} Neither should dominate — blend both into the prompts. Web context: ${webContext}`;
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a creative visual artist who generates image prompts.

First, determine if the user's query "${query}" is a recognizable anime title, movie, character, cartoon, hero, video game title, music track, or artist name in any language. Gibberish, random letters like "asd", "qwe", nonsense strings, or clearly made-up words are invalid and must return { "valid": false }.

Respond ONLY with a JSON object in one of these two shapes:
- If invalid: { "valid": false }
- If valid: { "valid": true, "prompts": ["prompt1","prompt2","prompt3","prompt4","prompt5"] }

The prompts must be vivid, detailed image generation prompts capturing the emotional atmosphere.`,
        },
        {
          role: "user",
          content: promptInstruction,
        },
      ],
      temperature: 0.8,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content ?? "";
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {};
    }

    if (parsed.valid === false) {
      return res.status(400).json({ error: "Please enter a valid movie, game, or track name" });
    }

    let prompts = [];
    if (Array.isArray(parsed.prompts)) {
      prompts = parsed.prompts.slice(0, 5).map(String);
    } else if (Array.isArray(parsed)) {
      prompts = parsed.slice(0, 5).map(String);
    } else {
      const firstArray = Object.values(parsed).find(Array.isArray);
      prompts = firstArray ? firstArray.slice(0, 5).map(String) : [];
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

    const prompt = prompts[0];

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

    res.json({ images: [base64] });
  } catch (err) {
    console.error("Error in /api/generate:", err);
    res.status(500).json({ error: err.message || "Failed to generate image" });
  }
});

const PORT = process.env.BACKEND_PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend server running on port ${PORT}`);
});