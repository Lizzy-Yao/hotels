import { getHotel, upsertHotel, type Hotel } from '@/services/localHotels';
import {
  PageContainer,
  ProForm,
  ProFormDatePicker,
  ProFormDigit,
  ProFormList,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { history, useModel, useParams } from '@umijs/max';
import { Card, message } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';

type DiscountType = 'percentOff' | 'amountOffCents';

type DiscountFormItem = {
  id?: string;
  title: string;
  type: DiscountType;
  value: number;
  description?: string;
};

type RoomTypeFormItem = {
  id?: string;
  name: string;
  basePriceCents: number;
};

type HotelFormValues = Omit<
  Partial<Hotel>,
  'openDate' | 'nearbyPlaces' | 'discounts' | 'roomTypes'
> & {
  openDate?: any; // dayjs
  nearbyPlaces?: string[];
  nearbyMalls?: string[];
  transportation?: string;
  discounts?: DiscountFormItem[];
  roomTypes?: RoomTypeFormItem[];
};

// 接口 hotel -> 表单回填值
function toFormValues(hotel: any): HotelFormValues {
  const nearby = Array.isArray(hotel?.nearbyPlaces) ? hotel.nearbyPlaces : [];

  // DatePicker 建议用 YYYY-MM-DD，避免时区导致“前一天”
  const openDateStr =
    typeof hotel?.openDate === 'string' ? hotel.openDate.slice(0, 10) : undefined;

  return {
    ...hotel,

    openDate: openDateStr ? dayjs(openDateStr) : undefined,

    nearbyPlaces: nearby
      .filter((x: any) => x?.type === 'ATTRACTION')
      .map((x: any) => x?.name)
      .filter(Boolean),

    nearbyMalls: nearby
      .filter((x: any) => x?.type === 'MALL')
      .map((x: any) => x?.name)
      .filter(Boolean),

    transportation: nearby.find((x: any) => x?.type === 'TRANSPORT')?.name,

    discounts: (hotel?.discounts ?? []).map((d: any) => ({
      id: d.id,
      title: d.title,
      type: d.type as DiscountType,
      value: d.type === 'percentOff' ? d.percentOff : d.amountOffCents,
      description: d.description,
    })),

    roomTypes: (hotel?.roomTypes ?? []).map((rt: any) => ({
      id: rt.id,
      name: rt.name,
      basePriceCents: rt.basePriceCents,
    })),
  };
}

// 表单值 -> 提交 payload（按你后端字段还原）
function toSubmitPayload(values: any, existingHotel: any) {
  // const openDate = values?.openDate ? values.openDate.format('YYYY-MM-DD') : undefined;
  const openDate = values?.openDate 
  ? (dayjs.isDayjs(values.openDate) ? values.openDate.format('YYYY-MM-DD') : values.openDate) 
  : undefined;

  const nearbyPlaces = [
    ...(values?.nearbyPlaces ?? []).map((n: any) => ({
      type: 'ATTRACTION',
      name: typeof n === 'string' ? n : n.value,
    })),
    ...(values?.nearbyMalls ?? []).map((n: any) => ({
      type: 'MALL',
      name: typeof n === 'string' ? n : n.value,
    })),
    ...(values?.transportation
      ? [
          {
            type: 'TRANSPORT',
            name:
              typeof values.transportation === 'string'
                ? values.transportation
                : values.transportation.value,
          },
        ]
      : []),
  ];

  const discounts = (values?.discounts ?? []).map((d: any) => ({
    id: d.id,
    type: d.type,
    title: d.title,
    description: d.description,
    percentOff: d.type === 'percentOff' ? d.value : null,
    amountOffCents: d.type === 'amountOffCents' ? d.value : null,
  }));

  const roomTypes = (values?.roomTypes ?? []).map((rt: any) => ({
    id: rt.id,
    name: rt.name,
    basePriceCents: rt.basePriceCents,
  }));

  // 剔除表单的“辅助字段”
  const {
    nearbyPlaces: _np,
    nearbyMalls: _nm,
    transportation: _t,
    discounts: _d,
    roomTypes: _rt,
    ...rest
  } = values;

  return {
    ...existingHotel,
    ...rest,
    openDate,
    nearbyPlaces,
    discounts,
    roomTypes,
  };
}

export default function HotelEditPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const { initialState } = useModel('@@initialState');

  const [rawHotel, setRawHotel] = useState<any>(null);
  const [form] = ProForm.useForm();

  const owner = useMemo(() => initialState?.currentUser?.username || '', [initialState]);

  const handleFinish = async (values: any) => {
    try {
      // 1) 兼容 openDate：可能是 dayjs，也可能已经是 string
      const openDate =
        values.openDate && typeof values.openDate?.format === 'function'
          ? values.openDate.format('YYYY-MM-DD')
          : values.openDate;
  
      // 2) 关键：编辑时必须把 id 传给 upsertHotel
      const payload = {
        ...values,
        openDate,
        owner,
        id: isEdit ? id : undefined, // ⭐ 这一行决定 PUT 还是 POST
      };
  
      await upsertHotel(payload);
  
      message.success('保存成功');
      history.push('/user-center/hotels');
      return true;
    } catch (e: any) {
      console.log('发生异常:', e);
      message.error(e?.message || '失败');
      return false;
    }
  };
  
  
  

  return (
    <PageContainer title={isEdit ? '编辑酒店' : '新建酒店'}>
      <Card>
      <ProForm
          form={form}
          layout="vertical"
          request={async () => {
            if (!id) return {};

            const data = await getHotel(id);

            console.log('真实数据:', data);

            // 这里不要猜结构，直接判断
            const hotel = data.hotel ? data.hotel : data;

            if (!hotel) return {};

            return {
              nameCn: hotel.nameCn,
              nameEn: hotel.nameEn,
              address: hotel.address,
              starRating: hotel.starRating,
              openDate: hotel.openDate
                ? dayjs(hotel.openDate.slice(0, 10))
                : undefined,

              roomTypes: (hotel.roomTypes || []).map((r: any) => ({
                name: r.name,
                basePriceCents: r.basePriceCents,
              })),

              nearbyPlaces: (hotel.nearbyPlaces || [])
                .filter((x: any) => x.type === 'ATTRACTION')
                .map((x: any) => x.name),

              nearbyMalls: (hotel.nearbyPlaces || [])
                .filter((x: any) => x.type === 'MALL')
                .map((x: any) => x.name),

              transportation: (hotel.nearbyPlaces || [])
                .find((x: any) => x.type === 'TRANSPORT')
                ?.name,

              discounts: (hotel.discounts || []).map((d: any) => ({
                title: d.title,
                type: d.type,
                value:
                  d.type === 'percentOff'
                    ? d.percentOff
                    : d.amountOffCents,
                description: d.description,
              })),
            };
          }}
          onFinish={handleFinish}
        >

          <ProForm.Group title="基础信息">
            <ProFormText
              name="nameCn"
              label="酒店名(中文)"
              placeholder="请输入中文名称"
              rules={[{ required: true }]}
              width="md"
            />
            <ProFormText
              name="nameEn"
              label="酒店名(英文)"
              placeholder="请输入英文名称"
              rules={[{ required: true }]}
              width="md"
            />
            <ProFormText
              name="address"
              label="地址"
              placeholder="请输入详细地址"
              rules={[{ required: true }]}
              width="xl"
            />
          </ProForm.Group>

          <ProForm.Group>
            <ProFormDigit
              name="starRating"
              label="星级"
              min={1}
              max={5}
              rules={[{ required: true }]}
              width="xs"
            />
            <ProFormDatePicker name="openDate" label="开业时间" rules={[{ required: true }]} width="md" />
          </ProForm.Group>

          <ProForm.Group title="周边与交通（选填）">
            <ProFormSelect
              name="nearbyPlaces"
              label="周边热门景点"
              mode="tags"
              placeholder="输入景点后回车，可输入多个"
              width="lg"
              fieldProps={{ tokenSeparators: [',', '，'] }}
            />
            <ProFormSelect
              name="nearbyMalls"
              label="周边商场"
              mode="tags"
              placeholder="输入商场后回车，可输入多个"
              width="lg"
              fieldProps={{ tokenSeparators: [',', '，'] }}
            />
            <ProFormTextArea
              name="transportation"
              label="交通信息"
              placeholder="例如：距离地铁站500米，有机场大巴直达"
              width="xl"
            />
          </ProForm.Group>

          <ProForm.Group title="营销与优惠（选填）" style={{ width: '100%' }}>
            <ProFormList
              name="discounts"
              label="优惠活动配置"
              creatorButtonProps={{
                position: 'bottom',
                creatorButtonText: '新增优惠活动',
              }}
              itemRender={({ listDom, action }, { index }) => (
                <Card bordered style={{ marginBottom: 8 }} size="small" extra={action} title={`优惠活动 ${index + 1}`}>
                  {listDom}
                </Card>
              )}
            >
              <ProForm.Group>
                <ProFormText
                  name="title"
                  label="活动名称"
                  placeholder="如：节日特惠"
                  rules={[{ required: true }]}
                  width="sm"
                />
                <ProFormSelect
                  name="type"
                  label="类型"
                  valueEnum={{
                    percentOff: '打折',
                    amountOffCents: '满减/直减',
                  }}
                  rules={[{ required: true }]}
                  width="xs"
                />
                <ProFormDigit
                  name="value"
                  label="数值"
                  placeholder="0.8或200"
                  rules={[{ required: true }]}
                  width="xs"
                  fieldProps={{ precision: 2 }}
                />
                <ProFormText name="description" label="详细描述" placeholder="活动规则描述" width="md" />
              </ProForm.Group>
            </ProFormList>
          </ProForm.Group>

          <ProForm.Group title="房型设置">
            <ProFormList
              name="roomTypes"
              label="房型列表"
              rules={[
                {
                  validator: async (_, value) => {
                    if (!value || value.length < 1) throw new Error('至少需要填写一个房型');
                  },
                },
              ]}
              creatorButtonProps={{ creatorButtonText: '添加新房型' }}
            >
              <ProForm.Group>
                <ProFormText name="name" label="房型名称" rules={[{ required: true }]} />
                <ProFormDigit name="basePriceCents" label="价格(元)" rules={[{ required: true }]} />
              </ProForm.Group>
            </ProFormList>
          </ProForm.Group>
        </ProForm>
      </Card>
    </PageContainer>
  );
}
