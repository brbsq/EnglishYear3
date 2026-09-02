import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs"

import blueFlower from "figma:asset/fa152214b96082b7e2c62bb1734cac297cab4142.png"
import orangeFlower from "figma:asset/faab1cd92c29ceaa9df26f44dbc62ec0fc97081d.png"
import pinkFlower from "figma:asset/6a02a25959ac21775c8cec0de051058e6d9c6957.png"
import purpleFlower from "figma:asset/2327483091ec86285442c0549a47bb872165e46a.png"
import greenFern from "figma:asset/f90670e20c3373d5b9c1a7b00cff5bc03277d001.png"

const SAMPLE_IMAGES = [
  { filename: "blue-flower.png", src: blueFlower, alt: "Blue Flower" },
  { filename: "orange-flower.png", src: orangeFlower, alt: "Orange Flower" },
  { filename: "pink-flower.png", src: pinkFlower, alt: "Pink Flower" },
  { filename: "purple-flower.png", src: purpleFlower, alt: "Purple Flower" },
  { filename: "green-fern.png", src: greenFern, alt: "Green Fern" },
]

/* -- Minimal ZIP (STORE, no compression) -- */

const crc32Table = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crc32Table[i] = c >>> 0
}

function crc32(data: Uint8Array): number {
  let crc = -1
  for (let i = 0; i < data.length; i++)
    crc = (crc >>> 8) ^ crc32Table[(crc ^ data[i]) & 0xff]
  return (crc ^ -1) >>> 0
}

function createZip(files: { name: string; data: Uint8Array }[]): Blob {
  const enc = new TextEncoder()
  const parts: (Uint8Array | ArrayBuffer)[] = []
  const cdEntries: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const nameBytes = enc.encode(file.name)
    const checksum = crc32(file.data)

    // Local file header
    const lh = new DataView(new ArrayBuffer(30))
    lh.setUint32(0, 0x04034b50, true)
    lh.setUint16(4, 20, true)
    lh.setUint16(8, 0, true) // STORE
    lh.setUint32(14, checksum, true)
    lh.setUint32(18, file.data.length, true)
    lh.setUint32(22, file.data.length, true)
    lh.setUint16(26, nameBytes.length, true)

    parts.push(new Uint8Array(lh.buffer), nameBytes, file.data)

    // Central directory entry
    const cd = new DataView(new ArrayBuffer(46))
    cd.setUint32(0, 0x02014b50, true)
    cd.setUint16(4, 20, true)
    cd.setUint16(6, 20, true)
    cd.setUint16(8, 0, true) // STORE
    cd.setUint32(16, checksum, true)
    cd.setUint32(20, file.data.length, true)
    cd.setUint32(24, file.data.length, true)
    cd.setUint16(28, nameBytes.length, true)
    cd.setUint32(42, offset, true)

    const cdBuf = new Uint8Array(46 + nameBytes.length)
    cdBuf.set(new Uint8Array(cd.buffer))
    cdBuf.set(nameBytes, 46)
    cdEntries.push(cdBuf)

    offset += 30 + nameBytes.length + file.data.length
  }

  const cdOffset = offset
  let cdSize = 0
  for (const entry of cdEntries) {
    parts.push(entry)
    cdSize += entry.length
  }

  // End of central directory
  const eocd = new DataView(new ArrayBuffer(22))
  eocd.setUint32(0, 0x06054b50, true)
  eocd.setUint16(8, files.length, true)
  eocd.setUint16(10, files.length, true)
  eocd.setUint32(12, cdSize, true)
  eocd.setUint32(16, cdOffset, true)
  parts.push(new Uint8Array(eocd.buffer))

  return new Blob(parts, { type: "application/zip" })
}

/* -- HTML generation -- */

interface ExportConfig {
  offset: number
  scaleStep: number
  dimStep: number
  stiffness: number
  damping: number
  aspectRatio: string
  borderRadius: number
  width: number
}

function generateHTML(config: ExportConfig): string {
  const imagesJS = SAMPLE_IMAGES.map(
    (img, i) =>
      `      { id: "card_${i}", src: "./images/${img.filename}", alt: ${JSON.stringify(img.alt)} }`
  ).join(",\n")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CardStack</title>
</head>
<body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:transparent;">
  <div id="root"></div>
  <script type="module">
    import React from "https://esm.sh/react@18.3.1";
    import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
    import { motion } from "https://esm.sh/motion@12.23.24/react?deps=react@18.3.1,react-dom@18.3.1";

    var h = React.createElement;

    /**
     * IMAGES
     *
     * The sample images below are in the ./images/ folder.
     * Replace them with your own:
     *
     *   - Local file (relative to this HTML file):
     *     src: "./images/my-photo.jpg"
     *
     *   - External URL to a hosted image:
     *     src: "https://your-cdn.com/photo.jpg"
     *
     * You can add or remove entries. Each needs a unique "id".
     */
    var images = [
${imagesJS}
    ];

    /** CardStack configuration — edit these values to adjust the stack */
    var CONFIG = {
      offset: ${config.offset},
      scaleStep: ${config.scaleStep},
      dimStep: ${config.dimStep},
      stiffness: ${config.stiffness},
      damping: ${config.damping},
      aspectRatio: "${config.aspectRatio}",
      borderRadius: ${config.borderRadius},
      width: ${config.width},
    };

    function CardStack() {
      var offset = CONFIG.offset;
      var scaleStep = CONFIG.scaleStep;
      var dimStep = CONFIG.dimStep;
      var stiffness = CONFIG.stiffness;
      var damping = CONFIG.damping;
      var aspectRatio = CONFIG.aspectRatio;
      var borderRadius = CONFIG.borderRadius;
      var width = CONFIG.width;

      var ref = React.useState(images);
      var cards = ref[0], setCards = ref[1];

      var moveToEnd = React.useCallback(function (i) {
        setCards(function (prev) {
          return prev.slice(i + 1).concat(prev[i]);
        });
      }, []);

      var spring = React.useMemo(function () {
        return stiffness || damping
          ? { type: "spring", stiffness: Math.max(1, stiffness), damping: damping }
          : undefined;
      }, [stiffness, damping]);

      var maxVisible = 5;

      var fit = React.useMemo(function () {
        var n = cards.length;
        var visibleDepth = Math.min(n, maxVisible) - 1;
        var totalOverflow = Math.max(0, visibleDepth * (offset / 100 - scaleStep / 2));
        var parts = aspectRatio.split("/").map(Number);
        var arW = parts[0], arH = parts[1];
        var arRatio = arW / arH;
        var tallPenalty = Math.max(0, arH / arW - 1.5) * 0.35;
        var allowedOverflow = 0.3 * Math.min(1, Math.pow(arRatio, 3)) - tallPenalty;
        var needsScale = totalOverflow > allowedOverflow;
        var scale = needsScale ? (1 + allowedOverflow) / (1 + totalOverflow) : 1;
        return { fitScale: scale, fitTranslateY: scale * totalOverflow * 50 };
      }, [cards.length]);

      return h("div", {
        style: {
          position: "relative",
          width: width,
          aspectRatio: aspectRatio.replace("/", " / "),
          overflow: "visible",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 0,
        },
      },
        h("ul", {
          style: {
            position: "relative",
            width: "100%",
            height: "100%",
            margin: 0,
            padding: 0,
            listStyle: "none",
            transform: "translateY(" + fit.fitTranslateY + "%) scale(" + fit.fitScale + ")",
            transition: "transform 0.3s cubic-bezier(.4,0,.2,1)",
          },
        },
          cards.map(function (card, i) {
            var front = i === 0;
            var vi = Math.min(i, maxVisible - 1);
            var brightness = Math.max(0.1, 1 - vi * dimStep);
            var baseZ = cards.length - i;

            return h(motion.li, {
              key: card.id,
              style: {
                position: "absolute",
                width: "100%",
                height: "100%",
                borderRadius: borderRadius,
                listStyle: "none",
                cursor: front ? "grab" : "auto",
                overflow: "hidden",
                touchAction: "none",
                zIndex: baseZ,
                transition: "box-shadow 0.3s cubic-bezier(.4,0,.2,1)",
              },
              animate: {
                top: "calc(" + (vi * -offset) + "%)",
                scale: 1 - vi * scaleStep,
                filter: "brightness(" + brightness + ")",
                zIndex: baseZ,
                transition: spring,
              },
              drag: front ? "y" : false,
              dragConstraints: { top: 0, bottom: 0 },
              dragMomentum: false,
              onDragEnd: function () { moveToEnd(i); },
              whileDrag: front
                ? { zIndex: cards.length, cursor: "grabbing", scale: 1 - i * scaleStep + 0.05, rotate: 2 }
                : {},
            },
              h("img", {
                src: card.src,
                alt: card.alt || "Card image",
                style: {
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  pointerEvents: "none",
                  display: "block",
                  transition: "filter 0.3s cubic-bezier(.4,0,.2,1)",
                },
              })
            );
          })
        )
      );
    }

    createRoot(document.getElementById("root")).render(h(CardStack));
  </script>
</body>
</html>`
}

/* -- Embed iframe generation -- */

function generateEmbedCode(
  config: ExportConfig,
  images: { id: string; src: string; alt: string }[],
): string {
  const origin = window.location.origin
  const imagesParam = encodeURIComponent(
    JSON.stringify(images.map((img) => ({ src: img.src, alt: img.alt })))
  )

  const params = new URLSearchParams({
    embed: "true",
    images: imagesParam,
    offset: String(config.offset),
    scaleStep: String(config.scaleStep),
    dimStep: String(config.dimStep),
    stiffness: String(config.stiffness),
    damping: String(config.damping),
    aspectRatio: config.aspectRatio,
    borderRadius: String(config.borderRadius),
  })

  const src = `${origin}/?${params.toString()}`

  // Compute default iframe dimensions — account for stack's upward overflow
  const [arW, arH] = config.aspectRatio.split("/").map(Number)
  const arRatio = arW / arH
  const maxVisible = 5
  const visibleDepth = Math.min(images.length, maxVisible) - 1
  const totalOverflow = Math.max(0, visibleDepth * (config.offset / 100 - config.scaleStep / 2))
  const tallPenalty = Math.max(0, arH / arW - 1.5) * 0.35
  const allowedOverflow = 0.3 * Math.min(1, arRatio ** 3) - tallPenalty
  const effectiveOverflow = Math.min(totalOverflow, Math.max(0, allowedOverflow))
  const stackHeightMultiplier = 1 + effectiveOverflow

  const iframeWidth = 400
  const iframeHeight = Math.round(iframeWidth * (arH / arW) * stackHeightMultiplier)

  return `<iframe\n  src="${src}"\n  width="${iframeWidth}"\n  height="${iframeHeight}"\n  allowtransparency="true"\n  style="border:none;background:transparent;"\n></iframe>`
}

/* -- Export dialog -- */

interface ExportHTMLDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  images: { id: string; src: string; alt: string }[]
  config: ExportConfig
}

export function ExportHTMLDialog({
  open,
  onOpenChange,
  images,
  config,
}: ExportHTMLDialogProps) {
  const [embedCopied, setEmbedCopied] = useState(false)
  const [generating, setGenerating] = useState(false)

  const buildZip = async () => {
    const html = generateHTML(config)
    const encoder = new TextEncoder()
    const htmlData = encoder.encode(html)

    const imageFiles = await Promise.all(
      SAMPLE_IMAGES.map(async (img) => {
        const res = await fetch(img.src)
        const buf = await res.arrayBuffer()
        return { name: `images/${img.filename}`, data: new Uint8Array(buf) }
      })
    )

    return createZip([
      { name: "card-stack.html", data: htmlData },
      ...imageFiles,
    ])
  }

  const downloadZip = async () => {
    setGenerating(true)
    const blob = await buildZip()
    setGenerating(false)
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "card-stack.zip"
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyEmbed = () => {
    const code = generateEmbedCode(config, images)
    navigator.clipboard.writeText(code)
    setEmbedCopied(true)
    setTimeout(() => setEmbedCopied(false), 2000)
  }

  const embedCode = generateEmbedCode(config, images)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] bg-[#0a0a0a] border-[#242424] p-6 gap-5">
        <DialogHeader>
          <DialogTitle className="text-white text-sm font-mono font-normal">
            Export
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="embed" className="gap-4">
          <TabsList className="bg-[#141414] border border-[#242424] rounded-xl h-9 p-[3px] w-full">
            <TabsTrigger
              value="embed"
              className="flex-1 rounded-lg text-xs data-[state=active]:bg-[#242424] data-[state=active]:text-white text-[#969696]"
            >
              Embed
            </TabsTrigger>
            <TabsTrigger
              value="html"
              className="flex-1 rounded-lg text-xs data-[state=active]:bg-[#242424] data-[state=active]:text-white text-[#969696]"
            >
              HTML
            </TabsTrigger>
          </TabsList>

          <TabsContent value="embed" className="flex flex-col gap-4">
            <p className="text-[#969696] text-xs leading-relaxed">
              Copy the iframe code below and paste it into your site. Adjust{" "}
              <span className="text-white font-mono">width</span> and{" "}
              <span className="text-white font-mono">height</span> on the iframe
              to control the size — the card stack scales to fit.
            </p>

            <div className="bg-[#141414] border border-[#242424] rounded-lg px-4 py-3 max-h-[120px] overflow-y-auto">
              <pre className="text-[#969696] text-[11px] leading-relaxed whitespace-pre-wrap break-all font-mono">
                {embedCode}
              </pre>
            </div>

            <button
              onClick={copyEmbed}
              className="h-[34px] w-full bg-white text-[#0a0a0a] rounded-lg text-xs font-medium hover:bg-[#e0e0e0] transition-colors cursor-pointer"
            >
              {embedCopied ? "Copied!" : "Copy embed code"}
            </button>
          </TabsContent>

          <TabsContent value="html" className="flex flex-col gap-4">
            <p className="text-[#969696] text-xs leading-relaxed">
              Download a folder with your card stack and sample images. Open{" "}
              <span className="text-white font-mono">card-stack.html</span> in a
              browser to preview.
            </p>

            <div className="bg-[#141414] border border-[#242424] rounded-lg px-4 py-3">
              <p className="text-[#969696] text-[11px] leading-relaxed">
                To use your own images, replace the files in the{" "}
                <span className="text-white font-mono">images/</span> folder or
                update the <span className="text-white font-mono">src</span> paths
                in the HTML — you can use local file paths or external URLs.
              </p>
            </div>

            <button
              onClick={downloadZip}
              disabled={generating}
              className="h-[34px] w-full bg-white text-[#0a0a0a] rounded-lg text-xs font-medium hover:bg-[#e0e0e0] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
            >
              {generating ? "Generating..." : "Download .zip"}
            </button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}