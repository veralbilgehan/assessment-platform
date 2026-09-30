import type { AiDurumu } from '@shared/ai'
import { bellekteMi, sifreliOku, sifreliSil, sifreliYaz } from '../sifreliDepo'

// Claude API anahtarı şifreli depoda "ai-anahtar" adıyla tutulur.
const AD = 'ai-anahtar'

export const anahtarOku = () => sifreliOku(AD)
export const anahtarYaz = (anahtar: string) => sifreliYaz(AD, anahtar)
export const anahtarSil = () => sifreliSil(AD)

export async function durum(): Promise<AiDurumu> {
  const kayitli = await anahtarOku()
  return {
    anahtarVar: !!kayitli || !!process.env.ANTHROPIC_API_KEY,
    kaynak: kayitli ? 'kayitli' : process.env.ANTHROPIC_API_KEY ? 'ortam' : null,
    sifreli: !!kayitli && !bellekteMi(AD),
  }
}
