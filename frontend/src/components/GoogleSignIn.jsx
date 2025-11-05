import { useEffect, useRef } from 'react'

export default function GoogleSignIn({ onSuccess, text = 'signin_with', shape = 'pill', size = 'large', width = 320 }) {
  const btnRef = useRef(null)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!clientId) return
    function initialize() {
      /* global google */
      if (!window.google || !window.google.accounts || !window.google.accounts.id) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response && response.credential) {
            onSuccess?.(response.credential)
          }
        },
        ux_mode: 'popup',
      })
      if (btnRef.current) {
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: 'outline',
          size,
          text,
          shape,
          width,
          logo_alignment: 'left',
        })
      }
    }

    // Load script once
    const id = 'google-identity-services'
    if (!document.getElementById(id)) {
      const s = document.createElement('script')
      s.src = 'https://accounts.google.com/gsi/client'
      s.async = true
      s.defer = true
      s.id = id
      s.onload = initialize
      document.head.appendChild(s)
    } else {
      initialize()
    }
  }, [clientId, onSuccess, size, text, shape, width])

  if (!clientId) {
    return (
      <div className="text-xs text-[#5b5c60] bg-gray-50 border border-gray-200 rounded p-2 text-center">
        Google Sign-In not configured (set VITE_GOOGLE_CLIENT_ID)
      </div>
    )
  }

  return <div ref={btnRef} className="flex justify-center" />
}
