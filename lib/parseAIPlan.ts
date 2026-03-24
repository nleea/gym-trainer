// lib/parseAIPlan.ts
// Parses structured AI-generated training + nutrition plan text

export interface ParsedMacros {
  proteina: number
  carbohidratos: number
  grasas: number
}

export interface ParsedPlanHeader {
  cliente: string
  objetivo: string
  duracion: string
  semanas: number
  calorias: number
  macros: ParsedMacros
  aguaMl: number
}

export interface ParsedExercise {
  numero: number
  nombre: string
  series: number
  reps: string
  descanso: string
  notas: string
}

export interface ParsedTrainingDay {
  numero: number
  nombre: string
  tipo: string
  ejercicios: ParsedExercise[]
}

export interface ParsedFood {
  nombre: string
  cantidad: string
  proteina: number
  carbos: number
  grasas: number
  kcal: number
}

export interface ParsedMeal {
  numero: number
  nombre: string
  hora: string
  alimentos: ParsedFood[]
  totales: { proteina: number; carbos: number; grasas: number; kcal: number }
}

export interface ParsedAIPlan {
  plan: ParsedPlanHeader
  entrenamiento: ParsedTrainingDay[]
  nutricion: ParsedMeal[]
  notas: string[]
}

function extractBlock(text: string, startTag: string, endTag: string): string {
  const startIdx = text.indexOf(startTag)
  const endIdx = text.indexOf(endTag)
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    throw new Error(
      `No se encontró el bloque ${startTag} / ${endTag} en el texto. Asegúrate de pegar la respuesta completa de la IA.`
    )
  }
  return text.substring(startIdx + startTag.length, endIdx).trim()
}

function extractField(block: string, label: string): string {
  const regex = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`, 'i')
  const match = block.match(regex)
  return match ? match[1].trim() : ''
}

function parseNumber(str: string | undefined | null): number {
  if (!str) return 0
  const cleaned = str.replace(/[^\d.,]/g, '').replace(',', '.')
  return Number(cleaned) || 0
}

function parseTableRows(tableText: string): string[][] {
  return tableText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('|') && !line.match(/^\|[\s\-|]+\|$/))
    .map(line =>
      line
        .split('|')
        .slice(1, -1)
        .map(cell => cell.trim())
    )
    .filter(row => row.length > 1)
}

function parsePlanHeader(block: string): ParsedPlanHeader {
  const cliente = extractField(block, 'Cliente')
  const objetivo = extractField(block, 'Objetivo')
  const duracion = extractField(block, 'Duración del plan')
  const caloriasStr = extractField(block, 'Calorías diarias totales')
  const calorias = parseNumber(caloriasStr)

  // Extract weeks from duration (e.g. "8 semanas" → 8)
  const weeksMatch = duracion.match(/(\d+)\s*semana/i)
  const semanas = weeksMatch ? parseInt(weeksMatch[1]) : 4

  // Extract water
  const aguaStr = extractField(block, 'Agua diaria')
  let aguaMl = parseNumber(aguaStr)
  // If specified in liters, convert
  if (aguaStr.toLowerCase().includes('litro') || aguaStr.toLowerCase().includes('l')) {
    const liters = parseNumber(aguaStr)
    if (liters > 0 && liters < 20) aguaMl = liters * 1000
  }
  if (!aguaMl) aguaMl = 2500 // default

  const macrosStr = extractField(block, 'Macros diarios')
  const macros: ParsedMacros = { proteina: 0, carbohidratos: 0, grasas: 0 }

  const protMatch = macrosStr.match(/Prote[ií]na\s*([\d.,]+)/i)
  const carbMatch = macrosStr.match(/Carbohidratos\s*([\d.,]+)/i)
  const fatMatch = macrosStr.match(/Grasas\s*([\d.,]+)/i)

  if (protMatch) macros.proteina = parseNumber(protMatch[1])
  if (carbMatch) macros.carbohidratos = parseNumber(carbMatch[1])
  if (fatMatch) macros.grasas = parseNumber(fatMatch[1])

  return { cliente, objetivo, duracion, semanas, calorias, macros, aguaMl }
}

function parseTraining(block: string): ParsedTrainingDay[] {
  const days: ParsedTrainingDay[] = []
  const dayRegex = /####\s*DIA[_\s](\d+)/gi
  const dayMatches = [...block.matchAll(dayRegex)]

  for (let i = 0; i < dayMatches.length; i++) {
    const match = dayMatches[i]
    const numero = parseInt(match[1])
    const start = match.index! + match[0].length
    const end = i < dayMatches.length - 1 ? dayMatches[i + 1].index! : block.length
    const dayBlock = block.substring(start, end).trim()

    const nombre = extractField(dayBlock, 'Nombre del día')
    const tipo = extractField(dayBlock, 'Tipo')

    const rows = parseTableRows(dayBlock)
    // Skip header row (first row with column names)
    const dataRows = rows.filter(r => !(r[0] || '').match(/^#$|^Ejercicio$/i))

    const ejercicios: ParsedExercise[] = dataRows.map((row, idx) => ({
      numero: parseNumber(row[0]) || idx + 1,
      nombre: row[1] || '',
      series: parseNumber(row[2]),
      reps: row[3] || '',
      descanso: row[4] || '',
      notas: row[5] || '',
    }))

    days.push({ numero, nombre, tipo, ejercicios })
  }

  return days
}

function parseNutrition(block: string): ParsedMeal[] {
  const meals: ParsedMeal[] = []
  const mealRegex = /####\s*COMIDA[_\s](\d+)/gi
  const mealMatches = [...block.matchAll(mealRegex)]

  for (let i = 0; i < mealMatches.length; i++) {
    const match = mealMatches[i]
    const numero = parseInt(match[1])
    const start = match.index! + match[0].length
    const end = i < mealMatches.length - 1 ? mealMatches[i + 1].index! : block.length
    const mealBlock = block.substring(start, end).trim()

    const nombre = extractField(mealBlock, 'Nombre')
    const hora = extractField(mealBlock, 'Hora sugerida')

    const rows = parseTableRows(mealBlock)
    const dataRows = rows.filter(
      r => !(r[0] || '').match(/^Alimento$/i) && !(r[0] || '').match(/^\*\*TOTAL\*\*/)
    )

    const alimentos: ParsedFood[] = dataRows.map(row => ({
      nombre: row[0] || '',
      cantidad: row[1] || '',
      proteina: parseNumber(row[2]),
      carbos: parseNumber(row[3]),
      grasas: parseNumber(row[4]),
      kcal: parseNumber(row[5]),
    }))

    const totalRow = rows.find(r => (r[0] || '').match(/^\*\*TOTAL\*\*/))
    const totales = totalRow
      ? {
          proteina: parseNumber(totalRow[2]),
          carbos: parseNumber(totalRow[3]),
          grasas: parseNumber(totalRow[4]),
          kcal: parseNumber(totalRow[5]),
        }
      : alimentos.reduce(
          (acc, f) => ({
            proteina: acc.proteina + f.proteina,
            carbos: acc.carbos + f.carbos,
            grasas: acc.grasas + f.grasas,
            kcal: acc.kcal + f.kcal,
          }),
          { proteina: 0, carbos: 0, grasas: 0, kcal: 0 }
        )

    meals.push({ numero, nombre, hora, alimentos, totales })
  }

  return meals
}

function parseNotes(block: string): string[] {
  return block
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('-'))
    .map(line => line.replace(/^-\s*/, '').trim())
}

export function parseAIPlan(text: string): ParsedAIPlan {
  const planBlock = extractBlock(text, '### PLAN_INICIO', '### PLAN_FIN')
  const trainingBlock = extractBlock(text, '### ENTRENAMIENTO_INICIO', '### ENTRENAMIENTO_FIN')
  const nutritionBlock = extractBlock(text, '### NUTRICION_INICIO', '### NUTRICION_FIN')
  const notesBlock = extractBlock(text, '### NOTAS_ENTRENADOR_INICIO', '### NOTAS_ENTRENADOR_FIN')

  return {
    plan: parsePlanHeader(planBlock),
    entrenamiento: parseTraining(trainingBlock),
    nutricion: parseNutrition(nutritionBlock),
    notas: parseNotes(notesBlock),
  }
}
