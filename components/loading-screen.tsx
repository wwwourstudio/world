export function LoadingScreen() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0e1a]">
      <div className="relative">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 animate-pulse shadow-2xl shadow-blue-500/50" />
        <div className="absolute -inset-4">
          <div className="w-32 h-32 rounded-full border-4 border-transparent border-t-blue-500 border-r-purple-500 animate-spin" />
        </div>
      </div>

      <div className="mt-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">World Builder Pro</h2>
        <p className="text-gray-400 text-sm">AAA Edition — Initializing Engine...</p>
      </div>

      <div className="mt-6 w-64 h-1 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 animate-loading origin-left" />
      </div>
    </div>
  )
}
