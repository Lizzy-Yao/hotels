import { View, Text, Button } from '@tarojs/components'
import Taro, { usePullDownRefresh, useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { getPublicHotelDetail, type PublicHotelDetail } from '../../services/hotel'
import './index.scss'

const safeDecode = (v?: string) => {
  if (!v) return ''
  try {
    return decodeURIComponent(v)
  } catch (_err) {
    return v
  }
}

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '--'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatPriceCents = (price?: number, currency = 'CNY') => {
  if (typeof price !== 'number' || Number.isNaN(price)) return '--'
  const yuan = price / 100
  const value = Number.isInteger(yuan) ? `${yuan}` : yuan.toFixed(2)
  return currency === 'CNY' ? `¥${value}` : `${value} ${currency}`
}

const starText = (count?: number) => {
  const c = Math.max(0, Math.min(5, Number(count || 0)))
  return c > 0 ? `${'★'.repeat(c)} ${c}星` : '星级待补充'
}

const placeTypeMap: Record<string, string> = {
  ATTRACTION: '景点',
  TRANSPORT: '交通',
  MALL: '商圈'
}

export default function HotelDetailPage () {
  const router = useRouter()
  const hotelId = safeDecode(router.params?.hotelId)

  const [hotel, setHotel] = useState<PublicHotelDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDetail = async () => {
    if (!hotelId) {
      setError('缺少酒店ID')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const detail = await getPublicHotelDetail(hotelId)
      setHotel(detail)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '获取酒店详情失败'
      setError(msg)
      setHotel(null)
      Taro.showToast({ title: msg, icon: 'none' })
    } finally {
      setLoading(false)
      Taro.stopPullDownRefresh()
    }
  }

  useEffect(() => {
    fetchDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId])

  usePullDownRefresh(() => {
    fetchDetail()
  })

  const priceText = useMemo(() => {
    if (!hotel) return '--'
    const min = formatPriceCents(hotel.minPriceCents, hotel.currency)
    const max = formatPriceCents(hotel.maxPriceCents, hotel.currency)
    return min === max ? min : `${min} - ${max}`
  }, [hotel])

  // 顶部安全区兜底：安卓上 env(safe-area-inset-top) 经常为 0
  const { statusBarHeight = 24 } = Taro.getSystemInfoSync()

  return (
    <View
      className='hotel-detail-page'
      style={{ '--status-bar-height': `${statusBarHeight}px` } as any}
    >
      <View className='hero'>
        <View className='safe-top' />
        <View className='nav-row'>
          <View className='back' onClick={() => Taro.navigateBack()}>
            <Text>‹</Text>
          </View>
          {/* <Text className='title'>酒店详情</Text> */}
          <View className='placeholder' />
        </View>

        <View className='hero-card'>
          {loading ? <Text className='hero-main'>正在加载酒店信息...</Text> : null}
          {!loading && hotel ? (
            <>
              <Text className='hero-main'>{hotel.nameCn || '未命名酒店'}</Text>
              {hotel.nameEn ? <Text className='hero-sub'>{hotel.nameEn}</Text> : null}
              <Text className='hero-star'>{starText(hotel.starRating)}</Text>
            </>
          ) : null}
          {!loading && error ? <Text className='hero-main'>{error}</Text> : null}
        </View>
      </View>

      <View className='content'>
        {!loading && !error && hotel ? (
          <>
            <View className='card'>
              <Text className='card-title'>基础信息</Text>
              <View className='line'><Text className='k'>地址</Text><Text className='v'>{hotel.address || '--'}</Text></View>
              <View className='line'><Text className='k'>开业时间</Text><Text className='v'>{formatDate(hotel.openDate)}</Text></View>
              <View className='line'><Text className='k'>价格区间</Text><Text className='v highlight'>{priceText}</Text></View>
            </View>

            <View className='card'>
              <Text className='card-title'>房型信息（{hotel.roomTypes.length}）</Text>
              {hotel.roomTypes.length > 0 ? hotel.roomTypes.map(room => (
                <View key={room.id} className='item'>
                  <View className='item-top'>
                    <Text className='item-title'>{room.name}</Text>
                    <Text className='item-price'>{formatPriceCents(room.basePriceCents, room.currency)} / 晚</Text>
                  </View>
                  {/* <Text className='item-desc'>{room.bedType} · {room.capacity}人 · {room.areaSqm}m2</Text> */}
                </View>
              )) : <Text className='empty'>暂无房型数据</Text>}
            </View>

            <View className='card'>
              <Text className='card-title'>周边信息（{hotel.nearbyPlaces.length}）</Text>
              {hotel.nearbyPlaces.length > 0 ? hotel.nearbyPlaces.map(place => (
                <View key={place.id} className='item'>
                  <View className='item-top'>
                    <Text className='item-title'>{place.name}</Text>
                    <Text className='type-tag'>{placeTypeMap[place.type] || place.type}</Text>
                  </View>
                  <Text className='item-desc'>{place.address || '地址待补充'} · 约{place.distanceMeters}m</Text>
                </View>
              )) : <Text className='empty'>暂无周边信息</Text>}
            </View>

            <View className='card'>
              <Text className='card-title'>优惠活动（{hotel.discounts.length}）</Text>
              {hotel.discounts.length > 0 ? hotel.discounts.map(discount => (
                <View key={discount.id} className='item'>
                  <View className='item-top'>
                    <Text className='item-title'>{discount.title}</Text>
                    <Text className='discount-tag'>{discount.isActive ? '生效中' : '未生效'}</Text>
                  </View>
                  <Text className='item-desc'>{discount.description || '暂无活动说明'}</Text>
                  <Text className='item-desc'>时间：{formatDate(discount.startDate)} - {formatDate(discount.endDate)}</Text>
                </View>
              )) : <Text className='empty'>暂无优惠活动</Text>}
            </View>
          </>
        ) : null}

        {!loading && error ? (
          <View className='error-card'>
            <Text className='error-text'>{error}</Text>
            <Button className='retry-btn' onClick={fetchDetail}>重新加载</Button>
          </View>
        ) : null}
      </View>
    </View>
  )
}
