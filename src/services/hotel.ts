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

const DEFAULT_BASE_URL = 'http://localhost:3000'

const processEnvBaseUrl =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.TARO_APP_API_BASE_URL

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
    throw new Error(payload?.message || '查询酒店失败')
  }

  return payload.data || { list: [], total: 0 }
}
