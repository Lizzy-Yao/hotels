import { View, Text, Input, Button, Swiper, SwiperItem, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import Calendar from '../../components/Calendar'
import CityPicker from '../../components/CityPicker'
import './index.scss'

import banner1 from '../../assets/images/banner1.jpg'
import banner2 from '../../assets/images/banner2.jpg'

export default function Index () {
  const [location, setLocation] = useState('上海')
  const [keyword, setKeyword] = useState('')
  const [checkInDate, setCheckInDate] = useState('2024-03-01')
  const [checkOutDate, setCheckOutDate] = useState('2024-03-02')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  
  // 日历控制状态
  const [showCalendar, setShowCalendar] = useState(false)

  const banners = [banner1, banner2]
  const hotTags = ['免费停车场', '近地铁', '免费洗衣服务', '亲子酒店', '豪华型']

  const [showCityPicker, setShowCityPicker] = useState(false)

  const handleGetLocation = () => {
    Taro.getLocation({
      type: 'wgs84',
      success: () => {
        Taro.showToast({ title: '定位成功', icon: 'success' })
        setLocation('当前定位') 
      }
    })
  }

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

  const handleSearch = () => {
    const queryParams = `?city=${location}&keyword=${keyword}&checkIn=${checkInDate}&checkOut=${checkOutDate}`
    Taro.navigateTo({ url: `/pages/list/index${queryParams}` })
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
        <Button className='search-btn' onClick={handleSearch}>
          查找酒店
        </Button>
      </View>

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