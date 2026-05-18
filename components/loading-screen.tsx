export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-amber-600 shadow-lg shadow-orange-500/30 flex items-center justify-center text-white font-bold text-xs">
          W
        </div>
        <div className="flex flex-col">
          <span className="text-[14px] text-zinc-200 font-medium tracking-tight">World Builder</span>
          <span className="text-[10px] text-zinc-600">chat-based 3D</span>
        </div>
      </div>

      <div className="w-40 h-px bg-zinc-800 overflow-hidden rounded-full">
        <div className="h-full w-1/3 bg-gradient-to-r from-orange-400 to-amber-600 animate-loading-bar" />
      </div>

      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .animate-loading-bar { animation: loading-bar 1.2s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
