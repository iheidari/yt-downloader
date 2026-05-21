import { useState } from 'react'

function UrlInput({ onSubmit, loading }) {
  const [url, setUrl] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (url.trim()) {
      onSubmit(url.trim())
    }
  }

  return (
    <section className="flex flex-col items-center mb-stack-lg">
      <h2 className="font-display-lg text-display-lg text-center mb-stack-sm text-on-surface">
        Download High-Resolution Media
      </h2>
      <p className="font-body-lg text-body-lg text-secondary text-center max-w-2xl mb-stack-md">
        Fast, secure, and reliable downloader for high-fidelity content across the web.
      </p>
      <form onSubmit={handleSubmit} className="w-full max-w-4xl relative group">
        <div className="flex items-center bg-surface border border-outline rounded-xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all h-[72px]">
          <div className="pl-6 pr-4 flex items-center text-secondary">
            <span className="material-symbols-outlined text-[28px]">content_paste</span>
          </div>
          <input
            type="url"
            placeholder="Paste video URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            required
            className="flex-1 bg-transparent border-none focus:ring-0 font-body-lg text-body-lg placeholder:text-outline-variant text-on-surface py-4 px-2 outline-none"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="bg-primary hover:bg-primary-container text-on-primary transition-colors h-full px-8 font-label-md text-label-md flex items-center gap-2 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                <span>Loading...</span>
              </>
            ) : (
              <>
                <span>Analyze</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  )
}

export default UrlInput
