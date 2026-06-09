import React, { useState } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import DayTimeline from '@/components/DayTimeline';
import { useTripStore } from '@/store/useTripStore';
import { getDayOfWeek, formatDateCN, copyToClipboard } from '@/utils';
import { EXPENSE_CATEGORY_MAP } from '@/types';
import styles from './index.module.scss';

const CalendarPage: React.FC = () => {
  const {
    trip,
    favorites,
    expenses,
    checklist,
    getTotalExpense,
    getExpenseByCategory,
    getBudgetByCategory,
    getTotalBudget,
    getAAData,
    getSettlementSuggestions
  } = useTripStore();
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

  const generateFullShareContent = () => {
    const total = getTotalExpense();
    const byCategory = getExpenseByCategory();
    const budget = getBudgetByCategory();
    const totalBudget = getTotalBudget();
    const aaData = getAAData();
    const settlements = getSettlementSuggestions();
    const checklistProgress = checklist.length > 0
      ? Math.round((checklist.filter(i => i.checked).length / checklist.length) * 100)
      : 0;

    let content = `📒 【${trip.name}】\n\n`;
    content += `📍 目的地：${trip.destination}\n`;
    content += `📅 日期：${formatDateCN(trip.startDate)} - ${formatDateCN(trip.endDate)} (${trip.days.length}天)\n`;
    content += `👥 同行人：${trip.travelers.length}人 (${trip.travelers.map(t => t.name).join('、')})\n\n`;

    content += `--- 📅 每日行程 ---\n\n`;
    trip.days.forEach((day, index) => {
      const attractions = day.timeSlots.map(s => s.attractionName);
      const hotel = day.hotel;
      const dayExpenses = expenses.filter(e => e.date === day.date);
      const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

      content += `📆 ${day.dateStr}\n`;

      if (attractions.length > 0) {
        content += `  🎯 景点：${attractions.join(' → ')}\n`;
      }

      if (hotel) {
        content += `  🏨 住宿：${hotel.name}`;
        if (hotel.price > 0) {
          content += ` (¥${hotel.price})`;
        }
        content += `\n`;
      }

      if (dayTotal > 0) {
        content += `  💰 当日花费：¥${dayTotal}\n`;
      }

      const dayUnchecked = checklist.filter(item => {
        const assignedTo = trip.travelers.find(t =>
          (t.assignedChecklistItems || []).includes(item.id)
        );
        return !item.checked && assignedTo !== undefined;
      });
      if (dayUnchecked.length > 0 && index === trip.days.length - 1) {
        content += `  📋 待办：还有 ${dayUnchecked.length} 项准备工作\n`;
      }

      content += `\n`;
    });

    content += `--- 💰 费用汇总 ---\n\n`;
    content += `📊 总预算：¥${totalBudget.toLocaleString()}\n`;
    content += `💸 总支出：¥${total.toLocaleString()}\n`;
    content += `📈 剩余预算：¥${(totalBudget - total).toLocaleString()} (${totalBudget > 0 ? Math.round(((totalBudget - total) / totalBudget) * 100) : 0}%)\n\n`;

    content += `📂 分类明细：\n`;
    Object.entries(EXPENSE_CATEGORY_MAP).forEach(([key, config]) => {
      const spent = byCategory[key] || 0;
      const catBudget = budget[key as keyof typeof budget];
      if (spent > 0 || catBudget > 0) {
        content += `  ${config.label}：预算¥${catBudget} / 已花¥${spent} / 剩余¥${catBudget - spent}\n`;
      }
    });

    if (trip.travelers.length > 1) {
      content += `\n--- 👥 AA 分摊 ---\n\n`;
      const perPerson = aaData[0]?.shouldPay || 0;
      content += `💵 人均应付：¥${perPerson.toFixed(2)}\n\n`;

      aaData.forEach(d => {
        content += `${d.name}：`;
        content += `已付¥${d.paid.toFixed(2)}，`;
        if (d.diff > 0) {
          content += `应收¥${d.diff.toFixed(2)}\n`;
        } else if (d.diff < 0) {
          content += `应付¥${Math.abs(d.diff).toFixed(2)}\n`;
        } else {
          content += `已结清 ✅\n`;
        }
      });

      const unsettled = settlements.filter(s => !s.isSettled);
      if (unsettled.length > 0) {
        content += `\n💳 待结算转账：\n`;
        unsettled.forEach(s => {
          const fromName = trip.travelers.find(t => t.id === s.from)?.name;
          const toName = trip.travelers.find(t => t.id === s.to)?.name;
          content += `  ${fromName} → ${toName}：¥${s.amount.toFixed(2)}\n`;
        });
      } else if (settlements.length > 0) {
        content += `\n🎉 所有费用已结清！\n`;
      }
    }

    content += `\n--- 📋 准备进度 ---\n\n`;
    content += `✅ 完成度：${checklistProgress}% (${checklist.filter(i => i.checked).length}/${checklist.length})\n\n`;

    trip.travelers.forEach(traveler => {
      const assigned = traveler.assignedChecklistItems || [];
      if (assigned.length > 0) {
        const items = checklist.filter(i => assigned.includes(i.id));
        const done = items.filter(i => i.checked).length;
        content += `${traveler.name}：${done}/${items.length} 项已完成\n`;
      }
    });

    content += `\n---\n`;
    content += `分享自「旅行规划」App，祝旅途愉快！✈️`;

    return content;
  };

  const handleShare = async () => {
    console.log('[Calendar] 分享行程');
    const content = generateFullShareContent();

    Taro.showActionSheet({
      itemList: ['打开分享预览页', '复制完整行程', '仅复制每日安排', '生成图片分享'],
      success: async (res) => {
        if (res.tapIndex === 0) {
          Taro.navigateTo({
            url: '/pages/share-preview/index'
          });
        } else if (res.tapIndex === 1) {
          const success = await copyToClipboard(content);
          if (success) {
            Taro.showToast({ title: '已复制到剪贴板', icon: 'success' });
          } else {
            Taro.showToast({ title: '复制失败，请手动复制', icon: 'none' });
          }
        } else if (res.tapIndex === 2) {
          const simpleContent = `【${trip.name}】\n\n` + trip.days.map(day => {
            let line = `${day.dateStr}\n`;
            if (day.timeSlots.length > 0) {
              line += '  ' + day.timeSlots.map(s => `${s.startTime} ${s.attractionName}`).join('\n  ') + '\n';
            }
            if (day.hotel) {
              line += `  🏨 ${day.hotel.name}\n`;
            }
            return line;
          }).join('\n');
          const success = await copyToClipboard(simpleContent);
          if (success) {
            Taro.showToast({ title: '已复制到剪贴板', icon: 'success' });
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
