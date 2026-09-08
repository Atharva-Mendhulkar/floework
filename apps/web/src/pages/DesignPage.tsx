import { useNavigate } from "react-router-dom";
import { ArrowLeft, Palette, Type, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Color Palette Data
const brandColors = [
  { name: "Floework Blue", hex: "#007dff", hsl: "hsl(210, 100%, 50%)", role: "Primary - CTA, links, active states" },
  { name: "Deep Navy", hex: "#0f172a", hsl: "hsl(222, 47%, 11%)", role: "Foreground text, headings" },
  { name: "Slate 500", hex: "#64748b", hsl: "hsl(215, 16%, 47%)", role: "Secondary text, descriptions" },
  { name: "Surface White", hex: "#ffffff", hsl: "hsl(0, 0%, 100%)", role: "Background, cards, containers" },
  { name: "Slate 50", hex: "#f8fafc", hsl: "hsl(210, 40%, 98%)", role: "Subtle backgrounds, sections" },
  { name: "Border Gray", hex: "#e2e8f0", hsl: "hsl(214, 32%, 91%)", role: "Borders, dividers, separators" },
];

const accentColors = [
  { name: "Purple Glow", hex: "#a855f7", role: "Ambient lighting, hero gradients" },
  { name: "Cyan Accent", hex: "#22d3ee", role: "Ambient lighting, visual depth" },
  { name: "Orange Warmth", hex: "#f97316", role: "Ambient lighting, energy" },
  { name: "Emerald Life", hex: "#34d399", role: "Success states, positive feedback" },
];

const DesignPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-foreground transition-colors">
            <ArrowLeft size={16} />
            Back to Home
          </button>
          <span className="font-bold text-xl tracking-tight text-foreground">floework<span className="text-[#007dff]">.</span></span>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[10%] left-[-10%] h-[400px] w-[400px] rounded-full bg-purple-500/10 blur-[100px]"></div>
          <div className="absolute top-[20%] right-[-5%] h-[350px] w-[350px] rounded-full bg-cyan-400/10 blur-[80px]"></div>
          <div className="absolute bottom-[0%] left-[30%] h-[300px] w-[400px] rounded-full bg-orange-500/8 blur-[100px]"></div>
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
              <Palette size={14} className="text-[#007dff]" />
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Design System</span>
            </div>
          </div>
          <h1 className="text-[40px] sm:text-[56px] md:text-[72px] font-semibold tracking-tight leading-[1.05] text-foreground mb-6">
            Crafting <br />
            <span className="text-[#007dff]">floework.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 max-w-[600px] leading-relaxed font-medium">
            From logomark to interface - every design decision in floework is intentional.
            Here's how we built a visual identity for human-aware productivity.
          </p>
        </div>
      </section>

      {/* ─── Logo Evolution ─────────────────────────────────────────── */}
      <section className="py-16 px-6 md:py-24 border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={16} className="text-[#007dff]" />
            <span className="text-[12px] font-bold tracking-wider uppercase text-slate-400">Logo & Wordmark</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">The floework Identity</h2>
          <p className="text-slate-500 text-lg max-w-[560px] mb-12 leading-relaxed">
            The name "floework" fuses <strong className="text-foreground">flow</strong> (the psychological state of deep focus)
            with <strong className="text-foreground">work</strong> (productive output). The blue period
            <span className="text-[#007dff] font-bold text-xl mx-1">.</span>
            anchors the wordmark.
          </p>

          {/* Logo Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Primary Logo - Light */}
            <div className="group rounded-2xl border border-slate-200 bg-white p-8 flex flex-col items-center justify-center min-h-[220px] hover:shadow-lg hover:border-slate-300 transition-all duration-300">
              <span className="font-bold text-4xl tracking-tight text-foreground mb-4">floework<span className="text-[#007dff]">.</span></span>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">Primary - Light</span>
            </div>

            {/* Primary Logo - Dark */}
            <div className="group rounded-2xl border border-slate-800 bg-[#0f172a] p-8 flex flex-col items-center justify-center min-h-[220px] hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
              <span className="font-bold text-4xl tracking-tight text-white mb-4">floework<span className="text-[#007dff]">.</span></span>
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Primary - Dark</span>
            </div>

            {/* Favicon / Icon */}
            <div className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 flex flex-col items-center justify-center min-h-[220px] hover:shadow-lg hover:border-slate-300 transition-all duration-300">
              <div className="w-20 h-20 rounded-2xl bg-[#007dff] flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
                <span className="font-bold text-3xl text-white">f<span className="text-blue-200">.</span></span>
              </div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">Favicon / App Icon</span>
            </div>
          </div>

          {/* Design Rationale */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-8">
              <h3 className="font-semibold text-lg mb-3 text-foreground">Why Lowercase?</h3>
              <p className="text-slate-500 leading-relaxed">
                Lowercase signals approachability and calm. Productivity tools should feel
                like a natural extension of thought, not a corporate mandate. The absence of capitals
                removes visual tension while the bold weight maintains authority.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-8">
              <h3 className="font-semibold text-lg mb-3 text-foreground">Why the Blue Period?</h3>
              <p className="text-slate-500 leading-relaxed">
                The <span className="text-[#007dff] font-bold text-xl">.</span> period in
                <strong className="text-foreground"> floework</strong> does three things:
                it creates a visual anchor, it signals "completion" (finishing tasks), and
                it introduces the primary brand color at the smallest possible scale. Less is more.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Color Palette ──────────────────────────────────────────── */}
      <section className="py-16 px-6 md:py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Palette size={16} className="text-[#007dff]" />
            <span className="text-[12px] font-bold tracking-wider uppercase text-slate-400">Color System</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">Color Palette</h2>
          <p className="text-slate-500 text-lg max-w-[560px] mb-12 leading-relaxed">
            Built on a clean white canvas with a single dominant accent. Every color has a job.
          </p>

          {/* Brand Colors Grid */}
          <h3 className="font-semibold text-sm uppercase tracking-widest text-slate-400 mb-6">Core Brand Colors</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-14">
            {brandColors.map((color) => (
              <div key={color.hex} className="group">
                <div
                  className="w-full aspect-square rounded-2xl border border-slate-200 mb-3 shadow-sm group-hover:shadow-md group-hover:scale-[1.03] transition-all duration-300 cursor-pointer"
                  style={{ backgroundColor: color.hex }}
                />
                <p className="font-semibold text-[13px] text-foreground">{color.name}</p>
                <p className="text-[12px] text-slate-400 font-mono mt-0.5">{color.hex}</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">{color.role}</p>
              </div>
            ))}
          </div>

          {/* Ambient / Accent Colors */}
          <h3 className="font-semibold text-sm uppercase tracking-widest text-slate-400 mb-6">Ambient & Accent</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {accentColors.map((color) => (
              <div key={color.hex} className="group">
                <div
                  className="w-full h-24 rounded-2xl mb-3 shadow-sm group-hover:shadow-md group-hover:scale-[1.02] transition-all duration-300"
                  style={{ background: `linear-gradient(135deg, ${color.hex}40, ${color.hex}15)` }}
                />
                <p className="font-semibold text-[13px] text-foreground">{color.name}</p>
                <p className="text-[12px] text-slate-400 font-mono mt-0.5">{color.hex}</p>
                <p className="text-[11px] text-slate-400 mt-1">{color.role}</p>
              </div>
            ))}
          </div>

          {/* Color Philosophy */}
          <div className="rounded-2xl bg-white border border-slate-200 p-8 mt-8">
            <h3 className="font-semibold text-lg mb-3 text-foreground">Color Philosophy</h3>
            <p className="text-slate-500 leading-relaxed max-w-[700px]">
              The hero section uses diffuse ambient glow - purple, cyan, orange, and emerald spheres
              rendered with CSS blur filters - to create a sense of energy without visual clutter.
              These colors never appear in UI controls. The interface itself uses only the six core
              brand colors, keeping the experience calm and focused while the landing page communicates dynamism.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Typography ─────────────────────────────────────────────── */}
      <section className="py-16 px-6 md:py-24 border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Type size={16} className="text-[#007dff]" />
            <span className="text-[12px] font-bold tracking-wider uppercase text-slate-400">Typography</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">Type System</h2>
          <p className="text-slate-500 text-lg max-w-[560px] mb-12 leading-relaxed">
            Clean, geometric sans-serif typography with tight tracking for headings and relaxed leading for body text.
          </p>

          {/* Type Scale */}
          <div className="space-y-8 mb-12">
            <div className="flex flex-col md:flex-row md:items-baseline gap-4 pb-6 border-b border-slate-100">
              <span className="text-[11px] font-mono text-slate-400 w-32 shrink-0">72px / Semibold</span>
              <span className="text-[72px] font-semibold tracking-tight leading-none text-foreground">Display</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-baseline gap-4 pb-6 border-b border-slate-100">
              <span className="text-[11px] font-mono text-slate-400 w-32 shrink-0">40px / Semibold</span>
              <span className="text-[40px] font-semibold tracking-tight leading-tight text-foreground">Heading One</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-baseline gap-4 pb-6 border-b border-slate-100">
              <span className="text-[11px] font-mono text-slate-400 w-32 shrink-0">24px / Semibold</span>
              <span className="text-[24px] font-semibold tracking-tight text-foreground">Heading Two</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-baseline gap-4 pb-6 border-b border-slate-100">
              <span className="text-[11px] font-mono text-slate-400 w-32 shrink-0">16px / Medium</span>
              <span className="text-[16px] font-medium text-slate-500 leading-relaxed">Body text uses medium weight with relaxed line-height for comfortable reading across long sessions.</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-baseline gap-4 pb-6 border-b border-slate-100">
              <span className="text-[11px] font-mono text-slate-400 w-32 shrink-0">11px / Bold</span>
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">LABEL / OVERLINE TEXT</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Design Principles ──────────────────────────────────────── */}
      <section className="py-16 px-6 md:py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-[#007dff]" />
            <span className="text-[12px] font-bold tracking-wider uppercase text-slate-400">Principles</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-12">Design Principles</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                title: "Calm Over Noise",
                desc: "White space is a feature, not wasted screen. Every pixel of padding creates breathing room for focused thought.",
              },
              {
                num: "02",
                title: "One Accent Rule",
                desc: "A single dominant blue (#007dff) for all interactive elements. No competing colors fight for attention in the UI.",
              },
              {
                num: "03",
                title: "Motion With Purpose",
                desc: "Animations serve comprehension - slide-up reveals, smooth transitions, and ambient glow create perceived responsiveness without distraction.",
              },
            ].map((p) => (
              <div key={p.num} className="rounded-2xl bg-white border border-slate-200 p-8 hover:shadow-md hover:border-slate-300 transition-all duration-300">
                <span className="text-[#007dff] font-bold text-sm font-mono mb-3 block">{p.num}</span>
                <h3 className="font-semibold text-lg mb-3 text-foreground">{p.title}</h3>
                <p className="text-slate-500 leading-relaxed text-[15px]">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA */}
      <section className="py-20 px-6 md:py-28 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4 text-foreground">
            See it in action
          </h2>
          <p className="text-slate-500 text-lg mb-8">
            Every design decision above is live in the product.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              className="h-12 px-8 rounded-2xl bg-[#007dff] text-white hover:bg-[#007dff]/90 text-[15px] font-medium shadow-lg shadow-blue-500/20"
              onClick={() => navigate("/register")}
            >
              Start for Free
            </Button>
            <Button
              variant="outline"
              className="h-12 px-8 rounded-2xl border-slate-200 text-foreground hover:bg-slate-50 text-[15px] font-medium"
              onClick={() => navigate("/features")}
            >
              View Features
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-6 text-center text-slate-400 text-[13px]">
        <p>© {new Date().getFullYear()} floework. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default DesignPage;
