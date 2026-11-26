'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Avatar }      from '@/components/ui/Avatar';
import { SearchBar }   from '@/components/ui/SearchBar';
import { DialogSkeletonList } from '@/components/ui/Skeleton';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input }       from '@/components/ui/Input';
import { Button }      from '@/components/ui/Button';
import { toast }       from '@/components/ui/Toast';
import { useDialogsStore } from '@/store/dialogs.store';
import { fetchRealContacts, importRealContact, isMTProtoConfigured, type RealContactItem } from '@/services/telegram.real';

export default function ContactsScreen() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'chats' | 'users' | 'online'>('all');
  const [contacts, setContacts] = useState<RealContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const { dialogs } = useDialogsStore();

  const loadContacts = useCallback(() => {
    if (!isMTProtoConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchRealContacts()
      .then(setContacts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleAddContact = async () => {
    if (!phone.trim() || !firstName.trim()) {
      toast('Phone and first name are required', 'error');
      return;
    }
    setSaving(true);
    try {
      await importRealContact(phone.trim(), firstName.trim(), lastName.trim());
      toast('Contact added', 'success');
      setAddOpen(false);
      setPhone('');
      setFirstName('');
      setLastName('');
      loadContacts();
    } catch (e: unknown) {
      const err = e as { error_message?: string; message?: string };
      toast(err?.error_message || err?.message || 'Failed to add contact', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filtered = contacts
    .filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()))
    .filter(c => (filter === 'online' ? c.online : true));

  const recentChats = dialogs.slice(0, 8);

  return (
    <div className="flex flex-col h-full bg-tg-bg">
      {/* Screenshot 5 Header: Search pill + filter pills */}
      <div className="px-4 pt-3 pb-2.5 bg-tg-bg safe-top space-y-2.5 border-b border-tg-border/35">
        <div className="flex items-center justify-between">
          <h1 className="text-tg-text text-[26px] font-bold tracking-tight">People</h1>
          <button
            onClick={() => setAddOpen(true)}
            className="w-9 h-9 rounded-full bg-tg-bg-secondary border border-tg-border/40 flex items-center justify-center text-tg-blue active:scale-95 transition-transform"
            aria-label="Add contact"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <SearchBar placeholder="Search (⌘K)" onSearch={setQ} />

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {(['all', 'chats', 'users', 'online'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-tg-blue text-white shadow-sm'
                  : 'border border-tg-border/40 bg-tg-bg-secondary text-tg-text-secondary'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-4">
        {/* RECENT CHATS horizontal row (Screenshot 5) */}
        {recentChats.length > 0 && !q && (
          <div className="pt-3 pb-3 border-b border-tg-border/35">
            <p className="text-tg-text-hint text-[11px] font-semibold uppercase tracking-wider px-4 mb-2.5">
              Recent Chats
            </p>
            <div className="flex gap-4 px-4 overflow-x-auto scrollbar-hide">
              {recentChats.map((d) => (
                <button
                  key={d.id}
                  onClick={() => router.push(`/chat/${d.id}`)}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-14 active:scale-95 transition-transform"
                >
                  <Avatar
                    letters={d.avatarLetters}
                    color={d.avatarColor}
                    online={d.isOnline}
                    size="md"
                    peerType={d.peerType}
                    peerId={d.peerId}
                    accessHash={d.accessHash}
                    hasPhoto={d.hasPhoto}
                    photoId={d.photoId}
                  />
                  <span className="text-tg-text-secondary text-[11px] truncate w-full text-center">
                    {d.title.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SUGGESTED CONTACTS (Screenshot 5) */}
        <p className="text-tg-text-hint text-[11px] font-semibold uppercase tracking-wider px-4 pt-3 pb-1">
          Suggested Contacts
        </p>

        {loading && contacts.length === 0 && <DialogSkeletonList count={6} />}
        {!loading && filtered.length === 0 && (
          <p className="text-tg-text-hint text-sm text-center mt-12">No contacts found</p>
        )}
        {filtered.map(c => (
          <button key={c.id} onClick={() => router.push(`/chat/u_${c.id}`)} className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-tg-surface text-left">
            <Avatar
              letters={c.letters}
              color={c.color}
              online={c.online}
              peerType="user"
              peerId={c.id}
              accessHash={c.accessHash}
              hasPhoto={c.hasPhoto}
              photoId={c.photoId}
            />
            <div className="flex-1 min-w-0">
              <p className="text-tg-text font-semibold text-sm truncate">{c.name}</p>
              <p className="text-tg-text-hint text-xs truncate">{c.username || c.phone || 'Telegram user'}</p>
            </div>
            {c.online && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-[11px] font-medium shrink-0">
                online
              </span>
            )}
          </button>
        ))}
      </div>

      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="New Contact">
        <div className="p-5 space-y-3">
          <Input label="First Name" placeholder="Alice" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Input label="Last Name (optional)" placeholder="Johnson" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          <Input label="Phone Number" type="tel" placeholder="+1 234 567 8900" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div className="flex items-center gap-2 pt-2">
            <Button variant="secondary" onClick={() => setAddOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleAddContact} loading={saving} className="flex-1">Add Contact</Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
