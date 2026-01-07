// app/(admin)/_layout.tsx
import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="add-products" 
        options={{
          title: "Thêm sản phẩm",
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="edit-product/[id]" // route phải trùng với file app/(admin)/edit-product/[id].tsx
        options={{
          title: "Chỉnh sửa sản phẩm",
          headerShown: true,
        }}
      />
    </Stack>
  );
}
