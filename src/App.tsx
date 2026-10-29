import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  Activity, ArrowDownLeft, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Bell,
  CalendarDays, Check, ChevronDown, CircleHelp, CreditCard, Download, Edit2, Filter,
  LayoutDashboard, LogOut, Menu, MoreHorizontal, Plus, Search, Settings2, ShieldCheck,
  SlidersHorizontal, Sparkles, Target, Trash2, TrendingDown, TrendingUp, Wallet, X,
  ChartNoAxesCombined, Utensils, Car, ShoppingBag, House, Clapperboard, HeartPulse, BriefcaseBusiness, Gift, CircleDollarSign
} from 'lucide-react'
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip,
  XAxis, YAxis
} from 'recharts'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { Budget, Transaction, TransactionType } from './types'

const CATEGORIES = [
  { name: 'Еда', icon: Utensils, color: '#b8f36b' },
  { name: 'Транспорт', icon: Car, color: '#8ca8ff' },
  { name: 'Покупки', icon: ShoppingBag, color: '#ffb86b' },
  { name: 'Жильё', icon: House, color: '#c3a6ff' },
  { name: 'Развлечения', icon: Clapperboard, color: '#ff8ca8' },
  { name: 'Здоровье', icon: HeartPulse, color: '#6ee7d2' },
  { name: 'Зарплата', icon: BriefcaseBusiness, color: '#b8f36b' },
  { name: 'Подарки', icon: Gift, color: '#f5a8ff' },
  { name: 'Другое', icon: CircleDollarSign, color: '#8c98a8' },
]
const COLORS = ['#b8f36b', '#8ca8ff', '#ffb86b', '#c3a6ff', '#ff8ca8', '#6ee7d2', '#f5a8ff', '#8c98a8']
const money = (n: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)
const dateToday = () => new Date().toISOString().slice(0, 10)
const monthNow = () => dateToday().slice(0, 7)
const monthLabel = (value: string) => new Date(`${value}-02T12:00:00`).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
const shortDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
const initials = (email: string) => (email.split('@')[0].slice(0, 2) || 'FT').toUpperCase()
const catColor = (category: string) => CATEGORIES.find(c => c.name === category)?.color || '#8c98a8'

type View = 'dashboard' | 'transactions' | 'budgets' | 'analytics'
type TxDraft = { title: string; amount: string; type: TransactionType; category: string; transaction_date: string; note: string }
const emptyDraft = (): TxDraft => ({ title: '', amount: '', type: 'expense', category: 'Еда', transaction_date: dateToday(), note: '' })

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [recoveryBusy, setRecoveryBusy] = useState(false)
  const [recoveryMessage, setRecoveryMessage] = useState('')
  const [recoveryError, setRecoveryError] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [authError, setAuthError] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [dataError, setDataError] = useState('')
  const [view, setView] = useState<View>('dashboard')
  const [mobileNav, setMobileNav] = useState(false)
  const [txModal, setTxModal] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [draft, setDraft] = useState<TxDraft>(emptyDraft())
  const [saving, setSaving] = useState(false)
  const [txSearch, setTxSearch] = useState('')
  const [txTypeFilter, setTxTypeFilter] = useState('all')
  const [txCategoryFilter, setTxCategoryFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(monthNow())
  const [budgetDraft, setBudgetDraft] = useState('')
  const [budgetSaving, setBudgetSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true) })
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true)
        setRecoveryMessage('')
        setRecoveryError('')
      }
      setSession(nextSession)
      setAuthReady(true)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session?.user) void loadData()
    else { setTransactions([]); setBudgets([]) }
  }, [session?.user?.id])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 3200)
    return () => clearTimeout(timer)
  }, [toast])

  async function loadData() {
    if (!supabase || !session?.user) return
    setLoadingData(true); setDataError('')
    const [txResult, budgetResult] = await Promise.all([
      supabase.from('transactions').select('*').order('transaction_date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('budgets').select('*').order('month', { ascending: false })
    ])
    if (txResult.error) setDataError(txResult.error.message)
    else setTransactions((txResult.data || []) as Transaction[])
    if (budgetResult.error) setDataError(prev => prev || budgetResult.error!.message)
    else setBudgets((budgetResult.data || []) as Budget[])
    setLoadingData(false)
  }

  async function submitAuth(e: FormEvent) {
    e.preventDefault(); if (!supabase) return
    setAuthBusy(true); setAuthError(''); setAuthMessage('')
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword })
        if (error) throw error
        if (!data.session) setAuthMessage('Проверьте почту и подтвердите адрес, чтобы завершить регистрацию.')
        else setAuthMessage('Аккаунт создан. Добро пожаловать в FinTrack!')
      } else if (authMode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(authEmail.trim(), { redirectTo: window.location.origin })
        if (error) throw error
        setAuthMessage('Если адрес зарегистрирован, мы отправили письмо для восстановления пароля.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword })
        if (error) throw error
      }
    } catch (err) { setAuthError(err instanceof Error ? err.message : 'Не удалось выполнить запрос.') }
    finally { setAuthBusy(false) }
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setRecoveryMode(false)
    setView('dashboard')
  }

  async function updateRecoveredPassword(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    if (newPassword.length < 6) { setRecoveryError('Пароль должен содержать не менее 6 символов.'); return }
    setRecoveryBusy(true); setRecoveryError(''); setRecoveryMessage('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setRecoveryBusy(false)
    if (error) setRecoveryError(error.message)
    else {
      setRecoveryMessage('Пароль успешно изменён. Теперь можно продолжить работу.')
      setNewPassword('')
      setTimeout(() => setRecoveryMode(false), 1300)
    }
  }

  function openCreateTx() { setEditing(null); setDraft(emptyDraft()); setTxModal(true) }
  function openEditTx(tx: Transaction) {
    setEditing(tx)
    setDraft({ title: tx.title, amount: String(tx.amount), type: tx.type, category: tx.category, transaction_date: tx.transaction_date, note: tx.note || '' })
    setTxModal(true)
  }

  async function saveTransaction(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !session?.user) return
    const amount = Number(draft.amount)
    if (!draft.title.trim() || !Number.isFinite(amount) || amount <= 0) { setToast('Введите название и сумму больше нуля.'); return }
    setSaving(true)
    const payload = {
      user_id: session.user.id, title: draft.title.trim(), amount, type: draft.type,
      category: draft.category, transaction_date: draft.transaction_date, note: draft.note.trim() || null
    }
    const result = editing
      ? await supabase.from('transactions').update(payload).eq('id', editing.id).select().single()
      : await supabase.from('transactions').insert(payload).select().single()
    setSaving(false)
    if (result.error) { setToast(`Не удалось сохранить: ${result.error.message}`); return }
    if (editing) setTransactions(prev => prev.map(t => t.id === editing.id ? result.data as Transaction : t))
    else setTransactions(prev => [result.data as Transaction, ...prev])
    setTxModal(false); setToast(editing ? 'Операция обновлена' : 'Операция сохранена')
  }

  async function deleteTransaction(tx: Transaction) {
    if (!supabase || !window.confirm(`Удалить операцию «${tx.title}»?`)) return
    const { error } = await supabase.from('transactions').delete().eq('id', tx.id)
    if (error) setToast(`Не удалось удалить: ${error.message}`)
    else { setTransactions(prev => prev.filter(t => t.id !== tx.id)); setToast('Операция удалена') }
  }

  async function saveBudget(e: FormEvent) {
    e.preventDefault(); if (!supabase || !session?.user) return
    const amount = Number(budgetDraft)
    if (!Number.isFinite(amount) || amount <= 0) { setToast('Укажите лимит больше нуля.'); return }
    setBudgetSaving(true)
    const { data, error } = await supabase.from('budgets').upsert(
      { user_id: session.user.id, month: selectedMonth, limit_amount: amount },
      { onConflict: 'user_id,month' }
    ).select().single()
    setBudgetSaving(false)
    if (error) { setToast(`Не удалось сохранить бюджет: ${error.message}`); return }
    setBudgets(prev => [...prev.filter(b => b.month !== selectedMonth), data as Budget])
    setBudgetDraft(''); setToast('Бюджет сохранён')
  }

  const currentMonthTx = useMemo(() => transactions.filter(t => t.transaction_date.startsWith(monthNow())), [transactions])
  const previousMonth = useMemo(() => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }, [])
  const currentIncome = currentMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const currentExpense = currentMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const previousTx = transactions.filter(t => t.transaction_date.startsWith(previousMonth))
  const previousIncome = previousTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const previousExpense = previousTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const totalBalance = transactions.reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0)
  const monthTx = useMemo(() => transactions.filter(t => t.transaction_date.startsWith(selectedMonth)), [transactions, selectedMonth])
  const monthIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const monthExpense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const activeBudget = budgets.find(b => b.month === selectedMonth)
  const budgetUsed = activeBudget ? monthExpense / Number(activeBudget.limit_amount) : 0

  const filteredTx = useMemo(() => transactions.filter(t => {
    const q = txSearch.toLocaleLowerCase('ru')
    return (!q || t.title.toLocaleLowerCase('ru').includes(q) || (t.note || '').toLocaleLowerCase('ru').includes(q))
      && (txTypeFilter === 'all' || t.type === txTypeFilter)
      && (txCategoryFilter === 'all' || t.category === txCategoryFilter)
      && (!fromDate || t.transaction_date >= fromDate) && (!toDate || t.transaction_date <= toDate)
  }), [transactions, txSearch, txTypeFilter, txCategoryFilter, fromDate, toDate])

  const chartData = useMemo(() => {
    const days = new Date(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5, 7)), 0).getDate()
    return Array.from({ length: days }, (_, i) => {
      const day = `${selectedMonth}-${String(i + 1).padStart(2, '0')}`
      const dayTx = monthTx.filter(t => t.transaction_date === day)
      return { day: i + 1, income: dayTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
        expense: dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) }
    })
  }, [monthTx, selectedMonth])
  const categoryData = useMemo(() => {
    const map = new Map<string, number>()
    monthTx.filter(t => t.type === 'expense').forEach(t => map.set(t.category, (map.get(t.category) || 0) + Number(t.amount)))
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [monthTx])
  const monthName = monthLabel(selectedMonth)
  const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Обзор', icon: LayoutDashboard },
    { id: 'transactions', label: 'Операции', icon: CreditCard },
    { id: 'budgets', label: 'Бюджеты', icon: Target },
    { id: 'analytics', label: 'Аналитика', icon: ChartNoAxesCombined },
  ]

  if (!authReady) return <div className="boot-screen"><div className="brand-mark"><Activity size={23}/></div><span>FinTrack</span><div className="spinner"/></div>
  if (!session) return <AuthScreen mode={authMode} setMode={setAuthMode} email={authEmail} setEmail={setAuthEmail}
    password={authPassword} setPassword={setAuthPassword} busy={authBusy} message={authMessage} error={authError}
    onSubmit={submitAuth} configured={isSupabaseConfigured} />
  if (recoveryMode) return <div className="auth-screen"><div className="auth-panel recovery-panel"><div className="auth-panel-inner">
    <div className="auth-mobile-brand"><div className="brand-mark"><Activity size={21}/></div><span>FinTrack</span></div>
    <div className="auth-heading"><div className="auth-kicker">ВОССТАНОВЛЕНИЕ</div><h2>Новый пароль</h2><p>Придумайте новый пароль для своего аккаунта FinTrack.</p></div>
    {recoveryMessage && <div className="success-message"><Check size={17}/>{recoveryMessage}</div>}
    {recoveryError && <div className="error-message">{recoveryError}</div>}
    <form className="auth-form" onSubmit={updateRecoveredPassword}><label>Новый пароль<span className="input-wrap"><span className="input-icon">⌘</span><input type="password" minLength={6} autoComplete="new-password" required placeholder="Минимум 6 символов" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></span></label><button className="primary-button auth-submit" disabled={recoveryBusy}>{recoveryBusy?<span className="button-spinner"/>:'Сохранить новый пароль'} {!recoveryBusy&&<Check size={17}/>}</button></form>
    <div className="auth-assurance"><ShieldCheck size={15}/> Защищённое обновление пароля</div>
  </div></div></div>

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Activity size={22}/></div><span>FinTrack</span><button className="icon-button sidebar-close" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
      <div className="workspace-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
      <nav className="side-nav">{navItems.map(item => <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => { setView(item.id); setMobileNav(false) }}><item.icon size={18}/><span>{item.label}</span>{item.id === 'transactions' && <span className="nav-count">{transactions.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="security-note"><div className="security-icon"><ShieldCheck size={18}/></div><div><strong>Ваши данные защищены</strong><span>Личное пространство</span></div></div>
        <div className="user-card"><div className="avatar">{initials(session.user.email || 'FT')}</div><div className="user-meta"><strong>{session.user.email?.split('@')[0]}</strong><span>{session.user.email}</span></div><button className="icon-button" title="Выйти" onClick={signOut}><LogOut size={17}/></button></div>
      </div>
    </aside>
    {mobileNav && <div className="mobile-scrim" onClick={() => setMobileNav(false)}/>}
    <main className="main-area">
      <header className="topbar">
        <div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)}><Menu size={20}/></button><div className="breadcrumb">Личный кабинет <span>/</span> <strong>{navItems.find(n => n.id === view)?.label}</strong></div></div>
        <div className="topbar-actions"><div className="secure-pill"><span/> Данные синхронизированы</div><button className="icon-button notification-button" title="Уведомления"><Bell size={18}/><i/></button><button className="top-avatar" title={session.user.email}>{initials(session.user.email || 'FT')}</button></div>
      </header>
      <div className="page-content">
        {dataError && <div className="inline-error"><CircleHelp size={17}/><span>{dataError}. Проверьте настройки Supabase и SQL-схему.</span><button onClick={() => void loadData()}>Повторить</button></div>}
        {view === 'dashboard' && <Dashboard
          totalBalance={totalBalance} income={currentIncome} expense={currentExpense} previousIncome={previousIncome} previousExpense={previousExpense}
          chartData={chartDataForMonth(transactions, monthNow())} categoryData={categoryDataForMonth(transactions, monthNow())}
          recent={transactions.slice(0, 5)} onAdd={openCreateTx} onAll={() => setView('transactions')} loading={loadingData} />}
        {view === 'transactions' && <TransactionsPage transactions={filteredTx} search={txSearch} setSearch={setTxSearch}
          typeFilter={txTypeFilter} setTypeFilter={setTxTypeFilter} categoryFilter={txCategoryFilter} setCategoryFilter={setTxCategoryFilter}
          fromDate={fromDate} setFromDate={setFromDate} toDate={toDate} setToDate={setToDate}
          onAdd={openCreateTx} onEdit={openEditTx} onDelete={deleteTransaction} />}
        {view === 'budgets' && <BudgetsPage selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} budgets={budgets}
          expense={monthExpense} budget={activeBudget} budgetUsed={budgetUsed} draft={budgetDraft} setDraft={setBudgetDraft}
          saving={budgetSaving} onSave={saveBudget} categoryData={categoryData} />}
        {view === 'analytics' && <AnalyticsPage selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}
          chartData={chartData} categoryData={categoryData} income={monthIncome} expense={monthExpense} monthName={monthName} />}
      </div>
    </main>
    {txModal && <TransactionModal draft={draft} setDraft={setDraft} editing={editing} saving={saving} onClose={() => setTxModal(false)} onSubmit={saveTransaction}/>}
    {toast && <div className="toast"><Check size={17}/>{toast}</div>}
  </div>
}

function chartDataForMonth(transactions: Transaction[], month: string) {
  const days = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0).getDate()
  return Array.from({length: days}, (_,i) => {
    const day = `${month}-${String(i+1).padStart(2,'0')}`
    const items = transactions.filter(t => t.transaction_date === day)
    return { day: i+1, income: items.filter(t => t.type === 'income').reduce((s,t) => s+Number(t.amount),0), expense: items.filter(t => t.type === 'expense').reduce((s,t) => s+Number(t.amount),0) }
  })
}
function categoryDataForMonth(transactions: Transaction[], month: string) {
  const map = new Map<string,number>()
  transactions.filter(t => t.transaction_date.startsWith(month) && t.type === 'expense').forEach(t => map.set(t.category,(map.get(t.category)||0)+Number(t.amount)))
  return [...map.entries()].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value)
}

function AuthScreen(props: {
  mode: 'login'|'signup'|'reset'; setMode: (v:'login'|'signup'|'reset')=>void; email:string; setEmail:(v:string)=>void;
  password:string; setPassword:(v:string)=>void; busy:boolean; message:string; error:string; onSubmit:(e:FormEvent)=>void; configured:boolean
}) {
  const {mode,setMode,email,setEmail,password,setPassword,busy,message,error,onSubmit,configured}=props
  return <div className="auth-screen">
    <div className="auth-showcase"><div className="auth-brand"><div className="brand-mark"><Activity size={23}/></div><span>FinTrack</span></div>
      <div className="showcase-copy"><div className="eyebrow"><Sparkles size={14}/> ФИНАНСЫ ПОД КОНТРОЛЕМ</div><h1>Деньги любят<br/><em>ясность.</em></h1><p>Управляйте расходами, планируйте бюджет и принимайте решения с уверенностью — в одном спокойном пространстве.</p>
        <div className="showcase-stats"><div><span className="stat-dot green"/>Осознанные траты</div><div><span className="stat-dot blue"/>Понятная аналитика</div><div><span className="stat-dot purple"/>Ваши данные — ваши</div></div>
      </div>
      <div className="showcase-visual"><div className="visual-glow"/><div className="visual-card"><div className="visual-card-top"><span>Финансовый обзор</span><span className="visual-live"><i/> В этом месяце</span></div><div className="visual-balance">€ 4 280,50</div><div className="visual-caption">Доступный баланс</div><div className="visual-bars">{[28,42,35,58,47,73,54,86,66,78,59,94,70,84,62,100,74,90,68,82].map((h,i)=><div key={i} style={{height:`${h}%`,opacity:.25+h/140}}/>)}</div><div className="visual-legend"><span><i className="legend-green"/> Доходы</span><span><i className="legend-muted"/> Расходы</span></div></div></div>
      <div className="auth-foot">FINTRACK <span>•</span> ЛИЧНЫЕ ФИНАНСЫ, ПРОЩЕ</div>
    </div>
    <div className="auth-panel"><div className="auth-panel-inner">
      <div className="auth-mobile-brand"><div className="brand-mark"><Activity size={21}/></div><span>FinTrack</span></div>
      <div className="auth-heading"><div className="auth-kicker">{mode==='signup'?'НАЧНИТЕ СЕГОДНЯ':mode==='reset'?'ВОССТАНОВЛЕНИЕ':'С ВОЗВРАЩЕНИЕМ'}</div><h2>{mode==='signup'?'Создайте аккаунт':mode==='reset'?'Сброс пароля':'Войти в FinTrack'}</h2><p>{mode==='signup'?'Ваши финансы — в порядке, начиная с этого момента.':mode==='reset'?'Укажите email, и мы пришлём ссылку для сброса пароля.':'Введите данные, чтобы открыть личное пространство.'}</p></div>
      {!configured && <div className="setup-alert"><CircleHelp size={18}/><div><strong>Нужно подключить Supabase</strong><p>Скопируйте <code>.env.example</code> в <code>.env</code> и укажите URL проекта и публичный ключ Supabase. Инструкция есть в README.</p></div></div>}
      {message && <div className="success-message"><Check size={17}/>{message}</div>}
      {error && <div className="error-message">{error}</div>}
      <form className="auth-form" onSubmit={onSubmit}>
        <label>Email<span className="input-wrap"><span className="input-icon">@</span><input type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></span></label>
        {mode!=='reset' && <label>Пароль<span className="input-wrap"><span className="input-icon">⌘</span><input type="password" autoComplete={mode==='signup'?'new-password':'current-password'} minLength={6} required placeholder="Минимум 6 символов" value={password} onChange={e=>setPassword(e.target.value)}/></span></label>}
        {mode==='login' && <button type="button" className="forgot-link" onClick={()=>{setMode('reset')}}>Забыли пароль?</button>}
        <button className="primary-button auth-submit" type="submit" disabled={busy||!configured}>{busy?<span className="button-spinner"/>:mode==='signup'?'Создать аккаунт':mode==='reset'?'Отправить ссылку':'Войти в аккаунт'}{!busy&&<ArrowRight size={17}/>}</button>
      </form>
      <div className="auth-switch">{mode==='signup'?'Уже есть аккаунт?':mode==='reset'?'Вспомнили пароль?':'Впервые в FinTrack?'} <button onClick={()=>{setMode(mode==='signup'?'login':'signup');}}>{mode==='signup'?'Войти':mode==='reset'?'Вернуться ко входу':'Создать аккаунт'}</button></div>
      <div className="auth-assurance"><ShieldCheck size={15}/> Защищённый вход · Личные данные доступны только вам</div>
    </div></div>
  </div>
}

function PageTitle({eyebrow,title,subtitle,action}:{eyebrow:string;title:string;subtitle:string;action?:React.ReactNode}) {
  return <div className="page-title-row"><div><div className="page-eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>
}
function Dashboard({totalBalance,income,expense,previousIncome,previousExpense,chartData,categoryData,recent,onAdd,onAll,loading}:{
  totalBalance:number;income:number;expense:number;previousIncome:number;previousExpense:number;chartData:{day:number;income:number;expense:number}[];
  categoryData:{name:string;value:number}[];recent:Transaction[];onAdd:()=>void;onAll:()=>void;loading:boolean
}) {
  const incomeDelta = previousIncome ? ((income-previousIncome)/previousIncome)*100 : 0
  const expenseDelta = previousExpense ? ((expense-previousExpense)/previousExpense)*100 : 0
  return <>
    <PageTitle eyebrow={new Date().toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'}).toLocaleUpperCase('ru')} title="Ваши финансы" subtitle="Вот что происходит с вашими деньгами." action={<button className="primary-button" onClick={onAdd}><Plus size={17}/> Добавить операцию</button>}/>
    <div className="stats-grid">
      <div className="stat-card balance-card"><div className="stat-card-top"><span>Общий баланс</span><span className="stat-icon"><Wallet size={18}/></span></div><div className="stat-value">{money(totalBalance)}</div><div className="stat-bottom"><span className="status-dot"/> На основе всех операций</div><div className="balance-decoration"><div/><div/><div/></div></div>
      <StatCard label="Доходы за месяц" value={money(income)} icon={<ArrowDownLeft size={18}/>} tone="green" delta={previousIncome?`${incomeDelta>=0?'+':''}${incomeDelta.toFixed(1)}%`:'—'} hint="к прошлому месяцу" positive={incomeDelta>=0}/>
      <StatCard label="Расходы за месяц" value={money(expense)} icon={<ArrowUpRight size={18}/>} tone="orange" delta={previousExpense?`${expenseDelta>=0?'+':''}${expenseDelta.toFixed(1)}%`:'—'} hint="к прошлому месяцу" positive={expenseDelta<=0}/>
      <div className="stat-card net-card"><div className="stat-card-top"><span>Остаток за месяц</span><span className="stat-icon"><Activity size={18}/></span></div><div className={`stat-value ${income-expense<0?'negative':''}`}>{money(income-expense)}</div><div className="stat-bottom"><span className="neutral-line"/> Доходы минус расходы</div></div>
    </div>
    <div className="dashboard-grid">
      <section className="panel cashflow-panel"><div className="panel-header"><div><h3>Движение денег</h3><p>Доходы и расходы в течение месяца</p></div><span className="period-chip"><CalendarDays size={14}/> {monthLabel(monthNow())}</span></div>
        <div className="chart-legend"><span><i className="legend-green"/> Доходы</span><span><i className="legend-orange"/> Расходы</span></div>
        <div className="cashflow-chart">{loading?<div className="chart-empty">Загружаем данные…</div>:chartData.some(d=>d.income||d.expense)?<ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{top:10,right:8,left:-20,bottom:0}}><defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b8f36b" stopOpacity={.22}/><stop offset="95%" stopColor="#b8f36b" stopOpacity={0}/></linearGradient><linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff9b70" stopOpacity={.16}/><stop offset="95%" stopColor="#ff9b70" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#252a30" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="day" tick={{fill:'#737c87',fontSize:11}} axisLine={false} tickLine={false} interval={4}/><YAxis tick={{fill:'#737c87',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${v/1000}k`:String(v)}/><Tooltip contentStyle={{background:'#171b20',border:'1px solid #303740',borderRadius:12,color:'#fff'}} formatter={(v:any,n:any)=>[money(Number(v)),n==='income'?'Доходы':'Расходы']} labelFormatter={v=>`${v} число`}/><Area type="monotone" dataKey="income" stroke="#b8f36b" strokeWidth={2.5} fill="url(#incomeFill)" activeDot={{r:4,strokeWidth:0}}/><Area type="monotone" dataKey="expense" stroke="#ff9b70" strokeWidth={2.2} fill="url(#expenseFill)" activeDot={{r:4,strokeWidth:0}}/></AreaChart></ResponsiveContainer>:<EmptyState title="Пока нет движения денег" text="Добавьте первую операцию, чтобы увидеть динамику."/>}</div>
      </section>
      <section className="panel category-panel"><div className="panel-header"><div><h3>Структура расходов</h3><p>Куда уходят деньги</p></div><button className="subtle-icon" title="Категории"><MoreHorizontal size={19}/></button></div>
        {categoryData.length?<><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={66} outerRadius={91} paddingAngle={4} stroke="none" cornerRadius={4}>{categoryData.map((d,i)=><Cell key={d.name} fill={catColor(d.name)||COLORS[i%COLORS.length]}/>)}</Pie><Tooltip contentStyle={{background:'#171b20',border:'1px solid #303740',borderRadius:12}} formatter={(v:any)=>money(Number(v))}/></PieChart></ResponsiveContainer><div className="donut-center"><strong>{money(categoryData.reduce((s,c)=>s+c.value,0))}</strong><span>всего расходов</span></div></div><div className="category-legend">{categoryData.slice(0,4).map((c,i)=><div className="category-row" key={c.name}><span className="category-dot" style={{background:catColor(c.name)}}/><span>{c.name}</span><strong>{money(c.value)}</strong></div>)}</div></>:<EmptyState title="Категорий пока нет" text="Расходы появятся здесь после добавления операций."/>}
      </section>
    </div>
    <section className="panel recent-panel"><div className="panel-header"><div><h3>Последние операции</h3><p>Ваши недавние финансовые действия</p></div><button className="text-button" onClick={onAll}>Все операции <ArrowRight size={15}/></button></div>
      {recent.length?<div className="transaction-list">{recent.map(tx=><TransactionRow key={tx.id} tx={tx} compact/>)}</div>:<EmptyState title="Начните с первой операции" text="Добавьте доход или расход — и ваш финансовый обзор оживёт." action={<button className="secondary-button" onClick={onAdd}><Plus size={16}/> Добавить операцию</button>}/>}
    </section>
  </>
}
function StatCard({label,value,icon,tone,delta,hint,positive}:{label:string;value:string;icon:React.ReactNode;tone:string;delta:string;hint:string;positive:boolean}) {
  return <div className="stat-card"><div className="stat-card-top"><span>{label}</span><span className={`stat-icon ${tone}`}>{icon}</span></div><div className="stat-value">{value}</div><div className="stat-bottom"><span className={`delta ${positive?'good':'bad'}`}>{delta}</span><span>{hint}</span></div></div>
}
function EmptyState({title,text,action}:{title:string;text:string;action?:React.ReactNode}) { return <div className="empty-state"><div className="empty-icon"><Activity size={21}/></div><strong>{title}</strong><p>{text}</p>{action}</div> }

function TransactionRow({tx,compact=false,onEdit,onDelete}:{tx:Transaction;compact?:boolean;onEdit?:(tx:Transaction)=>void;onDelete?:(tx:Transaction)=>void}) {
  const category = CATEGORIES.find(c=>c.name===tx.category) || CATEGORIES[CATEGORIES.length-1]
  const Icon = category.icon
  return <div className="transaction-row"><div className="tx-category-icon" style={{background:`${category.color}16`,color:category.color}}><Icon size={18}/></div><div className="tx-main"><strong>{tx.title}</strong><span>{tx.category}{tx.note&&!compact?` · ${tx.note}`:''}</span></div><div className="tx-date">{shortDate(tx.transaction_date)}</div><div className={`tx-amount ${tx.type}`}>{tx.type==='income'?'+':'−'}{money(Number(tx.amount))}</div>{!compact&&<div className="tx-actions"><button className="icon-button" title="Редактировать" onClick={()=>onEdit?.(tx)}><Edit2 size={15}/></button><button className="icon-button danger-hover" title="Удалить" onClick={()=>onDelete?.(tx)}><Trash2 size={15}/></button></div>}</div>
}
function TransactionsPage({transactions,search,setSearch,typeFilter,setTypeFilter,categoryFilter,setCategoryFilter,fromDate,setFromDate,toDate,setToDate,onAdd,onEdit,onDelete}:{
  transactions:Transaction[];search:string;setSearch:(v:string)=>void;typeFilter:string;setTypeFilter:(v:string)=>void;categoryFilter:string;setCategoryFilter:(v:string)=>void;fromDate:string;setFromDate:(v:string)=>void;toDate:string;setToDate:(v:string)=>void;onAdd:()=>void;onEdit:(t:Transaction)=>void;onDelete:(t:Transaction)=>void
}) {
  const [filtersOpen,setFiltersOpen] = useState(false)
  return <><PageTitle eyebrow="ВАШИ ДЕНЬГИ" title="Операции" subtitle="Все доходы и расходы в одном месте." action={<button className="primary-button" onClick={onAdd}><Plus size={17}/> Добавить операцию</button>}/>
    <section className="panel transactions-panel"><div className="transactions-toolbar"><div className="search-field"><Search size={17}/><input placeholder="Поиск по названию или комментарию…" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button onClick={()=>setSearch('')}><X size={14}/></button>}</div><button className={`filter-button ${filtersOpen?'selected':''}`} onClick={()=>setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={16}/> Фильтры <Filter size={13}/></button></div>
      {filtersOpen&&<div className="filter-row"><label>Тип операции<select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option value="all">Все типы</option><option value="income">Доходы</option><option value="expense">Расходы</option></select></label><label>Категория<select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option value="all">Все категории</option>{CATEGORIES.map(c=><option key={c.name}>{c.name}</option>)}</select></label><label>С даты<input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}/></label><label>По дату<input type="date" value={toDate} onChange={e=>setToDate(e.target.value)}/></label><button className="clear-filters" onClick={()=>{setTypeFilter('all');setCategoryFilter('all');setFromDate('');setToDate('');setSearch('')}}>Сбросить</button></div>}
      <div className="table-heading"><span>ОПЕРАЦИЯ</span><span>ДАТА</span><span>СУММА</span><span/></div>
      {transactions.length?<div className="transaction-list">{transactions.map(tx=><TransactionRow key={tx.id} tx={tx} onEdit={onEdit} onDelete={onDelete}/>)}</div>:<EmptyState title="Ничего не найдено" text="Измените фильтры или добавьте новую операцию." action={<button className="secondary-button" onClick={onAdd}><Plus size={16}/> Добавить операцию</button>}/>}
      <div className="list-footer">Показано операций: <strong>{transactions.length}</strong></div>
    </section>
  </>
}
function MonthPicker({value,onChange}:{value:string;onChange:(v:string)=>void}) {
  function shift(n:number) { const d=new Date(`${value}-02T12:00:00`);d.setMonth(d.getMonth()+n);onChange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`) }
  return <div className="month-picker"><button className="icon-button" onClick={()=>shift(-1)} title="Предыдущий месяц"><ArrowLeft size={16}/></button><span>{monthLabel(value)}</span><button className="icon-button" onClick={()=>shift(1)} title="Следующий месяц"><ArrowRight size={16}/></button><button className="month-current" onClick={()=>onChange(monthNow())}>Сегодня</button></div>
}
function BudgetsPage({selectedMonth,setSelectedMonth,budgets,expense,budget,budgetUsed,draft,setDraft,saving,onSave,categoryData}:{
  selectedMonth:string;setSelectedMonth:(v:string)=>void;budgets:Budget[];expense:number;budget:Budget|undefined;budgetUsed:number;draft:string;setDraft:(v:string)=>void;saving:boolean;onSave:(e:FormEvent)=>void;categoryData:{name:string;value:number}[]
}) {
  const remaining = budget ? Number(budget.limit_amount)-expense : 0
  const over = budget && expense > Number(budget.limit_amount)
  return <><PageTitle eyebrow="ПЛАНИРОВАНИЕ" title="Бюджеты" subtitle="Установите лимит и следите за расходами." action={<MonthPicker value={selectedMonth} onChange={setSelectedMonth}/>}/>
    <div className="budget-layout"><section className="panel budget-main"><div className="panel-header"><div><h3>Месячный бюджет</h3><p>{monthLabel(selectedMonth)}</p></div><span className="budget-icon"><Target size={20}/></span></div>
      {budget?<><div className="budget-amount-row"><div><span className="muted-label">ПОТРАЧЕНО</span><strong>{money(expense)}</strong></div><div className="budget-limit"><span className="muted-label">ЛИМИТ</span><strong>{money(Number(budget.limit_amount))}</strong></div></div><div className="budget-progress"><div className={over?'over':''} style={{width:`${Math.min(100,budgetUsed*100)}%`}}/></div><div className="budget-progress-labels"><span>{Math.round(budgetUsed*100)}% использовано</span><span className={over?'text-danger':''}>{over?`Превышение ${money(Math.abs(remaining))}`:`Осталось ${money(remaining)}`}</span></div>
        {budgetUsed>=.8&&<div className={`budget-warning ${over?'warning-danger':''}`}><Bell size={17}/><span>{over?'Лимит превышен. Пересмотрите расходы или обновите бюджет.':'Вы приближаетесь к лимиту: использовано более 80% бюджета.'}</span></div>}
      </>:<EmptyState title="Бюджет ещё не задан" text="Задайте месячный лимит, чтобы понимать, сколько можно потратить."/>}
      <form className="budget-form" onSubmit={onSave}><label>{budget?'Изменить лимит':'Установить лимит на месяц'}<div className="money-input"><span>€</span><input type="number" min="0.01" step="0.01" placeholder={budget?String(budget.limit_amount):'Например, 1500'} value={draft} onChange={e=>setDraft(e.target.value)}/></div></label><button className="primary-button" disabled={saving}>{saving?'Сохраняем…':budget?'Обновить бюджет':'Сохранить бюджет'}</button></form>
    </section><section className="panel budget-breakdown"><div className="panel-header"><div><h3>Расходы по категориям</h3><p>Распределение за выбранный месяц</p></div></div>{categoryData.length?categoryData.map(c=><div className="budget-category" key={c.name}><div className="budget-cat-top"><span><i style={{background:catColor(c.name)}}/>{c.name}</span><strong>{money(c.value)}</strong></div><div className="mini-progress"><div style={{width:`${expense?c.value/expense*100:0}%`,background:catColor(c.name)}}/></div></div>):<EmptyState title="Пока пусто" text="Добавьте расходы, чтобы увидеть категории."/ >}</section></div>
    <section className="panel budget-history"><div className="panel-header"><div><h3>История бюджетов</h3><p>Сохранённые лимиты по месяцам</p></div></div>{budgets.length?<div className="budget-history-list">{budgets.map(b=><button key={b.id} className={`budget-history-row ${b.month===selectedMonth?'current':''}`} onClick={()=>setSelectedMonth(b.month)}><span><CalendarDays size={17}/>{monthLabel(b.month)}</span><strong>{money(Number(b.limit_amount))}</strong><ArrowRight size={16}/></button>)}</div>:<p className="muted-paragraph">После сохранения здесь появятся ваши бюджеты за разные месяцы.</p>}</section>
  </>
}
function AnalyticsPage({selectedMonth,setSelectedMonth,chartData,categoryData,income,expense,monthName}:{
  selectedMonth:string;setSelectedMonth:(v:string)=>void;chartData:{day:number;income:number;expense:number}[];categoryData:{name:string;value:number}[];income:number;expense:number;monthName:string
}) {
  const total = categoryData.reduce((s,c)=>s+c.value,0)
  return <><PageTitle eyebrow="ЦИФРЫ И ТЕНДЕНЦИИ" title="Аналитика" subtitle="Поймите свои привычки и принимайте более точные решения." action={<MonthPicker value={selectedMonth} onChange={setSelectedMonth}/>}/>
    <div className="analytics-summary"><div className="analytics-summary-card"><span>Доходы</span><strong className="income-text">{money(income)}</strong><small><TrendingUp size={14}/> Всего за период</small></div><div className="analytics-summary-card"><span>Расходы</span><strong className="expense-text">{money(expense)}</strong><small><TrendingDown size={14}/> Всего за период</small></div><div className="analytics-summary-card"><span>Разница</span><strong className={income-expense>=0?'income-text':'expense-text'}>{money(income-expense)}</strong><small><Activity size={14}/> Чистый денежный поток</small></div></div>
    <div className="analytics-grid"><section className="panel analytics-chart-panel"><div className="panel-header"><div><h3>Доходы и расходы</h3><p>Ежедневная динамика · {monthName}</p></div></div><div className="analytics-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{top:10,right:10,left:-15,bottom:0}}><defs><linearGradient id="aIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b8f36b" stopOpacity={.2}/><stop offset="100%" stopColor="#b8f36b" stopOpacity={0}/></linearGradient><linearGradient id="aExpense" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff9b70" stopOpacity={.15}/><stop offset="100%" stopColor="#ff9b70" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#252a30" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="day" tick={{fill:'#737c87',fontSize:11}} axisLine={false} tickLine={false} interval={2}/><YAxis tick={{fill:'#737c87',fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#171b20',border:'1px solid #303740',borderRadius:12}} formatter={(v:any,n:any)=>[money(Number(v)),n==='income'?'Доходы':'Расходы']}/><Area type="monotone" dataKey="income" stroke="#b8f36b" strokeWidth={2.5} fill="url(#aIncome)"/><Area type="monotone" dataKey="expense" stroke="#ff9b70" strokeWidth={2.2} fill="url(#aExpense)"/></AreaChart></ResponsiveContainer></div><div className="chart-legend"><span><i className="legend-green"/> Доходы</span><span><i className="legend-orange"/> Расходы</span></div></section>
      <section className="panel analytics-categories"><div className="panel-header"><div><h3>Отчёт по категориям</h3><p>Структура расходов</p></div></div>{categoryData.length?categoryData.map((c,i)=><div className="analytics-cat-row" key={c.name}><div className="analytics-cat-top"><span><i style={{background:catColor(c.name)}}/>{c.name}</span><strong>{money(c.value)}</strong></div><div className="mini-progress"><div style={{width:`${total?c.value/total*100:0}%`,background:catColor(c.name)}}/></div><small>{total?(c.value/total*100).toFixed(1):0}% от расходов</small></div>):<EmptyState title="Нет данных за период" text="Добавьте расходы, чтобы сформировать отчёт."/ >}</section></div>
    <div className="analytics-note"><div className="analytics-note-icon"><Sparkles size={18}/></div><div><strong>Небольшая привычка — большой результат</strong><p>Проверяйте аналитику раз в неделю. Даже простое понимание основных категорий расходов помогает осознаннее управлять бюджетом.</p></div></div>
  </>
}
function TransactionModal({draft,setDraft,editing,saving,onClose,onSubmit}:{draft:TxDraft;setDraft:(v:TxDraft)=>void;editing:Transaction|null;saving:boolean;onClose:()=>void;onSubmit:(e:FormEvent)=>void}) {
  const update=(key:keyof TxDraft,value:string)=>setDraft({...draft,[key]:value} as TxDraft)
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="transaction-modal"><div className="modal-header"><div><div className="page-eyebrow">{editing?'ИЗМЕНЕНИЕ':'НОВАЯ ЗАПИСЬ'}</div><h2>{editing?'Редактировать операцию':'Добавить операцию'}</h2></div><button className="icon-button" onClick={onClose}><X size={20}/></button></div>
    <form onSubmit={onSubmit}><div className="type-switch"><button type="button" className={draft.type==='expense'?'selected expense-selected':''} onClick={()=>{update('type','expense');if(draft.category==='Зарплата')update('category','Еда')}}><ArrowUpRight size={17}/> Расход</button><button type="button" className={draft.type==='income'?'selected income-selected':''} onClick={()=>{update('type','income');if(!['Зарплата','Подарки','Другое'].includes(draft.category))update('category','Зарплата')}}><ArrowDownLeft size={17}/> Доход</button></div>
      <label>Название операции<input required maxLength={100} placeholder="Например, продукты на неделю" value={draft.title} onChange={e=>update('title',e.target.value)}/></label>
      <div className="form-two-col"><label>Сумма (€)<input required type="number" min="0.01" step="0.01" placeholder="0,00" value={draft.amount} onChange={e=>update('amount',e.target.value)}/></label><label>Дата<input required type="date" value={draft.transaction_date} onChange={e=>update('transaction_date',e.target.value)}/></label></div>
      <label>Категория<select value={draft.category} onChange={e=>update('category',e.target.value)}>{CATEGORIES.filter(c=>draft.type==='income'?['Зарплата','Подарки','Другое'].includes(c.name):!['Зарплата'].includes(c.name)).map(c=><option key={c.name}>{c.name}</option>)}</select></label>
      <label>Комментарий <span className="optional-label">необязательно</span><textarea rows={3} maxLength={500} placeholder="Добавьте детали, если нужно…" value={draft.note} onChange={e=>update('note',e.target.value)}/></label>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Отмена</button><button type="submit" className="primary-button" disabled={saving}>{saving?'Сохраняем…':editing?'Сохранить изменения':'Сохранить операцию'} {!saving&&<Check size={16}/>}</button></div>
    </form>
  </section></div>
}
