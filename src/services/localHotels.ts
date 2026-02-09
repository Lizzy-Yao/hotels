import { STORAGE_KEYS } from '@/constants/storageKeys';
import { createId, nowISO, readJSON, writeJSON } from '@/utils/storage';

export type HotelStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'offline';

export type RoomType = { name: string; price: number };

export type DiscountScenario = {
  id: string;
  name: string; // 例如 "节日特惠", "机酒套餐"
  type: 'discount' | 'reduction'; // discount=打折, reduction=满减/直减
  value: number; // 例如 0.8 (8折) 或 200 (减200元)
  description?: string; // 详细描述
};

export type Hotel = {
  id: string;
  owner: string;
  nameCn: string;
  nameEn: string;
  address: string;
  star: number;
  roomTypes: RoomType[];
  openingDate: string;
  status: HotelStatus;

  // --- 可选维度 ---
  nearbyAttractions?: string[]; // 热门景点 (数组存储)
  transportation?: string; // 交通情况 (文本描述)
  nearbyMalls?: string[]; // 周边商场 (数组存储)
  discounts?: DiscountScenario[]; // 优惠场景列表

  auditNote?: string;
  createdAt: string;
  updatedAt: string;
};

function getHotels(): Hotel[] {
  return readJSON<Hotel[]>(STORAGE_KEYS.hotels, []);
}

function setHotels(hotels: Hotel[]) {
  writeJSON(STORAGE_KEYS.hotels, hotels);
}

export function listHotels(params?: { owner?: string }) {
  const hotels = getHotels();
  if (!params?.owner) return hotels;
  return hotels.filter((h) => h.owner === params.owner);
}

export function getHotel(id: string) {
  const hotels = getHotels();
  return hotels.find((h) => h.id === id) || null;
}

export function upsertHotel(input: {
  id?: string;
  owner: string;
  nameCn: string;
  nameEn: string;
  address: string;
  star: number;
  roomTypes: RoomType[];
  openingDate: string;
  // 新增入参
  nearbyAttractions?: string[];
  transportation?: string;
  nearbyMalls?: string[];
  discounts?: DiscountScenario[];
}) {
  const hotels = getHotels();
  const now = nowISO();

  // 辅助函数：构建更新对象，将新字段合并进去
  const mergeHotelData = (prev: Hotel): Hotel => ({
    ...prev,
    nameCn: input.nameCn,
    nameEn: input.nameEn,
    address: input.address,
    star: input.star,
    roomTypes: input.roomTypes,
    openingDate: input.openingDate,
    // 合并新字段
    nearbyAttractions: input.nearbyAttractions,
    transportation: input.transportation,
    nearbyMalls: input.nearbyMalls,
    discounts: input.discounts,
    updatedAt: now,
  });

  if (input.id) {
    const idx = hotels.findIndex((h) => h.id === input.id);
    if (idx < 0) throw new Error('酒店不存在');
    if (hotels[idx].owner !== input.owner) throw new Error('无权限');

    const prev = hotels[idx];
    if (
      prev.status === 'submitted' ||
      prev.status === 'published' ||
      prev.status === 'approved'
    ) {
      throw new Error('当前状态不可编辑');
    }

    hotels[idx] = mergeHotelData(prev); // 使用辅助函数更新
    setHotels(hotels);
    return hotels[idx];
  }

  // 新建逻辑
  const hotel: Hotel = {
    id: createId('hotel'),
    owner: input.owner,
    // 必填项
    nameCn: input.nameCn,
    nameEn: input.nameEn,
    address: input.address,
    star: input.star,
    roomTypes: input.roomTypes,
    openingDate: input.openingDate,
    // 可选项 (如果有传则存，没传则为 undefined)
    nearbyAttractions: input.nearbyAttractions,
    transportation: input.transportation,
    nearbyMalls: input.nearbyMalls,
    discounts: input.discounts,

    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
  hotels.unshift(hotel);
  setHotels(hotels);
  return hotel;
}

export function submitHotel(params: { id: string; owner: string }) {
  const hotels = getHotels();
  const idx = hotels.findIndex((h) => h.id === params.id);
  if (idx < 0) throw new Error('酒店不存在');
  if (hotels[idx].owner !== params.owner) throw new Error('无权限');
  if (
    hotels[idx].status !== 'draft' &&
    hotels[idx].status !== 'rejected' &&
    hotels[idx].status !== 'offline'
  ) {
    throw new Error('当前状态不可提交');
  }

  hotels[idx] = {
    ...hotels[idx],
    status: 'submitted',
    auditNote: undefined,
    updatedAt: nowISO(),
  };
  setHotels(hotels);
  return hotels[idx];
}

export function adminApprove(params: { id: string }) {
  const hotels = getHotels();
  const idx = hotels.findIndex((h) => h.id === params.id);
  if (idx < 0) throw new Error('酒店不存在');
  if (hotels[idx].status !== 'submitted') throw new Error('仅可审核“已提交”');

  hotels[idx] = {
    ...hotels[idx],
    status: 'approved',
    auditNote: undefined,
    updatedAt: nowISO(),
  };
  setHotels(hotels);
  return hotels[idx];
}

export function adminReject(params: { id: string; reason: string }) {
  const reason = params.reason.trim();
  if (!reason) throw new Error('请输入拒绝原因');

  const hotels = getHotels();
  const idx = hotels.findIndex((h) => h.id === params.id);
  if (idx < 0) throw new Error('酒店不存在');
  if (hotels[idx].status !== 'submitted') throw new Error('仅可审核“已提交”');

  hotels[idx] = {
    ...hotels[idx],
    status: 'rejected',
    auditNote: reason,
    updatedAt: nowISO(),
  };
  setHotels(hotels);
  return hotels[idx];
}

export function adminPublish(params: { id: string }) {
  const hotels = getHotels();
  const idx = hotels.findIndex((h) => h.id === params.id);
  if (idx < 0) throw new Error('酒店不存在');
  if (hotels[idx].status !== 'approved' && hotels[idx].status !== 'offline') {
    throw new Error('仅可发布“已通过/已下线”');
  }

  hotels[idx] = { ...hotels[idx], status: 'published', updatedAt: nowISO() };
  setHotels(hotels);
  return hotels[idx];
}

export function adminOffline(params: { id: string }) {
  const hotels = getHotels();
  const idx = hotels.findIndex((h) => h.id === params.id);
  if (idx < 0) throw new Error('酒店不存在');
  if (hotels[idx].status !== 'published') {
    throw new Error('仅可下线“已发布”');
  }

  hotels[idx] = { ...hotels[idx], status: 'offline', updatedAt: nowISO() };
  setHotels(hotels);
  return hotels[idx];
}
