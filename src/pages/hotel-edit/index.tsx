import React, { useState, useMemo } from 'react';
import { View, Text, Image, Button, Input, Textarea } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useTripStore } from '@/store/useTripStore';
import { formatPrice } from '@/utils';
import type { HotelInfo } from '@/types';
import styles from './index.module.scss';

const amenityOptions = ['免费WiFi', '停车场', '早餐', '健身房', '游泳池', '接机服务'];

const HotelEditPage: React.FC = () => {
  const router = useRouter();
  const date = router.params.date as string;

  const { trip, setHotel, removeHotel, addExpense } = useTripStore();

  const dayPlan = useMemo(() => trip.days.find(d => d.date === date), [trip.days, date]);
  const existingHotel = dayPlan?.hotel;

  const [form, setForm] = useState({
    name: existingHotel?.name || '',
    address: existingHotel?.address || '',
    price: existingHotel?.price?.toString() || '',
    checkIn: existingHotel?.checkIn || '14:00',
    checkOut: existingHotel?.checkOut || '12:00',
    phone: existingHotel?.phone || '',
    imageUrl: existingHotel?.imageUrl || '',
    notes: ''
  });

  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  if (!dayPlan) {
    return (
      <View className={styles.page}>
        <View className={styles.header}>
          <Text className={styles.headerTitle}>日期不存在</Text>
        </View>
      </View>
    );
  }

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      Taro.showToast({ title: '请填写酒店名称', icon: 'none' });
      return;
    }

    const hotelData: Omit<HotelInfo, 'id'> = {
      name: form.name.trim(),
      address: form.address.trim(),
      price: Number(form.price) || 0,
      checkIn: form.checkIn || '14:00',
      checkOut: form.checkOut || '12:00',
      phone: form.phone.trim(),
      imageUrl: form.imageUrl || 'https://picsum.photos/seed/hotel/800/400'
    };

    setHotel(date, hotelData);

    if (hotelData.price > 0) {
      addExpense({
        category: 'hotel',
        name: hotelData.name,
        amount: hotelData.price,
        date: date
      });
    }

    Taro.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => {
      Taro.navigateBack();
    }, 500);
  };

  const handleDelete = () => {
    if (!existingHotel) {
      Taro.navigateBack();
      return;
    }

    Taro.showModal({
      title: '确认删除',
      content: `确定要删除「${existingHotel.name}」的住宿信息吗？`,
      confirmColor: '#dc2626',
      success: (res) => {
        if (res.confirm) {
          removeHotel(date);
          Taro.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => {
            Taro.navigateBack();
          }, 500);
        }
      }
    });
  };

  const handleCall = () => {
    if (form.phone) {
      Taro.makePhoneCall({ phoneNumber: form.phone });
    }
  };

  const handleNavigate = () => {
    if (form.address) {
      Taro.showToast({ title: '正在打开地图...', icon: 'none' });
    }
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>{existingHotel ? '编辑住宿' : '添加住宿'}</Text>
        <Text className={styles.headerSubtitle}>{dayPlan.dateStr}</Text>
      </View>

      <View className={styles.form}>
        <View className={styles.formCard}>
          <View className={styles.hotelBanner}>
            {form.imageUrl ? (
              <Image src={form.imageUrl} mode='aspectFill' />
            ) : (
              <View className={styles.bannerPlaceholder}>
                <Text className={styles.bannerPlaceholder.icon}>🏨</Text>
                <Text className={styles.bannerPlaceholder.text}>添加酒店照片</Text>
              </View>
            )}
          </View>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>酒店名称</Text>
            <Input
              className={styles.formInput}
              placeholder='请输入酒店名称'
              value={form.name}
              onInput={(e) => setForm({ ...form, name: e.detail.value })}
            />
          </View>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>酒店地址</Text>
            <Textarea
              className={styles.formTextarea}
              placeholder='请输入酒店详细地址'
              value={form.address}
              onInput={(e) => setForm({ ...form, address: e.detail.value })}
            />
          </View>

          <View className={styles.timeRow}>
            <View className={styles.timeItem}>
              <Text className={styles.formLabel}>入住时间</Text>
              <Input
                className={styles.formInput}
                placeholder='例如：14:00'
                value={form.checkIn}
                onInput={(e) => setForm({ ...form, checkIn: e.detail.value })}
              />
            </View>
            <View className={styles.timeItem}>
              <Text className={styles.formLabel}>退房时间</Text>
              <Input
                className={styles.formInput}
                placeholder='例如：12:00'
                value={form.checkOut}
                onInput={(e) => setForm({ ...form, checkOut: e.detail.value })}
              />
            </View>
          </View>
        </View>

        <View className={styles.priceSection}>
          <Text className={styles.sectionTitle}>💰 价格信息</Text>
          <View className={styles.priceInput}>
            <Text className={styles.pricePrefix}>¥</Text>
            <Input
              className={styles.priceField}
              type='digit'
              placeholder='0'
              value={form.price}
              onInput={(e) => setForm({ ...form, price: e.detail.value })}
            />
            <Text className={styles.priceSuffix}>/ 晚</Text>
          </View>
          {Number(form.price) > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 24, color: '#64748b' }}>
                将自动添加到费用清单：{formatPrice(Number(form.price))}
              </Text>
            </View>
          )}
        </View>

        <View className={styles.amenitiesSection}>
          <Text className={styles.sectionTitle}>🛎️ 酒店设施</Text>
          <View className={styles.amenityOptions}>
            {amenityOptions.map((amenity) => (
              <Button
                key={amenity}
                className={`${styles.amenityOption} ${selectedAmenities.includes(amenity) ? styles.active : ''}`}
                onClick={() => toggleAmenity(amenity)}
              >
                {amenity}
              </Button>
            ))}
          </View>
        </View>

        <View className={styles.contactSection}>
          <Text className={styles.sectionTitle}>📞 联系方式</Text>
          <View className={styles.contactRow}>
            <Text className={styles.contactIcon}>📱</Text>
            <Text className={styles.contactLabel}>电话</Text>
            <Input
              className={styles.contactInput}
              placeholder='请输入联系电话'
              value={form.phone}
              onInput={(e) => setForm({ ...form, phone: e.detail.value })}
            />
            {form.phone && (
              <Button className={styles.contactBtn} onClick={handleCall}>
                拨打
              </Button>
            )}
          </View>
          <View className={styles.contactRow}>
            <Text className={styles.contactIcon}>📍</Text>
            <Text className={styles.contactLabel}>导航</Text>
            <Text className={styles.contactInput} style={{ flex: 1 }}>
              {form.address || '请填写地址后导航'}
            </Text>
            {form.address && (
              <Button className={styles.contactBtn} onClick={handleNavigate}>
                导航
              </Button>
            )}
          </View>
        </View>

        <View className={styles.formCard}>
          <View className={styles.formItem}>
            <Text className={styles.formLabel}>备注</Text>
            <Textarea
              className={styles.formTextarea}
              placeholder='添加备注，如确认号、特殊要求等...'
              value={form.notes}
              onInput={(e) => setForm({ ...form, notes: e.detail.value })}
            />
          </View>
        </View>
      </View>

      <View className={styles.bottomBar}>
        {existingHotel && (
          <Button className={`${styles.bottomBtn} ${styles.delete}`} onClick={handleDelete}>
            🗑️ 删除
          </Button>
        )}
        <Button
          className={`${styles.bottomBtn} ${styles.save}`}
          style={{ flex: existingHotel ? 1 : 1 }}
          onClick={handleSave}
        >
          💾 保存
        </Button>
      </View>
    </View>
  );
};

export default HotelEditPage;
