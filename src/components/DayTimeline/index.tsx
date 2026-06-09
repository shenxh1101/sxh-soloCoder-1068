import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import type { DayPlan } from '@/types';
import { useTripStore } from '@/store/useTripStore';
import styles from './index.module.scss';

interface DayTimelineProps {
  dayPlan: DayPlan;
  onEditSlot?: (slotId: string) => void;
}

const DayTimeline: React.FC<DayTimelineProps> = ({ dayPlan, onEditSlot }) => {
  const { removeTimeSlot, removeHotel } = useTripStore();

  const handleRemoveSlot = (slotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    Taro.showModal({
      title: '确认删除',
      content: '确定要从行程中移除这个景点吗？',
      success: (res) => {
        if (res.confirm) {
          removeTimeSlot(dayPlan.date, slotId);
          Taro.showToast({ title: '已移除', icon: 'success' });
        }
      }
    });
  };

  const handleRemoveHotel = (e: React.MouseEvent) => {
    e.stopPropagation();
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除该住宿信息吗？',
      success: (res) => {
        if (res.confirm) {
          removeHotel(dayPlan.date);
          Taro.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  };

  const handleEditHotel = () => {
    Taro.navigateTo({
      url: `/pages/hotel-edit/index?date=${dayPlan.date}`
    });
  };

  return (
    <View>
      {dayPlan.hotel && (
        <View className={styles.hotelCard} onClick={handleEditHotel}>
          <Text className={styles.hotelLabel}>🏨 今晚住宿</Text>
          <Text className={styles.hotelName}>{dayPlan.hotel.name}</Text>
          <View className={styles.hotelInfo}>
            <Text>📍 {dayPlan.hotel.address}</Text>
            <Text>¥{dayPlan.hotel.price}/晚</Text>
          </View>
          <Button
            className={classnames(styles.actionBtn, styles.danger)}
            style={{ marginTop: '16rpx', height: '48rpx' }}
            onClick={handleRemoveHotel}
          >
            删除住宿
          </Button>
        </View>
      )}

      {dayPlan.timeSlots.length === 0 ? (
        <View className={styles.emptyState}>
          <Text className={styles.emptyText}>暂无安排，去景点清单添加吧~</Text>
        </View>
      ) : (
        <View className={styles.timeline}>
          <View className={styles.timelineLine} />
          {dayPlan.timeSlots.map((slot) => (
            <View key={slot.id} className={styles.slot}>
              <View className={classnames(styles.slotDot, styles[slot.period])} />
              <View className={styles.slotCard}>
                <View className={styles.slotHeader}>
                  <Text className={styles.time}>{slot.startTime} - {slot.endTime}</Text>
                  <View className={classnames(styles.periodTag, styles[slot.period])}>
                    {slot.period === 'morning' ? '上午' : slot.period === 'afternoon' ? '下午' : '晚上'}
                  </View>
                </View>
                <Text className={styles.attractionName}>{slot.attractionName}</Text>
                <View className={styles.slotMeta}>
                  {slot.transport && (
                    <View className={styles.metaItem}>
                      <Text>🚗 {slot.transport}</Text>
                    </View>
                  )}
                  {slot.notes && (
                    <View className={styles.metaItem}>
                      <Text>📝 {slot.notes}</Text>
                    </View>
                  )}
                </View>
                <View className={styles.slotActions}>
                  <Button
                    className={styles.actionBtn}
                    onClick={() => onEditSlot?.(slot.id)}
                  >
                    编辑
                  </Button>
                  <Button
                    className={classnames(styles.actionBtn, styles.danger)}
                    onClick={(e) => handleRemoveSlot(slot.id, e)}
                  >
                    移除
                  </Button>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default DayTimeline;
