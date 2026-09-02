import { useEffect, useState, useRef, useCallback, useLayoutEffect } from "react"
import { CardStack } from "./CardStack"

export function EmbedPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null)

  // Embed transparency fix.
  // Root cause: Figma Make's hosting environment (or the user's dark OS preference)
  // sets `color-scheme: dark`, which paints the document *canvas* dark — the layer
  // behind all CSS elements. Even when every element has `background: transparent`,
  // the canvas shows through. Forcing `color-scheme: only light` makes the canvas
  // white/transparent, and the iframe's own `background: transparent` lets the
  // parent page show through.
  useLayoutEffect(() => {
    const STYLE_ID = "embed-transparent"

    // 1. Inject a <style> tag — reliable, wins over Tailwind's cascade layers
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style")
      style.id = STYLE_ID
      style.textContent = `
        :root, html {
          color-scheme: only light !important;
        }
        html, body {
          background-color: transparent !important;
          background: transparent !important;
        }
      `
      document.head.appendChild(style)
    }

    // 2. Adopted stylesheet — overrides Figma Make's own adopted stylesheets
    try {
      const sheet = new CSSStyleSheet()
      sheet.replaceSync(`
        :root, html { color-scheme: only light !important; background: transparent !important; }
        body { background: transparent !important; }
      `)
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
    } catch {
      // adoptedStyleSheets not supported — <style> tag above handles it
    }

    // 3. Inline style fallbacks
    document.documentElement.style.setProperty("--background", "transparent")
    document.documentElement.style.setProperty("color-scheme", "only light", "important")

    return () => {
      const el = document.getElementById(STYLE_ID)
      if (el) el.remove()
      document.documentElement.style.removeProperty("--background")
      document.documentElement.style.removeProperty("color-scheme")
    }
  }, [])

  const [config, setConfig] = useState({
    images: null as { src: string; alt: string }[] | null,
    offset: 10,
    scaleStep: 0.06,
    dimStep: 0.15,
    stiffness: 170,
    damping: 26,
    aspectRatio: "16/9" as "16/9" | "4/3" | "1/1" | "3/4" | "9/16",
    borderRadius: 8,
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    let images: { src: string; alt: string }[] = []
    const imagesParam = params.get("images")
    if (imagesParam) {
      try {
        images = JSON.parse(decodeURIComponent(imagesParam))
      } catch {
        images = []
      }
    }

    // Helper: parse a numeric param, falling back to a default only when
    // the param is absent. Using `||` would treat 0 as falsy and substitute
    // the default — which caused borderRadius:0 to become 8.
    const num = (key: string, fallback: number) => {
      const v = params.get(key)
      if (v === null) return fallback
      const n = Number(v)
      return Number.isFinite(n) ? n : fallback
    }

    setConfig({
      images,
      offset: num("offset", 10),
      scaleStep: num("scaleStep", 0.06),
      dimStep: num("dimStep", 0.15),
      stiffness: num("stiffness", 170),
      damping: num("damping", 26),
      aspectRatio: (params.get("aspectRatio") as any) || "16/9",
      borderRadius: num("borderRadius", 8),
    })
  }, [])

  const measure = useCallback(() => {
    if (!containerRef.current) return
    const { width, height } = containerRef.current.getBoundingClientRect()
    setContainerSize({ w: width, h: height })
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [measure])

  // Compute the card width that fits the entire stack (including upward offset)
  // within the iframe viewport
  const [arW, arH] = config.aspectRatio.split("/").map(Number)
  const arRatio = arW / arH

  // Replicate CardStack's fit calculation to find total visual height
  const maxVisible = 5
  const numImages = config.images?.length ?? 0
  const visibleDepth = Math.min(numImages, maxVisible) - 1
  const totalOverflow = Math.max(0, visibleDepth * (config.offset / 100 - config.scaleStep / 2))
  const tallPenalty = Math.max(0, arH / arW - 1.5) * 0.35
  const allowedOverflow = 0.3 * Math.min(1, arRatio ** 3) - tallPenalty
  const effectiveOverflow = Math.min(totalOverflow, Math.max(0, allowedOverflow))
  // The stack extends beyond the card bounding box by effectiveOverflow * cardHeight
  const stackHeightMultiplier = 1 + effectiveOverflow

  // Leave ~25% padding so the dragged card isn't clipped by the iframe edge
  const dragPadding = 0.75
  let cardWidth = 350
  if (containerSize) {
    const fitByWidth = containerSize.w * dragPadding
    const fitByHeight = containerSize.h * arRatio / stackHeightMultiplier * dragPadding
    cardWidth = Math.floor(Math.min(fitByWidth, fitByHeight))
  }

  const hasImages = config.images !== null && config.images.length > 0

  return (
    <div
      ref={containerRef}
      style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", overflow: "visible" }}
    >
      {!hasImages ? (
        <p className="text-sm text-slate-500">No images configured</p>
      ) : containerSize ? (
        <CardStack
          images={config.images!}
          offset={config.offset}
          scaleStep={config.scaleStep}
          dimStep={config.dimStep}
          stiffness={config.stiffness}
          damping={config.damping}
          aspectRatio={config.aspectRatio}
          borderRadius={config.borderRadius}
          width={cardWidth}
        />
      ) : null}
    </div>
  )
}