import {
  Hotel,
  adminApprove,
  adminOffline,
  adminPublish,
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
      return <Tag color="gold">已发布</Tag>;
    case 'offline':
      return <Tag color="default">已下线</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
}

const AdminAuditsPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [current, setCurrent] = useState<Hotel | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const columns: ProColumns<Hotel>[] = [
    { title: '酒店名(中文)', dataIndex: 'nameCn' },
    { title: '酒店名(英文)', dataIndex: 'nameEn' },
    { title: '商户', dataIndex: 'owner', width: 120 },
    { title: '星级', dataIndex: 'starRating', width: 80 },
    { title: '开业时间', dataIndex: 'openDate', width: 120 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (_, record) => statusTag(record.status),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 260,
      render: (_, record) => {
        const canApproveOrReject = record.status === 'submitted';
        const canPublish =
          record.status === 'approved' || record.status === 'offline';
        const canOffline = record.status === 'published';

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
            <a
              onClick={async () => {
                try {
                  await adminPublish({ id: record.id });
                  message.success('已发布');
                  actionRef.current?.reload();
                } catch (e: any) {
                  message.error(e?.message || '操作失败');
                }
              }}
              style={{
                pointerEvents: canPublish ? 'auto' : 'none',
                opacity: canPublish ? 1 : 0.4,
              }}
            >
              发布
            </a>
            <a
              onClick={async () => {
                try {
                  await adminOffline({ id: record.id });
                  message.success('已下线');
                  actionRef.current?.reload();
                } catch (e: any) {
                  message.error(e?.message || '操作失败');
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
    <PageContainer header={{ title: '酒店审核' }}>
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
          } catch (e: any) {
            message.error(e?.message || '加载列表失败');
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
              {current.auditNote ? `  审核意见：${current.auditNote}` : ''}
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
                  render: (_, r) =>
                    r.roomTypes
                      .map((x) => `${x.name}：${x.basePriceCents} 元`)
                      .join('；'),
                },
                { title: '创建时间', dataIndex: 'createdAt', span: 2 },
                { title: '更新时间', dataIndex: 'updatedAt', span: 2 },
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
