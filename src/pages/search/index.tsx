import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Input, Button, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import AttractionCard from '@/components/AttractionCard';
import { mockAttractions, hotCities } from '@/data/attractions';
import type { Attraction } from '@/types';
import { debounce } from '@/utils';
import styles from './index.module.scss';

const SearchPage: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('全部');
  const [results, setResults] = useState<Attraction[]>(mockAttractions);
  const [loading, setLoading] = useState(false);

  const filters = ['全部', '免费', '文化古迹', '主题乐园', '自然景观', '购物', '美食'];

  const performSearch = useCallback(
    debounce((keyword: string, filter: string) => {
      console.log('[Search] 搜索:', { keyword, filter });
      setLoading(true);

      setTimeout(() => {
        let filtered = [...mockAttractions];

        if (keyword) {
          const lowerKeyword = keyword.toLowerCase();
          filtered = filtered.filter(
            (a) =>
              a.name.toLowerCase().includes(lowerKeyword) ||
              a.city.toLowerCase().includes(lowerKeyword) ||
              a.tags.some((t) => t.toLowerCase().includes(lowerKeyword))
          );
        }

        if (filter !== '全部') {
          if (filter === '免费') {
            filtered = filtered.filter((a) => a.ticketPrice === 0);
          } else {
            filtered = filtered.filter((a) => a.tags.includes(filter));
          }
        }

        setResults(filtered);
        setLoading(false);
        console.log('[Search] 搜索结果数:', filtered.length);
      }, 300);
    }, 300),
    []
  );

  useEffect(() => {
    performSearch(searchText, activeFilter);
  }, [searchText, activeFilter, performSearch]);

  const handleCityClick = (cityName: string) => {
    console.log('[Search] 点击城市:', cityName);
    setSearchText(cityName);
  };

  const handleRefresh = () => {
    console.log('[Search] 下拉刷新');
    Taro.startPullDownRefresh();
    setTimeout(() => {
      performSearch(searchText, activeFilter);
      Taro.stopPullDownRefresh();
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    }, 1000);
  };

  useEffect(() => {
    Taro.eventCenter.on('onPullDownRefresh', handleRefresh);
    return () => {
      Taro.eventCenter.off('onPullDownRefresh', handleRefresh);
    };
  }, [searchText, activeFilter, performSearch]);

  return (
    <View className={styles.page}>
      <View className={styles.searchBar}>
        <Input
          className={styles.searchInput}
          placeholder='搜索景点、城市或标签'
          value={searchText}
          onInput={(e) => setSearchText(e.detail.value)}
          confirmType='search'
        />
        <Button
          className={styles.searchBtn}
          onClick={() => performSearch(searchText, activeFilter)}
        >
          搜索
        </Button>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <Text className={styles.title}>🔥 热门目的地</Text>
        </View>
        <ScrollView className={styles.hotCities} scrollX enableFlex>
          {hotCities.map((city) => (
            <View
              key={city.id}
              className={styles.cityCard}
              onClick={() => handleCityClick(city.name)}
            >
              <View className={styles.cityImage}>
                <Image src={city.imageUrl} mode='aspectFill' />
              </View>
              <Text className={styles.cityName}>{city.name}</Text>
              <Text className={styles.cityCount}>{city.attractionCount}个景点</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <Text className={styles.title}>🎯 筛选</Text>
        </View>
        <View className={styles.filterTabs}>
          {filters.map((filter) => (
            <Button
              key={filter}
              className={classnames(styles.filterTab, activeFilter === filter && styles.active)}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </Button>
          ))}
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <Text className={styles.title}>📍 景点列表</Text>
          <Text className={styles.subTitle}>共 {results.length} 个结果</Text>
        </View>

        {loading ? (
          <View className={styles.loading}>搜索中...</View>
        ) : results.length > 0 ? (
          <View className={styles.attractionList}>
            {results.map((attraction) => (
              <AttractionCard key={attraction.id} attraction={attraction} />
            ))}
          </View>
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>🔍</Text>
            <Text className={styles.emptyText}>没有找到相关景点</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default SearchPage;
