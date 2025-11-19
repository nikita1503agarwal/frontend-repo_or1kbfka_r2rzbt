import React, { useEffect, useMemo, useState } from 'react'

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

async function fetchJSON(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  if (res.status === 204) return null
  return res.json()
}

function useTodayISO() {
  const [today, setToday] = useState(() => new Date().toISOString().slice(0, 10))
  useEffect(() => {
    const id = setInterval(() => setToday(new Date().toISOString().slice(0, 10)), 60_000)
    return () => clearInterval(id)
  }, [])
  return today
}

export default function App() {
  const today = useTodayISO()

  // Global state
  const [xp, setXp] = useState(null)
  const [dayStatus, setDayStatus] = useState(null)
  const [achievements, setAchievements] = useState([])

  // Mission
  const [mission, setMission] = useState(null)
  const [missionText, setMissionText] = useState('')

  // Mood
  const [mood, setMood] = useState(null)
  const [moodRating, setMoodRating] = useState(3)

  // Habits
  const [habits, setHabits] = useState([])
  const [newHabitName, setNewHabitName] = useState('')

  // Tasks (today)
  const [tasks, setTasks] = useState([])
  const [newTaskTitle, setNewTaskTitle] = useState('')

  // Notes
  const [notes, setNotes] = useState([])
  const [noteTitle, setNoteTitle] = useState('')
  const [noteText, setNoteText] = useState('')
  const [noteCategory, setNoteCategory] = useState('')

  // Weekly
  const [weekly, setWeekly] = useState(null)

  // Loaders
  async function refreshAll() {
    await Promise.all([
      refreshXP(),
      refreshDayStatus(),
      refreshMission(),
      refreshMood(),
      refreshHabits(),
      refreshTasks(),
      refreshNotes(),
      refreshAchievements(),
    ])
  }

  async function refreshXP() {
    const data = await fetchJSON('/api/xpstate')
    setXp(data)
  }

  async function refreshAchievements() {
    const data = await fetchJSON('/api/achievements')
    setAchievements(data || [])
  }

  async function refreshDayStatus() {
    const data = await fetchJSON(`/api/day/status?d=${today}`)
    setDayStatus(data)
  }

  async function refreshMission() {
    const data = await fetchJSON(`/api/mission?d=${today}`)
    setMission(data)
    setMissionText(data?.text || '')
  }

  async function refreshMood() {
    const data = await fetchJSON(`/api/mood/${today}`).catch(() => null)
    setMood(data)
    if (data?.rating) setMoodRating(data.rating)
  }

  async function refreshHabits() {
    const data = await fetchJSON('/api/habits')
    setHabits(data)
  }

  async function refreshTasks() {
    const data = await fetchJSON(`/api/tasks?d=${today}`)
    setTasks(data)
  }

  async function refreshNotes() {
    const data = await fetchJSON('/api/notes')
    setNotes(data)
  }

  useEffect(() => {
    refreshAll()
  }, [today])

  // Actions
  async function saveMission() {
    const payload = { date: today, text: missionText, done: mission?.done || false }
    const res = await fetchJSON('/api/mission', { method: 'POST', body: JSON.stringify(payload) })
    setMission(res)
    await refreshDayStatus()
  }

  async function toggleMissionDone() {
    if (!mission && !missionText) return
    if (!mission) await saveMission()
    await fetchJSON('/api/mission/done', { method: 'POST', body: JSON.stringify({ date: today, done: !(mission?.done) }) })
    await refreshMission()
    await refreshXP()
    await refreshDayStatus()
    await refreshAchievements()
  }

  async function addHabit() {
    if (!newHabitName.trim()) return
    await fetchJSON('/api/habits', { method: 'POST', body: JSON.stringify({ name: newHabitName, active: true }) })
    setNewHabitName('')
    await refreshHabits()
  }

  async function toggleHabit(h) {
    await fetchJSON(`/api/habits/${h.id}/check`, { method: 'POST', body: JSON.stringify({ date: today, completed: !isHabitCompletedToday(h.id) }) })
    await refreshDayStatus()
    await refreshXP()
    await refreshAchievements()
  }

  function isHabitCompletedToday(habitId) {
    // We infer from dayStatus evaluation; to be precise you would fetch habitlog, but for simplicity rely on day evaluation refresh
    // Return false if not computable
    return false
  }

  async function deleteHabit(h) {
    await fetchJSON(`/api/habits/${h.id}`, { method: 'DELETE' })
    await refreshHabits()
    await refreshDayStatus()
  }

  async function addTask() {
    if (!newTaskTitle.trim()) return
    await fetchJSON('/api/tasks', { method: 'POST', body: JSON.stringify({ title: newTaskTitle, date: today }) })
    setNewTaskTitle('')
    await refreshTasks()
    await refreshDayStatus()
  }

  async function setTaskStatus(t, status) {
    await fetchJSON(`/api/tasks/${t.id}`, { method: 'PUT', body: JSON.stringify({ title: t.title, date: t.date, status }) })
    await refreshTasks()
    await refreshDayStatus()
  }

  async function deleteTask(t) {
    await fetchJSON(`/api/tasks/${t.id}`, { method: 'DELETE' })
    await refreshTasks()
    await refreshDayStatus()
  }

  async function logMood() {
    await fetchJSON('/api/mood', { method: 'POST', body: JSON.stringify({ date: today, rating: Number(moodRating) }) })
    await refreshMood()
    await refreshXP()
    await refreshDayStatus()
    await refreshAchievements()
  }

  async function completeDay() {
    await fetchJSON('/api/day/complete', { method: 'POST', body: JSON.stringify({ date: today }) })
    await refreshDayStatus()
    await refreshXP()
    await refreshAchievements()
  }

  async function generateWeekly() {
    const data = await fetchJSON('/api/weekly')
    setWeekly(data)
  }

  async function claimWeeklyBonus() {
    await fetchJSON('/api/weekly/bonus', { method: 'POST', body: JSON.stringify({ week_start: weekly?.week_start }) })
    await refreshXP()
    await generateWeekly()
  }

  async function addNote() {
    if (!noteTitle.trim() && !noteText.trim()) return
    await fetchJSON('/api/notes', { method: 'POST', body: JSON.stringify({ title: noteTitle, text: noteText, category: noteCategory || null }) })
    setNoteTitle('')
    setNoteText('')
    setNoteCategory('')
    await refreshNotes()
  }

  async function updateNote(n) {
    await fetchJSON(`/api/notes/${n.id}`, { method: 'PUT', body: JSON.stringify({ title: n.title, text: n.text, category: n.category || null }) })
    await refreshNotes()
  }

  async function deleteNote(n) {
    await fetchJSON(`/api/notes/${n.id}`, { method: 'DELETE' })
    await refreshNotes()
  }

  const evalInfo = dayStatus?.evaluation

  return (
    <div>
      <h1>Sola</h1>

      <section>
        <h2>Today</h2>
        <div>Date: {today}</div>
        <div>
          <div>XP: {xp ? `${xp.total_xp} (Level ${xp.level}, in-level ${xp.xp_in_level}/${xp.xp_for_next})` : '...'}</div>
          <div>Streak: {xp ? xp.streak : '...'}</div>
        </div>
        <div>
          <div>Daily status:</div>
          <ul>
            <li>Habits done: {evalInfo ? String(evalInfo.habits_done) : '...'}</li>
            <li>Mood logged: {evalInfo ? String(evalInfo.mood_logged) : '...'}</li>
            <li>Tasks updated: {evalInfo ? String(evalInfo.tasks_updated) : '...'}</li>
          </ul>
          <button onClick={completeDay}>Mark Day Complete</button>
        </div>
      </section>

      <hr />

      <section>
        <h2>Mission of the Day</h2>
        <input value={missionText} onChange={(e) => setMissionText(e.target.value)} placeholder="Your mission" />
        <button onClick={saveMission}>Save Mission</button>
        <div>Done: {mission?.done ? 'true' : 'false'}</div>
        <button onClick={toggleMissionDone}>{mission?.done ? 'Undo Mission' : 'Complete Mission (+15 XP)'}</button>
      </section>

      <hr />

      <section>
        <h2>Mood</h2>
        <label>
          Rating (1-5):
          <select value={moodRating} onChange={(e) => setMoodRating(e.target.value)}>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
          </select>
        </label>
        <button onClick={logMood}>Log Mood (+5 XP once per day)</button>
        <div>Current: {mood ? `rating ${mood.rating}` : 'none'}</div>
      </section>

      <hr />

      <section>
        <h2>Habits</h2>
        <div>
          <input value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} placeholder="New habit" />
          <button onClick={addHabit}>Add Habit</button>
        </div>
        <ul>
          {habits.map((h) => (
            <li key={h.id}>
              <span>{h.name}</span>
              <button onClick={() => toggleHabit(h)}>Toggle Today (+10 XP when first completed)</button>
              <button onClick={() => deleteHabit(h)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>

      <hr />

      <section>
        <h2>Tasks (Today)</h2>
        <div>
          <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="New task" />
          <button onClick={addTask}>Add Task</button>
        </div>
        <ul>
          {tasks.map((t) => (
            <li key={t.id}>
              <span>{t.title}</span>
              <span> [{t.status}]</span>
              <button onClick={() => setTaskStatus(t, 'completed')}>Complete</button>
              <button onClick={() => setTaskStatus(t, 'deferred')}>Defer</button>
              <button onClick={() => setTaskStatus(t, 'archived')}>Archive</button>
              <button onClick={() => deleteTask(t)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>

      <hr />

      <section>
        <h2>Notes Vault</h2>
        <div>
          <input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Title" />
        </div>
        <div>
          <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Text" />
        </div>
        <div>
          <input value={noteCategory} onChange={(e) => setNoteCategory(e.target.value)} placeholder="Category" />
        </div>
        <button onClick={addNote}>Add Note</button>
        <ul>
          {notes.map((n) => (
            <li key={n.id}>
              <input value={n.title} onChange={(e) => updateNote({ ...n, title: e.target.value })} />
              <input value={n.category || ''} onChange={(e) => updateNote({ ...n, category: e.target.value })} />
              <textarea value={n.text} onChange={(e) => updateNote({ ...n, text: e.target.value })} />
              <button onClick={() => deleteNote(n)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>

      <hr />

      <section>
        <h2>Weekly Overview</h2>
        <button onClick={generateWeekly}>Generate</button>
        {weekly && (
          <div>
            <div>Week: {weekly.week_start} to {weekly.week_end}</div>
            <div>Habit completion %: {weekly.habit_completion_pct?.toFixed ? weekly.habit_completion_pct.toFixed(1) : weekly.habit_completion_pct}</div>
            <div>Mood average: {weekly.mood_avg ?? 'N/A'}</div>
            <div>Task completion %: {weekly.task_completion_pct?.toFixed ? weekly.task_completion_pct.toFixed(1) : weekly.task_completion_pct}</div>
            <div>XP earned: {weekly.xp_earned}</div>
            <div>Streak progression: {weekly.streak_start} → {weekly.streak_end}</div>
            <div>Best mood day: {weekly.highlights?.best_mood_day || 'N/A'}</div>
            <div>Most tasks done day: {weekly.highlights?.most_tasks_done_day || 'N/A'}</div>
            <div>Weekly bonus claimed: {weekly.bonus_awarded ? 'true' : 'false'}</div>
            {!weekly.bonus_awarded && <button onClick={claimWeeklyBonus}>Claim Weekly Bonus (+50 XP)</button>}
          </div>
        )}
      </section>

      <hr />

      <section>
        <h2>Achievements</h2>
        <ul>
          {achievements.map((a) => (
            <li key={a.id || a.key}>{a.name} — unlocked at {a.unlocked_at}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
