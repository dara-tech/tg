'use client';
import { useState } from 'react';
import {
  ArrowLeft, Plus, Trash2, Pencil, Check, X,
  Wand2, Image as ImageIcon, Loader2, Phone, Bot, Sparkles,
} from 'lucide-react';
import { usePersonaStore, type CustomPersona, type CustomVoice } from '@/store/persona.store';
import { useUIStore } from '@/store/ui.store';
import { cfAutoGenPersona, cfGenImage } from '@/services/cloudflare';
import { toast } from '@/components/ui/Toast';

const VOICES: { id: CustomVoice; label: string; desc: string }[] = [
  { id: 'Aoede',  label: 'Aoede',  desc: 'Warm & melodic' },
  { id: 'Kore',   label: 'Kore',   desc: 'Clear & youthful' },
  { id: 'Puck',   label: 'Puck',   desc: 'Bright & witty' },
  { id: 'Charon', label: 'Charon', desc: 'Deep & authoritative' },
  { id: 'Fenrir', label: 'Fenrir', desc: 'Smooth & confident' },
];

const EMOJIS = ['🤖', '🌸', '🦊', '⚡', '🎯', '🎵', '🌙', '🔥', '💎', '👑', '🦋', '🧠'];

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
  gradientFrom: '#3b82f6',
  gradientTo: '#1d4ed8',
});

// ── Clean Avatar ─────────────────────────────────────────────────────────────
function Avatar({
  emoji, image, size = 'md',
}: { emoji: string; image?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const szClass = {
    sm: 'w-10 h-10 text-base',
    md: 'w-12 h-12 text-xl',
    lg: 'w-20 h-20 text-3xl',
    xl: 'w-24 h-24 text-4xl',
  }[size];

  return (
    <div
      className={`${szClass} rounded-full flex items-center justify-center shrink-0 bg-tg-surface border border-tg-border/30 overflow-hidden select-none`}
    >
      {image ? (
        <img src={image} alt="avatar" className="w-full h-full object-cover" />
      ) : (
        <span>{emoji}</span>
      )}
    </div>
  );
}

// ── Editor ───────────────────────────────────────────────────────────────────
interface EditorProps {
  initial: FormState & { id?: string };
  onSave: (data: FormState) => void;
  onCancel: () => void;
}

function PersonaEditor({ initial, onSave, onCancel }: EditorProps) {
  const [form, setForm] = useState<FormState>({ ...initial });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);

  const setF = (k: keyof FormState, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.prompt.trim()) e.prompt = 'System instructions are required';
    if (!form.greeting.trim()) e.greeting = 'Greeting is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAutoGen = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await cfAutoGenPersona(aiPrompt.trim());
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

      try {
        const img = await cfGenImage(res.imagePrompt);
        setF('avatarImage', img);
      } catch (e) {
        console.warn('Auto image gen skipped:', e);
      }

      setAiModalOpen(false);
      setAiPrompt('');
      toast('Character generated');
    } catch (err: any) {
      toast(err?.message || 'Generation failed', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenImage = async () => {
    setImgLoading(true);
    try {
      const prompt = form.description
        ? `Portrait avatar of ${form.name}: ${form.description}, clean background, professional digital portrait`
        : `Portrait avatar of ${form.name || 'a virtual companion'}, clean background, studio lighting`;

      const dataUrl = await cfGenImage(prompt);
      setF('avatarImage', dataUrl);
      toast('Avatar image generated');
    } catch (err: any) {
      toast(err?.message || 'Image generation failed', 'error');
    } finally {
      setImgLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-tg-bg text-tg-text">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-tg-border/20 shrink-0">
        <button
          onClick={onCancel}
          className="text-sm text-tg-text-hint hover:text-tg-text transition-colors"
        >
          Cancel
        </button>
        <span className="font-semibold text-sm">
          {initial.name ? 'Edit Character' : 'New Character'}
        </span>
        <button
          onClick={() => { if (validate()) onSave(form); }}
          className="text-sm font-semibold text-tg-blue active:opacity-70 transition-opacity"
        >
          Save
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-3">
          <Avatar emoji={form.avatarEmoji} image={form.avatarImage} size="xl" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenImage}
              disabled={imgLoading}
              className="text-xs font-medium text-tg-blue hover:underline flex items-center gap-1 active:opacity-70"
            >
              {imgLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
              <span>{imgLoading ? 'Generating...' : form.avatarImage ? 'Regenerate Photo' : 'Generate Photo'}</span>
            </button>
            {form.avatarImage && (
              <>
                <span className="text-tg-text-hint text-xs">•</span>
                <button
                  type="button"
                  onClick={() => setF('avatarImage', undefined)}
                  className="text-xs text-tg-red hover:underline active:opacity-70"
                >
                  Remove
                </button>
              </>
            )}
          </div>
        </div>

        {/* AI Helper Banner */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-tg-surface border border-tg-border/30">
          <div>
            <p className="text-xs font-medium text-tg-text">Auto-Fill with AI</p>
            <p className="text-[11px] text-tg-text-hint">Generate personality, prompt, and photo</p>
          </div>
          <button
            type="button"
            onClick={() => setAiModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-tg-blue/10 text-tg-blue text-xs font-semibold hover:bg-tg-blue/15 active:scale-95 transition-all flex items-center gap-1"
          >
            <Wand2 className="w-3 h-3" />
            <span>Auto-Gen</span>
          </button>
        </div>

        {/* General Info */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-tg-text-hint uppercase tracking-wider px-1">General</p>
          <div className="bg-tg-surface rounded-xl border border-tg-border/30 divide-y divide-tg-border/20 overflow-hidden">
            <div className="p-3 space-y-1">
              <label className="text-[11px] text-tg-text-hint font-medium">Name</label>
              <input
                value={form.name}
                onChange={(e) => setF('name', e.target.value)}
                placeholder="e.g. Sopheap"
                className="w-full bg-transparent text-sm text-tg-text placeholder:text-tg-text-hint/40 focus:outline-none"
              />
              {errors.name && <p className="text-[11px] text-tg-red">{errors.name}</p>}
            </div>

            <div className="p-3 space-y-1">
              <label className="text-[11px] text-tg-text-hint font-medium">Tagline</label>
              <input
                value={form.tagline}
                onChange={(e) => setF('tagline', e.target.value)}
                placeholder="e.g. Friendly Tech Lead"
                className="w-full bg-transparent text-sm text-tg-text placeholder:text-tg-text-hint/40 focus:outline-none"
              />
            </div>

            <div className="p-3 space-y-1">
              <label className="text-[11px] text-tg-text-hint font-medium">Bio</label>
              <textarea
                value={form.description}
                onChange={(e) => setF('description', e.target.value)}
                placeholder="Short description..."
                rows={2}
                className="w-full bg-transparent text-sm text-tg-text placeholder:text-tg-text-hint/40 focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Voice Selection */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-tg-text-hint uppercase tracking-wider px-1">Voice (Gemini Live)</p>
          <div className="bg-tg-surface rounded-xl border border-tg-border/30 divide-y divide-tg-border/20 overflow-hidden">
            {VOICES.map((v) => {
              const selected = form.voice === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setF('voice', v.id)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-tg-border/10 transition-colors"
                >
                  <div>
                    <p className={`text-sm ${selected ? 'font-semibold text-tg-blue' : 'text-tg-text'}`}>{v.label}</p>
                    <p className="text-[11px] text-tg-text-hint">{v.desc}</p>
                  </div>
                  {selected && <Check className="w-4 h-4 text-tg-blue shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-tg-text-hint uppercase tracking-wider px-1">Instructions</p>
          <div className="bg-tg-surface rounded-xl border border-tg-border/30 divide-y divide-tg-border/20 overflow-hidden">
            <div className="p-3 space-y-1">
              <label className="text-[11px] text-tg-text-hint font-medium">System Prompt</label>
              <textarea
                value={form.prompt}
                onChange={(e) => setF('prompt', e.target.value)}
                placeholder="You are [Name]... Describe personality, style, dialect, and rules."
                rows={5}
                className="w-full bg-transparent text-xs text-tg-text placeholder:text-tg-text-hint/40 focus:outline-none resize-none font-mono leading-relaxed"
              />
              {errors.prompt && <p className="text-[11px] text-tg-red">{errors.prompt}</p>}
            </div>

            <div className="p-3 space-y-1">
              <label className="text-[11px] text-tg-text-hint font-medium">Opening Greeting</label>
              <textarea
                value={form.greeting}
                onChange={(e) => setF('greeting', e.target.value)}
                placeholder="What the AI says aloud when call connects..."
                rows={2}
                className="w-full bg-transparent text-xs text-tg-text placeholder:text-tg-text-hint/40 focus:outline-none resize-none leading-relaxed"
              />
              {errors.greeting && <p className="text-[11px] text-tg-red">{errors.greeting}</p>}
            </div>
          </div>
        </div>

        {/* Fallback Emoji */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-tg-text-hint uppercase tracking-wider px-1">Fallback Icon</p>
          <div className="flex flex-wrap gap-2 p-3 bg-tg-surface rounded-xl border border-tg-border/30">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setF('avatarEmoji', e)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                  form.avatarEmoji === e && !form.avatarImage
                    ? 'bg-tg-blue/20 ring-1 ring-tg-blue'
                    : 'hover:bg-tg-border/20'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Auto-Gen Dialog */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-tg-bg-secondary border border-tg-border/40 rounded-2xl p-4 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-tg-text">Auto-Generate Character</p>
              <button
                onClick={() => setAiModalOpen(false)}
                className="text-tg-text-hint hover:text-tg-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-tg-text-hint">
              Enter a brief description. Cloudflare AI will design the persona and generate the avatar photo.
            </p>
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !aiLoading && handleAutoGen()}
              placeholder='e.g. "Sweet Cambodian girl" or "Financial Advisor"'
              className="w-full bg-tg-surface border border-tg-border/40 rounded-xl px-3 py-2 text-xs text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAiModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-tg-text hover:bg-tg-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAutoGen}
                disabled={aiLoading || !aiPrompt.trim()}
                className="px-4 py-1.5 rounded-lg bg-tg-blue text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {aiLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>{aiLoading ? 'Generating...' : 'Generate'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── List View ────────────────────────────────────────────────────────────────
interface Props { onBack: () => void }

export function CustomPersonaManager({ onBack }: Props) {
  const { customs, addPersona, updatePersona, deletePersona } = usePersonaStore();
  const { setAiPersona, startAiCall } = useUIStore();
  const [editing, setEditing] = useState<(FormState & { id?: string }) | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleSave = (data: FormState) => {
    if (editing?.id) {
      updatePersona(editing.id, data);
      toast('Character updated');
    } else {
      addPersona(data);
      toast('Character created');
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
    <div className="flex flex-col h-full bg-tg-bg text-tg-text">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-tg-border/20 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 -ml-1 text-tg-text-hint hover:text-tg-text transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold text-base">Custom Characters</span>
        </div>
        <button
          onClick={() => setEditing(blank())}
          className="text-sm font-semibold text-tg-blue hover:opacity-80 active:opacity-60 transition-opacity flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          <span>New</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Quick Create Action */}
        <button
          type="button"
          onClick={() => setEditing(blank())}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-tg-surface border border-tg-border/30 hover:bg-tg-border/10 text-left transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-tg-blue/10 flex items-center justify-center text-tg-blue shrink-0">
            <Plus className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-tg-text">Create AI Character</p>
            <p className="text-xs text-tg-text-hint">Add prompt, greeting, voice, and portrait</p>
          </div>
        </button>

        {/* Character List */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-tg-text-hint uppercase tracking-wider px-1">
            Saved Characters ({customs.length})
          </p>

          {customs.length === 0 ? (
            <div className="py-12 text-center space-y-2 bg-tg-surface rounded-xl border border-tg-border/20">
              <Bot className="w-8 h-8 mx-auto text-tg-text-hint/40" />
              <p className="text-sm font-medium text-tg-text">No characters yet</p>
              <p className="text-xs text-tg-text-hint max-w-xs mx-auto">
                Tap above to design a custom persona for live voice calling.
              </p>
            </div>
          ) : (
            <div className="bg-tg-surface rounded-xl border border-tg-border/30 divide-y divide-tg-border/20 overflow-hidden">
              {customs.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 hover:bg-tg-border/10 transition-colors">
                  <Avatar emoji={p.avatarEmoji} image={p.avatarImage} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-tg-text truncate">{p.name}</p>
                    <p className="text-xs text-tg-text-hint truncate mt-0.5">
                      {p.tagline || p.voice}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => { setAiPersona(p.id); startAiCall(p.id); }}
                      title="Call"
                      className="w-8 h-8 rounded-full bg-tg-blue/10 text-tg-blue flex items-center justify-center active:scale-90 transition-transform hover:bg-tg-blue/20"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing({ ...p })}
                      title="Edit"
                      className="w-8 h-8 rounded-full hover:bg-tg-border/30 text-tg-text-hint flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(p.id)}
                      title="Delete"
                      className="w-8 h-8 rounded-full hover:bg-tg-red/10 text-tg-text-hint hover:text-tg-red flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xs bg-tg-bg-secondary border border-tg-border/40 rounded-2xl p-4 space-y-3 shadow-2xl">
            <p className="font-semibold text-sm text-tg-text text-center">Delete Character?</p>
            <p className="text-xs text-tg-text-hint text-center">This cannot be undone.</p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-xl bg-tg-surface text-xs font-medium text-tg-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2 rounded-xl bg-tg-red text-xs font-semibold text-white shadow-sm"
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
