

export default function AuthLayout({ title, subtitle, children, illustration, logo, greetings, bgClass }) {
  return (
    <div className={`min-h-screen ${bgClass || 'bg-gradient-to-tr from-red-300 to-pink-100'} flex items-center justify-center p-4`}>
      <div className="w-full max-w-[1280px] grid grid-cols-1 md:grid-cols-2 bg-white/90 rounded-2xl shadow-lg overflow-hidden">
        <div className="hidden md:flex flex-col items-start justify-center bg-[#f8d9dd] p-8">
          {greetings ? (
            <div className="mb-6 pl-1">
              <p className="text-[#202124] font-bold text-xl">{greetings}!</p>
            </div>
          ) : null}
          {illustration ? (
            <img src={illustration} alt="Illustration" className="w-full max-w-[460px] h-auto object-contain" />
          ) : (
            <div className="w-72 h-72 bg-[#e07b86]/30 rounded-xl border border-[#e07b86] flex items-center justify-center">
              <span className="text-[#8a1d35] font-bold">Illustration</span>
            </div>
          )}
        </div>
        <div className="p-8 md:p-10">
          <div className="max-w-[520px] mx-auto">
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
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
