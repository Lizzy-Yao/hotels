import {
  Hotel,
  adminApprove,
  adminReject,
  listAdminHotels,
} from '@/services/localHotels';
import type { ProColumns } from '@ant-design/pro-components';
import {
  ActionType,
  PageContainer,
  ProDescriptions,
  ProTable,
} from '@ant-design/pro-components';
import { Drawer, Input, Modal, Space, Tag, Typography, message } from 'antd';
import React, { useRef, useState } from 'react';

/** -----------------------------
 *  扩展接口类型（兼容你当前 Hotel 类型）
 *  因为后端返回字段和页面使用字段存在差异，这里做一个增强类型
 *  ----------------------------- */
type NearbyPlace = {
  id: string;
  hotelId: string;
  type: 'ATTRACTION' | 'MALL' | 'TRANSPORT' | string;
  name: string;
  distanceMeters?: number | null;
  address?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type RoomTypeItem = {
  id: string;
  name: string;
  basePriceCents: number;
  currency?: string;
};

type DiscountItem = {
  id: string;
  type: string; // percentOff / amountOff 等
  title: string;
  description?: string | null;
  percentOff?: number | null;
  amountOffCents?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
  value?: number | null;
};

type AdminHotelRecord = Hotel & {
  /** 后端实际字段 */
  merchantId?: string;
  rejectReason?: string | null;
  publishedAt?: string | null;
  offlineAt?: string | null;
  offlineFromStatus?: string | null;
  minPriceCents?: number | null;
  maxPriceCents?: number | null;
  currency?: string | null;

  nearbyPlaces?: NearbyPlace[];
  roomTypes?: RoomTypeItem[];
  discounts?: DiscountItem[];

  /** 兼容旧字段（如果服务层做过映射） */
  owner?: string;
  auditNote?: string;
};

/** -----------------------------
 *  工具函数：状态统一转大写，避免后端大小写不一致导致判断失效
 *  ----------------------------- */
function normalizeStatus(status?: string) {
  return String(status || '').toUpperCase();
}

/** -----------------------------
 *  状态标签：兼容大小写状态值
 *  ----------------------------- */
function statusTag(status?: string) {
  switch (normalizeStatus(status)) {
    case 'DRAFT':
      return <Tag>草稿</Tag>;
    case 'SUBMITTED':
      return <Tag color="processing">已提交</Tag>;
    case 'APPROVED':
      return <Tag color="success">已通过</Tag>;
    case 'REJECTED':
      return <Tag color="error">已驳回</Tag>;
    case 'PUBLISHED':
      return <Tag color="gold">已发布</Tag>;
    case 'OFFLINE':
      return <Tag color="default">已下线</Tag>;
    default:
      return <Tag>{status || '-'}</Tag>;
  }
}

/** -----------------------------
 *  邻近地点类型映射
 *  ----------------------------- */
function nearbyTypeLabel(type?: string) {
  switch (String(type || '').toUpperCase()) {
    case 'ATTRACTION':
      return '景点';
    case 'MALL':
      return '商场';
    case 'TRANSPORT':
      return '交通';
    default:
      return type || '未知';
  }
}

/** -----------------------------
 *  优惠类型映射
 *  ----------------------------- */
function discountTypeLabel(type?: string) {
  switch (type) {
    case 'percentOff':
      return '折扣';
    case 'amountOff':
      return '立减';
    default:
      return type || '-';
  }
}

/** -----------------------------
 *  空值显示统一处理
 *  ----------------------------- */
function showText(value: any) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

/** -----------------------------
 *  价格显示（注意：后端字段名是 *Cents，但你当前截图展示的是直接“32 元”）
 *  如果后端真实单位确实是分，请改成 value / 100
 *  ----------------------------- */
function formatPrice(value?: number | null, currency?: string | null) {
  if (value === null || value === undefined) return '-';
  const unit = currency === 'CNY' || !currency ? '元' : currency;
  return `${value} ${unit}`;
}

/** -----------------------------
 *  折扣值显示
 *  ----------------------------- */
// function formatDiscountValue(item: DiscountItem) {
//   console.log("item", item);
//   if (item.percentOff !== null && item.percentOff !== undefined) {
//     return `${item.percentOff}%`;
//   }
//   if (item.amountOffCents !== null && item.amountOffCents !== undefined) {
//     return formatPrice(item.amountOffCents, 'CNY');
//   }
//   return '-';
// }
function formatDiscountValue(item: DiscountItem) {
  return item.value;
}

const AdminAuditsPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [current, setCurrent] = useState<AdminHotelRecord | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  /** -----------------------------
   *  列表列配置
   *  重点修复：
   *  1）商户字段改为 merchantId
   *  2）状态判断兼容大写
   *  ----------------------------- */
  const columns: ProColumns<AdminHotelRecord>[] = [
    {
      title: '酒店名(中文)',
      dataIndex: 'nameCn',
      ellipsis: true,
    },
    {
      title: '酒店名(英文)',
      dataIndex: 'nameEn',
      ellipsis: true,
    },
    {
      title: '商户',
      dataIndex: 'merchantId',
      width: 220,
      ellipsis: true,
      render: (_, record) => record.merchantId || record.owner || '-',
    },
    {
      title: '星级',
      dataIndex: 'starRating',
      width: 80,
    },
    {
      title: '开业时间',
      dataIndex: 'openDate',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (_, record) => statusTag(record.status),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      render: (_, record) => {
        /** 统一状态判断（兼容大写/小写） */
        const st = normalizeStatus(record.status);
        const canApproveOrReject = st === 'SUBMITTED';

        return (
          <Space>
            <a
              onClick={() => {
                setCurrent(record);
                setDetailOpen(true);
              }}
            >
              详情
            </a>

            <a
              onClick={async () => {
                if (!canApproveOrReject) return;
                try {
                  await adminApprove({ id: record.id });
                  message.success('已通过');
                  actionRef.current?.reload();
                } catch (e: any) {
                  message.error(e?.message || '操作失败');
                }
              }}
              style={{
                pointerEvents: canApproveOrReject ? 'auto' : 'none',
                opacity: canApproveOrReject ? 1 : 0.4,
              }}
            >
              通过
            </a>

            <a
              onClick={() => {
                if (!canApproveOrReject) return;
                setRejectReason('');
                setCurrent(record);
                setRejectOpen(true);
              }}
              style={{
                pointerEvents: canApproveOrReject ? 'auto' : 'none',
                opacity: canApproveOrReject ? 1 : 0.4,
              }}
            >
              驳回
            </a>
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer header={{ title: '酒店审核' }}>
      <ProTable<AdminHotelRecord>
        actionRef={actionRef}
        rowKey="id"
        search={{ labelWidth: 90 }}
        request={async (params) => {
          try {
            /** -----------------------------
             *  重点修复：
             *  1）后端返回是 items，不是 list
             *  2）商户搜索字段按 merchantId 传递（如你的服务层是 merchant，请自行改成对应字段）
             *  3）状态使用大写 SUBMITTED（与接口一致）
             *  ----------------------------- */
            const result: any = await listAdminHotels({
              page: params.current,
              pageSize: params.pageSize,
              nameCn: params.nameCn,
              nameEn: params.nameEn,
              merchantId: params.merchantId,
              status: 'SUBMITTED',
            });

            const data = (result?.items || result?.list || []) as AdminHotelRecord[];
            const total = Number(result?.total || 0);

            return { data, success: true, total };
          } catch (e: any) {
            message.error(e?.message || '加载列表失败');
            return { data: [], success: false, total: 0 };
          }
        }}
        columns={columns}
        pagination={{ pageSize: 10 }}
      />

      <Drawer
        width={860}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="酒店详情"
      >
        {current ? (
          <>
            {/* 顶部状态与审核信息 */}
            <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
              <Space wrap>
                {statusTag(current.status)}
                {/* 优先显示后端 rejectReason，兼容旧字段 auditNote */}
                {(current.rejectReason || current.auditNote) && (
                  <span>审核意见：{current.rejectReason || current.auditNote}</span>
                )}
              </Space>
            </Typography.Paragraph>

            <ProDescriptions<AdminHotelRecord>
              column={2}
              dataSource={current}
              columns={[
                /** 基础信息 */
                {
                  title: '酒店ID',
                  dataIndex: 'id',
                  span: 2,
                  copyable: true,
                },
                {
                  title: '商户',
                  dataIndex: 'merchantId',
                  render: (_, r) => r.merchantId || r.owner || '-',
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  render: (_, r) => statusTag(r.status),
                },
                { title: '酒店名(中文)', dataIndex: 'nameCn' },
                { title: '酒店名(英文)', dataIndex: 'nameEn' },
                { title: '地址', dataIndex: 'address', span: 2 },

                /** 经营信息 */
                { title: '星级', dataIndex: 'starRating', renderText: showText },
                { title: '开业时间', dataIndex: 'openDate', renderText: showText },
                {
                  title: '币种',
                  dataIndex: 'currency',
                  render: (_, r) => r.currency || 'CNY',
                },

                /** 房型信息（你截图里已有，但这里只做更完整展示） */
                {
                  title: '房型/价格',
                  dataIndex: 'roomTypes',
                  span: 2,
                  render: (_, r) => {
                    const list = r.roomTypes || [];
                    if (!list.length) return '-';

                    return (
                      <Space direction="vertical" size={4}>
                        {list.map((item) => (
                          <div key={item.id}>
                            <Tag color="blue">{item.name}</Tag>
                            <span>{formatPrice(item.basePriceCents, item.currency || r.currency || 'CNY')}</span>
                          </div>
                        ))}
                      </Space>
                    );
                  },
                },

                /** 邻近地点（新增展示） */
                {
                  title: '周边信息',
                  dataIndex: 'nearbyPlaces',
                  span: 2,
                  render: (_, r) => {
                    const list = r.nearbyPlaces || [];
                    if (!list.length) return '-';

                    return (
                      <Space direction="vertical" size={4}>
                        {list.map((p) => (
                          <div key={p.id}>
                            <Tag>{nearbyTypeLabel(p.type)}</Tag>
                            <span>{p.name || '-'}</span>
                            {p.distanceMeters !== null && p.distanceMeters !== undefined ? (
                              <span style={{ marginLeft: 8, color: '#999' }}>
                                {p.distanceMeters}m
                              </span>
                            ) : null}
                            {p.address ? (
                              <span style={{ marginLeft: 8, color: '#999' }}>
                                地址：{p.address}
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </Space>
                    );
                  },
                },

                {
                  title: '优惠信息',
                  dataIndex: 'discounts',
                  span: 2,
                  render: (_, r) => {
                    const list = r.discounts || [];
                    if (!list.length) return '-';

                    return (
                      <Space direction="vertical" size={8}>
                        {list.map((d) => (
                          <div key={d.id} style={{ lineHeight: 1.8 }}>
                            <div>
                              
                              <Tag color="purple">{discountTypeLabel(d.type)}</Tag>
                              <span style={{ fontWeight: 500 }}>{d.title || '-'}</span>
                            </div>
                            <div>
                              优惠值：{formatDiscountValue(d)}
                              {(d.startDate || d.endDate) && (
                                <span style={{ marginLeft: 12, color: '#999' }}>
                                  生效期：{showText(d.startDate)} ~ {showText(d.endDate)}
                                </span>
                              )}
                            </div>

                            {d.description ? (
                              <div style={{ color: '#666' }}>说明：{d.description}</div>
                            ) : null}
                          </div>
                        ))}
                      </Space>
                    );
                  },
                },


                /** 时间字段 */
                { title: '创建时间', dataIndex: 'createdAt', span: 2, renderText: showText },
                { title: '更新时间', dataIndex: 'updatedAt', span: 2, renderText: showText },
              ]}
            />
          </>
        ) : null}
      </Drawer>

      <Modal
        title="驳回原因"
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onOk={async () => {
          if (!current) return;
          try {
            await adminReject({ id: current.id, reason: rejectReason });
            message.success('已驳回');
            setRejectOpen(false);
            actionRef.current?.reload();
          } catch (e: any) {
            message.error(e?.message || '操作失败');
          }
        }}
      >
        <Input.TextArea
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="请输入驳回原因"
        />
      </Modal>
    </PageContainer>
  );
};

export default AdminAuditsPage;