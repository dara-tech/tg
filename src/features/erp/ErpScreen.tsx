'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Copy,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  Receipt,
  FileInput,
  ClipboardPaste,
  Check,
  AlertCircle,
  Search,
  Building,
  Calendar,
  X,
  Filter,
} from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { toast } from '@/components/ui/Toast';
import clsx from 'clsx';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import {
  parseErpTransactions,
  parseBankStatementExcel,
  parseTransactionNote,
  BANK_META,
  type BankTransaction,
  type StatementMetadata,
  type ParsedStatementResult,
} from './BankTransactionsModal';

const STORAGE_KEY = 'tg_bank_transactions_v1';
const SYNC_CONFIG_KEY = 'tg_calendar_sync_config_v2';
const CALENDAR_STORAGE_KEY = 'tg_calendar_events_v2';
const STATEMENT_META_KEY = 'tg_bank_statement_meta_v1';

const toKhmerNum = (num: number | string): string => {
  const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  return String(num).replace(/[0-9]/g, (d) => khmerDigits[parseInt(d, 10)]);
};

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

  // Load transactions and normalize to clean short title and correct expense/income direction
  const [transactions, setTransactions] = useState<BankTransaction[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_REAL_TRANSACTIONS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((tx: BankTransaction) => {
            const raw = tx.description || '';
            const isPaid = /^(?:Paid|Payment|Transfer(?:red)?|Funds Transfer)\s+To/i.test(raw) || raw.includes('Paid To') || raw.includes('Payment To');
            const isReceived = /^(?:Received|Deposit)\s+From/i.test(raw);
            const { title, sub, ref, time } = parseTransactionNote(raw);
            let correctedType = tx.type;
            if (isPaid) correctedType = 'debit';
            else if (isReceived) correctedType = 'credit';

            return {
              ...tx,
              description: title || raw,
              counterparty: tx.counterparty || (sub && sub !== title ? sub : undefined),
              reference: tx.reference || ref || tx.id,
              time: tx.time && tx.time !== '12:00' ? tx.time : (time || tx.time || '12:00'),
              type: correctedType,
            };
          });
        }
      }
    } catch {}
    return DEFAULT_REAL_TRANSACTIONS;
  });

  const [statementMeta, setStatementMeta] = useState<StatementMetadata | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(STATEMENT_META_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Filters
  const [activeTab, setActiveTab] = useState<'all' | 'credit' | 'debit'>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [dateFilterSheetOpen, setDateFilterSheetOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'KHR'>('USD');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Sheets
  const [isFetchingErp, setIsFetchingErp] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [cleanConfirmOpen, setCleanConfirmOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<BankTransaction | null>(null);

  // ERP Import States
  const [importSheetOpen, setImportSheetOpen] = useState(false);
  const [importTab, setImportTab] = useState<'paste' | 'file'>('file');
  const [pastedText, setPastedText] = useState('');
  const [importSyncToCalendar, setImportSyncToCalendar] = useState(true);
  const [clearExisting, setClearExisting] = useState(false);
  const [parsedStatementResult, setParsedStatementResult] = useState<ParsedStatementResult | null>(null);
  const [uploadedFileMeta, setUploadedFileMeta] = useState<{ name: string; size: string } | null>(null);

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
      const rawLower = (t.description || '').toLowerCase();
      const isPaid = rawLower.includes('paid to') || rawLower.includes('payment to') || rawLower.includes('transfer to');
      const isReceived = rawLower.includes('received from') || rawLower.includes('deposit from');
      const isCredit = isPaid ? false : isReceived ? true : t.type === 'credit';

      if (t.currency === 'USD') {
        if (isCredit) incomeUSD += t.amount;
        else expenseUSD += t.amount;
      } else {
        if (isCredit) incomeKHR += t.amount;
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
    if (parsedStatementResult) return parsedStatementResult.transactions;
    return parseErpTransactions(pastedText);
  }, [parsedStatementResult, pastedText]);

  const previewTotals = useMemo(() => {
    if (parsedStatementResult?.metadata) {
      return {
        inflowUSD: parsedStatementResult.metadata.currency === 'USD' ? parsedStatementResult.metadata.statedInflow : 0,
        outflowUSD: parsedStatementResult.metadata.currency === 'USD' ? parsedStatementResult.metadata.statedOutflow : 0,
        inflowKHR: parsedStatementResult.metadata.currency === 'KHR' ? parsedStatementResult.metadata.statedInflow : 0,
        outflowKHR: parsedStatementResult.metadata.currency === 'KHR' ? parsedStatementResult.metadata.statedOutflow : 0,
      };
    }

    let inflowUSD = 0;
    let outflowUSD = 0;
    let inflowKHR = 0;
    let outflowKHR = 0;

    previewItems.forEach((item) => {
      const isCredit = item.type === 'credit';
      if (item.currency === 'USD') {
        if (isCredit) inflowUSD += item.amount;
        else outflowUSD += item.amount;
      } else {
        if (isCredit) inflowKHR += item.amount;
        else outflowKHR += item.amount;
      }
    });

    return { inflowUSD, outflowUSD, inflowKHR, outflowKHR };
  }, [parsedStatementResult, previewItems]);

  // Filtered List (Date & Transaction Filters)
  const filteredList = useMemo(() => {
    return transactions.filter((t) => {
      // Transaction type filter
      if (activeTab === 'credit' && t.type !== 'credit') return false;
      if (activeTab === 'debit' && t.type !== 'debit') return false;

      // Date filter (by exact day or month)
      if (selectedDateFilter !== 'all') {
        if (!t.date || !t.date.startsWith(selectedDateFilter)) return false;
      }

      // Search query
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
  }, [transactions, activeTab, selectedDateFilter, searchQuery]);

  // Available unique dates from transactions for the Date filter
  const availableDates = useMemo(() => {
    const dateMap = new Map<string, { date: string; count: number; net: number }>();
    transactions.forEach((t) => {
      if (!t.date) return;
      let d = dateMap.get(t.date);
      if (!d) {
        d = { date: t.date, count: 0, net: 0 };
        dateMap.set(t.date, d);
      }
      d.count++;
      const isCredit = t.type === 'credit';
      if (isCredit) d.net += t.amount;
      else d.net -= t.amount;
    });
    return Array.from(dateMap.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions]);

  // Group transactions by Date for real Bank Statement layout (break by day, like EPR)
  const groupedByDate = useMemo(() => {
    const groups: { date: string; items: BankTransaction[]; netDay: number }[] = [];
    const dateMap = new Map<string, { date: string; items: BankTransaction[]; netDay: number }>();

    filteredList.forEach((item) => {
      let g = dateMap.get(item.date);
      if (!g) {
        g = { date: item.date, items: [], netDay: 0 };
        dateMap.set(item.date, g);
        groups.push(g);
      }
      g.items.push(item);

      const rawLower = (item.description || '').toLowerCase();
      const isPaid = rawLower.includes('paid to') || rawLower.includes('payment to') || rawLower.includes('transfer to');
      const isReceived = rawLower.includes('received from') || rawLower.includes('deposit from');
      const isCredit = isPaid ? false : isReceived ? true : item.type === 'credit';
      if (isCredit) {
        g.netDay += item.amount;
      } else {
        g.netDay -= item.amount;
      }
    });

    return groups;
  }, [filteredList]);

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

  // ERP File Upload - Excel statement (.xlsx / .xls) with smart EPR parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isExcel) {
      toast('សូមជ្រើសរើស File Excel (.xlsx, .xls)', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer) {
          toast('File Excel គ្មានទិន្នន័យ', 'error');
          return;
        }

        const sizeKb = (file.size / 1024).toFixed(1);
        const sizeFormatted = file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
          : `${sizeKb} KB`;

        setUploadedFileMeta({ name: file.name, size: sizeFormatted });

        // Parse with full ACLEDA / ABA / Bakong EPR statement engine
        try {
          const parsed = parseBankStatementExcel(buffer, file.name);
          if (parsed.transactions.length > 0) {
            setStatementMeta(parsed.metadata);
            setParsedStatementResult(parsed);
            setImportTab('file');
            setImportSheetOpen(true);
            toast(`បានផ្ទុក ${toKhmerNum(parsed.transactions.length)} ប្រតិបត្តិការ`, 'success');
            return;
          }
        } catch {}

        // Fallback generic sheet parsing
        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          toast('មិនមាន Sheet ក្នុង Excel ទេ', 'error');
          return;
        }
        const worksheet = workbook.Sheets[firstSheetName];
        const csvText = XLSX.utils.sheet_to_csv(worksheet);
        if (!csvText || !csvText.trim()) {
          toast('Sheet គ្មានទិន្នន័យ', 'error');
          return;
        }

        setPastedText(csvText);
        setParsedStatementResult(null);
        setImportTab('paste');
        setImportSheetOpen(true);
        toast(`បានផ្ទុក ${file.name}`, 'info');
      } catch (err: any) {
        toast('កំហុសពេលអាន File Excel', 'error');
      }
    };
    reader.readAsArrayBuffer(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = () => {
    const rawToImport = parsedStatementResult ? parsedStatementResult.transactions : previewItems;
    if (rawToImport.length === 0) {
      toast('មិនមានទិន្នន័យសម្រាប់នាំចូល', 'error');
      return;
    }

    // Normalize each item to EPR clean short title & correct direction
    const toImport = rawToImport.map((item) => {
      const raw = item.description || '';
      const isPaid = /^(?:Paid|Payment|Transfer(?:red)?|Funds Transfer)\s+To/i.test(raw) || raw.includes('Paid To') || raw.includes('Payment To');
      const isReceived = /^(?:Received|Deposit)\s+From/i.test(raw);
      const { title, sub, ref, time } = parseTransactionNote(raw);
      let correctedType = item.type;
      if (isPaid) correctedType = 'debit';
      else if (isReceived) correctedType = 'credit';

      return {
        ...item,
        description: title || raw,
        counterparty: item.counterparty || (sub && sub !== title ? sub : undefined),
        reference: item.reference || ref || item.id,
        time: item.time && item.time !== '12:00' ? item.time : (time || item.time || '12:00'),
        type: correctedType,
      };
    });

    if (clearExisting) {
      // Wipe existing records and replace with this statement
      setTransactions(toImport);
      if (parsedStatementResult?.metadata) {
        setStatementMeta(parsedStatementResult.metadata);
        try {
          localStorage.setItem(STATEMENT_META_KEY, JSON.stringify(parsedStatementResult.metadata));
        } catch {}
      }

      if (importSyncToCalendar) {
        toImport.forEach((tx) => syncTxToCalendar(tx));
      }

      toast(`បាននាំចូល ${toKhmerNum(toImport.length)} ប្រតិបត្តិការ`, 'success');
    } else {
      // Smart Append & Deduplicate (from EPR finance service)
      const existingIds = new Set(transactions.map((t) => t.id));
      const newlyAdded: BankTransaction[] = [];
      let skippedCount = 0;

      toImport.forEach((item) => {
        if (existingIds.has(item.id)) {
          skippedCount++;
        } else {
          newlyAdded.push(item);
        }
      });

      setTransactions((prev) => [...newlyAdded, ...prev]);
      if (parsedStatementResult?.metadata) {
        setStatementMeta(parsedStatementResult.metadata);
        try {
          localStorage.setItem(STATEMENT_META_KEY, JSON.stringify(parsedStatementResult.metadata));
        } catch {}
      }

      if (importSyncToCalendar) {
        newlyAdded.forEach((tx) => syncTxToCalendar(tx));
      }

      toast(`បានបន្ថែម ${toKhmerNum(newlyAdded.length)} ប្រតិបត្តិការ`, 'success');
    }

    setPastedText('');
    setParsedStatementResult(null);
    setImportSheetOpen(false);
  };

  // Submit Manual Transaction
  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      toast('សូមបញ្ចូលចំនួនទឹកប្រាក់', 'error');
      return;
    }
    if (!description.trim()) {
      toast('សូមបញ្ចូលការពិពណ៌នា', 'error');
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
    toast('បានកត់ត្រាប្រតិបត្តិការ', 'success');

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
    toast('បានចម្លងវិក្កយបត្រ', 'success');
  };

  const handleDelete = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    toast('បានលុបប្រតិបត្តិការ', 'info');
  };

  const handleCleanData = () => {
    setTransactions([]);
    setStatementMeta(null);
    setParsedStatementResult(null);
    setUploadedFileMeta(null);
    setPastedText('');
    setSelectedDateFilter('all');
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STATEMENT_META_KEY);
    } catch {}
    setCleanConfirmOpen(false);
    toast('បានសម្អាតទិន្នន័យទាំងអស់', 'success');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-tg-bg overflow-hidden select-none">
      {/* ── Top Header (iOS Telegram Navigation Bar) ── */}
      <header className="sticky top-0 z-20 shrink-0 bg-tg-bg/95 backdrop-blur-2xl border-b border-tg-border/15 safe-top">
        <div className="relative flex items-center justify-between px-3 h-11">
          {/* Left: Back button - circular, icon-only, theme-colored */}
          <button
            onClick={() => router.push('/calendar')}
            className="w-8 h-8 rounded-full bg-tg-bg-secondary hover:bg-tg-surface border border-tg-border/30 text-tg-text flex items-center justify-center active:scale-95 transition-all shadow-xs z-10"
            title="Back to Calendar"
            aria-label="Back to Calendar"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5] -ml-0.5" />
          </button>

          {/* Center: Title */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <h1 className="text-[16px] font-bold text-tg-text tracking-tight truncate">
              Bank Ledger
            </h1>
          </div>

          {/* Right: Manual Input '+' button - circular, theme-colored */}
          <div className="flex items-center gap-1.5 z-10">
            <button
              onClick={() => setAddSheetOpen(true)}
              className="w-8 h-8 rounded-full bg-tg-bg-secondary hover:bg-tg-surface border border-tg-border/30 text-tg-text flex items-center justify-center active:scale-95 transition-all shadow-xs"
              title="Add Transaction"
              aria-label="Add Transaction"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Scrollable Body Content ── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-3 space-y-3.5 w-full">
        {/* Balance Hero Card */}
        <div className="bg-[#1C1C1E] rounded-3xl p-5 text-white shadow-sm border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-white/60">
              សមតុល្យសរុប
            </span>

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

          <div>
            <h2 className="text-[34px] font-black tracking-tight font-mono py-0.5">
              {selectedCurrency === 'USD'
                ? statementMeta && statementMeta.endingBalance !== undefined
                  ? `$${statementMeta.endingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  : totals.netUSD >= 0
                  ? `+$${totals.netUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  : `-$${Math.abs(totals.netUSD).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                : totals.netKHR >= 0
                ? `+៛${totals.netKHR.toLocaleString()}`
                : `-៛${Math.abs(totals.netKHR).toLocaleString()}`}
            </h2>
            {statementMeta && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 mt-1">
                <Building className="w-3.5 h-3.5" />
                <span className="truncate max-w-[280px]">
                  {statementMeta.accountName} · {statementMeta.accountNumber} [{statementMeta.currency}]
                </span>
              </div>
            )}
          </div>

          {/* Clean Inflow & Outflow Chips */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2 bg-white/5 rounded-2xl p-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-white/50 block font-medium">ចំណូល</span>
                <span className="text-xs font-bold font-mono text-emerald-400 truncate block">
                  {selectedCurrency === 'USD'
                    ? `+$${totals.incomeUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    : `+៛${totals.incomeKHR.toLocaleString()}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/5 rounded-2xl p-2.5">
              <div className="w-7 h-7 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-white/50 block font-medium">ចំណាយ</span>
                <span className="text-xs font-bold font-mono text-rose-400 truncate block">
                  {selectedCurrency === 'USD'
                    ? `-$${totals.expenseUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    : `-៛${totals.expenseKHR.toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Widgets */}
        <div className="grid grid-cols-3 gap-2">
          {/* File Upload Input - Excel only */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setImportSheetOpen(true)}
            className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-tg-bg-secondary border border-tg-border/25 hover:bg-tg-surface active:scale-[0.98] transition-all text-tg-text shadow-2xs group"
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold truncate">នាំចូល Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setAddSheetOpen(true)}
            className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-tg-bg-secondary border border-tg-border/25 hover:bg-tg-surface active:scale-[0.98] transition-all text-tg-text shadow-2xs group"
          >
            <div className="w-6 h-6 rounded-lg bg-[#2481cc]/15 text-[#2481cc] flex items-center justify-center shrink-0">
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="text-xs font-bold truncate">ប្រតិបត្តិការថ្មី</span>
          </button>

          <button
            type="button"
            onClick={() => setCleanConfirmOpen(true)}
            className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-tg-bg-secondary border border-tg-border/25 hover:bg-rose-500/10 active:scale-[0.98] transition-all text-rose-400 shadow-2xs group"
          >
            <div className="w-6 h-6 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold truncate">សម្អាត</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-tg-text-hint" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ស្វែងរកប្រតិបត្តិការ..."
            className="w-full bg-tg-bg-secondary border border-tg-border/25 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-[#2481cc]"
          />
        </div>

        {/* Filter Controls (Date & Transaction Filters) */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
          {/* Transaction Type Filter Pills */}
          <div className="flex items-center gap-1.5 bg-tg-bg-secondary p-1 rounded-full border border-tg-border/25 shrink-0">
            <button
              onClick={() => setActiveTab('all')}
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-bold transition-all',
                activeTab === 'all'
                  ? 'bg-tg-text text-tg-bg shadow-xs'
                  : 'text-tg-text-secondary hover:text-tg-text'
              )}
            >
              ទាំងអស់ ({toKhmerNum(transactions.length)})
            </button>
            <button
              onClick={() => setActiveTab('credit')}
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-bold transition-all',
                activeTab === 'credit'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-tg-text-secondary hover:text-tg-text'
              )}
            >
              ចំណូល
            </button>
            <button
              onClick={() => setActiveTab('debit')}
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-bold transition-all',
                activeTab === 'debit'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-tg-text-secondary hover:text-tg-text'
              )}
            >
              ចំណាយ
            </button>
          </div>

          {/* Date Filter & Count Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDateFilterSheetOpen(true)}
                className={clsx(
                  'relative w-7 h-7 rounded-full flex items-center justify-center transition-all border shadow-xs active:scale-95',
                  selectedDateFilter !== 'all'
                    ? 'bg-[#2481cc] text-white border-[#2481cc]'
                    : 'bg-tg-bg-secondary text-[#2481cc] hover:bg-tg-surface border-tg-border/25'
                )}
                title={selectedDateFilter === 'all' ? 'ជ្រើសរើសកាលបរិច្ឆេទ' : selectedDateFilter}
              >
                <Calendar className="w-3.5 h-3.5" />
                {selectedDateFilter !== 'all' && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-tg-bg" />
                )}
              </button>

              {selectedDateFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter('all')}
                  className="w-5 h-5 rounded-full bg-tg-bg-secondary hover:bg-rose-500/20 hover:text-rose-400 text-tg-text-hint border border-tg-border/25 flex items-center justify-center transition-colors"
                  title="សម្អាតតម្រងកាលបរិច្ឆេទ"
                >
                  <X className="w-3 h-3 stroke-[2.5]" />
                </button>
              )}
            </div>

            <span className="text-[11px] font-medium text-tg-text-hint">
              {toKhmerNum(filteredList.length)} សរុប
            </span>
          </div>
        </div>

        {/* Transactions List */}
        {filteredList.length === 0 ? (
          <div className="py-10 text-center text-tg-text-hint text-xs bg-tg-bg-secondary/40 rounded-3xl border border-tg-border/20 p-6 space-y-2.5">
            <Receipt className="w-8 h-8 mx-auto opacity-30" />
            <p className="font-semibold text-tg-text text-sm">មិនមានប្រតិបត្តិការទេ</p>
            <p className="text-tg-text-hint text-[11px]">
              ចុច &ldquo;នាំចូល Excel&rdquo; ឬ &ldquo;ប្រតិបត្តិការថ្មី&rdquo; ដើម្បីបន្ថែមទិន្នន័យ
            </p>
            <button
              onClick={() => setTransactions(DEFAULT_REAL_TRANSACTIONS)}
              className="px-3 py-1.5 rounded-xl bg-tg-bg border border-tg-border/30 text-[#2481cc] text-xs font-bold hover:bg-tg-surface transition-all"
            >
              ទិន្នន័យសាកល្បង
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {groupedByDate.map((group) => {
              const dayCurrency = selectedCurrency;
              const daySymbol = dayCurrency === 'USD' ? '$' : '៛';
              return (
                <div
                  key={group.date}
                  className="bg-tg-bg-secondary rounded-3xl border border-tg-border/25 overflow-hidden shadow-xs"
                >
                  {/* Bank Statement Group Date Header (like EPR) */}
                  <div className="px-4 py-2.5 bg-white/5 border-b border-tg-border/15 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-tg-text font-mono text-[13px]">
                        {group.date}
                      </span>
                      <span className="text-[11px] text-tg-text-hint font-medium">
                        ({toKhmerNum(group.items.length)} ប្រតិបត្តិការ)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono">
                      <span className="text-tg-text-hint font-sans font-medium">សរុបប្រចាំថ្ងៃ:</span>
                      <span
                        className={clsx(
                          'font-bold',
                          group.netDay >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        )}
                      >
                        {group.netDay >= 0 ? '+' : '-'}{daySymbol}{Math.abs(group.netDay).toLocaleString(undefined, { minimumFractionDigits: dayCurrency === 'USD' ? 2 : 0 })}
                      </span>
                    </div>
                  </div>

                  {/* Items in this date group */}
                  <div className="divide-y divide-tg-border/15">
                    {group.items.map((tx) => {
                      const meta = BANK_META[tx.bank] || BANK_META.Other;
                      // Clean note dynamically so it is always short & clean like EPR
                      const { title, sub, time } = parseTransactionNote(tx.description);
                      const cleanTitle = title || tx.description;

                      // Ensure correct direction: "Paid To" is always debit (- in red)
                      const rawLower = (tx.description || '').toLowerCase();
                      const isPaid = rawLower.includes('paid to') || rawLower.includes('payment to') || rawLower.includes('transfer to');
                      const isReceived = rawLower.includes('received from') || rawLower.includes('deposit from');
                      const isCredit = isPaid ? false : isReceived ? true : tx.type === 'credit';

                      const symbol = tx.currency === 'USD' ? '$' : '៛';
                      const amountStr = `${isCredit ? '+' : '-'}${symbol}${tx.amount.toLocaleString(
                        undefined,
                        { minimumFractionDigits: tx.currency === 'USD' ? 2 : 0 }
                      )}`;

                      return (
                        <div
                          key={tx.id}
                          onClick={() => setSelectedTx(tx)}
                          className="p-3.5 flex items-center justify-between gap-3.5 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors group"
                        >
                          {/* Official Bank App Icon */}
                          <div className="w-11 h-11 rounded-2xl overflow-hidden shrink-0 shadow-xs border border-white/10 bg-black/20 flex items-center justify-center">
                            {meta.logo ? (
                              <img
                                src={meta.logo}
                                alt={meta.label}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white">
                                <Landmark className="w-5 h-5" />
                              </div>
                            )}
                          </div>

                          {/* Clean Short Merchant / Counterparty & Subtitle (EPR style) */}
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-bold text-tg-text truncate group-hover:text-[#2481cc] transition-colors leading-snug">
                              {cleanTitle}
                            </p>
                            <p className="text-[11px] text-tg-text-hint truncate mt-0.5">
                              {meta.label}
                              {time && time !== '12:00' ? ` · ${time}` : ''}
                              {sub && sub !== cleanTitle && !sub.includes(time) ? ` · ${sub}` : ''}
                            </p>
                          </div>

                          {/* Amount (Green + for In, Red - for Out) */}
                          <div className="text-right shrink-0">
                            <span
                              className={clsx(
                                'text-[15px] font-bold font-mono tracking-tight',
                                isCredit ? 'text-emerald-400' : 'text-rose-400'
                              )}
                            >
                              {amountStr}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Transaction Details BottomSheet ── */}
      <BottomSheet
        open={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
        title="Transaction Details"
      >
        {selectedTx && (() => {
          const meta = BANK_META[selectedTx.bank] || BANK_META.Other;
          const { title } = parseTransactionNote(selectedTx.description);
          const cleanTitle = title || selectedTx.description;
          const rawLower = (selectedTx.description || '').toLowerCase();
          const isPaid = rawLower.includes('paid to') || rawLower.includes('payment to') || rawLower.includes('transfer to');
          const isReceived = rawLower.includes('received from') || rawLower.includes('deposit from');
          const isCredit = isPaid ? false : isReceived ? true : selectedTx.type === 'credit';
          const symbol = selectedTx.currency === 'USD' ? '$' : '៛';
          const amountStr = `${isCredit ? '+' : '-'}${symbol}${selectedTx.amount.toLocaleString(
            undefined,
            { minimumFractionDigits: selectedTx.currency === 'USD' ? 2 : 0 }
          )}`;

          return (
            <div className="p-4 space-y-4">
              {/* Header: Logo + Big Amount */}
              <div className="flex flex-col items-center justify-center text-center py-2 space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-white p-2 shadow-xs border border-black/5 flex items-center justify-center">
                  {meta.logo ? (
                    <img src={meta.logo} alt={meta.label} className="w-full h-full object-contain" />
                  ) : (
                    <Landmark className="w-6 h-6 text-gray-700" />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-black font-mono tracking-tight text-tg-text">
                    <span className={isCredit ? 'text-emerald-400' : 'text-rose-400'}>
                      {amountStr}
                    </span>
                  </h3>
                  <p className="text-sm font-bold text-tg-text mt-1">
                    {cleanTitle}
                  </p>
                  {selectedTx.description !== cleanTitle && (
                    <p className="text-[10px] text-tg-text-hint mt-0.5 max-w-sm mx-auto line-clamp-2">
                      {selectedTx.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Detail Rows */}
              <div className="bg-tg-bg-secondary rounded-2xl border border-tg-border/25 divide-y divide-tg-border/15 overflow-hidden text-xs">
                <div className="flex items-center justify-between p-3">
                  <span className="text-tg-text-hint font-medium">ធនាគារ</span>
                  <span className="font-bold text-tg-text">{meta.label}</span>
                </div>
                <div className="flex items-center justify-between p-3">
                  <span className="text-tg-text-hint font-medium">កាលបរិច្ឆេទ & ម៉ោង</span>
                  <span className="font-bold text-tg-text font-mono">
                    {selectedTx.date} {selectedTx.time}
                  </span>
                </div>
                {selectedTx.counterparty && (
                  <div className="flex items-center justify-between p-3">
                    <span className="text-tg-text-hint font-medium">
                      {isCredit ? 'មកពី' : 'ទៅកាន់'}
                    </span>
                    <span className="font-bold text-tg-text">{selectedTx.counterparty}</span>
                  </div>
                )}
                {selectedTx.reference && (
                  <div className="flex items-center justify-between p-3">
                    <span className="text-tg-text-hint font-medium">លេខកូដយោង</span>
                    <span className="font-mono text-tg-text font-bold text-[11px]">{selectedTx.reference}</span>
                  </div>
                )}
                <div className="flex items-center justify-between p-3">
                  <span className="text-tg-text-hint font-medium">ប្រភេទ</span>
                  <span className="capitalize font-bold text-tg-text">{selectedTx.category}</span>
                </div>
                <div className="flex items-center justify-between p-3">
                  <span className="text-tg-text-hint font-medium">ទិសដៅ</span>
                  <span className={clsx('font-bold', isCredit ? 'text-emerald-400' : 'text-rose-400')}>
                    {isCredit ? 'ចំណូល' : 'ចំណាយ'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCopyReceipt(selectedTx)}
                  className="w-full py-2.5 rounded-xl bg-tg-bg border border-tg-border/30 hover:bg-tg-surface text-tg-text font-bold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                >
                  <Copy className="w-4 h-4 text-[#2481cc]" />
                  <span>ចម្លងវិក្កយបត្រ</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleDelete(selectedTx.id);
                    setSelectedTx(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>លុបប្រតិបត្តិការ</span>
                </button>
              </div>
            </div>
          );
        })()}
      </BottomSheet>

      {/* ── Manual Input Bottom Sheet ── */}
      <BottomSheet
        open={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        title="បញ្ចូលប្រតិបត្តិការថ្មី"
      >
        <form onSubmit={handleAddManual} className="space-y-4 p-1">
          {/* Amount + Currency */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-tg-text">ចំនួនទឹកប្រាក់</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-tg-bg border border-tg-border rounded-xl px-3 py-2.5 text-sm font-mono text-tg-text focus:outline-none focus:border-tg-blue"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <span className="text-xs font-bold text-tg-text-hint mr-1">
                  {currency === 'USD' ? '$' : '៛'}
                </span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="bg-tg-bg-secondary text-tg-text text-xs font-bold rounded-lg px-2 py-1 border border-tg-border"
                >
                  <option value="USD">USD ($)</option>
                  <option value="KHR">KHR (៛)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Type Toggle: Income vs Expense */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-tg-text">ទិសដៅ</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('credit')}
                className={clsx(
                  'py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5',
                  type === 'credit'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                    : 'bg-tg-bg border-tg-border text-tg-text-hint'
                )}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>ចំណូល (Credit)</span>
              </button>
              <button
                type="button"
                onClick={() => setType('debit')}
                className={clsx(
                  'py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5',
                  type === 'debit'
                    ? 'bg-rose-500/15 border-rose-500 text-rose-400'
                    : 'bg-tg-bg border-tg-border text-tg-text-hint'
                )}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>ចំណាយ (Debit)</span>
              </button>
            </div>
          </div>

          {/* Bank Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-tg-text">គណនីធនាគារ</label>
            <div className="grid grid-cols-3 gap-2">
              {(['ABA', 'Bakong', 'ACLEDA', 'Wing', 'Canadia', 'Other'] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBank(b)}
                  className={clsx(
                    'py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center truncate',
                    bank === b
                      ? 'bg-[#2481cc]/15 border-[#2481cc] text-[#2481cc]'
                      : 'bg-tg-bg border-tg-border text-tg-text'
                  )}
                >
                  {BANK_META[b]?.label || b}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-tg-text">ពិពណ៌នា / ចំណាំ</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ឧ. បង់ថ្លៃកាហ្វេ, ទទួលប្រាក់ខែ..."
              className="w-full bg-tg-bg border border-tg-border rounded-xl px-3 py-2 text-xs text-tg-text focus:outline-none focus:border-tg-blue"
            />
          </div>

          {/* Counterparty & Reference */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-tg-text">អ្នកទទួល / អ្នកផ្ញើ</label>
              <input
                type="text"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                placeholder="ឧ. សុខ ហេង"
                className="w-full bg-tg-bg border border-tg-border rounded-xl px-3 py-2 text-xs text-tg-text focus:outline-none focus:border-tg-blue"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-tg-text">លេខកូដយោង</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. TRX-12345"
                className="w-full bg-tg-bg border border-tg-border rounded-xl px-3 py-2 text-xs text-tg-text focus:outline-none focus:border-tg-blue font-mono"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-tg-text">ប្រភេទ</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full bg-tg-bg border border-tg-border rounded-xl px-3 py-2 text-xs text-tg-text focus:outline-none focus:border-tg-blue"
            >
              <option value="income">ចំណូល / ប្រាក់ចូល</option>
              <option value="expense">ចំណាយ / ទិញទំនិញ</option>
              <option value="transfer">ផ្ទេរប្រាក់</option>
              <option value="invoice">វិក្កយបត្រ</option>
            </select>
          </div>

          {/* Auto sync to calendar checkbox */}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={addToCalendarCheck}
              onChange={(e) => setAddToCalendarCheck(e.target.checked)}
              className="w-4 h-4 rounded text-tg-blue"
            />
            <span className="text-xs font-semibold text-tg-text">
              កត់ត្រាទុកក្នុងប្រតិទិន (Calendar) ស្វ័យប្រវត្តិ
            </span>
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#2481cc] hover:bg-[#2481cc]/90 text-white font-bold text-sm active:scale-98 transition-transform shadow-md flex items-center justify-center gap-2 mt-2"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>រក្សាទុកប្រតិបត្តិការ</span>
          </button>
        </form>
      </BottomSheet>

      {/* ── Import Excel Bottom Sheet ── */}
      <BottomSheet
        open={importSheetOpen}
        onClose={() => setImportSheetOpen(false)}
        title="Import Bank Statement"
      >
        <div className="space-y-3.5 p-1">
          {/* Tab Selection */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-tg-bg rounded-xl border border-tg-border">
            <button
              type="button"
              onClick={() => setImportTab('file')}
              className={clsx(
                'py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                importTab === 'file'
                  ? 'bg-tg-bg-secondary text-tg-text shadow-xs'
                  : 'text-tg-text-hint hover:text-tg-text'
              )}
            >
              <FileInput className="w-3.5 h-3.5" />
              <span>Excel File</span>
            </button>
            <button
              type="button"
              onClick={() => setImportTab('paste')}
              className={clsx(
                'py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                importTab === 'paste'
                  ? 'bg-tg-bg-secondary text-tg-text shadow-xs'
                  : 'text-tg-text-hint hover:text-tg-text'
              )}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Paste Text</span>
            </button>
          </div>

          {/* Tab 1: Excel File Upload */}
          {importTab === 'file' && (
            <div className="space-y-3">
              {!parsedStatementResult ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-2xl border-2 border-dashed border-tg-border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-center cursor-pointer group space-y-2"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-tg-text">
                      Upload Bank Statement Spreadsheet
                    </p>
                    <p className="text-[11px] text-tg-text-hint mt-0.5">
                      Supports ACLEDA, ABA, Bakong, Wing (.xlsx, .xls)
                    </p>
                  </div>
                  <button
                    type="button"
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs inline-flex items-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <span>Choose Excel File</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-tg-text truncate">
                          {uploadedFileMeta?.name}
                        </p>
                        <p className="text-[10px] text-tg-text-hint">
                          {uploadedFileMeta?.size} • {parsedStatementResult.metadata.accountName} • ~{parsedStatementResult.transactions.length} Rows
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition-all shrink-0 active:scale-95"
                    >
                      ប្តូរ File
                    </button>
                  </div>

                  {/* Statement Summary 2x2 Grid Tiles (from EPR ImportStatementModal) */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-tg-bg border border-tg-border/25 rounded-2xl p-2.5 space-y-0.5">
                      <span className="text-[10px] text-tg-text-hint font-medium">ម្ចាស់គណនី</span>
                      <p className="font-bold text-tg-text truncate">{parsedStatementResult.metadata.accountName}</p>
                    </div>

                    <div className="bg-tg-bg border border-tg-border/25 rounded-2xl p-2.5 space-y-0.5">
                      <span className="text-[10px] text-tg-text-hint font-medium">លេខគណនី</span>
                      <p className="font-bold text-tg-text font-mono truncate">
                        {parsedStatementResult.metadata.accountNumber}{' '}
                        <span className="text-emerald-400 text-[10px]">[{parsedStatementResult.metadata.currency}]</span>
                      </p>
                    </div>

                    <div className="bg-tg-bg border border-tg-border/25 rounded-2xl p-2.5 space-y-0.5">
                      <span className="text-[10px] text-tg-text-hint font-medium">កាលបរិច្ឆេទរបាយការណ៍</span>
                      <p className="font-bold text-[#2481cc] truncate text-[11px]">
                        {parsedStatementResult.metadata.statementPeriod}
                      </p>
                    </div>

                    <div className="bg-tg-bg border border-tg-border/25 rounded-2xl p-2.5 space-y-0.5">
                      <span className="text-[10px] text-tg-text-hint font-medium">សមតុល្យចុងគ្រា</span>
                      <p className="font-bold text-emerald-400 font-mono truncate">
                        ${parsedStatementResult.metadata.endingBalance.toFixed(2)} USD
                      </p>
                    </div>
                  </div>

                  {/* Smart Append & Deduplicate Option Card (from EPR) */}
                  <div className="p-3 rounded-2xl bg-tg-bg border border-tg-border/25 flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-tg-text">
                          {!clearExisting
                            ? 'បន្ថែមបន្ត & មិនជាន់គ្នា'
                            : 'សម្អាតទិន្នន័យចាស់ទាំងអស់'}
                        </span>
                        {!clearExisting && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#2481cc]/20 text-[#2481cc] border border-[#2481cc]/30">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-tg-text-hint leading-relaxed">
                        {!clearExisting
                          ? 'ពិនិត្យ Reference Code / Signature ដើម្បីមិនឱ្យមានទិន្នន័យស្ទួន និងកត់ត្រាចូលអចិន្ត្រៃយ៍'
                          : 'លុបទិន្នន័យចាស់ចោលទាំងអស់ ហើយដាក់ទិន្នន័យពី Excel ថ្មីទាំងស្រុង'}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={!clearExisting}
                      onChange={(e) => setClearExisting(!e.target.checked)}
                      className="w-4 h-4 rounded text-[#2481cc] shrink-0"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Paste Textarea */}
          {importTab === 'paste' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-tg-text">
                  Paste Tabular Spreadsheet Content
                </span>
                {pastedText.length > 0 && (
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
            <div className="space-y-2 pt-1 font-sans">
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
                      +${previewTotals.inflowUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  )}
                  {previewTotals.outflowUSD > 0 && (
                    <span className="text-rose-400 block font-mono">
                      -${previewTotals.outflowUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                  const { title } = parseTransactionNote(item.description);
                  const cleanTitle = title || item.description;
                  const rawLower = (item.description || '').toLowerCase();
                  const isPaid = rawLower.includes('paid to') || rawLower.includes('payment to') || rawLower.includes('transfer to');
                  const isReceived = rawLower.includes('received from') || rawLower.includes('deposit from');
                  const isCredit = isPaid ? false : isReceived ? true : item.type === 'credit';
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
                            {cleanTitle}
                          </p>
                          <p className="text-[10px] text-tg-text-hint font-medium">
                            {m.label} · {item.date} {item.counterparty ? `· ${item.counterparty}` : ''}
                          </p>
                        </div>
                      </div>
                      <span
                        className={clsx(
                          'font-mono font-bold text-xs shrink-0',
                          isCredit ? 'text-emerald-400' : 'text-rose-400'
                        )}
                      >
                        {isCredit ? '+' : '-'}{symbol}{item.amount.toLocaleString(undefined, { minimumFractionDigits: item.currency === 'USD' ? 2 : 0 })}
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
                <span>
                  {clearExisting
                    ? `សម្អាត និងបញ្ចូលថ្មី (${previewItems.length} ប្រតិបត្តិការ)`
                    : `បញ្ជាក់ & នាំចូល (${previewItems.length} ប្រតិបត្តិការ)`}
                </span>
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

      {/* ── Date Filter Bottom Sheet ── */}
      <BottomSheet
        open={dateFilterSheetOpen}
        onClose={() => setDateFilterSheetOpen(false)}
        title="ជ្រើសរើសកាលបរិច្ឆេទ"
      >
        <div className="space-y-4 pt-1 pb-6 px-1">
          {/* Quick Clear / All Option */}
          <div className="bg-tg-bg-secondary rounded-2xl border border-tg-border/25 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setSelectedDateFilter('all');
                setDateFilterSheetOpen(false);
              }}
              className={clsx(
                'w-full p-3.5 flex items-center justify-between text-xs font-bold transition-all',
                selectedDateFilter === 'all'
                  ? 'bg-[#2481cc]/15 text-[#2481cc]'
                  : 'text-tg-text hover:bg-white/5 active:bg-white/10'
              )}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={clsx(
                    'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                    selectedDateFilter === 'all'
                      ? 'bg-[#2481cc] text-white'
                      : 'bg-white/5 text-[#2481cc]'
                  )}
                >
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-[13px]">កាលបរិច្ឆេទទាំងអស់</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-tg-text-hint font-medium text-xs">
                  {toKhmerNum(transactions.length)} ប្រតិបត្តិការ
                </span>
                {selectedDateFilter === 'all' && (
                  <Check className="w-4 h-4 text-[#2481cc] stroke-[2.5]" />
                )}
              </div>
            </button>
          </div>

          {/* Custom Date Input */}
          <div className="bg-tg-bg-secondary rounded-2xl border border-tg-border/25 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-tg-text">ជ្រើសរើសថ្ងៃជាក់លាក់</span>
              {selectedDateFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDateFilter('all');
                    setDateFilterSheetOpen(false);
                  }}
                  className="text-[11px] text-[#2481cc] font-medium hover:underline"
                >
                  កំណត់ឡើងវិញ
                </button>
              )}
            </div>
            <div className="relative flex items-center bg-tg-bg rounded-xl border border-tg-border/25 px-3 py-2.5 focus-within:border-[#2481cc] transition-colors">
              <Calendar className="w-4 h-4 text-[#2481cc] shrink-0 mr-2.5" />
              <input
                type="date"
                value={selectedDateFilter === 'all' ? '' : selectedDateFilter}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDateFilter(e.target.value);
                    setDateFilterSheetOpen(false);
                  }
                }}
                className="w-full bg-transparent text-xs text-tg-text font-mono focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>
          </div>

          {/* List of dates available in statement */}
          {availableDates.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-tg-text-hint px-1">
                ថ្ងៃដែលមានក្នុងរបាយការណ៍ ({toKhmerNum(availableDates.length)} ថ្ងៃ)
              </span>
              <div className="bg-tg-bg-secondary rounded-2xl border border-tg-border/25 divide-y divide-tg-border/15 overflow-hidden max-h-60 overflow-y-auto">
                {availableDates.map((d) => {
                  const isSelected = selectedDateFilter === d.date;
                  const dayCurrency = selectedCurrency;
                  const daySymbol = dayCurrency === 'USD' ? '$' : '៛';
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => {
                        setSelectedDateFilter(d.date);
                        setDateFilterSheetOpen(false);
                      }}
                      className={clsx(
                        'w-full p-3.5 flex items-center justify-between text-xs transition-all text-left group',
                        isSelected
                          ? 'bg-[#2481cc]/15 text-[#2481cc]'
                          : 'hover:bg-white/5 active:bg-white/10 text-tg-text'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={clsx(
                            'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-mono text-xs font-bold',
                            isSelected
                              ? 'bg-[#2481cc] text-white'
                              : 'bg-white/5 text-tg-text-hint'
                          )}
                        >
                          {d.date.slice(-2)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={clsx(
                                'font-mono text-xs font-bold',
                                isSelected ? 'text-[#2481cc]' : 'text-tg-text'
                              )}
                            >
                              {d.date}
                            </span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-[#2481cc] stroke-[2.5]" />
                            )}
                          </div>
                          <span className="text-[10px] text-tg-text-hint">
                            {toKhmerNum(d.count)} ប្រតិបត្តិការ
                          </span>
                        </div>
                      </div>
                      <span
                        className={clsx(
                          'font-mono text-xs font-bold shrink-0',
                          d.net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        )}
                      >
                        {d.net >= 0 ? '+' : '-'}{daySymbol}
                        {Math.abs(d.net).toLocaleString(undefined, {
                          minimumFractionDigits: dayCurrency === 'USD' ? 2 : 0,
                        })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* ── Clean Data Confirmation Bottom Sheet (Khmer only & polished padding) ── */}
      <BottomSheet
        open={cleanConfirmOpen}
        onClose={() => setCleanConfirmOpen(false)}
        title="សម្អាតទិន្នន័យទាំងអស់"
      >
        <div className="space-y-4 pt-1 pb-6 px-1">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center shrink-0 mt-0.5 text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 min-w-0 flex-1">
              <h4 className="text-[15px] font-bold text-tg-text leading-snug">
                តើអ្នកពិតជាចង់សម្អាតទិន្នន័យទាំងអស់មែនទេ?
              </h4>
              <p className="text-xs text-tg-text-secondary leading-relaxed font-normal">
                រាល់ទិន្នន័យប្រតិបត្តិការទាំងអស់ ({transactions.length} ប្រតិបត្តិការ) ព្រមទាំងសមតុល្យគណនី នឹងត្រូវសម្អាតចេញពីប្រព័ន្ធទាំងស្រុង។
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCleanConfirmOpen(false)}
              className="py-3 px-4 rounded-xl bg-tg-bg-secondary hover:bg-tg-surface text-tg-text font-bold text-sm active:scale-98 transition-all border border-tg-border/25"
            >
              បោះបង់
            </button>
            <button
              type="button"
              onClick={handleCleanData}
              className="py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm active:scale-98 transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>សម្អាត</span>
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
