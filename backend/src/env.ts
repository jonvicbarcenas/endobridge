import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'dotenv'

for (const file of ['.env', '.env.local']) {
  const path = resolve(process.cwd(), 'backend', file)
  if (existsSync(path)) {
    const parsed = parse(readFileSync(path))
    Object.entries(parsed).forEach(([key, value]) => {
      if (value.trim() && !process.env[key]) {
        process.env[key] = value
      }
    })
  }
}
