import Taro from '@tarojs/taro'

export interface HotelSearchParams {
  city: string;
  keyword: string;
  checkInDate: string;
  checkOutDate: string;
  tags: string[];
}

export interface HotelItem {
  hotelId: string;
  hotelName: string;
  address: string;
  coverImage: string;
  tags: string[];
  minPrice: number;
  score: number;
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

export async function searchHotels(params: HotelSearchParams): Promise<HotelSearchData> {
  const baseUrl = processEnvBaseUrl || DEFAULT_BASE_URL
  const response = await Taro.request<ApiResponse<HotelSearchData>>({
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

  const payload = response.data
  if (!payload || payload.code !== 0) {
    const message = payload && payload.message ? payload.message : '查询酒店失败'
    throw new Error(message)
  }

  const data = payload.data as Partial<HotelSearchData> | undefined
  const list = data && Array.isArray(data.list) ? data.list : []
  const total = data && typeof data.total === 'number' ? data.total : list.length
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
