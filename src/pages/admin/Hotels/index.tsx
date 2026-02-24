import {
  Hotel,
  HotelReviewList,
  adminOffline,
  adminPublish,
  adminRestore,
  listAdminHotels,
  listHotelReviews,
} from '@/services/localHotels';
import type { ProColumns } from '@ant-design/pro-components';
import {
  ActionType,
  PageContainer,
  ProDescriptions,
  ProTable,
} from '@ant-design/pro-components';
import {
  Drawer,
  List,
  Pagination,
  Rate,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import React, { useRef, useState } from 'react';

function statusTag(status: Hotel['status']) {
  switch (status) {
    case 'draft':
      return <Tag>草稿</Tag>;
    case 'submitted':
      return <Tag color="processing">已提交</Tag>;
    case 'approved':
      return <Tag color="success">已通过</Tag>;
    case 'rejected':
      return <Tag color="error">已驳回</Tag>;
    case 'published':
      return <Tag color="gold">已上线</Tag>;
    case 'offline':
      return <Tag color="default">已下线</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
}

const AdminHotelsPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [current, setCurrent] = useState<Hotel | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviews, setReviews] = useState<HotelReviewList | null>(null);

  const loadReviews = async (hotelId: string, page: number) => {
    setReviewLoading(true);
    try {
      const result = await listHotelReviews({ id: hotelId, page });
      setReviews(result);
    } catch (error: any) {
      message.error(error?.message || '获取评论失败');
    } finally {
      setReviewLoading(false);
    }
  };

  const columns: ProColumns<Hotel>[] = [
    { title: '酒店名(中文)', dataIndex: 'nameCn' },
    { title: '酒店名(英文)', dataIndex: 'nameEn' },
    { title: '商户', dataIndex: 'owner', width: 120 },
    { title: '地址', dataIndex: 'address', ellipsis: true },
    { title: '星级', dataIndex: 'starRating', width: 80, search: false },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      valueEnum: {
        draft: { text: '草稿' },
        submitted: { text: '已提交' },
        approved: { text: '已通过' },
        rejected: { text: '已驳回' },
        published: { text: '已上线' },
        offline: { text: '已下线' },
      },
      render: (_, record) => statusTag(record.status),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      render: (_, record) => {
        const canOnline =
          record.status === 'approved' || record.status === 'offline';
        const canOffline = record.status === 'published';

        return (
          <Space>
            <a
              onClick={() => {
                setCurrent(record);
                setReviews(null);
                setDetailOpen(true);
                loadReviews(record.id, 1);
              }}
            >
              查看
            </a>
            <a
              onClick={async () => {
                try {
                  if (record.status === 'offline') {
                    await adminRestore({ id: record.id });
                  } else {
                    await adminPublish({ id: record.id });
                  }
                  message.success('酒店已上线');
                  actionRef.current?.reload();
                } catch (error: any) {
                  message.error(error?.message || '操作失败');
                }
              }}
              style={{
                pointerEvents: canOnline ? 'auto' : 'none',
                opacity: canOnline ? 1 : 0.4,
              }}
            >
              上线
            </a>
            <a
              onClick={async () => {
                try {
                  await adminOffline({ id: record.id });
                  message.success('酒店已下线');
                  actionRef.current?.reload();
                } catch (error: any) {
                  message.error(error?.message || '操作失败');
                }
              }}
              style={{
                pointerEvents: canOffline ? 'auto' : 'none',
                opacity: canOffline ? 1 : 0.4,
              }}
            >
              下线
            </a>
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer header={{ title: '酒店管理' }}>
      <ProTable<Hotel>
        actionRef={actionRef}
        rowKey="id"
        search={{ labelWidth: 90 }}
        request={async (params) => {
          try {
            const result = await listAdminHotels({
              page: params.current,
              pageSize: params.pageSize,
              status: params.status as string,
            });
            return { data: result.list, success: true, total: result.total };
          } catch (error: any) {
            message.error(error?.message || '加载酒店列表失败');
            return { data: [], success: false, total: 0 };
          }
        }}
        columns={columns}
        pagination={{ pageSize: 10 }}
      />

      <Drawer
        width={760}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="酒店详情"
      >
        {current ? (
          <>
            <Typography.Paragraph type="secondary">
              {statusTag(current.status)}
              {reviews
                ? `  当前评分：${reviews.starRating || current.starRating || 0}`
                : ''}
            </Typography.Paragraph>

            <ProDescriptions<Hotel>
              column={2}
              dataSource={current}
              columns={[
                { title: '商户', dataIndex: 'owner' },
                { title: '酒店名(中文)', dataIndex: 'nameCn' },
                { title: '酒店名(英文)', dataIndex: 'nameEn' },
                { title: '地址', dataIndex: 'address', span: 2 },
                { title: '星级', dataIndex: 'starRating' },
                { title: '开业时间', dataIndex: 'openDate' },
                {
                  title: '房型/价格',
                  dataIndex: 'roomTypes',
                  span: 2,
                  render: (_, row) =>
                    row.roomTypes?.length
                      ? row.roomTypes
                          .map(
                            (room) => `${room.name}：${room.basePriceCents} 元`,
                          )
                          .join('；')
                      : '暂无数据',
                },
                { title: '创建时间', dataIndex: 'createdAt', span: 2 },
                { title: '更新时间', dataIndex: 'updatedAt', span: 2 },
              ]}
            />

            <Typography.Title level={5} style={{ marginTop: 20 }}>
              评论列表
            </Typography.Title>

            <List
              loading={reviewLoading}
              locale={{ emptyText: '暂无评论' }}
              dataSource={reviews?.items || []}
              renderItem={(item) => (
                <List.Item key={item.id}>
                  <List.Item.Meta
                    title={
                      <Space>
                        <Typography.Text strong>
                          {item.userName}
                        </Typography.Text>
                        <Rate disabled allowHalf value={item.rating} />
                        <Typography.Text type="secondary">
                          入住日期：{item.checkInDate || '-'}
                        </Typography.Text>
                      </Space>
                    }
                    description={
                      <>
                        <Typography.Paragraph style={{ marginBottom: 6 }}>
                          {item.content || '未填写评论内容'}
                        </Typography.Paragraph>
                        <Typography.Text type="secondary">
                          评论时间：{item.createdAt || '-'}
                        </Typography.Text>
                      </>
                    }
                  />
                </List.Item>
              )}
            />

            {(reviews?.total || 0) > (reviews?.pageSize || 20) ? (
              <Pagination
                style={{ marginTop: 12, textAlign: 'right' }}
                current={reviews?.page || 1}
                pageSize={reviews?.pageSize || 20}
                total={reviews?.total || 0}
                onChange={(page) => {
                  if (current) {
                    loadReviews(current.id, page);
                  }
                }}
              />
            ) : null}
          </>
        ) : null}
      </Drawer>
    </PageContainer>
  );
};

export default AdminHotelsPage;
