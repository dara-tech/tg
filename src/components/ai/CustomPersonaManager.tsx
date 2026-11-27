'use client';
import { useState } from 'react';
import {
  ArrowLeft, Plus, Trash2, Pencil, Mic, Sparkles, Check, X,
} from 'lucide-react';
import { usePersonaStore, type CustomPersona, type CustomVoice } from '@/store/persona.store';
import { useUIStore } from '@/store/ui.store';
import { toast } from '@/components/ui/Toast';

// ── voice options (Gemini Live voices) ──────────────────────────────────────
const VOICES: { id: CustomVoice; label: string; desc: string }[] = [
  { id: 'Aoede', label: 'Aoede', desc: 'Warm & melodic' },
  { id: 'Kore',  label: 'Kore',  desc: 'Clear & youthful' },
  { id: 'Puck',  label: 'Puck',  desc: 'Bright & energetic' },
  { id: 'Charon',label: 'Charon',desc: 'Deep & authoritative' },
  { id: 'Fenrir',label: 'Fenrir',desc: 'Smooth & confident' },
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
];

const EMOJIS = ['🤖','✨','🌸','💫','🦊','🐉','⚡','🎯','🎵','🌙','🔥','💎','🌊','🌿','👑','🦋'];

// ── blank form ───────────────────────────────────────────────────────────────
const blank = (): Omit<CustomPersona, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: '',
  tagline: '',
  description: '',
  voice: 'Aoede',
  prompt: '',
  greeting: '',
  avatarEmoji: '🤖',
  gradientFrom: GRADIENTS[0].from,
  gradientTo: GRADIENTS[0].to,
});

// ── sub-components ───────────────────────────────────────────────────────────
function AvatarCircle({
  emoji, from, to, size = 'md',
}: { emoji: string; from: string; to: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'w-20 h-20 text-3xl' : size === 'sm' ? 'w-9 h-9 text-base' : 'w-12 h-12 text-xl';
  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center shrink-0 shadow`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {emoji}
    </div>
  );
}

type FormState = Omit<CustomPersona, 'id' | 'createdAt' | 'updatedAt'>;

interface EditorProps {
  initial: FormState & { id?: string };
  onSave: (data: FormState) => void;
  onCancel: () => void;
}

function PersonaEditor({ initial, onSave, onCancel }: EditorProps) {
  const [form, setForm] = useState<FormState>({ ...initial });
  const [tab, setTab] = useState<'basic' | 'voice' | 'prompt'>('basic');
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const set = (k: keyof FormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'Name required';
    if (!form.prompt.trim()) e.prompt = 'System prompt required';
    if (!form.greeting.trim()) e.greeting = 'Greeting required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (validate()) onSave(form);
  };

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-tg-border/30">
        <button onClick={onCancel} className="p-1 -ml-1 text-tg-text-hint hover:text-tg-text">
          <X className="w-5 h-5" />
        </button>
        <span className="font-semibold text-tg-text flex-1">
          {initial.name ? `Edit "${initial.name}"` : 'New AI Character'}
        </span>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tg-blue text-white text-sm font-medium active:scale-95 transition-transform"
        >
          <Check className="w-4 h-4" /> Save
        </button>
      </div>

      {/* avatar preview */}
      <div className="flex items-center gap-4 px-4 py-4 border-b border-tg-border/20">
        <AvatarCircle emoji={form.avatarEmoji} from={form.gradientFrom} to={form.gradientTo} size="lg" />
        <div>
          <p className="font-semibold text-tg-text">{form.name || 'Unnamed'}</p>
          <p className="text-xs text-tg-text-hint">{form.tagline || 'No tagline'}</p>
        </div>
      </div>

      {/* tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-tg-border/20">
        {(['basic', 'voice', 'prompt'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
              tab === t ? 'bg-tg-blue text-white' : 'text-tg-text-hint hover:text-tg-text'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* tab content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {tab === 'basic' && (
          <>
            {/* name */}
            <Field label="Name *" error={errors.name}>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Sopheap"
                className="w-full bg-tg-surface border border-tg-border/30 rounded-xl px-3 py-2 text-sm text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue"
              />
            </Field>

            {/* tagline */}
            <Field label="Tagline">
              <input
                value={form.tagline}
                onChange={(e) => set('tagline', e.target.value)}
                placeholder="e.g. Sweet & Cheerful Companion"
                className="w-full bg-tg-surface border border-tg-border/30 rounded-xl px-3 py-2 text-sm text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue"
              />
            </Field>

            {/* description */}
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Short description of this character…"
                rows={2}
                className="w-full bg-tg-surface border border-tg-border/30 rounded-xl px-3 py-2 text-sm text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue resize-none"
              />
            </Field>

            {/* emoji picker */}
            <Field label="Avatar Emoji">
              <div className="grid grid-cols-8 gap-1.5">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => set('avatarEmoji', e)}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                      form.avatarEmoji === e
                        ? 'bg-tg-blue/20 ring-1 ring-tg-blue scale-110'
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
              <div className="flex flex-wrap gap-2">
                {GRADIENTS.map((g) => (
                  <button
                    key={g.from}
                    onClick={() => { set('gradientFrom', g.from); set('gradientTo', g.to); }}
                    className={`w-8 h-8 rounded-full transition-all ${
                      form.gradientFrom === g.from ? 'scale-125 ring-2 ring-white/60' : ''
                    }`}
                    style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
                  />
                ))}
              </div>
            </Field>
          </>
        )}

        {tab === 'voice' && (
          <Field label="Gemini Voice">
            <div className="space-y-2">
              {VOICES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => set('voice', v.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                    form.voice === v.id
                      ? 'border-tg-blue bg-tg-blue/10 text-tg-text'
                      : 'border-tg-border/30 bg-tg-surface text-tg-text'
                  }`}
                >
                  <Mic className={`w-4 h-4 shrink-0 ${form.voice === v.id ? 'text-tg-blue' : 'text-tg-text-hint'}`} />
                  <div className="text-left">
                    <p className="text-sm font-medium">{v.label}</p>
                    <p className="text-xs text-tg-text-hint">{v.desc}</p>
                  </div>
                  {form.voice === v.id && <Check className="w-4 h-4 text-tg-blue ml-auto" />}
                </button>
              ))}
            </div>
          </Field>
        )}

        {tab === 'prompt' && (
          <>
            <Field label="System Prompt *" error={errors.prompt}>
              <textarea
                value={form.prompt}
                onChange={(e) => set('prompt', e.target.value)}
                placeholder={`Describe the character's personality, language style, tone, and rules.\n\nExample: You are Sopheap — a warm, friendly Cambodian girl. Speak in natural Khmer mixed with English. Keep answers short and conversational.`}
                rows={8}
                className="w-full bg-tg-surface border border-tg-border/30 rounded-xl px-3 py-2 text-sm text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue resize-none font-mono leading-relaxed"
              />
            </Field>

            <Field label="Opening Greeting *" error={errors.greeting}>
              <textarea
                value={form.greeting}
                onChange={(e) => set('greeting', e.target.value)}
                placeholder="What the AI says when the call connects…"
                rows={3}
                className="w-full bg-tg-surface border border-tg-border/30 rounded-xl px-3 py-2 text-sm text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue resize-none"
              />
            </Field>

            <div className="p-3 rounded-xl bg-tg-blue/8 border border-tg-blue/20 text-xs text-tg-text-hint leading-relaxed">
              <Sparkles className="w-3.5 h-3.5 text-tg-blue inline mr-1" />
              <strong className="text-tg-text">Tips:</strong> Keep the system prompt under 500 words.
              Use first-person (&ldquo;You are…&rdquo;). Tell it what language to speak, what nickname to use,
              and how long to keep answers.
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
      <label className="text-xs font-medium text-tg-text-hint">{label}</label>
      {children}
      {error && <p className="text-xs text-tg-red">{error}</p>}
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────
interface Props {
  onBack: () => void;
}

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

  const handleCall = (p: CustomPersona) => {
    setAiPersona(p.id);
    startAiCall(p.id);
  };

  // Editor mode
  if (editing !== null) {
    return (
      <div className="flex flex-col h-full bg-tg-bg">
        <PersonaEditor
          initial={editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-tg-bg">
      {/* header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-tg-border/30 shrink-0">
        <button onClick={onBack} className="p-1 -ml-1 text-tg-text-hint hover:text-tg-text">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="font-semibold text-tg-text">My AI Characters</h2>
          <p className="text-xs text-tg-text-hint">{customs.length} custom {customs.length === 1 ? 'character' : 'characters'}</p>
        </div>
        <button
          onClick={() => setEditing(blank())}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tg-blue text-white text-sm font-medium active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      {/* list */}
      <div className="flex-1 overflow-y-auto">
        {customs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-tg-surface flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-tg-blue" />
            </div>
            <div>
              <p className="font-semibold text-tg-text">No custom characters yet</p>
              <p className="text-sm text-tg-text-hint mt-1">
                Create your own AI persona with a custom voice, personality, and greeting.
              </p>
            </div>
            <button
              onClick={() => setEditing(blank())}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-tg-blue text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Create First Character
            </button>
          </div>
        ) : (
          <div className="divide-y divide-tg-border/20">
            {customs.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <AvatarCircle emoji={p.avatarEmoji} from={p.gradientFrom} to={p.gradientTo} size="sm" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-tg-text truncate">{p.name}</p>
                  <p className="text-xs text-tg-text-hint truncate">{p.tagline || p.voice}</p>
                </div>

                {/* actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleCall(p)}
                    title="Start call"
                    className="w-8 h-8 rounded-full bg-tg-blue/15 text-tg-blue flex items-center justify-center active:scale-90 transition-transform hover:bg-tg-blue/25"
                  >
                    <Mic className="w-4 h-4" />
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
          <div className="w-full max-w-sm bg-tg-bg-secondary border border-tg-border/40 rounded-3xl p-5 shadow-2xl">
            <p className="font-semibold text-tg-text text-center mb-1">Delete character?</p>
            <p className="text-sm text-tg-text-hint text-center mb-5">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-2xl bg-tg-surface text-tg-text text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 rounded-2xl bg-tg-red text-white text-sm font-medium"
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
