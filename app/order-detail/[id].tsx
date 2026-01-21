import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { auth, db } from '../constants/firebase';

type OrderStatus = 'pending' | 'paid' | 'failed' | 'shipped' | 'delivered' | 'cancelled';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentMethod: string;
  shippingAddress?: {
    name: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    ward: string;
  };
  createdAt: any;
  userId: string;
  stripePaymentId?: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: any;
}

// Fallback icon component
const FallbackIcon = ({ name, size, color }: { name: string; size: number; color: string }) => {
  const getIconChar = () => {
    switch(name) {
      case 'truck': return '🚚';
      case 'local-shipping': return '🚚';
      case 'shippingbox': return '📦';
      case 'creditcard': return '💳';
      case 'receipt': return '🧾';
      case 'person': return '👤';
      case 'phone': return '📱';
      case 'location': return '📍';
      case 'arrow.left': return '←';
      default: return '○';
    }
  };

  return (
    <Text style={{ fontSize: size, color }}>
      {getIconChar()}
    </Text>
  );
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [trackingInfo, setTrackingInfo] = useState<{
    steps: Array<{ date: string; status: string; description: string }>;
    currentStep: number;
  } | null>(null);

  useEffect(() => {
    if (id) {
      fetchOrderDetails(id);
    }
  }, [id]);

  const fetchOrderDetails = async (orderId: string) => {
    try {
      setLoading(true);
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);

      if (orderSnap.exists()) {
        const orderData = orderSnap.data() as Omit<Order, 'id'>;
        
        const currentUser = auth.currentUser;
        if (currentUser && orderData.userId !== currentUser.uid) {
          Alert.alert('Lỗi', 'Bạn không có quyền xem đơn hàng này');
          router.back();
          return;
        }

        const orderWithId = {
          id: orderSnap.id,
          ...orderData,
        };
        
        setOrder(orderWithId);
        generateTrackingInfo(orderWithId);
      } else {
        Alert.alert('Lỗi', 'Không tìm thấy đơn hàng');
        router.back();
      }
    } catch (error) {
      console.error('Lỗi tải chi tiết đơn hàng:', error);
      Alert.alert('Lỗi', 'Không thể tải chi tiết đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const generateTrackingInfo = (orderData: Order) => {
    const steps = [
      { date: formatDate(orderData.createdAt), status: 'order_placed', description: 'Đơn hàng đã được đặt' },
    ];

    if (orderData.status !== 'pending' && orderData.status !== 'failed') {
      steps.push({ date: getNextDate(orderData.createdAt, 1), status: 'processing', description: 'Đang xử lý đơn hàng' });
    }

    if (orderData.status === 'paid' || orderData.status === 'shipped' || orderData.status === 'delivered') {
      steps.push({ date: getNextDate(orderData.createdAt, 2), status: 'packed', description: 'Đã đóng gói' });
    }

    if (orderData.status === 'shipped' || orderData.status === 'delivered') {
      steps.push({ date: getNextDate(orderData.createdAt, 3), status: 'shipped', description: 'Đã giao cho đơn vị vận chuyển' });
    }

    if (orderData.status === 'delivered') {
      steps.push({ date: getNextDate(orderData.createdAt, 4), status: 'delivered', description: 'Đã giao hàng thành công' });
    }

    const statusToStep: Record<OrderStatus, number> = {
      pending: 0,
      paid: 1,
      failed: 0,
      shipped: 3,
      delivered: 4,
      cancelled: 0,
    };

    setTrackingInfo({
      steps,
      currentStep: statusToStep[orderData.status] || 0,
    });
  };

  const getNextDate = (timestamp: any, days: number) => {
    try {
      const date = timestamp.toDate();
      date.setDate(date.getDate() + days);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      return '--/--/----';
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    const colors = {
      pending: '#f59e0b',
      paid: '#3b82f6',
      failed: '#ef4444',
      shipped: '#8b5cf6',
      delivered: '#10b981',
      cancelled: '#6b7280',
    };
    return colors[status] || '#6b7280';
  };

  const getStatusText = (status: OrderStatus) => {
    const texts = {
      pending: 'Chờ xác nhận',
      paid: 'Đã thanh toán',
      failed: 'Thanh toán thất bại',
      shipped: 'Đang giao hàng',
      delivered: 'Đã giao hàng',
      cancelled: 'Đã hủy',
    };
    return texts[status] || status;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '--/--/----';
    
    try {
      const date = timestamp.toDate();
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return '--/--/----';
    }
  };

  /* ---------- HỦY ĐƠN HÀNG ---------- */
  const handleCancelOrder = async () => {
    if (!order) return;

    Alert.alert(
      'Xác nhận hủy đơn hàng',
      'Bạn có chắc chắn muốn hủy đơn hàng này?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Có, hủy đơn',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              const orderRef = doc(db, 'orders', order.id);
              await updateDoc(orderRef, {
                status: 'cancelled',
                cancelledAt: new Date(),
              });
              
              Alert.alert('Thành công', 'Đơn hàng đã được hủy');
              router.back();
            } catch (error) {
              console.error('Lỗi hủy đơn hàng:', error);
              Alert.alert('Lỗi', 'Không thể hủy đơn hàng');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  /* ---------- THEO DÕI ĐƠN HÀNG ---------- */
  const handleTrackOrder = () => {
    if (!order) return;

    Alert.alert(
      'Theo dõi đơn hàng',
      'Chọn cách theo dõi đơn hàng:',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xem lịch trình giao hàng',
          onPress: () => showTrackingTimeline(),
        },
        order.trackingNumber ? {
          text: 'Tra cứu vận đơn',
          onPress: () => openCarrierTracking(),
        } : null,
        {
          text: 'Liên hệ hỗ trợ',
          onPress: () => contactSupport(),
        },
      ].filter(Boolean) as any
    );
  };

  const showTrackingTimeline = () => {
    if (!trackingInfo) return;

    Alert.alert(
      'Lịch trình đơn hàng',
      trackingInfo.steps.map((step, index) => {
        const isCurrent = index === trackingInfo.currentStep;
        const isCompleted = index < trackingInfo.currentStep;
        const prefix = isCompleted ? '✅' : isCurrent ? '⏳' : '⏳';
        return `${prefix} ${step.date}: ${step.description}`;
      }).join('\n\n'),
      [{ text: 'Đóng', style: 'cancel' }]
    );
  };

  const openCarrierTracking = () => {
    if (!order?.trackingNumber) {
      Alert.alert('Thông báo', 'Đơn hàng chưa có mã vận đơn');
      return;
    }

    const carriers: Record<string, string> = {
      'ghtk': 'https://giaohangtietkiem.vn/tracking/?order_code=',
      'ghn': 'https://donhang.ghn.vn/?order_code=',
      'viettel': 'https://viettelpost.com.vn/tra-cuu-hanh-trinh-don/',
      'j&t': 'https://jtexpress.vn/tracking?type=track&billcode=',
    };

    const carrier = order.carrier || 'ghtk';
    const trackingUrl = carriers[carrier] + order.trackingNumber;

    Linking.canOpenURL(trackingUrl).then(supported => {
      if (supported) {
        Linking.openURL(trackingUrl);
      } else {
        Alert.alert('Thông báo', `Mã vận đơn: ${order.trackingNumber}\nHãng vận chuyển: ${carrier}`);
      }
    });
  };

  const contactSupport = () => {
    const phoneNumber = '19001001';
    const email = 'support@figureshop.com';
    
    Alert.alert(
      'Liên hệ hỗ trợ',
      `Hotline: ${phoneNumber}\nEmail: ${email}\nThời gian làm việc: 8:00 - 17:00 từ thứ 2 đến thứ 6`,
      [
        { text: 'Đóng', style: 'cancel' },
        {
          text: 'Gọi điện',
          onPress: () => Linking.openURL(`tel:${phoneNumber}`),
        },
        {
          text: 'Gửi email',
          onPress: () => Linking.openURL(`mailto:${email}`),
        },
      ]
    );
  };

  // Safe icon renderer
  const renderIcon = (name: string, size: number, color: string) => {
    try {
      return <IconSymbol name={name as any} size={size} color={color} />;
    } catch (error) {
      return <FallbackIcon name={name} size={size} color={color} />;
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.loadingText}>Đang tải chi tiết đơn hàng...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Không tìm thấy đơn hàng</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          {renderIcon('arrow.left', 24, '#333')}
        </TouchableOpacity>
        <Text style={styles.title}>Chi tiết đơn hàng</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* XEM CHI TIẾT ĐƠN HÀNG */}
      <View style={styles.section}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>Đơn hàng #{order.id.slice(-8).toUpperCase()}</Text>
            <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
              {getStatusText(order.status)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          {renderIcon('creditcard', 18, '#6b7280')}
          <Text style={styles.infoLabel}>Phương thức thanh toán:</Text>
          <Text style={styles.infoValue}>
            {order.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Thẻ tín dụng/ghi nợ'}
          </Text>
        </View>

        {order.trackingNumber && (
          <View style={styles.infoRow}>
            {renderIcon('truck', 18, '#6b7280')}
            <Text style={styles.infoLabel}>Mã vận đơn:</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {order.trackingNumber}
            </Text>
          </View>
        )}

        {order.stripePaymentId && (
          <View style={styles.infoRow}>
            {renderIcon('receipt', 18, '#6b7280')}
            <Text style={styles.infoLabel}>Mã thanh toán:</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {order.stripePaymentId}
            </Text>
          </View>
        )}
      </View>

      {/* Thông tin giao hàng */}
      {order.shippingAddress && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin giao hàng</Text>
          <View style={styles.infoRow}>
            {renderIcon('person', 18, '#6b7280')}
            <Text style={styles.infoLabel}>Người nhận:</Text>
            <Text style={styles.infoValue}>{order.shippingAddress.name}</Text>
          </View>
          <View style={styles.infoRow}>
            {renderIcon('phone', 18, '#6b7280')}
            <Text style={styles.infoLabel}>Số điện thoại:</Text>
            <Text style={styles.infoValue}>{order.shippingAddress.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            {renderIcon('location', 18, '#6b7280')}
            <Text style={styles.infoLabel}>Địa chỉ:</Text>
            <Text style={styles.infoValue}>
              {order.shippingAddress.address}, {order.shippingAddress.ward}, {order.shippingAddress.district}, {order.shippingAddress.city}
            </Text>
          </View>
        </View>
      )}

      {/* Sản phẩm */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sản phẩm ({order.items.length})</Text>
        {order.items.map((item, index) => (
          <View key={index} style={styles.productItem}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productQty}>x{item.quantity}</Text>
            </View>
            <Text style={styles.productPrice}>
              {(item.price * item.quantity).toLocaleString('vi-VN')}đ
            </Text>
          </View>
        ))}
      </View>

      {/* Tổng thanh toán */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tổng thanh toán</Text>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tổng tiền hàng:</Text>
          <Text style={styles.totalValue}>
            {order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString('vi-VN')}đ
          </Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Phí vận chuyển:</Text>
          <Text style={styles.totalValue}>30.000đ</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.finalTotalLabel}>Tổng cộng:</Text>
          <Text style={styles.finalTotalValue}>{order.total.toLocaleString('vi-VN')}đ</Text>
        </View>
      </View>

      {/* Nút hành động */}
      <View style={styles.actions}>
        {/* NÚT HỦY ĐƠN HÀNG */}
        {order.status === 'pending' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelOrder}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color="#dc2626" size="small" />
            ) : (
              <Text style={styles.cancelButtonText}>HỦY ĐƠN HÀNG</Text>
            )}
          </TouchableOpacity>
        )}
        
        {/* NÚT THEO DÕI ĐƠN HÀNG */}
        <TouchableOpacity
          style={styles.trackButton}
          onPress={handleTrackOrder}
        >
          {renderIcon('shippingbox', 20, '#fff')}
          <Text style={styles.trackButtonText}>THEO DÕI ĐƠN HÀNG</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  orderDate: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f1f1',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 12,
    marginRight: 8,
    minWidth: 120,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  productInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  productName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  productQty: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a73e8',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    color: '#333',
  },
  finalTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  finalTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a73e8',
  },
  actions: {
    padding: 16,
    marginBottom: 32,
  },
  cancelButton: {
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
  },
  trackButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  backButton: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});