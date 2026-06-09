import React, { useState, useMemo } from 'react';
import { View, Text, Button, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import ExpenseChart from '@/components/ExpenseChart';
import { useTripStore } from '@/store/useTripStore';
import { EXPENSE_CATEGORY_MAP, type ExpenseCategory } from '@/types';
import styles from './index.module.scss';

const categoryIcons: Record<ExpenseCategory, string> = {
  ticket: '🎫',
  transport: '🚗',
  hotel: '🏨',
  food: '🍜',
  shopping: '🛍️',
  other: '📦'
};

const ExpensePage: React.FC = () => {
  const { expenses, getTotalExpense, getExpenseByCategory, addExpense, removeExpense, autoGenerateExpenses } = useTripStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    category: 'ticket' as ExpenseCategory,
    name: '',
    amount: '',
    notes: ''
  });

  const total = getTotalExpense();
  const byCategory = getExpenseByCategory();

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      if (a.date && b.date) return b.date.localeCompare(a.date);
      return 0;
    });
  }, [expenses]);

  const handleGenerate = () => {
    console.log('[Expense] 自动生成费用');
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
    setForm({ category: 'ticket', name: '', amount: '', notes: '' });
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
      notes: form.notes
    });

    setShowAddModal(false);
    Taro.showToast({ title: '已添加', icon: 'success' });
    console.log('[Expense] 添加费用:', form);
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

  const handleExport = () => {
    console.log('[Expense] 导出报表');
    let content = `【费用报表】\n\n`;
    content += `总支出: ¥${total}\n\n`;
    Object.entries(byCategory).forEach(([key, value]) => {
      if (value > 0) {
        const config = EXPENSE_CATEGORY_MAP[key as ExpenseCategory];
        content += `${config.label}: ¥${value}\n`;
      }
    });
    content += `\n明细:\n`;
    expenses.forEach(e => {
      content += `- ${EXPENSE_CATEGORY_MAP[e.category].label} | ${e.name} | ¥${e.amount}\n`;
    });

    Taro.setClipboardData({
      data: content,
      success: () => {
        Taro.showToast({ title: '已复制到剪贴板', icon: 'success' });
      }
    });
  };

  const averagePerDay = total > 0 ? Math.round(total / 5) : 0;

  return (
    <View className={styles.page}>
      <View className={styles.summaryCard}>
        <Text className={styles.summaryLabel}>💰 总预算支出</Text>
        <Text className={styles.summaryAmount}>¥{total.toLocaleString()}</Text>
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
            <Text className={styles.statNum}>{Object.values(byCategory).filter(v => v > 0).length}</Text>
            <Text className={styles.statLabel}>类支出</Text>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <ExpenseChart data={byCategory as Record<ExpenseCategory, number>} title='费用分布' />
      </View>

      <View className={styles.section}>
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
