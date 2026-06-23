import React, { useState, useEffect, useRef } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Sparkles, 
  Mic, 
  MicOff, 
  Trash2, 
  Plus, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Send, 
  HelpCircle, 
  FileText, 
  ChevronRight, 
  DollarSign, 
  Info,
  Layers,
  X
} from "lucide-react";
import { 
  subscribeBookkeepingEntries, 
  subscribeStockItems, 
  saveBookkeepingEntry, 
  saveStockItem, 
  deleteBookkeepingEntry, 
  deleteStockItem 
} from "./ledgerStore";
import { testFirestoreConnection } from "./firebase";
import { BookkeepingEntry, StockItem, ParsedItem } from "./types";

// Standard web speech recognition variable
const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function App() {
  // Ledger Databases States
  const [entries, setEntries] = useState<BookkeepingEntry[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);

  // Bookkeeping inputs
  const [rawTextInput, setRawTextInput] = useState("");
  const [isParsingAI, setIsParsingAI] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Audio Speech Recognition States
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // AI Parsed Confirmation Stage
  const [parsedPreview, setParsedPreview] = useState<{
    type: "income" | "expense";
    amount: number;
    category: string;
    description: string;
    items: ParsedItem[];
    stockUpdates: Array<{ name: string; change: number }>;
  } | null>(null);

  // Manual stock insertion states
  const [showAddStockForm, setShowAddStockForm] = useState(false);
  const [manualStockName, setManualStockName] = useState("");
  const [manualStockQty, setManualStockQty] = useState<number>(100);
  const [manualStockMin, setManualStockMin] = useState<number>(15);

  // AI Assistant Advisor Chat log
  const [advisorQuery, setAdvisorQuery] = useState("");
  const [advisorChatLog, setAdvisorChatLog] = useState<Array<{ sender: "user" | "advisor"; text: string }>>([
    {
      sender: "advisor",
      text: "Hello! I am your SmartLedger AI financial companion. I can analyze your sales depletion rates, estimate your P&L margins, generate tax advice, or warn you about weak product flows. Ask me anything!"
    }
  ]);
  const [advisorLoading, setAdvisorLoading] = useState(false);

  // Category filter
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected chart element (interactive hover)
  const [hoveredChartPoint, setHoveredChartPoint] = useState<number | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Initialize and check Firestore connection
  useEffect(() => {
    testFirestoreConnection();

    // Subscribe to bookkeeping real-time stream
    const unsubscribeEntries = subscribeBookkeepingEntries((newEntries) => {
      setEntries(newEntries);
      setLoadingDb(false);
    });

    // Subscribe to stock items real-time stream
    const unsubscribeStock = subscribeStockItems((newStock) => {
      setStockItems(newStock);
    });

    // Check Speech Recognition capability
    if (SpeechRecognitionAPI) {
      setSpeechSupported(true);
      const rec = new SpeechRecognitionAPI();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setRawTextInput((prev) => (prev ? prev + " " + transcript : transcript));
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      unsubscribeEntries();
      unsubscribeStock();
    };
  }, []);

  // Seeding sample template records if empty
  const triggerSampleDataSeed = async () => {
    try {
      // 1. Seed initial stock items
      const sampleStocks: Omit<StockItem, "id">[] = [
        {
          name: "coffee beans",
          currentStock: 45,
          minStockAlert: 15,
          burnRate: 2.1,
          lastUpdated: new Date().toISOString()
        },
        {
          name: "milk cartons",
          currentStock: 8,
          minStockAlert: 10,
          burnRate: 1.5,
          lastUpdated: new Date().toISOString()
        },
        {
          name: "croissants",
          currentStock: 25,
          minStockAlert: 5,
          burnRate: 4.0,
          lastUpdated: new Date().toISOString()
        }
      ];

      for (const stock of sampleStocks) {
        await saveStockItem(stock);
      }

      // 2. Seed initial bookkeeping entries
      const sampleEntries: Omit<BookkeepingEntry, "id">[] = [
        {
          timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
          rawText: "Sold 10 packages of coffee beans for 150 dollars",
          type: "income",
          amount: 150,
          category: "Sales",
          description: "Sold 10 packages of coffee beans",
          items: [{ name: "coffee beans", quantity: 10, price: 15 }]
        },
        {
          timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
          rawText: "Paid 120 dollars electricity bill",
          type: "expense",
          amount: 120,
          category: "Utilities",
          description: "Electricity Bill Utilities payment",
          items: [{ name: "electricity bill", quantity: 1, price: 120 }]
        },
        {
          timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
          rawText: "Sold 3 bags of coffee beans for 45 dollars total",
          type: "income",
          amount: 45,
          category: "Sales",
          description: "Sold 3 bags of coffee beans",
          items: [{ name: "coffee beans", quantity: 3, price: 15 }]
        },
        {
          timestamp: new Date().toISOString(),
          rawText: "Paid 30 dollars for 10 milk cartons",
          type: "expense",
          amount: 30,
          category: "Inventory",
          description: "Restocked 10 milk cartons",
          items: [{ name: "milk cartons", quantity: 10, price: 3.0 }]
        }
      ];

      for (const entry of sampleEntries) {
        await saveBookkeepingEntry(entry);
      }
    } catch (err) {
      console.error("Seeding template failed:", err);
    }
  };

  // Toggle voice speech recognition
  const toggleRecording = () => {
    if (!speechSupported || !recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // Submit Text to express route `/api/bookkeep` for parsing
  const requestAIBookkeepParse = async () => {
    if (!rawTextInput.trim()) return;
    setIsParsingAI(true);
    setParseError(null);
    setParsedPreview(null);

    try {
      const existingStockNames = stockItems.map((s) => s.name);
      const res = await fetch("/api/bookkeep", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: rawTextInput,
          existingStockNames
        })
      });

      if (!res.ok) {
        throw new Error(`Failed to parse: Server responded with status ${res.status}`);
      }

      const parsedJSON = await res.json();
      if (parsedJSON.error) {
        throw new Error(parsedJSON.error);
      }

      setParsedPreview(parsedJSON);
    } catch (err: any) {
      console.error("Error asking AI parsing:", err);
      setParseError(err.message || "Unable to parse with AI. Try writing cleanly.");
    } finally {
      setIsParsingAI(false);
    }
  };

  // Accept and commit parsed ledger transaction
  const confirmAndSaveAILedger = async () => {
    if (!parsedPreview) return;

    try {
      // 1. Save entry to Firestore
      const newEntry: Omit<BookkeepingEntry, "id"> = {
        timestamp: new Date().toISOString(),
        rawText: rawTextInput,
        type: parsedPreview.type,
        amount: parsedPreview.amount,
        category: parsedPreview.category || "Other",
        description: parsedPreview.description || "Parsed raw transaction",
        items: parsedPreview.items || []
      };

      await saveBookkeepingEntry(newEntry);

      // 2. Adjust and track stock items dynamically based on parsing estimates
      if (parsedPreview.stockUpdates && parsedPreview.stockUpdates.length > 0) {
        for (const update of parsedPreview.stockUpdates) {
          const matchStock = stockItems.find((s) => s.name.toLowerCase() === update.name.toLowerCase());
          
          if (matchStock) {
            // Update existing stock level
            const updatedStockWeight = Math.max(0, matchStock.currentStock + update.change);
            
            // Re-calculate mock or slightly updated burn rate based on sales
            let updatedBurn = matchStock.burnRate;
            if (parsedPreview.type === "income" && update.change < 0) {
              // Increase rate slightly as they make more sales
              updatedBurn = Number((matchStock.burnRate + Math.abs(update.change) * 0.1).toFixed(2));
            }

            await saveStockItem({
              ...matchStock,
              currentStock: updatedStockWeight,
              burnRate: updatedBurn,
              lastUpdated: new Date().toISOString()
            });
          } else {
            // Register a brand new stock item dynamically!
            const newStockItem: Omit<StockItem, "id"> = {
              name: update.name.toLowerCase(),
              currentStock: Math.max(0, update.change),
              minStockAlert: 10,
              burnRate: parsedPreview.type === "income" ? Math.abs(update.change) : 0.5,
              lastUpdated: new Date().toISOString()
            };
            await saveStockItem(newStockItem);
          }
        }
      }

      // Reset state on successful confirm
      setRawTextInput("");
      setParsedPreview(null);
    } catch (err) {
      console.error("Error saving ledger:", err);
      alert("Failed to save entry: " + err);
    }
  };

  // Handle addition of custom stock items manually
  const submitManualStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStockName.trim()) return;

    try {
      const slugName = manualStockName.toLowerCase().trim();
      const existing = stockItems.find((s) => s.name === slugName);

      const payload = {
        name: slugName,
        currentStock: Number(manualStockQty) || 0,
        minStockAlert: Number(manualStockMin) || 10,
        burnRate: existing ? existing.burnRate : 1.0, // default key burn
        lastUpdated: new Date().toISOString()
      };

      await saveStockItem(payload);
      setManualStockName("");
      setManualStockQty(100);
      setManualStockMin(15);
      setShowAddStockForm(false);
    } catch (err) {
      console.error("Failed manual stock add:", err);
    }
  };

  // Quick manually increment/decrement control in inventory list
  const adjustStockValue = async (item: StockItem, offset: number) => {
    try {
      const target = Math.max(0, item.currentStock + offset);
      await saveStockItem({
        ...item,
        currentStock: target,
        lastUpdated: new Date().toISOString()
      });
    } catch (err) {
      console.error("Stock level bump fail:", err);
    }
  };

  // Speak suggestion chip and immediately submit query
  const handleAdvisorSuggestedQuery = async (queryText: string) => {
    setAdvisorQuery(queryText);
    await triggerAdvisorRequest(queryText);
  };

  // Submit Advice Request to server `/api/ask-advisor`
  const triggerAdvisorRequest = async (overrideQuery?: string) => {
    const activeQuery = overrideQuery || advisorQuery;
    if (!activeQuery.trim() || advisorLoading) return;

    const userMessage = { sender: "user" as const, text: activeQuery };
    setAdvisorChatLog((prev) => [...prev, userMessage]);
    setAdvisorQuery("");
    setAdvisorLoading(true);

    try {
      const res = await fetch("/api/ask-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: activeQuery,
          transactions: entries,
          stockItems: stockItems
        })
      });

      if (!res.ok) {
        throw new Error("Chat assistant responded with error status");
      }

      const parsed = await res.json();
      setAdvisorChatLog((prev) => [
        ...prev,
        { sender: "advisor", text: parsed.response || "I was unable to analyze that request." }
      ]);
    } catch (err: any) {
      console.error("Advisor chat request failed:", err);
      setAdvisorChatLog((prev) => [
        ...prev,
        { sender: "advisor", text: "Deepest apologies. I'm having trouble retrieving fresh ledger data." }
      ]);
    } finally {
      setAdvisorLoading(false);
    }
  };

  // Core Ledger metrics
  const totalIncome = entries
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpense = entries
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + e.amount, 0);

  const netProfit = totalIncome - totalExpense;
  const estimatedTaxReserve = netProfit > 0 ? netProfit * 0.15 : 0;

  // Search and filtered transactions
  const filteredEntries = entries.filter((e) => {
    const matchesType = filterType === "all" || e.type === filterType;
    const matchesSearch = 
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.rawText.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Calculate top categories for expense breakups
  const categorySummary: { [cat: string]: number } = {};
  entries
    .filter((e) => e.type === "expense")
    .forEach((e) => {
      const cat = e.category || "Other";
      categorySummary[cat] = (categorySummary[cat] || 0) + e.amount;
    });

  const categoriesList = Object.entries(categorySummary).map(([name, val]) => ({
    name,
    value: val
  })).sort((a, b) => b.value - a.value);

  const totalExpenseAllocated = categoriesList.reduce((sum, c) => sum + c.value, 0) || 1;

  // Custom mini markdown formatter for AI Advisor notes
  const renderAdvisorText = (text: string) => {
    return text.split("\n").map((line, idx) => {
      let content: React.ReactNode = line;
      
      // Look for bullet points
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const rawPart = line.trim().substring(2);
        content = (
          <li className="list-disc ml-4 my-1 text-white/70">
            {formatBoldTags(rawPart)}
          </li>
        );
      } else if (line.trim().startsWith("### ")) {
        content = <h4 className="text-sm font-medium font-serif italic text-white mt-3 mb-1">{formatBoldTags(line.replace("### ", ""))}</h4>;
      } else if (line.trim().startsWith("## ")) {
        content = <h3 className="text-base font-semibold font-serif italic text-white mt-4 mb-2">{formatBoldTags(line.replace("## ", ""))}</h3>;
      } else if (line.trim()) {
        content = <p className="leading-relaxed my-2 text-white/85">{formatBoldTags(line)}</p>;
      } else {
        return <div key={idx} className="h-2" />;
      }

      return <div key={idx}>{content}</div>;
    });
  };

  // Sub-helper to process string bold syntax '**text**'
  const formatBoldTags = (str: string) => {
    const pieces = str.split(/\*\*(.*?)\*\*/g);
    return pieces.map((piece, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-semibold text-emerald-400">{piece}</strong>;
      }
      return piece;
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col text-white selection:bg-emerald-500 selection:text-black" id="app_root">
      
      {/* HEADER BAR */}
      <header className="border-b border-white/10 bg-[#0F0F11] sticky top-0 z-30 shadow-2xl px-4 py-4 sm:px-6" id="header_section">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/15" id="brand_badge">
              <Coins className="h-5 w-5 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-serif italic tracking-tight text-white">SmartLedger</h1>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full font-mono font-medium">
                  Live Engine
                </span>
              </div>
              <p className="text-xs text-white/40">Autonomous Shop Ledger & Inventory Risk Predictor</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {entries.length === 0 && stockItems.length === 0 && (
              <button
                onClick={triggerSampleDataSeed}
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
                id="btn_seed"
              >
                <RefreshCw className="h-3.5 w-3.5 text-emerald-400 animate-spin duration-1000" />
                Seed Coffee Shop Demo Data
              </button>
            )}

            <div className="text-xs font-mono text-white/60 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
              UTC: 2026-06-23
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6" id="main_layout">
        
        {/* FINANCIAL SUMMARY HIGHLIGHTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="stats_panel_row">
          
          {/* Card 1: Revenue */}
          <div className="bg-[#141417] border border-white/10 rounded-2xl p-6 relative shadow-2xl transition-all duration-300 hover:border-white/20" id="stat_income">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Total Income</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-serif text-emerald-400">${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-white/40">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                Live Cloud Ledger
              </div>
            </div>
          </div>

          {/* Card 2: Expense */}
          <div className="bg-[#141417] border border-white/10 rounded-2xl p-6 relative shadow-2xl transition-all duration-300 hover:border-white/20" id="stat_expense">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Total Expenses</span>
              <div className="h-8 w-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-serif text-red-400">${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-white/40">
                <span>Mapped to {categoriesList.length} categories</span>
              </div>
            </div>
          </div>

          {/* Card 3: P&L */}
          <div className="bg-[#141417] border border-white/10 rounded-2xl p-6 relative shadow-2xl transition-all duration-300 hover:border-white/20" id="stat_profit">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Daily Profit / Loss</span>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className={`text-3xl font-serif ${netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {netProfit >= 0 ? "+" : ""}${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <div className="mt-2 text-xs text-white/40">
                <span>P&L Margin: {totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : "0.0"}%</span>
              </div>
            </div>
          </div>

          {/* Card 4: Tax Reserve */}
          <div className="bg-[#141417] border border-white/10 rounded-2xl p-6 relative shadow-2xl transition-all duration-300 hover:border-white/20" id="stat_tax">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Tax Liability Est.</span>
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-serif text-white/90">${estimatedTaxReserve.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <div className="mt-2 text-xs text-white/40 flex items-center gap-1">
                <Info className="h-3 w-3 text-amber-400" />
                <span>Q4 Projection (AI parsing)</span>
              </div>
            </div>
          </div>

        </div>

        {/* CORE APPLICATION SPLIT SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="app_split_grid">
          
          {/* LEFT 5 COLUMNS: AI BOOKKEEPING & INTUITIVE SEARCH */}
          <div className="lg:col-span-5 space-y-6" id="left_interact">
            
            {/* NATURAL LANGUAGE ENTRY BLOCK */}
            <div className="bg-[#141417] border border-white/10 rounded-2xl shadow-2xl overflow-hidden" id="card_bookkeeper">
              
              <div className="bg-white/[0.02] border-b border-white/5 p-4 flex items-center justify-between" id="bk_card_header">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                  <span className="font-serif italic text-lg tracking-tight text-white">Natural Language Entry</span>
                </div>
                <span className="text-[9px] uppercase tracking-[0.1em] text-white/40 font-mono font-medium bg-white/5 px-2 py-0.5 rounded border border-white/10">
                  Gemini-Engine
                </span>
              </div>

              <div className="p-6 space-y-4" id="bk_card_body">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-2">
                    Describe transaction (Written or VOICED)
                  </label>
                  <div className="relative">
                    <textarea
                      value={rawTextInput}
                      onChange={(e) => setRawTextInput(e.target.value)}
                      placeholder='e.g., "Sold 12 bags of Espresso Roast for $180 total" or "Paid electricity bill $120"'
                      className="w-full min-h-[100px] p-4 text-base font-serif italic text-white bg-black/40 border border-white/10 rounded-xl placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 resize-none transition-all duration-250"
                      rows={3}
                      id="txt_transcript"
                    />

                    {/* Microphone Action */}
                    {speechSupported && (
                      <button
                        onClick={toggleRecording}
                        className={`absolute bottom-3.5 right-3.5 h-8 w-8 rounded-lg flex items-center justify-center border transition-all ${
                          isRecording 
                            ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse" 
                            : "bg-white/5 hover:bg-white/10 text-white/60 border-white/10 hover:text-white"
                        }`}
                        title="Dictate Ledger Entry"
                        id="btn_mic_action"
                      >
                        {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {isRecording && (
                  <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-lg flex items-center justify-between" id="voice_recording_row">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                      <p className="text-xs text-red-400 font-medium font-serif italic">Listening to shop speech...</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="h-3 w-0.5 bg-red-400/80 rounded animate-pulse"></span>
                      <span className="h-4.5 w-0.5 bg-red-400 rounded animate-pulse"></span>
                    </div>
                  </div>
                )}

                {/* Submit trigger */}
                <div className="flex items-center justify-between gap-3 pt-1" id="submit_block">
                  <div className="text-[10px] text-white/30 flex items-center gap-1 font-mono">
                    <HelpCircle className="h-3 w-3" />
                     Extracts units & adjusts stock
                  </div>
                  <button
                    onClick={requestAIBookkeepParse}
                    disabled={isParsingAI || !rawTextInput.trim()}
                    className="bg-white text-black hover:bg-emerald-400 transition-colors text-[10px] font-bold px-4 py-2 rounded-lg disabled:opacity-30 disabled:hover:bg-white disabled:cursor-not-allowed uppercase tracking-wider"
                    id="btn_analyze_entry"
                  >
                    {isParsingAI ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Parsing...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Process
                      </span>
                    )}
                  </button>
                </div>

                {parseError && (
                  <div className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs p-3.5 rounded-xl font-mono mt-3" id="parsing_error">
                    {parseError}
                  </div>
                )}

                {/* AI PARSED REVIEW SECTION */}
                <AnimatePresence>
                  {parsedPreview && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-white/[0.02] border border-emerald-500/20 rounded-xl p-4 mt-4 space-y-3"
                      id="ai_review_block"
                    >
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs font-serif italic text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4" />
                          Parsed Ledger Confirmation
                        </span>
                        <button 
                          onClick={() => setParsedPreview(null)}
                          className="text-white/40 hover:text-white/85 transition"
                          id="btn_clear_preview"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3" id="parsed_summary_specs">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Parsed Flow</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded ${
                              parsedPreview.type === 'income' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-red-500/10 text-red-400 border border-red-500/30'
                            }`}>
                              {parsedPreview.type}
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Derived Amount</p>
                          <span className="text-sm font-mono text-emerald-400 font-semibold">${parsedPreview.amount}</span>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Suggested Category</p>
                          <span className="text-xs text-white/90 font-serif italic">{parsedPreview.category || "General"}</span>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Summary</p>
                          <p className="text-xs text-white/60 line-clamp-1">{parsedPreview.description}</p>
                        </div>
                      </div>

                      {/* Items parsed block */}
                      {parsedPreview.items && parsedPreview.items.length > 0 && (
                        <div className="bg-black/30 rounded-lg p-2.5 border border-white/5" id="parsed_items_box">
                          <p className="text-[9px] uppercase font-bold text-white/40 tracking-wider mb-1 font-mono">Parsed Items details</p>
                          <div className="space-y-1">
                            {parsedPreview.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs font-mono text-white/60">
                                <span>• {item.name} × {item.quantity}</span>
                                <span>${Number(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stock levels modification previews */}
                      {parsedPreview.stockUpdates && parsedPreview.stockUpdates.length > 0 && (
                        <div className="p-2.5 bg-orange-500/5 border border-orange-500/20 rounded-lg" id="parsed_stock_box">
                          <p className="text-[9px] uppercase font-bold text-orange-400 tracking-wider mb-1 flex items-center gap-1 font-mono">
                            <Package className="h-3 w-3" />
                            Inventory Level Updates Detected
                          </p>
                          <div className="space-y-1 text-xs font-mono">
                            {parsedPreview.stockUpdates.map((upd, idx) => (
                              <div key={idx} className="flex justify-between items-center text-white/60">
                                <span className="capitalize">{upd.name}</span>
                                <span className={upd.change > 0 ? "text-emerald-400" : "text-orange-400"}>
                                  {upd.change > 0 ? `+${upd.change}` : upd.change} units
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t border-white/5" id="preview_actions_row">
                        <button
                          onClick={confirmAndSaveAILedger}
                          className="flex-1 py-1.5 text-xs font-bold bg-white text-black rounded-lg hover:bg-emerald-400 hover:text-black transition uppercase tracking-wider"
                          id="btn_confirm_ledger"
                        >
                          Confirm & Commit
                        </button>
                        <button
                          onClick={() => setParsedPreview(null)}
                          className="px-3 py-1.5 text-xs text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition"
                          id="btn_discard_preview"
                        >
                          Discard
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>

            {/* EXPENSE CATEGORY SPLIT VISUALIZATION */}
            <div className="bg-[#141417] border border-white/5 rounded-2xl shadow-2xl p-6 space-y-4" id="categories_donut_section">
              <div className="flex items-center justify-between" id="stream_header">
                <span className="text-sm font-serif italic text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-400" />
                  Expense Allocations
                </span>
                <span className="text-[10px] uppercase text-white/40 tracking-wider">Breakdown</span>
              </div>

              {categoriesList.length === 0 ? (
                <div className="py-8 text-center text-xs text-white/30 border border-dashed border-white/10 rounded-xl" id="empty_categories">
                  No expense records to plot.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center" id="categories_plot_row">
                  
                  {/* SVG Custom Donut graph */}
                  <div className="flex justify-center" id="svg_donut_box">
                    <svg width="130" height="130" viewBox="0 0 100 100" className="transform -rotate-90">
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#0E0E10" strokeWidth="11" />
                      {(() => {
                        let totalCircumference = 2 * Math.PI * 38;
                        let accumulatedPercent = 0;
                        const colors = ["#10b981", "#ef4444", "#eab308", "#6366f1", "#a855f7", "#ec4899", "#9ca3af"];
                        
                        return categoriesList.map((cat, idx) => {
                          const valuePercent = cat.value / totalExpenseAllocated;
                          const strokeDasharray = `${valuePercent * totalCircumference} ${totalCircumference}`;
                          const strokeDashoffset = -accumulatedPercent * totalCircumference;
                          accumulatedPercent += valuePercent;

                          const color = colors[idx % colors.length];

                          return (
                            <circle
                              key={idx}
                              cx="50"
                              cy="50"
                              r="38"
                              fill="transparent"
                              stroke={color}
                              strokeWidth={hoveredCategory === cat.name ? "14" : "11"}
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              className="transition-all duration-300 cursor-pointer"
                              onMouseEnter={() => setHoveredCategory(cat.name)}
                              onMouseLeave={() => setHoveredCategory(null)}
                            />
                          );
                        });
                      })()}
                      <circle cx="50" cy="50" r="26" fill="#141417" />
                    </svg>
                  </div>

                  {/* Cat keys and percentages list */}
                  <div className="space-y-2 text-xs" id="donut_categories_list">
                    {categoriesList.map((cat, idx) => {
                      const colors = ["bg-emerald-400", "bg-red-400", "bg-amber-400", "bg-indigo-400", "bg-purple-400", "bg-pink-400", "bg-gray-400"];
                      const percent = ((cat.value / totalExpenseAllocated) * 100).toFixed(0);
                      const color = colors[idx % colors.length];

                      return (
                        <div
                          key={idx}
                          onMouseEnter={() => setHoveredCategory(cat.name)}
                          onMouseLeave={() => setHoveredCategory(null)}
                          className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                            hoveredCategory === cat.name ? "bg-white/[0.04]" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${color}`}></span>
                            <span className="text-white/80 capitalize">{cat.name}</span>
                          </div>
                          <span className="font-mono text-white/40">${cat.value} ({percent}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* FINANCIAL COMPANION CHAT PANEL */}
            <div className="bg-[#141417] border border-white/10 rounded-2xl shadow-2xl overflow-hidden" id="card_chat_advisor">
              
              <div className="bg-white/[0.02] border-b border-white/5 p-4 flex items-center justify-between" id="chat_header">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span className="font-serif italic text-lg tracking-tight text-white">SmartLedger AI Advisor</span>
                </div>
                <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-emerald-400 font-mono font-medium">
                  Realtime Context
                </div>
              </div>

              <div className="p-5" id="chat_body_wrapper">
                {/* Message logs */}
                <div className="h-[210px] overflow-y-auto space-y-3.5 pr-1 text-xs mb-4" id="advisor_chat_scroller">
                  {advisorChatLog.map((chat, i) => (
                    <div
                      key={i}
                      className={`flex ${chat.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          chat.sender === "user"
                            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-br-none"
                            : "bg-white/[0.03] text-white/95 border border-white/10 rounded-bl-none"
                        }`}
                      >
                        {chat.sender === "advisor" ? (
                          renderAdvisorText(chat.text)
                        ) : (
                          <p className="leading-relaxed">{chat.text}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {advisorLoading && (
                    <div className="flex justify-start" id="advisor_loading_bubble">
                      <div className="bg-white/[0.02] rounded-2xl rounded-bl-none px-4 py-3 border border-white/5 text-white/50 flex items-center gap-2">
                        <RefreshCw className="h-3 w-3 animate-spin text-emerald-400" />
                        <span className="font-serif italic">Advisor is studying records...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Predefined prompt suggestion chips */}
                <div className="flex flex-wrap gap-1.5 mb-4" id="suggestion_chips">
                  <button
                    onClick={() => handleAdvisorSuggestedQuery("Warn me about low-stock risks?")}
                    className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 px-2.5 py-1 rounded-md transition font-serif italic"
                    id="chip_warn"
                  >
                    🚀 Warn stock risks
                  </button>
                  <button
                    onClick={() => handleAdvisorSuggestedQuery("Generate detailed weekly P&L Margin report?")}
                    className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 px-2.5 py-1 rounded-md transition font-serif italic"
                    id="chip_pl"
                  >
                    📈 Profit Margin
                  </button>
                  <button
                    onClick={() => handleAdvisorSuggestedQuery("How is my item burn rate, which is depleting fastest?")}
                    className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 px-2.5 py-1 rounded-md transition font-serif italic"
                    id="chip_burn"
                  >
                    🔥 Depletion rate
                  </button>
                </div>

                {/* Query submission box */}
                <div className="flex gap-2" id="advice_submission_row">
                  <input
                    type="text"
                    value={advisorQuery}
                    onChange={(e) => setAdvisorQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && triggerAdvisorRequest()}
                    placeholder="Ask Advisor (e.g. tax estimates margin rate)"
                    className="flex-1 px-3 py-2 text-xs border border-white/10 bg-black/40 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-all"
                    id="txt_advisor_query"
                  />
                  <button
                    onClick={() => triggerAdvisorRequest()}
                    disabled={!advisorQuery.trim() || advisorLoading}
                    className="p-2 text-emerald-400 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 rounded-lg transition shrink-0"
                    id="btn_send_query"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* RIGHT 7 COLUMNS: LEDGER LOGS & PREDICTIVE STOCK SYSTEM */}
          <div className="lg:col-span-7 space-y-6" id="right_interact">
            
            {/* LEDGER ENTRIES LIST VIEW */}
            <div className="bg-[#141417] border border-white/5 rounded-2xl shadow-2xl p-6 space-y-4" id="ledger_list_section">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3" id="ledger_header_row">
                <div>
                  <h3 className="text-sm font-serif italic text-white flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-emerald-400" />
                    Ledger Stream
                  </h3>
                  <p className="text-xs text-white/40">Chronological transaction logs</p>
                </div>

                {/* Filter segments */}
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10" id="filter_buttons_group">
                  <button
                    onClick={() => setFilterType("all")}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                      filterType === "all" ? "bg-white/10 text-white shadow-xs" : "text-white/40 hover:text-white"
                    }`}
                    id="btn_filter_all"
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterType("income")}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                      filterType === "income" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-white/40 hover:text-emerald-400"
                    }`}
                    id="btn_filter_income"
                  >
                    Sales
                  </button>
                  <button
                    onClick={() => setFilterType("expense")}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                      filterType === "expense" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "text-white/40 hover:text-red-400"
                    }`}
                    id="btn_filter_expense"
                  >
                    Bills
                  </button>
                </div>
              </div>

              {/* Live Search */}
              <div id="search_box_container">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by keyword, item name, or category"
                  className="w-full px-3 py-2 border border-white/10 bg-black/40 text-xs text-white placeholder:text-white/20 hover:border-white/20 focus:outline-none focus:border-emerald-500/50 rounded-lg transition-all"
                  id="search_ledger_field"
                />
              </div>

              {/* Interactive SVG Chart for timelines */}
              {entries.length > 0 && (
                <div className="bg-black/30 p-4 border border-white/5 rounded-xl" id="svg_chart_timeline_box">
                  <div className="flex justify-between items-center mb-2" id="chart_data_summary">
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Financial Wealth Accumulation Timeline</span>
                    <span className="text-[9px] font-mono text-white/30 font-medium">Hover nodes to reveal balances</span>
                  </div>

                  {(() => {
                    // Chronologically analyze cumulative remaining cache balance
                    const chronological = [...entries].reverse();
                    let currentLevel = 0;
                    const steps = chronological.map((e) => {
                      if (e.type === "income") {
                        currentLevel += e.amount;
                      } else {
                        currentLevel -= e.amount;
                      }
                      return {
                        timestamp: e.timestamp,
                        balance: currentLevel,
                        desc: e.description
                      };
                    });

                    const balances = steps.map((s) => s.balance);
                    const maxB = Math.max(...balances, 100);
                    const minB = Math.min(...balances, -100);
                    const range = maxB - minB || 1;

                    // Plot variables
                    const width = 500;
                    const height = 110;
                    const padding = 15;

                    const points = steps.map((step, idx) => {
                      const spacingFactor = steps.length > 1 ? steps.length - 1 : 1;
                      const x = padding + (idx / spacingFactor) * (width - 2 * padding);
                      const y = height - padding - ((step.balance - minB) / range) * (height - 2 * padding);
                      return { x, y, balance: step.balance, timestamp: step.timestamp, desc: step.desc };
                    });

                    let dPath = "";
                    if (points.length > 1) {
                      dPath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
                    } else if (points.length === 1) {
                      dPath = `M ${padding} ${height/2} L ${width - padding} ${height/2}`;
                    }

                    return (
                      <div className="relative" id="timeline_svg_container">
                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
                          
                          {/* Grid line representation of baseline zero */}
                          {minB < 0 && maxB > 0 && (() => {
                            const zeroY = height - padding - ((0 - minB) / range) * (height - 2 * padding);
                            return (
                              <line
                                x1={padding}
                                y1={zeroY}
                                x2={width - padding}
                                y2={zeroY}
                                stroke="rgba(255, 255, 255, 0.1)"
                                strokeDasharray="3,3"
                                strokeWidth="1"
                              />
                            );
                          })()}

                          {/* Smooth area filled path gradient background if multiple coordinates exist */}
                          {points.length > 1 && (
                            <path
                              d={`${dPath} L ${points[points.length-1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`}
                              fill="url(#area_grad)"
                              opacity="0.1"
                            />
                          )}

                          {/* Line stroke representing balance path trend */}
                          <path
                            d={dPath}
                            fill="transparent"
                            stroke="#10b981"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Node markers */}
                          {points.map((p, idx) => (
                            <g key={idx}>
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={hoveredChartPoint === idx ? "5" : "3"}
                                fill={hoveredChartPoint === idx ? "#10b981" : "#141417"}
                                stroke="#10b981"
                                strokeWidth={hoveredChartPoint === idx ? "2" : "1.5"}
                                className="cursor-pointer transition-all"
                                onMouseEnter={() => setHoveredChartPoint(idx)}
                                onMouseLeave={() => setHoveredChartPoint(null)}
                              />
                            </g>
                          ))}

                          <defs>
                            <linearGradient id="area_grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                        </svg>

                        {/* Interactive Float Popup box on hover */}
                        {hoveredChartPoint !== null && points[hoveredChartPoint] && (
                          <div className="absolute top-1 left-1.5 bg-[#1E1E22] text-white rounded-lg p-2.5 shadow-xl text-[9px] space-y-0.5 pointer-events-none border border-white/10 z-10" id="timeline_hover_box">
                            <p className="font-mono font-bold text-emerald-400">Balance: ${points[hoveredChartPoint].balance.toFixed(2)}</p>
                            <p className="text-white/80 font-medium">Event: {points[hoveredChartPoint].desc}</p>
                            <p className="text-white/40 font-mono text-[8px]">{new Date(points[hoveredChartPoint].timestamp).toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Chronological Table List */}
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1" id="ledger_scroller_board">
                {loadingDb ? (
                  <div className="py-12 text-center text-xs text-white/40" id="ledger_db_connecting">
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-emerald-400" />
                    Connecting live ledger database...
                  </div>
                ) : filteredEntries.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-white/10 rounded-xl" id="ledger_empty_slate">
                    <HelpCircle className="h-6 w-6 text-white/20 mx-auto mb-2" />
                    <p className="text-xs font-serif italic text-white/60">No automated ledger records matching filters</p>
                    <p className="text-[10px] text-white/30 mt-1 font-mono">Process new entry to generate real-time metrics.</p>
                  </div>
                ) : (
                  filteredEntries.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#0A0A0B]/60 border border-white/5 hover:border-white/15 rounded-xl p-3.5 flex items-start justify-between gap-3 transition duration-150"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center border ${
                          item.type === "income" 
                            ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/10" 
                            : "bg-red-500/5 text-red-400 border-red-500/10"
                        }`}>
                          {item.type === "income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium font-serif italic text-white/95">{item.description}</span>
                            <span className="text-[8px] font-bold font-mono uppercase bg-white/5 text-white/60 border border-white/10 px-1.5 py-0.5 rounded">
                              {item.category || "General"}
                            </span>
                          </div>
                          
                          {/* Parsed sub-items count details pills */}
                          {item.items && item.items.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2 font-mono" id="item_detail_pills">
                              {item.items.map((sub, sidx) => (
                                <span key={sidx} className="text-[9px] text-white/50 bg-white/[0.02] border border-white/5 px-2 py-0.5 rounded">
                                  {sub.name} ({sub.quantity} × ${sub.price})
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="mt-1.5 flex items-center gap-2 text-[9px] text-white/30 font-mono">
                            <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="truncate max-w-[200px]" title={item.rawText}>AI Input: "{item.rawText}"</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" id="action_button_logs">
                        <span className={`text-xs font-mono font-bold ${
                          item.type === "income" ? "text-emerald-400" : "text-white/60"
                        }`}>
                          {item.type === "income" ? "+" : "-"}${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <button
                          onClick={() => deleteBookkeepingEntry(item.id)}
                          className="text-white/20 hover:text-red-400 transition p-1 rounded-md hover:bg-white/5"
                          title="Strike entry from ledger"
                          id={`btn_delete_entry_${item.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* PREDICTIVE STOCK DEPLETION DECK */}
            <div className="bg-[#141417] border border-white/5 rounded-2xl shadow-2xl p-6 space-y-4" id="inventory_alerts_section">
              
              <div className="flex items-center justify-between border-b border-white/5 pb-3.5" id="stock_header_row">
                <div>
                  <h3 className="text-sm font-serif italic text-white flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-emerald-400" />
                    Predictive Stock Health
                  </h3>
                  <p className="text-xs text-white/40">Autonomous burn rate & depletion calculations based on sales</p>
                </div>

                <button
                  onClick={() => setShowAddStockForm(!showAddStockForm)}
                  className="flex items-center gap-1 text-[10px] bg-white hover:bg-emerald-400 text-black px-3.5 py-1.5 rounded-lg transition font-extrabold uppercase tracking-wider"
                  id="btn_toggle_stock_form"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </button>
              </div>

              {/* Manual insertion collapse form */}
              <AnimatePresence>
                {showAddStockForm && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={submitManualStockItem}
                    className="p-5 bg-black/40 border border-white/10 rounded-xl space-y-3.5 text-xs"
                    id="frm_add_stock_collapse"
                  >
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-white/40 tracking-wider mb-1">Item Name</label>
                        <input
                          type="text"
                          required
                          value={manualStockName}
                          onChange={(e) => setManualStockName(e.target.value)}
                          placeholder="e.g. coffee bags"
                          className="w-full px-2.5 py-1.5 border border-white/10 rounded-lg focus:outline-none focus:border-emerald-500/50 bg-black/50 text-white transition animate-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-white/40 tracking-wider mb-1">Starting Stock Qty</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={manualStockQty}
                          onChange={(e) => setManualStockQty(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 border border-white/10 rounded-lg bg-black/50 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-white/40 tracking-wider mb-1">Low-Limit Threshold</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={manualStockMin}
                          onChange={(e) => setManualStockMin(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 border border-white/10 rounded-lg bg-black/50 text-white"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-1 font-mono">
                      <button
                        type="button"
                        onClick={() => setShowAddStockForm(false)}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded font-medium text-[10px]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1 bg-white text-black rounded hover:bg-emerald-400 font-bold text-[10px] uppercase tracking-wider transition-colors duration-150"
                      >
                        Save Inventory Stream
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Stock Items Deck Grid list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="stock_records_grid">
                {stockItems.length === 0 ? (
                  <div className="col-span-2 py-8 text-center text-xs text-white/30 border border-dashed border-white/10 rounded-xl" id="empty_stock_grid">
                    No warehouse inventory tracked. Use the natural bookkeeping language to spawn entries, or register items manually!
                  </div>
                ) : (
                  stockItems.map((item) => {
                    // Calculate depletion rate: days remaining
                    // If burn rate is zero, days remaining is infinite
                    const burn = item.burnRate || 0.1;
                    const daysRemaining = item.currentStock / burn;
                    const isLow = item.currentStock <= item.minStockAlert;
                    const isOutOfStock = item.currentStock <= 0;

                    const percentStock = Math.min(100, (item.currentStock / (item.minStockAlert * 3)) * 100);

                    return (
                      <div
                        key={item.id}
                        className={`border rounded-xl p-4 space-y-3 transition group relative ${
                          isOutOfStock 
                            ? "border-red-500/20 bg-red-500/5" 
                            : isLow 
                              ? "border-orange-500/20 bg-orange-500/5" 
                              : "border-white/5 bg-black/40 hover:border-white/10"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="font-display font-medium font-serif italic text-sm text-white/90 capitalize block">{item.name}</span>
                            <span className="text-[10px] text-white/30 font-mono">Burn: {burn.toFixed(1)} units/day</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isOutOfStock ? (
                              <span className="text-[8px] tracking-wider font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-mono">
                                OUT OF STOCK
                              </span>
                            ) : isLow ? (
                              <span className="text-[8px] tracking-wider font-bold uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full flex items-center gap-0.5 animate-pulse font-mono">
                                <AlertTriangle className="h-2 w-2" />
                                LOW STOCK
                              </span>
                            ) : (
                              <span className="text-[8px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                                HEALTHY
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Inventory progress meter */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-white/40 font-mono">
                            <span>Qty: <strong className="text-white font-medium">{item.currentStock}</strong> <span className="text-white/25">(limit: {item.minStockAlert})</span></span>
                            <span>{percentStock.toFixed(0)}% optimal</span>
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                isOutOfStock 
                                  ? "bg-red-500" 
                                  : isLow 
                                    ? "bg-orange-400" 
                                    : "bg-emerald-400"
                              }`} 
                              style={{ width: `${percentStock}%` }}
                            />
                          </div>
                        </div>

                        {/* Predictive depletion alerts clock */}
                        <div className="bg-black/30 border border-white/5 p-2 rounded-lg text-[10px] flex items-center justify-between font-mono animate-none" id="prediction_results_box">
                          <span className="text-white/30">Run-out Prediction:</span>
                          <span className={`font-semibold ${
                            isOutOfStock 
                              ? "text-red-400 font-bold" 
                              : daysRemaining <= 3 
                                ? "text-orange-400 font-bold animate-pulse" 
                                : "text-emerald-400"
                          }`}>
                            {isOutOfStock 
                              ? "Critical Deficit" 
                              : daysRemaining > 100 
                                ? "Stable Supply" 
                                : `${daysRemaining.toFixed(1)} Days left`}
                          </span>
                        </div>

                        {/* Manual mini increment control tags */}
                        <div className="flex justify-between items-center pt-1" id="increment_stock_row">
                          <button
                            onClick={() => deleteStockItem(item.id)}
                            className="text-white/20 hover:text-red-400 transition"
                            title="Remove completely from inventory logs"
                            id={`btn_delete_stock_${item.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>

                          <div className="flex items-center gap-1 text-[9px] font-mono" id="step_counters">
                            <button
                              onClick={() => adjustStockValue(item, -5)}
                              className="px-1.5 py-0.5 bg-white/5 hover:bg-white/15 text-white/70 border border-white/5 hover:text-white rounded transition"
                              title="Decrement 5"
                            >
                              -5
                            </button>
                            <button
                              onClick={() => adjustStockValue(item, -1)}
                              className="px-1.5 py-0.5 bg-white/5 hover:bg-white/15 text-white/70 border border-white/5 hover:text-white rounded transition"
                              title="Decrement 1"
                            >
                              -1
                            </button>
                            <button
                              onClick={() => adjustStockValue(item, 1)}
                              className="px-1.5 py-0.5 bg-white/5 hover:bg-white/15 text-white/70 border border-white/5 hover:text-white rounded transition"
                              title="Increment 1"
                            >
                              +1
                            </button>
                            <button
                              onClick={() => adjustStockValue(item, 10)}
                              className="px-1.5 py-0.5 bg-white/5 hover:bg-white/15 text-white/70 border border-white/5 hover:text-white rounded transition"
                              title="Increment 10"
                            >
                              +10
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

            </div>

          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-[#0E0E10] py-8 mt-16 text-center text-xs text-white/30" id="footer_section">
        <p className="font-serif italic text-white/50 text-sm">Automating manuals. Directing insights.</p>
        <p className="mt-2 text-white/20 font-mono text-[9px]">© 2026 SmartLedger AI • Powered securely via Server-Side Gemini 3.5 & Secure Firebase Firestore.</p>
        <p className="mt-0.5 text-white/15 font-mono text-[8px]">Version 1.2.0 • Offline-first responsive client container</p>
      </footer>

    </div>
  );
}
