export type ImageMatch = {
  filename: string
  file: File
  productId: string | null
  productRef: string
  productName: string
  confidence: number
  status: 'matched' | 'no-match' | 'low-confidence' | 'duplicate'
  suggestedProducts?: Array<{ id: string; ref: string; nameEn: string; score: number }>
}

export type MatchProduct = {
  id: string
  ref: string
  nameEn: string
  photoUrl: string | null
}

function normalizeForMatching(str: string): string {
  return str
    .replace(/\.(jpg|jpeg|png|webp|gif|heic|bmp|tiff?)$/i, '')
    .replace(/[_\-\s\.]/g, '')
    .replace(/_(front|back|side|top|bottom|main|detail|image|img|photo|pic|1|2|3|4|5)$/i, '')
    .replace(/^(img|image|photo|pic|product)[_\-\s]*/i, '')
    .toUpperCase()
    .trim()
}

function compareTwoStrings(str1: string, str2: string): number {
  if (str1 === str2) return 1
  if (str1.length < 2 || str2.length < 2) return 0

  const bigrams1 = new Map<string, number>()
  for (let i = 0; i < str1.length - 1; i++) {
    const bigram = str1.substring(i, i + 2)
    const count = bigrams1.get(bigram) || 0
    bigrams1.set(bigram, count + 1)
  }

  let intersectionSize = 0
  for (let i = 0; i < str2.length - 1; i++) {
    const bigram = str2.substring(i, i + 2)
    const count = bigrams1.get(bigram) || 0
    if (count > 0) {
      bigrams1.set(bigram, count - 1)
      intersectionSize++
    }
  }

  return (2.0 * intersectionSize) / (str1.length + str2.length - 2)
}

export function matchImagesToProducts(
  files: File[],
  products: MatchProduct[]
): ImageMatch[] {
  const matches: ImageMatch[] = []
  const matchedProductIds = new Set<string>()

  for (const file of files) {
    const cleanFilename = normalizeForMatching(file.name)

    const scoredProducts = products.map(product => {
      const cleanRef = normalizeForMatching(product.ref)

      if (cleanFilename === cleanRef) {
        return { product, score: 1.0, isExact: true }
      }

      let score = compareTwoStrings(cleanFilename, cleanRef)

      if (cleanFilename.includes(cleanRef) || cleanRef.includes(cleanFilename)) {
        score = Math.min(score + 0.15, 1.0)
      }

      const minLen = Math.min(cleanFilename.length, cleanRef.length)
      let matchingPrefix = 0
      for (let i = 0; i < minLen; i++) {
        if (cleanFilename[i] === cleanRef[i]) matchingPrefix++
        else break
      }
      if (matchingPrefix >= 3) {
        score = Math.min(score + matchingPrefix * 0.05, 1.0)
      }

      return { product, score, isExact: false }
    })

    scoredProducts.sort((a, b) => b.score - a.score)

    const bestMatch = scoredProducts[0]
    const topSuggestions = scoredProducts.slice(0, 5).filter(s => s.score > 0.3)

    let status: ImageMatch['status'] = 'no-match'
    let matchedProduct: MatchProduct | null = null

    if (bestMatch && bestMatch.score >= 0.7) {
      matchedProduct = bestMatch.product

      if (matchedProduct.photoUrl || matchedProductIds.has(matchedProduct.id)) {
        status = 'duplicate'
      } else {
        status = 'matched'
        matchedProductIds.add(matchedProduct.id)
      }
    } else if (bestMatch && bestMatch.score >= 0.5) {
      matchedProduct = bestMatch.product
      status = 'low-confidence'
    }

    matches.push({
      filename: file.name,
      file,
      productId: status === 'matched' ? matchedProduct?.id || null : null,
      productRef: matchedProduct?.ref || '',
      productName: matchedProduct?.nameEn || '',
      confidence: bestMatch?.score || 0,
      status,
      suggestedProducts: topSuggestions.map(s => ({
        id: s.product.id,
        ref: s.product.ref,
        nameEn: s.product.nameEn,
        score: s.score
      }))
    })
  }

  return matches
}

export function updateMatch(
  matches: ImageMatch[],
  filename: string,
  newProductId: string,
  products: MatchProduct[]
): ImageMatch[] {
  const product = products.find(p => p.id === newProductId)
  if (!product) return matches

  return matches.map(m => {
    if (m.filename === filename) {
      const isDuplicate = product.photoUrl !== null

      return {
        ...m,
        productId: newProductId,
        productRef: product.ref,
        productName: product.nameEn,
        confidence: 1.0,
        status: isDuplicate ? 'duplicate' : 'matched'
      }
    }
    return m
  })
}

export async function extractImagesFromZip(zipFile: File): Promise<File[]> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(await zipFile.arrayBuffer())

  const imageFiles: File[] = []
  const imageExtensions = /\.(jpg|jpeg|png|webp|gif|heic)$/i

  for (const [filename, file] of Object.entries(zip.files)) {
    if (file.dir || !imageExtensions.test(filename)) continue
    if (filename.includes('__MACOSX') || filename.startsWith('.')) continue

    const blob = await file.async('blob')
    const extractedFile = new File([blob], filename.split('/').pop() || filename, {
      type: blob.type || 'image/jpeg'
    })

    imageFiles.push(extractedFile)
  }

  return imageFiles
}
