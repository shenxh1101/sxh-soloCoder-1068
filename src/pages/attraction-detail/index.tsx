import React, { useState, useMemo } from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { mockAttractions } from '@/data/attractions';
import { useTripStore } from '@/store/useTripStore';
import { formatPrice } from '@/utils';
import styles from './index.module.scss';

const AttractionDetailPage: React.FC = () => {
  const router = useRouter();
  const attractionId = router.params.id as string;
  const { addFavorite, removeFavorite, isFavorite, addTimeSlot, trip } = useTripStore();

  const attraction = useMemo(() => {
    return mockAttractions.find(a => a.id === attractionId) || mockAttractions[0];
  }, [attractionId]);

  const favorited = isFavorite(attraction.id);

  const handleFavorite = () => {
    if (favorited) {
      removeFavorite(attraction.id);
      Taro.showToast({ title: '已取消收藏', icon: 'none' });
    } else {
      addFavorite(attraction);
      Taro.showToast({ title: '已收藏', icon: 'success' });
    }
  };

  const handleAddToTrip = () => {
    if (!favorited) {
      addFavorite(attraction);
    }

    const dayOptions = trip.days.map(day => day.dateStr);
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
              attractionId: attraction.id,
              attractionName: attraction.name,
              startTime: time.start,
              endTime: time.end,
              period,
              transport: '步行'
            });

            Taro.showToast({ title: '已添加到行程', icon: 'success' });
            console.log('[Detail] 添加到行程:', attraction.name, selectedDay.date);
          }
        });
      }
    });
  };

  return (
    <View className={styles.page}>
      <View className={styles.banner}>
        <Image src={attraction.imageUrl} mode='aspectFill' />
        <Button className={styles.favoriteBtn} onClick={handleFavorite}>
          {favorited ? '❤️' : '🤍'}
        </Button>
      </View>

      <View className={styles.content}>
        <View className={styles.infoCard}>
          <View className={styles.header}>
            <Text className={styles.name}>{attraction.name}</Text>
            <View className={styles.meta}>
              <View className={styles.rating}>
                <Text>⭐</Text>
                <Text>{attraction.rating}</Text>
              </View>
              <Text className={styles.location}>📍 {attraction.city}, {attraction.country}</Text>
            </View>
            <View className={styles.tags}>
              {attraction.tags.map((tag, index) => (
                <Text key={index} className={styles.tag}>{tag}</Text>
              ))}
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>📝 景点介绍</Text>
          <Text className={styles.description}>{attraction.description}</Text>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>ℹ️ 实用信息</Text>
          <View className={styles.infoGrid}>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>门票价格</Text>
              <Text className={`${styles.infoValue} ${styles.price} ${attraction.ticketPrice === 0 && styles.free}`}>
                {formatPrice(attraction.ticketPrice)}
              </Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>建议游玩</Text>
              <Text className={styles.infoValue}>{attraction.duration}</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>开放时间</Text>
              <Text className={styles.infoValue}>{attraction.openTime}</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>评分</Text>
              <Text className={styles.infoValue}>⭐ {attraction.rating}/5.0</Text>
            </View>
          </View>

          <View className={styles.tip}>
            <Text className={styles.tipIcon}>💡</Text>
            <Text className={styles.tipText}>
              建议提前查看景点的最新开放时间和门票预约信息，节假日可能需要提前预订。
            </Text>
          </View>
        </View>
      </View>

      <View className={styles.bottomBar}>
        <Button
          className={`${styles.btn} ${styles.secondary}`}
          onClick={handleFavorite}
        >
          {favorited ? '❤️ 已收藏' : '🤍 收藏'}
        </Button>
        <Button
          className={`${styles.btn} ${styles.primary}`}
          onClick={handleAddToTrip}
        >
          ➕ 添加到行程
        </Button>
      </View>
    </View>
  );
};

export default AttractionDetailPage;
