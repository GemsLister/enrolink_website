import { Link } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import EnroLinkLogo from '../assets/enrolink-logo 2.png'

export default function OfficerSidebar() {
  const location = useLocation()

  const tabs = [
    {
      name: 'Dashboard',
      path: '/officer/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM14 4a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V4zM14 10a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2z" />
        </svg>
      ),
    },
    {
      name: 'Records',
      path: '/officer/records',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 5a2 2 0 012-2h6l2 2h6a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" />
        </svg>
      ),
    },
    { name: 'Settings', path: '/officer/settings', icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M11.983 1.535a1 1 0 00-1.966 0l-.134.804a6.993 6.993 0 00-1.657.962l-.747-.43a1 1 0 00-1.366.366L3.2 4.732a1 1 0 00.366 1.366l.747.43a6.993 6.993 0 000 1.924l-.747.43A1 1 0 003.2 10.248l.903 1.565a1 1 0 001.366.366l.747-.43c.51 .4 1.065 .73 1.657 .962l.134 .804a1 1 0 001.966 0l.134 -.804a6.993 6.993 0 001.657 -.962l.747 .43a1 1 0 001.366 -.366l.903 -1.565a1 1 0 00-.366 -1.366l-.747 -.43a6.993 6.993 0 000 -1.924l.747 -.43a1 1 0 00.366 -1.366l-.903 -1.565a1 1 0 00-1.366 -.366l-.747 .43a6.993 6.993 0 00-1.657 -.962l-.134 -.804zM10 13a3 3 0 110 -6 3 3 0 010 6z" clipRule="evenodd" />
      </svg>
    )},
  ]

  const isActive = (path) => {
    if (path === '/officer/dashboard') {
      return location.pathname === '/officer/dashboard' || location.pathname === '/officer'
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  return (
    <aside className="flex flex-col min-h-screen w-80 bg-gradient-to-b from-red-300 to-pink-100">
      <div className="p-8 flex justify-center overflow-visible">
        <Link to={'/officer'}>
          <img src={EnroLinkLogo} alt="EnroLink-logo" className="w-48 h-auto mt-[50px] mb-[30px] transform scale-125 origin-center z-10 transition-transform duration-200" />
        </Link>
      </div>

      <nav className="flex-1 px-9">
        <ul className="space-y-4">
          {tabs.map((tab, index) => {
            const active = isActive(tab.path)
            return (
              <li key={index}>
                <Link to={tab.path} className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-200 ${active ? 'bg-pink-900 text-white' : 'text-pink-900 hover:bg-pink-200'}`}>
                  <span className={`${active ? 'text-white' : 'text-pink-800'}`}>{tab.icon}</span>
                  <span className="font-medium text-sm">{tab.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-8">
        <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-full text-pink-800 hover:bg-pink-200 transition-all duration-200">
          <svg className="w-5 h-5 text-pink-800" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
          </svg>
          <span className="font-medium text-sm">Log out</span>
        </Link>
      </div>
    </aside>
  )
}
