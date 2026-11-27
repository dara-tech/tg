'use client';
import { useState } from 'react';
import {
  ArrowLeft, Plus, Trash2, Pencil, Mic, Sparkles, Check, X,
  Wand2, Image as ImageIcon, Loader2, Phone, RefreshCw,
} from 'lucide-react';
import { usePersonaStore, type CustomPersona, type CustomVoice } from '@/store/persona.store';
import { useUIStore } from '@/store/ui.store';
import { cfAutoGenPersona, cfGenImage } from '@/services/cloudflare';
import { toast } from '@/components/ui/Toast';

// ── Voice Options ─────────────────────────────────────────────────────────────
const VOICES: { id: CustomVoice; label: string; desc: string; color: string }[] = [
  { id: 'Aoede',  label: 'Aoede',  desc: 'Warm & melodic (Best for friendly/gentle)', color: 'text-pink-400' },
  { id: 'Kore',   label: 'Kore',   desc: 'Clear & youthful (Best for energetic)',     color: 'text-cyan-400' },
  { id: 'Puck',   label: 'Puck',   desc: 'Bright & witty (Best for banter/comedy)',   color: 'text-emerald-400' },
  { id: 'Charon', label: 'Charon', desc: 'Deep & authoritative (Best for tech/lead)', color: 'text-blue-400' },
  { id: 'Fenrir', label: 'Fenrir', desc: 'Smooth & confident (Best for advisor)',     color: 'text-purple-400' },
];

// ── Gradients ─────────────────────────────────────────────────────────────────
const GRADIENTS = [
  { from: '#8b5cf6', to: '#6d28d9' },
  { from: '#f472b6', to: '#ec4899' },
  { from: '#06b6d4', to: '#0891b2' },
  { from: '#10b981', to: '#059669' },
  { from: '#3b82f6', to: '#1d4ed8' },
  { from: '#f59e0b', to: '#d97706' },
  { from: '#ef4444', to: '#b91c1c' },
  { from: '#6366f1', to: '#4338ca' },
];

const EMOJIS = ['✨','🤖','🌸','🦊','🐉','⚡','🎯','🎵','🌙','🔥','💎','👑','🦋','🎭','🧠','🌺'];

type FormState = Omit<CustomPersona, 'id' | 'createdAt' | 'updatedAt'>;

const blank = (): FormState => ({
  name: '',
  tagline: '',
  description: '',
  voice: 'Aoede',
  prompt: '',
  greeting: '',
  avatarEmoji: '✨',
  avatarImage: undefined,
  gradientFrom: GRADIENTS[0].from,
  gradientTo: GRADIENTS[0].to,
});

// ── Avatar Preview ─────────────────────────────────────────────────────────────
function AvatarCircle({
  emoji, from, to, image, size = 'md',
}: { emoji: string; from: string; to: string; image?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const szClass = {
    sm: 'w-11 h-11 text-base',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-20 h-20 text-3xl',
    xl: 'w-24 h-24 text-4xl',
  }[size];

  return (
    <div
      className={`${szClass} rounded-full flex items-center justify-center shrink-0 shadow-lg overflow-hidden border border-white/10`}
      style={image ? {} : { background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {image ? (
        <img src={image} alt="avatar" className="w-full h-full object-cover" />
      ) : (
        <span>{emoji}</span>
      )}
    </div>
  );
}

// ── Persona Editor ─────────────────────────────────────────────────────────────
interface EditorProps {
  initial: FormState & { id?: string };
  onSave: (data: FormState) => void;
  onCancel: () => void;
}

function PersonaEditor({ initial, onSave, onCancel }: EditorProps) {
  const [form, setForm] = useState<FormState>({ ...initial });
  const [tab, setTab] = useState<'basic' | 'voice' | 'prompt'>('basic');
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [genIdea, setGenIdea] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [showAutoBar, setShowAutoBar] = useState(!initial.name);

  const setF = (k: keyof FormState, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.prompt.trim()) e.prompt = 'System prompt is required';
    if (!form.greeting.trim()) e.greeting = 'Greeting is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Full AI Auto-Generation from Concept
  const handleAutoGen = async () => {
    const concept = genIdea.trim() || form.name.trim() || 'A sweet and supportive Cambodian companion';
    setGenLoading(true);
    try {
      toast('Generating character with Cloudflare AI...', 'info');
      const res = await cfAutoGenPersona(concept);
      setForm((f) => ({
        ...f,
        name: res.name,
        tagline: res.tagline,
        description: res.description,
        voice: res.voice,
        prompt: res.prompt,
        greeting: res.greeting,
        avatarEmoji: res.avatarEmoji,
      }));

      // Automatically generate avatar image right away!
      try {
        toast('Generating avatar portrait with Cloudflare Flux...', 'info');
        const img = await cfGenImage(res.imagePrompt);
        setF('avatarImage', img);
      } catch (imgErr) {
        console.warn('Image auto-gen warning:', imgErr);
      }

      toast('✨ AI Character & Avatar created!');
      setShowAutoBar(false);
    } catch (err: any) {
      toast(err?.message || 'Generation failed', 'error');
    } finally {
      setGenLoading(false);
    }
  };

  // Image-only Generator
  const handleGenImage = async () => {
    setImgLoading(true);
    try {
      const prompt = form.description
        ? `High-quality portrait photo of ${form.name}: ${form.description}, digital art, clean aesthetic, studio lighting, looking directly at camera`
        : `High-quality portrait photo of ${form.name || 'a friendly AI companion'}, digital art, clean aesthetic, studio lighting`;

      toast('Generating image with Flux Schnell...', 'info');
      const dataUrl = await cfGenImage(prompt);
      setF('avatarImage', dataUrl);
      toast('🎨 Avatar image updated!');
    } catch (err: any) {
      toast(err?.message || 'Image generation failed', 'error');
    } finally {
      setImgLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-tg-bg">
      {/* Top Bar */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-tg-border/30 shrink-0">
        <button
          onClick={onCancel}
          className="p-1.5 -ml-1.5 rounded-full hover:bg-tg-surface text-tg-text-hint hover:text-tg-text transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <span className="font-bold text-tg-text text-base flex items-center gap-1.5 truncate">
            {initial.name ? `Edit "${initial.name}"` : 'New AI Character'}
          </span>
        </div>
        <button
          onClick={() => setShowAutoBar((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
            showAutoBar
              ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
              : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Auto-Gen</span>
        </button>
        <button
          onClick={() => { if (validate()) onSave(form); }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-tg-blue text-white text-xs font-bold active:scale-95 transition-transform shadow-md"
        >
          <Check className="w-3.5 h-3.5" /> Save
        </button>
      </div>

      {/* Auto-Gen Banner */}
      {showAutoBar && (
        <div className="px-4 py-3 border-b border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent shrink-0 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 mb-2">
            <Sparkles className="w-4 h-4 fill-purple-400/20" />
            <span>Cloudflare AI Auto-Generation</span>
          </div>
          <div className="flex gap-2">
            <input
              value={genIdea}
              onChange={(e) => setGenIdea(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !genLoading && handleAutoGen()}
              placeholder='e.g. "sweet Khmer girl" or "senior tech lead"'
              className="flex-1 bg-tg-surface border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-purple-400"
            />
            <button
              onClick={handleAutoGen}
              disabled={genLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold disabled:opacity-60 active:scale-95 transition-all shadow-md shrink-0"
            >
              {genLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{genLoading ? 'Crafting...' : 'Generate ✨'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Character Profile Hero */}
      <div className="flex items-center gap-4 px-4 py-4 border-b border-tg-border/20 shrink-0 bg-tg-bg-secondary/40">
        <div className="relative group">
          <AvatarCircle
            emoji={form.avatarEmoji}
            from={form.gradientFrom}
            to={form.gradientTo}
            image={form.avatarImage}
            size="lg"
          />
          <button
            onClick={handleGenImage}
            disabled={imgLoading}
            title="Generate portrait with Cloudflare Flux"
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform disabled:opacity-60"
          >
            {imgLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-tg-text text-lg truncate">{form.name || 'Unnamed Character'}</p>
            <span className="p-0.5 rounded-full bg-purple-500/20 text-purple-400">
              <Sparkles className="w-3 h-3" />
            </span>
          </div>
          <p className="text-xs text-tg-text-hint truncate mt-0.5">{form.tagline || 'Ready to talk'}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 rounded-full bg-tg-surface text-[10px] font-semibold text-tg-blue border border-tg-border/30">
              Voice: {form.voice}
            </span>
            {form.avatarImage && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-[10px] font-semibold text-purple-400 border border-purple-500/20">
                Flux Image
              </span>
            )}
          </div>
        </div>
        {form.avatarImage && (
          <button
            onClick={() => setF('avatarImage', undefined)}
            className="p-1.5 rounded-full text-tg-text-hint hover:text-tg-red transition-colors"
            title="Remove generated image"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-tg-border/20 shrink-0 bg-tg-bg">
        {(['basic', 'voice', 'prompt'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
              tab === t
                ? 'bg-tg-blue text-white shadow-sm'
                : 'text-tg-text-hint hover:text-tg-text hover:bg-tg-surface'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {tab === 'basic' && (
          <>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-tg-text-hint">Character Name *</label>
              <input
                value={form.name}
                onChange={(e) => setF('name', e.target.value)}
                placeholder="e.g. Sopheap, Sakura, Nova..."
                className="w-full bg-tg-surface border border-tg-border/40 rounded-xl px-3.5 py-2.5 text-sm text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue"
              />
              {errors.name && <p className="text-xs text-tg-red">{errors.name}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-tg-text-hint">Tagline</label>
              <input
                value={form.tagline}
                onChange={(e) => setF('tagline', e.target.value)}
                placeholder="e.g. Sweet & Cheerful Voice Companion"
                className="w-full bg-tg-surface border border-tg-border/40 rounded-xl px-3.5 py-2.5 text-sm text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-tg-text-hint">Character Bio</label>
              <textarea
                value={form.description}
                onChange={(e) => setF('description', e.target.value)}
                placeholder="Short bio (used as prompt for Flux portrait generation)..."
                rows={2}
                className="w-full bg-tg-surface border border-tg-border/40 rounded-xl px-3.5 py-2.5 text-sm text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue resize-none"
              />
            </div>

            {/* Cloudflare Flux Image Generator Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-tg-text flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Cloudflare Flux Avatar</span>
                </p>
                <p className="text-[11px] text-tg-text-hint truncate mt-0.5">
                  {form.avatarImage ? 'Custom Flux portrait generated' : 'Generate photorealistic AI avatar portrait'}
                </p>
              </div>
              <button
                onClick={handleGenImage}
                disabled={imgLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold shadow-md active:scale-95 disabled:opacity-60 transition-all shrink-0"
              >
                {imgLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                <span>{imgLoading ? 'Generating...' : 'Gen Image'}</span>
              </button>
            </div>

            {/* Emoji & Colors */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-tg-text-hint">Fallback Emoji</label>
              <div className="grid grid-cols-8 gap-1.5">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setF('avatarEmoji', e)}
                    className={`aspect-square rounded-xl text-lg flex items-center justify-center transition-all ${
                      form.avatarEmoji === e
                        ? 'bg-tg-blue/20 ring-2 ring-tg-blue scale-105'
                        : 'bg-tg-surface hover:bg-tg-surface/80'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-tg-text-hint">Theme Gradient</label>
              <div className="flex flex-wrap gap-2">
                {GRADIENTS.map((g) => (
                  <button
                    key={g.from}
                    onClick={() => { setF('gradientFrom', g.from); setF('gradientTo', g.to); }}
                    className={`w-8 h-8 rounded-full transition-all ${
                      form.gradientFrom === g.from ? 'scale-110 ring-2 ring-white/70 shadow-md' : 'opacity-80'
                    }`}
                    style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'voice' && (
          <div className="space-y-2">
            <p className="text-xs text-tg-text-hint mb-2">
              Gemini Live Voice Engine — Choose the voice frequency and timbre for live voice calls:
            </p>
            {VOICES.map((v) => (
              <button
                key={v.id}
                onClick={() => setF('voice', v.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl border transition-all text-left ${
                  form.voice === v.id
                    ? 'border-tg-blue bg-tg-blue/10 text-tg-text'
                    : 'border-tg-border/30 bg-tg-surface text-tg-text'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${form.voice === v.id ? 'bg-tg-blue/20' : 'bg-tg-bg'}`}>
                  <Mic className={`w-4 h-4 ${form.voice === v.id ? 'text-tg-blue' : v.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{v.label}</p>
                  <p className="text-xs text-tg-text-hint truncate">{v.desc}</p>
                </div>
                {form.voice === v.id && (
                  <Check className="w-4 h-4 text-tg-blue shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {tab === 'prompt' && (
          <>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-tg-text-hint">System Prompt (Persona Instruction) *</label>
              <textarea
                value={form.prompt}
                onChange={(e) => setF('prompt', e.target.value)}
                placeholder={'You are [Name] — describe personality, dialect, tone, rules...\n\nExample: You are Sopheap, a friendly Cambodian companion. Speak in natural polite Khmer. Keep responses concise (1-2 sentences) for real-time phone audio.'}
                rows={8}
                className="w-full bg-tg-surface border border-tg-border/40 rounded-xl px-3.5 py-2.5 text-xs text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue font-mono leading-relaxed resize-none"
              />
              {errors.prompt && <p className="text-xs text-tg-red">{errors.prompt}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-tg-text-hint">Opening Greeting *</label>
              <textarea
                value={form.greeting}
                onChange={(e) => setF('greeting', e.target.value)}
                placeholder="What the AI says aloud as soon as the call connects..."
                rows={3}
                className="w-full bg-tg-surface border border-tg-border/40 rounded-xl px-3.5 py-2.5 text-xs text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue resize-none"
              />
              {errors.greeting && <p className="text-xs text-tg-red">{errors.greeting}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Custom Personas Manager Screen ────────────────────────────────────────
interface Props { onBack: () => void }

export function CustomPersonaManager({ onBack }: Props) {
  const { customs, addPersona, updatePersona, deletePersona } = usePersonaStore();
  const { setAiPersona, startAiCall } = useUIStore();
  const [editing, setEditing] = useState<(FormState & { id?: string }) | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [quickConcept, setQuickConcept] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);

  const handleSave = (data: FormState) => {
    if (editing?.id) {
      updatePersona(editing.id, data);
      toast('Character updated ✨');
    } else {
      addPersona(data);
      toast('Character created 🎉');
    }
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    deletePersona(id);
    setConfirmDelete(null);
    toast('Character deleted');
  };

  // Quick 1-Click Auto-Gen from the home list
  const handleQuickAutoGen = async () => {
    if (!quickConcept.trim()) return;
    setQuickLoading(true);
    try {
      toast('Auto-generating persona with Cloudflare Llama-3.3...', 'info');
      const res = await cfAutoGenPersona(quickConcept.trim());

      let imgUrl: string | undefined = undefined;
      try {
        toast('Generating Flux Schnell portrait...', 'info');
        imgUrl = await cfGenImage(res.imagePrompt);
      } catch (err) {
        console.warn('Image generation warning:', err);
      }

      const created = addPersona({
        name: res.name,
        tagline: res.tagline,
        description: res.description,
        voice: res.voice,
        prompt: res.prompt,
        greeting: res.greeting,
        avatarEmoji: res.avatarEmoji,
        avatarImage: imgUrl,
        gradientFrom: GRADIENTS[0].from,
        gradientTo: GRADIENTS[0].to,
      });

      setQuickConcept('');
      toast(`✨ Created "${created.name}"!`);
    } catch (err: any) {
      toast(err?.message || 'Quick generation failed', 'error');
    } finally {
      setQuickLoading(false);
    }
  };

  if (editing !== null) {
    return <PersonaEditor initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} />;
  }

  return (
    <div className="flex flex-col h-full bg-tg-bg">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-tg-border/30 shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1.5 rounded-full hover:bg-tg-surface text-tg-text-hint hover:text-tg-text transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-tg-text flex items-center gap-1.5">
            <span>My AI Characters</span>
            <span className="p-0.5 rounded-full bg-purple-500/20 text-purple-400">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
          </h2>
          <p className="text-xs text-tg-text-hint">{customs.length} custom persona{customs.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setEditing(blank())}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tg-blue text-white text-xs font-bold active:scale-95 transition-transform shadow-md"
        >
          <Plus className="w-3.5 h-3.5" /> New
        </button>
      </div>

      {/* Quick AI Auto-Gen Box */}
      <div className="px-4 py-3.5 border-b border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 fill-purple-400/20" />
            <span>AI Auto-Gen Character</span>
          </span>
          <span className="text-[10px] text-tg-text-hint font-medium">Cloudflare AI + Flux</span>
        </div>
        <div className="flex gap-2">
          <input
            value={quickConcept}
            onChange={(e) => setQuickConcept(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !quickLoading && handleQuickAutoGen()}
            placeholder='e.g. "Cambodian street food chef", "Cyberpunk hacker"'
            className="flex-1 bg-tg-surface border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-tg-text placeholder:text-tg-text-hint/60 focus:outline-none focus:border-purple-400"
          />
          <button
            onClick={handleQuickAutoGen}
            disabled={quickLoading || !quickConcept.trim()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold disabled:opacity-50 active:scale-95 transition-all shadow-md shrink-0"
          >
            {quickLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{quickLoading ? 'Creating...' : 'Gen ✨'}</span>
          </button>
        </div>
      </div>

      {/* Persona List */}
      <div className="flex-1 overflow-y-auto">
        {customs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center py-10">
            <div className="relative">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-500/20 via-sky-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/30 shadow-lg">
                <Sparkles className="w-8 h-8 text-purple-400" />
              </div>
            </div>
            <div>
              <p className="font-bold text-tg-text text-base">No Custom Characters</p>
              <p className="text-xs text-tg-text-hint mt-1 max-w-xs leading-relaxed">
                Type an idea in the box above to generate a unique character with AI voice and portrait!
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-tg-border/15 py-1">
            {customs.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-tg-surface/40 transition-colors">
                <AvatarCircle
                  emoji={p.avatarEmoji}
                  from={p.gradientFrom}
                  to={p.gradientTo}
                  image={p.avatarImage}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-tg-text truncate">{p.name}</p>
                    <span className="p-0.5 rounded-full bg-purple-500/15 text-purple-400">
                      <Sparkles className="w-3 h-3" />
                    </span>
                  </div>
                  <p className="text-xs text-tg-text-hint truncate mt-0.5">{p.tagline || p.voice}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setAiPersona(p.id); startAiCall(p.id); }}
                    title="Start Live AI Call"
                    className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center active:scale-90 transition-transform shadow-md shadow-purple-500/20"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEditing({ ...p })}
                    title="Edit character"
                    className="w-8 h-8 rounded-full bg-tg-surface text-tg-text-hint flex items-center justify-center active:scale-90 transition-transform hover:text-tg-text"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(p.id)}
                    title="Delete character"
                    className="w-8 h-8 rounded-full bg-tg-surface text-tg-text-hint flex items-center justify-center active:scale-90 transition-transform hover:text-tg-red"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm pb-8 px-4">
          <div className="w-full max-w-sm bg-tg-bg-secondary border border-tg-border/40 rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <p className="font-bold text-tg-text text-center mb-1">Delete AI Character?</p>
            <p className="text-xs text-tg-text-hint text-center mb-5">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-tg-surface text-tg-text text-xs font-semibold active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 rounded-xl bg-tg-red text-white text-xs font-semibold active:scale-95 transition-transform shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
