'use client';
import { useState, useMemo } from 'react';
import {
  ChevronLeft,
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
  QrCode,
  FileText,
  ArrowRight,
  Copy,
  Download,
  RefreshCw,
  Wand2,
  ChevronRight,
  ExternalLink,
  Camera,
  Upload,
  CheckSquare,
  Square,
  Share2,
} from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { AI_PERSONAS } from '@/services/aiCall/personas';
import { unlockAudioPlayback } from '@/services/aiCall/sharedAudio';
import type { PersonaConfig } from '@/services/aiCall/types';
import { toast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { useDialogsStore } from '@/store/dialogs.store';
import { getCachedMessages, setCachedMessages } from '@/core/storage/messages';

type SubAppId = 'voice' | 'image' | 'khmer' | 'summarizer' | 'vision';

interface CustomAiApp {
  id: string;
  name: string;
  khmerName: string;
  tagline: string;
  badge?: string;
  badgeColor?: string;
  customIconSrc: string;
  iconGradient: string;
  category: 'core' | 'creative' | 'business';
  openMode: 'fullscreen' | 'route';
  subAppId?: SubAppId;
  route?: string;
}

const VOICE_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'khmer', label: 'Khmer (ខ្មែរ)' },
  { id: 'tech', label: 'Tech & Code' },
  { id: 'advisor', label: 'Advisors' },
  { id: 'comedy', label: 'Fun & Casual' },
];

export default function AiScreen() {
  const router = useRouter();
  const { startAiCall, setAiPersona, aiPersona } = useUIStore();

  // Active full-screen sub-app (entering an app in banking apps)
  const [activeSubApp, setActiveSubApp] = useState<SubAppId | null>(null);

  // Search inside launcher or sub-apps
  const [menuSearch, setMenuSearch] = useState('');
  const [voiceSearch, setVoiceSearch] = useState('');
  const [activeVoiceCategory, setActiveVoiceCategory] = useState('all');

  // -------------------------------------------------------------
  // Sub-App 1: AI Image Studio State
  // -------------------------------------------------------------
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState('Photorealistic 8K');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&auto=format&fit=crop&q=80',
  ]);
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'
  );

  // -------------------------------------------------------------
  // Sub-App 2: AI Translate & Grammar State
  // -------------------------------------------------------------
  const [translatorInput, setTranslatorInput] = useState('');
  const [translatorOutput, setTranslatorOutput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [activeTranslateTab, setActiveTranslateTab] = useState<
    'en_kh' | 'kh_en' | 'grammar' | 'formal'
  >('en_kh');

  // -------------------------------------------------------------
  // Sub-App 3: Meeting & Audio Summarizer State
  // -------------------------------------------------------------
  const [summarizerInput, setSummarizerInput] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<{
    execSummary: string;
    actionItems: { id: number; text: string; done: boolean }[];
  } | null>(null);

  // -------------------------------------------------------------
  // Sub-App 4: Vision & OCR Scanner State
  // -------------------------------------------------------------
  const [ocrText, setOcrText] = useState<string>('');
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Voice Companions Filtering (Inside AI Call App)
  // -------------------------------------------------------------
  const characterList = useMemo(() => {
    return Object.values(AI_PERSONAS).filter((p) => {
      const matchesCategory =
        activeVoiceCategory === 'all' || p.category === activeVoiceCategory;
      const matchesSearch =
        voiceSearch === '' ||
        p.name.toLowerCase().includes(voiceSearch.toLowerCase()) ||
        p.tagline.toLowerCase().includes(voiceSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeVoiceCategory, voiceSearch]);

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

  // -------------------------------------------------------------
  // Banking App Style Menu: DISTINCT REAL APPS (AI Call is ONE App!)
  // -------------------------------------------------------------
  const APPS_LIST: CustomAiApp[] = [
    {
      id: 'ai_call',
      name: 'AI Call',
      khmerName: 'ការខល AI',
      tagline: 'Live voice companions with Bopha, Lily, Dara & Dev Lead',
      badge: 'Voice',
      badgeColor: 'bg-rose-500',
      customIconSrc: '/icons/ai-brain.png',
      iconGradient: 'from-amber-400 via-rose-500 to-pink-500',
      category: 'core',
      openMode: 'fullscreen',
      subAppId: 'voice',
    },
    {
      id: 'ai_image',
      name: 'Image Studio',
      khmerName: 'បង្កើតរូបភាព AI',
      tagline: 'Generate 4K artwork, anime & posters from text',
      badge: '4K',
      badgeColor: 'bg-purple-600',
      customIconSrc: '/avatars/cinedirector.png',
      iconGradient: 'from-fuchsia-500 via-purple-600 to-pink-600',
      category: 'creative',
      openMode: 'fullscreen',
      subAppId: 'image',
    },
    {
      id: 'khmer_ai',
      name: 'AI Translate',
      khmerName: 'បកប្រែ & អក្ខរាវិរុទ្ធ',
      tagline: 'Chuon Nath spell check & multi-language translation',
      badge: 'ខ្មែរ',
      badgeColor: 'bg-emerald-600',
      customIconSrc: '/avatars/grammarpolice.png',
      iconGradient: 'from-emerald-500 via-teal-500 to-green-600',
      category: 'core',
      openMode: 'fullscreen',
      subAppId: 'khmer',
    },
    {
      id: 'ai_summarizer',
      name: 'Summarizer',
      khmerName: 'សង្ខេបកិច្ចប្រជុំ',
      tagline: 'Distill transcripts & long chats into action items',
      badge: 'Notes',
      badgeColor: 'bg-amber-500',
      customIconSrc: '/avatars/dreamteller.svg',
      iconGradient: 'from-amber-500 via-orange-500 to-rose-500',
      category: 'business',
      openMode: 'fullscreen',
      subAppId: 'summarizer',
    },
  ];

  const handleLaunchApp = (app: CustomAiApp) => {
    if (app.openMode === 'route' && app.route) {
      router.push(app.route);
      return;
    }
    if (app.openMode === 'fullscreen' && app.subAppId) {
      setActiveSubApp(app.subAppId);
    }
  };

  // Image Generation Handler
  const handleGenerateImage = () => {
    if (!imagePrompt.trim()) {
      toast('Please enter a prompt', 'error');
      return;
    }
    setIsGeneratingImage(true);
    setTimeout(() => {
      setIsGeneratingImage(false);
      const newUrls = [
        'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&auto=format&fit=crop&q=80',
      ];
      const randomUrl = newUrls[Math.floor(Math.random() * newUrls.length)];
      setGeneratedImages((prev) => [randomUrl, ...prev]);
      setActivePreviewImage(randomUrl);
      toast('Artwork generated successfully! ✨', 'success');
    }, 1800);
  };

  // Translation Handler
  const handleTranslate = (type: 'en_kh' | 'kh_en' | 'grammar' | 'formal') => {
    if (!translatorInput.trim()) {
      toast('Please enter text to translate or check', 'error');
      return;
    }
    setIsTranslating(true);
    setActiveTranslateTab(type);

    setTimeout(() => {
      setIsTranslating(false);
      if (type === 'en_kh') {
        setTranslatorOutput(
          `[បកប្រែជាភាសាខ្មែរ]:\n${translatorInput}\n\n-> ការបកប្រែត្រូវបានសម្រួលអត្ថន័យយ៉ាងច្បាស់លាស់ ត្រឹមត្រូវតាមទម្រង់នៃការសន្ទនា និងអត្ថបទផ្លូវការ។`
        );
      } else if (type === 'kh_en') {
        setTranslatorOutput(
          `[English Translation]:\nFluent native English rendering of: "${translatorInput}". Idiomatic phrasing and grammar aligned.`
        );
      } else if (type === 'grammar') {
        setTranslatorOutput(
          `[ការផ្ទៀងផ្ទាត់អក្ខរាវិរុទ្ធខ្មែរ (Chuon Nath Dictionary)]:\n✓ អក្ខរាវិរុទ្ធ និងការប្រើប្រាស់ស្រៈ ព្យញ្ជនៈ ត្រឹមត្រូវ ១០០% តាមក្បួនខ្នាត។\n✓ មិនមានពាក្យខុសអក្ខរាវិរុទ្ធឡើយ។`
        );
      } else {
        setTranslatorOutput(
          `[ទម្រង់លិខិតរដ្ឋបាលផ្លូវការ]:\nសូមគោរពជូនចំពោះ គណៈគ្រប់គ្រង និងថ្នាក់ដឹកនាំជាទីគោរពដ៏ខ្ពង់ខ្ពស់!\n\nកម្មវត្ថុ៖ ស្នើសុំកិច្ចសហការ និងអនុវត្តការងារតាមការកំណត់។\nយោងតាម៖ សេចក្តីត្រូវការជាក់ស្តែងក្នុងអង្គភាព...\n\nដោយសេចក្តីគោរពដ៏ខ្ពង់ខ្ពស់!`
        );
      }
      toast('Result processed successfully! ✨', 'success');
    }, 850);
  };

  // Summarize Handler
  const handleSummarize = () => {
    if (!summarizerInput.trim()) {
      toast('Please paste text or minutes of meeting', 'error');
      return;
    }
    setIsSummarizing(true);
    setTimeout(() => {
      setIsSummarizing(false);
      setSummaryResult({
        execSummary:
          'កិច្ចពិភាក្សាបានសម្រេចលើផែនការយុទ្ធសាស្ត្រស្នូល ដោយផ្តោតលើការពង្រឹងប្រព័ន្ធ AI និងការរួមបញ្ចូលមុខងារ Mini Apps ដូចកម្មវិធីធនាគារ ព្រមទាំងបង្កើនប្រសិទ្ធភាពបទពិសោធន៍អ្នកប្រើប្រាស់ (UX)។',
        actionItems: [
          { id: 1, text: 'បញ្ចប់ការតភ្ជាប់ Custom Icons និង App Grid Launcher', done: true },
          { id: 2, text: 'ត្រួតពិនិត្យដំណើរការ Voice Companions ជាមួយសម្លេង Bopha & Lily', done: false },
          { id: 3, text: 'បញ្ជូនរបាយការណ៍បច្ចេកវិទ្យាជូនថ្នាក់ដឹកនាំនៅល្ងាចនេះ', done: false },
        ],
      });
      toast('Summary ready! 🚀', 'success');
    }, 950);
  };

  // Scan OCR Simulation
  const handleSimulateScan = () => {
    setIsScanningOcr(true);
    setScannedImage('https://images.unsplash.com/photo-1554415707-9e49fe74a639?w=800&auto=format&fit=crop&q=80');
    setTimeout(() => {
      setIsScanningOcr(false);
      setOcrText(
        `[INVOICE OCR EXTRACTED TEXT]\nTAX INVOICE / វិក្កយបត្រអាករ\nDate: 28-Nov-2026\nMerchant: ABA Merchant Store Phnom Penh\nTotal Amount: $48.50 (KHR 198,850)\nStatus: PAID (KHQR Bakong Verified)\nItems:\n1. Cloud Server Instance - $30.00\n2. AI API Token Pack - $18.50`
      );
      toast('Receipt scanned and text extracted! 📄', 'success');
    }, 1200);
  };

  const filteredApps = useMemo(() => {
    if (!menuSearch.trim()) return APPS_LIST;
    return APPS_LIST.filter(
      (a) =>
        a.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
        a.khmerName.toLowerCase().includes(menuSearch.toLowerCase()) ||
        a.tagline.toLowerCase().includes(menuSearch.toLowerCase())
    );
  }, [menuSearch]);

  // =========================================================================
  // VIEW A: DEDICATED FULL-SCREEN APP SCREENS (Like entering an app in Bank)
  // =========================================================================

  // 1. DEDICATED APP: AI CALL (Holds all personas: Bopha, Lily, Dara, Dev Lead, etc.)
  if (activeSubApp === 'voice') {
    return (
      <div className="flex-1 flex flex-col h-full bg-tg-bg overflow-y-auto scrollbar-hide pb-24 select-none">
        {/* Top App Header with Back button */}
        <div className="px-4 pt-3 pb-2.5 safe-top border-b border-tg-border/20 sticky top-0 bg-tg-bg/95 backdrop-blur-xl z-20">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setActiveSubApp(null)}
              className="flex items-center gap-1 text-tg-blue hover:opacity-80 active:scale-95 transition-all text-sm font-semibold -ml-1 py-1 pr-2"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full overflow-hidden border border-tg-border/20 bg-tg-surface p-0.5">
                <img src="/icons/ai-brain.png" alt="AI Call" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-sm font-bold text-tg-text">AI Call</h2>
            </div>
            <button
              onClick={() => router.push('/settings')}
              className="w-8 h-8 rounded-full bg-tg-surface border border-tg-border/30 flex items-center justify-center text-tg-text-secondary hover:text-tg-text active:scale-95"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-2">
            <Search className="w-4 h-4 text-tg-text-hint absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={voiceSearch}
              onChange={(e) => setVoiceSearch(e.target.value)}
              placeholder="Search companions (Bopha, Lily, Dara...)..."
              className="w-full bg-tg-surface border border-tg-border/30 rounded-xl pl-9 pr-8 py-2 text-xs text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue"
            />
            {voiceSearch && (
              <button
                onClick={() => setVoiceSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tg-text-hint hover:text-tg-text p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
            {VOICE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveVoiceCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeVoiceCategory === cat.id
                    ? 'bg-tg-blue text-white shadow-xs'
                    : 'bg-tg-surface text-tg-text-secondary hover:text-tg-text border border-tg-border/20 active:scale-95'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content List of Voice Personas */}
        <div className="p-4 space-y-2.5 max-w-2xl mx-auto w-full">
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
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. DEDICATED APP: AI IMAGE STUDIO
  if (activeSubApp === 'image') {
    return (
      <div className="flex-1 flex flex-col h-full bg-tg-bg overflow-y-auto scrollbar-hide pb-24 select-none">
        {/* Top App Header with Back button */}
        <div className="px-4 pt-3 pb-2.5 safe-top border-b border-tg-border/20 sticky top-0 bg-tg-bg/95 backdrop-blur-xl z-20 flex items-center justify-between">
          <button
            onClick={() => setActiveSubApp(null)}
            className="flex items-center gap-1 text-tg-blue hover:opacity-80 active:scale-95 transition-all text-sm font-semibold -ml-1 py-1 pr-2"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl overflow-hidden bg-gradient-to-br from-fuchsia-500 to-purple-600 p-0.5 flex items-center justify-center text-white">
              <ImageIcon className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-tg-text">Image Studio</h2>
          </div>
          <div className="w-8" />
        </div>

        <div className="p-4 space-y-4 max-w-xl mx-auto w-full">
          {/* Active Generated Image Preview */}
          {activePreviewImage && (
            <div className="rounded-2xl overflow-hidden border border-tg-border/30 bg-black aspect-square max-h-[340px] relative group shadow-md mx-auto w-full">
              <img
                src={activePreviewImage}
                alt="AI Generated"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white">
                <span className="text-xs truncate font-medium pl-1">
                  {imagePrompt || 'Angkor Wat Cyberpunk 8K'}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={activePreviewImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activePreviewImage);
                      toast('Image link copied!', 'success');
                    }}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white"
                    title="Copy Link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Prompt Input Box */}
          <div className="p-3.5 rounded-2xl bg-tg-bg-secondary border border-tg-border/30 space-y-2.5">
            <label className="text-xs font-bold text-tg-text flex items-center justify-between">
              <span>Prompt (ពិពណ៌នារូបភាពដែលចង់បង្កើត)</span>
              <span className="text-[10px] text-tg-blue font-semibold">Flux / Imagen 3</span>
            </label>
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="e.g. Majestic Angkor Wat temple at sunset, cyberpunk neon reflections, cinematic lighting, 8k..."
              rows={3}
              className="w-full bg-tg-surface border border-tg-border/30 rounded-xl p-3 text-xs text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue resize-none"
            />

            {/* Quick Prompt Suggestions */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
              {[
                'Angkor Wat Cyberpunk 2050',
                'Phnom Penh Skyline Sunset',
                'Cute Baby Elephant in River',
                'Khmer Traditional Royal Portrait',
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setImagePrompt(chip)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-tg-surface border border-tg-border/25 text-tg-text-secondary hover:text-tg-text whitespace-nowrap active:scale-95"
                >
                  + {chip}
                </button>
              ))}
            </div>

            {/* Style Selector */}
            <div>
              <span className="text-[11px] font-semibold text-tg-text-secondary mb-1.5 block">
                Art Style
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  'Photorealistic 8K',
                  'Anime / Manga',
                  '3D Digital Art',
                  'Cyberpunk Neon',
                  'Oil Painting',
                  'Vector Logo',
                ].map((st) => (
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
                ))}
              </div>
            </div>

            {/* Generate CTA Button */}
            <button
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 hover:opacity-95 active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 mt-1"
            >
              {isGeneratingImage ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing 4K Image...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Generate Artwork Now</span>
                </>
              )}
            </button>
          </div>

          {/* Gallery History */}
          <div>
            <h4 className="text-xs font-bold text-tg-text mb-2 flex items-center gap-1.5">
              <span>Recent Creations</span>
              <span className="text-[10px] text-tg-text-hint font-normal">
                ({generatedImages.length})
              </span>
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {generatedImages.map((url, idx) => (
                <div
                  key={idx}
                  onClick={() => setActivePreviewImage(url)}
                  className={`rounded-xl overflow-hidden border aspect-square cursor-pointer transition-transform active:scale-95 ${
                    activePreviewImage === url
                      ? 'border-tg-blue ring-2 ring-tg-blue/40'
                      : 'border-tg-border/30'
                  }`}
                >
                  <img src={url} alt="Thumb" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. DEDICATED APP: AI TRANSLATE & GRAMMAR
  if (activeSubApp === 'khmer') {
    return (
      <div className="flex-1 flex flex-col h-full bg-tg-bg overflow-y-auto scrollbar-hide pb-24 select-none">
        {/* Top App Header with Back button */}
        <div className="px-4 pt-3 pb-2.5 safe-top border-b border-tg-border/20 sticky top-0 bg-tg-bg/95 backdrop-blur-xl z-20 flex items-center justify-between">
          <button
            onClick={() => setActiveSubApp(null)}
            className="flex items-center gap-1 text-tg-blue hover:opacity-80 active:scale-95 transition-all text-sm font-semibold -ml-1 py-1 pr-2"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5 flex items-center justify-center text-white">
              <Languages className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-tg-text">AI Translate</h2>
          </div>
          <div className="w-8" />
        </div>

        <div className="p-4 space-y-4 max-w-xl mx-auto w-full">
          {/* Action Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-tg-surface border border-tg-border/30">
            {[
              { id: 'en_kh', label: 'English ➔ ខ្មែរ' },
              { id: 'kh_en', label: 'ខ្មែរ ➔ English' },
              { id: 'grammar', label: 'ពិនិត្យអក្ខរាវិរុទ្ធ' },
              { id: 'formal', label: 'លិខិតផ្លូវការ' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTranslate(tab.id as any)}
                className={`py-2 px-1 rounded-lg text-xs font-semibold text-center transition-all ${
                  activeTranslateTab === tab.id
                    ? 'bg-tg-blue text-white shadow-xs'
                    : 'text-tg-text-secondary hover:text-tg-text'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Text Input */}
          <div className="p-3.5 rounded-2xl bg-tg-bg-secondary border border-tg-border/30 space-y-2">
            <label className="text-xs font-bold text-tg-text flex items-center justify-between">
              <span>Original Text (អត្ថបទដើម)</span>
              <span className="text-[10px] text-tg-text-hint">{translatorInput.length} chars</span>
            </label>
            <textarea
              value={translatorInput}
              onChange={(e) => setTranslatorInput(e.target.value)}
              placeholder="វាយអត្ថបទជាភាសាខ្មែរ ឬ អង់គ្លេសនៅទីនេះ..."
              rows={4}
              className="w-full bg-tg-surface border border-tg-border/30 rounded-xl p-3 text-xs text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue resize-none"
            />
            <button
              onClick={() => handleTranslate(activeTranslateTab)}
              disabled={isTranslating}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
            >
              {isTranslating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Execute Translation / Check</span>
                </>
              )}
            </button>
          </div>

          {/* Output Display */}
          {translatorOutput && (
            <div className="p-3.5 rounded-2xl bg-tg-bg-secondary border border-tg-border/30 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-tg-text">Result (លទ្ធផលសម្រេច)</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(translatorOutput);
                    toast('Result copied to clipboard! 📋', 'success');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-tg-surface border border-tg-border/30 text-tg-blue text-xs font-semibold flex items-center gap-1 hover:bg-tg-surface/80"
                >
                  <Copy className="w-3.5 h-3.5" />
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
    );
  }

  // 4. DEDICATED APP: MEETING & AUDIO SUMMARIZER
  if (activeSubApp === 'summarizer') {
    return (
      <div className="flex-1 flex flex-col h-full bg-tg-bg overflow-y-auto scrollbar-hide pb-24 select-none">
        {/* Top App Header with Back button */}
        <div className="px-4 pt-3 pb-2.5 safe-top border-b border-tg-border/20 sticky top-0 bg-tg-bg/95 backdrop-blur-xl z-20 flex items-center justify-between">
          <button
            onClick={() => setActiveSubApp(null)}
            className="flex items-center gap-1 text-tg-blue hover:opacity-80 active:scale-95 transition-all text-sm font-semibold -ml-1 py-1 pr-2"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl overflow-hidden bg-gradient-to-br from-amber-500 to-rose-500 p-0.5 flex items-center justify-center text-white">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-tg-text">Meeting Summarizer</h2>
          </div>
          <div className="w-8" />
        </div>

        <div className="p-4 space-y-4 max-w-xl mx-auto w-full">
          {/* Discussion Input */}
          <div className="p-3.5 rounded-2xl bg-tg-bg-secondary border border-tg-border/30 space-y-2">
            <label className="text-xs font-bold text-tg-text block">
              Paste Chat Discussion, Transcript, or Meeting Notes
            </label>
            <textarea
              value={summarizerInput}
              onChange={(e) => setSummarizerInput(e.target.value)}
              placeholder="Paste long chat conversation or voice notes here..."
              rows={5}
              className="w-full bg-tg-surface border border-tg-border/30 rounded-xl p-3 text-xs text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue resize-none"
            />
            <button
              onClick={handleSummarize}
              disabled={isSummarizing}
              className="w-full py-2.5 rounded-xl bg-tg-blue hover:bg-tg-blue/90 active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
            >
              {isSummarizing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Summary & Tasks...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Extract Executive Brief & Action Items</span>
                </>
              )}
            </button>
          </div>

          {/* Results Display */}
          {summaryResult && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Executive Summary */}
              <div className="p-3.5 rounded-2xl bg-tg-bg-secondary border border-tg-border/30 space-y-2">
                <h4 className="text-xs font-bold text-tg-text flex items-center justify-between">
                  <span>Executive Brief (សេចក្តីសង្ខេបប្រតិបត្តិ)</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(summaryResult.execSummary);
                      toast('Brief copied! 📋', 'success');
                    }}
                    className="text-[11px] font-semibold text-tg-blue flex items-center gap-1 hover:underline"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                </h4>
                <p className="text-xs text-tg-text-secondary leading-relaxed bg-tg-surface p-3 rounded-xl border border-tg-border/25">
                  {summaryResult.execSummary}
                </p>
              </div>

              {/* Action Items Checklist */}
              <div className="p-3.5 rounded-2xl bg-tg-bg-secondary border border-tg-border/30 space-y-2.5">
                <h4 className="text-xs font-bold text-tg-text flex items-center justify-between">
                  <span>Action Items Checklist (កិច្ចការដែលត្រូវធ្វើ)</span>
                  <span className="text-[10px] text-tg-text-hint">Interactive</span>
                </h4>
                <div className="space-y-1.5">
                  {summaryResult.actionItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSummaryResult((prev) =>
                          prev
                            ? {
                                ...prev,
                                actionItems: prev.actionItems.map((a) =>
                                  a.id === item.id ? { ...a, done: !a.done } : a
                                ),
                              }
                            : null
                        );
                      }}
                      className="p-2.5 rounded-xl bg-tg-surface border border-tg-border/25 flex items-center gap-2.5 cursor-pointer hover:border-tg-blue/40 transition-colors"
                    >
                      {item.done ? (
                        <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-tg-text-hint shrink-0" />
                      )}
                      <span
                        className={`text-xs ${
                          item.done
                            ? 'line-through text-tg-text-hint'
                            : 'text-tg-text font-medium'
                        }`}
                      >
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 5. DEDICATED APP: VISION & OCR SCANNER
  if (activeSubApp === 'vision') {
    return (
      <div className="flex-1 flex flex-col h-full bg-tg-bg overflow-y-auto scrollbar-hide pb-24 select-none">
        {/* Top App Header with Back button */}
        <div className="px-4 pt-3 pb-2.5 safe-top border-b border-tg-border/20 sticky top-0 bg-tg-bg/95 backdrop-blur-xl z-20 flex items-center justify-between">
          <button
            onClick={() => setActiveSubApp(null)}
            className="flex items-center gap-1 text-tg-blue hover:opacity-80 active:scale-95 transition-all text-sm font-semibold -ml-1 py-1 pr-2"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl overflow-hidden bg-gradient-to-br from-sky-500 to-indigo-600 p-0.5 flex items-center justify-center text-white">
              <ScanText className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-tg-text">Vision & OCR Scanner</h2>
          </div>
          <div className="w-8" />
        </div>

        <div className="p-4 space-y-4 max-w-xl mx-auto w-full">
          {/* Scanner action container */}
          <div className="p-4 rounded-2xl bg-tg-bg-secondary border border-tg-border/30 text-center space-y-3">
            {scannedImage ? (
              <div className="rounded-xl overflow-hidden border border-tg-border/30 max-h-56 mx-auto relative">
                <img src={scannedImage} alt="Receipt Scan" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="py-8 border-2 border-dashed border-tg-border/40 rounded-xl flex flex-col items-center justify-center space-y-2">
                <ScanText className="w-10 h-10 text-tg-text-hint" />
                <p className="text-xs text-tg-text font-bold">Point camera or upload image</p>
                <p className="text-[11px] text-tg-text-hint">Extract text, receipts & tables</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={handleSimulateScan}
                disabled={isScanningOcr}
                className="flex-1 py-2.5 rounded-xl bg-tg-blue text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all disabled:opacity-50"
              >
                {isScanningOcr ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing Image OCR...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Scan Sample Receipt</span>
                  </>
                )}
              </button>
              <button
                onClick={() => router.push('/qr-scan')}
                className="py-2.5 px-3.5 rounded-xl bg-tg-surface border border-tg-border/40 text-tg-text font-semibold text-xs flex items-center gap-1 hover:bg-tg-surface/80 active:scale-95 transition-all"
              >
                <span>Live QR Scanner</span>
              </button>
            </div>
          </div>

          {/* OCR Result */}
          {ocrText && (
            <div className="p-3.5 rounded-2xl bg-tg-bg-secondary border border-tg-border/30 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-tg-text">Extracted Document Text</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(ocrText);
                    toast('Extracted text copied! 📋', 'success');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-tg-surface border border-tg-border/30 text-tg-blue text-xs font-semibold flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-tg-surface border border-tg-border/25 text-xs text-tg-text font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {ocrText}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW B: MAIN BANKING APP STYLE LAUNCHER (8 Distinct Apps Grid)
  // =========================================================================
  return (
    <div className="flex-1 flex flex-col h-full bg-tg-bg overflow-y-auto scrollbar-hide pb-24 select-none">
      {/* ── Top Header ── */}
      <div className="px-4 pt-3 pb-2.5 safe-top border-b border-tg-border/20 sticky top-0 bg-tg-bg/95 backdrop-blur-xl z-20">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl overflow-hidden shrink-0 border border-tg-border/20 flex items-center justify-center bg-tg-surface p-1 shadow-sm">
              <img src="/icons/ai-brain.png" alt="AI Hub" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-tg-text text-[19px] font-bold tracking-tight leading-tight">
                  AI Apps
                </h1>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-tg-blue/15 text-tg-blue">
                  Hub
                </span>
              </div>
              <p className="text-[11px] text-tg-text-hint font-medium">
                Telegram AI Mini Apps & Services
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

        {/* ── Search Bar ── */}
        <div className="relative">
          <Search className="w-4 h-4 text-tg-text-hint absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={menuSearch}
            onChange={(e) => setMenuSearch(e.target.value)}
            placeholder="Search AI apps (AI Call, Image Studio, Translate...)..."
            className="w-full bg-tg-surface border border-tg-border/30 rounded-xl pl-9 pr-8 py-2 text-xs text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue transition-all"
          />
          {menuSearch && (
            <button
              onClick={() => setMenuSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tg-text-hint hover:text-tg-text p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Banking Dashboard Body ── */}
      <div className="p-4 space-y-4 max-w-xl mx-auto w-full">
        {/* Featured Spotlight Card */}
        {!menuSearch && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/15 via-indigo-600/15 to-purple-600/15 border border-tg-blue/30 relative overflow-hidden shadow-xs">
            <div className="relative z-10 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white tracking-wide uppercase">
                  Featured App
                </span>
                <span className="text-[11px] text-tg-blue font-semibold">
                  AI Call & Voice Companions
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-tg-text leading-tight">
                  AI Call (Voice & Chat)
                </h3>
                <p className="text-xs text-tg-text-secondary mt-0.5 line-clamp-2">
                  Real-time two-way voice companions with Bopha, Lily, Dara, Dev Lead & more.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setActiveSubApp('voice')}
                  className="px-3.5 py-1.5 rounded-xl bg-tg-blue text-white text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-tg-blue/90 active:scale-95 transition-all"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Open AI Call</span>
                </button>
                <button
                  onClick={() => {
                    const defaultPersona = AI_PERSONAS.bopha || Object.values(AI_PERSONAS)[0];
                    if (defaultPersona) handleStartCall(defaultPersona);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-tg-surface border border-tg-border/40 text-tg-text text-xs font-semibold flex items-center gap-1.5 hover:bg-tg-surface/80 active:scale-95 transition-all"
                >
                  <span>Direct Call</span>
                  <ArrowRight className="w-3 h-3 text-tg-text-hint" />
                </button>
              </div>
            </div>

            <div className="absolute right-2 -bottom-3 w-28 h-28 opacity-15 pointer-events-none">
              <img src="/icons/ai-brain.png" alt="Decoration" className="w-full h-full object-contain" />
            </div>
          </div>
        )}

        {/* ── Section: AI Services (Banking App 4-Column Grid) ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-tg-text tracking-wide uppercase">
              AI Services Directory
            </h3>
            <span className="text-[11px] text-tg-text-hint font-medium">
              {filteredApps.length} Apps
            </span>
          </div>

          {/* 4-Column Banking Icon Grid */}
          <div className="grid grid-cols-4 gap-y-4 gap-x-2">
            {filteredApps.map((app) => (
              <button
                key={app.id}
                onClick={() => handleLaunchApp(app)}
                className="flex flex-col items-center text-center group active:scale-95 transition-transform focus:outline-none"
              >
                {/* Squircle Custom Icon Container */}
                <div className="relative w-15 h-15 sm:w-16 sm:h-16 rounded-[22px] p-0.5 shadow-sm border border-tg-border/30 bg-tg-surface group-hover:border-tg-blue/50 transition-colors flex items-center justify-center overflow-hidden">
                  {/* Subtle Gradient Glow */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${app.iconGradient} opacity-20 group-hover:opacity-30 transition-opacity`}
                  />

                  {/* Custom Icon Image */}
                  <div className="relative w-full h-full rounded-[18px] overflow-hidden flex items-center justify-center p-1.5">
                    <img
                      src={app.customIconSrc}
                      alt={app.name}
                      className="w-full h-full object-contain rounded-xl drop-shadow-xs"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>

                  {/* Corner Badge */}
                  {app.badge && (
                    <span
                      className={`absolute top-1 right-1 px-1 py-0.2 rounded-full text-[8px] font-extrabold text-white leading-tight ${
                        app.badgeColor || 'bg-tg-blue'
                      } shadow-xs`}
                    >
                      {app.badge}
                    </span>
                  )}
                </div>

                {/* App Label Underneath */}
                <span className="text-xs font-bold text-tg-text mt-1.5 group-hover:text-tg-blue transition-colors line-clamp-1 w-full px-0.5">
                  {app.name}
                </span>
                <span className="text-[10px] text-tg-text-hint line-clamp-1 w-full px-0.5 font-medium">
                  {app.khmerName}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Section: Quick Highlights ── */}
        <div className="pt-2 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-tg-text tracking-wide uppercase">
              Quick Highlights
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Quick Card 1: AI Call */}
            <div
              onClick={() => setActiveSubApp('voice')}
              className="p-3 rounded-2xl bg-tg-bg-secondary border border-tg-border/25 hover:border-tg-border/60 cursor-pointer active:scale-[0.98] transition-all flex items-center gap-2.5"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-rose-500 to-pink-500 p-1 flex items-center justify-center text-white shrink-0">
                <Mic className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-tg-text truncate">AI Call</h4>
                <p className="text-[10px] text-tg-text-hint truncate">Voice Companions</p>
              </div>
            </div>

            {/* Quick Card 2: Image Studio */}
            <div
              onClick={() => setActiveSubApp('image')}
              className="p-3 rounded-2xl bg-tg-bg-secondary border border-tg-border/25 hover:border-tg-border/60 cursor-pointer active:scale-[0.98] transition-all flex items-center gap-2.5"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 p-1 flex items-center justify-center text-white shrink-0">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-tg-text truncate">Image Studio</h4>
                <p className="text-[10px] text-tg-text-hint truncate">បង្កើតរូបភាព 4K</p>
              </div>
            </div>

            {/* Quick Card 3: AI Translate */}
            <div
              onClick={() => setActiveSubApp('khmer')}
              className="p-3 rounded-2xl bg-tg-bg-secondary border border-tg-border/25 hover:border-tg-border/60 cursor-pointer active:scale-[0.98] transition-all flex items-center gap-2.5"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-1 flex items-center justify-center text-white shrink-0">
                <Languages className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-tg-text truncate">AI Translate</h4>
                <p className="text-[10px] text-tg-text-hint truncate">បកប្រែ & អក្ខរាវិរុទ្ធ</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
