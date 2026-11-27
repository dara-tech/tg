'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  Upload,
  Plus,
  RefreshCw,
  Copy,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  Receipt,
  FileInput,
  ClipboardPaste,
  Sparkles,
  Check,
  AlertCircle,
  Search,
} from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { toast } from '@/components/ui/Toast';
import clsx from 'clsx';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import {
  parseErpTransactions,
  BANK_META,
  type BankTransaction,
} from './BankTransactionsModal';

const STORAGE_KEY = 'tg_bank_transactions_v1';
const SYNC_CONFIG_KEY = 'tg_calendar_sync_config_v2';
const CALENDAR_STORAGE_KEY = 'tg_calendar_events_v2';

const DEFAULT_REAL_TRANSACTIONS: BankTransaction[] = [
  {
    id: 'aba-tx-01',
    date: '2026-11-27',
    time: '14:32',
    amount: 2450.00,
    currency: 'USD',
    type: 'credit',
    bank: 'ABA',
    description: 'Client Milestone 2 Settlement',
    counterparty: 'Khmer Fintech Solutions Co., Ltd.',
    reference: 'ABA-TRX-948291',
    category: 'income',
    source: 'erp',
  },
  {
    id: 'bakong-tx-02',
    date: '2026-11-27',
    time: '11:15',
    amount: 150.00,
    currency: 'USD',
    type: 'credit',
    bank: 'Bakong',
    description: 'Bakong KHQR Retail Checkout',
    counterparty: 'Sokha Mart (Merchant #892)',
    reference: 'KHQR-88492019',
    category: 'income',
    source: 'erp',
  },
  {
    id: 'acleda-tx-03',
    date: '2026-11-26',
    time: '09:40',
    amount: 480.00,
    currency: 'USD',
    type: 'debit',
    bank: 'ACLEDA',
    description: 'Office Lease & Utility Bill',
    counterparty: 'Vattanac Tower Management',
    reference: 'ACL-INV-44912',
    category: 'expense',
    source: 'erp',
  },
  {
    id: 'wing-tx-04',
    date: '2026-11-25',
    time: '16:20',
    amount: 75.50,
    currency: 'USD',
    type: 'debit',
    bank: 'Wing',
    description: 'Team Catering & Coffee',
    counterparty: 'Brown Coffee Roasters',
    reference: 'WING-PAY-2391',
    category: 'expense',
    source: 'erp',
  },
  {
    id: 'canadia-tx-05',
    date: '2026-11-24',
    time: '10:05',
    amount: 1850.00,
    currency: 'USD',
    type: 'credit',
    bank: 'Canadia',
    description: 'Enterprise ERP Support Retainer',
    counterparty: 'Royal Group Logistics',
    reference: 'CNB-WIRE-77120',
    category: 'income',
    source: 'erp',
  },
];

export default function ErpScreen() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<BankTransaction[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_REAL_TRANSACTIONS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_REAL_TRANSACTIONS;
  });

  const [activeTab, setActiveTab] = useState<'all' | 'credit' | 'debit'>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'KHR'>('USD');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFetchingErp, setIsFetchingErp] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  // ERP Import States
  const [importSheetOpen, setImportSheetOpen] = useState(false);
  const [importTab, setImportTab] = useState<'paste' | 'file'>('paste');
  const [pastedText, setPastedText] = useState('');
  const [importSyncToCalendar, setImportSyncToCalendar] = useState(true);

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

  // Persist transactions to localStorage
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

  // Live parsed preview for Import Sheet
  const previewItems = useMemo(() => {
    return parseErpTransactions(pastedText);
  }, [pastedText]);

  const previewTotals = useMemo(() => {
    let inflowUSD = 0;
    let outflowUSD = 0;
    let inflowKHR = 0;
    let outflowKHR = 0;

    previewItems.forEach((item) => {
      if (item.currency === 'USD') {
        if (item.type === 'credit') inflowUSD += item.amount;
        else outflowUSD += item.amount;
      } else {
        if (item.type === 'credit') inflowKHR += item.amount;
        else outflowKHR += item.amount;
      }
    });

    return { inflowUSD, outflowUSD, inflowKHR, outflowKHR };
  }, [previewItems]);

  // Filtered List
  const filteredList = useMemo(() => {
    return transactions.filter((t) => {
      if (activeTab === 'credit' && t.type !== 'credit') return false;
      if (activeTab === 'debit' && t.type !== 'debit') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = t.description?.toLowerCase().includes(q);
        const matchesParty = t.counterparty?.toLowerCase().includes(q);
        const matchesRef = t.reference?.toLowerCase().includes(q);
        const matchesBank = t.bank?.toLowerCase().includes(q);
        if (!matchesDesc && !matchesParty && !matchesRef && !matchesBank) return false;
      }
      return true;
    });
  }, [transactions, activeTab, searchQuery]);

  // Helper to sync transaction to calendar storage
  const syncTxToCalendar = (tx: BankTransaction) => {
    try {
      const stored = localStorage.getItem(CALENDAR_STORAGE_KEY);
      const list = stored ? JSON.parse(stored) : [];
      const symbol = tx.currency === 'USD' ? '$' : '៛';
      const amountStr = `${tx.type === 'credit' ? '+' : '-'}${symbol}${tx.amount.toLocaleString()}`;
      const newEvt = {
        id: `bank-tx-${tx.id}`,
        title: `[${tx.bank} ${tx.type === 'credit' ? 'Income' : 'Expense'}] ${amountStr} · ${tx.description}`,
        date: tx.date,
        time: tx.time || '12:00',
        category: 'erp',
        source: 'erp',
        completed: true,
        sourceMeta: { type: 'erp' },
      };
      localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify([newEvt, ...list]));
    } catch {}
  };

  // Fetch bank transactions from ERP API
  const handleFetchFromErp = async () => {
    setIsFetchingErp(true);
    try {
      const cfgRaw = localStorage.getItem(SYNC_CONFIG_KEY);
      const cfg = cfgRaw ? JSON.parse(cfgRaw) : {};
      const endpoint = cfg.erpApiUrl?.trim();
      const token = cfg.erpToken?.trim();

      if (!endpoint) {
        toast('Please configure ERP API Endpoint in Settings', 'error');
        setIsFetchingErp(false);
        return;
      }

      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const bankUrl = endpoint.includes('/bank')
        ? endpoint
        : `${endpoint.replace(/\/+$/, '')}/bank-transactions`;
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
            bank: (['ABA', 'Bakong', 'ACLEDA', 'Wing', 'Canadia'].includes(item.bank)
              ? item.bank
              : 'Other') as BankTransaction['bank'],
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

  // ERP File Upload - Excel only (.xlsx / .xls)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isExcel) {
      toast('Please upload an Excel spreadsheet (.xlsx or .xls)', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer) {
          toast('Excel file is empty', 'error');
          return;
        }
        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          toast('No worksheets found in Excel file', 'error');
          return;
        }
        const worksheet = workbook.Sheets[firstSheetName];
        const csvText = XLSX.utils.sheet_to_csv(worksheet);
        if (!csvText || !csvText.trim()) {
          toast('Excel worksheet contains no data rows', 'error');
          return;
        }

        setPastedText(csvText);
        setImportTab('paste');
        setImportSheetOpen(true);
        toast(`Loaded Excel: ${file.name} (${firstSheetName})`, 'success');
      } catch (err: any) {
        toast(`Excel read error: ${err.message}`, 'error');
      }
    };
    reader.readAsArrayBuffer(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = () => {
    if (previewItems.length === 0) {
      toast('No valid transactions parsed to import', 'error');
      return;
    }

    setTransactions((prev) => [...previewItems, ...prev]);

    if (importSyncToCalendar) {
      previewItems.forEach((tx) => syncTxToCalendar(tx));
    }

    toast(`Successfully imported ${previewItems.length} ERP transactions!`, 'success');
    setPastedText('');
    setImportSheetOpen(false);
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

    if (addToCalendarCheck) {
      syncTxToCalendar(newTx);
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
    const bankLabel = BANK_META[tx.bank]?.label || tx.bank;
    const text =
      `🧾 *BANK TRANSACTION RECEIPT*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏦 *Bank:* ${bankLabel}\n` +
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
    <div className="flex-1 flex flex-col h-full bg-tg-bg overflow-hidden select-none">
      {/* ── Top Header (iOS Telegram Navigation Bar) ── */}
      <header className="sticky top-0 z-20 shrink-0 bg-tg-bg/90 backdrop-blur-2xl border-b border-tg-border/15 safe-top">
        <div className="relative flex items-center justify-between px-3 h-11">
          {/* Left: Back button with iOS chevron and label */}
          <button
            onClick={() => router.push('/calendar')}
            className="flex items-center gap-0.5 text-tg-blue font-normal text-[17px] active:opacity-60 transition-opacity -ml-1 py-1 z-10"
          >
            <ChevronLeft className="w-6 h-6 -mr-0.5 stroke-[2.5]" />
            <span className="text-[17px]">Calendar</span>
          </button>

          {/* Center: Title cleanly centered */}
          <div className="absolute inset-x-0 flex flex-col items-center justify-center pointer-events-none px-24">
            <h1 className="text-[17px] font-semibold text-tg-text tracking-tight truncate leading-tight">
              ERP Bank Ledger
            </h1>
          </div>

          {/* Right: Manual Input '+' button in header */}
          <div className="flex items-center gap-1.5 z-10">
            <button
              onClick={() => setAddSheetOpen(true)}
              className="w-8 h-8 rounded-full bg-tg-blue hover:bg-tg-blue/90 text-white flex items-center justify-center active:scale-95 transition-all shadow-sm"
              title="Add Transaction"
              aria-label="Add Transaction"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Scrollable Body Content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-2xl mx-auto w-full">
        {/* Cashflow Balance Hero */}
        <div className="bg-gradient-to-br from-[#1C1C1E] to-[#2C2C2E] rounded-3xl p-5 text-white shadow-xl border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-white/80">
                ERP Cashflow Ledger
              </span>
            </div>

            {/* Currency toggle */}
            <div className="flex bg-black/40 p-0.5 rounded-full border border-white/10">
              <button
                onClick={() => setSelectedCurrency('USD')}
                className={clsx(
                  'px-3 py-1 rounded-full text-xs font-bold transition-all',
                  selectedCurrency === 'USD'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-white/60 hover:text-white'
                )}
              >
                USD
              </button>
              <button
                onClick={() => setSelectedCurrency('KHR')}
                className={clsx(
                  'px-3 py-1 rounded-full text-xs font-bold transition-all',
                  selectedCurrency === 'KHR'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-white/60 hover:text-white'
                )}
              >
                KHR
              </button>
            </div>
          </div>

          <div className="pt-4 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">
                Net Cash Position
              </p>
              <h2 className="text-[32px] sm:text-[38px] font-black tracking-tighter leading-none mt-1 font-mono">
                {selectedCurrency === 'USD'
                  ? totals.netUSD >= 0
                    ? `+$${totals.netUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    : `-$${Math.abs(totals.netUSD).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  : totals.netKHR >= 0
                  ? `+៛${totals.netKHR.toLocaleString()}`
                  : `-៛${Math.abs(totals.netKHR).toLocaleString()}`}
              </h2>
            </div>

            <div className="flex gap-4 text-right">
              <div>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1 justify-end">
                  <ArrowDownLeft className="w-3 h-3" /> Inflow
                </p>
                <p className="text-sm font-bold mt-0.5 font-mono">
                  {selectedCurrency === 'USD'
                    ? `$${totals.incomeUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    : `៛${totals.incomeKHR.toLocaleString()}`}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1 justify-end">
                  <ArrowUpRight className="w-3 h-3" /> Outflow
                </p>
                <p className="text-sm font-bold mt-0.5 font-mono">
                  {selectedCurrency === 'USD'
                    ? `$${totals.expenseUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    : `៛${totals.expenseKHR.toLocaleString()}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions: Import Excel (.xlsx) + Quick Add Button */}
        <div className="flex items-center gap-2">
          {/* File Upload Input - Excel only */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={() => setImportSheetOpen(true)}
            className="flex-1 min-w-0 flex items-center justify-between p-3 rounded-2xl bg-tg-bg-secondary border border-tg-border/30 hover:border-emerald-500/50 hover:bg-tg-surface active:scale-[0.99] transition-all shadow-xs group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-[13px] font-bold text-tg-text truncate flex items-center gap-1.5">
                  <span>Import Excel</span>
                  <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    .XLSX
                  </span>
                </p>
                <p className="text-[10px] text-tg-text-hint font-medium truncate">
                  Bank statement spreadsheet
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold shadow-xs shrink-0 ml-1.5 active:scale-95 transition-all">
              <Upload className="w-3 h-3" />
              <span>Import</span>
            </div>
          </button>

          <button
            onClick={() => setAddSheetOpen(true)}
            className="w-13 h-[54px] rounded-2xl bg-tg-blue hover:bg-tg-blue/90 text-white flex flex-col items-center justify-center gap-0.5 shrink-0 shadow-sm active:scale-95 transition-all px-2.5"
            title="Manual Input"
            aria-label="Add Transaction"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[9px] font-bold tracking-tight">Add</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-tg-text-hint" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by description, bank, counterparty, ref..."
            className="w-full bg-tg-bg-secondary border border-tg-border/30 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 bg-tg-bg-secondary p-1 rounded-full border border-tg-border/30">
            <button
              onClick={() => setActiveTab('all')}
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-bold transition-all',
                activeTab === 'all'
                  ? 'bg-tg-text text-tg-bg shadow-sm'
                  : 'text-tg-text-secondary hover:text-tg-text'
              )}
            >
              All ({transactions.length})
            </button>
            <button
              onClick={() => setActiveTab('credit')}
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-bold transition-all',
                activeTab === 'credit'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-tg-text-secondary hover:text-tg-text'
              )}
            >
              Income (+)
            </button>
            <button
              onClick={() => setActiveTab('debit')}
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-bold transition-all',
                activeTab === 'debit'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-tg-text-secondary hover:text-tg-text'
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
          <div className="py-12 text-center text-tg-text-hint text-xs bg-tg-bg-secondary/40 rounded-3xl border border-tg-border/20 p-8 space-y-3">
            <Receipt className="w-10 h-10 mx-auto opacity-40" />
            <div>
              <p className="font-bold text-tg-text text-sm">No transactions found</p>
              <p className="mt-1 text-tg-text-hint max-w-xs mx-auto">
                Tap &ldquo;Import Excel&rdquo; or &ldquo;+ Add&rdquo; to record bank transactions.
              </p>
            </div>
            <button
              onClick={() => setTransactions(DEFAULT_REAL_TRANSACTIONS)}
              className="px-3.5 py-1.5 rounded-xl bg-tg-bg border border-tg-border/40 text-tg-blue hover:text-white hover:bg-tg-blue text-xs font-bold transition-all shadow-2xs"
            >
              Load Demo Bank Transactions
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredList.map((tx) => {
              const meta = BANK_META[tx.bank] || BANK_META.Other;
              const isCredit = tx.type === 'credit';
              const symbol = tx.currency === 'USD' ? '$' : '៛';
              const amountStr = `${isCredit ? '+' : '-'}${symbol}${tx.amount.toLocaleString(
                undefined,
                { minimumFractionDigits: tx.currency === 'USD' ? 2 : 0 }
              )}`;

              return (
                <div
                  key={tx.id}
                  className="bg-tg-bg-secondary rounded-2xl border border-tg-border/25 hover:border-tg-border/50 p-3.5 shadow-xs transition-all flex items-start gap-3.5 group"
                >
                  {/* Real Bank Logo */}
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0 p-1.5 shadow-xs border border-black/5 overflow-hidden mt-0.5">
                    {meta.logo ? (
                      <img
                        src={meta.logo}
                        alt={meta.label}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                        <Landmark className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Transaction Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-sm font-bold text-tg-text leading-snug break-words">
                        {tx.description}
                      </h3>
                      <span
                        className={clsx(
                          'text-[15px] font-black tracking-tight font-mono shrink-0',
                          isCredit ? 'text-emerald-400' : 'text-rose-400'
                        )}
                      >
                        {amountStr}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="text-[11px] font-bold text-tg-text-secondary">
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-tg-text-hint">•</span>
                      <span className="text-[11px] text-tg-text-hint">
                        {tx.date}{tx.time ? ` · ${tx.time}` : ''}
                      </span>
                      {tx.reference && (
                        <>
                          <span className="text-[10px] text-tg-text-hint">•</span>
                          <span className="text-[10px] text-tg-text-hint font-mono">
                            Ref: {tx.reference}
                          </span>
                        </>
                      )}
                    </div>

                    {tx.counterparty && (
                      <p className="text-[11px] text-tg-text-secondary mt-0.5">
                        {isCredit ? 'From:' : 'To:'}{' '}
                        <span className="font-semibold text-tg-text">{tx.counterparty}</span>
                      </p>
                    )}

                    {/* Bottom Actions */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-tg-border/15">
                      <button
                        onClick={() => handleCopyReceipt(tx)}
                        className="px-2.5 py-1 rounded-lg bg-tg-surface hover:bg-tg-blue/15 text-tg-blue text-[11px] font-semibold border border-tg-border/30 flex items-center gap-1 active:scale-95 transition-all"
                        title="Copy receipt to share in Telegram chat"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy Receipt</span>
                      </button>

                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-tg-text-hint hover:text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all ml-auto"
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

      {/* ── Manual Input Bottom Sheet ── */}
      <BottomSheet
        open={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        title="Input Bank Transaction"
      >
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
            <label className="text-xs font-bold uppercase tracking-wider text-tg-text-hint">
              Amount
            </label>
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

          {/* Bank Selection with Official Bank Logos */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-tg-text-hint">
              Bank Channel
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['ABA', 'Bakong', 'ACLEDA', 'Wing', 'Canadia', 'Other'] as const).map((b) => {
                const m = BANK_META[b];
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBank(b)}
                    className={clsx(
                      'p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 text-center',
                      bank === b
                        ? 'bg-tg-blue/15 border-tg-blue text-white shadow-xs'
                        : 'bg-tg-bg-secondary text-tg-text border-tg-border/30 hover:border-tg-border/60'
                    )}
                  >
                    <div className="w-8 h-8 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-2xs">
                      {m.logo ? (
                        <img src={m.logo} alt={m.label} className="w-full h-full object-contain" />
                      ) : (
                        <Landmark className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                    <span className="text-[11px] font-bold leading-tight">{m.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Memo / Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-tg-text-hint">
              Description / Memo
            </label>
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
            <label className="text-xs font-bold uppercase tracking-wider text-tg-text-hint">
              Client / Vendor (Optional)
            </label>
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
            <span className="text-xs font-semibold text-tg-text">
              Add to Calendar as an event reminder
            </span>
          </label>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-tg-blue text-white font-bold text-sm active:scale-98 transition-transform shadow-md mt-2"
          >
            Save Bank Transaction
          </button>
        </form>
      </BottomSheet>

      {/* ── ERP Transactions Import BottomSheet ── */}
      <BottomSheet
        open={importSheetOpen}
        onClose={() => setImportSheetOpen(false)}
        title="Import Excel Statement"
        maxWidth="sm:max-w-xl"
      >
        <div className="p-4 space-y-3.5 max-h-[82vh] overflow-y-auto">
          {/* Format Explanation */}
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-tg-bg-secondary border border-tg-border/25 text-xs">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-tg-text-secondary text-[11px] leading-relaxed">
              Accepts Excel spreadsheets (.xlsx, .xls) from ABA, Bakong KHQR, ACLEDA, Wing, and Canadia Bank.
            </span>
          </div>

          {/* Import Method Tabs: Paste vs File */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-tg-bg-secondary rounded-2xl border border-tg-border/30">
            <button
              type="button"
              onClick={() => setImportTab('file')}
              className={clsx(
                'py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all',
                importTab === 'file'
                  ? 'bg-tg-blue text-white shadow-sm'
                  : 'text-tg-text-secondary hover:text-tg-text'
              )}
            >
              <FileInput className="w-3.5 h-3.5" />
              <span>Upload Excel File</span>
            </button>
            <button
              type="button"
              onClick={() => setImportTab('paste')}
              className={clsx(
                'py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all',
                importTab === 'paste'
                  ? 'bg-tg-blue text-white shadow-sm'
                  : 'text-tg-text-secondary hover:text-tg-text'
              )}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Paste Excel Data</span>
            </button>
          </div>

          {/* Tab 1: File Dropzone */}
          {importTab === 'file' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 rounded-2xl p-7 text-center cursor-pointer bg-emerald-500/5 active:scale-99 transition-all space-y-2 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-tg-text">Choose Excel Spreadsheet (.xlsx, .xls)</p>
                <p className="text-[11px] text-tg-text-hint mt-0.5">Click to browse your device files (Excel only)</p>
              </div>
            </div>
          )}

          {/* Tab 2: Paste Textarea */}
          {importTab === 'paste' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-tg-text-hint uppercase tracking-wider text-[10px]">
                  Copied Rows from Excel / CSV
                </label>
                {pastedText && (
                  <button
                    type="button"
                    onClick={() => setPastedText('')}
                    className="text-rose-400 hover:underline text-[11px] font-medium"
                  >
                    Clear text
                  </button>
                )}
              </div>
              <textarea
                rows={6}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`Paste copied rows from your Excel sheet:\nDate,Type,Amount,Currency,Bank,Description\n2026-11-27,credit,2500,USD,ABA,Client Milestone 1`}
                className="w-full bg-tg-bg border border-tg-border rounded-xl p-3 text-xs font-mono text-tg-text focus:outline-none focus:border-tg-blue leading-relaxed"
              />
            </div>
          )}

          {/* Live Parsing Preview & Summary */}
          {previewItems.length > 0 ? (
            <div className="space-y-2 pt-1">
              {/* Summary Stats */}
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">
                    {previewItems.length} transactions ready to import
                  </span>
                </div>
                <div className="text-right text-[11px] font-bold">
                  {previewTotals.inflowUSD > 0 && (
                    <span className="text-emerald-400 block font-mono">
                      +${previewTotals.inflowUSD.toLocaleString()}
                    </span>
                  )}
                  {previewTotals.outflowUSD > 0 && (
                    <span className="text-rose-400 block font-mono">
                      -${previewTotals.outflowUSD.toLocaleString()}
                    </span>
                  )}
                  {previewTotals.inflowKHR > 0 && (
                    <span className="text-emerald-400 block font-mono">
                      +៛{previewTotals.inflowKHR.toLocaleString()}
                    </span>
                  )}
                  {previewTotals.outflowKHR > 0 && (
                    <span className="text-rose-400 block font-mono">
                      -៛{previewTotals.outflowKHR.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Preview Cards */}
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {previewItems.map((item, idx) => {
                  const m = BANK_META[item.bank] || BANK_META.Other;
                  const isCredit = item.type === 'credit';
                  const symbol = item.currency === 'USD' ? '$' : '៛';
                  return (
                    <div
                      key={item.id || idx}
                      className="p-2.5 rounded-xl bg-tg-bg border border-tg-border/25 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 shadow-2xs border border-black/5">
                          {m.logo ? (
                            <img src={m.logo} alt={m.label} className="w-full h-full object-contain" />
                          ) : (
                            <Landmark className="w-4 h-4 text-indigo-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-tg-text truncate">
                            {item.description}
                          </p>
                          <p className="text-[10px] text-tg-text-hint font-medium">
                            {m.label} · {item.date}
                          </p>
                        </div>
                      </div>
                      <span
                        className={clsx(
                          'font-mono font-bold text-xs shrink-0',
                          isCredit ? 'text-emerald-400' : 'text-rose-400'
                        )}
                      >
                        {isCredit ? '+' : '-'}{symbol}{item.amount.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Sync to Calendar Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={importSyncToCalendar}
                  onChange={(e) => setImportSyncToCalendar(e.target.checked)}
                  className="w-4 h-4 rounded text-tg-blue"
                />
                <span className="text-xs font-semibold text-tg-text">
                  Automatically sync imported transactions to Calendar
                </span>
              </label>

              {/* Confirm Import Button */}
              <button
                type="button"
                onClick={handleConfirmImport}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm active:scale-98 transition-transform shadow-md flex items-center justify-center gap-2 mt-2"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Import ({previewItems.length} Transactions)</span>
              </button>
            </div>
          ) : pastedText.trim().length > 0 ? (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Could not parse transaction rows. Ensure data has date and amount values.</span>
            </div>
          ) : null}
        </div>
      </BottomSheet>
    </div>
  );
}
