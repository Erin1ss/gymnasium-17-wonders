import { type CSSProperties, useEffect, useState } from 'react'
import { chapters } from './content/chapters'
import { mediaCatalog } from './content/media'
import type { Chapter, MatchingInteraction, OrderedInteraction } from './content/types'
import { isCorrectInteraction } from './content/validation'
import { MOTION_KEY, readProgress, STORE_KEY } from './content/progress'

type Route = { page: 'intro' | 'map' | 'gallery' | 'about' | 'finale' | 'chapter'; id?: string }
const places = [
  [6, 20], [18, 12], [30, 25], [42, 14], [54, 31], [67, 16], [82, 26], [91, 43], [77, 53],
  [62, 65], [47, 54], [34, 72], [19, 57], [8, 75], [26, 87], [54, 84], [78, 82],
]

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
  const [selected, setSelected] = useState<Chapter>(chapters[0])
  const [motion, setMotion] = useState(() => localStorage.getItem(MOTION_KEY) !== 'off')
  const [journalOpen, setJournalOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [notice, setNotice] = useState('')

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

  const current = route.page === 'chapter' ? chapters.find((item) => item.id === route.id) : undefined
  const count = complete.length
  const go = (path: string) => { window.location.hash = path }
  const markComplete = (id: string) => setComplete((old) => old.includes(id) ? old : [...old, id])
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
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#/intro" aria-label="Гимназия 122 — на главную">
          <CompassMark />
          <span><b>Гимназия 122</b><small>город 17 чудес</small></span>
        </a>
        <nav className="main-nav" aria-label="Основная навигация">
          <a aria-current={route.page === 'map' ? 'page' : undefined} href="#/map">Карта</a>
          <a aria-current={route.page === 'gallery' ? 'page' : undefined} href="#/gallery">Чудеса класса</a>
          <a aria-current={route.page === 'about' ? 'page' : undefined} href="#/about">О проекте</a>
        </nav>
        <div className="header-tools">
          <button className="icon-button journal-toggle" aria-label="Открыть журнал путешественника" onClick={() => setJournalOpen(true)}><JournalIcon /></button>
          <button className="progress-chip" onClick={() => setJournalOpen(true)} aria-label={`Восстановлено чудес: ${count} из 17`}>
            <span className="progress-number">{String(count).padStart(2, '0')}</span><span className="progress-label">из 17 чудес</span>
            <span className="progress-track"><i style={{ width: `${(count / 17) * 100}%` }} /></span>
          </button>
        </div>
      </header>

      <main id="main-content">
        {route.page === 'intro' && <Intro onStart={() => go('/map')} onAbout={() => go('/about')} />}
        {route.page === 'map' && <MapPage complete={complete} selected={selected} onSelect={setSelected} onOpen={(chapter) => go(`/chapter/${chapter.id}`)} onFinish={() => go('/finale')} />}
        {route.page === 'chapter' && current && <ChapterPage chapter={current} complete={complete.includes(current.id)} onBack={() => go('/map')} onComplete={() => markComplete(current.id)} onChapter={(id) => go(`/chapter/${id}`)} />}
        {route.page === 'chapter' && !current && <EmptyRoute onMap={() => go('/map')} />}
        {route.page === 'gallery' && <Gallery />}
        {route.page === 'about' && <About />}
        {route.page === 'finale' && (count === 17 ? <Finale onAgain={reset} /> : <FinaleLocked complete={count} onMap={() => go('/map')} />)}
      </main>

      <footer className="site-footer">
        <span>9А · гимназия № 122 имени Ж. А. Зайцевой · Казань</span>
        <button className="text-button" onClick={() => setMotion((value) => !value)} aria-pressed={!motion}>
          {motion ? 'Отключить анимацию' : 'Включить анимацию'}
        </button>
        <button className="text-button" onClick={share}>Поделиться ссылкой</button>
      </footer>

      {journalOpen && <Journal complete={complete} motion={motion} onMotion={() => setMotion((value) => !value)} onClose={() => setJournalOpen(false)} onOpen={(id) => { setJournalOpen(false); go(`/chapter/${id}`) }} onReset={() => { setJournalOpen(false); setResetOpen(true) }} />}
      {resetOpen && <ConfirmDialog title="Начать путь заново?" body="В журнале снова погаснут отметки о пройденных главах. Истории останутся доступны." onCancel={() => setResetOpen(false)} onConfirm={reset} />}
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  )
}

function CompassMark() {
  return <svg className="compass-mark" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="19"/><path d="M24 4v7M24 37v7M4 24h7M37 24h7M24 12l5 12-5 12-5-12z"/><circle cx="24" cy="24" r="2"/></svg>
}
function JournalIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h11.5A2.5 2.5 0 0 1 19 7v13H7a2 2 0 0 1-2-2z"/><path d="M5 4.5v13A2.5 2.5 0 0 0 7.5 20M9 9h6M9 13h6"/></svg> }

function Intro({ onStart, onAbout }: { onStart: () => void; onAbout: () => void }) {
  return <section className="intro-screen">
    <div className="intro-art"><img className="hero-image" src={`${import.meta.env.BASE_URL}images/city-map.webp`} alt="Сказочный ночной город на берегу реки; его огни ждут, когда их вернут поступки людей" /></div>
    <div className="intro-copy">
      <div className="intro-flourish" aria-hidden="true">✳ <span>──────────</span></div>
      <h1>Гимназия 122 <em>— город 17 чудес</em></h1>
      <p className="project-motto">Мечтай! Действуй! Россия начинается с нас</p>
      <p className="intro-text">В одну осеннюю ночь знакомые школьные коридоры стали улицами волшебного города. Городской колокол замолчал, а семнадцать огней начали гаснуть. Чтобы вернуть их, придётся замечать друг друга и действовать.</p>
      <div className="intro-actions"><button className="button button-primary" onClick={onStart}>Начать путешествие <span aria-hidden="true">↗</span></button><button className="button button-quiet" onClick={onAbout}>О проекте</button></div>
      <div className="intro-caption"><span className="caption-line" />История о том, как мы бережём общее</div>
    </div>
    <div className="intro-city-name"><span>55°47′ N</span><span>Казань · город у большой реки</span></div>
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

function MapPage({ complete, selected, onSelect, onOpen, onFinish }: { complete: string[]; selected: Chapter; onSelect: (chapter: Chapter) => void; onOpen: (chapter: Chapter) => void; onFinish: () => void }) {
  return <section className="page map-page">
    <div className="page-heading map-heading"><div><p className="eyebrow">Путешествие начинается</p><h1>Карта города</h1><p>Под башней ждёт молчащий городской колокол. Каждое решение возвращает ему один из семнадцати звуков.</p></div><button className="button button-outline" onClick={onFinish} disabled={complete.length < 17} title={complete.length < 17 ? 'Финал откроется после всех 17 чудес' : undefined}>Финал города <span aria-hidden="true">↗</span></button></div>
    <div className="map-layout">
      <div className="map-scroll" tabIndex={0} aria-label="Волшебная карта; можно прокручивать по горизонтали на узком экране">
        <div className="map-canvas">
          <svg className="map-river" viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true">
            <path className="land-shape" d="M0 82Q140 39 260 80T485 72Q650 20 790 75T1000 56V510Q850 550 704 505T490 522Q335 566 168 512T0 545Z"/>
            <path className="river-shadow" d="M-15 333C110 190 160 489 294 352S440 210 543 323 695 458 795 313 922 181 1030 254"/>
            <path className="river" d="M-15 321C110 178 160 477 294 340S440 198 543 311 695 446 795 301 922 169 1030 242"/>
            <path className="river-shine" d="M-15 312C110 169 160 468 294 331S440 189 543 302 695 437 795 292 922 160 1030 233"/>
            <path className="road" d="M40 173Q217 119 318 183T539 160Q699 119 955 167M62 465Q179 393 344 465T626 427Q831 386 963 464"/>
            <g className="map-stars"><circle cx="133" cy="190" r="2"/><circle cx="857" cy="185" r="2"/><circle cx="720" cy="453" r="2"/><circle cx="485" cy="87" r="2"/></g>
          </svg>
          <div className="map-city-label label-north">СЕВЕРНЫЙ САД</div><div className="map-city-label label-center">СТАРЫЙ ГОРОД</div><div className="map-city-label label-south">НАБЕРЕЖНАЯ</div>
          <span className="map-compass">N<span>✦</span></span>
          {chapters.map((chapter, index) => {
            const [left, top] = places[index]
            return <button key={chapter.id} className={`map-marker ${selected.id === chapter.id ? 'is-selected' : ''} ${complete.includes(chapter.id) ? 'is-restored' : ''}`} style={{ left: `${left}%`, top: `${top}%`, '--accent': chapter.accent } as CSSProperties} onClick={() => onSelect(chapter)} onDoubleClick={() => onOpen(chapter)} aria-label={`${String(index + 1).padStart(2, '0')}. ${chapter.place}. Ценность: ${chapter.value}${complete.includes(chapter.id) ? '. Чудо восстановлено' : '. Ещё не восстановлено'}`} aria-pressed={selected.id === chapter.id}>
              <span className="marker-number">{String(index + 1).padStart(2, '0')}</span><span className="marker-dot" aria-hidden="true" />
            </button>
          })}
          <div className="map-legend"><span><i /> огонь ждёт</span><span><i className="legend-lit" /> огонь вернулся</span></div>
        </div>
      </div>
      <aside className="place-preview" aria-live="polite">
      <div className="preview-art" style={{ '--accent': selected.accent } as CSSProperties}><StoryIllustration id={selected.id} small /></div>
        <p className="eyebrow">{String(chapters.indexOf(selected) + 1).padStart(2, '0')} · место на карте</p><h2>{selected.place}</h2><p className="preview-value">{selected.value}</p><p className="preview-summary">{selected.summary}</p>
        <div className="preview-bottom"><span className={`status-dot ${complete.includes(selected.id) ? 'restored' : ''}`} />{complete.includes(selected.id) ? 'Чудо восстановлено' : 'Ждёт твоего решения'}<button className="button button-primary button-small" onClick={() => onOpen(selected)}>Открыть историю <span aria-hidden="true">→</span></button></div>
      </aside>
    </div>
    <details className="chapter-index"><summary>Список всех 17 глав</summary><ol>{chapters.map((chapter, i) => <li key={chapter.id}><button className="chapter-link" onClick={() => onOpen(chapter)}><span>{String(i + 1).padStart(2, '0')}</span><b>{chapter.value}</b><small>{chapter.place}</small><i>{complete.includes(chapter.id) ? 'светится' : 'на карте'}</i></button></li>)}</ol></details>
  </section>
}

function ChapterPage({ chapter, complete, onBack, onComplete, onChapter }: { chapter: Chapter; complete: boolean; onBack: () => void; onComplete: () => void; onChapter: (id: string) => void }) {
  const index = chapters.indexOf(chapter)
  const [feedback, setFeedback] = useState('')
  const [passed, setPassed] = useState(complete)
  const [choice, setChoice] = useState<number | null>(null)
  const [order, setOrder] = useState<number[]>([])
  const [matches, setMatches] = useState<number[]>([])
  const ordered = chapter.interaction.type === 'sequence' || chapter.interaction.type === 'assemble' ? chapter.interaction : null
  useEffect(() => { setFeedback(''); setPassed(complete); setChoice(null); setOrder([]); setMatches([]) }, [chapter.id, complete])

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
    <div className="chapter-topline"><button className="back-link" onClick={onBack}><span aria-hidden="true">←</span> Карта города</button><span className="chapter-count">Чудо {String(index + 1).padStart(2, '0')} / 17</span></div>
    <div className="chapter-grid">
      <div className="chapter-story">
        <p className="eyebrow" style={{ color: chapter.accent }}>{chapter.place}</p><h1>{chapter.value}</h1>
        <div className="story-art" style={{ '--accent': chapter.accent } as CSSProperties}><StoryIllustration id={chapter.id} /></div>
        <div className="story-copy"><p>{chapter.story}</p></div>
        <blockquote className="value-note"><span>В этой главе</span>{chapter.meaning}</blockquote>
      </div>
      <aside className="challenge-panel">
        <p className="eyebrow">ТВОЙ ВЫБОР</p><h2>{chapter.challenge}</h2>
        <InteractionBox chapter={chapter} choice={choice} setChoice={setChoice} order={order} matches={matches} setMatches={setMatches} moveItem={moveItem} onChoiceCheck={checkChoice} onOrderCheck={checkOrder} onMatchCheck={checkMatches} feedback={feedback} passed={passed} />
        {passed && <p className="real-life-note"><span aria-hidden="true">✦</span> Чудо зажглось и на карте города. В жизни оно тоже начинается с поступка — своего или общего.</p>}
        <div className="chapter-nav"><button onClick={() => onChapter(prev.id)}><small>← предыдущая глава</small><b>{prev.value}</b></button><button onClick={() => onChapter(next.id)}><small>следующая глава →</small><b>{next.value}</b></button></div>
      </aside>
    </div>
    <section className="school-link"><div className="school-link-art" aria-hidden="true">✳</div><div><p className="eyebrow">Чудо в нашей жизни</p><h2>Истории класса — отдельный свет</h2><p>В галерее — реальные события нынешнего 9А, когда класс был 8А. Подписи и ссылки ведут к публикациям гимназии.</p></div><a className="text-link" href="#/gallery">К разделу класса <span aria-hidden="true">→</span></a></section>
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

function StoryIllustration({ id, small = false }: { id: string; small?: boolean }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const art = (() => {
    switch (id) {
      case 'life': return <><path d="M160 166V92M160 125q-38-34-49-7 8 28 49 23M160 111q32-40 53-17-7 26-53 36" {...common}/><path d="M91 174h138M115 174q10-35 45-35t45 35" {...common}/><circle cx="160" cy="81" r="16" fill="currentColor" opacity=".35"/></>
      case 'dignity': return <><path d="M113 75h94v111h-94zM130 99h60M130 119h48M130 139h40" {...common}/><path d="M160 66v-18m0 0-9 9m9-9 9 9M99 187h122" {...common}/><circle cx="190" cy="157" r="8" fill="currentColor" opacity=".6"/></>
      case 'rights': return <><path d="M108 181V102a52 52 0 0 1 104 0v79M160 54v130M95 183h130" {...common}/><path d="M123 128h23m28 0h23M135 154h14m22 0h14" {...common}/><circle cx="160" cy="90" r="9" fill="currentColor" opacity=".5"/></>
      case 'patriotism': return <><path d="M86 163q32-37 62 0t62 0q24-29 48-1M92 180q37-17 69 0t68 0" {...common}/><path d="M159 139V76h42l-12 15 12 15h-42" {...common}/><path d="M126 130l10-24 10 24m-17-7h14" {...common}/></>
      case 'citizenship': return <><path d="M160 58v32m-33 10h66M133 100l-20 45h40zm54 0-20 45h40zM145 151h30v28h-30z" {...common}/><path d="M160 55q-7 7 0 13t0 13" {...common}/><circle cx="160" cy="61" r="41" strokeDasharray="2 9" opacity=".5"/></>
      case 'service': return <><path d="M114 177h92l-13-29h-66zM127 146V99h66v47M120 98h80l-8-18h-64z" {...common}/><path d="M160 58v21m-39 4h78M142 116h36" {...common}/><path d="M160 26l5 15 15 5-15 5-5 15-5-15-15-5 15-5z" fill="currentColor" opacity=".55"/></>
      case 'ideals': return <><circle cx="160" cy="112" r="46" {...common}/><path d="M160 69v20m0 46v20m-43-43h20m46 0h20M160 86l10 26-10 27-10-27z" {...common}/><path d="M100 176h120M110 190h100" {...common}/></>
      case 'family': return <><path d="M99 112l61-48 61 48v69H99zM145 181v-42h30v42" {...common}/><path d="M129 110a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm62 0a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" {...common}/><path d="M132 127q12-14 24 0m28 0q12-14 24 0" {...common}/></>
      case 'labor': return <><path d="M94 180h132M107 167l25-45 25 45 25-45 25 45M130 117l28 48m-4-48-27 48M157 114l28 53" {...common}/><path d="M160 85v28m-18-17 18-18 18 18" {...common}/><circle cx="160" cy="88" r="5" fill="currentColor"/></>
      case 'spiritual': return <><path d="M103 170q57-35 114 0v12H103zM127 158V93l33-26 33 26v65" {...common}/><path d="M160 48v26m-10-14 10-12 10 12M144 116h32" {...common}/><circle cx="160" cy="114" r="7" fill="currentColor" opacity=".65"/><path d="M100 190h120" {...common}/></>
      case 'humanism': return <><path d="M109 162q22-34 51 0t51 0M160 68v33m-15-17 15-16 15 16" {...common}/><circle cx="160" cy="124" r="35" {...common}/><path d="M143 126q17 19 34 0" {...common}/><circle cx="148" cy="116" r="2" fill="currentColor"/><circle cx="172" cy="116" r="2" fill="currentColor"/></>
      case 'mercy': return <><path d="M103 161h114l-17 22h-81zM121 160v-49h78v49M116 109h88l-9-18h-70z" {...common}/><path d="M160 117v32m-16-16h32" {...common} strokeWidth={6}/><path d="M108 190h104" {...common}/></>
      case 'justice': return <><path d="M160 68v112m-54-78h108M124 102l-20 43h40zm72 0-20 43h40zM130 181h60" {...common}/><circle cx="160" cy="64" r="7" fill="currentColor"/></>
      case 'collectivism': return <><path d="M100 174q28-49 59 0 28-49 59 0M160 89v56m-27-30h54" {...common}/><path d="M120 101q-10-18 8-28 18-8 24 11m30 17q10-18-8-28-18-8-24 11" {...common}/><path d="M91 183h138" {...common}/></>
      case 'mutual-help': return <><path d="M97 143l30-28 28 19 39-35 31 25M91 161l39 21 30-22 30 15 43-25" {...common}/><path d="M159 79l6 17 17 6-17 6-6 17-6-17-17-6 17-6z" fill="currentColor" opacity=".55"/><circle cx="120" cy="123" r="6" fill="currentColor"/><circle cx="197" cy="104" r="6" fill="currentColor"/></>
      case 'memory': return <><path d="M102 83h48a14 14 0 0 1 14 14v84h-48a14 14 0 0 0-14 14zM218 83h-48a14 14 0 0 0-14 14v84h48a14 14 0 0 1 14 14z" {...common}/><path d="M120 109h29m-29 19h29m18-19h29m-29 19h29" {...common}/><path d="M160 74q-19-17-24 0m24 0q19-17 24 0" {...common}/></>
      case 'unity-peoples': return <><path d="M105 171h110M118 171v-57h84v57M110 114h100l-9-16h-82zM131 145h58" {...common}/><path d="M80 96q30-27 60 0t60 0q30-27 60 0M80 124q30-27 60 0t60 0q30-27 60 0" {...common}/><path d="M160 51v30m-11-11 11-12 11 12" {...common}/><circle cx="160" cy="48" r="5" fill="currentColor"/></>
      default: return <><circle cx="160" cy="122" r="52" {...common}/><path d="M114 106q23 18 46 0t46 0M114 138q23-18 46 0t46 0M160 70v104" {...common}/><path d="M132 86l-15 13m71-13 15 13M132 158l-15-13m71 13 15-13" {...common}/></>
    }
  })()
  return <svg className={`scene-illustration ${small ? 'scene-small' : ''}`} viewBox="0 0 320 220" role="img" aria-label={`Иллюстрация к главе «${chapters.find((chapter) => chapter.id === id)?.value ?? 'Единство народов России'}»`} style={{ color: 'var(--accent, #efa86b)' }}>
    <defs><radialGradient id={`scene-glow-${id}`}><stop stopColor="currentColor" stopOpacity=".28"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></radialGradient></defs>
    <ellipse cx="160" cy="169" rx="120" ry="56" fill={`url(#scene-glow-${id})`} />
    <path d="M37 173q55-14 123 0t123 0v12H37z" fill="currentColor" opacity=".08" />
    <g>{art}</g><g fill="currentColor" opacity=".55"><circle cx="75" cy="73" r="2"/><circle cx="249" cy="85" r="1.7"/><circle cx="234" cy="48" r="1.2"/><circle cx="92" cy="139" r="1.5"/></g>
  </svg>
}

function Gallery() {
  const photos = mediaCatalog.filter((item) => item.status === 'approved' && item.id !== 'city-map')
  return <section className="page gallery-page"><div className="page-heading"><div><p className="eyebrow">Настоящие истории</p><h1>Чудеса класса</h1><p>Кадры из школьной жизни нынешнего 9А — в 2025 году это был 8А.</p></div></div>
    <div className="gallery-photo-grid">{photos.map((photo, index) => <article className={`gallery-photo-card${index === 0 ? ' gallery-photo-featured' : ''}`} key={photo.id}>
      <div className="gallery-photo-frame"><img src={photo.src ?? undefined} alt={photo.alt} loading={index === 0 ? 'eager' : 'lazy'} /></div>
      <div className="gallery-photo-copy"><p>{photo.caption}</p><a href={photo.sourceUrl} target="_blank" rel="noreferrer">Пост гимназии · {photo.sourceDate} <span aria-hidden="true">↗</span></a></div>
    </article>)}</div>
  </section>
}

function About() {
  return <section className="page about-page"><div className="page-heading"><div><p className="eyebrow">Идея и авторство</p><h1>О проекте</h1><p>Сказка, которая начинается со знакомой школьной двери и ведёт к реальным поступкам.</p></div></div>
    <div className="about-layout"><article className="about-letter"><p className="drop-cap">Однажды школа № 122 стала городом, где каждый огонь связан с ценностью, названной в Указе Президента России № 809. Когда слова перестают переходить в действия, город теряет свет. Герои идут по разным улицам и учатся принимать решения — не заучивать правильные ответы.</p><p>Это художественная история, созданная для проекта «Гимназия 122 — город 17 чудес». Мая и медный ворон Тюк — вымышленные персонажи. Сюжет и игровые ситуации не описывают реальные события и учеников гимназии.</p><p>Реальные школьные события нынешнего 9А показаны в галерее по публикациям гимназии за 2025 год, когда класс учился в 8А. Источники указаны рядом с фотографиями.</p><p>Исполнитель: ученики 9А класса гимназии № 122 имени Ж. А. Зайцевой, Казань.</p><blockquote>«Мечтай! Действуй! Россия начинается с нас»</blockquote></article><aside className="source-panel"><p className="eyebrow">Нормативный источник</p><h2>17 ценностей</h2><p>Формулировки приведены по пункту 5 Основ государственной политики по сохранению и укреплению традиционных российских духовно-нравственных ценностей.</p><a href="https://www.consultant.ru/document/cons_doc_LAW_430906/" target="_blank" rel="noreferrer">Указ Президента РФ от 09.11.2022 № 809 <span aria-hidden="true">↗</span></a><p className="source-small">Сказка — художественный вымысел; нормативные сведения и реальные материалы разделены.</p></aside></div>
    <div className="contest-note"><span>85 × 60 см</span><p>Сайт дополняет школьную стенгазету. По условию конкурса для сдачи требуется отдельно подготовленная вручную горизонтальная работа на ватмане; цифровой макет — только образец для переноса идеи.</p><a className="text-link" href={`${import.meta.env.BASE_URL}poster-mockup.svg`} target="_blank" rel="noreferrer">Открыть макет ватмана <span aria-hidden="true">↗</span></a></div>
  </section>
}

function Finale({ onAgain }: { onAgain: () => void }) {
  return <section className="finale-page"><div className="finale-art"><CityIllustration /></div><div className="finale-copy"><div className="finale-star">✦</div><p className="eyebrow">Город снова светится</p><h1>Семнадцать огней.<br />Один общий свет.</h1><p>Карта больше не казалась картой. Она стала окном: в каждом его огне отражались не чудеса из сказки, а то, что можно сделать завтра — выслушать, построить, вспомнить, поддержать.</p><p>Наутро школа снова стала школой. Только на лестнице задержался медный ворон — ему хотелось дослушать историю до конца. Город остался на карте: его свет возвращается всякий раз, когда люди действуют вместе.</p><blockquote>Настоящее чудо — это поступок, который не проходит мимо.</blockquote><div className="intro-actions"><button className="button button-primary" onClick={onAgain}>Пройти заново <span aria-hidden="true">↺</span></button><a className="button button-quiet" href="#/gallery">Чудеса класса</a></div></div></section>
}
function FinaleLocked({ complete, onMap }: { complete: number; onMap: () => void }) { return <section className="finale-locked"><div className="lock-symbol">✧</div><h1>Финал ещё впереди</h1><p>Восстановлено {complete} из 17 чудес. Город пока ждёт огни, которые ещё не зажглись.</p><button className="button button-primary" onClick={onMap}>Вернуться к карте <span aria-hidden="true">→</span></button></section> }
function EmptyRoute({ onMap }: { onMap: () => void }) { return <section className="finale-locked"><h1>Эта улица потерялась</h1><p>На карте нет такой главы. Давай вернёмся к знакомым дорогам.</p><button className="button button-primary" onClick={onMap}>Открыть карту</button></section> }

function Journal({ complete, motion, onMotion, onClose, onOpen, onReset }: { complete: string[]; motion: boolean; onMotion: () => void; onClose: () => void; onOpen: (id: string) => void; onReset: () => void }) {
  const [filter, setFilter] = useState<'all' | 'done'>('all')
  const visible = chapters.map((chapter, i) => ({ chapter, i })).filter(({ chapter }) => filter === 'all' || complete.includes(chapter.id))
  return <div className="scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><aside className="journal-panel" role="dialog" aria-modal="true" aria-labelledby="journal-title"><div className="dialog-heading"><div><p className="eyebrow">Путевой блокнот</p><h2 id="journal-title">Журнал путешественника</h2></div><button className="icon-button close-button" aria-label="Закрыть журнал" onClick={onClose}>×</button></div><div className="journal-progress"><b>{complete.length} / 17</b><span>огней возвращено</span><div className="progress-track"><i style={{ width: `${(complete.length / 17) * 100}%` }} /></div></div><div className="journal-tabs" role="tablist"><button role="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')}>Все главы</button><button role="tab" aria-selected={filter === 'done'} onClick={() => setFilter('done')}>Восстановленные</button></div><ol className="journal-list">{visible.map(({ chapter, i }) => <li key={chapter.id}><button onClick={() => onOpen(chapter.id)}><span className={`journal-number ${complete.includes(chapter.id) ? 'lit' : ''}`}>{String(i + 1).padStart(2, '0')}</span><span><b>{chapter.value}</b><small>{chapter.place}</small></span><i>{complete.includes(chapter.id) ? '✦' : '○'}</i></button></li>)}{filter === 'done' && !visible.length && <li className="journal-empty">Пока ни один огонь не вернулся. Начни с любой улицы.</li>}</ol><div className="journal-settings"><button className="text-button" onClick={onMotion}>{motion ? 'Отключить анимацию' : 'Включить анимацию'}</button><button className="text-button danger-text" onClick={onReset}>Сбросить прогресс</button></div></aside></div>
}
function ConfirmDialog({ title, body, onCancel, onConfirm }: { title: string; body: string; onCancel: () => void; onConfirm: () => void }) { return <div className="scrim"><div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body"><h2 id="confirm-title">{title}</h2><p id="confirm-body">{body}</p><div><button className="button button-quiet" onClick={onCancel}>Отмена</button><button className="button button-danger" onClick={onConfirm}>Сбросить</button></div></div></div> }

export default App
