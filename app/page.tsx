'use client';

import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { 
  FileText, 
  Briefcase, 
  CheckCircle2, 
  Copy, 
  Download, 
  Loader2, 
  Sparkles, 
  AlertCircle,
  ChevronRight,
  FileCheck,
  Mail,
  Key,
  Upload,
  X,
  FileUp,
  FileDown,
  Settings,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import * as pdfjs from 'pdfjs-dist';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Link from 'next/link';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

const RULES_CHECKLIST = [
  { id: 'title', label: 'Match CV title to exact job title', priority: 'HIGH' },
  { id: 'keywords', label: 'Copy verbatim keywords from JD', priority: 'HIGH' },
  { id: 'structure', label: 'Mirror JD structure in experience section', priority: 'HIGH' },
  { id: 'skills', label: 'Include all required skills explicitly', priority: 'HIGH' },
  { id: 'achievements', label: 'Add quantifiable achievements (%, £, time)', priority: 'HIGH' },
  { id: 'acronyms', label: 'Include both acronyms AND full terms', priority: 'MEDIUM' },
  { id: 'ats', label: 'Check ATS formatting (Single column, no tables)', priority: 'HIGH' },
  { id: 'cl_hook', label: 'Cover Letter: Hook with company-specific enthusiasm', priority: 'HIGH' },
  { id: 'cl_skills', label: 'Cover Letter: List technical skills using JD terms', priority: 'HIGH' },
  { id: 'cl_tone', label: 'Cover Letter: Human tone (conversational)', priority: 'HIGH' },
];

export default function ResumeTailorApp() {
  const [jobDescription, setJobDescription] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [result, setResult] = useState<{ tailoredResume: string; coverLetter: string } | null>(null);
  const [error, setError] = useState<{ message: string; type: 'general' | 'api_key' | 'quota' | 'pdf' }>({ message: '', type: 'general' });
  const [activeTab, setActiveTab] = useState<'resume' | 'coverLetter'>('resume');
  const [userApiKey, setUserApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Load API key from local storage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('resume_tailor_api_key');
    if (savedKey) setUserApiKey(savedKey);
  }, []);

  const saveApiKey = (key: string) => {
    setUserApiKey(key);
    localStorage.setItem('resume_tailor_api_key', key);
    setShowSettings(false);
  };

  const getAIClient = () => {
    const key = userApiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    if (!key) return null;
    return new GoogleGenAI({ apiKey: key });
  };

  const extractTextFromPDF = async (file: File) => {
    setIsParsing(true);
    setError({ message: '', type: 'general' });
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      if (!fullText.trim()) {
        throw new Error('No text could be extracted from this PDF. It might be an image-based PDF.');
      }
      
      setResumeText(fullText);
    } catch (err: any) {
      console.error('PDF Extraction Error:', err);
      setError({ 
        message: err.message || 'Failed to extract text from PDF. Please try a different file or copy-paste your resume text.', 
        type: 'pdf' 
      });
      setResumeFile(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError({ message: 'Please upload a PDF file.', type: 'pdf' });
        return;
      }
      setResumeFile(file);
      extractTextFromPDF(file);
    }
  };

  const removeFile = () => {
    setResumeFile(null);
    setResumeText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTailor = async () => {
    if (!jobDescription || !resumeText) {
      setError({ message: 'Please provide both the job description and your resume (upload a PDF).', type: 'general' });
      return;
    }

    const ai = getAIClient();
    if (!ai) {
      setError({ 
        message: 'Gemini API Key is missing. Please add your own API key in the settings.', 
        type: 'api_key' 
      });
      setShowSettings(true);
      return;
    }

    setIsLoading(true);
    setError({ message: '', type: 'general' });

    try {
      const model = "gemini-3.1-pro-preview";
      const prompt = `
        Act as an expert resume tailor and career coach. 
        Your task is to take the provided resume and job description, then create a tailored version highlighting the most relevant skills and experiences.
        
        ### JOB DESCRIPTION:
        ${jobDescription}
        
        ### CURRENT RESUME:
        ${resumeText}
        
        ### TAILORING RULES (CV):
        1. Match CV title to exact job title.
        2. Copy verbatim keywords from JD. Use EXACT phrases.
        3. Mirror JD structure in experience section. If they have sections, use same headers.
        4. Include all required skills explicitly. Don't assume they'll infer skills.
        5. Add quantifiable achievements (Numbers: %, $, time saved, records processed).
        6. Include both acronyms AND full terms (e.g., 'Customer Relationship Management (CRM)').
        7. Add Values Alignment section if company lists values.
        8. ATS Formatting: Single column, clear headers (EXPERIENCE, EDUCATION, SKILLS), plain text contact info at top.
        9. NO headers/footers, NO images/logos, NO tables/columns, NO fancy templates, NO text boxes.
        
        ### TAILORING RULES (COVER LETTER):
        1. Paragraph 1: Hook with company-specific enthusiasm. Mention something specific about THIS company.
        2. Paragraph 2: List technical skills using their terms. Use exact terminology from JD.
        3. Paragraph 3: Give relevant experience example with numbers. Brief story with quantifiable result.
        4. Paragraph 4: Explain why THIS role excites you. Reference something specific from JD.
        5. Paragraph 5: Confirm logistics (location, availability) and close.
        6. Keep under 400 words. Concise and impactful.
        7. Use human tone (contractions, conversational). Avoid "I am writing to express my interest...".
        
        ### OUTPUT FORMAT:
        Return a JSON object with two keys: "tailoredResume" and "coverLetter". 
        The content should be in Markdown format.
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tailoredResume: { type: Type.STRING },
              coverLetter: { type: Type.STRING }
            },
            required: ["tailoredResume", "coverLetter"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      setResult(data);
    } catch (err: any) {
      console.error('AI Tailoring Error:', err);
      
      const errorMessage = err?.message || String(err);
      
      if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('401') || errorMessage.includes('403')) {
        setError({ 
          message: 'Invalid API Key. Please check your Gemini API key in the Secrets panel and ensure it has the correct permissions.', 
          type: 'api_key' 
        });
      } else if (errorMessage.includes('429') || errorMessage.includes('quota')) {
        setError({ 
          message: 'API Quota exceeded. Please try again in a few minutes or check your billing status.', 
          type: 'quota' 
        });
      } else if (errorMessage.includes('model') && errorMessage.includes('not found')) {
        setError({ 
          message: 'The selected AI model is currently unavailable. Please try again later.', 
          type: 'general' 
        });
      } else {
        setError({ 
          message: 'An unexpected error occurred while tailoring your resume. Please try again.', 
          type: 'general' 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadAsDocx = async () => {
    if (!result) return;
    setIsDownloading(true);
    try {
      const content = activeTab === 'resume' ? result.tailoredResume : result.coverLetter;
      const lines = content.split('\n');
      const paragraphs = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('# ')) {
          return new Paragraph({
            text: trimmed.replace('# ', ''),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
          });
        } else if (trimmed.startsWith('## ')) {
          return new Paragraph({
            text: trimmed.replace('## ', ''),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          });
        } else if (trimmed.startsWith('### ')) {
          return new Paragraph({
            text: trimmed.replace('### ', ''),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 160, after: 80 },
          });
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return new Paragraph({
            text: trimmed.substring(2),
            bullet: { level: 0 },
            spacing: { after: 100 },
          });
        } else if (trimmed) {
          return new Paragraph({
            children: [new TextRun(trimmed)],
            spacing: { after: 120 },
          });
        }
        return new Paragraph({ text: '' });
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs,
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${activeTab === 'resume' ? 'Tailored_Resume' : 'Cover_Letter'}.docx`);
    } catch (err) {
      console.error('DOCX Download Error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadAsPdf = async () => {
    if (!contentRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          // Inject a style block into the cloned document to override oklch colors
          // which html2canvas cannot parse. This ensures the PDF export works
          // even with Tailwind CSS v4's modern color functions.
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * {
              border-color: #e1e1da !important; /* border */
            }
            .prose {
              color: #3d3826 !important; /* foreground */
              background-color: #faf8f1 !important; /* background */
            }
            h1, h2, h3, h4, h5, h6 {
              color: #3d3826 !important; /* foreground */
            }
            p, li, span, div {
              color: #3d3826 !important; /* foreground */
            }
            a {
              color: #cb6441 !important; /* primary */
            }
            strong {
              color: #3d3826 !important;
            }
            code {
              color: #cb6441 !important;
              background-color: #f3f0e7 !important; /* muted */
            }
            pre {
              background-color: #141414 !important; /* destructive/dark */
              color: #f8fafc !important;
            }
            blockquote {
              border-left-color: #e1e1da !important;
              color: #525044 !important; /* secondary-foreground */
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${activeTab === 'resume' ? 'Tailored_Resume' : 'Cover_Letter'}.pdf`);
    } catch (err) {
      console.error('PDF Download Error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Hirre</h1>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/how-it-works" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              How it works
              <ExternalLink className="w-3 h-3" />
            </Link>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-all"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="bg-card p-6 rounded-2xl shadow-sm border border-primary/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-foreground">
                    <Key className="w-5 h-5 text-primary" />
                    API Configuration
                  </h3>
                  <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-muted rounded-lg">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Provide your own Gemini API key to use the service. Your key is stored locally in your browser.
                </p>
                <div className="flex gap-2">
                  <input 
                    type="password"
                    placeholder="Enter your Gemini API Key..."
                    className="flex-1 p-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm text-foreground"
                    value={userApiKey}
                    onChange={(e) => setUserApiKey(e.target.value)}
                  />
                  <button 
                    onClick={() => saveApiKey(userApiKey)}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                  >
                    Save Key
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Don&apos;t have a key? Get one for free at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google AI Studio</a>.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Hero Section */}
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight"
          >
            Land your dream job with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/80">AI-powered precision.</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Tailor your resume and cover letter to any job description in seconds. 
            Optimized for ATS systems and human recruiters.
          </motion.p>
        </div>

        {!result ? (
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Input Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-lg text-foreground">Job Description</h3>
                </div>
                <textarea 
                  className="w-full h-64 p-4 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none text-sm text-foreground"
                  placeholder="Paste the full job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>

              <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-lg text-foreground">Your Resume (PDF)</h3>
                </div>
                
                <div 
                  className={`relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-4 ${
                    resumeFile ? 'border-primary/20 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted'
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  {isParsing ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                      <p className="text-sm font-medium text-muted-foreground">Extracting text from PDF...</p>
                    </div>
                  ) : resumeFile ? (
                    <div className="flex flex-col items-center gap-4 w-full">
                      <div className="bg-card p-4 rounded-xl shadow-sm border border-border flex items-center gap-3 w-full max-w-sm">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <FileUp className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{resumeFile.name}</p>
                          <p className="text-xs text-muted-foreground">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile();
                          }}
                          className="p-1 hover:bg-muted rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">Click or drag to replace file</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-muted p-4 rounded-full">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-foreground">Click to upload or drag and drop</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF files only (max 10MB)</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {error.message && (
                <div className={`flex items-start gap-3 p-4 rounded-xl border ${
                  error.type === 'api_key' ? 'bg-amber-50 border-amber-100 text-amber-800' : 
                  error.type === 'quota' ? 'bg-blue-50 border-blue-100 text-blue-800' :
                  'bg-red-50 border-red-100 text-red-800'
                }`}>
                  {error.type === 'api_key' ? <Key className="w-5 h-5 mt-0.5" /> : <AlertCircle className="w-5 h-5 mt-0.5" />}
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1">
                      {error.type === 'api_key' ? 'API Configuration Issue' : 
                       error.type === 'quota' ? 'Quota Limit Reached' : 
                       error.type === 'pdf' ? 'PDF Upload Issue' :
                       'Error'}
                    </p>
                    <p className="text-sm leading-relaxed">{error.message}</p>
                    {error.type === 'api_key' && (
                      <button 
                        onClick={() => setShowSettings(true)}
                        className="text-xs font-bold underline mt-2"
                      >
                        Open Settings
                      </button>
                    )}
                  </div>
                </div>
              )}

              <button 
                onClick={handleTailor}
                disabled={isLoading || isParsing || !resumeText}
                className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Tailoring your application...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    Tailor My Application
                  </>
                )}
              </button>
            </motion.div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            {/* Results Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card p-4 rounded-2xl shadow-sm border border-border">
              <div className="flex p-1 bg-muted rounded-xl w-full md:w-auto">
                <button 
                  onClick={() => setActiveTab('resume')}
                  className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'resume' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileCheck className="w-4 h-4" />
                  Tailored Resume
                </button>
                <button 
                  onClick={() => setActiveTab('coverLetter')}
                  className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'coverLetter' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  Cover Letter
                </button>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={downloadAsDocx}
                    disabled={isDownloading}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                    DOCX
                  </button>
                  <button 
                    onClick={downloadAsPdf}
                    disabled={isDownloading}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-bold hover:bg-muted transition-all disabled:opacity-50"
                  >
                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    PDF
                  </button>
                </div>
                <button 
                  onClick={() => copyToClipboard(activeTab === 'resume' ? result.tailoredResume : result.coverLetter)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-bold hover:bg-muted transition-all"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
                <button 
                  onClick={() => setResult(null)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-bold hover:opacity-90 transition-all"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Result Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-card p-8 md:p-12 rounded-3xl shadow-sm border border-border min-h-[800px] prose prose-slate max-w-none overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      ref={contentRef}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="bg-card"
                    >
                      <ReactMarkdown>
                        {activeTab === 'resume' ? result.tailoredResume : result.coverLetter}
                      </ReactMarkdown>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Sidebar Checklist */}
              <div className="space-y-6">
                <div className="bg-primary p-6 rounded-2xl text-primary-foreground shadow-lg shadow-primary/10">
                  <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    AI Insights
                  </h4>
                  <p className="text-primary-foreground/80 text-sm leading-relaxed">
                    We&apos;ve optimized your {activeTab} using the exact keywords from the job description. 
                    The structure has been mirrored to match the recruiter&apos;s expectations.
                  </p>
                </div>

                <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
                  <h4 className="font-bold text-foreground mb-4">Applied Rules</h4>
                  <div className="space-y-3">
                    {RULES_CHECKLIST.filter(r => activeTab === 'resume' ? !r.id.startsWith('cl_') : r.id.startsWith('cl_') || r.id === 'keywords').map((rule) => (
                      <div key={rule.id} className="flex items-center gap-3">
                        <div className="bg-green-100 p-0.5 rounded-full">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">{rule.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-muted p-6 rounded-2xl border border-border">
                  <h4 className="font-bold text-foreground text-sm mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-primary" />
                    Next Steps
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4">
                    <li>Proofread for any AI hallucinations or minor errors.</li>
                    <li>Ensure all contact information is correct.</li>
                    <li>Save as .docx for maximum ATS compatibility.</li>
                    <li>Double-check quantifiable numbers for accuracy.</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="bg-muted p-1.5 rounded-lg">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">Hirre</span>
          </div>
          <p className="text-sm text-muted-foreground mb-8">Helping professionals land their next big role with AI.</p>
          <div className="flex justify-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#" className="hover:text-primary">Privacy Policy</a>
            <a href="#" className="hover:text-primary">Terms of Service</a>
            <a href="#" className="hover:text-primary">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
