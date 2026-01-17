// app/checkout/failed.tsx
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { IconSymbol } from '../../components/ui/icon-symbol';

interface PaymentError {
  code?: string;
  message?: string;
  paymentMethod?: string;
}

export default function CheckoutFailedScreen() {
  const params = useLocalSearchParams();
  const [retrying, setRetrying] = useState(false);
  
  const errorCode = params.errorCode as string;
  const errorMessage = params.errorMessage as string;
  const orderId = params.orderId as string;
  const paymentMethod = params.paymentMethod as string || 'unknown';

  const getErrorDetails = (): PaymentError => {
    let details: PaymentError = {
      message: 'Không thể xử lý thanh toán',
      paymentMethod: paymentMethod
    };

    switch (errorCode) {
      case 'card_declined':
        details.message = 'Thẻ của bạn đã bị từ chối';
        details.code = 'Thẻ bị từ chối';
        break;
      case 'insufficient_funds':
        details.message = 'Số dư tài khoản không đủ';
        details.code = 'Không đủ số dư';
        break;
      case 'expired_card':
        details.message = 'Thẻ đã hết hạn';
        details.code = 'Thẻ hết hạn';
        break;
      case 'invalid_card':
        details.message = 'Thông tin thẻ không hợp lệ';
        details.code = 'Thẻ không hợp lệ';
        break;
      case 'processing_error':
        details.message = 'Lỗi xử lý thanh toán';
        details.code = 'Lỗi hệ thống';
        break;
      case 'network_error':
        details.message = 'Lỗi kết nối mạng';
        details.code = 'Lỗi kết nối';
        break;
      case 'timeout':
        details.message = 'Quá thời gian xử lý';
        details.code = 'Hết thời gian';
        break;
      case 'user_cancelled':
        details.message = 'Bạn đã hủy thanh toán';
        details.code = 'Đã hủy';
        break;
      default:
        details.message = errorMessage || 'Đã xảy ra lỗi trong quá trình thanh toán';
        details.code = errorCode || 'Lỗi không xác định';
    }

    return details;
  };

  const errorDetails = getErrorDetails();

  const handleRetryPayment = () => {
    setRetrying(true);
    Alert.alert(
      'Thử lại thanh toán',
      'Bạn có muốn thử lại thanh toán không?',
      [
        { text: 'Hủy', style: 'cancel', onPress: () => setRetrying(false) },
        { 
          text: 'Thử lại', 
          onPress: () => {
            // Logic retry payment - trở về trang checkout
            router.back();
            setRetrying(false);
          }
        }
      ]
    );
  };

  const handleTryDifferentMethod = () => {
    Alert.alert(
      'Phương thức thanh toán khác',
      'Bạn có muốn sử dụng phương thức thanh toán khác?',
      [
        { text: 'Để sau', style: 'cancel' },
        { 
          text: 'COD', 
          onPress: () => {
            // Chuyển sang COD
            Alert.alert(
              'Thanh toán COD',
              'Đơn hàng sẽ được tạo với phương thức thanh toán khi nhận hàng (COD).',
              [
                { text: 'Hủy', style: 'cancel' },
                { 
                  text: 'Xác nhận', 
                  onPress: () => {
                    // Tạo order với COD
                    router.replace({
                      pathname: '/(tabs)/checkout',
                      params: { paymentMethod: 'cod' }
                    });
                  }
                }
              ]
            );
          }
        },
        { 
          text: 'Thẻ khác', 
          onPress: () => {
            router.replace('/(tabs)/checkout');
          }
        }
      ]
    );
  };

  const handleContactSupport = () => {
    Alert.alert(
      '📞 Liên hệ hỗ trợ',
      'Hotline: 1900 1234\nEmail: support@figureapp.com\nGiờ làm việc: 8:00 - 22:00 hàng ngày',
      [
        { text: 'Sao chép số điện thoại', onPress: () => {
          // Copy to clipboard
          alert('Đã sao chép số điện thoại hỗ trợ');
        }},
        { text: 'Gửi email', onPress: () => {
          // Open email client
          alert('Mở ứng dụng email');
        }},
        { text: 'Đóng', style: 'cancel' }
      ]
    );
  };

  const handleCancelOrder = () => {
    Alert.alert(
      'Hủy đơn hàng',
      'Bạn có chắc chắn muốn hủy đơn hàng này? Thao tác này sẽ xóa giỏ hàng của bạn.',
      [
        { text: 'Tiếp tục thanh toán', style: 'cancel' },
        { 
          text: 'Hủy đơn hàng', 
          style: 'destructive',
          onPress: () => {
            // Clear cart and go to home
            router.replace('/(tabs)');
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Error Header */}
      <View style={styles.errorHeader}>
        <View style={styles.errorIconContainer}>
          <IconSymbol name="xmark.circle" size={100} color="#ef4444" />
        </View>
        <Text style={styles.title}>❌ Thanh toán thất bại</Text>
        <Text style={styles.subtitle}>
          Rất tiếc, chúng tôi không thể xử lý thanh toán của bạn
        </Text>
      </View>

      {/* Error Details Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📋 Chi tiết lỗi</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mã lỗi:</Text>
          <View style={[styles.errorBadge, { backgroundColor: '#fee2e2' }]}>
            <Text style={[styles.errorBadgeText, { color: '#dc2626' }]}>
              {errorDetails.code}
            </Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Thông báo:</Text>
          <Text style={styles.errorMessage}>
            {errorDetails.message}
          </Text>
        </View>
        
        {orderId && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mã đơn hàng:</Text>
            <Text style={styles.infoValue}>#{orderId.slice(-8).toUpperCase()}</Text>
          </View>
        )}
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phương thức:</Text>
          <Text style={styles.infoValue}>
            {paymentMethod === 'card' ? '💳 Thẻ tín dụng/ghi nợ' : '💵 COD'}
          </Text>
        </View>
      </View>

      {/* Possible Reasons */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔍 Nguyên nhân có thể</Text>
        
        <View style={styles.reasonsList}>
          {errorCode === 'card_declined' && (
            <>
              <View style={styles.reasonItem}>
                <IconSymbol name="exclamationmark.circle" size={16} color="#ef4444" />
                <Text style={styles.reasonText}>Thẻ đã bị ngân hàng từ chối</Text>
              </View>
              <View style={styles.reasonItem}>
                <IconSymbol name="creditcard" size={16} color="#ef4444" />
                <Text style={styles.reasonText}>Thông tin thẻ không chính xác</Text>
              </View>
            </>
          )}
          
          {errorCode === 'insufficient_funds' && (
            <>
              <View style={styles.reasonItem}>
                <IconSymbol name="dollarsign.circle" size={16} color="#ef4444" />
                <Text style={styles.reasonText}>Số dư tài khoản không đủ</Text>
              </View>
              <View style={styles.reasonItem}>
                <IconSymbol name="creditcard" size={16} color="#ef4444" />
                <Text style={styles.reasonText}>Hạn mức thẻ đã hết</Text>
              </View>
            </>
          )}
          
          {errorCode === 'expired_card' && (
            <View style={styles.reasonItem}>
              <IconSymbol name="calendar.badge.exclamationmark" size={16} color="#ef4444" />
              <Text style={styles.reasonText}>Thẻ đã hết hạn sử dụng</Text>
            </View>
          )}
          
          {/* Default reasons for unknown errors */}
          {!errorCode && (
            <>
              <View style={styles.reasonItem}>
                <IconSymbol name="wifi.exclamationmark" size={16} color="#ef4444" />
                <Text style={styles.reasonText}>Lỗi kết nối internet</Text>
              </View>
              <View style={styles.reasonItem}>
                <IconSymbol name="exclamationmark.triangle" size={16} color="#ef4444" />
                <Text style={styles.reasonText}>Lỗi hệ thống tạm thời</Text>
              </View>
              <View style={styles.reasonItem}>
                <IconSymbol name="clock.badge.exclamationmark" size={16} color="#ef4444" />
                <Text style={styles.reasonText}>Quá thời gian xử lý</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Solutions & Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💡 Giải pháp đề xuất</Text>
        
        <View style={styles.solutionsList}>
          <View style={styles.solutionItem}>
            <View style={styles.solutionIcon}>
              <Text style={styles.solutionNumber}>1</Text>
            </View>
            <View style={styles.solutionContent}>
              <Text style={styles.solutionTitle}>Kiểm tra thông tin thẻ</Text>
              <Text style={styles.solutionDescription}>
                Đảm bảo số thẻ, ngày hết hạn và mã CVV chính xác
              </Text>
            </View>
          </View>
          
          <View style={styles.solutionItem}>
            <View style={styles.solutionIcon}>
              <Text style={styles.solutionNumber}>2</Text>
            </View>
            <View style={styles.solutionContent}>
              <Text style={styles.solutionTitle}>Liên hệ ngân hàng</Text>
              <Text style={styles.solutionDescription}>
                Gọi đến tổng đài ngân hàng để kiểm tra tình trạng thẻ
              </Text>
            </View>
          </View>
          
          <View style={styles.solutionItem}>
            <View style={styles.solutionIcon}>
              <Text style={styles.solutionNumber}>3</Text>
            </View>
            <View style={styles.solutionContent}>
              <Text style={styles.solutionTitle}>Thử phương thức khác</Text>
              <Text style={styles.solutionDescription}>
                Sử dụng thẻ khác hoặc thanh toán khi nhận hàng (COD)
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleRetryPayment}
          disabled={retrying}
        >
          {retrying ? (
            <>
              <IconSymbol name="arrow.clockwise" size={20} color="white" />
              <Text style={styles.primaryButtonText}>Đang thử lại...</Text>
            </>
          ) : (
            <>
              <IconSymbol name="arrow.clockwise" size={20} color="white" />
              <Text style={styles.primaryButtonText}>Thử lại thanh toán</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleTryDifferentMethod}
        >
          <IconSymbol name="creditcard" size={20} color="#1a73e8" />
          <Text style={styles.secondaryButtonText}>Phương thức khác</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.outlineButton]}
          onPress={handleContactSupport}
        >
          <IconSymbol name="phone" size={20} color="#6b7280" />
          <Text style={styles.outlineButtonText}>Liên hệ hỗ trợ</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleCancelOrder}
        >
          <IconSymbol name="xmark" size={20} color="#dc2626" />
          <Text style={styles.dangerButtonText}>Hủy đơn hàng</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.ghostButton]}
          onPress={() => router.replace('/(tabs)/cart')}
        >
          <IconSymbol name="cart" size={20} color="#1a1a1a" />
          <Text style={styles.ghostButtonText}>Quay lại giỏ hàng</Text>
        </TouchableOpacity>
      </View>

      {/* Security Note */}
      <View style={styles.securityNote}>
        <IconSymbol name="lock.shield" size={20} color="#10b981" />
        <Text style={styles.securityText}>
          🔒 Thông tin thẻ của bạn được bảo mật và không được lưu trữ trên hệ thống của chúng tôi
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Mẹo: Đảm bảo kết nối internet ổn định và thử lại sau vài phút
        </Text>
        <Text style={styles.footerNote}>
          Nếu lỗi vẫn tiếp diễn, vui lòng liên hệ ngân hàng phát hành thẻ của bạn
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  errorHeader: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#fee2e2',
  },
  errorIconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  infoLabel: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'right',
  },
  errorBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  errorBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorMessage: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
    fontStyle: 'italic',
  },
  reasonsList: {
    marginTop: 8,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  reasonText: {
    fontSize: 14,
    color: '#1a1a1a',
    marginLeft: 12,
    flex: 1,
  },
  solutionsList: {
    marginTop: 8,
  },
  solutionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  solutionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  solutionNumber: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  solutionContent: {
    flex: 1,
  },
  solutionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  solutionDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  actionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#1a73e8',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#1a73e8',
  },
  secondaryButtonText: {
    color: '#1a73e8',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  outlineButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  outlineButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  dangerButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  dangerButtonText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  ghostButton: {
    backgroundColor: '#f3f4f6',
  },
  ghostButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#d1fae5',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  securityText: {
    fontSize: 14,
    color: '#065f46',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  footerNote: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
});