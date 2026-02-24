# 评价查询接口文档

## 接口说明
- **接口名称**: 查询酒店评价列表
- **请求路径**: `/api/v1/hotels/:id/reviews`
- **请求方法**: `GET`
- **鉴权方式**: `Bearer Token`
- **权限要求**: `ADMIN`、`MERCHANT`

## 请求参数

### Path 参数
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 酒店 ID |

### Query 参数
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| page | number | 否 | 1 | 页码，从 1 开始 |

> 每页固定返回 20 条评价。

## 响应示例

```json
{
  "hotelId": "hotel_001",
  "starRating": 4.6,
  "page": 1,
  "pageSize": 20,
  "total": 56,
  "totalPages": 3,
  "items": [
    {
      "id": "review_1",
      "userName": "用户02",
      "rating": 5,
      "content": "这是第 1 条评价，整体入住体验良好。",
      "checkInDate": "2026-01-01",
      "createdAt": "2026-02-01T10:00:00.000Z"
    }
  ]
}
```

## 响应字段说明
| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| hotelId | string | 酒店 ID |
| starRating | number | 当前酒店星级（当前为写死数据） |
| page | number | 当前页码 |
| pageSize | number | 每页条数（固定 20） |
| total | number | 评价总条数（当前为写死数据） |
| totalPages | number | 总页数 |
| items | array | 评价列表 |
| items[].id | string | 评价 ID |
| items[].userName | string | 用户名 |
| items[].rating | number | 评分 |
| items[].content | string | 评价内容 |
| items[].checkInDate | string | 入住日期 |
| items[].createdAt | string | 评价创建时间 |

## 错误响应
- `401`：未登录或 token 无效
- `403`：非管理员/商户角色访问

## 管理员审核接口文档

### 1) 审核酒店
- **请求路径**: `/api/v1/admin/hotels/:id/review`
- **请求方法**: `POST`
- **鉴权方式**: `Bearer Token`
- **权限要求**: `ADMIN`

#### 请求参数

Path 参数：

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 酒店 ID |

Body 参数：

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| result | string | 是 | 审核结果，可选 `APPROVE` 或 `REJECT` |
| reason | string | 否 | 驳回原因，`result=REJECT` 时必填 |

#### 请求示例

```json
{
  "result": "APPROVE"
}
```

#### 响应示例

```json
{
  "hotel": {
    "id": "hotel_001",
    "status": "APPROVED",
    "rejectReason": null
  }
}
```

#### 错误响应
- `400`：状态不允许审核 / 驳回原因缺失
- `401`：未登录或 token 无效
- `403`：非管理员访问
- `404`：酒店不存在

### 2) 发布酒店
- **请求路径**: `/api/v1/admin/hotels/:id/publish`
- **请求方法**: `POST`
- **鉴权方式**: `Bearer Token`
- **权限要求**: `ADMIN`

#### 请求参数

Path 参数：

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 酒店 ID |

#### 响应示例

```json
{
  "hotel": {
    "id": "hotel_001",
    "status": "PUBLISHED",
    "publishedAt": "2026-02-24T09:30:00.000Z"
  }
}
```

#### 错误响应
- `400`：仅 `APPROVED` 状态可发布
- `401`：未登录或 token 无效
- `403`：非管理员访问
- `404`：酒店不存在

### 3) 下线酒店
- **请求路径**: `/api/v1/admin/hotels/:id/offline`
- **请求方法**: `POST`
- **鉴权方式**: `Bearer Token`
- **权限要求**: `ADMIN`

#### 请求参数

Path 参数：

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 酒店 ID |

#### 响应示例

```json
{
  "hotel": {
    "id": "hotel_001",
    "status": "OFFLINE",
    "offlineFromStatus": "PUBLISHED",
    "offlineAt": "2026-02-24T09:40:00.000Z"
  }
}
```

#### 错误响应
- `400`：仅 `PUBLISHED` 状态可下线
- `401`：未登录或 token 无效
- `403`：非管理员访问
- `404`：酒店不存在

### 4) 恢复酒店
- **请求路径**: `/api/v1/admin/hotels/:id/restore`
- **请求方法**: `POST`
- **鉴权方式**: `Bearer Token`
- **权限要求**: `ADMIN`

#### 请求参数

Path 参数：

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 酒店 ID |

#### 响应示例

```json
{
  "hotel": {
    "id": "hotel_001",
    "status": "PUBLISHED",
    "offlineAt": null
  }
}
```

#### 错误响应
- `400`：仅 `OFFLINE` 状态可恢复
- `401`：未登录或 token 无效
- `403`：非管理员访问
- `404`：酒店不存在
