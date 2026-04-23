/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Send, 
  Zap, 
  ClipboardList, 
  LogOut, 
  Plus, 
  RefreshCw,
  Twitter,
  User,
  Users,
  Activity as ActivityIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Account, Activity, Tab } from './types.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [accounts, setAccounts] = useState<string[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [accountData, setAccountData] = useState<Account | null>(null);

  // Fetch accounts and activities
  const fetchData = async () => {
    try {
      const accRes = await fetch('/api/accounts');
      const accData = await accRes.json();
      setAccounts(accData.accounts || []);

      const logRes = await fetch('/api/bot-report');
      const logData = await logRes.json();
      setActivities(logData.last_activities || []);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetch('/auth/account-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: selectedAccount })
      })
      .then(res => res.json())
      .then(data => setAccountData(data.success ? data : null))
      .catch(() => setAccountData(null));
    } else {
      setAccountData(null);
    }
  }, [selectedAccount]);

  const navItems = [
    { id: 'overview', label: 'Genel Bakış', icon: LayoutDashboard },
    { id: 'actions', label: 'İşlemler', icon: Send },
    { id: 'boost', label: 'Impression Boost', icon: Zap },
    { id: 'followers', label: 'Takipçi & İstatistik', icon: Users },
    { id: 'bulkActions', label: 'Toplu İşlemler', icon: Twitter },
    { id: 'proxy', label: 'Proxy Yönetimi', icon: RefreshCw },
    { id: 'logs', label: 'Loglar', icon: ClipboardList },
  ];

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans selection:bg-orange-500/30">
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/10 flex flex-col bg-[#0A0A0A]">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20">
            <Zap className="w-6 h-6 text-white text-bold" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">X-KODCUM</h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <div className="mb-4">
            <p className="px-4 text-[10px] uppercase tracking-[0.2em] font-extrabold text-white/30 mb-2">MENU</p>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === item.id 
                    ? 'bg-white/5 text-orange-500 border border-white/5 shadow-inner' 
                    : 'text-white/50 hover:bg-white/[0.02] hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
                {activeTab === item.id && (
                  <motion.div 
                    layoutId="active-pill"
                    className="ml-auto w-1 h-1 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,1)]"
                  />
                )}
              </button>
            ))}
          </div>

          <div className="pt-4">
            <div className="flex items-center justify-between px-4 mb-3">
              <p className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-white/30">HESAPLAR</p>
              <button 
                onClick={() => setIsLoginOpen(true)}
                className="p-1 hover:bg-white/10 rounded-lg text-orange-500 transition-colors"
                title="Hesap Ekle"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
              {accounts.map((acc) => (
                <button
                  key={acc}
                  onClick={() => setSelectedAccount(acc)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all border border-transparent ${
                    selectedAccount === acc 
                      ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' 
                      : 'text-white/40 hover:bg-white/[0.05] hover:border-white/10 hover:text-white'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-mono truncate">@{acc}</span>
                </button>
              ))}
              {accounts.length === 0 && (
                <p className="px-4 py-4 text-[11px] italic text-white/20 text-center border border-dashed border-white/5 rounded-xl">
                  Henüz hesap eklenmemiş
                </p>
              )}
            </div>
          </div>
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-bold text-xs">
               S
             </div>
             <div>
               <p className="text-[11px] font-bold">Admin Panel</p>
               <p className="text-[9px] text-white/40 uppercase tracking-widest">Premium Engine</p>
             </div>
             <button className="ml-auto text-white/30 hover:text-red-500 transition-colors">
               <LogOut className="w-4 h-4" />
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#050505] to-[#0A0A0A]">
        <header className="h-20 border-b border-white/5 px-8 flex items-center justify-between sticky top-0 bg-[#050505]/80 backdrop-blur-xl z-20">
          <div>
            <h2 className="text-lg font-bold">
              {navItems.find(n => n.id === activeTab)?.label}
            </h2>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium">X-KODCUM OPERASYON MERKEZİ</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/60 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="h-8 w-[1px] bg-white/10 mx-2" />
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,1)]" />
              <span className="text-[10px] font-bold text-green-500 tracking-wider">SİSTEM AKTİF</span>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="v-overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-6">
                  {[
                    { label: 'Aktif Oturum', value: accounts.length, icon: User, color: 'text-blue-400' },
                    { label: 'Bugünkü Tweet', value: activities.filter(a => a.status === 'success' && a.target_url.includes('TWEET')).length, icon: Twitter, color: 'text-sky-400' },
                    { label: 'Başarılı İşlem', value: activities.filter(a => a.status === 'success').length, icon: zapIcon, color: 'text-orange-400' },
                    { label: 'Hata Oranı', value: '%0.2', icon: ActivityIcon, color: 'text-red-400' },
                  ].map((stat, i) => (
                    <div key={i} className="p-6 bg-[#0A0A0A] border border-white/5 rounded-3xl relative overflow-hidden group hover:border-white/10 transition-all">
                      <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-all transform group-hover:scale-110">
                        <stat.icon className="w-20 h-20" />
                      </div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-white/30 mb-2">{stat.label}</p>
                      <h3 className={`text-3xl font-mono font-bold ${stat.color}`}>{stat.value}</h3>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-8">
                  {/* Selected Account Info */}
                  <div className="col-span-1 space-y-6">
                    <div className="p-8 bg-[#0A0A0A] border border-white/5 rounded-[32px] flex flex-col items-center text-center">
                       {accountData ? (
                         <>
                           <div className="w-24 h-24 rounded-full border-2 border-orange-500/30 p-1 mb-4 relative">
                             {accountData.profile_image_url ? (
                               <img src={accountData.profile_image_url} className="w-full h-full rounded-full object-cover" />
                             ) : (
                               <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center">
                                 <User className="w-8 h-8 text-white/20" />
                               </div>
                             )}
                             <div className="absolute bottom-1 right-1 w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center border-4 border-[#0A0A0A]">
                               <Twitter className="w-3 h-3 text-white" />
                             </div>
                           </div>
                           <h4 className="text-xl font-bold">{accountData.name}</h4>
                           <p className="text-sm text-white/40 font-mono mb-6">@{accountData.username}</p>
                           
                           <div className="w-full grid grid-cols-2 gap-4">
                             <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                               <p className="text-[10px] font-bold text-white/25 uppercase mb-1">Takipçi</p>
                               <p className="text-lg font-mono font-bold">{accountData.followers_count || 0}</p>
                             </div>
                             <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                               <p className="text-[10px] font-bold text-white/25 uppercase mb-1">Durum</p>
                               <p className="text-lg font-mono font-bold text-green-500 uppercase tracking-tighter text-xs">Aktif</p>
                             </div>
                           </div>
                         </>
                       ) : (
                         <div className="py-20 text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-white/5 border border-dashed border-white/10 mx-auto flex items-center justify-center animate-pulse">
                              <User className="w-6 h-6 text-white/10" />
                            </div>
                            <p className="text-xs text-white/20 px-10">Bilgileri görmek için soldan bir hesap seçin.</p>
                         </div>
                       )}
                    </div>
                  </div>

                  {/* Recent Activity Mini log */}
                  <div className="col-span-2 bg-[#0A0A0A] border border-white/5 rounded-[32px] overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                       <h3 className="text-sm font-bold flex items-center gap-2">
                         <ActivityIcon className="w-4 h-4 text-orange-500" />
                         Son Aktiviteler
                       </h3>
                       <button onClick={() => setActiveTab('logs')} className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest transition-colors">TÜMÜNÜ GÖR</button>
                    </div>
                    <div className="flex-1 p-2 overflow-y-auto space-y-1">
                      {activities.slice(0, 10).map((activity, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 hover:bg-white/[0.01] transition-all rounded-2xl border border-transparent hover:border-white/5 group">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                             activity.status === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 
                             activity.status === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                             'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                           }`}>
                             {activity.status === 'success' ? <Zap className="w-4 h-4" /> : <ActivityIcon className="w-4 h-4" />}
                           </div>
                           <div className="flex-1 min-w-0">
                             <div className="flex items-center justify-between gap-2 mb-1">
                               <p className="text-xs font-bold truncate tracking-tight">{activity.durum}</p>
                               <span className="text-[9px] font-mono text-white/20 shrink-0">
                                 {new Date(activity.created_at).toLocaleTimeString()}
                               </span>
                             </div>
                             <p className="text-[10px] font-mono text-white/40 truncate opacity-60 group-hover:opacity-100 transition-opacity">
                               {activity.target_url}
                             </p>
                           </div>
                        </div>
                      ))}
                      {activities.length === 0 && (
                        <div className="h-64 flex flex-col items-center justify-center gap-3">
                           <ClipboardList className="w-10 h-10 text-white/5" />
                           <p className="text-xs text-white/20">Henüz log kaydı bulunmuyor.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'actions' && <ActionsView selectedAccount={selectedAccount} />}
            {activeTab === 'boost' && <BoostView />}
            {activeTab === 'logs' && <LogsView logs={activities} />}
            {activeTab === 'followers' && <div className="text-white/30 text-center py-20">Takipçi takip sayfası yakında...</div>}
            {activeTab === 'bulkActions' && <div className="text-white/30 text-center py-20">Toplu işlemler sayfası yakında...</div>}
            {activeTab === 'proxy' && <div className="text-white/30 text-center py-20">Proxy yönetimi sayfası yakında...</div>}
          </AnimatePresence>
        </div>
      </main>

      {/* Login Modal */}
      <AnimatePresence>
        {isLoginOpen && (
          <LoginModal onClose={() => setIsLoginOpen(false)} onSuccess={() => { fetchData(); setIsLoginOpen(false); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

const zapIcon = ({ className }: { className?: string }) => <Zap className={className} />;

function ActionsView({ selectedAccount }: { selectedAccount: string | null }) {
  const [tweetText, setTweetText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleTweet = async () => {
    if (!selectedAccount || !tweetText) return;
    setIsSending(true);
    try {
      const res = await fetch('/actions/tweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: selectedAccount, text: tweetText })
      });
      const data = await res.json();
      if (data.success) {
        setTweetText('');
        alert("Tweet başarıyla gönderildi!");
      } else {
        alert("Hata: " + data.detail);
      }
    } catch (err) {
      alert("Bağlantı hatası");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-3xl space-y-8"
    >
      <div className="p-8 bg-[#0A0A0A] border border-white/5 rounded-[40px] shadow-2xl">
        <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/30 block mb-6 px-1">TWEET GÖNDER</label>
        
        {!selectedAccount && (
          <div className="p-6 border border-dashed border-orange-500/20 bg-orange-500/5 rounded-3xl mb-6 flex items-center gap-4">
            <Zap className="w-5 h-5 text-orange-500" />
            <p className="text-xs text-orange-500/80 font-medium">İşlem yapmak için önce sol menüden bir hesap seçmelisiniz.</p>
          </div>
        )}

        <textarea 
          value={tweetText}
          onChange={(e) => setTweetText(e.target.value)}
          placeholder={`@{${selectedAccount || 'hesap'}} ile ne paylaşmak istersin?`}
          className="w-full h-48 bg-white/[0.02] border border-white/10 rounded-[32px] p-8 text-lg focus:outline-none focus:border-orange-500/50 transition-all resize-none placeholder:text-white/10"
        />
        
        <div className="mt-8 flex items-center justify-between px-2">
          <div className="flex gap-4">
             <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
               <span className={tweetText.length > 280 ? 'text-red-500' : ''}>{tweetText.length}</span> / 280
             </div>
          </div>
          
          <button 
            disabled={!selectedAccount || !tweetText || isSending}
            onClick={handleTweet}
            className="px-10 py-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-30 disabled:hover:bg-orange-600 rounded-full font-bold flex items-center gap-3 transition-all active:scale-95 shadow-xl shadow-orange-600/20"
          >
            {isSending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            PAYLAŞ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 opacity-40 grayscale pointer-events-none">
         <div className="p-8 bg-[#0A0A0A] border border-white/5 rounded-[40px]">
           <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4 text-center">Toplu Takip</p>
           <div className="h-40 flex items-center justify-center border border-dashed border-white/10 rounded-3xl">
              <span className="text-[10px] font-bold text-white/20">YAKINDA</span>
           </div>
         </div>
         <div className="p-8 bg-[#0A0A0A] border border-white/5 rounded-[40px]">
           <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4 text-center">DM Otomasyonu</p>
           <div className="h-40 flex items-center justify-center border border-dashed border-white/10 rounded-3xl">
              <span className="text-[10px] font-bold text-white/20">YAKINDA</span>
           </div>
         </div>
      </div>
    </motion.div>
  );
}

function BoostView() {
  const [url, setUrl] = useState('');
  const [isBoosting, setIsBoosting] = useState(false);

  const handleBoost = async () => {
    if (!url) return;
    setIsBoosting(true);
    try {
      const res = await fetch('/api/boost-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweet_url: url })
      });
      const data = await res.json();
      alert(`Boost işlemi ${data.account_count} hesap ile başlatıldı!`);
    } catch (err) {
      alert("Hata");
    } finally {
      setIsBoosting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-3xl space-y-8"
    >
      <div className="p-10 bg-[#0A0A0A] border border-white/5 rounded-[48px] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-[0.02]">
          <Zap className="w-48 h-48" />
        </div>
        
        <div className="relative z-10">
          <h3 className="text-2xl font-black mb-2 tracking-tight">IMPRESSION ENGINE v2.0</h3>
          <p className="text-white/40 text-sm mb-10 max-w-md">Kayıtlı tüm bot hesaplarınızı kullanarak hedef içeriğin görüntülenme sayısını güvenli bir şekilde artırın.</p>
          
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 block mb-3 ml-1">TWEET / PROFİL URL</label>
              <input 
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://x.com/user/status/123456..."
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 px-6 text-sm focus:outline-none focus:border-orange-500/50 transition-all font-mono placeholder:opacity-20"
              />
            </div>
            
            <button 
              disabled={!url || isBoosting}
              onClick={handleBoost}
              className="w-full py-5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 rounded-[24px] font-black tracking-widest text-xs flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xl shadow-orange-600/20"
            >
              {isBoosting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
              ARTIRMA SİSTEMİNİ TETİKLE
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-8 bg-blue-500/5 border border-blue-500/10 rounded-[32px] flex items-start gap-5">
        <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400">
           <ClipboardList className="w-6 h-6" />
        </div>
        <div>
          <h5 className="font-bold text-sm text-blue-400 mb-1">Güvenlik Protokolü</h5>
          <p className="text-xs text-blue-400/60 leading-relaxed">Boost işlemi botlar arasında rastgele (5-15 saniye) gecikmelerle gerçekleştirilir. Bu, X spam algoritmalarından kaçınmak için gerekli bir güvenlik önlemidir.</p>
        </div>
      </div>
    </motion.div>
  );
}

function LogsView({ logs }: { logs: Activity[] }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-[#0A0A0A] border border-white/5 rounded-[40px] overflow-hidden flex flex-col h-[70vh]"
    >
      <div className="p-8 border-b border-white/5 bg-white/[0.01]">
         <h3 className="font-black tracking-tight uppercase text-sm">Sistem Günlükleri</h3>
         <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mt-1">OPERASYONEL GEÇMİŞ</p>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
         <table className="w-full text-left border-separate border-spacing-y-2 px-4">
           <thead className="sticky top-0 bg-[#0A0A0A] z-10">
             <tr className="text-[10px] font-bold text-white/20 uppercase tracking-[0.1em]">
               <th className="pb-4 pl-6">Zaman</th>
               <th className="pb-4">Hedef</th>
               <th className="pb-4">Durum / Açıklama</th>
               <th className="pb-4 text-right pr-6">Statü</th>
             </tr>
           </thead>
           <tbody>
             {logs.map((log, i) => (
               <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                 <td className="py-4 pl-6 rounded-l-2xl border-y border-l border-white/5 text-[11px] font-mono text-white/30 whitespace-nowrap">
                   {new Date(log.created_at).toLocaleString('tr-TR')}
                 </td>
                 <td className="py-4 border-y border-white/5 text-xs font-mono font-medium max-w-[200px] truncate">
                   {log.target_url}
                 </td>
                 <td className="py-4 border-y border-white/5 text-xs font-medium text-white/70">
                   {log.durum}
                 </td>
                 <td className="py-4 border-y border-r border-white/5 rounded-r-2xl text-right pr-6">
                   <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                     log.status === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 
                     log.status === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                     'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                   }`}>
                     {log.status === 'success' ? 'BAŞARILI' : log.status === 'error' ? 'HATA' : 'BİLGİ'}
                   </span>
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
         {logs.length === 0 && (
           <div className="h-full flex flex-col items-center justify-center gap-4 opacity-10 py-40">
             <ClipboardList className="w-20 h-20" />
             <p className="font-bold tracking-widest">KAYIT YOK</p>
           </div>
         )}
      </div>
    </motion.div>
  );
}

function LoginModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [form, setForm] = useState({ username: '', password: '', email: '', twoFa: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          email: form.email,
          two_fa_secret: form.twoFa || null
        })
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        alert("Hata: " + data.detail);
      }
    } catch (err) {
      alert("Giriş başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-[48px] p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-2xl font-black italic tracking-tighter">YENİ HESAP EKLE</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <Plus className="w-6 h-6 rotate-45 text-white/20" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
           <div className="space-y-1">
             <label className="text-[9px] font-black text-white/30 tracking-[0.3em] uppercase ml-1">Kullanıcı Adı</label>
             <input 
               required
               value={form.username}
               onChange={(e) => setForm({...form, username: e.target.value})}
               className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-orange-500/50 transition-all font-mono" 
               placeholder="@kullanici_adi"
             />
           </div>
           <div className="space-y-1">
             <label className="text-[9px] font-black text-white/30 tracking-[0.3em] uppercase ml-1">Parola</label>
             <input 
               required
               type="password"
               value={form.password}
               onChange={(e) => setForm({...form, password: e.target.value})}
               className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-orange-500/50 transition-all font-mono" 
               placeholder="••••••••"
             />
           </div>
           <div className="space-y-1">
             <label className="text-[9px] font-black text-white/30 tracking-[0.3em] uppercase ml-1">E-Posta (Yedek)</label>
             <input 
               value={form.email}
               onChange={(e) => setForm({...form, email: e.target.value})}
               className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-orange-500/50 transition-all font-mono" 
               placeholder="mail@example.com"
             />
           </div>
           <div className="space-y-1">
             <label className="text-[9px] font-black text-white/30 tracking-[0.3em] uppercase ml-1">2FA Secret (Opsiyonel)</label>
             <input 
               value={form.twoFa}
               onChange={(e) => setForm({...form, twoFa: e.target.value})}
               className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-orange-500/50 transition-all font-mono" 
               placeholder="ABCD 1234..."
             />
           </div>
           
           <div className="pt-4">
             <button 
               disabled={loading}
               className="w-full py-5 bg-white text-black font-black tracking-[0.2em] text-xs rounded-3xl hover:bg-orange-500 transition-all active:scale-95 disabled:bg-white/10 disabled:text-white/20"
             >
               {loading ? <RefreshCw className="w-5 h-5 animate-spin mx-auto text-black" /> : 'GİRİŞ YAP VE KAYDET'}
             </button>
           </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

