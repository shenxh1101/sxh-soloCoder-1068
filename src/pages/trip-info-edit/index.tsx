import React, { useState, useMemo } from 'react';
import { View, Text, Button, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import { useTripStore } from '@/store/useTripStore';
import { formatDateCN } from '@/utils';
import styles from './index.module.scss';

const TripInfoEditPage: React.FC = () => {
  const { trip, setTripName, setTripDates, setTripDestination } = useTripStore();

  const [form, setForm] = useState({
    name: trip.name,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate
  });

  const totalDays = useMemo(() => {
    const start = dayjs(form.startDate);
    const end = dayjs(form.endDate);
    return end.diff(start, 'day') + 1;
  }, [form.startDate, form.endDate]);

  const handleStartDateClick = () => {
    Taro.showActionSheet({
      itemList: ['选择日期'],
      success: () => {
        const defaultDate = form.startDate;
        Taro.showModal({
          title: '出发日期',
          content: `请输入出发日期 (YYYY-MM-DD)，当前：${form.startDate}`,
          editable: true,
          placeholderText: defaultDate,
          success: (res) => {
            if (res.confirm && res.content) {
              const newDate = dayjs(res.content);
              if (newDate.isValid()) {
                const formatted = newDate.format('YYYY-MM-DD');
                if (dayjs(formatted).isAfter(form.endDate)) {
                  Taro.showToast({ title: '出发日期不能晚于返程日期', icon: 'none' });
                  return;
                }
                setForm({ ...form, startDate: formatted });
              } else {
                Taro.showToast({ title: '日期格式不正确', icon: 'none' });
              }
            }
          }
        });
      }
    });
  };

  const handleEndDateClick = () => {
    Taro.showActionSheet({
      itemList: ['选择日期'],
      success: () => {
        const defaultDate = form.endDate;
        Taro.showModal({
          title: '返程日期',
          content: `请输入返程日期 (YYYY-MM-DD)，当前：${form.endDate}`,
          editable: true,
          placeholderText: defaultDate,
          success: (res) => {
            if (res.confirm && res.content) {
              const newDate = dayjs(res.content);
              if (newDate.isValid()) {
                const formatted = newDate.format('YYYY-MM-DD');
                if (dayjs(formatted).isBefore(form.startDate)) {
                  Taro.showToast({ title: '返程日期不能早于出发日期', icon: 'none' });
                  return;
                }
                setForm({ ...form, endDate: formatted });
              } else {
                Taro.showToast({ title: '日期格式不正确', icon: 'none' });
              }
            }
          }
        });
      }
    });
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      Taro.showToast({ title: '请填写行程名称', icon: 'none' });
      return;
    }
    if (!form.destination.trim()) {
      Taro.showToast({ title: '请填写目的地', icon: 'none' });
      return;
    }

    Taro.showModal({
      title: '保存修改',
      content: '修改行程日期会重新生成每日安排，已添加的景点安排会保留在对应日期吗？如果日期范围缩小，超出范围的安排将被移除。是否继续？',
      success: (res) => {
        if (res.confirm) {
          setTripName(form.name.trim());
          setTripDestination(form.destination.trim());
          setTripDates(form.startDate, form.endDate);

          Taro.showToast({ title: '已保存', icon: 'success' });
          setTimeout(() => {
            Taro.navigateBack();
          }, 500);
        }
      }
    });
  };

  const handleCancel = () => {
    Taro.navigateBack();
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>编辑行程信息</Text>
        <Text className={styles.headerSubtitle}>修改行程基本信息和日期</Text>
      </View>

      <View className={styles.form}>
        <View className={styles.warningBox}>
          <Text className={styles.warningText}>
            <Text className={styles.warningIcon}>⚠️</Text>
            修改日期后，系统会重新生成每日行程。已添加的景点安排会尽量保留，超出新日期范围的安排将被移除。
          </Text>
        </View>

        <View className={styles.formCard}>
          <View className={styles.formItem}>
            <Text className={styles.formLabel}>行程名称</Text>
            <Input
              className={styles.formInput}
              placeholder='例如：东京五日游'
              value={form.name}
              onInput={(e) => setForm({ ...form, name: e.detail.value })}
            />
          </View>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>目的地</Text>
            <Input
              className={styles.formInput}
              placeholder='例如：东京, 日本'
              value={form.destination}
              onInput={(e) => setForm({ ...form, destination: e.detail.value })}
            />
          </View>
        </View>

        <View className={styles.dateSection}>
          <Text className={styles.sectionTitle}>📅 行程日期</Text>
          <View className={styles.dateRow}>
            <View className={styles.dateItem}>
              <Text className={styles.formLabel}>出发日期</Text>
              <View className={styles.datePicker} onClick={handleStartDateClick}>
                <Text className={styles.dateValue}>{formatDateCN(form.startDate)}</Text>
                <Text className={styles.dateIcon}>📅</Text>
              </View>
            </View>
            <View className={styles.dateItem}>
              <Text className={styles.formLabel}>返程日期</Text>
              <View className={styles.datePicker} onClick={handleEndDateClick}>
                <Text className={styles.dateValue}>{formatDateCN(form.endDate)}</Text>
                <Text className={styles.dateIcon}>📅</Text>
              </View>
            </View>
          </View>
          <View className={styles.daysInfo}>
            <Text className={styles.daysLabel}>行程总天数</Text>
            <Text className={styles.daysValue}>{totalDays} 天</Text>
          </View>
        </View>
      </View>

      <View className={styles.bottomBar}>
        <Button className={`${styles.bottomBtn} ${styles.cancel}`} onClick={handleCancel}>
          取消
        </Button>
        <Button className={`${styles.bottomBtn} ${styles.save}`} onClick={handleSave}>
          💾 保存
        </Button>
      </View>
    </View>
  );
};

export default TripInfoEditPage;
