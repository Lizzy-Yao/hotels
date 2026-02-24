import {
  Hotel,
  HotelReview,
  getAdminHotel,
  listHotelReviews,
} from '@/services/localHotels';
import type { ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import {
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Rate,
  Row,
  Space,
  Statistic,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';

function statusTag(status?: Hotel['status']) {
  switch (status) {
    case 'DRAFT':
      return <Tag>草稿</Tag>;
    case 'SUBMITTED':
      return <Tag color="processing">已提交</Tag>;
    case 'APPROVED':
      return <Tag color="success">已通过</Tag>;
    case 'REJECTED':
      return <Tag color="error">已驳回</Tag>;
    case 'PUBLISHED':
      return <Tag color="gold">已上线</Tag>;
    case 'OFFLINE':
      return <Tag color="default">已下线</Tag>;
    default:
      return <Tag>未知</Tag>;
  }
}

function splitNearby(nearbyPlaces: any[] = []) {
  const attractions = nearbyPlaces.filter(
    (item) => item?.type === 'ATTRACTION',
  );
  const malls = nearbyPlaces.filter((item) => item?.type === 'MALL');
  const transport = nearbyPlaces.find((item) => item?.type === 'TRANSPORT');
  return { attractions, malls, transport };
}

const HotelDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [hotel, setHotel] = useState<Hotel | null>(null);

  const reviewColumns: ProColumns<HotelReview>[] = [
    { title: '用户', dataIndex: 'userName', width: 130, search: false },
    {
      title: '评分',
      dataIndex: 'rating',
      width: 150,
      search: false,
      render: (_, row) => <Rate allowHalf disabled value={row.rating} />,
    },
    {
      title: '评价内容',
      dataIndex: 'content',
      ellipsis: true,
      search: false,
    },
    {
      title: '入住日期',
      dataIndex: 'checkInDate',
      width: 130,
      search: false,
    },
    {
      title: '评价时间',
      dataIndex: 'createdAt',
      width: 190,
      search: false,
    },
  ];

  useEffect(() => {
    if (!id) return;
    getAdminHotel(id)
      .then((response: any) => {
        const data =
          response?.hotel ||
          response?.data?.hotel ||
          response?.data ||
          response;
        setHotel(data as Hotel);
      })
      .catch((error: any) => {
        message.error(error?.message || '获取酒店详情失败');
      });
  }, [id]);

  const nearby = useMemo(
    () => splitNearby((hotel as any)?.nearbyPlaces || []),
    [hotel],
  );

  return (
    <PageContainer
      header={{
        title: hotel?.nameCn || '酒店详情',
        onBack: () => history.push('/admin/hotels'),
        extra: [
          <Button key="back" onClick={() => history.push('/admin/hotels')}>
            返回列表
          </Button>,
        ],
      }}
    >
      {hotel ? (
        <Tabs
          items={[
            {
              key: 'info',
              label: '酒店信息',
              children: (
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Card
                    style={{
                      borderRadius: 12,
                      background:
                        'linear-gradient(120deg, rgba(24,144,255,0.08), rgba(82,196,26,0.08))',
                    }}
                  >
                    <Row gutter={[16, 16]} align="middle">
                      <Col xs={24} md={12}>
                        <Typography.Title level={3} style={{ margin: 0 }}>
                          {hotel.nameCn}
                        </Typography.Title>
                        <Typography.Text type="secondary">
                          {hotel.nameEn}
                        </Typography.Text>
                        <div style={{ marginTop: 10 }}>
                          {statusTag(hotel.status)}
                          <Tag color="blue">商户ID：{hotel.merchantId || '-'}</Tag>
                        </div>
                      </Col>
                      <Col xs={12} md={4}>
                        <Statistic
                          title="星级"
                          value={hotel.starRating || 0}
                          suffix="星"
                        />
                      </Col>
                      <Col xs={12} md={4}>
                        <Statistic
                          title="开业时间"
                          value={hotel.openDate || '-'}
                        />
                      </Col>
                      <Col xs={24} md={4}>
                        <Typography.Text type="secondary">地址</Typography.Text>
                        <div>{hotel.address || '-'}</div>
                      </Col>
                    </Row>
                  </Card>

                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                      <Card title="周边建筑与交通" style={{ borderRadius: 12 }}>
                        <Typography.Text strong>交通信息</Typography.Text>
                        <div style={{ margin: '8px 0 12px' }}>
                          {(nearby.transport as any)?.name || '暂无交通信息'}
                        </div>

                        <Divider style={{ margin: '12px 0' }} />

                        <Typography.Text strong>周边景点</Typography.Text>
                        <div style={{ marginTop: 8 }}>
                          {nearby.attractions.length ? (
                            <Space wrap>
                              {nearby.attractions.map((item: any) => (
                                <Tag
                                  key={item.id || item.name}
                                  color="geekblue"
                                >
                                  {item.name}
                                </Tag>
                              ))}
                            </Space>
                          ) : (
                            <Typography.Text type="secondary">
                              暂无景点
                            </Typography.Text>
                          )}
                        </div>

                        <Typography.Text
                          strong
                          style={{ display: 'block', marginTop: 12 }}
                        >
                          周边商场
                        </Typography.Text>
                        <div style={{ marginTop: 8 }}>
                          {nearby.malls.length ? (
                            <Space wrap>
                              {nearby.malls.map((item: any) => (
                                <Tag key={item.id || item.name} color="cyan">
                                  {item.name}
                                </Tag>
                              ))}
                            </Space>
                          ) : (
                            <Typography.Text type="secondary">
                              暂无商场
                            </Typography.Text>
                          )}
                        </div>
                      </Card>
                    </Col>

                    <Col xs={24} lg={12}>
                      <Card title="房型与房价" style={{ borderRadius: 12 }}>
                        {(hotel.roomTypes || []).length ? (
                          <Space
                            direction="vertical"
                            style={{ width: '100%' }}
                            size={12}
                          >
                            {(hotel.roomTypes || []).map((room) => (
                              <Card
                                key={room.name}
                                size="small"
                                style={{
                                  borderRadius: 10,
                                  border: '1px solid #f0f0f0',
                                  background: '#fafafa',
                                }}
                              >
                                <Row align="middle" justify="space-between">
                                  <Typography.Text strong>
                                    {room.name}
                                  </Typography.Text>
                                  <Typography.Title
                                    level={4}
                                    style={{ margin: 0, color: '#1677ff' }}
                                  >
                                    {room.basePriceCents} 元
                                  </Typography.Title>
                                </Row>
                              </Card>
                            ))}
                          </Space>
                        ) : (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="暂无房型"
                          />
                        )}
                      </Card>
                    </Col>
                  </Row>
                </Space>
              ),
            },
            {
              key: 'reviews',
              label: '评价',
              children: (
                <ProTable<HotelReview>
                  rowKey="id"
                  search={false}
                  columns={reviewColumns}
                  request={async (params) => {
                    if (!id) return { data: [], success: false, total: 0 };
                    try {
                      const result = await listHotelReviews({
                        id,
                        page: params.current,
                      });
                      return {
                        data: result.items,
                        success: true,
                        total: result.total,
                      };
                    } catch (error: any) {
                      message.error(error?.message || '获取评价失败');
                      return { data: [], success: false, total: 0 };
                    }
                  }}
                  pagination={{ pageSize: 20 }}
                />
              ),
            },
          ]}
        />
      ) : (
        <Card>
          <Empty description="未找到酒店信息" />
        </Card>
      )}
    </PageContainer>
  );
};

export default HotelDetailPage;
