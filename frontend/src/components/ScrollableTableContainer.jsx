import { useState, useRef, useEffect } from 'react'

export default function ScrollableTableContainer({
  children,
  wrapperClassName = '',
  className = '',
  overflowClass = 'overflow-x-auto',
  containerRef: externalContainerRef,
  containerProps = {},
}) {
  const internalContainerRef = useRef(null)
  const containerRef = externalContainerRef || internalContainerRef
  const bottomBarRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [showBottomBar, setShowBottomBar] = useState(false)
  const [contentWidth, setContentWidth] = useState(0)
  const syncingRef = useRef(false)

  const checkScroll = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5)
      setShowBottomBar(scrollWidth > clientWidth + 2)
      setContentWidth(scrollWidth || 0)
    }
  }

  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    const bar = bottomBarRef.current
    if (!container) return

    container.addEventListener('scroll', checkScroll)
    const onContainerScroll = () => {
      if (syncingRef.current) return
      const b = bottomBarRef.current
      if (!b) return
      syncingRef.current = true
      b.scrollLeft = container.scrollLeft || 0
      syncingRef.current = false
    }
    container.addEventListener('scroll', onContainerScroll)

    const onBarScroll = () => {
      if (syncingRef.current) return
      if (!containerRef.current) return
      const b = bottomBarRef.current
      if (!b) return
      syncingRef.current = true
      containerRef.current.scrollLeft = b.scrollLeft || 0
      syncingRef.current = false
    }
    if (bar) bar.addEventListener('scroll', onBarScroll)

    let ro
    try {
      ro = new ResizeObserver(() => checkScroll())
      ro.observe(container)
    } catch (_) {}
    // Check after content changes
    setTimeout(checkScroll, 50)

    return () => {
      container.removeEventListener('scroll', checkScroll)
      container.removeEventListener('scroll', onContainerScroll)
      if (bar) bar.removeEventListener('scroll', onBarScroll)
      try { if (ro) ro.disconnect() } catch (_) {}
    }
  }, [showBottomBar])

  return (
    <div className={`relative flex flex-col ${wrapperClassName}`}>
      {/* Scrollable container */}
      <div
        ref={containerRef}
        className={`${overflowClass} no-scrollbar ${className}`}
        {...containerProps}
      >
        {children}
      </div>

      {/* Bottom horizontal scrollbar as a footer (no overlap) */}
      {showBottomBar && (
        <div className="bg-transparent">
          <div className="px-4 pb-1">
            <div
              ref={bottomBarRef}
              className="overflow-x-auto overflow-y-hidden h-[10px] rounded-full"
              style={{ scrollbarGutter: 'stable' }}
            >
              <div style={{ width: contentWidth || 0, height: 1 }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
