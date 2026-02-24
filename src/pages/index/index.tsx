import { View, Text, Input, Button, Swiper, SwiperItem, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import Calendar from '../../components/Calendar'
import CityPicker from '../../components/CityPicker'
import { searchHotels, type HotelItem } from '../../services/hotel'
import './index.scss'

import banner1 from '../../assets/images/banner1.jpg'
import banner2 from '../../assets/images/banner2.jpg'

const formatDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function Index () {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const [location, setLocation] = useState('上海')
  const [keyword, setKeyword] = useState('')
  const [checkInDate, setCheckInDate] = useState(formatDate(today))
  const [checkOutDate, setCheckOutDate] = useState(formatDate(tomorrow))
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [hotelList, setHotelList] = useState<HotelItem[]>([])
  const [resultTotal, setResultTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  
  // 日历控制状态
  const [showCalendar, setShowCalendar] = useState(false)

  const banners = [banner1, banner2]
  const hotTags = ['免费停车场', '近地铁', '免费洗衣服务', '亲子酒店', '豪华型']

  const [showCityPicker, setShowCityPicker] = useState(false)

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  // 格式化日期显示 (例如: 03月01日)
  const formatDateShow = (dateStr: string) => {
    const [, month, day] = dateStr.split('-')
    return `${month}月${day}日`
  }

  // 计算入住晚数
  const calcNights = () => {
    const start = new Date(checkInDate).getTime()
    const end = new Date(checkOutDate).getTime()
    return Math.round((end - start) / (1000 * 60 * 60 * 24)) || 1
  }

  const handleSearch = async () => {
    setLoading(true)
    try {
      const data = await searchHotels({
        city: location,
        keyword,
        checkInDate,
        checkOutDate,
        tags: selectedTags
      })
      setHotelList(data.list)
      setResultTotal(data.total)
      setSearched(true)
      Taro.showToast({
        title: `找到 ${data.total} 家酒店`,
        icon: 'none'
      })
    } catch (error) {
      setHotelList([])
      setResultTotal(0)
      setSearched(true)
      Taro.showToast({
        title: error instanceof Error ? error.message : '查询失败，请稍后重试',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImageError = (hotelId: string) => {
    setHotelList(prev => prev.map(item => {
      if (item.hotelId !== hotelId) return item
      return {
        ...item,
        coverImage: ''
      }
    }))
  }

  return (
    <View className='home-page'>
      {/* 1. 沉浸式顶部 Banner */}
      <Swiper className='banner-swiper' indicatorDots indicatorActiveColor='#fff' autoplay circular>
        {banners.map((url, index) => (
          <SwiperItem key={index}>
            <Image src={url} className='banner-img' mode='aspectFill' />
            <View className='banner-mask'></View> {/* 渐变遮罩增加高级感 */}
          </SwiperItem>
        ))}
      </Swiper>

      {/* 2. 悬浮搜索卡片 */}
      <View className='search-card'>
        {/* 位置与搜索 */}
        <View className='card-row location-row'>
          <View className='location-box' onClick={() => setShowCityPicker(true)}>
            <Text className='city-name'>{location}</Text>
            <Text className='location-icon'>📍 我的位置</Text>
          </View>
          <View className='divider'></View>
          <Input 
            className='keyword-input' 
            placeholder='地标 / 酒店名' 
            placeholderClass='placeholder-style'
            value={keyword}
            onInput={(e) => setKeyword(e.detail.value)}
          />
        </View>

        {/* 日期选择区 */}
        <View className='card-row date-row' onClick={() => setShowCalendar(true)}>
          <View className='date-block'>
            <Text className='date-label'>入住</Text>
            <Text className='date-value'>{formatDateShow(checkInDate)}</Text>
          </View>
          <View className='night-badge'>共 {calcNights()} 晚</View>
          <View className='date-block text-right'>
            <Text className='date-label'>离店</Text>
            <Text className='date-value'>{formatDateShow(checkOutDate)}</Text>
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

        {/* 查询按钮 */}
        <Button className='search-btn' onClick={handleSearch} loading={loading} disabled={loading}>
          {loading ? '查询中...' : '查找酒店'}
        </Button>
      </View>

      {searched && (
        <View className='result-panel'>
          <View className='result-header'>
            <Text className='result-title'>酒店结果</Text>
            <Text className='result-count'>共 {resultTotal} 家</Text>
          </View>
          {hotelList.length === 0 && (
            <View className='empty-result'>暂无符合条件的酒店，请更换筛选条件再试。</View>
          )}
          {hotelList.map(item => (
            <View key={item.hotelId} className='hotel-card'>
              {item.coverImage ? (
                <Image
                  className='hotel-cover'
                  src={item.coverImage}
                  mode='aspectFill'
                  onError={() => handleImageError(item.hotelId)}
                />
              ) : (
                <View className='hotel-cover placeholder'>暂无图片</View>
              )}
              <View className='hotel-info'>
                <Text className='hotel-name'>{item.hotelName}</Text>
                <Text className='hotel-address'>{item.address}</Text>
                <View className='hotel-meta'>
                  <Text className='hotel-score'>{item.score.toFixed(1)} 分</Text>
                  <Text className='hotel-comment'>{item.commentCount} 条点评</Text>
                </View>
                <View className='hotel-tags'>
                  {item.tags.slice(0, 3).map(tag => (
                    <Text key={`${item.hotelId}-${tag}`} className='hotel-tag'>{tag}</Text>
                  ))}
                </View>
                <Text className='hotel-price'>¥{item.minPrice} 起</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 日历弹窗组件 */}
      <Calendar 
        visible={showCalendar} 
        onClose={() => setShowCalendar(false)} 
        onSelect={(start, end) => {
          setCheckInDate(start)
          setCheckOutDate(end)
          setShowCalendar(false)
        }}
      />

      {/* 城市选择器弹窗组件 */}
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
