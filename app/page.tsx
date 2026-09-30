'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mkjxgezzjvccyhkhswwi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ranhnZXp6anZjY3loa2hzd3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NTEzNzYsImV4cCI6MjEwNjMyNzM3Nn0.Mjx6e738rPccX2biBQwVi_PikHi4eydEy_64MbiiDHU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [products, setProducts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<any>(null);

  const [pName, setPName] = useState('');
  const [pStock, setPStock] = useState('');
  const [pBuyPrice, setPBuyPrice] = useState('');
  const [pSellPrice, setPSellPrice] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [sellQty, setSellQty] = useState<number>(1);

  const fetchData = async () => {
    try {
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: false });

      if (prodErr) console.error('Products Error:', prodErr);
      if (prodData) setProducts(prodData);

      const { data: invData, error: invErr } = await supabase
        .from('invoices')
        .select('*')
        .order('id', { ascending: false });

      if (invErr) console.error('Invoices Error:', invErr);
      if (invData) setInvoices(invData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('products').insert([
      { 
        name: pName, 
        category: 'Solar Equipment', 
        stockQty: Number(pStock), 
        buyPrice: Number(pBuyPrice), 
        sellPrice: Number(pSellPrice) 
      }
    ]);

    if (error) {
      alert('Error adding product: ' + error.message);
      return;
    }

    setPName(''); 
    setPStock(''); 
    setPBuyPrice(''); 
    setPSellPrice('');
    fetchData();
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = Number(selectedProductId);
    const prod = products.find((p) => Number(p.id) === targetId);

    if (!prod) return alert('Please select a valid product');
    if (prod.stockQty < sellQty) return alert('Insufficient stock available!');

    const totalBill = sellQty * Number(prod.sellPrice);

    const { data: insertedInv, error: invErr } = await supabase.from('invoices').insert([
      {
        customerName: `${customerName}${customerPhone ? ' (' + customerPhone + ')' : ''}`,
        totalAmount: totalBill,
        paidAmount: totalBill
      }
    ]).select();

    if (invErr) return alert('Invoice Error: ' + invErr.message);

    const newQty = prod.stockQty - sellQty;
    await supabase.from('products').update({ stockQty: newQty }).eq('id', targetId);

    setCustomerName('');
    setCustomerPhone('');
    setSelectedProductId('');
    setSellQty(1);
    fetchData();
  };

  const handlePrintReceipt = (inv: any) => {
    setSelectedInvoiceForPrint(inv);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleDownloadPDF = async (inv: any) => {
    setSelectedInvoiceForPrint(inv);
    
    const html2pdf = (await import('html2pdf.js')).default;
    
    setTimeout(() => {
      const element = document.getElementById('printable-receipt');
      if (!element) return;

      const options = {
        margin:       10,
        filename:     `Skyways-Invoice-${inv.id}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      html2pdf().from(element).set(options).save().then(() => {
        setSelectedInvoiceForPrint(null);
      });
    }, 250);
  };

  const sendWhatsAppReceipt = (inv: any) => {
    const custName = inv.customerName || 'Valued Customer';
    const amount = Number(inv.totalAmount).toLocaleString();
    
    const messageText = 
`*Skyways Solar Energy - Official Receipt* ☀️

Dear *${custName}*,
Thank you for choosing Skyways Solar Energy! Here are your invoice details:

📄 *Invoice ID:* #INV-${inv.id}
💰 *Total Amount:* PKR ${amount}
✅ *Status:* Paid / Complete

For any queries or solar installation support, feel free to contact us.
_Skyways Solar Energy_`;

    let cleanPhone = (customerPhone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '92' + cleanPhone.substring(1);
    }

    const encodedMsg = encodeURIComponent(messageText);
    const whatsappUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
      : `https://wa.me/?text=${encodedMsg}`;

    window.open(whatsappUrl, '_blank');
  };

  const totalSalesRevenue = invoices.reduce((acc, inv) => acc + Number(inv.totalAmount || 0), 0);
  const totalCostOfGoodsSold = invoices.reduce((acc, inv) => acc + Number(inv.totalAmount || 0) * 0.7, 0);
  const netProfit = totalSalesRevenue - totalCostOfGoodsSold;
  const totalItemsInStock = products.reduce((acc, p) => acc + Number(p.stockQty || 0), 0);

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 24px;
            display: block !important;
          }
        }
      `}</style>

      {/* PRINTABLE / PDF RECEIPT TEMPLATE WITH PLAIN HEX STYLING */}
      {selectedInvoiceForPrint && (
        <div 
          id="printable-receipt" 
          style={{ background: '#ffffff', color: '#1e293b', padding: '32px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', border: '1px solid #cbd5e1', borderRadius: '8px' }}
        >
          <div style={{ textAlign: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
            <img 
              src="/logo.png" 
              alt="Skyways Solar Energy" 
              style={{ height: '70px', width: 'auto', margin: '0 auto 8px auto', objectFit: 'contain' }} 
            />
            <h1 style={{ fontSize: '22px', fontWeight: '900', color: '#d97706', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Skyways Solar Energy</h1>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0' }}>Solar Panels, Inverters & Complete Systems</p>
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Official Sales Invoice / Cash Memo</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#334155', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <div>
              <p style={{ margin: '0 0 4px 0' }}><strong>Invoice No:</strong> #INV-{selectedInvoiceForPrint.id}</p>
              <p style={{ margin: '0' }}><strong>Customer:</strong> {selectedInvoiceForPrint.customerName || 'Walk-in Customer'}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 4px 0' }}><strong>Date:</strong> {new Date(selectedInvoiceForPrint.created_at || Date.now()).toLocaleDateString()}</p>
              <p style={{ margin: '0' }}><strong>Status:</strong> <span style={{ color: '#059669', fontWeight: 'bold' }}>PAID</span></p>
            </div>
          </div>

          <table style={{ width: '100%', textAlign: 'left', fontSize: '12px', marginBottom: '16px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: '8px', fontWeight: 'bold' }}>Description</th>
                <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Amount (PKR)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px' }}>Solar Equipment / Purchase Order</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>PKR {Number(selectedInvoiceForPrint.totalAmount).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', fontWeight: '900' }}>
            <span>Total Amount Paid:</span>
            <span style={{ color: '#d97706', fontSize: '16px' }}>PKR {Number(selectedInvoiceForPrint.totalAmount).toLocaleString()}</span>
          </div>

          <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '10px', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <p style={{ margin: '0 0 2px 0' }}>Thank you for doing business with <strong>Skyways Solar Energy</strong>!</p>
            <p style={{ margin: '0' }}>Quality Solar Products & Professional Installation</p>
          </div>
        </div>
      )}

      {/* DASHBOARD UI */}
      <main className="min-h-screen bg-[#0B0F17] text-slate-100 p-4 md:p-8 font-sans print:hidden">
        
        <header className="max-w-7xl mx-auto mb-8 bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-950/90 border border-amber-500/30 p-1.5 flex items-center justify-center shadow-lg shadow-amber-500/10 overflow-hidden">
              <img 
                src="/logo.png" 
                alt="Skyways Solar Energy Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Skyways Solar <span className="text-amber-400">Energy</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Enterprise ERP & Inventory Portal
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 w-full lg:w-auto">
            {[
              { id: 'inventory', label: '📦 Inventory' },
              { id: 'sales', label: '🧾 Sales & Invoices' },
              { id: 'analytics', label: '📊 Profit Analytics' },
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={activeTab === tab.id 
                  ? 'px-5 py-2.5 rounded-lg font-bold text-xs md:text-sm transition-all bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25' 
                  : 'px-5 py-2.5 rounded-lg font-semibold text-xs md:text-sm transition-all text-slate-400 hover:text-white hover:bg-slate-800/60'}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sales</span>
              <p className="text-2xl font-black text-amber-400 mt-2">PKR {totalSalesRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Invoices Generated</span>
              <p className="text-2xl font-black text-white mt-2">{invoices.length} Orders</p>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Products in Stock</span>
              <p className="text-2xl font-black text-blue-400 mt-2">{totalItemsInStock} Units</p>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Profit</span>
              <p className={netProfit >= 0 ? "text-2xl font-black text-emerald-400 mt-2" : "text-2xl font-black text-rose-500 mt-2"}>
                PKR {netProfit.toLocaleString()}
              </p>
            </div>
          </div>

          {activeTab === 'inventory' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl shadow-xl h-fit">
                <h2 className="text-lg font-bold text-amber-400 mb-1 flex items-center gap-2">
                  <span>➕</span> Add New Solar Product
                </h2>
                <p className="text-xs text-slate-400 mb-6">Enter equipment details to save in Supabase</p>

                <form onSubmit={handleAddProduct} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Product Name</label>
                    <input type="text" placeholder="e.g. Solis Inverter 10kW" value={pName} onChange={(e) => setPName(e.target.value)} required className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-amber-500 focus:outline-none transition" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Stock Quantity</label>
                    <input type="number" min="1" placeholder="Quantity Available" value={pStock} onChange={(e) => setPStock(e.target.value)} required className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-amber-500 focus:outline-none transition" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Purchase Rate (PKR)</label>
                    <input type="number" step="0.01" placeholder="Cost price per unit" value={pBuyPrice} onChange={(e) => setPBuyPrice(e.target.value)} required className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-amber-500 focus:outline-none transition" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Selling Rate (PKR)</label>
                    <input type="number" step="0.01" placeholder="Sale price per unit" value={pSellPrice} onChange={(e) => setPSellPrice(e.target.value)} required className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-amber-500 focus:outline-none transition" />
                  </div>
                  <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold p-3.5 rounded-xl transition shadow-lg shadow-amber-500/20 text-sm mt-2">
                    Save Product to Inventory
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-white">Live Stock Inventory</h2>
                    <p className="text-xs text-slate-400">Products stored in Supabase Cloud</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {products.length} Items Total
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] tracking-wider font-bold">
                      <tr>
                        <th className="p-3.5 rounded-l-xl">Product</th>
                        <th className="p-3.5">Stock</th>
                        <th className="p-3.5">Purchase Rate</th>
                        <th className="p-3.5">Sell Rate</th>
                        <th className="p-3.5 rounded-r-xl">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {products.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-500">No solar items added in database yet.</td></tr>
                      ) : (
                        products.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-800/40 transition">
                            <td className="p-3.5 font-semibold text-white">{item.name}</td>
                            <td className="p-3.5 font-bold text-amber-400">{item.stockQty} Units</td>
                            <td className="p-3.5 text-slate-400">PKR {Number(item.buyPrice).toLocaleString()}</td>
                            <td className="p-3.5 text-emerald-400 font-bold">PKR {Number(item.sellPrice).toLocaleString()}</td>
                            <td className="p-3.5">
                              {item.stockQty > 0 ? (
                                <span className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">In Stock</span>
                              ) : (
                                <span className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">Out of Stock</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sales' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl shadow-xl h-fit">
                <h2 className="text-lg font-bold text-amber-400 mb-1 flex items-center gap-2">
                  <span>🛍️</span> Create Sales Invoice
                </h2>
                <p className="text-xs text-slate-400 mb-6">Record sale & automatically update inventory</p>

                <form onSubmit={handleCreateInvoice} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Customer Name</label>
                    <input type="text" placeholder="Client Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-amber-500 focus:outline-none transition" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">WhatsApp / Phone</label>
                    <input type="text" placeholder="e.g. 03001234567" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-amber-500 focus:outline-none transition" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Select Product</label>
                    <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} required className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-amber-500 focus:outline-none transition">
                      <option value="">-- Choose Stock Item --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.stockQty <= 0}>
                          {p.name} (Qty: {p.stockQty}) - PKR {p.sellPrice}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Quantity Sold</label>
                    <input type="number" min="1" value={sellQty} onChange={(e) => setSellQty(Number(e.target.value))} required className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-amber-500 focus:outline-none transition" />
                  </div>

                  <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold p-3.5 rounded-xl transition shadow-lg shadow-amber-500/20 text-sm">
                    Confirm Sale & Post
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl shadow-xl">
                <h2 className="text-lg font-bold text-white mb-6">Recent Sales Invoices</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] tracking-wider font-bold">
                      <tr>
                        <th className="p-3.5 rounded-l-xl">Invoice ID</th>
                        <th className="p-3.5">Customer</th>
                        <th className="p-3.5">Total Bill</th>
                        <th className="p-3.5 rounded-r-xl text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {invoices.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-500">No invoices generated yet.</td></tr>
                      ) : (
                        invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                            <td className="p-3.5 font-bold text-amber-400">#INV-{inv.id}</td>
                            <td className="p-3.5 text-slate-200">{inv.customerName || 'Walk-in Customer'}</td>
                            <td className="p-3.5 font-extrabold text-emerald-400">PKR {Number(inv.totalAmount).toLocaleString()}</td>
                            <td className="p-3.5 flex justify-center gap-2 flex-wrap">
                              <button onClick={() => handleDownloadPDF(inv)} className="px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition flex items-center gap-1 shadow">
                                📥 PDF
                              </button>
                              <button onClick={() => handlePrintReceipt(inv)} className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-bold rounded-lg transition flex items-center gap-1">
                                🖨️ Print
                              </button>
                              <button onClick={() => sendWhatsAppReceipt(inv)} className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition flex items-center gap-1 shadow-md shadow-emerald-600/20">
                                💬 WhatsApp
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Sales Revenue</span>
                <p className="text-3xl font-extrabold text-amber-400 mt-2">PKR {totalSalesRevenue.toLocaleString()}</p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimated Cost (COGS)</span>
                <p className="text-3xl font-extrabold text-blue-400 mt-2">PKR {totalCostOfGoodsSold.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-amber-500/10 to-emerald-500/10 border border-amber-500/30 p-6 rounded-2xl">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Net Profit</span>
                <p className={netProfit >= 0 ? "text-3xl font-black text-emerald-400 mt-2" : "text-3xl font-black text-rose-500 mt-2"}>
                  PKR {netProfit.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}