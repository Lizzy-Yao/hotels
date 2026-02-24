# 酒店详情接口文档

本文档基于当前后端代码生成，覆盖所有可用于“获取酒店详情”的接口。

## 通用说明
- Base URL：`/api/v1`
- 鉴权方式：需要鉴权的接口使用 `Authorization: Bearer <token>`
- 响应格式：JSON

---

## 1) 公开端酒店详情（已发布）
- **请求路径**：`GET /api/v1/public/hotels/:id`
- **是否鉴权**：否
- **适用场景**：C 端/游客查看已发布酒店详情

### Path 参数
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 酒店 ID |

### 业务规则
- 仅当酒店存在且 `status = PUBLISHED` 才返回成功。

### 成功响应示例
```json
{
  "hotel": {
    "id": "cm8hotel001",
    "merchantId": "cm8merchant001",
    "nameCn": "杭州西湖假日酒店",
    "nameEn": "West Lake Holiday Hotel",
    "address": "浙江省杭州市西湖区XXX路1号",
    "starRating": 5,
    "openDate": "2022-06-01T00:00:00.000Z",
    "status": "PUBLISHED",
    "rejectReason": null,
    "publishedAt": "2026-02-20T10:00:00.000Z",
    "offlineAt": null,
    "offlineFromStatus": null,
    "minPriceCents": 58800,
    "maxPriceCents": 128800,
    "currency": "CNY",
    "createdAt": "2026-02-01T08:00:00.000Z",
    "updatedAt": "2026-02-20T10:00:00.000Z",
    "roomTypes": [
      {
        "id": "room001",
        "hotelId": "cm8hotel001",
        "name": "高级大床房",
        "bedType": "King",
        "capacity": 2,
        "areaSqm": 35,
        "basePriceCents": 58800,
        "currency": "CNY",
        "createdAt": "2026-02-01T08:00:00.000Z",
        "updatedAt": "2026-02-01T08:00:00.000Z"
      }
    ],
    "nearbyPlaces": [
      {
        "id": "near001",
        "hotelId": "cm8hotel001",
        "type": "ATTRACTION",
        "name": "西湖景区",
        "distanceMeters": 600,
        "address": "杭州市西湖区",
        "createdAt": "2026-02-01T08:00:00.000Z",
        "updatedAt": "2026-02-01T08:00:00.000Z"
      }
    ],
    "discounts": [
      {
        "id": "promo001",
        "hotelId": "cm8hotel001",
        "type": "percentOff",
        "title": "春季特惠",
        "description": "限时折扣",
        "startDate": "2026-02-01T00:00:00.000Z",
        "endDate": "2026-03-01T00:00:00.000Z",
        "percentOff": 20,
        "amountOffCents": null,
        "conditionsJson": null,
        "isActive": true,
        "createdAt": "2026-02-01T08:00:00.000Z",
        "updatedAt": "2026-02-01T08:00:00.000Z"
      }
    ]
  }
}
```

### 错误响应
- `404`：`{ "message": "酒店不存在或未发布" }`
- `500`：`{ "message": "Internal Server Error" }` 或具体错误信息

---

## 2) 商户端酒店详情（仅本人）
- **请求路径**：`GET /api/v1/hotels/:id`
- **是否鉴权**：是（`MERCHANT`）
- **适用场景**：商户查看自己酒店草稿/审核中/已发布等详情

### Header
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Authorization | string | 是 | `Bearer <token>` |

### Path 参数
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 酒店 ID |

### 业务规则
- 必须登录。
- 角色必须是 `MERCHANT`。
- 酒店必须存在，且 `hotel.merchantId === 当前登录用户ID`。

### 成功响应示例
```json
{
  "hotel": {
    "id": "cm8hotel001",
    "merchantId": "cm8merchant001",
    "nameCn": "杭州西湖假日酒店",
    "status": "DRAFT",
    "roomTypes": [],
    "nearbyPlaces": [],
    "discounts": []
  }
}
```

### 错误响应
- `401`：`{ "message": "未登录或缺少 token" }` / `token 无效或已过期`
- `403`：`{ "message": "无权限" }`（角色不符或非本人酒店）
- `404`：`{ "message": "酒店不存在" }`
- `500`：`{ "message": "Internal Server Error" }` 或具体错误信息

---

## 3) 管理员端酒店详情
- **请求路径**：`GET /api/v1/admin/hotels/:id`
- **是否鉴权**：是（`ADMIN`）
- **适用场景**：后台审核/运营查看任意酒店详情

### Header
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Authorization | string | 是 | `Bearer <token>` |

### Path 参数
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 酒店 ID |

### 业务规则
- 必须登录。
- 角色必须是 `ADMIN`。
- 酒店存在时返回详情；若 `openDate` 有值，会格式化为 `yyyy-MM-dd`（如 `2026-02-24`）。

### 成功响应示例
```json
{
  "hotel": {
    "id": "cm8hotel001",
    "merchantId": "cm8merchant001",
    "nameCn": "杭州西湖假日酒店",
    "openDate": "2026-02-24",
    "status": "SUBMITTED",
    "roomTypes": [],
    "nearbyPlaces": [],
    "discounts": []
  }
}
```

### 错误响应
- `401`：`{ "message": "未登录或缺少 token" }` / `token 无效或已过期`
- `403`：`{ "message": "无权限" }`
- `404`：`{ "message": "酒店不存在" }`
- `500`：`{ "message": "Internal Server Error" }` 或具体错误信息

---

## 字段补充说明
### Hotel.status 可选值
- `DRAFT`：草稿
- `SUBMITTED`：待审核
- `APPROVED`：审核通过（未发布）
- `REJECTED`：审核不通过
- `PUBLISHED`：已发布
- `OFFLINE`：已下线

### NearbyPlace.type 可选值
- `ATTRACTION`：景点
- `TRANSPORT`：交通
- `MALL`：商圈/商场

### Promotion.type 可选值
- `percentOff`：折扣
- `amountOffCents`：立减金额（分）
