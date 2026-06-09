import React, { useState, useMemo } from 'react';
import { View, Text, Button, Input, Switch, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import ExpenseChart from '@/components/ExpenseChart';
import { useTripStore } from '@/store/useTripStore';
import { EXPENSE_CATEGORY_MAP, type ExpenseCategory, type ExpenseItem, type SettlementFilter, type Settlement } from '@/types';
import { formatDateCN } from '@/utils';
import styles from './index.module.scss';

const categoryIcons: Record<ExpenseCategory, string> = {
  ticket: '🎫',
  transport: '🚗',
  hotel: '🏨',
  food: '🍜',
  shopping: '🛍️',
  other: '📦'
};

const tabs = [
  { key: 'budget', label: '预算' },
  { key: 'aa', label: 'AA分摊' },
  { key: 'settlement', label: '结算' },
  { key: 'detail', label: '明细' }
];

const ExpensePage: React.FC = () => {
  const {
    trip,
    expenses,
    checklist,
    getTotalExpense,
    getExpenseByCategory,
    getBudgetByCategory,
    getTotalBudget,
    setBudget,
    addExpense,
    updateExpense,
    removeExpense,
    autoGenerateExpenses,
    getAAData,
    getSettlementSuggestions,
    markSettlement,
    clearAllSettlements,
    recalculateSettlements
  } = useTripStore();

  const [activeTab, setActiveTab] = useState('detail');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showExpenseBreakdown, setShowExpenseBreakdown] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [settlementFilter, setSettlementFilter] = useState<SettlementFilter>({});
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    category: 'ticket' as ExpenseCategory,
    name: '',
    amount: '',
    notes: '',
    paidBy: '',
    isAA: true
  });

  const total = getTotalExpense();
  const byCategory = getExpenseByCategory();
  const budget = getBudgetByCategory();
  const totalBudget = getTotalBudget();
  const totalDays = trip.days.length;
  const aaData = getAAData(settlementFilter);
  const settlements = getSettlementSuggestions(settlementFilter);

  const averagePerDay = total > 0 ? Math.round(total / Math.max(totalDays, 1)) : 0;
  const budgetAvgPerDay = totalBudget > 0 ? Math.round(totalBudget / Math.max(totalDays, 1)) : 0;

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      if (a.date && b.date) return b.date.localeCompare(a.date);
      return 0;
    });
  }, [expenses]);

  const unsettledCount = settlements.filter(s => !s.isSettled).length;
  const totalSettledAmount = settlements.filter(s => s.isSettled).reduce((sum, s) => sum + s.amount, 0);
  const totalUnsettledAmount = settlements.filter(s => !s.isSettled).reduce((sum, s) => sum + s.amount, 0);

  const getTravelerName = (id?: string) => {
    if (!id) return '';
    const traveler = trip.travelers.find(t => t.id === id);
    return traveler?.name || '';
  };

  const getTravelerExpenseRoles = (travelerId: string) => {
    const traveler = trip.travelers.find(t => t.id === travelerId);
    return traveler?.expenseRoles || [];
  };

  const handleGenerate = () => {
    Taro.showModal({
      title: '生成费用',
      content: '将根据行程中的景点门票和住宿信息自动生成费用明细，是否继续？非住宿类的已有费用会保留。',
      success: (res) => {
        if (res.confirm) {
          autoGenerateExpenses();
          Taro.showToast({ title: '费用已生成', icon: 'success' });
        }
      }
    });
  };

  const handleAdd = () => {
    setForm({ category: 'ticket', name: '', amount: '', notes: '', paidBy: '', isAA: true });
    setShowAddModal(true);
  };

  const handleEdit = (expense: ExpenseItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingExpense(expense);
    setForm({
      category: expense.category,
      name: expense.name,
      amount: expense.amount.toString(),
      notes: expense.notes || '',
      paidBy: expense.paidBy || '',
      isAA: expense.isAA !== false
    });
    setShowEditModal(true);
  };

  const handleSave = () => {
    if (!form.name) {
      Taro.showToast({ title: '请填写名称', icon: 'none' });
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      Taro.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }

    if (showEditModal && editingExpense) {
      updateExpense(editingExpense.id, {
        category: form.category,
        name: form.name,
        amount: Number(form.amount),
        notes: form.notes,
        paidBy: form.paidBy || undefined,
        isAA: form.isAA
      });
      Taro.showToast({ title: '已更新', icon: 'success' });
    } else {
      addExpense({
        category: form.category,
        name: form.name,
        amount: Number(form.amount),
        notes: form.notes,
        paidBy: form.paidBy || undefined,
        isAA: form.isAA
      });
      Taro.showToast({ title: '已添加', icon: 'success' });
    }

    setShowAddModal(false);
    setShowEditModal(false);
    setEditingExpense(null);
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    Taro.showModal({
      title: '删除费用',
      content: `确定要删除「${name}」吗？`,
      success: (res) => {
        if (res.confirm) {
          removeExpense(id);
          Taro.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  };

  const handleEditBudget = (category: string) => {
    setEditingBudget(category);
    setBudgetInput(budget[category as ExpenseCategory].toString());
  };

  const handleSaveBudget = () => {
    if (!editingBudget) return;
    const amount = Number(budgetInput) || 0;
    setBudget(editingBudget as ExpenseCategory, amount);
    setEditingBudget(null);
    Taro.showToast({ title: '预算已更新', icon: 'success' });
  };

  const handleMarkSettlement = (settlementId: string, isSettled: boolean) => {
    markSettlement(settlementId, isSettled);
    Taro.showToast({
      title: isSettled ? '已标记结清' : '已取消标记',
      icon: 'success'
    });
  };

  const handleClearSettlements = () => {
    Taro.showModal({
      title: '重置结算记录',
      content: '确定要清空所有结算记录吗？',
      success: (res) => {
        if (res.confirm) {
          clearAllSettlements();
          Taro.showToast({ title: '已重置', icon: 'success' });
        }
      }
    });
  };

  const handleClearFilter = () => {
    setSettlementFilter({});
    setSelectedCategories([]);
    setSelectedExpenseIds([]);
  };

  const handleApplyFilter = () => {
    const filter: SettlementFilter = {};
    if (selectedCategories.length > 0) {
      filter.categories = selectedCategories;
    }
    if (selectedExpenseIds.length > 0) {
      filter.expenseIds = selectedExpenseIds;
    }
    setSettlementFilter(filter);
    setShowFilterModal(false);
    Taro.showToast({ title: '已应用筛选', icon: 'success' });
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleExpense = (expenseId: string) => {
    setSelectedExpenseIds(prev => 
      prev.includes(expenseId) 
        ? prev.filter(id => id !== expenseId)
        : [...prev, expenseId]
    );
  };

  const handleExport = () => {
    let content = `【${trip.name}】费用报表\n\n`;
    content += `📌 目的地：${trip.destination}\n`;
    content += `📅 日期：${formatDateCN(trip.startDate)} - ${formatDateCN(trip.endDate)} (${totalDays}天)\n\n`;
    content += `💰 总预算: ¥${totalBudget.toLocaleString()}\n`;
    content += `💸 总支出: ¥${total.toLocaleString()}\n`;
    content += `📊 剩余预算: ¥${(totalBudget - total).toLocaleString()}\n\n`;
    content += `📈 每日预算: ¥${budgetAvgPerDay.toLocaleString()}\n`;
    content += `📉 日均花费: ¥${averagePerDay.toLocaleString()}\n\n`;

    content += `--- 各类别明细 ---\n`;
    Object.entries(EXPENSE_CATEGORY_MAP).forEach(([key, config]) => {
      const spent = byCategory[key] || 0;
      const catBudget = budget[key as ExpenseCategory];
      content += `${config.label}: 预算¥${catBudget} / 已花¥${spent} / 剩余¥${catBudget - spent}\n`;
    });

    content += `\n--- 住宿明细 ---\n`;
    const hasHotel = trip.days.some(d => d.hotel?.name);
    if (!hasHotel) {
      content += `暂无住宿安排\n`;
    } else {
      trip.days.forEach(day => {
        if (day.hotel?.name) {
          content += `${day.dateStr}: ${day.hotel.name} - ¥${day.hotel.price}/晚`;
          const hotelExpense = expenses.find(e => e.category === 'hotel' && e.date === day.date);
          if (hotelExpense?.paidBy) {
            content += ` (${getTravelerName(hotelExpense.paidBy)}垫付)`;
          }
          content += `\n`;
        }
      });
    }

    content += `\n--- 费用明细 ---\n`;
    sortedExpenses.forEach(e => {
      content += `- ${EXPENSE_CATEGORY_MAP[e.category].label} | ${e.name} | ¥${e.amount}`;
      if (e.paidBy) {
        const name = getTravelerName(e.paidBy);
        content += ` | ${name}垫付`;
      }
      if (e.isAA === false) {
        content += ` | 不参与AA`;
      }
      if (e.date) {
        content += ` | ${e.date}`;
      }
      content += `\n`;
    });

    if (trip.travelers.length > 1) {
      content += `\n--- AA分摊 ---\n`;
      const perPerson = aaData[0]?.shouldPay || 0;
      content += `人均应付: ¥${perPerson.toFixed(2)}\n`;
      aaData.forEach(d => {
        if (d.diff > 0) {
          content += `${d.name}: 已付¥${d.paid.toFixed(2)}，应收¥${d.diff.toFixed(2)}\n`;
        } else if (d.diff < 0) {
          content += `${d.name}: 已付¥${d.paid.toFixed(2)}，应付¥${Math.abs(d.diff).toFixed(2)}\n`;
        } else {
          content += `${d.name}: 已结清\n`;
        }
      });

      content += `\n--- 待结算摘要 ---\n`;
      if (settlements.length === 0) {
        content += `🎉 所有费用已结清！\n`;
      } else {
        const unsettled = settlements.filter(s => !s.isSettled);
        const settled = settlements.filter(s => s.isSettled);
        content += `待结算 ${unsettled.length} 笔，合计 ¥${totalUnsettledAmount.toFixed(2)}\n`;
        content += `已结算 ${settled.length} 笔，合计 ¥${totalSettledAmount.toFixed(2)}\n\n`;
        unsettled.forEach(s => {
          const fromName = getTravelerName(s.from);
          const toName = getTravelerName(s.to);
          content += `  ${fromName} → ${toName}: ¥${s.amount.toFixed(2)}\n`;
        });
      }
    }

    content += `\n--- 分工摘要 ---\n`;
    const hasRoles = trip.travelers.some(t => t.expenseRoles?.length || t.assignedChecklistItems?.length);
    if (!hasRoles) {
      content += `暂无分工安排\n`;
    } else {
      trip.travelers.forEach(traveler => {
        content += `\n👤 ${traveler.name} (${traveler.role}):\n`;
        if (traveler.expenseRoles?.length) {
          const roleNames = traveler.expenseRoles.map(r => EXPENSE_CATEGORY_MAP[r]?.label || r).join('、');
          content += `  💰 费用负责: ${roleNames}\n`;
        }
        if (traveler.assignedChecklistItems?.length) {
          const assignedItems = traveler.assignedChecklistItems.map(id => {
            const item = checklist.find(c => c.id === id);
            return item ? `${item.name}${item.checked ? ' ✓' : ''}` : '';
          }).filter(Boolean);
          const completed = assignedItems.filter(i => i.includes('✓')).length;
          content += `  🎒 负责物品: ${assignedItems.join('、')}\n`;
          content += `  📊 完成进度: ${completed}/${traveler.assignedChecklistItems.length}\n`;
        }
      });
    }

    Taro.setClipboardData({
      data: content,
      success: () => {
        Taro.showToast({ title: '已复制到剪贴板', icon: 'success' });
      }
    });
  };

  const getProgressState = (spent: number, totalBudget: number) => {
    const percent = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;
    if (percent >= 100) return 'over';
    if (percent >= 80) return 'warning';
    return 'normal';
  };

  return (
    <View className={styles.page}>
      <View className={styles.tripInfo}>
        <Text className={styles.tripName}>{trip.name}</Text>
        <View className={styles.tripMeta}>
          <View className={styles.metaItem}>
            <Text>📍</Text>
            <Text>{trip.destination}</Text>
          </View>
          <View className={styles.metaItem}>
            <Text>📅</Text>
            <Text>{formatDateCN(trip.startDate)} - {formatDateCN(trip.endDate)}</Text>
          </View>
          <View className={styles.metaItem}>
            <Text>⏱️</Text>
            <Text>{totalDays}天</Text>
          </View>
        </View>
      </View>

      <View className={styles.summaryCard}>
        <View className={styles.summaryRow}>
          <Text className={styles.summaryLabel}>总预算</Text>
          <Text className={styles.summaryAmount}>¥{totalBudget.toLocaleString()}</Text>
        </View>
        <View className={styles.summaryRow}>
          <Text className={styles.summaryLabel}>已支出</Text>
          <Text className={styles.summaryAmount} style={{ color: total > totalBudget ? '#ef4444' : '#1e293b' }}>
            ¥{total.toLocaleString()}
          </Text>
        </View>
        <View className={styles.summaryRow}>
          <Text className={styles.summaryLabel}>剩余预算</Text>
          <Text
            className={styles.summaryAmount}
            style={{ color: totalBudget - total >= 0 ? '#10b981' : '#ef4444', fontSize: 36 }}
          >
            ¥{(totalBudget - total).toLocaleString()}
          </Text>
        </View>
        <View className={styles.summaryStats}>
          <View className={styles.statItem}>
            <Text className={styles.statNum}>{expenses.length}</Text>
            <Text className={styles.statLabel}>笔支出</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statNum}>¥{averagePerDay}</Text>
            <Text className={styles.statLabel}>日均花费</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statNum}>¥{budgetAvgPerDay}</Text>
            <Text className={styles.statLabel}>日均预算</Text>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <ExpenseChart data={byCategory as Record<ExpenseCategory, number>} title='费用分布' />
      </View>

      <View className={styles.section}>
        <View className={styles.toggleTabs}>
          {tabs.map(tab => (
            <Button
              key={tab.key}
              className={classnames(styles.tabBtn, activeTab === tab.key && styles.active)}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </View>

        {activeTab === 'budget' && (
          <View className={styles.budgetList}>
            {(Object.entries(EXPENSE_CATEGORY_MAP) as [ExpenseCategory, { label: string; color: string }][]).map(([key, config]) => {
              const spent = byCategory[key] || 0;
              const catBudget = budget[key];
              const remaining = catBudget - spent;
              const percent = catBudget > 0 ? Math.min((spent / catBudget) * 100, 100) : 0;
              const state = getProgressState(spent, catBudget);

              return (
                <View key={key} className={styles.budgetItem}>
                  <View className={styles.budgetHeader}>
                    <View className={styles.budgetLeft}>
                      <View
                        className={styles.categoryIcon}
                        style={{ background: `${config.color}20` }}
                      >
                        {categoryIcons[key]}
                      </View>
                      <View className={styles.categoryInfo}>
                        <Text className={styles.name}>{config.label}</Text>
                        <Text className={styles.spent}>已花 ¥{spent}</Text>
                      </View>
                    </View>
                    <View className={styles.budgetRight}>
                      <Text className={styles.budget}>预算 ¥{catBudget}</Text>
                      <Text className={classnames(styles.remaining, remaining < 0 && styles.over)}>
                        {remaining >= 0 ? '剩余' : '超支'} ¥{Math.abs(remaining)}
                      </Text>
                    </View>
                    <Button
                      className={styles.editBtn}
                      onClick={() => handleEditBudget(key)}
                    >
                      编辑
                    </Button>
                  </View>
                  <View className={styles.progressBar}>
                    <View
                      className={classnames(styles.progressFill, styles[state])}
                      style={{ width: `${percent}%` }}
                    />
                  </View>
                  {editingBudget === key && (
                    <View className={styles.budgetInput}>
                      <Text className={styles.prefix}>¥</Text>
                      <Input
                        type='digit'
                        placeholder='输入预算金额'
                        value={budgetInput}
                        onInput={(e) => setBudgetInput(e.detail.value)}
                      />
                      <Button className={styles.editBtn} onClick={handleSaveBudget}>
                        确定
                      </Button>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {activeTab === 'aa' && (
          <View>
            {trip.travelers.length < 2 ? (
              <View className={styles.emptyState}>
                <Text className={styles.emptyIcon}>👥</Text>
                <Text className={styles.emptyText}>请先添加同行人使用AA分摊功能</Text>
                <Button
                  className={styles.emptyBtn}
                  onClick={() => Taro.switchTab({ url: '/pages/memo/index' })}
                >
                  去添加同行人
                </Button>
              </View>
            ) : (
              <View className={styles.aaList}>
                {aaData.map(item => {
                  const roles = getTravelerExpenseRoles(item.travelerId);
                  return (
                    <View key={item.travelerId} className={styles.aaItem}>
                      <View className={styles.aaHeader}>
                        <View className={styles.travelerInfo}>
                          <View className={styles.avatar}>
                            {item.name.charAt(0)}
                          </View>
                          <View>
                            <Text className={styles.name}>{item.name}</Text>
                            <Text className={styles.role}>
                              {trip.travelers.find(t => t.id === item.travelerId)?.role}
                            </Text>
                            {roles.length > 0 && (
                              <View className={styles.roleTags}>
                                {roles.map(role => (
                                  <Text key={role} className={styles.roleTag}>
                                    {EXPENSE_CATEGORY_MAP[role].label}
                                  </Text>
                                ))}
                              </View>
                            )}
                          </View>
                        </View>
                        <View className={styles.aaDiff}>
                          <Text
                            className={classnames(
                              styles.diffValue,
                              item.diff > 0 ? styles.positive : item.diff < 0 ? styles.negative : styles.zero
                            )}
                          >
                            {item.diff > 0 ? `+¥${item.diff.toFixed(2)}` :
                             item.diff < 0 ? `-¥${Math.abs(item.diff).toFixed(2)}` : '¥0'}
                          </Text>
                          <Text className={styles.diffLabel}>
                            {item.diff > 0 ? '应收' : item.diff < 0 ? '应付' : '已结清'}
                          </Text>
                        </View>
                      </View>
                      <View className={styles.aaDetails}>
                        <Text className={styles.paid}>已垫付: <span>¥{item.paid.toFixed(2)}</span></Text>
                        <Text className={styles.shouldPay}>应付: <span>¥{item.shouldPay.toFixed(2)}</span></Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {activeTab === 'settlement' && (
          <View>
            {trip.travelers.length < 2 ? (
              <View className={styles.emptyState}>
                <Text className={styles.emptyIcon}>💰</Text>
                <Text className={styles.emptyText}>请先添加同行人使用结算功能</Text>
                <Button
                  className={styles.emptyBtn}
                  onClick={() => Taro.switchTab({ url: '/pages/memo/index' })}
                >
                  去添加同行人
                </Button>
              </View>
            ) : (
              <View>
                <View className={styles.filterBar}>
                  <Button className={styles.filterBtn} onClick={() => setShowFilterModal(true)}>
                    🔍 筛选
                    {(selectedCategories.length > 0 || selectedExpenseIds.length > 0) && (
                      <Text className={styles.filterBadge}>
                        {selectedCategories.length + selectedExpenseIds.length}
                      </Text>
                    )}
                  </Button>
                  {(selectedCategories.length > 0 || selectedExpenseIds.length > 0) && (
                    <Button className={styles.clearFilterBtn} onClick={handleClearFilter}>
                      清除筛选
                    </Button>
                  )}
                  <Button className={styles.recalcBtn} onClick={recalculateSettlements}>
                    🔄 重新计算
                  </Button>
                </View>

                <View className={styles.settlementSummary}>
                  <View className={styles.summaryItem}>
                    <Text className={styles.summaryNum}>{settlements.length}</Text>
                    <Text className={styles.summaryLabel}>笔转账</Text>
                  </View>
                  <View className={styles.summaryItem}>
                    <Text className={styles.summaryNum} style={{ color: '#10b981' }}>¥{totalSettledAmount.toFixed(0)}</Text>
                    <Text className={styles.summaryLabel}>已结清</Text>
                  </View>
                  <View className={styles.summaryItem}>
                    <Text className={styles.summaryNum} style={{ color: '#f59e0b' }}>¥{totalUnsettledAmount.toFixed(0)}</Text>
                    <Text className={styles.summaryLabel}>待结算</Text>
                  </View>
                </View>

                {unsettledCount > 0 && (
                  <View className={styles.settleHint}>
                    <Text className={styles.hintIcon}>💡</Text>
                    <Text className={styles.hintText}>还有 {unsettledCount} 笔待结算，转账完成后记得标记已结清哦~</Text>
                  </View>
                )}

                {settlements.length === 0 ? (
                  <View className={styles.emptyState}>
                    <Text className={styles.emptyIcon}>🎉</Text>
                    <Text className={styles.emptyText}>太棒了！所有费用已结清</Text>
                  </View>
                ) : (
                  <View className={styles.settlementList}>
                    {settlements.map((settlement) => (
                      <View
                        key={settlement.id}
                        className={classnames(styles.settlementItem, settlement.isSettled && styles.settled)}
                      >
                        <View className={styles.settlementContent}>
                          <View className={styles.settlementFlow}>
                            <View className={styles.person}>
                              <View className={styles.avatarSm}>
                                {getTravelerName(settlement.from).charAt(0)}
                              </View>
                              <Text className={styles.personName}>{getTravelerName(settlement.from)}</Text>
                            </View>
                            <View className={styles.arrow}>→</View>
                            <View className={styles.person}>
                              <View className={styles.avatarSm}>
                                {getTravelerName(settlement.to).charAt(0)}
                              </View>
                              <Text className={styles.personName}>{getTravelerName(settlement.to)}</Text>
                            </View>
                          </View>
                          <View className={styles.settlementRight}>
                            <Text className={styles.settleAmount}>¥{settlement.amount.toFixed(2)}</Text>
                            {settlement.expenseBreakdown && settlement.expenseBreakdown.length > 0 && (
                              <Button 
                                className={styles.breakdownBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowExpenseBreakdown(showExpenseBreakdown === settlement.id ? null : settlement.id);
                                }}
                              >
                                {showExpenseBreakdown === settlement.id ? '收起明细' : '查看明细'}
                              </Button>
                            )}
                          </View>
                        </View>
                        
                        {showExpenseBreakdown === settlement.id && settlement.expenseBreakdown && (
                          <View className={styles.breakdownList}>
                            {settlement.expenseBreakdown.map((item, idx) => (
                              <View key={idx} className={styles.breakdownItem}>
                                <View className={styles.breakdownLeft}>
                                  <Text className={styles.breakdownIcon}>
                                    {categoryIcons[item.category as ExpenseCategory]}
                                  </Text>
                                  <View className={styles.breakdownInfo}>
                                    <Text className={styles.breakdownName}>{item.expenseName}</Text>
                                    <Text className={styles.breakdownTotal}>总金额 ¥{item.amount.toFixed(2)}</Text>
                                  </View>
                                </View>
                                <Text className={styles.breakdownShare}>分摊 ¥{item.share.toFixed(2)}</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        <View className={styles.settlementActions}>
                          <Switch
                            checked={settlement.isSettled}
                            onChange={(e) => handleMarkSettlement(settlement.id, e.detail.value)}
                            color='#10b981'
                          />
                          <Text className={styles.settleStatus}>
                            {settlement.isSettled ? '已结清' : '待结算'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {trip.settlements.length > 0 && (
                  <Button className={styles.clearBtn} onClick={handleClearSettlements}>
                    🔄 重置结算记录
                  </Button>
                )}
              </View>
            )}
          </View>
        )}

        {activeTab === 'detail' && (
          <View>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>📝 费用明细</Text>
              <Button className={styles.addBtn} onClick={handleAdd}>
                + 添加
              </Button>
            </View>

            {expenses.length === 0 ? (
              <View className={styles.emptyState}>
                <Text className={styles.emptyIcon}>💸</Text>
                <Text className={styles.emptyText}>还没有费用记录</Text>
                <Button className={styles.emptyBtn} onClick={handleGenerate}>
                  自动生成费用
                </Button>
              </View>
            ) : (
              <View className={styles.expenseList}>
                {sortedExpenses.map((expense) => (
                  <View key={expense.id} className={styles.expenseItem}>
                    <View
                      className={styles.categoryIcon}
                      style={{ background: `${EXPENSE_CATEGORY_MAP[expense.category].color}20` }}
                    >
                      {categoryIcons[expense.category]}
                    </View>
                    <View className={styles.expenseContent}>
                      <Text className={styles.expenseName}>{expense.name}</Text>
                      <Text className={styles.expenseDate}>
                        {EXPENSE_CATEGORY_MAP[expense.category].label}
                        {expense.date && ` · ${expense.date}`}
                        {expense.paidBy && (
                          <Text className={styles.paidBy}> · {getTravelerName(expense.paidBy)}垫付</Text>
                        )}
                        {expense.isAA === false && (
                          <Text className={styles.noAA}> · 不参与AA</Text>
                        )}
                      </Text>
                    </View>
                    <Text className={styles.expenseAmount}>¥{expense.amount}</Text>
                    <View className={styles.expenseActions}>
                      <Button
                        className={styles.editItemBtn}
                        onClick={(e) => handleEdit(expense, e)}
                      >
                        ✏️
                      </Button>
                      <Button
                        className={styles.deleteBtn}
                        onClick={(e) => handleDelete(expense.id, expense.name, e)}
                      >
                        ✕
                      </Button>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      <View className={styles.bottomBar}>
        <Button className={`${styles.bottomBtn} ${styles.secondary}`} onClick={handleGenerate}>
          🔄 自动生成
        </Button>
        <Button className={`${styles.bottomBtn} ${styles.primary}`} onClick={handleExport}>
          📊 导出报表
        </Button>
      </View>

      {(showAddModal || showEditModal) && (
        <View className={styles.modal} onClick={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setEditingExpense(null);
        }}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>{showEditModal ? '编辑费用' : '添加费用'}</Text>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>类别</Text>
              <View className={styles.categoryGrid}>
                {(Object.entries(EXPENSE_CATEGORY_MAP) as [ExpenseCategory, { label: string; color: string }][]).map(([key, config]) => (
                  <Button
                    key={key}
                    className={classnames(styles.categoryOption, form.category === key && styles.active)}
                    onClick={() => {
                      const responsibleTraveler = trip.travelers.find(t => 
                        t.expenseRoles?.includes(key)
                      );
                      setForm({ 
                        ...form, 
                        category: key,
                        paidBy: responsibleTraveler?.id || form.paidBy
                      });
                    }}
                  >
                    <Text className={styles.icon}>{categoryIcons[key]}</Text>
                    <Text className={styles.label}>{config.label}</Text>
                  </Button>
                ))}
              </View>
            </View>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>名称</Text>
              <Input
                className={styles.formInput}
                placeholder='例如：迪士尼门票'
                value={form.name}
                onInput={(e) => setForm({ ...form, name: e.detail.value })}
              />
            </View>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>金额 (元)</Text>
              <Input
                className={styles.formInput}
                type='digit'
                placeholder='请输入金额'
                value={form.amount}
                onInput={(e) => setForm({ ...form, amount: e.detail.value })}
              />
            </View>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>垫付人（可选）</Text>
              <View className={styles.travelerGrid}>
                <Button
                  className={classnames(styles.travelerOption, form.paidBy === '' && styles.active)}
                  onClick={() => setForm({ ...form, paidBy: '' })}
                >
                  <View className={styles.avatar}>无</View>
                  <Text className={styles.name}>无需标记</Text>
                </Button>
                {trip.travelers.map(traveler => {
                  const isRecommended = traveler.expenseRoles?.includes(form.category);
                  return (
                    <Button
                      key={traveler.id}
                      className={classnames(
                        styles.travelerOption, 
                        form.paidBy === traveler.id && styles.active,
                        isRecommended && styles.recommended
                      )}
                      onClick={() => setForm({ ...form, paidBy: traveler.id })}
                    >
                      <View className={styles.avatar}>{traveler.name.charAt(0)}</View>
                      <Text className={styles.name}>
                        {traveler.name}
                        {isRecommended && <Text className={styles.recommendTag}> 推荐</Text>}
                      </Text>
                    </Button>
                  );
                })}
              </View>
            </View>

            <View className={styles.formItem}>
              <View className={styles.switchRow}>
                <Text className={styles.formLabel}>参与AA分摊</Text>
                <Switch
                  checked={form.isAA}
                  onChange={(e) => setForm({ ...form, isAA: e.detail.value })}
                  color='#2563eb'
                />
              </View>
              <Text className={styles.hintText}>
                {form.isAA ? '该费用将计入AA分摊总额' : '该费用不计入AA分摊，由垫付人自行承担'}
              </Text>
            </View>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>备注</Text>
              <Input
                className={styles.formInput}
                placeholder='可选'
                value={form.notes}
                onInput={(e) => setForm({ ...form, notes: e.detail.value })}
              />
            </View>

            <View className={styles.modalActions}>
              <Button
                className={`${styles.modalBtn} ${styles.cancel}`}
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingExpense(null);
                }}
              >
                取消
              </Button>
              <Button className={`${styles.modalBtn} ${styles.confirm}`} onClick={handleSave}>
                {showEditModal ? '更新' : '保存'}
              </Button>
            </View>
          </View>
        </View>
      )}

      {showFilterModal && (
        <View className={styles.modal} onClick={() => setShowFilterModal(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>筛选结算费用</Text>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>按类别筛选</Text>
              <View className={styles.categoryGrid}>
                {(Object.entries(EXPENSE_CATEGORY_MAP) as [ExpenseCategory, { label: string; color: string }][]).map(([key, config]) => (
                  <Button
                    key={key}
                    className={classnames(
                      styles.categoryOption,
                      selectedCategories.includes(key) && styles.active
                    )}
                    onClick={() => toggleCategory(key)}
                  >
                    <Text className={styles.icon}>{categoryIcons[key]}</Text>
                    <Text className={styles.label}>{config.label}</Text>
                  </Button>
                ))}
              </View>
            </View>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>按费用选择</Text>
              <ScrollView scrollY className={styles.expenseSelectList}>
                {expenses.filter(e => e.isAA !== false).map(expense => (
                  <Button
                    key={expense.id}
                    className={classnames(
                      styles.expenseSelectItem,
                      selectedExpenseIds.includes(expense.id) && styles.active
                    )}
                    onClick={() => toggleExpense(expense.id)}
                  >
                    <View className={styles.expenseSelectLeft}>
                      <Text className={styles.breakdownIcon}>
                        {categoryIcons[expense.category]}
                      </Text>
                      <View className={styles.expenseSelectInfo}>
                        <Text className={styles.expenseSelectName}>{expense.name}</Text>
                        <Text className={styles.expenseSelectMeta}>
                          {EXPENSE_CATEGORY_MAP[expense.category].label}
                          {expense.paidBy && ` · ${getTravelerName(expense.paidBy)}垫付`}
                        </Text>
                      </View>
                    </View>
                    <Text className={styles.expenseSelectAmount}>¥{expense.amount}</Text>
                  </Button>
                ))}
              </ScrollView>
            </View>

            <View className={styles.modalActions}>
              <Button
                className={`${styles.modalBtn} ${styles.cancel}`}
                onClick={() => setShowFilterModal(false)}
              >
                取消
              </Button>
              <Button className={`${styles.modalBtn} ${styles.confirm}`} onClick={handleApplyFilter}>
                应用筛选
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default ExpensePage;
