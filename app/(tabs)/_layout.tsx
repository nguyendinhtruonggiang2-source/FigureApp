import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';
import { useColorScheme } from '../../hooks/use-color-scheme';

// Fallback icon component cho web
const TabIcon = ({ name, color, focused }: { name: string; color: string; focused: boolean }) => {
  const getIcon = () => {
    switch(name) {
      case 'house': return '🏠';
      case 'cart': return '🛒';
      case 'bag': return '🛍️';
      case 'person': return '👤';
      default: return '○';
    }
  };

  return (
    <Text style={{ 
      fontSize: 24, 
      color,
      opacity: focused ? 1 : 0.7,
    }}>
      {getIcon()}
    </Text>
  );
};

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#00eaff',
        tabBarInactiveTintColor: colorScheme === 'dark' ? '#888' : '#666',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#0a0a0a' : '#f8f8f8',
          borderTopColor: colorScheme === 'dark' ? '#222' : '#ddd',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 30 : 8,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarIconStyle: {
          marginTop: Platform.OS === 'ios' ? 4 : 0,
        },
        tabBarItemStyle: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 48,
          paddingVertical: 8,
        },
      }}
    >

      {/* HOME TAB */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="house" color={color} focused={focused} />
          ),
        }}
      />

      {/* CART TAB */}
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Giỏ hàng',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="cart" color={color} focused={focused} />
          ),
        }}
      />

      {/* ORDERS TAB */}
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Đơn hàng',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="bag" color={color} focused={focused} />
          ),
        }}
      />

      {/* PROFILE TAB */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person" color={color} focused={focused} />
          ),
        }}
      />

      {/* ẨN CHECKOUT KHỎI TAB BAR */}
      <Tabs.Screen
        name="checkout"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}