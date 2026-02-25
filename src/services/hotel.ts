import Taro from '@tarojs/taro'

export interface HotelSearchParams {
  city: string;
  keyword: string;
  checkInDate: string;
  checkOutDate: string;
  tags: string[];
}

/**
 * 列表页用的酒店条目
 */
export interface HotelItem {
  hotelId: string;
  hotelName: string;
  address: string;
  coverImage: string;
  tags: string[];
  minPrice: number;
  score: number;
  starRating: number;

  commentCount: number;
}

interface HotelSearchData {
  list: HotelItem[];
  total: number;
}

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface HotelRoomType {
  id: string;
  hotelId: string;
  name: string;
  bedType: string;
  capacity: number;
  areaSqm: number;
  basePriceCents: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface HotelNearbyPlace {
  id: string;
  hotelId: string;
  type: 'ATTRACTION' | 'TRANSPORT' | 'MALL' | string;
  name: string;
  distanceMeters: number;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface HotelDiscount {
  id: string;
  hotelId: string;
  type: 'percentOff' | 'amountOffCents' | string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  percentOff: number | null;
  amountOffCents: number | null;
  conditionsJson: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicHotelDetail {
  id: string;
  merchantId: string;
  nameCn: string;
  nameEn: string;
  address: string;
  score: number;
  starRating: number;
  openDate: string | null;
  status: string;
  rejectReason: string | null;
  publishedAt: string | null;
  offlineAt: string | null;
  offlineFromStatus: string | null;
  minPriceCents: number;
  maxPriceCents: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  roomTypes: HotelRoomType[];
  nearbyPlaces: HotelNearbyPlace[];
  discounts: HotelDiscount[];
}

const DEFAULT_BASE_URL = 'http://localhost:3000'
const globalWithProcess = globalThis as { process?: { env?: Record<string, string | undefined> } }
const processEnvBaseUrl =
  globalWithProcess.process && globalWithProcess.process.env
    ? globalWithProcess.process.env.TARO_APP_API_BASE_URL
    : undefined

/** 安全取 number（兼容 string/number/null） */
const toNumber = (v: unknown, fallback = 0) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }
  return fallback
}

/** 安全取 string */
const toStringSafe = (v: unknown, fallback = '') => {
  if (typeof v === 'string') return v
  if (v === null || v === undefined) return fallback
  return String(v)
}

/** tags 兼容 */
const toStringArray = (v: unknown) => {
  if (Array.isArray(v)) return v.map(x => toStringSafe(x)).filter(Boolean)
  if (typeof v === 'string') return v ? [v] : []
  return []
}

/**
 * 把后端返回的 hotel item 归一化成前端稳定结构
 * 重点：starRating 与 score 明确分离
 */
const normalizeHotelItem = (raw: any): HotelItem => {
  // id
  const hotelId =
    toStringSafe(raw?.hotelId) ||
    toStringSafe(raw?.id) ||
    ''

  // 名称：兼容 nameCn/name/hotelName
  const hotelName =
    toStringSafe(raw?.hotelName) ||
    toStringSafe(raw?.nameCn) ||
    toStringSafe(raw?.name) ||
    '未命名酒店'

  const address =
    toStringSafe(raw?.address) ||
    '地址未知'

  // 图片字段兼容
  const coverImage =
    toStringSafe(raw?.coverImage) ||
    toStringSafe(raw?.cover) ||
    toStringSafe(raw?.image) ||
    toStringSafe(raw?.images?.[0]) ||
    toStringSafe(raw?.images?.[0]?.url) ||
    ''

  const tags =
    toStringArray(raw?.tags).length ? toStringArray(raw?.tags)
      : toStringArray(raw?.tagList).length ? toStringArray(raw?.tagList)
        : toStringArray(raw?.labels)

  const score = toNumber(raw?.score, toNumber(raw?.rating, 0))

  const starRating = toNumber(raw?.starRating, toNumber(raw?.starLevel ?? raw?.star ?? raw?.hotelStar, 0))

  // 价格：如果后端是 minPriceCents 则换算，否则用 minPrice
  const minPrice =
    raw?.minPriceCents != null
      ? Math.round(toNumber(raw.minPriceCents, 0) / 100)
      : toNumber(raw?.minPrice ?? raw?.minPriceYuan ?? raw?.price, 0)

  const commentCount = toNumber(raw?.commentCount ?? raw?.commentNum ?? raw?.comments, 0)

  return {
    hotelId,
    hotelName,
    address,
    coverImage,
    tags: tags || [],
    minPrice,
    score,
    starRating,
    commentCount
  }
}

export async function searchHotels(params: HotelSearchParams): Promise<HotelSearchData> {
  const baseUrl = processEnvBaseUrl || DEFAULT_BASE_URL
  const response = await Taro.request<ApiResponse<any>>({
    url: `${baseUrl}/api/v1/user/hotels/search`,
    method: 'POST',
    timeout: 10000,
    header: {
      'content-type': 'application/json'
    },
    data: {
      city: params.city,
      keyword: params.keyword,
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      tags: params.tags
    }
  })

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`请求失败(${response.statusCode})`)
  }

  const payload = response.data as any
  if (!payload || payload.code !== 0) {
    const message = payload && payload.message ? payload.message : '查询酒店失败'
    throw new Error(message)
  }

  const data = payload.data || {}
  const rawList = Array.isArray(data.list) ? data.list : []
  const list = rawList.map(normalizeHotelItem)
  const total = typeof data.total === 'number' ? data.total : list.length

  return { list, total }
}

export async function getPublicHotelDetail(hotelId: string): Promise<PublicHotelDetail> {
  const baseUrl = processEnvBaseUrl || DEFAULT_BASE_URL
  const response = await Taro.request<ApiResponse<{ hotel: PublicHotelDetail }> | { hotel: PublicHotelDetail; message?: string }>({
    url: `${baseUrl}/api/v1/public/hotels/${encodeURIComponent(hotelId)}`,
    method: 'GET',
    timeout: 10000,
    header: {
      'content-type': 'application/json'
    }
  })

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`请求失败(${response.statusCode})`)
  }

  const payload = response.data as any
  const hotel = payload && payload.hotel
    ? payload.hotel
    : payload && payload.data && payload.data.hotel
      ? payload.data.hotel
      : null

  if (!hotel) {
    const message = payload && payload.message ? payload.message : '获取酒店详情失败'
    throw new Error(message)
  }

  return hotel as PublicHotelDetail
}