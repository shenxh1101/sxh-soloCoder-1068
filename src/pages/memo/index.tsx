import React, { useState, useMemo } from 'react';
import { View, Text, Button, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import ChecklistItem from '@/components/ChecklistItem';
import { useTripStore } from '@/store/useTripStore';
import { getChecklistProgress, formatDateCN } from '@/utils';
import { EXPENSE_CATEGORY_MAP, type ExpenseCategory, type Traveler } from '@/types';
import styles from './index.module.scss';

const expenseCategoryIcons: Record<ExpenseCategory, string> = {
  ticket: '🎫',
  transport: '🚗',
  hotel: '🏨',
  food: '🍜',
  shopping: '🛍️',
  other: '📦'
};

const MemoPage: React.FC = () => {
  const {
    trip,
    checklist,
    toggleChecklistItem,
    addChecklistItem,
    addTraveler,
    removeTraveler,
    updateTravelerExpenseRoles,
    assignChecklistItemToTraveler,
    unassignChecklistItemFromTraveler
  } = useTripStore();
  const [activeCategory, setActiveCategory] = useState('全部');
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showAddTravelerModal, setShowAddTravelerModal] = useState(false);
  const [showEditRolesModal, setShowEditRolesModal] = useState(false);
  const [showAssignItemsModal, setShowAssignItemsModal] = useState(false);
  const [editingTraveler, setEditingTraveler] = useState<Traveler | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<ExpenseCategory[]>([]);
  const [newItem, setNewItem] = useState({ name: '', category: '衣物' });
  const [newTraveler, setNewTraveler] = useState({ name: '', role: '', tasks: '' });

  const categories = useMemo(() => {
    const cats = ['全部', ...Array.from(new Set(checklist.map(i => i.category)))];
    return cats;
  }, [checklist]);

  const filteredChecklist = useMemo(() => {
    if (activeCategory === '全部') return checklist;
    return checklist.filter(i => i.category === activeCategory);
  }, [checklist, activeCategory]);

  const progress = getChecklistProgress(checklist);
  const daysRemaining = Math.ceil(
    (new Date(trip.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const handleAddItem = () => {
    if (!newItem.name) {
      Taro.showToast({ title: '请填写物品名称', icon: 'none' });
      return;
    }
    addChecklistItem({
      category: newItem.category,
      name: newItem.name,
      checked: false
    });
    setShowAddItemModal(false);
    setNewItem({ name: '', category: '衣物' });
    Taro.showToast({ title: '已添加', icon: 'success' });
  };

  const handleAddTraveler = () => {
    if (!newTraveler.name) {
      Taro.showToast({ title: '请填写姓名', icon: 'none' });
      return;
    }
    addTraveler({
      name: newTraveler.name,
      role: newTraveler.role || '同行人',
      tasks: newTraveler.tasks ? newTraveler.tasks.split(/[,，]/).map(t => t.trim()) : []
    });
    setShowAddTravelerModal(false);
    setNewTraveler({ name: '', role: '', tasks: '' });
    Taro.showToast({ title: '已添加', icon: 'success' });
  };

  const handleEditRoles = (traveler: Traveler) => {
    setEditingTraveler(traveler);
    setSelectedRoles(traveler.expenseRoles || []);
    setShowEditRolesModal(true);
  };

  const handleSaveRoles = () => {
    if (!editingTraveler) return;
    updateTravelerExpenseRoles(editingTraveler.id, selectedRoles);
    setShowEditRolesModal(false);
    setEditingTraveler(null);
    Taro.showToast({ title: '已保存', icon: 'success' });
  };

  const handleAssignItems = (traveler: Traveler) => {
    setEditingTraveler(traveler);
    setShowAssignItemsModal(true);
  };

  const handleToggleItemAssignment = (itemId: string) => {
    if (!editingTraveler) return;
    const assigned = editingTraveler.assignedChecklistItems || [];
    if (assigned.includes(itemId)) {
      unassignChecklistItemFromTraveler(editingTraveler.id, itemId);
    } else {
      assignChecklistItemToTraveler(editingTraveler.id, itemId);
    }
  };

  const getAssignedItemsForTraveler = (travelerId: string) => {
    const traveler = trip.travelers.find(t => t.id === travelerId);
    const assigned = traveler?.assignedChecklistItems || [];
    return checklist.filter(item => assigned.includes(item.id));
  };

  const getItemAssignee = (itemId: string) => {
    const traveler = trip.travelers.find(t =>
      (t.assignedChecklistItems || []).includes(itemId)
    );
    return traveler;
  };

  const handleRemoveTraveler = (id: string, name: string) => {
    Taro.showModal({
      title: '移除同行人',
      content: `确定要移除「${name}」吗？`,
      success: (res) => {
        if (res.confirm) {
          removeTraveler(id);
          Taro.showToast({ title: '已移除', icon: 'success' });
        }
      }
    });
  };

  const handleResetChecklist = () => {
    Taro.showModal({
      title: '重置清单',
      content: '确定要将所有清单项重置为未勾选状态吗？',
      success: (res) => {
        if (res.confirm) {
          checklist.forEach(item => {
            if (item.checked) {
              toggleChecklistItem(item.id);
            }
          });
          Taro.showToast({ title: '已重置', icon: 'success' });
        }
      }
    });
  };

  const handleShareChecklist = () => {
    let content = `【${trip.name}】出行清单\n\n`;
    content += `📌 目的地：${trip.destination}\n`;
    content += `📅 日期：${formatDateCN(trip.startDate)} - ${formatDateCN(trip.endDate)} (${trip.days.length}天)\n`;
    content += `👥 同行人：${trip.travelers.length}人\n`;
    content += `✅ 完成进度：${progress.percent}% (${progress.checked}/${progress.total})\n\n`;

    const grouped: Record<string, typeof checklist> = {};
    checklist.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });

    Object.entries(grouped).forEach(([category, items]) => {
      content += `【${category}】\n`;
      items.forEach(item => {
        content += `${item.checked ? '✅' : '⬜'} ${item.name}\n`;
      });
      content += '\n';
    });

    content += `---\n`;
    content += `分享自「旅行规划」App`;

    Taro.setClipboardData({
      data: content,
      success: () => {
        Taro.showToast({ title: '已复制到剪贴板', icon: 'success' });
      }
    });
  };

  const firstDayWeather = trip.days[0]?.weather;

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
            <Text>{trip.days.length}天</Text>
          </View>
        </View>
      </View>

      <View className={styles.weatherCard}>
        <View className={styles.weatherHeader}>
          <View>
            <View className={styles.weatherMain}>
              <Text className={styles.weatherIcon}>{firstDayWeather?.icon || '☀️'}</Text>
              <View>
                <Text className={styles.weatherTemp}>{firstDayWeather?.temp || '25°C'}</Text>
                <Text className={styles.weatherCondition}>{firstDayWeather?.condition || '晴'}</Text>
              </View>
            </View>
          </View>
          <Text className={styles.weatherLocation}>📍 {trip.destination}</Text>
        </View>
        <Text className={styles.weatherTips}>
          💡 出行提示：出发当天{firstDayWeather?.condition || '晴'}，建议{firstDayWeather?.condition === '小雨' ? '携带雨具' : '做好防晒'}。
          距离出发还有 {daysRemaining > 0 ? daysRemaining : 0} 天！
        </Text>
      </View>

      <View className={styles.departureCard}>
        <Text className={styles.departureTitle}>⏰ 出发前检查</Text>
        <View className={styles.departureItem}>
          <Text className={styles.icon}>📅</Text>
          <Text>出发日期：{formatDateCN(trip.startDate)}</Text>
        </View>
        <View className={styles.departureItem}>
          <Text className={styles.icon}>✈️</Text>
          <Text>目的地：{trip.destination}</Text>
        </View>
        <View className={styles.departureItem}>
          <Text className={styles.icon}>👥</Text>
          <Text>同行人：{trip.travelers.length} 人</Text>
        </View>
      </View>

      <View className={styles.progressCard}>
        <View className={styles.progressHeader}>
          <Text className={styles.progressTitle}>📋 准备进度</Text>
          <Text className={styles.progressText}>{progress.percent}%</Text>
        </View>
        <View className={styles.progressBar}>
          <View className={styles.progressFill} style={{ width: `${progress.percent}%` }} />
        </View>
        <Text style={{ fontSize: '22rpx', color: '#94a3b8', marginTop: '8rpx' }}>
          已完成 {progress.checked}/{progress.total} 项
        </Text>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>🎒 行李清单</Text>
          <Button className={styles.addBtn} onClick={() => setShowAddItemModal(true)}>
            + 添加
          </Button>
        </View>

        <ScrollView className={styles.categoryTabs} scrollX enableFlex>
          {categories.map(cat => (
            <Button
              key={cat}
              className={classnames(styles.categoryTab, activeCategory === cat && styles.active)}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </ScrollView>

        <View className={styles.checklistCard}>
          {filteredChecklist.length > 0 ? (
            filteredChecklist.map(item => (
              <ChecklistItem
                key={item.id}
                item={item}
                onToggle={() => toggleChecklistItem(item.id)}
                showDelete
                onDelete={() => {
                  Taro.showModal({
                    title: '删除物品',
                    content: `确定要删除「${item.name}」吗？`,
                    success: (res) => {
                      if (res.confirm) {
                        useTripStore.getState().removeChecklistItem(item.id);
                        Taro.showToast({ title: '已删除', icon: 'success' });
                      }
                    }
                  });
                }}
              />
            ))
          ) : (
            <View className={styles.emptyState}>
              <Text className={styles.emptyText}>暂无该分类物品</Text>
            </View>
          )}
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>👥 同行人</Text>
        </View>

        <View className={styles.travelersCard}>
          {trip.travelers.map(traveler => {
            const assignedItems = getAssignedItemsForTraveler(traveler.id);
            const expenseRoles = traveler.expenseRoles || [];
            return (
              <View key={traveler.id} className={styles.travelerItem}>
                <View className={styles.travelerAvatar}>
                  {traveler.name.charAt(0)}
                </View>
                <View className={styles.travelerInfo}>
                  <Text className={styles.travelerName}>{traveler.name}</Text>
                  <View>
                    <Text className={styles.travelerRole}>{traveler.role}</Text>
                  </View>
                  {traveler.tasks.length > 0 && (
                    <Text className={styles.travelerTasks}>
                      负责：{traveler.tasks.join('、')}
                    </Text>
                  )}
                  {expenseRoles.length > 0 && (
                    <View className={styles.expenseRoles}>
                      <Text className={styles.rolesLabel}>费用负责：</Text>
                      {expenseRoles.map(role => (
                        <Text key={role} className={styles.roleTag}>
                          {expenseCategoryIcons[role]} {EXPENSE_CATEGORY_MAP[role].label}
                        </Text>
                      ))}
                    </View>
                  )}
                  {assignedItems.length > 0 && (
                    <View className={styles.assignedItems}>
                      <Text className={styles.itemsLabel}>负责物品：</Text>
                      <View className={styles.itemTags}>
                        {assignedItems.slice(0, 3).map(item => (
                          <Text key={item.id} className={classnames(styles.itemTag, item.checked && styles.completed)}>
                            {item.checked && '✓ '}{item.name}
                          </Text>
                        ))}
                        {assignedItems.length > 3 && (
                          <Text className={styles.itemTag}>+{assignedItems.length - 3}项</Text>
                        )}
                      </View>
                      <View className={styles.progressRow}>
                        <Text className={styles.progressLabel}>
                          📊 进度：{assignedItems.filter(i => i.checked).length}/{assignedItems.length}
                        </Text>
                        {assignedItems.filter(i => !i.checked).length > 0 && (
                          <Text className={styles.remainingCount}>
                            剩余 {assignedItems.filter(i => !i.checked).length} 项未完成
                          </Text>
                        )}
                      </View>
                      {assignedItems.filter(i => !i.checked).length > 0 && (
                        <View className={styles.uncompletedList}>
                          <Text className={styles.uncompletedLabel}>待完成：</Text>
                          {assignedItems.filter(i => !i.checked).slice(0, 3).map(item => (
                            <Text key={item.id} className={styles.uncompletedItem}>
                              ⏰ {item.name}
                            </Text>
                          ))}
                          {assignedItems.filter(i => !i.checked).length > 3 && (
                            <Text className={styles.uncompletedItem}>还有 {assignedItems.filter(i => !i.checked).length - 3} 项...</Text>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                  <View className={styles.travelerActions}>
                    <Button className={styles.actionBtn} onClick={() => handleEditRoles(traveler)}>
                      💰 费用角色
                    </Button>
                    <Button className={styles.actionBtn} onClick={() => handleAssignItems(traveler)}>
                      🎒 分配物品
                    </Button>
                  </View>
                </View>
                {traveler.role !== '组织者' && (
                  <Button
                    style={{ fontSize: '24rpx', color: '#94a3b8', background: 'transparent' }}
                    onClick={() => handleRemoveTraveler(traveler.id, traveler.name)}
                  >
                    移除
                  </Button>
                )}
              </View>
            );
          })}
          <Button className={styles.addTravelerBtn} onClick={() => setShowAddTravelerModal(true)}>
            + 添加同行人
          </Button>
        </View>
      </View>

      <View className={styles.bottomBar}>
        <Button className={`${styles.bottomBtn} ${styles.secondary}`} onClick={handleResetChecklist}>
          🔄 重置清单
        </Button>
        <Button className={`${styles.bottomBtn} ${styles.primary}`} onClick={handleShareChecklist}>
          📤 分享清单
        </Button>
      </View>

      {showAddItemModal && (
        <View className={styles.modal} onClick={() => setShowAddItemModal(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>添加物品</Text>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>分类</Text>
              <View style={{ display: 'flex', flexWrap: 'wrap', gap: '16rpx' }}>
                {['证件', '衣物', '电子', '日用', '药品'].map(cat => (
                  <Button
                    key={cat}
                    style={{
                      padding: '8rpx 24rpx',
                      borderRadius: '32rpx',
                      background: newItem.category === cat ? '#2563eb' : '#f1f5f9',
                      color: newItem.category === cat ? '#fff' : '#64748b',
                      fontSize: '24rpx',
                      height: '56rpx'
                    }}
                    onClick={() => setNewItem({ ...newItem, category: cat })}
                  >
                    {cat}
                  </Button>
                ))}
              </View>
            </View>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>物品名称</Text>
              <Input
                className={styles.formInput}
                placeholder='例如：墨镜'
                value={newItem.name}
                onInput={(e) => setNewItem({ ...newItem, name: e.detail.value })}
              />
            </View>

            <View className={styles.modalActions}>
              <Button className={`${styles.modalBtn} ${styles.cancel}`} onClick={() => setShowAddItemModal(false)}>
                取消
              </Button>
              <Button className={`${styles.modalBtn} ${styles.confirm}`} onClick={handleAddItem}>
                添加
              </Button>
            </View>
          </View>
        </View>
      )}

      {showAddTravelerModal && (
        <View className={styles.modal} onClick={() => setShowAddTravelerModal(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>添加同行人</Text>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>姓名</Text>
              <Input
                className={styles.formInput}
                placeholder='请输入姓名'
                value={newTraveler.name}
                onInput={(e) => setNewTraveler({ ...newTraveler, name: e.detail.value })}
              />
            </View>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>角色</Text>
              <Input
                className={styles.formInput}
                placeholder='例如：摄影师、财务'
                value={newTraveler.role}
                onInput={(e) => setNewTraveler({ ...newTraveler, role: e.detail.value })}
              />
            </View>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>分工（多个用逗号分隔）</Text>
              <Input
                className={styles.formInput}
                placeholder='例如：订机票, 查攻略'
                value={newTraveler.tasks}
                onInput={(e) => setNewTraveler({ ...newTraveler, tasks: e.detail.value })}
              />
            </View>

            <View className={styles.modalActions}>
              <Button className={`${styles.modalBtn} ${styles.cancel}`} onClick={() => setShowAddTravelerModal(false)}>
                取消
              </Button>
              <Button className={`${styles.modalBtn} ${styles.confirm}`} onClick={handleAddTraveler}>
                添加
              </Button>
            </View>
          </View>
        </View>
      )}

      {showEditRolesModal && editingTraveler && (
        <View className={styles.modal} onClick={() => {
          setShowEditRolesModal(false);
          setEditingTraveler(null);
        }}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>设置费用角色 - {editingTraveler.name}</Text>
            <Text className={styles.modalSubtitle}>
              选择{editingTraveler.name}负责垫付的费用类别（方便记账）
            </Text>

            <View className={styles.categoryGrid}>
              {(Object.entries(EXPENSE_CATEGORY_MAP) as [ExpenseCategory, { label: string; color: string }][]).map(([key, config]) => (
                <Button
                  key={key}
                  className={classnames(styles.categoryOption, selectedRoles.includes(key) && styles.active)}
                  onClick={() => {
                    if (selectedRoles.includes(key)) {
                      setSelectedRoles(selectedRoles.filter(r => r !== key));
                    } else {
                      setSelectedRoles([...selectedRoles, key]);
                    }
                  }}
                >
                  <Text className={styles.icon}>{expenseCategoryIcons[key]}</Text>
                  <Text className={styles.label}>{config.label}</Text>
                </Button>
              ))}
            </View>

            <View className={styles.modalActions}>
              <Button
                className={`${styles.modalBtn} ${styles.cancel}`}
                onClick={() => {
                  setShowEditRolesModal(false);
                  setEditingTraveler(null);
                }}
              >
                取消
              </Button>
              <Button className={`${styles.modalBtn} ${styles.confirm}`} onClick={handleSaveRoles}>
                保存
              </Button>
            </View>
          </View>
        </View>
      )}

      {showAssignItemsModal && editingTraveler && (
        <View className={styles.modal} onClick={() => {
          setShowAssignItemsModal(false);
          setEditingTraveler(null);
        }}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>分配物品 - {editingTraveler.name}</Text>
            <Text className={styles.modalSubtitle}>
              勾选{editingTraveler.name}负责准备/携带的物品
            </Text>

            <ScrollView className={styles.checklistScroll} scrollY>
              {checklist.map(item => {
                const isAssigned = (editingTraveler.assignedChecklistItems || []).includes(item.id);
                const currentAssignee = getItemAssignee(item.id);
                const isAssignedToOther = currentAssignee && currentAssignee.id !== editingTraveler.id;
                return (
                  <View
                    key={item.id}
                    className={classnames(
                      styles.checklistAssignItem,
                      isAssigned && styles.assigned,
                      isAssignedToOther && styles.assignedToOther
                    )}
                    onClick={() => !isAssignedToOther && handleToggleItemAssignment(item.id)}
                  >
                    <View className={styles.checkbox}>
                      {isAssigned ? '✓' : isAssignedToOther ? '✕' : ''}
                    </View>
                    <View className={styles.itemInfo}>
                      <Text className={classnames(styles.itemName, item.checked && styles.checked)}>
                        {item.name}
                      </Text>
                      <Text className={styles.itemCategory}>{item.category}</Text>
                    </View>
                    {isAssignedToOther && (
                      <Text className={styles.assignedTo}>
                        {currentAssignee?.name}负责
                      </Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <View className={styles.modalActions}>
              <Button
                className={`${styles.modalBtn} ${styles.cancel}`}
                onClick={() => {
                  setShowAssignItemsModal(false);
                  setEditingTraveler(null);
                }}
              >
                完成
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default MemoPage;
