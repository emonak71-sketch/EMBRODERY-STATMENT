
import React, { useState } from 'react';
import { Package, Plus, Search, Tag } from 'lucide-react';
import { Product } from '../types';

interface InventoryProps {
  products: Product[];
  onAddProduct: (p: Omit<Product, 'id'>) => Promise<void>;
}

const Inventory: React.FC<InventoryProps> = ({ products, onAddProduct }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Omit<Product, 'id'>>({
    name: '',
    sku: '',
    buying_price: 0,
    selling_price: 0,
    stock: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddProduct(form);
    setForm({ name: '', sku: '', buying_price: 0, selling_price: 0, stock: 0 });
    setShowAdd(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-700">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Inventory</h1>
          <p className="text-sm text-slate-500 font-bold mt-1 uppercase tracking-widest">Stock management & prices</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-primary-600 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 active:scale-95">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-500">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Product Name</label>
            <input required className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border-none outline-none focus:ring-2 ring-primary-500 text-sm font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">SKU/Code</label>
            <input className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border-none outline-none focus:ring-2 ring-primary-500 text-sm font-bold" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Buying Price</label>
            <input type="number" required className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border-none outline-none focus:ring-2 ring-primary-500 text-sm font-bold" value={form.buying_price} onChange={e => setForm({...form, buying_price: Number(e.target.value)})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Selling Price</label>
            <input type="number" required className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border-none outline-none focus:ring-2 ring-primary-500 text-sm font-bold" value={form.selling_price} onChange={e => setForm({...form, selling_price: Number(e.target.value)})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Initial Stock</label>
            <input type="number" required className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border-none outline-none focus:ring-2 ring-primary-500 text-sm font-bold" value={form.stock} onChange={e => setForm({...form, stock: Number(e.target.value)})} />
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">Save Product</button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input placeholder="Search inventory..." className="w-full bg-slate-50 dark:bg-slate-800 pl-12 pr-4 py-3 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 ring-primary-500" />
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-[10px] uppercase font-black tracking-widest">
            <tr>
              <th className="px-8 py-5">Product Name</th>
              <th className="px-8 py-5">SKU</th>
              <th className="px-8 py-5 text-right">Buying (৳)</th>
              <th className="px-8 py-5 text-right">Selling (৳)</th>
              <th className="px-8 py-5 text-right">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {products.length === 0 ? (
              <tr><td colSpan={5} className="px-8 py-24 text-center text-slate-400 uppercase text-[10px] font-black tracking-widest">No products in inventory</td></tr>
            ) : products.map((p, i) => (
              <tr 
                key={p.id} 
                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors animate-in slide-in-from-left-4 duration-500"
                style={{ animationDelay: `${400 + i * 50}ms` }}
              >
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <Tag className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">{p.name}</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-sm font-mono text-slate-500">{p.sku}</td>
                <td className="px-8 py-6 text-right font-bold text-slate-600 dark:text-slate-400">{p.buying_price.toLocaleString()}</td>
                <td className="px-8 py-6 text-right font-bold text-slate-900 dark:text-white">{p.selling_price.toLocaleString()}</td>
                <td className={`px-8 py-6 text-right font-black ${p.stock < 5 ? 'text-rose-500' : 'text-emerald-500'}`}>{p.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inventory;
