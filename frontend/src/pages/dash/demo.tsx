import { useCallback, useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import './dashboard.css'

type DashboardProps = {
	isDarkMode: boolean
}

type Strategy = 'price_asc' | 'price_desc' | 'rating_asc' | 'rating_desc'
type Algorithm = 'merge_sort' | 'quick_sort'

type FilterColumnKey =
	| 'product_title'
	| 'product_category'
	| 'product_rating'
	| 'discounted_price'
	| 'total_reviews'
	| 'discount_percentage'

type FilterOperator =
	| 'contains'
	| 'equals'
	| 'starts_with'
	| 'eq'
	| 'gt'
	| 'gte'
	| 'lt'
	| 'lte'

type FilterRule = {
	column: FilterColumnKey
	operator: FilterOperator
	value: string
}

type DatasetRow = {
	product_id: string
	[key: string]: string | undefined
}

type RankedDisplayRow = {
	rank: number
	productId: string
	title: string
	category: string
	price: number | null
	rating: number | null
	reviews: number | null
	raw: DatasetRow | null
}

type ProductCardRow = {
	rank: number | null
	productId: string
	title: string
	category: string
	price: number | null
	rating: number | null
	reviews: number | null
	originalPrice: number | null
	discountPercentage: number | null
	imageUrl: string | null
	productUrl: string | null
}

type RankApiResponse = {
	ranked_ids: string[]
	elapsed_time_ms: number
	count: number
}

type RankingResult = {
	rankedIds: string[]
	displayedRows: RankedDisplayRow[]
	elapsedTimeMs: number
	totalTimeMs: number
	count: number
	filteredCount: number
}

type ColumnMeta = {
	key: FilterColumnKey
	label: string
	type: 'text' | 'number'
}

const envApiBaseUrl = (import.meta.env.VITE_RANKING_API_URL as string | undefined)?.trim()
const API_BASE_URLS = envApiBaseUrl
	? [envApiBaseUrl]
	: ['http://localhost:5001', 'http://localhost:5000']
const DATASET_URL = '/data/amazon_products_sales_data_cleaned.csv'

const STRATEGY_OPTIONS: Array<{ value: Strategy; label: string }> = [
	{ value: 'price_desc', label: 'Price descending' },
	{ value: 'price_asc', label: 'Price ascending' },
	{ value: 'rating_desc', label: 'Rating descending' },
	{ value: 'rating_asc', label: 'Rating ascending' },
]

const ALGORITHM_OPTIONS: Array<{ value: Algorithm; label: string }> = [
	{ value: 'merge_sort', label: 'Merge sort' },
	{ value: 'quick_sort', label: 'Quick sort' },
]

const FILTER_COLUMNS: ColumnMeta[] = [
	{ key: 'product_title', label: 'Product title', type: 'text' },
	{ key: 'product_category', label: 'Category', type: 'text' },
	{ key: 'product_rating', label: 'Rating', type: 'number' },
	{ key: 'discounted_price', label: 'Discounted price', type: 'number' },
	{ key: 'total_reviews', label: 'Total reviews', type: 'number' },
	{ key: 'discount_percentage', label: 'Discount percentage', type: 'number' },
]

const TEXT_OPERATORS: Array<{ value: FilterOperator; label: string }> = [
	{ value: 'contains', label: 'contains' },
	{ value: 'equals', label: 'equals' },
	{ value: 'starts_with', label: 'starts with' },
]

const NUMBER_OPERATORS: Array<{ value: FilterOperator; label: string }> = [
	{ value: 'eq', label: '=' },
	{ value: 'gt', label: '>' },
	{ value: 'gte', label: '>=' },
	{ value: 'lt', label: '<' },
	{ value: 'lte', label: '<=' },
]

const getColumnMeta = (column: FilterColumnKey): ColumnMeta => {
	return FILTER_COLUMNS.find((entry) => entry.key === column) ?? FILTER_COLUMNS[0]
}

const getDefaultOperator = (column: FilterColumnKey): FilterOperator => {
	return getColumnMeta(column).type === 'number' ? 'eq' : 'contains'
}

const toNumber = (value: unknown): number | null => {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null
	}

	const normalized = String(value ?? '')
		.trim()
		.replace(/,/g, '')

	if (normalized.length === 0) {
		return null
	}

	const parsed = Number(normalized)
	return Number.isFinite(parsed) ? parsed : null
}

const evaluateFilter = (row: DatasetRow | null, filterRule: FilterRule | null): boolean => {
	if (!filterRule) {
		return true
	}

	if (!row) {
		return false
	}

	const columnMeta = getColumnMeta(filterRule.column)
	const rawValue = row[filterRule.column]

	if (columnMeta.type === 'number') {
		const left = toNumber(rawValue)
		const right = toNumber(filterRule.value)

		if (left === null || right === null) {
			return false
		}

		switch (filterRule.operator) {
			case 'eq':
				return left === right
			case 'gt':
				return left > right
			case 'gte':
				return left >= right
			case 'lt':
				return left < right
			case 'lte':
				return left <= right
			default:
				return false
		}
	}

	const leftText = String(rawValue ?? '').toLowerCase()
	const rightText = filterRule.value.trim().toLowerCase()
	if (rightText.length === 0) {
		return true
	}

	switch (filterRule.operator) {
		case 'equals':
			return leftText === rightText
		case 'starts_with':
			return leftText.startsWith(rightText)
		case 'contains':
		default:
			return leftText.includes(rightText)
	}
}

const normalizeHttpUrl = (value: string | undefined) => {
	const normalized = String(value ?? '').trim()
	if (!normalized) {
		return null
	}

	if (/^https?:\/\//i.test(normalized)) {
		return normalized
	}

	if (normalized.startsWith('//')) {
		return `https:${normalized}`
	}

	return null
}

const formatPrice = (value: number | null) => {
	if (value === null) {
		return '-'
	}

	const hasFraction = Math.abs(value % 1) > 0
	return `$${value.toLocaleString('en-US', {
		minimumFractionDigits: hasFraction ? 2 : 0,
		maximumFractionDigits: hasFraction ? 2 : 0,
	})}`
}

const formatRating = (value: number | null) => {
	if (value === null) {
		return '-'
	}

	return value.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

const formatReviews = (value: number | null) => {
	if (value === null) {
		return '-'
	}

	return Math.round(value).toLocaleString('en-US')
}

const truncateText = (value: string, maxLength: number) => {
	const normalized = value.trim()
	if (normalized.length <= maxLength) {
		return normalized
	}

	return `${normalized.slice(0, maxLength).trimEnd()}…`
}

/* ── Inline SVG icons ── */

const ChevronDownIcon = () => (
	<svg className="dash-select-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
		<path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z" />
	</svg>
)

const ArrowUpRightIcon = () => (
	<svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
		<path d="M5 15L15 5M15 5H8M15 5v7" />
	</svg>
)

/* ── Component ── */

const DashboardPage = ({ isDarkMode: _isDarkMode }: DashboardProps) => {
	const [rows, setRows] = useState<DatasetRow[]>([])
	const [isDatasetLoading, setIsDatasetLoading] = useState(true)
	const [datasetError, setDatasetError] = useState<string | null>(null)

	const [strategy, setStrategy] = useState<Strategy>('price_desc')
	const [algorithm, setAlgorithm] = useState<Algorithm>('merge_sort')
	const [kValue, setKValue] = useState(10)

	const [pendingFilter, setPendingFilter] = useState<FilterRule>({
		column: 'product_title',
		operator: 'contains',
		value: '',
	})
	const [activeFilter, setActiveFilter] = useState<FilterRule | null>(null)

	const [result, setResult] = useState<RankingResult | null>(null)
	const [requestError, setRequestError] = useState<string | null>(null)
	const [isRanking, setIsRanking] = useState(false)
	const [lastRunAt, setLastRunAt] = useState<string | null>(null)

	useEffect(() => {
		let cancelled = false

		const loadDataset = async () => {
			setIsDatasetLoading(true)
			setDatasetError(null)

			try {
				const response = await fetch(DATASET_URL)
				if (!response.ok) {
					throw new Error(`Failed to load dataset CSV (HTTP ${response.status}).`)
				}

				const csvText = await response.text()
				if (cancelled) {
					return
				}

				Papa.parse<Record<string, string>>(csvText, {
					header: true,
					skipEmptyLines: true,
					complete: (results) => {
						if (cancelled) {
							return
						}

						const parsedRows = (results.data ?? []).map((entry, index) => {
							const productId = entry.product_id?.trim() ? entry.product_id.trim() : `prod_${index}`

							const normalizedRow: DatasetRow = {
								product_id: productId,
							}

							Object.entries(entry).forEach(([key, value]) => {
								if (key === 'product_id') {
									return
								}

								normalizedRow[key] = typeof value === 'string' ? value.trim() : value
							})

							return normalizedRow
						})

						setRows(parsedRows)
						setIsDatasetLoading(false)

						if (results.errors.length > 0 && parsedRows.length === 0) {
							setDatasetError('Unable to parse the dataset CSV.')
						}
					},
					error: () => {
						if (cancelled) {
							return
						}
						setRows([])
						setDatasetError('Failed to parse dashboard dataset.')
						setIsDatasetLoading(false)
					},
				})
			} catch (error) {
				if (cancelled) {
					return
				}
				setRows([])
				setDatasetError(error instanceof Error ? error.message : 'Failed to load dashboard dataset.')
				setIsDatasetLoading(false)
			}
		}

		void loadDataset()

		return () => {
			cancelled = true
		}
	}, [])

	const rowsById = useMemo(() => {
		return new Map(rows.map((entry) => [entry.product_id, entry]))
	}, [rows])

	const buildDisplayRows = useCallback(
		(rankedIds: string[], filterRule: FilterRule | null): RankedDisplayRow[] => {
			return rankedIds
				.map((productId, index) => {
					const raw = rowsById.get(productId) ?? null
					return {
						rank: index + 1,
						productId,
						title: raw?.product_title?.trim() || 'Untitled product',
						category: raw?.product_category?.trim() || 'Unknown',
						price: toNumber(raw?.discounted_price),
						rating: toNumber(raw?.product_rating),
						reviews: toNumber(raw?.total_reviews),
						raw,
					}
				})
				.filter((entry) => evaluateFilter(entry.raw, filterRule))
		},
		[rowsById],
	)

	useEffect(() => {
		if (!result) {
			return
		}

		setResult((previous) => {
			if (!previous) {
				return previous
			}

			const displayedRows = buildDisplayRows(previous.rankedIds, activeFilter)
			return {
				...previous,
				displayedRows,
				filteredCount: displayedRows.length,
			}
		})
	}, [activeFilter, buildDisplayRows, result?.rankedIds])

	const applyFilter = () => {
		const normalizedValue = pendingFilter.value.trim()

		if (!normalizedValue) {
			setActiveFilter(null)
			setPendingFilter((previous) => ({ ...previous, value: '' }))
			setRequestError(null)
			return
		}

		// Override mode: each apply replaces the previous active filter.
		setActiveFilter({ ...pendingFilter, value: normalizedValue })
		setRequestError(null)
	}

	const clearFilter = () => {
		setActiveFilter(null)
		setPendingFilter((previous) => ({ ...previous, value: '' }))
		setRequestError(null)
	}

	const runRanking = async () => {
		const sanitizedK = Math.max(1, Math.min(42675, Math.round(kValue || 1)))
		if (sanitizedK !== kValue) {
			setKValue(sanitizedK)
		}

		setIsRanking(true)
		setRequestError(null)

		const requestStart = performance.now()
		try {
			const rankRequestBody = {
				strategy,
				algorithm,
				k: sanitizedK,
			}

			let payload: RankApiResponse | null = null
			let lastErrorMessage = 'Unable to run ranking request.'

			for (const apiBaseUrl of API_BASE_URLS) {
				try {
					const response = await fetch(`${apiBaseUrl}/rank`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(rankRequestBody),
					})

					const body = (await response.json()) as RankApiResponse | { detail?: string }

					if (!response.ok) {
						lastErrorMessage =
							body && 'detail' in body ? body.detail || 'Ranking request failed.' : 'Ranking request failed.'
						continue
					}

					if (!Array.isArray((body as RankApiResponse).ranked_ids)) {
						lastErrorMessage = 'Backend response did not include ranked IDs.'
						continue
					}

					payload = body as RankApiResponse
					break
				} catch (error) {
					lastErrorMessage = error instanceof Error ? error.message : 'Unable to run ranking request.'
				}
			}

			if (!payload) {
				throw new Error(`${lastErrorMessage} Tried ${API_BASE_URLS.join(', ')}.`)
			}

			const totalTimeMs = performance.now() - requestStart
			const displayedRows = buildDisplayRows(payload.ranked_ids, activeFilter)

			setResult({
				rankedIds: payload.ranked_ids,
				displayedRows,
				elapsedTimeMs: payload.elapsed_time_ms,
				totalTimeMs,
				count: payload.count,
				filteredCount: displayedRows.length,
			})
			setLastRunAt(new Date().toLocaleTimeString())
		} catch (error) {
			setRequestError(error instanceof Error ? error.message : 'Unable to run ranking request.')
		} finally {
			setIsRanking(false)
		}
	}

	const selectedColumnMeta = getColumnMeta(pendingFilter.column)
	const operatorOptions = selectedColumnMeta.type === 'number' ? NUMBER_OPERATORS : TEXT_OPERATORS
	const normalizedTopK = Math.max(1, Math.min(42675, Math.round(kValue || 1)))

	const cardRows = useMemo<ProductCardRow[]>(() => {
		if (!result) {
			return []
		}

		return result.displayedRows.map((entry) => ({
			rank: entry.rank,
			productId: entry.productId,
			title: entry.title,
			category: entry.category,
			price: entry.price,
			rating: entry.rating,
			reviews: entry.reviews,
			originalPrice: toNumber(entry.raw?.original_price),
			discountPercentage: toNumber(entry.raw?.discount_percentage),
			imageUrl: normalizeHttpUrl(entry.raw?.product_image_url),
			productUrl: normalizeHttpUrl(entry.raw?.product_page_url),
		}))
	}, [result])

	return (
		<section className="dash-root">
			{/* ambient background blobs */}
			<div className="dash-blob dash-blob--1" />
			<div className="dash-blob dash-blob--2" />
			<div className="dash-blob dash-blob--3" />

			<div className="dash-layout">
				{/* ── Sidebar ── */}
				<aside className="dash-sidebar">
					<div className="dash-sidebar__header">
						<span className="dash-kicker">Control Panel</span>
						<h1 className="dash-title">Dashboard</h1>
					</div>

					{/* Strategy */}
					<div className="dash-control-group">
						<span className="dash-label">Strategy</span>
						<div className="dash-select-wrapper">
							<select
								id="dash-strategy-select"
								className="dash-select"
								value={strategy}
								onChange={(e) => setStrategy(e.target.value as Strategy)}
							>
								{STRATEGY_OPTIONS.map((opt) => (
									<option key={opt.value} value={opt.value}>{opt.label}</option>
								))}
							</select>
							<ChevronDownIcon />
						</div>
					</div>

					<div className="dash-divider" />

					{/* Algorithm */}
					<div className="dash-control-group">
						<span className="dash-label">Algorithm</span>
						<div className="dash-toggle">
							{ALGORITHM_OPTIONS.map((opt) => (
								<button
									key={opt.value}
									type="button"
									className={`dash-toggle__btn${algorithm === opt.value ? ' is-active' : ''}`}
									onClick={() => setAlgorithm(opt.value)}
								>
									{opt.label}
								</button>
							))}
						</div>
					</div>

					<div className="dash-divider" />

					{/* Top K */}
					<div className="dash-control-group">
						<span className="dash-label">Top K</span>
						<input
							id="dash-topk-input"
							type="number"
							className="dash-input"
							min={1}
							max={42675}
							value={kValue}
							onChange={(e) => setKValue(Number(e.target.value))}
						/>
					</div>

					<div className="dash-divider" />

					{/* Filter */}
					<div className="dash-control-group">
						<span className="dash-label">Filter</span>

						<div className="dash-select-wrapper">
							<select
								id="dash-filter-column"
								className="dash-select"
								value={pendingFilter.column}
								onChange={(e) => {
									const nextColumn = e.target.value as FilterColumnKey
									setPendingFilter((prev) => ({
										...prev,
										column: nextColumn,
										operator: getDefaultOperator(nextColumn),
									}))
								}}
							>
								{FILTER_COLUMNS.map((col) => (
									<option key={col.key} value={col.key}>{col.label}</option>
								))}
							</select>
							<ChevronDownIcon />
						</div>

						<div className="dash-select-wrapper">
							<select
								id="dash-filter-operator"
								className="dash-select"
								value={pendingFilter.operator}
								onChange={(e) =>
									setPendingFilter((prev) => ({
										...prev,
										operator: e.target.value as FilterOperator,
									}))
								}
							>
								{operatorOptions.map((opt) => (
									<option key={opt.value} value={opt.value}>{opt.label}</option>
								))}
							</select>
							<ChevronDownIcon />
						</div>

						<input
							id="dash-filter-value"
							className="dash-input"
							value={pendingFilter.value}
							onChange={(e) => setPendingFilter((prev) => ({ ...prev, value: e.target.value }))}
							placeholder={selectedColumnMeta.type === 'number' ? 'Enter number…' : 'Enter text…'}
						/>

						<div className="dash-filter-actions">
							<button id="dash-filter-apply" type="button" className="dash-btn" onClick={applyFilter}>
								Apply
							</button>
							<button id="dash-filter-clear" type="button" className="dash-btn dash-btn--ghost" onClick={clearFilter}>
								Clear
							</button>
						</div>

						{activeFilter && (
							<div className="dash-filter-badge">
								<strong>Active:</strong>
								<span>{getColumnMeta(activeFilter.column).label}</span>
								<span>{activeFilter.operator}</span>
								<span>{activeFilter.value}</span>
							</div>
						)}
					</div>

					{/* Run */}
					<button
						id="dash-run-ranking"
						type="button"
						className="dash-run-btn"
						onClick={runRanking}
						disabled={isRanking || isDatasetLoading}
					>
						{isRanking ? (
							<><span className="dash-spinner" /> Running…</>
						) : (
							'Run ranking'
						)}
					</button>

					{/* Error */}
					{(datasetError || requestError) && (
						<div className="dash-error">{datasetError ?? requestError}</div>
					)}

					{/* Stats */}
					<div className="dash-stats">
						<div className="dash-stat">
							<span className="dash-stat__label">Dataset</span>
							<span className="dash-stat__value">{isDatasetLoading ? '…' : rows.length.toLocaleString()}</span>
						</div>
						<div className="dash-stat">
							<span className="dash-stat__label">Shown</span>
							<span className="dash-stat__value">
								{isDatasetLoading
									? '…'
									: result
										? `${result.filteredCount}/${result.count}`
										: `0/${normalizedTopK}`}
							</span>
						</div>
						<div className="dash-stat">
							<span className="dash-stat__label">Algorithm</span>
							<span className="dash-stat__value">{result ? `${result.elapsedTimeMs.toFixed(2)}ms` : '-'}</span>
						</div>
						<div className="dash-stat">
							<span className="dash-stat__label">Total</span>
							<span className="dash-stat__value">{result ? `${result.totalTimeMs.toFixed(2)}ms` : '-'}</span>
						</div>
					</div>
				</aside>

				{/* ── Main panel ── */}
				<main className="dash-main">
					<div className="dash-main__header">
						<div>
							<span className="dash-kicker">Ranked Product Cards</span>
							<h2 className="dash-heading">Results</h2>
						</div>
						{lastRunAt && <span className="dash-timestamp">Last run at {lastRunAt}</span>}
					</div>

					<div className="dash-results">
						{isDatasetLoading ? (
							<div className="dash-empty">
								<span className="dash-empty-dot" />
								Loading CSV dataset…
							</div>
						) : !result ? (
							<div className="dash-empty">
								<span className="dash-empty-dot" />
								Run ranking to show Top K product cards.
							</div>
						) : cardRows.length === 0 ? (
							<div className="dash-empty">No rows matched the current filter.</div>
						) : (
							<div className="dash-cards-grid">
								{cardRows.map((entry, index) => {
									const discountLabel =
										entry.discountPercentage !== null
											? `${entry.discountPercentage.toFixed(1)}% off`
											: 'Organic'

									return (
										<article key={`${entry.productId}-${index}`} className="dash-card">
											{entry.rank !== null && (
												<span className="dash-card__rank">#{entry.rank}</span>
											)}

											<div className="dash-card__img">
												{entry.imageUrl ? (
													<img
														src={entry.imageUrl}
														alt={entry.title}
														onError={(e) => {
															e.currentTarget.style.display = 'none'
														}}
													/>
												) : null}
											</div>

											<div className="dash-card__body">
												<h3 className="dash-card__title">{truncateText(entry.title, 78)}</h3>
												<p className="dash-card__price">{formatPrice(entry.price)}</p>

												{entry.originalPrice !== null &&
													entry.price !== null &&
													entry.originalPrice > entry.price && (
														<p className="dash-card__original-price">{formatPrice(entry.originalPrice)}</p>
													)}

												<p className="dash-card__meta">
													★ {formatRating(entry.rating)} · {formatReviews(entry.reviews)} reviews · {entry.category}
												</p>

												<div className="dash-card__footer">
													<span className="dash-card__discount">{discountLabel}</span>
													{entry.productUrl ? (
														<a
															href={entry.productUrl}
															target="_blank"
															rel="noreferrer"
															className="dash-card__link"
														>
															View <ArrowUpRightIcon />
														</a>
													) : (
														<span className="dash-card__no-link">No link</span>
													)}
												</div>
											</div>
										</article>
									)
								})}
							</div>
						)}
					</div>
				</main>
			</div>
		</section>
	)
}

export default DashboardPage
