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
  url: string
}

export default function OSTVisualizer() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showEmotions, setShowEmotions] = useState(false)
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([])
  const [customDescription, setCustomDescription] = useState("")
  const [generationMode, setGenerationMode] = useState<GenerationMode>("combined")
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const handleAnalyze = () => {
    if (searchQuery.trim()) {
      setShowEmotions(true)
    }
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
    // Simulate generation with placeholder images
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setGeneratedImages([
      { id: 1, url: "https://picsum.photos/seed/ost1/600/400" },
      { id: 2, url: "https://picsum.photos/seed/ost2/600/400" },
      { id: 3, url: "https://picsum.photos/seed/ost3/600/400" },
      { id: 4, url: "https://picsum.photos/seed/ost4/600/400" },
    ])
    setIsGenerating(false)
  }

  const handleDownload = (imageUrl: string, id: number) => {
    const link = document.createElement("a")
    link.href = imageUrl
    link.download = `ost-visual-${id}.jpg`
    link.target = "_blank"
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
            OST Visualizer
          </h1>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter anime, game, or track name..."
            className="w-full border border-border bg-transparent px-4 py-4 text-lg text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
          />
          <button
            onClick={handleAnalyze}
            disabled={!searchQuery.trim()}
            className="border border-border px-8 py-3 text-sm uppercase tracking-widest text-foreground transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-40"
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
              {/* Emotion Tags Grid */}
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

              {/* Custom Description Textarea */}
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

        {/* Gallery Section */}
        {generatedImages.length > 0 && (
          <section className="mt-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid gap-4 md:grid-cols-2">
              {generatedImages.map((image, index) => (
                <div
                  key={image.id}
                  className="group relative animate-in fade-in duration-700"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <img
                    src={image.url}
                    alt={`Generated visualization ${image.id}`}
                    className="aspect-[3/2] w-full object-cover"
                    crossOrigin="anonymous"
                  />
                  <button
                    onClick={() => handleDownload(image.url, image.id)}
                    className="absolute bottom-3 right-3 p-2 text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label={`Download image ${image.id}`}
                  >
                    <Download className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
