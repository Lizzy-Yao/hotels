import { Hotel, listHotels, submitHotel } from '@/services/localHotels';
import type { ProColumns } from '@ant-design/pro-components';
import {
  ActionType,
  PageContainer,
  ProDescriptions,
  ProTable,
} from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import { Button, Drawer, Space, Tag, Typography, message } from 'antd';
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

const UserHotelsPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const { initialState } = useModel('@@initialState');
  const owner = initialState?.currentUser?.username;

  const [detailOpen, setDetailOpen] = useState(false);
  const [current, setCurrent] = useState<Hotel | null>(null);

  const columns: ProColumns<Hotel>[] = [
    { title: '酒店名(中文)', dataIndex: 'nameCn' },
    { title: '酒店名(英文)', dataIndex: 'nameEn' },
    { title: '地址', dataIndex: 'address', ellipsis: true },
    { title: '星级', dataIndex: 'star', width: 80 },
    { title: '开业时间', dataIndex: 'openingDate', width: 120 },
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
        const canEdit =
          record.status === 'draft' ||
          record.status === 'rejected' ||
          record.status === 'offline';
        const canSubmit =
          record.status === 'draft' ||
          record.status === 'rejected' ||
          record.status === 'offline';

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
              onClick={() => {
                history.push(`/user-center/hotels/edit/${record.id}`);
              }}
              style={{
                pointerEvents: canEdit ? 'auto' : 'none',
                opacity: canEdit ? 1 : 0.4,
              }}
            >
              编辑
            </a>
            <a
              onClick={async () => {
                try {
                  submitHotel({ id: record.id, owner: owner || '' });
                  message.success('已提交审核');
                  actionRef.current?.reload();
                } catch (e: any) {
                  message.error(e?.message || '提交失败');
                }
              }}
              style={{
                pointerEvents: canSubmit ? 'auto' : 'none',
                opacity: canSubmit ? 1 : 0.4,
              }}
            >
              提交审核
            </a>
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer
      header={{
        title: '酒店信息（用户）',
        extra: [
          <Button
            key="new"
            type="primary"
            onClick={() => history.push('/user-center/hotels/new')}
          >
            新建酒店
          </Button>,
        ],
      }}
    >
      <ProTable<Hotel>
        actionRef={actionRef}
        rowKey="id"
        search={{ labelWidth: 100 }}
        request={async () => {
          const data = owner ? listHotels({ owner }) : [];
          return { data, success: true };
        }}
        columns={columns}
        pagination={{ pageSize: 10 }}
      />

      <Drawer
        width={720}
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
                { title: '酒店名(中文)', dataIndex: 'nameCn' },
                { title: '酒店名(英文)', dataIndex: 'nameEn' },
                { title: '地址', dataIndex: 'address' },
                { title: '星级', dataIndex: 'star' },
                { title: '开业时间', dataIndex: 'openingDate' },
                {
                  title: '房型/价格',
                  dataIndex: 'roomTypes',
                  span: 2,
                  render: (_, r) =>
                    r.roomTypes
                      .map((x) => `${x.name}：${x.price} 元`)
                      .join('；'),
                },
              ]}
            />
          </>
        ) : null}
      </Drawer>
    </PageContainer>
  );
};

export default UserHotelsPage;
