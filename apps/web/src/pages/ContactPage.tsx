import { ArrowLeft, Zap, Mail, MessageSquare, Twitter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Reveal from "@/components/Reveal";
import { Button } from "@/components/ui/button";

const ContactPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-[#007dff]/20">
            <nav className="border-b border-slate-100 py-4 px-6 sticky top-0 bg-white/80 backdrop-blur-md z-50">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-[14px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => navigate("/")}>
                        <img src="/favicon.svg" alt="floework" className="w-4 h-4 rounded-sm" />
                        <span className="font-bold text-[15px] tracking-tight">
                            floework<span className="text-[#007dff]">.</span>
                        </span>
                    </div>
                </div>
            </nav>

            <main className="max-w-[700px] mx-auto px-6 py-20">
                <Reveal>
                    <header className="mb-16 text-center">
                        <p className="text-[13px] font-bold text-[#007dff] uppercase tracking-widest mb-4">Support</p>
                        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.15] mb-6">
                            How can we help?
                        </h1>
                        <p className="text-xl text-slate-500 leading-relaxed font-medium">
                            Whether you have a feature request, need help with your workspace, or just want to say hi.
                        </p>
                    </header>
                </Reveal>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
                    <Reveal delay={100}>
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center text-center">
                            <Mail className="text-[#007dff] mb-4" size={24} />
                            <h3 className="text-[15px] font-bold mb-1">Email</h3>
                            <p className="text-xs text-slate-500 mb-4 font-medium">mendhu36@outlook.com</p>
                            <a href="mailto:mendhu36@outlook.com" className="text-[#007dff] font-bold text-xs uppercase tracking-wider hover:underline">Send Email</a>
                        </div>
                    </Reveal>
                    <Reveal delay={200}>
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center text-center">
                            <Twitter className="text-[#007dff] mb-4" size={24} />
                            <h3 className="text-[15px] font-bold mb-1">X.com</h3>
                            <p className="text-xs text-slate-500 mb-4 font-medium">@atharvarta</p>
                            <a href="https://x.com/atharvarta" target="_blank" rel="noopener noreferrer" className="text-[#007dff] font-bold text-xs uppercase tracking-wider hover:underline">Follow Us</a>
                        </div>
                    </Reveal>
                    <Reveal delay={300}>
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center text-center">
                            <MessageSquare className="text-[#007dff] mb-4" size={24} />
                            <h3 className="text-[15px] font-bold mb-1">Discord</h3>
                            <p className="text-xs text-slate-500 mb-4 font-medium italic">Coming soon</p>
                        </div>
                    </Reveal>
                </div>

                <Reveal delay={400}>
                    <div className="bg-white border border-slate-100 shadow-xl shadow-slate-100/50 rounded-[32px] p-10">
                        <h2 className="text-2xl font-semibold mb-8 tracking-tight">Send a message</h2>
                        <form 
                            className="space-y-6"
                            onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const name = formData.get('name');
                                const email = formData.get('email');
                                const subject = formData.get('subject');
                                const message = formData.get('message');
                                window.location.href = `mailto:mendhu36@outlook.com?subject=${encodeURIComponent(String(subject))}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)}`;
                            }}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Name</label>
                                    <input name="name" type="text" required className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-[#007dff]/50 transition-all font-medium text-[15px]" placeholder="Your name" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Email</label>
                                    <input name="email" type="email" required className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-[#007dff]/50 transition-all font-medium text-[15px]" placeholder="your@email.com" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Subject</label>
                                <input name="subject" type="text" required className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-[#007dff]/50 transition-all font-medium text-[15px]" placeholder="Subject" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Message</label>
                                <textarea name="message" rows={5} required className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-[#007dff]/50 transition-all font-medium text-[15px]" placeholder="How can we help?"></textarea>
                            </div>
                            <Button type="submit" className="w-full h-14 rounded-2xl bg-[#007dff] text-white hover:bg-[#007dff]/90 text-[16px] font-semibold">
                                Send Message
                            </Button>
                        </form>
                    </div>
                </Reveal>
            </main>
        </div>
    );
};

export default ContactPage;
