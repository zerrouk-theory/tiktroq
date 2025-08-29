import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Heart, MessageCircle, Share2, MapPin, Clock, Star, Search, Plus, Home, Compass, User,
  Send, ArrowLeft, Camera, MoreHorizontal, Bookmark, Filter, Video, RefreshCw,
  ShieldCheck, LogOut, Settings, Flag, Check, Bell, Crown, Download, Shield
} from 'lucide-react'

type UserT = { id: string; firstName: string; lastName: string; avatar: string; city: string; trust: number; trades: number; premium?: boolean; radiusKm?: number; consent?: any }
type PostT = {
  id: string; userId: string; title: string; description: string; category: string; estimatedValue: number; condition: string; type: 'troc' | 'service';
  city: string; distanceKm: number; mediaType?: 'video'|'image'; mediaPoster: string; mediaUrl?: string; duration: string; likes: number; comments: number; shares: number; views: number; timeAgo: string;
  hashtags: string[]; liked: boolean; saved: boolean; status: 'approved'|'pending'|'rejected'
}
type MessageT = { id: string; from: string; text: string; at: string }
type ConversationT = { id: string; withUserId: string; messages: MessageT[] }

const formatEuros = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
const clamp = (v:number, min:number, max:number) => Math.min(Math.max(v, min), max)

const CATEGORIES = ['Tous','Objets','Services','Électronique','Mode','Maison','Sport','Loisirs']
const BANNED = ['arme','drogue','contrefaçon','fake','haine','race','insulte']

const seedUsers: UserT[] = [
  { id:'u1', firstName:'Marie', lastName:'L.', avatar:'👩‍🦱', city:'Paris', trust:4.8, trades:23 },
  { id:'u2', firstName:'Thomas', lastName:'K.', avatar:'👨‍💼', city:'Montreuil', trust:4.9, trades:67 },
  { id:'u3', firstName:'Alex', lastName:'92', avatar:'👨', city:'Courbevoie', trust:4.3, trades:12 },
]

const seedPosts: PostT[] = [
  { id:'p1', userId:'u1', title:'iPhone 13 Pro contre console PS5', description:'iPhone 13 Pro 256 Go, excellent état, échange contre PS5 et 2 jeux.', category:'Électronique', estimatedValue:650, condition:'Excellent', type:'troc', city:'Paris', distanceKm:2.3, mediaType:'image', mediaPoster:'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&h=1000&fit=crop', duration:'0:45', likes:127, comments:34, shares:12, views:1250, timeAgo:'2h', hashtags:['#iPhone13','#PS5','#ÉchangeÉlectronique'], liked:false, saved:false, status:'approved' },
  { id:'p2', userId:'u2', title:"Cours de guitare contre cours d'anglais", description:"Prof de guitare, 1 h par semaine contre cours d'anglais niveau B2. Échange de services.", category:'Services', estimatedValue:40, condition:'Service', type:'service', city:'Montreuil', distanceKm:1.8, mediaType:'image', mediaPoster:'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=1000&fit=crop', duration:'1:12', likes:89, comments:19, shares:8, views:890, timeAgo:'5h', hashtags:['#CoursGuitare','#Anglais','#Échange'], liked:true, saved:true, status:'approved' },
]

const seedConversations: ConversationT[] = [
  { id:'c1', withUserId:'u3', messages:[
    { id:'m1', from:'u3', text:'Salut, intéressé par ton iPhone contre ma PS5.', at:'14:30' },
    { id:'m2', from:'me', text:'Bonjour, tu as des photos et les jeux inclus ?', at:'14:35' },
    { id:'m3', from:'u3', text:'Spider-Man 2, God of War, FIFA 24.', at:'14:38' },
  ]},
]

function moderateText(txt?: string) {
  if (!txt) return { ok:true, reason:'' }
  const lowered = txt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const flagged = BANNED.find((w) => lowered.includes(w))
  if (flagged) return { ok:false, reason:`Contenu suspect détecté: "${flagged}"` }
  return { ok:true, reason:'' }
}

function StarRating({ value }: { value:number }) {
  const full = Math.floor(value)
  const half = value - full >= 0.5
  return (
    <div className="flex items-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${i < full ? 'text-yellow-400 fill-yellow-400' : half && i === full ? 'text-yellow-400' : 'text-gray-600'}`} size={14} />
      ))}
      <span className="ml-1 text-xs text-yellow-300 font-medium">{value.toFixed(1)}</span>
    </div>
  )
}

function Toggle({ checked, onChange, label, desc }: { checked:boolean, onChange:(v:boolean)=>void, label:string, desc?:string }) {
  return (
    <div className="flex items-start justify-between py-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {desc ? <div className="text-xs text-gray-400">{desc}</div> : null}
      </div>
      <button onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 items-center rounded-full ${checked ? 'bg-green-500' : 'bg-gray-700'}`} aria-label={label}>
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

function Chip({ children, active = false, onClick }: { children:React.ReactNode, active?:boolean, onClick?:()=>void }) {
  return (
    <button onClick={onClick} className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border ${active ? 'bg-green-500 text-black border-green-500' : 'bg-black/30 border-gray-700 text-gray-200'}`}>
      {children}
    </button>
  )
}

function AdPlaceholder() {
  return (
    <div className="w-full rounded-xl border border-gray-800 bg-black/40 p-4 flex items-center justify-between">
      <div>
        <div className="text-sm font-semibold">Publicité</div>
        <div className="text-xs text-gray-400">Espace sponsorisé, contenu vérifié</div>
      </div>
      <ShieldCheck className="text-green-400" size={20} />
    </div>
  )
}

function Header({ cityLabel, onOpenSearch, onOpenSettings, onStartRoulette }: { cityLabel:string, onOpenSearch:()=>void, onOpenSettings:()=>void, onStartRoulette:()=>void }) {
  return (
    <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/70 to-transparent p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MapPin size={16} className="text-green-400" />
          <span className="text-sm font-medium">{cityLabel}</span>
        </div>
        <div className="text-2xl font-bold text-green-400 select-none">TikTroQ</div>
        <div className="flex items-center space-x-3">
          <button onClick={onOpenSearch} title="Recherche"><Search size={22} /></button>
          <button onClick={onStartRoulette} title="Troc Roulette" className="animate-pulse">🎰</button>
          <button onClick={onOpenSettings} title="Réglages"><Settings size={22} /></button>
        </div>
      </div>
    </div>
  )
}

function BottomNav({ current, setCurrent, onCreate }: { current:string, setCurrent:(v:string)=>void, onCreate:()=>void }) {
  const Item = ({ id, icon: Icon }: { id:string, icon: any }) => (
    <button onClick={() => setCurrent(id)} className={`p-3 ${current === id ? 'text-green-400' : 'text-gray-400'}`}>
      <Icon size={24} />
    </button>
  )
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-gray-800">
      <div className="flex justify-around items-center py-2">
        <Item id="feed" icon={Home} />
        <Item id="explore" icon={Compass} />
        <button onClick={onCreate} className="p-3 bg-green-500 rounded-full text-white">
          <Plus size={24} />
        </button>
        <Item id="messages" icon={MessageCircle} />
        <Item id="profile" icon={User} />
      </div>
    </div>
  )
}

export default function TikTroQApp() {
  const [me, setMe] = useState<UserT | null>(null)
  const [view, setView] = useState<string>('landing')
  const [currentPostIndex, setCurrentPostIndex] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [showChatWith, setShowChatWith] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('Tous')

  const [users, setUsers] = useState<UserT[]>(() => JSON.parse(localStorage.getItem('tiktroq.users') || 'null') || seedUsers)
  const [posts, setPosts] = useState<PostT[]>(() => JSON.parse(localStorage.getItem('tiktroq.posts') || 'null') || seedPosts)
  const [conversations, setConversations] = useState<ConversationT[]>(() => JSON.parse(localStorage.getItem('tiktroq.conversations') || 'null') || seedConversations)

  const [consents, setConsents] = useState({ analytics: true, marketing: false, location: true, photos: true, messages: true })
  const [city, setCity] = useState('Paris 11e')
  const [radiusKm, setRadiusKm] = useState(5)
  const [locationMode, setLocationMode] = useState<'ville'|'rayon'>('ville')

  const [createForm, setCreateForm] = useState({ type: 'troc' as 'troc'|'service', title: '', description: '', category: 'Objets', estimatedValue: 50, file: null as File | null, poster: '' })

  // TroQ Roulette state
  const [showRoulette, setShowRoulette] = useState(false)
  const [roulettePost, setRoulettePost] = useState<PostT | null>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [rouletteTimer, setRouletteTimer] = useState<number | null>(null)

  // persist
  useEffect(() => localStorage.setItem('tiktroq.users', JSON.stringify(users)), [users])
  useEffect(() => localStorage.setItem('tiktroq.posts', JSON.stringify(posts)), [posts])
  useEffect(() => localStorage.setItem('tiktroq.conversations', JSON.stringify(conversations)), [conversations])
  useEffect(() => localStorage.setItem('tiktroq.me', JSON.stringify(me)), [me])

  const SLOGAN = 'Au lieu de jeter, en 2 clics tu troques !'
  const meUser = useMemo(() => me || null, [me])
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const filteredPosts = useMemo(() => {
    let list = posts
    if (activeCategory !== 'Tous') list = list.filter((p) => p.category === activeCategory)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.hashtags.some((h) => h.toLowerCase().includes(q)))
    }
    return list
  }, [posts, activeCategory, searchQuery])

  const currentPost = filteredPosts[currentPostIndex] || filteredPosts[0] || null

  const feedRef = useRef<HTMLDivElement | null>(null)
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!filteredPosts.length) return
    if (e.deltaY > 40) setCurrentPostIndex((i) => clamp(i + 1, 0, filteredPosts.length - 1))
    if (e.deltaY < -40) setCurrentPostIndex((i) => clamp(i - 1, 0, filteredPosts.length - 1))
  }

  const handleLogin = () => {
    const id = 'me'
    const u = users.find((x) => x.id === id) || { id, firstName: 'Vous', lastName: '', avatar: '🧑', city, trust: 4.5, trades: 0 }
    setMe({ ...u, radiusKm, premium: false, consent: { ...consents } } as any)
    if (!users.find((x) => x.id === id)) setUsers((prev) => [u as UserT, ...prev])
    setView('feed')
  }

  const handleCreate = () => {
    const check = moderateText(`${createForm.title} ${createForm.description}`)
    const status = check.ok ? 'approved' : 'pending'
    const id = `p${Date.now()}`
    const newPost: PostT = {
      id, userId: meUser?.id || 'u1', title: createForm.title || 'Nouvelle annonce', description: createForm.description || 'Description à venir',
      category: createForm.category || 'Objets', estimatedValue: Number(createForm.estimatedValue) || 0, condition: createForm.type === 'service' ? 'Service' : 'Bon', type: createForm.type,
      city: meUser?.city || city, distanceKm: Math.max(0.3, Math.round(Math.random() * radiusKm * 10) / 10),
      mediaType: createForm.file ? 'video' : 'image', mediaPoster: createForm.poster || 'https://images.unsplash.com/photo-1596464716121-acb9fcc7d6a8?w=800&h=1000&fit=crop',
      mediaUrl: '', duration: '0:23', likes: 0, comments: 0, shares: 0, views: 0, timeAgo: 'maintenant', hashtags: ['#Troc', '#ÉconomieCirculaire'], liked: false, saved: false, status,
    }
    setPosts((prev) => [newPost, ...prev])
    setView('feed')
  }

  // TroQ Roulette functions
  const startTroqRoulette = () => {
    const availablePosts = posts.filter(p =>
      p.userId !== (me?.id || 'me') &&
      p.distanceKm <= radiusKm &&
      p.status === 'approved'
    )
    if (!availablePosts.length) { alert('Aucun troc disponible dans ta zone ! 😢'); return }

    setShowRoulette(true)
    setIsSpinning(true)

    let spins = 0
    const maxSpins = 20 + Math.floor(Math.random() * 15)
    const spinInterval = setInterval(() => {
      const randomPost = availablePosts[Math.floor(Math.random() * availablePosts.length)]
      setRoulettePost(randomPost)
      spins++
      if (spins >= maxSpins) {
        clearInterval(spinInterval)
        setIsSpinning(false)
        const timer = window.setTimeout(() => {
          setShowRoulette(false)
          setRoulettePost(null)
          alert('Temps écoulé ! La roulette se ferme...')
        }, 30000)
        setRouletteTimer(timer)
      }
    }, 100)
  }

  const acceptRouletteTrade = () => {
    if (!roulettePost) return
    const newConv = {
      id: 'c' + Date.now(),
      withUserId: roulettePost.userId,
      messages: [{
        id: 'm' + Date.now(),
        from: 'me',
        text: `🎰 Salut ! J'accepte le Troc Roulette pour ton "${roulettePost.title}" !`,
        at: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      }]
    }
    if (!conversations.find(c => c.withUserId === roulettePost.userId)) {
      setConversations(prev => [newConv, ...prev])
    }
    if (rouletteTimer) clearTimeout(rouletteTimer)
    setShowRoulette(false)
    setRoulettePost(null)
    setShowChatWith(roulettePost.userId)
    setView('chat')
  }

  const rejectRouletteTrade = () => {
    if (rouletteTimer) clearTimeout(rouletteTimer)
    setShowRoulette(false)
    setRoulettePost(null)
  }

  // -------------------- VUES --------------------

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl font-extrabold text-green-400 mb-2 select-none">TikTroQ</div>
          <p className="text-gray-300 mb-6">{'Au lieu de jeter, en 2 clics tu troques !'}</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button className="bg-green-500 text-black font-semibold py-3 rounded-xl" onClick={handleLogin}>
              Voir la démo
            </button>
            <button className="bg-gray-800 text-white py-3 rounded-xl" onClick={handleLogin}>
              Se connecter
            </button>
          </div>
          <AdPlaceholder />
          <div className="text-xs text-gray-500 mt-4">
            En continuant, vous acceptez nos Conditions et notre Politique de confidentialité.
          </div>
        </div>
      </div>
    )
  }

  if (view === 'settings') {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="p-4 flex items-center space-x-3 border-b border-gray-800">
          <button onClick={() => setView('feed')}><ArrowLeft /></button>
          <div className="text-lg font-semibold">Réglages et RGPD</div>
        </div>
        <div className="p-4 space-y-4 max-w-md mx-auto">
          <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Abonnement Premium</div>
                <div className="text-xs text-gray-400">Sans pubs, mise en avant, statistiques avancées</div>
              </div>
              <Crown className="text-yellow-400" />
            </div>
            <button onClick={() => me && setMe({ ...me, premium: !(me as any).premium } as any)} className={`mt-3 w-full ${(me as any)?.premium ? 'bg-yellow-400 text-black' : 'bg-gray-800'} rounded-lg py-2 font-semibold`}>
              {(me as any)?.premium ? 'Désactiver Premium' : 'Activer Premium'}
            </button>
          </div>

          <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
            <div className="text-sm font-semibold mb-2">Confidentialité et consentements</div>
            <Toggle label="Localisation approximative" checked={consents.location} onChange={(v) => setConsents({ ...consents, location: v })} />
            <Toggle label="Photos et vidéos" checked={consents.photos} onChange={(v) => setConsents({ ...consents, photos: v })} />
            <Toggle label="Messages" checked={consents.messages} onChange={(v) => setConsents({ ...consents, messages: v })} />
            <Toggle label="Mesure d'audience" checked={consents.analytics} onChange={(v) => setConsents({ ...consents, analytics: v })} />
            <Toggle label="Marketing" checked={consents.marketing} onChange={(v) => setConsents({ ...consents, marketing: v })} />
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button onClick={() => {
                const data = { me, consents, users, posts, conversations }
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'tiktroq-donnees.json'; a.click(); URL.revokeObjectURL(url)
              }} className="bg-gray-800 rounded-lg py-2 flex items-center justify-center space-x-2">
                <Download size={16} /> <span>Exporter mes données</span>
              </button>
              <button onClick={() => { setMe(null); setConversations([]); setView('landing') }} className="bg-red-600 rounded-lg py-2">Supprimer mon compte</button>
            </div>
          </div>

          <div className="bg-black/40 border border-gray-800 rounded-xl p-4 space-y-2">
            <div className="text-sm font-semibold">Mentions légales et responsabilités</div>
            <div className="text-xs text-gray-400">
              TikTroQ est une plateforme de mise en relation, les échanges et litiges relèvent des utilisateurs.
            </div>
          </div>

          <button onClick={() => setView('feed')} className="w-full bg-green-500 text-black font-semibold py-3 rounded-xl">Retour</button>
        </div>
      </div>
    )
  }

  if (view === 'feed') {
    const p = currentPost
    const u = p ? userMap[p.userId] : null
    return (
      <div className="max-w-md mx-auto bg-black text-white relative overflow-hidden h-screen" onWheel={onWheel} ref={feedRef}>
        <Header cityLabel={locationMode === 'ville' ? city : `${city}, ${radiusKm} km`} onOpenSearch={() => setView('search')} onOpenSettings={() => setView('settings')} onStartRoulette={startTroqRoulette} />
        <div className="relative h-full bg-gray-900 flex items-center justify-center">
          {p ? (
            p.mediaUrl ? (
              <video src={p.mediaUrl} poster={p.mediaPoster} className="w-full h-full object-cover" controls />
            ) : (
              <img src={p.mediaPoster} alt={p.title} className="w-full h-full object-cover" />
            )
          ) : (
            <div className="text-gray-400">Aucun contenu</div>
          )}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="bg-black/50 rounded-full p-4"><Video size={48} /></div>
          </div>
        </div>
        {p && (
          <div className="absolute bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
            <div className="flex justify-between items-end">
              <div className="flex-1 pr-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="text-2xl">{u?.avatar || '🧑'}</div>
                  <span className="font-semibold">{u ? `${u.firstName} ${u.lastName}` : 'Utilisateur'}</span>
                  <StarRating value={u?.trust || 4.5} />
                  <span className="text-xs text-gray-400">({u?.trades || 0} trocs)</span>
                </div>
                <h3 className="text-lg font-bold mb-1">{p.title}</h3>
                <p className="text-sm text-gray-300 mb-2">{p.description}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {p.hashtags.map((tag) => (
                    <span key={tag} className="text-xs bg-green-400/20 text-green-400 px-2 py-1 rounded-full">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center space-x-4 text-xs text-gray-400">
                  <span className="flex items-center space-x-1"><MapPin size={12} /><span>{p.distanceKm} km</span></span>
                  <span className="flex items-center space-x-1"><Clock size={12} /><span>{p.timeAgo}</span></span>
                  <span className="bg-green-400 text-black px-2 py-1 rounded text-xs font-bold">{formatEuros(p.estimatedValue)}</span>
                </div>
              </div>
              <div className="flex flex-col space-y-4 items-center">
                <div className="flex flex-col items-center">
                  <button className="p-3 rounded-full bg-black/50" onClick={() => setPosts((prev) => prev.map((x) => x.id === p.id ? { ...x, liked: !x.liked, likes: x.liked ? x.likes - 1 : x.likes + 1 } : x))}>
                    <Heart size={24} className={`${p.liked ? 'text-red-500' : 'text-white'}`} />
                  </button>
                  <span className="text-xs mt-1">{p.likes}</span>
                </div>
                <div className="flex flex-col items-center">
                  <button className="p-3 rounded-full bg-black/50" onClick={() => setShowComments(true)}>
                    <MessageCircle size={24} />
                  </button>
                  <span className="text-xs mt-1">{p.comments}</span>
                </div>
                <div className="flex flex-col items-center">
                  <button className="p-3 rounded-full bg-black/50" onClick={() => setPosts((prev) => prev.map((x) => x.id === p.id ? { ...x, saved: !x.saved } : x))}>
                    <Bookmark size={24} className={`${p.saved ? 'text-yellow-400' : 'text-white'}`} />
                  </button>
                </div>
                <div className="flex flex-col items-center">
                  <button className="p-3 rounded-full bg-black/50">
                    <Share2 size={24} />
                  </button>
                  <span className="text-xs mt-1">{p.shares}</span>
                </div>
                <div className="flex flex-col items-center">
                  <button onClick={() => { setShowChatWith(p.userId); setView('chat'); }} className="p-3 rounded-full bg-green-500">
                    <RefreshCw size={24} className="text-black" />
                  </button>
                  <span className="text-xs mt-1 text-green-400">Troquer</span>
                </div>
              </div>
            </div>

            {/* Overlay TroQ Roulette */}
            {showRoulette && (
              <div className="absolute inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="relative bg-gradient-to-br from-purple-900 to-pink-900 rounded-2xl p-6 max-w-sm w-full text-center border border-purple-700/60">
                  <div className="mb-4">
                    <div className="text-3xl mb-2">🎰</div>
                    <h2 className="text-xl font-bold text-white">TroQ Roulette</h2>
                    <p className="text-sm text-gray-300">Découvre ton troc mystère !</p>
                  </div>

                  <div className={'relative mb-6 ' + (isSpinning ? 'animate-spin' : '')}>
                    {roulettePost ? (
                      <div className="bg-black/50 rounded-xl p-4 border-2 border-yellow-400">
                        <img src={roulettePost.mediaPoster} alt={roulettePost.title} className="w-full h-32 object-cover rounded-lg mb-3" />
                        <h3 className="font-bold text-white">{roulettePost.title}</h3>
                        <p className="text-sm text-gray-300 truncate">{roulettePost.description}</p>
                        <div className="flex justify-center items-center mt-2 space-x-3">
                          <span className="text-green-300 font-bold">{formatEuros(roulettePost.estimatedValue)}</span>
                          <span className="text-yellow-300">📍 {roulettePost.distanceKm}km</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-black/50 rounded-xl p-4 border-2 border-gray-600 h-48 flex items-center justify-center">
                        <div className="text-6xl animate-pulse">❓</div>
                      </div>
                    )}
                  </div>

                  {isSpinning ? (
                    <div className="text-yellow-300 font-bold animate-pulse">🎲 La roulette tourne...</div>
                  ) : roulettePost ? (
                    <div className="space-y-3">
                      <div className="text-sm text-yellow-200 mb-3">⏰ Tu as 30 secondes pour décider !</div>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={acceptRouletteTrade} className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-4 rounded-xl transition-all transform hover:scale-105">🎯 J'accepte !</button>
                        <button onClick={rejectRouletteTrade} className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition-all transform hover:scale-105">❌ Je passe</button>
                      </div>
                      <div className="text-xs text-gray-200 mt-2">💡 Accepter lance automatiquement une conversation !</div>
                    </div>
                  ) : null}

                  <button onClick={rejectRouletteTrade} className="absolute top-3 right-3 text-gray-200 hover:text-white text-xl" aria-label="Fermer">✕</button>
                </div>
              </div>
            )}
          </div>
        )}
        <BottomNav current={view} setCurrent={setView} onCreate={() => setView('create')} />
      </div>
    )
  }

  if (view === 'search' || view === 'explore') {
    return (
      <div className="max-w-md mx-auto bg-black text-white h-screen">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center space-x-3 mb-4">
            <button onClick={() => setView('feed')}><ArrowLeft size={24} /></button>
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher un objet, un service..." className="w-full bg-gray-800 rounded-full pl-10 pr-4 py-2 text-sm" />
            </div>
            <button><Filter size={20} /></button>
          </div>
          <div className="flex space-x-2 overflow-x-auto">
            {CATEGORIES.map((c) => (<Chip key={c} active={activeCategory === c} onClick={() => setActiveCategory(c)}>{c}</Chip>))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1 p-1">
          {filteredPosts.map((post, idx) => (
            <div key={post.id} className="relative aspect-[3/4] bg-gray-800 rounded-lg overflow-hidden cursor-pointer" onClick={() => { setView('feed'); }}>
              <img src={post.mediaPoster} alt={post.title} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                <p className="text-xs font-medium truncate">{post.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-green-400">{formatEuros(post.estimatedValue)}</span>
                  <div className="flex items-center space-x-1 text-xs"><Heart size={10} /><span>{post.likes}</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (view === 'create') {
    return (
      <div className="max-w-md mx-auto bg-black text-white h-screen">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <button onClick={() => setView('feed')}><ArrowLeft size={24} /></button>
          <h2 className="text-lg font-semibold">Nouvelle annonce</h2>
          <button className="text-green-400 font-semibold" onClick={handleCreate}>Publier</button>
        </div>
        <div className="p-4 space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-3">Type d'annonce</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className={`py-3 rounded-lg text-sm font-medium ${createForm.type === 'troc' ? 'bg-green-500 text-black' : 'bg-gray-800'}`} onClick={() => setCreateForm({ ...createForm, type: 'troc' })}>Je veux troquer</button>
              <button className={`py-3 rounded-lg text-sm font-medium ${createForm.type === 'service' ? 'bg-green-500 text-black' : 'bg-gray-800'}`} onClick={() => setCreateForm({ ...createForm, type: 'service' })}>Je propose un service</button>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-3">Ajouter un média</h3>
            <label className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center block cursor-pointer">
              <div className="flex justify-center space-x-4 mb-4">
                <div className="bg-gray-800 p-4 rounded-full"><Video size={24} /></div>
                <div className="bg-gray-800 p-4 rounded-full"><Camera size={24} /></div>
              </div>
              <p className="text-sm text-gray-400">Filme ou photographie ton objet</p>
              <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const url = URL.createObjectURL(file); setCreateForm({ ...createForm, file, poster: url }); }} />
            </label>
            {createForm.poster && (<div className="mt-3"><img src={createForm.poster} alt="aperçu" className="w-full h-64 object-cover rounded-lg" /></div>)}
          </div>
          <div className="space-y-3">
            <input className="w-full bg-gray-800 rounded-lg px-4 py-3 text-sm" placeholder="Titre de l'annonce" value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} />
            <textarea className="w-full bg-gray-800 rounded-lg px-4 py-3 text-sm resize-none" rows={3} placeholder="Description détaillée" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} />
            <select className="w-full bg-gray-800 rounded-lg px-4 py-3 text-sm" value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}>
              {CATEGORIES.filter((c) => c !== 'Tous').map((c) => (<option key={c}>{c}</option>))}
            </select>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2"><span className="text-sm font-semibold">Valeur estimée</span><span className="text-green-400 font-bold">{formatEuros(createForm.estimatedValue)}</span></div>
              <input type="range" min={0} max={2000} value={createForm.estimatedValue} onChange={(e) => setCreateForm({ ...createForm, estimatedValue: Number(e.target.value) })} className="w-full" />
            </div>
            {(() => { const check = moderateText(`${createForm.title} ${createForm.description}`); return check.ok ? (<div className="text-xs text-green-400 flex items-center space-x-2"><Check size={14} /><span>Contenu conforme</span></div>) : (<div className="text-xs text-yellow-400 flex items-center space-x-2"><Shield size={14} /><span>{check.reason}. Votre annonce sera vérifiée avant publication.</span></div>); })()}
          </div>
        </div>
      </div>
    )
  }

  if (view === 'messages') {
    return (
      <div className="max-w-md mx-auto bg-black text-white h-screen">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="text-lg font-semibold">Messages</div>
          <Bell />
        </div>
        <div className="p-2">
          {conversations.map((c) => {
            const u = users.find((x) => x.id === c.withUserId) || users[0]
            const last = c.messages[c.messages.length - 1]
            return (
              <div key={c.id} className="flex items-center justify-between p-3 border-b border-gray-900 cursor-pointer" onClick={() => { setShowChatWith(u.id); setView('chat'); }}>
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{u.avatar}</div>
                  <div>
                    <div className="text-sm font-semibold">{u.firstName} {u.lastName}</div>
                    <div className="text-xs text-gray-400 max-w-[180px] truncate">{last.text}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">{last.at}</div>
              </div>
            )
          })}
        </div>
        <BottomNav current={view} setCurrent={setView} onCreate={() => setView('create')} />
      </div>
    )
  }

  if (view === 'chat') {
    const conv = conversations[0]
    const withUser = users.find((u) => u.id === (showChatWith || conv.withUserId)) || users[0]
    return (
      <div className="max-w-md mx-auto bg-black text-white h-screen flex flex-col">
        <div className="bg-gray-900 p-4 flex items-center space-x-3 border-b border-gray-800">
          <button onClick={() => setView('feed')}><ArrowLeft size={24} /></button>
          <div className="text-2xl">{withUser.avatar}</div>
          <div className="flex-1">
            <h3 className="font-semibold">{withUser.firstName} {withUser.lastName}</h3>
            <div className="flex items-center space-x-2"><StarRating value={withUser.trust} /><span className="text-xs text-gray-400">{withUser.trades} trocs</span></div>
          </div>
          <MoreHorizontal size={24} />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {conv.messages.map((m) => {
            const mine = m.from === 'me'
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs rounded-2xl px-4 py-2 ${mine ? 'bg-green-500 text-black' : 'bg-gray-800 text-white'}`}>
                  <p className="text-sm">{m.text}</p>
                  <span className="text-[10px] opacity-70">{m.at}</span>
                </div>
              </div>
            )
          })}
          <div className="bg-gray-800 rounded-xl p-4 mt-4">
            <h4 className="text-sm font-semibold mb-3 text-green-400">Actions rapides</h4>
            <div className="space-y-2">
              <button className="w-full bg-green-500 text-black py-2 rounded-lg text-sm font-medium">Proposer un troc</button>
              <button className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm font-medium">Faire une offre d'achat</button>
              <button className="w-full bg-purple-500 text-white py-2 rounded-lg text-sm font-medium">Proposer un lieu de rencontre</button>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center space-x-2">
            <input className="flex-1 bg-gray-800 rounded-full px-4 py-2 text-sm" placeholder="Écris ton message..." />
            <button className="bg-green-500 rounded-full p-2"><Send size={16} /></button>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'profile') {
    const my = meUser || { firstName: 'Invité', lastName: '', trust: 4.2, trades: 0, city }
    const myPosts = posts.filter((p) => p.userId === (meUser?.id || 'u1'))
    const metrics = { convRate: 0.37, negTime: '2 j 4 h', completion: 0.62, watchTime: '18 s' }

    return (
      <div className="max-w-md mx-auto bg-black text-white min-h-screen">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="text-lg font-semibold">Profil</div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setView('settings')} className="bg-gray-800 p-2 rounded-lg"><Settings size={18} /></button>
            <button onClick={() => { setMe(null); setView('landing') }} className="bg-gray-800 p-2 rounded-lg"><LogOut size={18} /></button>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="text-5xl">🧑</div>
            <div>
              <div className="text-lg font-semibold">{my.firstName} {my.lastName}</div>
              <div className="text-sm text-gray-400 flex items-center space-x-2"><MapPin size={14} /><span>{locationMode === 'ville' ? my.city : `${my.city}, ${radiusKm} km`}</span></div>
              <StarRating value={my.trust} />
            </div>
            {(my as any).premium && <div className="ml-auto"><Crown className="text-yellow-400" /></div>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-black/40 border border-gray-800 rounded-xl p-3 text-center"><div className="text-2xl font-bold">{my.trades}</div><div className="text-xs text-gray-400">Trocs</div></div>
            <div className="bg-black/40 border border-gray-800 rounded-xl p-3 text-center"><div className="text-2xl font-bold">{Math.round(my.trust * 20)}%</div><div className="text-xs text-gray-400">Confiance</div></div>
            <div className="bg-black/40 border border-gray-800 rounded-xl p-3 text-center"><div className="text-2xl font-bold">{myPosts.length}</div><div className="text-xs text-gray-400">Annonces</div></div>
          </div>

          {/* Badge Roulette */}
          <div className="bg-gradient-to-r from-purple-900 to-pink-900 rounded-xl p-4 border border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">🎰 Trocs Roulette</div>
                <div className="text-xs text-gray-300">Tente ta chance !</div>
              </div>
              <button onClick={startTroqRoulette} className="bg-yellow-500 text-black px-3 py-2 rounded-lg font-bold text-sm hover:bg-yellow-400 transform hover:scale-105 transition-all">
                Lancer !
              </button>
            </div>
          </div>
        </div>
        <BottomNav current={view} setCurrent={setView} onCreate={() => setView('create')} />
      </div>
    )
  }

  return <div className="p-6">Écran inconnu</div>
}
