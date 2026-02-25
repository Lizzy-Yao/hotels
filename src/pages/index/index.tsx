import { View, Text, Input, Button, Swiper, SwiperItem, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useMemo, useState } from 'react'
import Calendar from '../../components/Calendar'
import CityPicker from '../../components/CityPicker'
import './index.scss'

/** 日期格式化：YYYY-MM-DD */
const formatDate = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 页面展示：03月01日 */
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

type PriceFilter = '0' | '0-300' | '300-600' | '600+'

export default function Index () {
  // 顶部安全区兜底：自定义导航时必须做，否则会贴到状态栏
  const { statusBarHeight = 24 } = Taro.getSystemInfoSync()

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const [location, setLocation] = useState('上海')
  const [keyword, setKeyword] = useState('')
  const [checkInDate, setCheckInDate] = useState(formatDate(today))
  const [checkOutDate, setCheckOutDate] = useState(formatDate(tomorrow))

  // 快捷标签
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // 基础筛选：星级/价格（传给列表页）
  const [starFilter, setStarFilter] = useState<number | 0>(0)
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('0')

  // 弹窗
  const [showCalendar, setShowCalendar] = useState(false)
  const [showCityPicker, setShowCityPicker] = useState(false)

  // 跳转防连点
  const [navigating, setNavigating] = useState(false)

  const nights = useMemo(() => calcNights(checkInDate, checkOutDate), [checkInDate, checkOutDate])

  // Banner 用远程图，避免本地资源路径不一致导致白屏
  const banners = [
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&q=80&auto=format&fit=crop'
  ]

  const hotTags = ['免费停车场', '近地铁', '免费洗衣服务', '亲子酒店', '豪华型']
  const hotCities = ['上海', '北京', '广州', '深圳', '杭州', '青岛']
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  /** 统一跳转到酒店列表页：把条件拼到 query 里 */
  const goHotelList = async (override?: Partial<{
    city: string
    keyword: string
    tags: string[]
    star: number
    price: PriceFilter
  }>) => {
    if (navigating) return

    const city = override?.city ?? location
    const kw = override?.keyword ?? keyword
    const tags = override?.tags ?? selectedTags
    const star = override?.star ?? starFilter
    const price = override?.price ?? priceFilter

    const qs = [
      `city=${encodeURIComponent(city)}`,
      `keyword=${encodeURIComponent(kw)}`,
      `checkInDate=${encodeURIComponent(checkInDate)}`,
      `checkOutDate=${encodeURIComponent(checkOutDate)}`,
      `tags=${encodeURIComponent(JSON.stringify(tags || []))}`,
      `star=${encodeURIComponent(String(star || 0))}`,
      `price=${encodeURIComponent(price || '0')}`
    ].join('&')

    setNavigating(true)
    try {
      await Taro.navigateTo({ url: `/pages/hotel-list/index?${qs}` })
    } finally {
      setNavigating(false)
    }
  }

  return (
    <View className='home-page' style={{ '--status-bar-height': `${statusBarHeight}px` } as any}>
      {/* 自定义导航安全区（避免贴顶） */}
      <View className='safe-top' />

      {/* 顶部 Banner */}
      <View className='banner-wrap'>
        <Swiper className='banner-swiper' indicatorDots indicatorActiveColor='#fff' autoplay circular>
          {banners.map((url, idx) => (
            <SwiperItem key={idx}>
              <Image src={url} className='banner-img' mode='aspectFill' />
              <View className='banner-mask' />
            </SwiperItem>
          ))}
        </Swiper>

        {/* Banner 上方标题（替代系统“首页”字样） */}
        <View className='banner-title'>
          <Text className='banner-title-main'>酒店预订</Text>
          <Text className='banner-title-sub'>更近携程风格 · 更清晰层级</Text>
        </View>
      </View>

      {/* 悬浮搜索卡片 */}
      <View className='search-card'>
        {/* 城市 + 关键词 */}
        <View className='card-row location-row'>
          <View className='location-box' onClick={() => setShowCityPicker(true)}>
            <Text className='city-name'>{location}</Text>
            <Text className='location-icon'>📍</Text>
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

        {/* 日期 */}
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

        {/* 星级/价格（更像“快捷筛选”） */}
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

        {/* 标签 */}
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

        {/* 查询按钮 */}
        <Button className='search-btn' onClick={() => goHotelList()} loading={navigating} disabled={navigating}>
          {navigating ? '正在跳转...' : '查找酒店'}
        </Button>
      </View>

      {/* 下面不留白：内容区填充 */}
      <View className='home-content'>
        {/* 热门目的地 */}
        <View className='section'>
          <View className='section-title'>
            <Text className='section-title-text'>热门目的地</Text>
            <Text className='section-title-sub'>选择城市直接搜</Text>
          </View>

          <View className='chip-row'>
            {hotCities.map(c => (
              <Text key={c} className='chip' onClick={() => goHotelList({ city: c })}>
                {c}
              </Text>
            ))}
          </View>
        </View>

        {/* 精选推荐（填充下半屏，避免空白） */}
        <View className='section'>
          <View className='section-title'>
            <Text className='section-title-text'>精选推荐</Text>
            <Text className='section-title-sub'>更像携程的推荐区</Text>
          </View>

          <View className='rec-list'>
            <View className='rec-card' onClick={() => goHotelList({ tags: ['近地铁'], price: '300-600' })}>
              <Text className='rec-card-title'>地铁口优选</Text>
              <Text className='rec-card-sub'>通勤方便 · 评分优先</Text>
              <Text className='rec-card-tag'>近地铁</Text>
            </View>

            <View className='rec-card' onClick={() => goHotelList({ tags: ['亲子酒店'], star: 4 })}>
              <Text className='rec-card-title'>亲子出游</Text>
              <Text className='rec-card-sub'>设施齐全 · 4星起</Text>
              <Text className='rec-card-tag'>亲子酒店</Text>
            </View>

            <View className='rec-card' onClick={() => goHotelList({ tags: ['免费停车场'], price: '0-300' })}>
              <Text className='rec-card-title'>自驾友好</Text>
              <Text className='rec-card-sub'>停车方便 · 性价比</Text>
              <Text className='rec-card-tag'>免费停车场</Text>
            </View>

            <View className='rec-card' onClick={() => goHotelList({ tags: ['豪华型'], star: 5, price: '600+' })}>
              <Text className='rec-card-title'>高端精选</Text>
              <Text className='rec-card-sub'>5星 · ¥600+</Text>
              <Text className='rec-card-tag'>豪华型</Text>
            </View>
          </View>
        </View>
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

      {/* 城市选择弹窗 */}
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