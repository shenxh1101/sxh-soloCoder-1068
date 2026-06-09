import React, { useState, useMemo } from 'react';
import { View, Text, Image, Button, Input, Textarea } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { mockAttractions } from '@/data/attractions';
import { useTripStore } from '@/store/useTripStore';
import { formatPrice } from '@/utils';
import type { TimeSlot } from '@/types';
import styles from './index.module.scss';

const timeOptions = [
  { start: '09:00', end: '11:00', label: '09:00-11:00' },
  { start: '11:00', end: '13:00', label: '11:00-13:00' },
  { start: '13:00', end: '15:00', label: '13:00-15:00' },
  { start: '15:00', end: '17:00', label: '15:00-17:00' },
  { start: '17:00', end: '19:00', label: '17:00-19:00' },
  { start: '19:00', end: '21:00', label: '19:00-21:00' }
];

const transportOptions = ['步行', '地铁', '公交', '打车', '自驾', '骑行'];

const TripEditPage: React.FC = () => {
  const router = useRouter();
  const date = router.params.date as string;
  const slotId = router.params.slotId as string;

  const { trip, updateTimeSlot, removeTimeSlot, addExpense, favorites } = useTripStore();

  const dayPlan = useMemo(() => trip.days.find(d => d.date === date), [trip.days, date]);
  const slot = useMemo(() => dayPlan?.timeSlots.find(s => s.id === slotId) as TimeSlot, [dayPlan, slotId]);
  const attraction = useMemo(() => {
    return favorites.find(a => a.id === slot?.attractionId) ||
           mockAttractions.find(a => a.id === slot?.attractionId);
  }, [slot, favorites]);

  const [form, setForm] = useState({
    startTime: slot?.startTime || '09:00',
    endTime: slot?.endTime || '11:00',
    transport: slot?.transport || '步行',
    notes: slot?.notes || '',
    ticketPrice: attraction?.ticketPrice?.toString() || '0'
  });

  if (!slot || !attraction || !dayPlan) {
    return (
      <View className={styles.page}>
        <View className={styles.header}>
          <Text className={styles.headerTitle}>行程不存在</Text>
        </View>
      </View>
    );
  }

  const handleSave = () => {
    const period =
      form.startTime < '12:00' ? 'morning' :
      form.startTime < '17:00' ? 'afternoon' : 'evening';

    updateTimeSlot(date, slotId, {
      startTime: form.startTime,
      endTime: form.endTime,
      transport: form.transport,
      notes: form.notes,
      period: period as 'morning' | 'afternoon' | 'evening'
    });

    const newPrice = Number(form.ticketPrice) || 0;
    if (newPrice > 0) {
      addExpense({
        category: 'ticket',
        name: `${attraction.name} 门票`,
        amount: newPrice,
        date: date
      });
    }

    Taro.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => {
      Taro.navigateBack();
    }, 500);
  };

  const handleDelete = () => {
    Taro.showModal({
      title: '确认删除',
      content: `确定要从行程中删除「${slot.attractionName}」吗？`,
      confirmColor: '#dc2626',
      success: (res) => {
        if (res.confirm) {
          removeTimeSlot(date, slotId);
          Taro.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => {
            Taro.navigateBack();
          }, 500);
        }
      }
    });
  };

  const isTimeActive = (opt: { start: string; end: string }) =>
    form.startTime === opt.start && form.endTime === opt.endTime;

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>编辑行程</Text>
        <Text className={styles.headerSubtitle}>{dayPlan.dateStr}</Text>
      </View>

      <View className={styles.form}>
        <View className={styles.formCard}>
          <View className={styles.attractionInfo}>
            <Image src={attraction.imageUrl} className={styles.attractionImage} mode='aspectFill' />
            <View className={styles.attractionText}>
              <Text className={styles.attractionName}>{attraction.name}</Text>
              <Text className={styles.attractionMeta}>
                ⭐ {attraction.rating} · {attraction.duration}
              </Text>
            </View>
          </View>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>时间段</Text>
            <View className={styles.timePickerGrid}>
              {timeOptions.map((opt) => (
                <Button
                  key={opt.label}
                  className={`${styles.timeOption} ${isTimeActive(opt) ? styles.active : ''}`}
                  onClick={() => setForm({ ...form, startTime: opt.start, endTime: opt.end })}
                >
                  {opt.label}
                </Button>
              ))}
            </View>
          </View>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>交通方式</Text>
            <View className={styles.transportOptions}>
              {transportOptions.map((t) => (
                <Button
                  key={t}
                  className={`${styles.transportOption} ${form.transport === t ? styles.active : ''}`}
                  onClick={() => setForm({ ...form, transport: t })}
                >
                  {t}
                </Button>
              ))}
            </View>
          </View>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>备注</Text>
            <Textarea
              className={styles.formTextarea}
              placeholder='添加备注，如预约信息、集合地点等...'
              value={form.notes}
              onInput={(e) => setForm({ ...form, notes: e.detail.value })}
            />
          </View>
        </View>

        <View className={styles.ticketSection}>
          <Text className={styles.sectionTitle}>🎫 门票信息</Text>
          <View className={styles.ticketInfo}>
            <Text className={styles.ticketLabel}>建议门票价格</Text>
            <Text className={styles.ticketPrice}>{formatPrice(attraction.ticketPrice)}</Text>
          </View>
          <View className={styles.formItem} style={{ marginTop: 24 }}>
            <Text className={styles.formLabel}>实际购买价格</Text>
            <View className={styles.priceInput}>
              <Text className={styles.pricePrefix}>¥</Text>
              <Input
                className={styles.priceField}
                type='digit'
                placeholder='请输入实际价格'
                value={form.ticketPrice}
                onInput={(e) => setForm({ ...form, ticketPrice: e.detail.value })}
              />
            </View>
          </View>
        </View>
      </View>

      <View className={styles.bottomBar}>
        <Button className={`${styles.bottomBtn} ${styles.delete}`} onClick={handleDelete}>
          🗑️ 删除
        </Button>
        <Button className={`${styles.bottomBtn} ${styles.save}`} onClick={handleSave}>
          💾 保存
        </Button>
      </View>
    </View>
  );
};

export default TripEditPage;
