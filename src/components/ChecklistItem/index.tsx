import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import classnames from 'classnames';
import type { ChecklistItem as ChecklistItemType } from '@/types';
import styles from './index.module.scss';

interface ChecklistItemProps {
  item: ChecklistItemType;
  onToggle: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
}

const ChecklistItem: React.FC<ChecklistItemProps> = ({
  item,
  onToggle,
  onDelete,
  showDelete = false
}) => {
  return (
    <View className={styles.item}>
      <Button
        className={classnames(styles.checkbox, item.checked && styles.checked)}
        onClick={onToggle}
      >
        {item.checked && <Text className={styles.checkIcon}>✓</Text>}
      </Button>
      <View className={styles.content}>
        <Text className={classnames(styles.name, item.checked && styles.checked)}>
          {item.name}
        </Text>
        <Text className={styles.category}>{item.category}</Text>
      </View>
      {showDelete && (
        <Button className={styles.deleteBtn} onClick={onDelete}>
          ✕
        </Button>
      )}
    </View>
  );
};

export default ChecklistItem;
