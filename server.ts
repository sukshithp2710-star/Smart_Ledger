import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Endpoint 1: Bookkeeping Text Parser
app.post("/api/bookkeep", async (req, res) => {
  try {
    const { text, existingStockNames } = req.body;
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Missing transcript or text input" });
      return;
    }

    const stockListStr = Array.isArray(existingStockNames) && existingStockNames.length > 0
      ? `Here is the list of currently tracked stock item names in the warehouse: ${existingStockNames.join(", ")}. If the text implies a transaction relating to any of these, try to match and update them.`
      : "No stock items are currently registered. If the text mentions buying or selling discrete items, parse them anyway so the user can register them.";

    const prompt = `
You are the ledger clerk engine for SmartLedger AI.
Your job is to parse a raw bookkeeping description written or spoken by a shop owner, extract the financial details, and recognize inventory changes.

Text to parse: "${text}"

${stockListStr}

Respond with a clean, fully filled JSON object matching the requested schema. Ensure the keys and values are strictly conforming:
1. "type": must be exactly "income" or "expense".
2. "amount": total amount of the transaction as a positive float/integer (e.g. 45.0).
3. "category": a standard category string, e.g. "Sales", "Utilities", "Rent", "Inventory", "Payroll", "Supplies", "Marketing", "Other".
4. "description": a concise, beautifully summarized human-friendly single line description of the event.
5. "items": an array representing discrete physical items mentioned. Each item must have:
   - "name": lowercase singular clean name of the item (e.g. "coffee bag" or "mug")
   - "quantity": integer quantity
   - "price": average price per single unit
6. "stockUpdates": an array of inventory operations resulting from this transaction.
   - For an "income" (e.g. "sold 3 bags of coffee"), stock has been depleted, so the change must be NEGATIVE (e.g. -3).
   - For an "expense" that represents restock or purchasing inventory (e.g. "bought 10 milk cartons for 30 dollars"), the change must be POSITIVE (e.g. 10).
   - If the transaction is a general bill (like rent, electricity) or does not involve physical stocked items, leave "stockUpdates" empty.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: {
              type: Type.STRING,
              description: "Must be 'income' or 'expense'.",
            },
            amount: {
              type: Type.NUMBER,
              description: "Total positive numeric monetary value.",
            },
            category: {
              type: Type.STRING,
              description: "Standard financial category names.",
            },
            description: {
              type: Type.STRING,
              description: "Elegant summary of the event.",
            },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  price: { type: Type.NUMBER },
                },
                required: ["name", "quantity", "price"],
              },
            },
            stockUpdates: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Normalized inventory item name matched with existing stock." },
                  change: { type: Type.NUMBER, description: "Change magnitude. Negative if items sold, positive if restocked." },
                },
                required: ["name", "change"],
              },
            },
          },
          required: ["type", "amount", "category", "description", "items", "stockUpdates"],
        },
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error in /api/bookkeep:", error);
    res.status(500).json({ error: error.message || "Failed to process bookkeeping entry" });
  }
});

// Endpoint 2: Predictive Stock Analytics & Financial Advisor
app.post("/api/ask-advisor", async (req, res) => {
  try {
    const { query, transactions, stockItems } = req.body;

    const dataContext = `
Active Ledger State Context:
- Current Transactions: ${JSON.stringify(transactions || [])}
- Warehouse Stock Levels & Burn Rates: ${JSON.stringify(stockItems || [])}
`;

    const instructions = `
You are SmartLedger Companion, a high-level business analyst and financial advisor for a small retail shop.
Using the provided ledger state context, formulate a helpful, direct, and insightful response to the user's inquiry.
Adhere strictly to these principles:
1. Be directly action-focused. Provide concrete tips like 'You are depleting inventory for coffee at 3 units/day, which will empty your stock in 2 days. Restock now!'
2. Calculate simple financial KPI estimates if appropriate (Profit/Loss, Burn Rate, or Tax obligations).
3. Do not larp as system code, do not output debug lines or code variables. Write like a warm, supportive, and business-savvy partner.
4. Format your answer using structured markdown paragraphs and bullet points, but keep it highly readable and dense with insights. No fluff.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { text: instructions },
        { text: dataContext },
        { text: `User request: "${query || "Give me a general financial health checkup based on my metrics."}"` }
      ],
    });

    res.json({ response: response.text });
  } catch (error: any) {
    console.error("Error in /api/ask-advisor:", error);
    res.status(500).json({ error: error.message || "Advisor advice unavailable" });
  }
});

// Setup Vite & Static Assets serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SmartLedger AI server running on port ${PORT}`);
  });
}

startServer();
