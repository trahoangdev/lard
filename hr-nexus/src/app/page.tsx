import Link from "next/link";
import { ArrowRight, MessageSquare, Briefcase, BarChart2, CheckCircle2, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-full">
      {/* Hero Section */}
      <section className="relative px-6 pt-24 pb-32 overflow-hidden flex flex-col items-center justify-center text-center">
        {/* Deep, vibrant radial gradients for the Awesomic premium feel */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(254,69,226,0.15),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(255,90,0,0.1),transparent_50%)] pointer-events-none" />
        
        <div className="relative z-10 max-w-5xl mx-auto w-full">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 text-[13px] font-bold tracking-[0.1em] uppercase rounded-full bg-snow border border-pebble text-obsidian shadow-subtle-2">
            <Sparkles className="w-4 h-4 text-orchid-flash" />
            The Future of Work is Here
          </div>
          
          <h1 className="text-6xl md:text-[80px] font-extrabold tracking-tight text-obsidian mb-8 leading-[1.05]">
            Turn HR Workflows Into <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orchid-flash to-ember">Simple Conversations.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-steel mb-12 max-w-3xl mx-auto leading-relaxed font-medium">
            Execute leave requests, run payroll spreadsheets, and screen candidates through a stunning AI-powered chat interface.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <Link
              href="/chat"
              className="inline-flex items-center justify-center gap-2 px-10 py-5 text-lg font-bold transition-all bg-obsidian text-snow rounded-[36px] shadow-subtle hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
            >
              Launch Workspace
              <ArrowRight className="w-6 h-6" />
            </Link>
          </div>

          {/* Premium CSS App Mockup Window */}
          <div className="mt-24 relative mx-auto w-full max-w-[1000px] h-[500px] rounded-[36px] bg-snow border border-pebble shadow-subtle overflow-hidden flex text-left transform perspective-1000 rotate-x-2 rotate-y-[-1deg] hover:rotate-0 transition-transform duration-700 ease-out">
            {/* Mockup Sidebar */}
            <div className="w-[280px] hidden md:flex flex-col bg-mist border-r border-pebble p-6">
              <div className="h-4 w-24 bg-pebble rounded-full mb-8" />
              <div className="h-12 w-full bg-snow border border-pebble rounded-[14px] shadow-subtle-2 mb-8 flex items-center px-4">
                <div className="h-4 w-32 bg-pebble rounded-full" />
              </div>
              <div className="flex-1 flex flex-col gap-4">
                <div className="h-10 w-full bg-pebble/50 rounded-lg" />
                <div className="h-10 w-full bg-pebble/30 rounded-lg" />
                <div className="h-10 w-full bg-pebble/30 rounded-lg" />
              </div>
            </div>
            
            {/* Mockup Main Chat */}
            <div className="flex-1 flex flex-col bg-mist relative">
              <div className="h-16 border-b border-pebble flex items-center px-8 bg-snow">
                <div className="h-4 w-40 bg-pebble rounded-full" />
              </div>
              <div className="flex-1 p-8 flex flex-col gap-6 overflow-hidden">
                {/* User Bubble */}
                <div className="self-end max-w-[70%] bg-obsidian text-snow rounded-[18px] rounded-tr-sm px-6 py-4 shadow-subtle">
                  <div className="h-4 w-48 bg-snow/20 rounded-full mb-2" />
                  <div className="h-4 w-32 bg-snow/20 rounded-full" />
                </div>
                {/* Bot Bubble */}
                <div className="self-start max-w-[70%] bg-snow border border-pebble rounded-[18px] rounded-tl-sm px-6 py-5 shadow-subtle-2">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 bg-orchid-flash rounded-full flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-snow" />
                    </div>
                    <div className="h-4 w-24 bg-pebble rounded-full" />
                  </div>
                  <div className="h-24 w-full bg-mist border border-pebble rounded-[14px] p-4 flex flex-col justify-between">
                    <div className="h-3 w-3/4 bg-pebble rounded-full" />
                    <div className="flex gap-2">
                      <div className="h-8 w-20 bg-obsidian rounded-full" />
                      <div className="h-8 w-20 bg-pebble rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Fake Input */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-mist via-mist to-transparent">
                <div className="h-16 w-full bg-snow border border-pebble rounded-[20px] shadow-subtle-2 flex items-center justify-between px-4">
                  <div className="h-4 w-48 bg-pebble/50 rounded-full" />
                  <div className="h-10 w-10 bg-obsidian rounded-full flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-snow" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section className="px-6 py-32 bg-snow border-t border-pebble">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-20 max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-obsidian mb-6">Built for modern teams.</h2>
            <p className="text-xl text-steel leading-relaxed">Everything you need to scale your HR operations without the administrative bloat.</p>
          </div>
          
          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Feature - Spans 2 columns */}
            <div className="md:col-span-2 flex flex-col p-10 bg-mist rounded-[48px] border border-pebble shadow-subtle-2 hover:shadow-subtle transition-shadow group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orchid-flash/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110" />
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-center w-16 h-16 mb-8 rounded-[24px] bg-snow shadow-subtle text-orchid-flash">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold text-obsidian mb-4">Conversational Leave</h3>
                <p className="text-lg text-steel leading-relaxed max-w-md mb-8">
                  Request annual or sick leave instantly via chat. Managers receive automated, beautiful cards to approve with a single click.
                </p>
                <div className="mt-auto">
                  <ul className="flex flex-col gap-3">
                    {["Natural language parsing", "Instant balance checks", "One-click manager approvals"].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-ink font-medium">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col p-10 bg-mist rounded-[48px] border border-pebble shadow-subtle-2 hover:shadow-subtle transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-ember/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110" />
              <div className="relative z-10">
                <div className="flex items-center justify-center w-16 h-16 mb-8 rounded-[24px] bg-snow shadow-subtle text-ember">
                  <BarChart2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-obsidian mb-4">Payroll Automation</h3>
                <p className="text-steel leading-relaxed mb-6">
                  Upload raw Excel files. Our AI validates data, generates bank batches, and handles email notifications.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="md:col-span-3 flex flex-col md:flex-row items-center gap-10 p-10 bg-obsidian rounded-[48px] shadow-subtle relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(254,69,226,0.15),transparent_50%)]" />
              <div className="relative z-10 flex-1">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-8 rounded-[24px] bg-snow/10 text-snow border border-snow/20 backdrop-blur-md">
                  <Briefcase className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold text-snow mb-4">Recruitment Hub</h3>
                <p className="text-lg text-pebble leading-relaxed max-w-2xl">
                  Candidates upload CVs directly to the portal. The AI engine instantly parses, scores, and ranks applicants against job requirements, saving hours of manual screening.
                </p>
              </div>
              <div className="relative z-10 shrink-0">
                 <Link
                  href="/chat"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold transition-all bg-snow text-obsidian rounded-[36px] hover:scale-105"
                >
                  Try Recruitment Demo
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-16 text-center border-t bg-mist border-pebble">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-left">
            <div className="text-[20px] font-bold tracking-tight text-obsidian">HR Nexus</div>
            <div className="text-sm text-steel mt-1">Built by LARD TEAM for Hackathon 2026</div>
          </div>
          <div className="text-sm font-medium text-steel">
            © 2026 Awesomic Workflow. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
