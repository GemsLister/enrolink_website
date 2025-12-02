import { Link } from 'react-router-dom'
import ProblemImg from '../assets/Product-We-got-a-problem-01.png'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fff6f7] px-6">
      <div className="w-full max-w-2xl text-center">
        <div className="space-y-1">
          <div className="text-[#7d102a] font-extrabold" style={{ fontFamily: 'var(--font-open-sans)' }}>
            <div className="text-[72px] leading-none">404</div>
          </div>
          <div className="text-2xl font-semibold text-[#5b1a30]" style={{ fontFamily: 'var(--font-open-sans)' }}>Page not found</div>
        </div>
        <div className="mt-6 flex items-center justify-center">
          <img src={ProblemImg} alt="Page not found" className="w-full max-w-md" />
        </div>
        <p className="mt-6 text-sm text-[#7c3a4a]">Uh oh! Looks like the page you're trying to access does not exist.</p>
        <div className="mt-6">
          <Link to="/" className="inline-block rounded-full bg-[#c4375b] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200/60 transition hover:bg-[#a62a49]">
            Back to homepage
          </Link>
        </div>
      </div>
    </div>
  )
}

