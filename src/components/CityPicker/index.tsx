import { View, Text, ScrollView } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

// 数据依然放在外部
const hotCities = ['北京', '上海', '广州', '深圳', '成都', '杭州', '重庆', '西安', '三亚']
const allCities = [
  { letter: 'A', cities: ['澳门', '鞍山', '安庆', '安阳', '阿坝', '阿拉善盟'] },
  { letter: 'B', cities: ['北京', '保定', '包头', '宝鸡', '蚌埠', '白城', '百色', '北海'] },
  { letter: 'C', cities: ['成都', '重庆', '长沙', '长春', '常州', '沧州', '承德', '常德'] },
  { letter: 'D', cities: ['大连', '东莞', '大庆', '德州', '丹东', '大理', '达州', '大同'] },
  { letter: 'E', cities: ['鄂尔多斯', '恩施', '鄂州'] },
  { letter: 'F', cities: ['福州', '佛山', '抚顺', '阜阳', '抚州', '防城港'] },
  { letter: 'G', cities: ['广州', '贵阳', '桂林', '赣州', '广元', '广安'] },
  { letter: 'H', cities: ['杭州', '哈尔滨', '合肥', '海口', '呼和浩特', '邯郸', '湖州', '衡阳'] },
  { letter: 'J', cities: ['济南', '吉林', '江门', '嘉兴', '金华', '九江', '揭阳', '晋中'] },
  { letter: 'K', cities: ['昆明', '开封', '喀什地区', '克拉玛依'] },
  { letter: 'L', cities: ['兰州', '洛阳', '连云港', '丽江', '临沂', '柳州', '辽阳', '廊坊'] },
  { letter: 'M', cities: ['绵阳', '牡丹江', '马鞍山', '茂名', '梅州'] },
  { letter: 'N', cities: ['南京', '宁波', '南宁', '南昌', '南通', '南阳', '南平', '宁德'] },
  { letter: 'P', cities: ['平顶山', '莆田', '盘锦', '濮阳', '萍乡'] },
  { letter: 'Q', cities: ['青岛', '泉州', '齐齐哈尔', '秦皇岛', '曲靖', '衢州', '清远'] },
  { letter: 'R', cities: ['日照', '日喀则'] },
  { letter: 'S', cities: ['上海', '深圳', '沈阳', '石家庄', '三亚', '苏州', '汕头', '绍兴'] },
  { letter: 'T', cities: ['天津', '太原', '唐山', '台州', '泰安', '泰州', '铁岭', '通辽'] },
  { letter: 'W', cities: ['武汉', '无锡', '温州', '威海', '乌鲁木齐', '潍坊', '芜湖', '梧州'] },
  { letter: 'X', cities: ['西安', '厦门', '徐州', '西宁', '襄阳', '咸阳', '信阳', '邢台'] },
  { letter: 'Y', cities: ['银川', '烟台', '扬州', '宜昌', '岳阳', '盐城', '玉林', '运城'] },
  { letter: 'Z', cities: ['郑州', '珠海', '中山', '遵义', '湛江', '张家口', '镇江', '淄博'] }
]

interface CityPickerProps {
  visible: boolean;
  currentCity: string;
  onClose: () => void;
  onSelect: (city: string) => void;
}

export default function CityPicker({ visible, currentCity, onClose, onSelect }: CityPickerProps) {
  // 🌟 这里现在极其干净，只有一个核心状态：滚动ID
  const [scrollIntoId, setScrollIntoId] = useState('')

  const handleGetLocation = () => {
    Taro.showToast({ title: '定位中...', icon: 'loading' })
    Taro.getLocation({
      type: 'wgs84',
      success: () => {
        Taro.showToast({ title: '定位成功', icon: 'success' })
        onSelect('我的位置') 
      },
      fail: () => {
        Taro.showToast({ title: '定位失败', icon: 'none' })
      }
    })
  }

  const handleLetterClick = (letter: string) => {
    // 🌟 核心大招：绝不多次 setState！只设置ID，立刻结束。
    setScrollIntoId(letter === '热门' ? 'top-section' : `letter-${letter}`)
    Taro.vibrateShort({ type: 'light' })
  }

  if (!visible) return null

  return (
    <View className='city-picker-container'>
      <View className='header'>
        <Text className='close-btn' onClick={onClose}>✕</Text>
        <Text className='title'>选择城市</Text>
      </View>

      <ScrollView 
        scrollY 
        className='city-scroll-view'
        scrollIntoView={scrollIntoId}
        scrollWithAnimation
      >
        <View id='top-section'>
          <View className='section'>
            <Text className='section-title'>当前定位</Text>
            <View className='city-grid'>
              <View className='city-item current' onClick={handleGetLocation}>
                <Text className='icon-location'>📍</Text> {currentCity}
              </View>
            </View>
          </View>

          <View className='section'>
            <Text className='section-title'>热门城市</Text>
            <View className='city-grid'>
              {hotCities.map(city => (
                <View key={city} className='city-item' onClick={() => onSelect(city)}>
                  {city}
                </View>
              ))}
            </View>
          </View>
        </View>

        <View className='section'>
          <Text className='section-title'>所有城市</Text>
          {allCities.map(group => (
            <View key={group.letter} id={`letter-${group.letter}`} className='letter-group'>
              <View className='letter-title'>{group.letter}</View>
              <View className='letter-cities'>
                {group.cities.map(city => (
                  <View key={city} className='list-city-item' onClick={() => onSelect(city)}>
                    {city}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 侧边栏 */}
      <View className='alphabet-sidebar'>
        <View className='alphabet-item' onClick={() => handleLetterClick('热门')}>热</View>
        {allCities.map(group => (
          <View 
            key={group.letter} 
            className='alphabet-item'
            onClick={() => handleLetterClick(group.letter)}
          >
            {group.letter}
          </View>
        ))}
      </View>
    </View>
  )
}