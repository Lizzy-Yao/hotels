import { request } from '@umijs/max';

export type HotelStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'offline';

export type RoomType = { name: string; basePriceCents: number };

export type DiscountScenario = {
  id: string;
  title: string;
  type: 'persentOff' | 'amountOffCents';
  value: number;
  description?: string;
};

export type Hotel = {
  id: string;
  owner: string;
  nameCn: string;
  nameEn: string;
  address: string;
  starRating: number;
  roomTypes: RoomType[];
  openDate: string;
  status: HotelStatus;
  nearbyPlaces?: string[];
  transportation?: string;
  nearbyMalls?: string[];
  discounts?: DiscountScenario[];
  auditNote?: string;
  rejectReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type HotelReview = {
  id: string;
  userName: string;
  rating: number;
  content: string;
  checkInDate: string;
  createdAt: string;
};

export type HotelReviewList = {
  hotelId: string;
  starRating: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: HotelReview[];
};

type AnyObject = Record<string, any>;

function parseError(error: any, fallback: string) {
  const message =
    error?.info?.errorMessage ||
    error?.data?.message ||
    error?.response?.data?.message ||
    error?.message;
  return new Error(message || fallback);
}

function extractData<T = AnyObject>(payload: any): T {
  if (!payload || typeof payload !== 'object') return payload as T;
  return (payload.data ?? payload.result ?? payload.payload ?? payload) as T;
}

function normalizeStatus(value: any): HotelStatus {
  const status = String(value || '').toLowerCase();
  if (status === 'draft') return 'draft';
  if (status === 'submitted' || status === 'pending') return 'submitted';
  if (status === 'approved' || status === 'pass') return 'approved';
  if (status === 'rejected' || status === 'reject') return 'rejected';
  if (status === 'published' || status === 'online') return 'published';
  if (status === 'offline') return 'offline';
  return 'draft';
}

function normalizeRoomTypes(value: any): RoomType[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      name: item?.name || item?.room_name || '',
      basePriceCents: Number(item?.basePriceCents ?? item?.amount ?? 0),
    }))
    .filter((item) => item.name);
}

function normalizeDiscounts(value: any): DiscountScenario[] | undefined {
  if (!Array.isArray(value)) return undefined;
  console.log('value', value);
  return value.map((item, index) => ({
    id: String(item?.id || `discount_${index}`),
    title: item?.title,
    type: item?.type,
    value:
      item?.type === 'percentOff'
        ? Number(item?.percentOff)
        : Number(item?.amountOffCents),
    description: item?.description || '',
  }));
}

function normalizeHotel(raw: AnyObject): Hotel {
  return {
    id: String(raw?.id || raw?._id || ''),
    owner: String(
      raw?.owner ||
        raw?.merchant_id ||
        raw?.merchant?.username ||
        raw?.merchantId ||
        '',
    ),
    nameCn: String(raw?.nameCn || raw?.name_cn || raw?.name || ''),
    nameEn: String(raw?.nameEn || raw?.name_en || ''),
    address: String(raw?.address || ''),
    starRating: Number(raw?.starRating ?? 0),
    roomTypes: normalizeRoomTypes(raw?.roomTypes || raw?.room_types),
    openDate: String(raw?.openDate || raw?.opening_date || ''),
    status: normalizeStatus(raw?.status),
    nearbyPlaces: raw?.nearbyPlaces || raw?.nearby_attractions || undefined,
    transportation: raw?.transportation || undefined,
    nearbyMalls: raw?.nearbyMalls || raw?.nearby_malls || undefined,
    discounts: normalizeDiscounts(raw?.discounts),
    auditNote: raw?.auditNote || raw?.audit_note || undefined,
    createdAt: String(raw?.createdAt || raw?.created_at || ''),
    updatedAt: String(raw?.updatedAt || raw?.updated_at || ''),
    rejectReason: String(raw?.rejectReason),
  };
}

function getListAndTotal(payload: any): { list: Hotel[]; total: number } {
  const data = extractData(payload);
  const listSource =
    data?.list ||
    data?.items ||
    data?.records ||
    data?.rows ||
    (Array.isArray(data) ? data : []);
  const list = Array.isArray(listSource)
    ? listSource.map((item) => normalizeHotel(item || {}))
    : [];
  const total = Number(data?.total ?? data?.count ?? list.length ?? 0);
  return { list, total };
}

export async function listHotels(params?: {
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  try {
    const response = await request('/api/v1/hotels/', {
      method: 'GET',
      params: {
        status: params?.status,
        page: params?.page,
        pageSize: params?.pageSize,
      },
    });
    return getListAndTotal(response);
  } catch (error) {
    throw parseError(error, '获取酒店列表失败');
  }
}

export async function listAdminHotels(params?: {
  status?: string;
  merchantId?: string;
  page?: number;
  pageSize?: number;
}) {
  try {
    const response = await request('/api/v1/admin/hotels', {
      method: 'GET',
      params: {
        status: params?.status,
        merchant_id: params?.merchantId,
        page: params?.page,
        pageSize: params?.pageSize,
      },
    });
    return getListAndTotal(response);
  } catch (error) {
    throw parseError(error, '获取管理列表失败');
  }
}

export async function getHotel(id: string) {
  const response = await request(`/api/v1/hotels/${id}`, {
    method: 'GET',
  });

  // console.log('接口原始返回:', response);

  return response;
}

export async function getAdminHotel(id: string) {
  const response = await request(`/api/v1/admin/hotels/${id}`, {
    method: 'GET',
  });

  return response;
}

export async function upsertHotel(input: {
  id?: string;
  owner: string;
  nameCn: string;
  nameEn: string;
  address: string;
  starRating: number;
  roomTypes: RoomType[];
  openDate: string;
  nearbyPlaces?: string[];
  transportation?: string;
  nearbyMalls?: string[];
  discounts?: DiscountScenario[];
}) {
  const normalizedNearbyPlaces = [
    ...(input.transportation
      ? [
          {
            type: 'TRANSPORT',
            name: input.transportation,
          },
        ]
      : []),

    ...(input.nearbyPlaces || []).map((name) => ({
      type: 'ATTRACTION',
      name,
    })),

    ...(input.nearbyMalls || []).map((name) => ({
      type: 'MALL',
      name,
    })),
  ];
  const data = {
    owner: input.owner,
    nameCn: input.nameCn,
    nameEn: input.nameEn,
    address: input.address,
    starRating: input.starRating,
    roomTypes: input.roomTypes,
    openDate: input.openDate,
    nearbyPlaces: normalizedNearbyPlaces,
    transportation: input.transportation,
    nearbyMalls: input.nearbyMalls,
    discounts: input.discounts,
  };

  try {
    const response = input.id
      ? await request(`/api/v1/hotels/${input.id}`, {
          method: 'PUT',
          data,
        })
      : await request('/api/v1/hotels/', {
          method: 'POST',
          data,
        });

    return normalizeHotel(extractData<AnyObject>(response) || {});
  } catch (error) {
    throw parseError(error, input.id ? '更新酒店失败' : '创建酒店失败');
  }
}

export async function submitHotel(params: { id: string; owner?: string }) {
  try {
    const response = await request(`/api/v1/hotels/${params.id}/submit`, {
      method: 'POST',
    });
    return normalizeHotel(extractData<AnyObject>(response) || {});
  } catch (error) {
    throw parseError(error, '提交审核失败');
  }
}

export async function adminApprove(params: { id: string }) {
  try {
    const response = await request(`/api/v1/admin/hotels/${params.id}/review`, {
      method: 'POST',
      data: { result: 'APPROVE' },
    });
    return normalizeHotel(extractData<AnyObject>(response) || {});
  } catch (error) {
    throw parseError(error, '审核通过失败');
  }
}

export async function adminReject(params: { id: string; reason: string }) {
  try {
    const response = await request(`/api/v1/admin/hotels/${params.id}/review`, {
      method: 'POST',
      data: { result: 'REJECT', reason: params.reason },
    });
    return normalizeHotel(extractData<AnyObject>(response) || {});
  } catch (error) {
    throw parseError(error, '驳回失败');
  }
}

export async function adminPublish(params: { id: string }) {
  try {
    const response = await request(
      `/api/v1/admin/hotels/${params.id}/publish`,
      {
        method: 'POST',
      },
    );
    return normalizeHotel(extractData<AnyObject>(response) || {});
  } catch (error) {
    throw parseError(error, '发布失败');
  }
}

export async function adminOffline(params: { id: string }) {
  try {
    const response = await request(
      `/api/v1/admin/hotels/${params.id}/offline`,
      {
        method: 'POST',
      },
    );
    return normalizeHotel(extractData<AnyObject>(response) || {});
  } catch (error) {
    throw parseError(error, '下线失败');
  }
}

export async function adminRestore(params: { id: string }) {
  try {
    const response = await request(
      `/api/v1/admin/hotels/${params.id}/restore`,
      {
        method: 'POST',
      },
    );
    return normalizeHotel(extractData<AnyObject>(response) || {});
  } catch (error) {
    throw parseError(error, '恢复失败');
  }
}

export async function listHotelReviews(params: { id: string; page?: number }) {
  try {
    const response = await request(`/api/v1/hotels/${params.id}/reviews`, {
      method: 'GET',
      params: {
        page: params.page,
      },
    });

    const data = extractData<AnyObject>(response) || {};
    const listSource = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(response?.items)
      ? response.items
      : [];

    const items: HotelReview[] = listSource.map((item: AnyObject) => ({
      id: String(item?.id || ''),
      userName: String(item?.userName || item?.user_name || '匿名用户'),
      rating: Number(item?.rating ?? 0),
      content: String(item?.content || ''),
      checkInDate: String(item?.checkInDate || item?.check_in_date || ''),
      createdAt: String(item?.createdAt || item?.created_at || ''),
    }));

    return {
      hotelId: String(data?.hotelId || data?.hotel_id || params.id),
      starRating: Number(data?.starRating ?? data?.star_rating ?? 0),
      page: Number(data?.page ?? params.page ?? 1),
      pageSize: Number(data?.pageSize ?? data?.page_size ?? 20),
      total: Number(data?.total ?? items.length),
      totalPages: Number(data?.totalPages ?? data?.total_pages ?? 1),
      items,
    } as HotelReviewList;
  } catch (error) {
    throw parseError(error, '获取评价列表失败');
  }
}
