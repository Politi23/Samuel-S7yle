// ── Mock de Supabase para modo demo (sin base de datos real) ──────────────────
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

// Almacén en memoria
const store = {
  clientes: [],
  ingresos: [],
  citas: [],
  egresos: [],
}

let nextId = 1
const uid = () => String(nextId++)

// Listeners de auth
const authListeners = []
let currentSession = DEMO_MODE ? { user: { id: 'demo', email: 'demo@barbershop.com' } } : null

function notifyAuth(event, session) {
  authListeners.forEach(fn => fn(event, session))
}

// ── Builder de query ──────────────────────────────────────────────────────────
function makeQuery(table) {
  let _filters = []
  let _orderCol = null
  let _orderAsc = true
  let _limit = null
  let _insertData = null
  let _updateData = null
  let _deleteMode = false
  let _singleMode = false

  const q = {
    select: () => q,
    order: (col, { ascending = true } = {}) => { _orderCol = col; _orderAsc = ascending; return q },
    limit: (n) => { _limit = n; return q },
    eq: (col, val) => { _filters.push({ col, val }); return q },
    insert: (data) => { _insertData = data; return q },
    update: (data) => { _updateData = data; return q },
    delete: () => { _deleteMode = true; return q },
    single: () => { _singleMode = true; return q },

    then: (resolve) => {
      let result = { data: null, error: null }

      if (_insertData) {
        const now = new Date().toISOString()
        const row = { ..._insertData, id: uid(), created_at: now }
        store[table].unshift(row)
        result.data = _singleMode ? row : [row]

      } else if (_updateData) {
        let updated = null
        store[table] = store[table].map(row => {
          const match = _filters.every(f => String(row[f.col]) === String(f.val))
          if (match) { updated = { ...row, ..._updateData }; return updated }
          return row
        })
        result.data = _singleMode ? updated : [updated]

      } else if (_deleteMode) {
        store[table] = store[table].filter(row =>
          !_filters.every(f => String(row[f.col]) === String(f.val))
        )
        result.data = null

      } else {
        // SELECT
        let rows = [...store[table]]
        if (_filters.length) rows = rows.filter(row => _filters.every(f => String(row[f.col]) === String(f.val)))
        if (_orderCol) rows.sort((a, b) => {
          const va = a[_orderCol], vb = b[_orderCol]
          return _orderAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
        })
        if (_limit) rows = rows.slice(0, _limit)
        result.data = _singleMode ? (rows[0] || null) : rows
      }

      return Promise.resolve(resolve(result))
    }
  }
  return q
}

// ── Cliente mock ──────────────────────────────────────────────────────────────
export const supabase = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: currentSession } }),

    signInWithPassword: ({ email }) => {
      currentSession = { user: { id: 'demo', email } }
      setTimeout(() => notifyAuth('SIGNED_IN', currentSession), 0)
      return Promise.resolve({ error: null })
    },

    signOut: () => {
      currentSession = null
      setTimeout(() => notifyAuth('SIGNED_OUT', null), 0)
      return Promise.resolve({ error: null })
    },

    onAuthStateChange: (fn) => {
      authListeners.push(fn)
      return { data: { subscription: { unsubscribe: () => {
        const i = authListeners.indexOf(fn)
        if (i !== -1) authListeners.splice(i, 1)
      }}}}
    },
  },

  from: (table) => makeQuery(table),
}
