import { Link } from 'react-router-dom'

export default function AuthLayout({ title, subtitle, children, illustration, logo, greetings }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#f4c3c6] via-[#f3b1b7] to-[#f0a5ad] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 bg-white/90 rounded-2xl shadow-lg overflow-hidden">
        <div className="hidden md:flex items-center justify-center bg-[#f3c1c4] p-8">
          {illustration ? (
            <img src={illustration} alt="Illustration" className="max-w-80 w-full h-auto object-contain drop-shadow" />
          ) : (
            <div className="w-72 h-72 bg-[#e07b86]/30 rounded-xl border border-[#e07b86] flex items-center justify-center">
              <span className="text-[#8a1d35] font-bold">Illustration</span>
            </div>
          )}
        </div>
        <div className="p-8 md:p-10">
          {logo ? (
            <div className="flex items-center gap-2 mb-6 justify-center md:justify-start">
              <img src={logo} alt="EnroLink" className="h-8 w-auto" />
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 bg-[#8a1d35] rounded-md" />
              <span className="text-[#8a1d35] font-extrabold text-xl">EnroLink</span>
            </div>
          )}
          <h1 className="text-2xl font-extrabold text-[#202124] text-center">{title}</h1>
          {subtitle ? (
            <p className="text-center text-[#5b5c60] mt-1">{subtitle}</p>
          ) : null}
          {greetings ? (
            <p className="text-center text-[#5b5c60] mt-1">{greetings}</p>
          ) : null}
          <div className="mt-6">{children}</div>
          <div className="text-center text-sm text-[#5b5c60] mt-6">
            <Link to="/" className="inline-flex items-center gap-2 hover:underline">
              <span className="i-heroicons-arrow-uturn-left" />
              Back
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
