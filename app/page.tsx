"use client"

import { useState } from "react"
import { Download, Sparkles, Brain, Merge } from "lucide-react"

const emotionTags = [
  "Melancholic",
  "Epic",
  "Lonely",
  "Nostalgic",
  "Dark",
  "Hopeful",
  "Tense",
  "Peaceful",
  "Chaotic",
  "Bittersweet",
]

type GenerationMode = "feelings" | "ai" | "combined"

interface GeneratedImage {
  id: number
  src: string
}

export default function OSTVisualizer() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showEmotions, setShowEmotions] = useState(false)
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([])
  const [customDescription, setCustomDescription] = useState("")
  const [generationMode, setGenerationMode] = useState<GenerationMode>("combined")
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [queryError, setQueryError] = useState(false)

  const handleAnalyze = () => {
    if (!searchQuery.trim()) {
      setQueryError(true)
      return
    }
    setQueryError(false)
    setShowEmotions(true)
    setGeneratedImages([])
    setError(null)
  }

  const toggleEmotion = (emotion: string) => {
    setSelectedEmotions((prev) =>
      prev.includes(emotion)
        ? prev.filter((e) => e !== emotion)
        : [...prev, emotion]
    )
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    setGeneratedImages([])

    try {
      const userEmotions = [
        ...selectedEmotions,
        ...(customDescription.trim() ? [customDescription.trim()] : []),
      ]

      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, userEmotions, mode: generationMode }),
      })

      if (!analyzeRes.ok) {
        const err = await analyzeRes.json()
        throw new Error(err.error || "Failed to analyze")
      }

      const { prompts } = await analyzeRes.json()

      const generateRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompts }),
      })

      if (!generateRes.ok) {
        const err = await generateRes.json()
        throw new Error(err.error || "Failed to generate images")
      }

      const { images } = await generateRes.json()

      setGeneratedImages(
        images.map((base64: string, index: number) => ({
          id: index + 1,
          src: `data:image/jpeg;base64,${base64}`,
        }))
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = (src: string, id: number) => {
    const link = document.createElement("a")
    link.href = src
    link.download = `ost-visual-${id}.jpg`
    link.click()
  }

  const modeCards = [
    {
      id: "feelings" as GenerationMode,
      icon: Sparkles,
      title: "My feelings only",
      description: "Based on what you feel",
    },
    {
      id: "ai" as GenerationMode,
      icon: Brain,
      title: "AI analysis only",
      description: "Based on the track itself",
    },
    {
      id: "combined" as GenerationMode,
      icon: Merge,
      title: "Combined",
      description: "Both merged together",
    },
  ]

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-24">
        {/* Hero Input Section */}
        <section className="flex flex-col items-center gap-6">
          <h1 className="text-center text-4xl font-light tracking-tight md:text-5xl">
          Lumina Echo
          </h1>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setQueryError(false) }}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder="Enter anime, game, or track name..."
            className={`w-full border bg-transparent px-4 py-4 text-lg text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${queryError ? "border-red-500 focus:border-red-400" : "border-border focus:border-foreground"}`}
          />
          {queryError && (
            <p className="text-sm text-red-500 -mt-2">Please enter a track or anime name first.</p>
          )}
          <button
            onClick={handleAnalyze}
            className="border border-border px-8 py-3 text-sm uppercase tracking-widest text-foreground transition-colors hover:border-foreground cursor-pointer"
          >
            Analyze
          </button>
        </section>

        {/* Emotion Selection Section */}
        {showEmotions && (
          <section className="mt-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="mb-12 text-center text-2xl font-light">
              What do you feel?
            </h2>
            <div className="grid gap-12 md:grid-cols-2">
              <div className="flex flex-wrap gap-3">
                {emotionTags.map((emotion) => {
                  const isSelected = selectedEmotions.includes(emotion)
                  return (
                    <button
                      key={emotion}
                      onClick={() => toggleEmotion(emotion)}
                      className={`px-4 py-2 text-sm transition-colors ${
                        isSelected
                          ? "bg-foreground text-background"
                          : "border border-border text-foreground hover:border-foreground"
                      }`}
                    >
                      {emotion}
                    </button>
                  )
                })}
              </div>
              <textarea
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="Or describe it in your own words..."
                className="min-h-[160px] w-full resize-none border border-border bg-transparent px-4 py-4 text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
              />
            </div>
          </section>
        )}

        {/* Generation Mode Selector */}
        {showEmotions && (
          <section className="mt-24 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
            <div className="grid gap-4 md:grid-cols-3">
              {modeCards.map((card) => {
                const Icon = card.icon
                const isSelected = generationMode === card.id
                return (
                  <button
                    key={card.id}
                    onClick={() => setGenerationMode(card.id)}
                    className={`flex flex-col items-center gap-4 border p-8 transition-colors ${
                      isSelected
                        ? "border-foreground"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.5} />
                    <div className="text-center">
                      <p className="text-sm font-medium">{card.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {card.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Generate Button */}
        {showEmotions && (
          <section className="mt-16 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-foreground py-4 text-sm uppercase tracking-widest text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? "Generating..." : "Generate images"}
            </button>
          </section>
        )}

        {/* Error Message */}
        {error && (
          <section className="mt-8">
            <p className="text-center text-sm text-red-500">{error}</p>
          </section>
        )}

        {/* Gallery Section */}
        {generatedImages.length > 0 && (
          <section className="mt-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="group relative">
              <img
                src={generatedImages[0].src}
                alt="Generated visualization"
                className="w-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-black/50">
                <span className="text-[11px] text-white/70 tracking-wide">
                  FLUX.1-schnell · Hugging Face
                </span>
                <button
                  onClick={() => handleDownload(generatedImages[0].src, generatedImages[0].id)}
                  className="p-1 text-white/70 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Download image"
                >
                  <Download className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
