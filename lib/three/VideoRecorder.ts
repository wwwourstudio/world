// VideoRecorder — wraps MediaRecorder on the canvas capture stream

export const videoRecorder = {
  _recorder: null as MediaRecorder | null,
  _chunks: [] as Blob[],

  isRecording(): boolean {
    return this._recorder?.state === 'recording'
  },

  start(canvas: HTMLCanvasElement, fps = 30): boolean {
    if (!canvas.captureStream) return false
    const stream = canvas.captureStream(fps)
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
      ? 'video/webm;codecs=vp8'
      : 'video/webm'

    this._chunks = []
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 })
    recorder.ondataavailable = (e) => { if (e.data.size > 0) this._chunks.push(e.data) }
    recorder.start(100)
    this._recorder = recorder
    return true
  },

  stop(): Promise<string | null> {
    return new Promise((resolve) => {
      if (!this._recorder || this._recorder.state === 'inactive') {
        resolve(null)
        return
      }
      this._recorder.onstop = () => {
        const blob = new Blob(this._chunks, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        resolve(url)
      }
      this._recorder.stop()
    })
  },
}
