import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import useTripStore from '@/store/useTripStore';
import styles from './index.module.scss';
import { EXPENSE_CATEGORY_MAP, formatDateCN, expenseCategoryIcons } from '@/types';

export default function SharePreview() {
  const { trip, travelers, expenses, checklist, getAAData, getSettlementSuggestions, getBudgetProgress, getCategoryExpense } = useTripStore();
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const toggleDay = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

  const aaData = useMemo(() => getAAData(), [expenses, travelers]);
  const settlementSuggestions = useMemo(() => getSettlementSuggestions(), [expenses, travelers]);
  const budgetProgress = useMemo(() => getBudgetProgress(), [expenses, trip]);

  const getTravelerName = (id: string) => {
    const traveler = travelers.find(t => t.id === id);
    return traveler?.name || '未知';
  };

  const getDayExpense = (date: string) => {
    return expenses.filter(e => e.date === date).reduce((sum, e) => sum + e.amount, 0);
  };

  const getDayBudget = (date: string) => {
    const dayIndex = trip.days.findIndex(d => d.dateStr === date);
    if (dayIndex === -1) return 0;
    const dayBudget = trip.dailyBudget?.[dayIndex] || 0;
    return dayBudget;
  };

  const getDayTodos = (date: string) => {
    const dayIndex = trip.days.findIndex(d => d.dateStr === date);
    if (dayIndex === -1) return [];
    return checklist.filter(item => {
      const isDayTodo = item.tags?.includes?.(`day-${dayIndex}`);
      return isDayTodo || (dayIndex === 0 && !item.tags?.length);
    });
  };

  const getAssignedItemsForTraveler = (travelerId: string) => {
    const traveler = travelers.find(t => t.id === travelerId);
    if (!traveler?.assignedChecklistItems?.length) return [];
    return checklist.filter(item => traveler.assignedChecklistItems?.includes(item.id));
  };

  const generateShareText = () => {
    let content = `📒 【${trip.name}】\n\n`;
    content += `📍 目的地：${trip.destination}\n`;
    content += `📅 日期：${formatDateCN(trip.startDate)} - ${formatDateCN(trip.endDate)}\n`;
    content += `👥 同行人：${travelers.map(t => t.name).join('、')}\n\n`;

    content += `--- 💰 费用汇总 ---\n`;
    content += `总预算：¥${budgetProgress.totalBudget.toFixed(2)}\n`;
    content += `总支出：¥${budgetProgress.totalExpense.toFixed(2)}\n`;
    content += `剩余：¥${(budgetProgress.totalBudget - budgetProgress.totalExpense).toFixed(2)}\n\n`;

    content += `--- 📅 每日行程 ---\n\n`;

    trip.days.forEach((day, idx) => {
      content += `📆 第${idx + 1}天 ${day.dateStr}\n`;
      
      if (day.attractions.length > 0) {
        const attractions = day.attractions.map(a => a.name).join(' → ');
        content += `  🎯 景点：${attractions}\n`;
      }

      if (day.hotel?.name) {
        content += `  🏨 住宿：${day.hotel.name} (¥${day.hotel.price})\n`;
      }

      const dayExpense = getDayExpense(day.dateStr);
      if (dayExpense > 0) {
        content += `  💰 当日花费：¥${dayExpense.toFixed(2)}\n`;
      }

      const todos = getDayTodos(day.dateStr);
      const uncompletedTodos = todos.filter(t => !t.checked);
      if (uncompletedTodos.length > 0) {
        const todoNames = uncompletedTodos.map(t => {
          const assignee = travelers.find(tr => tr.assignedChecklistItems?.includes(t.id));
          return `${t.name}${assignee ? `(${assignee.name})` : ''}`;
        }).join('、');
        content += `  ⏰ 待办：${todoNames}\n`;
      }

      content += `\n`;
    });

    if (aaData.length > 0) {
      content += `--- 👥 AA 分摊 ---\n\n`;
      aaData.forEach(d => {
        content += `${getTravelerName(d.travelerId)}：垫付 ¥${d.paid.toFixed(2)}，应付 ¥${d.shouldPay.toFixed(2)}，${d.diff > 0 ? `应收 ¥${d.diff.toFixed(2)}` : `差额 ¥${Math.abs(d.diff).toFixed(2)}`}\n`;
      });
      content += `\n`;
    }

    const unsettled = settlementSuggestions.filter(s => !s.isSettled);
    if (unsettled.length > 0) {
      content += `--- 💳 待结算 ---\n\n`;
      unsettled.forEach(s => {
        content += `${getTravelerName(s.from)} → ${getTravelerName(s.to)}：¥${s.amount.toFixed(2)}\n`;
      });
      content += `\n`;
    }

    const hotels = trip.days.filter(d => d.hotel?.name);
    if (hotels.length > 0) {
      content += `--- 🏨 住宿明细 ---\n\n`;
      hotels.forEach(day => {
        content += `${day.dateStr}：${day.hotel!.name} - ¥${day.hotel!.price}/晚\n`;
      });
      content += `\n`;
    }

    content += `--- 🎒 分工摘要 ---\n\n`;
    travelers.forEach(traveler => {
      const assignedItems = getAssignedItemsForTraveler(traveler.id);
      const uncompleted = assignedItems.filter(i => !i.checked);
      content += `${traveler.name}：\n`;
      if (traveler.expenseRoles?.length) {
        content += `  💰 负责：${traveler.expenseRoles.map(r => EXPENSE_CATEGORY_MAP[r]?.label || r).join('、')}\n`;
      }
      if (assignedItems.length > 0) {
        content += `  🎒 物品：${assignedItems.map(i => `${i.name}${i.checked ? ' ✓' : ''}`).join('、')}\n`;
        content += `  📊 进度：${assignedItems.filter(i => i.checked).length}/${assignedItems.length}\n`;
      }
    });

    return content;
  };

  const handleCopyText = () => {
    const text = generateShareText();
    Taro.setClipboardData({
      data: text,
      success: () => {
        Taro.showToast({ title: '已复制', icon: 'success' });
      }
    });
  };

  const handleGenerateCard = () => {
    Taro.showToast({ title: '分享卡片生成中...', icon: 'loading' });
    setTimeout(() => {
      Taro.showToast({ title: '请截图保存', icon: 'success' });
    }, 500);
  };

  if (!trip.name) {
    return (
      <View className={styles.page}>
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>📝</Text>
          <Text className={styles.emptyText}>暂无行程数据</Text>
        </View>
      </View>
    );
  }

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.tripName}>{trip.name}</Text>
        <View className={styles.tripMeta}>
          <View className={styles.metaItem}>
            <Text>📍 {trip.destination}</Text>
          </View>
          <View className={styles.metaItem}>
            <Text>📅 {formatDateCN(trip.startDate)} - {formatDateCN(trip.endDate)}</Text>
          </View>
          <View className={styles.metaItem}>
            <Text>👥 {travelers.length}人</Text>
          </View>
        </View>
      </View>

      <View className={styles.summaryCard}>
        <View className={styles.summaryRow}>
          <Text className={styles.summaryLabel}>总预算</Text>
          <Text className={styles.summaryAmount}>¥{budgetProgress.totalBudget.toFixed(0)}</Text>
        </View>
        <View className={styles.summaryRow}>
          <Text className={styles.summaryLabel}>总支出</Text>
          <Text className={styles.summaryAmount} style={{ color: '#2563eb' }}>¥{budgetProgress.totalExpense.toFixed(0)}</Text>
        </View>
        <View className={styles.summaryRow}>
          <Text className={styles.summaryLabel}>剩余</Text>
          <Text className={styles.summaryAmount} style={{ color: budgetProgress.remaining >= 0 ? '#10b981' : '#ef4444' }}>
            ¥{budgetProgress.remaining.toFixed(0)}
          </Text>
        </View>
        <View className={styles.summaryRow}>
          <Text className={styles.summaryLabel}>人均</Text>
          <Text className={styles.summaryAmount} style={{ color: '#f59e0b' }}>
            ¥{(budgetProgress.totalExpense / Math.max(travelers.length, 1)).toFixed(0)}
          </Text>
        </View>
      </View>

      <ScrollView scrollY>
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>📅 每日行程</Text>
          </View>

          {trip.days.map((day, idx) => {
            const isExpanded = expandedDays.has(day.dateStr);
            const dayExpense = getDayExpense(day.dateStr);
            const dayBudget = getDayBudget(day.dateStr);
            const dayTodos = getDayTodos(day.dateStr);
            const uncompletedTodos = dayTodos.filter(t => !t.checked);

            return (
              <View key={day.dateStr} className={styles.dayCard}>
                <View className={styles.dayHeader} onClick={() => toggleDay(day.dateStr)}>
                  <View className={styles.dayInfo}>
                    <Text className={styles.dayTitle}>第{idx + 1}天 {day.dateStr}</Text>
                    <View className={styles.dayStats}>
                      <View className={styles.statItem}>
                        <Text>🎯 {day.attractions.length}个景点</Text>
                      </View>
                      <View className={styles.statItem}>
                        <Text>💰 ¥{dayExpense.toFixed(0)}</Text>
                      </View>
                      {uncompletedTodos.length > 0 && (
                        <View className={styles.statItem}>
                          <Text>⏰ {uncompletedTodos.length}待办</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}>▼</Text>
                </View>

                <View className={`${styles.dayContent} ${isExpanded ? styles.expanded : ''}`}>
                  <View className={styles.dayInner}>
                    {day.attractions.length > 0 && (
                      <View className={styles.contentSection}>
                        <Text className={styles.contentTitle}>🎯 景点路线</Text>
                        <View className={styles.attractionList}>
                          {day.attractions.map((attr, aIdx) => (
                            <View key={attr.id} className={styles.attractionItem}>
                              <Text className={styles.timeSlot}>{aIdx === 0 ? '上午' : aIdx === day.attractions.length - 1 ? '下午' : '中午'}</Text>
                              <Text className={styles.attractionName}>{attr.name}</Text>
                              {attr.ticketPrice > 0 && (
                                <Text style={{ fontSize: 20, color: '#f59e0b' }}>¥{attr.ticketPrice}</Text>
                              )}
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {day.hotel?.name && (
                      <View className={styles.contentSection}>
                        <Text className={styles.contentTitle}>🏨 住宿</Text>
                        <View className={styles.hotelInfo}>
                          <Text className={styles.hotelIcon}>🏨</Text>
                          <View className={styles.hotelDetail}>
                            <Text className={styles.hotelName}>{day.hotel.name}</Text>
                            <Text className={styles.hotelPrice}>¥{day.hotel.price}/晚</Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {(dayBudget > 0 || dayExpense > 0) && (
                      <View className={styles.contentSection}>
                        <Text className={styles.contentTitle}>💰 当日花费</Text>
                        <View className={styles.dayExpense}>
                          <View className={styles.expenseInfo}>
                            <Text className={styles.label}>预算</Text>
                            <Text className={styles.value}>¥{dayBudget.toFixed(0)}</Text>
                          </View>
                          <View className={styles.expenseInfo}>
                            <Text className={styles.label}>实际</Text>
                            <Text className={styles.value} style={{ color: dayExpense > dayBudget && dayBudget > 0 ? '#ef4444' : '#2563eb' }}>
                              ¥{dayExpense.toFixed(0)}
                            </Text>
                          </View>
                          <View className={styles.expenseInfo}>
                            <Text className={styles.label}>差异</Text>
                            <Text className={styles.value} style={{ color: dayBudget - dayExpense >= 0 ? '#10b981' : '#ef4444' }}>
                              ¥{(dayBudget - dayExpense).toFixed(0)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {dayTodos.length > 0 && (
                      <View className={styles.contentSection}>
                        <Text className={styles.contentTitle}>⏰ 待办事项</Text>
                        <View className={styles.todoList}>
                          {dayTodos.map(todo => {
                            const assignee = travelers.find(t => t.assignedChecklistItems?.includes(todo.id));
                            return (
                              <View key={todo.id} className={`${styles.todoItem} ${todo.checked ? styles.completed : ''}`}>
                                <View className={styles.todoCheckbox}>
                                  {todo.checked && <Text>✓</Text>}
                                </View>
                                <Text className={styles.todoName}>{todo.name}</Text>
                                {assignee && (
                                  <Text className={styles.todoAssignee}>👤 {assignee.name}</Text>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>👥 同行人分工</Text>
          </View>
          <View className={styles.travelerSection}>
            {travelers.map(traveler => {
              const assignedItems = getAssignedItemsForTraveler(traveler.id);
              const uncompleted = assignedItems.filter(i => !i.checked);
              const travelerAA = aaData.find(d => d.travelerId === traveler.id);

              return (
                <View key={traveler.id} className={styles.travelerCard}>
                  <View className={styles.travelerAvatar}>
                    <Text>{traveler.name.charAt(0)}</Text>
                  </View>
                  <View className={styles.travelerInfo}>
                    <Text className={styles.travelerName}>{traveler.name}</Text>
                    <Text className={styles.travelerRole}>{traveler.role}</Text>
                    {travelerAA && (
                      <View className={styles.travelerStats}>
                        <Text className={styles.statLabel}>垫付：</Text>
                        <Text className={styles.statValue}>¥{travelerAA.paid.toFixed(0)}</Text>
                        <Text className={styles.statLabel}>差额：</Text>
                        <Text className={styles.statValue} style={{ color: travelerAA.diff >= 0 ? '#10b981' : '#ef4444' }}>
                          {travelerAA.diff >= 0 ? '+' : ''}¥{travelerAA.diff.toFixed(0)}
                        </Text>
                      </View>
                    )}
                    {traveler.expenseRoles?.length > 0 && (
                      <View className={styles.expenseRoles}>
                        {traveler.expenseRoles.map(role => (
                          <Text key={role} className={styles.roleTag}>
                            {expenseCategoryIcons[role]} {EXPENSE_CATEGORY_MAP[role]?.label || role}
                          </Text>
                        ))}
                      </View>
                    )}
                    {assignedItems.length > 0 && (
                      <View style={{ marginTop: 8, fontSize: 22, color: '#64748b' }}>
                        <Text>🎒 负责物品：{assignedItems.filter(i => i.checked).length}/{assignedItems.length} 完成</Text>
                        {uncompleted.length > 0 && (
                          <Text style={{ color: '#f59e0b', marginLeft: 8 }}>，剩余 {uncompleted.length} 项</Text>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {settlementSuggestions.length > 0 && (
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>💳 费用结算</Text>
            </View>
            <View className={styles.settlementSection}>
              {settlementSuggestions.map(settlement => (
                <View key={settlement.id} className={`${styles.settlementItem} ${settlement.isSettled ? styles.settled : ''}`}>
                  <View className={styles.settlementFlow}>
                    <View className={styles.person}>
                      <View className={styles.personAvatar}>
                        <Text>{getTravelerName(settlement.from).charAt(0)}</Text>
                      </View>
                      <Text className={styles.personName}>{getTravelerName(settlement.from)}</Text>
                    </View>
                    <Text className={styles.arrow}>→</Text>
                    <View className={styles.person}>
                      <View className={styles.personAvatar}>
                        <Text>{getTravelerName(settlement.to).charAt(0)}</Text>
                      </View>
                      <Text className={styles.personName}>{getTravelerName(settlement.to)}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text className={styles.settlementAmount}>¥{settlement.amount.toFixed(2)}</Text>
                    <Text className={`${styles.statusBadge} ${settlement.isSettled ? styles.settled : styles.pending}`}>
                      {settlement.isSettled ? '已结清' : '待结算'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {trip.days.some(d => d.hotel?.name) && (
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>🏨 住宿明细</Text>
            </View>
            <View className={styles.hotelList}>
              {trip.days.filter(d => d.hotel?.name).map(day => (
                <View key={day.dateStr} className={styles.hotelListItem}>
                  <View className={styles.hotelListInfo}>
                    <Text className={styles.date}>{day.dateStr}</Text>
                    <Text className={styles.name}>{day.hotel!.name}</Text>
                  </View>
                  <Text className={styles.hotelListPrice}>¥{day.hotel!.price}/晚</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 160 }} />
      </ScrollView>

      <View className={styles.bottomBar}>
        <Button className={`${styles.bottomBtn} ${styles.secondary}`} onClick={handleCopyText}>
          📋 复制文字
        </Button>
        <Button className={`${styles.bottomBtn} ${styles.primary}`} onClick={handleGenerateCard}>
          🎴 生成卡片
        </Button>
      </View>
    </View>
  );
}
