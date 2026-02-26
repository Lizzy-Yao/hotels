import {
  Hotel,
  adminOffline,
  adminPublish,
  adminRestore,
  listAdminHotels,
} from '@/services/localHotels';
import type { ProColumns } from '@ant-design/pro-components';
import {
  ActionType,
  PageContainer,
  ProTable,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Space, Tag, message } from 'antd';
import React, { useRef } from 'react';

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
        all: { text: '全部' },
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
            <a onClick={() => history.push(`/admin/hotels/${record.id}`)}>
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
        form={{
          initialValues: {
            status: 'all',
          },
        }}
        request={async (params) => {
          try {
            const status = (params.status as string | undefined) || 'all';

            if (status === 'all') {
              const allStatus: Hotel['status'][] = [
                'DRAFT',
                'SUBMITTED',
                'APPROVED',
                'REJECTED',
                'PUBLISHED',
                'OFFLINE',
              ];

              const responses = await Promise.all(
                allStatus.map((item) =>
                  listAdminHotels({
                    page: 1,
                    pageSize: 200,
                    status: item,
                  }),
                ),
              );

              const unique = new Map<string, Hotel>();
              responses.forEach((res) => {
                res.list.forEach((hotel) => {
                  unique.set(hotel.id, hotel);
                });
              });

              const merged = Array.from(unique.values()).sort((a, b) =>
                String(b.updatedAt || '').localeCompare(
                  String(a.updatedAt || ''),
                ),
              );

              const current = params.current || 1;
              const pageSize = params.pageSize || 10;
              const start = (current - 1) * pageSize;
              const data = merged.slice(start, start + pageSize);

              return { data, success: true, total: merged.length };
            }

            const result = await listAdminHotels({
              page: params.current,
              pageSize: params.pageSize,
              status,
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
    </PageContainer>
  );
};

export default AdminHotelsPage;
