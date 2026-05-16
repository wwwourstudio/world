'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useWorldBuilder } from '@/lib/store'
import { AI_PROMPTS } from '@/lib/constants'

export function AIInput() {
  const { showNotification } = useWorldBuilder()
  const [prompt, setPrompt] = useState('')

  function handleGenerate(label: string) {
    showNotification(`Generating ${label}...`)
    setTimeout(() => showNotification(`${label} created!`), 1000)
  }

  function handleSubmit() {
    if (!prompt.trim()) return
    showNotification(`AI: "${prompt}"`)
    setPrompt('')
    setTimeout(() => showNotification('World generated!'), 1500)
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-3xl px-4">
      <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl shadow-2xl p-4">
        {/* Quick-generate buttons */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2 custom-scrollbar">
          {AI_PROMPTS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => handleGenerate(label)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-300 hover:text-white transition-all duration-200 whitespace-nowrap"
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Text input */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium text-blue-400">AI</span>
          </div>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Describe your world… (e.g. 'Create a mystical forest with ancient ruins')"
            className="
              w-full pl-20 pr-28 py-4 rounded-xl
              bg-white/5 border border-white/20 text-white
              placeholder:text-gray-500
              focus:outline-none focus:border-blue-500/50
              text-base transition-colors
            "
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
            Press <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Enter</kbd>
          </div>
        </div>
      </div>
    </div>
  )
}
