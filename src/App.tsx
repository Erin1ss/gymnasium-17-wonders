import { type CSSProperties, useEffect, useId, useRef, useState } from 'react'
import { chapters } from './content/chapters'
import { mediaCatalog } from './content/media'
import type { Chapter, MatchingInteraction, OrderedInteraction } from './content/types'
import { isCorrectInteraction } from './content/validation'
import { MOTION_KEY, readProgress, STORE_KEY } from './content/progress'

type Route = { page: 'intro' | 'map' | 'gallery' | 'about' | 'finale' | 'chapter'; id?: string }
const NARRATION_VOICE_KEY = 'gymnasium-17-wonders-narration-voice-v1'
const NARRATION_RATE_KEY = 'gymnasium-17-wonders-narration-rate-v1'
const places = [
  [6, 20], [18, 12], [30, 25], [42, 14], [54, 31], [67, 16], [82, 26], [91, 43], [77, 53],
  [62, 65], [47, 54], [34, 72], [19, 57], [8, 75], [26, 87], [54, 84], [78, 82],
]

function rankRussianVoices(voices: SpeechSynthesisVoice[]) {
  return voices.filter((voice) => voice.lang.toLowerCase().startsWith('ru')).sort((a, b) => {
    const score = (voice: SpeechSynthesisVoice) => {
      const name = voice.name.toLowerCase()
      return (voice.lang.toLowerCase() === 'ru-ru' ? 20 : 0)
        + (/natural|neural|premium|enhanced|online|google/i.test(name) ? 100 : 0)
        + (/\birina\b/i.test(name) ? 35 : 0)
        - (/compact|low quality/i.test(name) ? 40 : 0)
    }
    return score(b) - score(a)
  })
}

function readNarrationRate() {
  const saved = Number(localStorage.getItem(NARRATION_RATE_KEY))
  return Number.isFinite(saved) && saved >= 0.75 && saved <= 1.1 ? saved : 0.9
}

function routeFromHash(): Route {
  const bits = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  if (!bits.length || bits[0] === 'intro') return { page: 'intro' }
  if (bits[0] === 'chapter' && bits[1]) return { page: 'chapter', id: bits[1] }
  if (['map', 'gallery', 'about', 'finale'].includes(bits[0])) return { page: bits[0] as Route['page'] }
  return { page: 'intro' }
}

function App() {
  const [route, setRoute] = useState<Route>(routeFromHash)
  const [complete, setComplete] = useState<string[]>(readProgress)
  const [selected, setSelected] = useState<Chapter>(() => chapters.find((chapter) => !complete.includes(chapter.id)) ?? chapters[0])
  const [motion, setMotion] = useState(() => localStorage.getItem(MOTION_KEY) !== 'off')
  const [musicOn, setMusicOn] = useState(false)
  const [journalOpen, setJournalOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const audioContextRef = useRef<AudioContext | null>(null)
  const musicTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => localStorage.setItem(STORE_KEY, JSON.stringify(complete)), [complete])
  useEffect(() => {
    localStorage.setItem(MOTION_KEY, motion ? 'on' : 'off')
    document.documentElement.dataset.motion = motion ? 'on' : 'off'
  }, [motion])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3800)
    return () => window.clearTimeout(timer)
  }, [notice])
  useEffect(() => () => {
    if (musicTimerRef.current !== null) window.clearInterval(musicTimerRef.current)
    void audioContextRef.current?.close()
  }, [])

  const current = route.page === 'chapter' ? chapters.find((item) => item.id === route.id) : undefined
  const count = complete.length
  const go = (path: string) => { window.location.hash = path }
  const markComplete = (id: string) => {
    setComplete((old) => old.includes(id) ? old : [...old, id])
    const index = chapters.findIndex((chapter) => chapter.id === id)
    setSelected(chapters[(index + 1) % chapters.length])
  }
  const continueJourney = () => {
    if (!count) { go('/map'); return }
    const nextChapter = chapters.find((chapter) => !complete.includes(chapter.id))
    go(nextChapter ? `/chapter/${nextChapter.id}` : '/finale')
  }
  const toggleMusic = async () => {
    if (musicOn) {
      if (musicTimerRef.current !== null) window.clearInterval(musicTimerRef.current)
      musicTimerRef.current = null
      await audioContextRef.current?.suspend()
      setMusicOn(false)
      return
    }
    if (!window.AudioContext) { setNotice('В этом браузере не поддерживается фоновая музыка.'); return }
    try {
      const context = audioContextRef.current ?? new AudioContext()
      audioContextRef.current = context
      await context.resume()
      const melody = [392, 523.25, 659.25, 587.33, 440, 523.25, 392, 329.63]
      let note = 0
      const playChime = () => {
        if (context.state !== 'running') return
        const now = context.currentTime
        const oscillator = context.createOscillator()
        const envelope = context.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(melody[note % melody.length], now)
        envelope.gain.setValueAtTime(.0001, now)
        envelope.gain.exponentialRampToValueAtTime(.018, now + .08)
        envelope.gain.exponentialRampToValueAtTime(.0001, now + .72)
        oscillator.connect(envelope)
        envelope.connect(context.destination)
        oscillator.start(now)
        oscillator.stop(now + .74)
        note += 1
      }
      playChime()
      musicTimerRef.current = window.setInterval(playChime, 780)
      setMusicOn(true)
    } catch { setNotice('Не получилось включить музыку в этом браузере.') }
  }
  const share = async () => {
    const url = window.location.href.split('#')[0]
    try {
      await navigator.clipboard.writeText(url)
      setNotice('Ссылка на путешествие скопирована.')
    } catch { setNotice(url) }
  }
  const reset = () => {
    setComplete([])
    setResetOpen(false)
    setNotice('Журнал путешествия очищен.')
    go('/intro')
  }

  return (
    <div className={`app-shell${motion ? '' : ' motion-off'}`}>
      <header className="site-header">
        <a className="brand" href="#/intro" aria-label="Гимназия 122 — на главную">
          <CityEmblem />
          <span><b>Гимназия 122</b><small>город 17 чудес</small></span>
        </a>
        <nav className="main-nav" aria-label="Основная навигация">
          <a aria-current={route.page === 'map' || route.page === 'chapter' ? 'page' : undefined} href="#/map">Путешествие</a>
          <a aria-current={route.page === 'gallery' ? 'page' : undefined} href="#/gallery">Фото класса</a>
        </nav>
        <div className="header-tools">
          <button className="progress-chip" onClick={() => setJournalOpen(true)} aria-label={`Открыть коллекцию: собрано ${count} из 17 символов`}>
            <span className="progress-number">{count}<small> / 17</small></span><span className="progress-label">символов</span>
            <span className="progress-track"><i style={{ width: `${(count / 17) * 100}%` }} /></span>
          </button>
        </div>
      </header>

      <main id="main-content">
        {route.page === 'intro' && <Intro onStart={continueJourney} progress={count} nextChapter={chapters.find((chapter) => !complete.includes(chapter.id))?.value} />}
        {route.page === 'map' && <MapPage complete={complete} selected={selected} onSelect={setSelected} onOpen={(chapter) => go(`/chapter/${chapter.id}`)} onFinish={() => go('/finale')} />}
        {route.page === 'chapter' && current && <ChapterPage chapter={current} complete={complete.includes(current.id)} onBack={() => go('/map')} onComplete={() => markComplete(current.id)} onChapter={(id) => go(`/chapter/${id}`)} />}
        {route.page === 'chapter' && !current && <EmptyRoute onMap={() => go('/map')} />}
        {route.page === 'gallery' && <Gallery />}
        {route.page === 'about' && <About />}
        {route.page === 'finale' && (count === 17 ? <Finale onAgain={reset} /> : <FinaleLocked complete={count} onMap={() => go('/map')} />)}
      </main>

      <footer className="site-footer">
        <span>9А · гимназия № 122 имени Ж. А. Зайцевой · Казань</span>
        <a className="text-button" href="#/about">О проекте</a>
        <button className="text-button" onClick={() => setMotion((value) => !value)} aria-pressed={!motion}>
          {motion ? 'Отключить анимацию' : 'Включить анимацию'}
        </button>
        <button className="text-button sound-toggle" onClick={toggleMusic} aria-pressed={musicOn}>{musicOn ? 'Выключить музыку' : 'Включить музыку'}</button>
        <button className="text-button" onClick={share}>Поделиться ссылкой</button>
      </footer>

      {journalOpen && <Journal complete={complete} motion={motion} onMotion={() => setMotion((value) => !value)} onClose={() => setJournalOpen(false)} onOpen={(id) => { setJournalOpen(false); go(`/chapter/${id}`) }} onReset={() => { setJournalOpen(false); setResetOpen(true) }} />}
      {resetOpen && <ConfirmDialog title="Начать путь заново?" body="В журнале снова погаснут отметки о пройденных главах. Истории останутся доступны." onCancel={() => setResetOpen(false)} onConfirm={reset} />}
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  )
}

function CityEmblem() {
  return <img className="city-emblem" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
}
function Intro({ onStart, progress, nextChapter }: { onStart: () => void; progress: number; nextChapter?: string }) {
  return <section className="intro-screen">
    <div className="intro-art"><img className="hero-image" src={`${import.meta.env.BASE_URL}images/city-map.webp`} alt="" /></div>
    <div className="intro-copy">
      <p className="eyebrow">Интерактивная сказка · Казань</p>
      <h1>Гимназия 122 <em>— город 17 чудес</em></h1>
      <p className="project-motto">Мечтай! Действуй! Россия начинается с нас</p>
      <p className="intro-text">Однажды гимназия стала волшебным городом, и 17 чудес начали гаснуть. Помоги 9А вернуть им свет своими решениями.</p>
      <div className="intro-actions"><button className="button button-primary" onClick={onStart}>{progress === 0 ? 'Начать путешествие' : progress === 17 ? 'Посмотреть финал' : `Продолжить · ${nextChapter ?? 'следующая глава'}`} <span aria-hidden="true">→</span></button></div>
    </div>
    <div className="intro-city-name"><span>9А · гимназия № 122</span><span>Казань · 17 чудес</span></div>
  </section>
}

function CityIllustration() {
  return <svg className="city-illustration" viewBox="0 0 1100 700" role="img" aria-label="Ночной сказочный город на берегу реки, где огни начинают возвращаться">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0.8" y2="1"><stop stopColor="#071522"/><stop offset="1" stopColor="#102b3b"/></linearGradient><linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#143746"/><stop offset="1" stopColor="#071a28"/></linearGradient><radialGradient id="moon"><stop stopColor="#f3c77c" stopOpacity=".5"/><stop offset="1" stopColor="#f3c77c" stopOpacity="0"/></radialGradient></defs>
    <rect width="1100" height="700" fill="url(#sky)"/><circle cx="826" cy="160" r="180" fill="url(#moon)"/><circle cx="826" cy="160" r="48" fill="#f3d69f" opacity=".88"/>
    <g fill="#f6ddaa" opacity=".72"><circle cx="80" cy="92" r="2"/><circle cx="224" cy="164" r="1.5"/><circle cx="410" cy="70" r="2"/><circle cx="553" cy="132" r="1"/><circle cx="989" cy="76" r="2"/><circle cx="716" cy="52" r="1.5"/><circle cx="938" cy="262" r="1"/></g>
    <path d="M0 408Q160 350 287 400T558 385Q745 341 1100 394V700H0Z" fill="#0b1d29"/><path d="M0 458Q167 420 310 450T587 435Q807 400 1100 453V700H0Z" fill="url(#water)"/>
    <path d="M0 510Q202 468 369 505T704 485Q900 455 1100 497" fill="none" stroke="#4f8d8a" strokeWidth="2" opacity=".35"/><path d="M0 582Q205 545 401 582T790 560Q957 536 1100 565" fill="none" stroke="#e7ad66" strokeWidth="1.5" opacity=".3"/>
    <g fill="#173548" stroke="#c48a55" strokeWidth="2" strokeLinejoin="round">
      <path d="M95 401V267l54-45 55 45v134z"/><path d="M108 266l41-62 41 62z"/><path d="M123 402V325h50v77z"/><path d="M258 399V292l69-55 69 55v107z"/><path d="M281 291l46-73 46 73z"/><path d="M298 399V323h59v76z"/>
      <path d="M440 389V247h62V389z"/><path d="M432 248l39-101 39 101z"/><path d="M594 391V291l61-44 61 44v100z"/><path d="M615 290l40-67 40 67z"/>
      <path d="M786 393V250l61-50 61 50v143z"/><path d="M805 250l42-84 42 84z"/><path d="M940 400V307l63-43 63 43v93z"/><path d="M958 307l45-69 45 69z"/>
    </g>
    <g fill="#f4b866"><rect x="128" y="299" width="10" height="15"/><rect x="164" y="299" width="10" height="15"/><rect x="306" y="281" width="11" height="16"/><rect x="347" y="281" width="11" height="16"/><rect x="461" y="282" width="11" height="17"/><rect x="616" y="313" width="10" height="14"/><rect x="669" y="313" width="10" height="14"/><rect x="828" y="275" width="11" height="15"/><rect x="981" y="331" width="12" height="16"/></g>
    <path d="M0 426Q131 408 241 429T479 421M562 423Q721 397 841 422T1100 419" fill="none" stroke="#d9aa6f" strokeWidth="3" opacity=".55"/>
    <g className="light-dots" fill="#ffd48a"><circle cx="150" cy="230" r="5"/><circle cx="327" cy="235" r="5"/><circle cx="470" cy="149" r="5"/><circle cx="655" cy="224" r="5"/><circle cx="847" cy="162" r="5"/><circle cx="1003" cy="264" r="5"/></g>
    <g fill="none" stroke="#e6b575" strokeWidth="1" opacity=".7"><path d="M476 175l16 16-16 16-16-16z"/><path d="M170 155l11 11-11 11-11-11z"/><path d="M700 317l10 10-10 10-10-10z"/></g>
  </svg>
}

function MapConstellation({ mobile = false }: { mobile?: boolean }) {
  const route = places.map(([left, top], index) => `${index ? 'L' : 'M'} ${left} ${top}`).join(' ')
  return <svg className={`map-constellation${mobile ? ' mobile-constellation' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <path className="constellation-halo" d={route} />
    <path className="constellation-route" d={route} />
    {places.map(([left, top], index) => <circle className={`constellation-star${index % 3 === 0 ? ' is-bright' : ''}`} key={`${left}-${top}`} cx={left} cy={top} r={index % 3 === 0 ? 1 : .62} style={{ '--star-delay': `${index * 90}ms` } as CSSProperties} />)}
  </svg>
}

function MapPage({ complete, selected, onSelect, onOpen, onFinish }: { complete: string[]; selected: Chapter; onSelect: (chapter: Chapter) => void; onOpen: (chapter: Chapter) => void; onFinish: () => void }) {
  const nextChapter = chapters.find((chapter) => !complete.includes(chapter.id))
  return <section className="page map-page">
    <div className="page-heading map-heading"><div><p className="eyebrow">Собрано {complete.length} из 17 символов</p><h1>Город ждёт тебя</h1><p><span className="map-desktop-hint">Нажми на огонь, чтобы открыть сказку.</span><span className="map-mobile-hint">Начни с первого чуда или выбери историю ниже.</span></p></div>{nextChapter ? <button className="button button-primary map-start" onClick={() => onOpen(nextChapter)}>{complete.length ? 'Продолжить путь' : 'Начать с первого чуда'} <span aria-hidden="true">→</span></button> : <button className="button button-primary map-start" onClick={onFinish}>Посмотреть финал <span aria-hidden="true">→</span></button>}</div>
    <div className="mobile-city-art"><img src={`${import.meta.env.BASE_URL}images/city-map.webp`} alt="Волшебный город на берегу реки" /><MapConstellation mobile />{chapters.map((chapter, index) => {
      const [left, top] = places[index]
      return <button key={chapter.id} type="button" title={`${String(index + 1).padStart(2, '0')} · ${chapter.value}`} className={`map-marker mobile-map-marker ${complete.includes(chapter.id) ? 'is-restored' : ''}`} style={{ left: `${Math.max(left, 7)}%`, top: `${top}%`, '--accent': chapter.accent, '--marker-delay': `${(index % 6) * 70}ms` } as CSSProperties} onClick={() => onOpen(chapter)} aria-label={`Открыть чудо ${index + 1}: ${chapter.place}. Ценность: ${chapter.value}${complete.includes(chapter.id) ? '. Символ уже собран' : ''}`}>
        <span className="marker-number">{String(index + 1).padStart(2, '0')}</span>
      </button>
    })}</div>
    <div className="map-layout">
      <div className="map-scroll" aria-label="Волшебная карта города с семнадцатью огнями">
        <div className="map-canvas">
          <img className="map-image" src={`${import.meta.env.BASE_URL}images/city-map.webp`} alt="" />
          <MapConstellation />
          {chapters.map((chapter, index) => {
            const [left, top] = places[index]
            return <button key={chapter.id} type="button" title={`${String(index + 1).padStart(2, '0')} · ${chapter.value}`} className={`map-marker ${selected.id === chapter.id ? 'is-selected' : ''} ${complete.includes(chapter.id) ? 'is-restored' : ''}`} style={{ left: `${left}%`, top: `${top}%`, '--accent': chapter.accent, '--marker-delay': `${(index % 6) * 70}ms` } as CSSProperties} onMouseEnter={() => onSelect(chapter)} onFocus={() => onSelect(chapter)} onClick={() => onOpen(chapter)} aria-label={`Открыть чудо ${index + 1}: ${chapter.place}. Ценность: ${chapter.value}${complete.includes(chapter.id) ? '. Символ уже собран' : ''}`}>
              <span className="marker-number">{String(index + 1).padStart(2, '0')}</span><span className="marker-dot" aria-hidden="true" />
            </button>
          })}
          <div className="map-legend"><span><i /> впереди</span><span><i className="legend-lit" /> пройдено</span></div>
        </div>
      </div>
      <aside className="place-preview" aria-live="polite">
      <div className="preview-art" style={{ '--accent': selected.accent } as CSSProperties}><StoryIllustration id={selected.id} small /></div>
        <p className="eyebrow">Чудо {String(chapters.indexOf(selected) + 1).padStart(2, '0')} из 17</p><h2>{selected.value}</h2><p className="preview-place">{selected.place}</p><p className="preview-summary">{selected.summary}</p>
        <div className="preview-bottom"><span className={`status-dot ${complete.includes(selected.id) ? 'restored' : ''}`} />{complete.includes(selected.id) ? 'Пройдено' : 'Готово к началу'}<button className="button button-primary button-small" onClick={() => onOpen(selected)}>{complete.includes(selected.id) ? 'Повторить' : 'Открыть чудо'} <span aria-hidden="true">→</span></button></div>
      </aside>
    </div>
    <section className="chapter-index" aria-labelledby="chapter-index-title"><div className="section-heading"><div><p className="eyebrow">Выбери маршрут</p><h2 id="chapter-index-title">Все 17 чудес</h2></div><p>Иллюстрация, название и один шаг до истории.</p></div><div className="chapter-card-grid">{chapters.map((chapter, index) => <button type="button" className="chapter-card" key={chapter.id} style={{ '--accent': chapter.accent, '--card-index': index } as CSSProperties} onClick={() => onOpen(chapter)} aria-label={`Открыть чудо ${index + 1}: ${chapter.value}, ${chapter.place}${complete.includes(chapter.id) ? ', символ собран' : ''}`}>
      <span className="chapter-card-art" aria-hidden="true"><StoryIllustration id={chapter.id} small /></span><span className="chapter-card-copy"><small>{String(index + 1).padStart(2, '0')} {complete.includes(chapter.id) ? '· пройдено' : '· чудо'}</small><b>{chapter.value}</b><span>{chapter.place}</span></span><span className="chapter-card-arrow" aria-hidden="true">→</span>
    </button>)}</div></section>
  </section>
}

function ChapterPage({ chapter, complete, onBack, onComplete, onChapter }: { chapter: Chapter; complete: boolean; onBack: () => void; onComplete: () => void; onChapter: (id: string) => void }) {
  const index = chapters.indexOf(chapter)
  const [feedback, setFeedback] = useState('')
  const [passed, setPassed] = useState(complete)
  const [choice, setChoice] = useState<number | null>(null)
  const [order, setOrder] = useState<number[]>([])
  const [matches, setMatches] = useState<number[]>([])
  const [narrationOn, setNarrationOn] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceURI, setVoiceURI] = useState(() => localStorage.getItem(NARRATION_VOICE_KEY) ?? 'auto')
  const [narrationRate, setNarrationRate] = useState(readNarrationRate)
  const ordered = chapter.interaction.type === 'sequence' || chapter.interaction.type === 'assemble' ? chapter.interaction : null
  useEffect(() => { setFeedback(''); setPassed(complete); setChoice(null); setOrder([]); setMatches([]) }, [chapter.id, complete])
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const updateVoices = () => setVoices(rankRussianVoices(window.speechSynthesis.getVoices()))
    updateVoices()
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', updateVoices)
  }, [])
  useEffect(() => {
    setNarrationOn(false)
    return () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel() }
  }, [chapter.id])

  const selectedVoice = voices.find((voice) => voice.voiceURI === voiceURI) ?? voices[0]
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ru-RU'
    utterance.rate = narrationRate
    utterance.pitch = 1
    utterance.volume = .96
    if (selectedVoice) utterance.voice = selectedVoice
    utterance.onend = () => setNarrationOn(false)
    utterance.onerror = () => setNarrationOn(false)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    setNarrationOn(true)
  }

  const toggleNarration = () => {
    if (!('speechSynthesis' in window)) return
    if (narrationOn) { window.speechSynthesis.cancel(); setNarrationOn(false); return }
    speakText(`${chapter.place}… ${chapter.story}`)
  }

  const previewNarration = () => speakText('В городе чудес каждый добрый поступок возвращает свет.')
  const chooseVoice = (value: string) => { setVoiceURI(value); localStorage.setItem(NARRATION_VOICE_KEY, value) }
  const chooseRate = (value: string) => { const rate = Number(value); setNarrationRate(rate); localStorage.setItem(NARRATION_RATE_KEY, String(rate)) }

  const checkChoice = () => {
    if (choice === null) { setFeedback('Сначала выбери ответ.'); return }
    const correct = isCorrectInteraction(chapter.interaction, choice)
    if (correct) { setPassed(true); onComplete(); setFeedback(chapter.interaction.success) }
    else setFeedback('Подумай о последствиях для каждого. Можно попробовать ещё раз.')
  }
  const checkOrder = () => {
    if (!ordered) return
    const answer = order.length ? order : ordered.items.map((_, index) => index)
    if (answer.length !== ordered.items.length) { setFeedback('Расставь все шаги, чтобы проверить последовательность.'); return }
    if (isCorrectInteraction(chapter.interaction, answer)) { setPassed(true); onComplete(); setFeedback(ordered.success) }
    else setFeedback('Не торопись: какой шаг делает следующий безопасным и понятным?')
  }
  const checkMatches = () => {
    const data = chapter.interaction as MatchingInteraction
    if (matches.length !== data.pairs.length || matches.some((item) => item === -1)) { setFeedback('Найди пару для каждой подсказки.'); return }
    if (isCorrectInteraction(chapter.interaction, matches)) { setPassed(true); onComplete(); setFeedback(data.success) }
    else setFeedback('Некоторые пары ещё не сошлись. Попробуй снова.')
  }
  const moveItem = (from: number, direction: -1 | 1) => setOrder((old) => {
    const list = old.length ? [...old] : (ordered?.items.map((_, i) => i) ?? [])
    const to = Math.max(0, Math.min(list.length - 1, from + direction))
    ;[list[from], list[to]] = [list[to], list[from]]
    return list
  })
  const prev = chapters[(index - 1 + chapters.length) % chapters.length]
  const next = chapters[(index + 1) % chapters.length]
  return <section className="page chapter-page">
    <div className="chapter-topline"><button className="back-link" onClick={onBack}><span aria-hidden="true">←</span> Все чудеса</button><span className="chapter-count">{String(index + 1).padStart(2, '0')} из 17</span></div>
    <div className="chapter-grid">
      <div className="chapter-story">
        <p className="eyebrow" style={{ color: chapter.accent }}>{chapter.place}</p><h1>{chapter.value}</h1>
        <div className="story-art" style={{ '--accent': chapter.accent } as CSSProperties}><StoryIllustration id={chapter.id} /></div>
        <p className="chapter-summary">{chapter.summary}</p>
        <div className="chapter-reading"><blockquote className="value-note"><span>В этой главе</span>{chapter.meaning}</blockquote><div className="story-tools"><details className="story-details"><summary>Прочитать сказку целиком</summary><div className="story-copy"><p>{chapter.story}</p></div></details>{'speechSynthesis' in window && <><button className="button button-outline narration-button" onClick={toggleNarration} aria-pressed={narrationOn}>{narrationOn ? 'Остановить озвучку' : 'Послушать сказку'} <span aria-hidden="true">{narrationOn ? 'Ⅱ' : '♪'}</span></button><details className="narration-settings"><summary>Настроить звучание <span aria-hidden="true">⌄</span></summary><div className="narration-settings-content">
          {voices.length > 1 ? <label className="narration-voice-control"><span>Голос</span><select value={voices.some((voice) => voice.voiceURI === voiceURI) ? voiceURI : 'auto'} onChange={(event) => chooseVoice(event.target.value)}><option value="auto">Автовыбор · {voices[0].name}</option>{voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} · {voice.lang}</option>)}</select></label> : <p className="narration-voice-note">{voices.length === 1 ? `Русский голос: ${voices[0].name}.` : 'Используется русский голос, доступный в браузере.'}</p>}
          <label className="narration-rate-control"><span><b>Темп речи</b><output>{narrationRate.toFixed(2).replace('.', ',')}×</output></span><input type="range" min="0.75" max="1.1" step="0.05" value={narrationRate} onChange={(event) => chooseRate(event.target.value)} /></label>
          <button className="text-button narration-preview" onClick={previewNarration}>Послушать пример <span aria-hidden="true">♪</span></button>
          <p className="narration-settings-note">Автовыбор предпочитает более естественные русские голоса. Настройка сохраняется на этом устройстве.</p>
        </div></details></>}</div></div>
      </div>
      <aside className="challenge-panel">
        <p className="eyebrow">Твой ход</p><h2>{chapter.challenge}</h2>
        <InteractionBox chapter={chapter} choice={choice} setChoice={setChoice} order={order} matches={matches} setMatches={setMatches} moveItem={moveItem} onChoiceCheck={checkChoice} onOrderCheck={checkOrder} onMatchCheck={checkMatches} feedback={feedback} passed={passed} />
        {passed && <p className="real-life-note"><span aria-hidden="true">✦</span> Символ собран. Примеры из жизни — ниже.</p>}
        <div className="chapter-nav"><button onClick={() => onChapter(prev.id)}><small>← предыдущая глава</small><b>{prev.value}</b></button><button onClick={() => onChapter(next.id)}><small>следующая глава →</small><b>{next.value}</b></button></div>
      </aside>
    </div>
    {passed && <RealLifeConnection chapter={chapter} />}
    <a className="chapter-gallery-link" href="#/gallery">Посмотреть фотографии класса <span aria-hidden="true">→</span></a>
  </section>
}

function RealLifeConnection({ chapter }: { chapter: Chapter }) {
  const photos = mediaCatalog.filter((item) => item.status === 'approved' && item.src && chapter.relatedMediaIds?.includes(item.id))
  return <section className="real-life-panel" aria-labelledby="real-life-title">
    <div className="real-life-heading">
      <div className="symbol-token" style={{ '--accent': chapter.accent } as CSSProperties}><StoryIllustration id={chapter.id} small /><span aria-hidden="true">✦</span></div>
      <div><p className="eyebrow">Символ собран</p><h2 id="real-life-title">{chapter.value}</h2><p>Чудо возвращается в город.</p></div>
    </div>
    <div className="real-life-example"><p className="eyebrow">Как ценность проявляется в жизни</p><p>{chapter.realLifeExample}</p></div>
    {photos.length > 0 ? <div className="real-life-photos"><p className="eyebrow">Публикации класса · 2025 год, 8А</p><div className="real-life-photo-grid">{photos.map((photo) => <article className="real-life-photo" key={photo.id}>
      <img src={photo.src ?? undefined} alt={photo.alt} loading="lazy" />
      <div><p>{photo.caption}</p><a href={photo.sourceUrl} target="_blank" rel="noreferrer">Публикация гимназии · {photo.sourceDate} <span aria-hidden="true">↗</span></a></div>
    </article>)}</div></div> : <div className="real-life-gallery-link"><p>Примеры выше — идеи для школьной жизни. В галерее собраны проверенные события 9А с подписями и источниками.</p><a className="text-link" href="#/gallery">Открыть фотогалерею класса <span aria-hidden="true">→</span></a></div>}
  </section>
}

function InteractionBox({ chapter, choice, setChoice, order, matches, setMatches, moveItem, onChoiceCheck, onOrderCheck, onMatchCheck, feedback, passed }: {
  chapter: Chapter; choice: number | null; setChoice: (value: number) => void; order: number[]; matches: number[]; setMatches: (value: number[]) => void; moveItem: (from: number, direction: -1 | 1) => void; onChoiceCheck: () => void; onOrderCheck: () => void; onMatchCheck: () => void; feedback: string; passed: boolean
}) {
  const item = chapter.interaction
  if (item.type === 'choice' || item.type === 'dialogue') {
    const offset = chapters.indexOf(chapter) % item.options.length
    const options = item.options.map((text, sourceIndex) => ({ text, sourceIndex })).map((_, i, arr) => arr[(i + offset) % arr.length])
    return <div className="interaction-body">
      {item.lines?.map((line) => <p className="dialogue-line" key={line}>{line}</p>)}<p className="interaction-prompt">{item.prompt}</p>
      <div className="choice-list" role="radiogroup" aria-label={item.prompt}>{options.map(({ text, sourceIndex }) => <button key={sourceIndex} className={`choice-option ${choice === sourceIndex ? 'chosen' : ''}`} role="radio" aria-checked={choice === sourceIndex} onClick={() => setChoice(sourceIndex)}><span className="choice-mark" />{text}</button>)}</div>
      <button className="button button-primary check-button" onClick={onChoiceCheck}>{passed ? 'Перечитать решение' : 'Проверить решение'}</button>
      <Feedback text={feedback} passed={passed} />
    </div>
  }
  if (item.type === 'sequence' || item.type === 'assemble') {
    const data = item as OrderedInteraction
    const display = order.length ? order : data.items.map((_, i) => i)
    return <div className="interaction-body"><p className="interaction-prompt">{item.prompt}</p><ol className="order-list">{display.map((source, pos) => <li key={source}><span className="order-index">{String(pos + 1).padStart(2, '0')}</span><span>{data.items[source]}</span><div className="move-controls"><button onClick={() => moveItem(pos, -1)} disabled={pos === 0} aria-label={`Переместить шаг ${pos + 1} выше`}>↑</button><button onClick={() => moveItem(pos, 1)} disabled={pos === display.length - 1} aria-label={`Переместить шаг ${pos + 1} ниже`}>↓</button></div></li>)}</ol><button className="button button-primary check-button" onClick={onOrderCheck}>{passed ? 'Решение записано' : 'Проверить порядок'}</button><Feedback text={feedback} passed={passed} /></div>
  }
  if (item.type === 'matching') {
    const data = item as MatchingInteraction
    const options = data.pairs.map((pair) => pair.right)
    return <div className="interaction-body"><p className="interaction-prompt">{item.prompt}</p><div className="matching-list">{data.pairs.map((pair, i) => <label key={pair.left}><span>{pair.left}</span><select aria-label={`Пара для: ${pair.left}`} value={matches[i] ?? -1} onChange={(event) => { const next = Array.from({ length: data.pairs.length }, (_, n) => matches[n] ?? -1); next[i] = Number(event.target.value); setMatches(next) }}><option value={-1}>Выбрать пару</option>{options.map((option, j) => <option key={option} value={j}>{option}</option>)}</select></label>)}</div><button className="button button-primary check-button" onClick={onMatchCheck}>{passed ? 'Пары найдены' : 'Проверить пары'}</button><Feedback text={feedback} passed={passed} /></div>
  }
  return null
}
function Feedback({ text, passed }: { text: string; passed: boolean }) { return text ? <p className={`interaction-feedback ${passed ? 'is-good' : ''}`} role="status">{passed && <span aria-hidden="true">✦ </span>}{text}</p> : null }

function DistrictBackdrop({ id }: { id: string }) {
  switch (id) {
    case 'life': return <g className="district-scene"><path d="M108 254V171a212 212 0 0 1 424 0v83M154 254V184a166 166 0 0 1 332 0v70" fill="none" stroke="#9bc9b1" strokeOpacity=".24" strokeWidth="8"/><path d="M320 49v208M110 168h420M182 94l138 78 138-78" fill="none" stroke="#9bc9b1" strokeOpacity=".18" strokeWidth="3"/><path d="M98 259h444" stroke="#a8cfb9" strokeOpacity=".3" strokeWidth="4"/></g>
    case 'dignity': return <g className="district-scene"><path d="M74 250V146a246 246 0 0 1 492 0v104M116 250V155a204 204 0 0 1 408 0v95" fill="none" stroke="#e1b99e" strokeOpacity=".28" strokeWidth="10"/><path d="M74 217h492M105 250h430" stroke="#e1b99e" strokeOpacity=".24" strokeWidth="5"/><path d="M160 160v82m320-82v82" stroke="#e1b99e" strokeOpacity=".22" strokeWidth="8"/></g>
    case 'rights-freedoms': return <g className="district-scene"><path d="M102 259V136a218 218 0 0 1 436 0v123" fill="none" stroke="#9ecde0" strokeOpacity=".27" strokeWidth="12"/><path d="M320 72v187m-146-69h292" stroke="#9ecde0" strokeOpacity=".22" strokeWidth="5"/><path d="M103 258h100v-82h-51m385 82H437v-82h51" fill="#a3d9eb" fillOpacity=".08" stroke="#a3d9eb" strokeOpacity=".32" strokeWidth="3"/></g>
    case 'patriotism': return <g className="district-scene"><path d="M0 211q104-60 216 0t208 0q108-61 216 0v80H0z" fill="#36758a" fillOpacity=".35"/><path d="M0 244q96-42 190 0t186 0q122-48 264 0v48H0z" fill="#74b2b2" fillOpacity=".22"/><path d="M0 292q134-35 268 0t372 0" fill="none" stroke="#f2d99c" strokeOpacity=".4" strokeWidth="4"/></g>
    case 'citizenship': return <g className="district-scene"><path d="M105 246h430M132 241V142l188-74 188 74v99" fill="#5d7880" fillOpacity=".18" stroke="#b8c9b0" strokeOpacity=".28" strokeWidth="7"/><path d="M182 238V147m69 91V123m138 115V123m69 115v-91" stroke="#b8c9b0" strokeOpacity=".25" strokeWidth="9"/><path d="M114 252h412" stroke="#e9d9b9" strokeOpacity=".22" strokeWidth="5"/></g>
    case 'service-country': return <g className="district-scene"><path d="M156 259V124l44-38h240l44 38v135" fill="#a5bfd0" fillOpacity=".1" stroke="#b6d3dd" strokeOpacity=".32" strokeWidth="6"/><path d="M185 259V142h270v117M303 86V61h34v25" fill="none" stroke="#b6d3dd" strokeOpacity=".3" strokeWidth="6"/><path d="M140 260h360" stroke="#e1d9be" strokeOpacity=".25" strokeWidth="5"/></g>
    case 'ideals': return <g className="district-scene"><path d="M180 259v-62a140 140 0 0 1 280 0v62" fill="#b8a2d3" fillOpacity=".12" stroke="#c6b9ed" strokeOpacity=".3" strokeWidth="6"/><path d="M165 259h310M215 222h210M250 198h140" stroke="#c6b9ed" strokeOpacity=".24" strokeWidth="4"/><path d="M206 196a114 114 0 0 1 228 0" fill="none" stroke="#c6b9ed" strokeOpacity=".3" strokeWidth="5"/></g>
    case 'family': return <g className="district-scene"><path d="M82 256v-95l88-65 89 65v95m48 0v-95l88-65 89 65v95" fill="#d6aa82" fillOpacity=".12" stroke="#e2bf98" strokeOpacity=".3" strokeWidth="6"/><path d="M111 159h119m79 0h119M145 119v26m119-26v26m79-26v26" stroke="#e2bf98" strokeOpacity=".25" strokeWidth="4"/><path d="M78 257h410" stroke="#e2bf98" strokeOpacity=".25" strokeWidth="5"/></g>
    case 'creative-work': return <g className="district-scene"><path d="M38 234h564M70 233v-61m500 61v-61M70 172q250 220 500 0" fill="none" stroke="#dfb266" strokeOpacity=".32" strokeWidth="8"/><path d="M96 171l70 62m68-44 63 44m68-44 62 44m68-62-70 62" stroke="#dfb266" strokeOpacity=".25" strokeWidth="5"/><path d="M40 257h560" stroke="#e6d2a3" strokeOpacity=".23" strokeWidth="5"/></g>
    case 'spiritual-priority': return <g className="district-scene"><path d="M110 251v-74a210 210 0 0 1 420 0v74" fill="none" stroke="#efc979" strokeOpacity=".26" strokeWidth="7"/><path d="M145 251v-57m350 57v-57M178 251v-38m284 38v-38" stroke="#efc979" strokeOpacity=".24" strokeWidth="6"/><path d="M88 254h466" stroke="#efc979" strokeOpacity=".28" strokeWidth="5"/></g>
    case 'humanism': return <g className="district-scene"><path d="M66 247h508M99 241v-94l221-82 221 82v94" fill="#add0d0" fillOpacity=".1" stroke="#add0d0" strokeOpacity=".29" strokeWidth="6"/><path d="M144 240v-54m88 54v-83m176 83v-83m88 83v-54" stroke="#add0d0" strokeOpacity=".25" strokeWidth="6"/><path d="M112 154h416" stroke="#add0d0" strokeOpacity=".24" strokeWidth="4"/></g>
    case 'mercy': return <g className="district-scene"><path d="M103 257v-91l217-92 217 92v91" fill="#c8c6b1" fillOpacity=".12" stroke="#d3d7c6" strokeOpacity=".28" strokeWidth="7"/><path d="M154 255v-68m110 68v-91m112 91v-91m111 91v-68" stroke="#d3d7c6" strokeOpacity=".25" strokeWidth="7"/><path d="M88 259h464" stroke="#d3d7c6" strokeOpacity=".28" strokeWidth="5"/></g>
    case 'justice': return <g className="district-scene"><path d="M93 255V139h454v116M72 256h496M122 144v107m78-107v107m118-107v107m78-107v107m78-107v107" fill="none" stroke="#d7b881" strokeOpacity=".3" strokeWidth="7"/><path d="M82 137l238-70 238 70" fill="#d7b881" fillOpacity=".12" stroke="#d7b881" strokeOpacity=".34" strokeWidth="6"/></g>
    case 'collectivism': return <g className="district-scene"><path d="M100 240q0-100 220-100t220 100" fill="none" stroke="#d5a6c6" strokeOpacity=".26" strokeWidth="8"/><path d="M124 222q0-58 196-58t196 58M149 205q0-28 171-28t171 28" fill="none" stroke="#d5a6c6" strokeOpacity=".22" strokeWidth="6"/><path d="M76 258h488" stroke="#d5a6c6" strokeOpacity=".28" strokeWidth="5"/></g>
    case 'mutual-respect': return <g className="district-scene"><path d="M0 207q82-51 160 0t160 0q78-51 160 0t160 0v85H0z" fill="#3a7184" fillOpacity=".34"/><path d="M54 246h532m-490-3v-85m406 85v-85m-406 0q203 195 406 0" fill="none" stroke="#d8c78f" strokeOpacity=".3" strokeWidth="7"/><path d="M0 283q146-27 290 0t350 0" fill="none" stroke="#8cc6c3" strokeOpacity=".36" strokeWidth="5"/></g>
    case 'memory-generations': return <g className="district-scene"><path d="M90 258V87h460v171" fill="#d1bb88" fillOpacity=".09" stroke="#d1bb88" strokeOpacity=".3" strokeWidth="6"/><path d="M132 239V121h67v118m38 0V104h67v135m38 0V104h67v135m38 0V121h67v118" fill="#d1bb88" fillOpacity=".12" stroke="#d1bb88" strokeOpacity=".25" strokeWidth="4"/><path d="M74 259h500" stroke="#d1bb88" strokeOpacity=".25" strokeWidth="5"/></g>
    case 'unity-peoples': return <g className="district-scene"><path d="M56 250V156h116v94m72 0V111h142v139m72 0v-94h116v94" fill="#d2b891" fillOpacity=".1" stroke="#d2b891" strokeOpacity=".3" strokeWidth="6"/><path d="M56 156l58-52 58 52m72-45 71-62 71 62m72 45 58-52 58 52" fill="none" stroke="#d2b891" strokeOpacity=".34" strokeWidth="6"/><path d="M48 258h544" stroke="#d2b891" strokeOpacity=".27" strokeWidth="5"/></g>
    default: return <g />
  }
}

function DignityScene() {
  return <g className="dignity-scene">
    <path d="M36 265V145a284 284 0 0 1 568 0v120" fill="#264252" fillOpacity=".54" stroke="#f0c4a8" strokeOpacity=".45" strokeWidth="8" />
    <path d="M84 265V157a236 236 0 0 1 472 0v108" fill="none" stroke="#f5d4b8" strokeOpacity=".19" strokeWidth="5" />
    <path d="M106 261V172m428 89v-89M320 260V100" stroke="#eac5ad" strokeOpacity=".2" strokeWidth="8" />
    <path d="M56 274q264-24 528 0v38H56z" fill="#182f3d" />
    <path d="M82 294q238-19 476 0" fill="none" stroke="#d2aa8e" strokeOpacity=".23" strokeWidth="4" />
    <g className="dignity-figures" fill="#788d91">
      <path d="M141 208v-24a24 24 0 0 1 48 0v24zM132 209h66v37h-66z" />
      <circle cx="165" cy="173" r="15" fill="#c2b2a1" />
      <path d="M446 208v-24a24 24 0 0 1 48 0v24zM437 209h66v37h-66z" />
      <circle cx="470" cy="173" r="15" fill="#c2b2a1" />
    </g>
    <g className="dignity-nameplates">
      <rect x="136" y="220" width="56" height="17" rx="4" fill="#f2bd83" fillOpacity=".28" />
      <path d="M148 228h32" stroke="#ffe2a5" strokeWidth="3" strokeLinecap="round" />
      <rect x="432" y="220" width="76" height="17" rx="4" fill="#f2bd83" fillOpacity=".28" />
      <path d="M446 228h47" stroke="#ffe2a5" strokeWidth="3" strokeLinecap="round" />
    </g>
    <g className="dignity-speaker">
      <circle cx="253" cy="199" r="19" fill="#e8b58b" />
      <path d="M235 197q4-22 25-17l12 10-5 7q-12-10-32 0" fill="#433e48" />
      <path d="M224 269v-31q0-23 29-23t29 23v31z" fill="#b27270" />
      <path d="M232 238l-23 22m48-29 24-20" fill="none" stroke="#e8b58b" strokeWidth="9" strokeLinecap="round" />
      <path d="M273 202l47-11 17 35-49 11z" fill="#f2dcad" stroke="#fff0c7" strokeWidth="3" strokeLinejoin="round" />
      <path d="M282 207l28-7m-24 18 32-8" stroke="#c88972" strokeWidth="3" strokeLinecap="round" />
    </g>
    <g className="dignity-listener">
      <circle cx="385" cy="198" r="19" fill="#c99675" />
      <path d="M367 196q2-22 24-18l13 13-8 6q-11-10-29-1" fill="#35414a" />
      <path d="M353 269v-32q0-22 31-22t31 22v32z" fill="#6f9b98" />
      <path d="M360 239l-20-17m47 7 18 18" fill="none" stroke="#c99675" strokeWidth="9" strokeLinecap="round" />
    </g>
    <g className="dignity-listening-lines" fill="none" stroke="#ffe2a5" strokeWidth="3" strokeLinecap="round">
      <path d="M405 169q12 8 0 16" /><path d="M415 163q20 14 0 28" />
    </g>
    <circle className="scene-spark scene-spark-one" cx="222" cy="100" r="4" fill="#ffe2a5" />
    <circle className="scene-spark scene-spark-two" cx="416" cy="118" r="3" fill="#ffe2a5" />
  </g>
}

function StoryIllustration({ id, small = false }: { id: string; small?: boolean }) {
  const instanceId = useId().replace(/:/g, '')
  const chapter = chapters.find((item) => item.id === id)
  const description = id === 'dignity'
    ? 'На старой площади два горожанина разговаривают и слушают друг друга, а стёртые имена вновь загораются на каменных табличках.'
    : `Сказочный образ места «${chapter?.place ?? 'Хоровой маяк'}»: район города просыпается, а его главный символ светится.`
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const art = (() => {
    switch (id) {
      case 'life': return <><path d="M160 166V92M160 125q-38-34-49-7 8 28 49 23M160 111q32-40 53-17-7 26-53 36" {...common}/><path d="M91 174h138M115 174q10-35 45-35t45 35" {...common}/><circle cx="160" cy="81" r="16" fill="currentColor" opacity=".35"/></>
      case 'dignity': return <><path d="M113 75h94v111h-94zM130 99h60M130 119h48M130 139h40" {...common}/><path d="M160 66v-18m0 0-9 9m9-9 9 9M99 187h122" {...common}/><circle cx="190" cy="157" r="8" fill="currentColor" opacity=".6"/></>
      case 'rights-freedoms': return <><path d="M108 181V102a52 52 0 0 1 104 0v79M160 54v130M95 183h130" {...common}/><path d="M123 128h23m28 0h23M135 154h14m22 0h14" {...common}/><circle cx="160" cy="90" r="9" fill="currentColor" opacity=".5"/></>
      case 'patriotism': return <><path d="M86 163q32-37 62 0t62 0q24-29 48-1M92 180q37-17 69 0t68 0" {...common}/><path d="M159 139V76h42l-12 15 12 15h-42" {...common}/><path d="M126 130l10-24 10 24m-17-7h14" {...common}/></>
      case 'citizenship': return <><path d="M160 58v32m-33 10h66M133 100l-20 45h40zm54 0-20 45h40zM145 151h30v28h-30z" {...common}/><path d="M160 55q-7 7 0 13t0 13" {...common}/><circle cx="160" cy="61" r="41" strokeDasharray="2 9" opacity=".5"/></>
      case 'service-country': return <><path d="M114 177h92l-13-29h-66zM127 146V99h66v47M120 98h80l-8-18h-64z" {...common}/><path d="M160 58v21m-39 4h78M142 116h36" {...common}/><path d="M160 26l5 15 15 5-15 5-5 15-5-15-15-5 15-5z" fill="currentColor" opacity=".55"/></>
      case 'ideals': return <><circle cx="160" cy="112" r="46" {...common}/><path d="M160 69v20m0 46v20m-43-43h20m46 0h20M160 86l10 26-10 27-10-27z" {...common}/><path d="M100 176h120M110 190h100" {...common}/></>
      case 'family': return <><path d="M99 112l61-48 61 48v69H99zM145 181v-42h30v42" {...common}/><path d="M129 110a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm62 0a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" {...common}/><path d="M132 127q12-14 24 0m28 0q12-14 24 0" {...common}/></>
      case 'creative-work': return <><path d="M94 180h132M107 167l25-45 25 45 25-45 25 45M130 117l28 48m-4-48-27 48M157 114l28 53" {...common}/><path d="M160 85v28m-18-17 18-18 18 18" {...common}/><circle cx="160" cy="88" r="5" fill="currentColor"/></>
      case 'spiritual-priority': return <><path d="M103 170q57-35 114 0v12H103zM127 158V93l33-26 33 26v65" {...common}/><path d="M160 48v26m-10-14 10-12 10 12M144 116h32" {...common}/><circle cx="160" cy="114" r="7" fill="currentColor" opacity=".65"/><path d="M100 190h120" {...common}/></>
      case 'humanism': return <><path d="M109 162q22-34 51 0t51 0M160 68v33m-15-17 15-16 15 16" {...common}/><circle cx="160" cy="124" r="35" {...common}/><path d="M143 126q17 19 34 0" {...common}/><circle cx="148" cy="116" r="2" fill="currentColor"/><circle cx="172" cy="116" r="2" fill="currentColor"/></>
      case 'mercy': return <><path d="M103 161h114l-17 22h-81zM121 160v-49h78v49M116 109h88l-9-18h-70z" {...common}/><path d="M160 117v32m-16-16h32" {...common} strokeWidth={6}/><path d="M108 190h104" {...common}/></>
      case 'justice': return <><path d="M160 68v112m-54-78h108M124 102l-20 43h40zm72 0-20 43h40zM130 181h60" {...common}/><circle cx="160" cy="64" r="7" fill="currentColor"/></>
      case 'collectivism': return <><path d="M100 174q28-49 59 0 28-49 59 0M160 89v56m-27-30h54" {...common}/><path d="M120 101q-10-18 8-28 18-8 24 11m30 17q10-18-8-28-18-8-24 11" {...common}/><path d="M91 183h138" {...common}/></>
      case 'mutual-respect': return <><path d="M97 143l30-28 28 19 39-35 31 25M91 161l39 21 30-22 30 15 43-25" {...common}/><path d="M159 79l6 17 17 6-17 6-6 17-6-17-17-6 17-6z" fill="currentColor" opacity=".55"/><circle cx="120" cy="123" r="6" fill="currentColor"/><circle cx="197" cy="104" r="6" fill="currentColor"/></>
      case 'memory-generations': return <><path d="M102 83h48a14 14 0 0 1 14 14v84h-48a14 14 0 0 0-14 14zM218 83h-48a14 14 0 0 0-14 14v84h48a14 14 0 0 1 14 14z" {...common}/><path d="M120 109h29m-29 19h29m18-19h29m-29 19h29" {...common}/><path d="M160 74q-19-17-24 0m24 0q19-17 24 0" {...common}/></>
      case 'unity-peoples': return <><path d="M105 171h110M118 171v-57h84v57M110 114h100l-9-16h-82zM131 145h58" {...common}/><path d="M80 96q30-27 60 0t60 0q30-27 60 0M80 124q30-27 60 0t60 0q30-27 60 0" {...common}/><path d="M160 51v30m-11-11 11-12 11 12" {...common}/><circle cx="160" cy="48" r="5" fill="currentColor"/></>
      default: return <><circle cx="160" cy="122" r="52" {...common}/><path d="M114 106q23 18 46 0t46 0M114 138q23-18 46 0t46 0M160 70v104" {...common}/><path d="M132 86l-15 13m71-13 15 13M132 158l-15-13m71 13 15-13" {...common}/></>
    }
  })()
  const skyId = `scene-sky-${instanceId}`
  const lightId = `scene-light-${instanceId}`
  if (small) return <svg className="scene-illustration scene-small" viewBox="0 0 320 220" role="img" aria-label={description} style={{ color: chapter?.accent ?? '#efa86b' }}>
    <defs><radialGradient id={lightId}><stop stopColor="currentColor" stopOpacity=".28"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></radialGradient></defs>
    <ellipse cx="160" cy="169" rx="120" ry="56" fill={`url(#${lightId})`} /><path d="M37 173q55-14 123 0t123 0v12H37z" fill="currentColor" opacity=".08" /><g>{art}</g>
    <g fill="currentColor" opacity=".55"><circle cx="75" cy="73" r="2"/><circle cx="249" cy="85" r="1.7"/><circle cx="234" cy="48" r="1.2"/><circle cx="92" cy="139" r="1.5"/></g>
  </svg>
  return <svg className="scene-illustration scene-story" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" role="img" aria-label={description} style={{ color: chapter?.accent ?? '#efa86b' }}>
    <defs>
      <linearGradient id={skyId} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#173748"/><stop offset=".58" stopColor="#0c2637"/><stop offset="1" stopColor="#091925"/></linearGradient>
      <radialGradient id={lightId}><stop stopColor="currentColor" stopOpacity=".42"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></radialGradient>
    </defs>
    <rect width="640" height="360" fill={`url(#${skyId})`} />
    <circle className="scene-light-pulse" cx="492" cy="80" r="122" fill={`url(#${lightId})`} />
    <g className="scene-stars" fill="#f9e3bd"><circle cx="84" cy="52" r="2.4"/><circle cx="159" cy="93" r="1.8"/><circle cx="257" cy="40" r="2"/><circle cx="555" cy="49" r="2.5"/><circle cx="582" cy="133" r="1.8"/><circle cx="62" cy="131" r="1.6"/></g>
    <path d="M0 230q84-66 170-12t177-12q103-76 293 6v148H0z" fill="#122d3d" />
    <g className="scene-city" fill="#1a3948" stroke="#82999b" strokeOpacity=".25" strokeWidth="3">
      <path d="M0 239v-77l32-27 34 27v77zm72 0v-50l43-31 43 31v50zm391 0v-48l41-34 41 34v48zm99 0v-76l36-30 35 30v76z" />
      <path d="M12 190h12m26 0h8m29 21h11m28 0h12m364 0h11m29 0h11m27-20h14m25 0h14" stroke="#eac889" strokeOpacity=".55" strokeWidth="5" />
    </g>
    <DistrictBackdrop id={id} />
    <path d="M0 289q156-24 320 0t320 0v71H0z" fill="#0b1e2a" fillOpacity=".76" />
    <path d="M22 316q145-25 292 0t304 0" fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="4" />
    <ellipse cx="320" cy="277" rx="206" ry="73" fill={`url(#${lightId})`} />
    {id === 'dignity' ? <DignityScene /> : <g transform="translate(32 -20) scale(1.8)"><g>{art}</g></g>}
    <g className="scene-sparkles" fill="#ffe0a2"><circle className="scene-spark scene-spark-one" cx="205" cy="159" r="3"/><circle className="scene-spark scene-spark-two" cx="459" cy="137" r="2.5"/><circle cx="326" cy="75" r="2"/></g>
    <path d="M0 348q153-22 320 0t320 0" fill="none" stroke="#fff0c3" strokeOpacity=".12" strokeWidth="3" />
  </svg>
}

function Gallery() {
  const photos = mediaCatalog.filter((item) => item.status === 'approved' && item.id !== 'city-map')
  return <section className="page gallery-page"><div className="page-heading"><div><p className="eyebrow">Настоящие истории</p><h1>Чудеса класса</h1><p>Кадры из школьной жизни нынешнего 9А — в 2025 году это был 8А.</p></div></div>
      <div className="gallery-photo-grid">{photos.map((photo, index) => <article className={`gallery-photo-card${index === 0 ? ' gallery-photo-featured' : ''}`} key={photo.id} style={{ '--card-index': index } as CSSProperties}>
      <div className="gallery-photo-frame"><img src={photo.src ?? undefined} alt={photo.alt} loading={index === 0 ? 'eager' : 'lazy'} /></div>
      <div className="gallery-photo-copy"><p>{photo.caption}</p><a href={photo.sourceUrl} target="_blank" rel="noreferrer">Пост гимназии · {photo.sourceDate} <span aria-hidden="true">↗</span></a></div>
    </article>)}</div>
  </section>
}

function About() {
  return <section className="page about-page"><div className="page-heading"><div><p className="eyebrow">Идея и авторство</p><h1>О проекте</h1><p>Сказка, которая начинается со знакомой школьной двери и ведёт к реальным поступкам.</p></div></div>
    <div className="about-layout"><article className="about-letter"><p className="drop-cap">Однажды школа № 122 стала городом, где каждый огонь связан с ценностью, названной в Указе Президента России № 809. Когда слова перестают переходить в действия, город теряет свет. Герои идут по разным улицам и учатся принимать решения — не заучивать правильные ответы.</p><p>Это художественная история, созданная для проекта «Гимназия 122 — город 17 чудес». Мая и медный ворон Тюк — вымышленные персонажи. Сюжет и игровые ситуации не описывают реальные события и учеников гимназии. ИИ помог создать сказочный мир и часть иллюстраций.</p><p>Реальные школьные события нынешнего 9А показаны в галерее по публикациям гимназии за 2025 год, когда класс учился в 8А. Источники указаны рядом с фотографиями.</p><p>Исполнитель: ученики 9А класса гимназии № 122 имени Ж. А. Зайцевой, Казань.</p><blockquote>«Мечтай! Действуй! Россия начинается с нас»</blockquote></article><aside className="source-panel"><p className="eyebrow">Нормативный источник</p><h2>17 ценностей</h2><p>Формулировки приведены по пункту 5 Основ государственной политики по сохранению и укреплению традиционных российских духовно-нравственных ценностей.</p><a href="https://www.consultant.ru/document/cons_doc_LAW_430906/" target="_blank" rel="noreferrer">Указ Президента РФ от 09.11.2022 № 809 <span aria-hidden="true">↗</span></a><p className="source-small">Сказка — художественный вымысел; нормативные сведения и реальные материалы разделены.</p></aside></div>
    <div className="contest-note"><span>60 × 85 см</span><p>Для конкурса нужна отдельная горизонтальная стенгазета на ватмане: статьи, рисунки и оформление выполняются вручную, а электронная версия — фотография бумажной работы. Сайт — самостоятельное цифровое продолжение. Возможность использовать распечатанные иллюстрации согласуйте с организаторами.</p><a className="text-link" href={`${import.meta.env.BASE_URL}poster-mockup.svg`} target="_blank" rel="noreferrer">Открыть макет ватмана <span aria-hidden="true">↗</span></a></div>
  </section>
}

function Finale({ onAgain }: { onAgain: () => void }) {
  return <section className="finale-page"><div className="finale-art"><CityIllustration /></div><div className="finale-copy"><div className="finale-star">✦</div><p className="eyebrow">Город снова светится</p><h1>Семнадцать огней.<br />Один общий свет.</h1><p>Карта больше не казалась картой. Она стала окном: в каждом его огне отражались не чудеса из сказки, а то, что можно сделать завтра — выслушать, построить, вспомнить, поддержать.</p><p>Наутро школа снова стала школой. Только на лестнице задержался медный ворон — ему хотелось дослушать историю до конца. Город остался на карте: его свет возвращается всякий раз, когда люди действуют вместе.</p><blockquote>Настоящее чудо — это поступок, который не проходит мимо.</blockquote><div className="finale-collection" role="list" aria-label="Собраны все 17 символов">{chapters.map((chapter, index) => <span className="finale-token" role="listitem" key={chapter.id} title={chapter.value} aria-label={chapter.value} style={{ '--accent': chapter.accent, '--card-index': index } as CSSProperties}><StoryIllustration id={chapter.id} small /></span>)}</div><div className="intro-actions"><button className="button button-primary" onClick={onAgain}>Пройти заново <span aria-hidden="true">↺</span></button><a className="button button-quiet" href="#/gallery">Чудеса класса</a></div></div></section>
}
function FinaleLocked({ complete, onMap }: { complete: number; onMap: () => void }) { return <section className="finale-locked"><div className="lock-symbol">✧</div><h1>Финал ещё впереди</h1><p>Восстановлено {complete} из 17 чудес. Город пока ждёт огни, которые ещё не зажглись.</p><button className="button button-primary" onClick={onMap}>Вернуться к карте <span aria-hidden="true">→</span></button></section> }
function EmptyRoute({ onMap }: { onMap: () => void }) { return <section className="finale-locked"><h1>Эта улица потерялась</h1><p>На карте нет такой главы. Давай вернёмся к знакомым дорогам.</p><button className="button button-primary" onClick={onMap}>Открыть карту</button></section> }

function Journal({ complete, motion, onMotion, onClose, onOpen, onReset }: { complete: string[]; motion: boolean; onMotion: () => void; onClose: () => void; onOpen: (id: string) => void; onReset: () => void }) {
  const [filter, setFilter] = useState<'all' | 'done'>('all')
  const visible = chapters.map((chapter, i) => ({ chapter, i })).filter(({ chapter }) => filter === 'all' || complete.includes(chapter.id))
  return <div className="scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><aside className="journal-panel" role="dialog" aria-modal="true" aria-labelledby="journal-title"><div className="dialog-heading"><div><p className="eyebrow">Путевой блокнот</p><h2 id="journal-title">Коллекция путешественника</h2></div><button className="icon-button close-button" aria-label="Закрыть коллекцию" onClick={onClose}>×</button></div><div className="journal-progress"><b>{complete.length} / 17</b><span>символов собрано</span><div className="progress-track"><i style={{ width: `${(complete.length / 17) * 100}%` }} /></div></div><div className="journal-tabs" role="tablist"><button role="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')}>Все чудеса</button><button role="tab" aria-selected={filter === 'done'} onClick={() => setFilter('done')}>Собранные</button></div><ol className="journal-list">{visible.map(({ chapter, i }) => <li key={chapter.id}><button onClick={() => onOpen(chapter.id)}><span className={`journal-number ${complete.includes(chapter.id) ? 'lit has-symbol' : ''}`}>{complete.includes(chapter.id) ? <StoryIllustration id={chapter.id} small /> : String(i + 1).padStart(2, '0')}</span><span><b>{chapter.value}</b><small>{chapter.place}</small></span><i>{complete.includes(chapter.id) ? '✦' : '○'}</i></button></li>)}{filter === 'done' && !visible.length && <li className="journal-empty">Пока ни один символ не собран. Начни с любой улицы.</li>}</ol><div className="journal-settings"><button className="text-button" onClick={onMotion}>{motion ? 'Отключить анимацию' : 'Включить анимацию'}</button><button className="text-button danger-text" onClick={onReset}>Сбросить прогресс</button></div></aside></div>
}
function ConfirmDialog({ title, body, onCancel, onConfirm }: { title: string; body: string; onCancel: () => void; onConfirm: () => void }) { return <div className="scrim"><div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body"><h2 id="confirm-title">{title}</h2><p id="confirm-body">{body}</p><div><button className="button button-quiet" onClick={onCancel}>Отмена</button><button className="button button-danger" onClick={onConfirm}>Сбросить</button></div></div></div> }

export default App
