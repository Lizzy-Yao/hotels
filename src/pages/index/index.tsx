import { View, Text, Input, Button, Swiper, SwiperItem, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useMemo, useState } from 'react'
import Calendar from '../../components/Calendar'
import CityPicker from '../../components/CityPicker'
import './index.scss'

/** 把 Date 转成 YYYY-MM-DD */
const formatDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 用于顶部日期展示：03月01日 */
const formatDateShow = (dateStr: string) => {
  const parts = (dateStr || '').split('-')
  if (parts.length < 3) return dateStr
  return `${parts[1]}月${parts[2]}日`
}

/** 计算入住晚数 */
const calcNights = (checkIn: string, checkOut: string) => {
  const start = new Date(checkIn).getTime()
  const end = new Date(checkOut).getTime()
  const nights = Math.round((end - start) / (1000 * 60 * 60 * 24))
  return nights > 0 ? nights : 1
}

export default function Index () {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const [location, setLocation] = useState('上海')
  const [keyword, setKeyword] = useState('')
  const [checkInDate, setCheckInDate] = useState(formatDate(today))
  const [checkOutDate, setCheckOutDate] = useState(formatDate(tomorrow))

  // 快捷标签（可多选）
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // 基础筛选：星级/价格（满足“筛选条件(酒店星级或价格等)”要求）
  const [starFilter, setStarFilter] = useState<number | 0>(0) // 0=不限，3/4/5=指定星级
  const [priceFilter, setPriceFilter] = useState<'0' | '0-300' | '300-600' | '600+'>('0')

  // 弹窗控制
  const [showCalendar, setShowCalendar] = useState(false)
  const [showCityPicker, setShowCityPicker] = useState(false)

  // 跳转 loading（避免重复点击）
  const [navigating, setNavigating] = useState(false)

  const nights = useMemo(() => calcNights(checkInDate, checkOutDate), [checkInDate, checkOutDate])

  const banners = [
    // 远程占位 Banner：避免你本地 assets 路径不一致导致白屏
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&q=80&auto=format&fit=crop'
  ]

  const hotTags = ['免费停车场', '近地铁', '免费洗衣服务', '亲子酒店', '豪华型']

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  /** 首页查询：按要求跳转到列表页展示结果:contentReference[oaicite:3]{index=3} */
  const handleGoList = async () => {
    if (navigating) return

    // 统一把 tags 序列化传递（列表页再 JSON.parse）
    const qs = [
      `city=${encodeURIComponent(location)}`,
      `keyword=${encodeURIComponent(keyword)}`,
      `checkInDate=${encodeURIComponent(checkInDate)}`,
      `checkOutDate=${encodeURIComponent(checkOutDate)}`,
      `tags=${encodeURIComponent(JSON.stringify(selectedTags || []))}`,
      `star=${encodeURIComponent(String(starFilter))}`,
      `price=${encodeURIComponent(priceFilter)}`
    ].join('&')

    setNavigating(true)
    try {
      await Taro.navigateTo({ url: `/pages/hotel-list/index?${qs}` })
    } finally {
      setNavigating(false)
    }
  }

  /** Banner 点击：优先跳详情；如果你还没做详情页，就先提示 */
  const handleBannerClick = () => {
    // 你如果已经有详情页，可改成：Taro.navigateTo({ url: `/pages/hotel-detail/index?hotelId=xxx` })
    Taro.showToast({ title: '可在此跳转酒店详情页（你完成详情页后再接入）', icon: 'none' })
  }

  return (
    <View className='home-page'>
      {/* 1. 顶部 Banner（点击可跳详情） */}
      <Swiper className='banner-swiper' indicatorDots indicatorActiveColor='#fff' autoplay circular>
        {banners.map((url, index) => (
          <SwiperItem key={index}>
            <Image src={url} className='banner-img' mode='aspectFill' onClick={handleBannerClick} />
            <View className='banner-mask' />
          </SwiperItem>
        ))}
      </Swiper>

      {/* 2. 悬浮搜索卡片 */}
      <View className='search-card'>
        {/* 位置与关键词 */}
        <View className='card-row location-row'>
          <View className='location-box' onClick={() => setShowCityPicker(true)}>
            <Text className='city-name'>{location}</Text>
            <Text className='location-icon'>📍 我的位置</Text>
          </View>
          <View className='divider' />
          <Input
            className='keyword-input'
            placeholder='地标 / 酒店名'
            placeholderClass='placeholder-style'
            value={keyword}
            onInput={(e) => setKeyword(e.detail.value)}
          />
        </View>

        {/* 入住/离店日期 */}
        <View className='card-row date-row' onClick={() => setShowCalendar(true)}>
          <View className='date-block'>
            <Text className='date-label'>入住</Text>
            <Text className='date-value'>{formatDateShow(checkInDate)}</Text>
          </View>
          <View className='night-badge'>共 {nights} 晚</View>
          <View className='date-block text-right'>
            <Text className='date-label'>离店</Text>
            <Text className='date-value'>{formatDateShow(checkOutDate)}</Text>
          </View>
        </View>

        {/* 星级/价格筛选（首页核心查询区域的一部分） */}
        <View className='filters-row'>
          <View className='filter-group'>
            <Text className={`filter-pill ${starFilter === 0 ? 'active' : ''}`} onClick={() => setStarFilter(0)}>不限星级</Text>
            <Text className={`filter-pill ${starFilter === 3 ? 'active' : ''}`} onClick={() => setStarFilter(3)}>3星</Text>
            <Text className={`filter-pill ${starFilter === 4 ? 'active' : ''}`} onClick={() => setStarFilter(4)}>4星</Text>
            <Text className={`filter-pill ${starFilter === 5 ? 'active' : ''}`} onClick={() => setStarFilter(5)}>5星</Text>
          </View>

          <View className='filter-group'>
            <Text className={`filter-pill ${priceFilter === '0' ? 'active' : ''}`} onClick={() => setPriceFilter('0')}>不限价格</Text>
            <Text className={`filter-pill ${priceFilter === '0-300' ? 'active' : ''}`} onClick={() => setPriceFilter('0-300')}>¥0-300</Text>
            <Text className={`filter-pill ${priceFilter === '300-600' ? 'active' : ''}`} onClick={() => setPriceFilter('300-600')}>¥300-600</Text>
            <Text className={`filter-pill ${priceFilter === '600+' ? 'active' : ''}`} onClick={() => setPriceFilter('600+')}>¥600+</Text>
          </View>
        </View>

        {/* 快捷标签 */}
        <View className='tags-row'>
          {hotTags.map(tag => (
            <Text
              key={tag}
              className={`tag-pill ${selectedTags.includes(tag) ? 'active' : ''}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Text>
          ))}
        </View>

        {/* 查询按钮：跳转列表页 */}
        <Button className='search-btn' onClick={handleGoList} loading={navigating} disabled={navigating}>
          {navigating ? '正在跳转...' : '查找酒店'}
        </Button>
      </View>

      {/* 日历弹窗 */}
      <Calendar
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSelect={(start, end) => {
          setCheckInDate(start)
          setCheckOutDate(end)
          setShowCalendar(false)
        }}
      />

      {/* 城市选择器弹窗 */}
      <CityPicker
        visible={showCityPicker}
        currentCity={location}
        onClose={() => setShowCityPicker(false)}
        onSelect={(city) => {
          setLocation(city)
          setShowCityPicker(false)
        }}
      />
    </View>
  )
}