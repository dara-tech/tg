'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  Upload,
  Plus,
  RefreshCw,
  Copy,
  Calendar as CalendarIcon,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  Filter,
  DollarSign,
  Receipt,
  ExternalLink,
} from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { toast } from '@/components/ui/Toast';
import clsx from 'clsx';
import { format } from 'date-fns';

export interface BankTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  amount: number;
  currency: 'USD' | 'KHR';
  type: 'credit' | 'debit'; // credit = incoming (+), debit = outgoing (-)
  bank: 'ABA' | 'Bakong' | 'ACLEDA' | 'Wing' | 'Canadia' | 'Other';
  description: string;
  counterparty?: string;
  reference?: string;
  category: 'income' | 'expense' | 'payroll' | 'invoice' | 'transfer';
  source?: 'manual' | 'csv' | 'erp';
}

const STORAGE_KEY = 'tg_bank_transactions_v1';
const SYNC_CONFIG_KEY = 'tg_calendar_sync_config_v2';

const SAMPLE_TRANSACTIONS: BankTransaction[] = [
  {
    id: 'tx-1',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '11:20',
    amount: 850.0,
    currency: 'USD',
    type: 'credit',
    bank: 'ABA',
    description: 'Client Milestone 1 Settlement',
    counterparty: 'Tech Innovators Co.',
    reference: 'ABA-FT261127001',
    category: 'income',
    source: 'erp',
  },
  {
    id: 'tx-2',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:45',
    amount: 120.0,
    currency: 'USD',
    type: 'debit',
    bank: 'ABA',
    description: 'Cloud Infrastructure & Hosting Server',
    counterparty: 'Vercel / Cloudflare',
    reference: 'ABA-POS261127022',
    category: 'expense',
    source: 'erp',
  },
  {
    id: 'tx-3',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '13:00',
    amount: 250000,
    currency: 'KHR',
    type: 'debit',
    bank: 'Bakong',
    description: 'Office Supplies & Utilities',
    counterparty: 'City Stationery Mart',
    reference: 'BKG-KHQR849201',
    category: 'expense',
    source: 'manual',
  },
];

const BANK_BADGES: Record<BankTransaction['bank'], { color: string; label: string }> = {
  ABA:     { color: 'bg-[#004B6E] text-white border-[#00608F]', label: 'ABA Bank' },
  Bakong:  { color: 'bg-[#E1251B] text-white border-[#F04438]', label: 'Bakong KHQR' },
  ACLEDA:  { color: 'bg-[#002D62] text-white border-[#0F4C81]', label: 'ACLEDA' },
  Wing:    { color: 'bg-[#91C73E] text-[#1A3300] border-[#A8E04C]', label: 'Wing Bank' },
  Canadia: { color: 'bg-[#C8102E] text-white border-[#E02444]', label: 'Canadia' },
  Other:   { color: 'bg-purple-600 text-white border-purple-500', label: 'Bank Transfer' },
};

export interface BankTransactionsModalProps {
  open: boolean;
  onClose: () => void;
  onSyncToCalendar?: (tx: BankTransaction) => void;
}

export function BankTransactionsModal({
  open,
  onClose,
  onSyncToCalendar,
}: BankTransactionsModalProps) {
  const [transactions, setTransactions] = useState<BankTransaction[]>(() => {
    if (typeof window === 'undefined') return SAMPLE_TRANSACTIONS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return SAMPLE_TRANSACTIONS;
  });

  const [activeTab, setActiveTab] = useState<'all' | 'credit' | 'debit'>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'KHR'>('USD');
  const [isFetchingErp, setIsFetchingErp] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  // Manual Transaction Form
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('USD');
  const [type, setType] = useState<'credit' | 'debit'>('credit');
  const [bank, setBank] = useState<BankTransaction['bank']>('ABA');
  const [description, setDescription] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [reference, setReference] = useState('');
  const [category, setCategory] = useState<BankTransaction['category']>('income');
  const [addToCalendarCheck, setAddToCalendarCheck] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch {}
  }, [transactions]);

  // Totals
  const totals = useMemo(() => {
    let incomeUSD = 0;
    let expenseUSD = 0;
    let incomeKHR = 0;
    let expenseKHR = 0;

    transactions.forEach((t) => {
      if (t.currency === 'USD') {
        if (t.type === 'credit') incomeUSD += t.amount;
        else expenseUSD += t.amount;
      } else {
        if (t.type === 'credit') incomeKHR += t.amount;
        else expenseKHR += t.amount;
      }
    });

    return {
      incomeUSD,
      expenseUSD,
      netUSD: incomeUSD - expenseUSD,
      incomeKHR,
      expenseKHR,
      netKHR: incomeKHR - expenseKHR,
    };
  }, [transactions]);

  // Filtered List
  const filteredList = useMemo(() => {
    return transactions.filter((t) => {
      if (activeTab === 'credit' && t.type !== 'credit') return false;
      if (activeTab === 'debit' && t.type !== 'debit') return false;
      return true;
    });
  }, [transactions, activeTab]);

  // Fetch bank transactions from ERP API
  const handleFetchFromErp = async () => {
    setIsFetchingErp(true);
    try {
      const cfgRaw = localStorage.getItem(SYNC_CONFIG_KEY);
      const cfg = cfgRaw ? JSON.parse(cfgRaw) : {};
      const endpoint = cfg.erpApiUrl?.trim();
      const token = cfg.erpToken?.trim();

      if (!endpoint) {
        toast('Please configure ERP API Endpoint in Profile Settings', 'error');
        setIsFetchingErp(false);
        return;
      }

      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      // Query bank transactions from ERP endpoint
      const bankUrl = endpoint.includes('/bank') ? endpoint : `${endpoint.replace(/\/+$/, '')}/bank-transactions`;
      const res = await fetch(bankUrl, { headers });

      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.transactions || data.items || [];
        if (list.length > 0) {
          const parsedList: BankTransaction[] = list.map((item: any, i: number) => ({
            id: `erp-tx-${item.id || item.ref || Date.now() + i}`,
            date: item.date || format(new Date(), 'yyyy-MM-dd'),
            time: item.time || '12:00',
            amount: Number(item.amount) || 0,
            currency: (item.currency === 'KHR' ? 'KHR' : 'USD') as 'USD' | 'KHR',
            type: item.type === 'debit' || item.amount < 0 ? 'debit' : 'credit',
            bank: (['ABA', 'Bakong', 'ACLEDA', 'Wing', 'Canadia'].includes(item.bank) ? item.bank : 'Other') as BankTransaction['bank'],
            description: item.description || item.memo || 'ERP Bank Transaction',
            counterparty: item.counterparty || item.partner || '',
            reference: item.reference || item.ref || '',
            category: item.category || (item.type === 'debit' ? 'expense' : 'income'),
            source: 'erp',
          }));

          setTransactions((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const fresh = parsedList.filter((p) => !existingIds.has(p.id));
            return [...fresh, ...prev];
          });
          toast(`Synced ${parsedList.length} transactions from ERP`, 'success');
        } else {
          toast('ERP endpoint connected: No new transactions found', 'info');
        }
      } else {
        toast('ERP endpoint returned error. Check settings.', 'error');
      }
    } catch (err: any) {
      toast(`ERP sync failed: ${err.message || 'Network error'}`, 'error');
    } finally {
      setIsFetchingErp(false);
    }
  };

  // CSV Bank Statement Import Parser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        // Simple and robust CSV line parser
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          toast('CSV file is empty or missing rows', 'error');
          return;
        }

        const headers = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
        const dateIdx = headers.findIndex((h) => h.includes('date'));
        const descIdx = headers.findIndex((h) => h.includes('desc') || h.includes('memo') || h.includes('detail') || h.includes('narr'));
        const amountIdx = headers.findIndex((h) => h.includes('amount') || h.includes('value'));
        const creditIdx = headers.findIndex((h) => h.includes('credit') || h.includes('inflow') || h.includes('deposit'));
        const debitIdx = headers.findIndex((h) => h.includes('debit') || h.includes('outflow') || h.includes('withdrawal'));
        const refIdx = headers.findIndex((h) => h.includes('ref') || h.includes('id') || h.includes('trx'));

        const newItems: BankTransaction[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
          if (cols.length < 2) continue;

          let rawDate = dateIdx >= 0 ? cols[dateIdx] : format(new Date(), 'yyyy-MM-dd');
          // normalize dates like DD/MM/YYYY to YYYY-MM-DD
          if (rawDate.includes('/')) {
            const parts = rawDate.split('/');
            if (parts.length === 3) {
              rawDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }

          const desc = descIdx >= 0 ? cols[descIdx] : 'Bank Statement Record';
          const ref = refIdx >= 0 ? cols[refIdx] : `CSV-${Date.now()}-${i}`;

          let amt = 0;
          let isCredit = true;

          if (creditIdx >= 0 && parseFloat(cols[creditIdx]) > 0) {
            amt = parseFloat(cols[creditIdx]);
            isCredit = true;
          } else if (debitIdx >= 0 && parseFloat(cols[debitIdx]) > 0) {
            amt = parseFloat(cols[debitIdx]);
            isCredit = false;
          } else if (amountIdx >= 0) {
            const rawAmt = parseFloat(cols[amountIdx].replace(/[$,]/g, ''));
            amt = Math.abs(rawAmt);
            isCredit = rawAmt >= 0;
          }

          if (isNaN(amt) || amt <= 0) continue;

          // Detect bank and currency
          const isKhr = desc.includes('KHR') || cols.some((c) => c.includes('KHR') || c.includes('៛'));
          const bankName: BankTransaction['bank'] = desc.includes('Bakong')
            ? 'Bakong'
            : desc.includes('ABA')
            ? 'ABA'
            : desc.includes('ACLEDA')
            ? 'ACLEDA'
            : 'Other';

          newItems.push({
            id: `csv-${Date.now()}-${i}`,
            date: rawDate.slice(0, 10),
            time: '12:00',
            amount: amt,
            currency: isKhr ? 'KHR' : 'USD',
            type: isCredit ? 'credit' : 'debit',
            bank: bankName,
            description: desc,
            reference: ref,
            category: isCredit ? 'income' : 'expense',
            source: 'csv',
          });
        }

        if (newItems.length > 0) {
          setTransactions((prev) => [...newItems, ...prev]);
          toast(`Successfully imported ${newItems.length} transactions from bank file!`, 'success');
        } else {
          toast('Could not find valid transaction rows in CSV', 'error');
        }
      } catch (err: any) {
        toast(`CSV parse failed: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submit Manual Transaction
  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      toast('Please enter a valid amount', 'error');
      return;
    }
    if (!description.trim()) {
      toast('Please enter a description / memo', 'error');
      return;
    }

    const newTx: BankTransaction = {
      id: `manual-${Date.now()}`,
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      amount: parsedAmt,
      currency,
      type,
      bank,
      description: description.trim(),
      counterparty: counterparty.trim() || undefined,
      reference: reference.trim() || `${bank}-MANUAL-${Date.now().toString().slice(-6)}`,
      category,
      source: 'manual',
    };

    setTransactions((prev) => [newTx, ...prev]);
    toast('Bank transaction recorded', 'success');

    // Optionally sync to calendar
    if (addToCalendarCheck && onSyncToCalendar) {
      onSyncToCalendar(newTx);
    }

    setAmount('');
    setDescription('');
    setCounterparty('');
    setReference('');
    setAddSheetOpen(false);
  };

  // Copy receipt for Telegram chat
  const handleCopyReceipt = (tx: BankTransaction) => {
    const symbol = tx.currency === 'USD' ? '$' : '៛';
    const formattedAmount = `${tx.type === 'credit' ? '+' : '-'}${symbol}${tx.amount.toLocaleString()}`;
    const text = `🧾 *BANK TRANSACTION RECEIPT*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏦 *Bank:* ${BANK_BADGES[tx.bank]?.label || tx.bank}\n` +
      `💰 *Amount:* ${formattedAmount} ${tx.currency}\n` +
      `📅 *Date:* ${tx.date} ${tx.time}\n` +
      `📝 *Memo:* ${tx.description}\n` +
      (tx.counterparty ? `👤 *Party:* ${tx.counterparty}\n` : '') +
      (tx.reference ? `🔖 *Ref:* \`${tx.reference}\`\n` : '') +
      `📊 *Status:* Cleared & Logged in ERP ✅`;

    navigator.clipboard.writeText(text);
    toast('Receipt copied! Ready to paste into Telegram chat.', 'success');
  };

  const handleDelete = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    toast('Transaction removed');
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="ERP & Bank Transactions" maxWidth="sm:max-w-lg">
      <div className="p-4 space-y-4 max-h-[82vh] overflow-y-auto">
        {/* Top Cashflow Balance Hero */}
        <div className="bg-gradient-to-br from-[#1C1C1E] to-[#2C2C2E] rounded-3xl p-5 text-white shadow-xl border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-white/80">ERP Cashflow Ledger</span>
            </div>

            {/* Currency toggle */}
            <div className="flex bg-black/40 p-0.5 rounded-full border border-white/10">
              <button
                onClick={() => setSelectedCurrency('USD')}
                className={clsx(
                  'px-3 py-1 rounded-full text-xs font-bold transition-all',
                  selectedCurrency === 'USD' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white'
                )}
              >
                USD ($)
              </button>
              <button
                onClick={() => setSelectedCurrency('KHR')}
                className={clsx(
                  'px-3 py-1 rounded-full text-xs font-bold transition-all',
                  selectedCurrency === 'KHR' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white'
                )}
              >
                KHR (៛)
              </button>
            </div>
          </div>

          <div className="pt-4 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">Net Cash Position</p>
              <h2 className="text-[32px] sm:text-[38px] font-black tracking-tighter leading-none mt-1">
                {selectedCurrency === 'USD' ? (
                  totals.netUSD >= 0 ? `+$${totals.netUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `-$${Math.abs(totals.netUSD).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                ) : (
                  totals.netKHR >= 0 ? `+៛${totals.netKHR.toLocaleString()}` : `-៛${Math.abs(totals.netKHR).toLocaleString()}`
                )}
              </h2>
            </div>

            <div className="flex gap-4 text-right">
              <div>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1 justify-end">
                  <ArrowDownLeft className="w-3 h-3" /> Inflow
                </p>
                <p className="text-sm font-bold mt-0.5">
                  {selectedCurrency === 'USD' ? `$${totals.incomeUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `៛${totals.incomeKHR.toLocaleString()}`}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1 justify-end">
                  <ArrowUpRight className="w-3 h-3" /> Outflow
                </p>
                <p className="text-sm font-bold mt-0.5">
                  {selectedCurrency === 'USD' ? `$${totals.expenseUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `៛${totals.expenseKHR.toLocaleString()}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions: Import CSV / File | Sync ERP | + Input */}
        <div className="grid grid-cols-3 gap-2">
          {/* File Upload Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.json"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-tg-bg-secondary border border-tg-border/30 hover:bg-tg-surface active:scale-95 transition-all text-center"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-tg-text">Import Bank CSV</span>
          </button>

          <button
            disabled={isFetchingErp}
            onClick={handleFetchFromErp}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-tg-bg-secondary border border-tg-border/30 hover:bg-tg-surface active:scale-95 transition-all text-center disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <RefreshCw className={clsx('w-4 h-4', isFetchingErp && 'animate-spin')} />
            </div>
            <span className="text-[11px] font-bold text-tg-text">{isFetchingErp ? 'Syncing...' : 'Sync ERP Bank'}</span>
          </button>

          <button
            onClick={() => setAddSheetOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-tg-blue text-white shadow-md active:scale-95 transition-all text-center"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <span className="text-[11px] font-bold">Manual Input</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 bg-tg-bg-secondary p-1 rounded-full border border-tg-border/30">
            <button
              onClick={() => setActiveTab('all')}
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-bold transition-all',
                activeTab === 'all' ? 'bg-tg-text text-tg-bg shadow-sm' : 'text-tg-text-secondary hover:text-tg-text'
              )}
            >
              All ({transactions.length})
            </button>
            <button
              onClick={() => setActiveTab('credit')}
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-bold transition-all',
                activeTab === 'credit' ? 'bg-emerald-500 text-white shadow-sm' : 'text-tg-text-secondary hover:text-tg-text'
              )}
            >
              Income (+)
            </button>
            <button
              onClick={() => setActiveTab('debit')}
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-bold transition-all',
                activeTab === 'debit' ? 'bg-rose-500 text-white shadow-sm' : 'text-tg-text-secondary hover:text-tg-text'
              )}
            >
              Expense (-)
            </button>
          </div>

          <span className="text-[11px] font-semibold text-tg-text-hint">
            {filteredList.length} items
          </span>
        </div>

        {/* Transaction Cards List */}
        {filteredList.length === 0 ? (
          <div className="py-8 text-center text-tg-text-hint text-xs bg-tg-bg-secondary/40 rounded-2xl border border-tg-border/20 p-6">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-tg-text text-sm">No transactions found</p>
            <p className="mt-0.5">Import bank statement CSV or tap Manual Input above</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredList.map((tx) => {
              const badge = BANK_BADGES[tx.bank] || BANK_BADGES.Other;
              const isCredit = tx.type === 'credit';
              const symbol = tx.currency === 'USD' ? '$' : '៛';
              const amountStr = `${isCredit ? '+' : '-'}${symbol}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: tx.currency === 'USD' ? 2 : 0 })}`;

              return (
                <div
                  key={tx.id}
                  className="bg-tg-bg-secondary rounded-2xl border border-tg-border/25 p-3.5 shadow-sm space-y-2 hover:border-tg-border/60 transition-all"
                >
                  {/* Top line: Bank + Amount */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={clsx('px-2 py-0.5 rounded-md text-[10px] font-black uppercase border', badge.color)}>
                        {badge.label}
                      </span>
                      <span className="text-xs text-tg-text-hint font-medium">
                        {tx.date} · {tx.time}
                      </span>
                    </div>

                    <span className={clsx('text-[16px] font-black tracking-tight font-mono', isCredit ? 'text-emerald-400' : 'text-rose-400')}>
                      {amountStr}
                    </span>
                  </div>

                  {/* Description & Reference */}
                  <div className="flex items-start justify-between gap-3 pt-0.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold text-tg-text leading-snug break-words">
                        {tx.description}
                      </p>
                      {tx.counterparty && (
                        <p className="text-xs text-tg-text-secondary mt-0.5">
                          {isCredit ? 'From:' : 'To:'} <span className="font-semibold">{tx.counterparty}</span>
                        </p>
                      )}
                      {tx.reference && (
                        <p className="text-[10px] text-tg-text-hint font-mono mt-0.5">
                          Ref: {tx.reference}
                        </p>
                      )}
                    </div>

                    {/* Actions: Copy Receipt & Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleCopyReceipt(tx)}
                        className="px-2.5 py-1 rounded-xl bg-tg-surface text-tg-blue hover:bg-tg-blue/10 text-xs font-bold border border-tg-border/30 flex items-center gap-1 active:scale-95 transition-all"
                        title="Copy receipt to share in Telegram chat"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Receipt</span>
                      </button>

                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-tg-text-hint hover:text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Input Bottom Sheet */}
      <BottomSheet open={addSheetOpen} onClose={() => setAddSheetOpen(false)} title="Input Bank Transaction">
        <form onSubmit={handleAddManual} className="p-4 space-y-4">
          {/* Type Toggle: Incoming Credit vs Outgoing Debit */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-tg-bg-secondary rounded-2xl border border-tg-border/30">
            <button
              type="button"
              onClick={() => setType('credit')}
              className={clsx(
                'py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all',
                type === 'credit'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-tg-text-secondary hover:text-tg-text'
              )}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Income (+)</span>
            </button>
            <button
              type="button"
              onClick={() => setType('debit')}
              className={clsx(
                'py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all',
                type === 'debit'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-tg-text-secondary hover:text-tg-text'
              )}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Expense (-)</span>
            </button>
          </div>

          {/* Amount & Currency */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-tg-text-hint">Amount</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-tg-text-hint">
                  {currency === 'USD' ? '$' : '៛'}
                </span>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={currency === 'USD' ? '0.00' : '0'}
                  className="w-full bg-tg-bg border border-tg-border rounded-xl pl-8 pr-3.5 py-2.5 text-base font-bold text-tg-text focus:outline-none focus:border-tg-blue font-mono"
                />
              </div>

              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'USD' | 'KHR')}
                className="bg-tg-bg border border-tg-border rounded-xl px-3 text-xs font-bold text-tg-text focus:outline-none focus:border-tg-blue"
              >
                <option value="USD">USD ($)</option>
                <option value="KHR">KHR (៛)</option>
              </select>
            </div>
          </div>

          {/* Bank Selection */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-tg-text-hint">Bank Channel</label>
            <div className="grid grid-cols-3 gap-2">
              {(['ABA', 'Bakong', 'ACLEDA', 'Wing', 'Canadia', 'Other'] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBank(b)}
                  className={clsx(
                    'py-2 px-1 text-center rounded-xl text-xs font-extrabold border transition-all',
                    bank === b
                      ? 'bg-tg-blue text-white border-tg-blue shadow-sm'
                      : 'bg-tg-bg-secondary text-tg-text border-tg-border/30'
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Memo / Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-tg-text-hint">Description / Memo</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Project Milestone Payment, Office Rent…"
              className="w-full bg-tg-bg border border-tg-border rounded-xl px-3.5 py-2.5 text-sm text-tg-text focus:outline-none focus:border-tg-blue"
            />
          </div>

          {/* Counterparty / Client */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-tg-text-hint">Client / Vendor (Optional)</label>
            <input
              type="text"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              placeholder="e.g. Tech Corp Ltd."
              className="w-full bg-tg-bg border border-tg-border rounded-xl px-3.5 py-2.5 text-sm text-tg-text focus:outline-none focus:border-tg-blue"
            />
          </div>

          {/* Sync to Calendar checkbox */}
          <label className="flex items-center gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={addToCalendarCheck}
              onChange={(e) => setAddToCalendarCheck(e.target.checked)}
              className="w-4 h-4 rounded text-tg-blue"
            />
            <span className="text-xs font-semibold text-tg-text">Add to Calendar as an event reminder</span>
          </label>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-tg-blue text-white font-bold text-sm active:scale-98 transition-transform shadow-md mt-2"
          >
            Save Bank Transaction
          </button>
        </form>
      </BottomSheet>
    </BottomSheet>
  );
}
