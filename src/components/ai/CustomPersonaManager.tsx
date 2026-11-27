'use client';
import { useState, useRef } from 'react';
import {
  ArrowLeft, Plus, Trash2, Pencil, Mic, Sparkles, Check, X,
  Wand2, Image as ImageIcon, Loader2, Phone,
} from 'lucide-react';
import { usePersonaStore, type CustomPersona, type CustomVoice } from '@/store/persona.store';
import { useUIStore } from '@/store/ui.store';
import { cfAutoGenPersona, cfGenImage } from '@/services/cloudflare';
import { toast } from '@/components/ui/Toast';

// ── voice options ────────────────────────────────────────────────────────────
const VOICES: { id: CustomVoice; label: string; desc: string; color: string }[] = [
  { id: 'Aoede',  label: 'Aoede',  desc: 'Warm & melodic',         color: 'text-pink-400' },
  { id: 'Kore',   label: 'Kore',   desc: 'Clear & youthful',       color: 'text-cyan-400' },
  { id: 'Puck',   label: 'Puck',   desc: 'Bright & energetic',     color: 'text-emerald-400' },
  { id: 'Charon', label: 'Charon', desc: 'Deep & authoritative',   color: 'text-blue-400' },
  { id: 'Fenrir', label: 'Fenrir', desc: 'Smooth & confident',     color: 'text-purple-400' },
];

// ── gradient presets ─────────────────────────────────────────────────────────
const GRADIENTS = [
  { from: '#f472b6', to: '#ec4899' },
  { from: '#06b6d4', to: '#0891b2' },
  { from: '#10b981', to: '#059669' },
  { from: '#3b82f6', to: '#1d4ed8' },
  { from: '#a855f7', to: '#c026d3' },
  { from: '#f59e0b', to: '#d97706' },
  { from: '#ef4444', to: '#b91c1c' },
  { from: '#6366f1', to: '#4338ca' },
  { from: '#14b8a6', to: '#0d9488' },
  { from: '#f97316', to: '#ea580c' },
];

const EMOJIS = ['🤖','✨','🌸','💫','🦊','🐉','⚡','🎯','🎵','🌙','🔥','💎','🌊','🌿','👑','🦋','🎭','🧠','🌺','🏆'];

type FormState = Omit<CustomPersona, 'id' | 'createdAt' | 'updatedAt'>;

const blank = (): FormState => ({
  name: '',
  tagline: '',
  description: '',
  voice: 'Aoede',
  prompt: '',
  greeting: '',
  avatarEmoji: '🤖',
  avatarImage: undefined,
  gradientFrom: GRADIENTS[0].from,
  gradientTo: GRADIENTS[0].to,
});

// ── Avatar preview ────────────────────────────────────────────────────────────
function AvatarCircle({
  emoji, from, to, image, size = 'md',
}: { emoji: string; from: string; to: string; image?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const szClass = {
    sm: 'w-10 h-10 text-base',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-20 h-20 text-3xl',
    xl: 'w-28 h-28 text-4xl',
  }[size];

  return (
    <div
      className={`${szClass} rounded-full flex items-center justify-center shrink-0 shadow-xl overflow-hidden`}
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

// ── Editor ─────────────────────────────────────────────────────────────────
interface EditorProps {
  initial: FormState & { id?: string };
  onSave: (data: FormState) => void;
  onCancel: () => void;
}

function PersonaEditor({ initial, onSave, onCancel }: EditorProps) {
  const [form, setForm] = useState<FormState>({ ...initial });
  const [tab, setTab] = useState<'basic' | 'voice' | 'prompt'>('basic');
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [genConcept, setGenConcept] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [showGenBar, setShowGenBar] = useState(false);

  const setF = (k: keyof FormState, v: string | undefined) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) e.name = 'Name required';
    if (!form.prompt.trim()) e.prompt = 'System prompt required';
    if (!form.greeting.trim()) e.greeting = 'Greeting required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── AI Auto-generate all fields ──────────────────────────────────────────
  const handleAutoGen = async () => {
    const concept = genConcept.trim() || form.name.trim() || 'a friendly AI companion';
    setGenLoading(true);
    try {
      const result = await cfAutoGenPersona(concept);
      setForm((f) => ({
        ...f,
        name: result.name,
        tagline: result.tagline,
        description: result.description,
        voice: result.voice,
        prompt: result.prompt,
        greeting: result.greeting,
        avatarEmoji: result.avatarEmoji,
      }));
      setShowGenBar(false);
      toast('✨ Character generated!');
      setTab('basic');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'AI generation failed', 'error');
    } finally {
      setGenLoading(false);
    }
  };

  // ── Generate avatar image ────────────────────────────────────────────────
  const handleGenImage = async () => {
    const imagePrompt = form.description
      ? `Portrait avatar of ${form.name || 'an AI character'}: ${form.description}. Digital art, clean background, vibrant colors, friendly face.`
      : `Portrait avatar of ${form.name || 'a friendly AI character'}. Digital art, vibrant colors, clean background.`;

    setImgLoading(true);
    try {
      const dataUrl = await cfGenImage(imagePrompt);
      setF('avatarImage', dataUrl);
      toast('🎨 Avatar image generated!');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Image generation failed', 'error');
    } finally {
      setImgLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-tg-bg">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-tg-border/30 shrink-0">
        <button onClick={onCancel} className="p-1.5 -ml-1.5 rounded-full hover:bg-tg-surface text-tg-text-hint hover:text-tg-text transition-colors">
          <X className="w-5 h-5" />
        </button>
        <span className="font-semibold text-tg-text flex-1 text-base">
          {initial.name ? `Edit — ${initial.name}` : 'New AI Character'}
        </span>
        <button
          onClick={() => setShowGenBar((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all active:scale-95 ${
            showGenBar ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-tg-surface border border-tg-border/30 text-tg-text-hint hover:text-tg-text'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> AI
        </button>
        <button
          onClick={() => { if (validate()) onSave(form); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tg-blue text-white text-sm font-medium active:scale-95 transition-transform"
        >
          <Check className="w-4 h-4" /> Save
        </button>
      </div>

      {/* ── AI Generate bar ── */}
      {showGenBar && (
        <div className="px-4 py-3 border-b border-purple-500/20 bg-purple-500/5 shrink-0">
          <p className="text-xs font-medium text-purple-400 mb-2 flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5" /> Auto-generate character with Cloudflare AI
          </p>
          <div className="flex gap-2">
            <input
              value={genConcept}
              onChange={(e) => setGenConcept(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !genLoading && handleAutoGen()}
              placeholder='e.g. "sweet Khmer girl who loves music" or "sci-fi robot advisor"'
              className="flex-1 bg-tg-surface border border-purple-500/30 rounded-xl px-3 py-2 text-sm text-tg-text placeholder:text-tg-text-hint/60 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleAutoGen}
              disabled={genLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500 text-white text-sm font-medium disabled:opacity-60 active:scale-95 transition-all shrink-0"
            >
              {genLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {genLoading ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </div>
      )}

      {/* ── Avatar hero ── */}
      <div className="flex items-center gap-4 px-4 py-4 border-b border-tg-border/20 shrink-0 bg-tg-bg-secondary/40">
        <div className="relative">
          <AvatarCircle emoji={form.avatarEmoji} from={form.gradientFrom} to={form.gradientTo} image={form.avatarImage} size="lg" />
          <button
            onClick={handleGenImage}
            disabled={imgLoading}
            title="Generate avatar image with AI"
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform disabled:opacity-60"
          >
            {imgLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-tg-text text-lg truncate">{form.name || 'Unnamed'}</p>
          <p className="text-xs text-tg-text-hint truncate">{form.tagline || 'No tagline yet'}</p>
          <p className="text-xs text-tg-text-hint/60 mt-0.5">Voice: <span className="text-tg-text-hint">{form.voice}</span></p>
        </div>
        {form.avatarImage && (
          <button
            onClick={() => setF('avatarImage', undefined)}
            className="p-1.5 rounded-full text-tg-text-hint hover:text-tg-red transition-colors"
            title="Remove AI image"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 px-4 py-2.5 border-b border-tg-border/20 shrink-0 bg-tg-bg">
        {(['basic', 'voice', 'prompt'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
              tab === t ? 'bg-tg-blue text-white shadow-sm' : 'text-tg-text-hint hover:text-tg-text hover:bg-tg-surface'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {tab === 'basic' && (
          <>
            <Field label="Name *" error={errors.name}>
              <input
                value={form.name}
                onChange={(e) => setF('name', e.target.value)}
                placeholder="e.g. Sopheap, Nova, Aria..."
                className="w-full bg-tg-surface border border-tg-border/40 rounded-2xl px-4 py-3 text-sm text-tg-text placeholder:text-tg-text-hint/50 focus:outline-none focus:border-tg-blue transition-colors"
              />
            </Field>

            <Field label="Tagline">
              <input
                value={form.tagline}
                onChange={(e) => setF('tagline', e.target.value)}
                placeholder="e.g. Sweet & Cheerful Companion"
                className="w-full bg-tg-surface border border-tg-border/40 rounded-2xl px-4 py-3 text-sm text-tg-text placeholder:text-tg-text-hint/50 focus:outline-none focus:border-tg-blue transition-colors"
              />
            </Field>

            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => setF('description', e.target.value)}
                placeholder="Short bio — also used as the image prompt hint..."
                rows={2}
                className="w-full bg-tg-surface border border-tg-border/40 rounded-2xl px-4 py-3 text-sm text-tg-text placeholder:text-tg-text-hint/50 focus:outline-none focus:border-tg-blue transition-colors resize-none"
              />
            </Field>

            {/* emoji */}
            <Field label="Avatar Emoji">
              <div className="grid grid-cols-10 gap-1.5">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setF('avatarEmoji', e)}
                    className={`aspect-square rounded-xl text-lg flex items-center justify-center transition-all active:scale-90 ${
                      form.avatarEmoji === e && !form.avatarImage
                        ? 'bg-tg-blue/20 ring-2 ring-tg-blue scale-110'
                        : 'bg-tg-surface hover:bg-tg-surface/80'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </Field>

            {/* gradient */}
            <Field label="Avatar Color">
              <div className="flex flex-wrap gap-2.5">
                {GRADIENTS.map((g) => (
                  <button
                    key={g.from}
                    onClick={() => { setF('gradientFrom', g.from); setF('gradientTo', g.to); }}
                    className={`w-9 h-9 rounded-full transition-all active:scale-90 ${
                      form.gradientFrom === g.from ? 'scale-125 ring-2 ring-white/60 shadow-lg' : 'shadow'
                    }`}
                    style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
                  />
                ))}
              </div>
            </Field>

            {/* Generate image CTA */}
            <button
              onClick={handleGenImage}
              disabled={imgLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-orange-500/30 bg-orange-500/8 text-orange-400 text-sm font-medium active:scale-[0.99] transition-all disabled:opacity-60"
            >
              {imgLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
              {imgLoading ? 'Generating avatar image…' : '🎨 Generate AI Avatar Image (Cloudflare Flux)'}
            </button>
          </>
        )}

        {tab === 'voice' && (
          <div className="space-y-2">
            {VOICES.map((v) => (
              <button
                key={v.id}
                onClick={() => setF('voice', v.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all active:scale-[0.99] ${
                  form.voice === v.id
                    ? 'border-tg-blue bg-tg-blue/10 text-tg-text'
                    : 'border-tg-border/30 bg-tg-surface text-tg-text'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${form.voice === v.id ? 'bg-tg-blue/20' : 'bg-tg-bg'}`}>
                  <Mic className={`w-4 h-4 ${form.voice === v.id ? 'text-tg-blue' : v.color}`} />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold">{v.label}</p>
                  <p className="text-xs text-tg-text-hint">{v.desc}</p>
                </div>
                {form.voice === v.id && (
                  <div className="w-5 h-5 rounded-full bg-tg-blue flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {tab === 'prompt' && (
          <>
            <Field label="System Prompt *" error={errors.prompt}>
              <textarea
                value={form.prompt}
                onChange={(e) => setF('prompt', e.target.value)}
                placeholder={'You are [Name] — describe personality, language, tone, rules…\n\nExample: You are Sopheap — a warm, friendly Cambodian girl. Speak in natural Khmer mixed with English. Keep answers short and conversational.'}
                rows={9}
                className="w-full bg-tg-surface border border-tg-border/40 rounded-2xl px-4 py-3 text-sm text-tg-text placeholder:text-tg-text-hint/50 focus:outline-none focus:border-tg-blue transition-colors resize-none font-mono leading-relaxed"
              />
            </Field>

            <Field label="Opening Greeting *" error={errors.greeting}>
              <textarea
                value={form.greeting}
                onChange={(e) => setF('greeting', e.target.value)}
                placeholder="What the AI says when the call connects…"
                rows={3}
                className="w-full bg-tg-surface border border-tg-border/40 rounded-2xl px-4 py-3 text-sm text-tg-text placeholder:text-tg-text-hint/50 focus:outline-none focus:border-tg-blue transition-colors resize-none"
              />
            </Field>

            <div className="p-3.5 rounded-2xl bg-tg-blue/8 border border-tg-blue/20 text-xs text-tg-text-hint leading-relaxed">
              <Sparkles className="w-3.5 h-3.5 text-tg-blue inline mr-1.5" />
              <strong className="text-tg-text">Pro tip:</strong> Keep the prompt under 400 words.
              Start with <code className="bg-tg-surface px-1 rounded">You are...</code>, specify the language, what nickname to use, and response length.
              Hit the <strong className="text-purple-400">AI button</strong> at the top to auto-generate everything from a simple concept.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-tg-text-hint uppercase tracking-wide">{label}</label>
      {children}
      {error && <p className="text-xs text-tg-red">{error}</p>}
    </div>
  );
}

// ── Main list view ─────────────────────────────────────────────────────────
interface Props { onBack: () => void }

export function CustomPersonaManager({ onBack }: Props) {
  const { customs, addPersona, updatePersona, deletePersona } = usePersonaStore();
  const { setAiPersona, startAiCall } = useUIStore();
  const [editing, setEditing] = useState<(FormState & { id?: string }) | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleSave = (data: FormState) => {
    if (editing?.id) {
      updatePersona(editing.id, data);
      toast('Character updated ✨');
    } else {
      addPersona(data);
      toast('New AI character created 🎉');
    }
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    deletePersona(id);
    setConfirmDelete(null);
    toast('Character deleted');
  };

  if (editing !== null) {
    return <PersonaEditor initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} />;
  }

  return (
    <div className="flex flex-col h-full bg-tg-bg">
      {/* header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-tg-border/30 shrink-0">
        <button onClick={onBack} className="p-1.5 -ml-1.5 rounded-full hover:bg-tg-surface text-tg-text-hint hover:text-tg-text transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-tg-text">My AI Characters</h2>
          <p className="text-xs text-tg-text-hint">{customs.length} custom {customs.length === 1 ? 'character' : 'characters'}</p>
        </div>
        <button
          onClick={() => setEditing(blank())}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tg-blue text-white text-sm font-semibold active:scale-95 transition-transform shadow-sm"
        >
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      {/* list */}
      <div className="flex-1 overflow-y-auto">
        {customs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 px-6 text-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500/20 to-tg-blue/20 flex items-center justify-center border border-purple-500/20">
                <Sparkles className="w-10 h-10 text-purple-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-tg-blue flex items-center justify-center shadow-lg">
                <Wand2 className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div>
              <p className="font-bold text-tg-text text-base">No custom characters yet</p>
              <p className="text-sm text-tg-text-hint mt-1 leading-relaxed">
                Create your own AI persona with a custom voice, personality,<br />
                AI-generated avatar, and opening greeting.
              </p>
            </div>
            <button
              onClick={() => setEditing(blank())}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-tg-blue text-white text-sm font-semibold shadow-lg active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4" /> Create First Character
            </button>
          </div>
        ) : (
          <div className="divide-y divide-tg-border/15 py-1">
            {customs.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-tg-surface/40 transition-colors">
                <AvatarCircle
                  emoji={p.avatarEmoji}
                  from={p.gradientFrom}
                  to={p.gradientTo}
                  image={p.avatarImage}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-tg-text truncate">{p.name}</p>
                  <p className="text-xs text-tg-text-hint truncate">{p.tagline || p.voice}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setAiPersona(p.id); startAiCall(p.id); }}
                    title="Start call"
                    className="w-8 h-8 rounded-full bg-tg-blue/15 text-tg-blue flex items-center justify-center active:scale-90 transition-transform hover:bg-tg-blue/25"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditing({ ...p })}
                    title="Edit"
                    className="w-8 h-8 rounded-full bg-tg-surface text-tg-text-hint flex items-center justify-center active:scale-90 transition-transform hover:text-tg-text"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(p.id)}
                    title="Delete"
                    className="w-8 h-8 rounded-full bg-tg-surface text-tg-text-hint flex items-center justify-center active:scale-90 transition-transform hover:text-tg-red"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm pb-8 px-4">
          <div className="w-full max-w-sm bg-tg-bg-secondary border border-tg-border/40 rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <p className="font-bold text-tg-text text-center mb-1">Delete character?</p>
            <p className="text-sm text-tg-text-hint text-center mb-5">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 rounded-2xl bg-tg-surface text-tg-text text-sm font-medium active:scale-95 transition-transform">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-3 rounded-2xl bg-tg-red text-white text-sm font-semibold active:scale-95 transition-transform">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
