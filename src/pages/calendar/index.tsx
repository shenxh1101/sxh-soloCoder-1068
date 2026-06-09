import React, { useState } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import DayTimeline from '@/components/DayTimeline';
import { useTripStore } from '@/store/useTripStore';
import { getDayOfWeek, formatDateCN, generateShareContent, copyToClipboard } from '@/utils';
import styles from './index.module.scss';

const CalendarPage: React.FC = () => {
  const { trip, favorites } = useTripStore();
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [isOffline, setIsOffline] = useState(false);

  const currentDay = trip.days[activeDayIndex];
  const totalSlots = trip.days.reduce((sum, day) => sum + day.timeSlots.length, 0);

  const handleEditSlot = (slotId: string) => {
    Taro.navigateTo({
      url: `/pages/trip-edit/index?date=${currentDay.date}&slotId=${slotId}`
    });
  };

  const handleAddHotel = () => {
    Taro.navigateTo({
      url: `/pages/hotel-edit/index?date=${currentDay.date}`
    });
  };

  const handleShare = async () => {
    console.log('[Calendar] 分享行程');
    const content = generateShareContent(trip.name, trip.days);

    Taro.showActionSheet({
      itemList: ['复制行程文本', '生成图片分享', '发送给好友'],
      success: async (res) => {
        if (res.tapIndex === 0) {
          const success = await copyToClipboard(content);
          if (success) {
            Taro.showToast({ title: '已复制到剪贴板', icon: 'success' });
          } else {
            Taro.showToast({ title: '复制失败，请手动复制', icon: 'none' });
          }
        } else {
          Taro.showToast({ title: '功能开发中...', icon: 'none' });
        }
      }
    });
  };

  const handleOffline = () => {
    console.log('[Calendar] 离线查看');
    setIsOffline(true);
    Taro.showToast({ title: '已缓存行程，支持离线查看', icon: 'success' });
  };

  const handleQuickAdd = () => {
    const unfavorited = favorites.filter(f =>
      !currentDay.timeSlots.some(s => s.attractionId === f.id)
    );

    if (unfavorited.length === 0) {
      Taro.showToast({ title: '该天已安排所有收藏景点', icon: 'none' });
      return;
    }

    const options = unfavorited.map(f => f.name);
    Taro.showActionSheet({
      itemList: options,
      success: (res) => {
        const attraction = unfavorited[res.tapIndex];
        Taro.navigateTo({
          url: `/pages/attraction-detail/index?id=${attraction.id}`
        });
      }
    });
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.tripName}>
          {trip.name}
          {isOffline && <Text className={styles.offlineBadge}>📶 已离线</Text>}
        </Text>
        <View className={styles.tripMeta}>
          <Text>📅 {formatDateCN(trip.startDate)} - {formatDateCN(trip.endDate)}</Text>
          <Text>📍 {trip.destination}</Text>
          <Text>🎯 {totalSlots} 个安排</Text>
        </View>
      </View>

      <ScrollView className={styles.dayTabs} scrollX enableFlex>
        {trip.days.map((day, index) => (
          <View
            key={day.date}
            className={`${styles.dayTab} ${index === activeDayIndex ? styles.active : ''}`}
            onClick={() => setActiveDayIndex(index)}
          >
            <Text className={styles.dayNum}>{index + 1}</Text>
            <Text className={styles.dayText}>{getDayOfWeek(day.date)}</Text>
            {day.weather && (
              <>
                <Text className={styles.weatherIcon}>{day.weather.icon}</Text>
                <Text className={styles.weatherText}>{day.weather.temp}</Text>
              </>
            )}
          </View>
        ))}
      </ScrollView>

      {currentDay && (
        <View className={styles.dayContent}>
          <View className={styles.dayHeader}>
            <Text className={styles.dayTitle}>{currentDay.dateStr}</Text>
            {currentDay.weather && (
              <View className={styles.dayWeather}>
                <Text>{currentDay.weather.icon}</Text>
                <Text>{currentDay.weather.condition}</Text>
                <Text>{currentDay.weather.temp}</Text>
              </View>
            )}
          </View>

          <DayTimeline dayPlan={currentDay} onEditSlot={handleEditSlot} />

          <View className={styles.actions}>
            <Button className={`${styles.actionBtn} ${styles.secondary}`} onClick={handleAddHotel}>
              {currentDay.hotel ? '🏨 编辑住宿' : '🏨 添加住宿'}
            </Button>
            <Button className={`${styles.actionBtn} ${styles.primary}`} onClick={handleQuickAdd}>
              ➕ 添加景点
            </Button>
          </View>
        </View>
      )}

      <View className={styles.bottomBar}>
        <Button className={`${styles.bottomBtn} ${styles.secondary}`} onClick={handleOffline}>
          📶 离线缓存
        </Button>
        <Button className={`${styles.bottomBtn} ${styles.primary}`} onClick={handleShare}>
          📤 分享行程
        </Button>
      </View>
    </View>
  );
};

export default CalendarPage;
