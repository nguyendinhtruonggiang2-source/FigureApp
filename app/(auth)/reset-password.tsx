// app/(auth)/reset-password.tsx
import { router } from "expo-router";
import {
    createUserWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut
} from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { auth } from "../constants/firebase";

// Email mặc định để test
const DEFAULT_TEST_EMAILS = [
  "columbina@gmail.com",
  "elysia@gmail.com", 
  "furina@gmail.com",
  "nguyendinhtruonggiang2@gmail.com"
];

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [userDetails, setUserDetails] = useState<{
    uid?: string, 
    emailVerified?: boolean,
    existsConfirmedBy?: string
  } | null>(null);
  
  // State cho modal xác nhận
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalType, setModalType] = useState<"create" | "reset">("reset");
  const [modalLoading, setModalLoading] = useState(false);
  
  // Refs để track
  const isCheckingRef = useRef(false);
  const lastCheckedEmailRef = useRef("");

  // ==================== HÀM KIỂM TRA USER THÔNG MINH ====================
  const checkUserExists = async (emailToCheck: string, forceCheck = false) => {
    if (!emailToCheck.trim() || isCheckingRef.current) {
      return;
    }
    
    if (emailToCheck === lastCheckedEmailRef.current && !forceCheck) {
      return;
    }
    
    lastCheckedEmailRef.current = emailToCheck;
    isCheckingRef.current = true;
    setCheckingUser(true);
    setUserDetails(null);
    setUserExists(null);
    
    try {
      console.log(`🔍 SMART CHECK for: ${emailToCheck}`);
      
      let exists = false;
      let userInfo: any = null;
      let confirmedBy = "not-checked";
      
      // ======= PHƯƠNG PHÁP 1: Dùng sendPasswordResetEmail (HIỆU QUẢ NHẤT) =======
      // Phương pháp này xác định user tồn tại mà không cần password
      try {
        console.log(`📧 Method 1: Testing with sendPasswordResetEmail...`);
        // NOTE: Firebase sẽ KHÔNG gửi email nếu chúng ta catch lỗi ngay
        // Chỉ cần biết liệu function có throw error không
        await sendPasswordResetEmail(auth, emailToCheck);
        
        // Nếu đến được đây mà không có lỗi, user TỒN TẠI
        exists = true;
        confirmedBy = "reset-email";
        console.log(`✅ User ${emailToCheck} EXISTS (confirmed by reset email)`);
        
        userInfo = {
          exists: true,
          existsConfirmedBy: "reset-email",
          uid: "unknown-needs-password", // Chưa biết UID vì chưa đăng nhập
          emailVerified: undefined
        };
        
      } catch (resetError: any) {
        console.log(`📧 Reset email result: ${resetError.code}`);
        
        if (resetError.code === "auth/user-not-found") {
          // User KHÔNG tồn tại
          exists = false;
          confirmedBy = "reset-email-not-found";
          console.log(`❌ User ${emailToCheck} NOT FOUND (confirmed by reset email)`);
        } else if (resetError.code === "auth/too-many-requests") {
          // Bị rate limit - không thể kết luận
          console.log(`⚠️ Rate limited on reset email, trying other methods...`);
        } else {
          // Lỗi khác - không thể kết luận
          console.log(`⚠️ Other error on reset email: ${resetError.code}`);
        }
      }
      
      // ======= PHƯƠNG PHÁP 2: Thử đăng nhập nếu chưa xác định =======
      if (exists === false || confirmedBy === "not-checked") {
        console.log(`🔑 Method 2: Trying limited password attempts...`);
        
        // Chỉ thử 3 password quan trọng nhất để tránh rate limit
        const criticalPasswords = [
          "Figure@2024",    // Password custom của app
          "figure123",      // Password đơn giản
          "123456"          // Password phổ biến
        ];
        
        for (const pass of criticalPasswords) {
          try {
            console.log(`🔑 Trying critical password: "${pass}"`);
            const userCred = await signInWithEmailAndPassword(auth, emailToCheck, pass);
            
            // THÀNH CÔNG! User tồn tại và tìm được password
            exists = true;
            confirmedBy = "password-login";
            
            userInfo = {
              exists: true,
              existsConfirmedBy: "password-login",
              uid: userCred.user.uid,
              emailVerified: userCred.user.emailVerified,
              foundPassword: pass
            };
            
            console.log(`🎉 SUCCESS! User exists with password: "${pass}"`);
            console.log(`🆔 UID: ${userCred.user.uid}`);
            
            // Đăng xuất ngay
            try {
              await signOut(auth);
              console.log(`👋 Signed out after check`);
            } catch (signOutError) {
              console.log(`⚠️ Could not sign out: ${signOutError}`);
            }
            
            break;
            
          } catch (loginError: any) {
            if (loginError.code === "auth/user-not-found") {
              // User KHÔNG tồn tại
              exists = false;
              confirmedBy = "password-login-not-found";
              console.log(`❌ User NOT FOUND via password attempt`);
              break;
            } else if (loginError.code === "auth/wrong-password") {
              // Password sai - tiếp tục
              console.log(`❌ Wrong password: "${pass}"`);
              continue;
            } else if (loginError.code === "auth/too-many-requests") {
              // Rate limit - dừng lại
              console.log(`⚠️ Rate limited, stopping password attempts`);
              break;
            } else {
              console.log(`⚠️ Login error: ${loginError.code}`);
            }
          }
        }
      }
      
      // ======= PHƯƠNG PHÁP 3: Thử create user (chỉ khi user không tồn tại) =======
      if (exists === false) {
        console.log(`🆕 Method 3: Testing with temporary user creation...`);
        // Tạo user test tạm thời để xác định
        const tempEmail = `test-${Date.now()}@temp.com`;
        const tempPassword = "Test@123456";
        
        try {
          // Thử tạo user mới để xác định service hoạt động
          const tempUser = await createUserWithEmailAndPassword(auth, tempEmail, tempPassword);
          console.log(`✅ Firebase Auth service is working`);
          
          // Xóa user test ngay lập tức
          try {
            // Đăng xuất và xóa (trong thực tế cần Admin SDK để xóa user)
            await signOut(auth);
            console.log(`🧹 Test user created and signed out`);
            
            // User không tồn tại đã được xác nhận
            exists = false;
            confirmedBy = "service-working";
            
          } catch (cleanupError) {
            console.log(`⚠️ Could not cleanup test user`);
          }
          
        } catch (createError: any) {
          if (createError.code === "auth/email-already-in-use") {
            // Email test đã tồn tại (rất hiếm) - bỏ qua
            console.log(`⚠️ Test email already exists`);
          } else if (createError.code === "auth/operation-not-allowed") {
            console.log(`⚠️ Email/password auth not enabled`);
          }
        }
      }
      
      // CẬP NHẬT STATE
      setUserExists(exists);
      
      if (exists && userInfo) {
        setUserDetails({
          uid: userInfo.uid,
          emailVerified: userInfo.emailVerified,
          existsConfirmedBy: userInfo.existsConfirmedBy
        });
      } else {
        setUserDetails({
          existsConfirmedBy: confirmedBy
        });
      }
      
      // LOG KẾT QUẢ
      console.log(`🎯 FINAL RESULT for "${emailToCheck}":`, {
        exists,
        confirmedBy,
        uid: userInfo?.uid?.substring(0, 10) + '...' || 'unknown',
        emailVerified: userInfo?.emailVerified
      });
      
    } catch (error: any) {
      console.error("Error in smart check:", error);
      setUserExists(false);
      setUserDetails({
        existsConfirmedBy: "error",
        errorMessage: error.message
      });
    } finally {
      setCheckingUser(false);
      isCheckingRef.current = false;
    }
  };

  // ==================== TẠO USER MỚI ====================
  const handleCreateNewUser = async () => {
    try {
      setModalLoading(true);
      console.log(`🔄 Creating new user: ${email}`);
      
      // 1. Tạo user mới
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        email, 
        newPassword
      );
      
      const uid = userCredential.user.uid;
      console.log("✅ User created:", uid);
      
      // 2. Gửi email verification (optional)
      try {
        await sendEmailVerification(userCredential.user);
        console.log("📧 Verification email sent");
      } catch (verifyError) {
        console.log("ℹ️ Could not send verification email");
      }
      
      // 3. Đăng nhập tự động
      await signInWithEmailAndPassword(auth, email, newPassword);
      console.log("✅ Auto-login successful");
      
      // 4. FORCE REFRESH STATUS
      setTimeout(async () => {
        console.log("🔄 Force refreshing user status...");
        await checkUserExists(email, true);
      }, 1500);
      
      // 5. Reset và đóng modal
      setShowConfirmModal(false);
      
      Alert.alert(
        "🎉 Tạo tài khoản thành công!",
        `✅ Đã tạo tài khoản mới\n\n` +
        `📧 Email: ${email}\n` +
        `🆔 UID: ${uid.substring(0, 10)}...\n` +
        `🔐 Password: ${newPassword}\n\n` +
        `Bạn đã được đăng nhập tự động.`,
        [
          { 
            text: "Vào trang chủ", 
            onPress: () => {
              router.replace("/(tabs)");
            }
          },
          {
            text: "Kiểm tra lại trạng thái",
            onPress: async () => {
              await checkUserExists(email, true);
            }
          }
        ]
      );
      
      // Reset form
      setNewPassword("");
      setConfirmPassword("");
      
    } catch (error: any) {
      console.error("Create user error:", error);
      
      let errorMessage = "Không thể tạo tài khoản.";
      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "Email này đã được sử dụng. Đang cập nhật trạng thái...";
          setTimeout(() => checkUserExists(email, true), 500);
          break;
        case "auth/invalid-email":
          errorMessage = "Email không hợp lệ.";
          break;
        case "auth/weak-password":
          errorMessage = "Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.";
          break;
        case "auth/operation-not-allowed":
          errorMessage = "Phương thức đăng ký chưa được kích hoạt.";
          break;
      }
      
      Alert.alert("❌ Lỗi", errorMessage);
    } finally {
      setModalLoading(false);
    }
  };

  // ==================== XỬ LÝ USER ĐÃ TỒN TẠI ====================
  const handleExistingUser = async () => {
    try {
      setModalLoading(true);
      console.log(`🔄 Handling existing user: ${email}`);
      
      // PHƯƠNG PHÁP AN TOÀN: Gửi email reset thay vì thử password
      Alert.alert(
        "📧 Gửi email reset mật khẩu",
        `Hệ thống sẽ gửi link reset mật khẩu đến:\n${email}\n\n` +
        `Vui lòng kiểm tra email và làm theo hướng dẫn.`,
        [
          {
            text: "Hủy",
            style: "cancel"
          },
          {
            text: "Gửi email",
            onPress: async () => {
              try {
                await sendPasswordResetEmail(auth, email);
                Alert.alert(
                  "✅ Email đã được gửi",
                  `Link reset mật khẩu đã được gửi đến ${email}\n\n` +
                  `Vui lòng kiểm tra hộp thư (cả thư mục spam).`,
                  [
                    { 
                      text: "OK", 
                      onPress: () => {
                        setShowConfirmModal(false);
                        router.back();
                      }
                    }
                  ]
                );
              } catch (error: any) {
                Alert.alert("❌ Lỗi", `Không thể gửi email: ${error.message}`);
              }
            }
          }
        ]
      );
      
    } catch (error: any) {
      console.error("Handle existing user error:", error);
      Alert.alert("❌ Lỗi", error.message);
    } finally {
      setModalLoading(false);
    }
  };

  // ==================== GỬI EMAIL RESET ====================
  const sendResetEmail = async () => {
    try {
      setLoading(true);
      console.log(`📧 Sending reset email to: ${email}`);
      
      await sendPasswordResetEmail(auth, email);
      
      Alert.alert(
        "📧 Email đã được gửi",
        `Link đặt lại mật khẩu đã được gửi đến:\n${email}\n\n` +
        `Vui lòng kiểm tra hộp thư và làm theo hướng dẫn.`,
        [
          { 
            text: "OK", 
            onPress: () => router.back()
          }
        ]
      );
      
    } catch (error: any) {
      console.error("Send reset email error:", error);
      
      let errorMessage = "Không thể gửi email.";
      switch (error.code) {
        case "auth/user-not-found":
          errorMessage = "Email không tồn tại trong hệ thống.";
          setUserExists(false);
          break;
        case "auth/invalid-email":
          errorMessage = "Email không hợp lệ.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Quá nhiều yêu cầu. Vui lòng thử lại sau.";
          break;
      }
      
      Alert.alert("❌ Lỗi", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ==================== XỬ LÝ NÚT CHÍNH ====================
  const handleMainAction = async () => {
    // VALIDATION
    if (!email.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập email");
      return;
    }

    if (!newPassword || !confirmPassword) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ mật khẩu mới");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp");
      return;
    }

    // KIỂM TRA LẠI TRƯỚC KHI QUYẾT ĐỊNH
    await checkUserExists(email, true);
    
    // ĐỢI STATE UPDATE
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (userExists === true) {
      setModalType("reset");
      setShowConfirmModal(true);
    } else if (userExists === false) {
      setModalType("create");
      setShowConfirmModal(true);
    } else {
      Alert.alert(
        "Không xác định",
        "Không thể xác định trạng thái tài khoản. Vui lòng thử lại.",
        [
          {
            text: "Thử lại",
            onPress: async () => {
              await checkUserExists(email, true);
            }
          }
        ]
      );
    }
  };

  // ==================== XỬ LÝ MODAL ====================
  const handleModalConfirm = () => {
    if (modalType === "create") {
      handleCreateNewUser();
    } else if (modalType === "reset") {
      handleExistingUser();
    }
  };

  // ==================== AUTO-CHECK EMAIL ====================
  useEffect(() => {
    if (!email.trim() || email.length < 3) {
      setUserExists(null);
      setUserDetails(null);
      return;
    }
    
    const timer = setTimeout(() => {
      checkUserExists(email);
    }, 800);
    
    return () => clearTimeout(timer);
  }, [email]);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>🔐 Reset mật khẩu</Text>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 <Text style={{ fontWeight: 'bold' }}>Hệ thống tự động kiểm tra:</Text>
            </Text>
            <Text style={styles.infoText}>
              1. Kiểm tra email đã đăng ký chưa
            </Text>
            <Text style={styles.infoText}>
              2. Nếu chưa có: Có thể tạo tài khoản mới
            </Text>
            <Text style={styles.infoText}>
              3. Nếu đã có: Gửi email reset mật khẩu
            </Text>
          </View>

          {/* Email input */}
          <Text style={styles.inputLabel}>Email *</Text>
          <TextInput
            placeholder="Nhập email của bạn"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            editable={!loading}
          />
          
          {/* Hiển thị trạng thái kiểm tra */}
          {checkingUser && (
            <View style={styles.checkingContainer}>
              <ActivityIndicator size="small" color="#38bdf8" />
              <Text style={styles.checkingText}>Đang kiểm tra tài khoản...</Text>
            </View>
          )}
          
          {userExists !== null && !checkingUser && (
            <View style={[
              styles.statusContainer,
              userExists ? styles.statusExists : styles.statusNew
            ]}>
              <View style={styles.statusContent}>
                <Text style={styles.statusText}>
                  {userExists 
                    ? `✅ Email "${email}" đã đăng ký` 
                    : `🆕 Email "${email}" chưa đăng ký`}
                </Text>
                
                {userDetails?.existsConfirmedBy && (
                  <Text style={styles.statusDetail}>
                    {userDetails.existsConfirmedBy === "reset-email" 
                      ? "📧 Xác nhận qua email reset"
                      : userDetails.existsConfirmedBy === "password-login"
                      ? "🔑 Xác nhận qua đăng nhập"
                      : userDetails.existsConfirmedBy === "service-working"
                      ? "🔄 Xác nhận service hoạt động"
                      : "❓ Phương thức xác nhận không rõ"}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Danh sách email test */}
          <View style={styles.suggestionsBox}>
            <Text style={styles.suggestionsTitle}>📋 Email test có sẵn:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsList}>
              {DEFAULT_TEST_EMAILS.map((testEmail) => (
                <TouchableOpacity
                  key={testEmail}
                  style={styles.emailChip}
                  onPress={() => {
                    setEmail(testEmail);
                    checkUserExists(testEmail);
                  }}
                >
                  <Text style={styles.emailChipText}>{testEmail}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Chỉ hiển thị password fields khi user không tồn tại */}
          {userExists === false && (
            <>
              <Text style={styles.inputLabel}>Mật khẩu mới (ít nhất 6 ký tự) *</Text>
              <TextInput
                placeholder="Nhập mật khẩu mới của bạn"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                style={styles.input}
                editable={!loading}
              />

              <Text style={styles.inputLabel}>Xác nhận mật khẩu mới *</Text>
              <TextInput
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={styles.input}
                editable={!loading}
              />
            </>
          )}

          {/* Debug Tools */}
          <View style={styles.debugSection}>
            <Text style={styles.debugTitle}>🛠️ Debug Tools:</Text>
            
            <TouchableOpacity
              style={styles.debugButton}
              onPress={async () => {
                console.log("=== MANUAL CHECK ===");
                await checkUserExists(email, true);
              }}
            >
              <Text style={styles.debugButtonText}>🔄 Kiểm tra thủ công</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.debugButton}
              onPress={() => {
                Alert.alert(
                  "Trạng thái hiện tại",
                  `📧 Email: ${email}\n` +
                  `✅ Đã đăng ký: ${userExists ? 'CÓ' : 'KHÔNG'}\n` +
                  `🔄 Đang kiểm tra: ${checkingUser ? 'CÓ' : 'KHÔNG'}\n` +
                  `📊 Xác nhận bởi: ${userDetails?.existsConfirmedBy || 'Chưa xác định'}\n` +
                  `🆔 UID: ${userDetails?.uid?.substring(0, 10) || 'Chưa xác định'}...`
                );
              }}
            >
              <Text style={styles.debugButtonText}>📊 Xem trạng thái</Text>
            </TouchableOpacity>
          </View>

          {/* Nút chính */}
          <TouchableOpacity
            onPress={handleMainAction}
            disabled={loading || checkingUser}
            style={[styles.mainButton, (loading || checkingUser) && styles.buttonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.mainButtonText}>
                {checkingUser ? "Đang kiểm tra..." : 
                 userExists === true ? "Gửi email reset" :
                 userExists === false ? "Tạo tài khoản mới" : 
                 "Tiếp tục"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Nút gửi email reset (luôn hiển thị) */}
          <TouchableOpacity
            onPress={sendResetEmail}
            disabled={loading || !email.trim()}
            style={[styles.emailButton, (loading || !email.trim()) && styles.buttonDisabled]}
          >
            <Text style={styles.emailButtonText}>📧 Gửi link reset qua email</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.back()}
            disabled={loading}
            style={[styles.cancelButton, loading && styles.buttonDisabled]}
          >
            <Text style={styles.cancelButtonText}>← Quay lại đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL XÁC NHẬN */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {modalType === "create" ? "🎯 Tạo tài khoản mới" : "📧 Gửi email reset"}
            </Text>
            
            <Text style={styles.modalText}>
              {modalType === "create" 
                ? `Bạn muốn tạo tài khoản mới với:\n📧 Email: ${email}`
                : `Hệ thống sẽ gửi link reset mật khẩu đến:\n📧 Email: ${email}`
              }
            </Text>
            
            <Text style={styles.modalWarning}>
              ⚠️ {modalType === "create" 
                ? "Tài khoản sẽ được tạo và đăng nhập tự động." 
                : "Vui lòng kiểm tra email và làm theo hướng dẫn."}
            </Text>
            
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowConfirmModal(false)}
                disabled={modalLoading}
              >
                <Text style={styles.modalCancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton]}
                onPress={handleModalConfirm}
                disabled={modalLoading}
              >
                {modalLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>
                    {modalType === "create" ? "Tạo tài khoản" : "Gửi email"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#020617",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#38bdf8",
    shadowColor: "#38bdf8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#38bdf8",
    textAlign: "center",
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },
  infoText: {
    color: "#e2e8f0",
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  inputLabel: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    padding: 14,
    color: "white",
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#1e293b",
  },
  checkingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    padding: 10,
    backgroundColor: "#1e293b",
    borderRadius: 8,
  },
  checkingText: {
    color: "#94a3b8",
    marginLeft: 10,
    fontSize: 14,
  },
  statusContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  statusContent: {
    alignItems: "center",
  },
  statusExists: {
    backgroundColor: "#064e3b",
    borderColor: "#10b981",
  },
  statusNew: {
    backgroundColor: "#78350f",
    borderColor: "#f59e0b",
  },
  statusText: {
    color: "white",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 14,
    marginBottom: 4,
  },
  statusDetail: {
    color: "#d1fae5",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  suggestionsBox: {
    marginBottom: 20,
  },
  suggestionsTitle: {
    color: "#94a3b8",
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "500",
  },
  suggestionsList: {
    flexDirection: "row",
  },
  emailChip: {
    backgroundColor: "#334155",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#475569",
  },
  emailChipText: {
    color: "#cbd5e1",
    fontSize: 12,
  },
  debugSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#1e293b",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  debugTitle: {
    color: "#f59e0b",
    fontWeight: "600",
    marginBottom: 10,
    fontSize: 14,
  },
  debugButton: {
    backgroundColor: "#334155",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  debugButtonText: {
    color: "#cbd5e1",
    textAlign: "center",
    fontSize: 14,
  },
  mainButton: {
    backgroundColor: "#10b981",
    paddingVertical: 16,
    borderRadius: 10,
    marginTop: 8,
  },
  emailButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    borderRadius: 10,
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  mainButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  emailButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  cancelButton: {
    paddingVertical: 16,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#475569",
  },
  cancelButtonText: {
    color: "#94a3b8",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#020617",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#38bdf8",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#38bdf8",
    textAlign: "center",
    marginBottom: 16,
  },
  modalText: {
    color: "#e2e8f0",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 22,
    fontSize: 15,
  },
  modalWarning: {
    color: "#f59e0b",
    textAlign: "center",
    marginBottom: 24,
    fontSize: 14,
    fontStyle: "italic",
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 6,
  },
  modalCancelButton: {
    backgroundColor: "#475569",
    borderWidth: 1,
    borderColor: "#64748b",
  },
  modalSubmitButton: {
    backgroundColor: "#10b981",
  },
  modalCancelButtonText: {
    color: "#e2e8f0",
    fontWeight: "600",
  },
  modalSubmitButtonText: {
    color: "white",
    fontWeight: "600",
  },
});