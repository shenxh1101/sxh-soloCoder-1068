import React, { useState, useMemo } from 'react';
import { View, Text, Button, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import ExpenseChart from '@/components/ExpenseChart';
import { useTripStore } from '@/store/useTripStore';
import { EXPENSE_CATEGORY_MAP, type ExpenseCategory } from '@/types';
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
  { key: 'detail', label: '明细' }
];

const ExpensePage: React.FC = () => {
  const {
    trip,
    expenses,
    getTotalExpense,
    getExpenseByCategory,
    getBudgetByCategory,
    getTotalBudget,
    setBudget,
    addExpense,
    updateExpense,
    removeExpense,
    autoGenerateExpenses,
    getAAData
  } = useTripStore();

  const [activeTab, setActiveTab] = useState('detail');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [form, setForm] = useState({
    category: 'ticket' as ExpenseCategory,
    name: '',
    amount: '',
    notes: '',
    paidBy: ''
  });

  const total = getTotalExpense();
  const byCategory = getExpenseByCategory();
  const budget = getBudgetByCategory();
  const totalBudget = getTotalBudget();
  const totalDays = trip.days.length;
  const aaData = getAAData();

  const averagePerDay = total > 0 ? Math.round(total / Math.max(totalDays, 1)) : 0;
  const budgetAvgPerDay = totalBudget > 0 ? Math.round(totalBudget / Math.max(totalDays, 1)) : 0;

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      if (a.date && b.date) return b.date.localeCompare(a.date);
      return 0;
    });
  }, [expenses]);

  const getTravelerName = (id?: string) => {
    if (!id) return '';
    const traveler = trip.travelers.find(t => t.id === id);
    return traveler?.name || '';
  };

  const handleGenerate = () => {
    Taro.showModal({
      title: '生成费用',
      content: '将根据行程中的景点门票和住宿信息自动生成费用明细，是否继续？',
      success: (res) => {
        if (res.confirm) {
          autoGenerateExpenses();
          Taro.showToast({ title: '费用已生成', icon: 'success' });
        }
      }
    });
  };

  const handleAdd = () => {
    setForm({ category: 'ticket', name: '', amount: '', notes: '', paidBy: '' });
    setShowAddModal(true);
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

    addExpense({
      category: form.category,
      name: form.name,
      amount: Number(form.amount),
      notes: form.notes,
      paidBy: form.paidBy || undefined,
      isAA: true
    });

    setShowAddModal(false);
    Taro.showToast({ title: '已添加', icon: 'success' });
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

    content += `\n--- 费用明细 ---\n`;
    sortedExpenses.forEach(e => {
      content += `- ${EXPENSE_CATEGORY_MAP[e.category].label} | ${e.name} | ¥${e.amount}`;
      if (e.paidBy) {
        const name = getTravelerName(e.paidBy);
        content += ` | ${name}垫付`;
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
                {aaData.map(item => (
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
                ))}
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
                      </Text>
                    </View>
                    <Text className={styles.expenseAmount}>¥{expense.amount}</Text>
                    <Button
                      className={styles.deleteBtn}
                      onClick={(e) => handleDelete(expense.id, expense.name, e)}
                    >
                      ✕
                    </Button>
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

      {showAddModal && (
        <View className={styles.modal} onClick={() => setShowAddModal(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>添加费用</Text>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>类别</Text>
              <View className={styles.categoryGrid}>
                {(Object.entries(EXPENSE_CATEGORY_MAP) as [ExpenseCategory, { label: string; color: string }][]).map(([key, config]) => (
                  <Button
                    key={key}
                    className={classnames(styles.categoryOption, form.category === key && styles.active)}
                    onClick={() => setForm({ ...form, category: key })}
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
                {trip.travelers.map(traveler => (
                  <Button
                    key={traveler.id}
                    className={classnames(styles.travelerOption, form.paidBy === traveler.id && styles.active)}
                    onClick={() => setForm({ ...form, paidBy: traveler.id })}
                  >
                    <View className={styles.avatar}>{traveler.name.charAt(0)}</View>
                    <Text className={styles.name}>{traveler.name}</Text>
                  </Button>
                ))}
              </View>
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
              <Button className={`${styles.modalBtn} ${styles.cancel}`} onClick={() => setShowAddModal(false)}>
                取消
              </Button>
              <Button className={`${styles.modalBtn} ${styles.confirm}`} onClick={handleSave}>
                保存
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default ExpensePage;
