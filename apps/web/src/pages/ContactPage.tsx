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
                        <Zap size={14} className="text-[#007dff]" fill="#007dff" />
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
                            <p className="text-xs text-slate-500 mb-4 font-medium">support@floework.com</p>
                            <Button variant="link" className="text-[#007dff] h-auto p-0 font-bold text-xs uppercase tracking-wider">Send Email</Button>
                        </div>
                    </Reveal>
                    <Reveal delay={200}>
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center text-center">
                            <Twitter className="text-[#007dff] mb-4" size={24} />
                            <h3 className="text-[15px] font-bold mb-1">Twitter</h3>
                            <p className="text-xs text-slate-500 mb-4 font-medium">@floeworkapp</p>
                            <Button variant="link" className="text-[#007dff] h-auto p-0 font-bold text-xs uppercase tracking-wider">Follow Us</Button>
                        </div>
                    </Reveal>
                    <Reveal delay={300}>
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center text-center">
                            <MessageSquare className="text-[#007dff] mb-4" size={24} />
                            <h3 className="text-[15px] font-bold mb-1">Community</h3>
                            <p className="text-xs text-slate-500 mb-4 font-medium">Discord Server</p>
                            <Button variant="link" className="text-[#007dff] h-auto p-0 font-bold text-xs uppercase tracking-wider">Join Discord</Button>
                        </div>
                    </Reveal>
                </div>

                <Reveal delay={400}>
                    <div className="bg-white border border-slate-100 shadow-xl shadow-slate-100/50 rounded-[32px] p-10">
                        <h2 className="text-2xl font-semibold mb-8 tracking-tight">Send a message</h2>
                        <form className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Name</label>
                                    <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-[#007dff]/50 transition-all font-medium text-[15px]" placeholder="Your name" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Email</label>
                                    <input type="email" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-[#007dff]/50 transition-all font-medium text-[15px]" placeholder="your@email.com" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Subject</label>
                                <select className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-[#007dff]/50 transition-all font-medium text-[15px] appearance-none">
                                    <option>General Inquiry</option>
                                    <option>Feature Request</option>
                                    <option>Billing Issue</option>
                                    <option>Technical Support</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Message</label>
                                <textarea rows={5} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-[#007dff]/50 transition-all font-medium text-[15px]" placeholder="How can we help?"></textarea>
                            </div>
                            <Button className="w-full h-14 rounded-2xl bg-[#007dff] text-white hover:bg-[#007dff]/90 text-[16px] font-semibold">
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
