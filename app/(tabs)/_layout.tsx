// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '../../components/haptic-tab';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { useColorScheme } from '../../hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#00eaff', // Màu xanh neon phù hợp với app
        tabBarInactiveTintColor: colorScheme === 'dark' ? '#888' : '#666',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#0a0a0a' : '#f8f8f8',
          borderTopColor: colorScheme === 'dark' ? '#222' : '#ddd',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}>
      
      {/* TAB HOME - Trang chủ chính */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={26} 
              name={focused ? "house.fill" : "house"} 
              color={color} 
            />
          ),
        }}
      />

      {/* TAB EXPLORE - Khám phá sản phẩm */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Khám phá',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={26} 
              name={focused ? "magnifyingglass.circle.fill" : "magnifyingglass.circle"} 
              color={color} 
            />
          ),
        }}
      />

      {/* TAB PROFILE - Thay vì Admin, tạo tab Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={26} 
              name={focused ? "person.fill" : "person"} 
              color={color} 
            />
          ),
        }}
      />

    </Tabs>
  );
}