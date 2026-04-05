'use client';

import { 
  CheckCircle2, 
  ChevronRight, 
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Target
} from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

const RULES_CHECKLIST = [
  { id: 'title', label: 'Match CV title to exact job title', priority: 'HIGH', description: 'Recruiters and ATS systems look for an immediate match. We ensure your resume header matches the job title exactly.' },
  { id: 'keywords', label: 'Copy verbatim keywords from JD', priority: 'HIGH', description: 'We extract the exact phrases used in the job description and weave them naturally into your experience.' },
  { id: 'structure', label: 'Mirror JD structure in experience section', priority: 'HIGH', description: 'If the job description emphasizes specific responsibilities first, we reorder your experience to highlight those matching areas.' },
  { id: 'skills', label: 'Include all required skills explicitly', priority: 'HIGH', description: 'Never assume a skill is implied. If they ask for "Team Leadership", we state "Team Leadership".' },
  { id: 'achievements', label: 'Add quantifiable achievements (%, £, time)', priority: 'HIGH', description: 'Vague statements are replaced with hard numbers (e.g., "Increased efficiency by 25%").' },
  { id: 'acronyms', label: 'Include both acronyms AND full terms', priority: 'MEDIUM', description: 'Ensures compatibility with both human readers and keyword-based search systems.' },
  { id: 'ats', label: 'Check ATS formatting (Single column, no tables)', priority: 'HIGH', description: 'Our output is strictly single-column, plain text compatible to avoid parsing errors in legacy systems.' },
  { id: 'cl_hook', label: 'Cover Letter: Hook with company-specific enthusiasm', priority: 'HIGH', description: 'No generic "To whom it may concern". We start with a specific reason why you want to work for THIS company.' },
  { id: 'cl_skills', label: 'Cover Letter: List technical skills using JD terms', priority: 'HIGH', description: 'Your cover letter acts as a bridge, explicitly linking your skills to their requirements.' },
  { id: 'cl_tone', label: 'Cover Letter: Human tone (conversational)', priority: 'HIGH', description: 'We avoid robotic, overly formal language in favor of a professional yet conversational tone.' },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Hirre</h1>
          </Link>
          <Link href="/" className="text-sm font-bold text-primary hover:opacity-80 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back to App
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-foreground mb-4 tracking-tight">How our AI Tailoring Works</h2>
          <p className="text-lg text-muted-foreground">
            We don&apos;t just rewrite your resume; we strategically re-engineer it to pass ATS filters and impress human recruiters.
          </p>
        </div>

        {/* Process Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
            <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-foreground">1. Deep Analysis</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Our AI performs a linguistic analysis of the job description to identify core competencies and hidden keywords.
            </p>
          </div>
          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
            <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-foreground">2. Strategic Mapping</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We map your existing experience to the JD, rephrasing your achievements to use the employer&apos;s preferred terminology.
            </p>
          </div>
          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
            <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-foreground">3. ATS Validation</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The final output is formatted to be 100% readable by all major ATS platforms (Workday, Greenhouse, Lever).
            </p>
          </div>
        </div>

        {/* Detailed Rules */}
        <div className="bg-card rounded-3xl shadow-sm border border-border overflow-hidden">
          <div className="bg-foreground p-8 text-background">
            <h3 className="text-2xl font-bold flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-primary" />
              The Tailoring Rules Checklist
            </h3>
            <p className="text-muted-foreground mt-2">Every resume we generate follows these strict professional guidelines.</p>
          </div>
          <div className="p-8">
            <div className="space-y-8">
              {RULES_CHECKLIST.map((rule) => (
                <div key={rule.id} className="flex items-start gap-4 group">
                  <div className="mt-1 bg-muted p-2 rounded-lg group-hover:bg-primary/10 transition-colors">
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-bold text-foreground">{rule.label}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        rule.priority === 'HIGH' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'
                      }`}>
                        {rule.priority} PRIORITY
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{rule.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <Link 
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            <Sparkles className="w-6 h-6" />
            Start Tailoring Now
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-muted-foreground">© 2026 Hirre. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
