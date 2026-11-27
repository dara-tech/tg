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
  FileInput,
  ClipboardPaste,
  Sparkles,
  Check,
  AlertCircle,
} from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { toast } from '@/components/ui/Toast';
import clsx from 'clsx';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

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

export function parseErpTransactions(rawText: string): BankTransaction[] {
  const text = rawText.trim();
  if (!text) return [];

  // 1. JSON Array (Odoo, ERP REST API, Webhook Export)
  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : parsed.transactions || parsed.items || parsed.data || [];
      if (Array.isArray(list) && list.length > 0) {
        return list
          .map((item: any, i: number) => {
            const rawAmt = Number(item.amount) || 0;
            const isDebit =
              item.type === 'debit' ||
              rawAmt < 0 ||
              String(item.type).toLowerCase() === 'expense';
            const detectedBank = ([
              'ABA',
              'Bakong',
              'ACLEDA',
              'Wing',
              'Canadia',
            ].includes(item.bank)
              ? item.bank
              : 'Other') as BankTransaction['bank'];

            return {
              id: `erp-import-${Date.now()}-${i}`,
              date: item.date
                ? String(item.date).slice(0, 10)
                : format(new Date(), 'yyyy-MM-dd'),
              time: item.time || '12:00',
              amount: Math.abs(rawAmt),
              currency: (item.currency === 'KHR' ||
              String(item.amount).includes('៛')
                ? 'KHR'
                : 'USD') as 'USD' | 'KHR',
              type: (isDebit ? 'debit' : 'credit') as 'credit' | 'debit',
              bank: detectedBank,
              description:
                item.description || item.memo || item.name || 'ERP Transaction',
              counterparty:
                item.counterparty || item.partner || item.vendor || item.customer || '',
              reference:
                item.reference || item.ref || item.invoice_no || `ERP-${i + 1}`,
              category:
                item.category || (isDebit ? 'expense' : 'income'),
              source: 'erp' as const,
            };
          })
          .filter((t) => t.amount > 0);
      }
    } catch {}
  }

  // 2. Delimited text (CSV, TSV, Semicolon, Pipe)
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  // Detect delimiter
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';
  else if (firstLine.includes('|')) delimiter = '|';

  const parseLine = (line: string): string[] => {
    if (delimiter === ',') {
      const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
      const matches: string[] = [];
      let match;
      while ((match = regex.exec(line)) !== null) {
        let val = match[1];
        if (val === undefined) break;
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1).replace(/""/g, '"');
        }
        matches.push(val.trim());
        if (regex.lastIndex === match.index) regex.lastIndex++;
      }
      return matches.filter(
        (_, idx) => idx < matches.length - 1 || line.endsWith(',')
      );
    }
    return line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
  };

  const headerCols = parseLine(firstLine).map((h) => h.toLowerCase());
  const hasHeader = headerCols.some(
    (h) =>
      h.includes('date') ||
      h.includes('amount') ||
      h.includes('credit') ||
      h.includes('desc') ||
      h.includes('type')
  );

  let dateIdx = -1;
  let typeIdx = -1;
  let amountIdx = -1;
  let currIdx = -1;
  let bankIdx = -1;
  let descIdx = -1;
  let counterpartyIdx = -1;
  let refIdx = -1;
  let creditIdx = -1;
  let debitIdx = -1;

  let startRow = 0;
  if (hasHeader) {
    startRow = 1;
    dateIdx = headerCols.findIndex((h) => h.includes('date') || h.includes('time'));
    typeIdx = headerCols.findIndex(
      (h) => h === 'type' || h.includes('direction') || h.includes('status')
    );
    amountIdx = headerCols.findIndex(
      (h) => h === 'amount' || h.includes('value') || h.includes('total')
    );
    currIdx = headerCols.findIndex((h) => h.includes('curr') || h.includes('ccy'));
    bankIdx = headerCols.findIndex(
      (h) => h.includes('bank') || h.includes('channel') || h.includes('account')
    );
    descIdx = headerCols.findIndex(
      (h) =>
        h.includes('desc') ||
        h.includes('memo') ||
        h.includes('detail') ||
        h.includes('narr') ||
        h.includes('particular')
    );
    counterpartyIdx = headerCols.findIndex(
      (h) =>
        h.includes('counter') ||
        h.includes('party') ||
        h.includes('partner') ||
        h.includes('vendor') ||
        h.includes('client') ||
        h.includes('customer')
    );
    refIdx = headerCols.findIndex(
      (h) => h.includes('ref') || h.includes('id') || h.includes('trx') || h.includes('inv')
    );
    creditIdx = headerCols.findIndex(
      (h) => h.includes('credit') || h.includes('inflow') || h.includes('deposit')
    );
    debitIdx = headerCols.findIndex(
      (h) => h.includes('debit') || h.includes('outflow') || h.includes('withdraw')
    );
  }

  const results: BankTransaction[] = [];

  for (let i = startRow; i < lines.length; i++) {
    const rawCols = parseLine(lines[i]);
    if (rawCols.length === 0 || (rawCols.length === 1 && !rawCols[0])) continue;

    // Normalize date
    let rawDate = dateIdx >= 0 ? rawCols[dateIdx] : '';
    if (!rawDate) {
      const foundDate = rawCols.find((c) =>
        /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b|\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/.test(c)
      );
      rawDate = foundDate || format(new Date(), 'yyyy-MM-dd');
    }
    if (rawDate.includes('/')) {
      const parts = rawDate.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          rawDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (parts[0].length === 4) {
          rawDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
      }
    }

    // Determine amount and type
    let amt = 0;
    let isCredit = true;

    if (creditIdx >= 0 && parseFloat(rawCols[creditIdx]?.replace(/[$,\s]/g, '')) > 0) {
      amt = parseFloat(rawCols[creditIdx].replace(/[$,\s]/g, ''));
      isCredit = true;
    } else if (debitIdx >= 0 && parseFloat(rawCols[debitIdx]?.replace(/[$,\s]/g, '')) > 0) {
      amt = parseFloat(rawCols[debitIdx].replace(/[$,\s]/g, ''));
      isCredit = false;
    } else if (amountIdx >= 0) {
      const valStr = rawCols[amountIdx] || '0';
      const cleanVal = valStr.replace(/[$,៛\s]/g, '');
      const parsedNum = parseFloat(cleanVal);
      amt = Math.abs(parsedNum);
      isCredit = parsedNum >= 0 && !valStr.includes('-');
    } else {
      const numCol = rawCols.find((c) => /^[+-]?\$?[\d,]+(\.\d+)?$/.test(c.trim()));
      if (numCol) {
        const parsedNum = parseFloat(numCol.replace(/[$,\s]/g, ''));
        amt = Math.abs(parsedNum);
        isCredit = parsedNum >= 0 && !numCol.includes('-');
      }
    }

    if (typeIdx >= 0 && rawCols[typeIdx]) {
      const t = rawCols[typeIdx].toLowerCase();
      if (
        t.includes('deb') ||
        t.includes('out') ||
        t.includes('exp') ||
        t.includes('with') ||
        t.includes('-')
      ) {
        isCredit = false;
      } else if (
        t.includes('cred') ||
        t.includes('in') ||
        t.includes('dep') ||
        t.includes('+')
      ) {
        isCredit = true;
      }
    }

    if (isNaN(amt) || amt <= 0) continue;

    // Detect currency
    const lineJoined = rawCols.join(' ');
    const isKhr =
      (currIdx >= 0 && rawCols[currIdx]?.toUpperCase().includes('KHR')) ||
      lineJoined.includes('KHR') ||
      lineJoined.includes('៛') ||
      (amt > 10000 && !lineJoined.includes('$') && !lineJoined.includes('USD'));

    // Detect Bank
    let detectedBank: BankTransaction['bank'] = 'ABA';
    if (bankIdx >= 0 && rawCols[bankIdx]) {
      const b = rawCols[bankIdx].toUpperCase();
      if (b.includes('BAKONG') || b.includes('KHQR')) detectedBank = 'Bakong';
      else if (b.includes('ABA')) detectedBank = 'ABA';
      else if (b.includes('ACLEDA')) detectedBank = 'ACLEDA';
      else if (b.includes('WING')) detectedBank = 'Wing';
      else if (b.includes('CANADIA')) detectedBank = 'Canadia';
      else detectedBank = 'Other';
    } else {
      if (lineJoined.includes('Bakong') || lineJoined.includes('KHQR'))
        detectedBank = 'Bakong';
      else if (lineJoined.includes('ABA')) detectedBank = 'ABA';
      else if (lineJoined.includes('ACLEDA')) detectedBank = 'ACLEDA';
      else if (lineJoined.includes('Wing')) detectedBank = 'Wing';
      else if (lineJoined.includes('Canadia')) detectedBank = 'Canadia';
      else detectedBank = isKhr ? 'Bakong' : 'ABA';
    }

    const desc =
      descIdx >= 0 && rawCols[descIdx]
        ? rawCols[descIdx]
        : rawCols[1] || 'ERP Transaction Record';
    const counterparty =
      counterpartyIdx >= 0 ? rawCols[counterpartyIdx] : undefined;
    const ref =
      refIdx >= 0 && rawCols[refIdx]
        ? rawCols[refIdx]
        : `ERP-${Date.now().toString().slice(-6)}-${i}`;

    results.push({
      id: `erp-import-${Date.now()}-${i}`,
      date: rawDate.slice(0, 10),
      time: '12:00',
      amount: amt,
      currency: isKhr ? 'KHR' : 'USD',
      type: isCredit ? 'credit' : 'debit',
      bank: detectedBank,
      description: desc,
      counterparty,
      reference: ref,
      category: isCredit ? 'income' : 'expense',
      source: 'erp',
    });
  }

  return results;
}

export const BANK_META: Record<
  BankTransaction['bank'],
  { label: string; logo: string; bg: string; color: string; border: string }
> = {
  ABA: {
    label: 'ABA Bank',
    logo: '/icons/banks/aba.png',
    bg: 'bg-[#004B6E]',
    color: 'text-white',
    border: 'border-[#00608F]',
  },
  Bakong: {
    label: 'Bakong KHQR',
    logo: '/icons/banks/khqr.svg',
    bg: 'bg-[#E1251B]',
    color: 'text-white',
    border: 'border-[#F04438]',
  },
  ACLEDA: {
    label: 'ACLEDA Bank',
    logo: '/icons/banks/acleda.png',
    bg: 'bg-[#0B2B61]',
    color: 'text-white',
    border: 'border-[#154289]',
  },
  Wing: {
    label: 'Wing Bank',
    logo: '/icons/banks/wing.svg',
    bg: 'bg-[#8EC33D]',
    color: 'text-[#1A3300]',
    border: 'border-[#A3DB4A]',
  },
  Canadia: {
    label: 'Canadia Bank',
    logo: '/icons/banks/canadia.png',
    bg: 'bg-[#C8102E]',
    color: 'text-white',
    border: 'border-[#E02444]',
  },
  Other: {
    label: 'Bank Transfer',
    logo: '',
    bg: 'bg-indigo-600',
    color: 'text-white',
    border: 'border-indigo-500',
  },
};

export const BANK_BADGES = BANK_META;

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
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((t: any) => !['tx-1', 'tx-2', 'tx-3'].includes(t.id));
        }
      }
    } catch {}
    return [];
  });

  const [activeTab, setActiveTab] = useState<'all' | 'credit' | 'debit'>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'KHR'>('USD');
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

  // Live parsed preview
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

    if (importSyncToCalendar && onSyncToCalendar) {
      previewItems.forEach((tx) => onSyncToCalendar(tx));
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
                USD
              </button>
              <button
                onClick={() => setSelectedCurrency('KHR')}
                className={clsx(
                  'px-3 py-1 rounded-full text-xs font-bold transition-all',
                  selectedCurrency === 'KHR' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white'
                )}
              >
                KHR
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
            accept=".xlsx,.xls,.csv,.txt,.json,.tsv"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={() => setImportSheetOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-tg-bg-secondary border border-tg-border/30 hover:bg-tg-surface active:scale-95 transition-all text-center"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-tg-text">Import ERP</span>
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
            <p className="mt-0.5">Import Excel spreadsheet (.xlsx) or tap Manual Input above</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredList.map((tx) => {
              const meta = BANK_META[tx.bank] || BANK_META.Other;
              const isCredit = tx.type === 'credit';
              const symbol = tx.currency === 'USD' ? '$' : '៛';
              const amountStr = `${isCredit ? '+' : '-'}${symbol}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: tx.currency === 'USD' ? 2 : 0 })}`;

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

          {/* Bank Selection with Official Bank Logos */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-tg-text-hint">Bank Channel</label>
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

      {/* ERP Transactions Import BottomSheet */}
      <BottomSheet
        open={importSheetOpen}
        onClose={() => setImportSheetOpen(false)}
        title="Import ERP Transactions"
        maxWidth="sm:max-w-xl"
      >
        <div className="p-4 space-y-3.5 max-h-[82vh] overflow-y-auto">
          {/* Format Explanation */}
          <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-tg-bg-secondary border border-tg-border/25 text-xs">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-tg-text-secondary text-[11px]">
              Supports Excel (.xlsx, .xls), CSV, TSV (Sheets), Odoo/JSON, or raw bank statement text
            </span>
          </div>

          {/* Import Method Tabs: Paste vs File */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-tg-bg-secondary rounded-2xl border border-tg-border/30">
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
              <span>Paste Text / JSON</span>
            </button>
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
              <span>Upload File</span>
            </button>
          </div>

          {/* Tab 1: Paste Textarea */}
          {importTab === 'paste' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-tg-text-hint uppercase tracking-wider text-[10px]">
                  Raw Statement / CSV / TSV / JSON
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
                placeholder={`Paste spreadsheet rows or ERP export here:\nDate,Type,Amount,Currency,Bank,Description\n2026-11-27,credit,2500,USD,ABA,Client Milestone 1`}
                className="w-full bg-tg-bg border border-tg-border rounded-xl p-3 text-xs font-mono text-tg-text focus:outline-none focus:border-tg-blue leading-relaxed"
              />
            </div>
          )}

          {/* Tab 2: File Dropzone */}
          {importTab === 'file' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-tg-border/50 hover:border-tg-blue rounded-2xl p-6 text-center cursor-pointer bg-tg-bg-secondary/40 active:scale-99 transition-all space-y-2"
            >
              <div className="w-10 h-10 rounded-full bg-tg-blue/15 text-tg-blue mx-auto flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-tg-text">Choose Excel (.xlsx, .xls), CSV, or JSON</p>
                <p className="text-[11px] text-tg-text-hint mt-0.5">Click to browse your device files</p>
              </div>
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
              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                {previewItems.map((item, idx) => {
                  const badge = BANK_BADGES[item.bank] || BANK_BADGES.Other;
                  const isCredit = item.type === 'credit';
                  const symbol = item.currency === 'USD' ? '$' : '៛';
                  return (
                    <div
                      key={item.id || idx}
                      className="p-2.5 rounded-xl bg-tg-bg border border-tg-border/25 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={clsx(
                              'px-1.5 py-0.5 rounded text-[9px] font-black uppercase border',
                              badge.color
                            )}
                          >
                            {item.bank}
                          </span>
                          <span className="text-[11px] text-tg-text-hint font-medium">
                            {item.date}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-tg-text truncate mt-0.5">
                          {item.description}
                        </p>
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
    </BottomSheet>
  );
}
