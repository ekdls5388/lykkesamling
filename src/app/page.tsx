'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type Entry = {
  id: string
  date: string
  text: string
  image_url: string | null
  created_at: string
}

type DayGroup = {
  date: string
  label: string
  entries: Entry[]
}

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(false)
  const [todayLabel, setTodayLabel] = useState('')
  const [mounted, setMounted] = useState(false)
  const [storyOpen, setStoryOpen] = useState<{ group: DayGroup; idx: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const todayKey = () => new Date().toISOString().slice(0, 10)

  const getDayLabel = (iso: string) => {
    const today = todayKey()
    const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10) })()
    if (iso === today) return '오늘'
    if (iso === yesterday) return '어제'
    return new Date(iso + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  const groupByDay = (entries: Entry[]): DayGroup[] => {
    const map = new Map<string, Entry[]>()
    entries.forEach(e => {
      if (!map.has(e.date)) map.set(e.date, [])
      map.get(e.date)!.push(e)
    })
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, entries]) => ({ date, label: getDayLabel(date), entries }))
  }

  const streak = (() => {
    if (!mounted) return 0
    const days = [...new Set(entries.map(e => e.date))].sort().reverse()
    let s = 0, c = todayKey()
    for (const d of days) {
      if (d === c) {
        s++
        const dd = new Date(c); dd.setDate(dd.getDate() - 1)
        c = dd.toISOString().slice(0, 10)
      } else break
    }
    return s
  })()

  useEffect(() => {
    setMounted(true)
    setTodayLabel(new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    }))
    fetchEntries()
  }, [])

  // 스토리 키보드 네비게이션
  useEffect(() => {
    if (!storyOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextStory()
      if (e.key === 'ArrowLeft') prevStory()
      if (e.key === 'Escape') setStoryOpen(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [storyOpen])

  async function fetchEntries() {
    setLoading(true)
    const { data } = await supabase
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setEntries(data)
    setLoading(false)
  }

  async function handleSave() {
    if (!text.trim() || saving) return
    setSaving(true)
    let image_url = null
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const filename = `${Date.now()}.${ext}`
      const { data: uploadData, error } = await supabase.storage
        .from('photos').upload(filename, imageFile, { contentType: imageFile.type })
      if (uploadData && !error) {
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(uploadData.path)
        image_url = urlData.publicUrl
      }
    }
    const { error } = await supabase.from('entries').insert({ date: todayKey(), text: text.trim(), image_url })
    if (!error) {
      setText(''); setImageFile(null); setPreview(null)
      setToast(true); setTimeout(() => setToast(false), 2200)
      fetchEntries()
    }
    setSaving(false)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  function nextStory() {
    if (!storyOpen) return
    const { group, idx } = storyOpen
    if (idx < group.entries.length - 1) setStoryOpen({ group, idx: idx + 1 })
    else setStoryOpen(null)
  }

  function prevStory() {
    if (!storyOpen) return
    const { group, idx } = storyOpen
    if (idx > 0) setStoryOpen({ group, idx: idx - 1 })
  }

  if (!mounted) return null

  const groups = groupByDay(entries)

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1.25rem 4rem', position: 'relative' }}>

      {/* 로고 */}
      <div style={{ textAlign: 'center', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '0.5px solid #e0e0dc' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: 32, letterSpacing: '0.12em', color: 'var(--color-ink)' }}>
          Lykke <span style={{ fontStyle: 'italic' }}>Samling</span>
        </div>
        <div style={{ fontSize: 10, letterSpacing: '0.22em', color: 'var(--color-muted)', marginTop: 5, textTransform: 'uppercase' }}>
          행복을 모으는 사람
        </div>
      </div>

      {/* 날짜 + 스트릭 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 11, color: 'var(--color-muted)', letterSpacing: '0.06em' }}>{todayLabel}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 300, color: 'var(--color-ink)' }}>{streak}일</div>
          <div style={{ display: 'flex', gap: 3 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: i < streak ? 'var(--color-ink)' : 'var(--color-faint)' }} />
            ))}
          </div>
        </div>
      </div>

      {/* 스토리 썸네일 바 */}
      {!loading && groups.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ overflowX: 'auto', display: 'flex', gap: 16, paddingBottom: 8, scrollbarWidth: 'none' }}>
            {groups.map((group) => (
              <div
                key={group.date}
                onClick={() => setStoryOpen({ group, idx: 0 })}
                style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}
              >
                <div style={{
                  width: 62, height: 62, borderRadius: '50%', overflow: 'hidden',
                  border: group.date === todayKey() ? '2px solid var(--color-ink)' : '1.5px solid #d0d0cc',
                  background: 'var(--color-surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {group.entries[0]?.image_url ? (
                    <img src={group.entries[0].image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 20 }}>✦</span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-muted)', letterSpacing: '0.05em', textAlign: 'center' }}>
                  {group.label}
                </div>
                {group.entries.length > 1 && (
                  <div style={{ fontSize: 9, color: 'var(--color-muted)' }}>{group.entries.length}개</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 구분선 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ flex: 1, height: '0.5px', background: '#e0e0dc' }} />
        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-muted)' }}>기록하기</div>
        <div style={{ flex: 1, height: '0.5px', background: '#e0e0dc' }} />
      </div>

      {/* 입력 */}
      <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={handleFile} />
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          border: `0.5px ${preview ? 'solid' : 'dashed'} #d0d0cc`, borderRadius: 16,
          height: preview ? 220 : 110, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', overflow: 'hidden', marginBottom: '1.25rem',
          background: preview ? 'transparent' : 'var(--color-surface)',
        }}
      >
        {preview ? (
          <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{ textAlign: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1" style={{ display: 'block', margin: '0 auto 6px' }}>
              <rect x="2" y="7" width="20" height="14" rx="2"/><circle cx="12" cy="14" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/>
            </svg>
            <div style={{ fontSize: 11, color: 'var(--color-muted)', letterSpacing: '0.06em' }}>사진 추가</div>
          </div>
        )}
      </div>

      <textarea
        value={text} onChange={e => setText(e.target.value)} maxLength={100} rows={2}
        placeholder="오늘, 어떤 순간이 좋았어?"
        style={{
          width: '100%', border: 'none', borderBottom: '0.5px solid #d0d0cc',
          padding: '8px 0', background: 'transparent', resize: 'none',
          fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 300,
          fontStyle: 'italic', color: 'var(--color-ink)', lineHeight: 1.55, outline: 'none', marginBottom: 4,
        }}
      />
      <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--color-muted)', marginBottom: '1.25rem' }}>
        {text.length} / 100
      </div>

      <button
        onClick={handleSave} disabled={saving || !text.trim()}
        style={{
          width: '100%', padding: '11px', background: 'var(--color-ink)', color: '#fafaf9',
          border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--font-body)',
          fontWeight: 300, fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase',
          opacity: (saving || !text.trim()) ? 0.25 : 1, transition: 'opacity 0.2s',
        }}
      >
        {saving ? '저장 중...' : '기록하기'}
      </button>

      {/* 토스트 */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--color-ink)', color: '#fafaf9', fontSize: 11,
          letterSpacing: '0.12em', padding: '8px 20px', borderRadius: 99, whiteSpace: 'nowrap', zIndex: 999,
        }}>저장됐어</div>
      )}

      {/* 스토리 풀스크린 */}
      {storyOpen && (() => {
        const { group, idx } = storyOpen
        const entry = group.entries[idx]
        return (
          <div
            style={{
              position: 'fixed', inset: 0, background: '#0a0a0a', zIndex: 1000,
              display: 'flex', flexDirection: 'column',
            }}
            onClick={nextStory}
          >
            {/* 상단 진행바 */}
            <div style={{ display: 'flex', gap: 3, padding: '48px 16px 12px', zIndex: 2 }}>
              {group.entries.map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 2, borderRadius: 2,
                  background: i <= idx ? '#fff' : 'rgba(255,255,255,0.3)',
                  transition: 'background 0.2s',
                }} />
              ))}
            </div>

            {/* 상단 정보 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 16px', zIndex: 2 }}>
              <div style={{ color: '#fff', fontSize: 13, letterSpacing: '0.06em', opacity: 0.8 }}>
                {group.label} · {idx + 1}/{group.entries.length}
              </div>
              <button
                onClick={e => { e.stopPropagation(); setStoryOpen(null) }}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', opacity: 0.7, lineHeight: 1 }}
              >×</button>
            </div>

            {/* 사진 */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '0 0 120px' }}>
              {entry.image_url ? (
                <img
                  src={entry.image_url} alt=""
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 48 }}>✦</div>
              )}
            </div>

            {/* 텍스트 */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '2rem 1.5rem 3rem',
              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
            }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 300, fontStyle: 'italic', color: '#fff', lineHeight: 1.5 }}>
                {entry.text}
              </div>
            </div>

            {/* 좌우 터치 영역 */}
            <div
              style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '35%', zIndex: 3 }}
              onClick={e => { e.stopPropagation(); prevStory() }}
            />
            <div
              style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '35%', zIndex: 3 }}
              onClick={e => { e.stopPropagation(); nextStory() }}
            />
          </div>
        )
      })()}
    </main>
  )
}
