'use client'

/**
 * Wireframe shapes for the centre pane. Each Firstday section type gets a
 * distinct visual so the writer can see page rhythm at a glance.
 *
 * Grounded in the section audit (07-section-audit.md) and the reference
 * implementation (requirements/outline-builder.html).
 */

const bar = 'bg-[var(--wire,#C8CDD4)] rounded-[1px]'
const barT = `${bar} h-[9px]`    // thick bar
const barS = `${bar} h-[4px] opacity-60` // slim bar
const barN = `${bar} h-[6px]`    // normal bar
const box = 'bg-[var(--wire,#C8CDD4)] rounded-[2px] opacity-55'

/** temp-replo-hero: Two heavy bars, two light bars, a button pill */
function HeroWire() {
  return (
    <div>
      <div className={`${barT} w-[82%]`} />
      <div className={`${barT} w-[58%] mt-1`} />
      <div className={`${barS} w-[70%] mt-1`} />
      <div className={`${barS} w-[64%] mt-1`} />
      <div className="bg-[var(--accent,#3D3A9E)] opacity-50 h-[9px] w-[38px] rounded-[2px] mt-[5px]" />
    </div>
  )
}

/** image-with-text, temp-listicle-img-txt-block as split: Image box + text bars */
function SplitWire() {
  return (
    <div className="grid grid-cols-[74px_1fr] gap-2 items-center">
      <div className={`${box} h-[46px]`} />
      <div>
        <div className={`${barN} w-[80%]`} />
        <div className={`${barS} w-full mt-1`} />
        <div className={`${barS} w-[88%] mt-1`} />
        <div className={`${barS} w-[52%] mt-1`} />
      </div>
    </div>
  )
}

/** temp-listicle-img-txt-block as numbered: Large number + bars */
function NumberedWire({ number }: { number: number }) {
  return (
    <div className="grid grid-cols-[26px_1fr] gap-2 items-start">
      <div className="font-mono text-[15px] font-medium text-[var(--wire,#C8CDD4)] leading-none">
        {String(number).padStart(2, '0')}
      </div>
      <div>
        <div className={`${barN} w-[74%]`} />
        <div className={`${barS} w-full mt-1`} />
        <div className={`${barS} w-[66%] mt-1`} />
      </div>
    </div>
  )
}

/** temp-stats: Centred heading bar + three stat cards */
function StatsWire() {
  return (
    <div>
      <div className={`${barN} w-[46%] mx-auto mb-[7px]`} />
      <div className="grid grid-cols-3 gap-[5px]">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className={`${box} h-[20px] mb-1`} />
            <div className={barS} />
            <div className={`${barS} w-[70%] mt-1`} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** accordion-block, faq: Centred heading and two centred light bars */
function StackWire() {
  return (
    <div>
      <div className={`${barN} w-[52%] mx-auto mb-[6px]`} />
      <div className={`${barS} w-[88%] mx-auto mb-1`} />
      <div className={`${barS} w-[74%] mx-auto`} />
    </div>
  )
}

/** temp-science-module: Heading + tabs */
function TabsWire() {
  return (
    <div>
      <div className={`${barN} w-[48%] mx-auto mb-[7px]`} />
      <div className="flex gap-1 mb-[5px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${box} h-[6px] flex-1 ${i === 0 ? 'opacity-80' : ''}`} />
        ))}
      </div>
      <div className="grid grid-cols-[74px_1fr] gap-2 items-center">
        <div className={`${box} h-[36px]`} />
        <div>
          <div className={`${barS} w-full`} />
          <div className={`${barS} w-[88%] mt-1`} />
          <div className={`${barS} w-[60%] mt-1`} />
        </div>
      </div>
    </div>
  )
}

/** timeline-section: Three milestones */
function TimelineWire() {
  return (
    <div>
      <div className={`${barN} w-[40%] mx-auto mb-[7px]`} />
      <div className="grid grid-cols-3 gap-[5px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="text-center">
            <div className={`${box} h-[20px] mx-auto w-[80%] mb-1`} />
            <div className={`${barS} w-[60%] mx-auto mb-1`} />
            <div className={`${barS} w-[80%] mx-auto`} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** temp-marquee: Thin announcement bar */
function MarqueeWire() {
  return (
    <div className={`${bar} h-[5px] w-full opacity-40`} />
  )
}

/** temp-author: Small byline block */
function AuthorWire() {
  return (
    <div className="flex items-center gap-2">
      <div className={`${box} h-[18px] w-[18px] rounded-full`} />
      <div>
        <div className={`${barS} w-[60px]`} />
        <div className={`${barS} w-[40px] mt-0.5 opacity-40`} />
      </div>
    </div>
  )
}

/** rich-text: Simple text block */
function RichTextWire() {
  return (
    <div>
      <div className={`${barT} w-[72%]`} />
      <div className={`${barS} w-[90%] mt-1`} />
      <div className={`${barS} w-[80%] mt-1`} />
    </div>
  )
}

/** standalone-product: Product card */
function ProductWire() {
  return (
    <div className="grid grid-cols-[40px_1fr] gap-2 items-center opacity-50">
      <div className={`${box} h-[30px]`} />
      <div>
        <div className={`${barN} w-[60%]`} />
        <div className="bg-[var(--accent,#3D3A9E)] opacity-50 h-[7px] w-[30px] rounded-[2px] mt-[4px]" />
      </div>
    </div>
  )
}

/** temp-benefits-split: List with icon bullets */
function BenefitsWire() {
  return (
    <div>
      <div className={`${barN} w-[46%] mx-auto mb-[7px]`} />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-start gap-2 mb-1">
          <div className={`${box} h-[10px] w-[10px] rounded-full shrink-0 mt-0.5`} />
          <div className="flex-1">
            <div className={`${barS} w-[70%]`} />
            <div className={`${barS} w-[90%] mt-0.5`} />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Map a Firstday section type to its wireframe shape.
 */
export function SectionWire({ sectionType, number }: { sectionType: string; number?: number }) {
  switch (sectionType) {
    case 'temp-replo-hero': return <HeroWire />
    case 'temp-listicle-img-txt-block': return <NumberedWire number={number ?? 1} />
    case 'temp-stats': return <StatsWire />
    case 'accordion-block': return <StackWire />
    case 'temp-science-module': return <TabsWire />
    case 'timeline-section': return <TimelineWire />
    case 'image-with-text': return <SplitWire />
    case 'temp-marquee': return <MarqueeWire />
    case 'temp-author': return <AuthorWire />
    case 'rich-text': return <RichTextWire />
    case 'standalone-product': return <ProductWire />
    case 'temp-benefits-split': return <BenefitsWire />
    case 'faq': return <StackWire />
    default: return <StackWire />
  }
}
