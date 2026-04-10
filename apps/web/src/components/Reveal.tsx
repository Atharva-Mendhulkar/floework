import { useEffect, useRef, useState } from "react";

// ─── Scroll-reveal hook
export function useReveal(threshold = 0.15) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
            { threshold }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [threshold]);
    return { ref, visible };
}

// ─── Individual reveal wrapper
export function Reveal({
    children, delay = 0, from = "bottom",
}: {
    children: React.ReactNode; delay?: number; from?: "bottom" | "left" | "right";
}) {
    const { ref, visible } = useReveal();
    const initial =
        from === "left" ? "translateX(-30px)" :
            from === "right" ? "translateX(30px)" : "translateY(40px)";
    return (
        <div
            ref={ref}
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "none" : initial,
                transition: `opacity 0.7s ease ${delay}ms, transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}ms`,
            }}
            className="w-full"
        >
            {children}
        </div>
    );
}

export default Reveal;
