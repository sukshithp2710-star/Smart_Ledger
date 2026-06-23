export interface ParsedItem {
  name: string;
  quantity: number;
  price: number;
}

export interface StockUpdate {
  name: string;
  change: number;
}

export interface BookkeepingEntry {
  id: string;
  timestamp: string;
  rawText: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  items?: ParsedItem[];
}

export interface StockItem {
  id: string;
  name: string;
  currentStock: number;
  minStockAlert: number;
  burnRate: number; // units depleted per day
  lastUpdated: string;
}
