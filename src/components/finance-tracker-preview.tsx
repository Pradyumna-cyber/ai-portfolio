"use client";

import { BarChart3, CreditCard, Plus, ReceiptText, Sparkles } from "lucide-react";
import { useState } from "react";

const views = [
  { id: "expense", label: "Add expense", icon: Plus, title: "Capture an expense in seconds" },
  { id: "cycle", label: "Monthly cycle", icon: BarChart3, title: "See where the month is going" },
  { id: "history", label: "Transactions", icon: ReceiptText, title: "Review every transaction" },
] as const;

export function FinanceTrackerPreview() {
  const [view, setView] = useState<(typeof views)[number]["id"]>("expense");
  return (
    <section className="product-preview" aria-label="Illustrative AI Finance Tracker walkthrough">
      <div className="product-preview-copy">
        <p className="eyebrow">Product walkthrough</p>
        <h2 className="section-title">A finance workflow, made easier to understand.</h2>
        <p>This interactive prototype illustrates the core experience. Replace it with production screenshots or a recorded demo when the app is ready.</p>
        <div className="preview-tabs">
          {views.map((item) => <button type="button" key={item.id} onClick={() => setView(item.id)} className={view === item.id ? "active" : ""}><item.icon size={15} /> {item.label}</button>)}
        </div>
      </div>
      <div className="finance-screen" key={view}>
        <div className="finance-topbar"><span>Finly</span><span>July 2026</span></div>
        {view === "expense" ? <ExpenseScreen /> : null}
        {view === "cycle" ? <CycleScreen /> : null}
        {view === "history" ? <HistoryScreen /> : null}
      </div>
    </section>
  );
}

function ExpenseScreen() { return <div className="screen-content screen-enter"><p className="screen-kicker">NEW EXPENSE</p><h3>What did you spend?</h3><div className="amount-field">₹ <strong>1,240</strong></div><div className="category-row"><span><CreditCard size={15} /> Groceries</span><span>Today</span></div><div className="ai-insight"><Sparkles size={15} /> AI categorized this as groceries. Your food budget has ₹3,860 left.</div><button className="screen-button">Save expense</button></div> }
function CycleScreen() { return <div className="screen-content screen-enter"><p className="screen-kicker">JULY OVERVIEW</p><h3>₹18,640 <span>spent</span></h3><div className="chart"><i style={{ height: "54%" }} /><i style={{ height: "78%" }} /><i style={{ height: "43%" }} /><i style={{ height: "90%" }} /><i style={{ height: "64%" }} /><i style={{ height: "34%" }} /></div><div className="cycle-stats"><span><b>₹6,420</b> Food</span><span><b>₹4,800</b> Bills</span><span><b>₹3,240</b> Travel</span></div><div className="ai-insight"><Sparkles size={15} /> Spending is on track. Food is 12% lower than last month.</div></div> }
function HistoryScreen() { const items = [["FreshMart", "Groceries", "₹1,240"], ["Metro", "Travel", "₹80"], ["Streamline", "Subscriptions", "₹299"]]; return <div className="screen-content screen-enter"><p className="screen-kicker">RECENT TRANSACTIONS</p><h3>Transaction history</h3><div className="transaction-list">{items.map(([name, type, amount]) => <div key={name}><span className="transaction-icon"><ReceiptText size={15} /></span><p><b>{name}</b><small>{type} · Today</small></p><strong>{amount}</strong></div>)}</div><div className="ai-insight"><Sparkles size={15} /> Three transactions were automatically categorized.</div></div> }
