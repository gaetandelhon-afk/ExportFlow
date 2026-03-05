'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Upload, Image as ImageIcon, CheckCircle, AlertCircle, X,
  Loader2, Package, Search, FileArchive, AlertTriangle
} from 'lucide-react'
import { matchImagesToProducts, updateMatch, extractImagesFromZip, ImageMatch, MatchProduct } from '@/lib/image-matcher'

type UploadStatus = 'idle' | 'uploading' | 'completed'
type UploadResult = {
  filename: string
  productRef: string
  status: 'success' | 'error' | 'skipped'
  error?: string
}

export default function BatchImageImport() {
  const [files, setFiles] = useState<File[]>([])
  const [matches, setMatches] = useState<ImageMatch[]>([])
  const [products, setProducts] = useState<MatchProduct[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([])
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0)
  const [replaceExisting, setReplaceExisting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products/list')
      const data = await res.json()
      setProducts((data.products || []).map((p: { id: string; ref: string; nameEn: string; photoUrl?: string | null }) => ({
        id: p.id,
        ref: p.ref,
        nameEn: p.nameEn,
        photoUrl: p.photoUrl || null
      })))
    } catch (error) {
      console.error('Failed to load products:', error)
    }
  }, [])

  useEffect(() => {
    if (isExpanded && products.length === 0) {
      loadProducts()
    }
  }, [isExpanded, loadProducts, products.length])

  const handleFiles = async (selectedFiles: FileList | File[]) => {
    setIsProcessing(true)

    try {
      const fileArray = Array.from(selectedFiles)
      let allFiles: File[] = []

      for (const file of fileArray) {
        if (file.name.endsWith('.zip')) {
          const extracted = await extractImagesFromZip(file)
          allFiles = [...allFiles, ...extracted]
        } else if (file.type.startsWith('image/')) {
          allFiles.push(file)
        }
      }

      if (allFiles.length === 0) {
        alert('No valid images found. Please upload images or a ZIP file containing images.')
        setIsProcessing(false)
        return
      }

      if (products.length === 0) {
        await loadProducts()
      }

      const matched = matchImagesToProducts(allFiles, products)

      setFiles(allFiles)
      setMatches(matched)

    } catch (error) {
      console.error('Error processing files:', error)
      alert('Error processing files. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [products])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files)
  }

  const handleProductChange = (filename: string, productId: string) => {
    const updated = updateMatch(matches, filename, productId, products)
    setMatches(updated)
  }

  const handleUpload = async () => {
    // Include all images with a productId — both 'matched' (first for a product)
    // and 'duplicate' (additional images → go to gallery)
    const toUpload = matches.filter(m => m.productId !== null && m.status !== 'no-match')

    if (toUpload.length === 0) {
      alert('No images to upload. Please assign each image to a product first.')
      return
    }

    setUploadStatus('uploading')
    setUploadResults([])
    setCurrentUploadIndex(0)

    const results: UploadResult[] = []

    // Track which products have already received their first upload in this batch.
    // Only the first image per product respects the replaceExisting flag;
    // subsequent ones always append to the gallery.
    const firstUploadedPerProduct = new Set<string>()

    for (let i = 0; i < toUpload.length; i++) {
      const match = toUpload[i]
      setCurrentUploadIndex(i + 1)

      const isFirstForProduct = !firstUploadedPerProduct.has(match.productId!)
      const shouldReplace = isFirstForProduct && replaceExisting
      if (isFirstForProduct) firstUploadedPerProduct.add(match.productId!)

      try {
        const formData = new FormData()
        formData.append('file', match.file)
        formData.append('productId', match.productId!)
        formData.append('replaceExisting', shouldReplace.toString())

        const res = await fetch('/api/products/batch-upload-images', {
          method: 'POST',
          body: formData
        })

        const data = await res.json()

        if (res.ok) {
          results.push({
            filename: match.filename,
            productRef: match.productRef,
            status: 'success'
          })
        } else if (res.status === 409 && data.skipped) {
          results.push({
            filename: match.filename,
            productRef: match.productRef,
            status: 'skipped',
            error: 'Product already has image'
          })
        } else {
          results.push({
            filename: match.filename,
            productRef: match.productRef,
            status: 'error',
            error: data.error || 'Upload failed'
          })
        }
      } catch (error) {
        results.push({
          filename: match.filename,
          productRef: match.productRef,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        })
      }
    }

    setUploadResults(results)
    setUploadStatus('completed')
  }

  const stats = {
    total: matches.length,
    matched: matches.filter(m => m.status === 'matched').length,
    lowConfidence: matches.filter(m => m.status === 'low-confidence').length,
    noMatch: matches.filter(m => m.status === 'no-match').length,
    duplicate: matches.filter(m => m.status === 'duplicate').length
  }

  const filteredMatches = searchQuery.trim() === ''
    ? matches
    : matches.filter(m =>
        m.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.productRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.productName.toLowerCase().includes(searchQuery.toLowerCase())
      )

  const reset = () => {
    setFiles([])
    setMatches([])
    setUploadStatus('idle')
    setUploadResults([])
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full p-6 rounded-xl border-2 border-dashed border-[#d2d2d7]/50 hover:border-[#0071e3]/50 transition-all text-center"
      >
        <div className="w-12 h-12 mx-auto rounded-xl bg-[#f5f5f7] flex items-center justify-center mb-3">
          <ImageIcon className="w-6 h-6 text-[#86868b]" />
        </div>
        <p className="text-[15px] font-semibold text-[#1d1d1f] mb-1">Batch Import Photos</p>
        <p className="text-[13px] text-[#86868b]">
          Upload product images with automatic matching by filename
        </p>
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-[#d2d2d7]/30 bg-white overflow-hidden">
      <div className="p-4 border-b border-[#d2d2d7]/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-[#0071e3]" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Batch Import Photos</h3>
            <p className="text-[12px] text-[#86868b]">Auto-match images to products by filename</p>
          </div>
        </div>
        <button
          onClick={() => { setIsExpanded(false); reset() }}
          className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-[#86868b]" />
        </button>
      </div>

      <div className="p-4">
        {/* Instructions */}
        {files.length === 0 && uploadStatus === 'idle' && (
          <div className="mb-4 p-3 bg-[#f5f5f7] rounded-lg text-[12px] text-[#86868b]">
            <p className="font-medium text-[#1d1d1f] mb-1">How it works:</p>
            <ul className="space-y-0.5">
              <li>• Name your image files with the product reference (e.g., TB-030.jpg, TB030.png)</li>
              <li>• The system will automatically match images to products</li>
              <li>• Review and adjust matches before uploading</li>
              <li>• Supports JPG, PNG, WebP and ZIP archives</li>
            </ul>
          </div>
        )}

        {/* Upload completed */}
        {uploadStatus === 'completed' && (
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#34c759]/10 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#34c759]" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#1d1d1f]">Upload Complete</p>
                <p className="text-[12px] text-[#86868b]">
                  {uploadResults.filter(r => r.status === 'success').length} images uploaded
                </p>
              </div>
            </div>

            <div className="space-y-1 max-h-[200px] overflow-y-auto mb-4">
              {uploadResults.map((result, i) => (
                <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-[12px] ${
                  result.status === 'success' ? 'bg-[#34c759]/5' :
                  result.status === 'skipped' ? 'bg-[#ff9500]/5' :
                  'bg-[#ff3b30]/5'
                }`}>
                  {result.status === 'success' && <CheckCircle className="w-3 h-3 text-[#34c759]" />}
                  {result.status === 'skipped' && <AlertTriangle className="w-3 h-3 text-[#ff9500]" />}
                  {result.status === 'error' && <AlertCircle className="w-3 h-3 text-[#ff3b30]" />}
                  <span className="truncate">{result.filename} → {result.productRef}</span>
                  {result.error && <span className="text-[#86868b] ml-auto">{result.error}</span>}
                </div>
              ))}
            </div>

            <button
              onClick={reset}
              className="h-9 px-4 bg-[#0071e3] text-white text-[13px] font-medium rounded-lg hover:bg-[#0077ed]"
            >
              Import More Images
            </button>
          </div>
        )}

        {/* Upload area */}
        {files.length === 0 && uploadStatus === 'idle' && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`rounded-xl border-2 border-dashed transition-all ${
              isDragging
                ? 'border-[#0071e3] bg-[#0071e3]/5'
                : 'border-[#d2d2d7]/50 hover:border-[#0071e3]/50'
            }`}
          >
            <label className="block p-8 cursor-pointer">
              <input
                type="file"
                accept="image/*,.zip"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="text-center">
                <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3 ${
                  isDragging ? 'bg-[#0071e3]/10' : 'bg-[#f5f5f7]'
                }`}>
                  {isDragging ? (
                    <Upload className="w-6 h-6 text-[#0071e3]" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-[#86868b]" />
                  )}
                </div>
                <p className="text-[14px] font-semibold text-[#1d1d1f] mb-1">
                  Drop images here or click to browse
                </p>
                <div className="flex items-center justify-center gap-4 text-[12px] text-[#86868b]">
                  <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Multiple images</span>
                  <span className="flex items-center gap-1"><FileArchive className="w-3 h-3" /> ZIP archives</span>
                </div>
              </div>
            </label>
          </div>
        )}

        {/* Processing */}
        {isProcessing && (
          <div className="p-6 text-center">
            <Loader2 className="w-6 h-6 text-[#0071e3] animate-spin mx-auto mb-2" />
            <p className="text-[13px] text-[#86868b]">Processing images...</p>
          </div>
        )}

        {/* Matches review */}
        {matches.length > 0 && uploadStatus === 'idle' && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="bg-[#f5f5f7] rounded-lg p-2">
                <p className="text-[18px] font-semibold text-[#1d1d1f]">{stats.total}</p>
                <p className="text-[10px] text-[#86868b]">Total</p>
              </div>
              <div className="bg-[#34c759]/10 rounded-lg p-2">
                <p className="text-[18px] font-semibold text-[#34c759]">{stats.matched}</p>
                <p className="text-[10px] text-[#34c759]">Matched</p>
              </div>
              <div className="bg-[#ff9500]/10 rounded-lg p-2">
                <p className="text-[18px] font-semibold text-[#ff9500]">{stats.lowConfidence}</p>
                <p className="text-[10px] text-[#ff9500]">Review</p>
              </div>
              <div className="bg-[#ff3b30]/10 rounded-lg p-2">
                <p className="text-[18px] font-semibold text-[#ff3b30]">{stats.noMatch}</p>
                <p className="text-[10px] text-[#ff3b30]">No Match</p>
              </div>
              <div className="bg-[#86868b]/10 rounded-lg p-2">
                <p className="text-[18px] font-semibold text-[#86868b]">{stats.duplicate}</p>
                <p className="text-[10px] text-[#86868b]">Duplicate</p>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between gap-3 p-3 bg-[#f5f5f7] rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer text-[12px]">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="w-4 h-4 rounded border-[#d2d2d7] text-[#0071e3]"
                />
                Replace existing images
              </label>

              <div className="flex items-center gap-2">
                <Search className="w-3 h-3 text-[#86868b]" />
                <input
                  type="text"
                  placeholder="Filter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 px-2 bg-white rounded border border-[#d2d2d7] text-[11px] focus:outline-none focus:ring-1 focus:ring-[#0071e3] w-[150px]"
                />
              </div>
            </div>

            {/* Matches table */}
            <div className="border border-[#d2d2d7]/30 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-[#f5f5f7] border-b border-[#d2d2d7]/30">
                  <tr>
                    <th className="text-left py-2 px-3 text-[#86868b] font-medium w-[60px]">Image</th>
                    <th className="text-left py-2 px-3 text-[#86868b] font-medium">Filename</th>
                    <th className="text-left py-2 px-3 text-[#86868b] font-medium">Product</th>
                    <th className="text-left py-2 px-3 text-[#86868b] font-medium w-[80px]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMatches.map((match, i) => {
                    const imageUrl = URL.createObjectURL(match.file)

                    return (
                      <tr key={i} className="border-b border-[#d2d2d7]/20 hover:bg-[#f5f5f7]/50">
                        <td className="py-2 px-3">
                          <img
                            src={imageUrl}
                            alt={match.filename}
                            className="w-10 h-10 object-cover rounded"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <p className="text-[#1d1d1f] font-medium truncate max-w-[120px]">
                            {match.filename}
                          </p>
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={match.productId || ''}
                            onChange={(e) => handleProductChange(match.filename, e.target.value)}
                            className="w-full h-7 px-2 bg-white rounded border border-[#d2d2d7] text-[11px] focus:outline-none focus:ring-1 focus:ring-[#0071e3]"
                          >
                            <option value="">-- Select --</option>
                            {match.suggestedProducts && match.suggestedProducts.length > 0 && (
                              <optgroup label="Suggested">
                                {match.suggestedProducts.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.ref} ({Math.round(p.score * 100)}%)
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <optgroup label="All Products">
                              {products.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.ref} - {p.nameEn}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          {match.status === 'matched' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#34c759]/10 text-[#34c759] text-[10px] font-medium rounded">
                              <CheckCircle className="w-2.5 h-2.5" />
                              Ready
                            </span>
                          )}
                          {match.status === 'low-confidence' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#ff9500]/10 text-[#ff9500] text-[10px] font-medium rounded">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Review
                            </span>
                          )}
                          {match.status === 'no-match' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#ff3b30]/10 text-[#ff3b30] text-[10px] font-medium rounded">
                              <X className="w-2.5 h-2.5" />
                              None
                            </span>
                          )}
                          {match.status === 'duplicate' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#5856d6]/10 text-[#5856d6] text-[10px] font-medium rounded">
                              <ImageIcon className="w-2.5 h-2.5" />
                              +Gallery
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={reset}
                className="h-9 px-4 text-[13px] font-medium text-[#1d1d1f] bg-[#f5f5f7] rounded-lg hover:bg-[#e8e8ed]"
              >
                Cancel
              </button>

              {(() => {
                const uploadCount = matches.filter(
                  m => m.productId !== null && m.status !== 'no-match'
                ).length
                return (
                  <button
                    onClick={handleUpload}
                    disabled={uploadCount === 0}
                    className="h-9 px-4 flex items-center gap-2 text-[13px] font-medium text-white bg-[#0071e3] rounded-lg hover:bg-[#0077ed] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload {uploadCount} Image{uploadCount !== 1 ? 's' : ''}
                  </button>
                )
              })()}
            </div>
          </div>
        )}

        {/* Uploading progress */}
        {uploadStatus === 'uploading' && (
          <div className="p-6 text-center">
            <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin mx-auto mb-3" />
            <p className="text-[14px] font-semibold text-[#1d1d1f] mb-1">Uploading Images</p>
            <p className="text-[12px] text-[#86868b] mb-3">
              {currentUploadIndex} of {matches.filter(m => m.productId !== null && m.status !== 'no-match').length}
            </p>
            <div className="max-w-xs mx-auto h-2 bg-[#d2d2d7]/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0071e3] transition-all duration-300"
                style={{
                  width: `${(currentUploadIndex / Math.max(1, matches.filter(m => m.productId !== null && m.status !== 'no-match').length)) * 100}%`
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
