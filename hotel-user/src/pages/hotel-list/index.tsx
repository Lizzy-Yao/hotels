import { View, Text, Input, Button, Image } from '@tarojs/components'
import Taro, { usePullDownRefresh, useReachBottom, useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import Calendar from '../../components/Calendar'
import CityPicker from '../../components/CityPicker'
import { searchHotels, type HotelItem } from '../../services/hotel'
import './index.scss'

type SortKey = 'recommend' | 'price' | 'score'
type PriceFilter = '0' | '0-300' | '300-600' | '600+'

type SearchState = {
  city: string;
  keyword: string;
  checkInDate: string;
  checkOutDate: string;
  tags: string[];
  star: number;       // 0=不限
  price: PriceFilter; // '0'=不限
}

const safeDecode = (v?: string) => {
  if (!v) return ''
  try {
    return decodeURIComponent(v)
  } catch (_err) {
    return v
  }
}

const safeParseTags = (v?: string) => {
  if (!v) return [] as string[]
  try {
    const decoded = safeDecode(v)
    const parsed = JSON.parse(decoded)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch (_err) {
    return [] as string[]
  }
}

const formatDateShow = (dateStr: string) => {
  const parts = (dateStr || '').split('-')
  if (parts.length < 3) return dateStr
  return `${parts[1]}/${parts[2]}`
}

const calcNights = (checkIn: string, checkOut: string) => {
  const start = new Date(checkIn).getTime()
  const end = new Date(checkOut).getTime()
  const nights = Math.round((end - start) / (1000 * 60 * 60 * 24))
  return nights > 0 ? nights : 1
}
const normalizeStarRating = (v: unknown) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  const s = Math.round(n)
  return Math.min(Math.max(s, 0), 5)
}

const renderStarRatingText = (starRating: unknown) => {
  const s = normalizeStarRating(starRating)
  if (s <= 0) return ''
  return `星级：${'★'.repeat(s)}`
}
const BATCH_SIZE = 10

export default function HotelListPage () {
  const router = useRouter()

  const [search, setSearch] = useState<SearchState>(() => {
    const p = router.params || {}
    // 兜底：支持直接进入列表页
    const today = new Date()
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
    const fmt = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    return {
      city: safeDecode(p.city) || '上海',
      keyword: safeDecode(p.keyword) || '',
      checkInDate: safeDecode(p.checkInDate) || fmt(today),
      checkOutDate: safeDecode(p.checkOutDate) || fmt(tomorrow),
      tags: safeParseTags(p.tags),
      star: Number(safeDecode(p.star) || 0) || 0,
      price: (safeDecode(p.price) as PriceFilter) || '0'
    }
  })

  const nights = useMemo(
    () => calcNights(search.checkInDate, search.checkOutDate),
    [search.checkInDate, search.checkOutDate]
  )

  const [sortKey, setSortKey] = useState<SortKey>('recommend')
  const [priceAsc, setPriceAsc] = useState(true)

  const [allList, setAllList] = useState<HotelItem[]>([])
  const [visibleList, setVisibleList] = useState<HotelItem[]>([])
  const [total, setTotal] = useState(0)

  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [showCalendar, setShowCalendar] = useState(false)
  const [showCityPicker, setShowCityPicker] = useState(false)

  const hotTags = ['免费停车场', '近地铁', '免费洗衣服务', '亲子酒店', '豪华型']

  /** 详细筛选：把“星级/价格/标签”都做成前端过滤，保证字段不全时也不崩 */
  const filteredList = useMemo(() => {
    const star = Number(search.star || 0)
    const price = search.price

    return allList.filter(item => {
      // 星级过滤
      if (star > 0) {
        const s = normalizeStarRating((item as any).starRating ?? (item as any).starLevel)
        if (s !== star) return false
      }

      // 价格过滤
      const p = Number(item.minPrice || 0)
      if (price === '0-300' && !(p > 0 && p <= 300)) return false
      if (price === '300-600' && !(p >= 300 && p <= 600)) return false
      if (price === '600+' && !(p >= 600)) return false

      // 标签过滤：只要命中一个就通过（更像携程）
      if (search.tags.length > 0) {
        const tags = Array.isArray(item.tags) ? item.tags : []
        const hit = search.tags.some(t => tags.includes(t))
        if (!hit) return false
      }

      // 关键词过滤：兜底本地过滤（后端如果已经过滤，这里不影响）
      const kw = (search.keyword || '').trim()
      if (kw) {
        const name = `${item.hotelName || ''} ${(item as any).hotelNameEn || ''}`.toLowerCase()
        const addr = `${item.address || ''}`.toLowerCase()
        if (!name.includes(kw.toLowerCase()) && !addr.includes(kw.toLowerCase())) return false
      }

      return true
    })
  }, [allList, search.keyword, search.price, search.star, search.tags])

  /** 排序：推荐/价格/评分 */
  const sortedList = useMemo(() => {
    const list = [...filteredList]
    if (sortKey === 'price') {
      list.sort((a, b) => (priceAsc ? a.minPrice - b.minPrice : b.minPrice - a.minPrice))
      return list
    }
    if (sortKey === 'score') {
      list.sort((a, b) => (b.score || 0) - (a.score || 0))
      return list
    }
    return list
  }, [filteredList, sortKey, priceAsc])

  /** 重新初始化可见列表（用于上滑自动加载） */
  const resetVisible = () => {
    setVisibleList(sortedList.slice(0, BATCH_SIZE))
  }

  useEffect(() => {
    resetVisible()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedList.length, sortKey, priceAsc, search.tags.join(','), search.star, search.price, search.keyword])

  /** 真正请求：只做一次服务端查询，详细筛选在前端完成 */
  const doSearch = async (nextSearch?: SearchState) => {
    const params = nextSearch || search

    setLoading(true)
    setErrorMsg('')
    try {
      const data = await searchHotels({
        city: params.city,
        keyword: params.keyword,
        checkInDate: params.checkInDate,
        checkOutDate: params.checkOutDate,
        tags: params.tags
      })

      const safeList = Array.isArray(data.list)
        ? data.list.filter(item => item && typeof item === 'object')
        : []

      setTotal(typeof data.total === 'number' ? data.total : safeList.length)
      setAllList(safeList)

      Taro.showToast({ title: `找到 ${typeof data.total === 'number' ? data.total : safeList.length} 家酒店`, icon: 'none' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : '查询失败，请稍后重试'
      setErrorMsg(msg)
      setTotal(0)
      setAllList([])
      setVisibleList([])
      Taro.showToast({ title: msg, icon: 'none' })
    } finally {
      setLoading(false)
      setLoadingMore(false)
      Taro.stopPullDownRefresh()
    }
  }

  // 首次进入自动查询
  useEffect(() => {
    doSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 下拉刷新
  usePullDownRefresh(() => doSearch())

  // 上滑自动加载（分批追加渲染）
  useReachBottom(() => {
    if (loading || loadingMore) return
    if (visibleList.length >= sortedList.length) return

    setLoadingMore(true)
    const next = sortedList.slice(visibleList.length, visibleList.length + BATCH_SIZE)

    setTimeout(() => {
      setVisibleList(prev => prev.concat(next))
      setLoadingMore(false)
    }, 250)
  })

  const toggleTag = (tag: string) => {
    const nextTags = search.tags.includes(tag)
      ? search.tags.filter(t => t !== tag)
      : [...search.tags, tag]

    const next = { ...search, tags: nextTags }
    setSearch(next)
    // 标签变化不必重新打后端（这里前端过滤就能体现），但你想更真实也可 doSearch(next)
  }

  const handleTapSort = (key: SortKey) => {
    if (key === 'price') {
      setSortKey('price')
      setPriceAsc(prev => !prev)
      return
    }
    setSortKey(key)
  }

  const handleImageError = (hotelId: string) => {
    // 防止 Image 404 导致卡片错位：把 coverImage 清空，显示占位
    setAllList(prev => prev.map(item => (item.hotelId === hotelId ? { ...item, coverImage: '' } : item)))
  }

  const sortHint = useMemo(() => {
    if (sortKey === 'price') return priceAsc ? '价格从低到高' : '价格从高到低'
    if (sortKey === 'score') return '评分优先'
    return '推荐排序'
  }, [sortKey, priceAsc])

  const handleTapHotel = (hotelId: string) => {
    if (!hotelId) {
      Taro.showToast({ title: '酒店ID无效', icon: 'none' })
      return
    }
    Taro.navigateTo({ url: `/pages/hotel-detail/index?hotelId=${encodeURIComponent(hotelId)}` })
  }

  const { statusBarHeight = 20 } = Taro.getSystemInfoSync()

  return (
    <View className='list-page' style={{ '--status-bar-height': `${statusBarHeight}px` } as any}>
      <View className='top-bar'>
        <View className='safe-top' />
        <View className='top-inner'>
          <View className='top-row'>
            <View className='back-btn' onClick={() => Taro.navigateBack()}><Text>‹</Text></View>

            <View className='core-conds'>
              <View className='cond-line'>
                <Text className='city-pill' onClick={() => setShowCityPicker(true)}>{search.city}</Text>
                <Text className='date-text' onClick={() => setShowCalendar(true)}>
                  {formatDateShow(search.checkInDate)} - {formatDateShow(search.checkOutDate)}
                </Text>
                <Text className='nights'>{nights}晚</Text>
              </View>

              <View className='search-line'>
                <Text className='search-icon'>🔎</Text>
                <Input
                  className='search-input'
                  value={search.keyword}
                  placeholder='位置 / 品牌 / 酒店'
                  placeholderClass='placeholder-style'
                  onInput={(e) => setSearch(prev => ({ ...prev, keyword: e.detail.value }))}
                />
                <Button className='search-btn' onClick={() => doSearch()} loading={loading} disabled={loading}>
                  {loading ? '...' : '搜索'}
                </Button>
              </View>
            </View>
          </View>
        </View>

        {/* 详细筛选区域：排序 + 星级 + 价格 + 标签（可继续扩展） */}
        <View className='filter-bar'>
          <Text className={`filter-pill ${sortKey === 'recommend' ? 'active' : ''}`} onClick={() => handleTapSort('recommend')}>推荐</Text>
          <Text className={`filter-pill ${sortKey === 'price' ? 'active' : ''}`} onClick={() => handleTapSort('price')}>价格</Text>
          <Text className={`filter-pill ${sortKey === 'score' ? 'active' : ''}`} onClick={() => handleTapSort('score')}>评分</Text>

          <Text className={`filter-pill ${search.star === 0 ? 'active' : ''}`} onClick={() => setSearch(prev => ({ ...prev, star: 0 }))}>不限星级</Text>
          <Text className={`filter-pill ${search.star === 3 ? 'active' : ''}`} onClick={() => setSearch(prev => ({ ...prev, star: 3 }))}>3星</Text>
          <Text className={`filter-pill ${search.star === 4 ? 'active' : ''}`} onClick={() => setSearch(prev => ({ ...prev, star: 4 }))}>4星</Text>
          <Text className={`filter-pill ${search.star === 5 ? 'active' : ''}`} onClick={() => setSearch(prev => ({ ...prev, star: 5 }))}>5星</Text>

          <Text className={`filter-pill ${search.price === '0' ? 'active' : ''}`} onClick={() => setSearch(prev => ({ ...prev, price: '0' }))}>不限价格</Text>
          <Text className={`filter-pill ${search.price === '0-300' ? 'active' : ''}`} onClick={() => setSearch(prev => ({ ...prev, price: '0-300' }))}>¥0-300</Text>
          <Text className={`filter-pill ${search.price === '300-600' ? 'active' : ''}`} onClick={() => setSearch(prev => ({ ...prev, price: '300-600' }))}>¥300-600</Text>
          <Text className={`filter-pill ${search.price === '600+' ? 'active' : ''}`} onClick={() => setSearch(prev => ({ ...prev, price: '600+' }))}>¥600+</Text>

          {hotTags.map(tag => (
            <Text
              key={tag}
              className={`filter-pill ${search.tags.includes(tag) ? 'active' : ''}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Text>
          ))}
        </View>
      </View>

      <View className='content'>
        <View className='list-header'>
          <Text className='total'>筛选后 {sortedList.length} 家 · 共找到 {total} 家</Text>
          <Text className='sort-tip'>{sortHint}</Text>
        </View>

        {errorMsg ? (
          <View className='empty'>
            <Text>{errorMsg}</Text>
            <Button className='retry' onClick={() => doSearch()}>重新加载</Button>
          </View>
        ) : null}

        {!errorMsg && !loading && visibleList.length === 0 ? (
          <View className='empty'>
            <Text>暂无符合条件的酒店，请更换筛选条件再试。</Text>
            <Button className='retry' onClick={() => doSearch()}>重新查询</Button>
          </View>
        ) : null}

        {!errorMsg && visibleList.map(item => (
          <View key={item.hotelId} className='hotel-card' onClick={() => handleTapHotel(item.hotelId)}>
            {item.coverImage ? (
              <Image
                className='hotel-cover'
                src={item.coverImage}
                mode='aspectFill'
                onError={() => handleImageError(item.hotelId)}
              />
            ) : (
              <View className='hotel-cover'>暂无图片</View>
            )}

            <View className='hotel-info'>
              {/* 酒店名：中/英显示（若后端没给英文名，normalize 后会为空） */}
              <Text className='hotel-name-cn'>{item.hotelName}</Text>
              {(item as any).hotelNameEn ? (
                <Text className='hotel-name-en'>{(item as any).hotelNameEn}</Text>
              ) : null}

                <View className='hotel-subline'>
                  {(() => {
                    const starText = renderStarRatingText((item as any).starRating)
                    return starText
                      ? <Text className='star'>{starText}</Text>
                      : <Text className='star star-empty'>暂无星级</Text>
                  })()}

                  {(item as any).openTime ? <Text className='open-time'>开业：{(item as any).openTime}</Text> : null}
                </View>

              <Text className='hotel-address'>{item.address}</Text>

              <View className='hotel-meta'>
                <Text className='hotel-score'>评分 {Number(item.score || 0).toFixed(1)}</Text>
                <Text className='hotel-comment'>{Number(item.commentCount || 0)} 条点评</Text>
              </View>

              <View className='hotel-tags'>
                {(Array.isArray(item.tags) ? item.tags : []).slice(0, 3).map(tag => (
                  <Text key={`${item.hotelId}-${tag}`} className='hotel-tag'>{tag}</Text>
                ))}
              </View>

              <View className='bottom-row'>
                <Text className='hint'>每晚均价</Text>
                <View>
                  <Text className='hotel-price'>¥{Number(item.minPrice || 0)}</Text>
                  <Text className='price-unit'>起</Text>
                </View>
              </View>
            </View>
          </View>
        ))}

        {!errorMsg && visibleList.length > 0 ? (
          <View className='load-more'>
            {visibleList.length >= sortedList.length ? '已经到底了' : (loadingMore ? '加载中...' : '上滑加载更多')}
          </View>
        ) : null}
      </View>

      <Calendar
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSelect={(start, end) => {
          const next = { ...search, checkInDate: start, checkOutDate: end }
          setSearch(next)
          setShowCalendar(false)
          // 日期变更一般需要重新请求（更真实）
          setTimeout(() => doSearch(next), 0)
        }}
      />

      <CityPicker
        visible={showCityPicker}
        currentCity={search.city}
        onClose={() => setShowCityPicker(false)}
        onSelect={(city) => {
          const next = { ...search, city }
          setSearch(next)
          setShowCityPicker(false)
          setTimeout(() => doSearch(next), 0)
        }}
      />
    </View>
  )
}
