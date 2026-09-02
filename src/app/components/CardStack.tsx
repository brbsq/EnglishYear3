import * as React from "react"
import { motion } from "motion/react"

/**
 * CardStack
 *
 * A stack of cards with images that can be uploaded and rearranged.
 * Drag the front card down to move it to the back of the stack.
 */

let idCounter = 0
const genId = () => `card_${Date.now().toString(36)}_${idCounter++}`

function toObjList(arr: (string | { src: string; alt?: string })[]) {
    return arr.map((img) => {
        if (typeof img === "string") return { id: genId(), src: img, alt: "" }
        if (img && typeof img === "object" && img.src)
            return { id: genId(), ...img }
        return {
            id: genId(),
            src: "",
            alt: "",
        }
    })
}

interface CardStackProps {
    images: (string | { src: string; alt?: string })[]
    activeIndex?: { index: number; tick: number }
    offset?: number
    scaleStep?: number
    dimStep?: number
    stiffness?: number
    damping?: number
    aspectRatio?: "16/9" | "4/3" | "1/1" | "3/4" | "9/16"
    borderRadius?: number
    width?: number
    className?: string
}

export const CardStack = React.memo(function CardStack({
    images = [],
    activeIndex,
    offset = 10,
    scaleStep = 0.06,
    dimStep = 0.15,
    stiffness = 170,
    damping = 26,
    aspectRatio = "16/9",
    borderRadius = 8,
    width = 250,
    className = "",
}: CardStackProps) {
    const [cards, setCards] = React.useState(toObjList(images))

    const imagesKey = images.map((img) =>
        typeof img === "string" ? img : (img as any).id || img.src
    ).join("|")

    React.useEffect(() => {
        setCards((prev) => {
            const prevMap = new Map(prev.map((c) => [c.src, c]))
            return images.map((img) => {
                const src = typeof img === "string" ? img : img.src
                const existing = prevMap.get(src)
                if (existing) {
                    prevMap.delete(src)
                    return existing
                }
                if (typeof img === "object" && img.src)
                    return { id: genId(), ...img, alt: img.alt || "" }
                return { id: genId(), src, alt: "" }
            })
        })
    }, [imagesKey])

    React.useEffect(() => {
        if (activeIndex == null) return
        const i = activeIndex.index
        setCards((prev) => {
            const src = typeof images[i] === "string" ? images[i] : images[i]?.src
            const idx = prev.findIndex((c) => c.src === src)
            if (idx <= 0) return prev
            return [prev[idx], ...prev.slice(0, idx), ...prev.slice(idx + 1)]
        })
    }, [activeIndex])

    const moveToEnd = React.useCallback((i: number) =>
        setCards((prev) => [...prev.slice(i + 1), prev[i]]), [])

    const spring = React.useMemo(() =>
        stiffness || damping
            ? { type: "spring" as const, stiffness: Math.max(1, stiffness), damping }
            : undefined,
    [stiffness, damping])

    // Only spread out a limited number of cards; extras hide behind the last visible one
    const maxVisible = 5
    const { fitScale, fitTranslateY } = React.useMemo(() => {
        const n = cards.length
        const visibleDepth = Math.min(n, maxVisible) - 1
        const totalOverflow = Math.max(0, visibleDepth * (offset / 100 - scaleStep / 2))
        const [arW, arH] = aspectRatio.split("/").map(Number)
        const arRatio = arW / arH
        const tallPenalty = Math.max(0, arH / arW - 1.5) * 0.35
        const allowedOverflow = 0.3 * Math.min(1, arRatio ** 3) - tallPenalty
        const needsScale = totalOverflow > allowedOverflow
        const scale = needsScale ? (1 + allowedOverflow) / (1 + totalOverflow) : 1
        return { fitScale: scale, fitTranslateY: scale * totalOverflow * 50 }
    }, [cards.length, offset, scaleStep, aspectRatio])

    return (
        <div
            className={className}
            style={{
                position: "relative",
                width,
                aspectRatio: aspectRatio.replace("/", " / "),
                overflow: "visible",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 0,
            }}
        >
            <ul
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    margin: 0,
                    padding: 0,
                    transform: `translateY(${fitTranslateY}%) scale(${fitScale})`,
                    transition: "transform 0.3s cubic-bezier(.4,0,.2,1)",
                }}
            >
                {cards.map(({ id, src, alt }, i) => {
                    const front = i === 0
                    const vi = Math.min(i, maxVisible - 1)
                    const brightness = Math.max(0.1, 1 - vi * dimStep)
                    const baseZ = cards.length - i
                    return (
                        <motion.li
                            key={id}
                            style={{
                                position: "absolute",
                                width: "100%",
                                height: "100%",
                                borderRadius,
                                listStyle: "none",
                                cursor: front ? "grab" : "auto",
                                overflow: "hidden",
                                touchAction: "none",
                                zIndex: baseZ,
                                transition:
                                    "box-shadow 0.3s cubic-bezier(.4,0,.2,1)",
                            }}
                            animate={{
                                top: `calc(${vi * -offset}%)`,
                                scale: 1 - vi * scaleStep,
                                filter: `brightness(${brightness})`,
                                zIndex: baseZ,
                                transition: spring,
                            }}
                            drag={front ? "y" : false}
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragMomentum={false}
                            onDragEnd={() => moveToEnd(i)}
                            whileDrag={
                                front
                                    ? {
                                          zIndex: cards.length,
                                          cursor: "grabbing",
                                          scale: 1 - i * scaleStep + 0.05,
                                          rotate: 2,
                                      }
                                    : {}
                            }
                        >
                            <img
                                src={src}
                                alt={alt || "Card image"}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    pointerEvents: "none",
                                    display: "block",
                                    transition:
                                        "filter 0.3s cubic-bezier(.4,0,.2,1)",
                                }}
                            />
                        </motion.li>
                    )
                })}
            </ul>
        </div>
    )
})
