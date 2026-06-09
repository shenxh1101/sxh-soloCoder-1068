import React, { useState, useMemo } from 'react';
import { View, Text, Button, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useTripStore } from '@/store/useTripStore';
import { mockAttractions } from '@/data/attractions';
import { formatPrice, formatDateCN } from '@/utils';
import styles from './index.module.scss';

const AttractionsPage: React.FC = () => {
  const { trip, favorites, addFavorite, removeFavorite, addTimeSlot, autoGenerateExpenses } = useTripStore();

  const scheduledIds = useMemo(() => {
    const ids = new Set<string>();
    trip.days.forEach((day) => {
      day.timeSlots.forEach((slot) => {
        ids.add(slot.attractionId);
      });
    });
    return ids;
  }, [trip.days]);

  const handleEditTrip = () => {
    console.log('[Attractions] 编辑行程信息');
    Taro.navigateTo({
      url: '/pages/trip-info-edit/index'
    });
  };

  const handleAddToCalendar = (attractionId: string, attractionName: string) => {
    console.log('[Attractions] 添加到行程:', attractionName);
    const dayOptions = trip.days.map((day, index) => `${day.dateStr}`);

    Taro.showActionSheet({
      itemList: dayOptions,
      success: (res) => {
        const selectedDay = trip.days[res.tapIndex];
        const periodOptions = ['上午 09:00-11:00', '上午 11:00-13:00', '下午 13:00-15:00', '下午 15:00-17:00', '晚上 17:00-19:00', '晚上 19:00-21:00'];

        Taro.showActionSheet({
          itemList: periodOptions,
          success: (res2) => {
            const periods: Array<'morning' | 'afternoon' | 'evening'> = ['morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening'];
            const times = [
              { start: '09:00', end: '11:00' },
              { start: '11:00', end: '13:00' },
              { start: '13:00', end: '15:00' },
              { start: '15:00', end: '17:00' },
              { start: '17:00', end: '19:00' },
              { start: '19:00', end: '21:00' }
            ];
            const period = periods[res2.tapIndex];
            const time = times[res2.tapIndex];

            addTimeSlot(selectedDay.date, {
              attractionId,
              attractionName,
              startTime: time.start,
              endTime: time.end,
              period,
              transport: '步行'
            });

            Taro.showToast({ title: '已添加到行程', icon: 'success' });
            console.log('[Attractions] 已添加景点到行程:', { day: selectedDay.date, attractionName, time });
          }
        });
      }
    });
  };

  const handleGenerateExpenses = () => {
    console.log('[Attractions] 自动生成费用');
    Taro.showModal({
      title: '生成费用',
      content: '将根据行程中的景点门票和住宿信息自动生成费用明细，是否继续？',
      success: (res) => {
        if (res.confirm) {
          autoGenerateExpenses();
          Taro.showToast({ title: '费用已生成', icon: 'success' });
          Taro.switchTab({ url: '/pages/expense/index' });
        }
      }
    });
  };

  const handleClearAll = () => {
    console.log('[Attractions] 清空收藏');
    Taro.showModal({
      title: '清空收藏',
      content: '确定要清空所有收藏的景点吗？',
      success: (res) => {
        if (res.confirm) {
          favorites.forEach((f) => removeFavorite(f.id));
          Taro.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  };

  const totalDays = trip.days.length;
  const totalSlots = trip.days.reduce((sum, day) => sum + day.timeSlots.length, 0);

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.tripInfo}>
          <Text className={styles.tripName}>{trip.name}</Text>
          <Text className={styles.tripDates}>
            📅 {formatDateCN(trip.startDate)} - {formatDateCN(trip.endDate)} · {totalDays}天
          </Text>
        </View>
        <Button className={styles.editBtn} onClick={handleEditTrip}>
          编辑
        </Button>
      </View>

      <View className={styles.stats}>
        <View className={styles.statCard}>
          <Text className={styles.statNumber}>{favorites.length}</Text>
          <Text className={styles.statLabel}>收藏景点</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={styles.statNumber}>{totalSlots}</Text>
          <Text className={styles.statLabel}>已安排</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={styles.statNumber}>{totalDays}</Text>
          <Text className={styles.statLabel}>行程天数</Text>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>❤️ 我的收藏</Text>
          <Text className={styles.sectionSub}>{favorites.length} 个景点</Text>
        </View>

        {favorites.length === 0 ? (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>🗺️</Text>
            <Text className={styles.emptyText}>还没有收藏景点</Text>
            <Button
              className={styles.actionBtn}
              onClick={() => Taro.switchTab({ url: '/pages/search/index' })}
            >
              去搜索景点
            </Button>
          </View>
        ) : (
          <View>
            {favorites.map((attraction) => (
              <View key={attraction.id} className={styles.attractionItem}>
                <View className={styles.attractionImage}>
                  <Image src={attraction.imageUrl} mode='aspectFill' />
                </View>
                <View className={styles.attractionContent}>
                  <View>
                    <Text className={styles.attractionName}>{attraction.name}</Text>
                    <View className={styles.attractionTags}>
                      {attraction.tags.slice(0, 2).map((tag, i) => (
                        <Text key={i} className={styles.tag}>{tag}</Text>
                      ))}
                    </View>
                  </View>
                  <View className={styles.attractionFooter}>
                    <Text className={styles.price}>{formatPrice(attraction.ticketPrice)}</Text>
                    {scheduledIds.has(attraction.id) ? (
                      <Button className={`${styles.addBtn} ${styles.scheduled}`} disabled>
                        已安排
                      </Button>
                    ) : (
                      <Button
                        className={styles.addBtn}
                        onClick={() => handleAddToCalendar(attraction.id, attraction.name)}
                      >
                        + 添加到行程
                      </Button>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>🌟 推荐景点</Text>
        </View>
        {mockAttractions
          .filter((a) => !favorites.some((f) => f.id === a.id))
          .slice(0, 5)
          .map((attraction) => (
            <View key={attraction.id} className={styles.attractionItem}>
              <View className={styles.attractionImage}>
                <Image src={attraction.imageUrl} mode='aspectFill' />
              </View>
              <View className={styles.attractionContent}>
                <View>
                  <Text className={styles.attractionName}>{attraction.name}</Text>
                  <View className={styles.attractionTags}>
                    {attraction.tags.slice(0, 2).map((tag, i) => (
                      <Text key={i} className={styles.tag}>{tag}</Text>
                    ))}
                  </View>
                </View>
                <View className={styles.attractionFooter}>
                  <Text className={styles.price}>{formatPrice(attraction.ticketPrice)}</Text>
                  <Button
                    className={styles.addBtn}
                    onClick={() => {
                      addFavorite(attraction);
                      Taro.showToast({ title: '已收藏', icon: 'success' });
                    }}
                  >
                    + 收藏
                  </Button>
                </View>
              </View>
            </View>
          ))}
      </View>

      <View className={styles.bottomBar}>
        <Button className={`${styles.bottomBtn} ${styles.secondary}`} onClick={handleClearAll}>
          清空收藏
        </Button>
        <Button className={`${styles.bottomBtn} ${styles.primary}`} onClick={handleGenerateExpenses}>
          生成费用
        </Button>
      </View>
    </View>
  );
};

export default AttractionsPage;
