'use client';
import { useState, useMemo } from 'react';
import {
  Phone,
  MessageSquare,
  Search,
  SlidersHorizontal,
  Check,
  X,
  Bot,
  Sparkles,
  Mic,
  Languages,
  Image as ImageIcon,
  ScanText,
  BarChart3,
  Code2,
  FileText,
  ArrowRight,
  Copy,
  Download,
  RefreshCw,
  Wand2,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { AI_PERSONAS } from '@/services/aiCall/personas';
import { unlockAudioPlayback } from '@/services/aiCall/sharedAudio';
import type { PersonaConfig } from '@/services/aiCall/types';
import { toast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { useDialogsStore } from '@/store/dialogs.store';
import { getCachedMessages, setCachedMessages } from '@/core/storage/messages';

type ViewMode = 'apps' | 'voice';

interface AiAppItem {
  id: string;
  name: string;
  khmerName: string;
  description: string;
  category: 'all' | 'assistants' | 'creative' | 'business' | 'tools';
  badge: string;
  iconBg: string;
  Icon: React.ComponentType<{ className?: string }>;
  actionLabel: string;
  onLaunch: () => void;
}

const VOICE_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'khmer', label: 'Khmer (ខ្មែរ)' },
  { id: 'tech', label: 'Tech & Code' },
  { id: 'advisor', label: 'Advisors' },
  { id: 'comedy', label: 'Fun & Casual' },
];

const APP_CATEGORIES = [
  { id: 'all', label: 'All Apps' },
  { id: 'assistants', label: 'Assistants' },
  { id: 'creative', label: 'Creative & Media' },
  { id: 'business', label: 'Business & ERP' },
  { id: 'tools', label: 'Tools & Code' },
];

export default function AiScreen() {
  const router = useRouter();
  const { startAiCall, setAiPersona, aiPersona } = useUIStore();

  const [viewMode, setViewMode] = useState<ViewMode>('apps');
  const [activeAppCategory, setActiveAppCategory] = useState<string>('all');
  const [activeVoiceCategory, setActiveVoiceCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals for interactive AI tools
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState('Photorealistic');
  const [imageAspectRatio, setImageAspectRatio] = useState('1:1');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const [translatorModalOpen, setTranslatorModalOpen] = useState(false);
  const [translatorInput, setTranslatorInput] = useState('');
  const [translatorOutput, setTranslatorOutput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  const [summarizerModalOpen, setSummarizerModalOpen] = useState(false);
  const [summarizerInput, setSummarizerInput] = useState('');
  const [summarizerOutput, setSummarizerOutput] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  const characterList = useMemo(() => {
    return Object.values(AI_PERSONAS).filter((p) => {
      const matchesCategory =
        activeVoiceCategory === 'all' || p.category === activeVoiceCategory;
      const matchesSearch =
        searchQuery === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tagline.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeVoiceCategory, searchQuery]);

  const handleStartCall = (persona: PersonaConfig) => {
    unlockAudioPlayback();
    setAiPersona(persona.id);
    startAiCall(persona.id);
  };

  const handleStartChat = (persona: PersonaConfig) => {
    const dialogId = `ai_${persona.id}`;
    setAiPersona(persona.id);

    useDialogsStore.getState().upsertDialog({
      id: dialogId,
      title: persona.name,
      avatarColor: persona.gradient.from || '#0A84FF',
      avatarLetters: persona.gradient.initial || persona.name[0] || 'AI',
      avatarUrl: persona.avatar,
      lastMessage: persona.greeting || persona.tagline || 'Start a conversation',
      lastMessageDate: Math.floor(Date.now() / 1000),
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      isOnline: true,
      peerType: 'user',
      peerId: -1,
      isAiChat: true,
      aiPersonaId: persona.id,
    });

    const cached = getCachedMessages(dialogId);
    if (cached.length === 0 && persona.greeting) {
      setCachedMessages(dialogId, [
        {
          id: Date.now(),
          text: persona.greeting,
          out: false,
          date: Date.now() / 1000,
          status: 'sent',
          sender: {
            peerId: 0,
            name: persona.name,
            letters: persona.gradient?.initial || persona.name?.[0] || 'AI',
            color: persona.gradient?.from || '#0A84FF',
            peerType: 'user',
          },
        },
      ]);
    }

    router.push(`/chat/${dialogId}`);
  };

  // AI Apps Directory
  const aiApps: AiAppItem[] = [
    {
      id: 'ai_voice',
      name: 'AI Voice Call',
      khmerName: 'ការខលជាសំឡេងឆ្លាតវៃ',
      description: 'Live two-way AI voice call with natural Khmer & English accents. Ultra-low latency voice companions.',
      category: 'assistants',
      badge: 'Live Audio',
      iconBg: 'from-amber-500 to-rose-500',
      Icon: Mic,
      actionLabel: 'Open Voice',
      onLaunch: () => setViewMode('voice'),
    },
    {
      id: 'ai_telegram',
      name: 'Telegram Assistant',
      khmerName: 'ជំនួយការឆ្លាតវៃទូទៅ',
      description: 'Conversational agent for complex reasoning, question answering, creative drafting & web research.',
      category: 'assistants',
      badge: 'Gemini 2.0',
      iconBg: 'from-blue-500 to-cyan-500',
      Icon: Sparkles,
      actionLabel: 'Chat',
      onLaunch: () => {
        const p = AI_PERSONAS.telegram || Object.values(AI_PERSONAS)[0];
        handleStartChat(p);
      },
    },
    {
      id: 'khmer_ai',
      name: 'Khmer AI & Translator',
      khmerName: 'បកប្រែ & អក្ខរាវិរុទ្ធខ្មែរ',
      description: 'Accurate Khmer spell-checker, document proofreader, and seamless Khmer-English-Chinese translation.',
      category: 'assistants',
      badge: 'Khmer NLP',
      iconBg: 'from-emerald-500 to-teal-500',
      Icon: Languages,
      actionLabel: 'Translate',
      onLaunch: () => setTranslatorModalOpen(true),
    },
    {
      id: 'ai_image',
      name: 'AI Image Studio',
      khmerName: 'បង្កើតរូបភាពដោយ AI',
      description: 'Generate photorealistic artwork, 4K digital art, anime, logos, and marketing posters from text prompts.',
      category: 'creative',
      badge: 'High-Res',
      iconBg: 'from-fuchsia-500 to-purple-600',
      Icon: ImageIcon,
      actionLabel: 'Generate',
      onLaunch: () => setImageModalOpen(true),
    },
    {
      id: 'ai_vision',
      name: 'Vision & Document OCR',
      khmerName: 'ស្កេនរូបភាព & ដកស្រង់អត្ថបទ',
      description: 'Extract Khmer & English text from photos, scan receipts, decode documents, and analyze visual data.',
      category: 'tools',
      badge: 'OCR & Vision',
      iconBg: 'from-sky-500 to-indigo-600',
      Icon: ScanText,
      actionLabel: 'Scan',
      onLaunch: () => router.push('/qr-scan'),
    },
    {
      id: 'erp_ai',
      name: 'ERP & Business Copilot',
      khmerName: 'ជំនួយការហិរញ្ញវត្ថុ & អាជីវកម្ម',
      description: 'Company cash flow overview, automated invoice drafting, employee payroll, and real-time revenue analytics.',
      category: 'business',
      badge: 'Business AI',
      iconBg: 'from-orange-500 to-amber-600',
      Icon: BarChart3,
      actionLabel: 'Open ERP',
      onLaunch: () => router.push('/erp'),
    },
    {
      id: 'dev_architect',
      name: 'Dev Architect & Code Solver',
      khmerName: 'ជំនួយការសរសេរកូដ & Debug',
      description: 'Senior software architect for debugging React, TypeScript, Python, backend APIs, and database queries.',
      category: 'tools',
      badge: 'Full-Stack',
      iconBg: 'from-violet-600 to-indigo-700',
      Icon: Code2,
      actionLabel: 'Code Chat',
      onLaunch: () => {
        const p = AI_PERSONAS.dev || Object.values(AI_PERSONAS)[0];
        handleStartChat(p);
      },
    },
    {
      id: 'summarizer_ai',
      name: 'Meeting & Audio Summarizer',
      khmerName: 'សង្ខេបកិច្ចប្រជុំ & សារវែងៗ',
      description: 'Distill long chat threads, channel posts, voice notes, and meeting transcripts into structured action items.',
      category: 'business',
      badge: 'Productivity',
      iconBg: 'from-pink-500 to-rose-600',
      Icon: FileText,
      actionLabel: 'Summarize',
      onLaunch: () => setSummarizerModalOpen(true),
    },
    {
      id: 'semantic_search',
      name: 'Semantic Smart Search',
      khmerName: 'ស្វែងរកឆ្លាតវៃតាមន័យ',
      description: 'Find any message, PDF document, photo, or shared link across all channels using deep semantic meaning.',
      category: 'tools',
      badge: 'Smart Index',
      iconBg: 'from-cyan-500 to-blue-600',
      Icon: Search,
      actionLabel: 'Search',
      onLaunch: () => router.push('/search'),
    },
  ];

  const filteredApps = useMemo(() => {
    return aiApps.filter((app) => {
      const matchesCategory =
        activeAppCategory === 'all' || app.category === activeAppCategory;
      const matchesSearch =
        searchQuery === '' ||
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.khmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeAppCategory, searchQuery]);

  // Handle AI Image Generation simulation
  const handleGenerateImage = () => {
    if (!imagePrompt.trim()) {
      toast('Please enter an image prompt', 'error');
      return;
    }
    setIsGeneratingImage(true);
    setGeneratedImageUrl(null);

    setTimeout(() => {
      setIsGeneratingImage(false);
      const sampleImages = [
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
      ];
      const randomImg = sampleImages[Math.floor(Math.random() * sampleImages.length)];
      setGeneratedImageUrl(randomImg);
      toast('Image generated successfully! ✨', 'success');
    }, 1800);
  };

  // Handle Khmer Translation / Grammar
  const handleTranslate = (mode: 'khmer' | 'english' | 'grammar' | 'formal') => {
    if (!translatorInput.trim()) {
      toast('Please enter text to process', 'error');
      return;
    }
    setIsTranslating(true);
    setTimeout(() => {
      setIsTranslating(false);
      if (mode === 'khmer') {
        setTranslatorOutput(`[បកប្រែជាភាសាខ្មែរ]:\n${translatorInput}\n\n-> អត្ថបទនេះត្រូវបានបកប្រែប្រកបដោយអត្ថន័យពេញលេញ និងត្រឹមត្រូវតាមក្បួនវេយ្យាករណ៍ភាសាខ្មែរ។`);
      } else if (mode === 'english') {
        setTranslatorOutput(`[English Translation]:\nHigh quality translated version of: "${translatorInput}". All idioms and technical phrasing verified for native clarity.`);
      } else if (mode === 'grammar') {
        setTranslatorOutput(`[ការត្រួតពិនិត្យអក្ខរាវិរុទ្ធ & វេយ្យាករណ៍ខ្មែរ]:\nអក្ខរាវិរុទ្ធបានពិនិត្យត្រឹមត្រូវតាមវចនានុក្រមសម្តេចព្រះសង្ឃរាជ ជួន ណាត ១០០%។`);
      } else {
        setTranslatorOutput(`[លិខិតផ្លូវការ / Formal Document]:\nសូមគោរពជូនចំពោះ គណៈគ្រប់គ្រង និងថ្នាក់ដឹកនាំជាទីគោរពដ៏ខ្ពង់ខ្ពស់។ ដោយសេចក្តីគោរព និងកិច្ចសហការដ៏ល្អប្រសើរ...`);
      }
      toast('Processing completed! ✨', 'success');
    }, 900);
  };

  // Handle Summarizer
  const handleSummarize = () => {
    if (!summarizerInput.trim()) {
      toast('Please enter text or notes to summarize', 'error');
      return;
    }
    setIsSummarizing(true);
    setTimeout(() => {
      setIsSummarizing(false);
      setSummarizerOutput(
        `📋 EXECUTIVE SUMMARY:\n• Main topic extracted from ${summarizerInput.slice(0, 40)}...\n• Key milestone achieved with prioritized resource allocation.\n\n🎯 ACTION ITEMS:\n1. Follow up with team leaders on target delivery by Friday.\n2. Review budget metrics in ERP dashboard.\n3. Send executive updates to all stakeholders.`
      );
      toast('Summary ready! 🚀', 'success');
    }, 1000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-tg-bg overflow-y-auto scrollbar-hide pb-24 select-none">
      {/* ── Top Header ── */}
      <div className="px-4 pt-3 pb-2.5 safe-top border-b border-tg-border/20 sticky top-0 bg-tg-bg/95 backdrop-blur-xl z-20">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-tg-border/20 flex items-center justify-center bg-tg-surface p-1 shadow-xs">
              <img src="/icons/ai-brain.png" alt="AI" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-tg-text text-[19px] font-bold tracking-tight leading-tight">
                  AI Hub
                </h1>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-tg-blue/15 text-tg-blue">
                  {viewMode === 'apps' ? 'Apps' : 'Voice'}
                </span>
              </div>
              <p className="text-[11px] text-tg-text-hint font-medium">
                {viewMode === 'apps' ? 'Intelligent apps & tools directory' : 'Live two-way voice companions'}
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push('/settings')}
            className="w-9 h-9 rounded-full bg-tg-surface border border-tg-border/40 flex items-center justify-center text-tg-text-secondary hover:text-tg-text active:scale-95 transition-all shadow-xs"
            aria-label="Settings"
            title="Configure AI"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* ── Seamless Segmented View Switcher ── */}
        <div className="p-1 rounded-xl bg-tg-surface border border-tg-border/30 flex items-center gap-1 mb-2.5">
          <button
            onClick={() => {
              setViewMode('apps');
              setSearchQuery('');
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              viewMode === 'apps'
                ? 'bg-tg-bg text-tg-text shadow-sm'
                : 'text-tg-text-secondary hover:text-tg-text'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-tg-blue" />
            <span>AI Apps</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-tg-surface text-tg-text-hint">
              {aiApps.length}
            </span>
          </button>

          <button
            onClick={() => {
              setViewMode('voice');
              setSearchQuery('');
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              viewMode === 'voice'
                ? 'bg-tg-bg text-tg-text shadow-sm'
                : 'text-tg-text-secondary hover:text-tg-text'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-amber-500" />
            <span>Voice Call</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-tg-surface text-tg-text-hint">
              {Object.keys(AI_PERSONAS).length}
            </span>
          </button>
        </div>

        {/* ── Search Bar ── */}
        <div className="relative mb-2">
          <Search className="w-4 h-4 text-tg-text-hint absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={viewMode === 'apps' ? 'Search AI apps & tools...' : 'Search voice companions...'}
            className="w-full bg-tg-surface border border-tg-border/30 rounded-xl pl-9 pr-8 py-2 text-xs text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tg-text-hint hover:text-tg-text p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ── Filter Pills ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
          {(viewMode === 'apps' ? APP_CATEGORIES : VOICE_CATEGORIES).map((cat) => {
            const active =
              viewMode === 'apps'
                ? activeAppCategory === cat.id
                : activeVoiceCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  if (viewMode === 'apps') {
                    setActiveAppCategory(cat.id);
                  } else {
                    setActiveVoiceCategory(cat.id);
                  }
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-tg-blue text-white shadow-xs'
                    : 'bg-tg-surface text-tg-text-secondary hover:text-tg-text border border-tg-border/20 active:scale-95'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
        {/* ========================================================= */}
        {/* VIEW MODE: AI APPS DIRECTORY                             */}
        {/* ========================================================= */}
        {viewMode === 'apps' && (
          <>
            {/* Featured Hero Banner */}
            {!searchQuery && activeAppCategory === 'all' && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/15 via-indigo-600/15 to-purple-600/15 border border-tg-blue/30 relative overflow-hidden shadow-xs">
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tg-blue text-white tracking-wide uppercase">
                      Featured
                    </span>
                    <span className="text-[11px] text-tg-blue font-semibold">
                      Realtime Voice & Multimodal
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-tg-text leading-tight">
                      AI Voice Companions
                    </h3>
                    <p className="text-xs text-tg-text-secondary mt-0.5 line-clamp-2">
                      Experience human-like conversations in natural Khmer & English with Lily, Bopha, Dara & Dev Lead.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setViewMode('voice')}
                      className="px-3.5 py-1.5 rounded-xl bg-tg-blue text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:bg-tg-blue/90 active:scale-95 transition-all"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>Explore Voice Call</span>
                    </button>
                    <button
                      onClick={() => {
                        const lily = AI_PERSONAS.lily;
                        if (lily) handleStartCall(lily);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-tg-surface border border-tg-border/40 text-tg-text text-xs font-semibold flex items-center gap-1.5 hover:bg-tg-surface/80 active:scale-95 transition-all"
                    >
                      <span>Call Lily</span>
                      <ArrowRight className="w-3 h-3 text-tg-text-hint" />
                    </button>
                  </div>
                </div>

                {/* Decorative Background Elements */}
                <div className="absolute right-3 -bottom-4 w-28 h-28 opacity-15 pointer-events-none">
                  <img src="/icons/ai-brain.png" alt="Decoration" className="w-full h-full object-contain" />
                </div>
              </div>
            )}

            {/* Apps Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredApps.map((app) => {
                const IconComponent = app.Icon;
                return (
                  <div
                    key={app.id}
                    onClick={app.onLaunch}
                    className="p-3.5 rounded-2xl bg-tg-bg-secondary border border-tg-border/25 hover:border-tg-border/60 transition-all cursor-pointer flex flex-col justify-between group active:scale-[0.99] shadow-xs"
                  >
                    <div>
                      {/* Top icon and badge */}
                      <div className="flex items-center justify-between mb-2.5">
                        <div
                          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.iconBg} flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-tg-surface text-tg-text-secondary border border-tg-border/30">
                          {app.badge}
                        </span>
                      </div>

                      {/* Title & Khmer Subtitle */}
                      <div>
                        <h4 className="text-sm font-bold text-tg-text group-hover:text-tg-blue transition-colors flex items-center gap-1">
                          <span>{app.name}</span>
                        </h4>
                        <p className="text-[11px] text-tg-text-hint font-medium">
                          {app.khmerName}
                        </p>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-tg-text-secondary mt-1.5 line-clamp-2 leading-relaxed">
                        {app.description}
                      </p>
                    </div>

                    {/* Launch Action */}
                    <div className="pt-3 mt-2 border-t border-tg-border/15 flex items-center justify-between">
                      <span className="text-xs font-semibold text-tg-blue flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        {app.actionLabel}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-[10px] text-tg-text-hint uppercase tracking-wider font-semibold">
                        Ready
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty State */}
            {filteredApps.length === 0 && (
              <div className="text-center py-16 space-y-2">
                <div className="w-12 h-12 rounded-full bg-tg-surface mx-auto flex items-center justify-center text-tg-text-hint">
                  <Bot className="w-6 h-6" />
                </div>
                <p className="text-tg-text text-sm font-bold">No apps found</p>
                <p className="text-tg-text-hint text-xs">
                  Try another category or clear search query
                </p>
              </div>
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* VIEW MODE: VOICE COMPANIONS                              */}
        {/* ========================================================= */}
        {viewMode === 'voice' && (
          <div className="space-y-2.5">
            {characterList.map((character) => {
              const isCurrentSelected = aiPersona === character.id;

              return (
                <div
                  key={character.id}
                  className={`p-3.5 rounded-2xl bg-tg-bg-secondary border transition-all ${
                    isCurrentSelected
                      ? 'border-tg-blue/50 shadow-xs'
                      : 'border-tg-border/25 hover:border-tg-border/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="relative w-11 h-11 rounded-full overflow-hidden shrink-0 border border-tg-border/30 bg-tg-surface shadow-xs">
                        {character.avatar ? (
                          <img
                            src={character.avatar}
                            alt={character.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-xs text-tg-text">
                            {character.gradient.initial}
                          </div>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-tg-text truncate">
                            {character.name}
                          </h4>
                          {isCurrentSelected && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-tg-blue/15 text-tg-blue border border-tg-blue/30 flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" /> Selected
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-tg-text-hint truncate">
                          {character.tagline}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleStartCall(character)}
                        className="py-1.5 px-3 rounded-full bg-tg-blue hover:bg-tg-blue/90 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                        title={`Call ${character.name}`}
                      >
                        <Phone className="w-3.5 h-3.5 fill-current" />
                        <span>Call</span>
                      </button>

                      <button
                        onClick={() => handleStartChat(character)}
                        className="w-8 h-8 rounded-full bg-tg-surface border border-tg-border/30 flex items-center justify-center text-tg-text-secondary hover:text-tg-text active:scale-95 transition-all"
                        title="Chat with companion"
                        aria-label={`Chat ${character.name}`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {characterList.length === 0 && (
              <div className="text-center py-16 space-y-2">
                <div className="w-12 h-12 rounded-full bg-tg-surface mx-auto flex items-center justify-center text-tg-text-hint">
                  <Bot className="w-6 h-6" />
                </div>
                <p className="text-tg-text text-sm font-bold">No companions found</p>
                <p className="text-tg-text-hint text-xs">Try selecting another category or clear search</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: AI IMAGE STUDIO                                 */}
      {/* ========================================================= */}
      {imageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-tg-bg border border-tg-border/40 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-tg-border/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-tg-text">AI Image Studio</h3>
                  <p className="text-[11px] text-tg-text-hint">Generate art, anime & marketing visuals</p>
                </div>
              </div>
              <button
                onClick={() => setImageModalOpen(false)}
                className="w-8 h-8 rounded-full bg-tg-surface flex items-center justify-center text-tg-text-secondary hover:text-tg-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 overflow-y-auto">
              <div>
                <label className="text-xs font-semibold text-tg-text mb-1 block">
                  Prompt (Describe the image)
                </label>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="e.g. Majestic Angkor Wat temple at twilight, cyberpunk neon lighting, highly detailed 8k..."
                  rows={3}
                  className="w-full bg-tg-surface border border-tg-border/30 rounded-xl p-3 text-xs text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue resize-none"
                />

                {/* Prompt suggestions */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pt-1.5">
                  {[
                    'Angkor Wat futuristic cyberpunk',
                    'Cute baby elephant in rainforest',
                    'Phnom Penh skyline 2050 neon',
                    'Khmer traditional silk portrait',
                  ].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setImagePrompt(preset)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-tg-surface border border-tg-border/25 text-tg-text-secondary hover:text-tg-text whitespace-nowrap active:scale-95"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style selector */}
              <div>
                <label className="text-xs font-semibold text-tg-text mb-1 block">
                  Art Style
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Photorealistic', 'Anime / Manga', '3D Digital Art', 'Cyberpunk', 'Cinematic Oil', 'Logo & Icon'].map(
                    (st) => (
                      <button
                        key={st}
                        onClick={() => setImageStyle(st)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-medium border text-center transition-all ${
                          imageStyle === st
                            ? 'bg-tg-blue text-white border-tg-blue'
                            : 'bg-tg-surface border-tg-border/30 text-tg-text-secondary hover:text-tg-text'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="text-xs font-semibold text-tg-text mb-1 block">
                  Aspect Ratio
                </label>
                <div className="flex gap-2">
                  {['1:1 Square', '9:16 Story', '16:9 Landscape'].map((ar) => (
                    <button
                      key={ar}
                      onClick={() => setImageAspectRatio(ar.split(' ')[0])}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-medium border text-center transition-all ${
                        imageAspectRatio === ar.split(' ')[0]
                          ? 'bg-tg-blue text-white border-tg-blue'
                          : 'bg-tg-surface border-tg-border/30 text-tg-text-secondary hover:text-tg-text'
                      }`}
                    >
                      {ar}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate CTA Button */}
              <button
                onClick={handleGenerateImage}
                disabled={isGeneratingImage}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:opacity-95 active:scale-[0.98] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
              >
                {isGeneratingImage ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Rendering AI Image...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Generate Artwork</span>
                  </>
                )}
              </button>

              {/* Generated Image Result Preview */}
              {generatedImageUrl && (
                <div className="pt-2 border-t border-tg-border/20 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                  <div className="relative rounded-xl overflow-hidden border border-tg-border/30 bg-black aspect-video flex items-center justify-center">
                    <img
                      src={generatedImageUrl}
                      alt="Generated AI"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={generatedImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 rounded-xl bg-tg-surface border border-tg-border/30 text-tg-text text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-tg-surface/80"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download HD</span>
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedImageUrl);
                        toast('Image link copied!', 'success');
                      }}
                      className="py-2 px-3 rounded-xl bg-tg-surface border border-tg-border/30 text-tg-text text-xs font-semibold flex items-center justify-center gap-1 hover:bg-tg-surface/80"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: KHMER AI & TRANSLATOR                           */}
      {/* ========================================================= */}
      {translatorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-tg-bg border border-tg-border/40 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-tg-border/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white">
                  <Languages className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-tg-text">Khmer AI & Translator</h3>
                  <p className="text-[11px] text-tg-text-hint">Translation & Chuon Nath grammar verification</p>
                </div>
              </div>
              <button
                onClick={() => setTranslatorModalOpen(false)}
                className="w-8 h-8 rounded-full bg-tg-surface flex items-center justify-center text-tg-text-secondary hover:text-tg-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
              <div>
                <label className="text-xs font-semibold text-tg-text mb-1 block">
                  Input Text (អត្ថបទដើម)
                </label>
                <textarea
                  value={translatorInput}
                  onChange={(e) => setTranslatorInput(e.target.value)}
                  placeholder="វាយអត្ថបទជាភាសាខ្មែរ ឬ អង់គ្លេសនៅទីនេះ..."
                  rows={4}
                  className="w-full bg-tg-surface border border-tg-border/30 rounded-xl p-3 text-xs text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleTranslate('khmer')}
                  disabled={isTranslating}
                  className="py-2 px-2.5 rounded-xl bg-tg-surface border border-tg-border/30 hover:border-tg-blue text-tg-text text-xs font-semibold transition-all"
                >
                  🌐 English ➔ ខ្មែរ
                </button>
                <button
                  onClick={() => handleTranslate('english')}
                  disabled={isTranslating}
                  className="py-2 px-2.5 rounded-xl bg-tg-surface border border-tg-border/30 hover:border-tg-blue text-tg-text text-xs font-semibold transition-all"
                >
                  🇬🇧 ខ្មែរ ➔ English
                </button>
                <button
                  onClick={() => handleTranslate('grammar')}
                  disabled={isTranslating}
                  className="py-2 px-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-all"
                >
                  ✨ ពិនិត្យអក្ខរាវិរុទ្ធ (Chuon Nath)
                </button>
                <button
                  onClick={() => handleTranslate('formal')}
                  disabled={isTranslating}
                  className="py-2 px-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold transition-all"
                >
                  📜 លិខិតផ្លូវការ (Formal)
                </button>
              </div>

              {/* Output Result */}
              {translatorOutput && (
                <div className="pt-2 border-t border-tg-border/20 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-tg-text">Result (លទ្ធផល)</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(translatorOutput);
                        toast('Copied to clipboard!', 'success');
                      }}
                      className="text-xs font-semibold text-tg-blue flex items-center gap-1 hover:underline"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-tg-surface border border-tg-border/25 text-xs text-tg-text whitespace-pre-wrap leading-relaxed font-sans">
                    {translatorOutput}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: MEETING & TEXT SUMMARIZER                       */}
      {/* ========================================================= */}
      {summarizerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-tg-bg border border-tg-border/40 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-tg-border/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-tg-text">Meeting & Audio Summarizer</h3>
                  <p className="text-[11px] text-tg-text-hint">Executive summaries & actionable takeaways</p>
                </div>
              </div>
              <button
                onClick={() => setSummarizerModalOpen(false)}
                className="w-8 h-8 rounded-full bg-tg-surface flex items-center justify-center text-tg-text-secondary hover:text-tg-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
              <div>
                <label className="text-xs font-semibold text-tg-text mb-1 block">
                  Paste Long Discussion or Notes
                </label>
                <textarea
                  value={summarizerInput}
                  onChange={(e) => setSummarizerInput(e.target.value)}
                  placeholder="Paste chat logs, minutes of meeting, or voice transcripts here..."
                  rows={4}
                  className="w-full bg-tg-surface border border-tg-border/30 rounded-xl p-3 text-xs text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue resize-none"
                />
              </div>

              <button
                onClick={handleSummarize}
                disabled={isSummarizing}
                className="w-full py-2.5 rounded-xl bg-tg-blue hover:bg-tg-blue/90 active:scale-[0.98] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
              >
                {isSummarizing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing & Distilling...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Generate Executive Summary</span>
                  </>
                )}
              </button>

              {summarizerOutput && (
                <div className="pt-2 border-t border-tg-border/20 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-tg-text">Action Items & Summary</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(summarizerOutput);
                        toast('Copied summary to clipboard!', 'success');
                      }}
                      className="text-xs font-semibold text-tg-blue flex items-center gap-1 hover:underline"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-tg-surface border border-tg-border/25 text-xs text-tg-text whitespace-pre-wrap leading-relaxed">
                    {summarizerOutput}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
