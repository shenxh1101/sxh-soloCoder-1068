import React from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import type { Attraction } from '@/types';
import { useTripStore } from '@/store/useTripStore';
import { formatPrice } from '@/utils';
import styles from './index.module.scss';

interface AttractionCardProps {
  attraction: Attraction;
  showFavorite?: boolean;
  onClick?: () => void;
}

const AttractionCard: React.FC<AttractionCardProps> = ({
  attraction,
  showFavorite = true,
  onClick
}) => {
  const { isFavorite, addFavorite, removeFavorite } = useTripStore();
  const favorited = isFavorite(attraction.id);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (favorited) {
      removeFavorite(attraction.id);
      Taro.showToast({ title: '已取消收藏', icon: 'none' });
    } else {
      addFavorite(attraction);
      Taro.showToast({ title: '已收藏', icon: 'success' });
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      Taro.navigateTo({
        url: `/pages/attraction-detail/index?id=${attraction.id}`
      });
    }
  };

  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.image}>
        <Image src={attraction.imageUrl} mode='aspectFill' />
      </View>
      <View className={styles.content}>
        <View className={styles.header}>
          <Text className={styles.name}>{attraction.name}</Text>
          {showFavorite && (
            <Button className={styles.favoriteBtn} onClick={handleFavorite}>
              {favorited ? '❤️' : '🤍'}
            </Button>
          )}
        </View>
        <View className={styles.info}>
          {attraction.tags.slice(0, 3).map((tag, index) => (
            <Text key={index} className={styles.tag}>{tag}</Text>
          ))}
        </View>
        <View className={styles.meta}>
          <View className={styles.rating}>
            <Text>⭐</Text>
            <Text>{attraction.rating}</Text>
          </View>
          <Text className={classnames(styles.price, attraction.ticketPrice === 0 && styles.free)}>
            {formatPrice(attraction.ticketPrice)}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default AttractionCard;
