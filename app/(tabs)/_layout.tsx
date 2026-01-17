import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { HapticTab } from '../../components/haptic-tab';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { useColorScheme } from '../../hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#00eaff',
        tabBarInactiveTintColor: colorScheme === 'dark' ? '#888' : '#666',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#0a0a0a' : '#f8f8f8',
          borderTopColor: colorScheme === 'dark' ? '#222' : '#ddd',
          height: Platform.OS === 'ios' ? 85 : 60,
          paddingBottom: Platform.OS === 'ios' ? 30 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
      }}
    >

      {/* HOME TAB */}
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

      {/* CART TAB */}
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Giỏ hàng',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={26}
              name={focused ? "cart.fill" : "cart"}
              color={color}
            />
          ),
        }}
      />

      {/* ORDERS TAB */}
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Đơn hàng',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={26}
              name={focused ? "bag.fill" : "bag"}
              color={color}
            />
          ),
        }}
      />

      {/* PROFILE TAB */}
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

      {/* ẨN CHECKOUT KHỎI TAB BAR */}
      <Tabs.Screen
        name="checkout"
        options={{
          href: null, // Ẩn khỏi tab bar
        }}
      />
      
      {/* XÓA DÒNG NÀY: product/[id] KHÔNG NÊN Ở ĐÂY */}
      {/* <Tabs.Screen
        name="product/[id]"
        options={{
          href: null,
        }}
      /> */}
    </Tabs>
  );
}