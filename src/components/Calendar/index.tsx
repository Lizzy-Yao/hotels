import { View, Text, ScrollView } from '@tarojs/components'
import { useState, useEffect } from 'react'
import './index.scss'

interface CalendarProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (checkIn: string, checkOut: string) => void;
}

export default function Calendar({ visible, onClose, onSelect }: CalendarProps) {
  const [months, setMonths] = useState<any[]>([])
  const [checkIn, setCheckIn] = useState<Date | null>(new Date())
  const [checkOut, setCheckOut] = useState<Date | null>(new Date(new Date().setDate(new Date().getDate() + 1)))

  // 生成近 3 个月的日历数据
  useEffect(() => {
    const today = new Date()
    const tempMonths: any[] = []
    for (let i = 0; i < 3; i++) {
      const year = today.getFullYear()
      const month = today.getMonth() + i
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const daysInMonth = lastDay.getDate()
      const startingDay = firstDay.getDay() // 0-6 (Sun-Sat)
      
      const days: any[] = []
      // 填充空白
      for (let j = 0; j < startingDay; j++) {
        days.push(null)
      }
      // 填充日期
      for (let d = 1; d <= daysInMonth; d++) {
        days.push(new Date(firstDay.getFullYear(), firstDay.getMonth(), d))
      }
      tempMonths.push({ title: `${firstDay.getFullYear()}年${firstDay.getMonth() + 1}月`, days })
    }
    setMonths(tempMonths)
  }, [])

  const handleDayClick = (day: Date | null) => {
    if (!day) return
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (day.getTime() < today.getTime()) return // 过去的日期不可选

    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(day)
      setCheckOut(null)
    } else if (day.getTime() > checkIn.getTime()) {
      setCheckOut(day)
      // 自动关闭并回传数据
      setTimeout(() => {
        onSelect(
          `${checkIn.getFullYear()}-${String(checkIn.getMonth() + 1).padStart(2, '0')}-${String(checkIn.getDate()).padStart(2, '0')}`,
          `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
        )
      }, 300)
    } else {
      setCheckIn(day) // 如果选的离店日期比入住早，则重置入住日期
    }
  }

  const isSelected = (day: Date) => {
    if (!day || !checkIn) return false
    if (checkIn && !checkOut) return day.getTime() === checkIn.getTime()
    return day.getTime() === checkIn.getTime() || (checkOut && day.getTime() === checkOut.getTime())
  }

  const isBetween = (day: Date) => {
    if (!day || !checkIn || !checkOut) return false
    return day.getTime() > checkIn.getTime() && day.getTime() < checkOut.getTime()
  }

  if (!visible) return null

  return (
    <View className='calendar-mask'>
      <View className='calendar-mask-bg' onClick={onClose}></View>
      <View className='calendar-container'>
        <View className='calendar-header'>
          <Text className='title'>选择入住离店日期</Text>
          <Text className='close' onClick={onClose}>✕</Text>
        </View>
        <View className='week-days'>
          {['日', '一', '二', '三', '四', '五', '六'].map(w => <Text key={w} className='week-day'>{w}</Text>)}
        </View>
        <ScrollView scrollY className='calendar-body'>
          {months.map((month, mIndex) => (
            <View key={mIndex} className='month-section'>
              <View className='month-title'>{month.title}</View>
              <View className='days-grid'>
                {month.days.map((day, dIndex) => {
                  if (!day) return <View key={dIndex} className='day empty'></View>
                  const isPast = day.getTime() < new Date().setHours(0,0,0,0)
                  const selected = isSelected(day)
                  const between = isBetween(day)
                  const isCheckIn = checkIn && day.getTime() === checkIn.getTime()
                  const isCheckOut = checkOut && day.getTime() === checkOut.getTime()

                  return (
                    <View 
                      key={dIndex} 
                      className={`day ${isPast ? 'disabled' : ''} ${selected ? 'selected' : ''} ${between ? 'between' : ''}`}
                      onClick={() => handleDayClick(day)}
                    >
                      <Text className='day-num'>{day.getDate()}</Text>
                      {isCheckIn && <Text className='day-tag'>入住</Text>}
                      {isCheckOut && <Text className='day-tag'>离店</Text>}
                    </View>
                  )
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  )
}