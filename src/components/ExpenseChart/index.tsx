import React from 'react';
import { View, Text } from '@tarojs/components';
import type { ExpenseCategory } from '@/types';
import { EXPENSE_CATEGORY_MAP } from '@/types';
import styles from './index.module.scss';

interface ExpenseChartProps {
  data: Record<ExpenseCategory, number>;
  title?: string;
}

const ExpenseChart: React.FC<ExpenseChartProps> = ({ data, title = '费用分布' }) => {
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);

  const categories = Object.entries(EXPENSE_CATEGORY_MAP) as [ExpenseCategory, { label: string; color: string }][];

  if (total === 0) {
    return (
      <View className={styles.chartContainer}>
        <Text className={styles.title}>{title}</Text>
        <View className={styles.emptyState}>
          <Text className={styles.emptyText}>暂无费用记录</Text>
        </View>
      </View>
    );
  }

  return (
    <View className={styles.chartContainer}>
      <Text className={styles.title}>{title}</Text>
      <View className={styles.chart}>
        {categories.map(([key, config]) => {
          const amount = data[key] || 0;
          const percent = total > 0 ? (amount / total) * 100 : 0;
          return (
            <View key={key} className={styles.barItem}>
              <Text className={styles.categoryLabel}>{config.label}</Text>
              <View className={styles.barWrapper}>
                <View
                  className={styles.bar}
                  style={{
                    width: `${percent}%`,
                    background: config.color
                  }}
                />
              </View>
              <Text className={styles.amount}>¥{amount}</Text>
            </View>
          );
        })}
      </View>
      <View className={styles.legend}>
        {categories.map(([key, config]) => (
          <View key={key} className={styles.legendItem}>
            <View className={styles.legendDot} style={{ background: config.color }} />
            <Text className={styles.legendText}>
              {config.label} ¥{data[key] || 0}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default ExpenseChart;
